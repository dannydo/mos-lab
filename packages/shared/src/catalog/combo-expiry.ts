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
  serviceId?: number;
  servicePriceId?: number;
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

export interface ResolveActiveBookingComboWalletsInput {
  comboWallets?: IosCustomerComboWalletItem[] | null;
  comboLiveStatus?: {
    balanceId?: number;
    isComboLive: boolean;
    remainingSessions: number;
    normalRemaining?: number;
    retainRemaining?: number;
    comboName: string;
    serviceKey?: string;
    packageKey?: string;
    retainDaysLimit?: number;
    upsellOpportunity?: boolean;
    dateExpired?: string | null;
    isExpired?: boolean;
    isFrozen?: boolean;
    isExpiringSoon?: boolean;
    daysRemaining?: number | null;
    avgDaysPerSession?: number | null;
    expiryState?: ComboExpiryState;
  } | null;
  underMinkComboStatus?: {
    balanceId?: number;
    hasUnderCombo: boolean;
    remainingSessions: number;
    normalRemaining: number;
    retainRemaining: number;
    comboName: string;
    packageKey?: string;
    dateExpired?: string | null;
    isExpired?: boolean;
    isFrozen?: boolean;
    isExpiringSoon?: boolean;
    daysRemaining?: number | null;
    avgDaysPerSession?: number | null;
    expiryState?: ComboExpiryState;
  } | null;
  selectedUpperComboBalanceId?: number | null;
  selectedUnderComboBalanceId?: number | null;
  skipUpperCombo?: boolean;
  skipUnderCombo?: boolean;
  bookedServiceName?: string | null;
  lastVisitServiceKey?: string | null;
  todayYmd?: string;
}

export interface ResolveActiveBookingComboWalletsResult {
  allWallets: IosCustomerComboWalletItem[];
  upperWallets: IosCustomerComboWalletItem[];
  underWallets: IosCustomerComboWalletItem[];
  liveUpperWallets: IosCustomerComboWalletItem[];
  liveUnderWallets: IosCustomerComboWalletItem[];
  activeUpperWallet: IosCustomerComboWalletItem | null;
  activeUnderWallet: IosCustomerComboWalletItem | null;
  displayUpperWallet: IosCustomerComboWalletItem | null;
  displayUnderWallet: IosCustomerComboWalletItem | null;
  selectedUpperComboBalanceId: number | null;
  selectedUnderComboBalanceId: number | null;
  skipUpperCombo: boolean;
  skipUnderCombo: boolean;
  isRedeemingUpperToday: boolean;
  isRedeemingUnderToday: boolean;
  hasAnyLiveUpperWallet: boolean;
  hasAnyLiveUnderWallet: boolean;
  effectiveComboLiveStatus: NonNullable<ResolveActiveBookingComboWalletsInput['comboLiveStatus']> & {
    upsellOpportunity: boolean;
  };
  effectiveUnderMinkComboStatus: NonNullable<ResolveActiveBookingComboWalletsInput['underMinkComboStatus']> | undefined;
}

function isUnderWalletDescriptor(
  w: Pick<IosCustomerComboWalletItem, 'serviceGroup' | 'comboName' | 'serviceKey'>
): boolean {
  if (w.serviceGroup === 'under') return true;
  const combined = `${w.comboName || ''} ${w.serviceKey || ''}`.toLowerCase();
  return (
    combined.includes('under') ||
    combined.includes('mi dưới') ||
    combined.includes('flawless.mink-390') ||
    combined.includes('flawless-mink-390')
  );
}

