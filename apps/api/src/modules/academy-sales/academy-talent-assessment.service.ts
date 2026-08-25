import type { FastifyInstance } from 'fastify';
import {
  isAdminOrSuperAdminRole,
  ACADEMY_TALENT_STRANDS_5_MIN_MAX,
  ACADEMY_TALENT_PAYMENT_MODES,
  calculateAcademyTalentAssessmentResult,
  type AcademyTalentAssessment,
  type AcademyTalentAssessmentActionResponse,
  type AcademyTalentAssessmentQuote,
  type AcademyTalentAssessmentScores,
  type AcademyTalentAddOnSnapshot,
  type AcademyTalentCourseSnapshot,
  type AcademyTalentInvoiceSnapshot,
  type AcademyTalentInstructor,
  type AcademyTalentInstructorSnapshot,
  type AcademyTalentPaymentRecord,
  type AcademyTalentPaymentManagementRow,
  type AcademyTalentPaymentManagementStatus,
  type AcademyTalentPaymentManagementSummary,
  type AcademyTalentPaymentMethod,
  type AcademyTalentPaymentTrace,
  type AcademyTalentPaymentTraceActor,
  type AcademyTalentPaymentTraceActorRole,
  type AcademyTalentPaymentTraceEvent,
  type AcademyTalentPaymentTraceEventType,
  type AcademyTalentPaymentTraceResponse,
  type AcademyTalentPaymentStatus,
  type AcademyTalentPaymentSummary,
  type AcademyTalentPaymentMode,
  type AcademyTalentTier,
  type CreateAcademyTalentAssessmentRequest,
  type ListAcademyTalentAssessmentsResponse,
  type ListAcademyTalentPaymentManagementParams,
  type ListAcademyTalentPaymentManagementResponse,
  type ListAcademyTalentInstructorsResponse,
  type PreviewAcademyTalentAssessmentQuoteRequest,
  type PreviewAcademyTalentAssessmentQuoteResponse,
  type RecordAcademyTalentPaymentRequest,
  type SafeAny,
  type UpsertAcademyTalentInstructorRequest,
  type AcademyTalentInstructorActionResponse,
  type UpdateAcademyTalentAssessmentRequest,
  removeVietnameseTones,
} from '@mos-lab/shared';
import {
  AcademySalesError,
  AcademySalesService,
  getAcademyIctDayBounds,
  getAcademyIctMonthBounds,
  type AcademyActor,
} from './academy-sales.service.js';
import { AcademyTalentLadderConfigurationService } from './academy-talent-ladder-configuration.service.js';
import { AcademyWorkshopBonusService } from '../academy-workshops/academy-workshop-bonus.service.js';

const DEFAULT_DEPOSIT_VND = 1_000_000;
const MAX_ERROR_COUNT = 99;
const SCORE_KEYS = [
  'eyeScore',
  'handScore',
  'strands5Min',
  'errorRoot',
  'errorSkin',
  'errorStickies',
  'errorDirection',
] as const;

type SnapshotBase = Omit<
  AcademyTalentCourseSnapshot,
  'scholarshipPercent' | 'scholarshipVnd' | 'finalPriceVnd' | 'instructor' | 'instructorSurchargeVnd'
>;
type QuoteOptions = {
  recommendedCourseIds?: number[];
  recommendation?: AcademyTalentAssessmentQuote['recommendation'];
  paymentMode?: AcademyTalentPaymentMode;
  depositVnd?: number;
  suggestedDepositVnd?: number;
  selectedSampleCourseIds?: number[];
  selectedKitCourseIds?: number[];
  instructorSelections?: Record<number, AcademyTalentInstructorSnapshot>;
  /** Global configured scholarship policy; rubric thresholds stay immutable. */
  tiers?: readonly AcademyTalentTier[];
};

const FALLBACK_AUTO_INSTRUCTOR: AcademyTalentInstructorSnapshot = {
  id: 0,
  code: 'auto',
  staffId: null,
  displayName: 'Tự động phân bổ giảng viên',
  description: 'Phân bổ ngẫu nhiên',
  avatarUrl: null,
  surchargePercent: 0,
  isActive: true,
  sortOrder: 0,
};

const ASSESSMENT_RELATION_INCLUDE = {
  evaluator: { select: { id: true, displayName: true, email: true } },
  invoicePrintedBy: { select: { id: true, displayName: true, email: true } },
  payments: {
    include: { confirmedBy: { select: { id: true, displayName: true, email: true } } },
    orderBy: [{ receivedAt: 'desc' as const }, { id: 'desc' as const }],
  },
};

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function toNonNegativeInteger(value: unknown, fallback: number, maximum: number, label: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0 || parsed > maximum) {
    throw new AcademySalesError(`${label} phải là số nguyên từ 0 đến ${maximum}.`);
  }
  return parsed;
}

function normalizeCourseIds(value: unknown): number[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new AcademySalesError('Danh sách khóa học không hợp lệ.');
  const ids = Array.from(
    new Set(value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))
  );
  if (ids.length !== value.length) throw new AcademySalesError('Danh sách khóa học có mã không hợp lệ.');
  return ids.sort((left, right) => left - right);
}

async function resolveWorkshopParticipantAttribution(
  fastify: FastifyInstance,
  leadId: number,
  value: unknown
): Promise<number | null> {
  if (value === undefined || value === null) return null;
  const participantId = Number(value);
  if (!Number.isInteger(participantId) || participantId <= 0) {
    throw new AcademySalesError('Workshop participant không hợp lệ.');
  }
  const participant = await fastify.prisma.crm.crmAcademyWorkshopParticipant.findUnique({
    where: { id: participantId },
    select: { id: true, campaignLead: { select: { leadId: true, removedAt: true } } },
  });
  if (!participant || participant.campaignLead.leadId !== leadId || participant.campaignLead.removedAt) {
    throw new AcademySalesError('Workshop participant không khớp với học viên Tố Chất.', 409);
  }
  return participant.id;
}

function normalizeInstructorIdsByCourse(value: unknown, selectedCourseIds: number[]): Record<string, number> {
  if (value === undefined || value === null) return {};
  if (Array.isArray(value) || typeof value !== 'object') {
    throw new AcademySalesError('Lựa chọn giảng viên theo khóa học không hợp lệ.');
  }
  const selected = new Set(selectedCourseIds);
  const normalized: Record<string, number> = {};
  for (const [courseIdRaw, instructorIdRaw] of Object.entries(value as Record<string, unknown>)) {
    const courseId = Number(courseIdRaw);
    const instructorId = Number(instructorIdRaw);
    if (!Number.isInteger(courseId) || courseId <= 0 || !selected.has(courseId)) {
      throw new AcademySalesError('Giảng viên phải được chọn cho một khóa học đang chọn.');
    }
    if (!Number.isInteger(instructorId) || instructorId <= 0) {
      throw new AcademySalesError('Giảng viên được chọn không hợp lệ.');
    }
    normalized[String(courseId)] = instructorId;
  }
  return normalized;
}

function parseInstructorIdsByCourse(
  value: string | null | undefined,
  selectedCourseIds: number[]
): Record<string, number> {
  try {
    return normalizeInstructorIdsByCourse(parseJson<unknown>(value, {}), selectedCourseIds);
  } catch {
    return {};
  }
}

/** Material packages can only be added for a currently selected course. */
function normalizeAddOnCourseIds(value: unknown, selectedCourseIds: number[]): number[] {
  const ids = normalizeCourseIds(value);
  const selected = new Set(selectedCourseIds);
  if (ids.some((id) => !selected.has(id))) {
    throw new AcademySalesError('Mẫu hoặc đồ nghề phải thuộc khóa học đã chọn.');
  }
  return ids;
}

function normalizePaymentMode(value: unknown, fallback: AcademyTalentPaymentMode): AcademyTalentPaymentMode {
  if (value === undefined) return fallback;
  const mode = String(value || '')
    .trim()
    .toUpperCase() as AcademyTalentPaymentMode;
  if (!ACADEMY_TALENT_PAYMENT_MODES.includes(mode)) throw new AcademySalesError('Hình thức thanh toán không hợp lệ.');
  return mode;
}

function normalizePaymentMethod(value: unknown): AcademyTalentPaymentMethod {
  return String(value || '')
    .trim()
    .toUpperCase() === 'CASH'
    ? 'CASH'
    : 'BANK_TRANSFER';
}

/** A payment choice only has meaning after at least one course is selected. */
function normalizePaymentModeForCourses(
  value: unknown,
  fallback: AcademyTalentPaymentMode,
  selectedCourseIds: readonly number[]
): AcademyTalentPaymentMode {
  return selectedCourseIds.length ? normalizePaymentMode(value, fallback) : 'THINKING';
}

function normalizeDeposit(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    throw new AcademySalesError('Số tiền cọc phải là số nguyên VNĐ không âm.');
  }
  return Math.round(parsed);
}

function normalizeInstructorCode(value: unknown) {
  const code = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!/^[a-z0-9][a-z0-9_]{1,48}$/.test(code)) {
    throw new AcademySalesError('Mã giảng viên gồm 2–49 ký tự chữ thường, số hoặc dấu gạch dưới.');
  }
  return code;
}

function normalizeInstructorConfiguration(value: UpsertAcademyTalentInstructorRequest) {
  const displayName = String(value.displayName || '').trim();
  if (!displayName || displayName.length > 150) {
    throw new AcademySalesError('Tên giảng viên phải có từ 1 đến 150 ký tự.');
  }
  const staffId = value.staffId === null || value.staffId === undefined ? null : Number(value.staffId);
  if (staffId !== null && (!Number.isInteger(staffId) || staffId <= 0)) {
    throw new AcademySalesError('Nhân sự liên kết không hợp lệ.');
  }
  const surchargePercent = Number(value.surchargePercent);
  if (!Number.isInteger(surchargePercent) || surchargePercent < 0 || surchargePercent > 100) {
    throw new AcademySalesError('Phụ phí giảng viên phải là số nguyên từ 0% đến 100%.');
  }
  const sortOrder = Number(value.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 9999) {
    throw new AcademySalesError('Thứ tự hiển thị phải là số nguyên từ 0 đến 9999.');
  }
  const description = String(value.description || '').trim() || null;
  const avatarUrl = String(value.avatarUrl || '').trim() || null;
  if (description && description.length > 255) throw new AcademySalesError('Mô tả giảng viên tối đa 255 ký tự.');
  if (avatarUrl && avatarUrl.length > 5000) throw new AcademySalesError('Link ảnh giảng viên quá dài.');
  return {
    code: normalizeInstructorCode(value.code),
    staffId,
    displayName,
    description,
    avatarUrl,
    surchargePercent,
    isActive: Boolean(value.isActive),
    sortOrder,
  };
}

