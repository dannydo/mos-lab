'use client';

import '../../suppress-warnings';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Typography, Card, theme, DatePicker, Select, Radio, Space, Button, Tabs, Tooltip } from 'antd';
import {
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  CheckCircleOutlined,
  GiftOutlined,
  DollarOutlined,
  WalletOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';

import { Spin } from 'antd';

const BkBookingTab = dynamic(() => import('./components/BkBookingTab'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Spin />
    </div>
  ),
});
const BkDoneTab = dynamic(() => import('./components/BkDoneTab'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Spin />
    </div>
  ),
});
const BkTipTab = dynamic(() => import('./components/BkTipTab'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Spin />
    </div>
  ),
});
const BkRevenueTab = dynamic(() => import('./components/BkRevenueTab'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Spin />
    </div>
  ),
});
const BkThuNhapTab = dynamic(() => import('./components/BkThuNhapTab'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Spin />
    </div>
  ),
});

const AllocationHistoryScreen = dynamic(
  () => import('../../../components/allocation/AllocationHistoryScreen').then((m) => m.AllocationHistoryScreen),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center">
        <Spin />
      </div>
    ),
  }
);
const AllocationAuditDashboard = dynamic(
  () => import('../../../components/allocation/AllocationAuditDashboard').then((m) => m.AllocationAuditDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="p-8 text-center">
        <Spin />
      </div>
    ),
  }
);

const BkConfigDrawer = dynamic(() => import('./components/BkConfigDrawer'), { ssr: false });

