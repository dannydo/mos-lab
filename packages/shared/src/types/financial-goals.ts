export type FinancialGoalKey = 'total' | 'combo' | 'retail' | 'product';

export type FinancialGoalPacingStatus = 'NOT_STARTED' | 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'COMPLETED';

export interface FinancialGoalItem {
  key: FinancialGoalKey;
  label: string;
  target: number;
  actual: number;
  percent: number;
  gap: number;
  remaining: number;
  surplus: number;
  isAchieved: boolean;
  pacingStatus: FinancialGoalPacingStatus;
  pacingStatusLabel: string;
  dailyRequired: number;
  sharePercent?: number;
}

export interface FinancialGoalsConfigDto {
  month: string; // YYYY-MM
  totalRevenueTarget: number;
  comboRevenueTarget: number;
  retailRevenueTarget: number;
  productRevenueTarget: number;
  note?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface FinancialGoalDayBreakdown {
  date: string; // YYYY-MM-DD
  dayOfWeek: string;
  totalRevenue: number;
  comboRevenue: number;
  retailRevenue: number;
  productRevenue: number;
  cumulativeTotal: number;
  orderCount: number;
}

export interface FinancialGoalsOverview {
  month: string;
  daysInMonth: number;
  workDaysElapsed: number;
  workDaysRemaining: number;
  periodStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  pacingRatio: number;
  kpiMain: FinancialGoalItem;
  kpiSub: {
    combo: FinancialGoalItem;
    retail: FinancialGoalItem;
    product: FinancialGoalItem;
  };
  dailyBreakdown: FinancialGoalDayBreakdown[];
  config: FinancialGoalsConfigDto;
  isConfigured: boolean;
}
