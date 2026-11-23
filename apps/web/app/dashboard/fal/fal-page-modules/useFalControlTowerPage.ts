'use client';

import { useCallback, useEffect, useState } from 'react';
import { Form, message } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { apiClient } from '~/lib/api-client';
import { getApiErrorMessage, getFalDateBounds } from './falPageHelpers';
import {
  FAL_FILTERS_STORAGE_KEY,
  type FalCase,
  type FalDateRangeMode,
  type FalLogExplanationFormValues,
} from './falPageTypes';
import { useTraceDrawerResize } from './useTraceDrawerResize';

export function useFalControlTowerPage() {
  const [data, setData] = useState<FalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [rule, setRule] = useState<string | undefined>();
  const [dateRangeMode, setDateRangeMode] = useState<FalDateRangeMode>('day');
  const [selectedDate, setSelectedDate] = useState<Dayjs>(() => dayjs());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<FalCase | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [filtersRestored, setFiltersRestored] = useState(false);
  const [form] = Form.useForm<FalLogExplanationFormValues>();
  const { traceDrawerWidth, isTraceResizing, startTraceResize } = useTraceDrawerResize();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAL_FILTERS_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        rule?: string;
        dateRangeMode?: string;
        selectedDate?: string;
        page?: number;
        pageSize?: number;
      };
      if (['Fix', 'Adjust', 'Log'].includes(saved.rule || '')) setRule(saved.rule);
      if (['day', 'week', 'month'].includes(saved.dateRangeMode || '')) {
        setDateRangeMode(saved.dateRangeMode as FalDateRangeMode);
      }
      if (saved.selectedDate && dayjs(saved.selectedDate).isValid()) setSelectedDate(dayjs(saved.selectedDate));
      if (Number.isInteger(saved.page) && saved.page! > 0) setPage(saved.page!);
      if ([50, 100, 200, 500].includes(Number(saved.pageSize))) setPageSize(Number(saved.pageSize));
    } catch {
      localStorage.removeItem(FAL_FILTERS_STORAGE_KEY);
    } finally {
      setFiltersRestored(true);
    }
  }, []);

  const dateBounds = getFalDateBounds(dateRangeMode, selectedDate);

  const load = useCallback(
    async (nextPage = page, nextPageSize = pageSize, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const response = await apiClient.fal.listCases({ rule, ...dateBounds, page: nextPage, limit: nextPageSize });
        const nextData = response.data as FalCase[];
        setData(nextData);
        setTotal(response.total);
        setSelected((current) =>
          current ? nextData.find((item) => item.orderServiceId === current.orderServiceId) || current : current
        );
      } catch {
        if (!silent) message.error('Không tải được danh sách Fix / Adjust / Log.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [dateBounds.dateFrom, dateBounds.dateTo, page, pageSize, rule]
  );

  useEffect(() => {
    if (filtersRestored) load();
  }, [filtersRestored, load]);

  const hasPendingApprovedLogLedger = data.some(
    (item) =>
      item.falRule === 'Log' &&
      item.logExplanation?.decisionStatus === 'APPROVED' &&
      item.logExplanation.ledgerStatus === 'NOT_APPLIED'
  );

  useEffect(() => {
    if (!filtersRestored || !hasPendingApprovedLogLedger) return;
    const intervalId = window.setInterval(() => {
      void load(page, pageSize, true);
    }, 15_000);
    return () => window.clearInterval(intervalId);
  }, [filtersRestored, hasPendingApprovedLogLedger, load, page, pageSize]);

  useEffect(() => {
    if (!filtersRestored) return;
    localStorage.setItem(
      FAL_FILTERS_STORAGE_KEY,
      JSON.stringify({
        rule,
        dateRangeMode,
        selectedDate: selectedDate.format('YYYY-MM-DD'),
        page,
        pageSize,
      })
    );
  }, [dateRangeMode, filtersRestored, page, pageSize, rule, selectedDate]);

  const moveDate = (direction: -1 | 1) => {
    const unit = dateRangeMode === 'day' ? 'day' : dateRangeMode === 'week' ? 'week' : 'month';
    setSelectedDate((value) => value.add(direction, unit));
    setPage(1);
  };

  const changeDateMode = (mode: FalDateRangeMode) => {
    setDateRangeMode(mode);
    setPage(1);
  };

  const handleDateValueChange = (value: Dayjs) => {
    setSelectedDate(value);
    setPage(1);
  };

  const handleRuleChange = (value: string | undefined) => {
    setRule(value);
    setPage(1);
  };

  const handlePaginationChange = (nextPage: number, nextPageSize: number) => {
    setPage(nextPage);
    setPageSize(nextPageSize);
  };

  const openCustomerDetail = useCallback((customerId: number) => {
    if (!customerId) return;
    setSelectedCustomerId(customerId);
    setCustomerDrawerOpen(true);
  }, []);

  const openTraceDrawer = useCallback((record: FalCase) => {
    setSelected(record);
    setTraceOpen(true);
  }, []);

  const openExplanationModal = useCallback(
    (record: FalCase) => {
      setSelected(record);
      setExplanationOpen(true);
      form.setFieldsValue({
        explanation: record.logExplanation?.explanation || '',
        explanationChannel: record.logExplanation?.explanationChannel || 'manual',
      });
    },
    [form]
  );

  const submitExplanation = useCallback(
    async (values: FalLogExplanationFormValues) => {
      if (!selected) return;
      try {
        await apiClient.fal.submitLogExplanation(selected.orderServiceId, values);
        message.success('Đã gửi giải trình Log chờ duyệt.');
        setExplanationOpen(false);
        form.resetFields();
        await load();
      } catch (error: unknown) {
        message.error(getApiErrorMessage(error, 'Không gửi được giải trình.'));
      }
    },
    [form, load, selected]
  );

  const approve = useCallback(
    async (record: FalCase, approved: boolean) => {
      const rejectionReason = approved ? undefined : window.prompt('Lý do từ chối Log:') || undefined;
      if (!approved && !rejectionReason) return;
      try {
        await apiClient.fal.approveLog(record.orderServiceId, { approved, rejectionReason });
        message.success(approved ? 'Đã duyệt Log để Wings chốt điểm/thưởng.' : 'Đã từ chối Log.');
        await load();
      } catch (error: unknown) {
        message.error(getApiErrorMessage(error, 'Không cập nhật được approval.'));
      }
    },
    [load]
  );

  return {
    data,
    loading,
    rule,
    dateRangeMode,
    selectedDate,
    page,
    pageSize,
    total,
    selected,
    customerDrawerOpen,
    setCustomerDrawerOpen,
    selectedCustomerId,
    explanationOpen,
    setExplanationOpen,
    traceOpen,
    setTraceOpen,
    rulesOpen,
    setRulesOpen,
    traceDrawerWidth,
    isTraceResizing,
    startTraceResize,
    form,
    load,
    moveDate,
    changeDateMode,
    handleDateValueChange,
    handleRuleChange,
    handlePaginationChange,
    openCustomerDetail,
    openTraceDrawer,
    openExplanationModal,
    submitExplanation,
    approve,
  };
}
