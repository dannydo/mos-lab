'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import type { DailyCallEntry, Staff } from '@mos-lab/shared';
import { useOmiCall } from '~/context/OmiCallContext';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import { useTableConfig } from '~/hooks/useTableConfig';
import { apiClient } from '~/lib/api-client';
import { buildDailyCallsColumns } from './dailyCallsColumns';
import {
  DAILY_CALLS_DATA_UPDATED_EVENTS,
  DAILY_CALLS_STORAGE_KEYS,
  DAILY_CALLS_TABLE_ID,
} from './dailyCallsTableConstants';
import { isValidDailyCallsScope, sliceVisibleDailyCalls } from './dailyCallsTableHelpers';
import type { DailyCallsScope, DailyCallsStoredUser, DailyCallsTableProps } from './dailyCallsTableTypes';

export function useDailyCallsTable({ initialScope = 'all', isDrawerMode = false }: DailyCallsTableProps) {
  const { makeCall } = useOmiCall();
  const responsiveTier = useResponsiveTier();
  const isMobile = responsiveTier === 'mobile';

  const [selectedDate, setSelectedDate] = useState<dayjs.Dayjs>(dayjs());
  const [scope, setScope] = useState<DailyCallsScope>(initialScope);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<DailyCallEntry[]>([]);

  const [currentUser, setCurrentUser] = useState<DailyCallsStoredUser | null>(null);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');

  const [pageSize, setPageSize] = useState<number>(isDrawerMode ? 10 : 15);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [isReady, setIsReady] = useState(false);
  const dailyCallsRequestIdRef = useRef(0);

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [qaDrawerOpen, setQaDrawerOpen] = useState(false);
  const [selectedOmicallLogId, setSelectedOmicallLogId] = useState<number | null>(null);

  useEffect(
    () => () => {
      dailyCallsRequestIdRef.current += 1;
    },
    []
  );

  const openQADrawer = useCallback((omicallLogId: number) => {
    setSelectedOmicallLogId(omicallLogId);
    setQaDrawerOpen(true);
  }, []);

  const closeQADrawer = useCallback(() => {
    setQaDrawerOpen(false);
  }, []);

  const openCustomerDetail = useCallback((id: number) => {
    setSelectedCustomerId(id);
    setCustomerDrawerOpen(true);
  }, []);

  const closeCustomerDrawer = useCallback(() => {
    setCustomerDrawerOpen(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let active = true;
    const stored = localStorage.getItem(DAILY_CALLS_STORAGE_KEYS.MOS_USER);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DailyCallsStoredUser;
        setCurrentUser(parsed);

        if (parsed.role === 'admin') {
          apiClient.staff
            .list()
            .then((list) => {
              if (active) setStaffList(list);
            })
            .catch((err) => console.error('Fetch staff list error:', err));
        }
      } catch (e) {
        console.error('Failed to parse user', e);
      }
    }

    const savedDate = localStorage.getItem(DAILY_CALLS_STORAGE_KEYS.SELECTED_DATE);
    if (savedDate) {
      setSelectedDate(dayjs(savedDate));
    }

    const savedScope = localStorage.getItem(DAILY_CALLS_STORAGE_KEYS.SCOPE);
    if (isValidDailyCallsScope(savedScope)) {
      setScope(savedScope);
    }

    const savedStaffId = localStorage.getItem(DAILY_CALLS_STORAGE_KEYS.SELECTED_STAFF_ID);
    if (savedStaffId) {
      setSelectedStaffId(savedStaffId);
    }

    const savedPageSize = localStorage.getItem(DAILY_CALLS_STORAGE_KEYS.PAGE_SIZE);
    if (savedPageSize) {
      const parsedSize = parseInt(savedPageSize, 10);
      if (!isNaN(parsedSize)) {
        setPageSize(parsedSize);
      }
    }

    const savedPage = localStorage.getItem(DAILY_CALLS_STORAGE_KEYS.CURRENT_PAGE);
    if (savedPage) {
      const parsedPage = parseInt(savedPage, 10);
      if (!isNaN(parsedPage)) {
        setCurrentPage(parsedPage);
      }
    }

    setIsReady(true);

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    setScope(initialScope);
    localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.SCOPE, initialScope);
    setCurrentPage(1);
    localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.CURRENT_PAGE, '1');
  }, [initialScope, isReady]);

  const fetchDailyCalls = useCallback(
    async (date: dayjs.Dayjs, currentScope: DailyCallsScope, staffFilterId: string) => {
      const requestId = ++dailyCallsRequestIdRef.current;
      setLoading(true);
      try {
        const dateStr = date.format('YYYY-MM-DD');
        const res = await apiClient.calls.listDaily({
          date: dateStr,
          scope: currentScope,
          staffId: currentScope === 'me' ? undefined : staffFilterId,
        });
        if (requestId === dailyCallsRequestIdRef.current) {
          setData(res);
        }
      } catch (err) {
        if (requestId === dailyCallsRequestIdRef.current) {
          console.error('Fetch daily calls error:', err);
          message.error('Không thể tải danh sách cuộc gọi.');
        }
      } finally {
        if (requestId === dailyCallsRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (isReady) {
      fetchDailyCalls(selectedDate, scope, selectedStaffId);
    }
  }, [selectedDate, scope, selectedStaffId, fetchDailyCalls, isReady]);

  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const handleDataChanged = () => {
      if (!isReady) return;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchDailyCalls(selectedDate, scope, selectedStaffId);
      }, 100);
    };

    DAILY_CALLS_DATA_UPDATED_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleDataChanged);
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      DAILY_CALLS_DATA_UPDATED_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleDataChanged);
      });
    };
  }, [selectedDate, scope, selectedStaffId, fetchDailyCalls, isReady]);

  const handlePrevDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = prev.subtract(1, 'day');
      localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.SELECTED_DATE, next.format('YYYY-MM-DD'));
      return next;
    });
    setCurrentPage(1);
    localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.CURRENT_PAGE, '1');
  }, []);

  const handleNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = prev.add(1, 'day');
      localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.SELECTED_DATE, next.format('YYYY-MM-DD'));
      return next;
    });
    setCurrentPage(1);
    localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.CURRENT_PAGE, '1');
  }, []);

  const handleToday = useCallback(() => {
    const today = dayjs();
    setSelectedDate(today);
    localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.SELECTED_DATE, today.format('YYYY-MM-DD'));
    setCurrentPage(1);
    localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.CURRENT_PAGE, '1');
  }, []);

  const handleDateChange = useCallback((date: dayjs.Dayjs | null) => {
    if (!date) return;
    setSelectedDate(date);
    localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.SELECTED_DATE, date.format('YYYY-MM-DD'));
    setCurrentPage(1);
    localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.CURRENT_PAGE, '1');
  }, []);

  const handleScopeChange = useCallback((nextScope: DailyCallsScope) => {
    setScope(nextScope);
    localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.SCOPE, nextScope);
    setCurrentPage(1);
    localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.CURRENT_PAGE, '1');
  }, []);

  const handleStaffChange = useCallback((staffId: string) => {
    setSelectedStaffId(staffId);
    localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.SELECTED_STAFF_ID, staffId);
    setCurrentPage(1);
    localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.CURRENT_PAGE, '1');
  }, []);

  const handlePageChange = useCallback(
    (page: number, size: number) => {
      setCurrentPage(page);
      localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.CURRENT_PAGE, page.toString());
      if (size !== pageSize) {
        setPageSize(size);
        localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.PAGE_SIZE, size.toString());
        setCurrentPage(1);
        localStorage.setItem(DAILY_CALLS_STORAGE_KEYS.CURRENT_PAGE, '1');
      }
    },
    [pageSize]
  );

  const refreshCurrentCalls = useCallback(() => {
    fetchDailyCalls(selectedDate, scope, selectedStaffId);
  }, [fetchDailyCalls, selectedDate, scope, selectedStaffId]);

  const staticColumns = useMemo(
    () =>
      buildDailyCallsColumns({
        onOpenCustomer: openCustomerDetail,
        onMakeCall: makeCall,
        onOpenQaDrawer: openQADrawer,
      }),
    [openCustomerDetail, makeCall, openQADrawer]
  );

  const {
    loading: configLoading,
    columns: configuredColumns,
    rawConfig,
    configVisible,
    openConfig,
    closeConfig,
    saveConfig,
    resetConfig,
  } = useTableConfig<DailyCallEntry>(DAILY_CALLS_TABLE_ID, staticColumns);

  const visibleData = useMemo(
    () => sliceVisibleDailyCalls(data, isMobile, currentPage, pageSize),
    [currentPage, data, isMobile, pageSize]
  );

  return {
    selectedDate,
    scope,
    loading,
    data,
    visibleData,
    isAdmin: currentUser?.role === 'admin',
    staffList,
    selectedStaffId,
    pageSize,
    currentPage,
    isReady,
    configLoading,
    configuredColumns,
    rawConfig,
    configVisible,
    selectedCustomerId,
    customerDrawerOpen,
    qaDrawerOpen,
    selectedOmicallLogId,
    makeCall,
    openCustomerDetail,
    closeCustomerDrawer,
    closeQADrawer,
    openConfig,
    closeConfig,
    saveConfig,
    resetConfig,
    handlePrevDay,
    handleNextDay,
    handleToday,
    handleDateChange,
    handleScopeChange,
    handleStaffChange,
    handlePageChange,
    refreshCurrentCalls,
  };
}
