import { FastifyInstance } from 'fastify';
import { SafeAny, canViewCustomerTipHistory, maskPhoneNumber, shouldMaskCustomerPhone } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { daysSinceVisit } from '../../../projections/customer-visit-projection.service.js';
import { TeamService } from '../../../teams/team.service.js';
import { BookingReschedulePermissionService } from '../../services/booking-reschedule-permission.service.js';
import { CustomerAccessService } from '../../services/customer-access.service.js';
import { resolveIsForeign } from '../../services/foreign-customer.service.js';
import { createRouteHelpers } from '../helpers.js';

export async function registerCustomerSummaryRoute(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerAccess } = createRouteHelpers(fastify);

  // GET /api/customers/:id/summary
  // Lightweight endpoint returning Customer Profile, KPI stats, and Tab Counts in <150ms
  fastify.get('/customers/:id/summary', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const customerId = parseInt(id, 10);
    const user = request.user as { id: number; role: string };

    if (isNaN(customerId)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Invalid customer ID' });
    }

    try {
      // 1. Permission check
      const assigned = await fastify.prisma.crm.crmCustomerAssignment.findFirst({
        where: { legacyUserId: customerId },
        include: { staff: true },
      });
      const onlineConsultantName = assigned?.staff?.displayName || 'Chưa phân bổ';

      // Super Admin inherits the complete Admin customer-detail scope. Keep
      // the assignment boundary only for roles that are not administrators.
      // FM and CHO retain read access to customer profile summaries (MOS-FEAT-267).
      const canRescheduleAnyCustomer = await BookingReschedulePermissionService.hasGlobalRescheduleAccess(
        fastify,
        user
      );
      const isManagementViewer = ['fm', 'cho'].includes(String(user.role || '').trim().toLowerCase());
      if (!canRescheduleAnyCustomer && !isManagementViewer) {
        if (CustomerAccessService.isTelesales(user)) {
          if (!(await ensureTelesalesCustomerAccess(request, reply, customerId))) {
            return;
          }
        } else {
          const isAssignedConsultant = assigned?.staffId === user.id;
          if (!isAssignedConsultant) {
            const isBkCsMember = await TeamService.isActiveCrmStaffMember(
              fastify,
              'BK_CS',
              user.id,
              'ACTIVE_BK_CS_STAFF_CONFIG'
            );

            if (!isBkCsMember) {
              return reply
                .status(403)
                .send({ error: 'Forbidden', message: 'Bạn không có quyền xem thông tin chi tiết khách hàng này.' });
            }
          }
        }
      }

      // 2. Parallel queries for maximum speed
      const customerSql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          up.avatar as avatar,
          COALESCE(up.is_deleted, 0) as isDeleted,
          up.is_foreign as is_foreign,
          up.is_foreign_overridden as is_foreign_overridden,
          COALESCE(uc.phone_number, '') as phone, 
          u.email,
          u.gender,
          u.date_of_birth as dob,
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          CASE
            WHEN elsa_res.id IS NOT NULL THEN 'COMBO_ELSA'
            WHEN usb.id IS NULL THEN 'SINGLE'
            WHEN (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) THEN 'COMBO_LIVE'
            ELSE 'COMBO_DEAD'
          END as bucket,
          usb.normal_count as normalCount,
          usb.retain_count as retainCount,
          usb.date_expired as expiryDate
        FROM user u
        LEFT JOIN user_profile up ON u.id = up.user_id
        LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
        LEFT JOIN user_service_balance usb ON u.id = usb.user_id
        LEFT JOIN mos_lab.crm_customer_elsa_reservations elsa_res ON elsa_res.legacy_user_id = u.id AND elsa_res.status = 'ACTIVE' AND (elsa_res.end_date IS NULL OR elsa_res.end_date >= NOW())
        WHERE u.id = ?
        LIMIT 1
      `;

      const [
        customerResult,
        userContacts,
        completedOrders,
        completedServiceOrders,
        gemBalanceRow,
        bookingCountResult,
        noteCountResult,
        callCount,
        timelineCount,
        referrerRow,
        referredUsers,
        elsaReservation,
        activeComboBalances,
      ] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(customerSql, customerId),
        fastify.prisma.legacy.user_contact.findMany({ where: { user_id: customerId } }),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT o.id, COALESCE(ro.actual_booking_date_start, o.booking_date_start) as bookingDate, o.total_price as totalPrice
           FROM \`order\` o
           LEFT JOIN report_order ro ON o.id = ro.order_id
           WHERE o.user_id = ? AND o.order_state = 'Completed'
           ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT o.id, COALESCE(ro.actual_booking_date_start, o.booking_date_start) as bookingDate, o.total_price as totalPrice
           FROM \`order\` o
           LEFT JOIN report_order ro ON o.id = ro.order_id
           WHERE o.user_id = ? AND o.order_state = 'Completed'
             AND NOT EXISTS (
               SELECT 1 FROM order_service os_w
               WHERE os_w.order_id = o.id
                 AND os_w.service_type IN ('Fix', 'Log', 'Adjust')
             )
           ORDER BY COALESCE(ro.actual_booking_date_start, o.booking_date_start) DESC`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT amount FROM user_balance WHERE user_id = ? AND currency_id = 3 LIMIT 1`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT COUNT(*) as cnt FROM \`order\` WHERE user_id = ?`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT COUNT(*) as cnt FROM user_note WHERE user_id = ? AND (is_disabled = 0 OR note_field_key = 'order_note')`,
          customerId
        ),
        fastify.prisma.crm.crmCallLog.count({ where: { legacyUserId: customerId } }),
        fastify.prisma.crm.crmAllocationLedgerEvent.count({ where: { legacyUserId: customerId } }),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT u.id, up.full_name as name, COALESCE(uc.phone_number, '') as phone
           FROM user u
           LEFT JOIN user_profile up ON u.id = up.user_id
           LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
           WHERE u.id = (SELECT referrer_user_id FROM user_profile WHERE user_id = ? LIMIT 1)
           LIMIT 1`,
          customerId
        ),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT u.id, up.full_name as name, COALESCE(uc.phone_number, '') as phone, u.date_created as dateCreated
           FROM user u
           LEFT JOIN user_profile up ON u.id = up.user_id
           LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
           WHERE up.referrer_user_id = ?
           ORDER BY u.id DESC`,
          customerId
        ),
        fastify.prisma.crm.crmCustomerElsaReservation.findFirst({
          where: {
            legacyUserId: customerId,
            status: 'ACTIVE',
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
          orderBy: { id: 'desc' },
        }),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT
             CONCAT('usb_', usb.id) as id,
             usb.service_id as serviceId,
             usb.service_group as serviceGroup,
             usb.normal_count as normalCount,
             usb.retain_count as retainCount,
             usb.date_expired as dateExpired,
             usb.date_created as dateCreated,
             s.service_key as serviceKey,
             COALESCE(sl.service_name, s.service_key) as serviceName,
             sp.normal_count as packageNormalCount,
             sp.service_price_package_key as packageKey,
             usb.total_normal_balance_amount as totalNormalBalanceAmount,
             usb.total_retain_balance_amount as totalRetainBalanceAmount,
             sp.service_price as packagePrice,
             up.full_name as creatorStaffName
           FROM user_service_balance usb
           LEFT JOIN service s ON usb.service_id = s.id
           LEFT JOIN service_language sl ON usb.service_id = sl.service_id AND sl.language_id = 1
           LEFT JOIN service_price sp ON usb.service_price_id = sp.id
           LEFT JOIN user_profile up ON COALESCE(usb.updated_staff_id, usb.created_staff_id) = up.user_id
           WHERE usb.user_id = ?
             AND (COALESCE(usb.normal_count, 0) + COALESCE(usb.retain_count, 0)) > 0
           ORDER BY usb.date_created DESC`,
          customerId
        ),
      ]);

      if (customerResult.length === 0) {
        return reply.status(404).send({ error: 'Not Found', message: 'Customer not found' });
      }
      const row = customerResult[0];

      const totalSpent = Math.round(completedOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0));
      const totalVisits = completedOrders.length;

      let avgFrequency = 0;
      const frequencyOrders = completedServiceOrders.length > 1 ? completedServiceOrders : completedOrders;
      if (frequencyOrders.length > 1) {
        const sortedBookingDates = [...frequencyOrders]
          .map((o) => new Date(o.bookingDate).getTime())
          .sort((a, b) => a - b);
        let totalDays = 0;
        for (let i = 1; i < sortedBookingDates.length; i++) {
          totalDays += (sortedBookingDates[i] - sortedBookingDates[i - 1]) / (1000 * 60 * 60 * 24);
        }
        avgFrequency = Number((totalDays / (sortedBookingDates.length - 1)).toFixed(1));
      }

      // Fetch tip summary from order_payment (strictly restricted to FM, CHO, and Admin/Super Admin)
      const canViewTipHistory = canViewCustomerTipHistory(user.role);
      const completedOrderIds = completedOrders.map((o) => Number(o.id));
      let totalTips = 0;
      let tipCount = 0;
      if (canViewTipHistory && completedOrderIds.length > 0) {
        const tipRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT SUM(tip_amount) as totalTips, COUNT(CASE WHEN tip_amount > 0 THEN 1 END) as tipCount
          FROM \`order_payment\`
          WHERE order_id IN (${completedOrderIds.join(',')})
        `);
        if (tipRows.length > 0 && tipRows[0].totalTips) {
          totalTips = Number(tipRows[0].totalTips || 0);
          tipCount = Number(tipRows[0].tipCount || 0);
        }
      }

      const tipRate = canViewTipHistory && totalVisits > 0 ? Number(((tipCount / totalVisits) * 100).toFixed(1)) : 0;
      const avgTip = canViewTipHistory && tipCount > 0 ? Math.round(totalTips / tipCount) : 0;
      const gemBalance = gemBalanceRow.length > 0 ? Number(gemBalanceRow[0].amount) : 0;
      const comboWalletBalance = activeComboBalances.reduce(
        (sum, combo) => sum + Number(combo.totalNormalBalanceAmount || 0) + Number(combo.totalRetainBalanceAmount || 0),
        0
      );

      const bookingCount = Number(bookingCountResult[0]?.cnt || 0);
      const noteCount = Number(noteCountResult[0]?.cnt || 0);

      let duplicateNotice: {
        originalCustomerId: number;
        originalCustomerName: string;
        bookingCount: number;
      } | null = null;

      // Duplicate / Ghost profile auto-detection
      if (bookingCount === 0 && userContacts.length === 0 && row.name && row.name !== 'No Name') {
        const potentialDuplicates = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT u.id, up.full_name as name, COUNT(o.id) as bookingCount
           FROM user u
           JOIN user_profile up ON u.id = up.user_id
           JOIN \`order\` o ON u.id = o.user_id
           WHERE u.id != ?
             AND up.is_deleted = 0
             AND (up.full_name = ? OR up.full_name LIKE ?)
           GROUP BY u.id, up.full_name
           ORDER BY bookingCount DESC
           LIMIT 1`,
          customerId,
          row.name,
          `${row.name}%`
        );
        if (potentialDuplicates.length > 0 && Number(potentialDuplicates[0].bookingCount) > 0) {
          duplicateNotice = {
            originalCustomerId: Number(potentialDuplicates[0].id),
            originalCustomerName: String(potentialDuplicates[0].name),
            bookingCount: Number(potentialDuplicates[0].bookingCount),
          };
        }
      }

      const referrer =
        referrerRow.length > 0
          ? {
              id: Number(referrerRow[0].id),
              name: referrerRow[0].name,
              phone: referrerRow[0].phone,
            }
          : null;

      const friendsGrouped = new Map<number, SafeAny>();
      for (const ru of referredUsers) {
        const friendId = Number(ru.id);
        if (!friendId) continue;
        if (!friendsGrouped.has(friendId)) {
          friendsGrouped.set(friendId, {
            id: friendId,
            name: ru.name || 'Khách hàng',
            phone: ru.phone || '',
            dateCreated: ru.dateCreated ? new Date(ru.dateCreated).toISOString() : null,
            rewardDiamonds: 0,
          });
        }
      }

      const latestVisitDate =
        completedServiceOrders.length > 0 && completedServiceOrders[0]?.bookingDate
          ? completedServiceOrders[0].bookingDate
          : completedOrders.length > 0 && completedOrders[0]?.bookingDate
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
        counts: {
          bookingCount,
          noteCount,
          callCount,
          timelineCount,
        },
        duplicateNotice,
        comboBalances: activeComboBalances.map((combo) => ({
          ...combo,
          normalCount: Number(combo.normalCount || 0),
          retainCount: Number(combo.retainCount || 0),
          packageNormalCount: combo.packageNormalCount ? Number(combo.packageNormalCount) : null,
          packagePrice: combo.packagePrice ? Math.round(Number(combo.packagePrice)) : null,
          dateExpired: combo.dateExpired ? new Date(combo.dateExpired).toISOString() : null,
          dateCreated: combo.dateCreated ? new Date(combo.dateCreated).toISOString() : null,
        })),
        referrer,
        referredUsers: Array.from(friendsGrouped.values()),
        permissions: {
          canViewTipHistory,
        },
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get summary customer error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve customer summary',
      });
    }
  });
}
