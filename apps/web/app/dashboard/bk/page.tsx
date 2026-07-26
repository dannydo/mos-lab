'use client';

import '../../suppress-warnings';
import React, { useState, useEffect } from 'react';
import { Typography, Card, theme, DatePicker, Select, Radio, Space, Button, Tabs } from 'antd';
import {
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  CheckCircleOutlined,
  GiftOutlined,
  DollarOutlined,
  WalletOutlined,
  SettingOutlined,
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

const BkConfigDrawer = dynamic(() => import('./components/BkConfigDrawer'), { ssr: false });

dayjs.extend(isoWeek);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function BkDashboardPage() {
  const { token } = theme.useToken();

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [referenceDate, setReferenceDate] = useState<Dayjs>(dayjs());
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [selectedBooker] = useState<string>('ALL');

  const [activeTab, setActiveTab] = useState<string>('booking');
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);

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
  ];

  return (
    <div className="w-full space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <Title level={3} className="!mb-1 font-bold tracking-tight">
            Báo Cáo Hiệu Quả & Lương Booker (BK)
          </Title>
          <Text type="secondary" className="text-sm">
            Theo dõi chỉ số tạo booking, lượt done, tip, doanh thu và lương thưởng tạm tính của đội ngũ Booker
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Radio */}
          <Radio.Group
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            optionType="button"
            buttonStyle="solid"
            size="middle"
          >
            <Radio.Button value="month">Tháng</Radio.Button>
            <Radio.Button value="week">Tuần</Radio.Button>
            <Radio.Button value="day">Ngày</Radio.Button>
          </Radio.Group>

          {/* Date Navigation */}
          <Space.Compact size="middle">
            <Button icon={<LeftOutlined />} onClick={() => handleNavigate(-1)} />
            <Button onClick={() => setPickerOpen(true)} className="font-semibold tabular-nums min-w-[160px]">
              {getPeriodLabel()}
            </Button>
            <Button icon={<RightOutlined />} onClick={() => handleNavigate(1)} />
          </Space.Compact>

          {/* Date Range Picker Modal */}
          <RangePicker
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            value={dateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                setDateRange([dates[0], dates[1]]);
              }
            }}
            style={{ display: 'none' }}
          />

          {/* Store Filter */}
          <Select
            value={selectedStore}
            onChange={setSelectedStore}
            size="middle"
            className="w-[130px]"
            options={[
              { value: 'ALL', label: 'Tất cả CS' },
              { value: 'PXL', label: 'Phan Xích Long' },
              { value: 'Q1', label: 'Quận 1' },
            ]}
          />

          {/* Config Drawer Button */}
          <Button
            type="primary"
            icon={<SettingOutlined />}
            size="middle"
            onClick={() => setConfigDrawerOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 border-amber-500"
          >
            Cấu hình BK
          </Button>
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

      {/* Config Drawer */}
      <BkConfigDrawer open={configDrawerOpen} onClose={() => setConfigDrawerOpen(false)} />
    </div>
  );
}
