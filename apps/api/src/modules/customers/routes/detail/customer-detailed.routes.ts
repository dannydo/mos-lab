import { FastifyInstance } from 'fastify';
import { maskPhoneNumber, shouldMaskCustomerPhone } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { daysSinceVisit } from '../../../projections/customer-visit-projection.service.js';
import { BookingReschedulePermissionService } from '../../services/booking-reschedule-permission.service.js';
import { resolveIsForeign } from '../../services/foreign-customer.service.js';
import { createRouteHelpers } from '../helpers.js';
import {
  fetchCustomerProfileAndBalances,
  formatDetailedGemTransactions,
  resolveDetailedCustomerLegacyId,
} from './customer-detailed-balances.helper.js';
import { fetchCustomerDetailedBookingsNotesAndCalls } from './customer-detailed-bookings.helper.js';

export async function registerCustomerDetailedRoute(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerAccess } = createRouteHelpers(fastify);

  // GET /api/customers/:id/detailed
  // Return complete detailed customer profile, stats, bookings, notes, and call logs
  fastify.get('/customers/:id/detailed', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    try {
      const resolvedCustomerId = await resolveDetailedCustomerLegacyId(fastify, customerId);

      const canRescheduleAnyCustomer = await BookingReschedulePermissionService.hasGlobalRescheduleAccess(
        fastify,
        request.user
      );
      if (!canRescheduleAnyCustomer && !(await ensureTelesalesCustomerAccess(request, reply, resolvedCustomerId)))
        return;

      const core = await fetchCustomerProfileAndBalances(fastify, customerId, resolvedCustomerId);
      if (core.notFound) {
        return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' });
      }

      const {
        assigned,
        onlineConsultantName,
        row,
        elsaReservation,
        userContacts,
        completedOrders,
        completedServiceOrders,
        totalSpent,
        totalVisits,
        avgFrequency,
        orderPaymentMap,
        totalTips,
        tipRate,
        avgTip,
        comboBalances,
        gemBalance,
        gemTransactions,
        referrer,
        formattedReferred,
      } = core;

      const activity = await fetchCustomerDetailedBookingsNotesAndCalls(
        fastify,
        customerId,
        resolvedCustomerId,
        completedOrders
      );

      const comboWalletBalance = comboBalances.reduce((sum, cb) => {
        return sum + Number(cb.totalNormalBalanceAmount || 0) + Number(cb.totalRetainBalanceAmount || 0);
      }, 0);

      const latestVisitDate =
        completedServiceOrders.length > 0 && completedServiceOrders[0].bookingDate
          ? completedServiceOrders[0].bookingDate
          : completedOrders.length > 0 && completedOrders[0].bookingDate
            ? completedOrders[0].bookingDate
            : null;
      const daysSince = latestVisitDate ? daysSinceVisit(latestVisitDate) : null;
      const isMaskedRole = shouldMaskCustomerPhone(request.user?.role);

      return {
        customer: {
          id: row.id,
          name: row.name,
          phone: isMaskedRole ? maskPhoneNumber(row.phone) : row.phone,
          phones: userContacts.map((uc) => ({
            id: uc.id,
            phone_number: isMaskedRole ? maskPhoneNumber(uc.phone_number) : uc.phone_number,
            is_disabled: uc.is_disabled,
          })),
          email: row.email,
          gender: row.gender,
          dob: row.dob ? new Date(row.dob).toISOString().split('T')[0] : null,
          lastVisit: latestVisitDate ? new Date(latestVisitDate).toISOString() : null,
          lastCompletedVisit: latestVisitDate ? new Date(latestVisitDate).toISOString() : null,
          daysSinceLastVisit: daysSince !== null ? Number(daysSince) : null,
          bucket: row.bucket,
          avatar: row.avatar,
          onlineConsultant: onlineConsultantName,
          onlineConsultantId: assigned?.staffId || null,
          isDeleted: row.isDeleted === 1,
          isForeign: resolveIsForeign(row.is_foreign, row.is_foreign_overridden, row.phone),
          isForeignOverridden: Boolean(row.is_foreign_overridden),
          elsaReservation: elsaReservation
            ? {
                id: elsaReservation.id,
                legacyUserId: elsaReservation.legacyUserId,
                status: elsaReservation.status,
                reservationType: elsaReservation.reservationType,
                reason: elsaReservation.reason,
                startDate: elsaReservation.startDate.toISOString(),
                endDate: elsaReservation.endDate ? elsaReservation.endDate.toISOString() : null,
                reminderDate: elsaReservation.reminderDate ? elsaReservation.reminderDate.toISOString() : null,
                reminderNote: elsaReservation.reminderNote,
                isReminderDismissed: elsaReservation.isReminderDismissed,
                createdByStaffId: elsaReservation.createdByStaffId,
                createdByStaffName: elsaReservation.createdByStaffName,
                createdAt: elsaReservation.createdAt.toISOString(),
                updatedAt: elsaReservation.updatedAt.toISOString(),
              }
            : null,
        },
        stats: {
          totalSpent,
          totalVisits,
          comboCount: Number(row.normalCount || 0) + Number(row.retainCount || 0),
          comboWalletBalance,
          gemBalance,
          avgFrequency,
          totalTips,
          tipRate,
          avgTip,
        },
        comboBalances: comboBalances.map((cb) => ({
          id: String(cb.id),
          serviceId: cb.serviceId,
          serviceGroup: cb.serviceGroup,
          normalCount: Number(cb.normalCount),
          retainCount: Number(cb.retainCount),
          dateExpired: cb.dateExpired ? new Date(cb.dateExpired).toISOString() : null,
          dateCreated: cb.dateCreated ? new Date(cb.dateCreated).toISOString() : null,
          serviceKey: cb.serviceKey,
          serviceName: cb.serviceName,
          packageNormalCount: cb.packageNormalCount ? Number(cb.packageNormalCount) : null,
          packageKey: cb.packageKey,
          creatorStaffName: cb.creatorStaffName || null,
          packagePrice: cb.packagePrice ? Number(cb.packagePrice) : null,
        })),
        bookings: activity.formattedBookings,
        notes: activity.formattedNotes,
        calls: activity.formattedCalls,
        gemTransactions: formatDetailedGemTransactions(gemTransactions),
        tipTransactions: completedOrders.map((o) => {
          const payInfo = orderPaymentMap.get(Number(o.id));
          const orderSvs = activity.orderServicesByOrderId.get(Number(o.id)) || [];
          const checkOutStaffId = orderSvs.find((os) => os.check_out_staff_id)?.check_out_staff_id;
          const firstCvStaffId = o.technicianId || orderSvs.find((os) => os.assigned_staff_id)?.assigned_staff_id;

          return {
            id: Number(o.id),
            orderKey: o.orderKey,
            bookingDate: o.bookingDate ? new Date(o.bookingDate).toISOString().replace('Z', '+07:00') : null,
            totalPrice: Number(o.totalPrice || 0),
            tipAmount: payInfo ? payInfo.tips : 0,
            technicianName: (() => {
              if (!firstCvStaffId) return null;
              const name = activity.staffNamesMap.get(Number(firstCvStaffId));
              if (!name) return null;
              const isInactive = activity.staffInactiveMap.get(Number(firstCvStaffId));
              return isInactive ? `${name} (Đã nghỉ)` : name;
            })(),
            ccOutName: checkOutStaffId ? activity.staffNamesMap.get(Number(checkOutStaffId)) || null : null,
          };
        }),
        revenueTransactions: completedOrders.map((o) => {
          const payInfo = orderPaymentMap.get(Number(o.id));
          const orderSvs = activity.orderServicesByOrderId.get(Number(o.id)) || [];
          const checkOutStaffId = orderSvs.find((os) => os.check_out_staff_id)?.check_out_staff_id;
          const firstCvStaffId = o.technicianId || orderSvs.find((os) => os.assigned_staff_id)?.assigned_staff_id;

          return {
            id: Number(o.id),
            orderKey: o.orderKey,
            bookingDate: o.bookingDate ? new Date(o.bookingDate).toISOString().replace('Z', '+07:00') : null,
            totalPrice: Number(o.totalPrice || 0),
            tipAmount: payInfo ? payInfo.tips : 0,
            debtAmount: payInfo ? payInfo.debt : 0,
            technicianName: (() => {
              if (!firstCvStaffId) return null;
              const name = activity.staffNamesMap.get(Number(firstCvStaffId));
              if (!name) return null;
              const isInactive = activity.staffInactiveMap.get(Number(firstCvStaffId));
              return isInactive ? `${name} (Đã nghỉ)` : name;
            })(),
            ccOutName: checkOutStaffId ? activity.staffNamesMap.get(Number(checkOutStaffId)) || null : null,
            services: activity.servicesByOrderIdDetail.get(Number(o.id)) || [],
            combos: activity.combosByOrderIdDetail.get(Number(o.id)) || [],
            products: activity.productsByOrderIdDetail.get(Number(o.id)) || [],
          };
        }),
        referrer,
        referredUsers: formattedReferred,
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get detailed customer error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve detailed customer profile',
      });
    }
  });
}
