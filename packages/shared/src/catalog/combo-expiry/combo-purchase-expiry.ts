import {
  addMonthsAndDaysYmd,
  COMBO_EARLY_RENEWAL_BONUS_MONTHS,
  COMBO_EXPIRED_REVIVAL_NORMAL_MONTHS,
  COMBO_EXPIRED_REVIVAL_RETAIN_DAYS,
  COMBO_RETAIL_OR_VOUCHER_BONUS_DAYS,
  type ComboPurchaseExpiryInput,
  type ComboPurchaseExpiryResult,
  diffDaysYmd,
  evaluateComboWalletStatus,
  formatExpiryDateDdMmYyyy,
  getVietnamDateYmd,
  normalizeComboDateYmd,
} from './combo-expiry-date-wallet.js';

function deductOneSessionFromCounts(
  normalCount: number,
  retainCount: number,
  serviceType: 'Normal' | 'Retain' = 'Normal'
): { normal: number; retain: number } {
  if (serviceType === 'Retain') {
    if (retainCount > 0) return { normal: normalCount, retain: retainCount - 1 };
    if (normalCount > 0) return { normal: normalCount - 1, retain: retainCount };
    return { normal: normalCount, retain: retainCount };
  }
  if (normalCount > 0) return { normal: normalCount - 1, retain: retainCount };
  if (retainCount > 0) return { normal: normalCount, retain: retainCount - 1 };
  return { normal: normalCount, retain: retainCount };
}

/**
 * Computes the exact `date_expired` (`YYYY-MM-DD` & `dd/MM/yyyy`) and combined wallet counts
 * when selling a new Upper Lash or Under Mink Combo package.
 */
