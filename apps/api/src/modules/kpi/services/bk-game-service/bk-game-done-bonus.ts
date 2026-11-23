import { FastifyInstance } from 'fastify';
import {
  BkGameDoneBonusRecord,
  BkGameDoneBonusRule,
  BkGameDoneBonusStaffSummary,
  BkGameDoneBonusesSummary,
  BkGameParticipant,
  SafeAny,
} from '@mos-lab/shared';
import {
  buildBookingChannelFilter,
  formatIctDateTime,
  parseAllowedBookingChannels,
  parseDoneBonusConfig,
} from './bk-game-helpers.js';

export interface DoneBonusAggregationResult {
  doneBonuses: BkGameDoneBonusRecord[];
  doneBonusesSummary: BkGameDoneBonusesSummary;
  staffBonusMap: Map<number, { doneCount: number; totalBonus: number }>;
}

function doesRuleMatchOrderService(
  rule: BkGameDoneBonusRule,
  rawServiceName: string,
  serviceId: number | null,
  originalPrice: number,
  actualPaid: number
): boolean {
  const ruleSvcName = (rule.serviceName || '').trim().toLowerCase();
  const isAllServices = ruleSvcName === '' || ruleSvcName === 'all' || ruleSvcName === 'tất cả';
  const isServiceMatch =
    isAllServices ||
    (rule.serviceId && serviceId && rule.serviceId === serviceId) ||
    rawServiceName.toLowerCase().includes(ruleSvcName) ||
    ruleSvcName.includes(rawServiceName.toLowerCase());

  if (!isServiceMatch) return false;

  if (rule.conditionType === 'FREE') {
    return actualPaid === 0;
  }
  if (rule.conditionType === 'EXACT_PAY') {
    return rule.minPaid !== undefined ? Math.abs(actualPaid - rule.minPaid) < 100 : true;
  }
  if (rule.conditionType === 'PROMO_PERCENT') {
    if (rule.minPaid !== undefined && rule.maxPaid !== undefined) {
      return actualPaid >= rule.minPaid && actualPaid <= rule.maxPaid;
    }
    if (rule.promoPercent !== undefined && originalPrice > 0) {
      const calcPercent = Math.round(((originalPrice - actualPaid) / originalPrice) * 100);
      return Math.abs(calcPercent - rule.promoPercent) <= 5;
    }
    return true;
  }
  if (rule.conditionType === 'AMOUNT_RANGE') {
    const min = rule.minPaid ?? 0;
    const max = rule.maxPaid ?? Infinity;
    return actualPaid >= min && actualPaid <= max;
  }
  if (rule.conditionType === 'ANY') {
    return true;
  }

  return false;
}

function selectBestDoneBonusForOrder(
  services: SafeAny[],
  rules: BkGameDoneBonusRule[]
): { bestBonus: number; bestRule: BkGameDoneBonusRule | null; matchedService: SafeAny } {
  let bestBonus = -1;
  let bestRule: BkGameDoneBonusRule | null = null;
  let matchedService: SafeAny = null;

  for (const svc of services) {
    const rawServiceName = String(svc.service_name || '').trim();
    const serviceId = svc.service_id ? Number(svc.service_id) : null;
    const originalPrice = Number(svc.service_price || 0);
    const actualPaid = Number(svc.os_total_price || 0);

    for (const rule of rules) {
      const conditionMatched = doesRuleMatchOrderService(rule, rawServiceName, serviceId, originalPrice, actualPaid);
      if (conditionMatched && rule.bonusAmount > bestBonus) {
        bestBonus = rule.bonusAmount;
        bestRule = rule;
        matchedService = svc;
      }
    }
  }

  return { bestBonus, bestRule, matchedService };
}

/**
 * Synchronizes completed order bonuses for games configured with doneBonusConfig.
 * Ensures each order is credited only once and cancelled/missed orders are pruned.
 */
