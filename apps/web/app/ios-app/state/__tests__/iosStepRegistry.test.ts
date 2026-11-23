import { describe, expect, it } from 'vitest';
import { IOS_STEP_NUMBER_TO_ID, IOS_STEPS, resolveIosStepId, type IosStepId } from '../iosStepRegistry';

describe('iosStepRegistry', () => {
  it('maps every step 1..15 bijectively with no duplicate or skipped step numbers', () => {
    const entries = Object.entries(IOS_STEPS) as Array<[IosStepId, number]>;
    expect(entries).toHaveLength(15);

    const seenNumbers = new Set<number>();
    for (const [id, num] of entries) {
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(15);
      expect(seenNumbers.has(num)).toBe(false);
      seenNumbers.add(num);
      expect(IOS_STEP_NUMBER_TO_ID[num as keyof typeof IOS_STEP_NUMBER_TO_ID]).toBe(id);
      expect(resolveIosStepId(num)).toBe(id);
    }
  });

  it('preserves the Step 8 cleaned offset and final receipt step constants', () => {
    expect(IOS_STEPS.LASH_CLEANED).toBe(8);
    expect(IOS_STEPS.LASH_TIMER).toBe(9);
    expect(IOS_STEPS.LASH_AFTER).toBe(10);
    expect(IOS_STEPS.PRODUCT_UPSELL).toBe(12);
    expect(IOS_STEPS.CHECKOUT).toBe(13);
    expect(IOS_STEPS.RECEIPT_DONE).toBe(15);
  });

  it('falls back to INCOMING for unknown step numbers', () => {
    expect(resolveIosStepId(0)).toBe('INCOMING');
    expect(resolveIosStepId(99)).toBe('INCOMING');
    expect(resolveIosStepId(-1)).toBe('INCOMING');
  });
});
