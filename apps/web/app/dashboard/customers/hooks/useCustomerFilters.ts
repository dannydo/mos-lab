import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { Staff } from '@mos-lab/shared';

export const useCustomerFilters = (
  currentUser: Staff | null,
  optionsRef: React.MutableRefObject<SafeAny>,
  onFiltersReset?: () => void
) => {
  const searchParams = useSearchParams();
  const scopeParam = searchParams?.get('assignedStaffId');

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_customers_active_tab');
      return stored || 'ALL';
    }
    return 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState('');
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

  const [assignedStaffId, setAssignedStaffId] = useState<string>(() => {
    return scopeParam || (currentUser?.role === 'telesales' ? 'me' : 'all');
  });
  const [assignedDaysMin, setAssignedDaysMin] = useState<number | undefined>(undefined);
  const [assignedDaysMax, setAssignedDaysMax] = useState<number | undefined>(undefined);

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
    (filterJsonStr: string) => {
      try {
        const criteria = JSON.parse(filterJsonStr);
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

        optionsRef.current?.onSuccess?.('Đã tải lại bộ lọc đợt phân bổ thành công!');
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

  const clearFilters = useCallback(() => {
    setActiveFilterId(null);
    setActiveTab('ALL');
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_customers_active_tab', 'ALL');
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
    setRetainedOnly(false);

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
      searchQuery,
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
    }),
    [
      activeTab,
      searchQuery,
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
    ]
  );

  return {
    filterParams,
    activeTab,
    setActiveTab,
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
    assignedDaysMax,
    setAssignedDaysMax,
    retainedOnly,
    setRetainedOnly,

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
    handleSaveFilter,
    handleDeleteFilter,
  };
};
export default useCustomerFilters;
