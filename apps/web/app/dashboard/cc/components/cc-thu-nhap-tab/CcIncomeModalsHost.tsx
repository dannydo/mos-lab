'use client';

import React from 'react';
import dayjs from 'dayjs';
import type {
  CcDiamondEntry,
  CcPaystubRecord,
  CcTipRecord,
  CcWorkLogDetailRecord,
  CcXoayRecord,
  TipFilterType,
} from '@mos-lab/shared';
import CcAllowanceModal from '~/components/cc-thu-nhap/modals/CcAllowanceModal';
import CcPaystubDetailModal from '~/components/cc-thu-nhap/modals/CcPaystubDetailModal';
import CcTipDetailModal from '~/components/cc-thu-nhap/modals/CcTipDetailModal';
import CcWorkLogDetailModal from '~/components/cc-thu-nhap/modals/CcWorkLogDetailModal';
import CcXoayDetailModal from '~/components/cc-thu-nhap/modals/CcXoayDetailModal';
import CvlTrainingMentorshipConfigModal from '~/components/cc-thu-nhap/modals/CvlTrainingMentorshipConfigModal';
import CcDiamondDetailModal from '../CcDiamondDetailModal';
import CcThuongTransactionsModal from '../CcThuongTransactionsModal';
import {
  CcXoayModalSummary,
  TipModalSummary,
  WorkLogModalSummary,
  formatHoursToHoursMinutes,
} from './cc-thu-nhap-utils';

interface CcIncomeModalsHostProps {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  isDayMode: boolean;
  isDark: boolean;
  isMobile: boolean;
  isAdminUser: boolean;
  onRefreshPaystubData: () => Promise<void>;

  // Paystub Detail Modal
  modalOpen: boolean;
  onClosePaystubModal: () => void;
  selectedRecord: CcPaystubRecord | null;
  onOpenAllowanceModal: () => void;
  onDeleteAllowance: (allowanceId: number | string) => Promise<void>;

  // Work Log Modal
  workLogModalOpen: boolean;
  onCloseWorkLogModal: () => void;
  workLogRecord: CcPaystubRecord | null;
  modalWidth: number;
  updateModalWidth: (width: number) => void;
  handleMouseDown: (e: React.MouseEvent) => void;
  isResizing: boolean;
  workLogSummary: WorkLogModalSummary;
  workLogs: CcWorkLogDetailRecord[];
  workLogLoading: boolean;
  workLogPage: number;
  setWorkLogPage: (page: number) => void;
  workLogPageSize: number;
  setWorkLogPageSize: (size: number) => void;

  // CC Xoay Modal
  ccXoayModalOpen: boolean;
  onCloseCcXoayModal: () => void;
  ccXoayRecord: CcPaystubRecord | null;
  ccXoayLoading: boolean;
  ccXoaySummary: CcXoayModalSummary;
  ccXoayLogs: CcXoayRecord[];

  // Combo Modal
  comboModalOpen: boolean;
  onCloseComboModal: () => void;
  comboModalRecord: CcPaystubRecord | null;

  // Tip Modal
  tipModalOpen: boolean;
  onCloseTipModal: () => void;
  tipModalRecord: CcPaystubRecord | null;
  tipModalLoading: boolean;
  tipModalSummary: TipModalSummary;
  tipModalFilter: TipFilterType;
  setTipModalFilter: (val: TipFilterType) => void;
  tipModalSearch: string;
  setTipModalSearch: (val: string) => void;
  filteredTipModalRecords: CcTipRecord[];

  // Diamond Modal
  diamondModalOpen: boolean;
  onCloseDiamondModal: () => void;
  diamondRecord: CcDiamondEntry | null;

  // Allowance Modal
  isAllowanceModalOpen: boolean;
  onCloseAllowanceModal: () => void;
  onSubmitAllowance: () => Promise<void>;
  isSubmittingAllowance: boolean;
  allowanceFormType: 'plus' | 'minus';
  setAllowanceFormType: (val: 'plus' | 'minus') => void;
  allowanceTitle: string;
  setAllowanceTitle: (val: string) => void;
  allowanceAmount: number | null;
  setAllowanceAmount: (val: number | null) => void;
  allowanceNote: string;
  setAllowanceNote: (val: string) => void;

  // Training Config Modal
  isTrainingConfigOpen: boolean;
  onCloseTrainingConfig: () => void;
}

