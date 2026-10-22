import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BibleService } from './bible.service.js';
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
