'use client';

import '../../suppress-warnings';
import React, { useState, useEffect } from 'react';
import { Typography, Card, theme, DatePicker, Select, Radio, Space, Button, Tabs, Spin, message } from 'antd';
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
import CcXoayTab from './components/CcXoayTab';
import CcThuongTab from './components/CcThuongTab';
import CcGameTab from './components/CcGameTab';
import CcTipTab from './components/CcTipTab';
import CcDiamondTab from './components/CcDiamondTab';
import CcThuNhapTab from './components/CcThuNhapTab';
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
      label: (
        <span>
          <TableOutlined /> CC Xoay
        </span>
      ),
      children: (
        <div>
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
      ),
    },
    {
      key: 'thuong',
      label: (
        <span>
          <GiftOutlined /> CC Daily Bonus
        </span>
      ),
      children: (
        <CcThuongTab
          loading={loading}
          dateRange={dateRange}
          selectedStore={selectedStore}
          selectedConsultant={selectedConsultant}
          onSelectConsultant={(ccName) => {
            setSelectedConsultant((prev) => (prev === ccName ? 'ALL' : ccName));
          }}
        />
      ),
    },
    {
      key: 'tip',
      label: (
        <span>
          <DollarOutlined /> CC Tip
        </span>
      ),
      children: (
        <CcTipTab
          loading={loading}
          dateRange={dateRange}
          selectedStore={selectedStore}
          selectedConsultant={selectedConsultant}
          onSelectConsultant={(ccName) => {
            setSelectedConsultant((prev) => (prev === ccName ? 'ALL' : ccName));
          }}
        />
      ),
    },
    {
      key: 'diamond',
      label: (
        <span>
          <SketchOutlined /> Kim Cương
        </span>
      ),
      children: (
        <CcDiamondTab dateRange={dateRange} selectedStore={selectedStore} selectedConsultant={selectedConsultant} />
      ),
    },
    {
      key: 'game',
      label: (
        <span>
          <RocketOutlined /> CC Game
        </span>
      ),
      children: <CcGameTab />,
    },
    {
      key: 'thunhap',
      label: (
        <span>
          <WalletOutlined /> CC Thu Nhập
        </span>
      ),
      children: <CcThuNhapTab dateRange={dateRange} selectedStore={selectedStore} />,
    },
  ];

  return (
    <div>
      {/* HEADER & GLOBAL FILTER BAR */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>
            Báo Cáo CC (Client Consultant)
          </Title>
          <Text style={{ color: token.colorTextDescription }}>
            Theo dõi dữ liệu CC Xoay, thưởng sản phẩm combo, gamification và thu nhập live của tư vấn viên
          </Text>
        </div>

        {/* TOP FILTER CONTROLS */}
        <div className="flex items-center gap-3 flex-wrap">
          <Space wrap>
            {/* View Mode Switcher: Tháng / Tuần / Ngày */}
            <Radio.Group
              value={viewMode}
              onChange={(e) => {
                setViewMode(e.target.value);
                setReferenceDate(dayjs());
              }}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="month">Tháng</Radio.Button>
              <Radio.Button value="week">Tuần</Radio.Button>
              <Radio.Button value="day">Ngày</Radio.Button>
            </Radio.Group>

            {/* Date Navigator: < Tháng 07/2026 > */}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <Space.Compact>
                <Button icon={<LeftOutlined />} onClick={() => handleNavigate(-1)} />
                <Button
                  onClick={() => setPickerOpen(true)}
                  style={{
                    fontWeight: '600',
                    minWidth: '200px',
                    textAlign: 'center',
                    color: token.colorText,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  {getPeriodLabel()} <CalendarOutlined style={{ color: token.colorPrimary }} />
                </Button>
                <Button icon={<RightOutlined />} onClick={() => handleNavigate(1)} />
              </Space.Compact>

              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates) setDateRange([dates[0]!, dates[1]!]);
                }}
                format="DD/MM/YYYY"
                open={pickerOpen}
                onOpenChange={(open) => setPickerOpen(open)}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: '100%',
                  opacity: 0,
                  pointerEvents: 'none',
                  zIndex: -1,
                }}
              />
            </div>

            {/* Store Filter (Chi Nhánh) */}
            <Select
              value={selectedStore}
              onChange={setSelectedStore}
              style={{ width: 140 }}
              options={[
                { value: 'ALL', label: 'Tất cả chi nhánh' },
                { value: 'PXL', label: 'CN Phan Xích Long' },
                { value: 'De Tham', label: 'CN Đề Thám' },
              ]}
              placeholder="Chọn Chi Nhánh"
            />

            {/* Consultant Filter (Tư Vấn Viên) */}
            <Select
              value={selectedConsultant}
              onChange={setSelectedConsultant}
              style={{ width: 170 }}
              options={[
                { value: 'ALL', label: 'Tất cả CC' },
                ...leaderboardData.map((s) => ({ value: s.displayName, label: s.displayName })),
              ]}
              placeholder="Chọn CC"
            />

            {/* Config Button (Admin Global Config) */}
            <Button
              type="primary"
              icon={<SettingOutlined />}
              onClick={() => setConfigDrawerOpen(true)}
              style={{ background: '#D4A84B', borderColor: '#D4A84B', color: 'black', fontWeight: '500' }}
            >
              Cấu hình CC
            </Button>
          </Space>
        </div>
      </div>

      {/* 4 MAIN TABS */}
      <Card
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        className="shadow-sm rounded-xl"
      >
        <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} size="large" />
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
