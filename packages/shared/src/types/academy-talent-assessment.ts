/**
 * Native Academy "Tố Chất" workshop contracts.
 *
 * The legacy portal kept this state inside a lead note.  mOS keeps every
 * evaluation as its own auditable session, with immutable course/price data
 * once a tuition document is issued.
 */

import type { PageQuery, PageResponse } from './api.js';
import { removeVietnameseTones } from '../utils/search.js';

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

export interface AcademyTalentCourseSnapshot {
  courseId: number;
  code: string;
  name: string;
  nameEn: string | null;
  listPriceVnd: number;
  promoPriceVnd: number;
  kitName: string | null;
  kitPriceVnd: number;
  samplePriceVnd: number;
  lessonCount: number;
  lashModelCount: number;
  scholarshipPercent: number;
  scholarshipVnd: number;
  finalPriceVnd: number;
  /** Instructor and surcharge chosen for this course at quote time. */
  instructor: AcademyTalentInstructorSnapshot;
  instructorSurchargeVnd: number;
}

export type AcademyTalentAddOnKind = 'SAMPLE' | 'KIT';

/** Immutable optional package line shown in the course picker and invoice. */
export interface AcademyTalentAddOnSnapshot {
  kind: AcademyTalentAddOnKind;
  courseId: number;
  courseName: string;
  label: string;
  listPriceVnd: number;
  scholarshipPercent: number;
  scholarshipVnd: number;
  finalPriceVnd: number;
}

export interface AcademyTalentAssessmentQuote {
  result: AcademyTalentAssessmentResult;
  expiresAt: string;
  isExpired: boolean;
  /** Zero after the assessment offer expires; original tier stays auditable. */
  effectiveScholarshipPercent: number;
  /** Legacy single material reward retained for historical snapshots. */
  materialRewardPercent: number;
  /** Current per-tier reward for optional practice models. */
  sampleRewardPercent: number;
  /** Current per-tier reward for optional kits/tools. */
  kitRewardPercent: number;
  listPriceVnd: number;
  promoPriceVnd: number;
  scholarshipVnd: number;
  finalPriceVnd: number;
  /** Course-only totals; top-level totals include selected kit/sample packages. */
  courseListPriceVnd: number;
  coursePromoPriceVnd: number;
  courseScholarshipVnd: number;
  courseFinalPriceVnd: number;
  sampleListPriceVnd: number;
  sampleScholarshipVnd: number;
  sampleFinalPriceVnd: number;
  kitListPriceVnd: number;
  kitScholarshipVnd: number;
  kitFinalPriceVnd: number;
  /** Sum of selected-instructor surcharges, after tuition scholarship. */
  teacherSurchargeVnd: number;
  /** Server-chosen Academy course IDs; never inferred by the UI. */
  recommendedCourseIds: number[];
  recommendation: {
    title: string;
    summary: string;
  };
  /** Default deposit for the current workshop policy, bounded by the quote. */
  suggestedDepositVnd: number;
  /** Amount due immediately for the currently chosen payment mode. */
  dueNowVnd: number;
  courses: AcademyTalentCourseSnapshot[];
  addOns: AcademyTalentAddOnSnapshot[];
}

export interface AcademyTalentInvoiceSnapshot {
  documentNumber: string;
  paymentMode: Exclude<AcademyTalentPaymentMode, 'THINKING'>;
  depositVnd: number;
  quote: AcademyTalentAssessmentQuote;
  issuedAt: string;
}

/** An append-only payment confirmation entered after the bank transfer is verified. */
export const ACADEMY_TALENT_PAYMENT_METHODS = ['BANK_TRANSFER', 'CASH'] as const;
export type AcademyTalentPaymentMethod = (typeof ACADEMY_TALENT_PAYMENT_METHODS)[number];

