import type React from 'react';
import type { GlobalToken } from 'antd';
import type { LucideIcon } from 'lucide-react';
import { Compass, Link, TriangleAlert, Unlink } from 'lucide-react';
import {
  ACADEMY_BUOM_REQUIRED_TIER_KEY,
  ACADEMY_TALENT_STRANDS_5_MIN_MAX,
  ACADEMY_TALENT_STRANDS_5_MIN_MIN,
  isAcademyBuomCourse,
} from '@mos-lab/shared';
import type { AcademyCourse, UpdateAcademyTalentLadderConfigurationRequest } from '@mos-lab/shared';
import type {
  AcademyTalentDraft,
  AcademyTalentErrorKey,
  AcademyTalentMilestone,
} from '../academy-talent-workshop.types';

export interface ErrorCardConfig {
  key: AcademyTalentErrorKey;
  title: string;
  description: string;
  icon: LucideIcon;
}

export const ERROR_CARD_CONFIGS: ErrorCardConfig[] = [
  {
    key: 'skin',
    title: 'Dính da',
    description: 'Keo hoặc chân mi chạm vào da',
    icon: TriangleAlert,
  },
  {
    key: 'root',
    title: 'Hở chân',
    description: 'Chân mi hở, không ôm khít',
    icon: Unlink,
  },
  {
    key: 'stickies',
    title: 'Dính mi',
    description: 'Dính chùm hoặc dính mi tơ',
    icon: Link,
  },
  {
    key: 'direction',
    title: 'Hướng mi',
    description: 'Mi nghiêng veo, lệch hướng',
    icon: Compass,
  },
];

/** Server stores the legacy 0–4 score; visual stars are intentionally +1. */
export const RATING_LABELS = ['Kiểm tra lại', 'Khá', 'Đạt', 'Giỏi', 'Xuất sắc'];

export const FALLBACK_MILESTONES: AcademyTalentMilestone[] = [
  {
    key: 'level1',
    title: 'Nhập môn',
    strands: 1,
    scholarshipPct: 0,
    sampleRewardPct: 0,
    kitRewardPct: 0,
    bubbleHeightPercent: 20,
    tone: 'slate',
  },
  {
    key: 'level2',
    title: 'Khá',
    strands: 3,
    scholarshipPct: 2,
    sampleRewardPct: 2,
    kitRewardPct: 2,
    bubbleHeightPercent: 29,
    tone: 'orange',
  },
  {
    key: 'level3',
    title: 'Triển vọng',
    strands: 5,
    scholarshipPct: 5,
    sampleRewardPct: 5,
    kitRewardPct: 5,
    bubbleHeightPercent: 38,
    tone: 'indigo',
  },
  {
    key: 'level4',
    title: 'Vượt trội',
    strands: 10,
    scholarshipPct: 10,
    sampleRewardPct: 10,
    kitRewardPct: 10,
    bubbleHeightPercent: 47,
    tone: 'emerald',
  },
  {
    key: 'level5',
    title: 'Thiên bẩm',
    strands: 20,
    scholarshipPct: 50,
    sampleRewardPct: 20,
    kitRewardPct: 20,
    bubbleHeightPercent: 57,
    tone: 'gold',
  },
  {
    key: 'level6',
    title: 'Thiên thần bóng tối',
    strands: 35,
    scholarshipPct: 90,
    sampleRewardPct: 20,
    kitRewardPct: 20,
    bubbleHeightPercent: 67,
    tone: 'violet',
  },
];

export type ScholarshipRewardFlight = {
  id: number;
  headline: string;
  fromX: number;
  fromY: number;
  width: number;
  deltaX: number;
  deltaY: number;
  scale: number;
  scholarshipPct: number;
  sampleRewardPct: number;
  kitRewardPct: number;
};

export type ScholarshipCelebration = {
  id: number;
  intensity: 0 | 1 | 2 | 3;
};

export const SCHOLARSHIP_FIREWORKS = [
  { left: '17%', top: '34%', color: 'rgb(251, 191, 36)', delay: '0ms' },
  { left: '35%', top: '19%', color: 'rgb(56, 189, 248)', delay: '95ms' },
  { left: '51%', top: '31%', color: 'rgb(216, 180, 254)', delay: '55ms' },
  { left: '69%', top: '17%', color: 'rgb(244, 114, 182)', delay: '145ms' },
  { left: '83%', top: '37%', color: 'rgb(52, 211, 153)', delay: '85ms' },
  { left: '27%', top: '55%', color: 'rgb(253, 230, 138)', delay: '195ms' },
  { left: '76%', top: '57%', color: 'rgb(103, 232, 249)', delay: '225ms' },
] as const;

