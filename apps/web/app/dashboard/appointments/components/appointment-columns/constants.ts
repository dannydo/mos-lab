import dayjs from 'dayjs';
import type { Appointment } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';
import type { StatusLabelConfig } from './types';

export const APPOINTMENT_GOLD_ACCENT = 'rgba(212, 168, 75, 1)';
export const APPOINTMENT_ERROR_ACCENT = 'rgba(255, 77, 79, 1)';

export const MISSED_REASON_MAP: Record<string, StatusLabelConfig> = {
  KH_DOI_HUY_LICH: { label: 'Khách đổi/hủy', status: 'orange' },
  GOI_KHONG_NGHE: { label: 'Gọi không nghe', status: 'gold' },
  TIEM_QUATAI: { label: 'Tiệm quá tải', status: 'error' },
  BOOKER_LATHUONG: { label: 'Booker nhầm', status: 'purple' },
  CV_BAN_LOI: { label: 'CV bận/trễ', status: 'orange' },
  KTV_BAN_LOI: { label: 'CV bận/trễ', status: 'orange' },
  KH_QUEN_LICH: { label: 'Khách quên lịch', status: 'purple' },
  LY_DO_KHAC: { label: 'Lý do khác', status: 'cyan' },
};

export const MISSED_RESPONSIBILITY_MAP: Record<string, StatusLabelConfig> = {
  CUSTOMER: { label: 'Khách hàng', status: 'default' },
  BOOKER: { label: 'Booker', status: 'processing' },
  CC: { label: 'Tư vấn viên (CC)', status: 'processing' },
  TECHNICIAN: { label: 'Chuyên viên (CV)', status: 'purple' },
  STORE_SYSTEM: { label: 'Hệ thống', status: 'error' },
};

export const MISSED_FOLLOWUP_MAP: Record<string, StatusLabelConfig> = {
  PENDING: { label: 'Chưa xử lý', status: 'error' },
  CONTACTED: { label: 'Đã gọi chăm sóc', status: 'processing' },
  RESCHEDULED: { label: 'Đã hẹn lại', status: 'success' },
  UNREACHABLE: { label: 'Không liên hệ được', status: 'orange' },
  CANCELLED: { label: 'Khách hủy hẳn', status: 'default' },
};

export function sortByAppointmentTime(a: Appointment, b: Appointment): number {
  const timeA = a.bookingDateStart ? new Date(a.bookingDateStart).getTime() : 0;
  const timeB = b.bookingDateStart ? new Date(b.bookingDateStart).getTime() : 0;
  return timeA - timeB;
}

export function resolveAppointmentBranchName(record: Appointment): string {
  if (record.branchName) return record.branchName;
  if (record.storeId === 16) return 'Estella Place';
  if (record.storeId === 6) return 'De Tham';
  return 'Phan Xích Long';
}

const PENDING_IN_SERVICE_STATES = new Set([
  'Consultation',
  'Preparation',
  'ServiceStart',
  'ServiceCleaned',
  'ServiceEnd',
]);

const PENDING_CHECKOUT_STATES = new Set(['ServiceCompleted', 'CheckOut']);

export function resolvePendingOrderStatus(state: string, bookingDateStart: string | null): StatusType {
  const isPast = bookingDateStart ? dayjs(bookingDateStart).isBefore(dayjs()) : false;
  if (state === 'Completed') return 'success';
  if (PENDING_CHECKOUT_STATES.has(state)) return 'purple';
  if (PENDING_IN_SERVICE_STATES.has(state)) return 'processing';
  if (state === 'Missed') return 'error';
  if (state === 'Cancelled') return 'default';
  if (isPast) return 'error';

  const isToday = bookingDateStart ? dayjs(bookingDateStart).isSame(dayjs(), 'day') : false;
  return isToday ? 'warning' : 'cyan';
}

const COMPLETED_IN_SERVICE_STATES = new Set(['CheckIn', 'ServiceCleaned', 'CheckOut']);

export function resolveCompletedOrderStatus(state: string, bookingDateStart: string | null): StatusType {
  const isPast = bookingDateStart ? dayjs(bookingDateStart).isBefore(dayjs()) : false;
  if (state === 'Completed') return 'success';
  if (COMPLETED_IN_SERVICE_STATES.has(state)) return 'processing';
  if (isPast) return 'error';

  const isToday = bookingDateStart ? dayjs(bookingDateStart).isSame(dayjs(), 'day') : false;
  return isToday ? 'warning' : 'cyan';
}