function extractLashLineAndTier(rawText?: string | null): {
  line: string | null;
  tier: string | null;
  normalized: string;
} {
  const s = String(rawText || '')
    .toLowerCase()
    .replace(/-refill$/i, '')
    .trim();
  if (!s || s.includes('any')) {
    return { line: null, tier: null, normalized: '' };
  }
  let line: string | null = null;
  if (s.includes('hyper')) line = 'hyperlight';
  else if (s.includes('ultra')) line = 'ultralight';
  else if (s.includes('ivy')) line = 'ivylight';
  else if (s.includes('flawless') || s.includes('mink')) line = 'flawless-mink';
  else if (s.includes('volume') || s.includes('2d')) line = 'volume';
  else if (s.includes('classic') || s.includes('1d')) line = 'classic';
  else if (s.includes('under') || s.includes('mi dưới')) line = 'under';

  const tierMatch = s.match(/(?:^|\D)(\d{3,4})(?:\s*k)?(?:\D|$)/i);
  const tier = tierMatch ? tierMatch[1] : null;
  return { line, tier, normalized: s };
}

function sortWalletsFefo(wallets: IosCustomerComboWalletItem[]): IosCustomerComboWalletItem[] {
  return [...wallets].sort((a, b) => {
    if (a.isExpired !== b.isExpired) return a.isExpired ? 1 : -1;
    // Live non-frozen wallets with earliest dateExpired first (FEFO)
    const aHasExpiry = !a.isFrozen && Boolean(a.dateExpired);
    const bHasExpiry = !b.isFrozen && Boolean(b.dateExpired);
    if (aHasExpiry !== bHasExpiry) return aHasExpiry ? -1 : 1;
    if (aHasExpiry && bHasExpiry && a.dateExpired !== b.dateExpired) {
      return String(a.dateExpired).localeCompare(String(b.dateExpired));
    }
    return Number(b.balanceId || 0) - Number(a.balanceId || 0);
  });
}

function pickSuggestedLiveWallet(params: {
  liveWallets: IosCustomerComboWalletItem[];
  bookedServiceName?: string | null;
  lastVisitServiceKey?: string | null;
}): IosCustomerComboWalletItem | null {
  const { liveWallets, bookedServiceName, lastVisitServiceKey } = params;
  if (liveWallets.length === 0) return null;

  const fefoSorted = sortWalletsFefo(liveWallets);
  const booked = extractLashLineAndTier(bookedServiceName);
  if (booked.line) {
    if (booked.tier) {
      const exactBooked = fefoSorted.find((w) => {
        const wt = extractLashLineAndTier(`${w.serviceKey || ''} ${w.comboName || ''}`);
        return wt.line === booked.line && wt.tier === booked.tier;
      });
      if (exactBooked) return exactBooked;
    }
    const lineBooked = fefoSorted.find((w) => {
      const wt = extractLashLineAndTier(`${w.serviceKey || ''} ${w.comboName || ''}`);
      return wt.line === booked.line;
    });
    if (lineBooked) return lineBooked;
  }

  const cleanLastKey = String(lastVisitServiceKey || '')
    .replace(/-refill$/i, '')
    .trim()
    .toLowerCase();
  if (cleanLastKey) {
    const exactLast = fefoSorted.find(
      (w) =>
        String(w.serviceKey || '')
          .replace(/-refill$/i, '')
          .trim()
          .toLowerCase() === cleanLastKey
    );
    if (exactLast) return exactLast;
    const lastTokens = extractLashLineAndTier(cleanLastKey);
    if (lastTokens.line) {
      const lineLast = fefoSorted.find((w) => {
        const wt = extractLashLineAndTier(`${w.serviceKey || ''} ${w.comboName || ''}`);
        return wt.line === lastTokens.line && (!lastTokens.tier || wt.tier === lastTokens.tier);
      });
      if (lineLast) return lineLast;
    }
  }

  return fefoSorted[0] || null;
}

/**
 * Resolves the active Mi Trên & Mi Dưới combo wallet selection for a booking across /ios-app & API settlement.
 * Supports multiple wallets per group, explicit "Không trừ gói / Đi lẻ lần này" skip flags, and smart FEFO defaults.
 */
