'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Button,
  Typography,
  Space,
  Row,
  Col,
  Progress,
  message,
  Tabs,
  Popconfirm,
  Segmented,
  Form,
  Card,
  Tooltip,
} from 'antd';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  FileCheck,
  RotateCw,
  Plus,
  Play,
  Lock,
  Download,
  AlertTriangle,
  Receipt,
  Users,
  ShieldCheck,
  Calendar,
  Sparkles,
} from 'lucide-react';
import type {
  Fund,
  FundProposal,
  FundTransaction,
  FundPeriod,
  FundStatus,
} from '@mos-lab/shared';
import apiClient from '~/lib/api-client';
import {
  AdaptiveDrawer,
  AppIcon,
  DataTable,
  StatePanel,
  StatusTag,
} from '~/components/ui';
import {
  ApprovalModal,
  ConfigModal,
  DisburseModal,
  ExpenseModal,
  ProposalModal,
  ReconcileModal,
  ConfirmReceiptModal,
} from './FundModals';
import { getProposalColumns, getTransactionColumns } from './fundColumns';

const { Title, Text, Paragraph } = Typography;

interface FundDetailDrawerProps {
  open: boolean;
  fundId: string | null;
  onClose: () => void;
  onRefreshList?: () => void;
}

export default function FundDetailDrawer({
  open,
  fundId,
  onClose,
  onRefreshList,
}: FundDetailDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(false);
  const [fundOverview, setFundOverview] = useState<
    (Fund & { recentTransactions: FundTransaction[]; pendingProposals: FundProposal[] }) | null
  >(null);
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

  const loadFundData = async () => {
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
  };

  useEffect(() => {
    if (open && fundId) {
      loadFundData();
    } else {
      setFundOverview(null);
    }
  }, [open, fundId]);

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
  const handleExpenseSubmit = async (values: any) => {
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
        if (res.data.isLowBalance && res.data.alertMessage) {
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
  const handleProposalSubmit = async (values: any) => {
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
  const handleApprovalSubmit = async (values: any) => {
    if (!selectedProposal) return;
    try {
      setLoading(true);
      const res = await apiClient.funds.approveProposal(selectedProposal.id, {
        approved: values.approved === 'APPROVE',
        approvedAmount: values.approvedAmount,
        note: values.note,
      });
      if (res.success) {
        message.success(
          values.approved === 'APPROVE'
            ? 'Đã duyệt đề xuất thành công!'
            : 'Đã từ chối đề xuất.'
        );
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
  const handleDisburseSubmit = async (values: any) => {
    if (!selectedProposal) return;
    try {
      setLoading(true);
      const res = await apiClient.funds.disburseProposal(selectedProposal.id, {
        actualDisbursedAmount: values.actualDisbursedAmount,
        paymentMethod: values.paymentMethod,
        bankRefCode: values.bankRefCode,
        disbursementReceiptUrls: values.disbursementReceiptUrl
          ? [values.disbursementReceiptUrl]
          : [],
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
  const handleConfirmReceiptSubmit = async (values: any) => {
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
  const handleReconcileSubmit = async (values: any) => {
    if (!fundOverview || !fundOverview.currentPeriod) return;
    try {
      setLoading(true);
      const res = await apiClient.funds.reconcileAndLockPeriod(
        fundOverview.id,
        fundOverview.currentPeriod.id,
        {
          actualBalance: values.actualBalance,
          notes: values.notes,
        }
      );
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
    if (!fundOverview || !fundOverview.recentTransactions) {
      message.warning('Chưa có dữ liệu giao dịch để xuất.');
      return;
    }

    const headers = [
      'Mã Giao Dịch',
      'Thời Gian',
      'Loại Giao Dịch',
      'Số Tiền (VNĐ)',
      'Số Dư Trước (VNĐ)',
      'Số Dư Sau (VNĐ)',
      'Người Thực Hiện',
      'Người/Đơn Vị Thụ Hưởng',
      'Nội Dung Chi Tiết',
      'Trạng Thái',
    ];

    const rows = fundOverview.recentTransactions.map((tx) => [
      `"${tx.id}"`,
      `"${new Date(tx.createdAt).toLocaleString('vi-VN')}"`,
      `"${tx.type === 'TOPUP' ? 'Cấp bù vốn' : tx.type === 'EXPENSE' ? 'Chi phí' : 'Điều chỉnh'}"`,
      tx.amount,
      tx.balanceBefore,
      tx.balanceAfter,
      `"${tx.actorStaffName || ''}"`,
      `"${tx.beneficiaryStaffName || ''}${tx.beneficiaryPhone ? ` (${tx.beneficiaryPhone})` : ''}"`,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      `"${tx.status === 'LOCKED' ? 'Đã khóa sổ' : 'Hoàn tất'}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `so-quy-${fundOverview.code}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('Đã xuất báo cáo sổ quỹ chi tiết (CSV) thành công.');
  };

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

  const renderStatusTag = (status: FundStatus, isLowBalance?: boolean) => {
    if (isLowBalance) {
      return (
        <StatusTag
          status="warning"
          label="SẮP HẾT HẠN MỨC"
          icon={<AppIcon icon={AlertTriangle} size="sm" />}
        />
      );
    }
    switch (status) {
      case 'DRAFT':
        return <StatusTag status="default" label="📝 BẢN NHÁP (DRAFT)" />;
      case 'ACTIVE':
        return <StatusTag status="success" label="🟢 ĐANG HOẠT ĐỘNG" />;
      case 'FROZEN':
        return <StatusTag status="warning" label="⏸️ TẠM NGƯNG" />;
      case 'CLOSED':
        return <StatusTag status="default" label="🔒 ĐÃ ĐÓNG" />;
      default:
        return <StatusTag status="default" label={status} />;
    }
  };

  const isDraft = fundOverview?.status === 'DRAFT';
  const isActive = fundOverview?.status === 'ACTIVE';

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span className="flex items-center gap-1.5 font-medium">
          <AppIcon icon={Wallet} size="sm" />
          <span>1. Tổng Quan & Số Dư</span>
        </span>
      ),
      children: (
        <div className="space-y-6 py-2">
          {/* Metrics 4 Cards */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="text-xs text-slate-500 font-medium">Số dư hiện tại</div>
                <div className="text-xl md:text-2xl font-bold tabular-nums text-slate-900 dark:text-white mt-1">
                  {Number(fundOverview?.currentBalance || 0).toLocaleString('vi-VN')} đ
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Progress
                    percent={fundOverview?.usedPercent || 0}
                    size="small"
                    showInfo={false}
                    status={fundOverview?.isLowBalance ? 'exception' : 'success'}
                  />
                  <span className="text-xs text-slate-500 tabular-nums font-semibold">
                    {fundOverview?.usedPercent || 0}%
                  </span>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="text-xs text-slate-500 font-medium">Hạn mức tối đa</div>
                <div className="text-xl md:text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                  {Number(fundOverview?.maxQuota || 0).toLocaleString('vi-VN')} đ
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Ngưỡng cảnh báo: <strong>{fundOverview?.alertThresholdPercent || 80}%</strong>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="text-xs text-slate-500 font-medium">Định mức chi / lần</div>
                <div className="text-xl md:text-2xl font-bold tabular-nums text-sky-600 dark:text-sky-400 mt-1">
                  {Number(fundOverview?.unitQuota || 0).toLocaleString('vi-VN')} đ
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Dung sai: <strong>{fundOverview?.toleranceMode || 'STRICT'}</strong>
                </div>
              </Card>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="text-xs text-slate-500 font-medium">Kỳ kế toán hiện tại</div>
                <div className="text-lg md:text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 line-clamp-1">
                  {fundOverview?.currentPeriod?.periodName || 'Chưa mở kỳ'}
                </div>
                <div className="text-xs text-slate-400 mt-2">
                  Thu kỳ: {Number(fundOverview?.currentPeriod?.totalIncome || 0).toLocaleString('vi-VN')}đ
                </div>
              </Card>
            </Col>
          </Row>

          {/* Alert if low balance */}
          {fundOverview?.isLowBalance && (
            <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2.5">
                <AppIcon icon={AlertTriangle} size="md" className="text-amber-500 flex-shrink-0" />
                <span className="text-sm font-medium">
                  Cảnh báo: Số dư quỹ đang chạm ngưỡng cảnh báo ({fundOverview.usedPercent}% hạn mức đã dùng). Đề nghị tạo phiếu đề xuất bổ sung vốn quỹ.
                </span>
              </div>
              <Button
                type="primary"
                size="small"
                className="bg-amber-600 hover:bg-amber-500 text-white font-semibold flex-shrink-0"
                onClick={() => {
                  proposalForm.resetFields();
                  setProposalModalOpen(true);
                }}
              >
                Bổ sung vốn ngay
              </Button>
            </div>
          )}

          {/* Current Period Summary */}
          {fundOverview?.currentPeriod && (
            <Card
              title={
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold">
                  <AppIcon icon={Calendar} size="sm" className="text-purple-500" />
                  <span>Sổ Kế Toán Kỳ Đang Mở: {fundOverview.currentPeriod.periodName}</span>
                </div>
              }
              className="shadow-sm border-slate-200 dark:border-slate-800"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 block text-xs">Số dư đầu kỳ:</span>
                  <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {Number(fundOverview.currentPeriod.openingBalance).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Tổng thu trong kỳ:</span>
                  <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                    +{Number(fundOverview.currentPeriod.totalIncome).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Tổng chi trong kỳ:</span>
                  <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                    -{Number(fundOverview.currentPeriod.totalExpense).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-xs">Số dư sổ sách hệ thống:</span>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                    {Number(fundOverview.currentBalance).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Roles and Assignments */}
          <Card
            title={
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-semibold">
                <AppIcon icon={Users} size="sm" className="text-emerald-500" />
                <span>Nhân Sự Phụ Trách & Phân Quyền Quỹ</span>
              </div>
            }
            className="shadow-sm border-slate-200 dark:border-slate-800"
          >
            {fundOverview?.assignments && fundOverview.assignments.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fundOverview.assignments.map((a) => (
                  <div
                    key={a.id}
                    className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-slate-800 dark:text-slate-200 block text-sm">
                        {a.staffName}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">ID: {a.staffId}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {a.roleKey === 'HOLDER'
                        ? 'Thủ quỹ / Giữ quỹ'
                        : a.roleKey === 'APPROVER_L1'
                        ? 'Duyệt cấp 1'
                        : a.roleKey === 'APPROVER_L2'
                        ? 'Duyệt cấp 2'
                        : a.roleKey === 'DISBURSER'
                        ? 'Kế toán giải ngân'
                        : 'Kiểm toán'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">Chưa có phân công nhân sự cụ thể.</div>
            )}
          </Card>
        </div>
      ),
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
        <div className="space-y-4 py-2">
          {/* Ledger toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <Segmented
              value={txTypeFilter}
              onChange={(val) => setTxTypeFilter(val as string)}
              options={[
                { label: 'Tất cả GD', value: 'ALL' },
                { label: 'Cấp Bù Vốn (+)', value: 'TOPUP' },
                { label: 'Chi Phí (-)', value: 'EXPENSE' },
                { label: 'Điều Chỉnh (±)', value: 'ADJUSTMENT' },
              ]}
            />
            <Space>
              <Button
                icon={<AppIcon icon={Download} size="sm" />}
                onClick={handleExportLedger}
              >
                Xuất Excel / CSV Sổ Quỹ
              </Button>
              {isActive && (
                <Button
                  type="primary"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  icon={<AppIcon icon={Plus} size="sm" />}
                  onClick={() => {
                    expenseForm.resetFields();
                    setExpenseModalOpen(true);
                  }}
                >
                  Ghi Nhận Thu/Chi
                </Button>
              )}
            </Space>
          </div>

          <DataTable
            columns={transactionColumns}
            dataSource={filteredTransactions}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 15 }}
            locale={{
              emptyText: (
                <StatePanel
                  kind="empty"
                  title="Chưa có giao dịch nào"
                  description="Các giao dịch nạp card, chi tiêu hoặc cấp bù quỹ sẽ được ghi nhận tại đây."
                />
              ),
            }}
          />
        </div>
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
        <div className="space-y-4 py-2">
          <div className="flex justify-between items-center p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
                Danh Sách Đề Xuất Bổ Sung Vốn & Quy Trình Duyệt Động
              </span>
              <p className="text-xs text-slate-500 m-0 mt-0.5">
                Luồng chuẩn: Tạo đề xuất → Duyệt chủ trương → Kế toán giải ngân → Thủ quỹ xác nhận nhận tiền.
              </p>
            </div>
            {isActive && (
              <Button
                type="primary"
                className="bg-sky-600 hover:bg-sky-500 text-white font-semibold"
                icon={<AppIcon icon={Plus} size="sm" />}
                onClick={() => {
                  proposalForm.resetFields();
                  setProposalModalOpen(true);
                }}
              >
                Tạo Đề Xuất Cấp Vốn
              </Button>
            )}
          </div>

          <DataTable
            columns={proposalColumns}
            dataSource={fundOverview?.pendingProposals || []}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
            locale={{
              emptyText: (
                <StatePanel
                  kind="empty"
                  title="Chưa có phiếu đề xuất nào"
                  description="Bấm 'Tạo Đề Xuất Cấp Vốn' để khởi tạo phiếu bổ sung vốn mới cho quỹ."
                />
              ),
            }}
          />
        </div>
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
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <Title level={5} className="!m-0 !font-bold flex items-center gap-2">
                <AppIcon icon={Lock} size="sm" className="text-purple-600" />
                <span>Kiểm Kê Số Dư & Khóa Sổ Kỳ Kế Toán</span>
              </Title>
              <Paragraph type="secondary" className="text-xs !mb-0 mt-1">
                Đối soát số dư kiểm kê thực tế tại két/tài khoản với số dư sổ sách hệ thống. Nếu có chênh lệch, hệ thống tự động sinh bút toán điều chỉnh và chuyển số dư sang kỳ mới.
              </Paragraph>
            </div>

            {isActive && (
              <Button
                type="primary"
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold"
                icon={<AppIcon icon={Lock} size="sm" />}
                onClick={() => {
                  reconcileForm.setFieldsValue({
                    actualBalance: fundOverview?.currentBalance || 0,
                  });
                  setReconcileModalOpen(true);
                }}
              >
                Đối Soát & Chốt Kỳ
              </Button>
            )}
          </div>

          {fundOverview?.currentPeriod && (
            <Card title="Kỳ Kế Toán Đang Vận Hành" className="shadow-sm border-slate-200 dark:border-slate-800">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Tên kỳ:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {fundOverview.currentPeriod.periodName}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Thời gian kỳ:</span>
                  <span className="tabular-nums text-slate-700 dark:text-slate-300">
                    {new Date(fundOverview.currentPeriod.startDate).toLocaleDateString('vi-VN')} –{' '}
                    {new Date(fundOverview.currentPeriod.endDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Số dư đầu kỳ:</span>
                  <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                    {Number(fundOverview.currentPeriod.openingBalance).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Tổng thu:</span>
                  <span className="font-semibold tabular-nums text-emerald-600">
                    +{Number(fundOverview.currentPeriod.totalIncome).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Tổng chi:</span>
                  <span className="font-semibold tabular-nums text-rose-600">
                    -{Number(fundOverview.currentPeriod.totalExpense).toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500 font-medium">Số dư hệ thống hiện tại:</span>
                  <span className="font-bold tabular-nums text-base text-slate-900 dark:text-white">
                    {Number(fundOverview.currentBalance).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <AdaptiveDrawer
        open={open}
        onClose={onClose}
        width={1000}
        title={
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-slate-900 dark:text-white">
              {fundOverview?.name || 'Vận Hành Quỹ Nội Bộ'}
            </span>
            {fundOverview?.code && (
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {fundOverview.code}
              </span>
            )}
            {fundOverview && renderStatusTag(fundOverview.status, fundOverview.isLowBalance)}
          </div>
        }
        extra={
          <Space wrap size="small">
            {isDraft && (
              <Popconfirm
                title="Kích hoạt Quỹ hoạt động"
                description="Bạn có chắc chắn muốn kích hoạt quỹ từ Bản nháp sang Đang hoạt động không?"
                onConfirm={handleActivateFund}
                okText="Kích hoạt ngay"
                cancelText="Hủy"
                okButtonProps={{ loading: activating }}
              >
                <Button
                  type="primary"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                  icon={<AppIcon icon={Sparkles} size="sm" />}
                  loading={activating}
                >
                  Kích Hoạt Quỹ
                </Button>
              </Popconfirm>
            )}

            {isActive && (
              <>
                <Button
                  type="primary"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                  icon={<AppIcon icon={Plus} size="sm" />}
                  onClick={() => {
                    expenseForm.resetFields();
                    setExpenseModalOpen(true);
                  }}
                >
                  Thu/Chi
                </Button>
                <Button
                  className="border-sky-600 text-sky-600 font-semibold"
                  icon={<AppIcon icon={ArrowUpRight} size="sm" />}
                  onClick={() => {
                    proposalForm.resetFields();
                    setProposalModalOpen(true);
                  }}
                >
                  Cấp Vốn
                </Button>
              </>
            )}

            <Button
              icon={<AppIcon icon={RotateCw} size="sm" />}
              onClick={loadFundData}
              loading={loading}
            />
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </AdaptiveDrawer>

      {/* Operational Modals */}
      <ExpenseModal
        open={expenseModalOpen}
        onCancel={() => setExpenseModalOpen(false)}
        onSubmit={handleExpenseSubmit}
        loading={loading}
        form={expenseForm}
        unitQuota={fundOverview?.unitQuota}
      />

      <ProposalModal
        open={proposalModalOpen}
        onCancel={() => setProposalModalOpen(false)}
        onSubmit={handleProposalSubmit}
        loading={loading}
        form={proposalForm}
      />

      <ApprovalModal
        open={approvalModalOpen}
        onCancel={() => {
          setApprovalModalOpen(false);
          setSelectedProposal(null);
        }}
        onSubmit={handleApprovalSubmit}
        loading={loading}
        form={approvalForm}
        proposal={selectedProposal}
      />

      <DisburseModal
        open={disburseModalOpen}
        onCancel={() => {
          setDisburseModalOpen(false);
          setSelectedProposal(null);
        }}
        onSubmit={handleDisburseSubmit}
        loading={loading}
        form={disburseForm}
        proposal={selectedProposal}
        fund={fundOverview}
      />

      <ConfirmReceiptModal
        open={confirmReceiptModalOpen}
        onCancel={() => {
          setConfirmReceiptModalOpen(false);
          setSelectedProposal(null);
        }}
        onSubmit={handleConfirmReceiptSubmit}
        loading={loading}
        form={confirmReceiptForm}
        proposal={selectedProposal}
      />

      <ReconcileModal
        open={reconcileModalOpen}
        onCancel={() => setReconcileModalOpen(false)}
        onSubmit={handleReconcileSubmit}
        loading={loading}
        form={reconcileForm}
        currentBalance={Number(fundOverview?.currentBalance || 0)}
      />
    </>
  );
}
