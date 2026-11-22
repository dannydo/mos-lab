import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import {
  AcademySalesError,
  canManageAcademyRestricted,
  canManageAcademySales,
  getAcademyWorkspaceAccess,
  type AcademyActor,
} from '../academy-sales.service.js';
import { broadcastAcademyTalentAssessmentState } from '../../academy-workshops/academy-workshop-live.service.js';

export function actorFrom(request: FastifyRequest): AcademyActor {
  const user = request.user;
  return {
    id: user.id,
    role: user.role,
    displayName: user.displayName,
    email: user.email,
    academyAccess: (request as FastifyRequest & { academyAccess?: boolean }).academyAccess,
    academyCrudAccess: (request as FastifyRequest & { academyCrudAccess?: boolean }).academyCrudAccess,
  };
}

export async function requireAcademyWorkspaceAccess(request: FastifyRequest, reply: FastifyReply) {
  // The access probe is deliberately available to every authenticated user so
  // the sidebar and route shell can fail closed without guessing from a role.
  const requestPath = request.url.split('?')[0].replace(/^\/api/, '');
  if (requestPath === '/academy-sales/access') return;

  await requireAuth(request, reply);
  if (reply.sent) return;

  const access = await getAcademyWorkspaceAccess(request.server, actorFrom(request));
  if (!access.canAccess) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Chỉ Admin hoặc thành viên đang hoạt động của Department Academy được truy cập khu vực này.',
    });
  }
  (request as FastifyRequest & { academyAccess?: boolean }).academyAccess = true;
  (request as FastifyRequest & { academyCrudAccess?: boolean }).academyCrudAccess = access.canManage;
}

export function parseId(value: string, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AcademySalesError(`${label} không hợp lệ.`);
  return id;
}

export async function broadcastTalentAssessmentUpdate(fastify: FastifyInstance, assessmentId: number) {
  try {
    await broadcastAcademyTalentAssessmentState(fastify, assessmentId);
  } catch (cause) {
    // The assessment transaction has already committed. Do not turn a
    // transient WebSocket snapshot failure into a false save failure that the
    // operator may retry and duplicate.
    fastify.log.warn({ cause, assessmentId }, 'Academy Workshop talent realtime broadcast failed');
  }
}

export function sendError(fastify: FastifyInstance, reply: FastifyReply, error: unknown, context: string) {
  if (error instanceof AcademySalesError) {
    return reply.status(error.statusCode).send({ error: error.name, message: error.message });
  }
  fastify.log.error(error, context);
  return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xử lý yêu cầu Sales Academy.' });
}

export function requireAcademyAdmin(actor: AcademyActor) {
  if (!canManageAcademySales(actor)) {
    throw new AcademySalesError('Chỉ Admin, Quản lý hoặc Marketing & Sales được chạy import và đồng bộ nguồn.', 403);
  }
}

export function requireAcademyRestrictedSettings(actor: AcademyActor) {
  if (!canManageAcademyRestricted(actor)) {
    throw new AcademySalesError(
      'Chỉ Admin hoặc Super Admin được thay đổi học phí và cấu hình giảng viên Academy.',
      403
    );
  }
}

/** Bank-transfer confirmations change the tuition ledger and are Admin-only. */
export function requireAcademyPaymentConfirmation(actor: AcademyActor) {
  requireAcademyRestrictedSettings(actor);
}
