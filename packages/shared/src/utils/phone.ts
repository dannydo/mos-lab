/**
 * Phone security and masking utilities for customer privacy.
 * Invariant: Chuyên Viên (CV) and facility staff must never see or copy full customer phone numbers.
 */

export const CV_AND_FACILITY_ROLES = [
  'cv',
  'lt',
  'technician',
  'ktv',
  'security-guard',
  'office-cleaner',
  'teacher',
  'trainee',
  'intern',
] as const;

/**
 * Checks whether an actor role is prohibited from seeing or copying plain customer phone numbers.
 */
export function shouldMaskCustomerPhone(role?: string | null): boolean {
  if (!role) return false;
  const normalized = String(role).trim().toLowerCase();
  return CV_AND_FACILITY_ROLES.some((r) => r === normalized);
}

/**
 * Masks a customer phone number into secure format (e.g. 0948***769).
 * Preserves clean prefixes while concealing middle digits.
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  if (
    !trimmed ||
    trimmed === '-' ||
    trimmed === '—' ||
    trimmed === 'Chưa có SĐT' ||
    trimmed === 'Chưa cập nhật' ||
    trimmed === 'N/A'
  ) {
    return trimmed;
  }

  // If already masked (contains *), do not re-mask
  if (trimmed.includes('*')) {
    return trimmed;
  }

  // Extract clean digits
  const cleanDigits = trimmed.replace(/\D/g, '');

  if (cleanDigits.length <= 4) {
    return '***';
  }

  if (cleanDigits.length >= 10) {
    // VN 10-11 digits (e.g. 0948676769 -> 0948***769, 00948676769 -> 0094***769)
    const firstPart = cleanDigits.slice(0, 4);
    const lastPart = cleanDigits.slice(-3);
    return `${firstPart}***${lastPart}`;
  }

  // 5 to 9 digits: keep first 3, ***, last 2
  const firstPart = cleanDigits.slice(0, 3);
  const lastPart = cleanDigits.slice(-2);
  return `${firstPart}***${lastPart}`;
}