export interface AcademyTalentPaymentRecord {
  id: number;
  amountVnd: number;
  /** How Academy actually received this confirmed ledger entry. */
  method: AcademyTalentPaymentMethod;
  receivedAt: string;
  reference: string | null;
  note: string | null;
  confirmedBy: { id: number; displayName: string; email?: string | null } | null;
  createdAt: string;
}

/** Server-calculated payment ledger for the invoice follow-up screen. */
export interface AcademyTalentPaymentSummary {
  status: AcademyTalentPaymentStatus;
  totalPaidVnd: number;
  remainingVnd: number;
  payments: AcademyTalentPaymentRecord[];
}

/** Finance queue filter for printed Academy tuition documents. */
export const ACADEMY_TALENT_PAYMENT_MANAGEMENT_STATUSES = [
  'ALL',
  'FOLLOW_UP',
  'UNPAID',
  'PARTIALLY_PAID',
  'DEPOSIT_RECEIVED',
  'PAID',
] as const;
export type AcademyTalentPaymentManagementStatus = (typeof ACADEMY_TALENT_PAYMENT_MANAGEMENT_STATUSES)[number];

export interface AcademyTalentPaymentManagementRow {
  assessmentId: number;
  lead: { id: number; name: string; phone: string | null };
  invoiceNumber: string;
  issuedAt: string | null;
  courseLabel: string;
  paymentMode: Exclude<AcademyTalentPaymentMode, 'THINKING'>;
  paymentStatus: AcademyTalentPaymentStatus;
  tuitionVnd: number;
  requiredDepositVnd: number;
  totalPaidVnd: number;
  remainingVnd: number;
  paymentCount: number;
  latestPayment: AcademyTalentPaymentRecord | null;
  /** Append-only confirmed receipts, newest first, for finance audit. */
  payments: AcademyTalentPaymentRecord[];
}

/** All amounts are VND integers. Revenue means confirmed ledger cash only. */
export interface AcademyTalentPaymentManagementSummary {
  month: string;
  confirmedRevenueVnd: number;
  confirmedBankTransferVnd: number;
  confirmedCashVnd: number;
  depositFollowUpVnd: number;
  depositFollowUpCount: number;
  outstandingFollowUpVnd: number;
  outstandingFollowUpCount: number;
  paidInFullCount: number;
}

export interface ListAcademyTalentPaymentManagementParams extends PageQuery {
  /** Asia/Ho_Chi_Minh calendar month used only for confirmed-income metrics. */
  month?: string;
  search?: string;
  status?: AcademyTalentPaymentManagementStatus;
}

export type ListAcademyTalentPaymentManagementResponse = PageResponse<
  AcademyTalentPaymentManagementRow,
  AcademyTalentPaymentManagementSummary
>;

/** Immutable people and policy evidence attached to an Academy tuition invoice. */
export const ACADEMY_TALENT_PAYMENT_TRACE_ACTOR_ROLES = [
  'LEAD_OWNER',
  'LEAD_CREATOR',
  'ASSESSMENT_EVALUATOR',
  'PROMOTION_POLICY_EDITOR',
  'PROMOTION_QUOTE_EDITOR',
  'INVOICE_ISSUER',
  'PAYMENT_CONFIRMER',
  'COURSE_INSTRUCTOR',
] as const;
export type AcademyTalentPaymentTraceActorRole = (typeof ACADEMY_TALENT_PAYMENT_TRACE_ACTOR_ROLES)[number];

export interface AcademyTalentTraceStaff {
  id: number;
  displayName: string;
  email?: string | null;
}

export interface AcademyTalentPaymentTraceActor {
  role: AcademyTalentPaymentTraceActorRole;
  label: string;
  /** Present when this person has a CRM staff profile. */
  staff: AcademyTalentTraceStaff | null;
  /** Preserves a historical person name when a live staff record is unavailable. */
  recordedName: string | null;
}

