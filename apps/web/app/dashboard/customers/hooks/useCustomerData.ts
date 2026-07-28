'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import { Customer, Staff } from '@mos-lab/shared';

// Import sub-hooks
import { useCustomerFilters } from './useCustomerFilters';
import { useCustomerAssignment } from './useCustomerAssignment';
import { useAssignmentHistory } from './useAssignmentHistory';
import { useRandomSelector } from './useRandomSelector';
import { useCustomerList } from './useCustomerList';

export interface UseCustomerDataOptions {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
  onInfo?: (msg: string) => void;
  onWarning?: (msg: string) => void;
}

export function useCustomerData(options?: UseCustomerDataOptions) {
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const searchParams = useSearchParams();
  const scopeParam = searchParams?.get('assignedStaffId');

  const [currentUser, setCurrentUser] = useState<Staff | null>(null);

  // Load user from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    }
  }, [scopeParam]);

  // Modal detail state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [history, setHistory] = useState<SafeAny[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [bookingWizardVisible, setBookingWizardVisible] = useState(false);
  const [bookingInitialCustomer, setBookingInitialCustomer] = useState<SafeAny>(null);

  // Shared random selected IDs state
  const [activeRandomIds, setActiveRandomIds] = useState<number[] | null>(null);

  // Dynamic filters hook
  const filtersHook = useCustomerFilters(currentUser, optionsRef, () => {
    // Reset selections on clear filters
    assignmentHook.setSelectedRowKeys([]);
    randomSelectorHook.setRandomSelectedIds(null);
    setActiveRandomIds(null);
  });

  const { filterParams } = filtersHook;

  // Customer List hook
  const listHook = useCustomerList(filterParams, activeRandomIds, optionsRef);
  const { refreshListAndStats, setCustomers, total } = listHook;

  // Customer Assignment hook
  const assignmentHook = useCustomerAssignment(
    optionsRef,
    refreshListAndStats,
    () => {
      randomSelectorHook.setRandomSelectedIds(null);
      setActiveRandomIds(null);
    },
    filtersHook.getCurrentFilterCriteria,
    filtersHook.buildFilterSummary
  );

  // Random Selector hook
  const randomSelectorHook = useRandomSelector(filterParams, optionsRef, (selectedIds) => {
    setActiveRandomIds(selectedIds);
    assignmentHook.setSelectedRowKeys(selectedIds);
    assignmentHook.setLastSourceType('RANDOM');
    listHook.setCurrentPage(1);
  });

  // Assignment History hook
  const historyHook = useAssignmentHistory(optionsRef, refreshListAndStats);

  // Reset random selection when filterParams change (Option B)
  const lastFilterParamsRef = useRef(filterParams);
  useEffect(() => {
    if (lastFilterParamsRef.current !== filterParams) {
      lastFilterParamsRef.current = filterParams;
      setActiveRandomIds(null);
      randomSelectorHook.setRandomSelectedIds(null);
      assignmentHook.setSelectedRowKeys([]);
    }
  }, [filterParams, randomSelectorHook, assignmentHook]);

  // Staff list fetching for allocation modal
  const [staffList, setStaffList] = useState<SafeAny[]>([]);
  useEffect(() => {
    const loadStaff = async () => {
      if (currentUser?.role !== 'admin') {
        return;
      }
      try {
        const data = await apiClient.customers.getStaff();
        setStaffList(data);
      } catch (err) {
        console.error('Failed to load staff list:', err);
      }
    };
    if (currentUser) {
      loadStaff();
    }
  }, [currentUser]);

  const openDetailModal = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalVisible(true);
    setModalLoading(true);
    setHistory([]);

    try {
      const data = await apiClient.customers.getHistory(customer.id);
      setHistory(data);
    } catch (error) {
      console.error('Fetch history error:', error);
      optionsRef.current?.onError?.('Không thể tải lịch sử đơn hàng');
    } finally {
      setModalLoading(false);
    }
  };

  const defaultAssignedStaff = currentUser?.role === 'telesales' ? 'me' : 'all';
  const hasActiveFilters =
    filterParams.daysSinceLastVisitMin !== undefined ||
    filterParams.daysSinceLastVisitMax !== undefined ||
    filterParams.totalSpentMin !== undefined ||
    filterParams.totalSpentMax !== undefined ||
    filterParams.totalVisitsMin !== undefined ||
    filterParams.totalVisitsMax !== undefined ||
    filterParams.promoUsed !== 'all' ||
    filterParams.promoCountMin !== undefined ||
    filterParams.promoCountMax !== undefined ||
    filterParams.referralUsed !== 'all' ||
    filterParams.referralCountMin !== undefined ||
    filterParams.referralCountMax !== undefined ||
    (filterParams.assignedStaffId && filterParams.assignedStaffId !== defaultAssignedStaff) ||
    filterParams.retainedOnly === 'true' ||
    filtersHook.activeFilterId !== null;

  return {
    // State values
    customers: listHook.customers,
    loading: listHook.loading,
    total,
    currentPage: listHook.currentPage,
    pageSize: listHook.pageSize,
    bulkDeleteLoading: assignmentHook.bulkDeleteLoading,
    sentinelRef: listHook.sentinelRef,
    activeTab: filtersHook.activeTab,
    searchQuery: filtersHook.searchQuery,
    showTrash: filtersHook.showTrash,
    sortField: filtersHook.sortField,
    stats: listHook.stats,
    daysSinceLastVisitMin: filtersHook.daysSinceLastVisitMin,
    daysSinceLastVisitMax: filtersHook.daysSinceLastVisitMax,
    totalSpentMin: filtersHook.totalSpentMin,
    totalSpentMax: filtersHook.totalSpentMax,
    totalVisitsMin: filtersHook.totalVisitsMin,
    totalVisitsMax: filtersHook.totalVisitsMax,
    promoUsed: filtersHook.promoUsed,
    promoCountMin: filtersHook.promoCountMin,
    promoCountMax: filtersHook.promoCountMax,
    referralUsed: filtersHook.referralUsed,
    referralCountMin: filtersHook.referralCountMin,
    referralCountMax: filtersHook.referralCountMax,
    currentUser,
    assignedStaffId: filtersHook.assignedStaffId,
    retainedOnly: filtersHook.retainedOnly,
    staffList,
    selectedRowKeys: assignmentHook.selectedRowKeys,
    assignModalVisible: assignmentHook.assignModalVisible,
    targetStaffId: assignmentHook.targetStaffId,
    durationDays: assignmentHook.durationDays,
    setDurationDays: assignmentHook.setDurationDays,
    assigning: assignmentHook.assigning,
    unassigning: assignmentHook.unassigning,
    randomModalVisible: randomSelectorHook.randomModalVisible,
    randomCount: randomSelectorHook.randomCount,
    randomLoading: randomSelectorHook.randomLoading,
    randomSelectedIds: randomSelectorHook.randomSelectedIds,
    randomBatchId: randomSelectorHook.randomBatchId,
    excludeAssigned: randomSelectorHook.excludeAssigned,
    excludeFutureBooking: randomSelectorHook.excludeFutureBooking,
    filterDrawerVisible: filtersHook.filterDrawerVisible,
    saveFilterModalVisible: filtersHook.saveFilterModalVisible,
    newFilterName: filtersHook.newFilterName,
    savedFilters: filtersHook.savedFilters,
    activeFilterId: filtersHook.activeFilterId,
    selectedCustomer,
    history,
    modalVisible,
    modalLoading,
    bookingWizardVisible,
    bookingInitialCustomer,
    historyDrawerVisible: historyHook.historyDrawerVisible,
    historyLoading: historyHook.historyLoading,
    historyData: historyHook.historyData,
    historyTotal: historyHook.historyTotal,
    historyPage: historyHook.historyPage,
    expandedBatchId: historyHook.expandedBatchId,
    batchDetailsLoading: historyHook.batchDetailsLoading,
    batchDetails: historyHook.batchDetails,
    undoingBatchId: historyHook.undoingBatchId,
    revokingBatchId: historyHook.revokingBatchId,
    hasActiveFilters,

    // State setters
    setCustomers,
    setCurrentPage: listHook.setCurrentPage,
    setPageSize: listHook.setPageSize,
    setActiveTab: filtersHook.setActiveTab,
    setSearchQuery: filtersHook.setSearchQuery,
    setShowTrash: filtersHook.setShowTrash,
    setSortField: filtersHook.setSortField,
    setDaysSinceLastVisitMin: filtersHook.setDaysSinceLastVisitMin,
    setDaysSinceLastVisitMax: filtersHook.setDaysSinceLastVisitMax,
    setTotalSpentMin: filtersHook.setTotalSpentMin,
    setTotalSpentMax: filtersHook.setTotalSpentMax,
    setTotalVisitsMin: filtersHook.setTotalVisitsMin,
    setTotalVisitsMax: filtersHook.setTotalVisitsMax,
    setPromoUsed: filtersHook.setPromoUsed,
    setPromoCountMin: filtersHook.setPromoCountMin,
    setPromoCountMax: filtersHook.setPromoCountMax,
    setReferralUsed: filtersHook.setReferralUsed,
    setReferralCountMin: filtersHook.setReferralCountMin,
    setReferralCountMax: filtersHook.setReferralCountMax,
    setAssignedStaffId: filtersHook.setAssignedStaffId,
    setRetainedOnly: filtersHook.setRetainedOnly,
    setSelectedRowKeys: assignmentHook.setSelectedRowKeys,
    setAssignModalVisible: assignmentHook.setAssignModalVisible,
    setTargetStaffId: assignmentHook.setTargetStaffId,
    setRandomModalVisible: randomSelectorHook.setRandomModalVisible,
    setRandomCount: randomSelectorHook.setRandomCount,
    setRandomSelectedIds: randomSelectorHook.setRandomSelectedIds,
    setExcludeAssigned: randomSelectorHook.setExcludeAssigned,
    setExcludeFutureBooking: randomSelectorHook.setExcludeFutureBooking,
    setFilterDrawerVisible: filtersHook.setFilterDrawerVisible,
    setSaveFilterModalVisible: filtersHook.setSaveFilterModalVisible,
    setNewFilterName: filtersHook.setNewFilterName,
    setActiveFilterId: filtersHook.setActiveFilterId,
    setSelectedCustomer,
    setModalVisible,
    setBookingWizardVisible,
    setBookingInitialCustomer,
    setHistoryDrawerVisible: historyHook.setHistoryDrawerVisible,
    setHistoryPage: historyHook.setHistoryPage,
    setExpandedBatchId: historyHook.setExpandedBatchId,
    setBatchDetails: historyHook.setBatchDetails,

    // Operations
    fetchCustomers: listHook.fetchCustomers,
    fetchStats: listHook.fetchStats,
    refreshListAndStats: listHook.refreshListAndStats,
    fetchSavedFilters: filtersHook.fetchSavedFilters,
    handleSearch: filtersHook.handleSearch,
    applyFilter: filtersHook.applyFilter,
    applyFilterFromJson: filtersHook.applyFilterFromJson,
    getCurrentFilterCriteria: filtersHook.getCurrentFilterCriteria,
    buildFilterSummary: filtersHook.buildFilterSummary,
    clearFilters: filtersHook.clearFilters,
    handleSaveFilter: filtersHook.handleSaveFilter,
    handleDeleteFilter: filtersHook.handleDeleteFilter,
    handleAssignCustomers: assignmentHook.handleAssignCustomers,
    handleUnassignCustomers: assignmentHook.handleUnassignCustomers,
    handleBulkDeleteCustomers: assignmentHook.handleBulkDeleteCustomers,
    fetchAssignmentHistory: historyHook.fetchAssignmentHistory,
    fetchBatchDetails: historyHook.fetchBatchDetails,
    handleUndoAssignment: historyHook.handleUndoAssignment,
    handleOpenRevokeBatchModal: historyHook.handleOpenRevokeBatchModal,
    handleRandomSelect: randomSelectorHook.handleRandomSelect,
    openDetailModal,
  };
}
