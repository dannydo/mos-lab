'use client';

import '../../suppress-warnings';
import React from 'react';
import { message, Tabs, theme } from 'antd';
import { History, PieChart, ShieldCheck } from 'lucide-react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';
import { AppIcon, PageHeader, PageToolbar, ReportPeriodNavigator, StatePanel } from '~/components/ui';
import { useTheme } from '~/context/ThemeContext';
import { getPercent } from '~/lib/format-utils';
import { getLeaderboardColumns } from './components/KpiColumns';
import { useKpiData } from './hooks/useKpiData';
import { KpiOverviewTabContent } from './kpi-page-modules/KpiOverviewTabContent';
import { KpiToolbarActions } from './kpi-page-modules/KpiToolbarActions';

const KpiTrendsChart = dynamic(() => import('./components/KpiTrendsChart'), {
  ssr: false,
  loading: () => <StatePanel kind="loading" surface={false} minHeight={240} />,
});
const SalaryConfigDrawer = dynamic(() => import('./components/SalaryConfigDrawer'), { ssr: false });
const AppointmentsAuditDrawer = dynamic(() => import('./components/AppointmentsAuditDrawer'), { ssr: false });
const PackageAuditTab = dynamic(() => import('./components/PackageAuditTab').then((m) => m.PackageAuditTab), {
  ssr: false,
  loading: () => (
    <div className="p-8 text-center">
      <StatePanel kind="loading" surface={false} minHeight={160} />
    </div>
  ),
});
const BookingAuditLogReportTab = dynamic(
  () => import('./components/BookingAuditLogReportTab').then((m) => m.BookingAuditLogReportTab),
  { ssr: false }
);

dayjs.extend(isoWeek);

export default function KPIPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  const {
    currentUser,
    viewMode,
    setViewMode,
    referenceDate,
    dateRange,
    setDateRange,
    selectedBookerId,
    selectedBookerName,
    selectedStaffRecord,
    appointmentsDrawerOpen,
    setAppointmentsDrawerOpen,
    selectedStaffId,
    setSelectedStaffId,
    selectedRole,
    setSelectedRole,
    loading,
    summary,
    breakdown,
    trends,
    leaderboard,
    configDrawerOpen,
    setConfigDrawerOpen,
    fetchKpiData,
    handleShowAppointments,
    getPeriodLabel,
    handleNavigate,
  } = useKpiData({
    onSuccess: (msg) => message.success(msg),
    onError: (msg) => message.error(msg),
  });

  const isAdmin = currentUser?.role === 'admin';

  const leaderboardColumns = React.useMemo(
    () =>
      getLeaderboardColumns({
        selectedRole,
        token,
        handleShowAppointments,
        getPercent,
      }),
    [selectedRole, token, handleShowAppointments]
  );

  return (
    <div className="responsive-page responsive-workspace kpi-page">
      <PageHeader
        title="KPI & Báo Cáo Hiệu Suất"
        subtitle="Giám sát tỷ lệ chuyển đổi cuộc gọi thành lịch hẹn và doanh thu thưởng commission"
      />

      <PageToolbar
        className="kpi-page-toolbar"
        primary={
          <ReportPeriodNavigator
            mode={viewMode}
            value={referenceDate}
            label={getPeriodLabel()}
            onModeChange={setViewMode}
            onPrevious={() => handleNavigate(-1)}
            onNext={() => handleNavigate(1)}
            rangeValue={dateRange}
            onRangeChange={setDateRange}
          />
        }
        actions={
          isAdmin ? (
            <KpiToolbarActions
              selectedRole={selectedRole}
              onRoleChange={setSelectedRole}
              selectedStaffId={selectedStaffId}
              onStaffChange={setSelectedStaffId}
              leaderboard={leaderboard}
              onOpenConfig={() => setConfigDrawerOpen(true)}
            />
          ) : undefined
        }
      />

      {loading ? (
        <div className="py-12">
          <StatePanel kind="loading" title="Đang tải dữ liệu báo cáo..." minHeight={300} surface={false} />
        </div>
      ) : (
        <Tabs
          defaultActiveKey="kpi"
          items={[
            {
              key: 'kpi',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon icon={PieChart} size="sm" />
                  Báo cáo KPI &amp; Leaderboard
                </span>
              ),
              children: (
                <KpiOverviewTabContent
                  summary={summary}
                  breakdown={breakdown}
                  trendsSlot={<KpiTrendsChart trends={trends} />}
                  isAdmin={isAdmin}
                  leaderboard={leaderboard}
                  leaderboardColumns={leaderboardColumns}
                  selectedRole={selectedRole}
                  token={token}
                />
              ),
            },
            {
              key: 'package-audit',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon icon={ShieldCheck} size="sm" />
                  Kiểm toán Gói Thủ công
                </span>
              ),
              children: <PackageAuditTab />,
            },
            {
              key: 'booking-audit',
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon icon={History} size="sm" />
                  Nhật Ký Hủy &amp; Dời Lịch
                </span>
              ),
              children: <BookingAuditLogReportTab />,
            },
          ]}
        />
      )}

      <SalaryConfigDrawer
        open={configDrawerOpen}
        onClose={() => setConfigDrawerOpen(false)}
        onSaveSuccess={() => {
          setConfigDrawerOpen(false);
          fetchKpiData();
        }}
      />

      <AppointmentsAuditDrawer
        open={appointmentsDrawerOpen}
        onClose={() => setAppointmentsDrawerOpen(false)}
        selectedBookerId={selectedBookerId}
        selectedBookerName={selectedBookerName}
        selectedStaffRecord={selectedStaffRecord}
        dateRange={dateRange}
        themeMode={themeMode}
      />
    </div>
  );
}
