'use client';

import React, { useState, useEffect } from 'react';
import { Card, DatePicker, Select, Radio, Tabs, Button, Typography, Space, theme, Tooltip } from 'antd';
import {
  CalendarOutlined,
  LeftOutlined,
  RightOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  GiftOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';
import { apiClient } from '../../../lib/api-client';
import { CvStaffOption, vietnameseSearchFilter } from '@mos-lab/shared';

dayjs.extend(isoWeek);

const CvXoayTab = dynamic(() => import('./components/CvXoayTab'), { ssr: false });
const CvTipTab = dynamic(() => import('./components/CvTipTab'), { ssr: false });
const CvThuNhapTab = dynamic(() => import('./components/CvThuNhapTab'), { ssr: false });
const CvConfigDrawer = dynamic(() => import('./components/CvConfigDrawer'), { ssr: false });

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function CvReportPage() {
  const { token } = theme.useToken();
  const [currentUser, setCurrentUser] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        try {
          setCurrentUser(JSON.parse(stored));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Filters State
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [referenceDate, setReferenceDate] = useState<Dayjs>(dayjs());
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [selectedStore, setSelectedStore] = useState<string>('ALL');
  const [selectedConsultant, setSelectedConsultant] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<string>('xoay');

  // Staff Config Drawer & Staff Options
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);
  const [staffOptions, setStaffOptions] = useState<CvStaffOption[]>([]);

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

  const fetchStaffConfig = async () => {
    try {
      const res = await apiClient.kpi.getCvConfig();
      if (res && res.allStaffOptions) {
        setStaffOptions(res.allStaffOptions);
      }
    } catch (err) {
      console.error('Error fetching CV staff options:', err);
    }
  };

  useEffect(() => {
    fetchStaffConfig();
  }, []);

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

  // Format label for period date button
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

  // Restore active tab from URL param or localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const savedTab = localStorage.getItem('cv_active_tab');
      const initialTab = tabParam || savedTab;

      if (initialTab && ['xoay', 'tip', 'thunhap'].includes(initialTab)) {
        setActiveTab(initialTab);
      }
    }
  }, []);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cv_active_tab', key);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', key);
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  return (
    <div>
      {/* Top Header & Filter Navigation */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <Title level={2} style={{ color: token.colorPrimary, margin: 0 }}>
            Báo Cáo CV (Chuyên Viên)
          </Title>
          <Text style={{ color: token.colorTextDescription }}>
            Theo dõi dữ liệu CV Xoay, bóc tách điểm thưởng ca, CV Tip và thu nhập live của chuyên viên
          </Text>
        </div>

        {/* TOP FILTER CONTROLS BAR (Matching Image Design) */}
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

            {/* Date Navigator: < Tháng 07/2026 > */}
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
                >
                  {getPeriodLabel()} <CalendarOutlined style={{ color: token.colorPrimary }} />
                </Button>
                {pickerOpen && (
                  <RangePicker
                    value={dateRange}
                    onChange={(dates) => {
                      if (dates && dates[0] && dates[1]) {
                        setDateRange([dates[0]!, dates[1]!]);
                        setPickerOpen(false);
                      }
                    }}
                    format="DD/MM/YYYY"
                    open={true}
                    onOpenChange={(open) => {
                      if (!open) setPickerOpen(false);
                    }}
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

            {/* Store Filter (Chi Nhánh) */}
            <Select
              value={selectedStore}
              onChange={setSelectedStore}
              style={{ width: 160 }}
              options={[
                { value: 'ALL', label: 'Tất cả chi nhánh' },
                { value: 'PXL', label: 'CN Phan Xích Long' },
                { value: 'NYC', label: 'CN Nguyễn Thị Thập' },
              ]}
              placeholder="Chọn Chi Nhánh"
            />

            {/* Consultant Filter (Chuyên Viên) */}
            <Select
              value={selectedConsultant}
              onChange={setSelectedConsultant}
              style={{ width: 170 }}
              showSearch
              filterOption={vietnameseSearchFilter}
              options={[
                { value: 'ALL', label: 'Tất cả CV' },
                ...staffOptions.map((s) => ({ value: String(s.staffId), label: s.displayName })),
              ]}
              placeholder="Chọn CV"
            />

            {/* Config Button (Gold Themed) */}
            <Tooltip title="Cấu hình CV">
              <Button
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => setConfigDrawerOpen(true)}
                style={{ background: '#D4A84B', borderColor: '#D4A84B', color: 'black', fontWeight: '500' }}
              />
            </Tooltip>
          </Space>
        </div>
      </div>

      {/* 3 MAIN TABS */}
      <Card
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: '12px 16px 16px 16px' } }}
        className="shadow-sm rounded-xl dashboard-main-tabs-card"
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          size="large"
          className="custom-report-tabs"
          destroyOnHidden
          items={[
            {
              key: 'xoay',
              icon: <ThunderboltOutlined />,
              label: 'CV Xoay',
              children:
                activeTab === 'xoay' ? (
                  <CvXoayTab
                    dateRange={dateRange}
                    selectedStore={selectedStore}
                    selectedConsultant={selectedConsultant}
                  />
                ) : null,
            },
            {
              key: 'tip',
              icon: <GiftOutlined />,
              label: 'CV Tip',
              children:
                activeTab === 'tip' ? (
                  <CvTipTab
                    dateRange={dateRange}
                    selectedStore={selectedStore}
                    selectedConsultant={selectedConsultant}
                  />
                ) : null,
            },
            {
              key: 'thunhap',
              icon: <WalletOutlined />,
              label: 'CV Thu Nhập',
              children:
                activeTab === 'thunhap' ? (
                  <CvThuNhapTab dateRange={dateRange} selectedStore={selectedStore} currentUser={currentUser} />
                ) : null,
            },
          ]}
        />
      </Card>

      {/* Global CV Config Drawer */}
      <CvConfigDrawer
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        onSaveSuccess={() => {
          fetchStaffConfig();
        }}
      />
    </div>
  );
}
