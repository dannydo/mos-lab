import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DARK_LASHES_SOP_7_STEPS_DETAILED, DEFAULT_DARK_LASH_SOP_STEPS } from './pilot.js';

describe('Pilot SOP 7 Steps Specification (MOS-FEAT-163)', () => {
  it('contains exactly 7 sequential steps from 1 to 7', () => {
    assert.equal(DARK_LASHES_SOP_7_STEPS_DETAILED.length, 7);
    DARK_LASHES_SOP_7_STEPS_DETAILED.forEach((step, idx) => {
      assert.equal(step.stepOrder, idx + 1);
    });
  });

  it('matches exactly the 7 names approved by Cô Giang Đàm', () => {
    const expectedNames = [
      'Kiểm tra & làm sạch mi',
      'Làm mềm',
      'Tạo form độ cong',
      'Cân bằng pH',
      'Màu',
      'Dưỡng Keratin',
      'Vệ sinh & hoàn thiện',
    ];
    const actualNames = DARK_LASHES_SOP_7_STEPS_DETAILED.map((s) => s.name);
    assert.deepEqual(actualNames, expectedNames);
    assert.deepEqual(DEFAULT_DARK_LASH_SOP_STEPS.map((s) => s.name), expectedNames);
  });

  it('provides comprehensive technical fields for all 7 steps', () => {
    for (const step of DARK_LASHES_SOP_7_STEPS_DETAILED) {
      assert.ok(step.purpose.trim().length > 20, `Step ${step.stepOrder} has short purpose`);
      assert.ok(step.instructions.length >= 3, `Step ${step.stepOrder} has fewer than 3 instructions`);
      assert.ok(step.materials.length >= 2, `Step ${step.stepOrder} has fewer than 2 materials`);
      assert.ok(step.qualityCheckpoints.length >= 2, `Step ${step.stepOrder} has fewer than 2 QC checkpoints`);
      assert.ok(step.commonErrors.length >= 1, `Step ${step.stepOrder} has fewer than 1 error`);
      assert.ok(step.targetMinutes > 0, `Step ${step.stepOrder} target minutes must be positive`);
      assert.ok(
        step.unverifiedNotice?.toLowerCase().includes('chờ cô giang đàm xác nhận'),
        `Step ${step.stepOrder} must have unverified notice referencing Cô Giang Đàm`
      );

      for (const m of step.materials) {
        assert.ok(m.name, `Material in step ${step.stepOrder} missing name`);
        assert.ok(m.unit, `Material in step ${step.stepOrder} missing unit`);
      }

      for (const err of step.commonErrors) {
        assert.ok(err.error, `Error in step ${step.stepOrder} missing error text`);
        assert.ok(err.remedy, `Error in step ${step.stepOrder} missing remedy text`);
      }
    }
  });

  it('strictly adheres to Wings Respectful Language Invariant (no forbidden words)', () => {
    const forbiddenWords = ['thợ mi', 'thợ kỹ thuật', 'thợ tự chủ', 'thợ lash', 'thợ cứng', 'tay nghề thợ'];
    const jsonString = JSON.stringify(DARK_LASHES_SOP_7_STEPS_DETAILED).toLowerCase();

    for (const word of forbiddenWords) {
      assert.equal(jsonString.includes(word), false, `Found forbidden word: ${word}`);
    }
    // Also check single word "thợ" as standalone word
    assert.equal(/\bthợ\b/i.test(jsonString), false, 'Found standalone forbidden word "thợ"');
  });
});
