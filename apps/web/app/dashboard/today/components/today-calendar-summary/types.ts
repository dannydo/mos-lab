import type dayjs from 'dayjs';
import type { ReportPeriodComparison, RevenueHourlyResponse } from '@mos-lab/shared';
import type { BookingData, ComingClientData } from '../../hooks/useTodayData';
import type { BookerTeamConfig } from '../BookerTeamConfigModal';

export type CalendarThemeMode = 'light' | 'dark';
export type CalendarBranchFilter = 'all' | 'detham' | 'estella';
export type MatrixStatusFilter = 'all' | 'created' | 'scheduled' | 'missed' | 'done';

export interface SelectedCalendarSlot {
  hour: string;
  branchKey?: string;
  type: MatrixStatusFilter;
}

export interface RevenueDetailContext {
  hour?: string;
  branchKey?: string;
  branchName?: string;
  type?: string;
}

export interface BranchHourlyBreakdown {
  created: number;
  scheduled: number;
  missed: number;
  done: number;
}

export interface HourlyCalendarBucket {
  hour: string;
  hNum: number;
  created: number;
  scheduled: number;
  missed: number;
  done: number;
  createdItems: BookingData[];
  scheduledItems: ComingClientData[];
  missedItems: ComingClientData[];
  doneItems: ComingClientData[];
  branchBreakdown: Record<string, BranchHourlyBreakdown>;
}

export interface CalendarSlotItems {
  created: BookingData[];
  scheduled: ComingClientData[];
  missed: ComingClientData[];
  done: ComingClientData[];
}

export type BookerOptionItem = {
  value: string;
  label: string;
};

export type BookerOptionGroup =
  | BookerOptionItem
  | {
      label: string;
      options: BookerOptionItem[];
    };

export interface TodayCalendarSummaryProps {
  themeMode: CalendarThemeMode;
  token: SafeAny;
  allBookings: BookingData[];
  allComingList: ComingClientData[];
  bookingBranch: CalendarBranchFilter;
  setBookingBranch: (branch: CalendarBranchFilter) => void;
  selectedBooker: string | null;
  setSelectedBooker: (booker: string | null) => void;
  teamConfig?: BookerTeamConfig;
  dateBounds?: { dateFrom: string; dateTo: string; label: string };
  setTeamModalVisible?: (visible: boolean) => void;
  openCustomerDrawer: (record: SafeAny) => void;
  selectedDate: dayjs.Dayjs;
  revenueData?: RevenueHourlyResponse | null;
  previousRevenueData?: RevenueHourlyResponse | null;
  comparison?: ReportPeriodComparison | null;
  revenueLoading?: boolean;
  showRevenueView?: boolean;
  setShowRevenueView?: (val: boolean) => void;
}
