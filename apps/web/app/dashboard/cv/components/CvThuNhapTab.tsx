'use client';

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  theme,
  Table,
  Tag,
  Button,
  Modal,
  Input,
  Space,
  Statistic,
  Spin,
  Popover,
  InputNumber,
  message,
  Tooltip,
  Radio,
  Popconfirm,
} from 'antd';
import {
  WalletOutlined,
  DollarOutlined,
  SearchOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  SaveOutlined,
  DeleteOutlined,
  PlusOutlined,
  CalendarOutlined,
  LoginOutlined,
  LogoutOutlined,
  CompressOutlined,
  ExpandOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import {
  CvPaystubRecord,
  CvWorkLogDetailRecord,
  removeVietnameseTones,
  type ReportComparisonMode,
  calculateFractionToday,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import dayjs from 'dayjs';
import CcAvatar from '../../cc/components/CcAvatar';
import { MobileRecordList } from '~/components/ui';
import { formatCompactVND, formatVND } from '../../../../lib/format-utils';
import { useResponsiveTier, useViewportSize } from '~/hooks/useResponsiveTier';
import { usePreviousReportPeriod } from '../../../../hooks/usePreviousReportPeriod';
import PeriodComparison from '../../../../components/ui/PeriodComparison';

const { Text } = Typography;

export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'PXL';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('ACADEMY') || s.includes('ADT')) return 'ADT';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('CMT8')) return 'CMT8';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

const formatHoursToHoursMinutes = (totalHours: number, compact = false) => {
  if (!totalHours || totalHours <= 0) return compact ? '0h' : '0 giờ';
  const hrs = Math.floor(totalHours);
  const mins = Math.round((totalHours - hrs) * 60);
  if (mins <= 0) return compact ? `${hrs}h` : `${hrs} giờ`;
  return compact ? `${hrs}h ${mins}m` : `${hrs} giờ ${mins} phút`;
};

interface CvThuNhapTabProps {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  currentUser?: Record<string, unknown> | null;
  comparisonMode: ReportComparisonMode;
}