export function CcIncomeModalsHost({
  dateRange,
  isDayMode,
  isDark,
  isMobile,
  isAdminUser,
  onRefreshPaystubData,
  modalOpen,
  onClosePaystubModal,
  selectedRecord,
  onOpenAllowanceModal,
  onDeleteAllowance,
  workLogModalOpen,
  onCloseWorkLogModal,
  workLogRecord,
  modalWidth,
  updateModalWidth,
  handleMouseDown,
  isResizing,
  workLogSummary,
  workLogs,
  workLogLoading,
  workLogPage,
  setWorkLogPage,
  workLogPageSize,
  setWorkLogPageSize,
  ccXoayModalOpen,
  onCloseCcXoayModal,
  ccXoayRecord,
  ccXoayLoading,
  ccXoaySummary,
  ccXoayLogs,
  comboModalOpen,
  onCloseComboModal,
  comboModalRecord,
  tipModalOpen,
  onCloseTipModal,
  tipModalRecord,
  tipModalLoading,
  tipModalSummary,
  tipModalFilter,
  setTipModalFilter,
  tipModalSearch,
  setTipModalSearch,
  filteredTipModalRecords,
  diamondModalOpen,
  onCloseDiamondModal,
  diamondRecord,
  isAllowanceModalOpen,
  onCloseAllowanceModal,
  onSubmitAllowance,
  isSubmittingAllowance,
  allowanceFormType,
  setAllowanceFormType,
  allowanceTitle,
  setAllowanceTitle,
  allowanceAmount,
  setAllowanceAmount,
  allowanceNote,
  setAllowanceNote,
  isTrainingConfigOpen,
  onCloseTrainingConfig,
}: CcIncomeModalsHostProps) {
  return (
    <>
      <CcPaystubDetailModal
        open={modalOpen}
        onCancel={onClosePaystubModal}
        selectedRecord={selectedRecord}
        dateRange={dateRange}
        onOpenAllowanceModal={onOpenAllowanceModal}
        onDeleteAllowance={onDeleteAllowance}
        formatHoursToHoursMinutes={formatHoursToHoursMinutes}
      />

      <CcWorkLogDetailModal
        open={workLogModalOpen}
        onCancel={onCloseWorkLogModal}
        record={workLogRecord}
        modalWidth={modalWidth}
        updateModalWidth={updateModalWidth}
        isMobile={isMobile}
        handleMouseDown={handleMouseDown}
        isResizing={isResizing}
        isDark={isDark}
        workLogSummary={workLogSummary}
        workLogs={workLogs}
        workLogLoading={workLogLoading}
        workLogPage={workLogPage}
        setWorkLogPage={setWorkLogPage}
        workLogPageSize={workLogPageSize}
        setWorkLogPageSize={setWorkLogPageSize}
        formatHoursToHoursMinutes={formatHoursToHoursMinutes}
      />

      <CcXoayDetailModal
        open={ccXoayModalOpen}
        onCancel={onCloseCcXoayModal}
        record={ccXoayRecord}
        loading={ccXoayLoading}
        summary={ccXoaySummary}
        logs={ccXoayLogs}
        isDark={isDark}
      />

      {comboModalRecord && (
        <CcThuongTransactionsModal
          open={comboModalOpen}
          onClose={onCloseComboModal}
          date={isDayMode ? dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD') : undefined}
          dateFrom={
            !isDayMode
              ? dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().startOf('month').format('YYYY-MM-DD')
              : undefined
          }
          dateTo={
            !isDayMode ? dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().endOf('month').format('YYYY-MM-DD') : undefined
          }
          consultantId={comboModalRecord.consultantId}
          consultantName={comboModalRecord.displayName}
          includeVat={true}
        />
      )}

      <CcTipDetailModal
        open={tipModalOpen}
        onCancel={onCloseTipModal}
        record={tipModalRecord}
        loading={tipModalLoading}
        summary={tipModalSummary}
        filter={tipModalFilter}
        setFilter={setTipModalFilter}
        search={tipModalSearch}
        setSearch={setTipModalSearch}
        records={filteredTipModalRecords}
      />

      {diamondRecord && (
        <CcDiamondDetailModal
          open={diamondModalOpen}
          onClose={onCloseDiamondModal}
          ccRecord={diamondRecord}
          dateRange={dateRange}
        />
      )}

      <CcAllowanceModal
        open={isAllowanceModalOpen}
        onCancel={onCloseAllowanceModal}
        onOk={onSubmitAllowance}
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

      {isAdminUser && (
        <CvlTrainingMentorshipConfigModal
          open={isTrainingConfigOpen}
          onClose={onCloseTrainingConfig}
          onSaved={onRefreshPaystubData}
        />
      )}
    </>
  );
}