export const ACADEMY_TALENT_PAYMENT_TRACE_EVENT_TYPES = [
  'ASSESSMENT_CREATED',
  'PROMOTION_QUOTE_UPDATED',
  'INVOICE_ISSUED',
  'INVOICE_REPRINTED',
  'PAYMENT_CONFIRMED',
] as const;
export type AcademyTalentPaymentTraceEventType = (typeof ACADEMY_TALENT_PAYMENT_TRACE_EVENT_TYPES)[number];

export interface AcademyTalentPaymentTraceEvent {
  id: number;
  type: AcademyTalentPaymentTraceEventType;
  occurredAt: string;
  summary: string;
  actor: AcademyTalentTraceStaff | null;
}

export const ACADEMY_TALENT_PAYMENT_TRACE_FLAG_CODES = [
  'HIGH_SCHOLARSHIP',
  'INVOICE_REVISED',
  'MULTIPLE_PAYMENT_CONFIRMERS',
  'PROMOTION_AFTER_EXPIRY',
] as const;
export type AcademyTalentPaymentTraceFlagCode = (typeof ACADEMY_TALENT_PAYMENT_TRACE_FLAG_CODES)[number];

/** Neutral review signals for audit/report workflows; none implies misconduct. */
export interface AcademyTalentPaymentTraceFlag {
  code: AcademyTalentPaymentTraceFlagCode;
  message: string;
}

export interface AcademyTalentPaymentTrace {
  assessmentId: number;
  learner: {
    id: number;
    name: string;
    phone: string | null;
    email: string | null;
    source: string | null;
    createdAt: string | null;
  };
  invoice: {
    documentNumber: string;
    revision: number;
    issuedAt: string | null;
    paymentMode: Exclude<AcademyTalentPaymentMode, 'THINKING'>;
    totalTuitionVnd: number;
  };
  promotion: {
    tierKey: string | null;
    tierLabel: string | null;
    qualified: boolean;
    scholarshipPercent: number;
    scholarshipVnd: number;
    catalogListPriceVnd: number;
    catalogPromoPriceVnd: number;
    finalPriceVnd: number;
    offerExpiresAt: string | null;
    isExpired: boolean;
    /** The global ladder-policy version used when this invoice snapshot was produced. */
    policyAudit: {
      id: number;
      changedAt: string;
      changedBy: AcademyTalentTraceStaff | null;
    } | null;
  };
  actors: AcademyTalentPaymentTraceActor[];
  events: AcademyTalentPaymentTraceEvent[];
  reviewFlags: AcademyTalentPaymentTraceFlag[];
}

export interface AcademyTalentPaymentTraceResponse {
  data: AcademyTalentPaymentTrace;
}

export interface AcademyTalentAssessment {
  id: number;
  leadId: number;
  status: AcademyTalentAssessmentStatus;
  scores: AcademyTalentAssessmentScores;
  quote: AcademyTalentAssessmentQuote;
  selectedCourseIds: number[];
  selectedSampleCourseIds: number[];
  selectedKitCourseIds: number[];
  /** Course ID → Academy instructor ID. Missing values resolve to Auto. */
  selectedInstructorIdsByCourse: Record<string, number>;
  paymentMode: AcademyTalentPaymentMode;
  depositVnd: number;
  payment: AcademyTalentPaymentSummary;
  notes: string | null;
  evaluator: { id: number; displayName: string; email?: string | null } | null;
  createdAt: string;
  updatedAt: string;
  invoice: {
    documentNumber: string;
    printedAt: string | null;
    printCount: number;
    printedBy: { id: number; displayName: string; email?: string | null } | null;
    snapshot: AcademyTalentInvoiceSnapshot | null;
  } | null;
}

export interface CreateAcademyTalentAssessmentRequest extends Partial<AcademyTalentAssessmentScores> {
  /** Optional Workshop OS attribution; the lead must match that participant. */
  workshopParticipantId?: number;
  selectedCourseIds?: number[];
  selectedSampleCourseIds?: number[];
  selectedKitCourseIds?: number[];
  selectedInstructorIdsByCourse?: Record<string, number>;
  paymentMode?: AcademyTalentPaymentMode;
  depositVnd?: number;
  notes?: string | null;
}

