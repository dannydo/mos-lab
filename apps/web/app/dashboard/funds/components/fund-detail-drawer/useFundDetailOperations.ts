'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Form, message } from 'antd';
import type { FundProposal } from '@mos-lab/shared';
import apiClient from '~/lib/api-client';
import { getProposalColumns, getTransactionColumns } from '../fundColumns';
import { exportFundLedgerCsv } from './fundDetailHelpers';
import type {
  ApprovalFormValues,
  ConfirmReceiptFormValues,
  DisburseFormValues,
  ExpenseFormValues,
  FundOverviewData,
  ProposalFormValues,
  ReconcileFormValues,
} from './types';

interface UseFundDetailOperationsOptions {
  open: boolean;
  fundId: string | null;
  onRefreshList?: () => void;
}

export function useFundDetailOperations({ open, fundId, onRefreshList }: UseFundDetailOperationsOptions) {
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [fundOverview, setFundOverview] = useState<FundOverviewData | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [txTypeFilter, setTxTypeFilter] = useState<string>('ALL');

  // Modals state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [confirmReceiptModalOpen, setConfirmReceiptModalOpen] = useState(false);
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);

  const [selectedProposal, setSelectedProposal] = useState<FundProposal | null>(null);

  // Forms
  const [expenseForm] = Form.useForm();
  const [proposalForm] = Form.useForm();
  const [approvalForm] = Form.useForm();
  const [disburseForm] = Form.useForm();
  const [confirmReceiptForm] = Form.useForm();
  const [reconcileForm] = Form.useForm();

  const loadFundData = useCallback(async () => {
    if (!fundId) return;
    try {
      setLoading(true);
      const res = await apiClient.funds.getOverview(fundId);
      if (res.success && res.data) {
        setFundOverview(res.data);
      }
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || 'Không thể tải chi tiết Quỹ.');
    } finally {
      setLoading(false);
    }
  }, [fundId]);

  useEffect(() => {
    if (open && fundId) {
      loadFundData();
    } else {
      setFundOverview(null);
    }
  }, [open, fundId, loadFundData]);

  // 1. Kích hoạt quỹ (Bước 3)
  const handleActivateFund = async () => {
    if (!fundId) return;
    try {
      setActivating(true);
      const res = await apiClient.funds.activate(fundId);
      if (res.success) {
        message.success('Kích hoạt Quỹ thành công! Quỹ đã sẵn sàng vận hành.');
        await loadFundData();
        onRefreshList?.();
      }
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || 'Kích hoạt quỹ thất bại.');
    } finally {
      setActivating(false);
    }
  };

  // 2. Chi tiêu / Nạp Card (Bước 4)
  const handleExpenseSubmit = async (values: ExpenseFormValues) => {
    if (!fundOverview) return;
    try {
      setLoading(true);
      const res = await apiClient.funds.recordExpense(fundOverview.id, {
        amount: values.amount,
        description: values.description,
        beneficiaryStaffName: values.beneficiaryStaffName,
        beneficiaryPhone: values.beneficiaryPhone,
        telco: values.telco,
        receiptUrls: values.receiptUrl ? [values.receiptUrl] : [],
        expenseCategory: values.expenseCategory,
      });
      if (res.success) {
        message.success('Ghi nhận chi tiêu thành công!');
        if (res.data?.isLowBalance && res.data?.alertMessage) {
          message.warning(res.data.alertMessage, 5);
        }
        setExpenseModalOpen(false);
        expenseForm.resetFields();
        await loadFundData();
        onRefreshList?.();
      }
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || 'Ghi nhận chi tiêu thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Tạo đề xuất bổ sung vốn (Bước 3 & 5)
  const handleProposalSubmit = async (values: ProposalFormValues) => {
    if (!fundOverview) return;
    try {
      setLoading(true);
      const res = await apiClient.funds.createProposal(fundOverview.id, {
        proposalType: values.proposalType || 'REPLENISHMENT',
        title: values.title,
        description: values.description,
        requestedAmount: values.requestedAmount,
      });
      if (res.success) {
        message.success('Tạo đề xuất bổ sung vốn thành công! Đang chờ duyệt chủ trương.');
        setProposalModalOpen(false);
        proposalForm.resetFields();
        await loadFundData();
        setActiveTab('proposals');
      }
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || 'Tạo đề xuất thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // 4. Phê duyệt chủ trương đề xuất (Bước 5)
  const handleApprovalSubmit = async (values: ApprovalFormValues) => {
    if (!selectedProposal) return;
    try {
      setLoading(true);
      const res = await apiClient.funds.approveProposal(selectedProposal.id, {
        approved: values.approved === 'APPROVE',
        approvedAmount: values.approvedAmount,
        note: values.note,
      });
      if (res.success) {
        message.success(values.approved === 'APPROVE' ? 'Đã duyệt đề xuất thành công!' : 'Đã từ chối đề xuất.');
        setApprovalModalOpen(false);
        setSelectedProposal(null);
        approvalForm.resetFields();
        await loadFundData();
      }
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || 'Phê duyệt đề xuất thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Kế toán giải ngân (Bước 3 & 5)
  const handleDisburseSubmit = async (values: DisburseFormValues) => {
    if (!selectedProposal) return;
    try {
      setLoading(true);
      const res = await apiClient.funds.disburseProposal(selectedProposal.id, {
        actualDisbursedAmount: values.actualDisbursedAmount,
        paymentMethod: values.paymentMethod,
        bankRefCode: values.bankRefCode,
        disbursementReceiptUrls: values.disbursementReceiptUrl ? [values.disbursementReceiptUrl] : [],
        disbursementNote: values.disbursementNote,
      });
      if (res.success) {
        message.success(res.message || 'Kế toán đã giải ngân. Đang chờ Thủ quỹ xác nhận thực nhận tiền.');
        setDisburseModalOpen(false);
        setSelectedProposal(null);
        disburseForm.resetFields();
        await loadFundData();
        onRefreshList?.();
      } else if (res.reapprovalRequired) {
        message.warning(res.message || 'Vượt hạn mức duyệt, cần duyệt lại.');
        setDisburseModalOpen(false);
        await loadFundData();
      }
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || 'Giải ngân thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Thủ quỹ xác nhận thực nhận tiền (Bước 3 Invariant)
  const handleConfirmReceiptSubmit = async (values: ConfirmReceiptFormValues) => {
    if (!selectedProposal) return;
    try {
      setLoading(true);
      const res = await apiClient.funds.confirmProposalReceipt(selectedProposal.id, {
        note: values.note,
      });
      if (res.success) {
        message.success(res.message || 'Thủ quỹ đã xác nhận nhận tiền thành công! Số dư quỹ đã được cập nhật.');
        setConfirmReceiptModalOpen(false);
        setSelectedProposal(null);
        confirmReceiptForm.resetFields();
        await loadFundData();
        onRefreshList?.();
      }
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || 'Xác nhận nhận tiền thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // 7. Đối soát & Chốt kỳ sổ quỹ (Bước 6)
  const handleReconcileSubmit = async (values: ReconcileFormValues) => {
    if (!fundOverview || !fundOverview.currentPeriod) return;
    try {
      setLoading(true);
      const res = await apiClient.funds.reconcileAndLockPeriod(fundOverview.id, fundOverview.currentPeriod.id, {
        actualBalance: values.actualBalance,
        notes: values.notes,
      });
      if (res.success) {
        message.success('Đối soát và khóa sổ kỳ thành công! Đã tự động chuyển số dư sang kỳ mới.');
        setReconcileModalOpen(false);
        reconcileForm.resetFields();
        await loadFundData();
        onRefreshList?.();
      }
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message || 'Khóa sổ kỳ thất bại.');
    } finally {
      setLoading(false);
    }
  };

  // 8. Xuất sổ quỹ chi tiết (Bước 6 CSV export)
  const handleExportLedger = () => {
    if (!exportFundLedgerCsv(fundOverview)) {
      message.warning('Chưa có dữ liệu giao dịch để xuất.');
      return;
    }
    message.success('Đã xuất báo cáo sổ quỹ chi tiết (CSV) thành công.');
  };

  const openExpenseModal = useCallback(() => {
    expenseForm.resetFields();
    setExpenseModalOpen(true);
  }, [expenseForm]);

  const openProposalModal = useCallback(() => {
    proposalForm.resetFields();
    setProposalModalOpen(true);
  }, [proposalForm]);

  const openReconcileModal = useCallback(() => {
    reconcileForm.setFieldsValue({
      actualBalance: fundOverview?.currentBalance || 0,
    });
    setReconcileModalOpen(true);
  }, [fundOverview?.currentBalance, reconcileForm]);

  const closeExpenseModal = useCallback(() => setExpenseModalOpen(false), []);
  const closeProposalModal = useCallback(() => setProposalModalOpen(false), []);
  const closeApprovalModal = useCallback(() => {
    setApprovalModalOpen(false);
    setSelectedProposal(null);
  }, []);
  const closeDisburseModal = useCallback(() => {
    setDisburseModalOpen(false);
    setSelectedProposal(null);
  }, []);
  const closeConfirmReceiptModal = useCallback(() => {
    setConfirmReceiptModalOpen(false);
    setSelectedProposal(null);
  }, []);
  const closeReconcileModal = useCallback(() => setReconcileModalOpen(false), []);

  const filteredTransactions = useMemo(() => {
    if (!fundOverview?.recentTransactions) return [];
    if (txTypeFilter === 'ALL') return fundOverview.recentTransactions;
    return fundOverview.recentTransactions.filter((tx) => tx.type === txTypeFilter);
  }, [fundOverview, txTypeFilter]);

  const proposalColumns = useMemo(
    () =>
      getProposalColumns({
        onOpenApproval: (proposal) => {
          setSelectedProposal(proposal);
          approvalForm.setFieldsValue({
            approved: 'APPROVE',
            approvedAmount: proposal.requestedAmount,
          });
          setApprovalModalOpen(true);
        },
        onOpenDisburse: (proposal) => {
          setSelectedProposal(proposal);
          disburseForm.setFieldsValue({
            actualDisbursedAmount: proposal.approvedAmount || proposal.requestedAmount,
            paymentMethod: 'VCB',
          });
          setDisburseModalOpen(true);
        },
        onOpenConfirmReceipt: (proposal) => {
          setSelectedProposal(proposal);
          confirmReceiptForm.resetFields();
          setConfirmReceiptModalOpen(true);
        },
      }),
    [approvalForm, disburseForm, confirmReceiptForm]
  );

  const transactionColumns = useMemo(() => getTransactionColumns(), []);

  return {
    loading,
    activating,
    fundOverview,
    activeTab,
    setActiveTab,
    txTypeFilter,
    setTxTypeFilter,
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
    filteredTransactions,
    proposalColumns,
    transactionColumns,
    loadFundData,
    handleActivateFund,
    handleExpenseSubmit,
    handleProposalSubmit,
    handleApprovalSubmit,
    handleDisburseSubmit,
    handleConfirmReceiptSubmit,
    handleReconcileSubmit,
    handleExportLedger,
    openExpenseModal,
    openProposalModal,
    openReconcileModal,
    closeExpenseModal,
    closeProposalModal,
    closeApprovalModal,
    closeDisburseModal,
    closeConfirmReceiptModal,
    closeReconcileModal,
  };
}