export function calculateComboPurchaseExpiry(input: ComboPurchaseExpiryInput): ComboPurchaseExpiryResult {
  const today = normalizeComboDateYmd(input.todayDate) || getVietnamDateYmd();
  const newMonths = Math.max(1, Math.trunc(Number(input.newComboValidityMonths || 3)));
  const newNormal = Math.max(0, Math.trunc(Number(input.newComboNormalCount || 0)));
  const newRetain = Math.max(0, Math.trunc(Number(input.newComboRetainCount || 0)));
  const serviceType = input.todayServiceType || 'Normal';

  const oldNormal = Math.max(0, Math.trunc(Number(input.existingCombo?.normalRemaining || 0)));
  const oldRetain = Math.max(0, Math.trunc(Number(input.existingCombo?.retainRemaining || 0)));
  const oldTotal = oldNormal + oldRetain;

  const existingStatus = evaluateComboWalletStatus({
    normalRemaining: oldNormal,
    retainRemaining: oldRetain,
    dateExpired: input.existingCombo?.isFrozen ? null : input.existingCombo?.dateExpired,
    todayYmd: today,
  });

  // =========================================================================
  // NHÓM A: KHÁCH KHÔNG CÒN COMBO (oldTotal <= 0)
  // =========================================================================
  if (oldTotal <= 0) {
    const isRetailOrVoucher = input.todayUsageMode === 'RETAIL_OR_VOUCHER';
    const bonusDays = isRetailOrVoucher ? COMBO_RETAIL_OR_VOUCHER_BONUS_DAYS : 0;
    const dateExpired = addMonthsAndDaysYmd(today, newMonths, bonusDays);
    const afterCounts = isRetailOrVoucher
      ? { normal: newNormal, retain: newRetain }
      : deductOneSessionFromCounts(newNormal, newRetain, serviceType);

    return {
      dateExpired,
      dateExpiredDisplay: formatExpiryDateDdMmYyyy(dateExpired),
      totalDaysFromToday: diffDaysYmd(today, dateExpired),
      addedMonths: newMonths,
      addedDays: bonusDays,
      earlyRenewalBonusMonths: 0,
      retailVoucherBonusDays: bonusDays,
      revivedExpiredSessions: 0,
      revivedNormalSessions: 0,
      revivedRetainSessions: 0,
      revivedMonthsFromNormal: 0,
      revivedDaysFromRetain: 0,
      formulaCode: isRetailOrVoucher ? 'NEW_RETAIL_PLUS_21D' : 'NEW_USE_1',
      formulaSummaryVi: isRetailOrVoucher
        ? `${newMonths} tháng quy định + ${COMBO_RETAIL_OR_VOUCHER_BONUS_DAYS} ngày (đi lẻ / Voucher hôm nay)`
        : `${newMonths} tháng theo quy định gói (trừ 1 buổi hôm nay)`,
      combinedNormalAfterToday: afterCounts.normal,
      combinedRetainAfterToday: afterCounts.retain,
      combinedTotalAfterToday: afterCounts.normal + afterCounts.retain,
    };
  }

  // =========================================================================
  // NHÓM C: KHÁCH CÓ COMBO CŨ ĐÃ HẾT HẠN (oldTotal > 0 && isExpired)
  // -> Cứu toàn bộ buổi tồn: Nối mới +1 tháng/buổi, Dặm +25 ngày/buổi từ Hôm nay,
  //    cộng Thời hạn gói mới (KHÔNG cộng +1 tháng thưởng gia hạn sớm).
  // =========================================================================
  if (existingStatus.isExpired) {
    const revivedMonths = oldNormal * COMBO_EXPIRED_REVIVAL_NORMAL_MONTHS;
    const revivedDays = oldRetain * COMBO_EXPIRED_REVIVAL_RETAIN_DAYS;
    const isRetailOrVoucher = input.todayUsageMode === 'RETAIL_OR_VOUCHER';
    const retailBonusDays = isRetailOrVoucher ? COMBO_RETAIL_OR_VOUCHER_BONUS_DAYS : 0;

    const totalAddedMonths = newMonths + revivedMonths;
    const totalAddedDays = revivedDays + retailBonusDays;
    const dateExpired = addMonthsAndDaysYmd(today, totalAddedMonths, totalAddedDays);

    const pooledNormal = oldNormal + newNormal;
    const pooledRetain = oldRetain + newRetain;
    const afterCounts = isRetailOrVoucher
      ? { normal: pooledNormal, retain: pooledRetain }
      : deductOneSessionFromCounts(pooledNormal, pooledRetain, serviceType);

    const revivalParts: string[] = [];
    if (oldNormal > 0) revivalParts.push(`${oldNormal} Mới (+${revivedMonths}T)`);
    if (oldRetain > 0) revivalParts.push(`${oldRetain} Dặm (+${revivedDays}N)`);

    return {
      dateExpired,
      dateExpiredDisplay: formatExpiryDateDdMmYyyy(dateExpired),
      totalDaysFromToday: diffDaysYmd(today, dateExpired),
      addedMonths: totalAddedMonths,
      addedDays: totalAddedDays,
      earlyRenewalBonusMonths: 0,
      retailVoucherBonusDays: retailBonusDays,
      revivedExpiredSessions: oldTotal,
      revivedNormalSessions: oldNormal,
      revivedRetainSessions: oldRetain,
      revivedMonthsFromNormal: revivedMonths,
      revivedDaysFromRetain: revivedDays,
      formulaCode: isRetailOrVoucher ? 'REVIVE_EXPIRED_RETAIL_PLUS_21D' : 'REVIVE_EXPIRED_USE_COMBO',
      formulaSummaryVi: isRetailOrVoucher
        ? `Cứu ${oldTotal} buổi cũ (${revivalParts.join(', ')}) + ${newMonths}T gói mới + ${COMBO_RETAIL_OR_VOUCHER_BONUS_DAYS}N đi lẻ/Voucher`
        : `Cứu ${oldTotal} buổi cũ (${revivalParts.join(', ')}) + ${newMonths}T gói mới`,
      combinedNormalAfterToday: afterCounts.normal,
      combinedRetainAfterToday: afterCounts.retain,
      combinedTotalAfterToday: afterCounts.normal + afterCounts.retain,
    };
  }

  // =========================================================================
  // NHÓM B: KHÁCH ĐANG CÒN COMBO CÒN HẠN (ACTIVE / LAST_SESSION / EXPIRING_SOON / FROZEN)
  // =========================================================================
  const anchorOldExpiryYmd = existingStatus.dateExpired
    ? existingStatus.dateExpired
    : addMonthsAndDaysYmd(today, Math.max(1, Number(input.existingCombo?.validityMonthsFallback || 3)), 0);
  const oldRemainingDays = Math.max(0, diffDaysYmd(today, anchorOldExpiryYmd));

  // Nhánh B1: Buổi cuối cùng của gói cũ (oldTotal === 1) và hôm nay trừ nốt về 0 (USE_OLD_COMBO)
  if (oldTotal === 1 && input.todayUsageMode === 'USE_OLD_COMBO') {
    const addedMonths = newMonths + COMBO_EARLY_RENEWAL_BONUS_MONTHS;
    const dateExpired = addMonthsAndDaysYmd(today, addedMonths, 0);
    return {
      dateExpired,
      dateExpiredDisplay: formatExpiryDateDdMmYyyy(dateExpired),
      totalDaysFromToday: diffDaysYmd(today, dateExpired),
      addedMonths,
      addedDays: 0,
      earlyRenewalBonusMonths: COMBO_EARLY_RENEWAL_BONUS_MONTHS,
      retailVoucherBonusDays: 0,
      revivedExpiredSessions: 0,
      revivedNormalSessions: 0,
      revivedRetainSessions: 0,
      revivedMonthsFromNormal: 0,
      revivedDaysFromRetain: 0,
      formulaCode: 'RENEW_LAST_SESSION_PLUS_1M',
      formulaSummaryVi: `Trừ buổi cuối gói cũ + ${newMonths}T gói mới + 1T thưởng mua nối tiếp sớm`,
      combinedNormalAfterToday: newNormal,
      combinedRetainAfterToday: newRetain,
      combinedTotalAfterToday: newNormal + newRetain,
    };
  }

  // Nhánh B2: Combo mới dùng 1 lần (USE_NEW_COMBO) -> Thời hạn gói mới + Thời gian còn lại gói cũ
  if (input.todayUsageMode === 'USE_NEW_COMBO') {
    const dateExpired = addMonthsAndDaysYmd(anchorOldExpiryYmd, newMonths, 0);
    const newAfter = deductOneSessionFromCounts(newNormal, newRetain, serviceType);
    const combinedNormal = oldNormal + newAfter.normal;
    const combinedRetain = oldRetain + newAfter.retain;
    return {
      dateExpired,
      dateExpiredDisplay: formatExpiryDateDdMmYyyy(dateExpired),
      totalDaysFromToday: diffDaysYmd(today, dateExpired),
      addedMonths: newMonths,
      addedDays: oldRemainingDays,
      earlyRenewalBonusMonths: 0,
      retailVoucherBonusDays: 0,
      revivedExpiredSessions: 0,
      revivedNormalSessions: 0,
      revivedRetainSessions: 0,
      revivedMonthsFromNormal: 0,
      revivedDaysFromRetain: 0,
      formulaCode: 'RENEW_USE_NEW_STACK',
      formulaSummaryVi: `${newMonths}T gói mới + ${oldRemainingDays}N còn lại của gói cũ (trừ 1 buổi gói mới)`,
      combinedNormalAfterToday: combinedNormal,
      combinedRetainAfterToday: combinedRetain,
      combinedTotalAfterToday: combinedNormal + combinedRetain,
    };
  }

  // Nhánh B3: Đi lẻ hoặc dùng Voucher (RETAIL_OR_VOUCHER) -> + Thời hạn gói mới + Thời gian còn lại gói cũ + 1 tháng + 21 ngày
  if (input.todayUsageMode === 'RETAIL_OR_VOUCHER') {
    const dateExpired = addMonthsAndDaysYmd(
      anchorOldExpiryYmd,
      newMonths + COMBO_EARLY_RENEWAL_BONUS_MONTHS,
      COMBO_RETAIL_OR_VOUCHER_BONUS_DAYS
    );
    const combinedNormal = oldNormal + newNormal;
    const combinedRetain = oldRetain + newRetain;
    return {
      dateExpired,
      dateExpiredDisplay: formatExpiryDateDdMmYyyy(dateExpired),
      totalDaysFromToday: diffDaysYmd(today, dateExpired),
      addedMonths: newMonths + COMBO_EARLY_RENEWAL_BONUS_MONTHS,
      addedDays: oldRemainingDays + COMBO_RETAIL_OR_VOUCHER_BONUS_DAYS,
      earlyRenewalBonusMonths: COMBO_EARLY_RENEWAL_BONUS_MONTHS,
      retailVoucherBonusDays: COMBO_RETAIL_OR_VOUCHER_BONUS_DAYS,
      revivedExpiredSessions: 0,
      revivedNormalSessions: 0,
      revivedRetainSessions: 0,
      revivedMonthsFromNormal: 0,
      revivedDaysFromRetain: 0,
      formulaCode: 'RENEW_RETAIL_PLUS_1M_21D',
      formulaSummaryVi: `${newMonths}T gói mới + ${oldRemainingDays}N gói cũ + 1T mua sớm + ${COMBO_RETAIL_OR_VOUCHER_BONUS_DAYS}N đi lẻ/Voucher`,
      combinedNormalAfterToday: combinedNormal,
      combinedRetainAfterToday: combinedRetain,
      combinedTotalAfterToday: combinedNormal + combinedRetain,
    };
  }

  // Nhánh B4 (Mặc định khi còn >= 2 buổi): USE_OLD_COMBO -> + Thời hạn gói mới + Thời gian còn lại gói cũ + 1 tháng
  const dateExpired = addMonthsAndDaysYmd(anchorOldExpiryYmd, newMonths + COMBO_EARLY_RENEWAL_BONUS_MONTHS, 0);
  const oldAfter = deductOneSessionFromCounts(oldNormal, oldRetain, serviceType);
  const combinedNormal = oldAfter.normal + newNormal;
  const combinedRetain = oldAfter.retain + newRetain;

  return {
    dateExpired,
    dateExpiredDisplay: formatExpiryDateDdMmYyyy(dateExpired),
    totalDaysFromToday: diffDaysYmd(today, dateExpired),
    addedMonths: newMonths + COMBO_EARLY_RENEWAL_BONUS_MONTHS,
    addedDays: oldRemainingDays,
    earlyRenewalBonusMonths: COMBO_EARLY_RENEWAL_BONUS_MONTHS,
    retailVoucherBonusDays: 0,
    revivedExpiredSessions: 0,
    revivedNormalSessions: 0,
    revivedRetainSessions: 0,
    revivedMonthsFromNormal: 0,
    revivedDaysFromRetain: 0,
    formulaCode: 'RENEW_USE_OLD_PLUS_1M',
    formulaSummaryVi: `${newMonths}T gói mới + ${oldRemainingDays}N gói cũ + 1T thưởng mua sớm`,
    combinedNormalAfterToday: combinedNormal,
    combinedRetainAfterToday: combinedRetain,
    combinedTotalAfterToday: combinedNormal + combinedRetain,
  };
}