export function defaultLadderConfigurationDraft(): UpdateAcademyTalentLadderConfigurationRequest['tiers'] {
  return FALLBACK_MILESTONES.map((tier) => ({
    key: tier.key,
    title: tier.title,
    strands: tier.strands,
    scholarshipPercent: tier.scholarshipPct,
    sampleRewardPercent: tier.sampleRewardPct || 0,
    kitRewardPercent: tier.kitRewardPct || 0,
    bubbleHeightPercent: tier.bubbleHeightPercent || 20,
  }));
}

export function createLadderTierKey() {
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * These are the five approved Academy catalogue covers that originally
 * shipped with the workshop. Courses may still override them in the native
 * catalogue; the fallback means a missing optional cover never degrades the
 * sales canvas into a generic placeholder.
 */
const ACADEMY_COURSE_COVER_FALLBACKS: Record<string, string> = {
  combo: '/academy/courses/lash_combo.jpg',
  basic: '/academy/courses/lash_basic.jpg',
  advanced: '/academy/courses/lash_advanced.jpg',
  fan: '/academy/courses/lash_volume.jpg',
  design: '/academy/courses/lash_design.jpg',
};

const ACADEMY_COURSE_TONES: Record<string, string> = {
  combo: 'combo',
  basic: 'basic',
  advanced: 'advanced',
  fan: 'fan',
  design: 'design',
  buom_wings: 'buom',
};

export function academyCourseCoverUrl(course: Pick<AcademyCourse, 'code' | 'coverImageUrl'>) {
  return course.coverImageUrl || ACADEMY_COURSE_COVER_FALLBACKS[course.code.trim().toLowerCase()] || null;
}

export function academyCourseTone(course: Pick<AcademyCourse, 'code'>, fallbackIndex: number) {
  return ACADEMY_COURSE_TONES[course.code.trim().toLowerCase()] || String(fallbackIndex % 5);
}

export function clampInteger(value: number | null | undefined, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(Number(value) || 0)));
}

export function emptyDraft(): AcademyTalentDraft {
  return {
    eyeScore: 0,
    handScore: 0,
    strands5Min: ACADEMY_TALENT_STRANDS_5_MIN_MIN,
    errors: { skin: 0, root: 0, stickies: 0, direction: 0 },
    selectedCourseIds: [],
    selectedSampleCourseIds: [],
    selectedKitCourseIds: [],
    selectedInstructorIdsByCourse: {},
    primaryCourseId: null,
    paymentMode: 'THINKING',
    depositVnd: null,
    note: null,
  };
}

export function normalizeDraft(value?: AcademyTalentDraft | null): AcademyTalentDraft {
  const base = emptyDraft();
  if (!value) return base;
  const selectedCourseIds = Array.from(
    new Set((value.selectedCourseIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))
  );
  return {
    ...base,
    ...value,
    // A quote without courses cannot have a payment decision. This also
    // clears older drafts that defaulted to a deposit before course selection.
    paymentMode:
      selectedCourseIds.length === 0
        ? 'THINKING'
        : value.paymentMode === 'FULL'
          ? 'FULL'
          : value.paymentMode === 'DEPOSIT'
            ? 'DEPOSIT'
            : 'THINKING',
    eyeScore: clampInteger(value.eyeScore, 0, 4),
    handScore: clampInteger(value.handScore, 0, 4),
    strands5Min: clampInteger(value.strands5Min, ACADEMY_TALENT_STRANDS_5_MIN_MIN, ACADEMY_TALENT_STRANDS_5_MIN_MAX),
    errors: {
      skin: Math.max(0, Math.round(Number(value.errors?.skin) || 0)),
      root: Math.max(0, Math.round(Number(value.errors?.root) || 0)),
      stickies: Math.max(0, Math.round(Number(value.errors?.stickies) || 0)),
      direction: Math.max(0, Math.round(Number(value.errors?.direction) || 0)),
    },
    selectedCourseIds,
    selectedSampleCourseIds: Array.from(
      new Set((value.selectedSampleCourseIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))
    ),
    selectedKitCourseIds: Array.from(
      new Set((value.selectedKitCourseIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))
    ),
    selectedInstructorIdsByCourse: Object.fromEntries(
      Object.entries(value.selectedInstructorIdsByCourse || {})
        .map(([courseId, instructorId]) => [Number(courseId), Number(instructorId)] as const)
        .filter(
          ([courseId, instructorId]) =>
            Number.isInteger(courseId) && courseId > 0 && Number.isInteger(instructorId) && instructorId > 0
        )
        .map(([courseId, instructorId]) => [String(courseId), instructorId])
    ),
    primaryCourseId: value.primaryCourseId ? Number(value.primaryCourseId) : null,
    depositVnd:
      value.depositVnd === null || value.depositVnd === undefined
        ? null
        : Math.max(0, Math.round(Number(value.depositVnd) || 0)),
    note: value.note?.trim() || null,
  };
}

