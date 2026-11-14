import mysql from 'mysql2/promise';
import {
  calculateCvComboTierBonus,
  calculateCvSerumTierBonus,
  calculateDualComboTierBonus,
  CvlTrainingMentorshipPair,
  CvToCvPlusRequirements,
  DEFAULT_CAREER_PROGRESSION_CONFIG,
  IosBookingItem,
  IosStaffMonthlyStats,
  SafeAny,
} from '@mos-lab/shared';
import {
  buildExcludeOtherMenteeTrainingOrderSql,
  buildIsMenteeTrainingWindowSql,
} from '../../kpi/services/cvl-training-mentorship.service.js';
import { getCrmPool } from './db-pools.js';
import { invalidateCvSelfSpeedCache } from './ios-cv-self-speed.service.js';
import { resolveBookingCvRotationPointsBackend } from './ios-cv-points.helper.js';

interface StaffStatsCacheEntry {
  data: IosStaffMonthlyStats;
  expiresAt: number;
}

const staffStatsCache = new Map<string, StaffStatsCacheEntry>();
const STAFF_STATS_CACHE_TTL_MS = 15_000;

let cachedCvPlusRules: { data: CvToCvPlusRequirements; expiresAt: number } | null = null;
const RULES_CACHE_TTL_MS = 60_000;

export function invalidateStaffStatsCache(staffIds?: number[]): void {
  invalidateCvSelfSpeedCache(staffIds);
  if (!staffIds || staffIds.length === 0) {
    staffStatsCache.clear();
    return;
  }
  const idSet = new Set(staffIds.filter((id) => Number.isFinite(id) && id > 0).map((id) => `${id}_`));
  for (const key of Array.from(staffStatsCache.keys())) {
    for (const prefix of idSet) {
      if (key.startsWith(prefix)) {
        staffStatsCache.delete(key);
        break;
      }
    }
  }
}

async function loadDynamicCvPlusRules(): Promise<CvToCvPlusRequirements> {
  if (cachedCvPlusRules && cachedCvPlusRules.expiresAt > Date.now()) {
    return cachedCvPlusRules.data;
  }
  const fallback = DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCvPlus!;
  try {
    const crmPool = getCrmPool();
    const [rows] = await crmPool.query<mysql.RowDataPacket[]>(
      'SELECT `value` FROM crm_config WHERE `key` = ? LIMIT 1',
      ['CAREER_PROGRESSION_RULES']
    );
    const raw = rows?.[0]?.value;
    if (raw) {
      const parsed = JSON.parse(String(raw));
      const merged: CvToCvPlusRequirements = {
        ...fallback,
        ...(parsed?.cvToCvPlus || {}),
      };
      cachedCvPlusRules = { data: merged, expiresAt: Date.now() + RULES_CACHE_TTL_MS };
      return merged;
    }
  } catch {
    // Fallback safely when CRM DB is offline or in unit tests
  }
  return fallback;
}

