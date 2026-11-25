'use client';

import React, { useCallback, useState } from 'react';
import type { CcPaystubRecord } from '@mos-lab/shared';
import CcIncomeSummaryCards from '~/components/cc-thu-nhap/CcIncomeSummaryCards';
import { useTheme } from '~/context/ThemeContext';
import { formatCompactVND } from '~/lib/format-utils';
import { CcMobileWalletStrip } from './CcMobileWalletStrip';
import { CcIncomeForecastSubtext } from './cc-thu-nhap-tab/CcIncomeForecastSubtext';
import { CcIncomeMobileDetailSheet } from './cc-thu-nhap-tab/CcIncomeMobileDetailSheet';
import { CcIncomeModalsHost } from './cc-thu-nhap-tab/CcIncomeModalsHost';
import { CcIncomePaystubSection } from './cc-thu-nhap-tab/CcIncomePaystubSection';
import type { CcThuNhapTabProps } from './cc-thu-nhap-tab/cc-thu-nhap-utils';
import { useCcIncomeModals } from './cc-thu-nhap-tab/useCcIncomeModals';
import { useCcPaystubData } from './cc-thu-nhap-tab/useCcPaystubData';
import { useCcMobilePortrait } from './useCcMobilePortrait';

export type { CcThuNhapTabProps };

export default function CcThuNhapTab({ dateRange, selectedStore, comparisonMode = 'month' }: CcThuNhapTabProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const { isMobile, showMobilePortrait } = useCcMobilePortrait();
  const [mobileSheetRecord, setMobileSheetRecord] = useState<CcPaystubRecord | null>(null);

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

  const showForecast = !isDayMode && !isPastPeriod;
  const totalBonusSummary = Math.max(0, (summary.grandTotalIncome || 0) - (summary.totalHourlyWage || 0));
  const totalComboCount = filteredData.reduce((sum, item) => sum + (item.comboCount || 0), 0);
  const totalGreenVisits = filteredData.reduce((sum, item) => sum + (item.greenVisits || 0), 0);
  const teamComboRate =
    totalGreenVisits > 0 ? Math.min(100, Math.round((totalComboCount / totalGreenVisits) * 100)) : null;

  return (
    <div className={showMobilePortrait ? 'flex flex-col gap-3' : 'flex flex-col gap-3 md:gap-4'}>
      {showMobilePortrait ? (
        <CcMobileWalletStrip
          testId="cc-income-mobile-summary"
          ariaLabel="Tóm tắt thu nhập đội CC"
          items={[
            {
              key: 'total',
              label: '∑ Thực lãnh',
              value: formatCompactVND(summary.grandTotalIncome || 0),
              valueClassName: 'text-amber-600 dark:text-amber-400',
              subtext:
                showForecast && (projectedSummary?.projectedTotalIncome || 0) > 0
                  ? `~${formatCompactVND(projectedSummary.projectedTotalIncome)}`
                  : 'Thu nhập đội',
            },
            {
              key: 'wage',
              label: 'Lương giờ',
              value: formatCompactVND(summary.totalHourlyWage || 0),
              valueClassName: 'text-sky-600 dark:text-sky-400',
              subtext:
                showForecast && (projectedSummary?.projectedHourlyWage || 0) > 0
                  ? `~${formatCompactVND(projectedSummary.projectedHourlyWage)}`
                  : 'Giờ công',
            },
            {
              key: 'bonus',
              label: '∑ Thưởng',
              value: formatCompactVND(totalBonusSummary),
              valueClassName: 'text-emerald-600 dark:text-emerald-400',
              subtext: teamComboRate !== null ? `% Combo đội: ${teamComboRate}%` : 'Tip · Xoay · Combo',
            },
          ]}
        />
      ) : (
        <CcIncomeSummaryCards
          summary={summary}
          projectedSummary={projectedSummary}
          renderForecastSubtext={renderForecastSubtext}
          isDark={isDark}
        />
      )}

      <CcIncomePaystubSection
        filteredData={filteredData}
        loading={loading}
        isMobile={showMobilePortrait}
        isAdminUser={isAdminUser}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        onOpenTrainingConfig={() => modals.setIsTrainingConfigOpen(true)}
        summary={summary}
        isDayMode={isDayMode}
        isPastPeriod={isPastPeriod}
        periodNoun={periodNoun}
        getProjectedRecord={getProjectedRecord}
        onSelectMobileCard={(record) => setMobileSheetRecord(record)}
        onOpenDetailModal={modals.handleOpenDetailModal}
        onOpenWorkLogModal={modals.handleOpenWorkLogModal}
        onOpenCcXoayModal={modals.handleOpenCcXoayModal}
        onOpenComboModal={modals.handleOpenComboModal}
        onOpenTipModal={modals.handleOpenTipModal}
        onOpenDiamondModal={modals.handleOpenDiamondModal}
      />

      <CcIncomeMobileDetailSheet
        open={Boolean(mobileSheetRecord)}
        onClose={() => setMobileSheetRecord(null)}
        record={mobileSheetRecord}
        projected={mobileSheetRecord ? getProjectedRecord(mobileSheetRecord) : null}
        showForecast={showForecast}
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
