'use client';

import { useCallback, useState } from 'react';
import { message } from 'antd';
import type {
  BkPaystubRecord,
  BkWorkLogRecord,
  BkWorkLogResponse,
  SafeAny,
  TelesalesAttendanceExceptionType,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';

interface UseBkIncomeModalsParams {
  dateRange: [SafeAny, SafeAny];
  onRefreshPaystub: () => Promise<void>;
}

/** Manages breakdown modal, IN/OUT work-log modal, and attendance exception approval modal state. */
export function useBkIncomeModals({ dateRange, onRefreshPaystub }: UseBkIncomeModalsParams) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activePaystub, setActivePaystub] = useState<BkPaystubRecord | null>(null);

  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogLoading, setWorkLogLoading] = useState(false);
  const [workLogRecord, setWorkLogRecord] = useState<BkPaystubRecord | null>(null);
  const [workLogData, setWorkLogData] = useState<BkWorkLogResponse | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'attendance' | 'audit'>('attendance');

  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [selectedWorkLog, setSelectedWorkLog] = useState<BkWorkLogRecord | null>(null);
  const [exceptionType, setExceptionType] = useState<TelesalesAttendanceExceptionType | 'CLEAR'>('OFF_MORNING');
  const [exceptionReason, setExceptionReason] = useState('');
  const [manualInTime, setManualInTime] = useState('08:00');
  const [manualOutTime, setManualOutTime] = useState('17:00');
  const [exceptionNote, setExceptionNote] = useState('');
  const [savingException, setSavingException] = useState(false);

  const openBreakdownModal = useCallback((record: BkPaystubRecord) => {
    setActivePaystub(record);
    setModalOpen(true);
  }, []);

  const closeBreakdownModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleOpenWorkLogs = useCallback(
    async (record: BkPaystubRecord) => {
      setWorkLogRecord(record);
      setWorkLogModalOpen(true);
      setWorkLogLoading(true);
      try {
        const res = await apiClient.bk.getWorkLogs({
          staffId: record.staffId,
          dateFrom: dateRange?.[0] ? dateRange[0].format('YYYY-MM-DD') : undefined,
          dateTo: dateRange?.[1] ? dateRange[1].format('YYYY-MM-DD') : undefined,
        });
        setWorkLogData(res);
      } catch (err) {
        console.error('Error fetching BK work logs:', err);
      } finally {
        setWorkLogLoading(false);
      }
    },
    [dateRange]
  );

  const closeWorkLogModal = useCallback(() => {
    setWorkLogModalOpen(false);
  }, []);

  const openExceptionModal = useCallback((row: BkWorkLogRecord) => {
    setSelectedWorkLog(row);
    if (row.exception) {
      setExceptionType(row.exception.exceptionType);
      setExceptionReason(row.exception.reason);
      setManualInTime(row.exception.manualInTime || row.firstIn || '08:00');
      setManualOutTime(row.exception.manualOutTime || row.lastOut || '17:00');
      setExceptionNote(row.exception.note || '');
    } else {
      setExceptionType('OFF_MORNING');
      setExceptionReason('');
      setManualInTime(row.firstIn || '08:00');
      setManualOutTime(row.lastOut || '17:00');
      setExceptionNote('');
    }
    setExceptionModalOpen(true);
  }, []);

  const closeExceptionModal = useCallback(() => {
    setExceptionModalOpen(false);
  }, []);

  const handleSaveException = useCallback(
    async (overrideType?: TelesalesAttendanceExceptionType | 'CLEAR') => {
      if (!workLogRecord || !selectedWorkLog) return;
      const targetType = overrideType || exceptionType;

      if (targetType !== 'CLEAR') {
        if (!exceptionReason.trim() || exceptionReason.trim().length < 3) {
          message.error('Vui lòng nhập lý do duyệt ngoại lệ (tối thiểu 3 ký tự).');
          return;
        }
        if (targetType === 'MANUAL_CHECKIN_OUT') {
          if (!manualInTime.trim()) {
            message.error('Vui lòng nhập giờ IN thủ công (bắt buộc).');
            return;
          }
          if (!manualOutTime.trim()) {
            message.error('Vui lòng nhập giờ OUT thủ công (bắt buộc).');
            return;
          }
        }
      }

      setSavingException(true);
      try {
        const res = await apiClient.bk.saveAttendanceException({
          staffId: workLogRecord.staffId,
          workDate: selectedWorkLog.workDate,
          exceptionType: targetType,
          reason: targetType === 'CLEAR' ? exceptionReason.trim() || 'Hủy ngoại lệ chấm công' : exceptionReason.trim(),
          manualInTime: targetType === 'MANUAL_CHECKIN_OUT' ? manualInTime.trim() : undefined,
          manualOutTime: targetType === 'MANUAL_CHECKIN_OUT' ? manualOutTime.trim() : undefined,
          note: targetType === 'MANUAL_CHECKIN_OUT' ? exceptionNote.trim() : undefined,
        });
        message.success(res.message || 'Cập nhật ngoại lệ chấm công thành công!');
        setExceptionModalOpen(false);

        await handleOpenWorkLogs(workLogRecord);
        await onRefreshPaystub();
      } catch (err: SafeAny) {
        console.error('Error saving exception:', err);
        message.error(err?.response?.data?.message || err?.message || 'Lỗi khi lưu ngoại lệ chấm công.');
      } finally {
        setSavingException(false);
      }
    },
    [
      exceptionNote,
      exceptionReason,
      exceptionType,
      handleOpenWorkLogs,
      manualInTime,
      manualOutTime,
      onRefreshPaystub,
      selectedWorkLog,
      workLogRecord,
    ]
  );

  return {
    modalOpen,
    activePaystub,
    openBreakdownModal,
    closeBreakdownModal,
    workLogModalOpen,
    workLogLoading,
    workLogRecord,
    workLogData,
    activeDrawerTab,
    setActiveDrawerTab,
    handleOpenWorkLogs,
    closeWorkLogModal,
    exceptionModalOpen,
    selectedWorkLog,
    exceptionType,
    setExceptionType,
    exceptionReason,
    setExceptionReason,
    manualInTime,
    setManualInTime,
    manualOutTime,
    setManualOutTime,
    exceptionNote,
    setExceptionNote,
    savingException,
    openExceptionModal,
    closeExceptionModal,
    handleSaveException,
  };
}
