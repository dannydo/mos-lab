/**
 * Phone security and masking utilities for customer privacy.
 * Invariant: Chuyên Viên (CV) and facility staff must never see or copy full customer phone numbers.
 */

import { isAdminOrSuperAdminRole } from '../types/auth.js';

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
 * Invariant: Masked for everyone EXCEPT Admin and SuperAdmin (including Boss).
 */
export function shouldMaskCustomerPhone(role?: string | null): boolean {
  if (!role) return true;
  return !isAdminOrSuperAdminRole(role);
}

/**
 * Masks a customer phone number into secure format:
 * Requirement: XXXX123456 -> show exactly last 6 digits, mask prefix with XXXX.
 * Example: 0978.665.606 -> XXXX665606
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

  // If already masked with XXXX, do not re-mask
  if (/^X{4}\d{6}$/i.test(trimmed) || trimmed.startsWith('XXXX')) {
    return trimmed;
  }

  // Extract clean digits
  const cleanDigits = trimmed.replace(/\D/g, '');

  if (cleanDigits.length < 6) {
    return 'XXXX******';
  }

  // Rule: XXXX123456 -> show exactly last 6 digits, mask prefix with XXXX
  const last6 = cleanDigits.slice(-6);
  return `XXXX${last6}`;
}
