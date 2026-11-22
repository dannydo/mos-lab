import type { TelesaleStaffTarget, TelesaleTargetOverview } from '@mos-lab/shared';
import type { StaffLeaderboardItemMetrics, StaffLeaderboardStatusTier, TeamMonthKpiMetrics } from './kpiOverviewTypes';

const RANK_ICONS = ['🥇', '🥈', '🥉', '4.', '5.', '6.'];

/**
 * Formats signed gap values for Team Month ribbons and gauges (`>= 0` shows `+`).
 */
export function formatTeamGapValue(gap: number | string): number | string {
  return typeof gap === 'number' ? `${gap >= 0 ? '+' : ''}${gap}` : gap;
}

/**
 * Formats compact VND revenue for Combo Performance Hub (`>= 1M` -> `X.YM`).
 */
export function formatComboRevenueShort(revenueVnd: number): string {
  return revenueVnd >= 1_000_000 ? `${(revenueVnd / 1_000_000).toFixed(1)}M` : `${revenueVnd.toLocaleString('vi-VN')}đ`;
}

/**
 * Computes all derived KPI metrics for Box 1 (`KpiTeamMonthCard`).
 */
export function computeTeamMonthKpiMetrics(overview: TelesaleTargetOverview): TeamMonthKpiMetrics {
  const { month, teamMonth } = overview;
  const monthNumStr = month.split('-')[1] || '10';

  const comboLiveMonthActual = teamMonth.comboLiveDoneActual || 0;
  const comboSoldMonthActual = teamMonth.comboSoldActual || 0;
  const comboRevenueMonthActual = teamMonth.comboRevenueActual || 0;
  // Retail Done (Single Done thuần túy không gồm Combo, e.g. 44 ở T10, 313 ở T9)
  const retailDoneActual = teamMonth.retailDoneActual ?? teamMonth.doneActual;
  // Total Done in month across all orders (e.g. 44 + 12 = 56 ở T10, 313 + 125 = 438 ở T9)
  const totalMonthDone = retailDoneActual + comboLiveMonthActual;

  const singleToComboRate =
    teamMonth.singleToComboRate ??
    (retailDoneActual > 0 ? Number(((comboSoldMonthActual / retailDoneActual) * 100).toFixed(1)) : 0);

  const donePercent = Math.round((retailDoneActual / (teamMonth.doneTarget || 1)) * 100);
  const isDoneOver100 = donePercent > 100;

  const comboLiveMonthShare = totalMonthDone > 0 ? Math.round((comboLiveMonthActual / totalMonthDone) * 100) : 0;

  const incomingTarget = teamMonth.incomingTarget ?? teamMonth.bookTarget ?? 1;
  const incomingActual = teamMonth.incomingActual ?? teamMonth.bookActual ?? 0;
  const incomingPercent = Math.round((incomingActual / (incomingTarget || 1)) * 100);

  const isPeriodNotStarted = teamMonth.periodStatus === 'NOT_STARTED';
  const isPeriodCompleted = teamMonth.periodStatus === 'COMPLETED';

  const workDaysElapsed = teamMonth.workDaysElapsed ?? teamMonth.pacingDaysElapsed ?? 0;
  const workDaysTotal = teamMonth.workDaysTotal ?? teamMonth.pacingDaysTotal ?? 26;

  const pacingStatus =
    teamMonth.pacingStatus || (isPeriodNotStarted ? 'NOT_STARTED' : teamMonth.isPacingOnTrack ? 'ON_TRACK' : 'BEHIND');
  const pacingStatusLabel =
    teamMonth.pacingStatusLabel ||
    (isPeriodNotStarted
      ? 'Chưa bắt đầu'
      : pacingStatus === 'AHEAD'
        ? 'Vượt nhịp'
        : pacingStatus === 'ON_TRACK'
          ? 'Đúng nhịp'
          : 'Chậm nhịp');

  const expectedDone = isPeriodNotStarted
    ? '-'
    : (teamMonth.expectedDone ?? Math.round(teamMonth.doneTarget * (workDaysElapsed / (workDaysTotal || 1))));

  const gapDone = isPeriodNotStarted
    ? '-'
    : typeof expectedDone === 'number'
      ? retailDoneActual - expectedDone
      : (teamMonth.gapDone ?? 0);
  const remainingDone = Math.max(0, teamMonth.doneTarget - retailDoneActual);
  const workDaysRemaining = teamMonth.workDaysRemaining ?? Math.max(0, workDaysTotal - workDaysElapsed);
  const dailyRequiredDone = isPeriodCompleted
    ? '-'
    : `${workDaysRemaining > 0 ? Number((remainingDone / workDaysRemaining).toFixed(1)) : 0}/ngày`;

  const donePacingPercent = Math.min(
    100,
    Math.round(((Number(expectedDone) || 0) / (teamMonth.doneTarget || 1)) * 100)
  );

  const expectedIncoming = isPeriodNotStarted
    ? '-'
    : (teamMonth.expectedIncoming ??
      teamMonth.expectedBook ??
      Math.round(incomingTarget * (workDaysElapsed / (workDaysTotal || 1))));

  const gapIncoming = isPeriodNotStarted ? '-' : (teamMonth.gapIncoming ?? teamMonth.gapBook ?? 0);
  const remainingIncoming =
    teamMonth.remainingIncoming ?? teamMonth.remainingBook ?? Math.max(0, incomingTarget - incomingActual);
  const dailyRequiredIncoming = isPeriodCompleted
    ? '-'
    : `${teamMonth.dailyRequiredIncoming ?? teamMonth.dailyRequiredBook ?? 0}/ngày`;

  const incomingPacingPercent = Math.min(
    100,
    Math.round(((Number(expectedIncoming) || 0) / (incomingTarget || 1)) * 100)
  );

  return {
    monthNumStr,
    comboLiveMonthActual,
    comboSoldMonthActual,
    comboRevenueMonthActual,
    retailDoneActual,
    totalMonthDone,
    singleToComboRate,
    doneTarget: teamMonth.doneTarget,
    donePercent,
    isDoneOver100,
    comboLiveMonthShare,
    incomingTarget,
    incomingActual,
    incomingPercent,
    isPeriodNotStarted,
    isPeriodCompleted,
    workDaysElapsed,
    workDaysTotal,
    workDaysRemaining,
    pacingStatus,
    pacingStatusLabel,
    pacingRatio: teamMonth.pacingRatio ?? 0,
    gapBook: teamMonth.gapBook ?? 0,
    expectedDone,
    gapDone,
    remainingDone,
    dailyRequiredDone,
    donePacingPercent,
    expectedIncoming,
    gapIncoming,
    remainingIncoming,
    dailyRequiredIncoming,
    incomingPacingPercent,
  };
}

