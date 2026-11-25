'use client';

import React, { useMemo, useState } from 'react';
import type { CcTipLeaderboardEntry } from '@mos-lab/shared';
import { formatCompactVND } from '~/lib/format-utils';
import { CcMobileWalletStrip } from './CcMobileWalletStrip';
import { CcTipDetailSection } from './cc-tip-tab/CcTipDetailSection';
import { CcTipLeaderboardSection } from './cc-tip-tab/CcTipLeaderboardSection';
import { CcTipMobileDetailSheet } from './cc-tip-tab/CcTipMobileDetailSheet';
import { CcTipSummaryCards } from './cc-tip-tab/CcTipSummaryCards';
import type { CcTipTabProps } from './cc-tip-tab/cc-tip-utils';
import { useCcTipData } from './cc-tip-tab/useCcTipData';
import { useCcMobilePortrait } from './useCcMobilePortrait';

export type { CcTipTabProps };

export default function CcTipTab({
  loading: parentLoading,
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant: parentSelectedConsultant,
  comparisonMode = 'month',
  onSelectConsultant: parentOnSelectConsultant,
}: CcTipTabProps) {
  const { showMobilePortrait } = useCcMobilePortrait();
  const [mobileDetailConsultant, setMobileDetailConsultant] = useState<CcTipLeaderboardEntry | null>(null);

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
  const showForecast = !isDayMode && !isPastPeriod;

  const mobileConsultantRecords = useMemo(() => {
    if (!mobileDetailConsultant) return [];
    return records.filter(
      (rec) =>
        rec.ccInName === mobileDetailConsultant.displayName ||
        rec.ccOutName === mobileDetailConsultant.displayName ||
        rec.consultantName === mobileDetailConsultant.displayName
    );
  }, [records, mobileDetailConsultant]);

  return (
    <div className={showMobilePortrait ? 'flex flex-col gap-3' : 'flex flex-col gap-4'}>
      {showMobilePortrait ? (
        <CcMobileWalletStrip
          testId="cc-tip-mobile-summary"
          ariaLabel="Tóm tắt thưởng Tip đội CC"
          items={[
            {
              key: 'rate',
              label: '% Tip đội',
              value: `${summary.avgTipRatePercent || 0}%`,
              valueClassName: 'text-cyan-600 dark:text-cyan-400',
              subtext: `${summary.totalTippedVisits || 0}/${summary.totalVisits || 0} lượt`,
            },
            {
              key: 'customerTip',
              label: 'Tip KH',
              value: formatCompactVND(summary.totalCustomerTip || 0),
              valueClassName: 'text-amber-600 dark:text-amber-400',
              subtext: showForecast ? `~${formatCompactVND(projectedTotalCustomerTip)}` : 'Khách tip',
            },
            {
              key: 'ccBonus',
              label: '∑ Thưởng CC',
              value: formatCompactVND(summary.totalCcTipBonus || 0),
              valueClassName: 'text-emerald-600 dark:text-emerald-400',
              subtext: showForecast ? `~${formatCompactVND(projectedTotalCcTipBonus)}` : 'Tip Bonus',
            },
          ]}
        />
      ) : (
        <CcTipSummaryCards
          summary={summary}
          projectedTotalCcTipBonus={projectedTotalCcTipBonus}
          projectedTotalCustomerTip={projectedTotalCustomerTip}
          isDayMode={isDayMode}
          isPastPeriod={isPastPeriod}
          periodNoun={periodNoun}
          elapsedRatioPercent={elapsedRatioPercent}
        />
      )}

      <CcTipLeaderboardSection
        leaderboard={leaderboard}
        loading={combinedLoading}
        isMobile={showMobilePortrait}
        selectedCcName={selectedCcName}
        onSelectConsultant={toggleConsultantSelection}
        onClearSelectedConsultant={clearSelectedConsultant}
        onInspectConsultantMobile={(entry) => setMobileDetailConsultant(entry)}
        isDayMode={isDayMode}
        isPastPeriod={isPastPeriod}
        ratio={ratio}
      />

      {!showMobilePortrait && (
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
      )}

      <CcTipMobileDetailSheet
        open={Boolean(mobileDetailConsultant)}
        onClose={() => setMobileDetailConsultant(null)}
        consultant={mobileDetailConsultant}
        records={mobileConsultantRecords}
      />
    </div>
  );
}
