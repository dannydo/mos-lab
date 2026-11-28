'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAdminOrSuperAdminRole, type CvPaystubRecord } from '@mos-lab/shared';
import { CcMobileWalletStrip } from '~/app/dashboard/cc/components/CcMobileWalletStrip';
import { formatCompactVND } from '~/lib/format-utils';
import { CvAllowanceModal } from './cv-thu-nhap-tab/CvAllowanceModal';
import CvlTrainingMentorshipConfigModal from '~/components/cc-thu-nhap/modals/CvlTrainingMentorshipConfigModal';
import { CvIncomeSummaryCards } from './cv-thu-nhap-tab/CvIncomeSummaryCards';
import { CvPaystubDetailModal } from './cv-thu-nhap-tab/CvPaystubDetailModal';
import { CvPaystubTableCard } from './cv-thu-nhap-tab/CvPaystubTableCard';
import { CvThuNhapMobileDetailSheet } from './cv-thu-nhap-tab/CvThuNhapMobileDetailSheet';
import { CvWorkLogModal } from './cv-thu-nhap-tab/CvWorkLogModal';
import {
  formatStoreCode,
  type CvIncomeSummary,
  type CvSeniorityRule,
  type CvThuNhapTabProps,
} from './cv-thu-nhap-tab/cvThuNhapUtils';
import { useCvIncomeModals } from './cv-thu-nhap-tab/useCvIncomeModals';
import { useCvPaystubData } from './cv-thu-nhap-tab/useCvPaystubData';
import { useCvSeniorityConfig } from './cv-thu-nhap-tab/useCvSeniorityConfig';

export { formatStoreCode };
export type { CvIncomeSummary, CvSeniorityRule, CvThuNhapTabProps };

