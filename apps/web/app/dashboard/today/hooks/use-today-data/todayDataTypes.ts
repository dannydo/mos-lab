import type dayjs from 'dayjs';
import type { BookerTeamConfig } from '../../components/BookerTeamConfigModal';
import type { usePreviousReportPeriod } from '~/hooks/usePreviousReportPeriod';

export type TodayDateRangeMode = 'day' | 'week' | 'month';
export type TodayCategoryFilter = 'all' | 'combo' | 'oc' | 'other';
export type BookingBranchFilter = 'all' | 'detham' | 'estella';
export type TodayBranchFilter = 'detham' | 'estella' | 'all';

export type TodayPreviousReportPeriod = ReturnType<typeof usePreviousReportPeriod>;

export interface BookingData {
  key: string;
  customerId?: number;
  customer: string;
  avatar?: string | null;
  phone: string;
  group: 'combo_live' | 'combo_dead' | 'single';
  promo: string | null;
  booker: string;
  channel?: string;
  category?: 'combo' | 'oc' | 'other';
  createdTime: string;
  avatarColor?: string;
  code?: string;
  email?: string;
  ltv?: string;
  bookingsCount?: number;
  diamonds?: number;
  frequency?: string;
  gender?: string;
  dob?: string;
  daysAway?: string;
  favoriteDay?: string;
  oc?: string;
  historyService?: string;
  historyBranch?: string;
  historyCv?: string;
  historyCcIn?: string;
  historyCcOut?: string;
  historyBooker?: string;
  historyDate?: string;
  historyStatus?: string;
  historyNote?: string;
  branchName?: string;
  bookingDateTime?: string;
  requestedCv?: string;
  bookingNote?: string;
  ccNote?: string;
  ccNoteStaffName?: string | null;
  status?: 'completed' | 'serving' | 'arrived' | 'confirmed' | 'pending' | 'late';
}

export interface ComingClientData {
  key: string;
  customerId?: number;
  time: string;
  customer: string;
  avatar?: string | null;
  phone: string;
  group: 'combo_live' | 'combo_dead' | 'single';
  promo: string | null;
  booker: string;
  channel?: string;
  category?: string;
  branchKey?: string;
  cc: string;
  cv: string;
  service: string;
  bookingNote?: string;
  ccNote?: string;
  ccNoteStaffName?: string | null;
  status: 'completed' | 'serving' | 'arrived' | 'confirmed' | 'pending' | 'late';
  avatarColor?: string;
  code?: string;
  email?: string;
  ltv?: string;
  price?: number;
  tax?: number;
  bookingsCount?: number;
  diamonds?: number;
  frequency?: string;
  gender?: string;
  dob?: string;
  daysAway?: string;
  favoriteDay?: string;
  oc?: string;
  historyService?: string;
  historyBranch?: string;
  historyCv?: string;
  historyCcIn?: string;
  historyCcOut?: string;
  historyBooker?: string;
  historyDate?: string;
  historyStatus?: string;
  historyNote?: string;
}

export interface ShopCCData {
  name: string;
  doing: string;
  clients: number;
  combos: number;
  revenue: number;
  revLe?: number;
  revCombo?: number;
  revProduct?: number;
  netRevenue?: number;
  netLe?: number;
  netCombo?: number;
  netProduct?: number;
  shift: 'sáng' | 'chiều' | 'full' | 'off';
  attendance: 'none' | 'checked_in' | 'checked_out' | 'late';
}

export interface ShopCVData {
  id?: number;
  name: string;
  avatarUrl?: string | null;
  branchName?: string;
  doing: string;
  clients: number;
  bookedCount?: number;
  doneCount?: number;
  shift: 'sáng' | 'chiều' | 'full' | 'off';
  attendance: 'none' | 'checked_in' | 'checked_out' | 'late';
  status: 'busy' | 'available';
  isOff?: boolean;
  offReason?: string;
  offType?: string;
}

export interface BranchDetail {
  revLe: number;
  revCombo: number;
  revProduct: number;
  netLe?: number;
  netCombo?: number;
  netProduct?: number;
  cc: ShopCCData[];
  cv: ShopCVData[];
  coming: ComingClientData[];
}

export interface UseTodayDataOptions {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export interface PreviousTodaySnapshot {
  branchesData: Record<string, BranchDetail>;
  bookingsCombo: BookingData[];
  bookingsOc: BookingData[];
  bookingsOther: BookingData[];
}

export interface TodayDateBounds {
  dateFrom: string;
  dateTo: string;
  label: string;
}

export interface PersistedTodayPreferences {
  teamConfig?: BookerTeamConfig;
  dateRangeMode?: TodayDateRangeMode;
  selectedDate: dayjs.Dayjs;
  showTax?: boolean;
  showRevenueView?: boolean;
  bookingFilter?: TodayCategoryFilter;
  bookingBranch?: BookingBranchFilter;
  comingBranch?: TodayBranchFilter;
  comingCategory?: TodayCategoryFilter;
  shopBranch?: TodayBranchFilter;
  selectedBooker?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}
