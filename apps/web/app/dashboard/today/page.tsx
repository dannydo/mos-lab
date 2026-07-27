'use client';

import '../../suppress-warnings';
import React, { useEffect, useState } from 'react';
import { Card, theme, DatePicker, Radio, Space, Row, Col, Spin, Divider, Button, Switch, Select, message } from 'antd';
import { ClockCircleOutlined, SyncOutlined, ShopOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
import { useTodayData } from './hooks/useTodayData';
import TodayStats from './components/TodayStats';
import TodayBookingsTable from './components/TodayBookingsTable';
import TodayComingTable from './components/TodayComingTable';
import TodayStaffAttendance from './components/TodayStaffAttendance';
import { PageHeader } from '../../../components/ui';

const RealtimeClock = React.memo(() => {
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
        color: '#D4A84B',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Title & Control Header */}
      <PageHeader
        title="Control Board Hôm Nay (Today operations)"
        subtitle="Giám sát thời gian thực lịch đặt mới, luồng khách đến và trạng thái phục vụ của CC & CV"
        icon={<ClockCircleOutlined />}
        extra={
          <Space size="middle" style={{ flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: token.colorTextDescription }}>Thời gian thực tế</div>
              <RealtimeClock />
            </div>
            <Divider
              type="vertical"
              style={{ height: '32px', borderColor: themeMode === 'dark' ? '#303030' : '#d9d9d9' }}
            />
            <Space.Compact>
              <Button
                icon={<LeftOutlined />}
                onClick={() => {
                  if (data.selectedDate) {
                    const prevDate = data.selectedDate.subtract(1, 'day');
                    data.setSelectedDate(prevDate);
                    localStorage.setItem('today_selected_date', prevDate.format('YYYY-MM-DD'));
                  }
                }}
              />
              <DatePicker
                value={data.selectedDate}
                onChange={(date) => {
                  if (date) {
                    data.setSelectedDate(date);
                    localStorage.setItem('today_selected_date', date.format('YYYY-MM-DD'));
                  }
                }}
                format="DD/MM/YYYY"
                allowClear={false}
                style={{ width: '130px' }}
              />
              <Button
                icon={<RightOutlined />}
                onClick={() => {
                  if (data.selectedDate) {
                    const nextDate = data.selectedDate.add(1, 'day');
                    data.setSelectedDate(nextDate);
                    localStorage.setItem('today_selected_date', nextDate.format('YYYY-MM-DD'));
                  }
                }}
              />
            </Space.Compact>
            <Button
              type="primary"
              icon={<SyncOutlined spin={data.loading || data.silentLoading} />}
              onClick={data.handleRefresh}
              style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000000', fontWeight: 'bold' }}
            />

            {data.selectedDate?.isSame(dayjs(), 'day') && (
              <>
                <Divider
                  type="vertical"
                  style={{ height: '32px', borderColor: themeMode === 'dark' ? '#303030' : '#d9d9d9' }}
                />
                <Space size="small">
                  <Switch
                    checked={data.autoRefresh}
                    onChange={(checked) => {
                      data.setAutoRefresh(checked);
                      localStorage.setItem('today_auto_refresh', String(checked));
                    }}
                    size="small"
                  />
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: data.autoRefresh ? '#52c41a' : token.colorTextDescription,
                    }}
                  >
                    F5{' '}
                    {data.autoRefresh && (
                      <span
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                          fontFeatureSettings: '"tnum"',
                          display: 'inline-block',
                        }}
                      >
                        ({data.countdown}s)
                      </span>
                    )}
                  </span>
                </Space>
                {data.autoRefresh && (
                  <Select
                    size="small"
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
          </Space>
        }
      />

      <Spin spinning={data.loading}>
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
            <Col xs={24} lg={24}>
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
                        value={data.shopBranch}
                        onChange={(val) => {
                          data.setShopBranch(val);
                          localStorage.setItem('today_shop_branch', val);
                        }}
                        options={[
                          { value: 'all', label: 'Tất cả chi nhánh' },
                          { value: 'detham', label: 'Chi nhánh Đề Thám' },
                          { value: 'pxl', label: 'Chi nhánh Phan Xích Long' },
                          { value: 'estella', label: 'Chi nhánh Estella' },
                        ]}
                        style={{ width: '200px' }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px', color: token.colorTextDescription }}>Thuế (VAT):</span>
                        <Radio.Group
                          value={data.showTax ? 'inc' : 'exc'}
                          onChange={(e) => {
                            const val = e.target.value === 'inc';
                            data.setShowTax(val);
                            localStorage.setItem('today_show_tax', String(val));
                          }}
                          optionType="button"
                          buttonStyle="solid"
                          size="small"
                        >
                          <Radio.Button value="inc">Sau thuế (VAT)</Radio.Button>
                          <Radio.Button value="exc">Trước thuế</Radio.Button>
                        </Radio.Group>
                      </div>
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
                        <span style={{ fontSize: '11px', color: token.colorTextDescription }}>
                          Doanh Thu Dịch Vụ Lẻ
                        </span>
                        <div
                          className="tabular-nums font-mono"
                          style={{ fontSize: '20px', fontWeight: 'bold', color: token.colorText, marginTop: '4px' }}
                        >
                          {data.activeShopData.revLe.toLocaleString('vi-VN')} đ
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
                        <span style={{ fontSize: '11px', color: '#D4A84B' }}>Doanh Thu Combo (Gói)</span>
                        <div
                          className="tabular-nums font-mono"
                          style={{ fontSize: '20px', fontWeight: 'bold', color: '#D4A84B', marginTop: '4px' }}
                        >
                          {data.activeShopData.revCombo.toLocaleString('vi-VN')} đ
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
                        <span style={{ fontSize: '11px', color: '#52c41a' }}>Doanh Thu Sản Phẩm</span>
                        <div
                          className="tabular-nums font-mono"
                          style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a', marginTop: '4px' }}
                        >
                          {data.activeShopData.revProduct.toLocaleString('vi-VN')} đ
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
                        <span style={{ fontSize: '11px', color: '#1890ff', fontWeight: 'bold' }}>Tổng Doanh Thu</span>
                        <div
                          className="tabular-nums font-mono"
                          style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff', marginTop: '4px' }}
                        >
                          {activeShopTotalRevenue.toLocaleString('vi-VN')} đ
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
      </Spin>

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        open={data.drawerVisible}
        customerId={data.selectedCustomer?.customerId || null}
        onClose={() => data.setDrawerVisible(false)}
      />

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
          color: #9e7118 !important;
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

        /* Gold highlights for both light/dark */
        .antd-custom-table .ant-pagination-item-active {
          border-color: #d4a84b !important;
        }
        .antd-custom-table .ant-pagination-item-active a {
          color: #d4a84b !important;
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
      `}</style>
    </div>
  );
}
