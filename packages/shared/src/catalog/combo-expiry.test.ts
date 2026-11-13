import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  addMonthsAndDaysYmd,
  calculateComboPurchaseExpiry,
  diffDaysYmd,
  evaluateComboWalletStatus,
  formatExpiryDateDdMmYyyy,
  normalizeComboDateYmd,
} from './combo-expiry.js';
import { getMosBibleCommandmentsForPath } from '../business-rules/mos-bible.js';

describe('Canonical Combo Expiry & Revival Engine (COMBO-004)', () => {
  it('normalizes dates and handles month-end clamping safely', () => {
    assert.equal(normalizeComboDateYmd('2026-11-13 10:30:00'), '2026-11-13');
    assert.equal(normalizeComboDateYmd('13/11/2026'), '2026-11-13');
    assert.equal(normalizeComboDateYmd('0000-00-00'), null);
    assert.equal(formatExpiryDateDdMmYyyy('2027-02-13'), '13/02/2027');
    assert.equal(addMonthsAndDaysYmd('2026-01-31', 1, 0), '2026-02-28');
    assert.equal(addMonthsAndDaysYmd('2028-01-31', 1, 0), '2028-02-29');
    assert.equal(diffDaysYmd('2026-11-13', '2026-11-20'), 7);
  });

  it('evaluates wallet statuses accurately (ACTIVE, LAST_SESSION, EXPIRING_SOON, EXPIRED, FROZEN, NONE)', () => {
    const today = '2026-11-13';

    const none = evaluateComboWalletStatus({ normalRemaining: 0, retainRemaining: 0, todayYmd: today });
    assert.equal(none.isComboLive, false);
    assert.equal(none.expiryState, 'NONE');

    const frozen = evaluateComboWalletStatus({
      normalRemaining: 2,
      retainRemaining: 3,
      dateExpired: null,
      todayYmd: today,
    });
    assert.equal(frozen.isComboLive, true);
    assert.equal(frozen.isFrozen, true);
    assert.equal(frozen.expiryState, 'FROZEN');

    const expired = evaluateComboWalletStatus({
      normalRemaining: 1,
      retainRemaining: 2,
      dateExpired: '2026-11-12',
      todayYmd: today,
    });
    assert.equal(expired.isComboLive, false);
    assert.equal(expired.isExpired, true);
    assert.equal(expired.expiryState, 'EXPIRED');
    assert.equal(expired.daysRemaining, -1);

    const expiringSoon = evaluateComboWalletStatus({
      normalRemaining: 2,
      retainRemaining: 2,
      dateExpired: '2026-12-03',
      todayYmd: today,
    });
    assert.equal(expiringSoon.isComboLive, true);
    assert.equal(expiringSoon.isExpiringSoon, true);
    assert.equal(expiringSoon.expiryState, 'EXPIRING_SOON');
    assert.equal(expiringSoon.avgDaysPerSession, 5);

    const lastSession = evaluateComboWalletStatus({
      normalRemaining: 1,
      retainRemaining: 0,
      dateExpired: '2027-02-13',
      todayYmd: today,
    });
    assert.equal(lastSession.isComboLive, true);
    assert.equal(lastSession.expiryState, 'LAST_SESSION');
  });

  it('computes Group A (no existing combo): USE_NEW_COMBO vs RETAIL_OR_VOUCHER (+21 days)', () => {
    const today = '2026-11-13';

    const useNew = calculateComboPurchaseExpiry({
      todayDate: today,
      newComboValidityMonths: 3,
      newComboNormalCount: 3,
      newComboRetainCount: 0,
      todayUsageMode: 'USE_NEW_COMBO',
      todayServiceType: 'Normal',
    });
    assert.equal(useNew.formulaCode, 'NEW_USE_1');
    assert.equal(useNew.dateExpired, '2027-02-13');
    assert.equal(useNew.dateExpiredDisplay, '13/02/2027');
    assert.equal(useNew.combinedTotalAfterToday, 2);

    const retail = calculateComboPurchaseExpiry({
      todayDate: today,
      newComboValidityMonths: 3,
      newComboNormalCount: 3,
      newComboRetainCount: 0,
      todayUsageMode: 'RETAIL_OR_VOUCHER',
    });
    assert.equal(retail.formulaCode, 'NEW_RETAIL_PLUS_21D');
    assert.equal(retail.dateExpired, '2027-03-06');
    assert.equal(retail.combinedTotalAfterToday, 3);
  });

  it('computes Group B (active existing combo): all 4 renewal branches including combo_last', () => {
    const today = '2026-11-13';

    // B1: combo_last (oldTotal === 1 & USE_OLD_COMBO) -> Today + newMonths + 1M
    const lastSessionRenew = calculateComboPurchaseExpiry({
      todayDate: today,
      newComboValidityMonths: 6,
      newComboNormalCount: 4,
      newComboRetainCount: 2,
      todayUsageMode: 'USE_OLD_COMBO',
      existingCombo: {
        normalRemaining: 1,
        retainRemaining: 0,
        dateExpired: '2027-01-20',
      },
    });
    assert.equal(lastSessionRenew.formulaCode, 'RENEW_LAST_SESSION_PLUS_1M');
    assert.equal(lastSessionRenew.dateExpired, '2027-06-13');
    assert.equal(lastSessionRenew.combinedTotalAfterToday, 6);

    // B2: USE_NEW_COMBO -> oldExpiry + newMonths (no +1M)
    const useNewStack = calculateComboPurchaseExpiry({
      todayDate: today,
      newComboValidityMonths: 6,
      newComboNormalCount: 4,
      newComboRetainCount: 2,
      todayUsageMode: 'USE_NEW_COMBO',
      existingCombo: {
        normalRemaining: 2,
        retainRemaining: 1,
        dateExpired: '2026-12-20',
      },
    });
    assert.equal(useNewStack.formulaCode, 'RENEW_USE_NEW_STACK');
    assert.equal(useNewStack.dateExpired, '2027-06-20');
    assert.equal(useNewStack.combinedTotalAfterToday, 8);

    // B4: USE_OLD_COMBO with >= 2 old sessions -> oldExpiry + newMonths + 1M
    const useOldBonus = calculateComboPurchaseExpiry({
      todayDate: today,
      newComboValidityMonths: 6,
      newComboNormalCount: 4,
      newComboRetainCount: 2,
      todayUsageMode: 'USE_OLD_COMBO',
      existingCombo: {
        normalRemaining: 2,
        retainRemaining: 1,
        dateExpired: '2026-12-20',
      },
    });
    assert.equal(useOldBonus.formulaCode, 'RENEW_USE_OLD_PLUS_1M');
    assert.equal(useOldBonus.dateExpired, '2027-07-20');
    assert.equal(useOldBonus.combinedTotalAfterToday, 8);

    // B3: RETAIL_OR_VOUCHER -> oldExpiry + newMonths + 1M + 21D
    const retailBonus = calculateComboPurchaseExpiry({
      todayDate: today,
      newComboValidityMonths: 6,
      newComboNormalCount: 4,
      newComboRetainCount: 2,
      todayUsageMode: 'RETAIL_OR_VOUCHER',
      existingCombo: {
        normalRemaining: 2,
        retainRemaining: 1,
        dateExpired: '2026-12-20',
      },
    });
    assert.equal(retailBonus.formulaCode, 'RENEW_RETAIL_PLUS_1M_21D');
    assert.equal(retailBonus.dateExpired, '2027-08-10');
    assert.equal(retailBonus.combinedTotalAfterToday, 9);
  });

  it('computes Group C (expired combo revival): Normal +1M/session, Retain +25D/session, NO +1M early bonus', () => {
    const today = '2026-11-13';

    // Exact Danny confirmed example: 1 Mới + 2 Dặm expired, buy 3M package & deduct today
    // Today (2026-11-13) + 3M + 1M (4M -> 2027-03-13) + 50 days -> 2027-05-02
    const revivedUseCombo = calculateComboPurchaseExpiry({
      todayDate: today,
      newComboValidityMonths: 3,
      newComboNormalCount: 3,
      newComboRetainCount: 0,
      todayUsageMode: 'USE_NEW_COMBO',
      todayServiceType: 'Normal',
      existingCombo: {
        normalRemaining: 1,
        retainRemaining: 2,
        dateExpired: '2026-10-01',
      },
    });
    assert.equal(revivedUseCombo.formulaCode, 'REVIVE_EXPIRED_USE_COMBO');
    assert.equal(revivedUseCombo.revivedExpiredSessions, 3);
    assert.equal(revivedUseCombo.revivedMonthsFromNormal, 1);
    assert.equal(revivedUseCombo.revivedDaysFromRetain, 50);
    assert.equal(revivedUseCombo.earlyRenewalBonusMonths, 0);
    assert.equal(revivedUseCombo.dateExpired, '2027-05-02');
    // Pooled: (1+3)=4 Normal, (2+0)=2 Retain, deduct 1 Normal today -> 3 Normal + 2 Retain = 5
    assert.equal(revivedUseCombo.combinedNormalAfterToday, 3);
    assert.equal(revivedUseCombo.combinedRetainAfterToday, 2);
    assert.equal(revivedUseCombo.combinedTotalAfterToday, 5);

    // Expired combo revival + RETAIL_OR_VOUCHER today -> adds +21 days
    const revivedRetail = calculateComboPurchaseExpiry({
      todayDate: today,
      newComboValidityMonths: 3,
      newComboNormalCount: 3,
      newComboRetainCount: 0,
      todayUsageMode: 'RETAIL_OR_VOUCHER',
      existingCombo: {
        normalRemaining: 1,
        retainRemaining: 2,
        dateExpired: '2026-10-01',
      },
    });
    assert.equal(revivedRetail.formulaCode, 'REVIVE_EXPIRED_RETAIL_PLUS_21D');
    assert.equal(revivedRetail.dateExpired, '2027-05-23');
    assert.equal(revivedRetail.combinedTotalAfterToday, 6);
  });

  it('registers COMBO-004 in Kinh Thánh mOS for /ios-app contextual help', () => {
    const commandments = getMosBibleCommandmentsForPath('/ios-app');
    assert.equal(
      commandments.some((c) => c.id === 'COMBO-004'),
      true
    );
  });
});
