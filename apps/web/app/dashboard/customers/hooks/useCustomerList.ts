import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../../../../lib/api-client';
import { Customer } from '@mos-lab/shared';

export const useCustomerList = (
  filterParams: SafeAny,
  randomSelectedIds: number[] | null,
  optionsRef: React.MutableRefObject<SafeAny>
) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_customers_pageSize');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return 20;
  });

  const [stats, setStats] = useState({
    total: 0,
    comboLive: 0,
    comboDead: 0,
    single: 0,
    notComboLive: 0,
  });

  const fetchStats = useCallback(
    async (overrideSearchVal?: string) => {
      try {
        const params: SafeAny = {
          search: overrideSearchVal !== undefined ? overrideSearchVal : filterParams.searchQuery,
        };
        if (filterParams.showTrash) {
          params.trash = 'true';
        }
        if (randomSelectedIds && randomSelectedIds.length > 0) {
          params.ids = randomSelectedIds.join(',');
        }
        if (filterParams.daysSinceLastVisitMin !== undefined)
          params.daysSinceLastVisitMin = filterParams.daysSinceLastVisitMin.toString();
        if (filterParams.daysSinceLastVisitMax !== undefined)
          params.daysSinceLastVisitMax = filterParams.daysSinceLastVisitMax.toString();
        if (filterParams.totalSpentMin !== undefined) params.totalSpentMin = filterParams.totalSpentMin.toString();
        if (filterParams.totalSpentMax !== undefined) params.totalSpentMax = filterParams.totalSpentMax.toString();
        if (filterParams.totalVisitsMin !== undefined) params.totalVisitsMin = filterParams.totalVisitsMin.toString();
        if (filterParams.totalVisitsMax !== undefined) params.totalVisitsMax = filterParams.totalVisitsMax.toString();

        if (filterParams.promoUsed && filterParams.promoUsed !== 'all') params.promoUsed = filterParams.promoUsed;
        if (filterParams.promoCountMin !== undefined) params.promoCountMin = filterParams.promoCountMin.toString();
        if (filterParams.promoCountMax !== undefined) params.promoCountMax = filterParams.promoCountMax.toString();

        if (filterParams.referralUsed && filterParams.referralUsed !== 'all')
          params.referralUsed = filterParams.referralUsed;
        if (filterParams.referralCountMin !== undefined)
          params.referralCountMin = filterParams.referralCountMin.toString();
        if (filterParams.referralCountMax !== undefined)
          params.referralCountMax = filterParams.referralCountMax.toString();

        if (filterParams.assignedStaffId && filterParams.assignedStaffId !== 'all') {
          params.assignedStaffId = filterParams.assignedStaffId;
        }
        if (filterParams.retainedOnly) {
          params.retainedOnly = filterParams.retainedOnly;
        }

        const data = await apiClient.customers.getStats(params);
        setStats(data);
      } catch (error) {
        console.error('Fetch stats error:', error);
      }
    },
    [filterParams, randomSelectedIds]
  );

  const fetchIdRef = useRef(0);

  const fetchCustomers = useCallback(
    async (page: number, limit: number, overrideIds?: number[]) => {
      const currentFetchId = ++fetchIdRef.current;
      setLoading(true);
      try {
        const params: SafeAny = {
          page: page.toString(),
          limit: limit.toString(),
          sort: filterParams.sortField,
        };
        if (filterParams.showTrash) {
          params.trash = 'true';
        }

        const idsToUse = overrideIds !== undefined ? overrideIds : randomSelectedIds;
        if (idsToUse && idsToUse.length > 0) {
          params.ids = idsToUse.join(',');
        }

        if (filterParams.activeTab !== 'ALL') {
          params.bucket = filterParams.activeTab;
        }
        if (filterParams.searchQuery && filterParams.searchQuery.trim() !== '') {
          params.search = filterParams.searchQuery;
        }

        if (filterParams.daysSinceLastVisitMin !== undefined)
          params.daysSinceLastVisitMin = filterParams.daysSinceLastVisitMin.toString();
        if (filterParams.daysSinceLastVisitMax !== undefined)
          params.daysSinceLastVisitMax = filterParams.daysSinceLastVisitMax.toString();
        if (filterParams.totalSpentMin !== undefined) params.totalSpentMin = filterParams.totalSpentMin.toString();
        if (filterParams.totalSpentMax !== undefined) params.totalSpentMax = filterParams.totalSpentMax.toString();
        if (filterParams.totalVisitsMin !== undefined) params.totalVisitsMin = filterParams.totalVisitsMin.toString();
        if (filterParams.totalVisitsMax !== undefined) params.totalVisitsMax = filterParams.totalVisitsMax.toString();

        if (filterParams.promoUsed && filterParams.promoUsed !== 'all') params.promoUsed = filterParams.promoUsed;
        if (filterParams.promoCountMin !== undefined) params.promoCountMin = filterParams.promoCountMin.toString();
        if (filterParams.promoCountMax !== undefined) params.promoCountMax = filterParams.promoCountMax.toString();

        if (filterParams.referralUsed && filterParams.referralUsed !== 'all')
          params.referralUsed = filterParams.referralUsed;
        if (filterParams.referralCountMin !== undefined)
          params.referralCountMin = filterParams.referralCountMin.toString();
        if (filterParams.referralCountMax !== undefined)
          params.referralCountMax = filterParams.referralCountMax.toString();

        if (filterParams.assignedStaffId && filterParams.assignedStaffId !== 'all') {
          params.assignedStaffId = filterParams.assignedStaffId;
        }
        if (filterParams.retainedOnly) {
          params.retainedOnly = filterParams.retainedOnly;
        }

        const data = await apiClient.customers.list(params);

        // Ignore stale response if a newer fetch was initiated
        if (currentFetchId !== fetchIdRef.current) return;

        setCustomers(data.data);

        if (idsToUse && idsToUse.length > 0) {
          setTotal(idsToUse.length);
        } else {
          setTotal(data.pagination.total);
        }
      } catch (error) {
        if (currentFetchId !== fetchIdRef.current) return;
        console.error('Fetch customers error:', error);
        optionsRef.current?.onError?.(
          (error as SafeAny).response?.data?.message || 'Không thể tải danh sách khách hàng'
        );
      } finally {
        if (currentFetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
    },
    [filterParams, randomSelectedIds, optionsRef]
  );

  const prevFilterRef = useRef(filterParams);

  // Trigger loading list & badges on filters change
  useEffect(() => {
    const filtersChanged = prevFilterRef.current !== filterParams;
    prevFilterRef.current = filterParams;

    if (filtersChanged) {
      if (currentPage !== 1) {
        setCurrentPage(1);
        return;
      }
    }

    fetchCustomers(currentPage, pageSize);
    fetchStats();
  }, [currentPage, pageSize, filterParams, fetchCustomers, fetchStats]);

  const sentinelRef = useCallback(() => {}, []);

  const refreshListAndStats = useCallback(() => {
    fetchCustomers(1, pageSize);
    fetchStats();
  }, [fetchCustomers, fetchStats, pageSize]);

  return {
    customers,
    setCustomers,
    loading,
    total,
    setTotal,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    sentinelRef,
    stats,
    fetchCustomers,
    fetchStats,
    refreshListAndStats,
  };
};
export default useCustomerList;
