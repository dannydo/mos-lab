'use client';

import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import type { CvPaystubRecord, CvWorkLogDetailRecord } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  CV_WORKLOG_MODAL_WIDTH_STORAGE_KEY,
  DEFAULT_WORKLOG_MODAL_WIDTH,
  EMPTY_CV_WORK_LOG_SUMMARY,
  MAX_WORKLOG_MODAL_WIDTH,
  MIN_WORKLOG_MODAL_WIDTH,
  clampWorkLogModalWidth,
  type CvWorkLogSummary,
} from './cvThuNhapUtils';

interface UseCvIncomeModalsParams {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  paystubData: CvPaystubRecord[];
  onRefreshPaystubData: () => Promise<void>;
}

/** Manages Paystub Detail, Allowance CRUD, and resizable Work Log modals for CV income. */
export function useCvIncomeModals({ dateRange, paystubData, onRefreshPaystubData }: UseCvIncomeModalsParams) {
  // Individual Paystub Detail Modal State
  const [selectedRecordSnapshot, setSelectedRecordSnapshot] = useState<CvPaystubRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Keep selectedRecord synchronized whenever paystubData refreshes (e.g. after allowance mutations)
  const selectedRecord = useMemo(() => {
    if (!selectedRecordSnapshot) return null;
    return paystubData.find((r) => r.staffId === selectedRecordSnapshot.staffId) || selectedRecordSnapshot;
  }, [paystubData, selectedRecordSnapshot]);

  // Allowance Management State (Phụ cấp khác mOS)
  const [isAllowanceModalOpen, setIsAllowanceModalOpen] = useState(false);
  const [allowanceFormType, setAllowanceFormType] = useState<'plus' | 'minus'>('plus');
  const [allowanceTitle, setAllowanceTitle] = useState('');
  const [allowanceAmount, setAllowanceAmount] = useState<number | null>(null);
  const [allowanceNote, setAllowanceNote] = useState('');
  const [isSubmittingAllowance, setIsSubmittingAllowance] = useState(false);

  // Daily Work Log Detail Modal State
  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogLoading, setWorkLogLoading] = useState(false);
  const [workLogRecord, setWorkLogRecord] = useState<CvPaystubRecord | null>(null);
  const [workLogs, setWorkLogs] = useState<CvWorkLogDetailRecord[]>([]);
  const [workLogSummary, setWorkLogSummary] = useState<CvWorkLogSummary>(EMPTY_CV_WORK_LOG_SUMMARY);

  // Persistent Work Log Modal Width state (Default: 800px)
  const [modalWidth, setModalWidth] = useState<number>(DEFAULT_WORKLOG_MODAL_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ startX: number; startWidth: number }>({
    startX: 0,
    startWidth: DEFAULT_WORKLOG_MODAL_WIDTH,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem(CV_WORKLOG_MODAL_WIDTH_STORAGE_KEY);
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= MIN_WORKLOG_MODAL_WIDTH && parsed <= MAX_WORKLOG_MODAL_WIDTH) {
          setModalWidth(parsed);
        }
      }
    }
  }, []);

  const updateModalWidth = useCallback((newWidth: number) => {
    const clamped = clampWorkLogModalWidth(newWidth);
    setModalWidth(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CV_WORKLOG_MODAL_WIDTH_STORAGE_KEY, clamped.toString());
    }
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      dragStartRef.current = { startX: e.clientX, startWidth: modalWidth };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - dragStartRef.current.startX;
        const newWidth = dragStartRef.current.startWidth + deltaX * 2;
        setModalWidth(clampWorkLogModalWidth(newWidth));
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        setIsResizing(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        const deltaX = upEvent.clientX - dragStartRef.current.startX;
        const finalWidth = clampWorkLogModalWidth(dragStartRef.current.startWidth + deltaX * 2);
        if (typeof window !== 'undefined') {
          localStorage.setItem(CV_WORKLOG_MODAL_WIDTH_STORAGE_KEY, finalWidth.toString());
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [modalWidth]
  );

  const openPaystubModal = useCallback((record: CvPaystubRecord) => {
    setSelectedRecordSnapshot(record);
    setModalOpen(true);
  }, []);

  const closePaystubModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const resetAllowanceForm = useCallback(() => {
    setAllowanceTitle('');
    setAllowanceAmount(null);
    setAllowanceNote('');
    setAllowanceFormType('plus');
  }, []);

  const openAllowanceModal = useCallback(() => {
    setIsAllowanceModalOpen(true);
  }, []);

  const closeAllowanceModal = useCallback(() => {
    setIsAllowanceModalOpen(false);
    resetAllowanceForm();
  }, [resetAllowanceForm]);

  const handleAddAllowance = useCallback(async () => {
    if (!selectedRecord) return;
    if (!allowanceTitle.trim()) {
      message.error('Vui lòng nhập tên hoặc nội dung phụ cấp.');
      return;
    }
    if (!allowanceAmount || allowanceAmount <= 0) {
      message.error('Vui lòng nhập số tiền lớn hơn 0.');
      return;
    }

    const monthStr = (dateRange?.[0] || dayjs()).format('YYYY-MM');
    const finalAmount = allowanceFormType === 'minus' ? -Math.abs(allowanceAmount) : Math.abs(allowanceAmount);

    setIsSubmittingAllowance(true);
    try {
      const res = await fetch('/api/kpi/cv-allowances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedRecord.staffId,
          month: monthStr,
          title: allowanceTitle.trim(),
          amount: finalAmount,
          note: allowanceNote.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể thêm phụ cấp.');
      }
      message.success('Đã thêm phụ cấp thành công!');
      setIsAllowanceModalOpen(false);
      resetAllowanceForm();
      await onRefreshPaystubData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi khi thêm phụ cấp.';
      message.error(errMsg);
    } finally {
      setIsSubmittingAllowance(false);
    }
  }, [
    allowanceAmount,
    allowanceFormType,
    allowanceNote,
    allowanceTitle,
    dateRange,
    onRefreshPaystubData,
    resetAllowanceForm,
    selectedRecord,
  ]);

  const handleDeleteAllowance = useCallback(
    async (allowanceId: number | string) => {
      try {
        const res = await fetch(`/api/kpi/cv-allowances/${allowanceId}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || 'Không thể xoá phụ cấp.');
        }
        message.success('Đã xoá phụ cấp.');
        await onRefreshPaystubData();
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Lỗi khi xoá phụ cấp.';
        message.error(errMsg);
      }
    },
    [onRefreshPaystubData]
  );

  const handleOpenWorkLogs = useCallback(
    async (record: CvPaystubRecord) => {
      setWorkLogRecord(record);
      setWorkLogModalOpen(true);
      setWorkLogLoading(true);
      try {
        const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
        const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

        const res = await apiClient.kpi.getCvWorkLogs({
          staffId: record.staffId,
          dateFrom,
          dateTo,
        });

        if (res) {
          setWorkLogs(res.data || []);
          setWorkLogSummary(
            res.summary || { totalWorkDays: 0, totalWorkHours: 0, hourlyRate: record.hourlyRate, totalWage: 0 }
          );
        }
      } catch (err) {
        console.error('Error fetching work logs:', err);
      } finally {
        setWorkLogLoading(false);
      }
    },
    [dateRange]
  );

  const closeWorkLogModal = useCallback(() => {
    setWorkLogModalOpen(false);
  }, []);

  return {
    selectedRecord,
    modalOpen,
    openPaystubModal,
    closePaystubModal,
    isAllowanceModalOpen,
    allowanceFormType,
    setAllowanceFormType,
    allowanceTitle,
    setAllowanceTitle,
    allowanceAmount,
    setAllowanceAmount,
    allowanceNote,
    setAllowanceNote,
    isSubmittingAllowance,
    openAllowanceModal,
    closeAllowanceModal,
    handleAddAllowance,
    handleDeleteAllowance,
    workLogModalOpen,
    workLogLoading,
    workLogRecord,
    workLogs,
    workLogSummary,
    modalWidth,
    isResizing,
    updateModalWidth,
    handleMouseDown,
    handleOpenWorkLogs,
    closeWorkLogModal,
  };
}
