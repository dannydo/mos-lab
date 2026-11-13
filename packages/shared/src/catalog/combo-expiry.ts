/**
 * Canonical Combo Expiry (HSD) & Revival Engine — Single Source of Truth
 *
 * Implements the exact business canon aligned with Legacy WingsLashes & mOS Kinh Thánh (COMBO-004):
 *
 * 1. Khách ĐANG CÒN Combo còn hạn & mua thêm Combo mới:
 *    - Nhánh đặc biệt Buổi cuối (gói cũ còn đúng 1 buổi và hôm nay trừ nốt buổi cuối về 0):
 *      HSD mới = Hôm nay + Thời hạn gói mới + 1 tháng thưởng mua nối tiếp sớm.
 *    - Combo mới dùng 1 lần (trừ 1 buổi vào gói mới):
 *      HSD mới = Thời hạn gói mới + Thời gian còn lại của gói cũ (= HSD gói cũ + Thời hạn gói mới).
 *    - Combo mới dùng 0 lần (trừ 1 buổi vào gói cũ, gói cũ còn >= 2 buổi trước khi trừ):
 *      HSD mới = Thời hạn gói mới + Thời gian còn lại của gói cũ + 1 tháng.
 *    - Combo mới dùng 0 lần + Combo cũ dùng 0 lần (hôm nay đi lẻ hoặc dùng Voucher):
 *      HSD mới = Thời hạn gói mới + Thời gian còn lại của gói cũ + 1 tháng + 21 ngày.
 *
 * 2. Khách KHÔNG CÒN Combo & mua Combo mới:
 *    - Combo mới dùng 1 lần:
 *      HSD mới = Hôm nay + Thời hạn gói mới.
 *    - Combo mới dùng 0 lần (hôm nay đi lẻ hoặc dùng Voucher):
 *      HSD mới = Hôm nay + Thời hạn gói mới + 21 ngày.
 *
 * 3. Khách có Combo CŨ ĐÃ HẾT HẠN (date_expired < Hôm nay, còn buổi tồn > 0):
 *    - Nếu KHÔNG mua Combo mới: khóa trừ buổi 0đ (isComboLive = false, isExpired = true).
 *    - Nếu MUA Combo mới:
 *      + Bước 1: Cứu toàn bộ buổi tồn của gói cũ, quy đổi thời gian từ Hôm nay theo:
 *        Nối mới = +1 tháng/buổi, Dặm = +25 ngày/buổi.
 *      + Bước 2: Cộng Thời hạn gói mới (KHÔNG cộng +1 tháng thưởng gia hạn sớm vì gói cũ đã trễ hạn;
 *        nếu hôm nay đi lẻ hoặc dùng Voucher thì cộng thêm +21 ngày).
 *
 * 4. Áp dụng đồng nhất 100% cho cả Combo Mi Trên và Combo Mi Dưới (độc lập theo từng ví).
 */

export type ComboExpiryState = 'NONE' | 'ACTIVE' | 'LAST_SESSION' | 'EXPIRING_SOON' | 'EXPIRED' | 'FROZEN';

export type ComboTodayUsageMode = 'USE_NEW_COMBO' | 'USE_OLD_COMBO' | 'RETAIL_OR_VOUCHER';

export type ComboPurchaseExpiryFormulaCode =
  | 'NEW_USE_1'
  | 'NEW_RETAIL_PLUS_21D'
  | 'RENEW_LAST_SESSION_PLUS_1M'
  | 'RENEW_USE_NEW_STACK'
  | 'RENEW_USE_OLD_PLUS_1M'
  | 'RENEW_RETAIL_PLUS_1M_21D'
  | 'REVIVE_EXPIRED_USE_COMBO'
  | 'REVIVE_EXPIRED_RETAIL_PLUS_21D';

