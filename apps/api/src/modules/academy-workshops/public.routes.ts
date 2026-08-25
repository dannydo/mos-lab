import { createHash } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import type {
  RedeemAcademyWorkshopDisplayRequest,
  RedeemAcademyWorkshopQrRequest,
  SafeAny,
  JoinAcademyWorkshopWithGoogleRequest,
  SelectAcademyWorkshopParticipantRequest,
  SubmitAcademyWorkshopAnswerRequest,
} from '@mos-lab/shared';
import { GoogleIdentityError, verifyGoogleCredential } from '../auth/google-identity.service.js';
import { AcademySalesError, getAcademyWorkspaceAccess } from '../academy-sales/academy-sales.service.js';
import { AcademyWorkshopLiveService, academyWorkshopRealtimeHub } from './academy-workshop-live.service.js';
import { AcademyWorkshopPublicJoinService } from './academy-workshop-public.service.js';
import { AcademyWorkshopService } from './academy-workshop.service.js';

type ParticipantToken = {
  kind: 'ACADEMY_WORKSHOP_PARTICIPANT';
  workshopId: number;
  participantId: number;
  tokenVersion: number;
  exp: number;
};
type DisplayToken = {
  kind: 'ACADEMY_WORKSHOP_DISPLAY';
  workshopId: number;
  tokenVersion: number;
  exp: number;
};
type PublicToken = ParticipantToken | DisplayToken;
type StaffToken = { id: number; role: string; displayName?: string; email?: string; exp?: number };

const INTERNAL_ACTOR = { id: 0, role: 'super_admin', academyAccess: true } as const;

