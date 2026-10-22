import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BibleService, EXPANDED_BIBLE_QUIZ_POOL } from './bible.service.js';
import type { SafeAny } from '@mos-lab/shared';

test('BibleService.classifyTier correctly identifies financial/legal proposals vs operational SOPs', () => {
  // 1. Financial proposal -> DANNY_FINAL
  const tier1 = BibleService.classifyTier(
    'Chính sách thưởng tip mới cho Chuyên Viên',
    'Tăng tỷ lệ tip chia sẻ',
    ['CC nhận 25% thay vì 20%'],
    ['thưởng', 'tip']
  );
  assert.equal(tier1, 'DANNY_FINAL');

  // 2. Legal / contract proposal -> DANNY_FINAL
  const tier2 = BibleService.classifyTier(
    'Quy định hợp đồng đào tạo Nghệ Nhân Mi',
    'Cam kết sau đào tạo',
    ['Thời hạn hợp đồng 12 tháng'],
    ['pháp lý', 'hợp đồng']
  );
  assert.equal(tier2, 'DANNY_FINAL');

  // 3. Operational SOP / Tips -> CORE_TEAM
  const tier3 = BibleService.classifyTier(
    'Quy trình vệ sinh nhíp và khử khuẩn mắt tại giường',
    'Các bước ngâm dung dịch cồn và sấy khô nhíp',
    ['Khử khuẩn trước mỗi ca mi'],
    ['vệ sinh', 'kỹ thuật', 'SOP']
  );
  assert.equal(tier3, 'CORE_TEAM');
});

test('BibleService proposal lifecycle and approval permissions enforce governance invariants', async () => {
  let storedConfigValue: string | null = null;

  const mockCrm = {
    crmConfig: {
      findUnique: async () => (storedConfigValue ? { value: storedConfigValue } : null),
      upsert: async (args: SafeAny) => {
        storedConfigValue = args.create?.value || args.update?.value;
        return { value: storedConfigValue };
      },
      update: async (args: SafeAny) => {
        storedConfigValue = args.data?.value;
        return { value: storedConfigValue };
      },
    },
  } as SafeAny;

  // 1. Core Team member submits a financial proposal
  const propFinancial = await BibleService.createProposal(
    mockCrm,
    {
      book: 'REWARDS',
      title: 'Đề xuất nâng mức thưởng hoa hồng gói Combo 5 lần',
      summary: 'Khuyến khích Telesales bán combo',
      commandments: ['Thưởng thêm 50.000đ mỗi combo'],
      rationale: 'Kích thích động lực bán hàng',
      tags: ['thưởng', 'combo'],
    },
    { id: 10, name: 'Nguyễn Văn Quản Lý', role: 'manager' }
  );

  assert.equal(propFinancial.tier, 'DANNY_FINAL');
  assert.equal(propFinancial.status, 'PENDING');

  // 2. Manager attempts to approve a DANNY_FINAL proposal -> MUST BE FORBIDDEN
  const failedApprove = await BibleService.approveProposal(mockCrm, propFinancial.id, {
    id: 10,
    name: 'Nguyễn Văn Quản Lý',
    role: 'manager',
  });
  assert.equal(failedApprove.success, false);
  assert.ok(failedApprove.error?.includes('Danny Do'));

  // 3. Danny Do (ID: 1, super_admin) approves -> SUCCESS
  const successApprove = await BibleService.approveProposal(mockCrm, propFinancial.id, {
    id: 1,
    name: 'Danny Do',
    role: 'super_admin',
  });
  assert.equal(successApprove.success, true);
  assert.equal(successApprove.proposal?.status, 'APPROVED');
  assert.equal(successApprove.proposal?.reviewedByName, 'Danny Do');

  // 4. Operational SOP proposal approved by Core Team Manager -> SUCCESS
  const propSop = await BibleService.createProposal(
    mockCrm,
    {
      book: 'SERVICE',
      title: 'Quy trình đắp mặt nạ mắt êm dịu cho khách',
      summary: 'Tăng trải nghiệm thư giãn',
      commandments: ['Dán nhẹ nhàng cách bờ mi 1mm'],
      rationale: 'Tránh cay mắt',
      tags: ['chăm sóc', 'dịch vụ'],
    },
    { id: 15, name: 'Tường Đoan', role: 'manager' }
  );

  assert.equal(propSop.tier, 'CORE_TEAM');

  const managerApproveSop = await BibleService.approveProposal(mockCrm, propSop.id, {
    id: 15,
    name: 'Tường Đoan',
    role: 'manager',
  });
  assert.equal(managerApproveSop.success, true);
  assert.equal(managerApproveSop.proposal?.status, 'APPROVED');
});

test('BibleService Weekly Mini-Quiz evaluates situations and rewards points based on Wings Culture', () => {
  const quizList = BibleService.getWeeklyQuiz();
  assert.ok(quizList.length >= 3);

  // Question 1: MOS-002 Sincerity
  const q1 = quizList[0];
  assert.equal(q1.commandmentId, 'MOS-002');
  assert.equal(q1.culturalKey, 'Chân Thành');

  // Test incorrect answer
  const resIncorrect = BibleService.evaluateQuizSubmission(q1.id, 'A');
  assert.ok(resIncorrect);
  assert.equal(resIncorrect.isCorrect, false);
  assert.equal(resIncorrect.earnedPoints, 0);

  // Test correct answer
  const resCorrect = BibleService.evaluateQuizSubmission(q1.id, 'C');
  assert.ok(resCorrect);
  assert.equal(resCorrect.isCorrect, true);
  assert.equal(resCorrect.earnedPoints, 10);
  assert.ok(resCorrect.explanation.includes('Chân Thành'));
});

