export const ACADEMY_WORKSHOP_1DAYS_COURSE_CODE = 'workshop_1days';
export const ACADEMY_WORKSHOP_1DAYS_COURSE_NAME = 'Khóa WORKSHOP 1DAYS';

export const ACADEMY_BUOM_COURSE_CODE = 'buom_wings';
export const ACADEMY_BUOM_COURSE_NAME = 'Khóa Bướm - Tiêu chuẩn, Thiết Kế và Quy Trình Wings';
export const ACADEMY_BUOM_COURSE_NAME_EN = 'Butterfly - Wings Standard, Design & Workflow';
export const ACADEMY_BUOM_COURSE_TAG = 'CHUẨN BƯỚM';
export const ACADEMY_BUOM_COURSE_DESCRIPTION =
  'Dành cho học viên đã có tay nghề nối mi, thi đạt bậc Thiên Thần Bóng Tối. Học tiêu chuẩn, thiết kế & quy trình làm việc tại Wings. Nguyên vật liệu Wings cung cấp; học viên tự mang theo mẫu và đồ nghề.';
export const ACADEMY_BUOM_COURSE_DEFAULT_PRICE_VND = 5_000_000;
export const ACADEMY_BUOM_REQUIRED_TIER_KEY: AcademyTalentTierKey = 'level6';

export const ACADEMY_TALENT_PAYMENT_MODES = ['THINKING', 'DEPOSIT', 'FULL'] as const;
export type AcademyTalentPaymentMode = (typeof ACADEMY_TALENT_PAYMENT_MODES)[number];

export const ACADEMY_TALENT_ASSESSMENT_STATUSES = [
  'DRAFT',
  'QUOTED',
  'PRINTED',
  'DEPOSIT_RECEIVED',
  'PAID',
  // Retained for historical rows issued before payment follow-up existed.
  'INVOICED',
] as const;
export type AcademyTalentAssessmentStatus = (typeof ACADEMY_TALENT_ASSESSMENT_STATUSES)[number];

export const ACADEMY_TALENT_PAYMENT_STATUSES = ['UNPAID', 'PARTIALLY_PAID', 'DEPOSIT_RECEIVED', 'PAID'] as const;
export type AcademyTalentPaymentStatus = (typeof ACADEMY_TALENT_PAYMENT_STATUSES)[number];

/** Academy's fixed measurement range for the five-minute dummy challenge. */
export const ACADEMY_TALENT_STRANDS_5_MIN_MIN = 0;
export const ACADEMY_TALENT_STRANDS_5_MIN_MAX = 50;

export const ACADEMY_TALENT_TIERS = [
  {
    key: 'level1',
    title: 'Nhập môn',
    strands: 1,
    scholarshipPercent: 0,
    sampleRewardPercent: 0,
    kitRewardPercent: 0,
    color: '#94a3b8',
  },
  {
    key: 'level2',
    title: 'Khá',
    strands: 3,
    scholarshipPercent: 2,
    sampleRewardPercent: 2,
    kitRewardPercent: 2,
    color: '#f97316',
  },
  {
    key: 'level3',
    title: 'Triển vọng',
    strands: 5,
    scholarshipPercent: 5,
    sampleRewardPercent: 5,
    kitRewardPercent: 5,
    color: '#6366f1',
  },
  {
    key: 'level4',
    title: 'Vượt Trội',
    strands: 10,
    scholarshipPercent: 10,
    sampleRewardPercent: 10,
    kitRewardPercent: 10,
    color: '#10b981',
  },
  {
    key: 'level5',
    title: 'Thiên Bẩm',
    strands: 20,
    scholarshipPercent: 50,
    sampleRewardPercent: 20,
    kitRewardPercent: 20,
    color: '#f59e0b',
  },
  {
    key: 'level6',
    title: 'Thiên Thần Bóng Tối',
    strands: 35,
    scholarshipPercent: 90,
    sampleRewardPercent: 20,
    kitRewardPercent: 20,
    color: '#a855f7',
  },
] as const;

/**
 * A ladder key is globally persisted configuration, not a frontend enum.
 * The six values above are the initial Academy policy; admins can add their
 * own score tiers without requiring a deployment.
 */
export type AcademyTalentTierKey = string;

export interface AcademyTalentTier {
  key: AcademyTalentTierKey;
  title: string;
  strands: number;
  scholarshipPercent: number;
  /** Separate optional package incentives configured for this score tier. */
  sampleRewardPercent: number;
  kitRewardPercent: number;
  color: string;
}

/**
 * Global presentation and scholarship policy for the Workshop's ladder.
 * Admins own the complete, global rubric: threshold, title, rewards and
 * vertical position. A saved invoice remains an immutable quote snapshot.
 */
export interface AcademyTalentLadderTierConfiguration {
  key: AcademyTalentTierKey;
  title: string;
  strands: number;
  scholarshipPercent: number;
  sampleRewardPercent: number;
  kitRewardPercent: number;
  /** Desktop bubble/stem height, expressed as a percentage of the ladder. */
  bubbleHeightPercent: number;
}

export interface AcademyTalentLadderConfiguration {
  tiers: AcademyTalentLadderTierConfiguration[];
  /** Null while the approved defaults have never been customised. */
  updatedAt: string | null;
}