export function resolveActiveBookingComboWallets(
  input: ResolveActiveBookingComboWalletsInput
): ResolveActiveBookingComboWalletsResult {
  const todayYmd = normalizeComboDateYmd(input.todayYmd) || getVietnamDateYmd();
  const hasExplicitWalletList = Array.isArray(input.comboWallets) && input.comboWallets.length > 0;
  const upperExplicitSplit =
    input.comboLiveStatus?.normalRemaining !== undefined || input.comboLiveStatus?.retainRemaining !== undefined;

  const upperWallets: IosCustomerComboWalletItem[] = [];
  const underWallets: IosCustomerComboWalletItem[] = [];
  const seenUpperIds = new Set<number>();
  const seenUnderIds = new Set<number>();

  if (hasExplicitWalletList) {
    for (const rawWallet of input.comboWallets!) {
      const normalizedGroup: 'upper' | 'under' = isUnderWalletDescriptor(rawWallet) ? 'under' : 'upper';
      const evalStatus = evaluateComboWalletStatus({
        normalRemaining: rawWallet.normalRemaining,
        retainRemaining: rawWallet.retainRemaining,
        remainingSessions: rawWallet.remainingSessions,
        dateExpired: rawWallet.isFrozen ? null : rawWallet.dateExpired,
        todayYmd,
      });
      const wallet: IosCustomerComboWalletItem = {
        ...rawWallet,
        serviceGroup: normalizedGroup,
        dateExpired: rawWallet.isFrozen ? null : (rawWallet.dateExpired ?? evalStatus.dateExpired),
        isFrozen: Boolean(rawWallet.isFrozen ?? evalStatus.isFrozen),
        isExpired: Boolean(rawWallet.isExpired ?? evalStatus.isExpired),
        isExpiringSoon: Boolean(rawWallet.isExpiringSoon ?? evalStatus.isExpiringSoon),
        daysRemaining: rawWallet.daysRemaining !== undefined ? rawWallet.daysRemaining : evalStatus.daysRemaining,
        avgDaysPerSession:
          rawWallet.avgDaysPerSession !== undefined ? rawWallet.avgDaysPerSession : evalStatus.avgDaysPerSession,
        expiryState: rawWallet.expiryState || evalStatus.expiryState,
      };
      if (wallet.remainingSessions <= 0) continue;
      const idNum = Number(wallet.balanceId || 0);
      if (normalizedGroup === 'under') {
        if (idNum > 0 && seenUnderIds.has(idNum)) continue;
        if (idNum > 0) seenUnderIds.add(idNum);
        underWallets.push(wallet);
      } else {
        if (idNum > 0 && seenUpperIds.has(idNum)) continue;
        if (idNum > 0) seenUpperIds.add(idNum);
        upperWallets.push(wallet);
      }
    }
  } else {
    const upper = input.comboLiveStatus;
    if (upper && (upper.remainingSessions > 0 || upper.isExpired || upper.isComboLive)) {
      const evalUpper = evaluateComboWalletStatus({
        normalRemaining: upper.normalRemaining,
        retainRemaining: upper.retainRemaining,
        remainingSessions: upper.remainingSessions,
        dateExpired: upper.isFrozen ? null : upper.dateExpired,
        todayYmd,
      });
      const fallbackNorm =
        upper.normalRemaining !== undefined
          ? Number(upper.normalRemaining)
          : Math.max(0, Math.floor(Number(upper.remainingSessions || 0) / 2));
      const fallbackRetain =
        upper.retainRemaining !== undefined
          ? Number(upper.retainRemaining)
          : Math.max(0, Number(upper.remainingSessions || 0) - fallbackNorm);
      upperWallets.push({
        balanceId: Number(upper.balanceId || 0),
        serviceGroup: 'upper',
        comboName: upper.comboName || 'Gói Combo Mi Trên',
        serviceKey: upper.serviceKey,
        packageKey: upper.packageKey,
        normalRemaining: fallbackNorm,
        retainRemaining: fallbackRetain,
        remainingSessions: Number(upper.remainingSessions || fallbackNorm + fallbackRetain),
        dateExpired: upper.isFrozen ? null : (upper.dateExpired ?? evalUpper.dateExpired),
        isFrozen: Boolean(upper.isFrozen ?? evalUpper.isFrozen),
        isExpired: Boolean(upper.isExpired ?? evalUpper.isExpired),
        isExpiringSoon: Boolean(upper.isExpiringSoon ?? evalUpper.isExpiringSoon),
        daysRemaining: upper.daysRemaining !== undefined ? upper.daysRemaining : evalUpper.daysRemaining,
        avgDaysPerSession:
          upper.avgDaysPerSession !== undefined ? upper.avgDaysPerSession : evalUpper.avgDaysPerSession,
        expiryState: upper.expiryState || evalUpper.expiryState,
        retainDaysLimit: upper.retainDaysLimit ?? 25,
      });
    }

    const under = input.underMinkComboStatus;
    if (under && (under.remainingSessions > 0 || under.isExpired || under.hasUnderCombo)) {
      const evalUnder = evaluateComboWalletStatus({
        normalRemaining: under.normalRemaining,
        retainRemaining: under.retainRemaining,
        remainingSessions: under.remainingSessions,
        dateExpired: under.isFrozen ? null : under.dateExpired,
        todayYmd,
      });
      underWallets.push({
        balanceId: Number(under.balanceId || 0),
        serviceGroup: 'under',
        comboName: under.comboName || 'Gói Combo Mi Dưới',
        normalRemaining: Number(under.normalRemaining || 0),
        retainRemaining: Number(under.retainRemaining || 0),
        remainingSessions: Number(under.remainingSessions || 0),
        dateExpired: under.isFrozen ? null : (under.dateExpired ?? evalUnder.dateExpired),
        isFrozen: Boolean(under.isFrozen ?? evalUnder.isFrozen),
        isExpired: Boolean(under.isExpired ?? evalUnder.isExpired),
        isExpiringSoon: Boolean(under.isExpiringSoon ?? evalUnder.isExpiringSoon),
        daysRemaining: under.daysRemaining !== undefined ? under.daysRemaining : evalUnder.daysRemaining,
        avgDaysPerSession:
          under.avgDaysPerSession !== undefined ? under.avgDaysPerSession : evalUnder.avgDaysPerSession,
        expiryState: under.expiryState || evalUnder.expiryState,
      });
    }
  }

  const sortedUpperWallets = sortWalletsFefo(upperWallets);
  const sortedUnderWallets = sortWalletsFefo(underWallets);
  const liveUpperWallets = sortedUpperWallets.filter((w) => !w.isExpired && w.remainingSessions > 0);
  const liveUnderWallets = sortedUnderWallets.filter((w) => !w.isExpired && w.remainingSessions > 0);

  const suggestedUpper = pickSuggestedLiveWallet({
    liveWallets: liveUpperWallets,
    bookedServiceName: input.bookedServiceName,
    lastVisitServiceKey: input.lastVisitServiceKey,
  });
  const suggestedUnder = pickSuggestedLiveWallet({
    liveWallets: liveUnderWallets,
    bookedServiceName: null,
    lastVisitServiceKey: null,
  });

  const skipUpperCombo = Boolean(input.skipUpperCombo);
  const skipUnderCombo = Boolean(input.skipUnderCombo);

  let activeUpperWallet: IosCustomerComboWalletItem | null;
  let displayUpperWallet: IosCustomerComboWalletItem | null;
  if (skipUpperCombo) {
    activeUpperWallet = null;
    displayUpperWallet = suggestedUpper || sortedUpperWallets[0] || null;
  } else if (input.selectedUpperComboBalanceId && Number(input.selectedUpperComboBalanceId) > 0) {
    const matched = sortedUpperWallets.find((w) => Number(w.balanceId) === Number(input.selectedUpperComboBalanceId));
    if (matched) {
      displayUpperWallet = matched;
      activeUpperWallet = !matched.isExpired && matched.remainingSessions > 0 ? matched : null;
    } else {
      activeUpperWallet = suggestedUpper;
      displayUpperWallet = suggestedUpper || sortedUpperWallets[0] || null;
    }
  } else {
    activeUpperWallet = suggestedUpper;
    displayUpperWallet = suggestedUpper || sortedUpperWallets[0] || null;
  }

  let activeUnderWallet: IosCustomerComboWalletItem | null;
  let displayUnderWallet: IosCustomerComboWalletItem | null;
  if (skipUnderCombo) {
    activeUnderWallet = null;
    displayUnderWallet = suggestedUnder || sortedUnderWallets[0] || null;
  } else if (input.selectedUnderComboBalanceId && Number(input.selectedUnderComboBalanceId) > 0) {
    const matched = sortedUnderWallets.find((w) => Number(w.balanceId) === Number(input.selectedUnderComboBalanceId));
    if (matched) {
      displayUnderWallet = matched;
      activeUnderWallet = !matched.isExpired && matched.remainingSessions > 0 ? matched : null;
    } else {
      activeUnderWallet = suggestedUnder;
      displayUnderWallet = suggestedUnder || sortedUnderWallets[0] || null;
    }
  } else {
    activeUnderWallet = suggestedUnder;
    displayUnderWallet = suggestedUnder || sortedUnderWallets[0] || null;
  }

  const isRedeemingUpperToday = Boolean(activeUpperWallet);
  const isRedeemingUnderToday = Boolean(activeUnderWallet);

  const effectiveComboLiveStatus: ResolveActiveBookingComboWalletsResult['effectiveComboLiveStatus'] = activeUpperWallet
    ? {
        balanceId: activeUpperWallet.balanceId > 0 ? activeUpperWallet.balanceId : input.comboLiveStatus?.balanceId,
        isComboLive: true,
        remainingSessions: activeUpperWallet.remainingSessions,
        normalRemaining: hasExplicitWalletList || upperExplicitSplit ? activeUpperWallet.normalRemaining : undefined,
        retainRemaining: hasExplicitWalletList || upperExplicitSplit ? activeUpperWallet.retainRemaining : undefined,
        comboName: activeUpperWallet.comboName,
        serviceKey: activeUpperWallet.serviceKey,
        packageKey: activeUpperWallet.packageKey,
        retainDaysLimit: activeUpperWallet.retainDaysLimit ?? 25,
        upsellOpportunity: activeUpperWallet.remainingSessions <= 2 || activeUpperWallet.isExpiringSoon,
        dateExpired: activeUpperWallet.dateExpired,
        isExpired: false,
        isFrozen: activeUpperWallet.isFrozen,
        isExpiringSoon: activeUpperWallet.isExpiringSoon,
        daysRemaining: activeUpperWallet.daysRemaining,
        avgDaysPerSession: activeUpperWallet.avgDaysPerSession,
        expiryState: activeUpperWallet.expiryState,
      }
    : displayUpperWallet && !skipUpperCombo
      ? {
          balanceId: displayUpperWallet.balanceId > 0 ? displayUpperWallet.balanceId : input.comboLiveStatus?.balanceId,
          isComboLive: false,
          remainingSessions: displayUpperWallet.remainingSessions,
          normalRemaining: hasExplicitWalletList || upperExplicitSplit ? displayUpperWallet.normalRemaining : undefined,
          retainRemaining: hasExplicitWalletList || upperExplicitSplit ? displayUpperWallet.retainRemaining : undefined,
          comboName: displayUpperWallet.comboName,
          serviceKey: displayUpperWallet.serviceKey,
          packageKey: displayUpperWallet.packageKey,
          retainDaysLimit: displayUpperWallet.retainDaysLimit ?? 25,
          upsellOpportunity: true,
          dateExpired: displayUpperWallet.dateExpired,
          isExpired: displayUpperWallet.isExpired,
          isFrozen: displayUpperWallet.isFrozen,
          isExpiringSoon: displayUpperWallet.isExpiringSoon,
          daysRemaining: displayUpperWallet.daysRemaining,
          avgDaysPerSession: displayUpperWallet.avgDaysPerSession,
          expiryState: displayUpperWallet.expiryState,
        }
      : {
          isComboLive: false,
          remainingSessions: 0,
          normalRemaining: 0,
          retainRemaining: 0,
          comboName: 'Chưa có gói ❖ Live',
          retainDaysLimit: 21,
          upsellOpportunity: true,
        };

  const effectiveUnderMinkComboStatus: ResolveActiveBookingComboWalletsResult['effectiveUnderMinkComboStatus'] =
    activeUnderWallet
      ? {
          balanceId:
            activeUnderWallet.balanceId > 0 ? activeUnderWallet.balanceId : input.underMinkComboStatus?.balanceId,
          hasUnderCombo: true,
          remainingSessions: activeUnderWallet.remainingSessions,
          normalRemaining: activeUnderWallet.normalRemaining,
          retainRemaining: activeUnderWallet.retainRemaining,
          comboName: activeUnderWallet.comboName,
          packageKey: activeUnderWallet.packageKey,
          dateExpired: activeUnderWallet.dateExpired,
          isExpired: false,
          isFrozen: activeUnderWallet.isFrozen,
          isExpiringSoon: activeUnderWallet.isExpiringSoon,
          daysRemaining: activeUnderWallet.daysRemaining,
          avgDaysPerSession: activeUnderWallet.avgDaysPerSession,
          expiryState: activeUnderWallet.expiryState,
        }
      : displayUnderWallet && !skipUnderCombo
        ? {
            balanceId:
              displayUnderWallet.balanceId > 0 ? displayUnderWallet.balanceId : input.underMinkComboStatus?.balanceId,
            hasUnderCombo: false,
            remainingSessions: displayUnderWallet.remainingSessions,
            normalRemaining: displayUnderWallet.normalRemaining,
            retainRemaining: displayUnderWallet.retainRemaining,
            comboName: displayUnderWallet.comboName,
            packageKey: displayUnderWallet.packageKey,
            dateExpired: displayUnderWallet.dateExpired,
            isExpired: displayUnderWallet.isExpired,
            isFrozen: displayUnderWallet.isFrozen,
            isExpiringSoon: displayUnderWallet.isExpiringSoon,
            daysRemaining: displayUnderWallet.daysRemaining,
            avgDaysPerSession: displayUnderWallet.avgDaysPerSession,
            expiryState: displayUnderWallet.expiryState,
          }
        : undefined;

  return {
    allWallets: [...sortedUpperWallets, ...sortedUnderWallets],
    upperWallets: sortedUpperWallets,
    underWallets: sortedUnderWallets,
    liveUpperWallets,
    liveUnderWallets,
    activeUpperWallet,
    activeUnderWallet,
    displayUpperWallet,
    displayUnderWallet,
    selectedUpperComboBalanceId: skipUpperCombo
      ? null
      : activeUpperWallet && activeUpperWallet.balanceId > 0
        ? activeUpperWallet.balanceId
        : null,
    selectedUnderComboBalanceId: skipUnderCombo
      ? null
      : activeUnderWallet && activeUnderWallet.balanceId > 0
        ? activeUnderWallet.balanceId
        : null,
    skipUpperCombo,
    skipUnderCombo,
    isRedeemingUpperToday,
    isRedeemingUnderToday,
    hasAnyLiveUpperWallet: liveUpperWallets.length > 0,
    hasAnyLiveUnderWallet: liveUnderWallets.length > 0,
    effectiveComboLiveStatus,
    effectiveUnderMinkComboStatus,
  };
}
