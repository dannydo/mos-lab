import type { Dayjs } from 'dayjs';
import type { Appointment } from '@mos-lab/shared';
import type { DailyCapacityEntry } from '../components/multi-day-column-view/types';

export type ScheduleViewMode = 'overview' | 'list' | 'grid';

export type DateRangePreset = 'today' | 'next3' | 'next5' | 'next7' | 'thisWeek' | 'thisMonth' | 'custom';

export interface StaffOption {
  id: string;
  name: string;
}

export interface BranchCounts {
  all: number;
  EP: number;
  DT: number;
  PXL: number;
}

export interface ScheduleStatsSummary {
  totalCount: number;
  completedCount: number;
  missedCount: number;
  pendingCount: number;
  totalEstRev: number;
}

export interface AppointmentFilters {
  selectedBranch: string;
  selectedStatus: string;
  selectedChannel: string;
  searchQuery: string;
}

export type DailyCapacityMap = Record<string, DailyCapacityEntry>;

export interface CachedAppointmentsEntry {
  data: Appointment[];
  dailyCapacities: DailyCapacityMap;
  total: number;
}

export interface OffDayRescheduleCheckResult {
  isOff: boolean;
  targetDateStr: string | null;
  targetTimeStr: string | null;
  nextWorkingDate: Dayjs | null;
}

export const APPOINTMENTS_CACHE_MAX_ENTRIES = 24;

export const DATE_RANGE_PRESET_OPTIONS = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'next3', label: '3 ngày tới' },
  { value: 'next5', label: '5 ngày tới' },
  { value: 'next7', label: '7 ngày tới' },
  { value: 'thisWeek', label: 'Tuần này' },
  { value: 'thisMonth', label: 'Tháng này' },
] as const;

export const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'Pending', label: 'Chờ check-in' },
  { value: 'Completed', label: 'Hoàn thành' },
  { value: 'Missed', label: 'Bỏ lỡ (Missed)' },
  { value: 'Cancelled', label: 'Đã hủy' },
] as const;

export const CHANNEL_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả Kênh đặt' },
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Zalo', label: 'Zalo' },
  { value: 'Call', label: 'Hotline / Gọi điện' },
  { value: 'Walk-in', label: 'Khách đến trực tiếp' },
] as const;
