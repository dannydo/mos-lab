import { describe, expect, it } from 'vitest';
import { calculateBkSalary } from './bk-salary.adapter';

describe('calculateBkSalary Missed threshold (BK-006 & User Requirement)', () => {
  it('does not calculate missed bonus when effective done is below 100', () => {
    // Thuý Kiều case: singleDone = 4, comboDone = 0, missedRate = 0%
    const result = calculateBkSalary({
      workDays: 26,
      singleDone: 4,
      comboDone: 0,
      missedRate: 0,
      revenueMillion: 10,
      tipAmount: 0,
    });

    expect(result.missedBonus).toBe(0);
    const missedBranch = result.branches.find((b) => b.key === 'missed');
    expect(missedBranch?.amount).toBe(0);
    expect(missedBranch?.formula).toContain('Chưa đạt mốc tối thiểu 100 khách Done');
  });

  it('does not calculate missed penalty when effective done is below 100', () => {
    // Tâm Nguyễn case: singleDone = 32, comboDone = 38 (total = 70 < 100), missedRate = 25.8%
    const result = calculateBkSalary({
      workDays: 26,
      singleDone: 32,
      comboDone: 38,
      missedRate: 25.8,
      revenueMillion: 30,
      tipAmount: 0,
    });

    expect(result.missedBonus).toBe(0);
  });

  it('calculates missed bonus/penalty when effective done reaches 100 or more', () => {
    // Bích Phượng case: singleDone = 204, comboDone = 68, missedRate = 9.8% (<= 10%)
    const result = calculateBkSalary({
      workDays: 26,
      singleDone: 204,
      comboDone: 68,
      missedRate: 9.8,
      revenueMillion: 150,
      tipAmount: 0,
    });

    expect(result.missedBonus).toBe(1000000);
  });
});