/**
 * Computes pacing, tier, and display metrics for a single staff entry in the leaderboard.
 */
export function computeStaffLeaderboardMetrics(
  staff: TelesaleStaffTarget,
  overview: TelesaleTargetOverview,
  idx: number
): StaffLeaderboardItemMetrics {
  const { teamMonth } = overview;
  const workDaysElapsed = teamMonth.workDaysElapsed ?? teamMonth.pacingDaysElapsed ?? 0;
  const workDaysTotal = teamMonth.workDaysTotal ?? teamMonth.pacingDaysTotal ?? 26;
  const isPeriodNotStarted = teamMonth.periodStatus === 'NOT_STARTED';

  const percent = Math.round((staff.doneActual / (staff.doneTarget || 1)) * 100);
  const isOver100 = percent > 100;
  const staffComboDoneActual = staff.comboLiveDoneActual || 0;
  const staffComboSoldActual = staff.comboSoldActual || 0;

  const expectedProgressRate =
    overview.teamMonth?.expectedProgressRate ?? (workDaysTotal > 0 ? workDaysElapsed / workDaysTotal : 0);
  const workDaysRemaining = overview.teamMonth?.workDaysRemaining ?? Math.max(0, workDaysTotal - workDaysElapsed);
  const staffExpectedDone =
    staff.expectedDone ?? (isPeriodNotStarted ? 0 : Math.round(staff.doneTarget * expectedProgressRate));
  const staffGapDone = staff.gapDone ?? (isPeriodNotStarted ? 0 : staff.doneActual - staffExpectedDone);
  const staffRemainingDone = staff.remainingDone ?? Math.max(0, staff.doneTarget - staff.doneActual);

  let dailyRequiredDoneStr = `${staff.dailyRequiredDone ?? 0}/ngày`;
  if (staff.dailyRequiredDone === undefined) {
    if (isPeriodNotStarted) {
      const req = workDaysTotal > 0 ? (staff.doneTarget / workDaysTotal).toFixed(1) : '0';
      dailyRequiredDoneStr = `${req}/ngày`;
    } else if (teamMonth.periodStatus === 'IN_PROGRESS') {
      const req = workDaysRemaining > 0 ? (staffRemainingDone / workDaysRemaining).toFixed(1) : '0';
      dailyRequiredDoneStr = `${req}/ngày`;
    }
  }

  const staffPacingRatio =
    staffExpectedDone > 0 ? staff.doneActual / staffExpectedDone : staff.doneActual >= staff.doneTarget ? 1 : 0;
  const isStaffAchieved = isOver100 || staffGapDone >= 0 || staffPacingRatio >= 1.0;
  const isStaffApproaching = !isStaffAchieved && (staffPacingRatio >= 0.8 || staffGapDone >= -2);

  const badgeLabel = isPeriodNotStarted
    ? 'Chưa bắt đầu'
    : isOver100
      ? `🔥 ${percent}% VƯỢT`
      : isStaffAchieved
        ? 'Đạt'
        : isStaffApproaching
          ? 'Gần đạt'
          : 'Chưa đạt';

  const statusTier: StaffLeaderboardStatusTier = isPeriodNotStarted
    ? 'not_started'
    : isStaffAchieved
      ? 'achieved'
      : isStaffApproaching
        ? 'approaching'
        : 'behind';

  return {
    percent,
    isOver100,
    staffComboDoneActual,
    staffComboSoldActual,
    staffExpectedDone,
    staffGapDone,
    staffRemainingDone,
    dailyRequiredDoneStr,
    isStaffAchieved,
    isStaffApproaching,
    badgeLabel,
    statusTier,
    revenueVnd: staff.revenueActual || 0,
    rankLabel: RANK_ICONS[idx] || `${idx + 1}.`,
  };
}
