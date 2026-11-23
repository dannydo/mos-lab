'use client';
// Touch for Turbopack cache refresh - tab labels update

import '../../suppress-warnings';
import { useCallback, useEffect, useState } from 'react';
import { Col, Row, Spin, message, theme } from 'antd';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
import { useTodayData } from './hooks/useTodayData';
import { TodaySandboxProvider, useTodaySandbox } from './context/SandboxModeContext';
import TodayStats from './components/TodayStats';
import TodayBookingsTable from './components/TodayBookingsTable';
import TodayComingTable from './components/TodayComingTable';
import { TodayControlToolbar } from './components/TodayControlToolbar';
import { TodayShopAttendanceCard } from './components/TodayShopAttendanceCard';
import SandboxControlPanel from './components/SandboxControlPanel';

dayjs.extend(isoWeek);

const TodayCalendarSummary = dynamic(() => import('./components/TodayCalendarSummary'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-64 items-center justify-center" aria-label="Đang tải lịch tổng quan">
      <Spin size="large" />
    </div>
  ),
});
const BookerTeamConfigModal = dynamic(() => import('./components/BookerTeamConfigModal'), { ssr: false });

function TodayDashboardContent() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const sandbox = useTodaySandbox();
  const [mainViewMode, setMainViewMode] = useState<'operations' | 'calendar'>('operations');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('today_main_view_mode');
      if (savedMode === 'calendar' || savedMode === 'operations') {
        setMainViewMode(savedMode);
      }
    }
  }, []);

  const data = useTodayData({
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });
  const handleCloseCustomerDrawer = useCallback(() => {
    data.setDrawerVisible(false);
  }, [data.setDrawerVisible]);

  if (!data.selectedDate) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          background: themeMode === 'dark' ? '#0b0f19' : '#ffffff',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const activeShopTotalRevenue =
    (data.activeShopData.revLe || 0) + (data.activeShopData.revCombo || 0) + (data.activeShopData.revProduct || 0);
  const periodLabel =
    data.dateRangeMode === 'month'
      ? `Tháng ${data.selectedDate.format('MM/YYYY')}`
      : data.dateRangeMode === 'week'
        ? `Tuần ${data.selectedDate.isoWeek()} (${data.selectedDate.startOf('isoWeek').format('DD/MM')} - ${data.selectedDate
            .endOf('isoWeek')
            .format('DD/MM/YYYY')})`
        : data.selectedDate.format('DD/MM/YYYY');

  return (
    <div
      className="responsive-page responsive-workspace today-page"
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      <TodayControlToolbar
        selectedDate={data.selectedDate}
        dateRangeMode={data.dateRangeMode}
        periodLabel={periodLabel}
        loading={data.loading}
        silentLoading={data.silentLoading}
        autoRefresh={data.autoRefresh}
        refreshInterval={data.refreshInterval}
        refreshResetSignal={data.refreshResetSignal}
        pauseAutoRefresh={data.drawerVisible || data.teamModalVisible}
        mainViewMode={mainViewMode}
        sandboxMode={sandbox.mode}
        isSandbox={sandbox.isSandbox}
        onDateRangeModeChange={data.setDateRangeMode}
        onPrevDate={data.handlePrevDate}
        onNextDate={data.handleNextDate}
        onSelectDate={(date) => {
          data.setSelectedDate(date);
          localStorage.setItem('today_selected_date', date.format('YYYY-MM-DD'));
        }}
        onRefresh={data.handleRefresh}
        onToggleAutoRefresh={(checked) => {
          data.setAutoRefresh(checked);
          localStorage.setItem('today_auto_refresh', String(checked));
        }}
        onChangeRefreshInterval={(val) => {
          data.setRefreshInterval(val);
          localStorage.setItem('today_refresh_interval', String(val));
        }}
        onTriggerSilentRefresh={data.triggerSilentRefresh}
        onChangeMainViewMode={(mode) => {
          setMainViewMode(mode);
          localStorage.setItem('today_main_view_mode', mode);
        }}
        onChangeSandboxMode={(mode) => sandbox.setMode(mode)}
        onResetTrainingState={sandbox.resetTrainingState}
        onResetSalesState={sandbox.resetSalesState}
      />

      {sandbox.isSandbox && <SandboxControlPanel />}

      <Spin spinning={data.loading}>
        {mainViewMode === 'calendar' ? (
          <TodayCalendarSummary
            themeMode={themeMode}
            token={token}
            allBookings={data.allBookings}
            allComingList={data.allComingList}
            bookingBranch={data.bookingBranch}
            setBookingBranch={data.setBookingBranch}
            selectedBooker={data.selectedBooker}
            setSelectedBooker={data.setSelectedBooker}
            teamConfig={data.teamConfig}
            dateBounds={data.dateBounds}
            setTeamModalVisible={data.setTeamModalVisible}
            openCustomerDrawer={data.openCustomerDrawer}
            selectedDate={data.selectedDate}
            revenueData={data.revenueData}
            previousRevenueData={data.previousRevenueData}
            comparison={data.comparison}
            revenueLoading={data.revenueLoading}
            showRevenueView={data.showRevenueView}
            setShowRevenueView={data.setShowRevenueView}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* STATS KPIs DONUT CHARTS */}
            <TodayStats
              themeMode={themeMode}
              token={token}
              allBookings={data.allBookings}
              bookingsCombo={data.bookingsCombo}
              bookingsOc={data.bookingsOc}
              bookingsOther={data.bookingsOther}
              bookingBranchCounts={data.bookingBranchCounts}
              branchesData={data.branchesData}
              showTax={data.showTax}
              previousAllBookings={data.previousAllBookings}
              previousBranchesData={data.previousBranchesData}
              comparison={data.comparison}
              dateRangeMode={data.dateRangeMode}
              selectedDate={data.selectedDate}
            />

            <Row gutter={[24, 24]}>
              {/* BOOKINGS TABLE */}
              <Col xs={24} lg={24}>
                <TodayBookingsTable
                  filteredBookings={data.filteredBookings}
                  bookingFilter={data.bookingFilter}
                  setBookingFilter={data.setBookingFilter}
                  bookingBranch={data.bookingBranch}
                  setBookingBranch={data.setBookingBranch}
                  selectedBooker={data.selectedBooker}
                  setSelectedBooker={data.setSelectedBooker}
                  openCustomerDrawer={data.openCustomerDrawer}
                  bookingBranchCounts={data.bookingBranchCounts}
                  allBookings={data.allBookings}
                />
              </Col>

              {/* COMING CLIENTS TABLE */}
              <Col xs={24} lg={24}>
                <TodayComingTable
                  activeComingList={data.activeComingList}
                  comingBranch={data.comingBranch}
                  setComingBranch={data.setComingBranch}
                  comingCategory={data.comingCategory}
                  setComingCategory={data.setComingCategory}
                  selectedBooker={data.selectedBooker}
                  setSelectedBooker={data.setSelectedBooker}
                  openCustomerDrawer={data.openCustomerDrawer}
                  allComingList={data.allComingList}
                />
              </Col>

              {/* STAFF ATTENDANCE PANEL */}
              <Col xs={24} lg={24} className="today-secondary-mobile-hidden">
                <TodayShopAttendanceCard
                  themeMode={themeMode}
                  token={token}
                  shopBranch={data.shopBranch}
                  onChangeShopBranch={(val) => {
                    data.setShopBranch(val);
                    localStorage.setItem('today_shop_branch', val);
                  }}
                  showTax={data.showTax}
                  onToggleShowTax={(checked) => {
                    data.setShowTax(checked);
                    localStorage.setItem('today_show_tax', String(checked));
                  }}
                  activeShopData={data.activeShopData}
                  activeShopTotalRevenue={activeShopTotalRevenue}
                />
              </Col>
            </Row>
          </div>
        )}
      </Spin>

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        open={data.drawerVisible}
        customerId={data.selectedCustomer?.customerId || null}
        onClose={handleCloseCustomerDrawer}
        onUpdate={data.handleRefresh}
      />

      {/* Booker Team Config Modal */}
      {data.teamModalVisible && (
        <BookerTeamConfigModal
          open
          onClose={() => data.setTeamModalVisible(false)}
          teamConfig={data.teamConfig}
          onSave={data.saveTeamConfig}
          themeMode={themeMode}
          token={token}
        />
      )}

      <style jsx global>{`
        /* Custom styles for Ant Design Table under Dark & Light Mode */
        .dark-theme .antd-custom-table .ant-table {
          background: #111827 !important;
          color: #cbd5e1 !important;
        }
        .light-theme .antd-custom-table .ant-table {
          background: #ffffff !important;
          color: #0f172a !important;
        }
        .dark-theme .antd-custom-table .ant-table-thead > tr > th {
          background: #1e293b !important;
          color: #d4a84b !important;
          border-bottom: 1px solid #334155 !important;
        }
        .light-theme .antd-custom-table .ant-table-thead > tr > th {
          background: #f8fafc !important;
          color: #855b0e !important;
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark-theme .antd-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #1f2937 !important;
        }
        .light-theme .antd-custom-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #e2e8f0 !important;
        }
        .dark-theme .antd-custom-table .ant-table-row:hover > td {
          background: #1e293b !important;
        }
        .light-theme .antd-custom-table .ant-table-row:hover > td {
          background: #f1f5f9 !important;
        }

        /* Compact line height & padding */
        .antd-custom-table .ant-table-tbody > tr > td {
          padding: 6px 8px !important;
          line-height: 1.25 !important;
        }
        .antd-custom-table .ant-table-thead > tr > th {
          padding: 8px 8px !important;
          line-height: 1.25 !important;
        }

        .today-page .today-table-config-button {
          align-items: center;
          display: inline-flex;
          height: 32px;
          justify-content: center;
          min-width: 32px;
          padding: 0;
          width: 32px;
        }

        .today-page .today-auto-refresh-control,
        .today-page .today-vat-toggle {
          align-items: center;
          min-height: var(--mos-control-height);
        }

        .today-page .today-auto-refresh-control .toolbar-toggle-label {
          color: ${data.autoRefresh ? (themeMode === 'dark' ? '#52c41a' : '#15803d') : token.colorTextDescription};
        }
      `}</style>
    </div>
  );
}

export default function TodayDashboard() {
  return (
    <TodaySandboxProvider>
      <TodayDashboardContent />
    </TodaySandboxProvider>
  );
}
