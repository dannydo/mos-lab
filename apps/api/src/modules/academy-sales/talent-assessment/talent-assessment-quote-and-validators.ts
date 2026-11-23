import {
  ACADEMY_TALENT_PAYMENT_MODES,
  ACADEMY_TALENT_STRANDS_5_MIN_MAX,
  calculateAcademyTalentAssessmentResult,
  isAcademyBuomCourse,
  isAcademyBuomUnlocked,
  type AcademyTalentAddOnSnapshot,
  type AcademyTalentAssessmentQuote,
  type AcademyTalentAssessmentScores,
  type AcademyTalentCourseSnapshot,
  type AcademyTalentInstructor,
  type AcademyTalentInstructorSnapshot,
  type AcademyTalentPaymentMethod,
  type AcademyTalentPaymentMode,
  type AcademyTalentPaymentStatus,
  type AcademyTalentTier,
  type SafeAny,
  type UpsertAcademyTalentInstructorRequest,
} from '@mos-lab/shared';
import { AcademySalesError, getAcademyIctDayBounds } from '../academy-sales.service.js';

export const DEFAULT_DEPOSIT_VND = 1_000_000;
export const MAX_ERROR_COUNT = 99;
export const SCORE_KEYS = [
  'eyeScore',
  'handScore',
  'strands5Min',
  'errorRoot',
  'errorSkin',
  'errorStickies',
  'errorDirection',
] as const;

export type SnapshotBase = Omit<
  AcademyTalentCourseSnapshot,
  'scholarshipPercent' | 'scholarshipVnd' | 'finalPriceVnd' | 'instructor' | 'instructorSurchargeVnd'
>;

export type QuoteOptions = {
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

export const FALLBACK_AUTO_INSTRUCTOR: AcademyTalentInstructorSnapshot = {
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

export const ASSESSMENT_RELATION_INCLUDE = {
  evaluator: { select: { id: true, displayName: true, email: true } },
  invoicePrintedBy: { select: { id: true, displayName: true, email: true } },
  payments: {
    include: { confirmedBy: { select: { id: true, displayName: true, email: true } } },
    orderBy: [{ receivedAt: 'desc' as const }, { id: 'desc' as const }],
  },
};

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export function toNonNegativeInteger(value: unknown, fallback: number, maximum: number, label: string): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0 || parsed > maximum) {
    throw new AcademySalesError(`${label} phải là số nguyên từ 0 đến ${maximum}.`);
  }
  return parsed;
}

export function normalizeCourseIds(value: unknown): number[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new AcademySalesError('Danh sách khóa học không hợp lệ.');
  const ids = Array.from(
    new Set(value.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0))
  );
  if (ids.length !== value.length) throw new AcademySalesError('Danh sách khóa học có mã không hợp lệ.');
  return ids.sort((left, right) => left - right);
}

