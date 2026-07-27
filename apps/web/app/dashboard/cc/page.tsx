'use client';

import '../../suppress-warnings';
import React, { useState, useEffect } from 'react';
import { Typography, Card, theme, DatePicker, Select, Radio, Space, Button, Tabs, Spin, message, Tooltip } from 'antd';
import {
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  TrophyOutlined,
  TableOutlined,
  GiftOutlined,
  RocketOutlined,
  DollarOutlined,
  WalletOutlined,
  SettingOutlined,
  SketchOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';
import { apiClient } from '../../../lib/api-client';
import { CcLeaderboardEntry, CcXoayRecord } from '@mos-lab/shared';

import CcLeaderboardCard from './components/CcLeaderboardCard';
import { PageHeader } from '../../../components/ui';

const CcXoayTab = dynamic(() => import('./components/CcXoayTab'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Spin />
    </div>
  ),
});
const CcThuongTab = dynamic(() => import('./components/CcThuongTab'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Spin />
    </div>
  ),
});
const CcGameTab = dynamic(() => import('./components/CcGameTab'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Spin />
    </div>
  ),
});
const CcTipTab = dynamic(() => import('./components/CcTipTab'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Spin />
    </div>
  ),
});
const CcDiamondTab = dynamic(() => import('./components/CcDiamondTab'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Spin />
    </div>
  ),
});
const CcThuNhapTab = dynamic(() => import('./components/CcThuNhapTab'), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <Spin />
    </div>
  ),
});
const CcConfigDrawer = dynamic(() => import('./components/CcConfigDrawer'), { ssr: false });

