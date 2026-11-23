'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import {
  CcDiamondEntry,
  CcPaystubRecord,
  CcTipRecord,
  CcWorkLogDetailRecord,
  CcXoayRecord,
  TipFilterType,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  CcXoayModalSummary,
  DEFAULT_CC_XOAY_SUMMARY,
  DEFAULT_WORKLOG_SUMMARY,
  WORKLOG_MODAL_PAGE_SIZE_OPTIONS,
  WORKLOG_MODAL_WIDTH_DEFAULT,
  WORKLOG_MODAL_WIDTH_MAX,
  WORKLOG_MODAL_WIDTH_MIN,
  WorkLogModalSummary,
  buildDiamondDetailEntry,
  filterCcTipModalRecords,
  summarizeCcTipModalRecords,
} from './cc-thu-nhap-utils';

interface UseCcIncomeModalsParams {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  setSelectedRecord: React.Dispatch<React.SetStateAction<CcPaystubRecord | null>>;
}

export function useCcIncomeModals({ dateRange, selectedStore, setSelectedRecord }: UseCcIncomeModalsParams) {
  const [isTrainingConfigOpen, setIsTrainingConfigOpen] = useState(false);

  // Individual Paystub Detail Modal State
  const [modalOpen, setModalOpen] = useState(false);

  // Daily Work Log (Hourly Wage) Detail Modal State
  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogLoading, setWorkLogLoading] = useState(false);
  const [workLogRecord, setWorkLogRecord] = useState<CcPaystubRecord | null>(null);
  const [workLogs, setWorkLogs] = useState<CcWorkLogDetailRecord[]>([]);
  const [workLogSummary, setWorkLogSummary] = useState<WorkLogModalSummary>(DEFAULT_WORKLOG_SUMMARY);
  const [workLogPage, setWorkLogPage] = useState(1);
  const [workLogPageSize, setWorkLogPageSize] = useState(() => {
    if (typeof window === 'undefined') return 10;
    const savedSize = Number(localStorage.getItem('cc_worklog_modal_page_size'));
    return WORKLOG_MODAL_PAGE_SIZE_OPTIONS.includes(savedSize as (typeof WORKLOG_MODAL_PAGE_SIZE_OPTIONS)[number])
      ? savedSize
      : 10;
  });

  // CC Xoay Detail Modal State
  const [ccXoayModalOpen, setCcXoayModalOpen] = useState(false);
  const [ccXoayLoading, setCcXoayLoading] = useState(false);
  const [ccXoayRecord, setCcXoayRecord] = useState<CcPaystubRecord | null>(null);
  const [ccXoayLogs, setCcXoayLogs] = useState<CcXoayRecord[]>([]);
  const [ccXoaySummary, setCcXoaySummary] = useState<CcXoayModalSummary>(DEFAULT_CC_XOAY_SUMMARY);

  // Combo & SP Detail Modal State
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [comboModalRecord, setComboModalRecord] = useState<CcPaystubRecord | null>(null);

  // CC Tip Detail Modal State
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [tipModalLoading, setTipModalLoading] = useState(false);
  const [tipModalRecord, setTipModalRecord] = useState<CcPaystubRecord | null>(null);
  const [tipModalRecords, setTipModalRecords] = useState<CcTipRecord[]>([]);
  const [tipModalFilter, setTipModalFilter] = useState<TipFilterType>('ALL');
  const [tipModalSearch, setTipModalSearch] = useState('');

  // Diamond Detail Modal State
  const [diamondModalOpen, setDiamondModalOpen] = useState(false);
  const [diamondRecord, setDiamondRecord] = useState<CcDiamondEntry | null>(null);

  // Persistent Work Log Modal Width state (Default: 800px)
  const [modalWidth, setModalWidth] = useState<number>(WORKLOG_MODAL_WIDTH_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = useRef<{ startX: number; startWidth: number }>({
    startX: 0,
    startWidth: WORKLOG_MODAL_WIDTH_DEFAULT,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('cc_worklog_modal_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= WORKLOG_MODAL_WIDTH_MIN && parsed <= WORKLOG_MODAL_WIDTH_MAX) {
          setModalWidth(parsed);
        }
      }
    }
  }, []);

  const updateModalWidth = useCallback((newWidth: number) => {
    const clamped = Math.max(WORKLOG_MODAL_WIDTH_MIN, Math.min(WORKLOG_MODAL_WIDTH_MAX, newWidth));
    setModalWidth(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cc_worklog_modal_width', clamped.toString());
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
        const clamped = Math.max(WORKLOG_MODAL_WIDTH_MIN, Math.min(WORKLOG_MODAL_WIDTH_MAX, newWidth));
        setModalWidth(clamped);
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        setIsResizing(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        const deltaX = upEvent.clientX - dragStartRef.current.startX;
        const finalWidth = Math.max(
          WORKLOG_MODAL_WIDTH_MIN,
          Math.min(WORKLOG_MODAL_WIDTH_MAX, dragStartRef.current.startWidth + deltaX * 2)
        );
        if (typeof window !== 'undefined') {
          localStorage.setItem('cc_worklog_modal_width', finalWidth.toString());
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [modalWidth]
  );

  const handleOpenDetailModal = useCallback(
    (record: CcPaystubRecord) => {
      setSelectedRecord(record);
      setModalOpen(true);
    },
    [setSelectedRecord]
  );

  const handleOpenWorkLogModal = useCallback(
    async (record: CcPaystubRecord) => {
      setWorkLogRecord(record);
      setWorkLogModalOpen(true);
      setWorkLogLoading(true);
      setWorkLogPage(1);

      try {
        const startStr = dateRange && dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined;
        const endStr = dateRange && dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined;

        const res = await apiClient.kpi.getCcWorkLogs({
          consultantId: record.consultantId,
          dateFrom: startStr,
          dateTo: endStr,
          storeId: selectedStore,
        });

        if (res && res.data) {
          setWorkLogs(res.data);
          setWorkLogSummary({
            totalWorkDays: res.summary?.totalWorkDays || res.data.length || 0,
            totalWorkHours: res.summary?.totalWorkHours || 0,
            hourlyRate: res.summary?.hourlyRate || record.hourlyRate || 25000,
            totalWage: res.summary?.totalWage || 0,
          });
        } else {
          setWorkLogs([]);
        }
      } catch {
        message.error('Không thể tải chi tiết ca làm việc!');
        setWorkLogs([]);
      } finally {
        setWorkLogLoading(false);
      }
    },
    [dateRange, selectedStore]
  );

  const handleOpenCcXoayModal = useCallback(
    async (record: CcPaystubRecord) => {
      setCcXoayRecord(record);
      setCcXoayModalOpen(true);
      setCcXoayLoading(true);

      try {
        const startStr = dateRange && dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined;
        const endStr = dateRange && dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined;

        const res = await apiClient.kpi.getCcXoayReport({
          dateFrom: startStr,
          dateTo: endStr,
          storeId: selectedStore,
          consultantId: record.consultantId,
        });

        if (res && res.data) {
          setCcXoayLogs(res.data);
          setCcXoaySummary({
            totalCheckins: res.summary?.totalCheckins || res.data.length || 0,
            totalBonus: res.summary?.totalBonus || 0,
            totalPoints: res.summary?.totalPoints || 0,
          });
        } else {
          setCcXoayLogs([]);
        }
      } catch {
        message.error('Không thể tải chi tiết lượt CC Xoay!');
        setCcXoayLogs([]);
      } finally {
        setCcXoayLoading(false);
      }
    },
    [dateRange, selectedStore]
  );

  const handleOpenComboModal = useCallback((record: CcPaystubRecord) => {
    setComboModalRecord(record);
    setComboModalOpen(true);
  }, []);

  const handleOpenTipModal = useCallback(
    async (record: CcPaystubRecord) => {
      setTipModalRecord(record);
      setTipModalOpen(true);
      setTipModalLoading(true);
      setTipModalFilter('ALL');
      setTipModalSearch('');

      try {
        const startStr = dateRange && dateRange[0] ? dateRange[0].format('YYYY-MM-DD') : undefined;
        const endStr = dateRange && dateRange[1] ? dateRange[1].format('YYYY-MM-DD') : undefined;

        const res = await apiClient.kpi.getCcTipRecords({
          dateFrom: startStr,
          dateTo: endStr,
          storeId: selectedStore,
          consultantId: record.displayName,
          tipFilter: 'ALL',
          limit: 3000,
        });

        if (res && res.data) {
          setTipModalRecords(res.data);
        } else {
          setTipModalRecords([]);
        }
      } catch {
        message.error('Không thể tải chi tiết ca tip!');
        setTipModalRecords([]);
      } finally {
        setTipModalLoading(false);
      }
    },
    [dateRange, selectedStore]
  );

  const handleOpenDiamondModal = useCallback((record: CcPaystubRecord) => {
    setDiamondRecord(buildDiamondDetailEntry(record));
    setDiamondModalOpen(true);
  }, []);

  const filteredTipModalRecords = useMemo(
    () => filterCcTipModalRecords(tipModalRecords, tipModalFilter, tipModalSearch),
    [tipModalRecords, tipModalFilter, tipModalSearch]
  );

  const tipModalSummary = useMemo(() => summarizeCcTipModalRecords(tipModalRecords), [tipModalRecords]);

  return {
    isTrainingConfigOpen,
    setIsTrainingConfigOpen,
    modalOpen,
    setModalOpen,
    handleOpenDetailModal,
    workLogModalOpen,
    setWorkLogModalOpen,
    workLogLoading,
    workLogRecord,
    workLogs,
    workLogSummary,
    workLogPage,
    setWorkLogPage,
    workLogPageSize,
    setWorkLogPageSize,
    modalWidth,
    updateModalWidth,
    isResizing,
    handleMouseDown,
    handleOpenWorkLogModal,
    ccXoayModalOpen,
    setCcXoayModalOpen,
    ccXoayLoading,
    ccXoayRecord,
    ccXoayLogs,
    ccXoaySummary,
    handleOpenCcXoayModal,
    comboModalOpen,
    setComboModalOpen,
    comboModalRecord,
    handleOpenComboModal,
    tipModalOpen,
    setTipModalOpen,
    tipModalLoading,
    tipModalRecord,
    tipModalFilter,
    setTipModalFilter,
    tipModalSearch,
    setTipModalSearch,
    filteredTipModalRecords,
    tipModalSummary,
    handleOpenTipModal,
    diamondModalOpen,
    setDiamondModalOpen,
    diamondRecord,
    handleOpenDiamondModal,
  };
}