export function normalizeInstructorIdsByCourse(value: unknown, selectedCourseIds: number[]): Record<string, number> {
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

export function parseInstructorIdsByCourse(
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
export function normalizeAddOnCourseIds(value: unknown, selectedCourseIds: number[]): number[] {
  const ids = normalizeCourseIds(value);
  const selected = new Set(selectedCourseIds);
  if (ids.some((id) => !selected.has(id))) {
    throw new AcademySalesError('Mẫu hoặc đồ nghề phải thuộc khóa học đã chọn.');
  }
  return ids;
}

export function normalizePaymentMode(value: unknown, fallback: AcademyTalentPaymentMode): AcademyTalentPaymentMode {
  if (value === undefined) return fallback;
  const mode = String(value || '')
    .trim()
    .toUpperCase() as AcademyTalentPaymentMode;
  if (!ACADEMY_TALENT_PAYMENT_MODES.includes(mode)) throw new AcademySalesError('Hình thức thanh toán không hợp lệ.');
  return mode;
}

export function normalizePaymentMethod(value: unknown): AcademyTalentPaymentMethod {
  return String(value || '')
    .trim()
    .toUpperCase() === 'CASH'
    ? 'CASH'
    : 'BANK_TRANSFER';
}

/** A payment choice only has meaning after at least one course is selected. */
export function normalizePaymentModeForCourses(
  value: unknown,
  fallback: AcademyTalentPaymentMode,
  selectedCourseIds: readonly number[]
): AcademyTalentPaymentMode {
  return selectedCourseIds.length ? normalizePaymentMode(value, fallback) : 'THINKING';
}

export function normalizeDeposit(value: unknown, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    throw new AcademySalesError('Số tiền cọc phải là số nguyên VNĐ không âm.');
  }
  return Math.round(parsed);
}

export function normalizeInstructorCode(value: unknown) {
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

export function normalizeInstructorConfiguration(value: UpsertAcademyTalentInstructorRequest) {
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

export function toScores(
  source: SafeAny,
  input?: Partial<AcademyTalentAssessmentScores>
): AcademyTalentAssessmentScores {
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

export function toStaff(row: SafeAny) {
  if (!row) return null;
  return { id: Number(row.id), displayName: String(row.displayName), email: row.email ?? null };
}

export function toInstructor(row: SafeAny): AcademyTalentInstructor {
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

export function formatIctDate(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}${get('month')}${get('day')}`;
}

export function offerExpiry(now: Date) {
  return getAcademyIctDayBounds(now).end;
}

export function isQuoteExpired(expiresAt: Date | string, now: Date) {
  const expires = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return Number.isFinite(expires.getTime()) && now.getTime() > expires.getTime();
}

export function toSnapshotBase(course: SafeAny): SnapshotBase {
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

export function normalizeSnapshotBases(value: unknown): SnapshotBase[] {
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

export function assertValidAcademyTalentCourseSelection(
  scores: AcademyTalentAssessmentScores,
  courses: Array<Pick<SnapshotBase, 'courseId' | 'code' | 'name'>>,
  instructorSelections: Record<number, AcademyTalentInstructorSnapshot>,
  tiers?: readonly AcademyTalentTier[]
): void {
  const buomCourse = courses.find((course) => isAcademyBuomCourse(course));
  if (!buomCourse) return;
  const result = calculateAcademyTalentAssessmentResult(scores, tiers);
  if (!isAcademyBuomUnlocked(result)) {
    throw new AcademySalesError(
      'Khóa Bướm chỉ mở khóa khi học viên thi đạt bậc Thiên Thần Bóng Tối (35+ sợi / 5 phút, tối đa 5 lỗi).',
      400
    );
  }
  if (courses.length > 1) {
    throw new AcademySalesError(
      'Khóa Bướm là khóa chuẩn hóa độc lập, không thể chọn chung với các khóa học khác.',
      400
    );
  }
  const chosenInstructor = instructorSelections[buomCourse.courseId];
  if (chosenInstructor && chosenInstructor.code !== 'auto') {
    throw new AcademySalesError('Khóa Bướm bắt buộc sử dụng chế độ Tự động phân bổ giảng viên.', 400);
  }
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
    const isBuom = isAcademyBuomCourse(course);
    const courseScholarshipPercent = isBuom ? 0 : effectiveScholarshipPercent;
    const scholarshipVnd = isBuom ? 0 : Math.round(course.promoPriceVnd * (courseScholarshipPercent / 100));
    const finalPriceVnd = Math.max(0, course.promoPriceVnd - scholarshipVnd);
    const requestedInstructor = options.instructorSelections?.[course.courseId] || FALLBACK_AUTO_INSTRUCTOR;
    const instructor = isBuom && requestedInstructor.code !== 'auto' ? FALLBACK_AUTO_INSTRUCTOR : requestedInstructor;
    // Legacy workshop policy: a requested instructor is a surcharge on the
    // tuition after the student's Tố Chất scholarship, never on materials.
    const instructorSurchargeVnd = Math.round(finalPriceVnd * (instructor.surchargePercent / 100));
    return {
      ...course,
      scholarshipPercent: courseScholarshipPercent,
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

export function describeCourses(quote: AcademyTalentAssessmentQuote) {
  return quote.courses.map((course) => course.name).join(', ');
}

export function assertDepositIsValid(
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

export function parseOptionalAssessmentId(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const assessmentId = Number(value);
  if (!Number.isInteger(assessmentId) || assessmentId <= 0) {
    throw new AcademySalesError('Phiên Tố Chất ID không hợp lệ.');
  }
  return assessmentId;
}