test('BibleService Speed Quiz evaluates streaks, sudden death, updated 3/5 banana rules, and buy-attempt mechanic', async () => {
  let storedConfigValue: string | null = null;

  const mockCrm = {
    crmConfig: {
      findUnique: async () => (storedConfigValue ? { value: storedConfigValue } : null),
      upsert: async (args: SafeAny) => {
        storedConfigValue = args.create?.value || args.update?.value;
        return { value: storedConfigValue };
      },
      update: async (args: SafeAny) => {
        storedConfigValue = args.data?.value;
        return { value: storedConfigValue };
      },
    },
  } as SafeAny;

  // 1. Initial profile has 0 attempts and 0 bananas
  const initialProfile = await BibleService.getSpeedQuizProfile(mockCrm, 101);
  assert.equal(initialProfile.attemptsToday, 0);
  assert.equal(initialProfile.bananasToday, 0);
  assert.equal(initialProfile.canPlayToday, true);

  // 2. Free Run 1: Streak 5/5 correct -> Awards 2 bananas (New rule: 5 correct = 2 Bananas)
  const questions5 = EXPANDED_BIBLE_QUIZ_POOL.slice(0, 5);
  const answers5 = questions5.map((q) => ({
    questionId: q.id,
    selectedKey: q.correctKey,
    durationMs: 4000,
  }));

  const resRun1 = await BibleService.submitSpeedQuizRun(mockCrm, 101, answers5);
  assert.equal(resRun1.success, true);
  assert.equal(resRun1.data?.streak, 5);
  assert.equal(resRun1.data?.bananasEarned, 2);
  assert.equal(resRun1.data?.profile.attemptsToday, 1);
  assert.equal(resRun1.data?.profile.bananasToday, 2);

  // 3. Free Run 2: Streak 3 correct, then wrong at question 4 -> Awards 1 banana (New rule: 3 correct = 1 Banana)
  const answers3 = [
    ...questions5.slice(0, 3).map((q) => ({
      questionId: q.id,
      selectedKey: q.correctKey,
      durationMs: 5000,
    })),
    {
      questionId: questions5[3].id,
      selectedKey: (questions5[3].correctKey === 'A' ? 'B' : 'A') as 'A' | 'B' | 'C' | 'D',
      durationMs: 3000,
    },
  ];

  const resRun2 = await BibleService.submitSpeedQuizRun(mockCrm, 101, answers3);
  assert.equal(resRun2.success, true);
  assert.equal(resRun2.data?.streak, 3);
  assert.equal(resRun2.data?.bananasEarned, 1);
  assert.equal(resRun2.data?.profile.attemptsToday, 2);
  assert.equal(resRun2.data?.profile.bananasToday, 3);

  // 4. Free Run 3: Streak 2 correct, then timed out -> Awards 0 bananas (< 3 correct)
  const answers2 = [
    ...questions5.slice(0, 2).map((q) => ({
      questionId: q.id,
      selectedKey: q.correctKey,
      durationMs: 4000,
    })),
    {
      questionId: questions5[2].id,
      selectedKey: 'D' as const,
      durationMs: 15000, // timed out (> 12s)
    },
  ];

  const resRun3 = await BibleService.submitSpeedQuizRun(mockCrm, 101, answers2);
  assert.equal(resRun3.success, true);
  assert.equal(resRun3.data?.streak, 2);
  assert.equal(resRun3.data?.bananasEarned, 0);
  assert.equal(resRun3.data?.profile.attemptsToday, 3);
  assert.equal(resRun3.data?.profile.canPlayToday, false);
  assert.equal(resRun3.data?.profile.canPurchaseAttempt, true); // has 3 bananas in vault!

  // 5. 4th attempt without buying -> MUST BE REJECTED
  const resOverLimit = await BibleService.submitSpeedQuizRun(mockCrm, 101, answers5);
  assert.equal(resOverLimit.success, false);
  assert.ok(resOverLimit.error?.includes('tối đa 3 lượt'));

  // 6. Buy 1 attempt using 1 Banana
  const buyRes = await BibleService.buySpeedQuizAttempt(mockCrm, 101);
  assert.equal(buyRes.success, true);
  assert.equal(buyRes.profile?.totalBananas, 2); // 3 - 1 = 2 bananas
  assert.equal(buyRes.profile?.purchasedAttemptsToday, 1);
  assert.equal(buyRes.profile?.purchasedRunsAvailable, 1);
  assert.equal(buyRes.profile?.canPlayToday, true);

  // 7. Play purchased run with streak 3 -> Awards 1 banana (Breaks even: 2 + 1 = 3 bananas)
  const resPurchasedPlay = await BibleService.submitSpeedQuizRun(mockCrm, 101, answers3);
  assert.equal(resPurchasedPlay.success, true);
  assert.equal(resPurchasedPlay.data?.bananasEarned, 1);
  assert.equal(resPurchasedPlay.data?.profile.totalBananas, 3);
  assert.equal(resPurchasedPlay.data?.profile.purchasedRunsAvailable, 0);
  assert.equal(resPurchasedPlay.data?.profile.canPlayToday, false);
  assert.equal(resPurchasedPlay.data?.profile.canPurchaseAttempt, true);
});
