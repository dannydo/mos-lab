import dayjs from 'dayjs';
import type { Customer } from '@mos-lab/shared';
import type { CustomerDelayStatus, PlansSuggestionsState, SuggestionTabDefinition } from './plansPageTypes';

export const WEEKDAY_NAMES = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

const COMPLETED_OR_ACTIVE_BOOKING_STATES = new Set([
  'Completed',
  'ServiceCompleted',
  'CheckIn',
  'CheckOut',
  'ServiceStart',
]);

export const INITIAL_SUGGESTIONS_STATE: PlansSuggestionsState = {
  happyCall: [],
  single21d: [],
  combo25d: [],
  singleLost: [],
  campaignComboT7: [],
  campaignPromo2: [],
  myCustomers: [],
};

export const SUGGESTION_TABS: SuggestionTabDefinition[] = [
  {
    key: '1',
    label: 'Điểm Chạm',
    groups: [
      {
        key: 'happyCall',
        title: '📞 Happy Call 24h',
        tip: 'Khách vừa ghé tiệm ngày hôm qua. Gọi hỏi thăm mức độ hài lòng.',
      },
      {
        key: 'single21d',
        title: '⏳ Single 21d (Cận Dặm Lẻ)',
        tip: 'Khách lẻ ghé tiệm 19-21 ngày trước. Nhắc hẹn để được tính giá dặm (tiết kiệm 57-64%).',
      },
      {
        key: 'combo25d',
        title: '💎 Combo 25d (Cận Dặm Gói)',
        tip: 'Khách combo ghé tiệm 23-25 ngày trước. Nhắc hẹn để được trừ dặm combo (hạn chót 25 ngày).',
      },
      {
        key: 'singleLost',
        title: '❌ Single 22d+ (Trễ Hạn Dặm)',
        tip: 'Khách lẻ trễ hẹn dặm > 21 ngày. Cần gọi thuyết phục quay lại nối mới.',
      },
    ],
  },
  {
    key: '2',
    label: 'Chiến Dịch',
    groups: [
      {
        key: 'campaignComboT7',
        title: '🎯 Chiến dịch Combo T7',
        tip: 'Tải từ Google Sheet [V2]COMBO T7. Các khách hàng ưu tiên chăm sóc.',
      },
      {
        key: 'campaignPromo2',
        title: '🔥 Chiến dịch Promo NLC',
        tip: 'Tải từ Google Sheet NLC.PROMO 2. Khách hàng theo dõi khuyến mãi.',
      },
    ],
  },
  {
    key: '3',
    label: 'Khách Của Tôi',
    groups: [
      {
        key: 'myCustomers',
        title: '👤 Khách hàng phụ trách',
        tip: 'Danh sách khách hàng được phân bổ cho riêng bạn chưa lập lịch gọi tuần này.',
      },
    ],
  },
];

export function getMondayOfWeek(referenceDate: Date = new Date()): Date {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function shiftWeekByDays(monday: Date, offsetDays: number): Date {
  const shifted = new Date(monday);
  shifted.setDate(monday.getDate() + offsetDays);
  return shifted;
}

export function buildWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }).map((_, idx) => shiftWeekByDays(monday, idx));
}

export function formatShortDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}/${month}`;
}

export function formatWeekRangeString(monday: Date): string {
  const sunday = shiftWeekByDays(monday, 6);
  return `${monday.toLocaleDateString('vi-VN')} - ${sunday.toLocaleDateString('vi-VN')}`;
}

export function isTodayDate(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function resolveCustomerBookingFlags(customer: Customer): {
  hasCallback: boolean;
  isBookedFuture: boolean;
  isMissedPast: boolean;
} {
  const hasCallback = customer.callbackDate
    ? new Date(customer.callbackDate) >= new Date(new Date().setHours(0, 0, 0, 0))
    : false;

  const now = new Date();
  const state = customer.lastBookingState;
  const isBookingInFuture = customer.lastBookingDate ? new Date(customer.lastBookingDate) > now : false;
  const isBookedFuture = isBookingInFuture && (state === 'New' || state === 'Confirmed');

  const isBookingInPast = customer.lastBookingDate ? new Date(customer.lastBookingDate) < now : false;
  const isMissedPast = isBookingInPast && Boolean(state && !COMPLETED_OR_ACTIVE_BOOKING_STATES.has(state));

  return { hasCallback, isBookedFuture, isMissedPast };
}

export function getPlanRowClassName(record: Customer, themeMode: string): string {
  const { hasCallback, isBookedFuture, isMissedPast } = resolveCustomerBookingFlags(record);

  if (hasCallback) {
    return themeMode === 'dark' ? 'row-hope-dark' : 'row-hope-light';
  }
  if (isBookedFuture) {
    return themeMode === 'dark' ? 'row-booked-future-dark' : 'row-booked-future-light';
  }
  if (isMissedPast) {
    return themeMode === 'dark' ? 'row-missed-dark' : 'row-missed-light';
  }

  return '';
}

export function resolveCustomerDelayStatus(customer: Customer, days: number | null): CustomerDelayStatus {
  const { hasCallback, isBookedFuture, isMissedPast } = resolveCustomerBookingFlags(customer);

  if (hasCallback) {
    return {
      kind: 'callback',
      formattedDate: dayjs(customer.callbackDate).format('DD/MM/YYYY'),
    };
  }

  if (isBookedFuture) {
    return {
      kind: 'booked',
      formattedDate: dayjs(customer.lastBookingDate).format('DD/MM/YYYY'),
    };
  }

  if (isMissedPast) {
    let missedDays = days ?? 0;
    if (customer.lastBookingDate) {
      const bookingDate = new Date(customer.lastBookingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      bookingDate.setHours(0, 0, 0, 0);
      const diffMs = today.getTime() - bookingDate.getTime();
      missedDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    }
    return { kind: 'missed', missedDays };
  }

  return { kind: 'normal' };
}

export function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: unknown } } }).response?.data?.message === 'string'
  ) {
    return (error as { response: { data: { message: string } } }).response.data.message;
  }
  return fallback;
}
