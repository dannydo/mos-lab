import { FastifyInstance } from 'fastify';
import {
  BkGameParticipant,
  BkGameTeamKpiDailyContributor,
  BkGameTeamKpiDailyResult,
  BkGameTeamKpiSummary,
  SafeAny,
} from '@mos-lab/shared';
import {
  buildBookingChannelFilter,
  formatIctDate,
  formatIctDateTime,
  parseAllowedBookingChannels,
  parseTeamKpiConfig,
} from './bk-game-helpers.js';

export interface TeamKpiGameInput {
  id: number;
  startDate: Date;
  endDate: Date;
  targetScore?: number | null;
  teamKpiConfig?: string | null;
  allowedBookingChannels?: string | null;
}

const DAY_NAME_LABELS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/**
 * Computes Team KPI summary, daily breakdown, and reward/penalty ledger.
 */
export async function computeTeamKpiSummary(
  fastify: FastifyInstance,
  game: TeamKpiGameInput,
  participants: BkGameParticipant[]
): Promise<BkGameTeamKpiSummary | null> {
  const config = parseTeamKpiConfig(game.teamKpiConfig) || {
    dailyTarget: game.targetScore || 30,
    rewardPerDay: 50000,
    penaltyPerDay: 25000,
    timeWindowStart: '08:00',
    timeWindowEnd: '17:00',
  };

  const staffIds = participants.map((p) => p.staffId);
  if (staffIds.length === 0) {
    return null;
  }

  const allowedChannels = parseAllowedBookingChannels(game.allowedBookingChannels);
  const channelFilter = buildBookingChannelFilter(allowedChannels, 'o.booking_channels');

  const endDateStr = formatIctDate(game.endDate);
  const todayStr = formatIctDate(new Date());

  const dailyList: string[] = [];
  const curr = new Date(game.startDate);
  while (formatIctDate(curr) <= endDateStr && dailyList.length < 90) {
    const dStr = formatIctDate(curr);
    if (!dailyList.includes(dStr)) {
      dailyList.push(dStr);
    }
    curr.setDate(curr.getDate() + 1);
  }

  const timeWindowStart = config.timeWindowStart || '08:00';
  const timeWindowEnd = config.timeWindowEnd || '17:00';
  const startIctDateTime = formatIctDateTime(game.startDate);
  const endIctDateTime = formatIctDateTime(game.endDate);

  let rows: SafeAny[];
  try {
    rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
      SELECT 
        DATE_FORMAT(o.date_created, '%Y-%m-%d') AS bookingDate,
        o.created_staff_id AS staffId,
        COUNT(DISTINCT o.id) AS metricCount
      FROM \`order\` o
      WHERE o.created_staff_id IN (${staffIds.join(',')})
        AND o.date_created >= '${startIctDateTime}'
        AND o.date_created <= '${endIctDateTime}'
        AND TIME(o.date_created) >= '${timeWindowStart}:00'
        AND TIME(o.date_created) <= '${timeWindowEnd}:59'
        AND o.order_state != 'Cancelled'
        ${channelFilter}
      GROUP BY DATE_FORMAT(o.date_created, '%Y-%m-%d'), o.created_staff_id
    `);
  } catch (err) {
    fastify.log.warn(err, `Could not query legacy orders for Team KPI game ${game.id}`);
    rows = [];
  }

  const dateMap = new Map<string, Map<number, number>>();
  for (const r of rows) {
    const d = String(r.bookingDate);
    const sid = Number(r.staffId);
    const cnt = Number(r.metricCount || 0);
    if (!dateMap.has(d)) {
      dateMap.set(d, new Map());
    }
    dateMap.get(d)!.set(sid, cnt);
  }

  const staffNameMap = new Map<number, string>();
  for (const p of participants) {
    staffNameMap.set(p.staffId, p.staffName);
  }

  const dailyResults: BkGameTeamKpiDailyResult[] = dailyList.map((dStr) => {
    const staffCounts = dateMap.get(dStr) || new Map<number, number>();
    let actual = 0;
    const contributors: BkGameTeamKpiDailyContributor[] = [];

    for (const [sid, cnt] of staffCounts.entries()) {
      actual += cnt;
      contributors.push({
        staffId: sid,
        staffName: staffNameMap.get(sid) || `Nhân viên #${sid}`,
        count: cnt,
      });
    }

    contributors.sort((a, b) => b.count - a.count);

    const dObj = new Date(`${dStr}T00:00:00+07:00`);
    const dayOfWeek = DAY_NAME_LABELS[dObj.getDay()] || '';
    const [, month, day] = dStr.split('-');
    const dateLabel = `${dayOfWeek}, ${day}/${month}`;

    const isToday = dStr === todayStr;
    const isFuture = dStr > todayStr;
    const isPassed = actual >= config.dailyTarget;

    let netReward = 0;
    let rewardAmount = 0;
    let penaltyAmount = 0;

    if (!isFuture) {
      if (isPassed) {
        rewardAmount = config.rewardPerDay;
        penaltyAmount = 0;
        netReward = config.rewardPerDay;
      } else if (!isToday) {
        rewardAmount = 0;
        penaltyAmount = config.penaltyPerDay;
        netReward = -config.penaltyPerDay;
      } else {
        rewardAmount = 0;
        penaltyAmount = 0;
        netReward = 0;
      }
    }

    return {
      date: dStr,
      dateLabel,
      target: config.dailyTarget,
      actual,
      isPassed,
      isToday,
      isFuture,
      netReward,
      rewardAmount,
      penaltyAmount,
      timeWindow: `${timeWindowStart} - ${timeWindowEnd}`,
      contributors,
    };
  });

  const passedDays = dailyResults.filter((r) => r.isPassed).length;
  const failedDays = dailyResults.filter((r) => !r.isPassed && !r.isToday && !r.isFuture).length;
  const remainingDays = dailyResults.filter((r) => r.isFuture || (r.isToday && !r.isPassed)).length;
  const totalBookings = dailyResults.reduce((sum, r) => sum + r.actual, 0);

  const todayResult = dailyResults.find((r) => r.isToday);
  const todayBookings = todayResult ? todayResult.actual : 0;
  const todayPassed = todayResult ? todayResult.isPassed : false;

  const totalReward = dailyResults.reduce((sum, r) => sum + r.rewardAmount, 0);
  const totalPenalty = dailyResults.reduce((sum, r) => sum + r.penaltyAmount, 0);
  const netReward = totalReward - totalPenalty;

  return {
    config,
    totalDays: dailyResults.length,
    passedDays,
    failedDays,
    remainingDays,
    totalBookings,
    todayBookings,
    todayTarget: config.dailyTarget,
    todayPassed,
    totalReward,
    totalPenalty,
    netReward,
    dailyResults,
  };
}
