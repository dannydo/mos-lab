import type { StatusType } from '~/components/ui';

export const DEFAULT_INSPECTION_STORE = 'Store Đề Thám (Quận 1)';

export const PRIORITY_STATUS_MAP: Record<string, { status: StatusType; label: string }> = {
  URGENT: { status: 'error', label: 'Khẩn cấp' },
  HIGH: { status: 'orange', label: 'Cao' },
  MEDIUM: { status: 'processing', label: 'Trung bình' },
  LOW: { status: 'default', label: 'Thấp' },
};

export const DEPARTMENT_STATUS_MAP: Record<string, StatusType> = {
  CV: 'purple',
  CC: 'cyan',
  BK: 'processing',
};

export const TECHNICAL_ISSUE_TAG_LABELS: Record<string, string> = {
  EYE_STINGING: '👁️ Cay mắt/Đỏ',
  FAST_SHEDDING: '⚡ Rụng mi nhanh',
  EYELID_POKING: '📌 Cộm/Đâm mí',
  GLUE_CLUMPING: '💧 Bết keo',
  WRONG_STYLE: '📐 Sai dáng mi',
  SERVICE_PAINFUL_TOO_LONG: '⌛ Thô bạo/Lâu',
};

export const WARRANTY_TYPE_SUMMARY_LABELS: Record<string, string> = {
  LOG_FREE: '📋 Log (Tháo mi / Kiểm tra mi 0đ)',
  FIX_25M_FREE: '🛠️ Fix (Sửa mi <=25p 0đ)',
  ADJUST_FREE: '📐 Adjust (Chỉnh dáng 0đ - Phạt CC)',
  REPLACE_FULL_FREE: '🔄 Replace (Nối mới 100% 0đ)',
};

export const WARRANTY_TYPE_SELECT_OPTIONS = [
  {
    label: '🛠️ FIX (Sửa mi <= 25p 0đ) — Phạt CV cũ, CV mới có Banana <=25p',
    value: 'FIX_25M_FREE',
  },
  {
    label: '📐 ADJUST (Chỉnh dáng 0đ) — Phạt CC cũ, KHÔNG phạt CV',
    value: 'ADJUST_FREE',
  },
  {
    label: '📋 LOG (Tháo mi / Kiểm tra mi 0đ) — CV mới có Banana, KHÔNG phạt ca cũ',
    value: 'LOG_FREE',
  },
  {
    label: '🔄 REPLACE (Nối lại bộ mới 100% 0đ) — Phạt CV cũ',
    value: 'REPLACE_FULL_FREE',
  },
];

export const INSPECTION_STORE_OPTIONS = [
  { label: '🏪 Store Đề Thám (Quận 1)', value: 'Store Đề Thám (Quận 1)' },
  { label: '🏪 Store Estella Place (Quận 2)', value: 'Store Estella Place (Quận 2)' },
];