export function resolveYearMonthFromDate(targetDate?: string): {
  yearNum: number;
  monthNum: number;
  dayStr: string;
  monthStart: string;
  monthEnd: string;
} {
  const now = new Date();
  const fullMatch = String(targetDate || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  const ymMatch = String(targetDate || '').match(/^(\d{4})-(\d{2})/);
  const yearNum = ymMatch ? Number(ymMatch[1]) : now.getFullYear();
  const monthNum = ymMatch ? Number(ymMatch[2]) : now.getMonth() + 1;
  const safeMonth = monthNum >= 1 && monthNum <= 12 ? monthNum : now.getMonth() + 1;
  const dayStr = fullMatch
    ? `${fullMatch[1]}-${fullMatch[2]}-${fullMatch[3]}`
    : `${yearNum}-${String(safeMonth).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const monthStart = `${yearNum}-${String(safeMonth).padStart(2, '0')}-01 00:00:00`;
  const nextMonthNum = safeMonth === 12 ? 1 : safeMonth + 1;
  const nextYearNum = safeMonth === 12 ? yearNum + 1 : yearNum;
  const monthEnd = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-01 00:00:00`;
  return { yearNum, monthNum: safeMonth, dayStr, monthStart, monthEnd };
}

export function createInitialLiveStaffStats(activeStaffId: number, targetDate?: string): IosStaffMonthlyStats {
  const { monthNum } = resolveYearMonthFromDate(targetDate);
  const rules = DEFAULT_CAREER_PROGRESSION_CONFIG.cvToCvPlus!;
  return {
    staffId: activeStaffId,
    month: monthNum,
    monthLabel: `tháng ${monthNum}`,
    monthlyRevenue: 0,
    monthlyRevenueFormatted: '0 đ',
    completedShiftsCount: 0,
    satisfactionRate: 100,
    rating: 5.0,
    completedToday: 0,
    pointsToday: 0,
    monthlyPoints: 0,
    serviceBonusMonth: 0,
    tipEarnedToday: 0,
    tipEarnedMonth: 0,
    comboBonusToday: 0,
    serumBonusToday: 0,
    comboBonusMonth: 0,
    hourlyPayMonth: 0,
    shiftHours: '08:30 - 20:00',
    cvPlusRules: rules,
  };
}

export function buildDemoStaffMonthlyStats(
  bookings: IosBookingItem[],
  activeStaffId: number,
  targetDate: string
): IosStaffMonthlyStats {
  const base = createInitialLiveStaffStats(activeStaffId, targetDate);
  const rules = base.cvPlusRules;
  const completedForStaff = bookings.filter((b) => b.status === 'DONE' && Number(b.assignedStaffId) === activeStaffId);
  const checkedOutByStaff = bookings.filter((b) => {
    if (b.status !== 'DONE') return false;
    if (b.isTrainingCvlOrder) {
      return Number(b.assignedStaffId) === activeStaffId;
    }
    return Number(b.checkOutStaffId || b.assignedStaffId) === activeStaffId;
  });

  const monthlyRevenue = completedForStaff.reduce(
    (sum, b) => sum + Number(b.billing?.subtotal ?? b.servicePrice ?? 0),
    0
  );
  const pointsToday = completedForStaff.reduce((sum, b) => sum + resolveBookingCvRotationPointsBackend(b), 0);
  const comboBonusToday = checkedOutByStaff.reduce((sum, b) => {
    const dual = calculateDualComboTierBonus(
      Number(b.selectedCombo?.price || 0),
      Number(b.selectedUnderCombo?.price || 0),
      rules
    );
    return sum + dual.totalBonus;
  }, 0);
  const serumBonusToday = checkedOutByStaff.reduce(
    (sum, b) =>
      sum +
      (b.cartProducts || []).reduce(
        (pSum, p) => pSum + calculateCvSerumTierBonus(Number(p.price || 0), Number(p.quantity || 1), rules),
        0
      ),
    0
  );
  const tipEarnedToday = bookings
    .filter((b) => b.status === 'DONE')
    .reduce((sum, b) => {
      const tipTotal = Number(b.billing?.tipAmount || 0);
      if (tipTotal <= 0) return sum;
      if (b.isTrainingCvlOrder) {
        return Number(b.assignedStaffId) === activeStaffId ? sum + Math.round((tipTotal * 90) / 100) : sum;
      }
      let pct = 0;
      if (Number(b.assignedStaffId) === activeStaffId) pct += 70;
      if (Number(b.checkInStaffId || b.assignedStaffId) === activeStaffId) pct += 10;
      if (Number(b.checkOutStaffId || b.assignedStaffId) === activeStaffId) pct += 10;
      return sum + Math.round((tipTotal * pct) / 100);
    }, 0);

  return {
    ...base,
    monthlyRevenue,
    monthlyRevenueFormatted: `${monthlyRevenue.toLocaleString('vi-VN')} đ`,
    completedShiftsCount: completedForStaff.length,
    completedToday: completedForStaff.length,
    pointsToday,
    monthlyPoints: pointsToday,
    tipEarnedToday,
    tipEarnedMonth: tipEarnedToday,
    comboBonusToday,
    serumBonusToday,
    comboBonusMonth: comboBonusToday + serumBonusToday,
  };
}

export async function fetchLiveStaffMonthlyStats(
  pool: mysql.Pool,
  activeStaffId: number,
  targetDate: string,
  logWarn?: (meta: SafeAny, msg: string) => void,
  activeTrainingPairs: CvlTrainingMentorshipPair[] = []
): Promise<IosStaffMonthlyStats> {
  const initialStats = createInitialLiveStaffStats(activeStaffId, targetDate);
  const { monthNum, dayStr, monthStart, monthEnd } = resolveYearMonthFromDate(targetDate);
  const dayStart = `${dayStr} 00:00:00`;
  const dayEnd = `${dayStr} 23:59:59`;
  const trainingKey = activeTrainingPairs
    .filter((p) => p.isActive)
    .map((p) => `${p.menteeLegacyStaffId}:${p.startDate}:${p.endDate}`)
    .join('|');
  const cacheKey = `${activeStaffId}_${monthStart}_${dayStr}_${trainingKey}`;
  const cached = staffStatsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const cvPlusRules = await loadDynamicCvPlusRules();
    const menteePairs = activeTrainingPairs.filter((p) => p.isActive && p.menteeLegacyStaffId === activeStaffId);
    const menteeWindowSql = buildIsMenteeTrainingWindowSql(menteePairs, 'o.booking_date_start');
    const excludeOtherMenteeOrderSql = buildExcludeOtherMenteeTrainingOrderSql(
      activeTrainingPairs,
      activeStaffId,
      'o.id',
      'o.booking_date_start'
    );

    const techPromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(total_order), 0) AS totalOrders,
         COALESCE(SUM(total_paid_cash_amount + total_paid_credit_card_amount + total_paid_bank_transfer_amount), 0) AS totalRev,
         COALESCE(SUM(working_minute), 0) AS totalWorkingMinute
       FROM report_staff_technician
       WHERE user_id = ? AND date >= DATE(?) AND date < DATE(?)`,
      [activeStaffId, monthStart, monthEnd]
    );

    const liveOrderPromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         COUNT(DISTINCT o.id) AS liveOrders,
         COUNT(DISTINCT CASE WHEN o.booking_date_start >= ? AND o.booking_date_start <= ? THEN o.id END) AS todayOrders,
         COALESCE(SUM(o.total_price), 0) AS liveOrderRev
       FROM \`order\` o
       JOIN order_service os ON o.id = os.order_id
       WHERE os.assigned_staff_id = ?
         AND o.order_state = 'Completed'
         AND o.booking_date_start >= ? AND o.booking_date_start < ?`,
      [dayStart, dayEnd, activeStaffId, monthStart, monthEnd]
    );

    const relPromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(relationship_happy_count), 0) AS happyCount,
         COALESCE(SUM(relationship_unhappy_count), 0) AS unhappyCount,
         COALESCE(SUM(relationship_happy_count + relationship_neutral_count + relationship_unhappy_count), 0) AS totalEval
       FROM report_staff_relationship
       WHERE user_id = ? AND date >= DATE(?) AND date < DATE(?)`,
      [activeStaffId, monthStart, monthEnd]
    );

    const bonusPromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(CASE WHEN sb.bonus_type = 'BonusPoint' THEN sb.bonus_amount ELSE 0 END), 0) AS monthlyPoints,
         COALESCE(SUM(CASE WHEN sb.bonus_type = 'BonusPoint' AND o.booking_date_start >= ? AND o.booking_date_start <= ? THEN sb.bonus_amount ELSE 0 END), 0) AS pointsToday,
         COALESCE(SUM(CASE WHEN sb.bonus_type != 'BonusPoint' THEN sb.bonus_amount ELSE 0 END), 0) AS serviceBonusMonth
       FROM staff_bonus sb
       JOIN order_service os ON os.id = sb.order_service_id
       JOIN \`order\` o ON o.id = os.order_id
       WHERE sb.user_id = ?
         AND o.order_state = 'Completed'
         AND o.booking_date_start >= ? AND o.booking_date_start < ?
         ${excludeOtherMenteeOrderSql}`,
      [dayStart, dayEnd, activeStaffId, monthStart, monthEnd]
    );

    const tipParams: Array<string | number> = [dayStart, dayEnd, monthStart, monthEnd, activeStaffId];
    if (menteePairs.length > 0) {
      tipParams.push(activeStaffId, activeStaffId);
    }
    const tipPromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(st.tip_amount), 0) AS tipMonth,
         COALESCE(SUM(CASE WHEN o.booking_date_start >= ? AND o.booking_date_start <= ? THEN st.tip_amount ELSE 0 END), 0) AS tipToday
       FROM staff_tip st
       JOIN \`order\` o ON o.id = st.order_id
       WHERE o.order_state = 'Completed'
         AND o.booking_date_start >= ? AND o.booking_date_start < ?
         AND (
           st.user_id = ?
           ${
             menteePairs.length > 0
               ? `OR (
                   st.user_id <> ?
                   AND COALESCE(st.tip_percentage, 0) > 0
                   AND COALESCE(st.tip_percentage, 0) <= 20
                   AND COALESCE(st.is_academy, 0) = 0
                   AND ${menteeWindowSql}
                   AND EXISTS (SELECT 1 FROM order_service os_mt WHERE os_mt.order_id = o.id AND os_mt.assigned_staff_id = ?)
                 )`
               : ''
           }
         )
         ${excludeOtherMenteeOrderSql}`,
      tipParams
    );

    const comboAndProductStaffParams: Array<string | number> =
      menteePairs.length > 0
        ? [activeStaffId, activeStaffId, activeStaffId, monthStart, monthEnd]
        : [activeStaffId, activeStaffId, monthStart, monthEnd];

    const comboRowsPromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT osc.id, osc.order_id, osc.total_price, o.booking_date_start
       FROM order_service_combo osc
       JOIN \`order\` o ON o.id = osc.order_id
       JOIN order_service os ON os.order_id = osc.order_id
         AND (
           os.check_out_staff_id = ?
           OR ((os.check_out_staff_id IS NULL OR os.check_out_staff_id = 0) AND os.assigned_staff_id = ?)
           ${menteePairs.length > 0 ? `OR (os.assigned_staff_id = ? AND ${menteeWindowSql})` : ''}
         )
       WHERE o.order_state = 'Completed'
         AND o.booking_date_start >= ? AND o.booking_date_start < ?
         AND osc.total_price > 0
         ${excludeOtherMenteeOrderSql}
       GROUP BY osc.id`,
      comboAndProductStaffParams
    );

    const productRowsPromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT op.id, op.total_price, op.quantity, o.booking_date_start
       FROM order_product op
       JOIN \`order\` o ON o.id = op.order_id
       JOIN order_service os ON os.order_id = op.order_id
         AND (
           os.check_out_staff_id = ?
           OR ((os.check_out_staff_id IS NULL OR os.check_out_staff_id = 0) AND os.assigned_staff_id = ?)
           ${menteePairs.length > 0 ? `OR (os.assigned_staff_id = ? AND ${menteeWindowSql})` : ''}
         )
       WHERE o.order_state = 'Completed'
         AND o.booking_date_start >= ? AND o.booking_date_start < ?
         ${excludeOtherMenteeOrderSql}
       GROUP BY op.id`,
      comboAndProductStaffParams
    );

    const [[techRows], [liveOrderRows], [relRows], [bonusRows], [tipRows], [comboRows], [productRows]] =
      await Promise.all([
        techPromise,
        liveOrderPromise,
        relPromise,
        bonusPromise,
        tipPromise,
        comboRowsPromise,
        productRowsPromise,
      ]);

    const totalOrders = Math.max(Number(techRows?.[0]?.totalOrders || 0), Number(liveOrderRows?.[0]?.liveOrders || 0));
    const totalRev = Math.max(Number(techRows?.[0]?.totalRev || 0), Number(liveOrderRows?.[0]?.liveOrderRev || 0));
    const completedToday = Number(liveOrderRows?.[0]?.todayOrders || 0);

    const happy = Number(relRows?.[0]?.happyCount || 0);
    const unhappy = Number(relRows?.[0]?.unhappyCount || 0);
    const totalEval = Number(relRows?.[0]?.totalEval || 0);
    const satRate = totalEval > 0 ? (unhappy === 0 ? 100 : Math.round((happy / totalEval) * 100)) : 100;

    // Cộng gộp tổng tiền các gói Combo mua cùng 1 lúc trong cùng 1 đơn (order_id) trước khi tính thưởng (Điều răn CV-002 v2.8.0)
    const comboOrdersMap = new Map<number, { totalPrice: number; bookingDate: string }>();
    for (const row of comboRows || []) {
      const orderId = Number(row.order_id || row.id || 0);
      const existing = comboOrdersMap.get(orderId);
      const rowPrice = Number(row.total_price || 0);
      const bDate = String(row.booking_date_start || '').slice(0, 10);
      if (existing) {
        existing.totalPrice += rowPrice;
      } else {
        comboOrdersMap.set(orderId, { totalPrice: rowPrice, bookingDate: bDate });
      }
    }

    let comboBonusMonthOnly = 0;
    let comboBonusToday = 0;
    for (const orderCombo of comboOrdersMap.values()) {
      const bonus = calculateCvComboTierBonus(orderCombo.totalPrice, cvPlusRules);
      comboBonusMonthOnly += bonus;
      if (orderCombo.bookingDate === dayStr) {
        comboBonusToday += bonus;
      }
    }

    let serumBonusMonthOnly = 0;
    let serumBonusToday = 0;
    for (const row of productRows || []) {
      const qty = Math.max(1, Number(row.quantity || 1));
      const unitPrice = Math.round(Number(row.total_price || 0) / qty);
      const bonus = calculateCvSerumTierBonus(unitPrice, qty, cvPlusRules);
      serumBonusMonthOnly += bonus;
      const bDate = String(row.booking_date_start || '').slice(0, 10);
      if (bDate === dayStr) {
        serumBonusToday += bonus;
      }
    }

    const totalWorkHours = Math.round((Number(techRows?.[0]?.totalWorkingMinute || 0) / 60) * 100) / 100;
    const hourlyWageRate = cvPlusRules.hourlyWage || 27500;
    const hourlyPayMonth = Math.round(totalWorkHours * hourlyWageRate);

    const stats: IosStaffMonthlyStats = {
      staffId: activeStaffId,
      month: monthNum,
      monthLabel: `tháng ${monthNum}`,
      monthlyRevenue: totalRev,
      monthlyRevenueFormatted: `${totalRev.toLocaleString('vi-VN')} đ`,
      completedShiftsCount: totalOrders,
      satisfactionRate: satRate,
      rating: 5.0,
      completedToday,
      pointsToday: Math.round(Number(bonusRows?.[0]?.pointsToday || 0)),
      monthlyPoints: Math.round(Number(bonusRows?.[0]?.monthlyPoints || 0)),
      serviceBonusMonth: Math.round(Number(bonusRows?.[0]?.serviceBonusMonth || 0)),
      tipEarnedToday: Math.round(Number(tipRows?.[0]?.tipToday || 0)),
      tipEarnedMonth: Math.round(Number(tipRows?.[0]?.tipMonth || 0)),
      comboBonusToday,
      serumBonusToday,
      comboBonusMonth: comboBonusMonthOnly + serumBonusMonthOnly,
      hourlyPayMonth,
      shiftHours: '08:30 - 20:00',
      cvPlusRules,
    };

    staffStatsCache.set(cacheKey, {
      data: stats,
      expiresAt: Date.now() + STAFF_STATS_CACHE_TTL_MS,
    });

    return stats;
  } catch (err) {
    logWarn?.({ err }, 'Could not query live staffStats');
    return initialStats;
  }
}
