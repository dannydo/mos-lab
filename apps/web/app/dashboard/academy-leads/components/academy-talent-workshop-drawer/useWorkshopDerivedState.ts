'use client';

import React from 'react';
import type { AcademyCourse, AcademyTalentInstructor, AcademyTalentLadderConfiguration } from '@mos-lab/shared';
import { formatVND } from '~/lib/format-utils';
import type {
  AcademyTalentAssessmentView,
  AcademyTalentDraft,
  AcademyTalentPricing,
  AcademyTalentResult,
} from '../academy-talent-workshop.types';
import { FALLBACK_MILESTONES, isBuomUnlockedForMilestones } from './workshop-drawer-utils';

export interface UseWorkshopDerivedStateOptions {
  courses: AcademyCourse[];
  instructors: AcademyTalentInstructor[];
  ladderConfiguration: AcademyTalentLadderConfiguration | null;
  draft: AcademyTalentDraft;
  displayView: AcademyTalentAssessmentView | null | undefined;
  previewResult: AcademyTalentResult | null;
  previewPricing: AcademyTalentPricing | null;
  shouldPreviewQuote: boolean;
  isPreviewPending: boolean;
  previewError: boolean;
  courseMarket: 'DOMESTIC' | 'OVERSEAS';
}

export function useWorkshopDerivedState({
  courses,
  instructors,
  ladderConfiguration,
  draft,
  displayView,
  previewResult,
  previewPricing,
  shouldPreviewQuote,
  isPreviewPending,
  previewError,
  courseMarket,
}: UseWorkshopDerivedStateOptions) {
  // Once a quote-relevant field changes, never show a rank from the previous
  // draft. The short preview request is server-only and does not write audit
  // history while an evaluator is dragging the slider.
  const result = previewResult || (shouldPreviewQuote ? null : displayView?.result);
  const pricing = previewPricing || (shouldPreviewQuote ? null : displayView?.pricing);

  const effectiveRewards =
    isPreviewPending || previewError || !result || !pricing
      ? { scholarshipPct: 0, sampleRewardPct: 0, kitRewardPct: 0 }
      : {
          scholarshipPct: Math.max(0, Math.round(result.scholarshipPct || 0)),
          sampleRewardPct: Math.max(0, Math.round(pricing.sampleRewardPct || 0)),
          kitRewardPct: Math.max(0, Math.round(pricing.kitRewardPct || 0)),
        };
  const scholarshipPct = effectiveRewards.scholarshipPct;
  const rewardHeadline = isPreviewPending
    ? 'ĐANG TÍNH HỌC BỔNG…'
    : previewError
      ? 'CHƯA THỂ CẬP NHẬT'
      : result?.resultTitle === 'Ưu đãi đã hết hạn'
        ? 'ƯU ĐÃI ĐÃ HẾT HẠN'
        : scholarshipPct > 0
          ? `HỌC BỔNG ${scholarshipPct}%`
          : 'CHƯA ĐẠT HỌC BỔNG';

  const configuredLadderTiers = ladderConfiguration?.tiers;
  const milestones = React.useMemo(() => {
    if (configuredLadderTiers?.length) {
      return [...configuredLadderTiers]
        .map((tier) => ({
          key: tier.key,
          title: tier.title,
          strands: tier.strands,
          scholarshipPct: tier.scholarshipPercent,
          sampleRewardPct: tier.sampleRewardPercent,
          kitRewardPct: tier.kitRewardPercent,
          bubbleHeightPercent: tier.bubbleHeightPercent,
        }))
        .sort((left, right) => left.strands - right.strands);
    }
    return result?.levels?.length ? result.levels : FALLBACK_MILESTONES;
  }, [configuredLadderTiers, result?.levels]);

  const draftErrorTotal = Object.values(draft.errors).reduce((sum, item) => sum + item, 0);
  const activeLadderMilestone = React.useMemo(
    () => [...milestones].reverse().find((milestone) => draft.strands5Min >= milestone.strands) || null,
    [draft.strands5Min, milestones]
  );
  const ladderRewards =
    draft.strands5Min <= 0 || draftErrorTotal > 5
      ? { scholarshipPct: 0, sampleRewardPct: 0, kitRewardPct: 0 }
      : {
          scholarshipPct: Math.round(activeLadderMilestone?.scholarshipPct || 0),
          sampleRewardPct: Math.round(activeLadderMilestone?.sampleRewardPct || 0),
          kitRewardPct: Math.round(activeLadderMilestone?.kitRewardPct || 0),
        };
  const scoreRewardHeadline =
    activeLadderMilestone && draft.strands5Min > 0 && draftErrorTotal <= 5
      ? `KẾT QUẢ: ${activeLadderMilestone.title.toUpperCase()}`
      : 'CHƯA ĐẠT HỌC BỔNG';

  const selectedCourseIds = new Set(draft.selectedCourseIds);
  const hasSelectedCourses = draft.selectedCourseIds.length > 0;
  const selectedCourseRewardAmounts =
    hasSelectedCourses && pricing
      ? {
          scholarshipVnd: pricing.courseScholarshipVnd,
          sampleVnd: pricing.sampleScholarshipVnd,
          kitVnd: pricing.kitScholarshipVnd,
        }
      : undefined;

  const activeCourses = React.useMemo(() => courses.filter((course) => course.isActive), [courses]);
  const coursesById = React.useMemo(() => new Map(activeCourses.map((course) => [course.id, course])), [activeCourses]);
  const buomUnlocked = isBuomUnlockedForMilestones(milestones, draft.strands5Min, draft.errors);
  const instructorsById = React.useMemo(
    () => new Map(instructors.map((instructor) => [instructor.id, instructor])),
    [instructors]
  );
  const autoInstructor = React.useMemo(
    () => instructors.find((instructor) => instructor.code === 'auto') || null,
    [instructors]
  );
  const marketCourses = React.useMemo(
    () => activeCourses.filter((course) => course.market === courseMarket),
    [activeCourses, courseMarket]
  );
  const domesticCourses = React.useMemo(
    () => activeCourses.filter((course) => course.market === 'DOMESTIC'),
    [activeCourses]
  );
  const overseasCourses = React.useMemo(
    () => activeCourses.filter((course) => course.market === 'OVERSEAS'),
    [activeCourses]
  );
  const recommendedIds = new Set(result?.recommendedCourseIds || []);
  const scholarshipCelebrationIntensity: 0 | 1 | 2 | 3 =
    ladderRewards.scholarshipPct <= 0
      ? 0
      : ladderRewards.scholarshipPct >= 50
        ? 3
        : ladderRewards.scholarshipPct >= 15
          ? 2
          : 1;

  const coursePriceHint = React.useCallback(
    (courseId: number) => pricing?.lineItems.find((item) => item.courseId === courseId) || null,
    [pricing?.lineItems]
  );
  const courseAddOnPriceHint = React.useCallback(
    (courseId: number, kind: 'SAMPLE' | 'KIT') =>
      pricing?.addOnItems.find((item) => item.courseId === courseId && item.kind === kind) || null,
    [pricing?.addOnItems]
  );
  const marketPriceLabel = React.useCallback(
    (market: 'DOMESTIC' | 'OVERSEAS') => {
      const values = (market === 'DOMESTIC' ? domesticCourses : overseasCourses)
        .map((course) => course.promoPriceVnd || course.listPriceVnd)
        .filter((value) => value > 0);
      return values.length ? `Từ ${formatVND(Math.min(...values))}` : 'Đang cập nhật học phí';
    },
    [domesticCourses, overseasCourses]
  );

  return {
    result,
    pricing,
    effectiveRewards,
    rewardHeadline,
    milestones,
    draftErrorTotal,
    ladderRewards,
    scoreRewardHeadline,
    selectedCourseIds,
    hasSelectedCourses,
    selectedCourseRewardAmounts,
    coursesById,
    buomUnlocked,
    instructorsById,
    autoInstructor,
    marketCourses,
    domesticCourses,
    overseasCourses,
    recommendedIds,
    scholarshipCelebrationIntensity,
    coursePriceHint,
    courseAddOnPriceHint,
    marketPriceLabel,
  };
}
