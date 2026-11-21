import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { isAdminOrSuperAdminRole, WingsGardenActionRequest, WingsGardenWarehouseId } from '@mos-lab/shared';
import { IosAuthContext, resolveIosAuth } from '../ios/services/ios-auth.service.js';
import {
  executeWingsGardenAction,
  getWingsGardenState,
  lookupWingsGardenQrWithOverlay,
} from './wings-garden.service.js';

interface HttpErrorLike {
  statusCode?: number;
  message?: string;
}

async function requireWingsGardenAdmin(
  fastify: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<IosAuthContext | null> {
  const authUser = await resolveIosAuth(fastify, request);
  if (!authUser) {
    reply.status(401).send({
      success: false,
      error: 'Vui lòng đăng nhập để truy cập Thiên Đường Nối Lông.',
    });
    return null;
  }

  // UI-010 Zero-Trust Admin-Only prototype lock
  if (!isAdminOrSuperAdminRole(authUser.role)) {
    reply.status(403).send({
      success: false,
      error: 'Tính năng Thiên Đường Nối Lông đang ở chế độ Admin-Only thử nghiệm.',
    });
    return null;
  }

  return authUser;
}

export async function wingsGardenRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get('/wings-garden/state', async (request, reply) => {
    const actor = await requireWingsGardenAdmin(fastify, request, reply);
    if (!actor) return;

    try {
      const query = request.query as { warehouseId?: string; previewRole?: string };
      const payload = await getWingsGardenState(fastify, actor, query?.warehouseId, query?.previewRole);
      return reply.send(payload);
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error fetching /api/wings-garden/state');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'Không thể tải dữ liệu Thiên Đường Nối Lông.',
      });
    }
  });

  fastify.get('/wings-garden/qr/lookup', async (request, reply) => {
    const actor = await requireWingsGardenAdmin(fastify, request, reply);
    if (!actor) return;

    try {
      const query = request.query as { code?: string; warehouseId?: string };
      const warehouseId: WingsGardenWarehouseId = Number(query?.warehouseId) === 41 ? 41 : 3;
      const result = await lookupWingsGardenQrWithOverlay(fastify, actor, String(query?.code || ''), warehouseId);
      return reply.send({ success: true, lookup: result });
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error looking up QR in /api/wings-garden/qr/lookup');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'Lỗi tra cứu mã QR từ kho legacy.',
      });
    }
  });

  fastify.post('/wings-garden/actions', async (request, reply) => {
    const actor = await requireWingsGardenAdmin(fastify, request, reply);
    if (!actor) return;

    try {
      const body = (request.body || {}) as WingsGardenActionRequest;
      const result = await executeWingsGardenAction(fastify, actor, body);
      return reply.send(result);
    } catch (error: unknown) {
      const err = error as HttpErrorLike;
      fastify.log.error(error, 'Error executing /api/wings-garden/actions');
      return reply.status(err?.statusCode || 500).send({
        success: false,
        error: err?.message || 'Không thể thực hiện thao tác Thiên Đường Nối Lông.',
      });
    }
  });
}
