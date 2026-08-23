import {
  ACADEMY_TALENT_TIERS,
  type AcademyTalentAssessment,
  type AcademyTalentAssessmentQuote,
  type AcademyTalentAssessmentScores,
  type AcademyTalentTierKey,
} from '@mos-lab/shared';
import type {
  AcademyTalentAssessmentView,
  AcademyTalentCourseSelectionRule,
  AcademyTalentMilestone,
} from './academy-talent-workshop.types';

const TIER_TONES: Record<AcademyTalentTierKey, NonNullable<AcademyTalentMilestone['tone']>> = {
  level1: 'slate',
  level2: 'orange',
  level3: 'indigo',
  level4: 'emerald',
  level5: 'gold',
  level6: 'violet',
};

const EYE_LABELS = [
  '0đ: Kiểm tra lại mắt',
  '1đ: Khá - Có thể nối mi',
  '2đ: Đạt - Nối Mi Ngoài Sáng',
  '3đ: Giỏi - Nối Mi Dưới Trăng',
  '4đ: Xuất sắc - Nối Mi Bóng Tối',
];

const HAND_LABELS = [
  '0đ: Kiểm tra lại tay',
  '1đ: Khá - Có thể nối mi',
  '2đ: Đạt - Nối Mi Ngoài Sáng',
  '3đ: Giỏi - Nối Mi Dưới Trăng',
  '4đ: Xuất sắc - Nối Mi Bóng Tối',
];

function asWorkshopStatus(status: AcademyTalentAssessment['status']): AcademyTalentAssessmentView['status'] {
  if (status === 'INVOICED') return 'ISSUED';
  return status;
}

/**
 * Maps a server quote into the workshop presentation. This is deliberately a
 * projection only: rank, qualification, scholarship and recommendations have
 * already been calculated by Fastify.
 */
export function toAcademyTalentWorkshopResult(
  quote: AcademyTalentAssessmentQuote,
  scores?: Pick<AcademyTalentAssessmentScores, 'eyeScore' | 'handScore'>
): AcademyTalentAssessmentView['result'] {
  const eyeScore = scores?.eyeScore ?? 0;
  const handScore = scores?.handScore ?? 0;

  return {
    rankKey: quote.result.tier?.key ?? null,
    rankLabel: quote.result.rankLabel,
    resultTitle: quote.isExpired
      ? 'Ưu đãi đã hết hạn'
      : quote.result.qualified
        ? 'Kết quả đạt được'
        : 'Chưa đạt học bổng',
    resultSummary: quote.isExpired
      ? 'Ưu đãi của phiên test này đã hết hạn vào cuối ngày theo giờ Việt Nam.'
      : quote.recommendation.summary || quote.result.rewardLabel,
    eligibleForScholarship: quote.result.qualified && !quote.isExpired,
    scholarshipPct: Math.max(0, Math.round(quote.effectiveScholarshipPercent || 0)),
    totalErrors: quote.result.totalErrors,
    levels: ACADEMY_TALENT_TIERS.map((tier) => ({
      key: tier.key,
      title: tier.title,
      strands: tier.strands,
      scholarshipPct: tier.scholarshipPercent,
      sampleRewardPct: tier.sampleRewardPercent,
      kitRewardPct: tier.kitRewardPercent,
      tone: TIER_TONES[tier.key],
    })),
    recommendedCourseIds: quote.recommendedCourseIds,
    eyeScoreLabel: EYE_LABELS[eyeScore] || EYE_LABELS[0],
    handScoreLabel: HAND_LABELS[handScore] || HAND_LABELS[0],
  };
}

