import assert from 'node:assert/strict';
import test from 'node:test';
import { ACADEMY_TALENT_TIERS, calculateAcademyTalentAssessmentResult } from '@mos-lab/shared';
import { buildAcademyTalentQuote, calculateAcademyTalentPaymentStatus } from './academy-talent-assessment.service.js';

test('keeps a printed quote editable until the payment ledger reaches the final tuition', () => {
  assert.equal(calculateAcademyTalentPaymentStatus('DEPOSIT', 0, 1_990_000, 1_000_000), 'UNPAID');
  assert.equal(calculateAcademyTalentPaymentStatus('DEPOSIT', 500_000, 1_990_000, 1_000_000), 'PARTIALLY_PAID');
  assert.equal(calculateAcademyTalentPaymentStatus('DEPOSIT', 1_000_000, 1_990_000, 1_000_000), 'DEPOSIT_RECEIVED');
  assert.equal(calculateAcademyTalentPaymentStatus('DEPOSIT', 1_990_000, 1_990_000, 1_000_000), 'PAID');
  assert.equal(calculateAcademyTalentPaymentStatus('FULL', 1_000_000, 1_990_000, 0), 'PARTIALLY_PAID');
});

test('uses the documented six-tier Tố Chất ladder and blocks an excessive-error reward', () => {
  assert.equal(calculateAcademyTalentAssessmentResult({ strands5Min: 1 }).tier?.key, 'level1');
  assert.equal(calculateAcademyTalentAssessmentResult({ strands5Min: 3 }).scholarshipPercent, 2);
  assert.equal(calculateAcademyTalentAssessmentResult({ strands5Min: 5 }).scholarshipPercent, 5);
  assert.equal(calculateAcademyTalentAssessmentResult({ strands5Min: 10 }).scholarshipPercent, 10);
  assert.equal(calculateAcademyTalentAssessmentResult({ strands5Min: 12 }).tier?.key, 'level4');
  assert.equal(calculateAcademyTalentAssessmentResult({ strands5Min: 12 }).scholarshipPercent, 10);
  assert.equal(
    calculateAcademyTalentAssessmentResult({ strands5Min: 12 }).rewardLabel,
    'Học bổng 10% · Mẫu 10% · Đồ nghề 10%'
  );
  assert.equal(calculateAcademyTalentAssessmentResult({ strands5Min: 20 }).scholarshipPercent, 50);
  assert.equal(calculateAcademyTalentAssessmentResult({ strands5Min: 35 }).scholarshipPercent, 90);

  const unqualified = calculateAcademyTalentAssessmentResult({
    strands5Min: 35,
    errorRoot: 2,
    errorSkin: 2,
    errorStickies: 2,
  });
  assert.equal(unqualified.qualified, false);
  assert.equal(unqualified.scholarshipPercent, 0);
  assert.equal(calculateAcademyTalentAssessmentResult({ strands5Min: 0 }).qualified, false);
});

test('quotes promo tuition first, supports multiple courses, and removes only the scholarship after ICT offer expiry', () => {
  const scores = {
    eyeScore: 3,
    handScore: 3,
    strands5Min: 20,
    errorRoot: 0,
    errorSkin: 0,
    errorStickies: 0,
    errorDirection: 0,
  };
  const courses = [
    {
      courseId: 1,
      code: 'combo',
      name: 'Combo Academy',
      nameEn: null,
      listPriceVnd: 25_000_000,
      promoPriceVnd: 20_000_000,
      kitName: null,
      kitPriceVnd: 0,
      samplePriceVnd: 0,
      lessonCount: 24,
      lashModelCount: 12,
    },
    {
      courseId: 2,
      code: 'basic',
      name: 'Foundation',
      nameEn: null,
      listPriceVnd: 5_000_000,
      promoPriceVnd: 4_000_000,
      kitName: null,
      kitPriceVnd: 0,
      samplePriceVnd: 0,
      lessonCount: 6,
      lashModelCount: 3,
    },
  ];

  const active = buildAcademyTalentQuote(
    scores,
    '2026-08-19T16:59:59.999Z',
    courses,
    new Date('2026-08-19T12:00:00.000Z'),
    {
      recommendedCourseIds: [1],
      recommendation: { title: 'Combo phù hợp nhất', summary: 'Tài năng cao.' },
      paymentMode: 'DEPOSIT',
      depositVnd: 1_000_000,
    }
  );
  assert.equal(active.promoPriceVnd, 24_000_000);
  assert.equal(active.materialRewardPercent, 20);
  assert.equal(active.scholarshipVnd, 12_000_000);
  assert.equal(active.finalPriceVnd, 12_000_000);
  assert.equal(active.dueNowVnd, 1_000_000);
  assert.deepEqual(active.recommendedCourseIds, [1]);

  const expired = buildAcademyTalentQuote(
    scores,
    '2026-08-19T16:59:59.999Z',
    courses,
    new Date('2026-08-19T17:00:00.000Z'),
    {
      paymentMode: 'FULL',
    }
  );
  assert.equal(expired.isExpired, true);
  assert.equal(expired.effectiveScholarshipPercent, 0);
  assert.equal(expired.materialRewardPercent, 0);
  assert.equal(expired.scholarshipVnd, 0);
  assert.equal(expired.finalPriceVnd, 24_000_000);
  assert.equal(expired.dueNowVnd, 24_000_000);
});

