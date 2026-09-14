import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { isAdminOrSuperAdminRole, SafeAny } from '@mos-lab/shared';
import { getBkPaystubData } from '../../kpi/services/bk-salary.service.js';
import { CustomerAccessService } from '../services/customer-access.service.js';
import { TeamService } from '../../teams/team.service.js';
import { createRouteHelpers } from './helpers.js';

export async function registerAppointmentsRoutes(fastify: FastifyInstance) {
  const { ensureTelesalesCustomerAccess } = createRouteHelpers(fastify);

  // GET /api/customers/appointments
  // Get list of appointments for assigned customers
  fastify.get('/customers/appointments', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, type, status, staffId, storeId, page, limit, pageSize, missedStatusFilter } =
      request.query as {
        dateFrom?: string;
        dateTo?: string;
        type?: 'pending' | 'missed' | 'completed';
        status?: string;
        staffId?: string;
        storeId?: string;
        page?: string;
        limit?: string;
        pageSize?: string;
        missedStatusFilter?: 'ALL' | 'UNTAGGED' | 'FOLLOWUP' | 'RESOLVED';
      };

    const user = request.user as { id: number; role: string };

    if (!dateFrom || !dateTo) {
      return reply.status(400).send({ error: 'Bad Request', message: 'dateFrom and dateTo are required' });
    }

    const pageNum = parseInt(page || '1', 10) || 1;
    const limitNum = parseInt(limit || pageSize || '50', 10) || 50;
    const offsetNum = (pageNum - 1) * limitNum;

    try {
      // 1. Determine the target staff assignments or appointment filters
      let filterByStaff = false;
      let targetStaffId = user.id;

      if (user.role === 'admin') {
        if (staffId && staffId !== 'all') {
          targetStaffId = parseInt(staffId, 10);
          filterByStaff = !isNaN(targetStaffId);
        }
      } else {
        filterByStaff = true;
      }

      let staffLegacyId: number | null = null;
      let staffRole: string = 'telesales';

      if (filterByStaff) {
        const staff = await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: targetStaffId },
        });

        if (staff) {
          staffRole = staff.role;
          // Strip " CC" suffix from name if it exists to match legacy user full_name
          const cleanName = staff.displayName.replace(/\s+CC$/i, '').trim();

          const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `
            SELECT up.user_id as userId
            FROM \`staff_profile\` sp
            JOIN \`user_profile\` up ON sp.user_id = up.user_id
            WHERE up.provider = 'Staff' AND up.is_disabled = 0
              AND (up.full_name = ? OR up.full_name = ?)
            ORDER BY up.user_id DESC
            LIMIT 1
          `,
            cleanName,
            cleanName + ' '
          );

          if (profiles.length > 0) {
            staffLegacyId = Number(profiles[0].userId);
          }
        }
      }

      // If staff selected but no corresponding legacy user found, return empty list
      if (filterByStaff && !staffLegacyId) {
        return { data: [], total: 0 };
      }

      const telesalesAssignmentIds = CustomerAccessService.isTelesales(user)
        ? await fastify.prisma.crm.crmCustomerAssignment.findMany({
            where: { staffId: user.id },
            select: { legacyUserId: true },
          })
        : [];
      if (CustomerAccessService.isTelesales(user) && telesalesAssignmentIds.length === 0) {
        return { data: [], total: 0 };
      }
      const telesalesCustomerIdSql = telesalesAssignmentIds.map((assignment) => assignment.legacyUserId).join(',');

      // Query crm_missed_logs IDs via Prisma CRM Client to avoid raw SQL cross-database issues
      let missedFilterCond = '';
      if (type === 'missed' && missedStatusFilter && missedStatusFilter !== 'ALL') {
        if (missedStatusFilter === 'UNTAGGED') {
          const logs = await fastify.prisma.crm.crmMissedLog.findMany({ select: { orderId: true } });
          if (logs.length > 0) {
            const ids = logs.map((l) => l.orderId).join(',');
            missedFilterCond = ` AND o.id NOT IN (${ids})`;
          }
        } else if (missedStatusFilter === 'FOLLOWUP') {
          const logs = await fastify.prisma.crm.crmMissedLog.findMany({
            where: { followUpStatus: { in: ['PENDING', 'CONTACTED'] } },
            select: { orderId: true },
          });
          if (logs.length > 0) {
            const ids = logs.map((l) => l.orderId).join(',');
            missedFilterCond = ` AND o.id IN (${ids})`;
          } else {
            missedFilterCond = ` AND 1=0`;
          }
        } else if (missedStatusFilter === 'RESOLVED') {
          const logs = await fastify.prisma.crm.crmMissedLog.findMany({
            where: { followUpStatus: { in: ['RESCHEDULED', 'CANCELLED', 'UNREACHABLE'] } },
            select: { orderId: true },
          });
          if (logs.length > 0) {
            const ids = logs.map((l) => l.orderId).join(',');
            missedFilterCond = ` AND o.id IN (${ids})`;
          } else {
            missedFilterCond = ` AND 1=0`;
          }
        }
      }

      const cleanDateFrom = dateFrom.includes(' ') ? dateFrom : `${dateFrom} 00:00:00`;
      const cleanDateTo = dateTo.includes(' ') ? dateTo : `${dateTo} 23:59:59`;

      // 2. Candidate ID lookup using B-tree indexed fields (o.booking_date_start) to avoid full-table scans
      const t0 = performance.now();
      const candidateOrders = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `
        SELECT o.id FROM \`order\` o
        WHERE o.booking_date_start >= ? AND o.booking_date_start <= ?
      `,
        cleanDateFrom,
        cleanDateTo
      );
      const t1 = performance.now();

      const candidateIds = candidateOrders.map((o) => Number(o.id)).filter((id) => id > 0);
      // A date without bookings must still return its CV working/OFF plan. The
      // schedule drawer uses dailyCapacities to plan tomorrow, independently of
      // whether a customer has booked yet.
      const candidateIdSql = candidateIds.length > 0 ? candidateIds.join(',') : 'NULL';

      // Batch query report_order using indexed order_id
      const reportRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT order_id as orderId, actual_booking_date_start as actualBookingDateStart
        FROM report_order
        WHERE order_id IN (${candidateIdSql})
      `);
      const t2 = performance.now();

      const reportMap = new Map<number, string | null>();
      reportRows.forEach((r) => {
        if (r.actualBookingDateStart) {
          reportMap.set(Number(r.orderId), new Date(r.actualBookingDateStart).toISOString());
        }
      });

      let countSql = `
        SELECT COUNT(*) as total
        FROM \`order\` o
        WHERE o.id IN (${candidateIdSql})
      `;
      const countParams: SafeAny[] = [];

      if (filterByStaff) {
        if (staffLegacyId) {
          if (staffRole === 'oc') {
            countSql += ` AND o.assigned_staff_id = ?`;
          } else {
            countSql += ` AND o.created_staff_id = ?`;
          }
          countParams.push(staffLegacyId);
        } else {
          countSql += ` AND 1=0`;
        }
      }

      if (telesalesCustomerIdSql) {
        countSql += ` AND o.user_id IN (${telesalesCustomerIdSql})`;
      }

      if (storeId && storeId !== 'all') {
        const storeIds = String(storeId)
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));
        if (storeIds.length === 1) {
          countSql += ` AND o.client_store_id = ?`;
          countParams.push(storeIds[0]);
        } else if (storeIds.length > 1) {
          countSql += ` AND o.client_store_id IN (${storeIds.join(',')})`;
        }
      }

      const filterType = (type || (status && status !== 'all' ? status : '')).toLowerCase();

      if (filterType === 'completed') {
        countSql += ` AND (o.order_state IN ('Completed', 'CheckOut') OR o.total_price > 0)`;
      } else if (filterType === 'missed') {
        countSql +=
          ` AND (o.booking_date_start <= NOW() AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut'))` +
          missedFilterCond;
      } else if (filterType === 'pending') {
        countSql += ` AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut')`;
      }

      const countResult = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(countSql, ...countParams);
      const total = Number(countResult[0]?.total || 0);
      const t3 = performance.now();

      // 3. Query orders/bookings in range with pagination
      let sql = `
        SELECT 
          o.id,
          o.order_key as orderKey,
          o.promotion_id as promotionId,
          o.selected_promotion_id as selectedPromotionId,
          o.booking_date_start as bookingDateStart,
          DATE_FORMAT(o.booking_date_start, '%H:%i') as actualBookingTime,
          o.booking_date_end as bookingDateEnd,
          o.booking_note as bookingNote,
          o.booking_channels as bookingChannel,
          o.order_state as orderState,
          o.total_price as totalPrice,
          o.user_id as userId,
          o.date_created as dateCreated,
          o.assigned_staff_id as technicianId,
          up_tech.full_name as technicianName,
          up_tech.avatar as technicianAvatar,
          o.client_store_id as storeId,
          COALESCE(csl.client_store_name, 'Estella Place') as branchName,
          COALESCE(up.full_name, 'No Name') as customerName,
          up.avatar as customerAvatar,
          COALESCE(
            (SELECT phone_number FROM user_contact WHERE user_id = o.user_id AND is_disabled = 0 AND phone_number IS NOT NULL AND phone_number != '' ORDER BY id DESC LIMIT 1),
            ''
          ) as customerPhone,
          up_created.full_name as bookerName,
          o.created_staff_id as createdStaffId
        FROM \`order\` o
        LEFT JOIN user_profile up ON o.user_id = up.user_id
        LEFT JOIN user_profile up_tech ON o.assigned_staff_id = up_tech.user_id
        LEFT JOIN user_profile up_created ON o.created_staff_id = up_created.user_id
        LEFT JOIN client_store_language csl ON o.client_store_id = csl.client_store_id AND csl.language_id = 1
        WHERE o.id IN (${candidateIdSql})
      `;

      const params: SafeAny[] = [];

      if (filterByStaff) {
        if (staffLegacyId) {
          if (staffRole === 'oc') {
            sql += ` AND o.assigned_staff_id = ?`;
          } else {
            sql += ` AND o.created_staff_id = ?`;
          }
          params.push(staffLegacyId);
        } else {
          sql += ` AND 1=0`;
        }
      }

      if (telesalesCustomerIdSql) {
        sql += ` AND o.user_id IN (${telesalesCustomerIdSql})`;
      }

      if (storeId && storeId !== 'all') {
        const storeIds = String(storeId)
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !isNaN(n));
        if (storeIds.length === 1) {
          sql += ` AND o.client_store_id = ?`;
          params.push(storeIds[0]);
        } else if (storeIds.length > 1) {
          sql += ` AND o.client_store_id IN (${storeIds.join(',')})`;
        }
      }

      if (filterType === 'completed') {
        sql += ` AND (o.order_state IN ('Completed', 'CheckOut') OR o.total_price > 0)`;
      } else if (filterType === 'missed') {
        sql +=
          ` AND (o.booking_date_start <= NOW() AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut'))` +
          missedFilterCond;
      } else if (filterType === 'pending') {
        sql += ` AND (o.total_price IS NULL OR o.total_price = 0) AND o.order_state NOT IN ('Completed', 'CheckOut')`;
      }

      sql += ` ORDER BY o.booking_date_start ASC LIMIT ? OFFSET ?`;
      params.push(limitNum, offsetNum);

      const result = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql, ...params);
      const t4 = performance.now();

      // The CRM branch catalog owns the short display code. Keep it alongside
      // the legacy store name so every schedule consumer receives the same
      // canonical code instead of deriving EP/DT/PXL in the browser.
      const appointmentStoreIds = Array.from(
        new Set(
          result.map((order) => Number(order.storeId)).filter((storeId) => Number.isInteger(storeId) && storeId > 0)
        )
      );
      const branchCodeByStoreId = new Map<number, string>();
      if (appointmentStoreIds.length > 0) {
        const branchRows = await fastify.prisma.crm.crmStore.findMany({
          where: { legacyClientStoreId: { in: appointmentStoreIds } },
          select: { legacyClientStoreId: true, code: true },
        });
        branchRows.forEach((branch) => {
          if (branch.legacyClientStoreId) {
            branchCodeByStoreId.set(branch.legacyClientStoreId, branch.code);
          }
        });
      }

      fastify.log.info(
        `[APPOINTMENTS TIMING] candidateOrders: ${Math.round(t1 - t0)}ms, reportRows: ${Math.round(t2 - t1)}ms, countResult: ${Math.round(t3 - t2)}ms, mainSql: ${Math.round(t4 - t3)}ms`
      );

      // 4. Fetch payment details and service details for completed/active orders to calculate financial metrics
      const orderIds = result.map((o) => Number(o.id));
      const completedOrderIds = result.filter((o) => o.orderState === 'Completed').map((o) => Number(o.id));

      const orderPaymentMap = new Map<number, { tips: number; debt: number; totalPaid: number }>();
      if (completedOrderIds.length > 0) {
        const orderPayments = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT order_id as orderId, tip_amount as tipAmount, paid_credit_amount as paidCredit, paid_cash_amount as paidCash, paid_credit_card_amount as paidCard, paid_bank_transfer_amount as paidBank, debt_amount as debt
          FROM \`order_payment\`
          WHERE order_id IN (${completedOrderIds.join(',')})
        `);
        orderPayments.forEach((op: SafeAny) => {
          const existing = orderPaymentMap.get(Number(op.orderId)) || { tips: 0, debt: 0, totalPaid: 0 };
          const paidSum =
            Number(op.paidCredit || 0) + Number(op.paidCash || 0) + Number(op.paidCard || 0) + Number(op.paidBank || 0);
          orderPaymentMap.set(Number(op.orderId), {
            tips: existing.tips + Number(op.tipAmount || 0),
            debt: existing.debt + Number(op.debt || 0),
            totalPaid: existing.totalPaid + paidSum,
          });
        });
      }

      const orderServicesMap = new Map<number, SafeAny[]>();
      const serviceNameMap = new Map<number, string>();
      if (orderIds.length > 0) {
        const orderServices = await fastify.prisma.legacy.order_service.findMany({
          where: { order_id: { in: orderIds } },
        });
        orderServices.forEach((os) => {
          const l = orderServicesMap.get(os.order_id) || [];
          l.push(os);
          orderServicesMap.set(os.order_id, l);
        });

        const serviceIds = Array.from(new Set(orderServices.map((os) => os.service_id)));
        if (serviceIds.length > 0) {
          const serviceLanguages = await fastify.prisma.legacy.service_language.findMany({
            where: { service_id: { in: serviceIds } },
          });
          serviceLanguages.forEach((sl) => {
            serviceNameMap.set(sl.service_id, sl.service_name);
          });
        }
      }

      // Query promotions for all appointments in current page
      const promoDetailsMap = new Map<number, { name: string; discountPercentage: number; discountAmount: number }>();
      const promoIds = Array.from(
        new Set([
          ...result.map((o) => Number(o.promotionId)).filter((id) => id > 0),
          ...result.map((o) => Number(o.selectedPromotionId)).filter((id) => id > 0),
          ...Array.from(orderServicesMap.values())
            .flat()
            .map((os: SafeAny) => Number(os.promotion_id))
            .filter((id) => id > 0),
        ])
      );

      if (promoIds.length > 0) {
        const promotionRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT p.id, p.promotion_key as promotionKey, p.discount_percentage as discountPercentage, p.discount_amount as discountAmount, pl.promotion_name as name
          FROM promotion p
          LEFT JOIN promotion_language pl ON p.id = pl.promotion_id AND pl.language_id = 1
          WHERE p.id IN (${promoIds.join(',')})
        `);
        promotionRows.forEach((p) => {
          promoDetailsMap.set(Number(p.id), {
            name: p.name || p.promotionKey || `KM #${p.id}`,
            discountPercentage: Number(p.discountPercentage || 0),
            discountAmount: Number(p.discountAmount || 0),
          });
        });
      }

      // Query missed logs from CRM DB for returned appointments
      const missedLogsMap = new Map<number, SafeAny>();
      if (orderIds.length > 0) {
        const missedLogs = await fastify.prisma.crm.crmMissedLog.findMany({
          where: { orderId: { in: orderIds } },
        });
        missedLogs.forEach((ml) => {
          missedLogsMap.set(ml.orderId, {
            id: ml.id,
            orderId: ml.orderId,
            reasonCategory: ml.reasonCategory,
            responsibility: ml.responsibility,
            note: ml.note,
            followUpStatus: ml.followUpStatus,
            createdBy: ml.createdBy,
            createdAt: ml.createdAt ? new Date(ml.createdAt).toISOString() : null,
            updatedAt: ml.updatedAt ? new Date(ml.updatedAt).toISOString() : null,
          });
        });
      }

      const createdStaffIds = Array.from(new Set(result.map((o) => Number(o.createdStaffId)).filter((id) => id > 0)));
      const crmStaffMap = new Map<number, string>();
      if (createdStaffIds.length > 0) {
        const crmStaffs = await fastify.prisma.crm.crmStaff.findMany({
          where: { id: { in: createdStaffIds } },
          select: { id: true, displayName: true },
        });
        crmStaffs.forEach((cs) => crmStaffMap.set(cs.id, cs.displayName));
      }

      // Single Source of Truth paystub calculation (Rule #11)
      const startPart = String(dateFrom).split(' ')[0].split('T')[0];
      const endPart = String(dateTo).split(' ')[0].split('T')[0];

      let baseSalary = 0;
      let summaryClientBonus = 0;
      let doneBonus = 0;
      let doneLevelCount = 0;
      let missedBonus = 0;
      let missedLevelRate = 0;
      let missedRatePct = 0;
      let tipBonus = 0;
      let summaryTotalTips = 0;
      let revBonus = 0;
      let revLevelRate = 0;
      let revLevelMin = 0;
      let summaryTotalNetRev = 0;
      let totalSalary = 0;
      let totalCompleted = 0;
      let totalMissed = 0;
      let totalPlanned = total;
      let pendingValue = 0;
      let totalPending = 0;

      let orderCheckinMap = new Map<number, SafeAny>();

      if (filterByStaff && staffLegacyId) {
        const paystubRes = await getBkPaystubData(fastify, startPart, endPart, [staffLegacyId]);
        orderCheckinMap = paystubRes.orderCheckinMap;
        if (paystubRes.detailsMap.has(staffLegacyId)) {
          const detail = paystubRes.detailsMap.get(staffLegacyId)!;
          baseSalary = detail.calculatedBaseSalary;
          summaryClientBonus = detail.basicCheckinBonus;
          doneBonus = detail.milestoneBonus;
          doneLevelCount = detail.doneLevelCount;
          missedBonus = detail.penaltyBonus;
          missedLevelRate = detail.missedLevelRate;
          missedRatePct = detail.missedRatePercent;
          tipBonus = detail.tipBonus;
          summaryTotalTips = detail.totalCustomerTip;
          revBonus = detail.revenueBonus;
          revLevelRate = detail.revCommissionRate;
          revLevelMin = detail.revLevelMin;
          summaryTotalNetRev = detail.totalRevenue;
          totalSalary = detail.totalIncome;
          totalCompleted = detail.doneCount;
          totalMissed = detail.missedCount;
          totalPlanned = detail.totalCount;
        }
      } else {
        totalCompleted = candidateIds.length;
        totalPlanned = total;
      }

      // Query pending appointments count & value in range (using indexed o.booking_date_start directly)
      let pendingSql = `
        SELECT COUNT(*) as totalPending, COALESCE(SUM(o.total_price), 0) as pendingValue
        FROM \`order\` o
        WHERE o.booking_date_start >= ? 
          AND o.booking_date_start <= ?
          AND o.order_state NOT IN ('Completed', 'Cancelled', 'Missed')
          AND o.booking_date_start >= NOW()
      `;
      const pendingParams: SafeAny[] = [cleanDateFrom, cleanDateTo];
      if (filterByStaff && staffLegacyId) {
        if (staffRole === 'oc') {
          pendingSql += ` AND o.assigned_staff_id = ?`;
        } else {
          pendingSql += ` AND o.created_staff_id = ?`;
        }
        pendingParams.push(staffLegacyId);
      }

      const pendingRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(pendingSql, ...pendingParams);
      if (pendingRows.length > 0) {
        totalPending = Number(pendingRows[0].totalPending || 0);
        pendingValue = Number(pendingRows[0].pendingValue || 0);
      }

      const checkInRate = totalPlanned > 0 ? Number(((totalCompleted / totalPlanned) * 100).toFixed(1)) : 0;

      const appointments = result.map((row: SafeAny) => {
        let serviceName = 'Không có thông tin';
        let price = 0;
        let discountPercent = 0;
        let bookingBonus = 0;
        let netRevenue = 0;
        let tipAmount = 0;

        if (row.orderState === 'Completed') {
          netRevenue = row.totalPrice;
          const payInfo = orderPaymentMap.get(Number(row.id)) || { tips: 0, debt: 0, totalPaid: 0 };
          tipAmount = payInfo.tips;
        }

        const checkinInfo = orderCheckinMap.get(Number(row.id));
        if (checkinInfo) {
          bookingBonus = checkinInfo.bonus;
        }

        const orderServicesList = orderServicesMap.get(Number(row.id)) || [];
        if (orderServicesList.length > 0) {
          let primaryService = orderServicesList[0];
          for (const os of orderServicesList) {
            if (os.service_price > (primaryService?.service_price || 0)) {
              primaryService = os;
            }
          }

          if (primaryService) {
            serviceName = serviceNameMap.get(primaryService.service_id) || 'Không rõ';
            price = primaryService.service_price;

            if (primaryService.service_price > 0) {
              discountPercent = Math.round((primaryService.discount_amount / primaryService.service_price) * 100);
            }

            if (checkinInfo?.isCombo) {
              serviceName += ' (Combo - Không hoa hồng)';
            }
          }
        }

        const firstPromoSv = orderServicesList.find((os) => os.promotion_id !== null && os.promotion_id !== undefined);
        const pId = Number(firstPromoSv?.promotion_id || row.promotionId || row.selectedPromotionId || 0);
        const promoInfo = pId > 0 ? promoDetailsMap.get(pId) : null;
        const promotionName = promoInfo ? promoInfo.name : null;
        const promotionDiscountPercent = promoInfo ? promoInfo.discountPercentage : null;
        const promotionDiscountAmount = promoInfo ? promoInfo.discountAmount : null;

        return {
          id: Number(row.id),
          orderKey: row.orderKey,
          bookingDateStart: row.bookingDateStart
            ? new Date(row.bookingDateStart).toISOString().replace('Z', '+07:00')
            : null,
          bookingDateEnd: row.bookingDateEnd ? new Date(row.bookingDateEnd).toISOString().replace('Z', '+07:00') : null,
          bookingNote: row.bookingNote,
          bookingChannel: row.bookingChannel,
          orderState: row.orderState,
          totalPrice: Number(row.totalPrice || 0),
          customerId: Number(row.userId),
          customerName: row.customerName,
          customerAvatar: row.customerAvatar,
          customerPhone: row.customerPhone,
          serviceName,
          servicePrice: Number(price || 0),
          discountPercent: Number(discountPercent || 0),
          promotionName,
          promotionDiscountPercent,
          promotionDiscountAmount,
          netRevenue: Number(netRevenue || 0),
          tipAmount: Number(tipAmount || 0),
          bookingBonus: Number(bookingBonus || 0),
          technicianId: row.technicianId ? Number(row.technicianId) : null,
          technicianName: row.technicianName || null,
          technicianAvatar: row.technicianAvatar || null,
          storeId: row.storeId ? Number(row.storeId) : null,
          branchName: row.branchName || 'Estella Place',
          branchCode: branchCodeByStoreId.get(Number(row.storeId)) || null,
          bookerName: row.bookerName || crmStaffMap.get(Number(row.createdStaffId)) || null,
          missedLog: missedLogsMap.get(Number(row.id)) || null,
        };
      });

      // Calculate accurate working CV capacities per day (excluding weekly OFFs and approved requested OFFs)
      const dailyCapacities: Record<
        string,
        {
          workingKtvCount: number;
          maxCapacity: number;
          workingStaffList?: Array<{
            id: number;
            name: string;
            branchName?: string;
            branchCode?: string;
            shift?: string;
          }>;
          offStaffList?: Array<{
            id: number;
            name: string;
            avatarUrl?: string | null;
            branchName?: string;
            branchCode?: string;
            reason: string;
            type?: string;
          }>;
        }
      > = {};
      try {
        const cvStaffIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'CV', 'ACTIVE_CV_STAFF_CONFIG');

        if (cvStaffIds.length > 0) {
          const startDateObj = new Date(cleanDateFrom.split(' ')[0]);
          const endDateObj = new Date(cleanDateTo.split(' ')[0]);
          const cur = new Date(startDateObj);

          // Query fixed store & name for all active CV staff from DB master tables
          const cvProfiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT user_id as id, full_name as name, client_store_id, avatar
            FROM user_profile
            WHERE user_id IN (${cvStaffIds.join(',')})
          `);
          const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
            where: { id: { in: cvStaffIds } },
            select: { id: true, displayName: true, avatarUrl: true },
          });

          const cvNameMap = new Map<number, string>();
          const cvProfileStoreMap = new Map<number, number>();
          const cvAvatarMap = new Map<number, string | null>();
          cvStaffIds.forEach((uid: number) => {
            const p = cvProfiles.find((lp: SafeAny) => Number(lp.id) === uid);
            const crmS = crmStaffList.find((cs: SafeAny) => Number(cs.id) === uid);
            const name = (p?.name ? String(p.name).trim() : null) || crmS?.displayName || `CV #${uid}`;
            const avatar = (p?.avatar ? String(p.avatar) : null) || crmS?.avatarUrl || null;
            cvNameMap.set(uid, name);
            if (p?.client_store_id) cvProfileStoreMap.set(uid, Number(p.client_store_id));
            cvAvatarMap.set(uid, avatar);
          });

          // Query fixed store from staff_day_off_schedule master
          const dayOffStores = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT user_id, client_store_id
            FROM staff_day_off_schedule
            WHERE is_disabled = 0 AND user_id IN (${cvStaffIds.join(',')})
            GROUP BY user_id
          `);
          const effectiveStoreIds = Array.from(
            new Set(
              cvStaffIds.map((uid: number) => {
                const scheduleStore = dayOffStores.find((store) => Number(store.user_id) === uid)?.client_store_id;
                return scheduleStore ? Number(scheduleStore) : cvProfileStoreMap.get(uid) || 6;
              })
            )
          );
          const storeRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT
              cs.id,
              UPPER(NULLIF(cs.client_store_key, '')) AS store_code,
              csl.client_store_name AS store_name
            FROM client_store cs
            LEFT JOIN client_store_language csl
              ON csl.client_store_id = cs.id AND csl.language_id = 1
            WHERE cs.id IN (${effectiveStoreIds.join(',')})
          `);
          const storeDetailsById = new Map<number, { name: string; code: string }>(
            storeRows.map((store: SafeAny) => [
              Number(store.id),
              {
                name: String(store.store_name || (Number(store.id) === 16 ? 'Estella Place' : 'Đề Thám')),
                code: String(store.store_code || (Number(store.id) === 16 ? 'EP' : 'DT')),
              },
            ])
          );
          const cvStoreMap = new Map<number, { name: string; code: string }>();
          cvStaffIds.forEach((uid: number) => {
            const schedStore = dayOffStores.find((s) => Number(s.user_id) === uid)?.client_store_id;
            const finalStoreId = schedStore ? Number(schedStore) : cvProfileStoreMap.get(uid) || 6;
            const store =
              storeDetailsById.get(finalStoreId) ||
              (finalStoreId === 16 ? { name: 'Estella Place', code: 'EP' } : { name: 'Đề Thám', code: 'DT' });
            cvStoreMap.set(uid, store);
          });

          // Query exact working shifts per staff from staff_working_shift_schedule
          const shiftRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT user_id, start_time, end_time, type, type_value
            FROM staff_working_shift_schedule
            WHERE is_disabled = 0 AND user_id IN (${cvStaffIds.join(',')})
            ORDER BY user_id, type DESC
          `);
          const shiftsByCvId = new Map<number, SafeAny[]>();
          shiftRows.forEach((row) => {
            const userId = Number(row.user_id);
            const rows = shiftsByCvId.get(userId) || [];
            rows.push(row);
            shiftsByCvId.set(userId, rows);
          });

          // A future roster is a planned shift, not a real attendance event.
          // A weekday-specific shift takes precedence over the recurring "Day / All" shift.
          const getScheduledShift = (userId: number, weekday: number): string | null => {
            const shifts = shiftsByCvId.get(userId) || [];
            const shift =
              shifts.find((row) => String(row.type) === 'Weekday' && Number(row.type_value) === weekday) ||
              shifts.find((row) => String(row.type) === 'Day' && String(row.type_value) === 'All');
            if (!shift) return null;

            const startHour = shift.start_time ? new Date(shift.start_time).getUTCHours() : 9;
            const endHour = shift.end_time ? new Date(shift.end_time).getUTCHours() : 20;
            if (startHour <= 9 && endHour <= 18) return 'Ca Sáng';
            if (startHour >= 11 && endHour >= 20) return 'Ca Chiều';
            return 'Ca Full';
          };

          // Filter CV staff pool by storeId if store filter is active
          let activeCvStaffIds = cvStaffIds;
          if (storeId && storeId !== 'all') {
            const requestedStoreIds = String(storeId)
              .split(',')
              .map((s) => parseInt(s.trim(), 10))
              .filter((n) => !isNaN(n));
            if (requestedStoreIds.length > 0) {
              activeCvStaffIds = cvStaffIds.filter((uid: number) => {
                const schedStore = dayOffStores.find((s) => Number(s.user_id) === uid)?.client_store_id;
                const finalStoreId = schedStore ? Number(schedStore) : cvProfileStoreMap.get(uid) || 6;
                return requestedStoreIds.includes(finalStoreId);
              });
            }
          }

          // Batch query 1: Weekly Offs for active CV staff
          const weeklyOffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT user_id, weekday
            FROM staff_day_off_schedule
            WHERE is_disabled = 0 AND user_id IN (${activeCvStaffIds.join(',')})
          `);
          const weeklyOffMap = new Map<number, Set<number>>();
          weeklyOffs.forEach((r) => {
            const uid = Number(r.user_id);
            if (!weeklyOffMap.has(uid)) weeklyOffMap.set(uid, new Set());
            weeklyOffMap.get(uid)!.add(Number(r.weekday));
          });

          // Batch query 2: Approved leave requests for date range
          const dateOffs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT 
              from_user_id as user_id, 
              DATE_FORMAT(from_date, '%Y-%m-%d') as date_str, 
              note,
              attribute_option_id as attributeOptionId,
              DATEDIFF(from_date, date_created) as daysAhead
            FROM staff_day_off
            WHERE request_state = 'Approved'
              AND from_date >= '${cleanDateFrom}' AND from_date <= '${cleanDateTo}'
              AND from_user_id IN (${activeCvStaffIds.join(',')})
          `);
          const dateOffMap = new Map<
            string,
            Map<number, { reason: string; type: 'weekly_off' | 'urgent_off' | 'planned_off'; daysAhead: number }>
          >();
          dateOffs.forEach((r) => {
            const dStr = String(r.date_str);
            if (!dateOffMap.has(dStr)) dateOffMap.set(dStr, new Map());

            const attrOptId = Number(r.attributeOptionId || 0);
            const daysAhead = Number(r.daysAhead || 0);
            const noteText = String(r.note || '').trim();

            const isWeeklyOffRecord = attrOptId === 110 || /hàng tuần|off tuần/i.test(noteText);
            const isUrgent =
              !isWeeklyOffRecord &&
              (attrOptId === 113 || // Bị bệnh / get-sick
                (daysAhead <= 0 && noteText.length > 0) || // Đăng ký đột xuất có ghi chú trong ngày
                /gấp|đột xuất|bệnh|ốm|khẩn|cấp cứu/i.test(noteText));

            const offType: 'weekly_off' | 'urgent_off' | 'planned_off' = isWeeklyOffRecord
              ? 'weekly_off'
              : isUrgent
                ? 'urgent_off'
                : 'planned_off';

            const defaultReason = isWeeklyOffRecord
              ? 'Nghỉ hàng tuần (OFF Tuần)'
              : isUrgent
                ? 'Xin nghỉ phép đột xuất (Gấp)'
                : 'Xin nghỉ phép (Đã duyệt)';

            const reason = noteText ? noteText : defaultReason;

            dateOffMap.get(dStr)!.set(Number(r.user_id), {
              reason,
              type: offType,
              daysAhead,
            });
          });

          // Batch query 3: Booked orders grouped by date and assigned_staff_id (using indexed o.booking_date_start)
          const bookedRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT DATE_FORMAT(o.booking_date_start, '%Y-%m-%d') as date_str,
                   o.assigned_staff_id as user_id, COUNT(DISTINCT o.id) as cnt
            FROM \`order\` o
            WHERE o.booking_date_start >= '${cleanDateFrom}'
              AND o.booking_date_start <= '${cleanDateTo}'
              AND o.assigned_staff_id IN (${activeCvStaffIds.join(',')})
            GROUP BY date_str, o.assigned_staff_id
          `);
          const rangeBookedMap = new Map<string, Map<number, number>>();
          bookedRows.forEach((r) => {
            const dStr = String(r.date_str);
            if (!rangeBookedMap.has(dStr)) rangeBookedMap.set(dStr, new Map());
            rangeBookedMap.get(dStr)!.set(Number(r.user_id), Number(r.cnt || 0));
          });

          // Batch query 4: Completed orders served by staff grouped by date and staff_id (using indexed o.booking_date_start)
          const doneRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT date_str, staff_id, COUNT(DISTINCT order_id) as cnt
            FROM (
              SELECT DATE_FORMAT(o.booking_date_start, '%Y-%m-%d') as date_str,
                     sb.user_id as staff_id, sb.order_id
              FROM staff_bonus sb
              JOIN \`order\` o ON sb.order_id = o.id
              WHERE o.booking_date_start >= '${cleanDateFrom}'
                AND o.booking_date_start <= '${cleanDateTo}'
                AND o.order_state = 'Completed'
                AND sb.user_id IN (${activeCvStaffIds.join(',')})

              UNION

              SELECT DATE_FORMAT(o.booking_date_start, '%Y-%m-%d') as date_str,
                     o.assigned_staff_id as staff_id, o.id as order_id
              FROM \`order\` o
              WHERE o.booking_date_start >= '${cleanDateFrom}'
                AND o.booking_date_start <= '${cleanDateTo}'
                AND o.order_state = 'Completed'
                AND o.assigned_staff_id IN (${activeCvStaffIds.join(',')})
            ) combined
            GROUP BY date_str, staff_id
          `);
          const rangeDoneMap = new Map<string, Map<number, number>>();
          doneRows.forEach((r) => {
            const dStr = String(r.date_str);
            if (!rangeDoneMap.has(dStr)) rangeDoneMap.set(dStr, new Map());
            rangeDoneMap.get(dStr)!.set(Number(r.staff_id), Number(r.cnt || 0));
          });

          // Batch query 5: Average ACTUAL lash extension speed (phút/bộ) per staff member (using indexed o.booking_date_start)
          const speedRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
            SELECT
              os.assigned_staff_id as staff_id,
              s.service_type,
              ROUND(AVG(
                COALESCE(ros.preparation_minute, 0) +
                COALESCE(ros.pre_servicing_minute, 0) +
                COALESCE(ros.cleaning_minute, 0) +
                COALESCE(ros.servicing_minute, 0)
              )) as avg_min
            FROM order_service os
            JOIN \`order\` o ON os.order_id = o.id
            JOIN service s ON os.service_id = s.id
            JOIN report_order_service ros ON os.id = ros.order_service_id
            WHERE o.order_state = 'Completed'
              AND s.service_group IN ('Lashes', 'LashesTop', 'LashesUnder')
              AND os.assigned_staff_id IN (${activeCvStaffIds.join(',')})
              AND (COALESCE(ros.preparation_minute, 0) +
                   COALESCE(ros.pre_servicing_minute, 0) +
                   COALESCE(ros.cleaning_minute, 0) +
                   COALESCE(ros.servicing_minute, 0)) > 15
              AND (COALESCE(ros.preparation_minute, 0) +
                   COALESCE(ros.pre_servicing_minute, 0) +
                   COALESCE(ros.cleaning_minute, 0) +
                   COALESCE(ros.servicing_minute, 0)) < 200
              AND o.booking_date_start >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            GROUP BY os.assigned_staff_id, s.service_type
          `);

          const staffSpeedMap = new Map<
            number,
            { normalAvg?: number; retainAvg?: number; removalAvg?: number; overallAvg?: number }
          >();
          speedRows.forEach((r) => {
            const sid = Number(r.staff_id);
            const stype = String(r.service_type || '');
            const avgVal = Math.round(Number(r.avg_min || 0));

            if (!staffSpeedMap.has(sid)) staffSpeedMap.set(sid, {});
            const item = staffSpeedMap.get(sid)!;

            if (stype === 'Normal') item.normalAvg = avgVal;
            else if (stype === 'Retain') item.retainAvg = avgVal;
            else if (stype === 'Removal' || stype === 'Fix') item.removalAvg = avgVal;
          });

          // In-memory daily capacities assembly
          while (cur <= endDateObj) {
            const dateStr = cur.toISOString().split('T')[0];
            const jsDay = cur.getDay();
            const legacyWeekday = jsDay === 0 ? 7 : jsDay;

            if (activeCvStaffIds.length === 0) {
              dailyCapacities[dateStr] = {
                workingKtvCount: 0,
                maxCapacity: 0,
                workingStaffList: [],
                offStaffList: [],
              };
              cur.setDate(cur.getDate() + 1);
              continue;
            }

            const dayDateOffMap =
              dateOffMap.get(dateStr) ||
              new Map<number, { reason: string; type: 'urgent_off' | 'planned_off'; daysAhead: number }>();
            const dayBookedMap = rangeBookedMap.get(dateStr) || new Map<number, number>();
            const dayDoneMap = rangeDoneMap.get(dateStr) || new Map<number, number>();
            const scheduledShiftByCvId = new Map(
              activeCvStaffIds.map((id: number) => [id, getScheduledShift(id, legacyWeekday)])
            );

            const workingCvIds = activeCvStaffIds.filter((id: number) => {
              const userWeeklyOffs = weeklyOffMap.get(id);
              const isWeeklyOff = userWeeklyOffs ? userWeeklyOffs.has(legacyWeekday) : false;
              const isDateOff = dayDateOffMap.has(id);
              return !!scheduledShiftByCvId.get(id) && !isWeeklyOff && !isDateOff;
            });

            const workingStaffList = workingCvIds.map((id: number) => {
              const store = cvStoreMap.get(id) || { name: 'Đề Thám', code: 'DT' };
              return {
                id,
                name: cvNameMap.get(id) || `CV #${id}`,
                avatarUrl: cvAvatarMap.get(id) || null,
                branchName: store.name,
                branchCode: store.code,
                shift: scheduledShiftByCvId.get(id) || 'Ca Full',
                bookedCount: dayBookedMap.get(id) || 0,
                doneCount: dayDoneMap.get(id) || 0,
                avgDurationMinutes: staffSpeedMap.get(id),
              };
            });

            const offStaffList: Array<{
              id: number;
              name: string;
              avatarUrl?: string | null;
              branchName?: string;
              branchCode?: string;
              reason: string;
              type?: string;
            }> = [];
            const weekdayNames = ['', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
            activeCvStaffIds.forEach((id: number) => {
              const userWeeklyOffs = weeklyOffMap.get(id);
              const isWeeklyOff = userWeeklyOffs ? userWeeklyOffs.has(legacyWeekday) : false;
              if (dayDateOffMap.has(id)) {
                const offInfo = dayDateOffMap.get(id)!;
                const finalType =
                  (isWeeklyOff || offInfo.type === 'weekly_off') && offInfo.type !== 'urgent_off'
                    ? 'weekly_off'
                    : offInfo.type;
                const finalReason =
                  isWeeklyOff && offInfo.reason.includes('Gấp')
                    ? `Nghỉ hàng tuần (${weekdayNames[legacyWeekday] || ''})`
                    : offInfo.reason;

                offStaffList.push({
                  id,
                  name: cvNameMap.get(id) || `CV #${id}`,
                  avatarUrl: cvAvatarMap.get(id) || null,
                  branchName: cvStoreMap.get(id)?.name || 'Đề Thám',
                  branchCode: cvStoreMap.get(id)?.code || 'DT',
                  reason: finalReason,
                  type: finalType,
                });
              } else if (isWeeklyOff) {
                offStaffList.push({
                  id,
                  name: cvNameMap.get(id) || `CV #${id}`,
                  avatarUrl: cvAvatarMap.get(id) || null,
                  branchName: cvStoreMap.get(id)?.name || 'Đề Thám',
                  branchCode: cvStoreMap.get(id)?.code || 'DT',
                  reason: `Nghỉ hàng tuần (${weekdayNames[legacyWeekday] || ''})`,
                  type: 'weekly_off',
                });
              }
            });

            dailyCapacities[dateStr] = {
              workingKtvCount: workingCvIds.length,
              maxCapacity: workingCvIds.length * 5,
              workingStaffList,
              offStaffList,
            };

            cur.setDate(cur.getDate() + 1);
          }
        }
      } catch (capErr) {
        fastify.log.error(capErr, 'Failed to compute daily KTV capacities');
      }

      return {
        data: appointments,
        total,
        dailyCapacities,
        summary: {
          totalPending,
          totalMissed,
          totalCompleted,
          pendingValue,
          completedRevenue: summaryTotalNetRev,
          totalPlanned,
          totalCheckin: totalCompleted,
          checkInRate: Math.round(checkInRate * 10) / 10,
          baseSalary,
          clientBonus: summaryClientBonus,
          doneBonus,
          doneLevelCount,
          missedBonus,
          missedLevelRate,
          missedRatePct: Math.round(missedRatePct * 10) / 10,
          tipBonus,
          totalTips: summaryTotalTips,
          revBonus,
          revLevelRate,
          revLevelMin,
          totalNetRev: summaryTotalNetRev,
          totalSalary,
        },
      };
    } catch (error: SafeAny) {
      fastify.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: (error as SafeAny).message || 'Failed to retrieve appointments',
      });
    }
  });

  // POST /api/customers/missed/log
  // Upsert missed log reason, responsibility, note, follow-up status, and sync callback date to Daily Plan
  fastify.post('/customers/missed/log', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string; id: number; displayName?: string; username?: string };
    const {
      orderId,
      reasonCategory,
      responsibility,
      note,
      followUpStatus = 'PENDING',
      callbackDate,
    } = request.body as SafeAny;

    if (!orderId || !reasonCategory || !responsibility) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'orderId, reasonCategory và responsibility là các trường bắt buộc.',
      });
    }

    const numOrderId = Number(orderId);
    const createdBy = user.displayName || user.username || 'Staff';
    const cbDate = callbackDate ? new Date(callbackDate) : null;

    try {
      const orderRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id as userId FROM \`order\` WHERE id = ? LIMIT 1`,
        numOrderId
      );
      const legacyUserId = Number(orderRows[0]?.userId);
      if (!legacyUserId) {
        return reply.status(404).send({ error: 'Not Found', message: 'Không tìm thấy lịch hẹn trên hệ thống.' });
      }
      if (!(await ensureTelesalesCustomerAccess(request, reply, legacyUserId))) return;

      const log = await fastify.prisma.crm.crmMissedLog.upsert({
        where: { orderId: numOrderId },
        create: {
          orderId: numOrderId,
          reasonCategory,
          responsibility,
          note: note || null,
          followUpStatus,
          callbackDate: cbDate,
          createdBy,
        },
        update: {
          reasonCategory,
          responsibility,
          note: note || null,
          followUpStatus,
          callbackDate: cbDate,
          createdBy,
        },
      });

      // Automatically sync callbackDate to CRM Daily Plan if scheduled
      if (cbDate && followUpStatus === 'CONTACTED') {
        const orderRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT user_id as userId FROM \`order\` WHERE id = ? LIMIT 1`,
          numOrderId
        );
        if (orderRows.length > 0 && orderRows[0].userId) {
          const legacyUserId = Number(orderRows[0].userId);
          const staffId = user.id;
          try {
            await fastify.prisma.crm.crmDailyPlan.upsert({
              where: {
                legacyUserId_plannedDate: {
                  legacyUserId,
                  plannedDate: cbDate,
                },
              },
              create: {
                legacyUserId,
                staffId,
                plannedDate: cbDate,
                bucket: 'MISSED_FOLLOWUP',
                priority: 1,
                status: 'PLANNED',
              },
              update: {
                staffId,
                status: 'PLANNED',
              },
            });
          } catch {
            // Ignore duplicate plan errors if any
          }
        }
      }

      return reply.send({
        success: true,
        data: {
          id: log.id,
          orderId: log.orderId,
          reasonCategory: log.reasonCategory,
          responsibility: log.responsibility,
          note: log.note,
          followUpStatus: log.followUpStatus,
          callbackDate: log.callbackDate ? log.callbackDate.toISOString().slice(0, 10) : null,
          createdBy: log.createdBy,
          createdAt: log.createdAt.toISOString(),
          updatedAt: log.updatedAt.toISOString(),
        },
      });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Save missed log error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể lưu thông tin lý do missed.',
      });
    }
  });

  // GET /api/customers/missed/summary
  // Compute aggregated stats for missed orders in date range
  fastify.get('/customers/missed/summary', { preHandler: [requireAuth] }, async (request, reply) => {
    const { dateFrom, dateTo, storeId } = request.query as {
      dateFrom?: string;
      dateTo?: string;
      storeId?: string;
    };

    const dFrom = dateFrom ? `${dateFrom} 00:00:00` : `${new Date().toISOString().slice(0, 10)} 00:00:00`;
    const dTo = dateTo ? `${dateTo} 23:59:59` : `${new Date().toISOString().slice(0, 10)} 23:59:59`;

    try {
      let storeFilter = '';
      const storeParams: SafeAny[] = [new Date(dFrom), new Date(dTo), new Date(dFrom), new Date(dTo)];
      if (storeId && storeId !== 'ALL') {
        storeFilter = ' AND o.client_store_id = ?';
        storeParams.push(Number(storeId));
      }

      const countsSql = `
        SELECT 
          COUNT(DISTINCT o.id) as totalPlanned,
          COUNT(DISTINCT CASE 
            WHEN (o.booking_date_start <= NOW() OR COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= NOW()) 
              AND ro.actual_booking_date_start IS NULL 
              AND (o.total_price IS NULL OR o.total_price = 0) 
              AND o.order_state NOT IN ('Completed', 'CheckOut') 
            THEN o.id 
          END) as totalMissed,
          GROUP_CONCAT(DISTINCT CASE 
            WHEN (o.booking_date_start <= NOW() OR COALESCE(ro.actual_booking_date_start, o.booking_date_start) <= NOW()) 
              AND ro.actual_booking_date_start IS NULL 
              AND (o.total_price IS NULL OR o.total_price = 0) 
              AND o.order_state NOT IN ('Completed', 'CheckOut') 
            THEN o.id 
          END) as missedOrderIdsStr
        FROM \`order\` o
        LEFT JOIN report_order ro ON o.id = ro.order_id
        WHERE (
            (ro.actual_booking_date_start >= ? AND ro.actual_booking_date_start <= ?)
            OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= ? AND o.booking_date_start <= ?)
          ) ${storeFilter}
      `;

      const countsRes = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(countsSql, ...storeParams);
      const totalPlanned = Number(countsRes[0]?.totalPlanned || 0);
      const totalMissed = Number(countsRes[0]?.totalMissed || 0);
      const missedRatePct = totalPlanned > 0 ? Number(((totalMissed / totalPlanned) * 100).toFixed(1)) : 0;

      const missedOrderIdsRaw = countsRes[0]?.missedOrderIdsStr
        ? String(countsRes[0].missedOrderIdsStr)
            .split(',')
            .map((x) => Number(x.trim()))
            .filter((x) => Boolean(x) && !isNaN(x))
        : [];

      let taggedCount = 0;
      const reasonMap = new Map<string, number>();
      const respMap = new Map<string, number>();
      const followUpMap = new Map<string, number>();

      if (missedOrderIdsRaw.length > 0) {
        const logs = await fastify.prisma.crm.crmMissedLog.findMany({
          where: { orderId: { in: missedOrderIdsRaw } },
        });

        taggedCount = logs.length;
        logs.forEach((l) => {
          reasonMap.set(l.reasonCategory, (reasonMap.get(l.reasonCategory) || 0) + 1);
          respMap.set(l.responsibility, (respMap.get(l.responsibility) || 0) + 1);
          followUpMap.set(l.followUpStatus, (followUpMap.get(l.followUpStatus) || 0) + 1);
        });
      }

      const untaggedCount = Math.max(0, totalMissed - taggedCount);
      const taggedRatePct = totalMissed > 0 ? Number(((taggedCount / totalMissed) * 100).toFixed(1)) : 0;

      const REASON_LABELS: Record<string, string> = {
        KH_DOI_HUY_LICH: 'Khách đổi/hủy lịch',
        GOI_KHONG_NGHE: 'Gọi không nghe máy / Thuê bao',
        TIEM_QUATAI: 'Tiệm quá tải / Hết ghế',
        BOOKER_LATHUONG: 'Booker tư vấn sai / Đặt nhầm',
        CV_BAN_LOI: 'CV bận / Phục vụ chậm',
        KTV_BAN_LOI: 'CV bận / Phục vụ chậm',
        KH_QUEN_LICH: 'Khách quên lịch',
        LY_DO_KHAC: 'Lý do khác',
      };

      const RESP_LABELS: Record<string, string> = {
        CUSTOMER: 'Khách hàng',
        BOOKER: 'Booker (Telesales)',
        CC: 'Tư vấn viên (CC)',
        TECHNICIAN: 'Chuyên viên (CV)',
        STORE_SYSTEM: 'Hệ thống / Cửa hàng',
      };

      const FOLLOWUP_LABELS: Record<string, string> = {
        PENDING: 'Chưa xử lý',
        CONTACTED: 'Đã gọi chăm sóc',
        RESCHEDULED: 'Đã đặt lại lịch',
        UNREACHABLE: 'Không liên hệ được',
        CANCELLED: 'Khách hủy hẳn',
      };

      const reasonBreakdown = Object.keys(REASON_LABELS).map((catKey) => {
        const count = reasonMap.get(catKey) || 0;
        const pct = totalMissed > 0 ? Number(((count / totalMissed) * 100).toFixed(1)) : 0;
        return {
          reasonCategory: catKey as SafeAny,
          label: REASON_LABELS[catKey],
          count,
          pct,
        };
      });

      const responsibilityBreakdown = Object.keys(RESP_LABELS).map((respKey) => {
        const count = respMap.get(respKey) || 0;
        const pct = totalMissed > 0 ? Number(((count / totalMissed) * 100).toFixed(1)) : 0;
        return {
          responsibility: respKey as SafeAny,
          label: RESP_LABELS[respKey],
          count,
          pct,
        };
      });

      const followUpBreakdown = Object.keys(FOLLOWUP_LABELS).map((fuKey) => {
        const count = followUpMap.get(fuKey) || 0;
        return {
          status: fuKey as SafeAny,
          label: FOLLOWUP_LABELS[fuKey],
          count,
        };
      });

      return reply.send({
        totalMissed,
        totalPlanned,
        missedRatePct,
        taggedCount,
        untaggedCount,
        taggedRatePct,
        reasonBreakdown,
        responsibilityBreakdown,
        followUpBreakdown,
      });
    } catch (err: SafeAny) {
      fastify.log.error(err, 'Get missed summary error');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể tính toán thống kê missed.',
      });
    }
  });
}
