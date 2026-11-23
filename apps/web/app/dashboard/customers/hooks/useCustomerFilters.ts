import type { Staff } from '@mos-lab/shared';
import type { CustomerFilterOptionsRef } from './use-customer-filters/types';
import { useCustomerFilterState } from './use-customer-filters/useCustomerFilterState';
import { useSavedCustomerFilters } from './use-customer-filters/useSavedCustomerFilters';

export type {
  CustomerBirthdayPreset,
  CustomerCampaignFilterMode,
  CustomerFilterCriteria,
  CustomerFilterOptionsRef,
  CustomerFilterParams,
  CustomerFilterParamsInput,
  CustomerFilterStateCore,
  CustomerFilterSummaryInput,
  CustomerFilterSummarySourceType,
  CustomerFilterTriState,
  CustomerForeignFilter,
  CustomerSavedFilterCriteria,
  UseSavedCustomerFiltersParams,
} from './use-customer-filters/types';

export const useCustomerFilters = (
  currentUser: Staff | null,
  optionsRef: CustomerFilterOptionsRef,
  onFiltersReset?: () => void
) => {
  const filterState = useCustomerFilterState(currentUser, optionsRef, onFiltersReset);
  const savedFiltersState = useSavedCustomerFilters({
    currentUser,
    optionsRef,
    filterState,
  });

  return {
    filterParams: filterState.filterParams,
    activeTab: filterState.activeTab,
    setActiveTab: filterState.setActiveTab,
    selectedBatchId: filterState.selectedBatchId,
    setSelectedBatchId: filterState.setSelectedBatchId,
    searchQuery: filterState.searchQuery,
    setSearchQuery: filterState.setSearchQuery,
    showTrash: filterState.showTrash,
    setShowTrash: filterState.setShowTrash,
    sortField: filterState.sortField,
    setSortField: filterState.setSortField,
    daysSinceLastVisitMin: filterState.daysSinceLastVisitMin,
    setDaysSinceLastVisitMin: filterState.setDaysSinceLastVisitMin,
    daysSinceLastVisitMax: filterState.daysSinceLastVisitMax,
    setDaysSinceLastVisitMax: filterState.setDaysSinceLastVisitMax,
    totalSpentMin: filterState.totalSpentMin,
    setTotalSpentMin: filterState.setTotalSpentMin,
    totalSpentMax: filterState.totalSpentMax,
    setTotalSpentMax: filterState.setTotalSpentMax,
    totalVisitsMin: filterState.totalVisitsMin,
    setTotalVisitsMin: filterState.setTotalVisitsMin,
    totalVisitsMax: filterState.totalVisitsMax,
    setTotalVisitsMax: filterState.setTotalVisitsMax,
    serviceIds: filterState.serviceIds,
    setServiceIds: filterState.setServiceIds,
    serviceCategories: filterState.serviceCategories,
    setServiceCategories: filterState.setServiceCategories,
    serviceVisitCountMin: filterState.serviceVisitCountMin,
    setServiceVisitCountMin: filterState.setServiceVisitCountMin,
    serviceVisitCountMax: filterState.serviceVisitCountMax,
    setServiceVisitCountMax: filterState.setServiceVisitCountMax,
    promoUsed: filterState.promoUsed,
    setPromoUsed: filterState.setPromoUsed,
    promoCountMin: filterState.promoCountMin,
    setPromoCountMin: filterState.setPromoCountMin,
    promoCountMax: filterState.promoCountMax,
    setPromoCountMax: filterState.setPromoCountMax,
    referralUsed: filterState.referralUsed,
    setReferralUsed: filterState.setReferralUsed,
    referralCountMin: filterState.referralCountMin,
    setReferralCountMin: filterState.setReferralCountMin,
    referralCountMax: filterState.referralCountMax,
    setReferralCountMax: filterState.setReferralCountMax,
    assignedStaffId: filterState.assignedStaffId,
    setAssignedStaffId: filterState.setAssignedStaffId,
    assignedDaysMin: filterState.assignedDaysMin,
    setAssignedDaysMin: filterState.setAssignedDaysMin,
    callStatuses: filterState.callStatuses,
    setCallStatuses: filterState.setCallStatuses,
    lastCallDaysMin: filterState.lastCallDaysMin,
    setLastCallDaysMin: filterState.setLastCallDaysMin,
    lastCallDaysMax: filterState.lastCallDaysMax,
    setLastCallDaysMax: filterState.setLastCallDaysMax,
    assignedDaysMax: filterState.assignedDaysMax,
    setAssignedDaysMax: filterState.setAssignedDaysMax,
    retainedOnly: filterState.retainedOnly,
    setRetainedOnly: filterState.setRetainedOnly,
    filterCustomerIds: filterState.filterCustomerIds,
    setFilterCustomerIds: filterState.setFilterCustomerIds,

    // Birthday & Age filters
    dobMonth: filterState.dobMonth,
    setDobMonth: filterState.setDobMonth,
    birthdayPreset: filterState.birthdayPreset,
    setBirthdayPreset: filterState.setBirthdayPreset,
    ageMin: filterState.ageMin,
    setAgeMin: filterState.setAgeMin,
    ageMax: filterState.ageMax,
    setAgeMax: filterState.setAgeMax,

    // Foreign Filter State
    isForeignFilter: filterState.isForeignFilter,
    setIsForeignFilter: filterState.setIsForeignFilter,

    // Campaign Filter State
    campaignId: filterState.campaignId,
    setCampaignId: filterState.setCampaignId,
    campaignFilterMode: filterState.campaignFilterMode,
    setCampaignFilterMode: filterState.setCampaignFilterMode,

    // UI Drawer state
    filterDrawerVisible: savedFiltersState.filterDrawerVisible,
    setFilterDrawerVisible: savedFiltersState.setFilterDrawerVisible,
    saveFilterModalVisible: savedFiltersState.saveFilterModalVisible,
    setSaveFilterModalVisible: savedFiltersState.setSaveFilterModalVisible,
    newFilterName: savedFiltersState.newFilterName,
    setNewFilterName: savedFiltersState.setNewFilterName,
    savedFilters: savedFiltersState.savedFilters,
    activeFilterId: savedFiltersState.activeFilterId,
    setActiveFilterId: savedFiltersState.setActiveFilterId,

    // API Actions
    fetchSavedFilters: savedFiltersState.fetchSavedFilters,
    handleSearch: filterState.handleSearch,
    applyFilter: savedFiltersState.applyFilter,
    applyFilterFromJson: savedFiltersState.applyFilterFromJson,
    getCurrentFilterCriteria: filterState.getCurrentFilterCriteria,
    buildFilterSummary: filterState.buildFilterSummary,
    clearFilters: savedFiltersState.clearFilters,
    exitBatchMode: filterState.exitBatchMode,
    handleSaveFilter: savedFiltersState.handleSaveFilter,
    handleDeleteFilter: savedFiltersState.handleDeleteFilter,
  };
};

export default useCustomerFilters;
