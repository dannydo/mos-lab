import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import {
  AcademySalesError,
  getAcademyWorkspaceAccess,
  type AcademyActor,
} from '../../academy-sales/academy-sales.service.js';

export function actorFrom(request: FastifyRequest): AcademyActor {
  return {
    id: request.user.id,
    role: request.user.role,
    displayName: request.user.displayName,
    email: request.user.email,
    academyAccess: (request as FastifyRequest & { academyAccess?: boolean }).academyAccess,
    academyCrudAccess: (request as FastifyRequest & { academyCrudAccess?: boolean }).academyCrudAccess,
  };
}

export async function requireWorkshopAccess(request: FastifyRequest, reply: FastifyReply) {
  await requireAuth(request, reply);
  if (reply.sent) return;
  const access = await getAcademyWorkspaceAccess(request.server, actorFrom(request));
  if (!access.canAccess) {
    return reply.status(403).send({
      error: 'Forbidden',
      message: 'Bạn phải là thành viên đang hoạt động của Department Academy để truy cập Academy Workshop.',
    });
  }
  (request as FastifyRequest & { academyAccess?: boolean }).academyAccess = true;
  (request as FastifyRequest & { academyCrudAccess?: boolean }).academyCrudAccess = access.canManage;
}

export function parseWorkshopId(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new AcademySalesError(`${label} không hợp lệ.`);
  return parsed;
}

export function sendWorkshopError(fastify: FastifyInstance, reply: FastifyReply, cause: unknown, context: string) {
  if (cause instanceof AcademySalesError) {
    return reply.status(cause.statusCode).send({ error: cause.name, message: cause.message });
  }
  fastify.log.error(cause, context);
  return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể xử lý Academy Workshop.' });
}
