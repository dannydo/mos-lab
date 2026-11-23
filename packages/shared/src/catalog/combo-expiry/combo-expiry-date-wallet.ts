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
