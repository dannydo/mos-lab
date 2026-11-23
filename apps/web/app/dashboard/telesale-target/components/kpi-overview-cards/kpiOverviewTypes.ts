import type React from 'react';
import type { TelesalePacingStatus, TelesaleTargetOverview } from '@mos-lab/shared';

export interface KpiCardProps {
  overview: TelesaleTargetOverview;
  className?: string;
  onOpenTvFullscreen?: () => void;
}

export interface KpiStaffLeaderboardCardProps extends KpiCardProps {
  isFullVertical?: boolean;
}

export interface KpiStatRibbonCell {
  label: string;
  value: React.ReactNode;
  valueClassName: string;
}

export interface TeamMonthKpiMetrics {
  monthNumStr: string;
  comboLiveMonthActual: number;
  comboSoldMonthActual: number;
  comboRevenueMonthActual: number;
  retailDoneActual: number;
  totalMonthDone: number;
  singleToComboRate: number;
  doneTarget: number;
  donePercent: number;
  isDoneOver100: boolean;
  comboLiveMonthShare: number;
  incomingTarget: number;
  incomingActual: number;
  incomingPercent: number;
  isPeriodNotStarted: boolean;
  isPeriodCompleted: boolean;
  workDaysElapsed: number;
  workDaysTotal: number;
  workDaysRemaining: number;
  pacingStatus: TelesalePacingStatus;
  pacingStatusLabel: string;
  pacingRatio: number;
  gapBook: number;
  expectedDone: number | string;
  gapDone: number | string;
  remainingDone: number;
  dailyRequiredDone: string;
  donePacingPercent: number;
  expectedIncoming: number | string;
  gapIncoming: number | string;
  remainingIncoming: number;
  dailyRequiredIncoming: string;
  incomingPacingPercent: number;
}

export type StaffLeaderboardStatusTier = 'not_started' | 'achieved' | 'approaching' | 'behind';

export interface StaffLeaderboardItemMetrics {
  percent: number;
  isOver100: boolean;
  staffComboDoneActual: number;
  staffComboSoldActual: number;
  staffExpectedDone: number;
  staffGapDone: number;
  staffRemainingDone: number;
  dailyRequiredDoneStr: string;
  isStaffAchieved: boolean;
  isStaffApproaching: boolean;
  badgeLabel: string;
  statusTier: StaffLeaderboardStatusTier;
  revenueVnd: number;
  rankLabel: string;
}
