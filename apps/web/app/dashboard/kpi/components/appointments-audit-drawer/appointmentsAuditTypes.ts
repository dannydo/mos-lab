import type dayjs from 'dayjs';
import { removeVietnameseTones, type LeaderboardEntry } from '@mos-lab/shared';

export const AUDIT_PAGE_BATCH_SIZE = 25;

export type AppointmentsAuditStatusFilter = 'ALL' | 'COMPLETED' | 'PENDING';
export type AppointmentsAuditServiceFilter = 'ALL' | 'FULLSET' | 'REFILL';

export interface BookerAppointmentItem {
  id: number | string;
  clientName: string;
  clientPhone: string;
  channel: string;
  appointmentDate: string | Date;
  createdAt?: string | Date;
  status: string;
  isCompleted: boolean;
  serviceName: string;
  servicePrice: number;
  discountPercent: number;
  netRevenue: number;
  tipAmount: number;
  bookingBonus: number;
}

export interface AppointmentsAuditTotals {
  totalNetRevenue: number;
  totalTips: number;
  totalBookingBonus: number;
  checkinCount: number;
  totalCount: number;
}

export interface AppointmentsAuditFilters {
  searchText: string;
  statusFilter: AppointmentsAuditStatusFilter;
  serviceFilter: AppointmentsAuditServiceFilter;
}

export interface AppointmentsAuditDrawerProps {
  open: boolean;
  onClose: () => void;
  selectedBookerId: number | null;
  selectedBookerName: string;
  selectedStaffRecord: LeaderboardEntry | null;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
  themeMode: string;
}

export const AUDIT_STATUS_FILTER_OPTIONS: ReadonlyArray<{
  label: string;
  value: AppointmentsAuditStatusFilter;
}> = [
  { label: 'Tất cả trạng thái', value: 'ALL' },
  { label: 'Check-in thành công', value: 'COMPLETED' },
  { label: 'Chưa đến / Khác', value: 'PENDING' },
];

export const AUDIT_SERVICE_FILTER_OPTIONS: ReadonlyArray<{
  label: string;
  value: AppointmentsAuditServiceFilter;
}> = [
  { label: 'Tất cả dịch vụ', value: 'ALL' },
  { label: 'Full Set', value: 'FULLSET' },
  { label: 'Refill (Dặm mi)', value: 'REFILL' },
];

export function formatAuditCurrency(value?: number | null): string {
  return `${(value || 0).toLocaleString('vi-VN')}`;
}

export function filterBookerAppointments(
  appointments: BookerAppointmentItem[],
  { searchText, statusFilter, serviceFilter }: AppointmentsAuditFilters
): BookerAppointmentItem[] {
  return appointments.filter((item) => {
    if (searchText) {
      const query = removeVietnameseTones(searchText);
      const nameMatch = removeVietnameseTones(item.clientName).includes(query);
      const phoneMatch = removeVietnameseTones(item.clientPhone).includes(query);
      if (!nameMatch && !phoneMatch) return false;
    }

    if (statusFilter !== 'ALL') {
      const isCompleted = Boolean(item.isCompleted);
      if (statusFilter === 'COMPLETED' && !isCompleted) return false;
      if (statusFilter === 'PENDING' && isCompleted) return false;
    }

    if (serviceFilter !== 'ALL') {
      const name = (item.serviceName || '').toLowerCase();
      const isRefill = name.includes('refill');
      const isNoInfo = name.includes('không có thông tin') || name.includes('không rõ');

      if (serviceFilter === 'FULLSET' && (isRefill || isNoInfo)) return false;
      if (serviceFilter === 'REFILL' && !isRefill) return false;
    }

    return true;
  });
}

export function computeAuditDrilldownTotals(appointments: BookerAppointmentItem[]): AppointmentsAuditTotals {
  let totalNetRevenue = 0;
  let totalTips = 0;
  let totalBookingBonus = 0;
  let checkinCount = 0;

  appointments.forEach((appt) => {
    totalNetRevenue += appt.netRevenue || 0;
    totalTips += appt.tipAmount || 0;
    totalBookingBonus += appt.bookingBonus || 0;
    if (appt.isCompleted) {
      checkinCount += 1;
    }
  });

  return {
    totalNetRevenue,
    totalTips,
    totalBookingBonus,
    checkinCount,
    totalCount: appointments.length,
  };
}

export function computeLiveTotalSalary(
  selectedStaffRecord: LeaderboardEntry | null,
  totalBookingBonus: number
): number {
  if (!selectedStaffRecord) return 0;
  const sal = selectedStaffRecord.salary;
  return (
    (sal.baseSalary || 0) +
    (totalBookingBonus || 0) +
    (sal.doneBonus || 0) +
    (sal.missedBonus || 0) +
    (sal.tipBonus || 0) +
    (sal.revBonus || 0)
  );
}
