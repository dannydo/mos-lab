export interface SalaryBranchInfo {
  key: string;
  name: string;
  shortLabel: string;
  amount: number;
  formula: string;
  highlightNote: string;
  accent: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'cyan';
}

export interface BkSalaryInputs {
  workDays: number;
  singleDone: number;
  comboDone: number;
  missedRate: number;
  revenueMillion: number;
  tipAmount: number;
  avgSingleCheckinPrice?: number;
}

export interface BkMilestoneTier {
  minSingle: number;
  bonus: number;
  label: string;
}

export interface BkMissedTier {
  maxRate: number;
  bonus: number;
  label: string;
  type: 'bonus' | 'neutral' | 'penalty';
}

export interface BkRevenueTier {
  minRevenue: number;
  rate: number;
  label: string;
}

export interface BkSalaryResult {
  baseSalary: number;
  checkinBonus: number;
  milestoneBonus: number;
  currentMilestone: BkMilestoneTier;
  nextMilestone: BkMilestoneTier | null;
  singleNeededForNext: number;
  missedBonus: number;
  currentMissedTier: BkMissedTier;
  revenueBonus: number;
  revenueCommissionRate: number;
  tipBonus: number;
  totalIncome: number;
  branches: SalaryBranchInfo[];
}
