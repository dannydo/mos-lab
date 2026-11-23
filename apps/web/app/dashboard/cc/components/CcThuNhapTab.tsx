'use client';

import React, { useCallback } from 'react';
import CcIncomeSummaryCards from '~/components/cc-thu-nhap/CcIncomeSummaryCards';
import { useTheme } from '~/context/ThemeContext';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import { CcIncomeForecastSubtext } from './cc-thu-nhap-tab/CcIncomeForecastSubtext';
import { CcIncomeModalsHost } from './cc-thu-nhap-tab/CcIncomeModalsHost';
import { CcIncomePaystubSection } from './cc-thu-nhap-tab/CcIncomePaystubSection';
import type { CcThuNhapTabProps } from './cc-thu-nhap-tab/cc-thu-nhap-utils';
import { useCcIncomeModals } from './cc-thu-nhap-tab/useCcIncomeModals';
import { useCcPaystubData } from './cc-thu-nhap-tab/useCcPaystubData';

export type { CcThuNhapTabProps };

export default function CcThuNhapTab({ dateRange, selectedStore, comparisonMode = 'month' }: CcThuNhapTabProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';

  const {
    loading,
    isAdminUser,
    filteredData,
    summary,
    searchText,
    setSearchText,
    selectedRecord,
    setSelectedRecord,
    isDayMode,
    periodNoun,
    elapsedRatioPercent,
    isPastPeriod,
    getProjectedRecord,
    projectedSummary,
    fetchPaystubData,
    isAllowanceModalOpen,
    setIsAllowanceModalOpen,
    closeAllowanceModal,
    allowanceTitle,
    setAllowanceTitle,
    allowanceAmount,
    setAllowanceAmount,
    allowanceNote,
    setAllowanceNote,
    allowanceFormType,
    setAllowanceFormType,
    isSubmittingAllowance,
    handleAddAllowance,
    handleDeleteAllowance,
  } = useCcPaystubData({
    dateRange,
    selectedStore,
    comparisonMode,
  });

  const modals = useCcIncomeModals({
    dateRange,
    selectedStore,
    setSelectedRecord,
  });

  const renderForecastSubtext = useCallback(
    (projectedVal: number) => {
      if (isDayMode || !projectedVal) return null;
      return (
        <CcIncomeForecastSubtext
          projectedVal={projectedVal}
          isDayMode={isDayMode}
          isPastPeriod={isPastPeriod}
          periodNoun={periodNoun}
          elapsedRatioPercent={elapsedRatioPercent}
          isMobile={isMobile}
        />
      );
    },
    [isDayMode, isPastPeriod, periodNoun, elapsedRatioPercent, isMobile]
  );

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <CcIncomeSummaryCards
        summary={summary}
        projectedSummary={projectedSummary}
        renderForecastSubtext={renderForecastSubtext}
        isDark={isDark}
      />

      <CcIncomePaystubSection
        filteredData={filteredData}
        loading={loading}
        isMobile={isMobile}
        isAdminUser={isAdminUser}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onOpenTrainingConfig={() => modals.setIsTrainingConfigOpen(true)}
        summary={summary}
        isDayMode={isDayMode}
        isPastPeriod={isPastPeriod}
        periodNoun={periodNoun}
        getProjectedRecord={getProjectedRecord}
        onOpenDetailModal={modals.handleOpenDetailModal}
        onOpenWorkLogModal={modals.handleOpenWorkLogModal}
        onOpenCcXoayModal={modals.handleOpenCcXoayModal}
        onOpenComboModal={modals.handleOpenComboModal}
        onOpenTipModal={modals.handleOpenTipModal}
        onOpenDiamondModal={modals.handleOpenDiamondModal}
      />

      <CcIncomeModalsHost
        dateRange={dateRange}
        isDayMode={isDayMode}
        isDark={isDark}
        isMobile={isMobile}
        isAdminUser={isAdminUser}
        onRefreshPaystubData={fetchPaystubData}
        modalOpen={modals.modalOpen}
        onClosePaystubModal={() => modals.setModalOpen(false)}
        selectedRecord={selectedRecord}
        onOpenAllowanceModal={() => setIsAllowanceModalOpen(true)}
        onDeleteAllowance={handleDeleteAllowance}
        workLogModalOpen={modals.workLogModalOpen}
        onCloseWorkLogModal={() => modals.setWorkLogModalOpen(false)}
        workLogRecord={modals.workLogRecord}
        modalWidth={modals.modalWidth}
        updateModalWidth={modals.updateModalWidth}
        handleMouseDown={modals.handleMouseDown}
        isResizing={modals.isResizing}
        workLogSummary={modals.workLogSummary}
        workLogs={modals.workLogs}
        workLogLoading={modals.workLogLoading}
        workLogPage={modals.workLogPage}
        setWorkLogPage={modals.setWorkLogPage}
        workLogPageSize={modals.workLogPageSize}
        setWorkLogPageSize={modals.setWorkLogPageSize}
        ccXoayModalOpen={modals.ccXoayModalOpen}
        onCloseCcXoayModal={() => modals.setCcXoayModalOpen(false)}
        ccXoayRecord={modals.ccXoayRecord}
        ccXoayLoading={modals.ccXoayLoading}
        ccXoaySummary={modals.ccXoaySummary}
        ccXoayLogs={modals.ccXoayLogs}
        comboModalOpen={modals.comboModalOpen}
        onCloseComboModal={() => modals.setComboModalOpen(false)}
        comboModalRecord={modals.comboModalRecord}
        tipModalOpen={modals.tipModalOpen}
        onCloseTipModal={() => modals.setTipModalOpen(false)}
        tipModalRecord={modals.tipModalRecord}
        tipModalLoading={modals.tipModalLoading}
        tipModalSummary={modals.tipModalSummary}
        tipModalFilter={modals.tipModalFilter}
        setTipModalFilter={modals.setTipModalFilter}
        tipModalSearch={modals.tipModalSearch}
        setTipModalSearch={modals.setTipModalSearch}
        filteredTipModalRecords={modals.filteredTipModalRecords}
        diamondModalOpen={modals.diamondModalOpen}
        onCloseDiamondModal={() => modals.setDiamondModalOpen(false)}
        diamondRecord={modals.diamondRecord}
        isAllowanceModalOpen={isAllowanceModalOpen}
        onCloseAllowanceModal={closeAllowanceModal}
        onSubmitAllowance={handleAddAllowance}
        isSubmittingAllowance={isSubmittingAllowance}
        allowanceFormType={allowanceFormType}
        setAllowanceFormType={setAllowanceFormType}
        allowanceTitle={allowanceTitle}
        setAllowanceTitle={setAllowanceTitle}
        allowanceAmount={allowanceAmount}
        setAllowanceAmount={setAllowanceAmount}
        allowanceNote={allowanceNote}
        setAllowanceNote={setAllowanceNote}
        isTrainingConfigOpen={modals.isTrainingConfigOpen}
        onCloseTrainingConfig={() => modals.setIsTrainingConfigOpen(false)}
      />
    </div>
  );
}
