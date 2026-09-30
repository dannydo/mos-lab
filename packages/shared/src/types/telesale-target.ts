export type TelesalePipelineStageKey = '0_30' | '31_60' | '61_120' | 'gt_120';

export interface TelesaleStaffTarget {
  legacyStaffId: number;
  name: string;
  avatarUrl?: string | null;
  doneTarget: number;
  doneActual: number;
  doneToday: number;
  comboLiveDoneActual?: number;
  comboLiveDoneToday?: number;
  callTargetDaily: number;
  callActualToday: number;
  pickupActualToday: number;
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
    expectedProgressRate: number; // 0..1
    expectedDone: number;
    expectedBook: number;
    gapDone: number;
    gapBook: number;
    remainingDone: number;
    remainingBook: number;
    dailyRequiredDone: number;
    dailyRequiredBook: number;
    pacingRatio: number;
    isPacingOnTrack: boolean;
    // Backward compatibility
    pacingDaysElapsed: number;
    pacingDaysTotal: number;
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
  dailyAction: {
    callTargetPerStaff: number;
    bookTargetPerDay: number;
    totalCallsToday: number;
    totalBookingsToday: number;
  };
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
}

export interface TelesaleTargetConfigDto {
  month: string;
  teamDoneTarget: number;
  teamBookTarget: number;
  dailyDoneTarget: number;
  dailyBookTarget: number;
  dailyCallPerStaff: number;
  staffTargets: Array<{
    legacyStaffId: number;
    name: string;
    doneTarget: number;
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
