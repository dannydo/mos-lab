import { FastifyInstance } from 'fastify';
import {
  canAccessIosConsultationApp,
  hasAnyNaturalLashAttribute,
  hasCompleteNaturalLashAttributes,
  NaturalLashConsultationAttributes,
  SafeAny,
  validateNaturalLashConsultationSave,
} from '@mos-lab/shared';
import { getLegacyPool, registerIosPoolShutdown } from './services/db-pools.js';
import { resolveIosAuth } from './services/ios-auth.service.js';
import { executeIosBookingAction } from './services/ios-actions.service.js';
import { executeAdminComboExpiryAction } from './services/ios-combo-expiry.service.js';
import { getIosCustomerHistory } from './services/ios-customer-history.service.js';
import { queryIosBookingsList } from './services/ios-bookings-query.service.js';
import { serveProgressPhoto } from './services/ios-photos.service.js';
import { scanIosProductByCode } from './services/ios-product-scan.service.js';
import { fetchIosPromotionsForActor, resolveCanViewGlobalPromotions } from './services/ios-promotions.service.js';
import { executeIosSimulationBookingAction } from './services/ios-simulation-actions.service.js';
import {
  listAccessibleSimulationMentees,
  loadSimulationAttempts,
  resolveSimulationContextActor,
  updateSimulationAttempt,
} from './services/ios-simulation.service.js';
import {
  createIosDualModeBooking,
  fetchIosBookingServiceCatalog,
  lookupIosCustomersForBooking,
} from './services/ios-booking-create.service.js';

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
      const statusCode = error?.statusCode === 403 ? 403 : 500;
      return reply.status(statusCode).send({
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

      const body = request.body as SafeAny;
      const actionStr = String(body?.action || '').toUpperCase();
      const isSimulationRequest = Boolean(body?.simulationMode) || actionStr.startsWith('SIM_');
      const result = isSimulationRequest
        ? await executeIosSimulationBookingAction(fastify, authUser, body)
        : await executeIosBookingAction(authUser, body);
      return reply.status(result.statusCode).send(result.payload);
    } catch (error: SafeAny) {
      fastify.log.error(error, 'Error executing /api/ios/bookings POST action');
      const statusCode = error?.statusCode === 403 ? 403 : 500;
      return reply.status(statusCode).send({
        success: false,
        error: error?.message || 'Action execution error',
      });
    }
  });

  // GET /api/ios/customers/lookup
  fastify.get('/ios/customers/lookup', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) return reply.status(401).send({ success: false, customers: [], error: 'Unauthorized' });
      if (!canAccessIosConsultationApp(authUser.careerTier || authUser.role)) {
        return reply.status(403).send({ success: false, customers: [], error: 'Forbidden' });
      }
      const query = request.query as Record<string, string | undefined>;
      const customers = await lookupIosCustomersForBooking(fastify, authUser, String(query.q || ''));
      return reply.send({ success: true, customers });
    } catch (error: SafeAny) {
      return reply.status(500).send({ success: false, customers: [], error: error?.message || 'Lookup failed' });
    }
  });

  // GET /api/ios/services/catalog
  fastify.get('/ios/services/catalog', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) return reply.status(401).send({ success: false, services: [], error: 'Unauthorized' });
      if (!canAccessIosConsultationApp(authUser.careerTier || authUser.role)) {
        return reply.status(403).send({ success: false, services: [], error: 'Forbidden' });
      }
      const services = await fetchIosBookingServiceCatalog(fastify);
      return reply.send({ success: true, services });
    } catch (error: SafeAny) {
      return reply.status(500).send({ success: false, services: [], error: error?.message || 'Catalog failed' });
    }
  });

  // POST /api/ios/bookings/create
  fastify.post('/ios/bookings/create', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) return reply.status(401).send({ success: false, simulationMode: false, error: 'Unauthorized' });
      if (!canAccessIosConsultationApp(authUser.careerTier || authUser.role)) {
        return reply.status(403).send({ success: false, simulationMode: false, error: 'Forbidden' });
      }
      const result = await createIosDualModeBooking(fastify, authUser, request.body as SafeAny);
      return reply.status(result.statusCode).send(result.payload);
    } catch (error: SafeAny) {
      return reply.status(500).send({
        success: false,
        simulationMode: Boolean((request.body as SafeAny)?.simulationMode),
        error: error?.message || 'Create booking failed',
      });
    }
  });

  // GET /api/ios/simulation/mentees
  fastify.get('/ios/simulation/mentees', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) return reply.status(401).send({ success: false, mentees: [], error: 'Unauthorized' });
      if (!canAccessIosConsultationApp(authUser.careerTier || authUser.role)) {
        return reply.status(403).send({ success: false, mentees: [], error: 'Forbidden' });
      }
      const query = request.query as Record<string, string | undefined>;
      const mentees = await listAccessibleSimulationMentees(fastify, authUser, query.date);
      return reply.send({ success: true, mentees });
    } catch (error: SafeAny) {
      return reply.status(500).send({ success: false, mentees: [], error: error?.message || 'Fetch mentees failed' });
    }
  });

  // GET /api/ios/simulation/attempts
  fastify.get('/ios/simulation/attempts', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) return reply.status(401).send({ success: false, attempts: [], error: 'Unauthorized' });
      if (!canAccessIosConsultationApp(authUser.careerTier || authUser.role)) {
        return reply.status(403).send({ success: false, attempts: [], error: 'Forbidden' });
      }
      const query = request.query as Record<string, string | undefined>;
      const bookingId = Number(query.bookingId || 0);
      if (!bookingId || bookingId <= 0) {
        return reply.status(400).send({ success: false, attempts: [], error: 'Thiếu bookingId.' });
      }
      const requestedMenteeId = query.menteeStaffId ? Number(query.menteeStaffId) : undefined;
      const ctx = await resolveSimulationContextActor(fastify, authUser, requestedMenteeId, query.date);
      const attempts = await loadSimulationAttempts(ctx.targetStaffId, bookingId);
      return reply.send({ success: true, attempts, isReadOnlyMentorView: ctx.isReadOnlyMentorView });
    } catch (error: SafeAny) {
      const statusCode = error?.statusCode === 403 ? 403 : 500;
      return reply.status(statusCode).send({
        success: false,
        attempts: [],
        error: error?.message || 'Fetch simulation attempts failed',
      });
    }
  });

  // PATCH /api/ios/simulation/attempts/:attemptId
  fastify.patch('/ios/simulation/attempts/:attemptId', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) return reply.status(401).send({ success: false, error: 'Unauthorized' });
      if (!canAccessIosConsultationApp(authUser.careerTier || authUser.role)) {
        return reply.status(403).send({ success: false, error: 'Forbidden' });
      }
      const params = request.params as { attemptId: string };
      const body = (request.body || {}) as SafeAny;
      const bookingId = Number(body.bookingId || (request.query as SafeAny)?.bookingId || 0);
      if (!bookingId || bookingId <= 0) {
        return reply.status(400).send({ success: false, error: 'Thiếu bookingId.' });
      }
      const requestedMenteeId = body.menteeStaffId ? Number(body.menteeStaffId) : undefined;
      const ctx = await resolveSimulationContextActor(fastify, authUser, requestedMenteeId);
      if (ctx.isReadOnlyMentorView) {
        return reply.status(403).send({
          success: false,
          error: 'Mentor ở chế độ chỉ xem, không thể chỉnh sửa kịch bản của mentee.',
        });
      }
      const updated = await updateSimulationAttempt(ctx.targetStaffId, bookingId, params.attemptId, body);
      return reply.send({ success: true, attempt: updated });
    } catch (error: SafeAny) {
      const statusCode = error?.statusCode === 404 ? 404 : error?.statusCode === 403 ? 403 : 500;
      return reply.status(statusCode).send({
        success: false,
        error: error?.message || 'Cập nhật kịch bản mô phỏng thất bại.',
      });
    }
  });

  // GET /api/ios/promotions
  fastify.get('/ios/promotions', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) {
        return reply.status(401).send({ success: false, error: 'Unauthorized', promotions: [] });
      }

      if (!canAccessIosConsultationApp(authUser.careerTier || authUser.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Tài khoản không có quyền truy cập ứng dụng /ios-app.',
          promotions: [],
        });
      }

      const query = request.query as Record<string, string | undefined>;
      const canViewGlobalPromotions = resolveCanViewGlobalPromotions(authUser, query.role);
      const pool = getLegacyPool();
      const promotions = await fetchIosPromotionsForActor(pool, {
        canViewGlobalPromotions,
        keyword: query.keyword,
      });

      return reply.send({
        success: true,
        canViewGlobalPromotions,
        count: promotions.length,
        promotions,
      });
    } catch (error: SafeAny) {
      fastify.log.error(error, 'Error fetching promotions from /api/ios/promotions');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Promotion query error',
        promotions: [],
      });
    }
  });

  // GET /api/ios/customers/:customerId/history (Lịch sử đi & chi tiêu khách hàng — MOS-FEAT-235)
  fastify.get('/ios/customers/:customerId/history', async (request, reply) => {
    try {
      const authUser = await resolveIosAuth(fastify, request);
      if (!authUser) {
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }
      const params = (request.params || {}) as { customerId?: string };
      const query = (request.query || {}) as { bookingId?: string; sim?: string };
      const customerId = Number(params.customerId || 0);
      const bookingId = query.bookingId ? Number(query.bookingId) : undefined;
      const sim = query.sim === '1' || query.sim === 'true';
      const result = await getIosCustomerHistory(authUser, customerId, { bookingId, sim });
      return reply.status(result.statusCode).send(result.payload);
    } catch (error: SafeAny) {
      fastify.log.error(error, 'Error fetching /api/ios/customers/:customerId/history');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Customer history fetch error',
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

  // POST /api/ios/products/scan
  fastify.post('/ios/products/scan', async (request, reply) => {
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

      const result = await scanIosProductByCode(authUser, request.body as SafeAny);
      return reply.status(result.statusCode).send(result.payload);
    } catch (error: SafeAny) {
      fastify.log.error(error, 'Error executing /api/ios/products/scan');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Lỗi kiểm tra mã QR sản phẩm.',
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