function toScores(source: SafeAny, input?: Partial<AcademyTalentAssessmentScores>): AcademyTalentAssessmentScores {
  return {
    eyeScore: toNonNegativeInteger(input?.eyeScore, Number(source.eyeScore) || 0, 4, 'Điểm kiểm tra mắt'),
    handScore: toNonNegativeInteger(input?.handScore, Number(source.handScore) || 0, 4, 'Điểm kiểm tra tay'),
    strands5Min: toNonNegativeInteger(
      input?.strands5Min,
      Number(source.strands5Min) || 0,
      ACADEMY_TALENT_STRANDS_5_MIN_MAX,
      'Số sợi trong 5 phút'
    ),
    errorRoot: toNonNegativeInteger(input?.errorRoot, Number(source.errorRoot) || 0, MAX_ERROR_COUNT, 'Lỗi hở chân'),
    errorSkin: toNonNegativeInteger(input?.errorSkin, Number(source.errorSkin) || 0, MAX_ERROR_COUNT, 'Lỗi dính da'),
    errorStickies: toNonNegativeInteger(
      input?.errorStickies,
      Number(source.errorStickies) || 0,
      MAX_ERROR_COUNT,
      'Lỗi dính mi'
    ),
    errorDirection: toNonNegativeInteger(
      input?.errorDirection,
      Number(source.errorDirection) || 0,
      MAX_ERROR_COUNT,
      'Lỗi hướng mi'
    ),
  };
}

function toStaff(row: SafeAny) {
  if (!row) return null;
  return { id: Number(row.id), displayName: String(row.displayName), email: row.email ?? null };
}

function toInstructor(row: SafeAny): AcademyTalentInstructor {
  return {
    id: Number(row.id),
    code: String(row.code),
    staffId: row.staffId === null || row.staffId === undefined ? null : Number(row.staffId),
    displayName: String(row.displayName),
    description: row.description ?? null,
    avatarUrl: row.avatarUrl ?? row.staff?.avatarUrl ?? null,
    surchargePercent: Math.max(0, Math.round(Number(row.surchargePercent) || 0)),
    isActive: Boolean(row.isActive),
    sortOrder: Math.max(0, Math.round(Number(row.sortOrder) || 0)),
  };
}

