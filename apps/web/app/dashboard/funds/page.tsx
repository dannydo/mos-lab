'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Tabs,
  Button,
  Typography,
  Form,
  Select,
  Alert,
  Row,
  Col,
  Progress,
  message,
  Divider,
} from 'antd';
import {
  Wallet,
  Smartphone,
  Lock,
  Settings,
  Plus,
  RotateCw,
  ShieldCheck,
  Users,
  FileCheck,
} from 'lucide-react';
import type {
  Fund,
  FundProposal,
  FundTransaction,
} from '@mos-lab/shared';
import apiClient from '~/lib/api-client';
import { AppIcon, DataTable, StatusTag } from '~/components/ui';
import {
  ApprovalModal,
  ConfigModal,
  DisburseModal,
  ExpenseModal,
  ProposalModal,
  ReconcileModal,
} from './components/FundModals';
import { getProposalColumns, getTransactionColumns } from './components/fundColumns';

const { Title, Paragraph } = Typography;

export default function FundsManagementPage() {
  const [loading, setLoading] = useState(false);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string>('fund-telesale-card');
  const [fundOverview, setFundOverview] = useState<
    (Fund & { recentTransactions: FundTransaction[]; pendingProposals: FundProposal[] }) | null
  >(null);
  const [activeTab, setActiveTab] = useState<string>('expense');

  // Modals state
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [proposalModalOpen, setProposalModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [disburseModalOpen, setDisburseModalOpen] = useState(false);
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const [selectedProposal, setSelectedProposal] = useState<FundProposal | null>(null);

  // Forms
  const [expenseForm] = Form.useForm();
  const [proposalForm] = Form.useForm();
  const [approvalForm] = Form.useForm();
  const [disburseForm] = Form.useForm();
  const [reconcileForm] = Form.useForm();
  const [configForm] = Form.useForm();

  const loadData = async (fundIdToLoad?: string) => {
    try {
      setLoading(true);
      const targetFundId = fundIdToLoad || selectedFundId;
      const res = await apiClient.funds.list();
      if (res.success && res.data) {
        setFunds(res.data);
        const currentFund = res.data.find((f) => f.id === targetFundId) || res.data[0];
        if (currentFund) {
          setSelectedFundId(currentFund.id);
          const overviewRes = await apiClient.funds.getOverview(currentFund.id);
          if (overviewRes.success) {
            setFundOverview(overviewRes.data);
          }
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Không thể tải dữ liệu Quỹ hoạt động.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFundChange = async (fundId: string) => {
    setSelectedFundId(fundId);
    await loadData(fundId);
  };

  // 1. Thao tác Nạp card Telesale
  const handleExpenseSubmit = async (values: any) => {
    try {
      if (!fundOverview) return;
      setLoading(true);
      const res = await apiClient.funds.recordExpense(fundOverview.id, {
        amount: values.amount,
        description: values.description,
        beneficiaryStaffName: values.beneficiaryStaffName,
        beneficiaryPhone: values.beneficiaryPhone,
        telco: values.telco,
        receiptUrls: values.receiptUrl ? [values.receiptUrl] : [],
      });
      if (res.success) {
        message.success(
          `Nạp cước ${values.amount.toLocaleString('vi-VN')}đ thành công cho ${values.beneficiaryStaffName || 'nhân viên Telesale'}!`
        );
        if (res.data.isLowBalance && res.data.alertMessage) {
          message.warning(res.data.alertMessage, 6);
        }
        setExpenseModalOpen(false);
        expenseForm.resetFields();
        await loadData();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Lỗi khi ghi nhận chi tiêu.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Thao tác Tạo Đề xuất Bổ sung Quỹ
  const handleProposalSubmit = async (values: any) => {
    try {
      if (!fundOverview) return;
      setLoading(true);
      const res = await apiClient.funds.createProposal(fundOverview.id, {
        proposalType: values.proposalType || 'REPLENISHMENT',
        title: values.title,
        description: values.description,
        requestedAmount: values.requestedAmount,
      });
      if (res.success) {
        message.success('Đã gửi phiếu đề xuất bổ sung vốn quỹ thành công!');
        setProposalModalOpen(false);
        proposalForm.resetFields();
        await loadData();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Lỗi khi tạo đề xuất.');
    } finally {
      setLoading(false);
    }
  };

  // 3. CƠ CHẾ 1: Phê Duyệt Chủ Trương (Quản lý & Danny)
  const handleApprovalSubmit = async (values: any) => {
    try {
      if (!selectedProposal) return;
      setLoading(true);
      const res = await apiClient.funds.approveProposal(selectedProposal.id, {
        approved: values.approved !== false,
        approvedAmount: values.approvedAmount,
        note: values.note,
      });
      if (res.success) {
        message.success('Đã phê duyệt chủ trương và hạn mức chi thành công!');
        setApprovalModalOpen(false);
        approvalForm.resetFields();
        setSelectedProposal(null);
        await loadData();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Lỗi khi phê duyệt.');
    } finally {
      setLoading(false);
    }
  };

  // 4. CƠ CHẾ 2: Kế toán Thực thi Giải ngân & Kiểm soát Dung sai
  const handleDisburseSubmit = async (values: any) => {
    try {
      if (!selectedProposal) return;
      setLoading(true);
      const res = await apiClient.funds.disburseProposal(selectedProposal.id, {
        actualDisbursedAmount: values.actualDisbursedAmount,
        paymentMethod: values.paymentMethod,
        bankRefCode: values.bankRefCode,
        disbursementReceiptUrls: values.receiptUrl ? [values.receiptUrl] : [],
        disbursementNote: values.disbursementNote,
      });
      if (res.success) {
        message.success(res.message || 'Đã giải ngân cấp bù quỹ thành công!');
        setDisburseModalOpen(false);
        disburseForm.resetFields();
        setSelectedProposal(null);
        await loadData();
      } else if (res.reapprovalRequired) {
        message.warning(res.message || 'Vượt quá hạn mức duyệt + dung sai! Phiếu đã chuyển sang Chờ duyệt lại.', 7);
        setDisburseModalOpen(false);
        disburseForm.resetFields();
        setSelectedProposal(null);
        await loadData();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Lỗi khi thực thi giải ngân.');
    } finally {
      setLoading(false);
    }
  };

  // 5. CƠ CHẾ 3: Đối Soát, Xử Lý Chênh Lệch & Chốt Kỳ
  const handleReconcileSubmit = async (values: any) => {
    try {
      if (!fundOverview || !fundOverview.currentPeriod) return;
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
        message.success(
          `Đã chốt sổ kỳ ${res.data.closedPeriod.periodName} thành công! Đã kết chuyển số dư đầu kỳ mới: ${res.data.nextPeriod.openingBalance.toLocaleString('vi-VN')}đ.`
        );
        if (res.data.variance !== 0) {
          message.info(
            `Đã ghi nhận Bút toán Điều chỉnh ${res.data.variance > 0 ? 'Thừa' : 'Hụt'} ${Math.abs(
              res.data.variance
            ).toLocaleString('vi-VN')}đ có lưu vết.`,
            6
          );
        }
        setReconcileModalOpen(false);
        reconcileForm.resetFields();
        await loadData();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Lỗi khi chốt kỳ sổ quỹ.');
    } finally {
      setLoading(false);
    }
  };

  // 6. Cập nhật cấu hình Quỹ
  const handleConfigSubmit = async (values: any) => {
    try {
      if (!fundOverview) return;
      setLoading(true);
      const res = await apiClient.funds.updateConfig(fundOverview.id, {
        maxQuota: values.maxQuota,
        unitQuota: values.unitQuota,
        alertThresholdPercent: values.alertThresholdPercent,
        toleranceMode: values.toleranceMode,
        toleranceAmount: values.toleranceAmount,
      });
      if (res.success) {
        message.success('Cập nhật cấu hình quỹ thành công!');
        setConfigModalOpen(false);
        await loadData();
      }
    } catch (err: any) {
      message.error(err.response?.data?.message || err.message || 'Lỗi khi cập nhật cấu hình.');
    } finally {
      setLoading(false);
    }
  };

  const transactionColumns = useMemo(() => getTransactionColumns(), []);
  const proposalColumns = useMemo(
    () =>
      getProposalColumns({
        onOpenApproval: (proposal) => {
          setSelectedProposal(proposal);
          approvalForm.setFieldsValue({
            approvedAmount: proposal.approvedAmount || proposal.requestedAmount,
            note: '',
          });
          setApprovalModalOpen(true);
        },
        onOpenDisburse: (proposal) => {
          setSelectedProposal(proposal);
          disburseForm.setFieldsValue({
            actualDisbursedAmount: proposal.approvedAmount || proposal.requestedAmount,
            paymentMethod: 'VCB',
            bankRefCode: '',
            receiptUrl: '',
            disbursementNote: '',
          });
          setDisburseModalOpen(true);
        },
      }),
    [approvalForm, disburseForm]
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 1. Header & Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <AppIcon icon={Wallet} size="md" className="text-emerald-600" />
            <Title level={3} className="!mb-0">
              Quản Lý Quỹ Hoạt Động Nội Bộ (mOS Fund Master)
            </Title>
            <StatusTag status="success" label="Kinh Thánh Tài Chính mOS" className="ml-2 font-semibold" />
          </div>
          <Paragraph className="!mb-0 text-neutral-500 text-sm mt-1">
            Chuẩn mực kiểm soát nội bộ: Tách bạch chủ trương vs. giải ngân, kiểm soát dung sai và chốt kỳ sổ sách bất biến.
          </Paragraph>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedFundId}
            onChange={handleFundChange}
            className="w-64"
            options={funds.map((f) => ({
              label: `${f.name} (${Number(f.currentBalance).toLocaleString('vi-VN')} đ)`,
              value: f.id,
            }))}
          />
          <Button icon={<AppIcon icon={RotateCw} size="sm" />} onClick={() => loadData()} loading={loading}>
            Làm mới
          </Button>
          <Button
            icon={<AppIcon icon={Settings} size="sm" />}
            onClick={() => {
              if (fundOverview) {
                configForm.setFieldsValue({
                  maxQuota: fundOverview.maxQuota,
                  unitQuota: fundOverview.unitQuota,
                  alertThresholdPercent: fundOverview.alertThresholdPercent,
                  toleranceMode: fundOverview.toleranceMode,
                  toleranceAmount: fundOverview.toleranceAmount,
                });
                setConfigModalOpen(true);
              }
            }}
          >
            Cấu hình
          </Button>
        </div>
      </div>

      {/* 2. Cảnh Báo Ngưỡng Hạn Mức Quỹ (80% alert) */}
      {fundOverview?.isLowBalance && (
        <Alert
          message={
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="font-semibold text-amber-800">
                ⚠️ CẢNH BÁO: Số dư Quỹ {fundOverview.name} còn {fundOverview.currentBalance.toLocaleString('vi-VN')} đ (Đã sử dụng {fundOverview.usedPercent}% hạn mức). Đã chạm ngưỡng cảnh báo {fundOverview.alertThresholdPercent}%!
              </span>
              <Button
                type="primary"
                size="small"
                danger
                icon={<AppIcon icon={Plus} size="sm" />}
                onClick={() => {
                  proposalForm.setFieldsValue({
                    proposalType: 'REPLENISHMENT',
                    title: `Đề xuất cấp bù Quỹ ${fundOverview.name}`,
                    requestedAmount: fundOverview.usedAmount,
                    description: `Bổ sung ${fundOverview.usedAmount.toLocaleString('vi-VN')}đ để khôi phục hạn mức định mức 1.000.000đ`,
                  });
                  setProposalModalOpen(true);
                }}
              >
                Tạo Đề Xuất Bổ Sung Quỹ
              </Button>
            </div>
          }
          type="warning"
          showIcon
          className="border-amber-300 bg-amber-50"
        />
      )}

      {/* 3. Stat Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-neutral-200">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Số Dư Thực Tế Quỹ</div>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums mt-1">
              {(fundOverview?.currentBalance || 0).toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs text-neutral-400 mt-2">
              Khả dụng cho nạp card / chi tiêu nội bộ
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-neutral-200">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Hạn Mức Quỹ Định Mức</div>
            <div className="text-2xl font-bold text-neutral-800 tabular-nums mt-1">
              {(fundOverview?.maxQuota || 0).toLocaleString('vi-VN')} đ
            </div>
            <div className="text-xs text-neutral-500 mt-2">
              Định mức nạp card: <span className="font-semibold tabular-nums">{(fundOverview?.unitQuota || 30000).toLocaleString('vi-VN')} đ/lần</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-neutral-200">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Tỷ Lệ Đã Chi Dùng</div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-2xl font-bold text-neutral-800 tabular-nums">
                {fundOverview?.usedPercent || 0}%
              </span>
              <span className="text-xs font-medium text-neutral-500 tabular-nums">
                {(fundOverview?.usedAmount || 0).toLocaleString('vi-VN')} đ
              </span>
            </div>
            <Progress
              percent={fundOverview?.usedPercent || 0}
              size="small"
              status={fundOverview?.isLowBalance ? 'exception' : 'active'}
              className="mt-1"
            />
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-neutral-200">
            <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Kỳ Sổ Quỹ Hiện Tại</div>
            <div className="text-lg font-bold text-neutral-800 mt-1 truncate">
              {fundOverview?.currentPeriod?.periodName || 'Chưa khởi tạo kỳ'}
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <StatusTag status="cyan" label="Đang mở (Ghi sổ)" />
              <Button
                type="link"
                size="small"
                icon={<AppIcon icon={Lock} size="sm" />}
                className="!p-0 text-xs"
                onClick={() => {
                  reconcileForm.setFieldsValue({
                    actualBalance: fundOverview?.currentBalance || 0,
                    notes: '',
                  });
                  setReconcileModalOpen(true);
                }}
              >
                Đối soát & Chốt kỳ
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 4. Tab Navigation */}
      <Card className="shadow-sm border-neutral-200">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'expense',
              label: (
                <span className="flex items-center gap-1.5 font-medium">
                  <AppIcon icon={Smartphone} size="sm" />
                  Nạp Card Telesale (Thủ Quỹ)
                </span>
              ),
              children: (
                <div className="space-y-6 pt-2">
                  <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-emerald-900 text-base">
                        Nạp Tiền Điện Thoại Trực Tiếp Cho Nhân Sự Telesale
                      </div>
                      <div className="text-xs text-emerald-700 mt-1">
                        Thủ quỹ Bích Phượng thao tác nạp tiền trong 15 giây. Hệ thống tự động trừ số dư thực tế và cảnh báo khi quỹ chạm ngưỡng 80%.
                      </div>
                    </div>
                    <Button
                      type="primary"
                      size="large"
                      icon={<AppIcon icon={Plus} size="sm" />}
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => {
                        expenseForm.setFieldsValue({
                          amount: fundOverview?.unitQuota || 30000,
                          telco: 'VIETTEL',
                          description: 'Nạp cước Viettel 30.000đ cho Telesale',
                        });
                        setExpenseModalOpen(true);
                      }}
                    >
                      Nạp Card 30.000đ (Thao Tác Nhanh)
                    </Button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-semibold text-neutral-800 text-base">
                        Nhật Ký Giao Dịch Thu / Chi Gần Nhất
                      </div>
                      <span className="text-xs text-neutral-500">
                        Hiển thị 30 giao dịch mới nhất
                      </span>
                    </div>
                    <DataTable
                      columns={transactionColumns}
                      dataSource={fundOverview?.recentTransactions || []}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      size="small"
                      bordered
                    />
                  </div>
                </div>
              ),
            },
            {
              key: 'proposals',
              label: (
                <span className="flex items-center gap-1.5 font-medium">
                  <AppIcon icon={ShieldCheck} size="sm" />
                  Đề Xuất & Giải Ngân (2 Cổng Kiểm Soát)
                </span>
              ),
              children: (
                <div className="space-y-6 pt-2">
                  <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-sky-950 text-base">
                        Chuẩn Mực Kiểm Soát: Tách Bạch Chủ Trương & Thực Thi Giải Ngân
                      </div>
                      <div className="text-xs text-sky-800 mt-1">
                        • Cấp Duyệt (Quản lý & Danny): Chỉ duyệt hạn mức tối đa. Cấp duyệt không chuyển tiền.
                        <br />
                        • Kế Toán (Bùi Tổng): Bắt buộc nhập mã GD ngân hàng & ủy nhiệm chi. Tự động chặn nếu chuyển vượt dung sai.
                      </div>
                    </div>
                    <Button
                      type="primary"
                      icon={<AppIcon icon={Plus} size="sm" />}
                      onClick={() => {
                        proposalForm.setFieldsValue({
                          proposalType: 'REPLENISHMENT',
                          title: `Đề xuất cấp bù Quỹ ${fundOverview?.name}`,
                          requestedAmount: fundOverview?.usedAmount || 500000,
                          description: 'Cấp bù vốn định mức hoạt động của quỹ',
                        });
                        setProposalModalOpen(true);
                      }}
                    >
                      Tạo Đề Xuất Bổ Sung Vốn
                    </Button>
                  </div>

                  <DataTable
                    columns={proposalColumns}
                    dataSource={fundOverview?.pendingProposals || []}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    size="small"
                    bordered
                  />
                </div>
              ),
            },
            {
              key: 'periods',
              label: (
                <span className="flex items-center gap-1.5 font-medium">
                  <AppIcon icon={Lock} size="sm" />
                  Đối Soát & Chốt Kỳ Sổ Quỹ
                </span>
              ),
              children: (
                <div className="space-y-6 pt-2">
                  <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="font-semibold text-purple-950 text-base">
                        Kiểm Kê Số Dư & Khóa Sổ Kỳ Kế Toán Bất Biến
                      </div>
                      <div className="text-xs text-purple-800 mt-1">
                        Cuối mỗi kỳ (tháng), kiểm quỹ đối chiếu Số dư thực tế vs Số dư sổ sách. Nếu có chênh lệch, hệ thống sinh bút toán điều chỉnh có lưu vết trước khi khóa sổ.
                      </div>
                    </div>
                    <Button
                      type="primary"
                      className="bg-purple-600 hover:bg-purple-700"
                      icon={<AppIcon icon={FileCheck} size="sm" />}
                      onClick={() => {
                        reconcileForm.setFieldsValue({
                          actualBalance: fundOverview?.currentBalance || 0,
                          notes: '',
                        });
                        setReconcileModalOpen(true);
                      }}
                    >
                      Tiến Hành Chốt Kỳ Hiện Tại
                    </Button>
                  </div>

                  <Card title="Kỳ Kế Toán Đang Mở" size="small" className="border-neutral-200">
                    <Row gutter={[16, 16]}>
                      <Col xs={12} sm={6}>
                        <div className="text-xs text-neutral-500">Tên kỳ</div>
                        <div className="font-bold text-neutral-800 mt-1">
                          {fundOverview?.currentPeriod?.periodName}
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div className="text-xs text-neutral-500">Số dư đầu kỳ</div>
                        <div className="font-bold text-neutral-800 tabular-nums mt-1">
                          {(fundOverview?.currentPeriod?.openingBalance || 0).toLocaleString('vi-VN')} đ
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div className="text-xs text-neutral-500">Tổng thu trong kỳ</div>
                        <div className="font-bold text-emerald-600 tabular-nums mt-1">
                          +{(fundOverview?.currentPeriod?.totalIncome || 0).toLocaleString('vi-VN')} đ
                        </div>
                      </Col>
                      <Col xs={12} sm={6}>
                        <div className="text-xs text-neutral-500">Tổng chi trong kỳ</div>
                        <div className="font-bold text-rose-600 tabular-nums mt-1">
                          -{(fundOverview?.currentPeriod?.totalExpense || 0).toLocaleString('vi-VN')} đ
                        </div>
                      </Col>
                    </Row>
                  </Card>
                </div>
              ),
            },
            {
              key: 'roles',
              label: (
                <span className="flex items-center gap-1.5 font-medium">
                  <AppIcon icon={Users} size="sm" />
                  Vai Trò Động & Phân Quyền
                </span>
              ),
              children: (
                <div className="space-y-4 pt-2">
                  <div className="text-sm text-neutral-600 mb-2">
                    Các vai trò được cấu hình động theo từng quỹ (không cố định cứng trong mã nguồn):
                  </div>
                  <Row gutter={[16, 16]}>
                    {fundOverview?.roles?.map((role) => {
                      const assignment = fundOverview.assignments?.find((a) => a.roleKey === role.roleKey);
                      return (
                        <Col xs={24} sm={12} lg={6} key={role.id}>
                          <Card size="small" className="border-neutral-200 h-full">
                            <div className="font-bold text-neutral-800">{role.roleName}</div>
                            <StatusTag status="processing" label={role.roleKey} className="mt-1 font-mono text-[11px]" />
                            <Divider className="my-2" />
                            <div className="text-xs text-neutral-500">Nhân sự phụ trách:</div>
                            <div className="font-semibold text-neutral-800 mt-0.5">
                              {assignment?.staffName || 'Chưa phân công'}
                            </div>
                            <div className="text-xs text-neutral-400 mt-2">
                              Quyền: {role.permissions.join(', ')}
                            </div>
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* MODALS */}
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
        onCancel={() => setApprovalModalOpen(false)}
        onSubmit={handleApprovalSubmit}
        loading={loading}
        form={approvalForm}
        proposal={selectedProposal}
      />

      <DisburseModal
        open={disburseModalOpen}
        onCancel={() => setDisburseModalOpen(false)}
        onSubmit={handleDisburseSubmit}
        loading={loading}
        form={disburseForm}
        proposal={selectedProposal}
        fund={fundOverview}
      />

      <ReconcileModal
        open={reconcileModalOpen}
        onCancel={() => setReconcileModalOpen(false)}
        onSubmit={handleReconcileSubmit}
        loading={loading}
        form={reconcileForm}
        currentBalance={fundOverview?.currentBalance}
      />

      <ConfigModal
        open={configModalOpen}
        onCancel={() => setConfigModalOpen(false)}
        onSubmit={handleConfigSubmit}
        loading={loading}
        form={configForm}
      />
    </div>
  );
}
