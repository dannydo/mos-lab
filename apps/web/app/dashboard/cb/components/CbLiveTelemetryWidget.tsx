'use client';

import React from 'react';
import { useTheme } from '~/context/ThemeContext';
import type {
  CbDailyViewMode,
  CbDrilldownCategory,
  CbLiveTelemetryWidgetProps,
  CbStoreScope,
} from './cb-live-telemetry-widget/cb-live-telemetry-types';
import { useCbLiveTelemetry } from './cb-live-telemetry-widget/useCbLiveTelemetry';
import { CbTelemetryErrorState, CbTelemetryLoadingState } from './cb-live-telemetry-widget/CbTelemetryStatusStates';
import { CbHeaderControlBar } from './cb-live-telemetry-widget/CbHeaderControlBar';
import { CbTopRevenueCards } from './cb-live-telemetry-widget/CbTopRevenueCards';
import { CbAttributionCard } from './cb-live-telemetry-widget/CbAttributionCard';
import { CbFunnelTelemetryRow } from './cb-live-telemetry-widget/CbFunnelTelemetryRow';
import { CbDailyAnalysisTableCard } from './cb-live-telemetry-widget/CbDailyAnalysisTableCard';
import { CbMonthlyForecastCard } from './cb-live-telemetry-widget/CbMonthlyForecastCard';
import { CbBottomStatusBar } from './cb-live-telemetry-widget/CbBottomStatusBar';
import { CbTargetConfigDrawer } from './cb-live-telemetry-widget/CbTargetConfigDrawer';
import { CbDrilldownDrawer } from './cb-live-telemetry-widget/CbDrilldownDrawer';

export type { CbLiveTelemetryWidgetProps, CbStoreScope, CbDrilldownCategory, CbDailyViewMode };

export default function CbLiveTelemetryWidget({ autoRefreshIntervalSec = 20 }: CbLiveTelemetryWidgetProps = {}) {
  useTheme();

  const {
    data,
    loading,
    error,
    isLive,
    setIsLive,
    selectedMonth,
    setSelectedMonth,
    storeScope,
    setStoreScope,
    secondsAgo,
    targetDrawerOpen,
    setTargetDrawerOpen,
    targetSaving,
    targetForm,
    drilldownDrawerOpen,
    setDrilldownDrawerOpen,
    drilldownLoading,
    drilldownItems,
    drilldownTitle,
    dailyViewMode,
    setDailyViewMode,
    displayedDailyRecords,
    dailyTotals,
    chartPoints,
    fetchTelemetry,
    handleOpenTargetConfig,
    handleSaveTargetConfig,
    handleOpenDrilldown,
  } = useCbLiveTelemetry(autoRefreshIntervalSec);

  if (loading && !data) {
    return <CbTelemetryLoadingState />;
  }

  if (error && !data) {
    return <CbTelemetryErrorState error={error} onRetry={fetchTelemetry} />;
  }

  if (!data) return null;

  const targets = data.targets;
  const isConfigured = targets.configured;
  const pacingStatus = data.meta.pacingStatus;
  const isFuturePeriod = data.meta.periodState === 'future';

  return (
    <div className="space-y-4">
      {/* 1. HEADER CONTROLLER BAR */}
      <CbHeaderControlBar
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        storeScope={storeScope}
        onSelectStoreScope={setStoreScope}
        isLive={isLive}
        onToggleLive={() => setIsLive(!isLive)}
        secondsAgo={secondsAgo}
        isFuturePeriod={isFuturePeriod}
        targets={targets}
        onOpenTargetConfig={handleOpenTargetConfig}
      />

      {/* 2. HÀNG 1: 4 TOP CARDS */}
      <CbTopRevenueCards
        revenue={data.revenue}
        targets={targets}
        isConfigured={isConfigured}
        onOpenDrilldown={handleOpenDrilldown}
      />

      {/* 2.5 CARD ĐỐI SOÁT NGUỒN DOANH SỐ GÓI */}
      {data.attribution && (
        <CbAttributionCard
          attribution={data.attribution}
          greenFunnel={data.greenFunnel}
          retention={data.retention}
          comboOrderCount={data.revenue.comboOrderCount}
        />
      )}

      {/* 3. HÀNG 2: NHỊP DOANH SỐ LŨY KẾ + VÒNG XANH + DÙNG GÓI */}
      <CbFunnelTelemetryRow
        chartPoints={chartPoints}
        isConfigured={isConfigured}
        revenue={data.revenue}
        targets={targets}
        greenFunnel={data.greenFunnel}
        retention={data.retention}
        onOpenDrilldown={handleOpenDrilldown}
      />

      {/* 4. HÀNG 3: PHÂN TÍCH THEO NGÀY + DỰ BÁO CHỐT THÁNG */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <CbDailyAnalysisTableCard
          records={displayedDailyRecords}
          totalDaysCount={data.daily.length}
          dailyTotals={dailyTotals}
          dailyViewMode={dailyViewMode}
          onChangeDailyViewMode={setDailyViewMode}
          isConfigured={isConfigured}
          totalAttainmentPercent={data.revenue.totalAttainmentPercent}
        />

        <CbMonthlyForecastCard
          forecast={data.forecast}
          totalSalesTarget={targets.totalSalesTarget}
          isConfigured={isConfigured}
        />
      </div>

      {/* 5. HÀNG 4: BOTTOM STATUS BAR */}
      <CbBottomStatusBar
        uniquePaxCount={data.retention.uniquePaxCount}
        totalDoneVisits={data.meta.totalDoneVisits}
        uniquePaxPerVisit={data.meta.uniquePaxPerVisit}
        pacingStatus={pacingStatus}
        isConfigured={isConfigured}
        dailyPlanPace={targets.dailyPlanPace}
        packageUsageDoneTarget={targets.packageUsageDoneTarget}
      />

      {/* DRAWER CẤU HÌNH MỤC TIÊU THÁNG */}
      <CbTargetConfigDrawer
        open={targetDrawerOpen}
        onClose={() => setTargetDrawerOpen(false)}
        form={targetForm}
        saving={targetSaving}
        onFinish={handleSaveTargetConfig}
        selectedMonth={selectedMonth}
        storeScope={storeScope}
        daysInMonth={targets.daysInMonth}
      />

      {/* DRAWER DRILLDOWN CHI TIẾT GIAO DỊCH */}
      <CbDrilldownDrawer
        open={drilldownDrawerOpen}
        onClose={() => setDrilldownDrawerOpen(false)}
        title={drilldownTitle}
        loading={drilldownLoading}
        items={drilldownItems}
      />
    </div>
  );
}
