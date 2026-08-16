'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Select, Tabs, Tooltip, theme } from 'antd';
import { WalletOutlined, DashboardOutlined, MoneyCollectOutlined, SyncOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';
import { apiClient } from '../../../lib/api-client';
import { CvStaffOption, vietnameseSearchFilter } from '@mos-lab/shared';
import {
  PageHeader,
  PageToolbar,
  ReportPeriodNavigator,
  TableSettingsTrigger,
  ToolbarFilterDisclosure,
} from '../../../components/ui';

dayjs.extend(isoWeek);

const CvXoayTab = dynamic(() => import('./components/CvXoayTab'), { ssr: false });
const CvTipTab = dynamic(() => import('./components/CvTipTab'), { ssr: false });
const CvThuNhapTab = dynamic(() => import('./components/CvThuNhapTab'), { ssr: false });
const CvConfigDrawer = dynamic(() => import('./components/CvConfigDrawer'), { ssr: false });
const CvSpeedTab = dynamic(() => import('./components/cv-speed/CvSpeedTab').then((m) => ({ default: m.CvSpeedTab })), {
  ssr: false,
});

function CvTabLabel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <span className="cv-dashboard-tab-label">
      <Tooltip title={title}>{icon}</Tooltip>
      <span>{children}</span>
    </span>
  );
}

export default function CvReportPage() {
  const { token } = theme.useToken();
  const router = useRouter();
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

  // Persistent Filters State
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cv_view_mode');
      if (saved && ['month', 'week', 'day'].includes(saved)) {
        return saved as 'month' | 'week' | 'day';
      }
    }
    return 'month';
  });

  const [referenceDate, setReferenceDate] = useState<Dayjs>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cv_reference_date');
      if (saved) {
        const parsed = dayjs(saved);
        if (parsed.isValid()) return parsed;
      }
    }
    return dayjs();
  });

  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>(() => {
    if (typeof window !== 'undefined') {
      const savedRef = localStorage.getItem('cv_reference_date');
      const savedMode = localStorage.getItem('cv_view_mode') as 'month' | 'week' | 'day' | null;
      const ref = savedRef && dayjs(savedRef).isValid() ? dayjs(savedRef) : dayjs();
      const mode = savedMode && ['month', 'week', 'day'].includes(savedMode) ? savedMode : 'month';

      if (mode === 'month') return [ref.startOf('month'), ref.endOf('month')];
      if (mode === 'week') return [ref.startOf('isoWeek'), ref.endOf('isoWeek')];
      return [ref.startOf('day'), ref.endOf('day')];
    }
    return [dayjs().startOf('month'), dayjs().endOf('month')];
  });

  const [selectedStore, setSelectedStore] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cv_selected_store');
      if (saved) return saved;
    }
    return 'ALL';
  });

  const [selectedConsultant, setSelectedConsultant] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cv_selected_consultant');
      if (saved) return saved;
    }
    return 'ALL';
  });
  const activeCvFilterCount = Number(selectedStore !== 'ALL') + Number(selectedConsultant !== 'ALL');

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      const savedTab = localStorage.getItem('cv_active_tab');
      const initialTab = tabParam || savedTab;

      if (initialTab && ['xoay', 'tip', 'thunhap', 'speed'].includes(initialTab)) {
        return initialTab;
      }
    }
    return 'xoay';
  });

  // Staff Config & Staff Options
  const [staffOptions, setStaffOptions] = useState<CvStaffOption[]>([]);

  // Sync state changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cv_active_tab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cv_view_mode', viewMode);
    }
  }, [viewMode]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cv_reference_date', referenceDate.format('YYYY-MM-DD'));
    }
  }, [referenceDate]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cv_selected_store', selectedStore);
    }
  }, [selectedStore]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('cv_selected_consultant', selectedConsultant);
    }
  }, [selectedConsultant]);

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
    <div className="responsive-page responsive-workspace cv-page">
      <PageHeader
        title="CV Leaderboard"
        subtitle="Theo dõi dữ liệu CV Xoay, bóc tách điểm thưởng ca, CV Tip và thu nhập live của chuyên viên"
      />

      <PageToolbar
        className="cv-page-toolbar"
        primary={
          <ReportPeriodNavigator
            mode={viewMode}
            value={referenceDate}
            label={getPeriodLabel()}
            onModeChange={setViewMode}
            onPrevious={() => handleNavigate(-1)}
            onNext={() => handleNavigate(1)}
            onValueChange={setReferenceDate}
            rangeValue={dateRange}
            onRangeChange={setDateRange}
          />
        }
        actions={
          <>
            <ToolbarFilterDisclosure title="Bộ lọc CV" triggerLabel="Mở bộ lọc CV" activeCount={activeCvFilterCount}>
              <Select
                aria-label="Lọc theo chi nhánh"
                value={selectedStore}
                onChange={setSelectedStore}
                style={{ width: 160 }}
                options={[
                  { value: 'ALL', label: 'Tất cả chi nhánh' },
                  { value: '6', label: 'Đề Thám' },
                  { value: '16', label: 'Estella Place' },
                ]}
                placeholder="Chọn chi nhánh"
              />
              <Select
                aria-label="Lọc theo chuyên viên"
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
            </ToolbarFilterDisclosure>
            <TableSettingsTrigger
              title="Cấu hình CV"
              onClick={() => router.push('/dashboard/staff/teams?selected=CV')}
              className="!border-[#D4A84B] !text-[#D4A84B] hover:!border-[#e7bd61] hover:!text-[#e7bd61]"
            />
          </>
        }
      />

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
              label: (
                <CvTabLabel title="CV Xoay" icon={<SyncOutlined />}>
                  Xoay
                </CvTabLabel>
              ),
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
              label: (
                <CvTabLabel title="CV Tip" icon={<MoneyCollectOutlined />}>
                  Tip
                </CvTabLabel>
              ),
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
              label: (
                <CvTabLabel title="Thu nhập CV" icon={<WalletOutlined />}>
                  Thu Nhập
                </CvTabLabel>
              ),
              children:
                activeTab === 'thunhap' ? (
                  <CvThuNhapTab dateRange={dateRange} selectedStore={selectedStore} currentUser={currentUser} />
                ) : null,
            },
            {
              key: 'speed',
              label: (
                <CvTabLabel title="Tốc độ CV" icon={<DashboardOutlined />}>
                  Tốc Độ
                </CvTabLabel>
              ),
              children: activeTab === 'speed' ? <CvSpeedTab /> : null,
            },
          ]}
        />
      </Card>
    </div>
  );
}
