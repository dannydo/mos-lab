'use client';

import { useState } from 'react';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import { BkAttendanceExceptionModal } from './bk-thu-nhap-tab/BkAttendanceExceptionModal';
import { BkIncomeSummaryCards } from './bk-thu-nhap-tab/BkIncomeSummaryCards';
import { BkPaystubBreakdownModal } from './bk-thu-nhap-tab/BkPaystubBreakdownModal';
import { BkPaystubTableCard } from './bk-thu-nhap-tab/BkPaystubTableCard';
import { BkWorkLogModal } from './bk-thu-nhap-tab/BkWorkLogModal';
import { formatStoreCode, type BkThuNhapTabProps } from './bk-thu-nhap-tab/bkThuNhapUtils';
import { useBkIncomeModals } from './bk-thu-nhap-tab/useBkIncomeModals';
import { useBkPaystubData } from './bk-thu-nhap-tab/useBkPaystubData';

export { formatStoreCode };
export type { BkThuNhapTabProps };

export default function BkThuNhapTab({ dateRange, selectedStore, comparisonMode }: BkThuNhapTabProps) {
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';
  const [isCompact, setIsCompact] = useState(false);

  const {
    loading,
    paystubs,
    summary,
    previousSummary,
    previousPeriod,
    forecastMeta,
    getProjectedRecord,
    projectedSummary,
    fetchPaystub,
  } = useBkPaystubData({
    dateRange,
    selectedStore,
    comparisonMode,
  });

  const {
    modalOpen,
    activePaystub,
    openBreakdownModal,
    closeBreakdownModal,
    workLogModalOpen,
    workLogLoading,
    workLogRecord,
    workLogData,
    activeDrawerTab,
    setActiveDrawerTab,
    handleOpenWorkLogs,
    closeWorkLogModal,
    exceptionModalOpen,
    selectedWorkLog,
    exceptionType,
    setExceptionType,
    exceptionReason,
    setExceptionReason,
    manualInTime,
    setManualInTime,
    manualOutTime,
    setManualOutTime,
    exceptionNote,
    setExceptionNote,
    savingException,
    openExceptionModal,
    closeExceptionModal,
    handleSaveException,
  } = useBkIncomeModals({
    dateRange,
    onRefreshPaystub: fetchPaystub,
  });

  return (
    <div className="space-y-6">
      <BkIncomeSummaryCards
        summary={summary}
        previousSummary={previousSummary}
        comparison={previousPeriod?.comparison}
        forecastMeta={forecastMeta}
        projectedSummary={projectedSummary}
        isMobile={isMobile}
      />

      <BkPaystubTableCard
        paystubs={paystubs}
        loading={loading}
        isMobile={isMobile}
        isCompact={isCompact}
        onToggleCompact={() => setIsCompact((prev) => !prev)}
        forecastMeta={forecastMeta}
        getProjectedRecord={getProjectedRecord}
        onOpenWorkLogs={handleOpenWorkLogs}
        onOpenBreakdownModal={openBreakdownModal}
      />

      <BkPaystubBreakdownModal
        open={modalOpen}
        activePaystub={activePaystub}
        forecastMeta={forecastMeta}
        getProjectedRecord={getProjectedRecord}
        onClose={closeBreakdownModal}
        onOpenWorkLogs={handleOpenWorkLogs}
      />

      <BkWorkLogModal
        open={workLogModalOpen}
        loading={workLogLoading}
        workLogRecord={workLogRecord}
        workLogData={workLogData}
        activeDrawerTab={activeDrawerTab}
        onTabChange={setActiveDrawerTab}
        onClose={closeWorkLogModal}
        onOpenExceptionModal={openExceptionModal}
      />

      <BkAttendanceExceptionModal
        open={exceptionModalOpen}
        workLogRecord={workLogRecord}
        workLogData={workLogData}
        selectedWorkLog={selectedWorkLog}
        exceptionType={exceptionType}
        onExceptionTypeChange={setExceptionType}
        exceptionReason={exceptionReason}
        onExceptionReasonChange={setExceptionReason}
        manualInTime={manualInTime}
        onManualInTimeChange={setManualInTime}
        manualOutTime={manualOutTime}
        onManualOutTimeChange={setManualOutTime}
        exceptionNote={exceptionNote}
        onExceptionNoteChange={setExceptionNote}
        savingException={savingException}
        onClose={closeExceptionModal}
        onSaveException={handleSaveException}
      />
    </div>
  );
}
