'use client';

import { useMemo, useState } from 'react';
import type { CvXoayRecord } from '@mos-lab/shared';
import { CcMobileWalletStrip } from '~/app/dashboard/cc/components/CcMobileWalletStrip';
import { useTableConfig } from '~/hooks/useTableConfig';
import { formatCompactVND } from '~/lib/format-utils';
import { CvXoayDetailTableCard } from './cv-xoay-tab/CvXoayDetailTableCard';
import { CvXoayLeaderboardCard } from './cv-xoay-tab/CvXoayLeaderboardCard';
import { CvXoayMobileDetailSheet } from './cv-xoay-tab/CvXoayMobileDetailSheet';
import { CvXoaySummaryCards } from './cv-xoay-tab/CvXoaySummaryCards';
import { buildCvXoayDetailColumns } from './cv-xoay-tab/cvXoayColumns';
import { formatStoreCode, type CvLeaderboardRow, type CvXoayTabProps } from './cv-xoay-tab/cvXoayUtils';
import { useCvXoayData } from './cv-xoay-tab/useCvXoayData';

export { formatStoreCode };
export type { CvLeaderboardRow, CvXoayTabProps };

export default function CvXoayTab({
  loading: parentLoading,
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant = 'ALL',
  comparisonMode,
}: CvXoayTabProps) {
  const {
    loading,
    showMobilePortrait,
    previousPeriod,
    summary,
    previousSummary,
    leaderboard,
    forecast,
    allRecords,
    filteredData,
    searchText,
    setSearchText,
    isCompact,
    toggleCompact,
    pageSize,
    handlePageSizeChange,
    selectedCvName,
    toggleSelectedCvName,
    clearSelectedCvName,
    fetchData,
  } = useCvXoayData({
    dateRange,
    selectedStore,
    selectedConsultant,
    comparisonMode,
  });

  const [inspectedCv, setInspectedCv] = useState<CvLeaderboardRow | null>(null);
  const inspectedRecords = useMemo(() => {
    if (!inspectedCv) return [];
    const targetName = inspectedCv.techName.toLowerCase();
    return allRecords.filter((item) => item.techName.toLowerCase() === targetName);
  }, [allRecords, inspectedCv]);

  const staticColumns = useMemo(() => buildCvXoayDetailColumns(), []);

  const {
    loading: configLoading,
    columns: configuredColumns,
    rawConfig,
    configVisible,
    openConfig,
    closeConfig,
    saveConfig,
    resetConfig,
  } = useTableConfig<CvXoayRecord>('cv_xoay_table', staticColumns);

  if (showMobilePortrait) {
    const showMonthBonusForecast = forecast.isMonthMode && !forecast.isPastPeriod && forecast.projectedBonus > 0;
    return (
      <div className="flex flex-col gap-3">
        <CcMobileWalletStrip
          testId="cv-xoay-mobile-summary"
          ariaLabel="Tóm tắt CV Xoay"
          items={[
            {
              key: 'services',
              label: '∑ Bộ Mi',
              value: summary.totalServices.toLocaleString('vi-VN'),
              valueClassName: 'text-sky-600 dark:text-sky-400',
              subtext: `${leaderboard.length} CV`,
            },
            {
              key: 'points',
              label: '∑ Điểm Xoay',
              value: `+${summary.totalPoints.toLocaleString('vi-VN')}`,
              valueClassName: 'text-emerald-600 dark:text-emerald-400',
              subtext:
                !forecast.isDayMode && !forecast.isPastPeriod && forecast.projectedPoints > 0
                  ? `~${forecast.projectedPoints.toLocaleString('vi-VN')}`
                  : 'Trong kỳ',
            },
            {
              key: 'bonus',
              label: '∑ Thưởng Xoay',
              value: formatCompactVND(summary.totalBonus || 0),
              valueClassName: 'text-amber-600 dark:text-amber-400',
              subtext: showMonthBonusForecast ? `~${formatCompactVND(forecast.projectedBonus)}` : undefined,
            },
          ]}
        />

        <CvXoayLeaderboardCard
          leaderboard={leaderboard}
          loading={Boolean(loading || parentLoading)}
          isMobile
          selectedCvName={selectedCvName}
          searchText={searchText}
          forecast={forecast}
          onToggleSelectedCv={toggleSelectedCvName}
          onClearSelectedCv={clearSelectedCvName}
          onInspectCvMobile={setInspectedCv}
          onSearchTextChange={setSearchText}
        />

        <CvXoayMobileDetailSheet
          open={Boolean(inspectedCv)}
          onClose={() => setInspectedCv(null)}
          row={inspectedCv}
          records={inspectedRecords}
          forecast={forecast}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <CvXoaySummaryCards
        summary={summary}
        previousSummary={previousSummary}
        comparison={previousPeriod?.comparison}
        forecast={forecast}
      />

      <CvXoayLeaderboardCard
        leaderboard={leaderboard}
        loading={Boolean(loading || parentLoading)}
        isMobile={false}
        selectedCvName={selectedCvName}
        searchText={searchText}
        forecast={forecast}
        onToggleSelectedCv={toggleSelectedCvName}
        onClearSelectedCv={clearSelectedCvName}
      />

      <CvXoayDetailTableCard
        records={filteredData}
        columns={configuredColumns}
        loading={Boolean(loading || parentLoading || configLoading)}
        refreshLoading={loading}
        selectedCvName={selectedCvName}
        searchText={searchText}
        isCompact={isCompact}
        pageSize={pageSize}
        configVisible={configVisible}
        rawConfig={rawConfig}
        onSearchChange={setSearchText}
        onToggleCompact={toggleCompact}
        onRefresh={fetchData}
        onOpenConfig={openConfig}
        onCloseConfig={closeConfig}
        onSaveConfig={saveConfig}
        onResetConfig={resetConfig}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