function secret() {
  return String(
    process.env.ACADEMY_WORKSHOP_PARTICIPANT_JWT_SECRET ||
      process.env.JWT_SECRET ||
      'academy_workshop_participant_development_secret_change_me'
  );
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function sign(payload: Omit<ParticipantToken, 'exp'> | Omit<DisplayToken, 'exp'>, endsAt: Date) {
  const expiresAt = new Date(Math.max(Date.now() + 60 * 60 * 1000, endsAt.getTime() + 12 * 60 * 60 * 1000));
  const token = jwt.sign({ ...payload, exp: Math.floor(expiresAt.getTime() / 1000) }, secret());
  return { token, expiresAt: expiresAt.toISOString() };
}

function verifyPublic(token: string): PublicToken {
  const payload = jwt.verify(token, secret()) as PublicToken;
  if (!['ACADEMY_WORKSHOP_PARTICIPANT', 'ACADEMY_WORKSHOP_DISPLAY'].includes(payload.kind)) {
    throw new AcademySalesError('Workshop session không hợp lệ.', 401);
  }
  return payload;
}

function bearer(request: FastifyRequest) {
  const [scheme, token] = String(request.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new AcademySalesError('Thiếu Workshop session.', 401);
  return token;
}

async function assertCurrentToken(fastify: FastifyInstance, payload: PublicToken) {
  if (payload.kind === 'ACADEMY_WORKSHOP_PARTICIPANT') {
    const participant = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findUnique({
      where: { id: payload.participantId },
      select: { id: true, workshopId: true, tokenVersion: true },
    });
    if (
      !participant ||
      participant.workshopId !== payload.workshopId ||
      participant.tokenVersion !== payload.tokenVersion
    ) {
      throw new AcademySalesError('Workshop session đã bị thu hồi.', 401);
    }
  } else {
    const workshop = await fastify.prisma.crm.crmAcademyWorkshop.findUnique({
      where: { id: payload.workshopId },
      select: { displayTokenVersion: true },
    });
    if (!workshop || workshop.displayTokenVersion !== payload.tokenVersion) {
      throw new AcademySalesError('Màn hình workshop đã bị thu hồi quyền.', 401);
    }
  }
  return payload;
}

function sendError(fastify: FastifyInstance, reply: FastifyReply, cause: unknown, context: string) {
  if (cause instanceof AcademySalesError) {
    return reply.status(cause.statusCode).send({ error: cause.name, message: cause.message });
  }
  if (cause instanceof GoogleIdentityError) {
    return reply.status(cause.statusCode).send({ error: cause.name, message: cause.message });
  }
  fastify.log.error(cause, context);
  return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xử lý Workshop session.' });
}

async function participantSession(
  fastify: FastifyInstance,
  participant: { id: number; workshopId: number; tokenVersion: number; workshop: { endsAt: Date } }
) {
  const session = sign(
    {
      kind: 'ACADEMY_WORKSHOP_PARTICIPANT',
      workshopId: participant.workshopId,
      participantId: participant.id,
      tokenVersion: participant.tokenVersion,
    },
    participant.workshop.endsAt
  );
  const [publicParticipant, workshop] = await Promise.all([
    AcademyWorkshopService.getParticipant(fastify, INTERNAL_ACTOR, participant.workshopId, participant.id),
    AcademyWorkshopService.getById(fastify, INTERNAL_ACTOR, participant.workshopId),
  ]);
  return {
    ...session,
    participant: {
      id: publicParticipant.id,
      lead: {
        id: publicParticipant.lead.id,
        name: publicParticipant.lead.name,
        avatarUrl: publicParticipant.lead.avatarUrl,
      },
      checkedInAt: publicParticipant.checkedInAt,
      gameScore: publicParticipant.gameScore,
    },
    workshop: {
      id: workshop.id,
      name: workshop.name,
      slug: workshop.slug,
      startsAt: workshop.startsAt,
      endsAt: workshop.endsAt,
      location: workshop.location,
      status: workshop.status,
    },
  };
}

export async function academyWorkshopPublicRoutes(fastify: FastifyInstance) {
  fastify.get('/academy/workshops/shared/:displayCode', async (request, reply) => {
    try {
      const { displayCode } = request.params as { displayCode: string };
      return reply.send({
        data: await AcademyWorkshopPublicJoinService.sharedJoinInfo(fastify, displayCode),
      });
    } catch (cause) {
      return sendError(fastify, reply, cause, 'Get shared workshop join info');
    }
  });

  fastify.post('/academy/workshops/select-participant', async (request, reply) => {
    try {
      const participant = await AcademyWorkshopPublicJoinService.selectParticipant(
        fastify,
        request.body as SelectAcademyWorkshopParticipantRequest
      );
      const data = await participantSession(fastify, participant);
      void AcademyWorkshopLiveService.broadcastState(fastify, participant.workshopId).catch((cause) =>
        fastify.log.error(cause, 'Broadcast workshop self check-in')
      );
      return reply.send({ data });
    } catch (cause) {
      return sendError(fastify, reply, cause, 'Select shared workshop participant');
    }
  });

  fastify.post('/academy/workshops/join-google', async (request, reply) => {
    try {
      const input = request.body as JoinAcademyWorkshopWithGoogleRequest;
      const identity = await verifyGoogleCredential(input.credential);
      const participant = await AcademyWorkshopPublicJoinService.joinWithGoogle(fastify, input, identity);
      const data = await participantSession(fastify, participant);
      void AcademyWorkshopLiveService.broadcastState(fastify, participant.workshopId).catch((cause) =>
        fastify.log.error(cause, 'Broadcast Google workshop join')
      );
      return reply.send({ data });
    } catch (cause) {
      return sendError(fastify, reply, cause, 'Join workshop with Google');
    }
  });

  fastify.post('/academy/workshops/redeem', async (request, reply) => {
    try {
      const { qrToken } = request.body as RedeemAcademyWorkshopQrRequest;
      const raw = String(qrToken || '').trim();
      if (!raw) throw new AcademySalesError('QR token là bắt buộc.');
      const participant = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findUnique({
        where: { qrTokenHash: hash(raw) },
        include: { workshop: true },
      });
      if (!participant) throw new AcademySalesError('QR không hợp lệ hoặc đã được cấp lại.', 404);
      if (participant.qrRedeemedAt)
        throw new AcademySalesError(
          'QR đã được đổi session. Hãy dùng session hiện tại hoặc nhờ staff cấp lại QR.',
          409
        );
      const redeemed = await fastify.prisma.crm.crmAcademyWorkshopParticipant.update({
        where: { id: participant.id },
        data: { qrRedeemedAt: new Date() },
      });
      return reply.send({ data: await participantSession(fastify, { ...redeemed, workshop: participant.workshop }) });
    } catch (cause) {
      return sendError(fastify, reply, cause, 'Redeem workshop QR');
    }
  });

  fastify.post('/academy/workshops/display/redeem', async (request, reply) => {
    try {
      const { displayCode } = request.body as RedeemAcademyWorkshopDisplayRequest;
      const workshop = await fastify.prisma.crm.crmAcademyWorkshop.findUnique({
        where: {
          displayCode: String(displayCode || '')
            .trim()
            .toUpperCase(),
        },
      });
      if (!workshop) throw new AcademySalesError('Mã màn hình không hợp lệ.', 404);
      return reply.send({
        data: sign(
          {
            kind: 'ACADEMY_WORKSHOP_DISPLAY',
            workshopId: workshop.id,
            tokenVersion: workshop.displayTokenVersion,
          },
          workshop.endsAt
        ),
      });
    } catch (cause) {
      return sendError(fastify, reply, cause, 'Redeem workshop display');
    }
  });

  fastify.get('/academy/workshops/state', async (request, reply) => {
    try {
      const payload = await assertCurrentToken(fastify, verifyPublic(bearer(request)));
      return reply.send({
        data: await AcademyWorkshopLiveService.liveState(
          fastify,
          payload.workshopId,
          payload.kind === 'ACADEMY_WORKSHOP_PARTICIPANT' ? 'PARTICIPANT' : 'DISPLAY'
        ),
      });
    } catch (cause) {
      return sendError(fastify, reply, cause, 'Workshop public state');
    }
  });

  fastify.post('/academy/workshops/answer', async (request, reply) => {
    try {
      const payload = await assertCurrentToken(fastify, verifyPublic(bearer(request)));
      if (payload.kind !== 'ACADEMY_WORKSHOP_PARTICIPANT') {
        throw new AcademySalesError('Chỉ học viên mới được trả lời.', 403);
      }
      return reply.send({
        success: true,
        data: await AcademyWorkshopLiveService.submitAnswer(
          fastify,
          payload.participantId,
          request.body as SubmitAcademyWorkshopAnswerRequest
        ),
        message: 'Đã ghi nhận câu trả lời.',
      });
    } catch (cause) {
      return sendError(fastify, reply, cause, 'Submit workshop answer');
    }
  });

  fastify.get('/academy/workshops/ws', { websocket: true }, (socket, request) => {
    let authenticated = false;
    let dispose: (() => void) | null = null;
    const timeout = setTimeout(() => {
      if (!authenticated) socket.close(4401, 'Authentication timeout');
    }, 10_000);

    socket.on('error', (cause: Error) => request.log.warn({ cause }, 'Workshop websocket error'));
    socket.on('close', () => {
      clearTimeout(timeout);
      dispose?.();
    });
    socket.on('message', async (raw: SafeAny) => {
      if (authenticated) return;
      try {
        const message = JSON.parse(raw.toString()) as { type?: string; token?: string; workshopId?: number };
        if (message.type !== 'AUTH' || !message.token) throw new AcademySalesError('AUTH frame không hợp lệ.', 401);
        let workshopId: number;
        let audience: 'STAFF' | 'DISPLAY' | 'PARTICIPANT';
        let participantId: number | undefined;
        try {
          const payload = await assertCurrentToken(fastify, verifyPublic(message.token));
          workshopId = payload.workshopId;
          audience = payload.kind === 'ACADEMY_WORKSHOP_PARTICIPANT' ? 'PARTICIPANT' : 'DISPLAY';
          participantId = payload.kind === 'ACADEMY_WORKSHOP_PARTICIPANT' ? payload.participantId : undefined;
        } catch (publicError) {
          const staffPayload = jwt.verify(
            message.token,
            process.env.JWT_SECRET || 'super_secret_mos_lab_jwt_key_development_only'
          ) as StaffToken;
          workshopId = Number(message.workshopId);
          const access = await getAcademyWorkspaceAccess(fastify, {
            id: staffPayload.id,
            role: staffPayload.role,
            displayName: staffPayload.displayName,
            email: staffPayload.email,
          });
          if (!Number.isInteger(workshopId) || workshopId <= 0 || !access.canAccess) throw publicError;
          await AcademyWorkshopService.rowById(fastify, { ...staffPayload, academyAccess: true }, workshopId);
          audience = 'STAFF';
        }
        authenticated = true;
        clearTimeout(timeout);
        dispose = academyWorkshopRealtimeHub.add(workshopId, { socket, audience, participantId });
        socket.send(
          JSON.stringify({
            type: 'STATE_SNAPSHOT',
            data: await AcademyWorkshopLiveService.liveState(fastify, workshopId, audience),
          })
        );
        await AcademyWorkshopLiveService.broadcastState(fastify, workshopId);
      } catch (cause) {
        request.log.warn({ cause }, 'Workshop websocket authentication rejected');
        socket.send(
          JSON.stringify({ type: 'ERROR', data: { code: 'UNAUTHORIZED', message: 'Workshop session không hợp lệ.' } })
        );
        socket.close(4401, 'Unauthorized');
      }
    });
  });
}