export interface IosCustomerComboWalletItem {
  balanceId: number;
  serviceGroup: 'upper' | 'under';
  comboName: string;
  serviceKey?: string;
  packageKey?: string;
  normalRemaining: number;
  retainRemaining: number;
  remainingSessions: number;
  dateExpired?: string | null;
  isFrozen: boolean;
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number | null;
  avgDaysPerSession: number | null;
  expiryState: ComboExpiryState;
  retainDaysLimit?: number;
  expiryAfterDay?: number;
  note?: string;
}

export interface ExistingComboSnapshotForExpiry {
  normalRemaining: number;
  retainRemaining: number;
  dateExpired?: string | null;
  isFrozen?: boolean;
  validityMonthsFallback?: number;
}

export interface ComboPurchaseExpiryInput {
  todayDate?: string | Date;
  newComboValidityMonths: number;
  newComboNormalCount?: number;
  newComboRetainCount?: number;
  todayUsageMode: ComboTodayUsageMode;
  todayServiceType?: 'Normal' | 'Retain';
  existingCombo?: ExistingComboSnapshotForExpiry | null;
}

export interface ComboPurchaseExpiryResult {
  dateExpired: string;
  dateExpiredDisplay: string;
  totalDaysFromToday: number;
  addedMonths: number;
  addedDays: number;
  earlyRenewalBonusMonths: number;
  retailVoucherBonusDays: number;
  revivedExpiredSessions: number;
  revivedNormalSessions: number;
  revivedRetainSessions: number;
  revivedMonthsFromNormal: number;
  revivedDaysFromRetain: number;
  formulaCode: ComboPurchaseExpiryFormulaCode;
  formulaSummaryVi: string;
  combinedNormalAfterToday: number;
  combinedRetainAfterToday: number;
  combinedTotalAfterToday: number;
}

export const COMBO_EXPIRING_SOON_DAYS_THRESHOLD = 30;
export const COMBO_RETAIL_OR_VOUCHER_BONUS_DAYS = 21;
export const COMBO_EARLY_RENEWAL_BONUS_MONTHS = 1;
export const COMBO_EXPIRED_REVIVAL_NORMAL_MONTHS = 1;
export const COMBO_EXPIRED_REVIVAL_RETAIN_DAYS = 25;

/**
 * Normalizes any Date or date-like string into canonical `YYYY-MM-DD` (Vietnam timezone when given Date/ISO).
 */
export function normalizeComboDateYmd(input?: string | Date | null): string | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed || trimmed === '0000-00-00' || trimmed.startsWith('0000-00-00')) {
      return null;
    }
    const isoPrefix = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoPrefix) {
      return `${isoPrefix[1]}-${isoPrefix[2]}-${isoPrefix[3]}`;
    }
    const dmyMatch = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return getVietnamDateYmd(parsed);
    }
    return null;
  }
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return getVietnamDateYmd(input);
  }
  return null;
}

