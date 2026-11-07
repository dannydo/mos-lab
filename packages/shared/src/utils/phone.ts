/**
 * Phone security and masking utilities for customer privacy.
 * Invariant: Chuyên Viên (CV) and facility staff must never see or copy full customer phone numbers.
 * Invariant: Admin, SuperAdmin, and BK_Telesales are permitted to see full customer phone numbers.
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
 * Checks whether an actor role is part of BK_Telesales team allowed to view full customer phones.
 */
export function isTelesalesOrBkRole(role?: string | null): boolean {
  if (!role) return false;
  const normalized = String(role).trim().toLowerCase();
  return (
    normalized === 'telesales' ||
    normalized === 'telesale' ||
    normalized === 'booker' ||
    normalized === 'bk' ||
    normalized === 'bk_telesales' ||
    normalized === 'bk-telesales' ||
    normalized === 'bktelesales'
  );
}

/**
 * Checks whether an actor role is permitted to see full (unmasked) customer phone numbers.
 * Invariant: Permitted for Admin, SuperAdmin, and BK_Telesales.
 */
export function canViewUnmaskedCustomerPhone(role?: string | null): boolean {
  if (!role) return false;
  return isAdminOrSuperAdminRole(role) || isTelesalesOrBkRole(role);
}

/**
 * Checks whether an actor role is prohibited from seeing or copying plain customer phone numbers.
 * Invariant: Masked for everyone EXCEPT Admin, SuperAdmin, and BK_Telesales.
 */
export function shouldMaskCustomerPhone(role?: string | null): boolean {
  return !canViewUnmaskedCustomerPhone(role);
}

/**
 * Masks a customer phone number into secure format:
 * Requirement: **** 123456 -> show exactly last 6 digits, mask prefix with **** and a space.
 * Example: 0978.665.606 -> **** 665606
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

  // If already masked with **** 123456 or similar, normalize to **** 123456
  if (/^\*{4}\s*\d{6}$/.test(trimmed)) {
    const clean = trimmed.replace(/\D/g, '');
    return `**** ${clean.slice(-6)}`;
  }

  // If in legacy XXXX format, upgrade to **** 123456
  if (/^X{4}\s*\d{6}$/i.test(trimmed) || trimmed.startsWith('XXXX')) {
    const clean = trimmed.replace(/\D/g, '');
    if (clean.length >= 6) {
      return `**** ${clean.slice(-6)}`;
    }
    return '**** ******';
  }

  // Extract clean digits
  const cleanDigits = trimmed.replace(/\D/g, '');

  if (cleanDigits.length < 6) {
    return '**** ******';
  }

  // Rule: **** 123456 -> show exactly last 6 digits, mask prefix with **** and a space
  const last6 = cleanDigits.slice(-6);
  return `**** ${last6}`;
}
