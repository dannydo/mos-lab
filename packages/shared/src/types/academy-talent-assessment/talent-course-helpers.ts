import { removeVietnameseTones } from '../../utils/search.js';
import {
  ACADEMY_BUOM_COURSE_CODE,
  ACADEMY_BUOM_COURSE_DEFAULT_PRICE_VND,
  ACADEMY_BUOM_COURSE_NAME,
  ACADEMY_BUOM_COURSE_NAME_EN,
  ACADEMY_BUOM_COURSE_TAG,
  ACADEMY_BUOM_REQUIRED_TIER_KEY,
  ACADEMY_WORKSHOP_1DAYS_COURSE_CODE,
  ACADEMY_WORKSHOP_1DAYS_COURSE_NAME,
  type AcademyTalentAssessmentResult,
} from './talent-scoring.types.js';

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
export function isAcademyBuomCourse(
  course: { code?: string | null; name?: string | null } | null | undefined
): boolean {
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
export function resolveAcademyCourseSelectionKind(course: {
  code?: string | null;
  name?: string | null;
}): 'COMBO' | 'COURSE' {
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
    ((course: AcademyCourseSelectOptionInput) => [course.name, course.nameEn, course.code].filter(Boolean).join(' · '));

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
