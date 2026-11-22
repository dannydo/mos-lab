'use client';

import type { RefObject } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../../../../lib/api-client';
import type { CustomerCounts, CustomerTabDataMap, UseCustomerDetailProps } from './types';

interface UseCustomerDataAndTabsParams {
  open: boolean;
  customerId: number | null;
  optionsRef: RefObject<UseCustomerDetailProps>;
}

const DEFAULT_COUNTS: CustomerCounts = {
  bookingCount: 0,
  noteCount: 0,
  callCount: 0,
  timelineCount: 0,
};

export function useCustomerDataAndTabs({ open, customerId, optionsRef }: UseCustomerDataAndTabsParams) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SafeAny>(null);
  const [detailData, setDetailData] = useState<SafeAny>(null);
  const detailRequestRef = useRef<{ customerId: number; promise: Promise<SafeAny> } | null>(null);
  const activeCustomerIdRef = useRef<number | null>(customerId);
  activeCustomerIdRef.current = customerId;
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<string>('bookings');
  const [tabDataMap, setTabDataMap] = useState<CustomerTabDataMap>({});
  const tabDataMapRef = useRef(tabDataMap);
  tabDataMapRef.current = tabDataMap;

  const fetchDetails = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setForbiddenError(null);
    try {
      const summaryData = await apiClient.customers.getSummary(customerId);
      setData(summaryData);
    } catch (err) {
      console.error('Failed to fetch detailed customer:', err);
      if ((err as SafeAny).response?.status === 403) {
        setForbiddenError(
          (err as SafeAny).response?.data?.message || 'Bạn không có quyền xem thông tin chi tiết khách hàng này.'
        );
      } else {
        optionsRef.current?.onError?.(
          (err as SafeAny).response?.data?.message || 'Không thể tải thông tin chi tiết khách hàng.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [customerId, optionsRef]);

  const loadDetailedData = useCallback(async () => {
    if (!customerId) return null;

    if (detailData?.customer?.id === customerId) {
      return detailData;
    }

    if (detailRequestRef.current?.customerId === customerId) {
      return detailRequestRef.current.promise;
    }

    const requestedCustomerId = customerId;
    let request: Promise<SafeAny>;
    request = apiClient.customers
      .getDetailed(customerId)
      .then((nextDetailData) => {
        if (activeCustomerIdRef.current === requestedCustomerId) {
          setDetailData(nextDetailData);
        }
        return nextDetailData;
      })
      .catch((err) => {
        console.error('Failed to fetch customer report details:', err);
        optionsRef.current?.onError?.(
          (err as SafeAny).response?.data?.message || 'Không thể tải lịch sử giao dịch khách hàng.'
        );
        return null;
      })
      .finally(() => {
        if (detailRequestRef.current?.promise === request) {
          detailRequestRef.current = null;
        }
      });

    detailRequestRef.current = { customerId: requestedCustomerId, promise: request };
    return request;
  }, [customerId, detailData, optionsRef]);

  const fetchTabData = useCallback(
    async (tabKey: string, pageNum = 1, append = false, force = false) => {
      if (!customerId) return;

      const currentTabData = tabDataMapRef.current[tabKey];
      // If already cached and not loading more page 1, skip (unless force is true)
      if (!force && !append && pageNum === 1 && currentTabData?.items && currentTabData.items.length > 0) {
        return;
      }

      setTabDataMap((prev) => ({
        ...prev,
        [tabKey]: {
          items: prev[tabKey]?.items || [],
          totalCount: prev[tabKey]?.totalCount || 0,
          hasMore: prev[tabKey]?.hasMore ?? true,
          page: pageNum,
          loading: true,
        },
      }));

      try {
        let res: { items: SafeAny[]; totalCount: number; hasMore: boolean };
        if (tabKey === 'bookings') {
          res = await apiClient.customers.getBookings(customerId, { page: pageNum, limit: 15 });
        } else if (tabKey === 'notes') {
          res = await apiClient.customers.getNotes(customerId, { page: pageNum, limit: 15 });
        } else if (tabKey === 'calls') {
          res = await apiClient.customers.getCalls(customerId, { page: pageNum, limit: 15 });
        } else {
          res = { items: [], totalCount: 0, hasMore: false };
        }

        setTabDataMap((prev) => {
          const currentItems = append ? prev[tabKey]?.items || [] : [];
          return {
            ...prev,
            [tabKey]: {
              items: [...currentItems, ...res.items],
              totalCount: res.totalCount,
              hasMore: res.hasMore,
              page: pageNum,
              loading: false,
            },
          };
        });
      } catch (err) {
        console.error(`Failed to fetch tab ${tabKey}:`, err);
        setTabDataMap((prev) => ({
          ...prev,
          [tabKey]: {
            ...prev[tabKey],
            loading: false,
          },
        }));
      }
    },
    [customerId]
  );

  const refetchTabData = useCallback(
    (tabKey: string) => {
      return fetchTabData(tabKey, 1, false, true);
    },
    [fetchTabData]
  );

  const refreshBookingHistory = useCallback(async () => {
    setActiveTab('bookings');
    await Promise.all([fetchDetails(), fetchTabData('bookings', 1, false, true)]);
    optionsRef.current?.onUpdate?.();
  }, [fetchDetails, fetchTabData, optionsRef]);

  const refreshAllDetails = useCallback(async () => {
    const loadedTabs = Object.keys(tabDataMapRef.current).filter((key) => ['bookings', 'notes', 'calls'].includes(key));
    await Promise.all([fetchDetails(), ...loadedTabs.map((key) => fetchTabData(key, 1, false, true))]);
    optionsRef.current?.onUpdate?.();
  }, [fetchDetails, fetchTabData, optionsRef]);

  // Instantly refresh customer detail drawer when calls/bookings/customer data are updated
  useEffect(() => {
    const handleDataChanged = () => {
      if (open && customerId) {
        refreshAllDetails();
      }
    };
    window.addEventListener('mos-data-updated', handleDataChanged);
    window.addEventListener('mos-call-log-saved', handleDataChanged);
    window.addEventListener('mos-customer-updated', handleDataChanged);
    window.addEventListener('mos-booking-updated', handleDataChanged);
    return () => {
      window.removeEventListener('mos-data-updated', handleDataChanged);
      window.removeEventListener('mos-call-log-saved', handleDataChanged);
      window.removeEventListener('mos-customer-updated', handleDataChanged);
      window.removeEventListener('mos-booking-updated', handleDataChanged);
    };
  }, [open, customerId, refreshAllDetails]);

  const handleTabChange = useCallback(
    (key: string) => {
      setActiveTab(key);
      if (key === 'timeline') {
        void Promise.all([fetchTabData('notes', 1, false), fetchTabData('calls', 1, false)]);
        return;
      }
      void fetchTabData(key, 1, false);
    },
    [fetchTabData]
  );

  const prevOpenRef = useRef<boolean>(false);
  const prevCustomerIdRef = useRef<number | null>(null);

  useEffect(() => {
    const isJustOpened = open && !prevOpenRef.current;
    const isCustomerChanged = open && customerId !== prevCustomerIdRef.current;
    const isJustClosed = !open && prevOpenRef.current;

    if (open && customerId && (isJustOpened || isCustomerChanged)) {
      setTabDataMap({});
      setActiveTab('bookings');
      setDetailData(null);
      detailRequestRef.current = null;
      void fetchDetails();
      void fetchTabData('bookings', 1, false);
      // Booking cards render their attached CC/CS notes immediately, so warm
      // only this first note page instead of the entire customer dossier.
      void fetchTabData('notes', 1, false);
    } else if (isJustClosed) {
      setData(null);
      setDetailData(null);
      detailRequestRef.current = null;
      setForbiddenError(null);
      setTabDataMap({});
    }

    prevOpenRef.current = open;
    prevCustomerIdRef.current = customerId;
  }, [open, customerId]);

  return {
    activeTab,
    tabDataMap,
    handleTabChange,
    fetchTabData,
    counts: (data?.counts as CustomerCounts | undefined) || DEFAULT_COUNTS,
    loading,
    data,
    detailData,
    forbiddenError,
    customer: data?.customer,
    stats: data?.stats,
    comboBalances: data?.comboBalances || [],
    bookings: data?.bookings || [],
    notes: data?.notes || [],
    calls: data?.calls || [],
    fetchDetails,
    loadDetailedData,
    refetchTabData,
    refreshBookingHistory,
    refreshAllDetails,
  };
}
