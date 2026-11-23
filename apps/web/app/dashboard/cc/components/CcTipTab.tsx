'use client';

import React from 'react';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import { CcTipDetailSection } from './cc-tip-tab/CcTipDetailSection';
import { CcTipLeaderboardSection } from './cc-tip-tab/CcTipLeaderboardSection';
import { CcTipSummaryCards } from './cc-tip-tab/CcTipSummaryCards';
import type { CcTipTabProps } from './cc-tip-tab/cc-tip-utils';
import { useCcTipData } from './cc-tip-tab/useCcTipData';

export type { CcTipTabProps };

export default function CcTipTab({
  loading: parentLoading,
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant: parentSelectedConsultant,
  comparisonMode = 'month',
  onSelectConsultant: parentOnSelectConsultant,
}: CcTipTabProps) {
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';

  const {
    loading,
    leaderboard,
    records,
    summary,
    selectedCcName,
    toggleConsultantSelection,
    clearSelectedConsultant,
    tipFilter,
    setTipFilter,
    searchText,
    setSearchText,
    isCompact,
    toggleCompact,
    fetchTipData,
    elapsedRatioPercent,
    isPastPeriod,
    isDayMode,
    periodNoun,
    ratio,
    projectedTotalCcTipBonus,
    projectedTotalCustomerTip,
    filteredRecords,
    totalTippedCount,
    totalSmallChangeCount,
    totalNoTipCount,
  } = useCcTipData({
    dateRange,
    selectedStore,
    selectedConsultant: parentSelectedConsultant,
    comparisonMode,
    onSelectConsultant: parentOnSelectConsultant,
  });

  const combinedLoading = Boolean(loading || parentLoading);

  return (
    <div className="flex flex-col gap-4">
      <CcTipSummaryCards
        summary={summary}
        projectedTotalCcTipBonus={projectedTotalCcTipBonus}
        projectedTotalCustomerTip={projectedTotalCustomerTip}
        isDayMode={isDayMode}
        isPastPeriod={isPastPeriod}
        periodNoun={periodNoun}
        elapsedRatioPercent={elapsedRatioPercent}
      />

      <CcTipLeaderboardSection
        leaderboard={leaderboard}
        loading={combinedLoading}
        isMobile={isMobile}
        selectedCcName={selectedCcName}
        onSelectConsultant={toggleConsultantSelection}
        onClearSelectedConsultant={clearSelectedConsultant}
        isDayMode={isDayMode}
        isPastPeriod={isPastPeriod}
        ratio={ratio}
      />

      <CcTipDetailSection
        records={filteredRecords}
        totalCount={records.length}
        totalTippedCount={totalTippedCount}
        totalSmallChangeCount={totalSmallChangeCount}
        totalNoTipCount={totalNoTipCount}
        selectedCcName={selectedCcName}
        tipFilter={tipFilter}
        onTipFilterChange={setTipFilter}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        isCompact={isCompact}
        onToggleCompact={toggleCompact}
        onRefresh={fetchTipData}
        loading={combinedLoading}
        fetching={loading}
      />
    </div>
  );
}
