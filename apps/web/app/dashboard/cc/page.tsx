'use client';

import '../../suppress-warnings';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Typography, Card, theme, Tabs, Spin, message, Dropdown } from 'antd';
import {
  AccountBookOutlined,
  DollarCircleOutlined,
  MoneyCollectOutlined,
  SketchOutlined,
  SyncOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';
import { apiClient } from '../../../lib/api-client';
import { CcLeaderboardEntry, CcXoayRecord } from '@mos-lab/shared';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';

import CcLeaderboardCard from './components/CcLeaderboardCard';
import { ReportPage, ReportPeriodNavigator, TableSettingsTrigger, ToolbarToggle } from '../../../components/ui';

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
const CcThuongConfigModal = dynamic(() => import('./components/CcThuongConfigModal'), { ssr: false });

dayjs.extend(isoWeek);

const { Text } = Typography;

function CcTabLabel({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="cc-dashboard-tab-label">
      {icon}
      <span>{children}</span>
    </span>
  );
}

export default function CcDashboardPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const router = useRouter();
  const responsiveTier = useResponsiveTier();

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
  const [ccBonusConfigOpen, setCcBonusConfigOpen] = useState(false);
  const [ccBonusConfigVersion, setCcBonusConfigVersion] = useState(0);

  // CC reports are intentionally cross-store. Keep the scope explicit so a
  // stale local preference can never apply an invisible store filter.
  const selectedStore = 'ALL';

  // A CC can still be selected from an in-context leaderboard drill-down,
  // but the report no longer restores or exposes a global CC filter.
  const [selectedConsultant, setSelectedConsultant] = useState('ALL');

  const [includeVat, setIncludeVat] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cc_include_vat');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const activeCcFilterCount = Number(selectedConsultant !== 'ALL');

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
  }, [dateRange, selectedConsultant]);

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
      label: <CcTabLabel icon={<DollarCircleOutlined />}>Daily Bonus</CcTabLabel>,
      children:
        activeTab === 'thuong' ? (
          <CcThuongTab
            loading={loading}
            dateRange={dateRange}
            selectedStore={selectedStore}
            selectedConsultant={selectedConsultant}
            includeVat={includeVat}
            refreshKey={ccBonusConfigVersion}
            onSelectConsultant={(ccName) => {
              setSelectedConsultant((prev) => (prev === ccName ? 'ALL' : ccName));
            }}
          />
        ) : null,
    },
    {
      key: 'xoay',
      label: <CcTabLabel icon={<SyncOutlined />}>Xoay</CcTabLabel>,
      children:
        activeTab === 'xoay' ? (
          <div className={`flex flex-col cc-xoay-tab-stack ${responsiveTier === 'mobile' ? 'gap-2' : 'gap-4'}`}>
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
      label: <CcTabLabel icon={<MoneyCollectOutlined />}>Tip</CcTabLabel>,
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
      label: <CcTabLabel icon={<SketchOutlined />}>Kim Cương</CcTabLabel>,
      children:
        activeTab === 'diamond' ? (
          <CcDiamondTab
            dateRange={dateRange}
            selectedStore={selectedStore}
            selectedConsultant={selectedConsultant}
            onClearConsultant={() => setSelectedConsultant('ALL')}
          />
        ) : null,
    },
    {
      key: 'game',
      label: <CcTabLabel icon={<TrophyOutlined />}>Game</CcTabLabel>,
      children: activeTab === 'game' ? <CcGameTab /> : null,
    },
    {
      key: 'thunhap',
      label: <CcTabLabel icon={<AccountBookOutlined />}>Thu Nhập</CcTabLabel>,
      children: activeTab === 'thunhap' ? <CcThuNhapTab dateRange={dateRange} selectedStore={selectedStore} /> : null,
    },
  ];

  return (
    <ReportPage
      className="cc-page"
      title="CC Leaderboard"
      subtitle="Theo dõi hiệu suất, thưởng và thu nhập của CC"
      toolbarClassName="cc-page-toolbar"
      period={{
        mode: viewMode,
        value: referenceDate,
        label: getPeriodLabel(),
        onModeChange: setViewMode,
        onPrevious: () => handleNavigate(-1),
        onNext: () => handleNavigate(1),
        onValueChange: setReferenceDate,
      }}
      filterTitle="Bộ lọc CC"
      filterTriggerLabel="Mở bộ lọc CC"
      activeFilterCount={activeCcFilterCount}
      filters={
        <div className="cc-toolbar-filter-cluster" aria-label="Bộ lọc báo cáo CC">
          <ToolbarToggle
            label="VAT 8%"
            aria-label="Công tắc VAT 8%"
            checked={includeVat}
            onChange={setIncludeVat}
            className="cc-toolbar-vat-toggle text-amber-500 dark:text-amber-300"
          />
        </div>
      }
      toolbarActions={
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'bonus', label: 'Cấu hình thưởng CC' },
              { key: 'team', label: 'Quản lý nhân sự CC' },
            ],
            onClick: ({ key }) => {
              if (key === 'bonus') setCcBonusConfigOpen(true);
              if (key === 'team') router.push('/dashboard/staff/teams?selected=CC');
            },
          }}
        >
          <span>
            <TableSettingsTrigger
              title="Cấu hình CC"
              data-ui="cc-settings-trigger"
              className="!border-[#D4A84B] !text-[#D4A84B] hover:!border-[#e7bd61] hover:!text-[#e7bd61]"
            />
          </span>
        </Dropdown>
      }
    >
      {/* 4 MAIN TABS */}
      <Card
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: '12px 16px 16px 16px' } }}
        className="shadow-sm rounded-xl dashboard-main-tabs-card"
      >
        <Tabs activeKey={activeTab} onChange={handleTabChange} items={tabItems} size="large" destroyOnHidden />
      </Card>

      <CcThuongConfigModal
        open={ccBonusConfigOpen}
        onClose={() => setCcBonusConfigOpen(false)}
        onSaveSuccess={() => setCcBonusConfigVersion((version) => version + 1)}
      />
    </ReportPage>
  );
}
