'use client';

import { useState, useCallback, useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from 'react';
import dayjs from 'dayjs';
import type { Customer, Staff } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type {
  CustomTouchpoint,
  LocaBookingStatusFilter,
  LocaContactSubTab,
  LocaOverallStats,
  TabConfigs,
  UseLocaDataOptions,
} from './types';

export interface UseLocaCustomersAndStatsParams {
  currentUser: Staff | null;
  activeTab: string;
  activeTouchpointKey: string;
  contactSubTab: LocaContactSubTab;
  searchQuery: string;
  sortField: string;
  assignedStaffId: string | number;
  bookingStatusFilter: LocaBookingStatusFilter;
  currentPage: number;
  pageSize: number;
  dateRange: { dateFrom: string; dateTo: string };
  configs: TabConfigs;
  setConfigs: Dispatch<SetStateAction<TabConfigs>>;
  defaultConfigs: TabConfigs;
  customTouchpoints: CustomTouchpoint[];
  customTouchpointsKey: string;
  optionsRef: RefObject<UseLocaDataOptions | undefined>;
}

export function useLocaCustomersAndStats({
  currentUser,
  activeTab,
  activeTouchpointKey,
  contactSubTab,
  searchQuery,
  sortField,
  assignedStaffId,
  bookingStatusFilter,
  currentPage,
  pageSize,
  dateRange,
  configs,
  setConfigs,
  defaultConfigs,
  customTouchpoints,
  customTouchpointsKey,
  optionsRef,
}: UseLocaCustomersAndStatsParams) {
  // ===== Performance: Initialization Gate + Debounce (Phase 1 Optimization) =====
  // Prevents 6x duplicate API calls on mount caused by useEffect dependency cascade
  const isInitializedRef = useRef(false);
  const isInitialTouchpointFetchRef = useRef(true);
  const isInitialCustomerFetchRef = useRef(true);
  const touchpointDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const customerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Request ID Guard to prevent out-of-order API responses from overwriting data
  const lastRequestIdRef = useRef(0);

  // Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Stats Counters
  const [tabCounts, setTabCounts] = useState<{ [key: string]: number }>({});
  const [touchpointCounts, setTouchpointCounts] = useState<{ [key: string]: number }>({});
  const [overallStats, setOverallStats] = useState<LocaOverallStats>({
    totalComboLive: 0,
    hsd30Count: 0,
    lsd1Count: 0,
    totalCalledToday: 0,
    totalBookedToday: 0,
  });

  // Dropdown & plan lists
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [dailyPlanList, setDailyPlanList] = useState<number[]>([]);

  const fetchStaffList = useCallback(async () => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'manager')) return;
    try {
      const data = await apiClient.customers.getStaff({ role: 'cs' });
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load staff list:', err);
    }
  }, [currentUser]);

  const fetchTodayPlans = useCallback(async () => {
    try {
      const response = await apiClient.plans.listToday();
      if (response && Array.isArray(response)) {
        setDailyPlanList(response.map((prog: SafeAny) => prog.legacyUserId));
      }
    } catch (err) {
      console.error('Failed to load today call plans:', err);
    }
  }, []);

  const fetchOverallStats = useCallback(async () => {
    try {
      const params = {
        startDate: dayjs().startOf('day').toISOString(),
        endDate: dayjs().endOf('day').toISOString(),
      };
      const kpiData = await apiClient.kpi.getSummary(params);

      setOverallStats((prev) => ({
        ...prev,
        totalCalledToday: kpiData?.totalCalled || 0,
        totalBookedToday: kpiData?.totalBooked || 0,
      }));
    } catch (err) {
      console.error('Failed to fetch overall stats:', err);
    }
  }, []);

  // ===== Consolidated Initialization Effect =====
  // Load configuration before enabling the data effects. The list and tab-count
  // effects below own their initial fetch, so they are not also requested here.
  // Calling them from both places made the first render fetch each endpoint twice.
  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      // Step 1: Load touchpoint configs (required before list/stats fetches)
      try {
        const data = await apiClient.loca.getConfig();
        if (!cancelled) setConfigs(data as SafeAny);
      } catch (err) {
        console.error('Failed to load touchpoint config:', err);
        optionsRef.current?.onError?.('Không thể tải cấu hình touchpoints LoCa.');
        // Trigger the data effects with the built-in configuration when the
        // remote config is temporarily unavailable.
        if (!cancelled) setConfigs({ ...defaultConfigs });
      }

      // Step 2: Enable the debounced list/stats effects, then fetch the remaining
      // independent page data in parallel.
      if (!cancelled) {
        isInitializedRef.current = true;
        await Promise.allSettled([fetchStaffList(), fetchTodayPlans(), fetchOverallStats()]);
      }
    };
    initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch Touchpoint & Tab Counts via 1 single Batch Stats API call
  const fetchTouchpointCounts = useCallback(async () => {
    try {
      const params = {
        search: searchQuery || undefined,
        assignedStaffId: assignedStaffId || 'ALL',
        dateFrom: dateRange.dateFrom,
        dateTo: dateRange.dateTo,
        customTouchpoints: customTouchpointsKey,
      };

      const locaStats = await apiClient.customers.getLocaStats(params as SafeAny);

      if (locaStats) {
        setTouchpointCounts(locaStats.touchpoints || {});
        setTabCounts(locaStats.tabs || {});

        // Set overall stats summary from batch counts
        setOverallStats((prev) => ({
          ...prev,
          totalComboLive: locaStats.tabs?.LOCA_ALL || 0,
          hsd30Count: locaStats.tabs?.HSD_30 || 0,
          lsd1Count: locaStats.tabs?.LSD_1 || 0,
        }));
      }
    } catch (err) {
      console.error('Failed to load touchpoint counts:', err);
    }
  }, [searchQuery, assignedStaffId, currentUser, dateRange, customTouchpointsKey]);

  // Fetch immediately after configuration is ready; debounce subsequent filters.
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (Object.keys(configs).length === 0) return;
    if (touchpointDebounceRef.current) clearTimeout(touchpointDebounceRef.current);
    const delay = isInitialTouchpointFetchRef.current ? 0 : 300;
    isInitialTouchpointFetchRef.current = false;
    touchpointDebounceRef.current = setTimeout(() => {
      fetchTouchpointCounts();
    }, delay);
    return () => {
      if (touchpointDebounceRef.current) clearTimeout(touchpointDebounceRef.current);
    };
  }, [configs, searchQuery, assignedStaffId, fetchTouchpointCounts]);

  const fetchCustomerList = useCallback(async () => {
    const requestId = ++lastRequestIdRef.current;
    setLoading(true);
    try {
      const activeTabConfig = configs['LOCA_ALL'] || [];
      const matchedTp = activeTabConfig.find((tp) => tp.key === activeTouchpointKey);
      const matchedCustomTp =
        !matchedTp && activeTouchpointKey.startsWith('CUSTOM_')
          ? customTouchpoints.find((ctp) => ctp.key === activeTouchpointKey)
          : undefined;
      const resolvedRange = matchedTp ?? matchedCustomTp;

      const daysFrom = resolvedRange ? resolvedRange.daysMin : undefined;
      const daysTo = resolvedRange ? resolvedRange.daysMax : undefined;

      const params: SafeAny = {
        bucket: activeTab === 'NEW_LOCA' ? 'NEW_LOCA' : 'COMBO_LIVE',
        daysSinceLastVisitMin:
          activeTab === 'NEW_LOCA' ? undefined : daysFrom !== undefined ? daysFrom.toString() : undefined,
        daysSinceLastVisitMax:
          activeTab === 'NEW_LOCA' ? undefined : daysTo !== undefined ? daysTo.toString() : undefined,
        search: searchQuery || undefined,
        sort:
          activeTab === 'NEW_LOCA' && sortField === 'daysSinceLastVisit' ? 'purchaseDate_desc' : sortField || undefined,
        sortField:
          activeTab === 'NEW_LOCA' && sortField === 'daysSinceLastVisit' ? 'purchaseDate_desc' : sortField || undefined,
        page: currentPage,
        limit: pageSize,
        assignedStaffId:
          assignedStaffId === 'ALL' ? undefined : assignedStaffId === 'me' ? currentUser?.id : assignedStaffId,
      };

      if (activeTab === 'NEW_LOCA') {
        params.dateFrom = dateRange.dateFrom;
        params.dateTo = dateRange.dateTo;
      }

      if (activeTab === 'HSD_30') params.hsd30 = 'true';
      if (activeTab === 'LSD_1') params.lsd1 = 'true';
      if (activeTab === 'SP') params.hasProduct = 'true';
      if (activeTab === 'CALLBACK') params.hasCallback = 'true';
      if (activeTab === 'BOOKED') params.hasFutureBooking = 'true';
      if (bookingStatusFilter === 'BOOKED') params.hasFutureBooking = 'true';
      if (bookingStatusFilter === 'NOT_BOOKED') params.hasFutureBooking = 'false';
      if (activeTab === 'CONTACTED') {
        params.contacted = 'true';
        if (contactSubTab !== 'ALL') {
          params.contactType = contactSubTab;
        }
      }

      const data = await apiClient.customers.list(params);
      if (requestId === lastRequestIdRef.current) {
        setCustomers(data.data);
        setTotal(data.pagination.total);
      }
    } catch (err) {
      if (requestId === lastRequestIdRef.current) {
        console.error('Failed to load customer list:', err);
        optionsRef.current?.onError?.('Không thể tải danh sách khách hàng LoCa.');
      }
    } finally {
      if (requestId === lastRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [
    currentPage,
    pageSize,
    activeTab,
    activeTouchpointKey,
    contactSubTab,
    searchQuery,
    sortField,
    assignedStaffId,
    bookingStatusFilter,
    configs,
    customTouchpointsKey,
    currentUser,
    dateRange,
  ]);

  // Fetch immediately after configuration is ready; debounce subsequent filters.
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (Object.keys(configs).length === 0) return;
    if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current);
    const delay = isInitialCustomerFetchRef.current ? 0 : 300;
    isInitialCustomerFetchRef.current = false;
    customerDebounceRef.current = setTimeout(() => {
      fetchCustomerList();
    }, delay);
    return () => {
      if (customerDebounceRef.current) clearTimeout(customerDebounceRef.current);
    };
  }, [configs, currentPage, pageSize, activeTab, activeTouchpointKey, assignedStaffId, fetchCustomerList]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleLogSaved = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      const customerId = detail?.customerId;
      const callLog = detail?.callLog;

      // Optimistically update matching customer row for instant feedback
      if (customerId && callLog) {
        setCustomers((prev) =>
          prev.map((c) => {
            if (c.id === customerId) {
              return {
                ...c,
                lastCall: {
                  createdAt: callLog.createdAt || new Date().toISOString(),
                  durationSec: callLog.durationSec,
                  callResult: callLog.callResult,
                  note: callLog.note,
                },
              };
            }
            return c;
          })
        );
      }

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchOverallStats();
        fetchCustomerList();
      }, 100);
    };
    window.addEventListener('mos-data-updated', handleLogSaved);
    window.addEventListener('mos-call-log-saved', handleLogSaved);
    window.addEventListener('mos-customer-updated', handleLogSaved);
    window.addEventListener('mos-booking-updated', handleLogSaved);
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      window.removeEventListener('mos-data-updated', handleLogSaved);
      window.removeEventListener('mos-call-log-saved', handleLogSaved);
      window.removeEventListener('mos-customer-updated', handleLogSaved);
      window.removeEventListener('mos-booking-updated', handleLogSaved);
    };
  }, [fetchOverallStats, fetchCustomerList]);

  return {
    customers,
    setCustomers,
    total,
    loading,
    tabCounts,
    touchpointCounts,
    overallStats,
    staffList,
    dailyPlanList,
    setDailyPlanList,
    fetchCustomerList,
    fetchOverallStats,
  };
}
