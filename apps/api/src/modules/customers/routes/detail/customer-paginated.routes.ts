import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { BookingReschedulePermissionService } from '../../services/booking-reschedule-permission.service.js';
import { ComboRecognitionService } from '../../services/combo-recognition.service.js';
import { LashSpecificationService } from '../../services/lash-specification.service.js';
import { createRouteHelpers } from '../helpers.js';

export async function registerCustomerPaginatedRoutes(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerAccess } = createRouteHelpers(fastify);

  // GET /api/customers/:id/bookings
  // Paginated bookings endpoint
  fastify.get('/customers/:id/bookings', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    const { page = '1', limit = '15' } = request.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    const canRescheduleAnyCustomer = await BookingReschedulePermissionService.hasGlobalRescheduleAccess(
      fastify,
      request.user
    );
    if (!canRescheduleAnyCustomer && !(await ensureTelesalesCustomerAccess(request, reply, customerId))) return;

    try {
      const countResult = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT COUNT(*) as cnt FROM \`order\` WHERE user_id = ?`,
        customerId
      );
      const totalCount = Number(countResult[0]?.cnt || 0);

      const bookingsSql = `
        SELECT 
          o.id,
          o.order_key as orderKey,
          o.booking_date_start as bookingDate,
          o.booking_note as bookingNote,
          o.order_state as orderState,
          o.total_price as totalPrice,
          o.assigned_staff_id as technicianId,
          o.client_store_id as storeId,
          o.created_staff_id as createdStaffId,
          COALESCE(csl.client_store_name, 'Estella Place') as branchName,
          up.full_name as assignedTechnicianName
        FROM \`order\` o
        LEFT JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        LEFT JOIN user_profile up ON o.assigned_staff_id = up.user_id
        WHERE o.user_id = ?
        ORDER BY o.booking_date_start DESC
        LIMIT ? OFFSET ?
      `;

      const bookingsRaw = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        bookingsSql,
        customerId,
        limitNum,
        offset
      );

      const bookingIds = bookingsRaw.map((b) => Number(b.id));
      const [bookingComboLiveByOrderId, bookingLashSpecsByOrderId] = await Promise.all([
        ComboRecognitionService.getBookingComboLiveStatesByOrderIds(fastify, bookingIds),
        LashSpecificationService.getLashSpecsByOrderIds(fastify, bookingIds),
      ]);
      const servicesByOrderId = new Map<number, string[]>();
      const serviceStatusesByOrderId = new Map<
        number,
        { serviceName: string; userServiceType: string | null; serviceType?: string | null }[]
      >();
      const serviceTypesByOrderId = new Map<number, string[]>();
      let orderServicesDetails: SafeAny[] = [];
      let auditLogCounts: SafeAny[] = [];

      if (bookingIds.length > 0) {
        const [servicesRaw, osDetails, logsRes] = await Promise.all([
          fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT
              os.order_id as orderId,
              COALESCE(sl.service_name, s.service_key) as serviceName,
              os.user_service_type as userServiceType,
              os.service_type as serviceType
            FROM order_service os
            LEFT JOIN service s ON os.service_id = s.id
            LEFT JOIN service_language sl ON os.service_id = sl.service_id AND sl.language_id = 1
            WHERE os.order_id IN (${bookingIds.join(',')})
          `),
          fastify.prisma.legacy.order_service.findMany({
            where: { order_id: { in: bookingIds } },
            select: {
              order_id: true,
              assigned_staff_id: true,
              check_in_staff_id: true,
              check_out_staff_id: true,
            },
          }),
          fastify.prisma.crm.crmBookingLog.groupBy({
            by: ['orderId'],
            _count: { id: true },
            where: { orderId: { in: bookingIds } },
          }),
        ]);

        orderServicesDetails = osDetails;
        auditLogCounts = logsRes;
        for (const s of servicesRaw) {
          const orderId = Number(s.orderId);
          const list = servicesByOrderId.get(orderId) || [];
          list.push(s.serviceName);
          servicesByOrderId.set(orderId, list);

          const statuses = serviceStatusesByOrderId.get(orderId) || [];
          statuses.push({
            serviceName: String(s.serviceName || 'Dịch vụ'),
            userServiceType: s.userServiceType ? String(s.userServiceType) : null,
            serviceType: s.serviceType ? String(s.serviceType) : null,
          });
          serviceStatusesByOrderId.set(orderId, statuses);

          if (s.serviceType) {
            const types = serviceTypesByOrderId.get(orderId) || [];
            types.push(String(s.serviceType));
            serviceTypesByOrderId.set(orderId, types);
          }
        }
      }

      const auditCountMap = new Map<number, number>(auditLogCounts.map((item) => [item.orderId, item._count.id]));
      const orderServicesByOrderId = new Map<number, SafeAny[]>();
      for (const orderService of orderServicesDetails) {
        const orderId = Number(orderService.order_id);
        const services = orderServicesByOrderId.get(orderId) || [];
        services.push(orderService);
        orderServicesByOrderId.set(orderId, services);
      }

      // Collect staff IDs for name lookup
      const staffUserIds = new Set<number>();
      for (const b of bookingsRaw) {
        if (b.technicianId) staffUserIds.add(Number(b.technicianId));
        if (b.createdStaffId) staffUserIds.add(Number(b.createdStaffId));
      }
      for (const os of orderServicesDetails) {
        if (os.assigned_staff_id) staffUserIds.add(Number(os.assigned_staff_id));
        if (os.check_in_staff_id) staffUserIds.add(Number(os.check_in_staff_id));
        if (os.check_out_staff_id) staffUserIds.add(Number(os.check_out_staff_id));
      }

      const staffIdArray = Array.from(staffUserIds);
      const staffProfiles =
        staffIdArray.length > 0
          ? await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT user_id as userId, full_name as fullName, is_disabled as isDisabled, is_leaved as isLeaved
        FROM user_profile
        WHERE user_id IN (${staffIdArray.join(',')})
      `)
          : [];

      const staffNamesMap = new Map<number, string>(staffProfiles.map((s) => [Number(s.userId), s.fullName]));
      const staffInactiveMap = new Map<number, boolean>(
        staffProfiles.map((s) => [
          Number(s.userId),
          s.isDisabled === 1 || s.isDisabled === true || s.isLeaved === 1 || s.isLeaved === true,
        ])
      );

      const items = bookingsRaw.map((b) => {
        const orderSvs = orderServicesByOrderId.get(Number(b.id)) || [];
        const rawCheckIn = orderSvs.find((os) => os.check_in_staff_id && os.check_in_staff_id > 0)?.check_in_staff_id;
        const rawCheckOut = orderSvs.find(
          (os) => os.check_out_staff_id && os.check_out_staff_id > 0
        )?.check_out_staff_id;
        const firstCvStaffId =
          b.technicianId || orderSvs.find((os) => os.assigned_staff_id && os.assigned_staff_id > 0)?.assigned_staff_id;
        const rawBooker = b.createdStaffId;

        const isCheckedIn = [
          'CheckIn',
          'Consultation',
          'Preparation',
          'ServiceStart',
          'ServiceCleaned',
          'ServiceEnd',
          'Checkout',
          'Payment',
          'ServiceCompleted',
          'Completed',
        ].includes(b.orderState);

        const ccInName = isCheckedIn && rawCheckIn ? staffNamesMap.get(Number(rawCheckIn)) || null : null;
        const ccOutName = isCheckedIn && rawCheckOut ? staffNamesMap.get(Number(rawCheckOut)) || null : null;
        const bookerName = rawBooker ? staffNamesMap.get(Number(rawBooker)) || null : null;

        const technicianName = (() => {
          if (!firstCvStaffId) return null;
          const name = staffNamesMap.get(Number(firstCvStaffId));
          if (!name) return null;
          const isInactive = staffInactiveMap.get(Number(firstCvStaffId));
          return isInactive ? `${name} (Đã nghỉ)` : name;
        })();

        const bServiceTypes = serviceTypesByOrderId.get(Number(b.id)) || [];
        const isWarranty =
          bServiceTypes.length > 0 && bServiceTypes.every((st) => ['Fix', 'Log', 'Adjust'].includes(st));

        return {
          id: Number(b.id),
          orderKey: b.orderKey,
          bookingDate: b.bookingDate ? new Date(b.bookingDate).toISOString().replace('Z', '+07:00') : null,
          bookingNote: b.bookingNote || null,
          orderState: b.orderState,
          totalPrice: Number(b.totalPrice || 0),
          technicianId: firstCvStaffId ? Number(firstCvStaffId) : null,
          technicianName,
          ccInName,
          ccOutName,
          bookerName,
          storeId: b.storeId ? Number(b.storeId) : null,
          branchName: b.branchName,
          services: servicesByOrderId.get(Number(b.id)) || [],
          serviceTypes: bServiceTypes,
          isWarranty,
          serviceStatuses: serviceStatusesByOrderId.get(Number(b.id)) || [],
          hasLiveComboAtBooking: bookingComboLiveByOrderId.get(Number(b.id)) || false,
          lashSpecifications: bookingLashSpecsByOrderId.get(Number(b.id)) || [],
          lashSpecs: bookingLashSpecsByOrderId.get(Number(b.id)) || [],
          auditLogCount: auditCountMap.get(Number(b.id)) || 0,
        };
      });

      return {
        items,
        totalCount,
        hasMore: offset + items.length < totalCount,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customer bookings error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer bookings',
      });
    }
  });

  // GET /api/customers/:id/calls
  // Paginated call logs endpoint
  fastify.get('/customers/:id/calls', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    const { page = '1', limit = '15' } = request.query as { page?: string; limit?: string };

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const offset = (pageNum - 1) * limitNum;

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    if (!(await ensureTelesalesCustomerAccess(request, reply, customerId))) return;

    try {
      const [totalCount, logs] = await Promise.all([
        fastify.prisma.crm.crmCallLog.count({ where: { legacyUserId: customerId } }),
        fastify.prisma.crm.crmCallLog.findMany({
          where: { legacyUserId: customerId },
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limitNum,
        }),
      ]);

      const staffIds = Array.from(new Set(logs.map((l) => l.staffId)));
      const staffList =
        staffIds.length > 0
          ? await fastify.prisma.crm.crmStaff.findMany({
              where: { id: { in: staffIds } },
              select: { id: true, displayName: true, avatarUrl: true },
            })
          : [];

      const staffMap = new Map(staffList.map((s) => [s.id, s.displayName]));
      const staffAvatarUrlMap = new Map(staffList.map((s) => [s.id, s.avatarUrl || null]));

      const items = logs.map((log) => ({
        id: log.id,
        planId: log.planId,
        callType: log.callType,
        callResult: log.callResult,
        durationSec: log.durationSec,
        note: log.note,
        outcome: log.outcome,
        callbackDate: log.callbackDate ? new Date(log.callbackDate).toISOString().split('T')[0] : null,
        createdAt: log.createdAt.toISOString(),
        staffName: staffMap.get(log.staffId) || 'Unknown Staff',
        staffAvatar: staffAvatarUrlMap.get(log.staffId) || null,
      }));

      return {
        items,
        totalCount,
        hasMore: offset + items.length < totalCount,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get customer calls error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer calls',
      });
    }
  });
}
