'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Button, Card, Col, DatePicker, Form, Row, Select, Tabs, message, Alert, Badge } from 'antd';
import {
  WalletCards,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  Download,
  Plus,
  Landmark,
  Percent,
  SlidersHorizontal,
} from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { apiClient } from '../../../../lib/api-client';
import { PageHeader, AppIcon } from '../../../../components/ui';
import type {
  CashAccount,
  CashFlowEntry,
  CashFlowForecastResponse,
  CashFlowPriority,
  CashFlowStatus,
  CashFlowTimelinePoint,
} from '@mos-lab/shared';
import { ExpenseModal } from './components/ExpenseModal';
import { IncomeModal } from './components/IncomeModal';
import { AccountModal } from './components/AccountModal';
import { AdjustBalanceModal } from './components/AdjustBalanceModal';
import { DayInspectionModal } from './components/DayInspectionModal';
import { TimelineOverviewTab } from './components/TimelineOverviewTab';
import { OutflowTab } from './components/OutflowTab';
import { InflowTab } from './components/InflowTab';

const { RangePicker } = DatePicker;

const CATEGORY_NAMES: Record<string, string> = {
  REVENUE_SERVICE: 'Doanh thu Dịch vụ',
  REVENUE_PRODUCT: 'Bán lẻ Sản phẩm',
  REVENUE_ACADEMY: 'Học phí Academy',
  REVENUE_OTHER: 'Thu nhập khác',
  SALARY: 'Lương & Thù lao',
  RENT: 'Thuê mặt bằng',
  SUPPLIER_MATERIAL: 'Vật tư & NCC',
  TAX: 'Thuế (TNDN & GTGT)',
  TRANSACTION_FEE: 'Phí giao dịch / POS',
  OPEX: 'Chi phí vận hành',
  OTHER: 'Chi phí khác',
};

const PRIORITY_META: Record<CashFlowPriority, { label: string; badgeClass: string; desc: string }> = {
  CRITICAL: {
    label: 'Bắt buộc / Khẩn cấp',
    badgeClass:
      'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
    desc: 'Lương, mặt bằng, thuế đến hạn - không thể hoãn',
  },
  HIGH: {
    label: 'Thiết yếu / Ưu tiên cao',
    badgeClass:
      'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    desc: 'Vật tư phục vụ khách, tiền điện mạng',
  },
  MEDIUM: {
    label: 'Bình thường',
    badgeClass:
      'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    desc: 'Bảo trì định kỳ, văn phòng phẩm',
  },
  LOW: {
    label: 'Có thể hoãn',
    badgeClass:
      'bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400 border border-slate-200 dark:border-slate-800',
    desc: 'Trang trí, nâng cấp decor khi dòng tiền dồi dào',
  },
};

