import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { BkPaystubResult, getBkPaystubData } from '../../../kpi/services/bk-salary.service.js';
import {
  AppointmentEnrichmentData,
  AppointmentItemDto,
  AppointmentMissedLogDto,
  AppointmentOrderRow,
  AppointmentOrderServiceRow,
  AppointmentPaymentInfo,
  AppointmentPromoInfo,
  AppointmentSummaryComputationResult,
  LegacyQueryRows,
} from './appointments.types.js';

export async function fetchAppointmentEnrichment(
  fastify: FastifyInstance,
  result: AppointmentOrderRow[]
): Promise<AppointmentEnrichmentData> {
  // 4. Fetch payment details and service details for completed/active orders to calculate financial metrics
  const orderIds = result.map((o) => Number(o.id));
  const completedOrderIds = result.filter((o) => o.orderState === 'Completed').map((o) => Number(o.id));

  const orderPaymentMap = new Map<number, AppointmentPaymentInfo>();
  if (completedOrderIds.length > 0) {
    const orderPayments = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(`
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

  const orderServicesMap = new Map<number, AppointmentOrderServiceRow[]>();
  const serviceNameMap = new Map<number, string>();
  if (orderIds.length > 0) {
    const orderServices = await fastify.prisma.legacy.order_service.findMany({
      where: { order_id: { in: orderIds } },
    });
    orderServices.forEach((os) => {
      const list = orderServicesMap.get(os.order_id) || [];
      list.push(os);
      orderServicesMap.set(os.order_id, list);
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
  const promoDetailsMap = new Map<number, AppointmentPromoInfo>();
  const promoIds = Array.from(
    new Set([
      ...result.map((o) => Number(o.promotionId)).filter((id) => id > 0),
      ...result.map((o) => Number(o.selectedPromotionId)).filter((id) => id > 0),
      ...Array.from(orderServicesMap.values())
        .flat()
        .map((os) => Number(os.promotion_id))
        .filter((id) => id > 0),
    ])
  );

  if (promoIds.length > 0) {
    const promotionRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(`
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
  const missedLogsMap = new Map<number, AppointmentMissedLogDto>();
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

  return {
    orderPaymentMap,
    orderServicesMap,
    serviceNameMap,
    promoDetailsMap,
    missedLogsMap,
    crmStaffMap,
  };
}

interface ComputeSummaryParams {
  fastify: FastifyInstance;
  dateFrom: string;
  dateTo: string;
  cleanDateFrom: string;
  cleanDateTo: string;
  filterByStaff: boolean;
  staffLegacyId: number | null;
  staffRole: string;
  candidateIds: number[];
  total: number;
}

export async function computeAppointmentSummaryMetrics({
  fastify,
  dateFrom,
  dateTo,
  cleanDateFrom,
  cleanDateTo,
  filterByStaff,
  staffLegacyId,
  staffRole,
  candidateIds,
  total,
}: ComputeSummaryParams): Promise<AppointmentSummaryComputationResult> {
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

  let orderCheckinMap: BkPaystubResult['orderCheckinMap'] = new Map();

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

  const pendingRows = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(pendingSql, ...pendingParams);
  if (pendingRows.length > 0) {
    totalPending = Number(pendingRows[0].totalPending || 0);
    pendingValue = Number(pendingRows[0].pendingValue || 0);
  }

  const checkInRate = totalPlanned > 0 ? Number(((totalCompleted / totalPlanned) * 100).toFixed(1)) : 0;

  return {
    orderCheckinMap,
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
}

interface MapAppointmentRowsParams {
  result: AppointmentOrderRow[];
  enrichment: AppointmentEnrichmentData;
  orderCheckinMap: BkPaystubResult['orderCheckinMap'];
  branchCodeByStoreId: Map<number, string>;
}

export function mapAppointmentRows({
  result,
  enrichment,
  orderCheckinMap,
  branchCodeByStoreId,
}: MapAppointmentRowsParams): AppointmentItemDto[] {
  const { orderPaymentMap, orderServicesMap, serviceNameMap, promoDetailsMap, missedLogsMap, crmStaffMap } = enrichment;

  return result.map((row) => {
    let serviceName = 'Không có thông tin';
    let price = 0;
    let discountPercent = 0;
    let bookingBonus = 0;
    let netRevenue = 0;
    let tipAmount = 0;

    if (row.orderState === 'Completed') {
      netRevenue = Number(row.totalPrice || 0);
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
}