export default function CvThuNhapTab({ dateRange, selectedStore, currentUser, comparisonMode }: CvThuNhapTabProps) {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const tier = useResponsiveTier();
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  // A rotated iPhone 12 is wide enough for the compact tablet/table layout.
  // Keep the portrait phone record cards, but do not force a 844px landscape
  // viewport into a vertically stacked phone composition.
  const isTabletDensityLandscape = viewportWidth >= 768 && viewportWidth > viewportHeight;
  const isMobile = tier === 'mobile' && !isTabletDensityLandscape;
  const useCompactMetricFormat = tier === 'mobile' || tier === 'tablet';
  const formatMetricValue = (value: number) => (useCompactMetricFormat ? formatCompactVND(value) : formatVND(value));
  const previousPeriod = usePreviousReportPeriod(dateRange, comparisonMode);
  const [loading, setLoading] = useState(false);
  const [paystubData, setPaystubData] = useState<CvPaystubRecord[]>([]);
  const [summary, setSummary] = useState({
    totalHourlyWage: 0,
    totalCvXoayBonus: 0,
    totalCvTipBonus: 0,
    totalSeniorityBonus: 0,
    totalHolidayBasePay: 0,
    totalHolidayPremiumPay: 0,
    totalHolidayPayrollAddition: 0,
    totalTimeBonus: 0,
    totalOffMonthWage: 0,
    grandTotalIncome: 0,
  });
  const [previousSummary, setPreviousSummary] = useState<{
    totalHourlyWage: number;
    totalCvXoayBonus: number;
    totalCvTipBonus: number;
    totalSeniorityBonus: number;
    totalHolidayBasePay: number;
    totalHolidayPremiumPay: number;
    totalHolidayPayrollAddition: number;
    totalTimeBonus?: number;
    totalOffMonthWage?: number;
    grandTotalIncome: number;
  } | null>(null);

  const isDayMode = comparisonMode === 'day';
  const periodNoun = comparisonMode === 'week' ? 'tuần' : 'tháng';

  const elapsedRatioPercent = React.useMemo(() => {
    const now = dayjs();
    const currentHour = now.hour();
    const fractionToday = calculateFractionToday(currentHour);

    const start = dateRange?.[0]
      ? dayjs(dateRange[0])
      : dayjs().startOf(comparisonMode === 'week' ? 'isoWeek' : 'month');
    const end = dateRange?.[1] ? dayjs(dateRange[1]) : dayjs().endOf(comparisonMode === 'week' ? 'isoWeek' : 'month');

    if (now.isBefore(start, 'day')) return 0.1;
    if (now.isAfter(end, 'day')) return 100;

    const totalDays = end.diff(start, 'day') + 1;
    const daysPassed = now.diff(start, 'day');
    const elapsedDays = daysPassed + fractionToday;
    const ratio = Math.min(1.0, Math.max(0.001, elapsedDays / totalDays));
    return Math.round(ratio * 1000) / 10;
  }, [dateRange, comparisonMode]);

  const isPastPeriod = elapsedRatioPercent >= 100;
  const ratio = (elapsedRatioPercent || 100) / 100;

  /**
   * Công thức chuẩn dự đoán CV Xoay cuối tháng (Exact Closed-Form Model):
   * - N_hat = round(serviceCount / ratio)
   * - Điểm kỹ thuật trung bình mỗi ca p_bar giải ngược từ bonus hiện tại (hoặc mặc định 35 pts)
   * - CV_Xoay = 1.000đ * [ (p_bar / 200) * N_hat^2 + (1 - p_bar / 200) * N_hat ]
   */
  function calculateProjectedCvXoay(serviceCount: number, currentBonus: number, ratio: number): number {
    if (ratio <= 0) return currentBonus;
    const safeRatio = Math.max(0.001, Math.min(1.0, ratio));
    if (serviceCount <= 0 && currentBonus <= 0) return 0;

    const nHat = serviceCount > 0 ? Math.round(serviceCount / safeRatio) : 0;
    if (nHat <= 0) return currentBonus;

    let pBar = 35;
    if (serviceCount >= 3 && currentBonus > 0) {
      const rawP = (200 * (currentBonus / 1000 - serviceCount)) / (serviceCount * (serviceCount - 1));
      if (!isNaN(rawP) && rawP > 5 && rawP < 80) {
        pBar = rawP;
      }
    }

    const factor = pBar / 200;
    const projected = 1000 * (factor * nHat * nHat + (1 - factor) * nHat);
    return Math.max(currentBonus, Math.round(projected));
  }

  const isMonthMode = comparisonMode === 'month';

  const getProjectedRecord = React.useCallback(
    (record: CvPaystubRecord) => {
      const holidayActual = record.holidayPayrollAddition || record.holidayPremiumPay || 0;
      if (isPastPeriod) {
        return {
          projectedHourlyWage: record.hourlyWage || 0,
          projectedCvXoayBonus: record.cvXoayBonus || 0,
          projectedSeniorityBonus: record.seniorityBonus || 0,
          projectedCvTipBonus: record.cvTipBonus || 0,
          projectedHolidayPay: holidayActual,
          projectedTotalIncome: record.totalIncome || 0,
        };
      }

      const projectedHourlyWage = Math.round((record.hourlyWage || 0) / (ratio || 1));

      // Vòng xoay là mô hình lũy tiến cấp số cộng Level reset theo tháng (số khách gấp đôi -> tiền thưởng gấp 4)
      // Sử dụng công thức chuẩn cấp số cộng (Exact Closed-Form Model). Không dự đoán theo tuần.
      const projectedCvXoayBonus = isMonthMode
        ? calculateProjectedCvXoay(record.serviceCount || 0, record.cvXoayBonus || 0, ratio)
        : 0;
      const projectedSeniorityBonus = isMonthMode
        ? Math.round((projectedCvXoayBonus * (record.seniorityBonusPercent || 0)) / 100)
        : 0;
      const projectedCvTipBonus = Math.round((record.cvTipBonus || 0) / (ratio || 1));
      const projectedHolidayPay = holidayActual;

      const projectedTotalIncome = isMonthMode
        ? projectedHourlyWage +
          projectedCvXoayBonus +
          projectedSeniorityBonus +
          projectedCvTipBonus +
          projectedHolidayPay
        : projectedHourlyWage +
          (record.cvXoayBonus || 0) +
          (record.seniorityBonus || 0) +
          projectedCvTipBonus +
          projectedHolidayPay;

      return {
        projectedHourlyWage,
        projectedCvXoayBonus,
        projectedSeniorityBonus,
        projectedCvTipBonus,
        projectedHolidayPay,
        projectedTotalIncome,
      };
    },
    [isPastPeriod, ratio, isMonthMode]
  );

  const projectedSummary = React.useMemo(() => {
    if (isPastPeriod) {
      return {
        projectedHourlyWage: summary.totalHourlyWage,
        projectedCvXoayBonus: summary.totalCvXoayBonus,
        projectedSeniorityBonus: summary.totalSeniorityBonus,
        projectedCvTipBonus: summary.totalCvTipBonus,
        projectedTotalIncome: summary.grandTotalIncome,
      };
    }

    const projectedHourlyWage = Math.round((summary.totalHourlyWage || 0) / (ratio || 1));
    const projectedCvXoayBonus = isMonthMode
      ? paystubData.length > 0
        ? paystubData.reduce((acc, r) => acc + (getProjectedRecord(r).projectedCvXoayBonus || 0), 0)
        : calculateProjectedCvXoay(0, summary.totalCvXoayBonus || 0, ratio)
      : 0;
    const projectedSeniorityBonus = isMonthMode
      ? paystubData.length > 0
        ? paystubData.reduce((acc, r) => acc + (getProjectedRecord(r).projectedSeniorityBonus || 0), 0)
        : Math.round((summary.totalSeniorityBonus || 0) / (ratio || 1))
      : 0;
    const projectedCvTipBonus = Math.round((summary.totalCvTipBonus || 0) / (ratio || 1));
    const holidayAddition = summary.totalHolidayPayrollAddition || summary.totalHolidayPremiumPay || 0;

    const projectedTotalIncome = isMonthMode
      ? projectedHourlyWage + projectedCvXoayBonus + projectedSeniorityBonus + projectedCvTipBonus + holidayAddition
      : projectedHourlyWage +
        (summary.totalCvXoayBonus || 0) +
        (summary.totalSeniorityBonus || 0) +
        projectedCvTipBonus +
        holidayAddition;

    return {
      projectedHourlyWage,
      projectedCvXoayBonus,
      projectedSeniorityBonus,
      projectedCvTipBonus,
      projectedTotalIncome,
    };
  }, [summary, ratio, isPastPeriod, isMonthMode, paystubData, getProjectedRecord]);

  const renderForecastSubtext = (projectedVal: number) => {
    if (isDayMode || !projectedVal) return null;

    if (isPastPeriod) {
      return (
        <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
          <div
            className="text-xs font-medium text-slate-500 mt-2 flex items-center justify-between border-t border-slate-700/20 pt-1.5 cursor-help opacity-70"
            style={isMobile ? { fontSize: 10, lineHeight: 1.35 } : undefined}
          >
            <span>Thực tế chốt {periodNoun}:</span>
            <span className="tabular-nums font-medium text-slate-400 whitespace-nowrap">
              {formatCompactVND(projectedVal)}
            </span>
          </div>
        </Tooltip>
      );
    }

    return (
      <Tooltip
        title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian ${periodNoun} (Ca 09:00 - 21:00). Dự đoán về đích cuối ${periodNoun} dựa trên tốc độ hiện tại.`}
      >
        <div
          className="text-xs font-medium text-slate-400 mt-2 flex items-center justify-between border-t border-slate-700/30 pt-1.5 cursor-help"
          style={isMobile ? { fontSize: 10, lineHeight: 1.35 } : undefined}
        >
          <span className="inline-flex items-center gap-1">
            <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="shrink-0 text-sm leading-none">
              🔮
            </span>
            <span className="text-[11px] text-slate-400">Cuối {periodNoun}:</span>
          </span>
          <span className="tabular-nums font-semibold text-emerald-400 whitespace-nowrap">
            ~{formatCompactVND(projectedVal)}
          </span>
        </div>
      </Tooltip>
    );
  };

  const [searchText, setSearchText] = useState('');
  const [pageSize, setPageSize] = useState<number>(20);
  const [isCompact, setIsCompact] = useState(false);

  // Seniority config state
  const [seniorityRules, setSeniorityRules] = useState<{ minMonths: number; bonusPercent: number }[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  // Resizable Popover settings & persistence
  const [popoverWidth, setPopoverWidth] = useState<number>(420);
  const observerRef = React.useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('cv_seniority_popover_width');
      if (savedWidth) {
        setPopoverWidth(parseInt(savedWidth, 10));
      }
    }
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  const popoverRefCallback = React.useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (node) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > 350) {
            setPopoverWidth(width);
            localStorage.setItem('cv_seniority_popover_width', Math.round(width).toString());
          }
        }
      });
      observer.observe(node);
      observerRef.current = observer;
    }
  }, []);

  // Persistent Work Log Modal Width state (Default: 800px)
  const [modalWidth, setModalWidth] = useState<number>(800);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = React.useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 800 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('cv_worklog_modal_width');
      if (savedWidth) {
        const parsed = parseInt(savedWidth, 10);
        if (!isNaN(parsed) && parsed >= 600 && parsed <= 1800) {
          setModalWidth(parsed);
        }
      }
    }
  }, []);

  const updateModalWidth = (newWidth: number) => {
    const clamped = Math.max(600, Math.min(1800, newWidth));
    setModalWidth(clamped);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cv_worklog_modal_width', clamped.toString());
    }
  };

  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      dragStartRef.current = { startX: e.clientX, startWidth: modalWidth };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - dragStartRef.current.startX;
        const newWidth = dragStartRef.current.startWidth + deltaX * 2;
        const clamped = Math.max(600, Math.min(1800, newWidth));
        setModalWidth(clamped);
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        setIsResizing(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        const deltaX = upEvent.clientX - dragStartRef.current.startX;
        const finalWidth = Math.max(600, Math.min(1800, dragStartRef.current.startWidth + deltaX * 2));
        if (typeof window !== 'undefined') {
          localStorage.setItem('cv_worklog_modal_width', finalWidth.toString());
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [modalWidth]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cv_paystub_page_size');
      if (saved) {
        setPageSize(parseInt(saved, 10));
      }
    }
  }, []);

  // Individual Paystub Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState<CvPaystubRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
  const [workLogSummary, setWorkLogSummary] = useState({
    totalWorkDays: 0,
    totalWorkHours: 0,
    hourlyRate: 0,
    totalWage: 0,
  });

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : dayjs().startOf('month').format('YYYY-MM-DD');
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : dayjs().endOf('month').format('YYYY-MM-DD');

      const [res, previousRes] = await Promise.all([
        apiClient.kpi.getCvPaystub({ dateFrom, dateTo, storeId: selectedStore }),
        previousPeriod
          ? apiClient.kpi.getCvPaystub({ ...previousPeriod.params, storeId: selectedStore })
          : Promise.resolve(null),
      ]);

      if (res) {
        const records = res.data || [];
        setPaystubData(records);
        setSelectedRecord((prev) => {
          if (!prev) return null;
          return records.find((r) => r.staffId === prev.staffId) || prev;
        });
        setSummary({
          totalHourlyWage: res.summary?.totalHourlyWage || 0,
          totalCvXoayBonus: res.summary?.totalCvXoayBonus || 0,
          totalCvTipBonus: res.summary?.totalCvTipBonus || 0,
          totalSeniorityBonus: res.summary?.totalSeniorityBonus || 0,
          totalHolidayBasePay: res.summary?.totalHolidayBasePay || 0,
          totalHolidayPremiumPay: res.summary?.totalHolidayPremiumPay || 0,
          totalHolidayPayrollAddition: res.summary?.totalHolidayPayrollAddition || 0,
          totalTimeBonus: res.summary?.totalTimeBonus || 0,
          totalOffMonthWage: res.summary?.totalOffMonthWage || 0,
          grandTotalIncome: res.summary?.grandTotalIncome || 0,
        });
        setPreviousSummary(
          previousRes
            ? {
                totalHourlyWage: previousRes.summary?.totalHourlyWage || 0,
                totalCvXoayBonus: previousRes.summary?.totalCvXoayBonus || 0,
                totalCvTipBonus: previousRes.summary?.totalCvTipBonus || 0,
                totalSeniorityBonus: previousRes.summary?.totalSeniorityBonus || 0,
                totalHolidayBasePay: previousRes.summary?.totalHolidayBasePay || 0,
                totalHolidayPremiumPay: previousRes.summary?.totalHolidayPremiumPay || 0,
                totalHolidayPayrollAddition: previousRes.summary?.totalHolidayPayrollAddition || 0,
                totalTimeBonus: previousRes.summary?.totalTimeBonus || 0,
                totalOffMonthWage: previousRes.summary?.totalOffMonthWage || 0,
                grandTotalIncome: previousRes.summary?.grandTotalIncome || 0,
              }
            : null
        );
      }
    } catch (err) {
      console.error('Error fetching CV Paystub data:', err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, previousPeriod, selectedStore]);

  const handleAddAllowance = async () => {
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
      setAllowanceTitle('');
      setAllowanceAmount(null);
      setAllowanceNote('');
      setAllowanceFormType('plus');
      await fetchData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi khi thêm phụ cấp.';
      message.error(errMsg);
    } finally {
      setIsSubmittingAllowance(false);
    }
  };

  const handleDeleteAllowance = async (allowanceId: number | string) => {
    try {
      const res = await fetch(`/api/kpi/cv-allowances/${allowanceId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể xoá phụ cấp.');
      }
      message.success('Đã xoá phụ cấp.');
      await fetchData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi khi xoá phụ cấp.';
      message.error(errMsg);
    }
  };

  const fetchSeniorityConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await apiClient.kpi.getCvSeniorityConfig();
      if (res) {
        setSeniorityRules([...res].sort((a, b) => a.minMonths - b.minMonths));
      }
    } catch (err) {
      console.error('Error fetching seniority config:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchSeniorityConfig();
  }, []);

  const handleSaveSeniorityConfig = async () => {
    setConfigSaving(true);
    try {
      const invalid = seniorityRules.some((r) => r.minMonths <= 0 || r.bonusPercent < 0);
      if (invalid) {
        message.error('Vui lòng nhập các mốc thời gian và tỷ lệ hợp lệ (thời gian > 0, tỷ lệ >= 0)!');
        return;
      }
      const res = await apiClient.kpi.updateCvSeniorityConfig(seniorityRules);
      if (res && res.success) {
        message.success('Đã lưu cấu hình thưởng thâm niên thành công!');
        fetchData();
      }
    } catch (err) {
      message.error('Không thể lưu cấu hình thưởng thâm niên.');
    } finally {
      setConfigSaving(false);
    }
  };

  const renderPopoverContent = () => {
    return (
      <div
        ref={popoverRefCallback}
        style={{
          width: `${popoverWidth}px`,
          minWidth: '380px',
          maxWidth: '650px',
          resize: 'horizontal',
          overflow: 'auto',
          paddingBottom: '8px',
        }}
        className="p-1 space-y-3"
      >
        <div className="border-b pb-2 mb-2">
          <Typography.Title level={5} style={{ margin: 0, fontSize: '14px' }}>
            Cấu hình tỷ lệ Thưởng Thâm Niên
          </Typography.Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Cộng thêm % tiền thưởng vào Thưởng Ca CV (Xoay)
          </Text>
        </div>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {configLoading ? (
            <div className="flex justify-center p-4">
              <Spin size="small" />
            </div>
          ) : seniorityRules.length === 0 ? (
            <div className="text-center py-2 text-slate-400 text-xs">Chưa có mốc cấu hình nào.</div>
          ) : (
            seniorityRules.map((rule, idx) => (
              <Row
                key={idx}
                align="middle"
                justify="space-between"
                className="py-1 border-b border-dashed border-slate-100 dark:border-slate-800 last:border-b-0 pb-2"
              >
                <Col>
                  <Space size={4}>
                    <Text className="text-xs">Từ</Text>
                    <InputNumber
                      min={1}
                      max={120}
                      size="small"
                      value={rule.minMonths}
                      disabled={currentUser?.role !== 'admin'}
                      onChange={(val) => {
                        const updated = [...seniorityRules];
                        updated[idx].minMonths = val || 0;
                        setSeniorityRules(updated);
                      }}
                      style={{ width: 65 }}
                    />
                    <Text className="text-xs">tháng trở lên: Thưởng thêm</Text>
                    <InputNumber
                      min={0}
                      max={100}
                      size="small"
                      value={rule.bonusPercent}
                      disabled={currentUser?.role !== 'admin'}
                      onChange={(val) => {
                        const updated = [...seniorityRules];
                        updated[idx].bonusPercent = val || 0;
                        setSeniorityRules(updated);
                      }}
                      style={{ width: 60 }}
                    />
                    <Text className="text-xs">%</Text>
                  </Space>
                </Col>
                <Col>
                  {currentUser?.role === 'admin' && (
                    <Button
                      danger
                      type="text"
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        setSeniorityRules((prev) => prev.filter((_, i) => i !== idx));
                      }}
                    />
                  )}
                </Col>
              </Row>
            ))
          )}
        </div>

        {currentUser?.role === 'admin' && (
          <div className="flex justify-between items-center pt-2 border-t mt-2">
            <Button
              type="dashed"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setSeniorityRules((prev) => [...prev, { minMonths: 6, bonusPercent: 5 }]);
              }}
            >
              Thêm
            </Button>
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              loading={configSaving}
              onClick={handleSaveSeniorityConfig}
              style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000', fontWeight: '600' }}
            >
              Lưu
            </Button>
          </div>
        )}
      </div>
    );
  };

  const filteredData = React.useMemo(() => {
    if (!searchText) return paystubData;
    const q = removeVietnameseTones(searchText);
    return paystubData.filter(
      (item) => removeVietnameseTones(item.staffName).includes(q) || removeVietnameseTones(item.store).includes(q)
    );
  }, [paystubData, searchText]);

  const handleOpenWorkLogs = async (record: CvPaystubRecord) => {
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
  };

  const columns = [
    {
      title: 'CV',
      dataIndex: 'staffName',
      key: 'staffName',
      width: 160,
      render: (text: string, record: CvPaystubRecord, index: number) => {
        const rank = index + 1;
        let rankBadge = null;
        if (rank === 1) {
          rankBadge = <span className="text-sm shrink-0 w-5 text-center">🥇</span>;
        } else if (rank === 2) {
          rankBadge = <span className="text-sm shrink-0 w-5 text-center">🥈</span>;
        } else if (rank === 3) {
          rankBadge = <span className="text-sm shrink-0 w-5 text-center">🥉</span>;
        } else {
          rankBadge = <span className="text-xs font-semibold text-slate-500 w-5 text-center shrink-0">#{rank}</span>;
        }

        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            {rankBadge}
            <CcAvatar name={text} src={record.avatar} size={26} />
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-200 whitespace-nowrap">{text}</span>
              <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">L{record.techLevel || 1}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Store',
      dataIndex: 'store',
      key: 'store',
      width: 60,
      align: 'center' as const,
      render: (text: string) => (
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">{formatStoreCode(text)}</span>
      ),
    },
    {
      title: 'Công & Giờ Làm',
      key: 'workTime',
      width: 110,
      align: 'right' as const,
      render: (_: unknown, record: CvPaystubRecord) => {
        const val = record.totalWorkHours || 0;
        const days = record.activeDays || 0;
        const offDays = record.offDaysWorked || 0;
        const offMonthDays = record.offMonthDays || 0;
        const regularDays = Math.max(0, days - offDays);

        const hasOffWork = offDays > 0;

        const monthOffBadge =
          offMonthDays > 0 ? (
            <Tooltip
              title={`Đã nghỉ ${offMonthDays} ngày phép tháng có hưởng 100% lương (+${(record.offMonthWage || 0).toLocaleString('vi-VN')}đ)`}
            >
              <span className="text-emerald-400 font-semibold text-[11px] ml-1">+{offMonthDays}p</span>
            </Tooltip>
          ) : null;

        const daysContent =
          days === 0 ? (
            <span className="text-slate-600 font-medium text-[11px]">0 ngày{monthOffBadge}</span>
          ) : hasOffWork ? (
            <Tooltip title={`Có ${offDays} ngày đi làm vào ngày nghỉ tuần (Được tính x2 lương giờ)`}>
              <span className="cursor-help text-amber-400 font-semibold text-[11px]">
                {regularDays}+{offDays} ngày{monthOffBadge}
              </span>
            </Tooltip>
          ) : (
            <span className="text-slate-400 font-medium text-[11px]">
              {days} ngày{monthOffBadge}
            </span>
          );

        return (
          <div className="flex flex-col items-end w-full text-right leading-tight">
            {val > 0 ? (
              <Button
                type="link"
                size="small"
                onClick={() => handleOpenWorkLogs(record)}
                className="p-0 font-bold text-xs text-sky-400 hover:text-sky-300 hover:underline flex justify-end items-center h-auto"
              >
                <span className="tabular-nums font-mono text-xs">{formatHoursToHoursMinutes(val, true)}</span>
              </Button>
            ) : (
              <span className="tabular-nums font-mono text-xs text-slate-500 font-medium">0h</span>
            )}
            <div className="tabular-nums mt-0.5 whitespace-nowrap">{daysContent}</div>
          </div>
        );
      },
    },
    {
      title: 'Lương Giờ',
      dataIndex: 'hourlyWage',
      key: 'hourlyWage',
      width: 95,
      align: 'right' as const,
      render: (val: number, r: CvPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-medium text-xs text-slate-600 dark:text-slate-300">
              {val.toLocaleString('vi-VN')}đ
            </span>
            {!isDayMode && !isPastPeriod && proj.projectedHourlyWage > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-blue-400/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedHourlyWage)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'CV Xoay',
      dataIndex: 'cvXoayBonus',
      key: 'cvXoayBonus',
      width: 100,
      align: 'right' as const,
      render: (val: number, r: CvPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-xs text-blue-400">+{val.toLocaleString('vi-VN')}đ</span>
            {!isDayMode && !isPastPeriod && proj.projectedCvXoayBonus > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-blue-400/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedCvXoayBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thưởng Thâm Niên',
      key: 'seniorityBonus',
      width: 125,
      align: 'right' as const,
      render: (_: unknown, record: CvPaystubRecord) => {
        const months = record.seniorityMonths || 0;
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;
        const seniorityStr = years > 0 ? `${years}y ${remainingMonths}m` : `${months}m`;
        const bonus = record.seniorityBonus || 0;
        const percent = record.seniorityBonusPercent || 0;
        const proj = getProjectedRecord(record);

        let colorClass = 'text-slate-500';

        if (percent > 0) {
          if (percent <= 5) {
            colorClass = 'text-blue-400';
          } else if (percent <= 10) {
            colorClass = 'text-teal-400';
          } else if (percent <= 15) {
            colorClass = 'text-emerald-400';
          } else if (percent <= 20) {
            colorClass = 'text-amber-400';
          } else {
            colorClass = 'text-purple-400';
          }
        }

        return (
          <div className="flex flex-col items-end">
            <span className={`tabular-nums font-semibold text-xs block ${colorClass}`}>
              +{bonus.toLocaleString('vi-VN')}đ
            </span>
            <span className="block text-[10px] font-medium tabular-nums text-slate-500">
              {seniorityStr} {percent > 0 ? `[+${percent}%]` : '[0%]'}
            </span>
            {!isDayMode && !isPastPeriod && proj.projectedSeniorityBonus > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-amber-500/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedSeniorityBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'CV Tip',
      dataIndex: 'cvTipBonus',
      key: 'cvTipBonus',
      width: 100,
      align: 'right' as const,
      render: (val: number, r: CvPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-xs text-purple-400">+{val.toLocaleString('vi-VN')}đ</span>
            {!isDayMode && !isPastPeriod && proj.projectedCvTipBonus > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-purple-400/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedCvTipBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Tổng Thu Nhập',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      width: 120,
      align: 'right' as const,
      render: (val: number, r: CvPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-slate-700 dark:text-slate-200 text-sm">
              {Math.round(val).toLocaleString('vi-VN')}đ
            </span>
            {!isDayMode && !isPastPeriod && proj.projectedTotalIncome > 0 && (
              <Tooltip
                title={`Dự đoán tổng thu nhập về đích cuối ${periodNoun}: ~${formatVND(proj.projectedTotalIncome)}đ`}
              >
                <div className="flex items-center gap-1 text-[11px] text-emerald-500/80 font-medium tabular-nums cursor-help">
                  <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                    🔮
                  </span>
                  <span>~{formatCompactVND(proj.projectedTotalIncome)}</span>
                </div>
              </Tooltip>
            )}
          </div>
        );
      },
    },
    {
      title: 'Khấu trừ BHXH',
      dataIndex: 'socialSecurityAmount',
      key: 'socialSecurityAmount',
      width: 115,
      align: 'right' as const,
      render: (val: number | undefined) => (
        <span className="tabular-nums font-medium text-xs text-rose-500">
          {val && val > 0 ? `-${val.toLocaleString('vi-VN')}đ` : '0đ'}
        </span>
      ),
    },
    {
      title: 'Lương Thực Lãnh',
      dataIndex: 'netIncome',
      key: 'netIncome',
      width: 130,
      align: 'right' as const,
      render: (val: number | undefined, r: CvPaystubRecord) => {
        const net = Math.round(val ?? r.totalIncome - (r.socialSecurityAmount || 0));
        return <span className="tabular-nums font-bold text-emerald-500 text-sm">{net.toLocaleString('vi-VN')}đ</span>;
      },
    },
    {
      title: 'Action',
      key: 'action',
      width: 90,
      align: 'center' as const,
      render: (_: unknown, record: CvPaystubRecord) => (
        <Button
          type="default"
          size="small"
          icon={<EyeOutlined className="text-amber-400" />}
          className="text-[11px] font-medium border-slate-700 hover:border-amber-400 hover:text-amber-400 px-2"
          onClick={() => {
            setSelectedRecord(record);
            setModalOpen(true);
          }}
        >
          Phiếu Lương
        </Button>
      ),
    },
  ];

  return (
    <div className="cv-income-tab flex flex-col gap-4">
      {/* Metrics Row */}
      <Row gutter={[12, 12]} className="cv-income-stat-grid">
        <Col xs={12} sm={4} md={4} lg={4} xl={4}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="∑ Lương Giờ"
              value={summary.totalHourlyWage}
              formatter={(value) => formatMetricValue(Number(value || 0))}
              valueStyle={{ color: '#1890ff', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<ClockCircleOutlined />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalHourlyWage}
              previousValue={previousSummary?.totalHourlyWage || 0}
              formatter={formatMetricValue}
              compact={useCompactMetricFormat}
            />
            {renderForecastSubtext(projectedSummary.projectedHourlyWage)}
          </Card>
        </Col>

        <Col xs={12} sm={5} md={5} lg={5} xl={5}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="∑ Thưởng Ca CV"
              value={summary.totalCvXoayBonus}
              formatter={(value) => formatMetricValue(Number(value || 0))}
              valueStyle={{ color: '#3f8600', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<ThunderboltOutlined />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalCvXoayBonus}
              previousValue={previousSummary?.totalCvXoayBonus || 0}
              formatter={formatMetricValue}
              compact={useCompactMetricFormat}
            />
            {renderForecastSubtext(projectedSummary.projectedCvXoayBonus)}
          </Card>
        </Col>

        <Col xs={12} sm={5} md={5} lg={5} xl={5}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="∑ Thưởng Thâm Niên"
              value={summary.totalSeniorityBonus}
              formatter={(value) => formatMetricValue(Number(value || 0))}
              valueStyle={{ color: '#d4a84b', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<GiftOutlined />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalSeniorityBonus}
              previousValue={previousSummary?.totalSeniorityBonus || 0}
              formatter={formatMetricValue}
              compact={useCompactMetricFormat}
            />
            {renderForecastSubtext(projectedSummary.projectedSeniorityBonus)}
          </Card>
        </Col>

        <Col xs={12} sm={5} md={5} lg={5} xl={5}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="∑ Thưởng CV Tip"
              value={summary.totalCvTipBonus}
              formatter={(value) => formatMetricValue(Number(value || 0))}
              valueStyle={{ color: '#722ed1', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<GiftOutlined />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalCvTipBonus}
              previousValue={previousSummary?.totalCvTipBonus || 0}
              formatter={formatMetricValue}
              compact={useCompactMetricFormat}
            />
            {renderForecastSubtext(projectedSummary.projectedCvTipBonus)}
          </Card>
        </Col>

        <Col xs={12} sm={5} md={5} lg={5} xl={5}>
          <Card
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: '#52c41a' }}
            className="shadow-sm rounded-xl"
          >
            <Statistic
              title="∑ Thu Nhập"
              value={summary.grandTotalIncome}
              formatter={(value) => formatMetricValue(Number(value || 0))}
              valueStyle={{ color: '#52c41a', fontVariantNumeric: 'tabular-nums', fontWeight: 'bold' }}
              prefix={<WalletOutlined />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.grandTotalIncome}
              previousValue={previousSummary?.grandTotalIncome || 0}
              formatter={formatMetricValue}
              compact={useCompactMetricFormat}
            />
            {renderForecastSubtext(projectedSummary.projectedTotalIncome)}
          </Card>
        </Col>
      </Row>

      {/* Paystub Table */}
      <Card
        className="full-bleed-card shadow-sm rounded-xl"
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: 0 } }}
        title={
          <div className="flex flex-wrap justify-between items-center gap-2 py-1">
            <div className="flex items-center gap-2">
              <DollarOutlined className="text-emerald-500 text-lg" />
              <span className="font-bold text-base" style={{ color: token.colorText }}>
                Bảng Bóc Tách CV Thu Nhập
              </span>

              <Popover content={renderPopoverContent()} trigger="click" placement="bottomLeft">
                <Button
                  type="text"
                  shape="circle"
                  icon={<SettingOutlined className="text-slate-400 hover:text-orange-500 transition-colors" />}
                  title="Cấu hình tỷ lệ thưởng thâm niên"
                />
              </Popover>
            </div>

            <Space wrap>
              <Input
                id="cv-thunhap-search-input"
                name="cvThuNhapSearch"
                placeholder="Tìm tên KTV..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: 200 }}
              />
              <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
                <Button
                  icon={isCompact ? <ExpandOutlined /> : <CompressOutlined />}
                  onClick={() => setIsCompact(!isCompact)}
                  className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
                />
              </Tooltip>
              <Tooltip title="Làm mới dữ liệu">
                <Button icon={<ClockCircleOutlined />} onClick={fetchData} loading={loading} />
              </Tooltip>
            </Space>
          </div>
        }
      >
        {isMobile ? (
          <div className="p-3">
            <MobileRecordList
              records={filteredData}
              loading={loading}
              getKey={(record) => String(record.staffId)}
              emptyDescription="Không tìm thấy dữ liệu thu nhập CV"
              renderRecord={(record, index) => (
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-400">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </span>
                    <CcAvatar name={record.staffName} src={record.avatar} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold" style={{ color: token.colorText }}>
                        {record.staffName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatStoreCode(record.store)} · L{record.techLevel || 1}
                      </div>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Lương giờ</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-sky-400">
                        +{formatCompactVND(record.hourlyWage || 0)}
                      </dd>
                      {!isDayMode && !isPastPeriod && (getProjectedRecord(record).projectedHourlyWage || 0) > 0 && (
                        <div className="text-[10px] text-sky-400/80 font-medium tabular-nums">
                          🔮 ~{formatCompactVND(getProjectedRecord(record).projectedHourlyWage)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">CV Xoay</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-purple-400">
                        +{formatCompactVND(record.cvXoayBonus || 0)}
                      </dd>
                      {!isDayMode && !isPastPeriod && (getProjectedRecord(record).projectedCvXoayBonus || 0) > 0 && (
                        <div className="text-[10px] text-purple-400/80 font-medium tabular-nums">
                          🔮 ~{formatCompactVND(getProjectedRecord(record).projectedCvXoayBonus)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Phụ cấp lễ x3</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-rose-400">
                        +{formatCompactVND(record.holidayPremiumPay || 0)}
                      </dd>
                      {!isDayMode && !isPastPeriod && (getProjectedRecord(record).projectedHolidayPay || 0) > 0 && (
                        <div className="text-[10px] text-rose-400/80 font-medium tabular-nums">
                          🔮 ~{formatCompactVND(getProjectedRecord(record).projectedHolidayPay)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Thu nhập</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-emerald-400">
                        {formatCompactVND(record.totalIncome || 0)}
                      </dd>
                      {!isDayMode && !isPastPeriod && (getProjectedRecord(record).projectedTotalIncome || 0) > 0 && (
                        <div className="text-[10px] text-emerald-500/80 font-medium tabular-nums">
                          🔮 ~{formatCompactVND(getProjectedRecord(record).projectedTotalIncome)}
                        </div>
                      )}
                    </div>
                  </dl>
                  <div className="mt-3 flex justify-end gap-2">
                    <Button size="small" onClick={() => handleOpenWorkLogs(record)}>
                      Giờ làm
                    </Button>
                    <Button
                      size="small"
                      icon={<EyeOutlined className="text-amber-400" />}
                      onClick={() => {
                        setSelectedRecord(record);
                        setModalOpen(true);
                      }}
                    >
                      Phiếu lương
                    </Button>
                  </div>
                </div>
              )}
            />
          </div>
        ) : (
          <Table
            dataSource={filteredData}
            columns={columns}
            rowKey="staffId"
            loading={loading}
            pagination={{
              pageSize: pageSize,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              onChange: (page, size) => {
                setPageSize(size);
                localStorage.setItem('cv_paystub_page_size', size.toString());
              },
            }}
            scroll={{ x: 'max-content' }}
            size="small"
            className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
          />
        )}
      </Card>

      {/* Paystub Detail Modal */}
      {/* Paystub Detail Modal (Chuẩn cấu trúc 28 mục Wings Legacy) */}
      <Modal
        title={
          <div className="flex items-center justify-between pr-8 border-b pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <WalletOutlined className="text-amber-500 text-lg" />
              <span className="font-bold text-base">Phiếu Lương Live Chi Tiết - {selectedRecord?.staffName}</span>
            </div>
            <Space>
              <Tag color="gold" className="font-mono text-xs font-semibold px-2 py-0.5">
                KỲ: {dateRange?.[0] ? dayjs(dateRange[0]).format('MM.YYYY') : dayjs().format('MM.YYYY')}
              </Tag>
              <Button
                size="small"
                icon={<PrinterOutlined />}
                onClick={() => {
                  if (typeof window !== 'undefined') window.print();
                }}
                className="text-xs"
              >
                In phiếu
              </Button>
            </Space>
          </div>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={[
          <div key="modal-footer" className="flex items-center justify-between w-full px-2 py-1">
            <Text type="secondary" className="text-xs italic">
              💡 Cấu trúc đầy đủ 28 mục đối chiếu chuẩn 100% Wings Legacy
            </Text>
            <Button
              key="close-paystub"
              type="primary"
              onClick={() => setModalOpen(false)}
              className="bg-amber-500 hover:bg-amber-400 border-amber-500 text-black font-semibold"
            >
              Đóng Phiếu Lương
            </Button>
          </div>,
        ]}
        width={780}
      >
        {selectedRecord && (
          <div className="space-y-4 pt-2 text-slate-800 dark:text-slate-200">
            {/* Staff Profile Header Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                    PAYSLIP • MONTH {dateRange?.[0] ? dayjs(dateRange[0]).format('MM.YYYY') : dayjs().format('MM.YYYY')}
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">NICKNAME:</span>{' '}
                      <strong className="text-sm font-semibold">{selectedRecord.staffName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">HỌ TÊN:</span>{' '}
                      <strong className="text-sm font-semibold">
                        {selectedRecord.fullName || selectedRecord.staffName}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">CHỨC VỤ:</span>{' '}
                      <Tag color="cyan" className="font-semibold text-xs ml-1">
                        Chuyên Viên (CV)
                      </Tag>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">BỘ PHẬN/ PHÒNG BAN:</span>{' '}
                      <Tag color="blue" className="font-semibold text-xs ml-1">
                        {selectedRecord.store}
                      </Tag>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">NGÀY NGHỈ PHÉP CÒN LẠI:</span>{' '}
                      <strong className="text-amber-600 dark:text-amber-400 font-bold tabular-nums ml-1">
                        {selectedRecord.dayOffAvailable ?? 26}
                      </strong>{' '}
                      ngày
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-400">Mã NV: #{selectedRecord.staffId}</div>
                  <Tag color="green" className="mt-1">
                    Active
                  </Tag>
                </div>
              </div>
            </div>

            {/* 28-row Wings Legacy Payslip Table */}
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold">
                    <th className="py-2 px-2 text-center w-10 border-r border-slate-200 dark:border-slate-700">STT</th>
                    <th className="py-2 px-3 text-left border-r border-slate-200 dark:border-slate-700">Nội dung</th>
                    <th className="py-2 px-3 text-left border-r border-slate-200 dark:border-slate-700">
                      Công thức / Diễn giải
                    </th>
                    <th className="py-2 px-3 text-right w-36">Thành tiền / Giá trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {/* GROUP 1: LƯƠNG THEO THỜI GIAN & CA LÀM VIỆC */}
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
                    <td
                      colSpan={4}
                      className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
                    >
                      🕒 I. Lương theo thời gian & Ca làm việc
                    </td>
                  </tr>

                  {/* (1) Giờ chuẩn */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      1
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
                      Giờ làm việc chuẩn trong tháng
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      {selectedRecord.expectedWorkDays || 26} ngày x 9h/ngày
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                      {selectedRecord.expectedWorkHours || 234}
                    </td>
                  </tr>

                  {/* (2) Giờ thực tế */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      2
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">
                      Giờ làm việc thực tế
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-normal">
                      {formatHoursToHoursMinutes(selectedRecord.totalWorkHours)}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">
                      {Number(selectedRecord.totalWorkHours || 0).toFixed(1)}
                    </td>
                  </tr>

                  {/* (3) Đơn giá giờ */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      3
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Đơn giá giờ</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      —
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                      {selectedRecord.hourlyRate.toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (4) Lương theo giờ làm */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      4
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Lương theo giờ làm</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      (4) = (2) x (3)
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                      {Math.round(selectedRecord.hourlyWage).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (5) Off tuần */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      5
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Off tuần theo lịch</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      Nghỉ tuần theo lịch
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                      {selectedRecord.weeklyOffDays || 4}
                    </td>
                  </tr>

                  {/* (6) Off tháng (phép năm là 12 ngày) */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      6
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
                      Off tháng (phép năm là 12 ngày)
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      Nghỉ phép tháng được duyệt
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                      {selectedRecord.offMonthDays || 0}
                    </td>
                  </tr>
                  {/* 6.1 Cộng tiền ngày nghỉ phép */}
                  <tr
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${selectedRecord.offMonthWage && selectedRecord.offMonthWage > 0 ? 'bg-emerald-500/10 dark:bg-emerald-950/20' : ''}`}
                  >
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono"></td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium pl-6 text-emerald-800 dark:text-emerald-300">
                      ↳ Cộng tiền ngày nghỉ phép
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 text-[11px]">
                      {selectedRecord.offMonthLeaveDetails && selectedRecord.offMonthLeaveDetails.length > 0
                        ? selectedRecord.offMonthLeaveDetails
                            .map(
                              (d) =>
                                `Ngày ${dayjs(d.date).format('DD/MM')} (ca ${d.shiftHours || 9}h x ${selectedRecord.hourlyRate.toLocaleString('vi-VN')}đ)${d.note ? `: ${d.note}` : ''}`
                            )
                            .join('; ')
                        : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      +{Math.round(selectedRecord.offMonthWage || 0).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (7) Nghỉ lễ x1 (Không đi làm vẫn có tiền) */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      7
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
                      {(selectedRecord.holidayWorkedDays || 0) > 0 &&
                      (!selectedRecord.holidayPaidLeaveDays || selectedRecord.holidayPaidLeaveDays === 0)
                        ? 'Lương ngày lễ x1 (Đi làm ngày lễ)'
                        : (selectedRecord.holidayWorkedDays || 0) > 0 && (selectedRecord.holidayPaidLeaveDays || 0) > 0
                          ? `Lương & Nghỉ lễ x1 (${selectedRecord.holidayPaidLeaveDays} ngày nghỉ + ${selectedRecord.holidayWorkedDays} ngày làm)`
                          : 'Nghỉ lễ x1 (Không đi làm vẫn có tiền)'}
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      {(selectedRecord.holidayWorkedDays || 0) > 0 &&
                      (!selectedRecord.holidayPaidLeaveDays || selectedRecord.holidayPaidLeaveDays === 0)
                        ? `Đi làm ngày lễ 01/09 & 02/09: ${selectedRecord.holidayWorkedDays} ngày (${selectedRecord.holidayWorkedHours}h làm x ${selectedRecord.hourlyRate.toLocaleString('vi-VN')}đ x 1)`
                        : (selectedRecord.holidayWorkedDays || 0) > 0 && (selectedRecord.holidayPaidLeaveDays || 0) > 0
                          ? `${selectedRecord.holidayPaidLeaveDays} ngày nghỉ (+${Math.round(selectedRecord.holidayPaidLeavePay || 0).toLocaleString('vi-VN')}đ) + ${selectedRecord.holidayWorkedDays} ngày làm (${selectedRecord.holidayWorkedHours}h làm x ${selectedRecord.hourlyRate.toLocaleString('vi-VN')}đ x 1 = +${Math.round(selectedRecord.holidayWorkedBasePay || 0).toLocaleString('vi-VN')}đ)`
                          : (selectedRecord.holidayPaidLeaveDays && selectedRecord.holidayPaidLeaveDays > 0) ||
                              (selectedRecord.holidayOffDays && selectedRecord.holidayOffDays > 0) ||
                              (selectedRecord.holidayPaidLeaveHours && selectedRecord.holidayPaidLeaveHours > 0)
                            ? `Nghỉ lễ 01/09 & 02/09: ${selectedRecord.holidayPaidLeaveDays || selectedRecord.holidayOffDays || 2} ngày (ca ${
                                selectedRecord.holidayPaidLeaveHours && selectedRecord.holidayPaidLeaveDays
                                  ? Math.round(
                                      selectedRecord.holidayPaidLeaveHours / selectedRecord.holidayPaidLeaveDays
                                    )
                                  : selectedRecord.offMonthLeaveDetails?.[0]?.shiftHours ||
                                    (selectedRecord.expectedWorkHours && selectedRecord.expectedWorkDays
                                      ? Math.round(selectedRecord.expectedWorkHours / selectedRecord.expectedWorkDays)
                                      : 9)
                              }h x ${selectedRecord.hourlyRate.toLocaleString('vi-VN')}đ x 1)`
                            : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {(selectedRecord.holidayWorkedDays || 0) > 0 &&
                      (!selectedRecord.holidayPaidLeaveDays || selectedRecord.holidayPaidLeaveDays === 0)
                        ? `+${Math.round(selectedRecord.holidayWorkedBasePay || selectedRecord.holidayBasePay || 0).toLocaleString('vi-VN')}đ`
                        : (selectedRecord.holidayWorkedDays || 0) > 0 && (selectedRecord.holidayPaidLeaveDays || 0) > 0
                          ? `+${Math.round(selectedRecord.holidayBasePay || 0).toLocaleString('vi-VN')}đ`
                          : (selectedRecord.holidayPaidLeavePay || 0) > 0 ||
                              (selectedRecord.holidayPay || 0) > 0 ||
                              (selectedRecord.holidayBasePay || 0) > 0
                            ? `+${Math.round(selectedRecord.holidayPaidLeavePay || selectedRecord.holidayPay || selectedRecord.holidayBasePay || 0).toLocaleString('vi-VN')}đ`
                            : '0đ'}
                    </td>
                  </tr>

                  {/* (8) Tổng lương thời gian & ngày nghỉ tiêu chuẩn */}
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 font-bold border-y-2 border-slate-300 dark:border-slate-700">
                    <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-slate-700 dark:text-slate-300">
                      8
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 font-bold">
                      Tổng lương thời gian & Ngày nghỉ tiêu chuẩn
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-normal">
                      (8) = (4) Lương giờ + (6.1) Phép năm + (7) Nghỉ lễ x1
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-slate-800 dark:text-slate-200 text-sm">
                      +
                      {Math.round(
                        selectedRecord.hourlyWage +
                          (selectedRecord.offMonthWage || 0) +
                          (selectedRecord.holidayPaidLeavePay ||
                            selectedRecord.holidayPay ||
                            selectedRecord.holidayBasePay ||
                            0)
                      ).toLocaleString('vi-VN')}
                      đ
                    </td>
                  </tr>

                  {/* GROUP 2: THƯỞNG & PHỤ CẤP THEO THỜI GIAN (BONUS THỜI GIAN) */}
                  <tr className="bg-amber-500/10 dark:bg-amber-950/25 border-y border-amber-500/30">
                    <td
                      colSpan={4}
                      className="py-2 px-3 text-left font-bold text-amber-800 dark:text-amber-200 uppercase tracking-wider text-[11px]"
                    >
                      ⚡ II. Thưởng & Phụ cấp theo thời gian (Bonus thời gian)
                    </td>
                  </tr>

                  {/* (9) Thưởng đi làm ngày off tuần */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-mono font-semibold">
                      9
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
                      Thưởng đi làm ngày off tuần (+1x = Tổng x2)
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      {(selectedRecord.offDaysWorked || 0) > 0
                        ? `${formatHoursToHoursMinutes(selectedRecord.offDaysWorkHours || 0)} x ${selectedRecord.hourlyRate.toLocaleString('vi-VN')}đ x 1 (Đã ăn 1x ở Mục 4, thêm 1x ở đây)`
                        : '0h làm ngày off tuần (Nghỉ tuần theo lịch)'}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      {(selectedRecord.offDaysWorked || 0) > 0 || (selectedRecord.offDaysWorkWage || 0) > 0
                        ? `+${Math.round(selectedRecord.offDaysWorkWage || 0).toLocaleString('vi-VN')}đ`
                        : '0đ'}
                    </td>
                  </tr>

                  {/* (10) Thưởng đi làm ngày lễ 2/9 */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-mono font-semibold">
                      10
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
                      Thưởng đi làm ngày Lễ 2/9 (x3 phụ cấp)
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-[11px] text-amber-700 dark:text-amber-400">
                      {selectedRecord.holidayWorkedHours && selectedRecord.holidayWorkedHours > 0
                        ? `Đi làm ngày nào cộng ngày đó: ${selectedRecord.holidayWorkedDays || 2} ngày đi làm (${selectedRecord.holidayWorkedHours}h làm x ${selectedRecord.hourlyRate.toLocaleString('vi-VN')}đ x 3 = +${Math.round(selectedRecord.holidayPremiumPay || 0).toLocaleString('vi-VN')}đ - HR đi riêng)`
                        : '0h làm việc ngày lễ (Không đi làm không có tiền)'}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">
                      {selectedRecord.holidayPremiumPay && selectedRecord.holidayPremiumPay > 0
                        ? `+${Math.round(selectedRecord.holidayPremiumPay).toLocaleString('vi-VN')}đ (Đi riêng)`
                        : '0đ'}
                    </td>
                  </tr>

                  {/* (11) Tổng Thưởng theo thời gian */}
                  <tr className="bg-amber-500/15 dark:bg-amber-950/40 font-bold border-y-2 border-amber-500/30">
                    <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-amber-700 dark:text-amber-300">
                      11
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-amber-900 dark:text-amber-200 font-bold">
                      Tổng Thưởng theo thời gian
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-amber-700 dark:text-amber-400 text-[11px] font-normal">
                      (11) = (9) Thưởng off tuần + (10) Thưởng ngày lễ
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-300 text-sm">
                      +
                      {Math.round(
                        (selectedRecord.offDaysWorkWage || 0) + (selectedRecord.holidayPremiumPay || 0)
                      ).toLocaleString('vi-VN')}
                      đ
                    </td>
                  </tr>

                  {/* GROUP 3: THƯỞNG DỊCH VỤ, THÂM NIÊN & TIPS */}
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
                    <td
                      colSpan={4}
                      className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
                    >
                      ⭐ III. Thưởng dịch vụ, Thâm niên & Tips
                    </td>
                  </tr>

                  {/* (12) Lượt khách phục vụ */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      12
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Lượt khách phục vụ</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      {selectedRecord.serviceCount || 0} lượt hoàn thành
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                      {selectedRecord.serviceCount || 0}
                    </td>
                  </tr>

                  {/* (13) Thưởng Ca CV (Xoay) */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      13
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">
                      Thưởng Ca CV (Xoay)
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 text-[11px] font-normal">
                      Hoa hồng dịch vụ kỹ thuật
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">
                      +{Math.round(selectedRecord.cvXoayBonus).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (14) Thưởng Thâm Niên */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold bg-amber-500/5 dark:bg-amber-950/10">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 font-mono">
                      14
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold text-amber-700 dark:text-amber-300">
                      Thưởng Thâm Niên
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-amber-600 dark:text-amber-400 text-[11px] font-normal">
                      {(() => {
                        const m = selectedRecord.seniorityMonths || 0;
                        const y = Math.floor(m / 12);
                        const remM = m % 12;
                        const str = y > 0 ? `${y} năm ${remM} th` : `${m} th`;
                        return `${str} (+${selectedRecord.seniorityBonusPercent || 0}%)`;
                      })()}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">
                      +{Math.round(selectedRecord.seniorityBonus || 0).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (15) Tips */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      15
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Thưởng CV Tip</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 text-[11px]">
                      Thưởng Tip CV (70% tiền tip khách)
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-purple-600 dark:text-purple-400">
                      +{Math.round(selectedRecord.cvTipBonus).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* GROUP 4: PHỤ CẤP & CÔNG LÀM VIỆC */}
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
                    <td
                      colSpan={4}
                      className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
                    >
                      🛵 IV. Phụ cấp & Công làm việc
                    </td>
                  </tr>

                  {/* (16) Ngày làm việc thực tế trong tháng */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      16
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
                      Ngày làm việc thực tế trong tháng
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      Số ngày đi làm / Số ngày công chuẩn
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                      {selectedRecord.activeDays || 0} / {selectedRecord.expectedWorkDays || 26}
                    </td>
                  </tr>

                  {/* (17) Phụ cấp gửi xe */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      17
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Phụ cấp gửi xe</td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      {selectedRecord.parkingCalculation ||
                        `200.000đ / ${selectedRecord.expectedWorkDays || 26} * ${selectedRecord.activeDays || 0}`}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      +{Math.round(selectedRecord.parkingAllowance || 0).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (18) Phụ cấp khác: Mỗi phụ cấp hiển thị 1 dòng riêng */}
                  {selectedRecord.otherAllowancesDetails && selectedRecord.otherAllowancesDetails.length > 0 ? (
                    selectedRecord.otherAllowancesDetails.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[11px]">
                          18.{idx + 1}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
                          {item.description || 'Phụ cấp khác'}
                        </td>
                        <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                          <div className="flex items-center justify-between gap-2">
                            <span>
                              {item.source === 'mos' ? (
                                <Tag color="cyan" className="text-[10px] mr-1">
                                  mOS
                                </Tag>
                              ) : (
                                <Tag color="default" className="text-[10px] mr-1">
                                  Legacy
                                </Tag>
                              )}
                              {item.note
                                ? item.note
                                : item.createdAt
                                  ? `Tạo ngày ${dayjs(item.createdAt).format('DD/MM/YYYY')}`
                                  : 'Khoản điều chỉnh'}
                            </span>
                            {item.source === 'mos' && item.id ? (
                              <Popconfirm
                                title="Xoá phụ cấp này?"
                                description={`Bạn có chắc muốn xoá khoản "${item.description}" (${item.amount >= 0 ? '+' : ''}${item.amount.toLocaleString('vi-VN')}đ) không?`}
                                onConfirm={() => handleDeleteAllowance(item.id!)}
                                okText="Xoá"
                                cancelText="Hủy"
                                okButtonProps={{ danger: true, size: 'small' }}
                                cancelButtonProps={{ size: 'small' }}
                              >
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined className="text-xs" />}
                                  className="h-5 px-1 text-slate-400 hover:text-rose-500"
                                />
                              </Popconfirm>
                            ) : null}
                          </div>
                        </td>
                        <td
                          className={`py-1.5 px-3 text-right tabular-nums font-semibold ${
                            item.amount < 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {item.amount < 0
                            ? `-${Math.round(Math.abs(item.amount)).toLocaleString('vi-VN')}đ`
                            : `+${Math.round(item.amount).toLocaleString('vi-VN')}đ`}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                        18
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Phụ cấp khác</td>
                      <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                        Chưa có khoản phụ cấp nào trong tháng này
                      </td>
                      <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-slate-400">0đ</td>
                    </tr>
                  )}
                  {/* Nút thêm phụ cấp khác tại mOS */}
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20">
                    <td colSpan={4} className="py-1.5 px-3 text-right">
                      <Button
                        type="dashed"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={() => setIsAllowanceModalOpen(true)}
                        className="text-xs text-sky-600 dark:text-sky-400 border-sky-300 dark:border-sky-800 hover:text-sky-500"
                      >
                        + Thêm phụ cấp khác tại mOS
                      </Button>
                    </td>
                  </tr>

                  {/* Phạt trừ thưởng nếu có */}
                  {selectedRecord.penalties && selectedRecord.penalties > 0 ? (
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-rose-600 dark:text-rose-400">
                      <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono">
                        !
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">Phạt trừ thưởng</td>
                      <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-[11px]">—</td>
                      <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                        -{Math.round(selectedRecord.penalties).toLocaleString('vi-VN')}đ
                      </td>
                    </tr>
                  ) : null}

                  {/* GROUP 5: TỔNG THU NHẬP & THỰC LÃNH */}
                  <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-y border-slate-200 dark:border-slate-700">
                    <td
                      colSpan={4}
                      className="py-2 px-3 text-left font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[11px]"
                    >
                      💰 V. Tổng thu nhập & Thực lãnh (Net)
                    </td>
                  </tr>

                  {/* Tổng thu nhập thực tế trong tháng (Gross) */}
                  <tr className="bg-blue-500/10 dark:bg-blue-950/20 font-bold border-y-2 border-blue-500/30">
                    <td className="py-2 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-blue-700 dark:text-blue-400">
                      ∑
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-blue-900 dark:text-blue-200 font-bold">
                      Tổng thu nhập thực tế trong tháng (Gross)
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 dark:border-slate-800 text-blue-700 dark:text-blue-400 text-[11px] font-normal">
                      Lương thời gian + Thưởng thời gian (off tuần) + Thưởng CV + Thâm niên + Tips + Gửi xe + Phụ cấp
                      khác
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-blue-700 dark:text-blue-300 text-sm">
                      {Math.round(selectedRecord.totalIncome).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (19) BHXH */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold bg-rose-500/5 dark:bg-rose-950/10">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 font-mono">
                      19
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-rose-700 dark:text-rose-300 font-bold">
                      Khấu trừ BHXH (10.5% NLĐ)
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 text-[11px] font-normal">
                      Khấu trừ người lao động đóng (10.5%)
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-bold text-rose-600 dark:text-rose-400">
                      -{Math.round(selectedRecord.socialSecurityAmount || 0).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* 16.1 Wings đóng */}
                  {selectedRecord.socialSecurityAmount && selectedRecord.socialSecurityAmount > 0 ? (
                    <>
                      <tr className="bg-slate-50/60 dark:bg-slate-900/60 text-[11px]">
                        <td className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400"></td>
                        <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 pl-6 text-slate-600 dark:text-slate-300 font-medium">
                          ↳ Wings (Công ty đóng 21.5%)
                        </td>
                        <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-400 text-[10px]">
                          Lương cơ sở 5.400.000đ
                        </td>
                        <td className="py-1 px-3 text-right tabular-nums text-slate-600 dark:text-slate-300 font-semibold">
                          {Math.round(
                            selectedRecord.socialSecurityBreakdown?.employer?.totalAmount || 1161000
                          ).toLocaleString('vi-VN')}
                          đ
                        </td>
                      </tr>
                      <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
                        <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                        <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">
                          BHXH (17.5%)
                        </td>
                        <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
                        <td className="py-0.5 px-3 text-right tabular-nums">
                          {Math.round(
                            selectedRecord.socialSecurityBreakdown?.employer?.socialAmount || 945000
                          ).toLocaleString('vi-VN')}
                          đ
                        </td>
                      </tr>
                      <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
                        <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                        <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHYT (3%)</td>
                        <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
                        <td className="py-0.5 px-3 text-right tabular-nums">
                          {Math.round(
                            selectedRecord.socialSecurityBreakdown?.employer?.healthAmount || 162000
                          ).toLocaleString('vi-VN')}
                          đ
                        </td>
                      </tr>
                      <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
                        <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                        <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHTN (1%)</td>
                        <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
                        <td className="py-0.5 px-3 text-right tabular-nums">
                          {Math.round(
                            selectedRecord.socialSecurityBreakdown?.employer?.unemploymentAmount || 54000
                          ).toLocaleString('vi-VN')}
                          đ
                        </td>
                      </tr>

                      {/* 16.2 Nhân sự đóng */}
                      <tr className="bg-slate-50/60 dark:bg-slate-900/60 text-[11px]">
                        <td className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400"></td>
                        <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 pl-6 text-rose-700 dark:text-rose-300 font-medium">
                          ↳ {selectedRecord.staffName} (NLĐ đóng 10.5%)
                        </td>
                        <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 text-rose-500/80 text-[10px]">
                          Trừ trực tiếp vào lương
                        </td>
                        <td className="py-1 px-3 text-right tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
                          -{Math.round(selectedRecord.socialSecurityAmount || 567000).toLocaleString('vi-VN')}đ
                        </td>
                      </tr>
                      <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
                        <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                        <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHXH (8%)</td>
                        <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
                        <td className="py-0.5 px-3 text-right tabular-nums">
                          -
                          {Math.round(
                            selectedRecord.socialSecurityBreakdown?.employee?.socialAmount || 432000
                          ).toLocaleString('vi-VN')}
                          đ
                        </td>
                      </tr>
                      <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
                        <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                        <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">
                          BHYT (1.5%)
                        </td>
                        <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
                        <td className="py-0.5 px-3 text-right tabular-nums">
                          -
                          {Math.round(
                            selectedRecord.socialSecurityBreakdown?.employee?.healthAmount || 81000
                          ).toLocaleString('vi-VN')}
                          đ
                        </td>
                      </tr>
                      <tr className="bg-slate-50/30 dark:bg-slate-900/30 text-[10px] text-slate-400">
                        <td className="py-0.5 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                        <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800 pl-10">BHTN (1%)</td>
                        <td className="py-0.5 px-3 border-r border-slate-200 dark:border-slate-800">—</td>
                        <td className="py-0.5 px-3 text-right tabular-nums">
                          -
                          {Math.round(
                            selectedRecord.socialSecurityBreakdown?.employee?.unemploymentAmount || 54000
                          ).toLocaleString('vi-VN')}
                          đ
                        </td>
                      </tr>
                    </>
                  ) : null}

                  {/* LƯƠNG THỰC LÃNH (NET) */}
                  <tr className="bg-emerald-500/15 dark:bg-emerald-950/30 font-extrabold border-y-2 border-emerald-500/40">
                    <td className="py-3 px-2 text-center border-r border-slate-200 dark:border-slate-800 font-mono text-emerald-800 dark:text-emerald-300 text-base">
                      💰
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-900 dark:text-emerald-200 font-extrabold text-sm uppercase tracking-wide">
                      Lương thực lãnh trong tháng (Net)
                    </td>
                    <td className="py-3 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-700 dark:text-emerald-400 text-xs font-normal">
                      Tổng thu nhập (Gross) - Khấu trừ BHXH (10.5%)
                    </td>
                    <td className="py-3 px-3 text-right tabular-nums font-black text-emerald-600 dark:text-emerald-400 text-lg">
                      {Math.round(
                        selectedRecord.netIncome ??
                          selectedRecord.totalIncome - (selectedRecord.socialSecurityAmount || 0)
                      ).toLocaleString('vi-VN')}
                      đ
                    </td>
                  </tr>

                  {/* Đảm bảo thu nhập nếu có */}
                  {selectedRecord.guaranteedIncome && selectedRecord.guaranteedIncome > 0 ? (
                    <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400">
                      <td className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-800"></td>
                      <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 pl-6">
                        ↳ Đảm bảo thu nhập
                      </td>
                      <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 text-[10px]">—</td>
                      <td className="py-1 px-3 text-right tabular-nums">
                        {Math.round(selectedRecord.guaranteedIncome).toLocaleString('vi-VN')}đ
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* Congratulation Message Card */}
            <div className="p-3 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/40 dark:border-amber-800/30 rounded-lg text-center text-xs font-medium text-amber-800 dark:text-amber-300">
              🍗{' '}
              {selectedRecord.congratulationMessage ||
                'Chúc mừng bạn đã thành Đùi Gà ngon ngon. Tháng sau biến hình Thiên Thần nhé!'}{' '}
              👼
            </div>

            {/* Company Legal Information Footer */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 space-y-1">
              <div className="flex justify-between font-semibold text-slate-600 dark:text-slate-300">
                <span>CÔNG TY TNHH WINGS LASHES</span>
                <span>Tax Number: 0313891996 • Hotline: 1800 8154</span>
              </div>
              <div>• Chi nhánh 1: 159 - 159A Đề Thám, P. Cô Giang, Q. 1, TP. Hồ Chí Minh</div>
              <div>• Chi nhánh 2: L5-08, 09 Estella Place, 88 Song Hành, P. An Phú, TP. Thủ Đức, TP. Hồ Chí Minh</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Work Logs Detail Modal */}
      {workLogRecord && (
        <Modal
          open={workLogModalOpen}
          onCancel={() => setWorkLogModalOpen(false)}
          width={modalWidth}
          style={{ top: 30 }}
          title={
            <div className="flex flex-wrap items-center justify-between gap-2 pr-6 select-none">
              <div className="flex items-center gap-2">
                <ClockCircleOutlined className="text-blue-500 text-xl" />
                <span className="font-bold text-lg">
                  Báo Cáo Ca Làm Việc & Lương Giờ (IN/OUT) - CV: {workLogRecord.staffName}
                </span>
                <Tag color={workLogRecord.store === 'PXL' ? 'blue' : 'purple'}>CN: {workLogRecord.store}</Tag>
              </div>

              {/* QUICK WIDTH PRESETS */}
              <div className="flex items-center gap-1">
                <Text type="secondary" className="text-xs mr-1">
                  Kích thước:
                </Text>
                <Button
                  size="small"
                  type={modalWidth === 800 ? 'primary' : 'default'}
                  onClick={() => updateModalWidth(800)}
                  className="text-xs"
                >
                  Vừa (800px)
                </Button>
                <Button
                  size="small"
                  type={modalWidth === 1100 ? 'primary' : 'default'}
                  onClick={() => updateModalWidth(1100)}
                  className="text-xs"
                >
                  Rộng (1100px)
                </Button>
                <Button
                  size="small"
                  type={modalWidth === 1400 ? 'primary' : 'default'}
                  onClick={() => updateModalWidth(1400)}
                  className="text-xs"
                >
                  Tối đa (1400px)
                </Button>
              </div>
            </div>
          }
          footer={[
            <div key="footer-row" className="flex items-center justify-between w-full">
              <Text type="secondary" className="text-xs italic">
                💡 Kéo mép phải để chỉnh rộng / hẹp ({modalWidth}px) — Tự động ghi nhớ khi F5
              </Text>
              <Button
                key="close-worklog"
                type="primary"
                onClick={() => setWorkLogModalOpen(false)}
                style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
              >
                Đóng Báo Cáo Ca Làm
              </Button>
            </div>,
          ]}
        >
          {/* DRAG RESIZE HANDLE ON RIGHT EDGE */}
          <div
            onMouseDown={handleMouseDown}
            className={`absolute top-0 right-0 bottom-0 w-3 cursor-col-resize hover:bg-blue-500/30 transition-colors z-50 flex items-center justify-center ${
              isResizing ? 'bg-blue-500/40' : ''
            }`}
            title="Kéo sang ngang để thay đổi chiều rộng Popup (Nhớ kích thước khi F5)"
          >
            <div className="w-1 h-8 bg-gray-400/50 rounded-full" />
          </div>

          {workLogLoading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {/* Top Stat summary for Work Log Modal */}
              <Row gutter={[12, 12]} className="my-4">
                <Col span={6}>
                  <Card size="small" variant="outlined">
                    <Statistic
                      title="∑ Ngày Đi Làm"
                      value={workLogSummary.totalWorkDays}
                      suffix="ngày"
                      valueStyle={{ fontSize: '15px', color: '#1890ff', fontVariantNumeric: 'tabular-nums' }}
                      prefix={<CalendarOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" variant="outlined">
                    <Statistic
                      title="∑ Số Giờ Làm"
                      value={formatHoursToHoursMinutes(workLogSummary.totalWorkHours)}
                      valueStyle={{ fontSize: '15px', color: '#722ed1', fontVariantNumeric: 'tabular-nums' }}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" variant="outlined">
                    <Statistic
                      title="Đơn Giá Lương Giờ"
                      value={workLogSummary.hourlyRate}
                      suffix="đ/h"
                      valueStyle={{ fontSize: '15px', color: '#52c41a', fontVariantNumeric: 'tabular-nums' }}
                      prefix={<DollarOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small" variant="outlined" style={{ borderColor: '#1890ff' }}>
                    <Statistic
                      title="∑ Lương Giờ Nhận"
                      value={workLogSummary.totalWage}
                      suffix="đ"
                      precision={0}
                      valueStyle={{
                        fontSize: '15px',
                        color: '#1890ff',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 'bold',
                      }}
                    />
                  </Card>
                </Col>
              </Row>

              <Table
                dataSource={workLogs}
                rowKey={(r, idx) => `${r.date}-${r.checkInTime}-${idx}`}
                bordered
                pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                size="small"
                className="antd-custom-table"
                columns={[
                  {
                    title: 'Ngày Làm Việc',
                    dataIndex: 'date',
                    key: 'date',
                    width: 130,
                    render: (val: string) => (
                      <Space size={4}>
                        <CalendarOutlined className="text-blue-500 text-xs" />
                        <span className="tabular-nums font-semibold">{val}</span>
                      </Space>
                    ),
                  },
                  {
                    title: 'Cơ Sở',
                    dataIndex: 'store',
                    key: 'store',
                    width: 100,
                    render: (text: string) => <Tag color="blue">{text}</Tag>,
                  },
                  {
                    title: 'Check-in Đầu (IN)',
                    dataIndex: 'checkInTime',
                    key: 'checkInTime',
                    width: 140,
                    align: 'center' as const,
                    render: (val: string) => (
                      <Tag color="green" className="tabular-nums font-mono font-semibold">
                        <LoginOutlined className="mr-1" /> {val}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Check-out Cuối (OUT)',
                    dataIndex: 'checkOutTime',
                    key: 'checkOutTime',
                    width: 140,
                    align: 'center' as const,
                    render: (val: string) => (
                      <Tag color="volcano" className="tabular-nums font-mono font-semibold">
                        <LogoutOutlined className="mr-1" /> {val}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Số Giờ Tính Lương',
                    dataIndex: 'workHours',
                    key: 'workHours',
                    align: 'right' as const,
                    width: 130,
                    render: (val: number) => (
                      <span className="tabular-nums font-bold text-blue-500">{formatHoursToHoursMinutes(val)}</span>
                    ),
                  },
                  {
                    title: 'Lương Giờ Trong Ngày',
                    dataIndex: 'dailyWage',
                    key: 'dailyWage',
                    align: 'right' as const,
                    width: 170,
                    render: (val: number, record: CvWorkLogDetailRecord) => (
                      <div className="flex flex-col items-end">
                        <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                          +{Math.round(val || 0).toLocaleString('vi-VN')}đ
                        </span>
                        {record.notes && (
                          <span className="text-[10px] font-semibold text-orange-500 bg-orange-50 dark:bg-orange-950/30 px-1 rounded border border-orange-100 dark:border-orange-900/30 mt-0.5 inline-block">
                            {record.notes}
                          </span>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </Modal>
      )}

      {/* Modal Thêm phụ cấp khác tại mOS */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">Thêm phụ cấp khác</span>
            {selectedRecord && <Tag color="blue">{selectedRecord.staffName}</Tag>}
            <Tag color="default">Tháng {(dateRange?.[0] || dayjs()).format('MM/YYYY')}</Tag>
          </div>
        }
        open={isAllowanceModalOpen}
        onCancel={() => {
          setIsAllowanceModalOpen(false);
          setAllowanceTitle('');
          setAllowanceAmount(null);
          setAllowanceNote('');
          setAllowanceFormType('plus');
        }}
        onOk={handleAddAllowance}
        confirmLoading={isSubmittingAllowance}
        okText="Lưu phụ cấp"
        cancelText="Hủy"
        destroyOnClose
      >
        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
              Loại phụ cấp:
            </label>
            <Radio.Group
              value={allowanceFormType}
              onChange={(e) => setAllowanceFormType(e.target.value)}
              buttonStyle="solid"
              className="w-full flex"
            >
              <Radio.Button value="plus" className="flex-1 text-center font-medium">
                + Cộng tiền (Thưởng / Hỗ trợ)
              </Radio.Button>
              <Radio.Button value="minus" className="flex-1 text-center font-medium text-rose-500">
                - Trừ tiền (Khấu trừ / Phạt)
              </Radio.Button>
            </Radio.Group>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
              Tên / Nội dung phụ cấp <span className="text-rose-500">*</span>:
            </label>
            <Input
              placeholder="VD: Hỗ trợ xăng xe, Thưởng chiến dịch, Trừ đồng phục..."
              value={allowanceTitle}
              onChange={(e) => setAllowanceTitle(e.target.value)}
              maxLength={150}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
              Số tiền (VNĐ) <span className="text-rose-500">*</span>:
            </label>
            <InputNumber<number>
              className="w-full"
              placeholder="VD: 200,000"
              value={allowanceAmount}
              onChange={(val) => setAllowanceAmount(val)}
              min={1000}
              step={10000}
              formatter={(value) => (value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '')}
              parser={(value) => (value ? Number(value.replace(/\$\s?|(,*)/g, '')) : 0)}
              addonAfter="VNĐ"
            />
            <div className="text-[11px] text-slate-400 mt-1">
              Ghi nhận vào lương:{' '}
              <span
                className={allowanceFormType === 'minus' ? 'text-rose-500 font-bold' : 'text-emerald-500 font-bold'}
              >
                {allowanceFormType === 'minus' ? '-' : '+'}
                {allowanceAmount ? Math.abs(allowanceAmount).toLocaleString('vi-VN') : 0}đ
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1.5">
              Ghi chú chi tiết (tùy chọn):
            </label>
            <Input.TextArea
              placeholder="Ghi chú thêm lý do..."
              rows={2}
              value={allowanceNote}
              onChange={(e) => setAllowanceNote(e.target.value)}
              maxLength={255}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