dayjs.extend(isoWeek);

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function CcDashboardPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [referenceDate, setReferenceDate] = useState<Dayjs>(dayjs());
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [selectedConsultant, setSelectedConsultant] = useState<string>('ALL');

  const [activeTab, setActiveTab] = useState<string>('xoay');
  const [loading, setLoading] = useState(false);
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [xoayData, setXoayData] = useState<CcXoayRecord[]>([]);

  const [xoayTotal, setXoayTotal] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState<CcLeaderboardEntry[]>([]);

  // Restore active tab from URL param or localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const savedTab = localStorage.getItem('cc_active_tab');
      const initialTab = tabParam || savedTab;

      if (initialTab && ['xoay', 'thuong', 'game', 'tip', 'diamond', 'thunhap'].includes(initialTab)) {
        setActiveTab(initialTab);
      }
    }
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cc_active_tab', key);
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

  // Fetch real-time data from Backend API
  const fetchCcData = async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange[0].format('YYYY-MM-DD');
      const dateTo = dateRange[1].format('YYYY-MM-DD');

      const [xoayRes, lbRes] = await Promise.all([
        apiClient.kpi.getCcXoayReport({
          viewMode,
          dateFrom,
          dateTo,
          storeId: selectedStore,
          consultantId: selectedConsultant,
          limit: 3000,
        }),
        apiClient.kpi.getCcLeaderboard({
          viewMode,
          dateFrom,
          dateTo,
          storeId: selectedStore,
        }),
      ]);

      if (xoayRes && xoayRes.data) {
        setXoayData(xoayRes.data);
        setXoayTotal(xoayRes.total);
      }

      if (lbRes && lbRes.leaderboard) {
        setLeaderboardData(lbRes.leaderboard);
      }
    } catch (err) {
      message.error('Không thể tải dữ liệu báo cáo CC.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCcData();
  }, [dateRange, selectedStore, selectedConsultant]);

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
    }
    if (viewMode === 'week') {
      const weekNum = referenceDate.isoWeek();
      return `Tuần ${weekNum} (${referenceDate.startOf('isoWeek').format('DD/MM')} - ${referenceDate.endOf('isoWeek').format('DD/MM/YYYY')})`;
    }
    return referenceDate.format('DD/MM/YYYY');
  };

  const tabItems = [
    {
      key: 'xoay',
      icon: <TableOutlined />,
      label: 'CC Xoay',
      children:
        activeTab === 'xoay' ? (
          <div className="flex flex-col gap-4">
            <CcLeaderboardCard
              leaderboard={leaderboardData}
              loading={loading}
              selectedConsultant={selectedConsultant}
              onSelectConsultant={(ccName) => {
                setSelectedConsultant((prev) => (prev === ccName ? 'ALL' : ccName));
              }}
            />
            <CcXoayTab data={xoayData} total={xoayTotal} loading={loading} onRefresh={fetchCcData} />
          </div>
        ) : null,
    },
    {
      key: 'thuong',
      icon: <GiftOutlined />,
      label: 'CC Daily Bonus',
      children:
        activeTab === 'thuong' ? (
          <CcThuongTab
            loading={loading}
            dateRange={dateRange}
            selectedStore={selectedStore}
            selectedConsultant={selectedConsultant}
            onSelectConsultant={(ccName) => {
              setSelectedConsultant((prev) => (prev === ccName ? 'ALL' : ccName));
            }}
          />
        ) : null,
    },
    {
      key: 'tip',
      icon: <DollarOutlined />,
      label: 'CC Tip',
      children:
        activeTab === 'tip' ? (
          <CcTipTab
            loading={loading}
            dateRange={dateRange}
            selectedStore={selectedStore}
            selectedConsultant={selectedConsultant}
            onSelectConsultant={(ccName) => {
              setSelectedConsultant((prev) => (prev === ccName ? 'ALL' : ccName));
            }}
          />
        ) : null,
    },
    {
      key: 'diamond',
      icon: <SketchOutlined />,
      label: 'Kim Cương',
      children:
        activeTab === 'diamond' ? (
          <CcDiamondTab dateRange={dateRange} selectedStore={selectedStore} selectedConsultant={selectedConsultant} />
        ) : null,
    },
    {
      key: 'game',
      icon: <RocketOutlined />,
      label: 'CC Game',
      children: activeTab === 'game' ? <CcGameTab /> : null,
    },
    {
      key: 'thunhap',
      icon: <WalletOutlined />,
      label: 'CC Thu Nhập',
      children: activeTab === 'thunhap' ? <CcThuNhapTab dateRange={dateRange} selectedStore={selectedStore} /> : null,
    },
  ];

  return (
    <div>
      {/* HEADER & GLOBAL FILTER BAR */}
      <PageHeader
        title="Báo Cáo CC (Client Consultant)"
        subtitle="Theo dõi dữ liệu CC Xoay, thưởng sản phẩm combo, gamification và thu nhập live của tư vấn viên"
        extra={
          <Space wrap size={8}>
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

            {/* Date Navigation & Selector */}
            <Space size={0} className="border border-slate-700 rounded-md overflow-hidden bg-slate-900/50">
              <Button type="text" icon={<LeftOutlined />} onClick={() => handleNavigate(-1)} />
              <Button type="text" icon={<CalendarOutlined />} onClick={() => setPickerOpen(true)}>
                {getPeriodLabel()}
              </Button>
              <Button type="text" icon={<RightOutlined />} onClick={() => handleNavigate(1)} />
            </Space>

            {/* Hidden DatePicker */}
            <DatePicker
              open={pickerOpen}
              onOpenChange={(open) => setPickerOpen(open)}
              picker={viewMode === 'month' ? 'month' : viewMode === 'week' ? 'week' : 'date'}
              onChange={(val) => {
                if (val) {
                  setReferenceDate(val);
                  setPickerOpen(false);
                }
              }}
              style={{
                position: 'absolute',
                width: 0,
                height: 0,
                padding: 0,
                border: 'none',
                visibility: 'hidden',
                pointerEvents: 'none',
              }}
            />

            {/* Store Filter */}
            <Select
              value={selectedStore}
              onChange={(val) => setSelectedStore(val)}
              style={{ width: 140 }}
              options={[
                { value: 'ALL', label: 'Tất cả tiệm' },
                { value: '1', label: 'Phan Xích Long' },
                { value: '2', label: 'Estella Place' },
                { value: '3', label: 'Đề Thám' },
              ]}
            />

            {/* Consultant Filter */}
            <Select
              value={selectedConsultant}
              onChange={(val) => setSelectedConsultant(val)}
              style={{ width: 180 }}
              options={[
                { value: 'ALL', label: 'Tất cả CC' },
                ...leaderboardData.map((s) => ({ value: s.displayName, label: s.displayName })),
              ]}
              placeholder="Chọn CC"
            />

            {/* Config Button (Admin Global Config) */}
            <Tooltip title="Cấu hình CC">
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => setConfigDrawerOpen(true)}
                style={{ background: '#D4A84B', borderColor: '#D4A84B', color: 'black', fontWeight: '500' }}
              />
            </Tooltip>
          </Space>
        }
      />

      {/* 4 MAIN TABS */}
      <Card
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: '12px 16px 16px 16px' } }}
        className="shadow-sm rounded-xl dashboard-main-tabs-card"
      >
        <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} size="large" destroyOnHidden />
      </Card>

      <CcConfigDrawer
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        onSaveSuccess={() => {
          setConfigDrawerOpen(false);
          fetchCcData();
        }}
      />
    </div>
  );
}
