import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import type { RevenueHourlyResponse } from '@mos-lab/shared';
import type { BookerTeamConfig } from '../../components/BookerTeamConfigModal';
import type { TodaySandboxContextValue } from '../../context/SandboxModeContext';
import {
  getSalesMockBookings,
  getSalesMockBranchesData,
  getTrainingMockBookings,
  getTrainingMockBranchesData,
} from '../mockTodayData';
import type {
  BookingBranchFilter,
  BookingData,
  BranchDetail,
  ComingClientData,
  PersistedTodayPreferences,
  ShopCVData,
  TodayBranchFilter,
  TodayCategoryFilter,
  TodayDateBounds,
  TodayDateRangeMode,
} from './todayDataTypes';

dayjs.extend(isoWeek);

export const TODAY_DATA_REFRESH_EVENTS = [
  'mos-data-updated',
  'mos-call-log-saved',
  'mos-customer-updated',
  'mos-booking-updated',
] as const;

export function createInitialBranchesData(): Record<string, BranchDetail> {
  return {
    detham: { revLe: 0, revCombo: 0, revProduct: 0, cc: [], cv: [], coming: [] },
    pxl: { revLe: 0, revCombo: 0, revProduct: 0, cc: [], cv: [], coming: [] },
    estella: { revLe: 0, revCombo: 0, revProduct: 0, cc: [], cv: [], coming: [] },
  };
}

export function getDashboardDateRange(date: dayjs.Dayjs, mode: TodayDateRangeMode) {
  if (mode === 'week') {
    return {
      dateFrom: date.startOf('isoWeek').format('YYYY-MM-DD'),
      dateTo: date.endOf('isoWeek').format('YYYY-MM-DD'),
    };
  }
  if (mode === 'month') {
    return {
      dateFrom: date.startOf('month').format('YYYY-MM-DD'),
      dateTo: date.endOf('month').format('YYYY-MM-DD'),
    };
  }
  const dateValue = date.format('YYYY-MM-DD');
  return { dateFrom: dateValue, dateTo: dateValue };
}

export function computeDateBounds(
  selectedDate: dayjs.Dayjs | null,
  dateRangeMode: TodayDateRangeMode
): TodayDateBounds {
  if (!selectedDate) {
    const todayStr = dayjs().format('YYYY-MM-DD');
    return { dateFrom: todayStr, dateTo: todayStr, label: '' };
  }

  if (dateRangeMode === 'week') {
    const startOfWeek = selectedDate.startOf('isoWeek');
    const endOfWeek = selectedDate.endOf('isoWeek');
    return {
      dateFrom: startOfWeek.format('YYYY-MM-DD'),
      dateTo: endOfWeek.format('YYYY-MM-DD'),
      label: `Tuần ${selectedDate.isoWeek()} (${startOfWeek.format('DD/MM')} - ${endOfWeek.format('DD/MM/YYYY')})`,
    };
  }

  if (dateRangeMode === 'month') {
    const startOfMonth = selectedDate.startOf('month');
    const endOfMonth = selectedDate.endOf('month');
    return {
      dateFrom: startOfMonth.format('YYYY-MM-DD'),
      dateTo: endOfMonth.format('YYYY-MM-DD'),
      label: `Tháng ${selectedDate.format('MM/YYYY')}`,
    };
  }

  const dateStr = selectedDate.format('YYYY-MM-DD');
  return {
    dateFrom: dateStr,
    dateTo: dateStr,
    label: selectedDate.format('DD/MM/YYYY'),
  };
}

export function shiftSelectedDate(
  date: dayjs.Dayjs,
  mode: TodayDateRangeMode,
  direction: 'prev' | 'next'
): dayjs.Dayjs {
  const amount = 1;
  if (direction === 'prev') {
    if (mode === 'day') return date.subtract(amount, 'day');
    if (mode === 'week') return date.subtract(amount, 'week');
    return date.subtract(amount, 'month');
  }
  if (mode === 'day') return date.add(amount, 'day');
  if (mode === 'week') return date.add(amount, 'week');
  return date.add(amount, 'month');
}

export function getBranchLabel(key: string): string {
  if (key === 'detham') return 'Đề Thám';
  if (key === 'pxl') return 'PXL';
  if (key === 'estella') return 'Estella';
  return '';
}

