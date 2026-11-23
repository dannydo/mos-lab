'use client';

import { Col, Row } from 'antd';
import { useOmiCall } from '../../../../context/OmiCallContext';
import { RevenueDetailModal } from './RevenueDetailModal';
import { CalendarFilterControlBar } from './today-calendar-summary/CalendarFilterControlBar';
import { CalendarKpiCards } from './today-calendar-summary/CalendarKpiCards';
import { CalendarRevenueSection } from './today-calendar-summary/CalendarRevenueSection';
import { HourlyDistributionChartCard } from './today-calendar-summary/HourlyDistributionChartCard';
import { HourlyMatrixSection } from './today-calendar-summary/HourlyMatrixSection';
import { OperationalBreakdownCard } from './today-calendar-summary/OperationalBreakdownCard';
import { SlotDetailModal } from './today-calendar-summary/SlotDetailModal';
import type { TodayCalendarSummaryProps } from './today-calendar-summary/types';
import { useTodayCalendarSummary } from './today-calendar-summary/useTodayCalendarSummary';

export type { TodayCalendarSummaryProps };

export default function TodayCalendarSummary({
  themeMode,
  token,
  allBookings,
  allComingList,
  bookingBranch,
  setBookingBranch,
  selectedBooker,
  setSelectedBooker,
  teamConfig,
  dateBounds,
  setTeamModalVisible,
  openCustomerDrawer,
  selectedDate,
  revenueData,
  previousRevenueData,
  comparison,
  revenueLoading,
  showRevenueView,
  setShowRevenueView,
}: TodayCalendarSummaryProps) {
  const { makeCall } = useOmiCall();
  const summary = useTodayCalendarSummary({
    allBookings,
    allComingList,
    bookingBranch,
    selectedBooker,
    teamConfig,
  });

  const periodLabel = dateBounds?.label || selectedDate.format('DD/MM/YYYY');

  return (
    <div className="flex flex-col gap-5">
      <CalendarFilterControlBar
        themeMode={themeMode}
        periodLabel={periodLabel}
        bookingBranch={bookingBranch}
        setBookingBranch={setBookingBranch}
        selectedBooker={selectedBooker}
        setSelectedBooker={setSelectedBooker}
        groupedBookerOptions={summary.groupedBookerOptions}
        setTeamModalVisible={setTeamModalVisible}
        showRevenueView={showRevenueView}
        setShowRevenueView={setShowRevenueView}
      />

      {showRevenueView && (
        <CalendarRevenueSection
          themeMode={themeMode}
          token={token}
          revenueData={revenueData}
          previousRevenueData={previousRevenueData}
          comparison={comparison}
          revenueLoading={revenueLoading}
          onKpiCardClick={summary.handleRevenueKpiCardClick}
          onBarClick={summary.handleRevenueBarClick}
          onCellClick={summary.handleRevenueCellClick}
        />
      )}

      <CalendarKpiCards
        themeMode={themeMode}
        totalCreated={summary.totalCreated}
        totalScheduled={summary.totalScheduled}
        totalMissed={summary.totalMissed}
        totalDone={summary.totalDone}
        missedRate={summary.missedRate}
        completionRate={summary.completionRate}
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <HourlyDistributionChartCard
            themeMode={themeMode}
            hourlyData={summary.hourlyData}
            maxHourlyVal={summary.maxHourlyVal}
            onSelectHour={(hour) => summary.openSlotDetail({ hour, type: 'all' })}
          />
        </Col>

        <Col xs={24} lg={8}>
          <OperationalBreakdownCard
            themeMode={themeMode}
            completionRate={summary.completionRate}
            missedRate={summary.missedRate}
            totalScheduled={summary.totalScheduled}
            filteredComingList={summary.filteredComingList}
          />
        </Col>
      </Row>

      <HourlyMatrixSection
        themeMode={themeMode}
        hourlyData={summary.hourlyData}
        matrixStatusFilter={summary.matrixStatusFilter}
        onChangeMatrixStatusFilter={summary.setMatrixStatusFilter}
        totalCreated={summary.totalCreated}
        totalScheduled={summary.totalScheduled}
        totalMissed={summary.totalMissed}
        totalDone={summary.totalDone}
        onSelectSlot={summary.openSlotDetail}
      />

      <SlotDetailModal
        themeMode={themeMode}
        selectedSlot={summary.selectedSlot}
        modalSlotItems={summary.modalSlotItems}
        isMaskedRole={summary.isMaskedRole}
        onClose={summary.closeSlotDetail}
        onCallCustomer={makeCall}
        onOpenCustomerDrawer={openCustomerDrawer}
      />

      <RevenueDetailModal
        themeMode={themeMode}
        token={token}
        open={summary.revenueDetailOpen}
        onClose={summary.closeRevenueDetail}
        context={summary.revenueDetailContext}
        dateFrom={dateBounds?.dateFrom || selectedDate.format('YYYY-MM-DD')}
        dateTo={dateBounds?.dateTo || selectedDate.format('YYYY-MM-DD')}
        openCustomerDrawer={openCustomerDrawer}
      />
    </div>
  );
}
