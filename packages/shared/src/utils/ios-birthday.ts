import { getVietnamDateYmd } from '../catalog/combo-expiry.js';

export interface CustomerBirthdayStatus {
  normalizedDob: string | null;
  isBirthdayThisMonth: boolean;
  isBirthdayToday: boolean;
  day: string;
  month: string;
  ddMm: string;
  ddMmYyyy: string;
}

const INVALID_DOB_PREFIXES = ['0000-00-00', '1970-01-01'];

function isValidMonthDay(monthNum: number, dayNum: number): boolean {
  if (!Number.isInteger(monthNum) || !Number.isInteger(dayNum)) return false;
  if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return false;
  return true;
}

/**
 * Chuẩn hóa ngày sinh của khách hàng về dạng `YYYY-MM-DD`, bỏ qua giá trị rỗng hoặc placeholder legacy (`0000-00-00`, `1970-01-01`).
 */
export function normalizeCustomerDateOfBirth(raw: string | Date | null | undefined): string | null {
  if (!raw) return null;
  if (raw instanceof Date) {
    if (Number.isNaN(raw.getTime())) return null;
    const ymd = getVietnamDateYmd(raw);
    return INVALID_DOB_PREFIXES.includes(ymd) ? null : ymd;
  }

  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  if (INVALID_DOB_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return null;

  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (ymdMatch) {
    const [, yyyy, mm, dd] = ymdMatch;
    if (yyyy === '0000' || !isValidMonthDay(Number(mm), Number(dd))) return null;
    const normalized = `${yyyy}-${mm}-${dd}`;
    return INVALID_DOB_PREFIXES.includes(normalized) ? null : normalized;
  }

  const dmyMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, dd, mm, yyyy] = dmyMatch;
    if (yyyy === '0000' || !isValidMonthDay(Number(mm), Number(dd))) return null;
    const normalized = `${yyyy}-${mm}-${dd}`;
    return INVALID_DOB_PREFIXES.includes(normalized) ? null : normalized;
  }

  return null;
}

/**
 * Xác định trạng thái sinh nhật trong tháng hiện tại (giống logic `Common.getBirthdayThisMonthDay` của iOS App cũ):
 * - Nếu tháng sinh trùng tháng hiện tại (theo múi giờ Việt Nam): trả về `isBirthdayThisMonth = true` và `day` dạng 2 chữ số (`dd`).
 * - Nếu trùng cả ngày & tháng: `isBirthdayToday = true`.
 */
export function getCustomerBirthdayThisMonthStatus(
  dob: string | Date | null | undefined,
  referenceNow: Date | string = new Date()
): CustomerBirthdayStatus {
  const normalizedDob = normalizeCustomerDateOfBirth(dob);
  if (!normalizedDob) {
    return {
      normalizedDob: null,
      isBirthdayThisMonth: false,
      isBirthdayToday: false,
      day: '',
      month: '',
      ddMm: '',
      ddMmYyyy: '',
    };
  }

  const [dobYear, dobMonth, dobDay] = normalizedDob.split('-');
  const todayYmd =
    typeof referenceNow === 'string' && /^\d{4}-\d{2}-\d{2}/.test(referenceNow.trim())
      ? referenceNow.trim().slice(0, 10)
      : getVietnamDateYmd(referenceNow instanceof Date ? referenceNow : new Date(referenceNow));
  const [, currentMonth, currentDay] = todayYmd.split('-');

  const isBirthdayThisMonth = dobMonth === currentMonth;
  const isBirthdayToday = isBirthdayThisMonth && dobDay === currentDay;

  return {
    normalizedDob,
    isBirthdayThisMonth,
    isBirthdayToday,
    day: isBirthdayThisMonth ? dobDay : '',
    month: dobMonth,
    ddMm: `${dobDay}/${dobMonth}`,
    ddMmYyyy: `${dobDay}/${dobMonth}/${dobYear}`,
  };
}