export function persistUrlAndStoragePreference(storageKey: string, queryParamKey: string, value: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (value) {
    localStorage.setItem(storageKey, value);
    url.searchParams.set(queryParamKey, value);
  } else {
    localStorage.removeItem(storageKey);
    url.searchParams.delete(queryParamKey);
  }
  window.history.replaceState(null, '', url.pathname + url.search);
}

export function readPersistedTodayPreferences(): PersistedTodayPreferences | null {
  if (typeof window === 'undefined') return null;

  const urlParams = new URLSearchParams(window.location.search);
  const prefs: PersistedTodayPreferences = {
    selectedDate: dayjs(),
  };

  const persistedTeamConfig = localStorage.getItem('booker_team_config');
  if (persistedTeamConfig) {
    try {
      const parsed = JSON.parse(persistedTeamConfig);
      if (parsed && typeof parsed === 'object') {
        prefs.teamConfig = parsed;
      }
    } catch {
      // ignore invalid JSON
    }
  }

  const persistedDateMode = urlParams.get('dateRangeMode') || localStorage.getItem('today_date_range_mode');
  if (persistedDateMode && ['day', 'week', 'month'].includes(persistedDateMode)) {
    prefs.dateRangeMode = persistedDateMode as TodayDateRangeMode;
  }

  const persistedDate = urlParams.get('date') || localStorage.getItem('today_selected_date');
  prefs.selectedDate = persistedDate ? dayjs(persistedDate) : dayjs();

  const persistedShowTax = localStorage.getItem('today_show_tax');
  if (persistedShowTax !== null) prefs.showTax = persistedShowTax === 'true';

  const persistedRevenueView = localStorage.getItem('today_show_revenue_view');
  if (persistedRevenueView !== null) prefs.showRevenueView = persistedRevenueView === 'true';

  const urlBookingFilter = urlParams.get('bookingFilter') || urlParams.get('tab');
  const persistedBookingFilter = urlBookingFilter || localStorage.getItem('today_booking_filter');
  if (persistedBookingFilter && ['all', 'combo', 'oc', 'other'].includes(persistedBookingFilter)) {
    prefs.bookingFilter = persistedBookingFilter as TodayCategoryFilter;
  }

  const urlBookingBranch = urlParams.get('bookingBranch');
  const persistedBookingBranch = urlBookingBranch || localStorage.getItem('today_booking_branch');
  if (persistedBookingBranch && ['all', 'detham', 'estella'].includes(persistedBookingBranch)) {
    prefs.bookingBranch = persistedBookingBranch as BookingBranchFilter;
  }

  const urlComingBranch = urlParams.get('comingBranch');
  const persistedComingBranch = urlComingBranch || localStorage.getItem('today_coming_branch');
  if (persistedComingBranch && ['detham', 'estella', 'all'].includes(persistedComingBranch)) {
    prefs.comingBranch = persistedComingBranch as TodayBranchFilter;
  }

  const urlComingCategory = urlParams.get('comingCategory');
  const persistedComingCategory = urlComingCategory || localStorage.getItem('today_coming_category');
  if (persistedComingCategory && ['all', 'combo', 'oc', 'other'].includes(persistedComingCategory)) {
    prefs.comingCategory = persistedComingCategory as TodayCategoryFilter;
  }

  const urlShopBranch = urlParams.get('shopBranch');
  const persistedShopBranch = urlShopBranch || localStorage.getItem('today_shop_branch');
  if (persistedShopBranch && ['detham', 'estella', 'all'].includes(persistedShopBranch)) {
    prefs.shopBranch = persistedShopBranch as TodayBranchFilter;
  }

  const urlBooker = urlParams.get('booker');
  const persistedBooker = urlBooker || localStorage.getItem('today_selected_booker');
  if (persistedBooker) {
    prefs.selectedBooker = persistedBooker;
  }

  const persistedAutoRefresh = localStorage.getItem('today_auto_refresh');
  if (persistedAutoRefresh !== null) prefs.autoRefresh = persistedAutoRefresh === 'true';

  const persistedRefreshInterval = localStorage.getItem('today_refresh_interval');
  if (persistedRefreshInterval !== null) {
    const parsed = parseInt(persistedRefreshInterval, 10);
    if (!isNaN(parsed)) {
      prefs.refreshInterval = parsed;
    }
  }

  return prefs;
}

