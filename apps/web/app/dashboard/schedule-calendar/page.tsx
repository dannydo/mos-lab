'use client';
// Force Turbopack recompile v2
export const dynamic = 'force-dynamic';

import React, { useEffect, useMemo } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { useMediaQuery, useResponsiveTier } from '../../../hooks/useResponsiveTier';
import ScheduleListView from './components/ScheduleListView';
import MultiDayColumnView from './components/MultiDayColumnView';
import FullCalendarGrid from './components/FullCalendarGrid';
import {
  computeBranchCounts,
  computeMaxCapacityPerDay,
  computeScheduleStatsSummary,
  filterScheduleAppointments,
} from './schedule-calendar-page-modules/scheduleCalendarHelpers';
import { useScheduleCalendarState } from './schedule-calendar-page-modules/useScheduleCalendarState';
import { useScheduleCalendarData } from './schedule-calendar-page-modules/useScheduleCalendarData';
import { useScheduleRescheduleAndDrawers } from './schedule-calendar-page-modules/useScheduleRescheduleAndDrawers';
import { ScheduleCalendarHeader } from './schedule-calendar-page-modules/ScheduleCalendarHeader';
import { ScheduleCalendarToolbar } from './schedule-calendar-page-modules/ScheduleCalendarToolbar';
import { ScheduleCalendarModals } from './schedule-calendar-page-modules/ScheduleCalendarModals';

export default function ScheduleCalendarPage() {
  const { themeMode } = useTheme();
  const responsiveTier = useResponsiveTier();
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const usesAgendaComposition = responsiveTier === 'mobile' || (responsiveTier === 'tablet' && isPortrait);

  const {
    viewMode,
    setViewMode,
    startDate,
    daysCount,
    dateRangePreset,
    customRange,
    computedDateRange,
    selectedBranch,
    setSelectedBranch,
    selectedStaffId,
    selectedStatus,
    selectedChannel,
    searchQuery,
    currentPage,
    pageSize,
    handlePresetChange,
    handlePrevRange,
    handleNextRange,
    handleCustomRangeChange,
    handleSearchChange,
    handleStaffChange,
    handleStatusChange,
    handleChannelChange,
    handlePageChange,
    handleGridSelectDate,
  } = useScheduleCalendarState(usesAgendaComposition);

  const { staffList, loading, appointments, dailyCapacities, fetchAppointments } = useScheduleCalendarData({
    computedDateRange,
    viewMode,
    currentPage,
    pageSize,
    selectedStaffId,
  });

  const {
    detailCustomerId,
    customerDrawerOpen,
    openCustomerDetail,
    closeCustomerDetail,
    bookingWizardOpen,
    bookingInitialCustomer,
    openNewBooking,
    closeBookingWizard,
    rescheduleModalOpen,
    selectedRescheduleAppt,
    closeRescheduleModal,
    preOffDayModalOpen,
    preOffDayAppt,
    preOffDayTargetDate,
    preOffDayNextWorkingDate,
    handleRescheduleRequest,
    cancelPreOffDayWarning,
    continuePreOffDayWarning,
  } = useScheduleRescheduleAndDrawers();

  const branchCounts = useMemo(() => computeBranchCounts(appointments), [appointments]);

  const maxCapacityPerDay = useMemo(() => computeMaxCapacityPerDay(selectedBranch), [selectedBranch]);

  const filteredAppointments = useMemo(
    () =>
      filterScheduleAppointments(appointments, {
        selectedBranch,
        selectedStatus,
        selectedChannel,
        searchQuery,
      }),
    [appointments, selectedBranch, selectedStatus, selectedChannel, searchQuery]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dbg = {
        appointments,
        selectedBranch,
        selectedStatus,
        selectedChannel,
        searchQuery,
        filteredAppointments,
      };
      (window as any).__DEBUG_STATE = dbg;
      (document as any).__DEBUG_STATE = dbg;
    }
  }, [appointments, selectedBranch, selectedStatus, selectedChannel, searchQuery, filteredAppointments]);

  const statsSummary = useMemo(() => computeScheduleStatsSummary(filteredAppointments), [filteredAppointments]);

  return (
    <div className="responsive-page responsive-workspace schedule-calendar-page w-full p-4 md:p-6 space-y-5">
      <ScheduleCalendarHeader
        usesAgendaComposition={usesAgendaComposition}
        selectedBranch={selectedBranch}
        onBranchChange={setSelectedBranch}
        branchCounts={branchCounts}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNewBooking={() => openNewBooking(null)}
      />

      <ScheduleCalendarToolbar
        loading={loading}
        customRange={customRange}
        computedDateRange={computedDateRange}
        dateRangePreset={dateRangePreset}
        onPrevRange={handlePrevRange}
        onNextRange={handleNextRange}
        onCustomRangeChange={handleCustomRangeChange}
        onPresetChange={handlePresetChange}
        onRefresh={fetchAppointments}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        selectedStaffId={selectedStaffId}
        onStaffChange={handleStaffChange}
        staffList={staffList}
        selectedStatus={selectedStatus}
        onStatusChange={handleStatusChange}
        selectedChannel={selectedChannel}
        onChannelChange={handleChannelChange}
        statsSummary={statsSummary}
      />

      {viewMode === 'overview' && (
        <MultiDayColumnView
          loading={loading}
          startDate={computedDateRange[0]}
          daysCount={daysCount}
          maxCapacityPerDay={maxCapacityPerDay}
          dailyCapacities={dailyCapacities}
          appointments={filteredAppointments}
          onSelectSlot={() => openNewBooking(null)}
          onViewCustomerDetail={openCustomerDetail}
          onReschedule={handleRescheduleRequest}
        />
      )}

      {viewMode === 'list' && (
        <ScheduleListView
          loading={loading}
          appointments={filteredAppointments}
          total={filteredAppointments.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onViewCustomerDetail={openCustomerDetail}
          onReschedule={(appt) => handleRescheduleRequest(appt)}
        />
      )}

      {viewMode === 'grid' && (
        <FullCalendarGrid
          loading={loading}
          referenceDate={startDate}
          appointments={filteredAppointments}
          onSelectDate={handleGridSelectDate}
          onViewCustomerDetail={openCustomerDetail}
        />
      )}

      <ScheduleCalendarModals
        themeMode={themeMode}
        preOffDayModalOpen={preOffDayModalOpen}
        preOffDayAppt={preOffDayAppt}
        preOffDayTargetDate={preOffDayTargetDate}
        preOffDayNextWorkingDate={preOffDayNextWorkingDate}
        onCancelPreOffDay={cancelPreOffDayWarning}
        onContinuePreOffDay={continuePreOffDayWarning}
        customerDrawerOpen={customerDrawerOpen}
        detailCustomerId={detailCustomerId}
        onCloseCustomerDrawer={closeCustomerDetail}
        bookingWizardOpen={bookingWizardOpen}
        bookingInitialCustomer={bookingInitialCustomer}
        onCloseBookingWizard={closeBookingWizard}
        rescheduleModalOpen={rescheduleModalOpen}
        selectedRescheduleAppt={selectedRescheduleAppt}
        onCloseRescheduleModal={closeRescheduleModal}
        onRefreshAppointments={fetchAppointments}
      />
    </div>
  );
}