export interface UpdateAcademyTalentAssessmentRequest extends Partial<AcademyTalentAssessmentScores> {
  /** Existing workshop attribution is immutable; accepted only when it matches. */
  workshopParticipantId?: number;
  selectedCourseIds?: number[];
  selectedSampleCourseIds?: number[];
  selectedKitCourseIds?: number[];
  selectedInstructorIdsByCourse?: Record<string, number>;
  paymentMode?: AcademyTalentPaymentMode;
  depositVnd?: number;
  notes?: string | null;
}

/** Manual accounting confirmation. A bank QR transfer is never treated as paid before this mutation succeeds. */
export interface RecordAcademyTalentPaymentRequest {
  amountVnd: number;
  /** Defaults to bank transfer for older callers while the API is upgraded. */
  method?: AcademyTalentPaymentMethod;
  receivedAt?: string;
  reference?: string | null;
  note?: string | null;
}

/**
 * A non-persistent workshop draft evaluated by Fastify.  Supplying an
 * assessmentId makes the preview retain that session's original offer expiry
 * and chosen-course snapshot, so the on-screen result cannot diverge from the
 * subsequent save.
 */
export interface PreviewAcademyTalentAssessmentQuoteRequest extends Partial<AcademyTalentAssessmentScores> {
  assessmentId?: number;
  selectedCourseIds?: number[];
  selectedSampleCourseIds?: number[];
  selectedKitCourseIds?: number[];
  selectedInstructorIdsByCourse?: Record<string, number>;
  paymentMode?: AcademyTalentPaymentMode;
  depositVnd?: number;
}

export interface PreviewAcademyTalentAssessmentQuoteResponse {
  data: AcademyTalentAssessmentQuote;
}

export interface AcademyTalentAssessmentActionResponse {
  success: true;
  data: AcademyTalentAssessment;
  message: string;
}

export interface ListAcademyTalentAssessmentsResponse {
  data: AcademyTalentAssessment[];
  latest: AcademyTalentAssessment | null;
}

export interface AcademyCourseSelectOptionInput {
  code?: string | null;
  name: string;
  nameEn?: string | null;
  tag?: string | null;
  promoPriceVnd?: number | null;
}

export interface AcademyCourseSelectOption {
  value: string;
  label: string;
  code: string | null;
  searchText: string;
}

/**
 * Identifies the standalone "Khóa Bướm" Wings standard course by canonical
 * code (`buom_wings`) or normalized course name.
 */
export function isAcademyBuomCourse(course: { code?: string | null; name?: string | null } | null | undefined): boolean {
  if (!course) return false;
  const code = course.code?.trim().toLowerCase() || '';
  if (code === ACADEMY_BUOM_COURSE_CODE) return true;
  const normalizedName = removeVietnameseTones(course.name || '');
  return normalizedName.includes('khoa buom') || normalizedName === 'buom wings';
}

/**
 * Khóa Bướm only unlocks once the learner qualifies at Thiên Thần Bóng Tối
 * (`level6`, >=35 strands in 5 minutes and <=5 errors).
 */
export function isAcademyBuomUnlocked(
  result: Pick<AcademyTalentAssessmentResult, 'qualified' | 'tier'> | null | undefined
): boolean {
  return Boolean(result?.qualified && result.tier?.key === ACADEMY_BUOM_REQUIRED_TIER_KEY);
}

/**
 * Classifies course selection behavior in Tố Chất assessment: Combo and Khóa Bướm
 * are exclusive standalone selections (`COMBO`), while standard courses can combine (`COURSE`).
 */
