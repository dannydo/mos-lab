import { isAdminOrSuperAdminRole } from './auth.js';

export type FmBranchCode = 'dt' | 'ep';
export type FmWeeklyQuestType = 'undermink' | 'banana_no_late' | 'fal_weekly_cap' | 'custom';
export type FmTeamDinnerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface FmQuestTargetConfig {
  minUnderminkPerCv?: number;
  minPassRatioPct?: number;
  maxLateCount?: number;
  maxFix?: number;
  maxAdjust?: number;
  maxLog?: number;
  customCriteria?: string;
}

export interface FmWeeklyQuestDefinition {
  id: string;
  code: string;
  title: string;
  description: string;
  type: FmWeeklyQuestType;
  rewardVnd: number;
  branchScope: 'all' | FmBranchCode;
  isActive: boolean;
  targetConfig: FmQuestTargetConfig;
  sortOrder: number;
  updatedAt: string;
  updatedBy: string;
}

export interface FmWeeklyQuestsConfig {
  monthlyQuestCapVnd: number | null;
  quests: FmWeeklyQuestDefinition[];
  updatedAt: string;
  updatedBy: string;
}

export interface FmWeeklyQuestDetailItem {
  staffId?: number;
  label: string;
  countText: string;
  passed: boolean;
}

export interface FmWeeklyQuestLiveEval {
  questId: string;
  passed: boolean;
  autoEvaluated: boolean;
  metricSummary: string;
  detailItems: FmWeeklyQuestDetailItem[];
  settled: boolean;
  settledAmountVnd: number;
  settledAt: string | null;
  settledBy: string | null;
  fundTransactionId: string | null;
  proofNote: string | null;
  proofUrl: string | null;
  proofSubmittedBy: string | null;
  proofSubmittedAt: string | null;
}

export interface FmWeeklyQuestLedgerEntry {
  key: string; // `${branch}:${weekKey}:${questId}`
  branch: FmBranchCode;
  weekKey: string;
  monthKey: string;
  questId: string;
  proofNote?: string | null;
  proofUrl?: string | null;
  proofSubmittedBy?: string | null;
  proofSubmittedAt?: string | null;
  manualPassed?: boolean;
  settled: boolean;
  settledAmountVnd: number;
  settledAt?: string | null;
  settledBy?: string | null;
  fundTransactionId?: string | null;
}

export interface FmTeamDinnerRecord {
  id: string;
  branch: FmBranchCode;
  monthKey: string;
  eventDate: string;
  venueName: string;
  attendeeCount: number;
  totalHeadcount: number;
  attendancePct: number;
  computedStar: 0 | 1 | 2 | 3;
  socialCheckinUrl: string;
  proofImageUrls: string[];
  amountSpentVnd: number;
  deductFromShopFund: boolean;
  fundTransactionId: string | null;
  status: FmTeamDinnerStatus;
  submittedByStaffId: number;
  submittedByName: string;
  submittedAt: string;
  reviewedByName: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
}

export interface FmBondingSummary {
  approvedDinnerCount: number;
  pendingDinnerCount: number;
  bestAttendancePct: number;
  hasValidSocialCheckin: boolean;
  effectiveStar: 0 | 1 | 2 | 3;
  missingDinnerShieldPenalty: 0 | 1;
}

export interface FmQuestsOverviewResponse {
  branch: FmBranchCode;
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  monthKey: string;
  shopFund: {
    fundId: string;
    code: string;
    name: string;
    currentBalanceVnd: number;
  };
  monthlyQuestCapVnd: number | null;
  monthSettledQuestVnd: number;
  quests: FmWeeklyQuestDefinition[];
  evaluations: FmWeeklyQuestLiveEval[];
  dinners: FmTeamDinnerRecord[];
  bondingSummary: FmBondingSummary;
  permissions: {
    canManageQuests: boolean;
    canSubmitDinner: boolean;
    canReviewDinner: boolean;
  };
}

export interface SaveFmQuestsConfigRequest {
  monthlyQuestCapVnd: number | null;
  quests: Array<
    Omit<FmWeeklyQuestDefinition, 'updatedAt' | 'updatedBy'> & {
      updatedAt?: string;
      updatedBy?: string;
    }
  >;
}

export interface SubmitFmQuestProofRequest {
  branch: FmBranchCode;
  weekKey: string;
  questId: string;
  proofNote: string;
  proofUrl?: string | null;
  manualPassed?: boolean;
}

export interface SettleFmWeeklyQuestRequest {
  branch: FmBranchCode;
  weekKey: string;
  questId: string;
  overridePass?: boolean;
  note?: string | null;
}

export interface SubmitFmTeamDinnerRequest {
  branch: FmBranchCode;
  monthKey: string;
  eventDate: string;
  venueName: string;
  attendeeCount: number;
  totalHeadcount: number;
  socialCheckinUrl: string;
  proofImageUrls?: string[];
  amountSpentVnd: number;
  deductFromShopFund: boolean;
}

