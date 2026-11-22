import { FastifyInstance } from 'fastify';
import { AiAssistantChatRequest, CreateAiSessionRequest, isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { requireAuth } from '../../../middlewares/auth.js';
import { AiAssistantService } from '../ai.service.js';
import { AI_SESSION_AUDIT_PURPOSE, AI_SESSION_AUDIT_REASON_MIN } from '../ai-session-access.js';
import { isDannyOrSuperAdminUser } from '../../chat/chat-access.service.js';

export function registerAiChatSessionRoutes(fastify: FastifyInstance) {
  // AI Assistant Private Workspace (MOS-FEAT-47)
  fastify.get<{ Querystring: { scope?: string } }>(
    '/ai/chat/sessions',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const staffId = request.user.id;
      const scope = request.query?.scope || 'customers';
      const sessions = await AiAssistantService.listSessions(fastify.prisma.crm, staffId, scope);
      return reply.send({ sessions });
    }
  );

  fastify.post<{ Body: CreateAiSessionRequest }>(
    '/ai/chat/sessions',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const staffId = request.user.id;
      const session = await AiAssistantService.createSession(fastify.prisma.crm, staffId, request.body || {});
      return reply.status(201).send({ session });
    }
  );

  fastify.get<{ Params: { id: string }; Querystring: { purpose?: string; reason?: string } }>(
    '/ai/chat/sessions/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user;
      // Permalink access (Kinh Thánh mOS UI-012): owner, shared link, Super Admin for mission-linked sessions,
      // or Admin/Super Admin with a written security-audit reason. Everyone else gets 403.
      const outcome = await AiAssistantService.getSessionForViewer(
        fastify.prisma.crm,
        request.params.id,
        { id: user.id, role: user.role, displayName: user.displayName, username: user.username },
        {
          auditRequested: request.query?.purpose === AI_SESSION_AUDIT_PURPOSE,
          auditReason: request.query?.reason,
        }
      );

      if (outcome.status === 'not_found') {
        return reply.status(404).send({ error: 'Session not found or unauthorized' });
      }
      if (outcome.status === 'forbidden') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: outcome.invalidAuditReason
            ? `Cần ghi rõ lý do rà soát bảo mật (tối thiểu ${AI_SESSION_AUDIT_REASON_MIN} ký tự).`
            : 'Phiên hội thoại này là riêng tư. Chỉ chủ phiên hoặc người được chủ phiên chia sẻ mới xem được.',
          auditAvailable: outcome.auditAvailable,
        });
      }
      if (outcome.result.access.mode === 'mission' || outcome.result.access.mode === 'audit') {
        request.log.info(
          { sessionId: request.params.id, viewerStaffId: user.id, mode: outcome.result.access.mode },
          'AI chat session opened outside ownership via permalink'
        );
      }
      return reply.send(outcome.result);
    }
  );

  // Owner-only: share / stop sharing the permalink of one session (read-only for signed-in staff).
  fastify.patch<{ Params: { id: string }; Body: { enabled?: boolean } }>(
    '/ai/chat/sessions/:id/sharing',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      if (typeof request.body?.enabled !== 'boolean') {
        return reply.status(400).send({ error: 'Thiếu trạng thái chia sẻ (enabled: true | false).' });
      }
      const result = await AiAssistantService.setSessionSharing(
        fastify.prisma.crm,
        request.params.id,
        request.user.id,
        request.body.enabled
      );
      if (!result) {
        return reply.status(404).send({ error: 'Session not found or unauthorized' });
      }
      return reply.send(result);
    }
  );

  fastify.delete<{ Params: { id: string } }>(
    '/ai/chat/sessions/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const staffId = request.user.id;
      const deleted = await AiAssistantService.deleteSession(fastify.prisma.crm, request.params.id, staffId);
      return reply.send({ success: deleted });
    }
  );

  fastify.post<{ Body: AiAssistantChatRequest }>(
    '/ai/chat/message',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      const user = request.user;
      const isAdmin = isDannyOrSuperAdminUser(user) || isAdminOrSuperAdminRole(user?.role);
      if (!isAdmin) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Chỉ Admin mới được phép trò chuyện với mOS AI (MAI).',
        });
      }

      const staffId = request.user.id;
      const { message, sessionId, scope, context } = request.body || {};

      if (!message || typeof message !== 'string' || !message.trim()) {
        return reply.status(400).send({
          error: 'Vui lòng cung cấp nội dung tin nhắn (message)',
        });
      }

      const response = await AiAssistantService.sendMessage(
        fastify.prisma.crm,
        staffId,
        {
          sessionId,
          message,
          scope,
          context: {
            ...context,
            myStaffId: staffId,
            userName: request.user.displayName || request.user.username,
            myRole: request.user.role,
          },
        },
        fastify.prisma.legacy,
        fastify
      );

      return reply.send(response);
    }
  );
}