const STATUS_META: Record<CashFlowStatus, { label: string; badgeClass: string }> = {
  PENDING: {
    label: 'Chờ duyệt / Dự kiến',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  },
  APPROVED: {
    label: 'Đã duyệt chi',
    badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  },
  PAID: {
    label: 'Đã thanh toán',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  COLLECTED: {
    label: 'Đã thu tiền',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  OVERDUE: {
    label: 'Trễ hạn',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400',
  },
  DEFERRED: {
    label: 'Tạm hoãn chi',
    badgeClass: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500',
  },
};

export default function CashFlowForecastPage() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs().add(30, 'day')]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('overview');

  const [loading, setLoading] = useState<boolean>(true);
  const [forecastData, setForecastData] = useState<CashFlowForecastResponse | null>(null);
  const [selectedDayPoint, setSelectedDayPoint] = useState<CashFlowTimelinePoint | null>(null);

  const [outflowItems, setOutflowItems] = useState<CashFlowEntry[]>([]);
  const [inflowItems, setInflowItems] = useState<CashFlowEntry[]>([]);
  const [entriesLoading, setEntriesLoading] = useState<boolean>(false);
  const [outflowPriorityFilter, setOutflowPriorityFilter] = useState<string>('all');
  const [outflowVatFilter, setOutflowVatFilter] = useState<string>('all');
  const [outflowStatusFilter, setOutflowStatusFilter] = useState<string>('all');

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState<boolean>(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isAdjustBalanceModalOpen, setIsAdjustBalanceModalOpen] = useState<boolean>(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<CashAccount | null>(null);

  const [expenseForm] = Form.useForm();
  const [incomeForm] = Form.useForm();
  const [accountForm] = Form.useForm();

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.cashFlow.getForecast({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore !== 'all' ? selectedStore : undefined,
        accountId: selectedAccount !== 'all' ? selectedAccount : undefined,
      });
      if (res.success && res.data) {
        setForecastData(res.data);
      }
    } catch {
      message.error('Không thể tải dữ liệu dự báo dòng tiền');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedStore, selectedAccount]);

  const fetchEntries = useCallback(async () => {
    setEntriesLoading(true);
    try {
      const [outflowRes, inflowRes] = await Promise.all([
        apiClient.cashFlow.listEntries({
          flowType: 'OUTFLOW',
          priority: outflowPriorityFilter !== 'all' ? (outflowPriorityFilter as CashFlowPriority) : undefined,
          hasVat: outflowVatFilter === 'all' ? undefined : outflowVatFilter === 'vat',
          status: outflowStatusFilter !== 'all' ? (outflowStatusFilter as CashFlowStatus) : undefined,
          storeId: selectedStore !== 'all' ? parseInt(selectedStore, 10) : undefined,
          accountId: selectedAccount !== 'all' ? parseInt(selectedAccount, 10) : undefined,
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
          limit: 100,
        }),
        apiClient.cashFlow.listEntries({
          flowType: 'INFLOW',
          storeId: selectedStore !== 'all' ? parseInt(selectedStore, 10) : undefined,
          accountId: selectedAccount !== 'all' ? parseInt(selectedAccount, 10) : undefined,
          startDate: dateRange[0].format('YYYY-MM-DD'),
          endDate: dateRange[1].format('YYYY-MM-DD'),
          limit: 100,
        }),
      ]);

      if (outflowRes.success && outflowRes.data) {
        setOutflowItems(outflowRes.data.items);
      }
      if (inflowRes.success && inflowRes.data) {
        setInflowItems(inflowRes.data.items);
      }
    } catch {
      message.error('Không thể tải danh sách thu chi');
    } finally {
      setEntriesLoading(false);
    }
  }, [dateRange, selectedStore, selectedAccount, outflowPriorityFilter, outflowVatFilter, outflowStatusFilter]);

  useEffect(() => {
    fetchForecast();
    fetchEntries();
  }, [fetchForecast, fetchEntries]);

  const handleExportCsv = async () => {
    try {
      message.loading({ content: 'Đang chuẩn bị file báo cáo...', key: 'exportCsv' });
      const blob = await apiClient.cashFlow.exportCsv({
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
        storeId: selectedStore !== 'all' ? selectedStore : undefined,
      });
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cash-flow-forecast-${dayjs().format('YYYY-MM-DD')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success({ content: 'Tải file CSV dự báo dòng tiền thành công!', key: 'exportCsv' });
    } catch {
      message.error({ content: 'Không thể xuất file báo cáo', key: 'exportCsv' });
    }
  };

  const handleCreateExpense = async (values: any) => {
    try {
      const res = await apiClient.cashFlow.createEntry({
        flowType: 'OUTFLOW',
        category: values.category,
        title: values.title,
        description: values.description,
        amount: values.amount,
        hasVat: Boolean(values.hasVat),
        vatRate: values.hasVat ? values.vatRate : 0,
        priority: values.priority || 'MEDIUM',
        status: values.status || 'PENDING',
        expectedDate: values.expectedDate.format('YYYY-MM-DD'),
        dueDate: values.dueDate ? values.dueDate.format('YYYY-MM-DD') : undefined,
        storeId: values.storeId,
        accountId: values.accountId,
        paymentMethod: values.paymentMethod,
        isRecurring: Boolean(values.isRecurring),
        recurringInterval: values.recurringInterval,
      });
      if (res.success) {
        message.success('Đã thêm kế hoạch chi tiêu mới thành công!');
        setIsExpenseModalOpen(false);
        expenseForm.resetFields();
        fetchForecast();
        fetchEntries();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể tạo khoản chi');
    }
  };

  const handleCreateIncome = async (values: any) => {
    try {
      const res = await apiClient.cashFlow.createEntry({
        flowType: 'INFLOW',
        category: values.category,
        title: values.title,
        description: values.description,
        amount: values.amount,
        hasVat: false,
        vatRate: 0,
        priority: 'MEDIUM',
        status: values.status || 'PENDING',
        expectedDate: values.expectedDate.format('YYYY-MM-DD'),
        storeId: values.storeId,
        accountId: values.accountId,
        paymentMethod: values.paymentMethod,
      });
      if (res.success) {
        message.success('Đã thêm kế hoạch thu tiền mới thành công!');
        setIsIncomeModalOpen(false);
        incomeForm.resetFields();
        fetchForecast();
        fetchEntries();
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || 'Không thể tạo khoản thu');
    }
  };

  const handleUpdateStatus = async (id: number, newStatus: CashFlowStatus) => {
    try {
      await apiClient.cashFlow.updateEntry(id, { status: newStatus });
      message.success(`Đã cập nhật trạng thái sang: ${STATUS_META[newStatus]?.label || newStatus}`);
      fetchForecast();
      fetchEntries();
    } catch {
      message.error('Không thể cập nhật trạng thái');
    }
  };

  const handleDeleteEntry = async (id: number) => {
    try {
      await apiClient.cashFlow.deleteEntry(id);
      message.success('Đã hủy khoản thu chi thành công');
      fetchForecast();
      fetchEntries();
    } catch {
      message.error('Không thể hủy khoản thu chi');
    }
  };

  const handleSaveAccount = async (values: any) => {
    if (!selectedAccountForEdit) return;
    try {
      await apiClient.cashFlow.updateAccount(selectedAccountForEdit.id, {
        currentBalance: values.currentBalance,
        minSafetyThreshold: values.minSafetyThreshold,
        notes: values.notes,
      });
      message.success(`Đã cập nhật quỹ "${selectedAccountForEdit.name}" thành công!`);
      setIsAccountModalOpen(false);
      setSelectedAccountForEdit(null);
      fetchForecast();
    } catch {
      message.error('Không thể cập nhật quỹ');
    }
  };

  const summary = forecastData?.summary;
  const timeline = forecastData?.timeline || [];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="DỰ BÁO DÒNG TIỀN (CASH FLOW FORECAST)"
        subtitle="Quản lý thanh khoản, đối chiếu thu chi có VAT, mức độ ưu tiên & cảnh báo thâm hụt tài chính"
        extra={
          <div className="flex flex-wrap items-center gap-2.5">
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setDateRange([dates[0], dates[1]]);
                }
              }}
              allowClear={false}
              className="w-64"
            />
            <Select
              value={selectedStore}
              onChange={setSelectedStore}
              className="w-44"
              options={[
                { value: 'all', label: 'Tất cả chi nhánh' },
                { value: '1', label: 'Chi nhánh Đề Thám' },
                { value: '2', label: 'Chi nhánh Phan Xích Long' },
                { value: '3', label: 'Chi nhánh Lê Văn Sỹ' },
                { value: '4', label: 'Chi nhánh Huỳnh Thúc Kháng' },
              ]}
            />
            <Select
              value={selectedAccount}
              onChange={setSelectedAccount}
              className="w-44"
              options={[
                { value: 'all', label: 'Tất cả tài khoản/quỹ' },
                ...(forecastData?.accounts || []).map((acc) => ({
                  value: String(acc.id),
                  label: `${acc.name}`,
                })),
              ]}
            />
            <Button
              icon={<AppIcon icon={RefreshCw} size="sm" />}
              onClick={() => {
                fetchForecast();
                fetchEntries();
              }}
            >
              Làm mới
            </Button>
            <Button icon={<AppIcon icon={Download} size="sm" />} onClick={handleExportCsv}>
              Xuất CSV
            </Button>
            <Button
              icon={<AppIcon icon={SlidersHorizontal} size="sm" />}
              onClick={() => setIsAdjustBalanceModalOpen(true)}
            >
              Cài đặt / Điều chỉnh số dư
            </Button>
            <Button
              type="primary"
              danger
              icon={<AppIcon icon={Plus} size="sm" />}
              onClick={() => setIsExpenseModalOpen(true)}
            >
              Thêm khoản chi
            </Button>
            <Button
              type="primary"
              className="bg-emerald-600 hover:bg-emerald-500 border-none"
              icon={<AppIcon icon={Plus} size="sm" />}
              onClick={() => setIsIncomeModalOpen(true)}
            >
              Thêm khoản thu
            </Button>
          </div>
        }
      />

      {summary?.isShortfallRisk && (
        <Alert
          message={
            <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400">
              <AppIcon icon={AlertTriangle} size="sm" />
              CẢNH BÁO NGUY CƠ THIẾU TIỀN VÀO NGÀY {summary.shortfallDate}
            </div>
          }
          description={
            <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">
              Số dư dự kiến sẽ giảm xuống mức thấp nhất là{' '}
              <strong className="text-rose-500 tabular-nums">
                {summary.minForecastBalance.toLocaleString('vi-VN')}đ
              </strong>{' '}
              (dưới ngưỡng an toàn {summary.minSafetyThreshold.toLocaleString('vi-VN')}đ). Tổng các khoản chi khẩn cấp
              và thiết yếu đang chờ duyệt là{' '}
              <strong className="tabular-nums">{summary.criticalOutflowPending.toLocaleString('vi-VN')}đ</strong>. Đề
              xuất: kiểm tra giãn tiến độ hoặc tạm hoãn các khoản chi mức ưu tiên{' '}
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Có thể hoãn
              </span>{' '}
              và đẩy mạnh thu hồi công nợ/doanh thu.
            </div>
          }
          type="error"
          showIcon={false}
          className="border-rose-400 dark:border-rose-800"
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="text-xs text-neutral-400 font-medium">Số dư hiện tại</div>
            <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 tabular-nums mt-1">
              {summary ? (summary.openingBalance / 1000000).toFixed(1) : 0} Tr
            </div>
            <div className="text-xs text-neutral-400 mt-1 flex items-center gap-1">
              <AppIcon icon={ShieldCheck} size="sm" className="text-emerald-500" />
              Ngưỡng AT: {summary ? (summary.minSafetyThreshold / 1000000).toFixed(0) : 0} Tr
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="text-xs text-neutral-400 font-medium">Tổng dự kiến Thu</div>
            <div className="text-2xl font-bold text-emerald-500 tabular-nums mt-1">
              +{summary ? (summary.totalExpectedInflow / 1000000).toFixed(1) : 0} Tr
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Đã thu thực tế: {summary ? (summary.totalActualInflow / 1000000).toFixed(1) : 0} Tr
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="text-xs text-neutral-400 font-medium">Tổng dự kiến Chi</div>
            <div className="text-2xl font-bold text-rose-500 tabular-nums mt-1">
              -{summary ? (summary.totalExpectedOutflow / 1000000).toFixed(1) : 0} Tr
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Đã chi thực tế: {summary ? (summary.totalActualOutflow / 1000000).toFixed(1) : 0} Tr
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="text-xs text-neutral-400 font-medium">Số dư dự kiến cuối kỳ</div>
            <div
              className={`text-2xl font-bold tabular-nums mt-1 ${
                (summary?.closingForecastBalance || 0) < (summary?.minSafetyThreshold || 0)
                  ? 'text-rose-500'
                  : 'text-neutral-800 dark:text-neutral-100'
              }`}
            >
              {summary ? (summary.closingForecastBalance / 1000000).toFixed(1) : 0} Tr
            </div>
            <div className="text-xs text-neutral-400 mt-1">
              Dòng tiền ròng:{' '}
              <span
                className={`tabular-nums font-semibold ${
                  (summary?.netCashFlowForecast || 0) >= 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}
              >
                {(summary?.netCashFlowForecast || 0) >= 0 ? '+' : ''}
                {summary ? (summary.netCashFlowForecast / 1000000).toFixed(1) : 0} Tr
              </span>
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="text-xs text-neutral-400 font-medium">Chi khẩn cấp (CRITICAL/HIGH)</div>
            <div className="text-2xl font-bold text-amber-500 tabular-nums mt-1">
              {summary ? (summary.criticalOutflowPending / 1000000).toFixed(1) : 0} Tr
            </div>
            <div className="text-xs text-neutral-400 mt-1">Ưu tiên chi trả lương & NCC chính</div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={4}>
          <Card bordered={false} className="shadow-sm border border-neutral-200 dark:border-neutral-800 h-full">
            <div className="text-xs text-neutral-400 font-medium flex items-center gap-1">
              <AppIcon icon={Percent} size="sm" className="text-blue-500" />
              Thuế VAT trong chi phí
            </div>
            <div className="text-2xl font-bold text-blue-500 tabular-nums mt-1">
              {summary ? (summary.totalVatOutflow / 1000000).toFixed(1) : 0} Tr
            </div>
            <div className="text-xs text-neutral-400 mt-1">Phần thuế GTGT đầu vào hợp lệ</div>
          </Card>
        </Col>
      </Row>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'overview',
            label: (
              <span className="flex items-center gap-2">
                <AppIcon icon={TrendingUp} size="sm" />
                Tổng quan & Biểu đồ dự báo
              </span>
            ),
            children: (
              <TimelineOverviewTab
                timeline={timeline}
                summary={summary}
                onSelectDay={setSelectedDayPoint}
                categoryNames={CATEGORY_NAMES}
                priorityMeta={PRIORITY_META}
              />
            ),
          },
          {
            key: 'outflow',
            label: (
              <span className="flex items-center gap-2">
                <AppIcon icon={TrendingDown} size="sm" />
                Kế hoạch Chi (Outflows)
                <Badge count={outflowItems.length} overflowCount={999} />
              </span>
            ),
            children: (
              <OutflowTab
                outflowItems={outflowItems}
                entriesLoading={entriesLoading}
                outflowPriorityFilter={outflowPriorityFilter}
                setOutflowPriorityFilter={setOutflowPriorityFilter}
                outflowVatFilter={outflowVatFilter}
                setOutflowVatFilter={setOutflowVatFilter}
                outflowStatusFilter={outflowStatusFilter}
                setOutflowStatusFilter={setOutflowStatusFilter}
                onUpdateStatus={handleUpdateStatus}
                onDeleteEntry={handleDeleteEntry}
                categoryNames={CATEGORY_NAMES}
                priorityMeta={PRIORITY_META}
                statusMeta={STATUS_META}
              />
            ),
          },
          {
            key: 'inflow',
            label: (
              <span className="flex items-center gap-2">
                <AppIcon icon={TrendingUp} size="sm" />
                Dòng tiền Thu (Inflows)
                <Badge count={inflowItems.length} overflowCount={999} />
              </span>
            ),
            children: (
              <InflowTab
                inflowItems={inflowItems}
                entriesLoading={entriesLoading}
                onUpdateStatus={handleUpdateStatus}
                onDeleteEntry={handleDeleteEntry}
                categoryNames={CATEGORY_NAMES}
                statusMeta={STATUS_META}
              />
            ),
          },
          {
            key: 'accounts',
            label: (
              <span className="flex items-center gap-2">
                <AppIcon icon={Landmark} size="sm" />
                Quản lý Quỹ & Số dư đầu kỳ
              </span>
            ),
            children: (
              <Row gutter={[16, 16]}>
                {(forecastData?.accounts || []).map((acc) => (
                  <Col key={acc.id} xs={24} sm={12} md={8} lg={6}>
                    <Card
                      bordered={false}
                      className="shadow-sm border border-neutral-200 dark:border-neutral-800"
                      actions={[
                        <Button
                          key="edit"
                          type="link"
                          onClick={() => {
                            setSelectedAccountForEdit(acc);
                            accountForm.setFieldsValue({
                              currentBalance: acc.currentBalance,
                              minSafetyThreshold: acc.minSafetyThreshold,
                              notes: acc.notes,
                            });
                            setIsAccountModalOpen(true);
                          }}
                        >
                          Cập nhật số dư / Ngưỡng AT
                        </Button>,
                      ]}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {acc.accountType === 'CASH' ? 'Tiền mặt' : 'Ngân hàng'}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                          {acc.code}
                        </span>
                      </div>
                      <div className="font-bold text-base text-neutral-800 dark:text-neutral-100">{acc.name}</div>
                      {acc.accountNumber && (
                        <div className="text-xs text-neutral-400 mt-0.5">
                          STK: {acc.accountNumber} ({acc.bankName})
                        </div>
                      )}
                      <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5 text-xs tabular-nums">
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Số dư hiện tại:</span>
                          <span className="font-bold text-neutral-800 dark:text-neutral-200">
                            {acc.currentBalance.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-400">Ngưỡng an toàn:</span>
                          <span className="font-semibold text-emerald-500">
                            {acc.minSafetyThreshold.toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            ),
          },
        ]}
      />

      <ExpenseModal
        open={isExpenseModalOpen}
        onCancel={() => setIsExpenseModalOpen(false)}
        form={expenseForm}
        onFinish={handleCreateExpense}
      />

      <IncomeModal
        open={isIncomeModalOpen}
        onCancel={() => setIsIncomeModalOpen(false)}
        form={incomeForm}
        onFinish={handleCreateIncome}
      />

      <AccountModal
        open={isAccountModalOpen}
        onCancel={() => {
          setIsAccountModalOpen(false);
          setSelectedAccountForEdit(null);
        }}
        account={selectedAccountForEdit}
        form={accountForm}
        onFinish={handleSaveAccount}
      />

      <AdjustBalanceModal
        open={isAdjustBalanceModalOpen}
        onCancel={() => setIsAdjustBalanceModalOpen(false)}
        accounts={forecastData?.accounts || []}
        currentBalance={summary?.openingBalance}
        onSuccess={() => {
          message.success('Đã cập nhật số dư hiện tại thành công!');
          fetchForecast();
          fetchEntries();
        }}
      />

      <DayInspectionModal dayPoint={selectedDayPoint} onClose={() => setSelectedDayPoint(null)} />
    </div>
  );
}
