import type { FalLogExplanationRecord, FalReadModel } from '@mos-lab/shared';

export const TRACE_DRAWER_WIDTH_STORAGE_KEY = 'fal_trace_drawer_width';
export const TRACE_DRAWER_DEFAULT_WIDTH = 880;
export const TRACE_DRAWER_MIN_WIDTH = 560;
export const TRACE_DRAWER_MAX_WIDTH = 1200;
export const FAL_FILTERS_STORAGE_KEY = 'fal_control_tower_filters';
export const FAL_RULE_OPTIONS = ['Fix', 'Adjust', 'Log'] as const;
export const FAL_PAGE_SIZE_OPTIONS = ['50', '100', '200', '500'];
export const FAL_EXPLANATION_CHANNELS = ['manual', 'formal', 'informal'] as const;

export type FalDateRangeMode = 'day' | 'week' | 'month';

export type FalLogExplanationFormValues = {
  explanation: string;
  explanationChannel: string;
};

export type LedgerRole = 'BK' | 'CC' | 'CV' | 'Khác';

export type LedgerItem = {
  staffId: number;
  staffName: string;
  bonusPoints: number;
  cash: number;
  bananaCredit: number;
  trackingKeys: string | null;
  positiveConfiguredRuleCount: number;
  pointMultiplier: number;
  cashMultiplier: number;
};

export type TraceService = {
  orderServiceId: number;
  checkin: string | null;
  serviceName: string | null;
  bookerId: number | null;
  bookerName: string | null;
  bookerAvatar: string | null;
  cvName: string | null;
  cvAvatar: string | null;
  ccInName: string | null;
  ccOutName: string | null;
  ccInAvatar: string | null;
  ccOutAvatar: string | null;
  cvId: number | null;
  ccInId: number | null;
  ccOutId: number | null;
  ledger: LedgerItem[];
};

export type FalCase = {
  orderServiceId: number;
  orderId: number;
  clientId: number;
  checkin: string;
  clientName: string;
  clientAvatar: string | null;
  store: string;
  serviceName: string;
  ccInName: string;
  ccOutName: string;
  ccInAvatar: string | null;
  ccOutAvatar: string | null;
  cvName: string;
  cvAvatar: string | null;
  falRule: string;
  fal: FalReadModel | null;
  logExplanation: FalLogExplanationRecord | null;
  trace: {
    origin: TraceService | null;
    remediation: TraceService;
  };
};