export interface UpdateAcademyTalentLadderConfigurationRequest {
  tiers: Array<
    Pick<
      AcademyTalentLadderTierConfiguration,
      | 'key'
      | 'title'
      | 'strands'
      | 'scholarshipPercent'
      | 'sampleRewardPercent'
      | 'kitRewardPercent'
      | 'bubbleHeightPercent'
    >
  >;
}

export interface AcademyTalentLadderConfigurationActionResponse {
  success: true;
  data: AcademyTalentLadderConfiguration;
  message: string;
}

export interface AcademyTalentAssessmentScores {
  /** 0–4 score for eye anatomy/observation. */
  eyeScore: number;
  /** 0–4 score for hand control. */
  handScore: number;
  /** Number of lashes placed in the five-minute dummy challenge. */
  strands5Min: number;
  errorRoot: number;
  errorSkin: number;
  errorStickies: number;
  errorDirection: number;
}

export interface AcademyTalentAssessmentResult {
  totalErrors: number;
  qualified: boolean;
  tier: AcademyTalentTier | null;
  /** Scholarship before its end-of-day ICT expiry is applied. */
  scholarshipPercent: number;
  rankLabel: string;
  rewardLabel: string;
}

export function formatAcademyTalentBenefitLabel(
  benefits: Pick<AcademyTalentTier, 'scholarshipPercent' | 'sampleRewardPercent' | 'kitRewardPercent'>,
  fallback = 'Cam kết bảo đảm vững tay nghề 100% bằng văn bản'
): string {
  const percentageBenefits = [
    benefits.scholarshipPercent > 0 ? `Học bổng ${benefits.scholarshipPercent}%` : null,
    benefits.sampleRewardPercent > 0 ? `Mẫu ${benefits.sampleRewardPercent}%` : null,
    benefits.kitRewardPercent > 0 ? `Đồ nghề ${benefits.kitRewardPercent}%` : null,
  ].filter((benefit): benefit is string => Boolean(benefit));
  return percentageBenefits.length ? percentageBenefits.join(' · ') : fallback;
}

/**
 * Academy-native instructor configuration. `surchargePercent` is applied to
 * the tuition after the Tố Chất scholarship, matching the former workshop
 * policy. It is intentionally an integer percent so every VND quote rounds
 * deterministically on the server.
 */
export interface AcademyTalentInstructor {
  id: number;
  code: string;
  staffId: number | null;
  displayName: string;
  description: string | null;
  avatarUrl: string | null;
  surchargePercent: number;
  isActive: boolean;
  sortOrder: number;
}

export type AcademyTalentInstructorSnapshot = AcademyTalentInstructor;

export interface ListAcademyTalentInstructorsResponse {
  data: AcademyTalentInstructor[];
}

/**
 * Admin/manager configuration for an Academy instructor.  The surcharge is
 * stored as an integer percent and is applied only to tuition after the
 * Tố Chất scholarship.  It never changes a previously issued invoice.
 */
export interface UpsertAcademyTalentInstructorRequest {
  code: string;
  staffId?: number | null;
  displayName: string;
  description?: string | null;
  avatarUrl?: string | null;
  surchargePercent: number;
  isActive: boolean;
  sortOrder: number;
}

export interface AcademyTalentInstructorActionResponse {
  success: true;
  data: AcademyTalentInstructor;
  message: string;
}

/**
 * Shared, pure score calculation. The Fastify service remains the source of
 * truth for persistence and price quotes; this utility prevents a UI preview
 * from drifting away from the documented assessment rules.
 */
export function calculateAcademyTalentAssessmentResult(
  input: Partial<AcademyTalentAssessmentScores>,
  tiers: readonly AcademyTalentTier[] = ACADEMY_TALENT_TIERS
): AcademyTalentAssessmentResult {
  const strands5Min = Math.min(
    ACADEMY_TALENT_STRANDS_5_MIN_MAX,
    Math.max(ACADEMY_TALENT_STRANDS_5_MIN_MIN, Math.floor(Number(input.strands5Min) || 0))
  );
  const totalErrors = ['errorRoot', 'errorSkin', 'errorStickies', 'errorDirection'].reduce(
    (sum, key) => sum + Math.max(0, Math.floor(Number(input[key as keyof AcademyTalentAssessmentScores]) || 0)),
    0
  );

  // A zero result or more than five technical errors never unlocks a reward.
  if (strands5Min === 0 || totalErrors > 5) {
    return {
      totalErrors,
      qualified: false,
      tier: null,
      scholarshipPercent: 0,
      rankLabel: 'Không đạt (Unqualified)',
      rewardLabel: 'Hỗ trợ kèm riêng 1-1 bổ sung kỹ năng tay nghề',
    };
  }

  const tier = [...tiers].reverse().find((candidate) => strands5Min >= candidate.strands) ?? null;
  if (!tier) {
    return {
      totalErrors,
      qualified: true,
      tier: null,
      scholarshipPercent: 0,
      rankLabel: 'Khởi đầu triển vọng',
      rewardLabel: 'Cam kết bảo đảm vững tay nghề 100% bằng văn bản',
    };
  }

  return {
    totalErrors,
    qualified: true,
    tier,
    scholarshipPercent: tier.scholarshipPercent,
    rankLabel: `${tier.title} (Học bổng ${tier.scholarshipPercent}%)`,
    rewardLabel: formatAcademyTalentBenefitLabel(tier),
  };
}
