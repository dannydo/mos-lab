'use client';

import React from 'react';
import { canManageCustomerAllocation } from '@mos-lab/shared';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import SaveFilterModal from './filters/SaveFilterModal';
import { CustomerFilterDrawer } from './customer-filters/CustomerFilterDrawer';
import { CustomerFilterToolbar } from './customer-filters/CustomerFilterToolbar';
import {
  buildCustomerFilterParams,
  clearSingleCustomerFilter,
  countActiveCustomerFilters,
} from './customer-filters/filterHelpers';
import type { CustomerFiltersProps } from './customer-filters/types';
import { useFilterDrawerResize } from './customer-filters/useFilterDrawerResize';

export type { CustomerFiltersProps } from './customer-filters/types';

const CustomerFilters = React.memo(function CustomerFilters(props: CustomerFiltersProps) {
  const {
    currentUser,
    hasActiveFilters,
    clearFilters,
    applyFilter,
    savedFilters,
    handleDeleteFilter,
    setFilterDrawerVisible,
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
    serviceFilterOptions,
    serviceFilterCategories,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    callStatuses = [],
    lastCallDaysMin,
    lastCallDaysMax,
    assignedStaffId,
    assignedDaysMin,
    assignedDaysMax,
    retainedOnly,
    dobMonth,
    birthdayPreset,
    ageMin,
    ageMax,
    isForeignFilter = 'all',
    campaignId,
    campaignFilterMode = 'ALL',
    campaignList = [],
    staffList,
    saveFilterModalVisible,
    setSaveFilterModalVisible,
    newFilterName,
    setNewFilterName,
    handleSaveFilter,
    PRESET_FILTERS,
    onOpenRandomModal,
  } = props;

  const responsiveTier = useResponsiveTier();
  const isCompactTier = responsiveTier === 'mobile' || responsiveTier === 'tablet';
  const isManagerOrAdmin = canManageCustomerAllocation(currentUser?.role);

  const { drawerWidth, isResizing, handleMouseDown } = useFilterDrawerResize();

  const filterParams = buildCustomerFilterParams({
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
    callStatuses,
    lastCallDaysMin,
    lastCallDaysMax,
    assignedStaffId,
    assignedDaysMin,
    assignedDaysMax,
    retainedOnly,
    dobMonth,
    birthdayPreset,
    ageMin,
    ageMax,
    isForeignFilter,
    campaignId,
    campaignFilterMode,
  });

  const onClearFilter = (key: string) => {
    clearSingleCustomerFilter(key, props);
  };

  const activeFilterCount = React.useMemo(
    () =>
      countActiveCustomerFilters({
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
        callStatuses,
        lastCallDaysMin,
        lastCallDaysMax,
        assignedStaffId,
        userRole: currentUser?.role,
        assignedDaysMin,
        assignedDaysMax,
        retainedOnly,
        dobMonth,
        birthdayPreset,
        ageMin,
        ageMax,
        isForeignFilter,
        campaignId,
      }),
    [
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
      callStatuses,
      lastCallDaysMin,
      lastCallDaysMax,
      assignedStaffId,
      currentUser?.role,
      assignedDaysMin,
      assignedDaysMax,
      retainedOnly,
      dobMonth,
      birthdayPreset,
      ageMin,
      ageMax,
      isForeignFilter,
      campaignId,
    ]
  );

  return (
    <>
      <CustomerFilterToolbar
        savedFilters={savedFilters}
        presetFilters={PRESET_FILTERS}
        handleDeleteFilter={handleDeleteFilter}
        applyFilter={applyFilter}
        hasActiveFilters={hasActiveFilters}
        setFilterDrawerVisible={setFilterDrawerVisible}
        onOpenRandomModal={onOpenRandomModal}
        isManagerOrAdmin={isManagerOrAdmin}
        clearFilters={clearFilters}
        setSaveFilterModalVisible={setSaveFilterModalVisible}
        filterParams={filterParams}
        onClearFilter={onClearFilter}
        staffList={staffList}
        serviceFilterOptions={serviceFilterOptions}
        serviceFilterCategories={serviceFilterCategories}
        campaignList={campaignList}
      />

      <CustomerFilterDrawer
        {...props}
        callStatuses={callStatuses}
        campaignFilterMode={campaignFilterMode}
        campaignList={campaignList}
        isCompactTier={isCompactTier}
        isManagerOrAdmin={isManagerOrAdmin}
        drawerWidth={drawerWidth}
        isResizing={isResizing}
        onResizeMouseDown={handleMouseDown}
        activeFilterCount={activeFilterCount}
      />

      <SaveFilterModal
        visible={saveFilterModalVisible}
        onOk={handleSaveFilter}
        onCancel={() => setSaveFilterModalVisible(false)}
        newFilterName={newFilterName}
        setNewFilterName={setNewFilterName}
      />
    </>
  );
});

export default CustomerFilters;
