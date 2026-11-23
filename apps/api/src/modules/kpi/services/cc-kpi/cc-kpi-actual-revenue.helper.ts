import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { computeOrderRevenueBreakdown } from '../../../customers/routes/dashboard/dashboard-today-cc.helper.js';
import { splitCcShares } from './cc-kpi-helpers.js';

export interface ActualRevenueOrderAllocation {
  saleDate: string;
  storeCode: string;
  staffId: number;
  comboGross: number;
  comboNet: number;
  productGross: number;
  productNet: number;
  singleGross: number;
  singleNet: number;
}

/**
 * Resolves CC display-revenue shares for a completed order so that:
 * - Filtering a single CC (`isSingleConsultantFilter = true`) credits only that CC's share.
 * - Viewing all CCs (`isSingleConsultantFilter = false`) preserves 100% of salon revenue across rows
 *   (splitting 50/50 when both CCs are active, crediting the active CC when paired with a non-CC,
 *   or falling back to the order's checkout/checkin staff / unassigned bucket `0`).
 */
export function allocateActualRevenueShares(
  ccInRaw: SafeAny,
  ccOutRaw: SafeAny,
  activeCcIds: number[],
  isSingleConsultantFilter: boolean
): Array<{ staffId: number; isPrimarySplit: boolean; share: number }> {
  if (isSingleConsultantFilter) {
    return splitCcShares(ccInRaw, ccOutRaw, activeCcIds).map((item, idx) => ({
      staffId: item.staffId,
      isPrimarySplit: idx === 0,
      share: item.share,
    }));
  }

  const activeSet = new Set(activeCcIds.map(Number));
  const ccIn = ccInRaw ? Number(ccInRaw) : null;
  const ccOut = ccOutRaw ? Number(ccOutRaw) : null;
  const inActive = ccIn !== null && activeSet.has(ccIn);
  const outActive = ccOut !== null && activeSet.has(ccOut);

  if (inActive && outActive) {
    if (ccIn === ccOut) {
      return [{ staffId: ccIn, isPrimarySplit: true, share: 1 }];
    }
    return [
      { staffId: ccOut, isPrimarySplit: true, share: 0.5 },
      { staffId: ccIn, isPrimarySplit: false, share: 0.5 },
    ];
  }
  if (outActive && ccOut !== null) {
    return [{ staffId: ccOut, isPrimarySplit: true, share: 1 }];
  }
  if (inActive && ccIn !== null) {
    return [{ staffId: ccIn, isPrimarySplit: true, share: 1 }];
  }

  const fallbackStaffId = ccOut || ccIn || 0;
  return [{ staffId: fallbackStaffId, isPrimarySplit: true, share: 1 }];
}

function splitExactVnd(total: number, shares: Array<{ staffId: number; isPrimarySplit: boolean; share: number }>) {
  const roundedTotal = Math.round(total);
  if (shares.length === 0) return [];
  if (shares.length === 1) {
    return [{ staffId: shares[0].staffId, amount: shares[0].share === 1 ? roundedTotal : Math.round(roundedTotal * shares[0].share) }];
  }
  const primaryAmount = Math.round(roundedTotal / 2);
  const secondaryAmount = roundedTotal - primaryAmount;
  return shares.map((s) => ({
    staffId: s.staffId,
    amount: s.isPrimarySplit ? primaryAmount : secondaryAmount,
  }));
}

/**
 * Loads canonical salon-wide Completed order revenue (Gross & Net) anchored on
 * `COALESCE(ro.actual_booking_date_start, o.booking_date_start)` using the exact same
 * `computeOrderRevenueBreakdown` rules as `/dashboard/today` and `/dashboard/financial-goals`.
 */