dayjs.extend(isoWeek);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function BkDashboardPage() {
  const { token } = theme.useToken();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [referenceDate, setReferenceDate] = useState<Dayjs>(dayjs());
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [selectedBooker] = useState<string>('ALL');

  const [activeTab, setActiveTab] = useState<string>('booking');

  // Restore active tab from URL param or localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const savedTab = localStorage.getItem('bk_active_tab');
      const initialTab = tabParam || savedTab;

      if (initialTab && ['booking', 'done', 'tip', 'revenue', 'thunhap'].includes(initialTab)) {
        setActiveTab(initialTab);
      }
    }
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bk_active_tab', key);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', key);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  // Update date range when viewMode or referenceDate changes
  useEffect(() => {
    if (viewMode === 'month') {
      setDateRange([referenceDate.startOf('month'), referenceDate.endOf('month')]);
    } else if (viewMode === 'week') {
      setDateRange([referenceDate.startOf('isoWeek'), referenceDate.endOf('isoWeek')]);
    } else {
      setDateRange([referenceDate.startOf('day'), referenceDate.endOf('day')]);
    }
  }, [viewMode, referenceDate]);

  // Navigate date backward / forward
  const handleNavigate = (direction: number) => {
    if (viewMode === 'month') {
      setReferenceDate((prev) => prev.add(direction, 'month'));
    } else if (viewMode === 'week') {
      setReferenceDate((prev) => prev.add(direction, 'week'));
    } else {
      setReferenceDate((prev) => prev.add(direction, 'day'));
    }
  };

  // Format label for date button
  const getPeriodLabel = () => {
    if (viewMode === 'month') {
      return `Tháng ${referenceDate.format('MM/YYYY')}`;
    } else if (viewMode === 'week') {
      return `Tuần ${referenceDate.isoWeek()} (${referenceDate.startOf('isoWeek').format('DD/MM')} - ${referenceDate
        .endOf('isoWeek')
        .format('DD/MM')})`;
    } else {
      return referenceDate.format('DD/MM/YYYY');
    }
  };

  const tabItems = [
    {
      key: 'booking',
      icon: <CalendarOutlined />,
      label: 'BK Booking',
      children:
        activeTab === 'booking' ? (
          <BkBookingTab dateRange={dateRange} selectedStore={selectedStore} selectedBooker={selectedBooker} />
        ) : null,
    },
    {
      key: 'done',
      icon: <CheckCircleOutlined />,
      label: 'BK Done',
      children:
        activeTab === 'done' ? (
          <BkDoneTab dateRange={dateRange} selectedStore={selectedStore} selectedBooker={selectedBooker} />
        ) : null,
    },
    {
      key: 'tip',
      icon: <GiftOutlined />,
      label: 'BK Tip',
      children:
        activeTab === 'tip' ? (
          <BkTipTab dateRange={dateRange} selectedStore={selectedStore} selectedBooker={selectedBooker} />
        ) : null,
    },
    {
      key: 'revenue',
      icon: <DollarOutlined />,
      label: 'BK Doanh Thu',
      children:
        activeTab === 'revenue' ? (
          <BkRevenueTab dateRange={dateRange} selectedStore={selectedStore} selectedBooker={selectedBooker} />
        ) : null,
    },
    {
      key: 'thunhap',
      icon: <WalletOutlined />,
      label: 'BK Thu Nhập',
      children:
        activeTab === 'thunhap' ? (
          <BkThuNhapTab dateRange={dateRange} selectedStore={selectedStore} selectedBooker={selectedBooker} />
        ) : null,
    },
    {
      key: 'history-30d',
      icon: <ClockCircleOutlined />,
      label: 'Lịch Sử 30 Ngày',
      children: activeTab === 'history-30d' ? <AllocationHistoryScreen /> : null,
    },
    {
      key: 'alloc-audit',
      icon: <BarChartOutlined />,
      label: 'Audit Phân Bổ Data',
      children: activeTab === 'alloc-audit' ? <AllocationAuditDashboard /> : null,
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Filter Navigation (Matching CV Page Compact Style) */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>
            Báo Cáo Hiệu Quả & Lương Booker (BK)
          </Title>
          <Text style={{ color: token.colorTextDescription }}>
            Theo dõi chỉ số tạo booking, lượt done, tip, doanh thu và lương thưởng tạm tính của đội ngũ Booker
          </Text>
        </div>

        {/* TOP FILTER CONTROLS BAR */}
        <div className="flex items-center gap-3 flex-wrap">
          <Space wrap>
            {/* View Mode Switcher: Tháng / Tuần / Ngày */}
            <Space.Compact>
              <Button type={viewMode === 'month' ? 'primary' : 'default'} onClick={() => setViewMode('month')}>
                Tháng
              </Button>
              <Button type={viewMode === 'week' ? 'primary' : 'default'} onClick={() => setViewMode('week')}>
                Tuần
              </Button>
              <Button type={viewMode === 'day' ? 'primary' : 'default'} onClick={() => setViewMode('day')}>
                Ngày
              </Button>
            </Space.Compact>

            {/* Date Navigator: < Tháng 08/2026 📅 > */}
            <Space.Compact>
              <Button icon={<LeftOutlined />} onClick={() => handleNavigate(-1)} />
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <Button
                  onClick={() => setPickerOpen(true)}
                  style={{
                    fontWeight: '600',
                    minWidth: '190px',
                    textAlign: 'center',
                    color: token.colorText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                  className="tabular-nums"
                >
                  {getPeriodLabel()} <CalendarOutlined style={{ color: token.colorPrimary }} />
                </Button>
                {pickerOpen && (
                  <RangePicker
                    open={true}
                    onOpenChange={(open) => {
                      if (!open) setPickerOpen(false);
                    }}
                    value={dateRange}
                    onChange={(dates) => {
                      if (dates && dates[0] && dates[1]) {
                        setDateRange([dates[0], dates[1]]);
                        setPickerOpen(false);
                      }
                    }}
                    format="DD/MM/YYYY"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: 0,
                      height: 0,
                      padding: 0,
                      border: 'none',
                      visibility: 'hidden',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>
              <Button icon={<RightOutlined />} onClick={() => handleNavigate(1)} />
            </Space.Compact>

            {/* Store Filter */}
            <Select
              value={selectedStore}
              onChange={setSelectedStore}
              style={{ width: 140 }}
              options={[
                { value: 'ALL', label: 'Tất cả CS' },
                { value: '6', label: 'Đề Thám' },
                { value: '16', label: 'Estella Place' },
              ]}
            />

            {/* Config Button → Team Management */}
            <Tooltip title="Cấu hình BK">
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => router.push('/dashboard/staff/teams?selected=BK')}
                style={{
                  backgroundColor: token.colorPrimary,
                  borderColor: token.colorPrimary,
                  color: '#000',
                  fontWeight: '600',
                }}
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      {/* Tabs Chức Năng */}
      <Card
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: '12px 16px 16px 16px' } }}
        className="shadow-sm rounded-xl dashboard-main-tabs-card"
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          className="custom-tabs"
          destroyOnHidden
        />
      </Card>
    </div>
  );
}