export function resolveAcademyCourseSelectionKind(
  course: { code?: string | null; name?: string | null }
): 'COMBO' | 'COURSE' {
  if (isAcademyBuomCourse(course)) return 'COMBO';
  const haystack = `${course.code || ''} ${course.name || ''}`;
  return /(^|[-_])combo($|[-_])|combo|tron goi|trọn gói/i.test(haystack) ? 'COMBO' : 'COURSE';
}

function buildCourseSearchText(course: AcademyCourseSelectOptionInput): string {
  const parts = [course.code, course.name, course.nameEn, course.tag];
  if (isAcademyBuomCourse(course)) {
    parts.push('dành cho bướm', 'khóa bướm', 'bướm 5m', '5m', '5000000', '5.000.000', 'thiên thần bóng tối');
  }
  return removeVietnameseTones(parts.filter(Boolean).join(' '));
}

/**
 * Single source of truth for Academy Lead / Campaign course dropdown options.
 * Ensures both `workshop_1days` and `buom_wings` appear without duplicates even
 * before the catalog query finishes loading, while supporting rich Vietnamese queries.
 */
export function buildAcademyCourseSelectOptions(
  courses: AcademyCourseSelectOptionInput[],
  options: {
    extraCourseName?: string | null;
    formatLabel?: (course: AcademyCourseSelectOptionInput) => string;
  } = {}
): AcademyCourseSelectOption[] {
  const formatLabel =
    options.formatLabel ||
    ((course: AcademyCourseSelectOptionInput) =>
      [course.name, course.nameEn, course.code].filter(Boolean).join(' · '));

  const merged: AcademyCourseSelectOptionInput[] = [...courses];
  const hasCourse = (targetCode: string, targetName: string) =>
    merged.some(
      (course) =>
        course.code?.trim().toLowerCase() === targetCode ||
        removeVietnameseTones(course.name) === removeVietnameseTones(targetName)
    );

  if (!hasCourse(ACADEMY_WORKSHOP_1DAYS_COURSE_CODE, ACADEMY_WORKSHOP_1DAYS_COURSE_NAME)) {
    merged.push({
      code: ACADEMY_WORKSHOP_1DAYS_COURSE_CODE,
      name: ACADEMY_WORKSHOP_1DAYS_COURSE_NAME,
      nameEn: 'Workshop 1 Day',
      tag: 'WORKSHOP',
      promoPriceVnd: 0,
    });
  }

  if (!hasCourse(ACADEMY_BUOM_COURSE_CODE, ACADEMY_BUOM_COURSE_NAME)) {
    merged.push({
      code: ACADEMY_BUOM_COURSE_CODE,
      name: ACADEMY_BUOM_COURSE_NAME,
      nameEn: ACADEMY_BUOM_COURSE_NAME_EN,
      tag: ACADEMY_BUOM_COURSE_TAG,
      promoPriceVnd: ACADEMY_BUOM_COURSE_DEFAULT_PRICE_VND,
    });
  }

  const seenValues = new Set<string>();
  const result: AcademyCourseSelectOption[] = [];
  for (const course of merged) {
    const trimmedName = course.name.trim();
    if (!trimmedName || seenValues.has(trimmedName)) continue;
    seenValues.add(trimmedName);
    result.push({
      value: trimmedName,
      label: formatLabel(course),
      code: course.code?.trim() || null,
      searchText: buildCourseSearchText(course),
    });
  }

  const extra = options.extraCourseName?.trim();
  if (extra && !seenValues.has(extra)) {
    result.unshift({
      value: extra,
      label: extra,
      code: null,
      searchText: removeVietnameseTones(extra),
    });
  }

  return result;
}

export function matchesAcademyCourseOption(
  input: string,
  option?: { label?: unknown; value?: unknown; searchText?: unknown }
): boolean {
  const query = removeVietnameseTones(input);
  if (!query) return true;
  const searchText =
    typeof option?.searchText === 'string' && option.searchText
      ? option.searchText
      : removeVietnameseTones(`${String(option?.label ?? '')} ${String(option?.value ?? '')}`);
  return searchText.includes(query);
}