test('quotes only selected sample and kit packages, with a material reward capped at 20%', () => {
  const course = [
    {
      courseId: 9,
      code: 'combo',
      name: 'Combo Academy',
      nameEn: null,
      listPriceVnd: 20_000_000,
      promoPriceVnd: 20_000_000,
      kitName: 'MS92',
      kitPriceVnd: 1_000_000,
      samplePriceVnd: 500_000,
      lessonCount: 10,
      lashModelCount: 5,
    },
  ];
  const quote = buildAcademyTalentQuote(
    {
      eyeScore: 4,
      handScore: 4,
      strands5Min: 35,
      errorRoot: 0,
      errorSkin: 0,
      errorStickies: 0,
      errorDirection: 0,
    },
    '2026-08-20T16:59:59.999Z',
    course,
    new Date('2026-08-20T12:00:00.000Z'),
    {
      selectedSampleCourseIds: [9],
      selectedKitCourseIds: [9],
    }
  );

  assert.equal(quote.effectiveScholarshipPercent, 90);
  assert.equal(quote.materialRewardPercent, 20);
  assert.equal(quote.courseFinalPriceVnd, 2_000_000);
  assert.equal(quote.sampleFinalPriceVnd, 400_000);
  assert.equal(quote.kitFinalPriceVnd, 800_000);
  assert.equal(quote.finalPriceVnd, 3_200_000);
  assert.deepEqual(
    quote.addOns.map((item) => [item.kind, item.scholarshipPercent]),
    [
      ['SAMPLE', 20],
      ['KIT', 20],
    ]
  );
});

test('uses independently configured sample and kit rewards for the reached ladder tier', () => {
  const tiers = ACADEMY_TALENT_TIERS.map((tier) =>
    tier.key === 'level4' ? { ...tier, sampleRewardPercent: 13, kitRewardPercent: 7 } : tier
  );
  const quote = buildAcademyTalentQuote(
    {
      eyeScore: 3,
      handScore: 3,
      strands5Min: 12,
      errorRoot: 0,
      errorSkin: 0,
      errorStickies: 0,
      errorDirection: 0,
    },
    '2026-08-20T16:59:59.999Z',
    [
      {
        courseId: 9,
        code: 'combo',
        name: 'Combo Academy',
        nameEn: null,
        listPriceVnd: 20_000_000,
        promoPriceVnd: 20_000_000,
        kitName: 'MS92',
        kitPriceVnd: 1_000_000,
        samplePriceVnd: 500_000,
        lessonCount: 10,
        lashModelCount: 5,
      },
    ],
    new Date('2026-08-20T12:00:00.000Z'),
    {
      tiers,
      selectedSampleCourseIds: [9],
      selectedKitCourseIds: [9],
    }
  );

  assert.equal(quote.sampleRewardPercent, 13);
  assert.equal(quote.kitRewardPercent, 7);
  assert.equal(quote.addOns.find((item) => item.kind === 'SAMPLE')?.scholarshipPercent, 13);
  assert.equal(quote.addOns.find((item) => item.kind === 'KIT')?.scholarshipPercent, 7);
});

test('adds the selected instructor percentage after the tuition scholarship, not to materials', () => {
  const quote = buildAcademyTalentQuote(
    {
      eyeScore: 3,
      handScore: 3,
      strands5Min: 20,
      errorRoot: 0,
      errorSkin: 0,
      errorStickies: 0,
      errorDirection: 0,
    },
    '2026-08-20T16:59:59.999Z',
    [
      {
        courseId: 1,
        code: 'combo',
        name: 'Combo Academy',
        nameEn: null,
        listPriceVnd: 25_000_000,
        promoPriceVnd: 20_000_000,
        kitName: 'MS92',
        kitPriceVnd: 1_000_000,
        samplePriceVnd: 500_000,
        lessonCount: 24,
        lashModelCount: 12,
      },
    ],
    new Date('2026-08-20T12:00:00.000Z'),
    {
      selectedSampleCourseIds: [1],
      selectedKitCourseIds: [1],
      instructorSelections: {
        1: {
          id: 2,
          code: 'giang_tran',
          staffId: null,
          displayName: 'Giảng viên Giang Trần',
          description: 'Chỉ định giảng viên chính',
          avatarUrl: null,
          surchargePercent: 20,
          isActive: true,
          sortOrder: 10,
        },
      },
    }
  );

  // 20M after 50% scholarship = 10M; instructor adds 20% of that = 2M.
  assert.equal(quote.courseFinalPriceVnd, 10_000_000);
  assert.equal(quote.teacherSurchargeVnd, 2_000_000);
  assert.equal(quote.sampleFinalPriceVnd, 400_000);
  assert.equal(quote.kitFinalPriceVnd, 800_000);
  assert.equal(quote.finalPriceVnd, 13_200_000);
  assert.equal(quote.courses[0]?.instructorSurchargeVnd, 2_000_000);
});