export function getVietnamDateYmd(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

export function formatExpiryDateDdMmYyyy(input?: string | Date | null): string {
  const ymd = normalizeComboDateYmd(input);
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

export function formatExpiryDateShortDdMm(input?: string | Date | null): string {
  const ymd = normalizeComboDateYmd(input);
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y.slice(-2)}`;
}

function parseYmdParts(ymd: string): { year: number; month: number; day: number } {
  const [y, m, d] = ymd.split('-').map((n) => Number(n));
  return { year: y, month: m, day: d };
}

function daysInUtcMonth(year: number, month1Based: number): number {
  return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
}

function formatUtcDateToYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Adds `months` calendar months (clamping end-of-month safely, e.g. Jan 31 + 1M -> Feb 28/29)
 * followed by `days` exact calendar days, returning `YYYY-MM-DD`.
 */
export function addMonthsAndDaysYmd(baseYmd: string, months: number, days: number): string {
  const { year, month, day } = parseYmdParts(baseYmd);
  const totalMonthsZeroBased = year * 12 + (month - 1) + Math.trunc(months);
  const targetYear = Math.floor(totalMonthsZeroBased / 12);
  const targetMonth1Based = (totalMonthsZeroBased % 12) + 1;
  const clampedDay = Math.min(day, daysInUtcMonth(targetYear, targetMonth1Based));

  const utc = new Date(Date.UTC(targetYear, targetMonth1Based - 1, clampedDay));
  utc.setUTCDate(utc.getUTCDate() + Math.trunc(days));
  return formatUtcDateToYmd(utc);
}

/**
 * Exact calendar day difference `toYmd - fromYmd` (negative if `toYmd` is before `fromYmd`).
 */
export function diffDaysYmd(fromYmd: string, toYmd: string): number {
  const f = parseYmdParts(fromYmd);
  const t = parseYmdParts(toYmd);
  const fromUtc = Date.UTC(f.year, f.month - 1, f.day);
  const toUtc = Date.UTC(t.year, t.month - 1, t.day);
  return Math.round((toUtc - fromUtc) / 86_400_000);
}

export interface EvaluatedComboWalletStatus {
  isComboLive: boolean;
  isExpired: boolean;
  isFrozen: boolean;
  isExpiringSoon: boolean;
  dateExpired: string | null;
  daysRemaining: number | null;
  avgDaysPerSession: number | null;
  expiryState: ComboExpiryState;
}

/**
 * Evaluates a customer's combo balance row against `todayYmd`.
 * - Expired combos (`dateExpired < todayYmd`) return `isComboLive: false, isExpired: true`
 *   so 0d session deduction is locked until renewed or unlocked by Admin.
 * - Frozen combos (`dateExpired === null` while sessions > 0) return `isComboLive: true, isFrozen: true`
 *   and activate expiry from `today` upon first session deduction.
 */
export function evaluateComboWalletStatus(params: {
  normalRemaining?: number | null;
  retainRemaining?: number | null;
  remainingSessions?: number | null;
  dateExpired?: string | Date | null;
  todayYmd?: string;
}): EvaluatedComboWalletStatus {
  const normal = Math.max(0, Number(params.normalRemaining || 0));
  const retain = Math.max(0, Number(params.retainRemaining || 0));
  const remaining =
    params.remainingSessions !== undefined && params.remainingSessions !== null
      ? Math.max(0, Number(params.remainingSessions))
      : normal + retain;

  const normalizedExpiry = normalizeComboDateYmd(params.dateExpired);
  const today = normalizeComboDateYmd(params.todayYmd) || getVietnamDateYmd();

  if (remaining <= 0) {
    return {
      isComboLive: false,
      isExpired: false,
      isFrozen: false,
      isExpiringSoon: false,
      dateExpired: null,
      daysRemaining: null,
      avgDaysPerSession: null,
      expiryState: 'NONE',
    };
  }

  if (!normalizedExpiry) {
    return {
      isComboLive: true,
      isExpired: false,
      isFrozen: true,
      isExpiringSoon: false,
      dateExpired: null,
      daysRemaining: null,
      avgDaysPerSession: null,
      expiryState: 'FROZEN',
    };
  }

  const daysRemaining = diffDaysYmd(today, normalizedExpiry);
  if (daysRemaining < 0) {
    return {
      isComboLive: false,
      isExpired: true,
      isFrozen: false,
      isExpiringSoon: false,
      dateExpired: normalizedExpiry,
      daysRemaining,
      avgDaysPerSession: null,
      expiryState: 'EXPIRED',
    };
  }

  const avgDaysPerSession = Number((daysRemaining / remaining).toFixed(1));
  const isExpiringSoon = daysRemaining <= COMBO_EXPIRING_SOON_DAYS_THRESHOLD;
  const expiryState: ComboExpiryState = remaining === 1 ? 'LAST_SESSION' : isExpiringSoon ? 'EXPIRING_SOON' : 'ACTIVE';

  return {
    isComboLive: true,
    isExpired: false,
    isFrozen: false,
    isExpiringSoon,
    dateExpired: normalizedExpiry,
    daysRemaining,
    avgDaysPerSession,
    expiryState,
  };
}

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
