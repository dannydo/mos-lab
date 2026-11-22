import { useState, useCallback, useEffect } from 'react';
import type React from 'react';
import { apiClient } from '../../../../../lib/api-client';
import { buildSavedFilterCriteria, getDefaultAssignedStaffId } from './filterHelpers';
import type { UseSavedCustomerFiltersParams } from './types';
import { persistActiveTab } from './urlSync';

/** Manages saved filter presets, drawer/modal UI visibility, and JSON/preset restoration. */
export const useSavedCustomerFilters = ({ currentUser, optionsRef, filterState }: UseSavedCustomerFiltersParams) => {
  const {
    activeTab,
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    totalSpentMin,
    totalSpentMax,
    totalVisitsMin,
    totalVisitsMax,
    serviceIds,
    serviceCategories,
    serviceVisitCountMin,
    serviceVisitCountMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    assignedStaffId,
    assignedDaysMin,
    assignedDaysMax,
    campaignId,
    campaignFilterMode,
    setActiveTab,
    setSearchQuery,
    setFilterCustomerIds,
    applyCommonCriteria,
    resetFilterFields,
  } = filterState;

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

  const applyFilter = useCallback(
    (filter: SafeAny) => {
      setActiveFilterId(filter.id);
      const criteria = filter.criteria || {};

      if (criteria.bucket) {
        setActiveTab(criteria.bucket);
      } else {
        setActiveTab('ALL');
      }

      applyCommonCriteria(criteria, getDefaultAssignedStaffId(currentUser?.role));
      optionsRef.current?.onSuccess?.(`Đã áp dụng bộ lọc "${filter.name}"`);
    },
    [applyCommonCriteria, currentUser, optionsRef, setActiveTab]
  );

  const applyFilterFromJson = useCallback(
    async (filterJsonStr: SafeAny, batchId?: string | number, onSelectCustomerIds?: (keys: React.Key[]) => void) => {
      try {
        const criteria = typeof filterJsonStr === 'string' ? JSON.parse(filterJsonStr) : filterJsonStr || {};
        if (criteria.activeTab || criteria.bucket) {
          const tab = criteria.activeTab || criteria.bucket;
          setActiveTab(tab);
          persistActiveTab(tab);
        }
        if (criteria.searchQuery !== undefined) setSearchQuery(criteria.searchQuery);
        applyCommonCriteria(criteria, 'all');

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
    [applyCommonCriteria, optionsRef, setActiveTab, setFilterCustomerIds, setSearchQuery]
  );

  const clearFilters = useCallback(() => {
    setActiveFilterId(null);
    resetFilterFields();
  }, [resetFilterFields]);

  const handleSaveFilter = useCallback(async () => {
    if (!newFilterName.trim()) {
      optionsRef.current?.onError?.('Vui lòng nhập tên bộ lọc');
      return;
    }

    const criteria = buildSavedFilterCriteria({
      activeTab,
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      serviceIds,
      serviceCategories,
      serviceVisitCountMin,
      serviceVisitCountMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId,
      assignedDaysMin,
      assignedDaysMax,
      campaignId,
      campaignFilterMode,
    });

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
    serviceIds,
    serviceCategories,
    serviceVisitCountMin,
    serviceVisitCountMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    assignedStaffId,
    assignedDaysMin,
    assignedDaysMax,
    campaignId,
    campaignFilterMode,
    fetchSavedFilters,
    optionsRef,
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
    [activeFilterId, clearFilters, fetchSavedFilters, optionsRef]
  );

  return {
    filterDrawerVisible,
    setFilterDrawerVisible,
    saveFilterModalVisible,
    setSaveFilterModalVisible,
    newFilterName,
    setNewFilterName,
    savedFilters,
    activeFilterId,
    setActiveFilterId,
    fetchSavedFilters,
    applyFilter,
    applyFilterFromJson,
    clearFilters,
    handleSaveFilter,
    handleDeleteFilter,
  };
};