export async function loadCanonicalActualRevenueAllocations(
  fastify: FastifyInstance,
  params: {
    startStr: string;
    queryEndAt: string;
    storeFilterClause: string;
    targetStaffIds: number[];
    isSingleConsultantFilter: boolean;
  }
): Promise<{
  allocations: ActualRevenueOrderAllocation[];
  extraStaffProfiles: Map<number, { displayName: string; avatar: string | null }>;
}> {
  const { startStr, queryEndAt, storeFilterClause, targetStaffIds, isSingleConsultantFilter } = params;

  const rawOrders: SafeAny[] = await fastify.prisma.legacy.$queryRawUnsafe(`
    SELECT o.id AS order_id, o.total_price, o.client_store_id,
           DATE_FORMAT(ro.actual_booking_date_start, '%Y-%m-%d') AS sale_date,
           UPPER(COALESCE(cs.client_store_key, 'MOS')) AS store_code
    FROM report_order ro
    INNER JOIN \`order\` o ON o.id = ro.order_id
    LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
    WHERE o.order_state = 'Completed'
      AND ro.actual_booking_date_start >= '${startStr} 00:00:00'
      AND ro.actual_booking_date_start <= '${queryEndAt}'
      ${storeFilterClause}
    UNION ALL
    SELECT o.id AS order_id, o.total_price, o.client_store_id,
           DATE_FORMAT(o.booking_date_start, '%Y-%m-%d') AS sale_date,
           UPPER(COALESCE(cs.client_store_key, 'MOS')) AS store_code
    FROM \`order\` o
    LEFT JOIN report_order ro ON ro.order_id = o.id
    LEFT JOIN \`client_store\` cs ON cs.id = o.client_store_id
    WHERE o.order_state = 'Completed'
      AND ro.actual_booking_date_start IS NULL
      AND o.booking_date_start >= '${startStr} 00:00:00'
      AND o.booking_date_start <= '${queryEndAt}'
      ${storeFilterClause}
  `);

  const seenOrderIds = new Set<number>();
  const orders: SafeAny[] = [];
  for (const order of rawOrders) {
    const orderId = Number(order.order_id || 0);
    if (!orderId || seenOrderIds.has(orderId)) continue;
    seenOrderIds.add(orderId);
    orders.push(order);
  }

  if (orders.length === 0) {
    return { allocations: [], extraStaffProfiles: new Map() };
  }

  const orderIds = orders.map((o) => Number(o.order_id));
  const combosByOrder = new Map<number, SafeAny[]>();
  const productsByOrder = new Map<number, SafeAny[]>();
  const servicesByOrder = new Map<number, SafeAny[]>();

  const pushRows = (map: Map<number, SafeAny[]>, rows: SafeAny[]) => {
    for (const row of rows) {
      const orderId = Number(row.order_id);
      const list = map.get(orderId) || [];
      list.push(row);
      map.set(orderId, list);
    }
  };

  for (let i = 0; i < orderIds.length; i += 2000) {
    const chunk = orderIds.slice(i, i + 2000).join(',');
    const [combos, products, services] = await Promise.all([
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT order_id, total_price, tax_amount, check_in_staff_id, check_out_staff_id FROM \`order_service_combo\` WHERE order_id IN (${chunk})`
      ),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT order_id, total_price, tax_amount FROM \`order_product\` WHERE order_id IN (${chunk})`
      ),
      fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT order_id, tax_amount, check_in_staff_id, check_out_staff_id FROM \`order_service\` WHERE order_id IN (${chunk})`
      ),
    ]);
    pushRows(combosByOrder, combos);
    pushRows(productsByOrder, products);
    pushRows(servicesByOrder, services);
  }

  const allocations: ActualRevenueOrderAllocation[] = [];
  const referencedStaffIds = new Set<number>();

  for (const o of orders) {
    const orderId = Number(o.order_id);
    const orderCombos = combosByOrder.get(orderId) || [];
    const orderProducts = productsByOrder.get(orderId) || [];
    const orderServices = servicesByOrder.get(orderId) || [];

    const rev = computeOrderRevenueBreakdown(Number(o.total_price || 0), orderCombos, orderProducts, orderServices);

    const ccIn =
      orderCombos.find((c) => c.check_in_staff_id)?.check_in_staff_id ||
      orderServices.find((s) => s.check_in_staff_id)?.check_in_staff_id ||
      null;
    const ccOut =
      orderCombos.find((c) => c.check_out_staff_id)?.check_out_staff_id ||
      orderServices.find((s) => s.check_out_staff_id)?.check_out_staff_id ||
      null;

    const shares = allocateActualRevenueShares(ccIn, ccOut, targetStaffIds, isSingleConsultantFilter);
    if (shares.length === 0) continue;

    const comboGrossSplit = splitExactVnd(rev.finalRevCombo, shares);
    const comboNetSplit = splitExactVnd(rev.finalNetCombo, shares);
    const prodGrossSplit = splitExactVnd(rev.finalRevProduct, shares);
    const prodNetSplit = splitExactVnd(rev.finalNetProduct, shares);
    const singleGrossSplit = splitExactVnd(rev.finalRevLe, shares);
    const singleNetSplit = splitExactVnd(rev.finalNetLe, shares);

    const saleDate = String(o.sale_date);
    const storeCode = String(o.store_code || 'MOS');

    for (let idx = 0; idx < shares.length; idx++) {
      const staffId = shares[idx].staffId;
      if (staffId > 0 && !targetStaffIds.includes(staffId)) {
        referencedStaffIds.add(staffId);
      }
      allocations.push({
        saleDate,
        storeCode,
        staffId,
        comboGross: comboGrossSplit[idx]?.amount || 0,
        comboNet: comboNetSplit[idx]?.amount || 0,
        productGross: prodGrossSplit[idx]?.amount || 0,
        productNet: prodNetSplit[idx]?.amount || 0,
        singleGross: singleGrossSplit[idx]?.amount || 0,
        singleNet: singleNetSplit[idx]?.amount || 0,
      });
    }
  }

  const extraStaffProfiles = new Map<number, { displayName: string; avatar: string | null }>();
  if (referencedStaffIds.size > 0) {
    const ids = Array.from(referencedStaffIds).join(',');
    const rows: SafeAny[] = await fastify.prisma.legacy.$queryRawUnsafe(`
      SELECT u.id AS userId, up.full_name AS displayName, up.avatar AS avatar
      FROM \`user\` u
      JOIN \`user_profile\` up ON up.user_id = u.id
      WHERE u.id IN (${ids})
    `);
    for (const r of rows) {
      extraStaffProfiles.set(Number(r.userId), {
        displayName: String(r.displayName || `CC ${r.userId}`),
        avatar: r.avatar ? String(r.avatar) : null,
      });
    }
  }

  return { allocations, extraStaffProfiles };
}
