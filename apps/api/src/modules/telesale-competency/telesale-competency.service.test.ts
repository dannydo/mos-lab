import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TelesaleCompetencyService } from './telesale-competency.service.js';
import {
  DEFAULT_TELESALE_COMPETENCY_CONFIG,
  TELESALE_SKILL_DEFINITIONS,
  TelesaleSkillKey,
} from '@mos-lab/shared';

test('TelesaleCompetency: calculatePillarA computes 40% with working days pacing and over-achievement bonus', () => {
  // Test case 1: Exactly 100% KPI achievement
  const normal = TelesaleCompetencyService.calculatePillarA({
    bookCount: 50,
    bookTarget: 50,
    doneCount: 35,
    doneTarget: 35,
    newCustomersDone: 15,
    newCustomersTarget: 15,
    actualRevenue: 12000000,
    revenueTarget: 12000000,
    totalCalls: 1500,
    connectedCalls: 500,
    callsTarget: 1500,
    connectedTarget: 500,
    actualWorkingDays: 26,
    standardWorkingDays: 26,
  });

  assert.equal(normal.pacingFactor, 1);
  assert.ok(normal.cappedScore >= 35);
  assert.ok(normal.cappedScore <= 40);

  // Test case 2: Over-achievement (vượt KPI có thưởng điểm trần tối đa 120% = 48đ)
  const over = TelesaleCompetencyService.calculatePillarA({
    bookCount: 100,
    bookTarget: 50,
    doneCount: 70,
    doneTarget: 35,
    newCustomersDone: 30,
    newCustomersTarget: 15,
    actualRevenue: 25000000,
    revenueTarget: 12000000,
    totalCalls: 3000,
    connectedCalls: 1000,
    callsTarget: 1500,
    connectedTarget: 500,
    actualWorkingDays: 26,
    standardWorkingDays: 26,
  });

  assert.equal(over.cappedScore, 48); // Max overflow bonus cap

  // Test case 3: Working days pacing adjustment (nhân viên làm 13/26 ngày, target giảm một nửa)
  const halfMonth = TelesaleCompetencyService.calculatePillarA({
    bookCount: 25,
    bookTarget: 50,
    doneCount: 18,
    doneTarget: 35,
    newCustomersDone: 8,
    newCustomersTarget: 15,
    actualRevenue: 6000000,
    revenueTarget: 12000000,
    totalCalls: 750,
    connectedCalls: 250,
    callsTarget: 1500,
    connectedTarget: 500,
    actualWorkingDays: 13,
    standardWorkingDays: 26,
  });

  assert.equal(halfMonth.pacingFactor, 0.5);
  assert.equal(halfMonth.bookTarget, 25);
  assert.equal(halfMonth.doneTarget, 18);
  assert.ok(halfMonth.cappedScore >= 35); // Vẫn đạt trọn vẹn điểm theo pacing

  // Test case 4: Thiếu dữ liệu (Safe fallback: không tự động cho 0 điểm)
  const zeroData = TelesaleCompetencyService.calculatePillarA({
    bookCount: 0,
    bookTarget: 50,
    doneCount: 0,
    doneTarget: 35,
    newCustomersDone: 0,
    newCustomersTarget: 15,
    actualRevenue: 0,
    revenueTarget: 12000000,
    totalCalls: 0,
    connectedCalls: 0,
    actualWorkingDays: 26,
    standardWorkingDays: 26,
  });

  assert.ok(zeroData.cappedScore >= 15); // Không rơi về 0 điểm
});

test('TelesaleCompetency: calculatePillarB evaluates all 9 skills (KN01 -> KN09)', () => {
  const keys = Object.keys(TELESALE_SKILL_DEFINITIONS) as TelesaleSkillKey[];
  assert.equal(keys.length, 9);

  // Chấm điểm hoàn hảo 5/5 cho tất cả kỹ năng -> Đạt 25/25 điểm
  const perfectSkills: any = {};
  for (const k of keys) {
    perfectSkills[k] = { score: 5, notes: 'Rất xuất sắc' };
  }
  const resultPerfect = TelesaleCompetencyService.calculatePillarB(perfectSkills);
  assert.equal(resultPerfect.averageSkillScore, 5);
  assert.equal(resultPerfect.totalScore, 25);

  // Chấm điểm 4/5 -> 20/25 điểm
  const goodSkills: any = {};
  for (const k of keys) {
    goodSkills[k] = { score: 4 };
  }
  const resultGood = TelesaleCompetencyService.calculatePillarB(goodSkills);
  assert.equal(resultGood.averageSkillScore, 4);
  assert.equal(resultGood.totalScore, 20);
});

