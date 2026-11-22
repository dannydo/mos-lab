'use client';

import React from 'react';
import type { FormInstance } from 'antd';
import type { FundProposal } from '@mos-lab/shared';
import {
  ApprovalModal,
  ConfirmReceiptModal,
  DisburseModal,
  ExpenseModal,
  ProposalModal,
  ReconcileModal,
} from '../FundModals';
import type {
  ApprovalFormValues,
  ConfirmReceiptFormValues,
  DisburseFormValues,
  ExpenseFormValues,
  FundOverviewData,
  ProposalFormValues,
  ReconcileFormValues,
} from './types';

export interface FundOperationalModalsProps {
  loading: boolean;
  fundOverview: FundOverviewData | null;
  selectedProposal: FundProposal | null;
  expenseModalOpen: boolean;
  proposalModalOpen: boolean;
  approvalModalOpen: boolean;
  disburseModalOpen: boolean;
  confirmReceiptModalOpen: boolean;
  reconcileModalOpen: boolean;
  expenseForm: FormInstance;
  proposalForm: FormInstance;
  approvalForm: FormInstance;
  disburseForm: FormInstance;
  confirmReceiptForm: FormInstance;
  reconcileForm: FormInstance;
  onCloseExpenseModal: () => void;
  onCloseProposalModal: () => void;
  onCloseApprovalModal: () => void;
  onCloseDisburseModal: () => void;
  onCloseConfirmReceiptModal: () => void;
  onCloseReconcileModal: () => void;
  onExpenseSubmit: (values: ExpenseFormValues) => Promise<void>;
  onProposalSubmit: (values: ProposalFormValues) => Promise<void>;
  onApprovalSubmit: (values: ApprovalFormValues) => Promise<void>;
  onDisburseSubmit: (values: DisburseFormValues) => Promise<void>;
  onConfirmReceiptSubmit: (values: ConfirmReceiptFormValues) => Promise<void>;
  onReconcileSubmit: (values: ReconcileFormValues) => Promise<void>;
}

export function FundOperationalModals({
  loading,
  fundOverview,
  selectedProposal,
  expenseModalOpen,
  proposalModalOpen,
  approvalModalOpen,
  disburseModalOpen,
  confirmReceiptModalOpen,
  reconcileModalOpen,
  expenseForm,
  proposalForm,
  approvalForm,
  disburseForm,
  confirmReceiptForm,
  reconcileForm,
  onCloseExpenseModal,
  onCloseProposalModal,
  onCloseApprovalModal,
  onCloseDisburseModal,
  onCloseConfirmReceiptModal,
  onCloseReconcileModal,
  onExpenseSubmit,
  onProposalSubmit,
  onApprovalSubmit,
  onDisburseSubmit,
  onConfirmReceiptSubmit,
  onReconcileSubmit,
}: FundOperationalModalsProps) {
  return (
    <>
      <ExpenseModal
        open={expenseModalOpen}
        onCancel={onCloseExpenseModal}
        onSubmit={onExpenseSubmit}
        loading={loading}
        form={expenseForm}
        unitQuota={fundOverview?.unitQuota}
      />

      <ProposalModal
        open={proposalModalOpen}
        onCancel={onCloseProposalModal}
        onSubmit={onProposalSubmit}
        loading={loading}
        form={proposalForm}
      />

      <ApprovalModal
        open={approvalModalOpen}
        onCancel={onCloseApprovalModal}
        onSubmit={onApprovalSubmit}
        loading={loading}
        form={approvalForm}
        proposal={selectedProposal}
      />

      <DisburseModal
        open={disburseModalOpen}
        onCancel={onCloseDisburseModal}
        onSubmit={onDisburseSubmit}
        loading={loading}
        form={disburseForm}
        proposal={selectedProposal}
        fund={fundOverview}
      />

      <ConfirmReceiptModal
        open={confirmReceiptModalOpen}
        onCancel={onCloseConfirmReceiptModal}
        onSubmit={onConfirmReceiptSubmit}
        loading={loading}
        form={confirmReceiptForm}
        proposal={selectedProposal}
      />

      <ReconcileModal
        open={reconcileModalOpen}
        onCancel={onCloseReconcileModal}
        onSubmit={onReconcileSubmit}
        loading={loading}
        form={reconcileForm}
        currentBalance={Number(fundOverview?.currentBalance || 0)}
      />
    </>
  );
}
