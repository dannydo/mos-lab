'use client';

import { CvTipDetailTableCard } from './cv-tip-tab/CvTipDetailTableCard';
import { CvTipHistoryModals } from './cv-tip-tab/CvTipHistoryModals';
import { CvTipLeaderboardCard } from './cv-tip-tab/CvTipLeaderboardCard';
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
    <div className="flex flex-col gap-4">
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
        isMobile={isMobile}
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
