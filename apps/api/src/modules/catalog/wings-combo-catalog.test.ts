import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  calculateComboPurchaseAccounting,
  calculateComboRedemptionAccounting,
  checkWelcomeComboEligibility,
  formatComboName,
  getComboPackagesForCategoryAndVolume,
  getLashFamilyInfo,
  getUnderLashComboPackages,
  getVolumeFiberMeta,
  getWingsComboCategory,
  matchComboCategoryAndVolumeFromBooking,
  resolveValidVolumeForCategory,
  WINGS_COMBO_CATEGORIES,
} from '@mos-lab/shared';

describe('wings-combo-catalog decomposed module parity', () => {
  it('exposes all 16 canonical combo categories in stable order', () => {
    assert.equal(WINGS_COMBO_CATEGORIES.length, 16);
    assert.deepEqual(
      WINGS_COMBO_CATEGORIES.map((c) => c.id),
      [
        'Classic_Volume',
        'FlawlessMink',
        'HyperLight_2X',
        'HyperLight_3X',
        'HyperLight_4X',
        'HyperLight_5X',
        'IvyLight_3L',
        'IvyLight_4L',
        'IvyLight_5L',
        'UltraLight_3D',
        'UltraLight_4D',
        'UltraLight_5D',
        'VVIP',
        'Classic_1D',
        'Volume_2D',
        'Volume_3D',
      ]
    );
    assert.equal(getWingsComboCategory('FlawlessMink').id, 'FlawlessMink');
    assert.equal(getWingsComboCategory('UNKNOWN_CATEGORY').id, 'FlawlessMink');
  });

  it('resolves fiber metadata, booking matching, and lash family siblings', () => {
    const meta = getVolumeFiberMeta('HyperLight_3X', 770);
    assert.equal(meta.countPerEye, 90);
    assert.equal(meta.totalFibers, 540);
    assert.equal(meta.unitWord, 'trụ');

    const matchedDefault = matchComboCategoryAndVolumeFromBooking({
      serviceName: 'Nối Mi HyperLight 3X 0.05',
      serviceKey: 'hyperlight_3x',
    });
    assert.equal(matchedDefault.categoryId, 'HyperLight_3X');
    assert.equal(matchedDefault.volume, 660);

    const matchedBySku = matchComboCategoryAndVolumeFromBooking({
      serviceName: 'Nối Mi HyperLight 3X 770',
      serviceKey: 'hyperlight_3x',
    });
    assert.equal(matchedBySku.categoryId, 'HyperLight_3X');
    assert.equal(matchedBySku.volume, 770);

    const family = getLashFamilyInfo('IvyLight_4L');
    assert.equal(family.familyKey, 'IvyLight');
    assert.equal(family.siblings.length, 3);

    assert.equal(resolveValidVolumeForCategory('UltraLight_4D', 99), 660);
    assert.ok(getUnderLashComboPackages().length >= 4);
    assert.equal(formatComboName('Combo VIP 10D', 'vvip_pass'), '❖ VIP 10D');
  });

  it('computes welcome eligibility, purchase accounting, and redemption accounting', () => {
    assert.equal(
      checkWelcomeComboEligibility({ customerVisits: 1, lashHistoryDates: [], todayDateStr: '2026-11-22' }).eligible,
      true
    );
    assert.equal(
      checkWelcomeComboEligibility({
        customerVisits: 2,
        lashHistoryDates: ['2026-10-01'],
        todayDateStr: '2026-11-22',
      }).eligible,
      false
    );

    const pkgs = getComboPackagesForCategoryAndVolume({ categoryId: 'HyperLight_3X', volume: 770 });
    assert.ok(pkgs.length > 0);
    const purchase = calculateComboPurchaseAccounting(pkgs[0], 770_000);
    assert.equal(purchase.mode, 'BUY_NEW_COMBO');
    assert.equal(purchase.todayServiceChargeToCustomer, 0);

    const redemption = calculateComboRedemptionAccounting({
      comboName: 'Combo HyperLight 3X 770',
      baseCategoryId: 'HyperLight_3X',
      baseVolume: 770,
      requestedServiceType: 'Retain',
      daysSinceLastVisit: 18,
      paidNewRemaining: 2,
      paidRefillRemaining: 1,
      bonusNewRemaining: 1,
      bonusRefillRemaining: 1,
    });
    assert.equal(redemption.deductedBucket, 'PAID_REFILL');
    assert.equal(redemption.totalCustomerPayToday, 0);
  });
});