/** The Academy checkout defaults to the scholarship-retention deposit. */
export function withDefaultDeposit(
  draft: AcademyTalentDraft,
  suggestedDepositVnd: number | null | undefined
): AcademyTalentDraft {
  if (draft.paymentMode !== 'THINKING') return draft;
  return {
    ...draft,
    paymentMode: 'DEPOSIT',
    depositVnd: draft.depositVnd ?? suggestedDepositVnd ?? null,
  };
}

export function retainInstructorSelections(
  selections: Record<string, number>,
  selectedCourseIds: Iterable<number>
): Record<string, number> {
  const allowed = new Set(selectedCourseIds);
  return Object.fromEntries(Object.entries(selections).filter(([courseId]) => allowed.has(Number(courseId))));
}

export function isBuomUnlockedForMilestones(
  milestones: AcademyTalentMilestone[],
  strands: number,
  errors: AcademyTalentDraft['errors']
): boolean {
  const errorTotal = Object.values(errors).reduce((sum, item) => sum + item, 0);
  const tier = [...milestones].reverse().find((milestone) => strands >= milestone.strands) || null;
  return Boolean(tier?.key === ACADEMY_BUOM_REQUIRED_TIER_KEY && strands > 0 && errorTotal <= 5);
}

export function stripLockedBuomCourses(
  draft: AcademyTalentDraft,
  coursesById: Map<number, AcademyCourse>,
  buomUnlocked: boolean
): AcademyTalentDraft {
  if (buomUnlocked) return draft;
  const hasLockedBuom = draft.selectedCourseIds.some((id) => isAcademyBuomCourse(coursesById.get(id)));
  if (!hasLockedBuom) return draft;
  const retainedIds = draft.selectedCourseIds.filter((id) => !isAcademyBuomCourse(coursesById.get(id)));
  const retainedSet = new Set(retainedIds);
  return {
    ...draft,
    selectedCourseIds: retainedIds,
    selectedSampleCourseIds: draft.selectedSampleCourseIds.filter((id) => retainedSet.has(id)),
    selectedKitCourseIds: draft.selectedKitCourseIds.filter((id) => retainedSet.has(id)),
    selectedInstructorIdsByCourse: retainInstructorSelections(draft.selectedInstructorIdsByCourse, retainedSet),
    primaryCourseId: draft.primaryCourseId && retainedSet.has(draft.primaryCourseId) ? draft.primaryCourseId : null,
    paymentMode: retainedIds.length ? draft.paymentMode : 'THINKING',
  };
}

export function buildWorkshopSurfaceStyle(token: GlobalToken): React.CSSProperties {
  return {
    '--academy-talent-surface': token.colorBgContainer,
    '--academy-talent-surface-raised': token.colorBgElevated,
    '--academy-talent-surface-muted': token.colorFillQuaternary,
    '--academy-talent-border': token.colorBorderSecondary,
    '--academy-talent-border-strong': token.colorBorder,
    '--academy-talent-text': token.colorText,
    '--academy-talent-muted': token.colorTextSecondary,
    '--academy-talent-cyan': token.colorInfo,
    '--academy-talent-gold': token.colorWarning,
    '--academy-talent-success': token.colorSuccess,
    '--academy-talent-danger': token.colorError,
  } as React.CSSProperties;
}
