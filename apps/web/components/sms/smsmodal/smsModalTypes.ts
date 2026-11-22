import type { Customer } from '@mos-lab/shared';

export interface SMSModalProps {
  open?: boolean;
  visible?: boolean;
  onClose: () => void;
  customer: Customer | null;
  planId?: number;
  onSuccess?: () => void;
  themeMode?: 'light' | 'dark';
}

export interface SmsStoredUser {
  id?: number;
  role?: string;
}

export type SmsResizeDirection = 'left' | 'right';

export type SmsModalWidthPreset = 740 | 880 | 1050;

export interface SmsWidthPresetDefinition {
  width: SmsModalWidthPreset;
  tooltip: string;
  ariaLabel: string;
}

export interface SmsSegmentMetrics {
  characterCount: number;
  isUnicode: boolean;
  maxSingleSegment: number;
  smsSegments: number;
}

export interface SmsTemplateCategoryOption {
  value: string;
  label: string;
}

export const SMS_MODAL_WIDTH_STORAGE_KEY = 'mos_sms_modal_width';
export const SMS_MODAL_DEFAULT_WIDTH = 880;
export const SMS_MODAL_MIN_SAVED_WIDTH = 520;
export const SMS_MODAL_DRAG_MIN_WIDTH = 540;
export const SMS_MODAL_MAX_WIDTH = 1250;

export const DEFAULT_CUSTOMER_BOOKING_URL = 'https://s.wingslashes.com/Urc5SCIJ';
export const DEFAULT_SMS_STORE_PHONE = '0987654321';

export const SMS_MODAL_WIDTH_PRESETS: readonly SmsWidthPresetDefinition[] = [
  { width: 740, tooltip: 'Giao diện Gọn (740px)', ariaLabel: 'Giao diện gọn 740px' },
  { width: 880, tooltip: 'Giao diện Chuẩn (880px)', ariaLabel: 'Giao diện chuẩn 880px' },
  { width: 1050, tooltip: 'Giao diện Rộng (1050px)', ariaLabel: 'Giao diện rộng 1050px' },
];

export const SMS_TEMPLATE_CATEGORY_OPTIONS: readonly SmsTemplateCategoryOption[] = [
  { value: 'GENERAL', label: 'Thông thường (General)' },
  { value: 'REMINDER', label: 'Nhắc nhở (Reminder)' },
  { value: 'PROMOTION', label: 'Khuyến mãi (Promotion)' },
  { value: 'AFTERCARE', label: 'Chăm sóc sau làm (Aftercare)' },
];