async function resolveInstructorSelections(
  fastify: FastifyInstance,
  selectedCourseIds: number[],
  selectedInstructorIdsByCourse: Record<string, number>
): Promise<Record<number, AcademyTalentInstructorSnapshot>> {
  if (!selectedCourseIds.length) return {};
  const instructors = await fastify.prisma.crm.crmAcademyInstructor.findMany({
    where: { isActive: true },
    include: { staff: { select: { avatarUrl: true } } },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  const options = instructors.map(toInstructor);
  const auto = options.find((instructor) => instructor.code === 'auto');
  if (!auto) throw new AcademySalesError('Chưa cấu hình giảng viên phân bổ tự động cho Academy.', 409);
  const byId = new Map(options.map((instructor) => [instructor.id, instructor]));
  const result: Record<number, AcademyTalentInstructorSnapshot> = {};
  for (const courseId of selectedCourseIds) {
    const instructorId = selectedInstructorIdsByCourse[String(courseId)] ?? auto.id;
    const instructor = byId.get(instructorId);
    if (!instructor) throw new AcademySalesError('Giảng viên đã chọn không còn hoạt động. Vui lòng chọn lại.', 409);
    result[courseId] = instructor;
  }
  return result;
}

function formatIctDate(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}${get('month')}${get('day')}`;
}

function offerExpiry(now: Date) {
  return getAcademyIctDayBounds(now).end;
}

function isQuoteExpired(expiresAt: Date | string, now: Date) {
  const expires = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return Number.isFinite(expires.getTime()) && now.getTime() > expires.getTime();
}

function toSnapshotBase(course: SafeAny): SnapshotBase {
  const rawPromo = Math.max(0, Math.round(Number(course.promoPriceVnd) || 0));
  const listPriceVnd = Math.max(0, Math.round(Number(course.listPriceVnd) || 0));
  // In the current catalogue 0 means an unset promo field. The price to quote
  // is the configured promo when present, otherwise the catalogue list price.
  const promoPriceVnd = rawPromo > 0 ? rawPromo : listPriceVnd;
  return {
    courseId: Number(course.id),
    code: String(course.code),
    name: String(course.name),
    nameEn: course.nameEn ?? null,
    listPriceVnd,
    promoPriceVnd,
    kitName: course.kitName ?? null,
    kitPriceVnd: Math.max(0, Math.round(Number(course.kitPriceVnd) || 0)),
    samplePriceVnd: Math.max(0, Math.round(Number(course.samplePriceVnd) || 0)),
    lessonCount: Math.max(0, Math.round(Number(course.lessonCount) || 0)),
    lashModelCount: Math.max(0, Math.round(Number(course.lashModelCount) || 0)),
  };
}

function normalizeSnapshotBases(value: unknown): SnapshotBase[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is SafeAny => Boolean(item) && Number.isInteger(Number(item.courseId)) && Number(item.courseId) > 0
    )
    .map((item) => ({
      courseId: Number(item.courseId),
      code: String(item.code || ''),
      name: String(item.name || ''),
      nameEn: item.nameEn ?? null,
      listPriceVnd: Math.max(0, Math.round(Number(item.listPriceVnd) || 0)),
      promoPriceVnd: Math.max(0, Math.round(Number(item.promoPriceVnd) || 0)),
      kitName: item.kitName ?? null,
      kitPriceVnd: Math.max(0, Math.round(Number(item.kitPriceVnd) || 0)),
      samplePriceVnd: Math.max(0, Math.round(Number(item.samplePriceVnd) || 0)),
      lessonCount: Math.max(0, Math.round(Number(item.lessonCount) || 0)),
      lashModelCount: Math.max(0, Math.round(Number(item.lashModelCount) || 0)),
    }));
}

export function buildAcademyTalentQuote(
  scores: AcademyTalentAssessmentScores,
  expiresAt: Date | string,
  courses: SnapshotBase[],
  now = new Date(),
  options: QuoteOptions = {}
): AcademyTalentAssessmentQuote {
  const result = calculateAcademyTalentAssessmentResult(scores, options.tiers);
  const expired = isQuoteExpired(expiresAt, now);
  const effectiveScholarshipPercent = expired ? 0 : result.scholarshipPercent;
  const quotedCourses: AcademyTalentCourseSnapshot[] = courses.map((course) => {
    const scholarshipVnd = Math.round(course.promoPriceVnd * (effectiveScholarshipPercent / 100));
    const finalPriceVnd = Math.max(0, course.promoPriceVnd - scholarshipVnd);
    const instructor = options.instructorSelections?.[course.courseId] || FALLBACK_AUTO_INSTRUCTOR;
    // Legacy workshop policy: a requested instructor is a surcharge on the
    // tuition after the student's Tố Chất scholarship, never on materials.
    const instructorSurchargeVnd = Math.round(finalPriceVnd * (instructor.surchargePercent / 100));
    return {
      ...course,
      scholarshipPercent: effectiveScholarshipPercent,
      scholarshipVnd,
      finalPriceVnd,
      instructor,
      instructorSurchargeVnd,
    };
  });
  const courseListPriceVnd = quotedCourses.reduce((sum, course) => sum + course.listPriceVnd, 0);
  const coursePromoPriceVnd = quotedCourses.reduce((sum, course) => sum + course.promoPriceVnd, 0);
  const courseScholarshipVnd = quotedCourses.reduce((sum, course) => sum + course.scholarshipVnd, 0);
  const courseFinalPriceVnd = Math.max(0, coursePromoPriceVnd - courseScholarshipVnd);
  const sampleRewardPercent = expired ? 0 : Math.max(0, Math.round(result.tier?.sampleRewardPercent || 0));
  const kitRewardPercent = expired ? 0 : Math.max(0, Math.round(result.tier?.kitRewardPercent || 0));
  // Retain one aggregate field so issued snapshots created before the split
  // remain readable; new optional package lines use their own percentages.
  const materialRewardPercent = Math.max(sampleRewardPercent, kitRewardPercent);
  const selectedSamples = new Set(
    (options.selectedSampleCourseIds || []).filter((id) => courses.some((course) => course.courseId === id))
  );
  const selectedKits = new Set(
    (options.selectedKitCourseIds || []).filter((id) => courses.some((course) => course.courseId === id))
  );
  const addOns: AcademyTalentAddOnSnapshot[] = [];
  for (const course of courses) {
    const add = (kind: AcademyTalentAddOnSnapshot['kind'], basePrice: number, label: string, rewardPercent: number) => {
      if (basePrice <= 0) return;
      const scholarshipVnd = Math.round(basePrice * (rewardPercent / 100));
      addOns.push({
        kind,
        courseId: course.courseId,
        courseName: course.name,
        label,
        listPriceVnd: basePrice,
        scholarshipPercent: rewardPercent,
        scholarshipVnd,
        finalPriceVnd: Math.max(0, basePrice - scholarshipVnd),
      });
    };
    if (selectedSamples.has(course.courseId)) {
      add('SAMPLE', course.samplePriceVnd, `Mẫu thực hành · ${course.lashModelCount} mẫu`, sampleRewardPercent);
    }
    if (selectedKits.has(course.courseId)) {
      add('KIT', course.kitPriceVnd, course.kitName || 'Đồ nghề học viên', kitRewardPercent);
    }
  }
  const sampleListPriceVnd = addOns
    .filter((item) => item.kind === 'SAMPLE')
    .reduce((sum, item) => sum + item.listPriceVnd, 0);
  const sampleScholarshipVnd = addOns
    .filter((item) => item.kind === 'SAMPLE')
    .reduce((sum, item) => sum + item.scholarshipVnd, 0);
  const sampleFinalPriceVnd = Math.max(0, sampleListPriceVnd - sampleScholarshipVnd);
  const kitListPriceVnd = addOns
    .filter((item) => item.kind === 'KIT')
    .reduce((sum, item) => sum + item.listPriceVnd, 0);
  const kitScholarshipVnd = addOns
    .filter((item) => item.kind === 'KIT')
    .reduce((sum, item) => sum + item.scholarshipVnd, 0);
  const kitFinalPriceVnd = Math.max(0, kitListPriceVnd - kitScholarshipVnd);
  const teacherSurchargeVnd = quotedCourses.reduce((sum, course) => sum + course.instructorSurchargeVnd, 0);
  const listPriceVnd = courseListPriceVnd + sampleListPriceVnd + kitListPriceVnd;
  const promoPriceVnd = coursePromoPriceVnd + sampleListPriceVnd + kitListPriceVnd;
  const scholarshipVnd = courseScholarshipVnd + sampleScholarshipVnd + kitScholarshipVnd;
  const finalPriceVnd = courseFinalPriceVnd + sampleFinalPriceVnd + kitFinalPriceVnd + teacherSurchargeVnd;
  const suggestedDepositVnd = Math.min(
    finalPriceVnd,
    Math.max(0, Math.round(options.suggestedDepositVnd ?? DEFAULT_DEPOSIT_VND))
  );
  const paymentMode = options.paymentMode ?? 'THINKING';
  const dueNowVnd =
    paymentMode === 'FULL'
      ? finalPriceVnd
      : paymentMode === 'DEPOSIT'
        ? Math.min(finalPriceVnd, Math.max(0, Math.round(options.depositVnd ?? suggestedDepositVnd)))
        : 0;
  return {
    result,
    expiresAt: new Date(expiresAt).toISOString(),
    isExpired: expired,
    effectiveScholarshipPercent,
    materialRewardPercent,
    sampleRewardPercent,
    kitRewardPercent,
    listPriceVnd,
    promoPriceVnd,
    scholarshipVnd,
    finalPriceVnd,
    courseListPriceVnd,
    coursePromoPriceVnd,
    courseScholarshipVnd,
    courseFinalPriceVnd,
    sampleListPriceVnd,
    sampleScholarshipVnd,
    sampleFinalPriceVnd,
    kitListPriceVnd,
    kitScholarshipVnd,
    kitFinalPriceVnd,
    teacherSurchargeVnd,
    recommendedCourseIds: Array.from(new Set(options.recommendedCourseIds || [])),
    recommendation: options.recommendation || {
      title: 'Chọn khóa học phù hợp',
      summary: 'Chọn khóa học theo mục tiêu và kết quả đánh giá của học viên.',
    },
    suggestedDepositVnd,
    dueNowVnd,
    courses: quotedCourses,
    addOns,
  };
}

export function calculateAcademyTalentPaymentStatus(
  paymentMode: AcademyTalentPaymentMode,
  totalPaidVnd: number,
  finalPriceVnd: number,
  requiredDepositVnd: number
): AcademyTalentPaymentStatus {
  if (finalPriceVnd > 0 && totalPaidVnd >= finalPriceVnd) return 'PAID';
  if (totalPaidVnd <= 0) return 'UNPAID';
  if (paymentMode === 'DEPOSIT' && totalPaidVnd >= requiredDepositVnd) return 'DEPOSIT_RECEIVED';
  return 'PARTIALLY_PAID';
}

function toPaymentSummary(row: SafeAny, quote: AcademyTalentAssessmentQuote): AcademyTalentPaymentSummary {
  const payments = Array.isArray(row.payments) ? row.payments : [];
  const paymentRecords: AcademyTalentPaymentRecord[] = payments
    .map((payment: SafeAny) => ({
      id: Math.max(0, Math.round(Number(payment.id) || 0)),
      amountVnd: Math.max(0, Math.round(Number(payment.amountVnd) || 0)),
      method: normalizePaymentMethod(payment.paymentMethod),
      receivedAt: new Date(payment.receivedAt).toISOString(),
      reference: payment.reference?.trim() || null,
      note: payment.note?.trim() || null,
      confirmedBy: toStaff(payment.confirmedBy),
      createdAt: new Date(payment.createdAt).toISOString(),
    }))
    .filter(
      (payment: AcademyTalentPaymentRecord) => payment.id > 0 && Number.isFinite(new Date(payment.receivedAt).getTime())
    )
    .sort((left: AcademyTalentPaymentRecord, right: AcademyTalentPaymentRecord) =>
      right.receivedAt.localeCompare(left.receivedAt)
    );
  const totalPaidVnd = paymentRecords.reduce((sum, payment) => sum + payment.amountVnd, 0);
  const finalPriceVnd = Math.max(0, Math.round(Number(quote.finalPriceVnd) || 0));
  const remainingVnd = Math.max(0, finalPriceVnd - totalPaidVnd);
  const paymentMode = normalizePaymentMode(row.paymentMode, 'THINKING');
  const requiredDepositVnd = Math.max(0, Math.round(Number(row.depositVnd) || quote.suggestedDepositVnd || 0));
  const status = calculateAcademyTalentPaymentStatus(paymentMode, totalPaidVnd, finalPriceVnd, requiredDepositVnd);
  return { status, totalPaidVnd, remainingVnd, payments: paymentRecords };
}

function toPaymentManagementRow(row: SafeAny): AcademyTalentPaymentManagementRow | null {
  const invoiceSnapshot = parseJson<AcademyTalentInvoiceSnapshot | null>(row.invoiceSnapshotJson, null);
  const savedQuote = parseJson<AcademyTalentAssessmentQuote | null>(row.quoteSnapshotJson, null);
  const quote = savedQuote || invoiceSnapshot?.quote;
  const invoiceNumber = String(row.invoiceNumber || invoiceSnapshot?.documentNumber || '').trim();
  if (!quote || !invoiceNumber || Math.round(Number(quote.finalPriceVnd) || 0) <= 0) return null;

  const payment = toPaymentSummary(row, quote);
  const snapshotMode = invoiceSnapshot?.paymentMode;
  const paymentMode: AcademyTalentPaymentManagementRow['paymentMode'] =
    snapshotMode === 'FULL'
      ? 'FULL'
      : snapshotMode === 'DEPOSIT'
        ? 'DEPOSIT'
        : normalizePaymentMode(row.paymentMode, 'DEPOSIT') === 'FULL'
          ? 'FULL'
          : 'DEPOSIT';

  return {
    assessmentId: Math.max(0, Math.round(Number(row.id) || 0)),
    lead: {
      id: Math.max(0, Math.round(Number(row.lead?.id || row.leadId) || 0)),
      name: String(row.lead?.name || 'Học viên Academy').trim() || 'Học viên Academy',
      phone: row.lead?.phone?.trim() || null,
    },
    invoiceNumber,
    issuedAt: iso(row.invoicePrintedAt || invoiceSnapshot?.issuedAt),
    courseLabel: describeCourses(quote) || 'Học phí Academy',
    paymentMode,
    paymentStatus: payment.status,
    tuitionVnd: Math.max(0, Math.round(Number(quote.finalPriceVnd) || 0)),
    requiredDepositVnd: Math.max(0, Math.round(Number(row.depositVnd) || quote.suggestedDepositVnd || 0)),
    totalPaidVnd: payment.totalPaidVnd,
    remainingVnd: payment.remainingVnd,
    paymentCount: payment.payments.length,
    latestPayment: payment.payments[0] || null,
    payments: payment.payments,
  };
}

const TRACE_ACTOR_LABELS: Record<AcademyTalentPaymentTraceActorRole, string> = {
  LEAD_OWNER: 'Phụ trách học viên',
  LEAD_CREATOR: 'Người tạo lead',
  ASSESSMENT_EVALUATOR: 'Người đánh giá Tố Chất',
  PROMOTION_POLICY_EDITOR: 'Người cấu hình chính sách ưu đãi',
  PROMOTION_QUOTE_EDITOR: 'Người điều chỉnh báo giá/ưu đãi',
  INVOICE_ISSUER: 'Người lập hoặc in phiếu',
  PAYMENT_CONFIRMER: 'Người xác nhận khoản thu',
  COURSE_INSTRUCTOR: 'Giảng viên được chỉ định',
};

function addTraceActor(
  actors: AcademyTalentPaymentTraceActor[],
  seen: Set<string>,
  role: AcademyTalentPaymentTraceActorRole,
  staff: AcademyTalentPaymentTraceActor['staff'],
  recordedName: string | null = null
) {
  const normalizedName = recordedName?.trim() || null;
  if (!staff && !normalizedName) return;
  const key = `${role}:${staff?.id || normalizedName || 'unknown'}`;
  if (seen.has(key)) return;
  seen.add(key);
  actors.push({
    role,
    label: TRACE_ACTOR_LABELS[role],
    staff,
    recordedName: normalizedName,
  });
}

function traceEventType(activity: SafeAny): AcademyTalentPaymentTraceEventType {
  const metadata = parseJson<SafeAny>(activity.metadata, {});
  if (activity.activityType === 'INVOICE_PRINTED') {
    return metadata.reprint ? 'INVOICE_REPRINTED' : 'INVOICE_ISSUED';
  }
  if (activity.activityType === 'PAYMENT_RECEIVED') return 'PAYMENT_CONFIRMED';
  return metadata.action === 'created' ? 'ASSESSMENT_CREATED' : 'PROMOTION_QUOTE_UPDATED';
}

function toTraceEvent(activity: SafeAny): AcademyTalentPaymentTraceEvent | null {
  const occurredAt = iso(activity.occurredAt || activity.createdAt);
  if (!occurredAt) return null;
  return {
    id: Math.max(0, Math.round(Number(activity.id) || 0)),
    type: traceEventType(activity),
    occurredAt,
    summary: String(activity.content || 'Cập nhật hồ sơ Academy.').trim(),
    actor: toStaff(activity.actor),
  };
}

/**
 * Read model for finance/audit. It derives review signals only from immutable
 * invoice snapshots and append-only activities; a signal is never an
 * accusation and should be used to choose records for policy review.
 */
function toPaymentTrace(row: SafeAny, activities: SafeAny[]): AcademyTalentPaymentTrace {
  const invoiceSnapshot = parseJson<AcademyTalentInvoiceSnapshot | null>(row.invoiceSnapshotJson, null);
  const savedQuote = parseJson<AcademyTalentAssessmentQuote | null>(row.quoteSnapshotJson, null);
  // A trace must describe the document that was actually issued, even while
  // an unpaid workshop draft is still editable for a possible next revision.
  const quote = invoiceSnapshot?.quote || savedQuote;
  const invoiceNumber = String(row.invoiceNumber || invoiceSnapshot?.documentNumber || '').trim();
  if (!quote || !invoiceNumber) throw new AcademySalesError('Thiếu snapshot phiếu học phí để truy vết.', 409);

  const events = activities
    .map(toTraceEvent)
    .filter((event): event is AcademyTalentPaymentTraceEvent => Boolean(event));
  const actors: AcademyTalentPaymentTraceActor[] = [];
  const seenActors = new Set<string>();
  addTraceActor(actors, seenActors, 'LEAD_OWNER', toStaff(row.lead?.owner));
  addTraceActor(actors, seenActors, 'LEAD_CREATOR', toStaff(row.lead?.createdBy));
  addTraceActor(actors, seenActors, 'ASSESSMENT_EVALUATOR', toStaff(row.evaluator));
  addTraceActor(actors, seenActors, 'PROMOTION_POLICY_EDITOR', toStaff(row.promotionPolicyAudit?.changedBy));
  addTraceActor(actors, seenActors, 'INVOICE_ISSUER', toStaff(row.invoicePrintedBy));
  for (const course of quote.courses || []) {
    addTraceActor(
      actors,
      seenActors,
      'COURSE_INSTRUCTOR',
      course.instructor?.staffId
        ? { id: course.instructor.staffId, displayName: course.instructor.displayName, email: null }
        : null,
      course.instructor?.displayName || null
    );
  }
  for (const payment of toPaymentSummary(row, quote).payments) {
    addTraceActor(actors, seenActors, 'PAYMENT_CONFIRMER', payment.confirmedBy);
  }
  for (const event of events) {
    if (event.type === 'ASSESSMENT_CREATED') {
      addTraceActor(actors, seenActors, 'ASSESSMENT_EVALUATOR', event.actor);
    } else if (event.type === 'PROMOTION_QUOTE_UPDATED') {
      addTraceActor(actors, seenActors, 'PROMOTION_QUOTE_EDITOR', event.actor);
    } else if (event.type === 'INVOICE_ISSUED' || event.type === 'INVOICE_REPRINTED') {
      addTraceActor(actors, seenActors, 'INVOICE_ISSUER', event.actor);
    } else if (event.type === 'PAYMENT_CONFIRMED') {
      addTraceActor(actors, seenActors, 'PAYMENT_CONFIRMER', event.actor);
    }
  }

  const invoiceRevision = Math.max(0, Math.round(Number(row.invoiceRevision) || 0));
  const scholarshipPercent = Math.max(0, Math.round(Number(quote.effectiveScholarshipPercent) || 0));
  const reviewFlags: AcademyTalentPaymentTrace['reviewFlags'] = [];
  if (scholarshipPercent >= 50) {
    reviewFlags.push({
      code: 'HIGH_SCHOLARSHIP',
      message: `Ưu đãi học bổng ${scholarshipPercent}% — nên có bước rà soát chính sách khi phân tích báo cáo.`,
    });
  }
  if (invoiceRevision > 1) {
    reviewFlags.push({
      code: 'INVOICE_REVISED',
      message: `Phiếu đã có ${invoiceRevision} phiên bản; xem timeline trước khi đối chiếu doanh thu hoặc ưu đãi.`,
    });
  }
  const paymentConfirmers = new Set(
    toPaymentSummary(row, quote)
      .payments.map((payment) => payment.confirmedBy?.id)
      .filter((id): id is number => Boolean(id))
  );
  if (paymentConfirmers.size > 1) {
    reviewFlags.push({
      code: 'MULTIPLE_PAYMENT_CONFIRMERS',
      message: 'Có nhiều người xác nhận khoản thu; timeline lưu từng xác nhận để đối soát rõ trách nhiệm.',
    });
  }
  if (quote.isExpired && scholarshipPercent > 0) {
    reviewFlags.push({
      code: 'PROMOTION_AFTER_EXPIRY',
      message: 'Snapshot có ưu đãi sau thời điểm hết hạn; cần kiểm tra lại chính sách trước khi chốt báo cáo.',
    });
  }

  const snapshotMode = invoiceSnapshot?.paymentMode === 'FULL' ? 'FULL' : 'DEPOSIT';
  return {
    assessmentId: Math.max(0, Math.round(Number(row.id) || 0)),
    learner: {
      id: Math.max(0, Math.round(Number(row.lead?.id || row.leadId) || 0)),
      name: String(row.lead?.name || 'Học viên Academy').trim() || 'Học viên Academy',
      phone: row.lead?.phone?.trim() || null,
      email: row.lead?.email?.trim() || null,
      source: row.lead?.source?.trim() || null,
      createdAt: iso(row.lead?.createdAt),
    },
    invoice: {
      documentNumber: invoiceNumber,
      revision: invoiceRevision,
      issuedAt: iso(row.invoicePrintedAt || invoiceSnapshot?.issuedAt),
      paymentMode: snapshotMode,
      totalTuitionVnd: Math.max(0, Math.round(Number(quote.finalPriceVnd) || 0)),
    },
    promotion: {
      tierKey: quote.result.tier?.key || null,
      tierLabel: quote.result.tier?.title || null,
      qualified: Boolean(quote.result.qualified),
      scholarshipPercent,
      scholarshipVnd: Math.max(0, Math.round(Number(quote.scholarshipVnd) || 0)),
      catalogListPriceVnd: Math.max(0, Math.round(Number(quote.listPriceVnd) || 0)),
      catalogPromoPriceVnd: Math.max(0, Math.round(Number(quote.promoPriceVnd) || 0)),
      finalPriceVnd: Math.max(0, Math.round(Number(quote.finalPriceVnd) || 0)),
      offerExpiresAt: iso(quote.expiresAt),
      isExpired: Boolean(quote.isExpired),
      policyAudit: row.promotionPolicyAudit
        ? {
            id: Math.max(0, Math.round(Number(row.promotionPolicyAudit.id) || 0)),
            changedAt: iso(row.promotionPolicyAudit.createdAt) || new Date(0).toISOString(),
            changedBy: toStaff(row.promotionPolicyAudit.changedBy),
          }
        : null,
    },
    actors,
    events,
    reviewFlags,
  };
}

function matchesPaymentManagementStatus(
  row: AcademyTalentPaymentManagementRow,
  status: AcademyTalentPaymentManagementStatus
) {
  if (status === 'ALL') return true;
  if (status === 'FOLLOW_UP') return row.paymentStatus === 'DEPOSIT_RECEIVED' || row.paymentStatus === 'PARTIALLY_PAID';
  return row.paymentStatus === status;
}

function paymentManagementSummary(
  rows: readonly AcademyTalentPaymentManagementRow[],
  month: string,
  start: Date,
  end: Date
): AcademyTalentPaymentManagementSummary {
  let confirmedRevenueVnd = 0;
  let confirmedBankTransferVnd = 0;
  let confirmedCashVnd = 0;
  for (const row of rows) {
    for (const payment of row.payments) {
      const receivedAt = new Date(payment.receivedAt);
      if (!Number.isFinite(receivedAt.getTime()) || receivedAt < start || receivedAt > end) continue;
      confirmedRevenueVnd += payment.amountVnd;
      if (payment.method === 'CASH') confirmedCashVnd += payment.amountVnd;
      else confirmedBankTransferVnd += payment.amountVnd;
    }
  }
  return {
    month,
    confirmedRevenueVnd,
    confirmedBankTransferVnd,
    confirmedCashVnd,
    depositFollowUpVnd: rows
      .filter((row) => row.paymentStatus === 'DEPOSIT_RECEIVED')
      .reduce((sum, row) => sum + row.totalPaidVnd, 0),
    depositFollowUpCount: rows.filter((row) => row.paymentStatus === 'DEPOSIT_RECEIVED').length,
    outstandingFollowUpVnd: rows
      .filter((row) => row.paymentStatus === 'DEPOSIT_RECEIVED' || row.paymentStatus === 'PARTIALLY_PAID')
      .reduce((sum, row) => sum + row.remainingVnd, 0),
    outstandingFollowUpCount: rows.filter(
      (row) => row.paymentStatus === 'DEPOSIT_RECEIVED' || row.paymentStatus === 'PARTIALLY_PAID'
    ).length,
    paidInFullCount: rows.filter((row) => row.paymentStatus === 'PAID').length,
  };
}

function isFullyPaid(row: SafeAny) {
  const invoiceSnapshot = parseJson<AcademyTalentInvoiceSnapshot | null>(row.invoiceSnapshotJson, null);
  const savedQuote = parseJson<AcademyTalentAssessmentQuote | null>(row.quoteSnapshotJson, null);
  const expectedVnd = Math.max(
    0,
    Math.round(Number(savedQuote?.finalPriceVnd ?? invoiceSnapshot?.quote.finalPriceVnd) || 0)
  );
  const paidVnd = (Array.isArray(row.payments) ? row.payments : []).reduce(
    (sum: number, payment: SafeAny) => sum + Math.max(0, Math.round(Number(payment.amountVnd) || 0)),
    0
  );
  return expectedVnd > 0 && paidVnd >= expectedVnd;
}

function toAssessment(row: SafeAny, now = new Date(), tiers?: readonly AcademyTalentTier[]): AcademyTalentAssessment {
  const scores = toScores(row);
  const invoiceSnapshot = parseJson<AcademyTalentInvoiceSnapshot | null>(row.invoiceSnapshotJson, null);
  const courseBases = normalizeSnapshotBases(parseJson<unknown>(row.courseSnapshotJson, []));
  const savedQuote = parseJson<AcademyTalentAssessmentQuote | null>(row.quoteSnapshotJson, null);
  const selectedCourseIds = normalizeCourseIds(parseJson<unknown>(row.selectedCourseIds, []));
  const selectedSampleCourseIds = normalizeAddOnCourseIds(
    parseJson<unknown>(row.selectedSampleCourseIds, []),
    selectedCourseIds
  );
  const selectedKitCourseIds = normalizeAddOnCourseIds(
    parseJson<unknown>(row.selectedKitCourseIds, []),
    selectedCourseIds
  );
  const selectedInstructorIdsByCourse = parseInstructorIdsByCourse(
    row.selectedInstructorIdsByCourse,
    selectedCourseIds
  );
  const instructorSelections = Object.fromEntries(
    (savedQuote?.courses || [])
      .filter((course) => course?.instructor && selectedCourseIds.includes(Number(course.courseId)))
      .map((course) => [Number(course.courseId), course.instructor])
  ) as Record<number, AcademyTalentInstructorSnapshot>;
  const liveQuote =
    savedQuote ||
    buildAcademyTalentQuote(scores, row.offerExpiresAt, courseBases, now, {
      paymentMode: normalizePaymentMode(row.paymentMode, 'THINKING'),
      depositVnd: Number(row.depositVnd) || 0,
      selectedSampleCourseIds,
      selectedKitCourseIds,
      instructorSelections,
      tiers,
    });
  const payment = toPaymentSummary(row, liveQuote);
  // An unpaid print is a provisional quote. It must keep rendering its newest
  // saved quote so a consultant can revise and reprint it. Once paid in full,
  // the immutable snapshot becomes the source of truth for audit and receipt.
  const quote = payment.status === 'PAID' && invoiceSnapshot?.quote ? invoiceSnapshot.quote : liveQuote;
  const invoiceNumber = row.invoiceNumber ? String(row.invoiceNumber) : null;
  const rawStatus = String(row.status || 'DRAFT');
  const status = ['DRAFT', 'QUOTED', 'PRINTED', 'DEPOSIT_RECEIVED', 'PAID', 'INVOICED'].includes(rawStatus)
    ? (rawStatus as AcademyTalentAssessment['status'])
    : 'DRAFT';
  return {
    id: Number(row.id),
    leadId: Number(row.leadId),
    status,
    scores,
    quote,
    selectedCourseIds,
    selectedSampleCourseIds,
    selectedKitCourseIds,
    selectedInstructorIdsByCourse,
    paymentMode: ACADEMY_TALENT_PAYMENT_MODES.includes(row.paymentMode) ? row.paymentMode : 'THINKING',
    depositVnd: Math.max(0, Math.round(Number(row.depositVnd) || 0)),
    payment,
    notes: row.notes ?? null,
    evaluator: toStaff(row.evaluator),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    invoice: invoiceNumber
      ? {
          documentNumber: invoiceNumber,
          printedAt: iso(row.invoicePrintedAt),
          printCount: Math.max(0, Math.round(Number(row.invoicePrintCount) || 0)),
          printedBy: toStaff(row.invoicePrintedBy),
          snapshot: invoiceSnapshot,
        }
      : null,
  };
}

function describeCourses(quote: AcademyTalentAssessmentQuote) {
  return quote.courses.map((course) => course.name).join(', ');
}

function assertDepositIsValid(
  paymentMode: AcademyTalentPaymentMode,
  depositVnd: number,
  quote: AcademyTalentAssessmentQuote
) {
  if (paymentMode === 'DEPOSIT' && quote.finalPriceVnd > 0 && depositVnd <= 0) {
    throw new AcademySalesError('Vui lòng nhập số tiền cọc trước khi in phiếu.');
  }
  if (depositVnd > quote.finalPriceVnd) {
    throw new AcademySalesError('Số tiền cọc không được lớn hơn học phí sau học bổng.');
  }
}

async function resolveCourseSnapshots(fastify: FastifyInstance, ids: number[]): Promise<SnapshotBase[]> {
  if (!ids.length) return [];
  const courses = await fastify.prisma.crm.crmAcademyCourse.findMany({
    where: { id: { in: ids }, isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
  if (courses.length !== ids.length) {
    throw new AcademySalesError('Một hoặc nhiều khóa học đã không còn hoạt động. Vui lòng chọn lại.');
  }
  const byId = new Map(courses.map((course) => [course.id, course]));
  return ids.map((id) => toSnapshotBase(byId.get(id)));
}

/**
 * Keep the recommendation on the server. The legacy workshop chose Combo for
 * tier 3+ and Foundation for the other outcomes; this maps that same policy to
 * the active native course catalogue, with a name fallback for migrated data.
 */
async function resolveAcademyTalentRecommendation(
  fastify: FastifyInstance,
  scores: AcademyTalentAssessmentScores,
  tiers?: readonly AcademyTalentTier[]
): Promise<Pick<QuoteOptions, 'recommendedCourseIds' | 'recommendation'>> {
  const result = calculateAcademyTalentAssessmentResult(scores, tiers);
  const isHighTier = ['level3', 'level4', 'level5', 'level6'].includes(result.tier?.key || '');
  const expectedCode = isHighTier ? 'combo' : 'basic';
  const courses = await fastify.prisma.crm.crmAcademyCourse.findMany({
    where: { isActive: true },
    select: { id: true, code: true, name: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  const fallbackName = isHighTier ? /combo|tron goi|full program/ : /basic|nen tang|foundation/;
  const recommended =
    courses.find((course) => course.code === expectedCode) ||
    courses.find((course) => fallbackName.test(removeVietnameseTones(course.name)));
  const scholarship = result.scholarshipPercent;
  const title = isHighTier
    ? scholarship >= 50
      ? `Học bổng ${scholarship}% · Combo trọn gói phù hợp nhất`
      : `${result.tier?.title || 'Tiềm năng'} · Combo trọn gói phù hợp nhất`
    : 'Khởi đầu vững chắc · Khóa nền tảng phù hợp nhất';
  const summary = isHighTier
    ? 'Kết quả thử thách phù hợp để học theo lộ trình trọn gói; bạn vẫn có thể chọn bất kỳ khóa đang hoạt động nào.'
    : 'Ưu tiên xây nền tảng kỹ thuật trước; bạn vẫn có thể chọn bất kỳ khóa đang hoạt động nào.';
  return { recommendedCourseIds: recommended ? [recommended.id] : [], recommendation: { title, summary } };
}

/**
 * Builds the exact quote shown while an evaluator is still changing a draft.
 * It deliberately shares the persisted workflow's score, catalogue,
 * recommendation, deposit and expiry primitives instead of allowing the web
 * client to infer a reward from an unsaved value.
 */
async function buildLiveAcademyTalentQuote(
  fastify: FastifyInstance,
  input: PreviewAcademyTalentAssessmentQuoteRequest,
  options: {
    source: SafeAny;
    expiresAt: Date | string;
    fallbackSelectedCourseIds: number[];
    fallbackCourseBases: SnapshotBase[];
    fallbackSelectedSampleCourseIds: number[];
    fallbackSelectedKitCourseIds: number[];
    fallbackSelectedInstructorIdsByCourse: Record<string, number>;
    fallbackPaymentMode: AcademyTalentPaymentMode;
    fallbackDepositVnd: number;
    tiers: readonly AcademyTalentTier[];
  },
  now = new Date()
): Promise<AcademyTalentAssessmentQuote> {
  const scores = toScores(options.source, input);
  const selectedCourseIds =
    input.selectedCourseIds === undefined
      ? options.fallbackSelectedCourseIds
      : normalizeCourseIds(input.selectedCourseIds);
  const courseBases =
    input.selectedCourseIds === undefined
      ? options.fallbackCourseBases
      : await resolveCourseSnapshots(fastify, selectedCourseIds);
  const selectedSampleCourseIds =
    input.selectedSampleCourseIds === undefined
      ? normalizeAddOnCourseIds(options.fallbackSelectedSampleCourseIds, selectedCourseIds)
      : normalizeAddOnCourseIds(input.selectedSampleCourseIds, selectedCourseIds);
  const selectedKitCourseIds =
    input.selectedKitCourseIds === undefined
      ? normalizeAddOnCourseIds(options.fallbackSelectedKitCourseIds, selectedCourseIds)
      : normalizeAddOnCourseIds(input.selectedKitCourseIds, selectedCourseIds);
  const selectedInstructorIdsByCourse =
    input.selectedInstructorIdsByCourse === undefined
      ? normalizeInstructorIdsByCourse(options.fallbackSelectedInstructorIdsByCourse, selectedCourseIds)
      : normalizeInstructorIdsByCourse(input.selectedInstructorIdsByCourse, selectedCourseIds);
  const instructorSelections = await resolveInstructorSelections(
    fastify,
    selectedCourseIds,
    selectedInstructorIdsByCourse
  );
  const paymentMode = normalizePaymentModeForCourses(input.paymentMode, options.fallbackPaymentMode, selectedCourseIds);
  const recommendation = await resolveAcademyTalentRecommendation(fastify, scores, options.tiers);
  const preliminaryQuote = buildAcademyTalentQuote(scores, options.expiresAt, courseBases, now, {
    ...recommendation,
    paymentMode,
    selectedSampleCourseIds,
    selectedKitCourseIds,
    instructorSelections,
    tiers: options.tiers,
  });
  const fallbackDeposit =
    paymentMode === 'DEPOSIT' && options.fallbackDepositVnd === 0
      ? preliminaryQuote.suggestedDepositVnd
      : options.fallbackDepositVnd;
  const requestedDeposit = paymentMode === 'THINKING' ? 0 : normalizeDeposit(input.depositVnd, fallbackDeposit);
  const depositVnd = paymentMode === 'FULL' ? preliminaryQuote.finalPriceVnd : requestedDeposit;
  const quote = buildAcademyTalentQuote(scores, options.expiresAt, courseBases, now, {
    ...recommendation,
    paymentMode,
    depositVnd,
    selectedSampleCourseIds,
    selectedKitCourseIds,
    instructorSelections,
    tiers: options.tiers,
  });
  assertDepositIsValid(paymentMode, depositVnd, quote);
  return quote;
}

function parseOptionalAssessmentId(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const assessmentId = Number(value);
  if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
    throw new AcademySalesError('Phiên Tố Chất ID không hợp lệ.');
  }
  return assessmentId;
}

async function readAccessibleAssessment(fastify: FastifyInstance, actor: AcademyActor, assessmentId: number) {
  const assessment = await fastify.prisma.crm.crmAcademyTalentAssessment.findUnique({
    where: { id: assessmentId },
    include: ASSESSMENT_RELATION_INCLUDE,
  });
  if (!assessment) throw new AcademySalesError('Không tìm thấy phiên Tố Chất.', 404);
  await AcademySalesService.getAccessibleLead(fastify, actor, assessment.leadId);
  return assessment;
}

export class AcademyTalentAssessmentService {
  /**
   * Finance-only view over immutable Academy invoices.  Confirmed revenue is
   * computed exclusively from the append-only payment ledger, never from an
   * invoice print or a lead's manually editable revenue field.
   */
  static async listPaymentManagement(
    fastify: FastifyInstance,
    actor: AcademyActor,
    params: ListAcademyTalentPaymentManagementParams
  ): Promise<ListAcademyTalentPaymentManagementResponse> {
    if (!isAdminOrSuperAdminRole(actor.role) && actor.role !== 'manager') {
      throw new AcademySalesError('Chỉ Admin hoặc Quản lý được xem quản lý thu học phí Academy.', 403);
    }
    const page = Math.max(1, toNonNegativeInteger(params.page, 1, 100000, 'Trang'));
    const limit = Math.max(1, toNonNegativeInteger(params.limit, 20, 100, 'Số dòng mỗi trang'));
    const selectedStatus = String(params.status || 'ALL')
      .trim()
      .toUpperCase() as AcademyTalentPaymentManagementStatus;
    const acceptedStatuses: readonly AcademyTalentPaymentManagementStatus[] = [
      'ALL',
      'FOLLOW_UP',
      'UNPAID',
      'PARTIALLY_PAID',
      'DEPOSIT_RECEIVED',
      'PAID',
    ];
    if (!acceptedStatuses.includes(selectedStatus)) {
      throw new AcademySalesError('Bộ lọc trạng thái thu học phí không hợp lệ.');
    }
    const { month, start, end } = getAcademyIctMonthBounds(params.month);
    const sourceRows = await fastify.prisma.crm.crmAcademyTalentAssessment.findMany({
      where: { invoiceNumber: { not: null } },
      include: {
        lead: { select: { id: true, name: true, phone: true } },
        payments: {
          include: { confirmedBy: { select: { id: true, displayName: true, email: true } } },
          orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        },
      },
      orderBy: [{ invoicePrintedAt: 'desc' }, { id: 'desc' }],
    });
    const rows = sourceRows
      .map(toPaymentManagementRow)
      .filter((row): row is AcademyTalentPaymentManagementRow => Boolean(row));
    const normalizedSearch = removeVietnameseTones(String(params.search || ''));
    const filteredRows = rows.filter((row) => {
      if (!matchesPaymentManagementStatus(row, selectedStatus)) return false;
      if (!normalizedSearch) return true;
      return removeVietnameseTones(
        `${row.lead.name} ${row.lead.phone || ''} ${row.invoiceNumber} ${row.courseLabel}`
      ).includes(normalizedSearch);
    });
    const total = filteredRows.length;
    const startIndex = (page - 1) * limit;
    return {
      data: filteredRows.slice(startIndex, startIndex + limit),
      total,
      page,
      limit,
      // KPI remains a month-level accounting view. It must not disappear just
      // because the operator narrows the table to the follow-up queue.
      summary: paymentManagementSummary(rows, month, start, end),
    };
  }

  /**
   * Returns a single, auditable tuition trail. The list endpoint stays lean;
   * this detail endpoint keeps every learner, actor, promotion snapshot and
   * append-only activity available for finance review and future reporting.
   */
  static async getPaymentTrace(
    fastify: FastifyInstance,
    actor: AcademyActor,
    assessmentId: number
  ): Promise<AcademyTalentPaymentTraceResponse> {
    if (!isAdminOrSuperAdminRole(actor.role) && actor.role !== 'manager') {
      throw new AcademySalesError('Chỉ Admin hoặc Quản lý được xem truy vết thu học phí Academy.', 403);
    }
    const assessment = await fastify.prisma.crm.crmAcademyTalentAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        ...ASSESSMENT_RELATION_INCLUDE,
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            source: true,
            createdAt: true,
            owner: { select: { id: true, displayName: true, email: true } },
            createdBy: { select: { id: true, displayName: true, email: true } },
          },
        },
        promotionPolicyAudit: {
          include: { changedBy: { select: { id: true, displayName: true, email: true } } },
        },
      },
    });
    if (!assessment) throw new AcademySalesError('Không tìm thấy phiếu học phí Academy.', 404);
    await AcademySalesService.getAccessibleLead(fastify, actor, assessment.leadId);
    const activities = await fastify.prisma.crm.crmAcademyLeadActivity.findMany({
      where: {
        leadId: assessment.leadId,
        activityType: { in: ['TALENT_ASSESSMENT', 'INVOICE_PRINTED', 'PAYMENT_RECEIVED'] },
      },
      include: { actor: { select: { id: true, displayName: true, email: true } } },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
    });
    const assessmentActivities = activities.filter((activity) => {
      const metadata = parseJson<SafeAny>(activity.metadata, {});
      return Math.round(Number(metadata.assessmentId) || 0) === assessmentId;
    });
    return { data: toPaymentTrace(assessment, assessmentActivities) };
  }

  static async listInstructors(fastify: FastifyInstance): Promise<ListAcademyTalentInstructorsResponse> {
    const rows = await fastify.prisma.crm.crmAcademyInstructor.findMany({
      where: { isActive: true },
      include: { staff: { select: { avatarUrl: true } } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return { data: rows.map(toInstructor) };
  }

  /** Manager configuration includes inactive profiles; workshop pickers only use `listInstructors`. */
  static async listInstructorConfigurations(fastify: FastifyInstance): Promise<ListAcademyTalentInstructorsResponse> {
    const rows = await fastify.prisma.crm.crmAcademyInstructor.findMany({
      include: { staff: { select: { avatarUrl: true } } },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return { data: rows.map(toInstructor) };
  }

  static async createInstructor(
    fastify: FastifyInstance,
    input: UpsertAcademyTalentInstructorRequest
  ): Promise<AcademyTalentInstructorActionResponse> {
    const config = normalizeInstructorConfiguration(input);
    if (config.code === 'auto') {
      throw new AcademySalesError('Không thể tạo thêm cấu hình phân bổ tự động.', 409);
    }
    await this.assertInstructorConfigurationAvailable(fastify, config);
    const row = await fastify.prisma.crm.crmAcademyInstructor.create({
      data: config,
      include: { staff: { select: { avatarUrl: true } } },
    });
    return { success: true, data: toInstructor(row), message: 'Đã thêm giảng viên Academy.' };
  }

  static async updateInstructor(
    fastify: FastifyInstance,
    instructorId: number,
    input: UpsertAcademyTalentInstructorRequest
  ): Promise<AcademyTalentInstructorActionResponse> {
    const existing = await fastify.prisma.crm.crmAcademyInstructor.findUnique({ where: { id: instructorId } });
    if (!existing) throw new AcademySalesError('Không tìm thấy giảng viên Academy.', 404);
    const config = normalizeInstructorConfiguration(input);
    if (existing.code === 'auto' && (config.code !== 'auto' || config.surchargePercent !== 0 || !config.isActive)) {
      throw new AcademySalesError('Phân bổ tự động luôn phải hoạt động và miễn phí.', 400);
    }
    await this.assertInstructorConfigurationAvailable(fastify, config, existing.id);
    const row = await fastify.prisma.crm.crmAcademyInstructor.update({
      where: { id: existing.id },
      data: config,
      include: { staff: { select: { avatarUrl: true } } },
    });
    return { success: true, data: toInstructor(row), message: 'Đã cập nhật giảng viên Academy.' };
  }

  private static async assertInstructorConfigurationAvailable(
    fastify: FastifyInstance,
    config: ReturnType<typeof normalizeInstructorConfiguration>,
    currentId?: number
  ) {
    const codeTaken = await fastify.prisma.crm.crmAcademyInstructor.findFirst({
      where: currentId ? { code: config.code, NOT: { id: currentId } } : { code: config.code },
      select: { id: true },
    });
    if (codeTaken) throw new AcademySalesError('Mã giảng viên Academy đã tồn tại.', 409);
    if (config.staffId !== null) {
      const [staff, profileTaken] = await Promise.all([
        fastify.prisma.crm.crmStaff.findFirst({ where: { id: config.staffId, isActive: true }, select: { id: true } }),
        fastify.prisma.crm.crmAcademyInstructor.findFirst({
          where: currentId ? { staffId: config.staffId, NOT: { id: currentId } } : { staffId: config.staffId },
          select: { id: true },
        }),
      ]);
      if (!staff) throw new AcademySalesError('Nhân sự được chọn không còn hoạt động.', 400);
      if (profileTaken) throw new AcademySalesError('Nhân sự này đã có hồ sơ giảng viên Academy.', 409);
    }
  }

  static async listForLead(
    fastify: FastifyInstance,
    actor: AcademyActor,
    leadId: number
  ): Promise<ListAcademyTalentAssessmentsResponse> {
    await AcademySalesService.getAccessibleLead(fastify, actor, leadId);
    const rows = await fastify.prisma.crm.crmAcademyTalentAssessment.findMany({
      where: { leadId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: ASSESSMENT_RELATION_INCLUDE,
    });
    const tiers = await AcademyTalentLadderConfigurationService.getCalculationTiers(fastify);
    const data = rows.map((row) => toAssessment(row, new Date(), tiers));
    return { data, latest: data[0] ?? null };
  }

  /**
   * Preview an unsaved workshop draft without producing an activity, changing
   * the lead, or replacing a persisted quote. The lead/session scope is still
   * enforced because quote data includes Academy tuition catalogue details.
   */
  static async previewQuote(
    fastify: FastifyInstance,
    actor: AcademyActor,
    leadId: number,
    input: PreviewAcademyTalentAssessmentQuoteRequest = {}
  ): Promise<PreviewAcademyTalentAssessmentQuoteResponse> {
    const assessmentId = parseOptionalAssessmentId(input.assessmentId);
    const existing = assessmentId === null ? null : await readAccessibleAssessment(fastify, actor, assessmentId);
    if (existing && Number(existing.leadId) !== leadId) {
      throw new AcademySalesError('Phiên Tố Chất không thuộc lead Academy này.', 404);
    }
    if (existing && isFullyPaid(existing)) {
      throw new AcademySalesError('Phiếu học phí đã thanh toán đủ và được khóa để giữ đúng đối soát.', 409);
    }
    if (!existing) await AcademySalesService.getAccessibleLead(fastify, actor, leadId);

    const now = new Date();
    const previousSelectedCourseIds = existing
      ? normalizeCourseIds(parseJson<unknown>(existing.selectedCourseIds, []))
      : [];
    const previousSelectedSampleCourseIds = existing
      ? normalizeAddOnCourseIds(parseJson<unknown>(existing.selectedSampleCourseIds, []), previousSelectedCourseIds)
      : [];
    const previousSelectedKitCourseIds = existing
      ? normalizeAddOnCourseIds(parseJson<unknown>(existing.selectedKitCourseIds, []), previousSelectedCourseIds)
      : [];
    const previousSelectedInstructorIdsByCourse = existing
      ? parseInstructorIdsByCourse(existing.selectedInstructorIdsByCourse, previousSelectedCourseIds)
      : {};
    const tiers = await AcademyTalentLadderConfigurationService.getCalculationTiers(fastify);
    const quote = await buildLiveAcademyTalentQuote(
      fastify,
      input,
      {
        source: existing || {},
        expiresAt: existing?.offerExpiresAt || offerExpiry(now),
        fallbackSelectedCourseIds: previousSelectedCourseIds,
        fallbackCourseBases: existing
          ? normalizeSnapshotBases(parseJson<unknown>(existing.courseSnapshotJson, []))
          : [],
        fallbackSelectedSampleCourseIds: previousSelectedSampleCourseIds,
        fallbackSelectedKitCourseIds: previousSelectedKitCourseIds,
        fallbackSelectedInstructorIdsByCourse: previousSelectedInstructorIdsByCourse,
        fallbackPaymentMode: normalizePaymentMode(existing?.paymentMode, 'THINKING'),
        fallbackDepositVnd: Math.max(0, Math.round(Number(existing?.depositVnd) || 0)),
        tiers,
      },
      now
    );
    return { data: quote };
  }

  static async create(
    fastify: FastifyInstance,
    actor: AcademyActor,
    leadId: number,
    input: CreateAcademyTalentAssessmentRequest = {}
  ): Promise<AcademyTalentAssessmentActionResponse> {
    await AcademySalesService.getAccessibleLead(fastify, actor, leadId);
    const workshopParticipantId = await resolveWorkshopParticipantAttribution(
      fastify,
      leadId,
      input.workshopParticipantId
    );
    const now = new Date();
    const scores = toScores({}, input);
    const selectedCourseIds = normalizeCourseIds(input.selectedCourseIds);
    const selectedSampleCourseIds = normalizeAddOnCourseIds(input.selectedSampleCourseIds, selectedCourseIds);
    const selectedKitCourseIds = normalizeAddOnCourseIds(input.selectedKitCourseIds, selectedCourseIds);
    const selectedInstructorIdsByCourse = normalizeInstructorIdsByCourse(
      input.selectedInstructorIdsByCourse,
      selectedCourseIds
    );
    const courseBases = await resolveCourseSnapshots(fastify, selectedCourseIds);
    const instructorSelections = await resolveInstructorSelections(
      fastify,
      selectedCourseIds,
      selectedInstructorIdsByCourse
    );
    const paymentMode = normalizePaymentModeForCourses(input.paymentMode, 'THINKING', selectedCourseIds);
    const expiry = offerExpiry(now);
    const promotionPolicy = await AcademyTalentLadderConfigurationService.getCalculationPolicy(fastify);
    const tiers = promotionPolicy.tiers;
    const recommendation = await resolveAcademyTalentRecommendation(fastify, scores, tiers);
    const preliminaryQuote = buildAcademyTalentQuote(scores, expiry, courseBases, now, {
      ...recommendation,
      paymentMode,
      selectedSampleCourseIds,
      selectedKitCourseIds,
      instructorSelections,
      tiers,
    });
    const requestedDeposit =
      paymentMode === 'THINKING'
        ? 0
        : normalizeDeposit(input.depositVnd, paymentMode === 'DEPOSIT' ? preliminaryQuote.suggestedDepositVnd : 0);
    const depositVnd = paymentMode === 'FULL' ? preliminaryQuote.finalPriceVnd : requestedDeposit;
    const quote = buildAcademyTalentQuote(scores, expiry, courseBases, now, {
      ...recommendation,
      paymentMode,
      depositVnd,
      selectedSampleCourseIds,
      selectedKitCourseIds,
      instructorSelections,
      tiers,
    });
    assertDepositIsValid(paymentMode, depositVnd, quote);
    const status = selectedCourseIds.length ? 'QUOTED' : 'DRAFT';

    const row = await fastify.prisma.crm.$transaction(async (tx) => {
      const created = await tx.crmAcademyTalentAssessment.create({
        data: {
          leadId,
          workshopParticipantId,
          evaluatorStaffId: actor.id,
          status,
          ...scores,
          offerExpiresAt: expiry,
          selectedCourseIds: JSON.stringify(selectedCourseIds),
          selectedSampleCourseIds: JSON.stringify(selectedSampleCourseIds),
          selectedKitCourseIds: JSON.stringify(selectedKitCourseIds),
          selectedInstructorIdsByCourse: JSON.stringify(selectedInstructorIdsByCourse),
          courseSnapshotJson: JSON.stringify(courseBases),
          quoteSnapshotJson: JSON.stringify(quote),
          promotionPolicyAuditId: promotionPolicy.auditId,
          paymentMode,
          depositVnd,
          notes: input.notes?.trim() || null,
        },
        include: ASSESSMENT_RELATION_INCLUDE,
      });
      await tx.crmAcademyLeadActivity.create({
        data: {
          leadId,
          activityType: 'TALENT_ASSESSMENT',
          content: 'Tạo phiên đánh giá Tố Chất.',
          metadata: JSON.stringify({
            assessmentId: created.id,
            action: 'created',
            scores,
            selectedCourseIds,
            selectedSampleCourseIds,
            selectedKitCourseIds,
            selectedInstructorIdsByCourse,
            quote,
          }),
          actorStaffId: actor.id,
          occurredAt: now,
        },
      });
      return created;
    });
    return { success: true, data: toAssessment(row, now, tiers), message: 'Đã tạo phiên Tố Chất.' };
  }

  static async update(
    fastify: FastifyInstance,
    actor: AcademyActor,
    assessmentId: number,
    input: UpdateAcademyTalentAssessmentRequest
  ): Promise<AcademyTalentAssessmentActionResponse> {
    const existing = await readAccessibleAssessment(fastify, actor, assessmentId);
    if (input.workshopParticipantId !== undefined) {
      const requestedParticipantId = await resolveWorkshopParticipantAttribution(
        fastify,
        existing.leadId,
        input.workshopParticipantId
      );
      if ((existing.workshopParticipantId ?? null) !== requestedParticipantId) {
        throw new AcademySalesError('Không thể đổi workshop attribution của phiên Tố Chất đã tạo.', 409);
      }
    }
    if (isFullyPaid(existing)) {
      throw new AcademySalesError('Phiếu học phí đã thanh toán đủ và được khóa để giữ đúng đối soát.', 409);
    }
    const now = new Date();
    const scores = toScores(existing, input);
    const previousCourseIds = normalizeCourseIds(parseJson<unknown>(existing.selectedCourseIds, []));
    const selectedCourseIds =
      input.selectedCourseIds === undefined ? previousCourseIds : normalizeCourseIds(input.selectedCourseIds);
    const previousSelectedSampleCourseIds = normalizeAddOnCourseIds(
      parseJson<unknown>(existing.selectedSampleCourseIds, []),
      previousCourseIds
    );
    const previousSelectedKitCourseIds = normalizeAddOnCourseIds(
      parseJson<unknown>(existing.selectedKitCourseIds, []),
      previousCourseIds
    );
    const previousSelectedInstructorIdsByCourse = parseInstructorIdsByCourse(
      existing.selectedInstructorIdsByCourse,
      previousCourseIds
    );
    const selectedSampleCourseIds =
      input.selectedSampleCourseIds === undefined
        ? input.selectedCourseIds === undefined
          ? previousSelectedSampleCourseIds
          : []
        : normalizeAddOnCourseIds(input.selectedSampleCourseIds, selectedCourseIds);
    const selectedKitCourseIds =
      input.selectedKitCourseIds === undefined
        ? input.selectedCourseIds === undefined
          ? previousSelectedKitCourseIds
          : []
        : normalizeAddOnCourseIds(input.selectedKitCourseIds, selectedCourseIds);
    const selectedInstructorIdsByCourse =
      input.selectedInstructorIdsByCourse === undefined
        ? input.selectedCourseIds === undefined
          ? normalizeInstructorIdsByCourse(previousSelectedInstructorIdsByCourse, selectedCourseIds)
          : {}
        : normalizeInstructorIdsByCourse(input.selectedInstructorIdsByCourse, selectedCourseIds);
    const courseBases =
      input.selectedCourseIds === undefined
        ? normalizeSnapshotBases(parseJson<unknown>(existing.courseSnapshotJson, []))
        : await resolveCourseSnapshots(fastify, selectedCourseIds);
    const instructorSelections = await resolveInstructorSelections(
      fastify,
      selectedCourseIds,
      selectedInstructorIdsByCourse
    );
    const paymentMode = normalizePaymentModeForCourses(
      input.paymentMode,
      normalizePaymentMode(existing.paymentMode, 'THINKING'),
      selectedCourseIds
    );
    const promotionPolicy = await AcademyTalentLadderConfigurationService.getCalculationPolicy(fastify);
    const tiers = promotionPolicy.tiers;
    const recommendation = await resolveAcademyTalentRecommendation(fastify, scores, tiers);
    const preliminaryQuote = buildAcademyTalentQuote(scores, existing.offerExpiresAt, courseBases, now, {
      ...recommendation,
      paymentMode,
      selectedSampleCourseIds,
      selectedKitCourseIds,
      instructorSelections,
      tiers,
    });
    const existingDeposit = Math.max(0, Math.round(Number(existing.depositVnd) || 0));
    const requestedDeposit =
      paymentMode === 'THINKING'
        ? 0
        : normalizeDeposit(
            input.depositVnd,
            paymentMode === 'DEPOSIT' && existingDeposit === 0 ? preliminaryQuote.suggestedDepositVnd : existingDeposit
          );
    const depositVnd = paymentMode === 'FULL' ? preliminaryQuote.finalPriceVnd : requestedDeposit;
    const quote = buildAcademyTalentQuote(scores, existing.offerExpiresAt, courseBases, now, {
      ...recommendation,
      paymentMode,
      depositVnd,
      selectedSampleCourseIds,
      selectedKitCourseIds,
      instructorSelections,
      tiers,
    });
    assertDepositIsValid(paymentMode, depositVnd, quote);
    const confirmedPaidVnd = (Array.isArray(existing.payments) ? existing.payments : []).reduce(
      (sum: number, payment: SafeAny) => sum + Math.max(0, Math.round(Number(payment.amountVnd) || 0)),
      0
    );
    if (confirmedPaidVnd > quote.finalPriceVnd) {
      throw new AcademySalesError('Không thể điều chỉnh học phí thấp hơn số tiền đã xác nhận nhận được.', 409);
    }
    const notes = input.notes === undefined ? existing.notes : input.notes?.trim() || null;
    const status = selectedCourseIds.length ? 'QUOTED' : 'DRAFT';

    const row = await fastify.prisma.crm.$transaction(async (tx) => {
      const updated = await tx.crmAcademyTalentAssessment.update({
        where: { id: assessmentId },
        data: {
          status,
          ...scores,
          selectedCourseIds: JSON.stringify(selectedCourseIds),
          selectedSampleCourseIds: JSON.stringify(selectedSampleCourseIds),
          selectedKitCourseIds: JSON.stringify(selectedKitCourseIds),
          selectedInstructorIdsByCourse: JSON.stringify(selectedInstructorIdsByCourse),
          courseSnapshotJson: JSON.stringify(courseBases),
          quoteSnapshotJson: JSON.stringify(quote),
          promotionPolicyAuditId: promotionPolicy.auditId,
          paymentMode,
          depositVnd,
          notes,
        },
        include: ASSESSMENT_RELATION_INCLUDE,
      });
      await tx.crmAcademyLeadActivity.create({
        data: {
          leadId: existing.leadId,
          activityType: 'TALENT_ASSESSMENT',
          content:
            selectedCourseIds.join(',') !== previousCourseIds.join(',')
              ? `Cập nhật Tố Chất và chọn khóa: ${describeCourses(quote) || 'chưa chọn'}.`
              : 'Cập nhật điểm đánh giá Tố Chất.',
          metadata: JSON.stringify({
            assessmentId,
            action: 'updated',
            scores,
            previousCourseIds,
            selectedCourseIds,
            selectedSampleCourseIds,
            selectedKitCourseIds,
            selectedInstructorIdsByCourse,
            paymentMode,
            depositVnd,
            quote,
          }),
          actorStaffId: actor.id,
          occurredAt: now,
        },
      });
      return updated;
    });
    return { success: true, data: toAssessment(row, now, tiers), message: 'Đã lưu đánh giá và báo giá Tố Chất.' };
  }

  static async printInvoice(
    fastify: FastifyInstance,
    actor: AcademyActor,
    assessmentId: number
  ): Promise<AcademyTalentAssessmentActionResponse> {
    const existing = await readAccessibleAssessment(fastify, actor, assessmentId);
    const now = new Date();
    const promotionPolicy = await AcademyTalentLadderConfigurationService.getCalculationPolicy(fastify);
    const tiers = promotionPolicy.tiers;
    const previousInvoice = parseJson<AcademyTalentInvoiceSnapshot | null>(existing.invoiceSnapshotJson, null);
    if (isFullyPaid(existing)) {
      if (!previousInvoice) throw new AcademySalesError('Thiếu bản chốt của phiếu đã thanh toán.', 409);
      const row = await fastify.prisma.crm.$transaction(async (tx) => {
        const updated = await tx.crmAcademyTalentAssessment.update({
          where: { id: assessmentId },
          data: {
            invoicePrintedAt: now,
            invoicePrintedByStaffId: actor.id,
            invoicePrintCount: { increment: 1 },
          },
          include: ASSESSMENT_RELATION_INCLUDE,
        });
        await tx.crmAcademyLeadActivity.create({
          data: {
            leadId: existing.leadId,
            activityType: 'INVOICE_PRINTED',
            content: `In lại phiếu đã thanh toán ${previousInvoice.documentNumber}.`,
            metadata: JSON.stringify({
              assessmentId,
              documentNumber: previousInvoice.documentNumber,
              reprint: true,
              paymentLocked: true,
            }),
            actorStaffId: actor.id,
            occurredAt: now,
          },
        });
        return updated;
      });
      return { success: true, data: toAssessment(row, now, tiers), message: 'Đã chuẩn bị lại phiếu đã thanh toán.' };
    }

    const courseBases = normalizeSnapshotBases(parseJson<unknown>(existing.courseSnapshotJson, []));
    if (!courseBases.length) throw new AcademySalesError('Vui lòng chọn ít nhất một khóa học trước khi in phiếu.');
    const paymentMode = normalizePaymentMode(existing.paymentMode, 'THINKING');
    if (paymentMode === 'THINKING') {
      throw new AcademySalesError('Vui lòng chọn hình thức thanh toán trước khi in phiếu.');
    }
    const scores = toScores(existing);
    const selectedCourseIds = normalizeCourseIds(parseJson<unknown>(existing.selectedCourseIds, []));
    const selectedSampleCourseIds = normalizeAddOnCourseIds(
      parseJson<unknown>(existing.selectedSampleCourseIds, []),
      selectedCourseIds
    );
    const selectedKitCourseIds = normalizeAddOnCourseIds(
      parseJson<unknown>(existing.selectedKitCourseIds, []),
      selectedCourseIds
    );
    const selectedInstructorIdsByCourse = parseInstructorIdsByCourse(
      existing.selectedInstructorIdsByCourse,
      selectedCourseIds
    );
    const savedQuote = parseJson<AcademyTalentAssessmentQuote | null>(existing.quoteSnapshotJson, null);
    const recommendation = savedQuote?.recommendedCourseIds?.length
      ? { recommendedCourseIds: savedQuote.recommendedCourseIds, recommendation: savedQuote.recommendation }
      : await resolveAcademyTalentRecommendation(fastify, scores, tiers);
    const savedInstructorSelections = Object.fromEntries(
      (savedQuote?.courses || [])
        .filter((course) => course?.instructor && selectedCourseIds.includes(Number(course.courseId)))
        .map((course) => [Number(course.courseId), course.instructor])
    ) as Record<number, AcademyTalentInstructorSnapshot>;
    const instructorSelections = Object.keys(savedInstructorSelections).length
      ? savedInstructorSelections
      : await resolveInstructorSelections(fastify, selectedCourseIds, selectedInstructorIdsByCourse);
    const preliminaryQuote = buildAcademyTalentQuote(scores, existing.offerExpiresAt, courseBases, now, {
      ...recommendation,
      paymentMode,
      selectedSampleCourseIds,
      selectedKitCourseIds,
      instructorSelections,
      tiers,
    });
    const depositVnd =
      paymentMode === 'FULL'
        ? preliminaryQuote.finalPriceVnd
        : Math.max(0, Math.round(Number(existing.depositVnd) || preliminaryQuote.suggestedDepositVnd));
    const quote = buildAcademyTalentQuote(scores, existing.offerExpiresAt, courseBases, now, {
      ...recommendation,
      paymentMode,
      depositVnd,
      selectedSampleCourseIds,
      selectedKitCourseIds,
      instructorSelections,
      tiers,
    });
    assertDepositIsValid(paymentMode, depositVnd, quote);
    const payment = toPaymentSummary(existing, quote);
    if (payment.totalPaidVnd > quote.finalPriceVnd) {
      throw new AcademySalesError('Không thể in phiếu có học phí thấp hơn số tiền đã xác nhận.', 409);
    }
    const revision = Math.max(0, Math.round(Number(existing.invoiceRevision) || 0)) + 1;
    const documentBase = `WA-${formatIctDate(now)}-${String(assessmentId).padStart(6, '0')}`;
    const documentNumber = revision > 1 ? `${documentBase}-R${revision}` : documentBase;
    const snapshot: AcademyTalentInvoiceSnapshot = {
      documentNumber,
      paymentMode,
      depositVnd,
      quote,
      issuedAt: now.toISOString(),
    };
    const nextStatus = payment.status === 'DEPOSIT_RECEIVED' ? 'DEPOSIT_RECEIVED' : 'PRINTED';
    const row = await fastify.prisma.crm.$transaction(async (tx) => {
      const updated = await tx.crmAcademyTalentAssessment.update({
        where: { id: assessmentId },
        data: {
          status: nextStatus,
          paymentMode,
          depositVnd,
          invoiceNumber: documentNumber,
          invoiceRevision: revision,
          promotionPolicyAuditId: promotionPolicy.auditId,
          invoiceSnapshotJson: JSON.stringify(snapshot),
          invoicePrintedAt: now,
          invoicePrintedByStaffId: actor.id,
          invoicePrintCount: { increment: 1 },
        },
        include: ASSESSMENT_RELATION_INCLUDE,
      });
      // Do not mark a lead WON or write revenue here. A printed document is
      // payment intent; cash only becomes confirmed through recordPayment.
      await tx.crmAcademyLead.update({
        where: { id: existing.leadId },
        data: { course: describeCourses(quote) || null },
      });
      await tx.crmAcademyLeadActivity.create({
        data: {
          leadId: existing.leadId,
          activityType: 'INVOICE_PRINTED',
          content: previousInvoice
            ? `In phiên bản điều chỉnh ${documentNumber} thay cho ${previousInvoice.documentNumber}.`
            : `In phiếu học phí ${documentNumber} — ${describeCourses(quote)}.`,
          metadata: JSON.stringify({
            assessmentId,
            documentNumber,
            revision,
            previousDocumentNumber: previousInvoice?.documentNumber ?? null,
            paymentMode,
            depositVnd,
            quote,
          }),
          actorStaffId: actor.id,
          occurredAt: now,
        },
      });
      return updated;
    });
    return {
      success: true,
      data: toAssessment(row, now, tiers),
      message: previousInvoice
        ? 'Đã chuẩn bị phiên bản điều chỉnh của phiếu để in.'
        : 'Đã chuẩn bị phiếu học phí để in.',
    };
  }

  static async recordPayment(
    fastify: FastifyInstance,
    actor: AcademyActor,
    assessmentId: number,
    input: RecordAcademyTalentPaymentRequest
  ): Promise<AcademyTalentAssessmentActionResponse> {
    const existing = await readAccessibleAssessment(fastify, actor, assessmentId);
    if (!existing.invoiceSnapshotJson) {
      throw new AcademySalesError('Cần in phiếu trước khi xác nhận tiền đã nhận.', 409);
    }
    if (isFullyPaid(existing)) {
      throw new AcademySalesError('Phiếu này đã thanh toán đủ; không thể ghi thêm tiền.', 409);
    }
    const savedQuote = parseJson<AcademyTalentAssessmentQuote | null>(existing.quoteSnapshotJson, null);
    const invoiceSnapshot = parseJson<AcademyTalentInvoiceSnapshot | null>(existing.invoiceSnapshotJson, null);
    const quote = savedQuote || invoiceSnapshot?.quote;
    if (!quote || quote.finalPriceVnd <= 0) throw new AcademySalesError('Không xác định được học phí của phiếu.', 409);
    const amountVnd = Math.round(Number(input.amountVnd));
    if (!Number.isInteger(amountVnd) || amountVnd <= 0) {
      throw new AcademySalesError('Số tiền xác nhận phải là VND nguyên dương.');
    }
    const paymentBefore = toPaymentSummary(existing, quote);
    if (amountVnd > paymentBefore.remainingVnd) {
      throw new AcademySalesError(
        `Số tiền xác nhận vượt quá phần còn lại ${paymentBefore.remainingVnd.toLocaleString('vi-VN')} đ.`,
        409
      );
    }
    const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();
    if (!Number.isFinite(receivedAt.getTime())) throw new AcademySalesError('Thời điểm nhận tiền không hợp lệ.');
    const reference = input.reference?.trim().slice(0, 160) || null;
    const note = input.note?.trim() || null;
    const method = normalizePaymentMethod(input.method);
    const totalAfterVnd = paymentBefore.totalPaidVnd + amountVnd;
    const paymentMode = normalizePaymentMode(existing.paymentMode, 'THINKING');
    const requiredDepositVnd = Math.max(0, Math.round(Number(existing.depositVnd) || quote.suggestedDepositVnd || 0));
    const paymentStatus = calculateAcademyTalentPaymentStatus(
      paymentMode,
      totalAfterVnd,
      quote.finalPriceVnd,
      requiredDepositVnd
    );
    const nextStatus =
      paymentStatus === 'PAID' ? 'PAID' : paymentStatus === 'DEPOSIT_RECEIVED' ? 'DEPOSIT_RECEIVED' : 'PRINTED';
    const tiers = await AcademyTalentLadderConfigurationService.getCalculationTiers(fastify);
    const row = await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmAcademyTalentPayment.create({
        data: {
          assessmentId,
          amountVnd,
          paymentMethod: method,
          reference,
          note,
          receivedAt,
          confirmedByStaffId: actor.id,
        },
      });
      const updated = await tx.crmAcademyTalentAssessment.update({
        where: { id: assessmentId },
        data: { status: nextStatus },
        include: ASSESSMENT_RELATION_INCLUDE,
      });
      await tx.crmAcademyLeadActivity.create({
        data: {
          leadId: existing.leadId,
          activityType: 'PAYMENT_RECEIVED',
          content:
            nextStatus === 'PAID'
              ? `Xác nhận đã thu đủ ${quote.finalPriceVnd.toLocaleString('vi-VN')} đ cho phiếu ${existing.invoiceNumber} qua ${method === 'CASH' ? 'tiền mặt' : 'chuyển khoản'}.`
              : `Xác nhận đã nhận ${amountVnd.toLocaleString('vi-VN')} đ qua ${method === 'CASH' ? 'tiền mặt' : 'chuyển khoản'} cho phiếu ${existing.invoiceNumber}; cần follow-up phần còn lại.`,
          metadata: JSON.stringify({
            assessmentId,
            invoiceNumber: existing.invoiceNumber,
            amountVnd,
            method,
            totalAfterVnd,
            remainingVnd: Math.max(0, quote.finalPriceVnd - totalAfterVnd),
            reference,
            note,
            receivedAt: receivedAt.toISOString(),
          }),
          actorStaffId: actor.id,
          occurredAt: new Date(),
        },
      });
      return updated;
    });
    await AcademyWorkshopBonusService.reconcileForAssessment(fastify, assessmentId);
    return {
      success: true,
      data: toAssessment(row, new Date(), tiers),
      message:
        nextStatus === 'PAID'
          ? 'Đã xác nhận thanh toán đủ; phiếu đã được khóa.'
          : 'Đã xác nhận tiền nhận được. Hãy tiếp tục follow-up phần còn lại.',
    };
  }
}

// Keep score field names visible to coverage-oriented unit tests and future
// form validation changes without allowing callers to mutate the list.
export const ACADEMY_TALENT_SCORE_FIELDS = SCORE_KEYS;
