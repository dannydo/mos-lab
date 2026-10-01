export type TelesalePipelineStageKey = '0_30' | '31_60' | '61_120' | 'gt_120';

export interface TelesaleStaffTarget {
  legacyStaffId: number;
  name: string;
  avatarUrl?: string | null;
  doneTarget: number;
  doneActual: number;
  doneToday: number;
  bookToday?: number;
  bookContributionPercent?: number;
  isTopBookToday?: boolean;
  comboLiveDoneActual?: number;
  comboLiveDoneToday?: number;
  callTargetDaily: number;
  callActualToday: number;
  pickupTargetDaily?: number;
  pickupActualToday: number;
  // MOS-BUG-72: Enhanced individual KPI (Done) metrics
  revenueActual?: number;
  expectedDone?: number;
  gapDone?: number;
  remainingDone?: number;
  dailyRequiredDone?: number;
  progressStatus?: 'NOT_STARTED' | 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'CRITICAL';
  progressStatusLabel?: string;
}

export interface TelesalePipelineStage {
  key: TelesalePipelineStageKey;
  label: string;
  subLabel: string;
  stageName: string;
  description: string;
  doneTarget: number;
  doneActual: number;
  comboLiveDoneActual?: number;
  totalAssignedCount: number;
  calledCount: number;
  conversionRate: number;
  actionNote: string;
  badge?: string;
  itemsSummary: string[];
}

export type TelesalePacingStatus = 'NOT_STARTED' | 'AHEAD' | 'ON_TRACK' | 'BEHIND';
export type TelesalePeriodStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export type TelesaleDailyActionStatus = 'EXCEEDED' | 'ACHIEVED' | 'BEHIND' | 'ALARM' | 'OFF';

export interface TelesaleStaffDailyAction {
  legacyStaffId: number;
  name: string;
  isWorkingToday: boolean;
  callTarget: number;
  callActual: number;
  callPercent: number;
  callGap: number;
  pickupTarget: number;
  pickupActual: number;
  pickupPercent: number;
  pickupGap: number;
  overallPercent: number;
  status: TelesaleDailyActionStatus;
  statusLabel: string;
}

export interface TelesaleDailyActionOverview {
  callTargetPerStaff: number;
  pickupTargetPerStaff?: number;
  teamCallTarget?: number;
  teamCallActual?: number;
  teamCallPercent?: number;
  teamCallGap?: number;
  teamPickupTarget?: number;
  teamPickupActual?: number;
  teamPickupPercent?: number;
  teamPickupGap?: number;
  staffActions?: TelesaleStaffDailyAction[];
  bookTargetPerDay: number;
  totalCallsToday: number;
  totalBookingsToday: number;
}

export interface TelesaleTargetOverview {
  month: string; // '2026-10'
  updatedAt: string;
  teamMonth: {
    doneTarget: number;
    doneActual: number;
    comboLiveDoneActual?: number;
    bookTarget: number;
    bookActual: number;
    // Workdays pacing & KPI management metrics (MOS-BUG-67)
    workDaysTotal: number;
    workDaysElapsed: number;
    workDaysRemaining: number;
    periodStatus: TelesalePeriodStatus;
    pacingStatus: TelesalePacingStatus;
    pacingStatusLabel: string; // 'Chưa bắt đầu' | 'Vượt nhịp' | 'Đúng nhịp' | 'Chậm nhịp'
    pacingRatio: number;
    isPacingOnTrack: boolean;
    dailyRequiredDone: number;
    dailyRequiredBook: number;
    expectedProgressRate: number;
    expectedDone: number;
    expectedBook: number;
    gapDone: number;
    gapBook: number;
    remainingDone: number;
    remainingBook: number;
    pacingDaysElapsed?: number;
    pacingDaysTotal?: number;
  };
  teamDaily: {
    date: string;
    doneTarget: number;
    doneActual: number;
    comboLiveDoneActual?: number;
    bookTarget: number;
    bookActual: number;
  };
  staffTargets: TelesaleStaffTarget[];
  dailyAction: TelesaleDailyActionOverview;
  workSchedule: {
    morning: {
      timeRange: string;
      title: string;
      subTitle: string;
      isActive: boolean;
    };
    afternoon: {
      timeRange: string;
      title: string;
      subTitle: string;
      isActive: boolean;
    };
  };
  pipelineStages: TelesalePipelineStage[];
  todayLiveEvents?: TelesaleTodayLiveEvent[];
}

export interface TelesaleTodayLiveEvent {
  id: string;
  type: 'BOOK' | 'DONE';
  staffId: number;
  staffName: string;
  avatarUrl?: string | null;
  timestamp: string;
  orderId?: number;
}

export interface TelesaleTargetConfigDto {
  month: string;
  teamDoneTarget: number;
  teamBookTarget: number;
  dailyDoneTarget: number;
  dailyBookTarget: number;
  dailyCallPerStaff: number;
  dailyPickupPerStaff?: number;
  staffTargets: Array<{
    legacyStaffId: number;
    name: string;
    doneTarget: number;
    avatarUrl?: string | null;
  }>;
  stageTargets: {
    '0_30': number;
    '31_60': number;
    '61_120': number;
    gt_120: number;
  };
}

export interface TelesaleTargetCloneDto {
  sourceMonth: string;
  targetMonth: string;
  overwrite?: boolean;
}

export interface TelesaleCustomerPoolItem {
  id: number;
  customerId: number;
  customerName: string;
  phone: string;
  store: string;
  lastVisitDate: string | null;
  daysSinceLastVisit: number;
  assignedStaffId: number;
  assignedStaffName: string;
  stageKey: TelesalePipelineStageKey;
  callStatus: 'NOT_CALLED' | 'CALLED_TODAY' | 'BOOKED';
  totalCallsInMonth: number;
  lastCallAt?: string | null;
  totalSpent?: number;
}

export interface TelesaleCustomerPoolResponse {
  stageKey: TelesalePipelineStageKey;
  total: number;
  calledTodayCount: number;
  bookedCount: number;
  items: TelesaleCustomerPoolItem[];
}
