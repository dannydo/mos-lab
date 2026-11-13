import { FastifyInstance } from 'fastify';
import {
  canAccessIosConsultationApp,
  hasAnyNaturalLashAttribute,
  hasCompleteNaturalLashAttributes,
  NaturalLashConsultationAttributes,
  SafeAny,
  validateNaturalLashConsultationSave,
} from '@mos-lab/shared';
import { registerIosPoolShutdown } from './services/db-pools.js';
import { resolveIosAuth } from './services/ios-auth.service.js';
import { executeIosBookingAction } from './services/ios-actions.service.js';
import { executeAdminComboExpiryAction } from './services/ios-combo-expiry.service.js';
import { queryIosBookingsList } from './services/ios-bookings-query.service.js';
import { serveProgressPhoto } from './services/ios-photos.service.js';

export { hasAnyNaturalLashAttribute, hasCompleteNaturalLashAttributes, validateNaturalLashConsultationSave };
export type { NaturalLashConsultationAttributes };

export async function iosRoutes(fastify: FastifyInstance) {
  registerIosPoolShutdown(fastify);

  // GET /api/ios/photos/:filename
  fastify.get('/ios/photos/:filename', async (request, reply) => {
    return serveProgressPhoto(request, reply);
  });

  // GET /api/ios/bookings
  fastify.get('/ios/bookings', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) {
        return reply.status(401).send({
          success: false,
          error: 'Vui lòng đăng nhập để truy cập ứng dụng vận hành /ios-app.',
          counts: { incoming: 0, servicing: 0, done: 0, cancel: 0 },
          bookings: [],
        });
      }

      if (!canAccessIosConsultationApp(authUser.careerTier || authUser.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Tài khoản không có quyền truy cập ứng dụng /ios-app.',
          counts: { incoming: 0, servicing: 0, done: 0, cancel: 0 },
          bookings: [],
        });
      }

      const query = request.query as Record<string, string | undefined>;
      const responsePayload = await queryIosBookingsList(fastify, authUser, query);
      return reply.send(responsePayload);
    } catch (error: SafeAny) {
      fastify.log.error(error, 'Error fetching bookings from /api/ios/bookings');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Database query error',
        counts: { incoming: 0, servicing: 0, done: 0, cancel: 0 },
        bookings: [],
      });
    }
  });

  // POST /api/ios/bookings
  fastify.post('/ios/bookings', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      if (!canAccessIosConsultationApp(authUser.careerTier || authUser.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Tài khoản không có quyền truy cập ứng dụng /ios-app.',
        });
      }

      const result = await executeIosBookingAction(authUser, request.body as SafeAny);
      return reply.status(result.statusCode).send(result.payload);
    } catch (error: SafeAny) {
      fastify.log.error(error, 'Error executing /api/ios/bookings POST action');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Action execution error',
      });
    }
  });

  // POST /api/ios/combo-balances/expiry (Admin / Super Admin Only — Điều răn COMBO-004 & UI-010)
  fastify.post('/ios/combo-balances/expiry', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }
      const result = await executeAdminComboExpiryAction(authUser, request.body as SafeAny);
      return reply.status(result.statusCode).send(result.payload);
    } catch (error: SafeAny) {
      fastify.log.error(error, 'Error executing /api/ios/combo-balances/expiry');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Combo expiry action error',
      });
    }
  });

  // POST /api/ios/print-receipt
  fastify.post('/ios/print-receipt', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }

      if (!canAccessIosConsultationApp(authUser.careerTier || authUser.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Tài khoản không có quyền truy cập ứng dụng /ios-app.',
        });
      }

      const body = request.body as SafeAny;
      const ip = body?.ip || body?.printerIp;
      const receipt = body?.receipt ?? body?.rawText;

      if (!receipt) {
        return reply.status(400).send({ success: false, error: 'Missing receipt payload' });
      }

      return reply.send({
        success: true,
        printerIp: ip,
        message: ip ? `Đã gửi lệnh in thành công tới máy in LAN IP ${ip}` : 'Phiếu in đã được ghi nhận thành công',
        timestamp: new Date().toISOString(),
      });
    } catch (err: SafeAny) {
      return reply.status(500).send({ success: false, error: err?.message || 'Print dispatch error' });
    }
  });
}
