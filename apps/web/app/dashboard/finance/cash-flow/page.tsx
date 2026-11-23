'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button, DatePicker, Form, Select, Tabs, message, Badge } from 'antd';
import { TrendingUp, TrendingDown, RefreshCw, Download, Plus, Landmark, SlidersHorizontal } from 'lucide-react';
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
import { CASH_FLOW_CATEGORY_NAMES, CASH_FLOW_PRIORITY_META, CASH_FLOW_STATUS_META } from './components/cash-flow-meta';
import { CashFlowSummarySection } from './components/CashFlowSummarySection';
import { CashFlowAccountsTab } from './components/CashFlowAccountsTab';

const { RangePicker } = DatePicker;

export default function CashFlowForecastPage() {
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs(), dayjs().add(30, 'day')]);
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('overview');

  const [, setLoading] = useState<boolean>(true);
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
  const [incomeDefaultCategory, setIncomeDefaultCategory] = useState<string>('REVENUE_ACADEMY');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState<boolean>(false);
  const [isAdjustBalanceModalOpen, setIsAdjustBalanceModalOpen] = useState<boolean>(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<CashAccount | null>(null);

  const [expenseForm] = Form.useForm();
  const [incomeForm] = Form.useForm();
  const [accountForm] = Form.useForm();

  const handleOpenIncomeModal = (presetCategory?: string) => {
    incomeForm.resetFields();
    const cat = presetCategory || 'REVENUE_ACADEMY';
    setIncomeDefaultCategory(cat);
    incomeForm.setFieldsValue({ category: cat });
    setIsIncomeModalOpen(true);
  };

  const handleOpenAccountModal = (acc: CashAccount) => {
    setSelectedAccountForEdit(acc);
    accountForm.setFieldsValue({
      currentBalance: acc.currentBalance,
      minSafetyThreshold: acc.minSafetyThreshold,
      notes: acc.notes,
    });
    setIsAccountModalOpen(true);
  };

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
        projectName: values.projectName,
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
      message.success(`Đã cập nhật trạng thái sang: ${CASH_FLOW_STATUS_META[newStatus]?.label || newStatus}`);
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
                { value: '6', label: 'Chi nhánh Đề Thám' },
                { value: '16', label: 'Chi nhánh Estella Place' },
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

      <CashFlowSummarySection summary={summary} />

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
                categoryNames={CASH_FLOW_CATEGORY_NAMES}
                priorityMeta={CASH_FLOW_PRIORITY_META}
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
                categoryNames={CASH_FLOW_CATEGORY_NAMES}
                priorityMeta={CASH_FLOW_PRIORITY_META}
                statusMeta={CASH_FLOW_STATUS_META}
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
                inflowBreakdown={summary?.inflowBreakdown}
                onUpdateStatus={handleUpdateStatus}
                onDeleteEntry={handleDeleteEntry}
                onOpenIncomeModal={handleOpenIncomeModal}
                categoryNames={CASH_FLOW_CATEGORY_NAMES}
                statusMeta={CASH_FLOW_STATUS_META}
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
              <CashFlowAccountsTab accounts={forecastData?.accounts || []} onEditAccount={handleOpenAccountModal} />
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
        defaultCategory={incomeDefaultCategory}
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
