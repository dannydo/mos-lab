import type {
  BananaTransactionCategory,
  CareerPeriod,
  CareerProgressionConfig,
  CareerRole,
  CareerStaffSummary,
} from '@mos-lab/shared';

export type CareerSelectorMode = 'ultra_compact' | 'cards' | 'table';

export interface StaffCareerSelectorProps {
  staffList: CareerStaffSummary[];
  selectedStaffId: number | null;
  onSelectStaff: (staffId: number) => void;
  onSyncProd: () => Promise<void>;
  syncing: boolean;
  lastSyncedAt?: string | null;
  activeRoleFilter?: string;
  onRoleFilterChange?: (role: string) => void;
  period?: CareerPeriod;
  onPeriodChange?: (period: CareerPeriod) => void;
  onSetRole?: (staffId: number, newRole: CareerRole) => Promise<void>;
  onDemote?: (staffId: number, targetRole: CareerRole) => Promise<void>;
  actionLoading?: boolean;
  onOpenBananaDrawer?: (staffId: number, category: BananaTransactionCategory) => void;
  isCollapsedHorizontal?: boolean;
  onCollapseHorizontal?: () => void;
  onExpandHorizontal?: () => void;
  selectorMode?: CareerSelectorMode;
  onSelectorModeChange?: (mode: CareerSelectorMode) => void;
  config?: CareerProgressionConfig;
}

export type MetricStatus = 'passed' | 'near' | 'failed';

export interface CareerThresholdConfig {
  minOrdersConfig: number;
  maxFixRateConfig: number;
  minTipRatioAboveShop: number;
  minHiConfig: number;
  minBananaConfig: number;
  minComboConfig: number;
  minQaAuditsConfig: number;
}

export interface PeriodTabItem {
  key: CareerPeriod;
  label: string;
  fullLabel: string;
}
