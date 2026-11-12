import mysql from 'mysql2/promise';
import { IosBookingItem, IosStaffMonthlyStats, SafeAny } from '@mos-lab/shared';

interface StaffStatsCacheEntry {
  data: IosStaffMonthlyStats;
  expiresAt: number;
}

const staffStatsCache = new Map<string, StaffStatsCacheEntry>();
const STAFF_STATS_CACHE_TTL_MS = 15_000;

export function resolveYearMonthFromDate(targetDate?: string): {
  yearNum: number;
  monthNum: number;
  monthStart: string;
  monthEnd: string;
} {
  const match = String(targetDate || '').match(/^(\d{4})-(\d{2})/);
  const now = new Date();
  const yearNum = match ? Number(match[1]) : now.getFullYear();
  const monthNum = match ? Number(match[2]) : now.getMonth() + 1;
  const safeMonth = monthNum >= 1 && monthNum <= 12 ? monthNum : now.getMonth() + 1;
  const monthStart = `${yearNum}-${String(safeMonth).padStart(2, '0')}-01 00:00:00`;
  const nextMonthNum = safeMonth === 12 ? 1 : safeMonth + 1;
  const nextYearNum = safeMonth === 12 ? yearNum + 1 : yearNum;
  const monthEnd = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-01 00:00:00`;
  return { yearNum, monthNum: safeMonth, monthStart, monthEnd };
}

export function createInitialLiveStaffStats(activeStaffId: number, targetDate?: string): IosStaffMonthlyStats {
  const { monthNum } = resolveYearMonthFromDate(targetDate);
  return {
    staffId: activeStaffId,
    month: monthNum,
    monthLabel: `tháng ${monthNum}`,
    monthlyRevenue: 0,
    monthlyRevenueFormatted: '0 đ',
    completedShiftsCount: 0,
    satisfactionRate: 100,
    rating: 5.0,
  };
}

export function buildDemoStaffMonthlyStats(
  bookings: IosBookingItem[],
  activeStaffId: number,
  targetDate: string
): IosStaffMonthlyStats {
  const base = createInitialLiveStaffStats(activeStaffId, targetDate);
  const completedForStaff = bookings.filter((b) => b.status === 'DONE' && Number(b.assignedStaffId) === activeStaffId);
  const monthlyRevenue = completedForStaff.reduce(
    (sum, b) => sum + Number(b.billing?.subtotal ?? b.servicePrice ?? 0),
    0
  );
  return {
    ...base,
    monthlyRevenue,
    monthlyRevenueFormatted: `${monthlyRevenue.toLocaleString('vi-VN')} đ`,
    completedShiftsCount: completedForStaff.length,
  };
}

export async function fetchLiveStaffMonthlyStats(
  pool: mysql.Pool,
  activeStaffId: number,
  targetDate: string,
  logWarn?: (meta: SafeAny, msg: string) => void
): Promise<IosStaffMonthlyStats> {
  const initialStats = createInitialLiveStaffStats(activeStaffId, targetDate);
  const { monthNum, monthStart, monthEnd } = resolveYearMonthFromDate(targetDate);
  const cacheKey = `${activeStaffId}_${monthStart}`;
  const cached = staffStatsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const techPromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(total_order), 0) AS totalOrders,
         COALESCE(SUM(total_paid_cash_amount + total_paid_credit_card_amount + total_paid_bank_transfer_amount), 0) AS totalRev
       FROM report_staff_technician
       WHERE user_id = ? AND date >= DATE(?) AND date < DATE(?)`,
      [activeStaffId, monthStart, monthEnd]
    );

    const liveOrderPromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         COUNT(DISTINCT o.id) AS liveOrders,
         COALESCE(SUM(o.total_price), 0) AS liveOrderRev
       FROM \`order\` o
       JOIN order_service os ON o.id = os.order_id
       WHERE os.assigned_staff_id = ?
         AND o.order_state = 'Completed'
         AND o.booking_date_start >= ? AND o.booking_date_start < ?`,
      [activeStaffId, monthStart, monthEnd]
    );

    const relPromise = pool.query<mysql.RowDataPacket[]>(
      `SELECT
         COALESCE(SUM(relationship_happy_count), 0) AS happyCount,
         COALESCE(SUM(relationship_neutral_count), 0) AS neutralCount,
         COALESCE(SUM(relationship_unhappy_count), 0) AS unhappyCount,
         COALESCE(SUM(relationship_happy_count + relationship_neutral_count + relationship_unhappy_count), 0) AS totalEval
       FROM report_staff_relationship
       WHERE user_id = ? AND date >= DATE(?) AND date < DATE(?)`,
      [activeStaffId, monthStart, monthEnd]
    );

    const [[techRows], [liveOrderRows], [relRows]] = await Promise.all([techPromise, liveOrderPromise, relPromise]);

    const totalOrders = Math.max(Number(techRows?.[0]?.totalOrders || 0), Number(liveOrderRows?.[0]?.liveOrders || 0));
    const totalRev = Math.max(Number(techRows?.[0]?.totalRev || 0), Number(liveOrderRows?.[0]?.liveOrderRev || 0));

    const happy = Number(relRows?.[0]?.happyCount || 0);
    const unhappy = Number(relRows?.[0]?.unhappyCount || 0);
    const totalEval = Number(relRows?.[0]?.totalEval || 0);

    let satRate = 100;
    if (totalEval > 0) {
      satRate = unhappy === 0 ? 100 : Math.round((happy / totalEval) * 100);
    }

    const stats: IosStaffMonthlyStats = {
      staffId: activeStaffId,
      month: monthNum,
      monthLabel: `tháng ${monthNum}`,
      monthlyRevenue: totalRev,
      monthlyRevenueFormatted: `${totalRev.toLocaleString('vi-VN')} đ`,
      completedShiftsCount: totalOrders,
      satisfactionRate: satRate,
      rating: 5.0,
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