export default function CvThuNhapTab({ dateRange, selectedStore, currentUser, comparisonMode }: CvThuNhapTabProps) {
  const router = useRouter();
  const canManagePaystub = isAdminOrSuperAdminRole(currentUser?.role as string);
  const [mentorshipModalOpen, setMentorshipModalOpen] = useState(false);

  const {
    isMobile,
    showMobilePortrait,
    useCompactMetricFormat,
    formatMetricValue,
    previousPeriod,
    loading,
    paystubData,
    filteredData,
    summary,
    previousSummary,
    forecastMeta,
    getProjectedRecord,
    projectedSummary,
    searchText,
    setSearchText,
    pageSize,
    handlePageSizeChange,
    isCompact,
    toggleCompact,
    fetchData,
  } = useCvPaystubData({
    dateRange,
    selectedStore,
    comparisonMode,
  });

  const {
    seniorityRules,
    configLoading,
    configSaving,
    popoverRefCallback,
    addSeniorityRule,
    updateSeniorityRule,
    removeSeniorityRule,
    handleSaveSeniorityConfig,
  } = useCvSeniorityConfig({
    onConfigSaved: fetchData,
  });

  const {
    selectedRecord,
    modalOpen,
    openPaystubModal,
    closePaystubModal,
    isAllowanceModalOpen,
    allowanceFormType,
    setAllowanceFormType,
    allowanceTitle,
    setAllowanceTitle,
    allowanceAmount,
    setAllowanceAmount,
    allowanceNote,
    setAllowanceNote,
    isSubmittingAllowance,
    openAllowanceModal,
    closeAllowanceModal,
    handleAddAllowance,
    handleDeleteAllowance,
    workLogModalOpen,
    workLogLoading,
    workLogRecord,
    workLogs,
    workLogSummary,
    modalWidth,
    isResizing,
    updateModalWidth,
    handleMouseDown,
    handleOpenWorkLogs,
    closeWorkLogModal,
  } = useCvIncomeModals({
    dateRange,
    paystubData,
    onRefreshPaystubData: fetchData,
  });

  const [inspectedRecord, setInspectedRecord] = useState<CvPaystubRecord | null>(null);

  const handleNavigateCareerPath = useCallback(
    (staffId: number) => {
      router.push(`/dashboard/career-path?staffId=${staffId}`);
    },
    [router]
  );

  const summaryBonusTotal =
    (summary.totalCvXoayBonus || 0) + (summary.totalSeniorityBonus || 0) + (summary.totalCvTipBonus || 0);
  const showForecast = !forecastMeta.isDayMode && !forecastMeta.isPastPeriod;

  return (
    <div className={`cv-income-tab flex flex-col ${showMobilePortrait ? 'gap-3' : 'gap-4'}`}>
      {showMobilePortrait ? (
        <CcMobileWalletStrip
          testId="cv-income-mobile-summary"
          ariaLabel="Tóm tắt thu nhập CV"
          items={[
            {
              key: 'total',
              label: '∑ Thu nhập',
              value: formatMetricValue(summary.grandTotalIncome || 0),
              valueClassName: 'text-emerald-600 dark:text-emerald-400',
              subtext:
                showForecast && (projectedSummary.projectedTotalIncome || 0) > 0
                  ? `~${formatCompactVND(projectedSummary.projectedTotalIncome)}`
                  : undefined,
            },
            {
              key: 'wage',
              label: 'Lương giờ',
              value: formatMetricValue(summary.totalHourlyWage || 0),
              valueClassName: 'text-sky-600 dark:text-sky-400',
              subtext: `${filteredData.length} CV`,
            },
            {
              key: 'bonus',
              label: '∑ Thưởng',
              value: formatMetricValue(summaryBonusTotal),
              valueClassName: 'text-amber-600 dark:text-amber-400',
              subtext: 'Xoay · Tip · Thâm niên',
            },
          ]}
        />
      ) : (
        <CvIncomeSummaryCards
          summary={summary}
          previousSummary={previousSummary}
          comparison={previousPeriod?.comparison}
          forecastMeta={forecastMeta}
          projectedSummary={projectedSummary}
          formatMetricValue={formatMetricValue}
          useCompactMetricFormat={useCompactMetricFormat}
          isMobile={isMobile}
        />
      )}

      <CvPaystubTableCard
        filteredData={filteredData}
        loading={loading}
        isMobile={isMobile}
        isCompact={isCompact}
        onToggleCompact={toggleCompact}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        onRefresh={() => void fetchData()}
        forecastMeta={forecastMeta}
        getProjectedRecord={getProjectedRecord}
        onSelectMobileCard={setInspectedRecord}
        onOpenWorkLogs={(record) => void handleOpenWorkLogs(record)}
        onOpenPaystubModal={openPaystubModal}
        onNavigateCareerPath={handleNavigateCareerPath}
        seniorityRules={seniorityRules}
        configLoading={configLoading}
        configSaving={configSaving}
        canManagePaystub={canManagePaystub}
        popoverRefCallback={popoverRefCallback}
        onAddSeniorityRule={addSeniorityRule}
        onUpdateSeniorityRule={updateSeniorityRule}
        onRemoveSeniorityRule={removeSeniorityRule}
        onSaveSeniorityConfig={handleSaveSeniorityConfig}
        onOpenMentorshipConfig={canManagePaystub ? () => setMentorshipModalOpen(true) : undefined}
      />

      <CvThuNhapMobileDetailSheet
        open={Boolean(inspectedRecord)}
        onClose={() => setInspectedRecord(null)}
        record={inspectedRecord}
        projected={inspectedRecord ? getProjectedRecord(inspectedRecord) : null}
        showForecast={showForecast}
        onOpenPaystubModal={openPaystubModal}
        onOpenWorkLogs={(record) => void handleOpenWorkLogs(record)}
        onNavigateCareerPath={handleNavigateCareerPath}
      />

      <CvPaystubDetailModal
        open={modalOpen}
        onClose={closePaystubModal}
        selectedRecord={selectedRecord}
        dateRange={dateRange}
        canManagePaystub={canManagePaystub}
        onOpenAllowanceModal={openAllowanceModal}
        onDeleteAllowance={handleDeleteAllowance}
      />

      <CvWorkLogModal
        open={workLogModalOpen}
        onClose={closeWorkLogModal}
        workLogRecord={workLogRecord}
        workLogLoading={workLogLoading}
        workLogs={workLogs}
        workLogSummary={workLogSummary}
        modalWidth={modalWidth}
        isResizing={isResizing}
        updateModalWidth={updateModalWidth}
        handleMouseDown={handleMouseDown}
      />

      <CvAllowanceModal
        open={isAllowanceModalOpen}
        onCancel={closeAllowanceModal}
        onOk={handleAddAllowance}
        confirmLoading={isSubmittingAllowance}
        selectedRecord={selectedRecord}
        dateRange={dateRange}
        allowanceFormType={allowanceFormType}
        setAllowanceFormType={setAllowanceFormType}
        allowanceTitle={allowanceTitle}
        setAllowanceTitle={setAllowanceTitle}
        allowanceAmount={allowanceAmount}
        setAllowanceAmount={setAllowanceAmount}
        allowanceNote={allowanceNote}
        setAllowanceNote={setAllowanceNote}
      />

      {canManagePaystub && (
        <CvlTrainingMentorshipConfigModal
          open={mentorshipModalOpen}
          onClose={() => setMentorshipModalOpen(false)}
          onSaved={() => void fetchData()}
        />
      )}
    </div>
  );
}
