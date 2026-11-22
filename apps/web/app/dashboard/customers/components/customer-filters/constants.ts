export const FILTER_DRAWER_WIDTH_STORAGE_KEY = 'mos_filter_drawer_width';
export const DEFAULT_FILTER_DRAWER_WIDTH = 580;
export const MIN_FILTER_DRAWER_WIDTH = 400;
export const MAX_FILTER_DRAWER_WIDTH = 1200;
export const MAX_DRAG_DRAWER_WIDTH = 1150;
export const DRAWER_VIEWPORT_MARGIN = 60;

export const DOB_MONTH_OPTIONS = [
  { label: 'Tháng 1', value: '1' },
  { label: 'Tháng 2', value: '2' },
  { label: 'Tháng 3', value: '3' },
  { label: 'Tháng 4', value: '4' },
  { label: 'Tháng 5', value: '5' },
  { label: 'Tháng 6', value: '6' },
  { label: 'Tháng 7', value: '7' },
  { label: 'Tháng 8', value: '8' },
  { label: 'Tháng 9', value: '9' },
  { label: 'Tháng 10', value: '10' },
  { label: 'Tháng 11', value: '11' },
  { label: 'Tháng 12', value: '12' },
];

export const BIRTHDAY_PRESETS: ReadonlyArray<{
  label: string;
  value: 'today' | 'this_month' | 'next_month';
}> = [
  { label: 'Hôm nay 🎂', value: 'today' },
  { label: 'Tháng này 🎉', value: 'this_month' },
  { label: 'Tháng sau 🎁', value: 'next_month' },
];

export const AGE_PRESETS: ReadonlyArray<{
  label: string;
  min: number | undefined;
  max: number | undefined;
}> = [
  { label: '< 25 tuổi', min: undefined, max: 24 },
  { label: '25 - 35 tuổi', min: 25, max: 35 },
  { label: '36 - 50 tuổi', min: 36, max: 50 },
  { label: '> 50 tuổi', min: 51, max: undefined },
];

export const FOREIGN_FILTER_OPTIONS = [
  { label: 'Tất cả (Việt Nam & Nước ngoài)', value: 'all' },
  { label: '🌐 Chỉ Khách nước ngoài', value: 'foreign' },
  { label: '🇻🇳 Chỉ Khách Việt Nam', value: 'local' },
];

export const PROMO_USED_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'yes', label: 'Đã dùng KM' },
  { value: 'no', label: 'Chưa dùng KM' },
];

export const REFERRAL_USED_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'yes', label: 'Đã giới thiệu bạn' },
  { value: 'no', label: 'Chưa giới thiệu ai' },
];

export const RETAINED_ONLY_OPTIONS = [
  { value: 'all', label: 'Tất cả (Không lọc giữ data)' },
  { value: 'yes', label: '📌 Chỉ hiển thị Data đã giữ lại' },
];

export const ASSIGNED_STAFF_BASE_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'unassigned', label: 'Chưa phân bổ' },
  { value: 'me', label: 'Khách hàng của tôi' },
];

export const BOOKER_STAFF_ROLES = new Set(['telesales', 'executive', 'manager', 'admin']);

export const CALL_STATUS_OPTIONS = [
  { value: 'BOOKED', label: '📅 BOOKED (Đã đặt hẹn)' },
  { value: 'AGREED', label: '✅ AGREED (Đã đồng ý)' },
  { value: 'BUSY', label: '📵 BUSY (Bận máy)' },
  { value: 'NO_ANSWER', label: '🔇 NO_ANSWER (Không nghe máy)' },
  { value: 'CALLBACK', label: '⏰ CALLBACK (Hẹn gọi lại)' },
  { value: 'WRONG_NUMBER', label: '⚠️ WRONG_NUMBER (Sai số / Tắt máy)' },
  { value: 'REJECTED', label: '❌ REJECTED (Từ chối / Khách hủy)' },
  { value: 'CONSIDERING', label: '🤔 CONSIDERING (Cần suy nghĩ)' },
  { value: 'NOT_CALLED', label: '⚪ NOT_CALLED (Chưa từng gọi)' },
];

export const CAMPAIGN_FILTER_MODE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả (Không phân biệt)' },
  { value: 'IN', label: '🎯 Thuộc Campaign đã chọn' },
  { value: 'NOT_IN', label: '🛡️ Chưa từng thuộc Campaign này (Loại trừ)' },
];

export function getFilterCardClass(themeMode: string): string {
  return themeMode === 'dark'
    ? 'rounded-xl p-[18px] border border-slate-800 bg-slate-900 shadow-md'
    : 'rounded-xl p-[18px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:shadow-md';
}

export function getFilterFieldLabelClass(themeMode: string): string {
  return themeMode === 'dark' ? 'text-xs text-slate-400' : 'text-xs text-slate-500 dark:text-slate-400';
}