export async function syncGameDoneBonuses(fastify: FastifyInstance, gameId: number): Promise<void> {
  const game = await fastify.prisma.crm.crmBkGame.findUnique({
    where: { id: gameId },
    include: {
      participants: { select: { staffId: true } },
    },
  });

  if (!game || !game.doneBonusConfig) return;
  const rules = parseDoneBonusConfig(game.doneBonusConfig);
  if (!rules || rules.length === 0) return;

  const participantIds = game.participants.map((p) => p.staffId);
  if (participantIds.length === 0) return;

  const startIctDateTime = formatIctDateTime(game.startDate);
  const endIctDateTime = formatIctDateTime(game.endDate);
  const allowedChannels = parseAllowedBookingChannels(game.allowedBookingChannels);
  const channelFilter = buildBookingChannelFilter(allowedChannels, 'o.booking_channels');

  // 1. Fetch existing recorded bonuses
  const existingRecords = await fastify.prisma.crm.crmBkGameDoneBonus.findMany({
    where: { gameId },
    select: { id: true, orderId: true },
  });

  // 2. Prune any previously credited orders that have since been cancelled or missed
  if (existingRecords.length > 0) {
    const existingOrderIds = existingRecords.map((r) => r.orderId);
    const cancelledRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT id FROM \`order\` WHERE id IN (${existingOrderIds.join(',')}) AND order_state IN ('Cancelled', 'Missed')
    `);
    if (cancelledRows.length > 0) {
      const cancelledIds = cancelledRows.map((c) => Number(c.id));
      await fastify.prisma.crm.crmBkGameDoneBonus.deleteMany({
        where: { gameId, orderId: { in: cancelledIds } },
      });
    }
  }

  const recordedOrderIds = new Set(existingRecords.map((r) => r.orderId));

  // 3. Query all completed orders within game date range
  const orderRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT 
      o.id AS order_id,
      o.created_staff_id AS staff_id,
      o.order_state,
      COALESCE(ro.actual_booking_date_start, o.booking_date_start, o.date_created) AS completed_at,
      o.total_price AS order_total_price,
      os.id AS order_service_id,
      os.service_id,
      sl.service_name,
      os.service_price,
      os.discount_amount,
      os.total_price AS os_total_price
    FROM \`order\` o
    LEFT JOIN \`report_order\` ro ON ro.order_id = o.id
    JOIN \`order_service\` os ON os.order_id = o.id
    LEFT JOIN \`service_language\` sl ON sl.service_id = os.service_id AND sl.language_id = 1
    WHERE o.created_staff_id IN (${participantIds.join(',')})
      AND o.order_state = 'Completed'
      AND (
        (ro.actual_booking_date_start >= '${startIctDateTime}' AND ro.actual_booking_date_start <= '${endIctDateTime}')
        OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start >= '${startIctDateTime}' AND o.booking_date_start <= '${endIctDateTime}')
        OR (ro.actual_booking_date_start IS NULL AND o.booking_date_start IS NULL AND o.date_created >= '${startIctDateTime}' AND o.date_created <= '${endIctDateTime}')
      )
      ${channelFilter}
    ORDER BY o.id ASC, os.total_price DESC
  `);

  // Group services by orderId
  const orderMap = new Map<number, SafeAny[]>();
  for (const r of orderRows) {
    const oid = Number(r.order_id);
    if (!orderMap.has(oid)) {
      orderMap.set(oid, []);
    }
    orderMap.get(oid)!.push(r);
  }

  // 4. Calculate and record bonuses
  for (const [orderId, services] of orderMap.entries()) {
    if (recordedOrderIds.has(orderId)) continue;

    const { bestBonus, bestRule, matchedService } = selectBestDoneBonusForOrder(services, rules);

    if (bestRule && matchedService && bestBonus > 0) {
      try {
        await fastify.prisma.crm.crmBkGameDoneBonus.create({
          data: {
            gameId,
            orderId,
            orderServiceId: matchedService.order_service_id ? Number(matchedService.order_service_id) : null,
            staffId: Number(matchedService.staff_id),
            serviceId: matchedService.service_id ? Number(matchedService.service_id) : null,
            serviceName: String(matchedService.service_name || bestRule.serviceName || 'Dịch vụ'),
            originalPrice: Number(matchedService.service_price || 0),
            actualPaid: Number(matchedService.os_total_price || 0),
            discountAmount: Number(matchedService.discount_amount || 0),
            conditionApplied:
              bestRule.conditionLabel || `${bestRule.conditionType} (${bestRule.bonusAmount.toLocaleString('vi-VN')}đ)`,
            bonusAmount: bestBonus,
            orderCompletedAt: matchedService.completed_at ? new Date(matchedService.completed_at) : null,
          },
        });
        recordedOrderIds.add(orderId);
      } catch {
        // Unique key protection
      }
    }
  }
}

/**
 * Syncs and aggregates done-bonus records and per-staff bonus stats for game detail responses.
 */
export async function fetchAndBuildDoneBonusesSummary(
  fastify: FastifyInstance,
  gameId: number,
  participants: BkGameParticipant[]
): Promise<DoneBonusAggregationResult> {
  try {
    await syncGameDoneBonuses(fastify, gameId);
  } catch (syncErr) {
    fastify.log.warn(syncErr, `Could not sync done bonuses for game ${gameId}`);
  }

  const doneBonusRecords = await fastify.prisma.crm.crmBkGameDoneBonus.findMany({
    where: { gameId },
    orderBy: [{ orderCompletedAt: 'desc' }, { id: 'desc' }],
  });

  const staffBonusMap = new Map<number, { doneCount: number; totalBonus: number }>();
  let grandDoneBonus = 0;
  for (const b of doneBonusRecords) {
    grandDoneBonus += b.bonusAmount;
    const cur = staffBonusMap.get(b.staffId) || { doneCount: 0, totalBonus: 0 };
    cur.doneCount += 1;
    cur.totalBonus += b.bonusAmount;
    staffBonusMap.set(b.staffId, cur);
  }

  const staffBonuses: BkGameDoneBonusStaffSummary[] = Array.from(staffBonusMap.entries()).map(([sid, stat]) => {
    const p = participants.find((x) => x.staffId === sid);
    return {
      staffId: sid,
      staffName: p?.staffName || `Nhân viên #${sid}`,
      doneCount: stat.doneCount,
      totalBonus: stat.totalBonus,
    };
  });

  const doneBonusesSummary: BkGameDoneBonusesSummary = {
    totalDoneBookings: doneBonusRecords.length,
    totalDoneBonus: grandDoneBonus,
    staffBonuses,
  };

  const doneBonuses: BkGameDoneBonusRecord[] = doneBonusRecords.map((r) => {
    const p = participants.find((x) => x.staffId === r.staffId);
    return {
      id: r.id,
      gameId: r.gameId,
      orderId: r.orderId,
      orderServiceId: r.orderServiceId,
      staffId: r.staffId,
      staffName: p?.staffName || `Nhân viên #${r.staffId}`,
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      originalPrice: r.originalPrice,
      actualPaid: r.actualPaid,
      discountAmount: r.discountAmount,
      conditionApplied: r.conditionApplied,
      bonusAmount: r.bonusAmount,
      orderCompletedAt: r.orderCompletedAt ? r.orderCompletedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return {
    doneBonuses,
    doneBonusesSummary,
    staffBonusMap,
  };
}