/** Same server quote, projected into VND-only price lines for the workshop. */
export function toAcademyTalentWorkshopPricing(
  quote: AcademyTalentAssessmentQuote
): AcademyTalentAssessmentView['pricing'] {
  return {
    currency: 'VND',
    expiresAt: quote.expiresAt,
    // A few sessions were saved before optional package snapshots were added
    // to the Academy quote. Keep those historical sessions viewable instead
    // of letting a missing legacy array crash the workshop when it is chosen.
    // No price is recalculated here; Fastify remains the pricing source.
    lineItems: (quote.courses || []).map((course) => ({
      courseId: course.courseId,
      name: course.name,
      listPriceVnd: course.listPriceVnd,
      promoPriceVnd: course.promoPriceVnd,
      scholarshipVnd: course.scholarshipVnd,
      finalPriceVnd: course.finalPriceVnd,
      instructor: course.instructor,
      instructorSurchargeVnd: course.instructorSurchargeVnd,
    })),
    addOnItems: (quote.addOns || []).map((item) => ({
      kind: item.kind,
      courseId: item.courseId,
      courseName: item.courseName,
      label: item.label,
      listPriceVnd: item.listPriceVnd,
      scholarshipVnd: item.scholarshipVnd,
      finalPriceVnd: item.finalPriceVnd,
    })),
    listTotalVnd: quote.listPriceVnd,
    promoTotalVnd: quote.promoPriceVnd,
    scholarshipVnd: quote.scholarshipVnd,
    courseScholarshipVnd: quote.courseScholarshipVnd,
    sampleScholarshipVnd: quote.sampleScholarshipVnd,
    kitScholarshipVnd: quote.kitScholarshipVnd,
    materialRewardPct: Math.max(0, Math.round(quote.materialRewardPercent || 0)),
    sampleRewardPct: Math.max(0, Math.round(quote.sampleRewardPercent ?? quote.materialRewardPercent ?? 0)),
    kitRewardPct: Math.max(0, Math.round(quote.kitRewardPercent ?? quote.materialRewardPercent ?? 0)),
    finalTotalVnd: quote.finalPriceVnd,
    courseFinalTotalVnd: quote.courseFinalPriceVnd,
    sampleFinalTotalVnd: quote.sampleFinalPriceVnd,
    kitFinalTotalVnd: quote.kitFinalPriceVnd,
    teacherSurchargeVnd: quote.teacherSurchargeVnd,
    suggestedDepositVnd: quote.suggestedDepositVnd,
    dueNowVnd: quote.dueNowVnd,
  };
}

/**
 * Converts the persisted Academy contract into the view-only workshop shape.
 * Ranking, recommendation, expiry and money values are deliberately passed
 * through from Fastify; this adapter never reimplements business rules.
 */
export function toAcademyTalentWorkshopView(
  assessment: AcademyTalentAssessment,
  sessionNumber: number
): AcademyTalentAssessmentView {
  const { quote, scores } = assessment;
  const pricing = toAcademyTalentWorkshopPricing(quote);

  return {
    id: assessment.id,
    sessionNumber,
    status: asWorkshopStatus(assessment.status),
    draft: {
      eyeScore: scores.eyeScore,
      handScore: scores.handScore,
      strands5Min: scores.strands5Min,
      errors: {
        skin: scores.errorSkin,
        root: scores.errorRoot,
        stickies: scores.errorStickies,
        direction: scores.errorDirection,
      },
      selectedCourseIds: assessment.selectedCourseIds,
      selectedSampleCourseIds: assessment.selectedSampleCourseIds,
      selectedKitCourseIds: assessment.selectedKitCourseIds,
      selectedInstructorIdsByCourse: assessment.selectedInstructorIdsByCourse,
      primaryCourseId: assessment.selectedCourseIds[0] ?? null,
      paymentMode: assessment.paymentMode,
      depositVnd: assessment.depositVnd || null,
      note: assessment.notes,
    },
    result: toAcademyTalentWorkshopResult(quote, scores),
    pricing,
    payment: assessment.payment,
    invoice: assessment.invoice
      ? {
          invoiceNumber: assessment.invoice.documentNumber,
          issuedAt: assessment.invoice.snapshot?.issuedAt || assessment.updatedAt,
          paymentMode: assessment.invoice.snapshot?.paymentMode || assessment.paymentMode,
          dueNowVnd: assessment.invoice.snapshot?.quote.dueNowVnd ?? quote.dueNowVnd,
          printedAt: assessment.invoice.printedAt,
          note: assessment.notes,
        }
      : null,
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
  };
}

/**
 * The old workshop treats a package/combo as mutually exclusive, while an
 * operator may combine individual Academy courses.  This is purely selection
 * behaviour; price calculation stays on the server.
 */
export function academyTalentCourseSelectionRules(
  courses: Array<{ id: number; code: string; name: string }>
): Record<number, AcademyTalentCourseSelectionRule> {
  return Object.fromEntries(
    courses.map((course) => [
      course.id,
      {
        kind: /(^|[-_])combo($|[-_])|combo|tron goi|trọn gói/i.test(`${course.code} ${course.name}`)
          ? 'COMBO'
          : 'COURSE',
      },
    ])
  );
}
