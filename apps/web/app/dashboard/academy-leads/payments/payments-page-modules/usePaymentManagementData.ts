'use client';

import React from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import type {
  AcademyTalentPaymentManagementRow,
  AcademyTalentPaymentManagementStatus,
  AcademyTalentPaymentManagementSummary,
  AcademyTalentPaymentTrace,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  MONTH_STORAGE_KEY,
  PAGE_SIZE_STORAGE_KEY,
  PAGE_STORAGE_KEY,
  STATUS_STORAGE_KEY,
  persistedMonth,
  persistedNumber,
  persistedStatus,
} from '../payment-management.helpers';
import { extractApiErrorMessage } from './payment-management-utils';

export function usePaymentManagementData(academyAllowed: boolean) {
  const [month, setMonth] = React.useState<Dayjs>(persistedMonth);
  const [status, setStatus] = React.useState<AcademyTalentPaymentManagementStatus>(persistedStatus);
  const [search, setSearch] = React.useState('');
  const deferredSearch = React.useDeferredValue(search);
  const [page, setPage] = React.useState(() => persistedNumber(PAGE_STORAGE_KEY, 1));
  const [pageSize, setPageSize] = React.useState(() => persistedNumber(PAGE_SIZE_STORAGE_KEY, 20, [10, 20, 50, 100]));
  const [rows, setRows] = React.useState<AcademyTalentPaymentManagementRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [summary, setSummary] = React.useState<AcademyTalentPaymentManagementSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<AcademyTalentPaymentManagementRow | null>(null);
  const [trace, setTrace] = React.useState<AcademyTalentPaymentTrace | null>(null);
  const [traceLoading, setTraceLoading] = React.useState(false);
  const [traceError, setTraceError] = React.useState<string | null>(null);
  const requestVersionRef = React.useRef(0);
  const traceRequestVersionRef = React.useRef(0);

  React.useEffect(() => {
    window.localStorage.setItem(PAGE_STORAGE_KEY, String(page));
  }, [page]);

  React.useEffect(() => {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize));
  }, [pageSize]);

  React.useEffect(() => {
    window.localStorage.setItem(STATUS_STORAGE_KEY, status);
  }, [status]);

  React.useEffect(() => {
    window.localStorage.setItem(MONTH_STORAGE_KEY, month.format('YYYY-MM'));
  }, [month]);

  const load = React.useCallback(async () => {
    const version = ++requestVersionRef.current;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.academySales.listTalentPaymentManagement({
        page,
        limit: pageSize,
        month: month.format('YYYY-MM'),
        status,
        search: deferredSearch.trim() || undefined,
      });
      if (version !== requestVersionRef.current) return;
      setRows(response.data);
      setTotal(response.total);
      setSummary(response.summary || null);
    } catch (nextError: unknown) {
      if (version !== requestVersionRef.current) return;
      setRows([]);
      setTotal(0);
      setSummary(null);
      setError(extractApiErrorMessage(nextError, 'Không thể tải quản lý thu học phí Academy.'));
    } finally {
      if (version === requestVersionRef.current) setLoading(false);
    }
  }, [deferredSearch, month, page, pageSize, status]);

  React.useEffect(() => {
    if (academyAllowed) void load();
  }, [academyAllowed, load]);

  React.useEffect(() => {
    const assessmentId = detail?.assessmentId;
    if (!assessmentId) {
      setTrace(null);
      setTraceError(null);
      setTraceLoading(false);
      return;
    }
    const version = ++traceRequestVersionRef.current;
    setTrace(null);
    setTraceError(null);
    setTraceLoading(true);
    void apiClient.academySales
      .getTalentPaymentTrace(assessmentId)
      .then((response) => {
        if (version === traceRequestVersionRef.current) setTrace(response.data);
      })
      .catch((nextError: unknown) => {
        if (version === traceRequestVersionRef.current) {
          setTraceError(extractApiErrorMessage(nextError, 'Không thể tải dấu vết phiếu học phí.'));
        }
      })
      .finally(() => {
        if (version === traceRequestVersionRef.current) setTraceLoading(false);
      });
  }, [detail?.assessmentId]);

  const updateStatus = React.useCallback((nextStatus: AcademyTalentPaymentManagementStatus) => {
    setStatus(nextStatus);
    setPage(1);
  }, []);

  const updateSearch = React.useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const updateMonth = React.useCallback((value: Dayjs | null) => {
    setMonth((value || dayjs()).startOf('month'));
    setPage(1);
  }, []);

  const handlePageChange = React.useCallback(
    (nextPage: number, nextPageSize: number) => {
      setPage(nextPage);
      if (nextPageSize !== pageSize) setPageSize(nextPageSize);
    },
    [pageSize]
  );

  return {
    month,
    status,
    search,
    page,
    pageSize,
    rows,
    total,
    summary,
    loading,
    error,
    detail,
    setDetail,
    trace,
    traceLoading,
    traceError,
    load,
    updateStatus,
    updateSearch,
    updateMonth,
    handlePageChange,
  };
}
