'use client';

import '../../suppress-warnings';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Typography,
  Card,
  theme,
  DatePicker,
  Select,
  Radio,
  Space,
  Button,
  Tabs,
  Spin,
  message,
  Tooltip,
  Switch,
} from 'antd';
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
import { CcLeaderboardEntry, CcXoayRecord, vietnameseSearchFilter } from '@mos-lab/shared';

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
  const router = useRouter();

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cc_view_mode');
      if (saved && ['month', 'week', 'day'].includes(saved)) return saved as 'month' | 'week' | 'day';
    }
    return 'month';
  });

  const [referenceDate, setReferenceDate] = useState<Dayjs>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cc_reference_date');
      if (saved) {
        const parsed = dayjs(saved);
        if (parsed.isValid()) return parsed;
      }
    }
    return dayjs();
  });

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => {
    if (typeof window !== 'undefined') {
      const savedRef = localStorage.getItem('cc_reference_date');
      const savedMode = localStorage.getItem('cc_view_mode') as 'month' | 'week' | 'day' | null;
      const ref = savedRef && dayjs(savedRef).isValid() ? dayjs(savedRef) : dayjs();
      const mode = savedMode && ['month', 'week', 'day'].includes(savedMode) ? savedMode : 'month';

      if (mode === 'month') return [ref.startOf('month'), ref.endOf('month')];
      if (mode === 'week') return [ref.startOf('isoWeek'), ref.endOf('isoWeek')];
      return [ref.startOf('day'), ref.endOf('day')];
    }
    return [dayjs().startOf('month'), dayjs().endOf('month')];
  });

  const [pickerOpen, setPickerOpen] = useState(false);

  const [selectedStore, setSelectedStore] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cc_selected_store');
      if (saved) return saved;
    }
    return 'ALL';
  });

  const [selectedConsultant, setSelectedConsultant] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cc_selected_consultant');
      if (saved) return saved;
    }
    return 'ALL';
  });

  const [includeVat, setIncludeVat] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cc_include_vat');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const savedTab = localStorage.getItem('cc_active_tab');
      const initialTab = tabParam || savedTab;
      if (initialTab && ['xoay', 'thuong', 'game', 'tip', 'diamond', 'thunhap'].includes(initialTab)) {
        return initialTab;
      }
    }
    return 'thuong';
  });

  const [loading, setLoading] = useState(false);
  const [xoayData, setXoayData] = useState<CcXoayRecord[]>([]);
  const [xoayTotal, setXoayTotal] = useState(0);
  const [leaderboardData, setLeaderboardData] = useState<CcLeaderboardEntry[]>([]);

  // Sync state changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cc_active_tab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cc_view_mode', viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cc_reference_date', referenceDate.format('YYYY-MM-DD'));
    }
  }, [referenceDate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cc_selected_store', selectedStore);
    }
  }, [selectedStore]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cc_selected_consultant', selectedConsultant);
    }
  }, [selectedConsultant]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cc_include_vat', String(includeVat));
    }
  }, [includeVat]);

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
            includeVat={includeVat}
            onSelectConsultant={(ccName) => {
              setSelectedConsultant((prev) => (prev === ccName ? 'ALL' : ccName));
            }}
          />
        ) : null,
    },
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
              <Button
                aria-label="Xem theo tháng"
                type={viewMode === 'month' ? 'primary' : 'default'}
                onClick={() => setViewMode('month')}
              >
                Tháng
              </Button>
              <Button
                aria-label="Xem theo tuần"
                type={viewMode === 'week' ? 'primary' : 'default'}
                onClick={() => setViewMode('week')}
              >
                Tuần
              </Button>
              <Button
                aria-label="Xem theo ngày"
                type={viewMode === 'day' ? 'primary' : 'default'}
                onClick={() => setViewMode('day')}
              >
                Ngày
              </Button>
            </Space.Compact>

            {/* Date Navigation & Selector */}
            <Space
              size={0}
              className="border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden bg-white dark:bg-slate-900/50 shadow-sm"
            >
              <Button
                aria-label="Kỳ trước"
                type="text"
                icon={<LeftOutlined />}
                onClick={() => handleNavigate(-1)}
                className="text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400"
              />
              <Button
                aria-label={`Chọn khoảng thời gian ${getPeriodLabel()}`}
                type="text"
                icon={<CalendarOutlined />}
                onClick={() => setPickerOpen(true)}
                className="text-slate-800 dark:text-slate-200 font-medium hover:text-amber-600 dark:hover:text-amber-400"
              >
                {getPeriodLabel()}
              </Button>
              <Button
                aria-label="Kỳ sau"
                type="text"
                icon={<RightOutlined />}
                onClick={() => handleNavigate(1)}
                className="text-slate-700 dark:text-slate-200 hover:text-amber-600 dark:hover:text-amber-400"
              />
            </Space>

            {/* Hidden DatePicker */}
            {pickerOpen && (
              <DatePicker
                aria-label="Chọn ngày xem báo cáo"
                open={true}
                onOpenChange={(open) => {
                  if (!open) setPickerOpen(false);
                }}
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
            )}

            {/* Store Filter */}
            <Select
              aria-label="Lọc theo chi nhánh tiệm"
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
              aria-label="Lọc theo tư vấn viên CC"
              showSearch
              filterOption={vietnameseSearchFilter}
              value={selectedConsultant}
              onChange={(val) => setSelectedConsultant(val)}
              style={{ width: 180 }}
              options={[
                { value: 'ALL', label: 'Tất cả CC' },
                ...leaderboardData.map((s) => ({ value: s.displayName, label: s.displayName })),
              ]}
              placeholder="Chọn CC"
            />

            {/* VAT 8% Global Toggle Switch */}
            <div className="flex items-center gap-1.5 bg-slate-800/80 dark:bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/80 shadow-sm">
              <Text className="text-xs text-amber-400 font-semibold select-none">VAT 8%</Text>
              <Switch aria-label="Công tắc VAT 8%" checked={includeVat} onChange={setIncludeVat} size="small" />
            </div>

            {/* Config Button (Admin Global Config) */}
            <Tooltip title="Cấu hình CC">
              <Button
                aria-label="Cấu hình CC"
                type="primary"
                icon={<SettingOutlined />}
                onClick={() => router.push('/dashboard/staff/teams?selected=CC')}
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
    </div>
  );
}
