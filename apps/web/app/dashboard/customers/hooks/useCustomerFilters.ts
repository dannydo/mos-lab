import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { Staff } from '@mos-lab/shared';

import { useDebounce } from '../../../../hooks/useDebounce';

export const useCustomerFilters = (
  currentUser: Staff | null,
  optionsRef: React.MutableRefObject<SafeAny>,
  onFiltersReset?: () => void
) => {
  const searchParams = useSearchParams();
  const scopeParam = searchParams?.get('assignedStaffId');
  const tabParam = searchParams?.get('tab');
  const batchIdParam = searchParams?.get('batchId');

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (tabParam) return tabParam;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_customers_active_tab');
      return stored || 'ALL';
    }
    return 'ALL';
  });

  const [selectedBatchId, setSelectedBatchId] = useState<number | undefined>(() => {
    if (batchIdParam) {
      const parsed = parseInt(batchIdParam, 10);
      if (!isNaN(parsed)) return parsed;
    }
    return undefined;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [showTrash, setShowTrash] = useState(false);
  const [sortField, setSortField] = useState('id_desc');

  // Dynamic filters state
  const [daysSinceLastVisitMin, setDaysSinceLastVisitMin] = useState<number | undefined>(undefined);
  const [daysSinceLastVisitMax, setDaysSinceLastVisitMax] = useState<number | undefined>(undefined);
  const [totalSpentMin, setTotalSpentMin] = useState<number | undefined>(undefined);
  const [totalSpentMax, setTotalSpentMax] = useState<number | undefined>(undefined);
  const [totalVisitsMin, setTotalVisitsMin] = useState<number | undefined>(undefined);
  const [totalVisitsMax, setTotalVisitsMax] = useState<number | undefined>(undefined);

  const [promoUsed, setPromoUsed] = useState<'yes' | 'no' | 'all'>('all');
  const [promoCountMin, setPromoCountMin] = useState<number | undefined>(undefined);
  const [promoCountMax, setPromoCountMax] = useState<number | undefined>(undefined);
  const [referralUsed, setReferralUsed] = useState<'yes' | 'no' | 'all'>('all');
  const [referralCountMin, setReferralCountMin] = useState<number | undefined>(undefined);
  const [referralCountMax, setReferralCountMax] = useState<number | undefined>(undefined);

  const [retainedOnly, setRetainedOnly] = useState<boolean>(false);
  const [filterCustomerIds, setFilterCustomerIds] = useState<string | undefined>(undefined);

  const [assignedStaffId, setAssignedStaffId] = useState<string>(() => {
    return scopeParam || (currentUser?.role === 'telesales' ? 'me' : 'all');
  });
  const [assignedDaysMin, setAssignedDaysMin] = useState<number | undefined>(undefined);
  const [assignedDaysMax, setAssignedDaysMax] = useState<number | undefined>(undefined);

  // Birthday & Age filters state
  const [dobMonth, setDobMonth] = useState<number | string | undefined>(undefined);
  const [birthdayPreset, setBirthdayPreset] = useState<'today' | 'this_month' | 'next_month' | undefined>(undefined);
  const [ageMin, setAgeMin] = useState<number | undefined>(undefined);
  const [ageMax, setAgeMax] = useState<number | undefined>(undefined);

  // Call status & last call date filters state
  const [callStatuses, setCallStatuses] = useState<string[]>([]);
  const [lastCallDaysMin, setLastCallDaysMin] = useState<number | undefined>(undefined);
  const [lastCallDaysMax, setLastCallDaysMax] = useState<number | undefined>(undefined);

  const prevScopeRef = useRef<string | null>(scopeParam);
  const prevUserRoleRef = useRef<string | undefined>(currentUser?.role);

  // Keep assignedStaffId in sync with searchParams scopeParam & currentUser role changes
  useEffect(() => {
    const scopeChanged = prevScopeRef.current !== scopeParam;
    const roleChanged = prevUserRoleRef.current !== currentUser?.role;

    if (scopeChanged || roleChanged) {
      prevScopeRef.current = scopeParam;
      prevUserRoleRef.current = currentUser?.role;

      if (scopeParam) {
        setAssignedStaffId(scopeParam);
      } else if (currentUser?.role === 'telesales') {
        setAssignedStaffId('me');
      }
    }
  }, [currentUser?.role, scopeParam]);

  // Keep URL parameters synced with activeTab and selectedBatchId for F5 persistence
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    let changed = false;

    if (activeTab && activeTab !== 'ALL') {
      if (params.get('tab') !== activeTab) {
        params.set('tab', activeTab);
        changed = true;
      }
    } else if (params.has('tab')) {
      params.delete('tab');
      changed = true;
    }

    if (selectedBatchId && activeTab === 'ALLOCATION') {
      if (params.get('batchId') !== String(selectedBatchId)) {
        params.set('batchId', String(selectedBatchId));
        changed = true;
      }
    } else if (params.has('batchId')) {
      params.delete('batchId');
      changed = true;
    }

    if (changed) {
      const queryStr = params.toString();
      const newUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
  }, [activeTab, selectedBatchId]);

  // Saved Filters preset state
  const [savedFilters, setSavedFilters] = useState<SafeAny[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [saveFilterModalVisible, setSaveFilterModalVisible] = useState(false);
  const [newFilterName, setNewFilterName] = useState('');

  const fetchSavedFilters = useCallback(async () => {
    try {
      const data = await apiClient.savedFilters.list();
      setSavedFilters(data);
    } catch (error) {
      console.error('Fetch saved filters error:', error);
    }
  }, []);

  // Load saved filters on mount / when currentUser changes
  useEffect(() => {
    if (currentUser) {
      fetchSavedFilters();
    }
  }, [currentUser, fetchSavedFilters]);

  const handleSearch = useCallback((val: string) => {
    setSearchQuery(val);
  }, []);

  const applyFilter = useCallback(
    (filter: SafeAny) => {
      setActiveFilterId(filter.id);
      const criteria = filter.criteria || {};

      if (criteria.bucket) {
        setActiveTab(criteria.bucket);
      } else {
        setActiveTab('ALL');
      }

      setDaysSinceLastVisitMin(criteria.daysSinceLastVisitMin);
      setDaysSinceLastVisitMax(criteria.daysSinceLastVisitMax);
      setTotalSpentMin(criteria.totalSpentMin);
      setTotalSpentMax(criteria.totalSpentMax);
      setTotalVisitsMin(criteria.totalVisitsMin);
      setTotalVisitsMax(criteria.totalVisitsMax);
      setPromoUsed(criteria.promoUsed || 'all');
      setPromoCountMin(criteria.promoCountMin);
      setPromoCountMax(criteria.promoCountMax);
      setReferralUsed(criteria.referralUsed || 'all');
      setReferralCountMin(criteria.referralCountMin);
      setReferralCountMax(criteria.referralCountMax);
      setAssignedStaffId(criteria.assignedStaffId || (currentUser?.role === 'telesales' ? 'me' : 'all'));
      setAssignedDaysMin(criteria.assignedDaysMin);
      setAssignedDaysMax(criteria.assignedDaysMax);

      optionsRef.current?.onSuccess?.(`Đã áp dụng bộ lọc "${filter.name}"`);
    },
    [currentUser]
  );

  const applyFilterFromJson = useCallback(
    async (filterJsonStr: SafeAny, batchId?: string | number, onSelectCustomerIds?: (keys: React.Key[]) => void) => {
      try {
        const criteria = typeof filterJsonStr === 'string' ? JSON.parse(filterJsonStr) : filterJsonStr || {};
        if (criteria.activeTab || criteria.bucket) {
          const tab = criteria.activeTab || criteria.bucket;
          setActiveTab(tab);
          if (typeof window !== 'undefined') {
            localStorage.setItem('mos_customers_active_tab', tab);
          }
        }
        if (criteria.searchQuery !== undefined) setSearchQuery(criteria.searchQuery);
        setDaysSinceLastVisitMin(criteria.daysSinceLastVisitMin);
        setDaysSinceLastVisitMax(criteria.daysSinceLastVisitMax);
        setTotalSpentMin(criteria.totalSpentMin);
        setTotalSpentMax(criteria.totalSpentMax);
        setTotalVisitsMin(criteria.totalVisitsMin);
        setTotalVisitsMax(criteria.totalVisitsMax);
        setPromoUsed(criteria.promoUsed || 'all');
        setPromoCountMin(criteria.promoCountMin);
        setPromoCountMax(criteria.promoCountMax);
        setReferralUsed(criteria.referralUsed || 'all');
        setReferralCountMin(criteria.referralCountMin);
        setReferralCountMax(criteria.referralCountMax);
        setAssignedStaffId(criteria.assignedStaffId || 'all');
        setAssignedDaysMin(criteria.assignedDaysMin);
        setAssignedDaysMax(criteria.assignedDaysMax);

        let countText = '';
        if (batchId && onSelectCustomerIds) {
          try {
            const strId = String(batchId);
            const res = await apiClient.customers.getAssignmentHistoryDetails(strId);
            if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
              const ids = res.data
                .map((item: SafeAny) => Number(item.legacyUserId || item.customerId))
                .filter((id: number) => !isNaN(id) && id > 0);
              if (ids.length > 0) {
                setFilterCustomerIds(ids.join(','));
                onSelectCustomerIds(ids);
                setTimeout(() => {
                  onSelectCustomerIds(ids);
                }, 300);
                countText = ` & chọn ${ids.length} khách hàng`;
              } else {
                setFilterCustomerIds(undefined);
              }
            } else {
              setFilterCustomerIds(undefined);
            }
          } catch (err) {
            console.error('Failed to fetch batch customer details for selection:', err);
            setFilterCustomerIds(undefined);
          }
        } else {
          setFilterCustomerIds(undefined);
        }

        optionsRef.current?.onSuccess?.(`Đã tải lại bộ lọc đợt phân bổ${countText} thành công!`);
      } catch (e) {
        console.error('Failed to parse filter JSON:', e);
        optionsRef.current?.onError?.('Không thể tải bộ lọc từ đợt phân bổ');
      }
    },
    [optionsRef]
  );

  const getCurrentFilterCriteria = useCallback(() => {
    return {
      activeTab,
      searchQuery,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId,
      assignedDaysMin,
      assignedDaysMax,
    };
  }, [
    activeTab,
    searchQuery,
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    totalSpentMin,
    totalSpentMax,
    totalVisitsMin,
    totalVisitsMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    assignedStaffId,
    assignedDaysMin,
    assignedDaysMax,
  ]);

  const buildFilterSummary = useCallback(
    (sourceType: 'MANUAL' | 'RANDOM', count: number) => {
      const parts: string[] = [];
      if (sourceType === 'RANDOM') {
        parts.push(`🎲 Ngẫu nhiên ${count} KH`);
      } else {
        parts.push(`Chọn thủ công ${count} KH`);
      }

      if (activeTab && activeTab !== 'ALL') {
        parts.push(`Nhóm: ${activeTab}`);
      }
      if (daysSinceLastVisitMax !== undefined) {
        if (daysSinceLastVisitMin !== undefined) {
          parts.push(`Chưa tới: ${daysSinceLastVisitMin}-${daysSinceLastVisitMax} ngày`);
        } else {
          parts.push(`Chưa tới: <= ${daysSinceLastVisitMax} ngày`);
        }
      } else if (daysSinceLastVisitMin !== undefined) {
        parts.push(`Chưa tới: >= ${daysSinceLastVisitMin} ngày`);
      }

      if (assignedStaffId === 'unassigned') {
        parts.push(`Chưa phân bổ`);
      } else if (assignedStaffId !== 'all') {
        parts.push(`Đã phân bổ`);
      }

      if (assignedDaysMax !== undefined) {
        if (assignedDaysMin !== undefined) {
          parts.push(`Phân bổ: ${assignedDaysMin}-${assignedDaysMax} ngày`);
        } else {
          parts.push(`Phân bổ: <= ${assignedDaysMax} ngày`);
        }
      } else if (assignedDaysMin !== undefined) {
        parts.push(`Phân bổ: >= ${assignedDaysMin} ngày`);
      }

      if (retainedOnly) {
        parts.push('📌 Chỉ Data đã giữ');
      }

      if (totalSpentMin !== undefined || totalSpentMax !== undefined) {
        parts.push(`Chi tiêu`);
      }

      return parts.join(' | ');
    },
    [
      activeTab,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      assignedStaffId,
      assignedDaysMin,
      assignedDaysMax,
      totalSpentMin,
      totalSpentMax,
      retainedOnly,
    ]
  );

  const exitBatchMode = useCallback(() => {
    setSelectedBatchId(undefined);
    setActiveTab('ALL');
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_customers_active_tab', 'ALL');
      const params = new URLSearchParams(window.location.search);
      params.delete('batchId');
      params.delete('tab');
      const queryStr = params.toString();
      const newUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilterId(null);
    setActiveTab('ALL');
    setSelectedBatchId(undefined);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_customers_active_tab', 'ALL');
      const params = new URLSearchParams(window.location.search);
      params.delete('batchId');
      params.delete('tab');
      const queryStr = params.toString();
      const newUrl = queryStr ? `${window.location.pathname}?${queryStr}` : window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    }
    setDaysSinceLastVisitMin(undefined);
    setDaysSinceLastVisitMax(undefined);
    setTotalSpentMin(undefined);
    setTotalSpentMax(undefined);
    setTotalVisitsMin(undefined);
    setTotalVisitsMax(undefined);
    setPromoUsed('all');
    setPromoCountMin(undefined);
    setPromoCountMax(undefined);
    setReferralUsed('all');
    setReferralCountMin(undefined);
    setReferralCountMax(undefined);
    setAssignedStaffId(currentUser?.role === 'telesales' ? 'me' : 'all');
    setAssignedDaysMin(undefined);
    setAssignedDaysMax(undefined);
    setDobMonth(undefined);
    setBirthdayPreset(undefined);
    setAgeMin(undefined);
    setAgeMax(undefined);
    setCallStatuses([]);
    setLastCallDaysMin(undefined);
    setLastCallDaysMax(undefined);
    setRetainedOnly(false);
    setFilterCustomerIds(undefined);

    if (onFiltersReset) {
      onFiltersReset();
    }
    optionsRef.current?.onInfo?.('Đã xóa tất cả bộ lọc');
  }, [currentUser, onFiltersReset]);

  const handleSaveFilter = useCallback(async () => {
    if (!newFilterName.trim()) {
      optionsRef.current?.onError?.('Vui lòng nhập tên bộ lọc');
      return;
    }

    const criteria = {
      bucket: activeTab,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId,
      assignedDaysMin,
      assignedDaysMax,
    };

    try {
      const data: SafeAny = await apiClient.savedFilters.create({
        name: newFilterName.trim(),
        criteria,
      });
      optionsRef.current?.onSuccess?.('Đã lưu bộ lọc thành công');
      setSaveFilterModalVisible(false);
      setNewFilterName('');
      fetchSavedFilters();
      setActiveFilterId(data.id);
    } catch (error) {
      console.error('Save filter error:', error);
      optionsRef.current?.onError?.('Không thể lưu bộ lọc');
    }
  }, [
    newFilterName,
    activeTab,
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    totalSpentMin,
    totalSpentMax,
    totalVisitsMin,
    totalVisitsMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    assignedStaffId,
    assignedDaysMin,
    assignedDaysMax,
    fetchSavedFilters,
  ]);

  const handleDeleteFilter = useCallback(
    async (id: string, name: string) => {
      try {
        await apiClient.savedFilters.delete(id);
        optionsRef.current?.onSuccess?.(`Đã xóa bộ lọc "${name}"`);
        fetchSavedFilters();
        if (activeFilterId === id) {
          clearFilters();
        }
      } catch (error) {
        console.error('Delete filter error:', error);
        optionsRef.current?.onError?.('Không thể xóa bộ lọc');
      }
    },
    [activeFilterId, clearFilters, fetchSavedFilters]
  );

  // Compute structured filters object for easy mapping to API params
  const filterParams = useMemo(
    () => ({
      activeTab,
      searchQuery: debouncedSearchQuery,
      showTrash,
      sortField,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId,
      assignedDaysMin,
      assignedDaysMax,
      retainedOnly: retainedOnly ? 'true' : undefined,
      allocationBatchId: activeTab === 'ALLOCATION' ? selectedBatchId : undefined,
      ids: filterCustomerIds,
      dobMonth,
      birthdayPreset,
      ageMin,
      ageMax,
      callStatuses: callStatuses.length > 0 ? callStatuses.join(',') : undefined,
      lastCallDaysMin,
      lastCallDaysMax,
    }),
    [
      activeTab,
      debouncedSearchQuery,
      showTrash,
      sortField,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId,
      assignedDaysMin,
      assignedDaysMax,
      retainedOnly,
      selectedBatchId,
      filterCustomerIds,
      dobMonth,
      birthdayPreset,
      ageMin,
      ageMax,
      callStatuses,
      lastCallDaysMin,
      lastCallDaysMax,
    ]
  );

  return {
    filterParams,
    activeTab,
    setActiveTab,
    selectedBatchId,
    setSelectedBatchId,
    searchQuery,
    setSearchQuery,
    showTrash,
    setShowTrash,
    sortField,
    setSortField,
    daysSinceLastVisitMin,
    setDaysSinceLastVisitMin,
    daysSinceLastVisitMax,
    setDaysSinceLastVisitMax,
    totalSpentMin,
    setTotalSpentMin,
    totalSpentMax,
    setTotalSpentMax,
    totalVisitsMin,
    setTotalVisitsMin,
    totalVisitsMax,
    setTotalVisitsMax,
    promoUsed,
    setPromoUsed,
    promoCountMin,
    setPromoCountMin,
    promoCountMax,
    setPromoCountMax,
    referralUsed,
    setReferralUsed,
    referralCountMin,
    setReferralCountMin,
    referralCountMax,
    setReferralCountMax,
    assignedStaffId,
    setAssignedStaffId,
    assignedDaysMin,
    setAssignedDaysMin,
    callStatuses,
    setCallStatuses,
    lastCallDaysMin,
    setLastCallDaysMin,
    lastCallDaysMax,
    setLastCallDaysMax,
    assignedDaysMax,
    setAssignedDaysMax,
    retainedOnly,
    setRetainedOnly,
    filterCustomerIds,
    setFilterCustomerIds,

    // Birthday & Age filters
    dobMonth,
    setDobMonth,
    birthdayPreset,
    setBirthdayPreset,
    ageMin,
    setAgeMin,
    ageMax,
    setAgeMax,

    // UI Drawer state
    filterDrawerVisible,
    setFilterDrawerVisible,
    saveFilterModalVisible,
    setSaveFilterModalVisible,
    newFilterName,
    setNewFilterName,
    savedFilters,
    activeFilterId,
    setActiveFilterId,

    // API Actions
    fetchSavedFilters,
    handleSearch,
    applyFilter,
    applyFilterFromJson,
    getCurrentFilterCriteria,
    buildFilterSummary,
    clearFilters,
    exitBatchMode,
    handleSaveFilter,
    handleDeleteFilter,
  };
};
export default useCustomerFilters;
