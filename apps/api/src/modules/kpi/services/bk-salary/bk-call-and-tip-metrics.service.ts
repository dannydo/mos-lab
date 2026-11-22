import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';

export interface BkCallMetrics {
  callCount: number;
  pickupCount: number;
  /** Pickup rate = successful pickups / outbound calls. */
  pickupRate: number;
}

const EMPTY_BK_CALL_METRICS: BkCallMetrics = { callCount: 0, pickupCount: 0, pickupRate: 0 };

/**
 * Single definition for Booker pickup rate. Keep this on the backend so every
 * leaderboard/export consumer presents the same result.
 */
const calculateBkPickupRate = (pickupCount: number, callCount: number): number => {
  if (callCount <= 0) return 0;
  return Math.min(100, Number(((Math.max(0, pickupCount) / callCount) * 100).toFixed(1)));
};

const normalizeStaffName = (name: string) =>
  String(name || '')
    .trim()
    .toLocaleLowerCase('vi-VN');

/**
 * Reconciles each Booker's outbound-call activity from the CRM call ledger and
 * the OmiCall webhook ledger. One call can exist in both ledgers, so we use the
 * larger count per CRM staff record instead of adding both sources together.
 */
export async function getBkCallMetricsByLegacyStaffIds(
  fastify: FastifyInstance,
  startPart: string,
  endPart: string,
  legacyStaffIds: number[]
): Promise<Map<number, BkCallMetrics>> {
  const validLegacyStaffIds = [...new Set(legacyStaffIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const metricsByLegacyStaffId = new Map<number, BkCallMetrics>();

  validLegacyStaffIds.forEach((legacyStaffId) => {
    metricsByLegacyStaffId.set(legacyStaffId, { ...EMPTY_BK_CALL_METRICS });
  });

  if (validLegacyStaffIds.length === 0) return metricsByLegacyStaffId;
  const validLegacyStaffIdSet = new Set(validLegacyStaffIds);

  const profiles = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT user_id AS legacyStaffId, full_name AS displayName
    FROM user_profile
    WHERE user_id IN (${validLegacyStaffIds.join(',')})
  `);
  const legacyStaffIdByName = new Map<string, number>();
  profiles.forEach((profile) => {
    const legacyStaffId = Number(profile.legacyStaffId);
    if (validLegacyStaffIdSet.has(legacyStaffId)) {
      legacyStaffIdByName.set(normalizeStaffName(String(profile.displayName)), legacyStaffId);
    }
  });

  const profileNames = profiles.map((profile) => String(profile.displayName || '')).filter(Boolean);
  const crmStaff =
    (await fastify.prisma?.crm?.crmStaff
      ?.findMany?.({
        where: {
          isActive: true,
          OR: [
            { legacyStaffId: { in: validLegacyStaffIds } },
            ...(profileNames.length > 0 ? [{ displayName: { in: profileNames } }] : []),
          ],
        },
        select: { id: true, legacyStaffId: true, displayName: true },
      })
      ?.catch?.(() => [])) || [];

  const legacyStaffIdByCrmStaffId = new Map<number, number>();
  crmStaff.forEach((staff) => {
    const legacyStaffId =
      staff.legacyStaffId && validLegacyStaffIdSet.has(Number(staff.legacyStaffId))
        ? Number(staff.legacyStaffId)
        : legacyStaffIdByName.get(normalizeStaffName(staff.displayName));
    if (legacyStaffId) {
      legacyStaffIdByCrmStaffId.set(staff.id, legacyStaffId);
    }
  });

  const crmStaffIds = Array.from(legacyStaffIdByCrmStaffId.keys());
  if (crmStaffIds.length === 0) return metricsByLegacyStaffId;

  const startIso =
    startPart.includes('+') || startPart.endsWith('Z')
      ? startPart
      : startPart.includes('T')
        ? `${startPart}+07:00`
        : `${startPart}T00:00:00+07:00`;
  const endIso =
    endPart.includes('+') || endPart.endsWith('Z')
      ? endPart
      : endPart.includes('T')
        ? `${endPart}+07:00`
        : `${endPart}T23:59:59.999+07:00`;
  const start = new Date(startIso);
  const end = new Date(endIso);
  const [crmLogs, omicallLogs] = await Promise.all([
    fastify.prisma?.crm?.crmCallLog?.findMany
      ? fastify.prisma.crm.crmCallLog
          .findMany({
            where: { staffId: { in: crmStaffIds }, createdAt: { gte: start, lte: end } },
            select: { staffId: true, callResult: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
    fastify.prisma?.crm?.crmOmicallLog?.findMany
      ? fastify.prisma.crm.crmOmicallLog
          .findMany({
            where: { staffId: { in: crmStaffIds }, createdAt: { gte: start, lte: end }, direction: 'outbound' },
            select: { staffId: true, status: true },
          })
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  const crmMetrics = new Map<number, BkCallMetrics>();
  crmLogs.forEach((log) => {
    const staffId = Number(log.staffId);
    const metric = crmMetrics.get(staffId) || { ...EMPTY_BK_CALL_METRICS };
    metric.callCount += 1;
    if (['ANSWERED', 'ANSWER', 'CONNECTED'].includes(String(log.callResult || '').toUpperCase())) {
      metric.pickupCount += 1;
    }
    crmMetrics.set(staffId, metric);
  });

  const omicallMetrics = new Map<number, BkCallMetrics>();
  omicallLogs.forEach((log) => {
    if (!log.staffId) return;
    const staffId = Number(log.staffId);
    const metric = omicallMetrics.get(staffId) || { ...EMPTY_BK_CALL_METRICS };
    metric.callCount += 1;
    if (String(log.status || '').toUpperCase() === 'ANSWER') {
      metric.pickupCount += 1;
    }
    omicallMetrics.set(staffId, metric);
  });

  crmStaffIds.forEach((crmStaffId) => {
    const legacyStaffId = legacyStaffIdByCrmStaffId.get(crmStaffId);
    if (!legacyStaffId) return;

    const crmMetric = crmMetrics.get(crmStaffId) || EMPTY_BK_CALL_METRICS;
    const omicallMetric = omicallMetrics.get(crmStaffId) || EMPTY_BK_CALL_METRICS;
    const current = metricsByLegacyStaffId.get(legacyStaffId) || { ...EMPTY_BK_CALL_METRICS };

    current.callCount += Math.max(crmMetric.callCount, omicallMetric.callCount);
    current.pickupCount += Math.max(crmMetric.pickupCount, omicallMetric.pickupCount);
    current.pickupRate = calculateBkPickupRate(current.pickupCount, current.callCount);
    metricsByLegacyStaffId.set(legacyStaffId, current);
  });

  return metricsByLegacyStaffId;
}

/**
 * Reconstructs the customer's full tip from the staff-tip ledger. A single
 * customer tip can be split across staff (for example 20% and 10% rows), so
 * the maximum normalized share represents the paid customer-tip amount once.
 */
export async function getCustomerTipAmountByOrderIds(
  fastify: FastifyInstance,
  orderIds: number[]
): Promise<Map<number, number>> {
  const validOrderIds = [...new Set(orderIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
  const tipsByOrder = new Map<number, number>();

  if (validOrderIds.length === 0) return tipsByOrder;

  const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
    SELECT
      st.order_id AS orderId,
      MAX(CASE WHEN st.tip_percentage > 0 THEN st.tip_amount / (st.tip_percentage / 100) ELSE st.tip_amount END) AS customerTip
    FROM staff_tip st
    JOIN \`order\` o ON o.id = st.order_id
    WHERE st.order_id IN (${validOrderIds.join(',')})
      AND st.tip_amount > 0
      AND o.order_state = 'Completed'
    GROUP BY st.order_id
  `);

  rows.forEach((row) => tipsByOrder.set(Number(row.orderId), Math.round(Number(row.customerTip || 0))));
  return tipsByOrder;
}
