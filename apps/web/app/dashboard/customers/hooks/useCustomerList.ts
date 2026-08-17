import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../../../../lib/api-client';
import { Customer, ListCustomersParams } from '@mos-lab/shared';

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
        const params: ListCustomersParams = {
          search: overrideSearchVal !== undefined ? overrideSearchVal : filterParams.searchQuery,
        };
        if (filterParams.showTrash) {
          params.trash = 'true';
        }
        if (randomSelectedIds && randomSelectedIds.length > 0) {
          params.ids = randomSelectedIds.join(',');
        } else if (filterParams.ids) {
          params.ids = filterParams.ids;
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
        if (filterParams.assignedDaysMin !== undefined)
          params.assignedDaysMin = filterParams.assignedDaysMin.toString();
        if (filterParams.assignedDaysMax !== undefined)
          params.assignedDaysMax = filterParams.assignedDaysMax.toString();
        if (filterParams.retainedOnly) {
          params.retainedOnly = filterParams.retainedOnly;
        }
        if (filterParams.allocationBatchId) {
          params.allocationBatchId = filterParams.allocationBatchId;
        }
        if (filterParams.dobMonth !== undefined) {
          params.dobMonth = filterParams.dobMonth.toString();
        }
        if (filterParams.birthdayPreset) {
          params.birthdayPreset = filterParams.birthdayPreset;
        }
        if (filterParams.ageMin !== undefined) {
          params.ageMin = filterParams.ageMin.toString();
        }
        if (filterParams.ageMax !== undefined) {
          params.ageMax = filterParams.ageMax.toString();
        }
        if (filterParams.callStatuses && filterParams.callStatuses.trim() !== '') {
          params.callStatuses = filterParams.callStatuses;
        }
        if (filterParams.lastCallDaysMin !== undefined)
          params.lastCallDaysMin = filterParams.lastCallDaysMin.toString();
        if (filterParams.lastCallDaysMax !== undefined)
          params.lastCallDaysMax = filterParams.lastCallDaysMax.toString();

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
        const params: ListCustomersParams = {
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
        } else if (filterParams.ids) {
          params.ids = filterParams.ids;
        }

        if (filterParams.activeTab !== 'ALL' && filterParams.activeTab !== 'ALLOCATION') {
          params.bucket = filterParams.activeTab;
        }
        if (filterParams.allocationBatchId) {
          params.allocationBatchId = filterParams.allocationBatchId;
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
        if (filterParams.assignedDaysMin !== undefined)
          params.assignedDaysMin = filterParams.assignedDaysMin.toString();
        if (filterParams.assignedDaysMax !== undefined)
          params.assignedDaysMax = filterParams.assignedDaysMax.toString();
        if (filterParams.retainedOnly) {
          params.retainedOnly = filterParams.retainedOnly;
        }
        if (filterParams.dobMonth !== undefined) {
          params.dobMonth = filterParams.dobMonth.toString();
        }
        if (filterParams.birthdayPreset) {
          params.birthdayPreset = filterParams.birthdayPreset;
        }
        if (filterParams.ageMin !== undefined) {
          params.ageMin = filterParams.ageMin.toString();
        }
        if (filterParams.ageMax !== undefined) {
          params.ageMax = filterParams.ageMax.toString();
        }
        if (filterParams.callStatuses && filterParams.callStatuses.trim() !== '') {
          params.callStatuses = filterParams.callStatuses;
        }
        if (filterParams.lastCallDaysMin !== undefined)
          params.lastCallDaysMin = filterParams.lastCallDaysMin.toString();
        if (filterParams.lastCallDaysMax !== undefined)
          params.lastCallDaysMax = filterParams.lastCallDaysMax.toString();

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

  // Fetch the page of rows when pagination or filters change.
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
  }, [currentPage, pageSize, filterParams, fetchCustomers]);

  // Badge totals depend on the active filters, never on the current page.
  // Keeping this separate prevents every pagination click from re-running the
  // full customer-stats aggregation.
  useEffect(() => {
    fetchStats();
  }, [filterParams, randomSelectedIds, fetchStats]);

  const sentinelRef = useCallback(() => {}, []);

  const refreshListAndStats = useCallback(async () => {
    await Promise.all([fetchCustomers(1, pageSize), fetchStats()]);
  }, [fetchCustomers, fetchStats, pageSize]);

  // Instantly refresh customer table when popup/modal updates data
  useEffect(() => {
    const handleDataChanged = () => {
      refreshListAndStats();
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
  }, [refreshListAndStats]);

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