export interface ReviewFmTeamDinnerRequest {
  decision: 'APPROVED' | 'REJECTED';
  reviewNote?: string | null;
  deductFromShopFund?: boolean;
}

export const FM_SHOP_FUND_SPECS: Record<
  FmBranchCode,
  { fundId: string; code: string; name: string; storeId: number; storeName: string }
> = {
  dt: {
    fundId: 'fund-shop-dt',
    code: 'SHOP_FUND_DT',
    name: 'Quỹ Shop Đề Thám',
    storeId: 6,
    storeName: 'Đề Thám',
  },
  ep: {
    fundId: 'fund-shop-ep',
    code: 'SHOP_FUND_EP',
    name: 'Quỹ Shop Estella Place',
    storeId: 16,
    storeName: 'Estella Place',
  },
};

export const FM_DEFAULT_WEEKLY_QUESTS: readonly FmWeeklyQuestDefinition[] = [
  {
    id: 'quest-undermink-weekly',
    code: 'UNDERMINK_2',
    title: '≥ 85% CV đi làm nối ≥ 2 bộ Undermink / tuần',
    description:
      'Ít nhất 85% Chuyên Viên có phát sinh ca làm việc trong tuần tại shop hoàn thành tối thiểu 2 bộ Undermink.',
    type: 'undermink',
    rewardVnd: 400_000,
    branchScope: 'all',
    isActive: true,
    targetConfig: { minUnderminkPerCv: 2, minPassRatioPct: 85 },
    sortOrder: 1,
    updatedAt: '2026-11-27T00:00:00.000Z',
    updatedBy: 'System Default',
  },
  {
    id: 'quest-banana-no-late',
    code: 'BANANA_ZERO_LATE',
    title: '100% Nhân viên tặng chuối (0 đi trễ)',
    description: 'Không phát sinh ca đi trễ bị trừ chuối (đã loại trừ ca được miễn phạt) trên toàn shop trong tuần.',
    type: 'banana_no_late',
    rewardVnd: 400_000,
    branchScope: 'all',
    isActive: true,
    targetConfig: { maxLateCount: 0 },
    sortOrder: 2,
    updatedAt: '2026-11-27T00:00:00.000Z',
    updatedBy: 'System Default',
  },
  {
    id: 'quest-fal-weekly-cap',
    code: 'FAL_CAP_1_1_1',
    title: 'Trần FAL tuần: ≤ 1F·1A·1L (≥13 CV: ≤ 2F·1A·1L)',
    description: 'Tổng ca Fix ≤ 1 (shop ≥ 13 CV được nới ≤ 2 Fix), Adjust ≤ 1 và Log ≤ 1 toàn chi nhánh trong tuần.',
    type: 'fal_weekly_cap',
    rewardVnd: 400_000,
    branchScope: 'all',
    isActive: true,
    targetConfig: { maxFix: 1, maxAdjust: 1, maxLog: 1 },
    sortOrder: 3,
    updatedAt: '2026-11-27T00:00:00.000Z',
    updatedBy: 'System Default',
  },
];

/** HR, Admin, and Super Admin (CEO) may configure weekly quests, settle funds, and approve dinners. */
export function canManageFmQuests(role?: string | null): boolean {
  if (isAdminOrSuperAdminRole(role)) return true;
  const normalized = String(role || '')
    .trim()
    .toLowerCase();
  return normalized === 'hr';
}

/** Floor leadership (FM, CHO, Boss, Manager) + HR/CEO may submit team dinner check-ins and custom quest proofs. */
export function canSubmitFmDinner(role?: string | null): boolean {
  if (canManageFmQuests(role)) return true;
  const normalized = String(role || '')
    .trim()
    .toLowerCase();
  return ['fm', 'cho', 'boss', 'manager'].includes(normalized);
}

/**
 * Evaluates Pillar #8 (Gắn Kết & Tiệc Tháng):
 * - 0 dinners organized OR missing social network check-in photo/link => 0★ AND -1 Weekly Shield.
 * - Valid dinner + check-in: >= 90% => 3★, >= 80% => 2★, >= 70% => 1★, < 70% => 0★ (no extra shield loss).
 */
export function resolveBondingStarFromDinner(params: {
  organized: boolean;
  hasSocialCheckin: boolean;
  attendancePct: number;
}): { star: 0 | 1 | 2 | 3; missingDinnerShieldPenalty: 0 | 1 } {
  if (!params.organized || !params.hasSocialCheckin) {
    return { star: 0, missingDinnerShieldPenalty: 1 };
  }
  const pct = Math.max(0, Math.min(100, Number(params.attendancePct) || 0));
  if (pct >= 90) return { star: 3, missingDinnerShieldPenalty: 0 };
  if (pct >= 80) return { star: 2, missingDinnerShieldPenalty: 0 };
  if (pct >= 70) return { star: 1, missingDinnerShieldPenalty: 0 };
  return { star: 0, missingDinnerShieldPenalty: 0 };
}
