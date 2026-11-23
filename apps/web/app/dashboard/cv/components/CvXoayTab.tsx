'use client';

import { useMemo } from 'react';
import type { CvXoayRecord } from '@mos-lab/shared';
import { useTableConfig } from '~/hooks/useTableConfig';
import { CvXoayDetailTableCard } from './cv-xoay-tab/CvXoayDetailTableCard';
import { CvXoayLeaderboardCard } from './cv-xoay-tab/CvXoayLeaderboardCard';
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
    isMobile,
    previousPeriod,
    summary,
    previousSummary,
    leaderboard,
    forecast,
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
        isMobile={isMobile}
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