test('TelesaleCompetency: calculatePillarC evaluates job quality with penalties', () => {
  // Không có lỗi
  const flawless = TelesaleCompetencyService.calculatePillarC({
    crmRecordErrorCount: 0,
    callProcedureViolations: 0,
    managerQualityScore: 20,
  });
  assert.equal(flawless.totalScore, 20);

  // Có lỗi nhập liệu CRM và vi phạm quy trình gọi
  const flawed = TelesaleCompetencyService.calculatePillarC({
    crmRecordErrorCount: 3,
    callProcedureViolations: 2,
    managerQualityScore: 12,
  });
  assert.ok(flawed.totalScore < 18);
  assert.ok(flawed.totalScore > 0);
});

test('TelesaleCompetency: calculatePillarD evaluates discipline and requires evidence', () => {
  const goodDiscipline = TelesaleCompetencyService.calculatePillarD({
    lateArrivalCount: 0,
    unexcusedAbsenceCount: 0,
    managerAttitudeScore: 15,
  });
  assert.equal(goodDiscipline.totalScore, 15);

  const violated = TelesaleCompetencyService.calculatePillarD({
    lateArrivalCount: 2,
    unexcusedAbsenceCount: 1,
    managerAttitudeScore: 8,
    mandatoryEvidenceUrl: 'https://images.wingslashes.com/evidence/violation_102.png',
    evidenceNotes: 'Ghi nhận trễ 2 lần và nghỉ không phép ngày 12/10',
  });
  assert.ok(violated.totalScore < 12);
  assert.ok(violated.mandatoryEvidenceUrl);
});

test('TelesaleCompetency: Rule Engine checks promotion and demotion workflows', () => {
  // 1. Fresher -> Junior: Thâm niên 2 tháng + N=2 tháng liên tiếp đạt điểm chuẩn Junior (>= 75)
  const fresherReady = TelesaleCompetencyService.evaluateRuleEngine(
    'FRESHER',
    2, // Thâm niên 2 tháng
    78, // Điểm tháng này >= 75
    [{ month: '2026-09', totalScore: 76, isPassed: true }] // Tháng trước đạt 76 >= 75
  );
  assert.equal(fresherReady.ruleEngineStatus, 'PROMOTION_READY');
  assert.equal(fresherReady.recommendedTier, 'JUNIOR');
  assert.equal(fresherReady.consecutivePassMonths, 2);

  // 2. Junior -> Mid-level: Thâm niên 6 tháng + N=3 tháng liên tiếp đạt điểm chuẩn Mid-level (>= 80)
  const juniorReady = TelesaleCompetencyService.evaluateRuleEngine(
    'JUNIOR',
    6,
    82,
    [
      { month: '2026-08', totalScore: 81, isPassed: true },
      { month: '2026-09', totalScore: 83, isPassed: true },
    ]
  );
  assert.equal(juniorReady.ruleEngineStatus, 'PROMOTION_READY');
  assert.equal(juniorReady.recommendedTier, 'MID_LEVEL');
  assert.equal(juniorReady.consecutivePassMonths, 3);

  // 3. Junior chưa đủ thâm niên (mới 1 tháng) -> Không được thăng cấp dù điểm cao
  const juniorNotTenure = TelesaleCompetencyService.evaluateRuleEngine(
    'FRESHER',
    1, // Chưa đủ 2 tháng
    85,
    [{ month: '2026-09', totalScore: 85, isPassed: true }]
  );
  assert.equal(juniorNotTenure.ruleEngineStatus, 'NORMAL');

  // 4. Giáng bậc cảnh báo tháng 1 (WARNING_M1)
  const juniorFail1 = TelesaleCompetencyService.evaluateRuleEngine(
    'JUNIOR',
    4,
    65, // Trượt điểm chuẩn 75
    [{ month: '2026-09', totalScore: 78, isPassed: true }]
  );
  assert.equal(juniorFail1.isPassed, false);
  assert.equal(juniorFail1.consecutiveFailMonths, 1);
  assert.equal(juniorFail1.ruleEngineStatus, 'WARNING_M1');

  // 5. Giáng bậc 2 tháng liên tiếp không đạt (DEMOTION_FLAGGED)
  const juniorFail2 = TelesaleCompetencyService.evaluateRuleEngine(
    'JUNIOR',
    4,
    64, // Trượt tháng 2
    [{ month: '2026-09', totalScore: 68, isPassed: false }] // Tháng 1 cũng trượt
  );
  assert.equal(juniorFail2.isPassed, false);
  assert.equal(juniorFail2.consecutiveFailMonths, 2);
  assert.equal(juniorFail2.ruleEngineStatus, 'DEMOTION_FLAGGED');
  assert.equal(juniorFail2.recommendedTier, 'FRESHER');
});