export function matchesBookerFilter(
  bookerName: string | undefined,
  filter: string | null,
  teamConfig: BookerTeamConfig
): boolean {
  if (!filter || filter === 'all') return true;
  const name = (bookerName || '').trim().toLowerCase();
  if (!name) return false;

  if (filter === 'team:telesales') {
    return (teamConfig.telesales || []).some((n) => n.trim().toLowerCase() === name);
  }
  if (filter === 'team:control_cs') {
    return (teamConfig.control_cs || []).some((n) => n.trim().toLowerCase() === name);
  }
  if (filter === 'team:other') {
    return (teamConfig.other || []).some((n) => n.trim().toLowerCase() === name);
  }

  return name === filter.trim().toLowerCase();
}

export function combineBookingsWithCategory(
  bookingsCombo: BookingData[],
  bookingsOc: BookingData[],
  bookingsOther: BookingData[],
  sortByKeyDesc = false
) {
  const combined = [
    ...bookingsCombo.map((b) => ({ ...b, category: 'combo' as const })),
    ...bookingsOc.map((b) => ({ ...b, category: 'oc' as const })),
    ...bookingsOther.map((b) => ({ ...b, category: 'other' as const })),
  ];
  return sortByKeyDesc ? combined.sort((a, b) => Number(b.key) - Number(a.key)) : combined;
}

export function computeBookingBranchCounts(allBookings: BookingData[]) {
  let dt = 0;
  let ep = 0;
  allBookings.forEach((b) => {
    if (b.branchName === 'Đề Thám') dt++;
    else if (b.branchName === 'Estella') ep++;
  });
  return { dt, ep, total: allBookings.length };
}

export function filterBookingsList(
  allBookings: Array<BookingData & { category: 'combo' | 'oc' | 'other' }>,
  bookingFilter: TodayCategoryFilter,
  bookingBranch: BookingBranchFilter,
  selectedBooker: string | null,
  teamConfig: BookerTeamConfig
) {
  return allBookings.filter((b) => {
    if (bookingFilter !== 'all' && b.category !== bookingFilter) {
      return false;
    }
    if (bookingBranch !== 'all') {
      if (bookingBranch === 'detham' && b.branchName !== 'Đề Thám') return false;
      if (bookingBranch === 'estella' && b.branchName !== 'Estella') return false;
    }
    if (!matchesBookerFilter(b.booker, selectedBooker, teamConfig)) {
      return false;
    }
    return true;
  });
}

export function buildAllComingList(
  branchesData: Record<string, BranchDetail>
): Array<ComingClientData & { branchName: string; branchKey: string }> {
  return Object.keys(branchesData).flatMap((branchKey) =>
    (branchesData[branchKey].coming || []).map((item) => ({
      ...item,
      branchName: getBranchLabel(branchKey),
      branchKey,
    }))
  );
}

export function filterAndSortComingList(
  allComingList: Array<ComingClientData & { branchName: string; branchKey: string }>,
  comingBranch: TodayBranchFilter,
  comingCategory: TodayCategoryFilter,
  selectedBooker: string | null,
  teamConfig: BookerTeamConfig
) {
  const filtered = allComingList.filter((item) => {
    if (comingBranch !== 'all' && item.branchKey !== comingBranch) {
      return false;
    }
    if (comingCategory !== 'all' && item.category !== comingCategory) {
      return false;
    }
    if (!matchesBookerFilter(item.booker, selectedBooker, teamConfig)) {
      return false;
    }
    return true;
  });

  return [...filtered].sort((a, b) => a.time.localeCompare(b.time));
}

