'use client';

import '../../suppress-warnings';
import React from 'react';
import { message, theme } from 'antd';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import CalendarPlusIcon from '~/components/icons/CalendarPlusIcon';
import { PageHeader, PagePrimaryIconAction } from '~/components/ui';
import { useOmiCall } from '~/context/OmiCallContext';
import { useTheme } from '~/context/ThemeContext';
import { AppointmentsOverlays } from './appointments-page-modules/AppointmentsOverlays';
import { AppointmentsTabBar } from './appointments-page-modules/AppointmentsTabBar';
import { AppointmentsTablePanel } from './appointments-page-modules/AppointmentsTablePanel';
import { AppointmentsToolbar } from './appointments-page-modules/AppointmentsToolbar';
import { useAppointmentsColumns } from './appointments-page-modules/useAppointmentsColumns';
import { useAppointmentsMissedSummary } from './appointments-page-modules/useAppointmentsMissedSummary';
import { useAppointmentsData } from './hooks/useAppointmentsData';

dayjs.extend(isoWeek);

export default function AppointmentsPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const { makeCall } = useOmiCall();

  const hookOptions = React.useMemo(
    () => ({
      onSuccess: (msg: string) => message.success(msg),
      onError: (msg: string) => message.error(msg),
    }),
    []
  );

  const {
    currentUser,
    columnConfig,
    saveColumnConfig,
    viewMode,
    setViewMode,
    setCustomRange,
    dateRange,
    pickerOpen,
    setPickerOpen,
    activeTab,
    setActiveTab,
    missedStatusFilter,
    setMissedStatusFilter,
    selectedStaffId,
    setSelectedStaffId,
    staffList,
    appointments,
    loading,
    currentPage,
    pageSize,
    total,
    summary,
    selectedCustomer,
    detailModalVisible,
    setDetailModalVisible,
    bookingWizardVisible,
    setBookingWizardVisible,
    bookingInitialCustomer,
    setBookingInitialCustomer,
    rescheduleModalVisible,
    setRescheduleModalVisible,
    selectedBookingForReschedule,
    setSelectedBookingForReschedule,
    fetchAppointments,
    handlePageChange,
    handleCancelBooking,
    handleNavigate,
    getPeriodLabel,
    openDetailModal,
  } = useAppointmentsData(hookOptions);

  const dateFromStr = dateRange?.[0]?.format('YYYY-MM-DD') || '';
  const dateToStr = dateRange?.[1]?.format('YYYY-MM-DD') || '';

  const {
    missedReasonModalVisible,
    selectedMissedAppointment,
    missedSummary,
    missedSummaryLoading,
    fetchMissedSummary,
    openMissedReasonModal,
    closeMissedReasonModal,
  } = useAppointmentsMissedSummary({
    activeTab,
    dateFromStr,
    dateToStr,
  });

  const { columns, totalWidth } = useAppointmentsColumns({
    activeTab,
    themeMode,
    token,
    columnConfig,
    saveColumnConfig,
    openDetailModal,
    makeCall,
    setSelectedBookingForReschedule,
    setRescheduleModalVisible,
    handleCancelBooking,
    setBookingInitialCustomer,
    setBookingWizardVisible,
    onOpenMissedReasonModal: openMissedReasonModal,
  });

  return (
    <div className="responsive-page responsive-workspace appointments-page">
      <PageHeader
        title="Quản Lý Lịch Hẹn Của Tôi"
        subtitle="Theo dõi và quản lý lịch hẹn của khách hàng đã được phân bổ cho bạn"
        extra={
          <PagePrimaryIconAction
            title="Đặt lịch mới"
            icon={<CalendarPlusIcon fontSize={18} />}
            onClick={() => setBookingWizardVisible(true)}
          />
        }
      />

      <AppointmentsToolbar
        isAdmin={currentUser?.role === 'admin'}
        selectedStaffId={selectedStaffId}
        onStaffChange={setSelectedStaffId}
        staffList={staffList}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onClearCustomRange={() => setCustomRange(null)}
        onNavigate={handleNavigate}
        periodLabel={getPeriodLabel()}
        pickerOpen={pickerOpen}
        onPickerOpenChange={setPickerOpen}
        dateRange={dateRange}
        onCustomRangeChange={setCustomRange}
        activeTab={activeTab}
        columnConfig={columnConfig}
        onSaveColumnConfig={saveColumnConfig}
      />

      <AppointmentsTabBar activeTab={activeTab} total={total} summary={summary} onTabChange={setActiveTab} />

      <AppointmentsTablePanel
        activeTab={activeTab}
        missedSummary={missedSummary}
        missedSummaryLoading={missedSummaryLoading}
        missedStatusFilter={missedStatusFilter}
        onMissedStatusFilterChange={setMissedStatusFilter}
        summary={summary}
        appointments={appointments}
        columns={columns}
        loading={loading}
        currentPage={currentPage}
        pageSize={pageSize}
        total={total}
        totalWidth={totalWidth}
        onPageChange={handlePageChange}
      />

      <AppointmentsOverlays
        detailModalVisible={detailModalVisible}
        selectedCustomerId={selectedCustomer?.id || null}
        onCloseDetailModal={() => setDetailModalVisible(false)}
        bookingWizardVisible={bookingWizardVisible}
        bookingInitialCustomer={bookingInitialCustomer}
        onCloseBookingWizard={() => {
          setBookingWizardVisible(false);
          setBookingInitialCustomer(null);
        }}
        rescheduleModalVisible={rescheduleModalVisible}
        selectedBookingForReschedule={selectedBookingForReschedule}
        onCloseRescheduleModal={() => {
          setRescheduleModalVisible(false);
          setSelectedBookingForReschedule(null);
        }}
        missedReasonModalVisible={missedReasonModalVisible}
        selectedMissedAppointment={selectedMissedAppointment}
        onCloseMissedReasonModal={closeMissedReasonModal}
        onRefreshAppointments={fetchAppointments}
        onRefreshMissedSummary={fetchMissedSummary}
        onPrefillRescheduledBooking={(customer) => {
          setBookingInitialCustomer(customer);
          setBookingWizardVisible(true);
        }}
        onOpenRescheduleFromMissed={(apt) => {
          setSelectedBookingForReschedule(apt);
          setRescheduleModalVisible(true);
        }}
        makeCall={makeCall}
      />
    </div>
  );
}
