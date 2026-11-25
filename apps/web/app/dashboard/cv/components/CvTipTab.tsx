'use client';

import { useState } from 'react';
import type { CvTipLeaderboardEntry } from '@mos-lab/shared';
import { CcMobileWalletStrip } from '~/app/dashboard/cc/components/CcMobileWalletStrip';
import { formatCompactVND } from '~/lib/format-utils';
import { CvTipDetailTableCard } from './cv-tip-tab/CvTipDetailTableCard';
import { CvTipHistoryModals } from './cv-tip-tab/CvTipHistoryModals';
import { CvTipLeaderboardCard } from './cv-tip-tab/CvTipLeaderboardCard';
import { CvTipMobileDetailSheet } from './cv-tip-tab/CvTipMobileDetailSheet';
import { CvTipSummaryCards } from './cv-tip-tab/CvTipSummaryCards';
import { formatStoreCode, type CvTipForecast, type CvTipSummary, type CvTipTabProps } from './cv-tip-tab/cvTipUtils';
import { useCvTipData } from './cv-tip-tab/useCvTipData';
import { useCvTipHistoryModals } from './cv-tip-tab/useCvTipHistoryModals';

export { formatStoreCode };
export type { CvTipForecast, CvTipSummary, CvTipTabProps };

export default function CvTipTab({
  loading: parentLoading,
  dateRange,
  selectedStore = 'ALL',
  selectedConsultant: parentSelectedConsultant,
  onSelectConsultant,
  comparisonMode,
}: CvTipTabProps) {
  const {
    isMobile,
    showMobilePortrait,
    previousPeriod,
    loading,
    leaderboard,
    records,
    totalRecords,
    selectedCvName,
    tipFilter,
    searchText,
    isCompact,
    summary,
    previousSummary,
    forecast,
    pageSize,
    currentPage,
    handleSelectCv,
    handleTipFilterChange,
    handleSearchChange,
    handlePageChange,
    toggleCompact,
    fetchData,
  } = useCvTipData({
    dateRange,
    selectedStore,
    selectedConsultant: parentSelectedConsultant,
    onSelectConsultant,
    comparisonMode,
  });

  const [inspectedEntry, setInspectedEntry] = useState<CvTipLeaderboardEntry | null>(null);

  const {
    tipHistoryOpen,
    tipHistoryLoading,
    tipHistoryFilter,
    tipHistoryRecords,
    visibleTipHistoryRecords,
    setTipHistoryFilter,
    openTipHistory,
    closeTipHistory,
    customerHistoryOpen,
    customerHistoryLoading,
    customerHistoryName,
    customerHistoryRecords,
    customerHistoryFilter,
    visibleCustomerHistoryRecords,
    setCustomerHistoryFilter,
    openCustomerHistory,
    closeCustomerHistory,
  } = useCvTipHistoryModals({
    dateRange,
    selectedStore,
    selectedCvName,
    parentSelectedConsultant,
  });

  return (
    <div className={`flex flex-col ${showMobilePortrait ? 'gap-3' : 'gap-4'}`}>
      {showMobilePortrait ? (
        <>
          <CcMobileWalletStrip
            testId="cv-tip-mobile-summary"
            ariaLabel="Tóm tắt CV Tip"
            items={[
              {
                key: 'bonus',
                label: '∑ Thưởng Tip',
                value: `+${formatCompactVND(summary.totalCvTipBonus || 0)}`,
                valueClassName: 'text-amber-600 dark:text-amber-400',
                subtext: `Tip KH ${formatCompactVND(summary.totalCustomerTip || 0)}`,
              },
              {
                key: 'rate',
                label: '% Tip',
                value: `${summary.avgTipRatePercent || 0}%`,
                valueClassName: 'text-cyan-600 dark:text-cyan-400',
                subtext: 'Tỷ lệ chốt tip',
              },
              {
                key: 'visits',
                label: 'Lượt Tip',
                value: (
                  <button
                    type="button"
                    onClick={openTipHistory}
                    className="text-left text-inherit font-inherit p-0 bg-transparent border-0 cursor-pointer underline decoration-dotted underline-offset-2"
                    aria-label={`Xem ${summary.totalTippedVisits} lượt khách đã tip và không tip`}
                  >
                    {summary.totalTippedVisits}/{summary.totalVisits}
                  </button>
                ),
                valueClassName: 'text-sky-600 dark:text-sky-400',
                subtext: 'Chạm xem lịch sử',
              },
            ]}
          />

          <CvTipLeaderboardCard
            leaderboard={leaderboard}
            loading={Boolean(loading || parentLoading)}
            isMobile
            selectedCvName={selectedCvName}
            forecast={forecast}
            onSelectCv={handleSelectCv}
            onInspectCvMobile={setInspectedEntry}
          />

          <CvTipMobileDetailSheet
            open={Boolean(inspectedEntry)}
            onClose={() => setInspectedEntry(null)}
            entry={inspectedEntry}
            dateRange={dateRange}
            selectedStore={selectedStore}
            onOpenCustomerHistory={openCustomerHistory}
          />
        </>
      ) : (
        <>
          <CvTipSummaryCards
            summary={summary}
            previousSummary={previousSummary}
            comparison={previousPeriod?.comparison}
            forecast={forecast}
            isMobile={isMobile}
            onOpenTipHistory={openTipHistory}
          />

          <CvTipLeaderboardCard
            leaderboard={leaderboard}
            loading={Boolean(loading || parentLoading)}
            isMobile={false}
            selectedCvName={selectedCvName}
            forecast={forecast}
            onSelectCv={handleSelectCv}
          />

          <CvTipDetailTableCard
            records={records}
            totalRecords={totalRecords}
            loading={Boolean(loading || parentLoading)}
            refreshLoading={loading}
            selectedCvName={selectedCvName}
            tipFilter={tipFilter}
            searchText={searchText}
            isCompact={isCompact}
            currentPage={currentPage}
            pageSize={pageSize}
            onTipFilterChange={handleTipFilterChange}
            onSearchChange={handleSearchChange}
            onToggleCompact={toggleCompact}
            onRefresh={fetchData}
            onPageChange={handlePageChange}
            onOpenCustomerHistory={openCustomerHistory}
          />
        </>
      )}

      <CvTipHistoryModals
        isMobile={isMobile}
        tipHistoryOpen={tipHistoryOpen}
        tipHistoryLoading={tipHistoryLoading}
        tipHistoryFilter={tipHistoryFilter}
        tipHistoryRecords={tipHistoryRecords}
        visibleTipHistoryRecords={visibleTipHistoryRecords}
        onTipHistoryFilterChange={setTipHistoryFilter}
        onCloseTipHistory={closeTipHistory}
        customerHistoryOpen={customerHistoryOpen}
        customerHistoryLoading={customerHistoryLoading}
        customerHistoryName={customerHistoryName}
        customerHistoryRecords={customerHistoryRecords}
        customerHistoryFilter={customerHistoryFilter}
        visibleCustomerHistoryRecords={visibleCustomerHistoryRecords}
        onCustomerHistoryFilterChange={setCustomerHistoryFilter}
        onCloseCustomerHistory={closeCustomerHistory}
        onOpenCustomerHistory={openCustomerHistory}
      />
    </div>
  );
}
