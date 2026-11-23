import dayjs from 'dayjs';
import type { Customer } from '@mos-lab/shared';
import { safeStorage } from '~/lib/safe-storage';
import {
  DEFAULT_CUSTOMER_BOOKING_URL,
  DEFAULT_SMS_STORE_PHONE,
  SMS_MODAL_MAX_WIDTH,
  SMS_MODAL_MIN_SAVED_WIDTH,
  SMS_MODAL_WIDTH_STORAGE_KEY,
  type SmsSegmentMetrics,
  type SmsStoredUser,
} from './smsModalTypes';

/** Formats an ISO/date string safely with a stable fallback instead of rendering "Invalid Date". */
export function formatSafeDate(val: string | null | undefined, formatStr = 'DD/MM/YYYY', fallback = 'N/A'): string {
  if (!val) return fallback;
  const parsed = dayjs(val);
  if (!parsed.isValid()) return fallback;
  const formatted = parsed.format(formatStr);
  return formatted === 'Invalid Date' ? fallback : formatted;
}

/** Builds the SMS variable substitution dictionary for the active customer and booking short URL. */
export function buildSmsTagValues(
  customer: Customer | null,
  selectedPhone: string,
  customerBookingUrl: string
): Record<string, string> {
  if (!customer) return {};

  let expiryDateStr = 'N/A';
  if (customer.comboBalance?.expiryDate) {
    expiryDateStr = formatSafeDate(customer.comboBalance.expiryDate, 'DD/MM/YYYY', 'N/A');
  } else if (customer.newComboDetails?.purchaseDate) {
    const purchase = dayjs(customer.newComboDetails.purchaseDate);
    expiryDateStr = purchase.isValid() ? purchase.add(30, 'day').format('DD/MM/YYYY') : 'N/A';
  } else {
    expiryDateStr = '25/08/2026';
  }
  if (expiryDateStr === 'Invalid Date') {
    expiryDateStr = 'N/A';
  }

  const rawLastDate = customer.lastVisit || customer.lastBookingDate;
  const ngayLamNearStr = rawLastDate ? formatSafeDate(rawLastDate, 'DD/MM/YYYY', 'N/A') : 'N/A';

  const totalRemaining = customer.comboBalance
    ? (customer.comboBalance.normalCount || 0) + (customer.comboBalance.retainCount || 0)
    : 14;

  const comboNameStr =
    customer.newComboDetails?.comboName || (customer.comboBalance ? 'Gói Combo Care' : 'Combo Nối Mi Premium');

  return {
    '{ten_khach}': customer.name || 'Khách hàng',
    '{sdt_khach}': selectedPhone || customer.phone || '',
    '{han_dung}': expiryDateStr,
    '{ngay_lam_near}': ngayLamNearStr,
    '{so_ngay_dam}': `${totalRemaining} ngày`,
    '{ten_combo}': comboNameStr,
    '{sdt_cua_hang}': DEFAULT_SMS_STORE_PHONE,
    '{url_dat_lich}': customerBookingUrl || DEFAULT_CUSTOMER_BOOKING_URL,
  };
}

/** Replaces known template tags with customer-specific values for live preview and sending. */
export function interpolateSmsTemplate(messageBody: string, tagValues: Record<string, string>): string {
  let text = messageBody;
  for (const [tag, val] of Object.entries(tagValues)) {
    text = text.replaceAll(tag, String(val));
  }
  return text;
}

/** Calculates GSM-7 / UCS-2 encoding mode, single-segment threshold, and multipart SMS count. */
export function calculateSmsSegmentMetrics(livePreview: string): SmsSegmentMetrics {
  const characterCount = livePreview.length;
  const isUnicode = /[^\x00-\x7F]/.test(livePreview);
  const maxSingleSegment = isUnicode ? 70 : 160;

  let smsSegments = 0;
  if (characterCount > 0) {
    if (isUnicode) {
      smsSegments = characterCount <= 70 ? 1 : Math.ceil(characterCount / 67);
    } else {
      smsSegments = characterCount <= 160 ? 1 : Math.ceil(characterCount / 153);
    }
  }

  return {
    characterCount,
    isUnicode,
    maxSingleSegment,
    smsSegments,
  };
}

export function readStoredMosUser(): SmsStoredUser | null {
  if (typeof window === 'undefined') return null;
  const stored = safeStorage.getItem('mos_user');
  if (!stored) return null;
  try {
    return JSON.parse(stored) as SmsStoredUser;
  } catch {
    return null;
  }
}

export function readSavedSmsModalWidth(): number | null {
  if (typeof window === 'undefined') return null;
  const savedWidth = safeStorage.getItem(SMS_MODAL_WIDTH_STORAGE_KEY);
  if (!savedWidth) return null;
  const parsed = parseInt(savedWidth, 10);
  if (Number.isNaN(parsed) || parsed < SMS_MODAL_MIN_SAVED_WIDTH || parsed > SMS_MODAL_MAX_WIDTH) {
    return null;
  }
  return parsed;
}

export function persistSmsModalWidth(width: number): void {
  if (typeof window === 'undefined') return;
  safeStorage.setItem(SMS_MODAL_WIDTH_STORAGE_KEY, String(width));
}
