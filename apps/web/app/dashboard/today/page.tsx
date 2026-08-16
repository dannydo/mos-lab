'use client';
// Touch for Turbopack cache refresh - tab labels update

import '../../suppress-warnings';
import React, { useEffect, useState } from 'react';
import { Card, theme, Radio, Space, Row, Col, Spin, Button, Select, Tag, message } from 'antd';
import { ClockCircleOutlined, ShopOutlined, CalendarOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
import { useTodayData } from './hooks/useTodayData';
import TodayStats from './components/TodayStats';
import TodayBookingsTable from './components/TodayBookingsTable';
import TodayComingTable from './components/TodayComingTable';
import TodayStaffAttendance from './components/TodayStaffAttendance';
import { IconButton, PageHeader, ReportPeriodNavigator, ToolbarToggle } from '../../../components/ui';

const TodayCalendarSummary = dynamic(() => import('./components/TodayCalendarSummary'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-64 items-center justify-center" aria-label="Đang tải lịch tổng quan">
      <Spin size="large" />
    </div>
  ),
});
const BookerTeamConfigModal = dynamic(() => import('./components/BookerTeamConfigModal'), { ssr: false });

const RealtimeClock = React.memo(() => {
  const { token } = theme.useToken();
  const [time, setTime] = useState('');
  useEffect(() => {
    const updateTime = () => {
      setTime(dayjs().format('HH:mm:ss - DD/MM/YYYY'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <strong
      style={{
        color: token.colorPrimary,
        fontSize: '14px',
        fontVariantNumeric: 'tabular-nums',
        fontFeatureSettings: '"tnum"',
      }}
    >
      {time}
    </strong>
  );
});
RealtimeClock.displayName = 'RealtimeClock';

export default function TodayDashboard() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
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
      {/* Title & Control Header */}
      <PageHeader
        title="Control Board Hôm Nay (Today operations)"
        subtitle="Giám sát thời gian thực lịch đặt mới, luồng khách đến và trạng thái phục vụ của CC & CV"
        icon={<ClockCircleOutlined />}
        extra={
          <div className="today-header-toolbar">
            <div className="today-realtime-clock">
              <span>Thời gian thực tế</span>
              <RealtimeClock />
            </div>
            <ReportPeriodNavigator
              mode={data.dateRangeMode}
              value={data.selectedDate}
              label={periodLabel}
              onModeChange={data.setDateRangeMode}
              onPrevious={data.handlePrevDate}
              onNext={data.handleNextDate}
              onValueChange={(date) => {
                data.setSelectedDate(date);
                localStorage.setItem('today_selected_date', date.format('YYYY-MM-DD'));
              }}
            />

            <IconButton
              label="Làm mới dữ liệu"
              icon={RefreshCw}
              iconClassName={data.loading || data.silentLoading ? 'animate-spin' : ''}
              onClick={data.handleRefresh}
              className="today-refresh-action"
            />

            {data.selectedDate?.isSame(dayjs(), 'day') && (
              <>
                <ToolbarToggle
                  className="today-auto-refresh-control"
                  label={
                    <span>F5 {data.autoRefresh && <span className="tabular-nums">({data.countdown}s)</span>}</span>
                  }
                  aria-label="Bật hoặc tắt tự động làm mới"
                  checked={data.autoRefresh}
                  onChange={(checked) => {
                    data.setAutoRefresh(checked);
                    localStorage.setItem('today_auto_refresh', String(checked));
                  }}
                />
                {data.autoRefresh && (
                  <Select
                    aria-label="Chu kỳ tự động làm mới"
                    value={data.refreshInterval}
                    onChange={(val) => {
                      data.setRefreshInterval(val);
                      localStorage.setItem('today_refresh_interval', String(val));
                    }}
                    options={[
                      { value: 15, label: '15s' },
                      { value: 30, label: '30s' },
                      { value: 60, label: '1m' },
                      { value: 180, label: '3m' },
                    ]}
                    style={{ width: '70px' }}
                  />
                )}
              </>
            )}
          </div>
        }
      />

      {/* VIEW MODE TOGGLE BAR */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginBottom: '4px' }}>
        <Radio.Group
          value={mainViewMode}
          onChange={(e) => {
            const val = e.target.value;
            setMainViewMode(val);
            localStorage.setItem('today_main_view_mode', val);
          }}
          optionType="button"
          buttonStyle="solid"
          size="middle"
        >
          <Radio.Button value="operations">
            <Space size="small">
              <UnorderedListOutlined />
              <span style={{ fontWeight: '600' }}>Bảng Vận Hành</span>
            </Space>
          </Radio.Button>
          <Radio.Button value="calendar">
            <Space size="small">
              <CalendarOutlined style={{ color: mainViewMode === 'calendar' ? '#D4A84B' : undefined }} />
              <span style={{ fontWeight: '600' }}>Lịch Tổng Quan</span>
            </Space>
          </Radio.Button>
        </Radio.Group>
      </div>

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
                <Card
                  title={
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <ShopOutlined style={{ color: '#D4A84B' }} />
                        <span style={{ fontSize: '15px', fontWeight: 'bold' }}>
                          Tình hình nhân sự & Thực tế phục vụ tại cửa hàng
                        </span>
                      </div>

                      <Space size="middle">
                        <Select
                          aria-label="Chi nhánh theo dõi"
                          value={data.shopBranch}
                          onChange={(val) => {
                            data.setShopBranch(val);
                            localStorage.setItem('today_shop_branch', val);
                          }}
                          options={[
                            { value: 'all', label: 'Tất cả' },
                            { value: 'detham', label: 'Đề Thám' },
                            { value: 'estella', label: 'Estella Place' },
                          ]}

                          style={{ width: '200px' }}
                        />

                        <ToolbarToggle
                          className="today-vat-toggle"
                          label="VAT"
                          aria-label="Hiển thị doanh thu sau thuế VAT"
                          checked={data.showTax}
                          onChange={(checked) => {
                            data.setShowTax(checked);
                            localStorage.setItem('today_show_tax', String(checked));
                          }}
                        />
                      </Space>
                    </div>
                  }
                  styles={{ body: { padding: '16px' } }}
                  style={{
                    background: token.colorBgContainer,
                    borderColor: token.colorBorderSecondary,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontWeight: 'bold',
                        fontSize: '13px',
                        color: token.colorTextSecondary,
                        marginBottom: '12px',
                      }}
                    >
                      Phân Phối Doanh Thu Hôm Nay (Revenue Breakdown)
                    </div>
                    <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
                      <Col xs={24} sm={12} md={6}>
                        <Card
                          size="small"
                          style={{
                            background: themeMode === 'dark' ? '#1e293b' : '#f5f5f5',
                            border: `1px solid ${token.colorBorderSecondary}`,
                          }}
                        >
                          <span style={{ fontSize: '11px', color: token.colorTextDescription }}>Doanh Thu Single</span>
                          <div
                            className="tabular-nums font-mono"
                            style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginTop: '4px' }}
                          >
                            {data.activeShopData.revLe.toLocaleString('vi-VN')} đ
                          </div>
                        </Card>
                      </Col>

                      <Col xs={24} sm={12} md={6}>
                        <Card
                          size="small"
                          style={{
                            background: themeMode === 'dark' ? '#1e293b' : '#f5f5f5',
                            border: `1px solid ${token.colorBorderSecondary}`,
                          }}
                        >
                          <span style={{ fontSize: '11px', color: themeMode === 'dark' ? '#D4A84B' : '#855b0e' }}>
                            Doanh Thu Combo
                          </span>
                          <div
                            className="tabular-nums font-mono"
                            style={{
                              fontSize: '20px',
                              fontWeight: 'bold',
                              color: themeMode === 'dark' ? '#D4A84B' : '#855b0e',
                              marginTop: '4px',
                            }}
                          >
                            {data.activeShopData.revCombo.toLocaleString('vi-VN')} đ
                          </div>
                        </Card>
                      </Col>

                      <Col xs={24} sm={12} md={6}>
                        <Card
                          size="small"
                          style={{
                            background: themeMode === 'dark' ? '#1e293b' : '#f5f5f5',
                            border: `1px solid ${token.colorBorderSecondary}`,
                          }}
                        >
                          <span style={{ fontSize: '11px', color: themeMode === 'dark' ? '#52c41a' : '#15803d' }}>
                            Doanh Thu Sản Phẩm
                          </span>
                          <div
                            className="tabular-nums font-mono"
                            style={{
                              fontSize: '20px',
                              fontWeight: 'bold',
                              color: themeMode === 'dark' ? '#52c41a' : '#15803d',
                              marginTop: '4px',
                            }}
                          >
                            {data.activeShopData.revProduct.toLocaleString('vi-VN')} đ
                          </div>
                        </Card>
                      </Col>

                      <Col xs={24} sm={12} md={6}>
                        <Card
                          size="small"
                          style={{
                            background: themeMode === 'dark' ? '#1e293b' : '#f5f5f5',
                            border: `1px solid ${token.colorBorderSecondary}`,
                          }}
                        >
                          <span
                            style={{
                              fontSize: '11px',
                              color: themeMode === 'dark' ? '#60a5fa' : '#1d4ed8',
                              fontWeight: 'bold',
                            }}
                          >
                            ∑ Doanh Thu
                          </span>
                          <div
                            className="tabular-nums font-mono"
                            style={{
                              fontSize: '20px',
                              fontWeight: 'bold',
                              color: themeMode === 'dark' ? '#60a5fa' : '#1d4ed8',
                              marginTop: '4px',
                            }}
                          >
                            {activeShopTotalRevenue.toLocaleString('vi-VN')} đ
                          </div>
                        </Card>
                      </Col>
                    </Row>
                  </div>

                  {/* CC & CV Table split */}
                  <TodayStaffAttendance
                    themeMode={themeMode}
                    token={token}
                    ccList={data.activeShopData.cc}
                    cvList={data.activeShopData.cv}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        )}
      </Spin>

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        open={data.drawerVisible}
        customerId={data.selectedCustomer?.customerId || null}
        onClose={() => data.setDrawerVisible(false)}
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
