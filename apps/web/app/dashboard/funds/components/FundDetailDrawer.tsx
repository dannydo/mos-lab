'use client';

import React from 'react';
import { Tabs } from 'antd';
import { Calendar, Receipt, ShieldCheck, Wallet } from 'lucide-react';
import { AdaptiveDrawer, AppIcon } from '~/components/ui';
import { FundDrawerExtraActions, FundDrawerTitle } from './fund-detail-drawer/FundDrawerHeader';
import { FundLedgerTab } from './fund-detail-drawer/FundLedgerTab';
import { FundOperationalModals } from './fund-detail-drawer/FundOperationalModals';
import { FundOverviewTab } from './fund-detail-drawer/FundOverviewTab';
import { FundPeriodsTab } from './fund-detail-drawer/FundPeriodsTab';
import { FundProposalsTab } from './fund-detail-drawer/FundProposalsTab';
import type { FundDetailDrawerProps, FundOverviewData } from './fund-detail-drawer/types';
import { useFundDetailOperations } from './fund-detail-drawer/useFundDetailOperations';

export type { FundDetailDrawerProps, FundOverviewData };

export default function FundDetailDrawer({ open, fundId, onClose, onRefreshList }: FundDetailDrawerProps) {
  const ops = useFundDetailOperations({ open, fundId, onRefreshList });

  const isDraft = ops.fundOverview?.status === 'DRAFT';
  const isActive = ops.fundOverview?.status === 'ACTIVE';

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={Wallet} size="sm" />
          <span>1. Tổng Quan & Số Dư</span>
        </span>
      ),
      children: <FundOverviewTab fundOverview={ops.fundOverview} onOpenProposal={ops.openProposalModal} />,
    },
    {
      key: 'ledger',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={Receipt} size="sm" />
          <span>2. Sổ Giao Dịch & Chứng Từ</span>
        </span>
      ),
      children: (
        <FundLedgerTab
          isActive={isActive}
          loading={ops.loading}
          txTypeFilter={ops.txTypeFilter}
          onTxTypeFilterChange={ops.setTxTypeFilter}
          filteredTransactions={ops.filteredTransactions}
          transactionColumns={ops.transactionColumns}
          onExportLedger={ops.handleExportLedger}
          onOpenExpense={ops.openExpenseModal}
        />
      ),
    },
    {
      key: 'proposals',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={ShieldCheck} size="sm" />
          <span>3. Đề Xuất & Cấp Vốn</span>
        </span>
      ),
      children: (
        <FundProposalsTab
          isActive={isActive}
          loading={ops.loading}
          proposals={ops.fundOverview?.pendingProposals || []}
          proposalColumns={ops.proposalColumns}
          onOpenProposal={ops.openProposalModal}
        />
      ),
    },
    {
      key: 'periods',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={Calendar} size="sm" />
          <span>4. Kỳ Sổ Quỹ & Đối Soát</span>
        </span>
      ),
      children: (
        <FundPeriodsTab fundOverview={ops.fundOverview} isActive={isActive} onOpenReconcile={ops.openReconcileModal} />
      ),
    },
  ];

  return (
    <>
      <AdaptiveDrawer
        open={open}
        onClose={onClose}
        width={1000}
        title={<FundDrawerTitle fundOverview={ops.fundOverview} />}
        extra={
          <FundDrawerExtraActions
            isDraft={isDraft}
            isActive={isActive}
            loading={ops.loading}
            activating={ops.activating}
            onActivateFund={ops.handleActivateFund}
            onOpenExpense={ops.openExpenseModal}
            onOpenProposal={ops.openProposalModal}
            onReload={ops.loadFundData}
          />
        }
      >
        <Tabs activeKey={ops.activeTab} onChange={ops.setActiveTab} items={tabItems} />
      </AdaptiveDrawer>

      <FundOperationalModals
        loading={ops.loading}
        fundOverview={ops.fundOverview}
        selectedProposal={ops.selectedProposal}
        expenseModalOpen={ops.expenseModalOpen}
        proposalModalOpen={ops.proposalModalOpen}
        approvalModalOpen={ops.approvalModalOpen}
        disburseModalOpen={ops.disburseModalOpen}
        confirmReceiptModalOpen={ops.confirmReceiptModalOpen}
        reconcileModalOpen={ops.reconcileModalOpen}
        expenseForm={ops.expenseForm}
        proposalForm={ops.proposalForm}
        approvalForm={ops.approvalForm}
        disburseForm={ops.disburseForm}
        confirmReceiptForm={ops.confirmReceiptForm}
        reconcileForm={ops.reconcileForm}
        onCloseExpenseModal={ops.closeExpenseModal}
        onCloseProposalModal={ops.closeProposalModal}
        onCloseApprovalModal={ops.closeApprovalModal}
        onCloseDisburseModal={ops.closeDisburseModal}
        onCloseConfirmReceiptModal={ops.closeConfirmReceiptModal}
        onCloseReconcileModal={ops.closeReconcileModal}
        onExpenseSubmit={ops.handleExpenseSubmit}
        onProposalSubmit={ops.handleProposalSubmit}
        onApprovalSubmit={ops.handleApprovalSubmit}
        onDisburseSubmit={ops.handleDisburseSubmit}
        onConfirmReceiptSubmit={ops.handleConfirmReceiptSubmit}
        onReconcileSubmit={ops.handleReconcileSubmit}
      />
    </>
  );
}