export function buildActiveShopData(
  branchesData: Record<string, BranchDetail>,
  shopBranch: TodayBranchFilter,
  showTax: boolean
) {
  const raw =
    shopBranch === 'all'
      ? {
          revLe: Object.values(branchesData).reduce((sum, b) => sum + (b.revLe || 0), 0),
          revCombo: Object.values(branchesData).reduce((sum, b) => sum + (b.revCombo || 0), 0),
          revProduct: Object.values(branchesData).reduce((sum, b) => sum + (b.revProduct || 0), 0),
          netLe: Object.values(branchesData).reduce((sum, b) => sum + (b.netLe || 0), 0),
          netCombo: Object.values(branchesData).reduce((sum, b) => sum + (b.netCombo || 0), 0),
          netProduct: Object.values(branchesData).reduce((sum, b) => sum + (b.netProduct || 0), 0),
          cc: Object.entries(branchesData).flatMap(([branchKey, b]) =>
            b.cc.map((item) => ({ ...item, branchName: getBranchLabel(branchKey) }))
          ),
          cv: Object.entries(branchesData).flatMap(([branchKey, b]) =>
            b.cv.map((item) => ({ ...item, branchName: getBranchLabel(branchKey) }))
          ),
          coming: [] as SafeAny[],
        }
      : {
          ...branchesData[shopBranch],
          cc: (branchesData[shopBranch]?.cc || []).map((item) => ({
            ...item,
            branchName: getBranchLabel(shopBranch),
          })),
          cv: (branchesData[shopBranch]?.cv || []).map((item) => ({
            ...item,
            branchName: getBranchLabel(shopBranch),
          })),
        };

  const rawCvList = raw.cv || [];
  const sortedCv = [...rawCvList].sort((a: ShopCVData, b: ShopCVData) => {
    const aIsWorking = !a.isOff && a.attendance !== 'checked_out';
    const bIsWorking = !b.isOff && b.attendance !== 'checked_out';

    if (aIsWorking && !bIsWorking) return -1;
    if (!aIsWorking && bIsWorking) return 1;

    const aBooked = a.bookedCount ?? a.clients ?? 0;
    const bBooked = b.bookedCount ?? b.clients ?? 0;
    const aDone = a.doneCount ?? a.clients ?? 0;
    const bDone = b.doneCount ?? b.clients ?? 0;

    return bBooked - aBooked || bDone - aDone || (a.name || '').localeCompare(b.name || '');
  });

  return {
    revLe: showTax ? raw.revLe || 0 : raw.netLe || 0,
    revCombo: showTax ? raw.revCombo || 0 : raw.netCombo || 0,
    revProduct: showTax ? raw.revProduct || 0 : raw.netProduct || 0,
    cc: (raw.cc || []).map((c: SafeAny) => ({
      ...c,
      revLe: showTax ? c.revLe || 0 : c.netLe || 0,
      revCombo: showTax ? c.revCombo || 0 : c.netCombo || 0,
      revProduct: showTax ? c.revProduct || 0 : c.netProduct || 0,
      revenue: showTax ? c.revenue || 0 : c.netRevenue || 0,
    })),
    cv: sortedCv,
    coming: raw.coming || [],
  };
}

export function buildSandboxDashboardSnapshot(
  sandbox: Pick<TodaySandboxContextValue, 'mode' | 'staffOverrides' | 'simulatedCombos' | 'simulatedProducts'>
) {
  if (sandbox.mode === 'training') {
    const branchesData = getTrainingMockBranchesData(sandbox.staffOverrides);
    const bookings = getTrainingMockBookings();
    return {
      branchesData,
      bookingsCombo: bookings.combo,
      bookingsOc: bookings.oc,
      bookingsOther: bookings.other,
    };
  }
  if (sandbox.mode === 'sales') {
    const branchesData = getSalesMockBranchesData(sandbox.simulatedCombos, sandbox.simulatedProducts);
    const bookings = getSalesMockBookings(sandbox.simulatedCombos, sandbox.simulatedProducts);
    return {
      branchesData,
      bookingsCombo: bookings.combo,
      bookingsOc: bookings.oc,
      bookingsOther: bookings.other,
    };
  }
  return null;
}

export function buildSandboxRevenueData(
  sandbox: Pick<
    TodaySandboxContextValue,
    'mode' | 'totalSimulatedRevenue' | 'totalSimulatedComboRevenue' | 'totalSimulatedProductRevenue'
  >
): RevenueHourlyResponse {
  const totalRev = sandbox.mode === 'sales' ? 12_050_000 + sandbox.totalSimulatedRevenue : 8_130_000;
  const mockHourly: SafeAny = {
    summary: {
      totalRevenue: totalRev,
      comboRevenue: sandbox.mode === 'sales' ? 7_500_000 + sandbox.totalSimulatedComboRevenue : 4_500_000,
      singleRevenue: 2_100_000,
      productRevenue: sandbox.mode === 'sales' ? 1_050_000 + sandbox.totalSimulatedProductRevenue : 530_000,
      completedOrders: 18,
      aov: Math.round(totalRev / 18),
    },
    hourlyBreakdown: [],
    branchHourlyMatrix: [],
  };
  return mockHourly;
}
