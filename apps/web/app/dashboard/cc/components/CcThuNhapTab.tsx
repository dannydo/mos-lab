'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  theme,
  Divider,
  Table,
  Tag,
  Button,
  Modal,
  Input,
  Space,
  Tooltip,
  Statistic,
  Spin,
  message,
  Popconfirm,
  Form,
  Radio,
  InputNumber,
  Segmented,
} from 'antd';
import {
  WalletOutlined,
  DollarOutlined,
  SearchOutlined,
  EyeOutlined,
  UserOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  LoginOutlined,
  LogoutOutlined,
  PrinterOutlined,
  PlusOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  CcPaystubRecord,
  CcPaystubResponse,
  CcWorkLogDetailRecord,
  CcWorkLogDetailResponse,
  ReportPeriodComparison,
  CcDiamondEntry,
  CcTipRecord,
  TipFilterType,
  removeVietnameseTones,
  calculateFractionToday,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import dayjs from 'dayjs';
import CcAvatar from './CcAvatar';
import CcPeriodComparison from './CcPeriodComparison';
import CcThuongTransactionsModal from './CcThuongTransactionsModal';
import CcDiamondDetailModal from './CcDiamondDetailModal';
import CcIncomeSummaryCards, { CcIncomeSummary } from '~/components/cc-thu-nhap/CcIncomeSummaryCards';
import CcPaystubDetailModal from '~/components/cc-thu-nhap/modals/CcPaystubDetailModal';
import CcWorkLogDetailModal from '~/components/cc-thu-nhap/modals/CcWorkLogDetailModal';
import CcXoayDetailModal from '~/components/cc-thu-nhap/modals/CcXoayDetailModal';
import CcTipDetailModal from '~/components/cc-thu-nhap/modals/CcTipDetailModal';
import CcAllowanceModal from '~/components/cc-thu-nhap/modals/CcAllowanceModal';

import { useTheme } from '../../../../context/ThemeContext';
import { formatCompactVND, formatStoreCode, formatVND } from '../../../../lib/format-utils';
import { AdaptiveModal, AdaptiveOverlayFooter, DataTable, MobileRecordList } from '~/components/ui';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';

const { Text } = Typography;

const formatHoursToHoursMinutes = (totalHours: number, compact = false) => {
  if (!totalHours || totalHours <= 0) return compact ? '0h' : '0 giờ';
  const hrs = Math.floor(totalHours);
  const mins = Math.round((totalHours - hrs) * 60);
  if (mins <= 0) return compact ? `${hrs}h` : `${hrs} giờ`;
  return compact ? `${hrs}h ${mins}m` : `${hrs} giờ ${mins} phút`;
};

interface CcThuNhapTabProps {
  dateRange?: [dayjs.Dayjs, dayjs.Dayjs];
  selectedStore?: string;
  comparisonMode?: 'month' | 'week' | 'day';
}

function getComparisonPeriod(dateRange: [dayjs.Dayjs, dayjs.Dayjs] | undefined, mode: 'month' | 'week' | 'day') {
  const start = dateRange?.[0] || dayjs().startOf('month');
  const selectedEnd = dateRange?.[1] || dayjs().endOf('month');
  const now = dayjs();
  if (start.isAfter(now)) return null;

  const effectiveEnd = selectedEnd.isAfter(now) ? now : selectedEnd.endOf('day');
  const shift = (value: dayjs.Dayjs) =>
    mode === 'month' ? value.subtract(1, 'month') : value.subtract(mode === 'week' ? 7 : 1, 'day');
  const comparisonStart = shift(start);
  const comparisonEnd = shift(effectiveEnd);

  return {
    mode,
    dateFrom: comparisonStart.format('YYYY-MM-DD'),
    dateTo: comparisonEnd.format('YYYY-MM-DD'),
  } satisfies ReportPeriodComparison;
}

export default function CcThuNhapTab({ dateRange, selectedStore, comparisonMode = 'month' }: CcThuNhapTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';
  const [loading, setLoading] = useState(false);
  const [paystubData, setPaystubData] = useState<CcPaystubRecord[]>([]);
  const [summary, setSummary] = useState<CcIncomeSummary>({
    totalHourlyWage: 0,
    totalCcXoayBonus: 0,
    totalComboProductBonus: 0,
    totalMinigameBonus: 0,
    totalCcTipBonus: 0,
    totalExtraSupport: 0,
    totalHolidayBasePay: 0,
    totalHolidayPremiumPay: 0,
    totalHolidayPayrollAddition: 0,
    totalDiamondBonus: 0,
    grandTotalIncome: 0,
  });

  const isDayMode = comparisonMode === 'day';
  const periodNoun = comparisonMode === 'week' ? 'tuần' : 'tháng';

  const elapsedRatioPercent = useMemo(() => {
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
   * Công thức chuẩn dự đoán CC Xoay cuối tháng (Exact Closed-Form Model):
   * - N_hat = round(checkinCount / ratio)
   * - Hệ số c tăng trưởng mỗi ca giải ngược từ bonus hiện tại (hoặc mặc định 3.65đ/ca)
   * - CC_Xoay_Raw = c * N_hat * (N_hat - 1) + 45 * N_hat
   * - Giới hạn trần 1.5x Daily Bonus nếu có monthlyDailyBonus
   */
  function calculateProjectedCcXoay(
    checkinCount: number,
    currentBonus: number,
    ratio: number,
    monthlyDailyBonus?: number
  ): number {
    if (ratio <= 0) return currentBonus;
    const safeRatio = Math.max(0.001, Math.min(1.0, ratio));
    if (checkinCount <= 0 && currentBonus <= 0) return 0;

    const nHat = checkinCount > 0 ? Math.round(checkinCount / safeRatio) : 0;
    if (nHat <= 0) return currentBonus;

    let c = 3.65;
    if (checkinCount >= 4 && currentBonus > 0) {
      const rawC = (currentBonus - 45 * checkinCount) / (checkinCount * (checkinCount - 1));
      if (!isNaN(rawC) && rawC >= 1.5 && rawC <= 8.0) {
        c = rawC;
      }
    }

    const rawProjected = Math.max(currentBonus, Math.round(c * nHat * (nHat - 1) + 45 * nHat));

    if (monthlyDailyBonus && monthlyDailyBonus > 0) {
      const projectedDailyBonus = Math.round(monthlyDailyBonus / safeRatio);
      const maxAllowed = Math.round(projectedDailyBonus * 1.5);
      return Math.min(rawProjected, maxAllowed);
    }

    return rawProjected;
  }

  const isMonthMode = comparisonMode === 'month';

  const getProjectedRecord = React.useCallback(
    (record: CcPaystubRecord) => {
      const holidayActual = record.holidayPayrollAddition || record.holidayPremiumPay || 0;
      if (isPastPeriod) {
        return {
          projectedHourlyWage: record.hourlyWage || 0,
          projectedCcXoayBonus: record.ccXoayBonus || 0,
          projectedComboProductBonus: record.comboProductBonus || 0,
          projectedCcTipBonus: record.ccTipBonus || 0,
          projectedDiamondBonus: record.diamondBonus || 0,
          projectedMinigameBonus: record.minigameBonus || 0,
          projectedHolidayPay: holidayActual,
          projectedTotalIncome: record.totalIncome || 0,
        };
      }

      const projectedHourlyWage = Math.round((record.hourlyWage || 0) / (ratio || 1));

      // Vòng xoay là mô hình lũy tiến cấp số cộng Level reset theo tháng (số khách gấp đôi -> tiền thưởng gấp 4)
      // Sử dụng công thức chuẩn cấp số cộng (Exact Closed-Form Model). Không dự đoán theo tuần.
      const projectedCcXoayBonus = isMonthMode
        ? calculateProjectedCcXoay(
            record.checkinCount || 0,
            record.rawCcXoayBonus ?? record.ccXoayBonus ?? 0,
            ratio,
            record.monthlyDailyBonus
          )
        : 0;
      const projectedComboProductBonus = Math.round((record.comboProductBonus || 0) / (ratio || 1));
      const projectedCcTipBonus = Math.round((record.ccTipBonus || 0) / (ratio || 1));
      const projectedDiamondBonus = Math.round((record.diamondBonus || 0) / (ratio || 1));
      const projectedMinigameBonus = Math.round((record.minigameBonus || 0) / (ratio || 1));
      const projectedHolidayPay = holidayActual;

      const projectedTotalIncome = isMonthMode
        ? projectedHourlyWage +
          projectedCcXoayBonus +
          projectedComboProductBonus +
          projectedCcTipBonus +
          projectedDiamondBonus +
          projectedMinigameBonus +
          projectedHolidayPay
        : projectedHourlyWage +
          (record.ccXoayBonus || 0) +
          projectedComboProductBonus +
          projectedCcTipBonus +
          projectedDiamondBonus +
          projectedMinigameBonus +
          projectedHolidayPay;

      return {
        projectedHourlyWage,
        projectedCcXoayBonus,
        projectedComboProductBonus,
        projectedCcTipBonus,
        projectedDiamondBonus,
        projectedMinigameBonus,
        projectedHolidayPay,
        projectedTotalIncome,
      };
    },
    [isPastPeriod, ratio, isMonthMode]
  );

  const projectedSummary = useMemo(() => {
    if (isPastPeriod) {
      return {
        projectedHourlyWage: summary.totalHourlyWage,
        projectedCcXoayBonus: summary.totalCcXoayBonus,
        projectedComboProductBonus: summary.totalComboProductBonus,
        projectedCcTipBonus: summary.totalCcTipBonus,
        projectedMinigameBonus: summary.totalMinigameBonus,
        projectedTotalIncome: summary.grandTotalIncome,
      };
    }

    const projectedHourlyWage = Math.round((summary.totalHourlyWage || 0) / (ratio || 1));
    const projectedCcXoayBonus = isMonthMode
      ? paystubData.length > 0
        ? paystubData.reduce((acc, r) => acc + (getProjectedRecord(r).projectedCcXoayBonus || 0), 0)
        : calculateProjectedCcXoay(0, summary.totalCcXoayBonus || 0, ratio)
      : 0;
    const projectedComboProductBonus = Math.round((summary.totalComboProductBonus || 0) / (ratio || 1));
    const projectedCcTipBonus = Math.round((summary.totalCcTipBonus || 0) / (ratio || 1));
    const projectedMinigameBonus = Math.round((summary.totalMinigameBonus || 0) / (ratio || 1));
    const holidayAddition = summary.totalHolidayPayrollAddition || summary.totalHolidayPremiumPay || 0;

    const projectedTotalIncome = isMonthMode
      ? projectedHourlyWage +
        projectedCcXoayBonus +
        projectedComboProductBonus +
        projectedCcTipBonus +
        projectedMinigameBonus +
        (summary.totalDiamondBonus || 0) +
        holidayAddition
      : projectedHourlyWage +
        (summary.totalCcXoayBonus || 0) +
        projectedComboProductBonus +
        projectedCcTipBonus +
        projectedMinigameBonus +
        (summary.totalDiamondBonus || 0) +
        holidayAddition;

    return {
      projectedHourlyWage,
      projectedCcXoayBonus,
      projectedComboProductBonus,
      projectedCcTipBonus,
      projectedMinigameBonus,
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

  // Individual Paystub Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState<CcPaystubRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Other Allowance Modal State (mOS Flexible Allowances)
  const [isAllowanceModalOpen, setIsAllowanceModalOpen] = useState(false);
  const [allowanceTitle, setAllowanceTitle] = useState('');
  const [allowanceAmount, setAllowanceAmount] = useState<number | null>(null);
  const [allowanceNote, setAllowanceNote] = useState('');
  const [allowanceFormType, setAllowanceFormType] = useState<'plus' | 'minus'>('plus');
  const [isSubmittingAllowance, setIsSubmittingAllowance] = useState(false);

  // Daily Work Log (Hourly Wage) Detail Modal State
  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogLoading, setWorkLogLoading] = useState(false);
  const [workLogRecord, setWorkLogRecord] = useState<CcPaystubRecord | null>(null);
  const [workLogs, setWorkLogs] = useState<CcWorkLogDetailRecord[]>([]);
  const [workLogSummary, setWorkLogSummary] = useState({
    totalWorkDays: 0,
    totalWorkHours: 0,
    hourlyRate: 25000,
    totalWage: 0,
  });
  const [workLogPage, setWorkLogPage] = useState(1);
  const [workLogPageSize, setWorkLogPageSize] = useState(() => {
    if (typeof window === 'undefined') return 10;
    const savedSize = Number(localStorage.getItem('cc_worklog_modal_page_size'));
    return [10, 20, 50, 100].includes(savedSize) ? savedSize : 10;
  });

  // CC Xoay Detail Modal State
  const [ccXoayModalOpen, setCcXoayModalOpen] = useState(false);
  const [ccXoayLoading, setCcXoayLoading] = useState(false);
  const [ccXoayRecord, setCcXoayRecord] = useState<CcPaystubRecord | null>(null);
  const [ccXoayLogs, setCcXoayLogs] = useState<any[]>([]);
  const [ccXoaySummary, setCcXoaySummary] = useState({
    totalCheckins: 0,
    totalBonus: 0,
    totalPoints: 0,
  });

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
  const [modalWidth, setModalWidth] = useState<number>(800);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartRef = React.useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 800 });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWidth = localStorage.getItem('cc_worklog_modal_width');
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
      localStorage.setItem('cc_worklog_modal_width', clamped.toString());
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
          localStorage.setItem('cc_worklog_modal_width', finalWidth.toString());
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [modalWidth]
  );

  const fetchPaystubData = async () => {
    setLoading(true);
    try {
      const dateFrom = dateRange ? dateRange[0].format('YYYY-MM-DD') : undefined;
      const dateTo = dateRange ? dateRange[1].format('YYYY-MM-DD') : undefined;
      const month = dateRange ? dateRange[0].format('YYYY-MM') : undefined;
      const comparisonPeriod = getComparisonPeriod(dateRange, comparisonMode);

      const [res, diamondRes, comparisonResults] = await Promise.all([
        apiClient.kpi.getCcPaystub({
          dateFrom,
          dateTo,
          storeId: selectedStore,
        }),
        apiClient.kpi
          .getCcDiamondData({
            month,
            date_from: dateFrom,
            date_to: dateTo,
          })
          .catch(() => null),
        comparisonPeriod
          ? Promise.all([
              apiClient.kpi.getCcPaystub({
                dateFrom: comparisonPeriod.dateFrom,
                dateTo: comparisonPeriod.dateTo,
                storeId: selectedStore,
              }),
              apiClient.kpi
                .getCcDiamondData({
                  month: comparisonPeriod.dateFrom.substring(0, 7),
                  date_from: comparisonPeriod.dateFrom,
                  date_to: comparisonPeriod.dateTo,
                  comparisonMode: undefined,
                })
                .catch(() => null),
            ]).catch(() => null)
          : null,
      ]);

      const diamondMap = new Map<number, { thuong: number; cnt: number }>();
      if (diamondRes && diamondRes.data) {
        for (const item of diamondRes.data) {
          diamondMap.set(item.ccId, { thuong: item.thuongDiamond, cnt: item.soKhachDiamond });
        }
      }

      if (res && res.data) {
        let sumDiamond = 0;
        const enrichedData = res.data.map((r) => {
          const dInfo = diamondMap.get(r.consultantId) || { thuong: 0, cnt: 0 };
          sumDiamond += dInfo.thuong;
          const totalInc = (r.totalIncome || 0) + dInfo.thuong;
          const netInc =
            r.netIncome != null ? r.netIncome + dInfo.thuong : Math.round(totalInc - (r.socialSecurityAmount || 0));

          return {
            ...r,
            diamondBonus: dInfo.thuong,
            diamondCount: dInfo.cnt,
            totalIncome: totalInc,
            netIncome: netInc,
          };
        });

        setPaystubData(enrichedData);
        setSelectedRecord((prev) => {
          if (!prev) return null;
          return enrichedData.find((item) => item.consultantId === prev.consultantId) || prev;
        });

        if (res.summary) {
          const comparisonPaystub = comparisonResults?.[0]?.summary;
          const comparisonDiamondBonus = comparisonResults?.[1]?.totalDiamondBonus || 0;
          setSummary({
            totalHourlyWage: res.summary.totalHourlyWage || 0,
            totalCcXoayBonus: res.summary.totalCcXoayBonus || 0,
            totalComboProductBonus: res.summary.totalComboProductBonus || 0,
            totalMinigameBonus: res.summary.totalMinigameBonus || 0,
            totalCcTipBonus: res.summary.totalCcTipBonus || 0,
            totalExtraSupport: res.summary.totalExtraSupport || 0,
            totalHolidayBasePay: res.summary.totalHolidayBasePay || 0,
            totalHolidayPremiumPay: res.summary.totalHolidayPremiumPay || 0,
            totalHolidayPayrollAddition: res.summary.totalHolidayPayrollAddition || 0,
            totalDiamondBonus: sumDiamond,
            grandTotalIncome: (res.summary.grandTotalIncome || 0) + sumDiamond,
            comparison:
              comparisonPeriod && comparisonPaystub
                ? {
                    ...comparisonPeriod,
                    totalHourlyWage: comparisonPaystub.totalHourlyWage || 0,
                    totalCcXoayBonus: comparisonPaystub.totalCcXoayBonus || 0,
                    totalComboProductBonus: comparisonPaystub.totalComboProductBonus || 0,
                    totalMinigameBonus: comparisonPaystub.totalMinigameBonus || 0,
                    totalCcTipBonus: comparisonPaystub.totalCcTipBonus || 0,
                    totalHolidayBasePay: comparisonPaystub.totalHolidayBasePay || 0,
                    totalHolidayPremiumPay: comparisonPaystub.totalHolidayPremiumPay || 0,
                    totalHolidayPayrollAddition: comparisonPaystub.totalHolidayPayrollAddition || 0,
                    totalDiamondBonus: comparisonDiamondBonus,
                    grandTotalIncome: (comparisonPaystub.grandTotalIncome || 0) + comparisonDiamondBonus,
                  }
                : undefined,
          });
        }
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu Paystub CC:', err);
    } finally {
      setLoading(false);
    }
  };

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
      const res = await fetch('/api/kpi/cc-allowances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedRecord.consultantId,
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
      await fetchPaystubData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi khi thêm phụ cấp.';
      message.error(errMsg);
    } finally {
      setIsSubmittingAllowance(false);
    }
  };

  const handleDeleteAllowance = async (allowanceId: number | string) => {
    try {
      const res = await fetch(`/api/kpi/cc-allowances/${allowanceId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Không thể xoá phụ cấp.');
      }
      message.success('Đã xoá phụ cấp.');
      await fetchPaystubData();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Lỗi khi xoá phụ cấp.';
      message.error(errMsg);
    }
  };

  useEffect(() => {
    fetchPaystubData();
  }, [comparisonMode, dateRange, selectedStore]);

  const filteredData = useMemo(() => {
    if (!searchText) return paystubData;
    const q = removeVietnameseTones(searchText);
    return paystubData.filter(
      (r) => removeVietnameseTones(r.displayName).includes(q) || (r.store && removeVietnameseTones(r.store).includes(q))
    );
  }, [paystubData, searchText]);

  const handleOpenDetailModal = (record: CcPaystubRecord) => {
    setSelectedRecord(record);
    setModalOpen(true);
  };

  const handleOpenWorkLogModal = async (record: CcPaystubRecord) => {
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
    } catch (err) {
      message.error('Không thể tải chi tiết ca làm việc!');
      setWorkLogs([]);
    } finally {
      setWorkLogLoading(false);
    }
  };

  const handleOpenCcXoayModal = async (record: CcPaystubRecord) => {
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
    } catch (err) {
      message.error('Không thể tải chi tiết lượt CC Xoay!');
      setCcXoayLogs([]);
    } finally {
      setCcXoayLoading(false);
    }
  };

  const handleOpenComboModal = (record: CcPaystubRecord) => {
    setComboModalRecord(record);
    setComboModalOpen(true);
  };

  const handleOpenTipModal = async (record: CcPaystubRecord) => {
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
    } catch (err) {
      message.error('Không thể tải chi tiết ca tip!');
      setTipModalRecords([]);
    } finally {
      setTipModalLoading(false);
    }
  };

  const handleOpenDiamondModal = (record: CcPaystubRecord) => {
    setDiamondRecord({
      ccId: record.consultantId,
      tenCc: record.displayName,
      tongKhach: 0,
      soKhachDiamond: record.diamondCount || 0,
      thuongDiamond: record.diamondBonus || 0,
      potentialThuong: 0,
      tyLeGioiThieu: 0,
      datDieuKien: true,
    });
    setDiamondModalOpen(true);
  };

  const filteredTipModalRecords = useMemo(() => {
    return tipModalRecords.filter((r) => {
      if (tipModalFilter === 'TIPPED' && r.tipStatus !== 'Tipped') return false;
      if (tipModalFilter === 'SMALL_CHANGE' && r.tipStatus !== 'Small Change') return false;
      if (tipModalFilter === 'NO_TIP' && r.tipStatus !== 'No Tip') return false;

      if (tipModalSearch) {
        const q = removeVietnameseTones(tipModalSearch.toLowerCase());
        return (
          removeVietnameseTones(r.clientName || '')
            .toLowerCase()
            .includes(q) ||
          removeVietnameseTones(r.serviceName || '')
            .toLowerCase()
            .includes(q) ||
          removeVietnameseTones(r.ccInName || '')
            .toLowerCase()
            .includes(q) ||
          removeVietnameseTones(r.ccOutName || '')
            .toLowerCase()
            .includes(q) ||
          (r.checkinTime && r.checkinTime.includes(tipModalSearch))
        );
      }
      return true;
    });
  }, [tipModalRecords, tipModalFilter, tipModalSearch]);

  const tipModalSummary = useMemo(() => {
    let totalCustomerTip = 0;
    let totalCcTipBonus = 0;
    let tippedCount = 0;
    let smallChangeCount = 0;
    let noTipCount = 0;

    for (const r of tipModalRecords) {
      totalCustomerTip += r.totalCustomerTip || 0;
      totalCcTipBonus += r.ccTipAmount || 0;
      if (r.tipStatus === 'Tipped') tippedCount++;
      else if (r.tipStatus === 'Small Change') smallChangeCount++;
      else noTipCount++;
    }

    return {
      totalCustomerTip,
      totalCcTipBonus,
      tippedCount,
      smallChangeCount,
      noTipCount,
      totalVisits: tipModalRecords.length,
    };
  }, [tipModalRecords]);

  const columns = [
    {
      title: 'Hạng / CC',
      dataIndex: 'displayName',
      key: 'displayName',
      width: 240,
      render: (name: string, record: CcPaystubRecord, index: number) => {
        return (
          <Space
            className="group cursor-pointer"
            role="button"
            tabIndex={0}
            aria-label={`Xem chi tiết thu nhập của tư vấn viên ${name}`}
            onClick={() => handleOpenDetailModal(record)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenDetailModal(record);
              }
            }}
          >
            <span className="tabular-nums font-bold text-xs w-6 text-center">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
            </span>
            <CcAvatar name={name} src={record.avatar} size={32} />
            <div className="min-w-0">
              <div className="font-bold text-sm" style={{ color: token.colorText }}>
                {name}
              </div>
              <span className="block text-[11px] leading-4 text-slate-500 dark:text-slate-400">
                {formatStoreCode(record.store)}
              </span>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Lương Giờ',
      dataIndex: 'hourlyWage',
      key: 'hourlyWage',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const rate = record.hourlyRate || 25000;
        const proj = getProjectedRecord(record);
        return (
          <Tooltip
            title={`Click để xem Báo cáo Chi Tiết Ca Làm Việc IN/OUT (${formatHoursToHoursMinutes(record.totalWorkHours)} @ ${rate.toLocaleString('vi-VN')}đ/h)`}
          >
            <div
              className="text-right cursor-pointer group hover:bg-blue-500/10 p-1.5 rounded-lg transition-colors border border-transparent hover:border-blue-500/30"
              role="button"
              tabIndex={0}
              aria-label={`Xem báo cáo chi tiết ca làm việc IN/OUT của ${record.displayName}`}
              onClick={() => handleOpenWorkLogModal(record)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenWorkLogModal(record);
                }
              }}
            >
              <div
                className={`tabular-nums whitespace-nowrap font-bold text-sm group-hover:underline underline-offset-2 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
              >
                +{formatVND(val)}
              </div>
              {!isDayMode && !isPastPeriod && proj.projectedHourlyWage > 0 && (
                <div className="flex items-center justify-end gap-1 text-[11px] text-blue-400/90 font-medium tabular-nums mt-0.5">
                  <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                    🔮
                  </span>
                  <span>~{formatCompactVND(proj.projectedHourlyWage)}</span>
                </div>
              )}
              <div
                className={`text-[11px] tabular-nums flex items-center justify-end gap-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
              >
                <span>
                  ({formatHoursToHoursMinutes(record.totalWorkHours, true)} @ {Math.round(rate / 1000)}k/h)
                </span>
                <EyeOutlined
                  className={`text-[10px] opacity-75 group-hover:opacity-100 transition-opacity ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                />
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thưởng CC Xoay',
      dataIndex: 'ccXoayBonus',
      key: 'ccXoayBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <Tooltip
            title={
              (record.ccXoayHoldBonus || 0) > 0
                ? `Thưởng gốc ${formatVND(record.rawCcXoayBonus || 0)}đ · nhận ${formatVND(val)}đ · on hold ${formatVND(record.ccXoayHoldBonus || 0)}đ (cap 150% Daily Bonus)`
                : `Click để xem Chi Tiết Ca Check-in Xoay (${record.checkinCount} lượt check-in)`
            }
          >
            <div
              className="text-right cursor-pointer group hover:bg-purple-500/10 p-1.5 rounded-lg transition-colors border border-transparent hover:border-purple-500/30"
              role="button"
              tabIndex={0}
              aria-label={`Xem chi tiết ca Check-in Xoay của ${record.displayName}`}
              onClick={() => handleOpenCcXoayModal(record)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenCcXoayModal(record);
                }
              }}
            >
              <div
                className={`tabular-nums whitespace-nowrap font-bold text-sm group-hover:underline underline-offset-2 ${isDark ? 'text-purple-300' : 'text-purple-600'}`}
              >
                +{formatVND(val)}
              </div>
              {!isDayMode && !isPastPeriod && proj.projectedCcXoayBonus > 0 && (
                <div className="flex items-center justify-end gap-1 text-[11px] text-purple-400/90 font-medium tabular-nums mt-0.5">
                  <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                    🔮
                  </span>
                  <span>~{formatCompactVND(proj.projectedCcXoayBonus)}</span>
                </div>
              )}
              <div
                className={`text-[11px] tabular-nums flex items-center justify-end gap-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
              >
                <span>{(record.ccXoayHoldBonus || 0) > 0 ? 'Đã cap 150%' : `(${record.checkinCount} lượt)`}</span>
                <EyeOutlined
                  className={`text-[10px] opacity-75 group-hover:opacity-100 transition-opacity ${isDark ? 'text-purple-300' : 'text-purple-600'}`}
                />
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thưởng Combo & SP',
      dataIndex: 'comboProductBonus',
      key: 'comboProductBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <Tooltip
            title={`Click để xem Chi Tiết Đơn Hàng Combo & SP (${record.comboCount} combo / ${record.productCount} sản phẩm)`}
          >
            <div
              className="text-right cursor-pointer group hover:bg-emerald-500/10 p-1.5 rounded-lg transition-colors border border-transparent hover:border-emerald-500/30"
              role="button"
              tabIndex={0}
              aria-label={`Xem chi tiết đơn hàng Combo & SP của ${record.displayName}`}
              onClick={() => handleOpenComboModal(record)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenComboModal(record);
                }
              }}
            >
              <div
                className={`tabular-nums whitespace-nowrap font-bold text-sm group-hover:underline underline-offset-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
              >
                +{formatVND(val)}
              </div>
              {!isDayMode && !isPastPeriod && proj.projectedComboProductBonus > 0 && (
                <div className="flex items-center justify-end gap-1 text-[11px] text-emerald-400/90 font-medium tabular-nums mt-0.5">
                  <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                    🔮
                  </span>
                  <span>~{formatCompactVND(proj.projectedComboProductBonus)}</span>
                </div>
              )}
              <div
                className={`text-[11px] tabular-nums flex items-center justify-end gap-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
              >
                <span>
                  ({record.comboCount} combo / {record.productCount} SP)
                </span>
                <EyeOutlined
                  className={`text-[10px] opacity-75 group-hover:opacity-100 transition-opacity ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                />
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thưởng CC Tip (20%)',
      dataIndex: 'ccTipBonus',
      key: 'ccTipBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <Tooltip title={`Click để xem Chi Tiết ${record.tippedVisitsCount || 0} ca Tip (Nhận 20% tiền tip)`}>
            <div
              className="text-right cursor-pointer group hover:bg-amber-500/10 p-1.5 rounded-lg transition-colors border border-transparent hover:border-amber-500/30"
              role="button"
              tabIndex={0}
              aria-label={`Xem chi tiết ca Tip của ${record.displayName}`}
              onClick={() => handleOpenTipModal(record)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenTipModal(record);
                }
              }}
            >
              <div
                className={`tabular-nums whitespace-nowrap font-bold text-sm group-hover:underline underline-offset-2 ${isDark ? 'text-amber-300' : 'text-amber-600'}`}
              >
                +{formatVND(val)}
              </div>
              {!isDayMode && !isPastPeriod && proj.projectedCcTipBonus > 0 && (
                <div className="flex items-center justify-end gap-1 text-[11px] text-amber-400/90 font-medium tabular-nums mt-0.5">
                  <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                    🔮
                  </span>
                  <span>~{formatCompactVND(proj.projectedCcTipBonus)}</span>
                </div>
              )}
              <div
                className={`text-[11px] tabular-nums flex items-center justify-end gap-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
              >
                <span>({record.tippedVisitsCount || 0} ca tip)</span>
                <EyeOutlined
                  className={`text-[10px] opacity-75 group-hover:opacity-100 transition-opacity ${isDark ? 'text-amber-300' : 'text-amber-600'}`}
                />
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thưởng Kim Cương',
      dataIndex: 'diamondBonus',
      key: 'diamondBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <Tooltip title={`Click để xem Chi Tiết ${record.diamondCount || 0} Khách Hàng Giới Thiệu (Thưởng 35k/khách)`}>
            <div
              className="text-right cursor-pointer group hover:bg-cyan-500/10 p-1.5 rounded-lg transition-colors border border-transparent hover:border-cyan-500/30"
              role="button"
              tabIndex={0}
              aria-label={`Xem chi tiết khách Kim Cương của ${record.displayName}`}
              onClick={() => handleOpenDiamondModal(record)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenDiamondModal(record);
                }
              }}
            >
              <div
                className={`tabular-nums whitespace-nowrap font-bold text-sm group-hover:underline underline-offset-2 ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}
              >
                +{formatVND(val)}
              </div>
              {!isDayMode && !isPastPeriod && proj.projectedDiamondBonus > 0 && (
                <div className="flex items-center justify-end gap-1 text-[11px] text-cyan-400/90 font-medium tabular-nums mt-0.5">
                  <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                    🔮
                  </span>
                  <span>~{formatCompactVND(proj.projectedDiamondBonus)}</span>
                </div>
              )}
              <div
                className={`text-[11px] tabular-nums flex items-center justify-end gap-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
              >
                <span>({record.diamondCount || 0} khách 💎)</span>
                <EyeOutlined
                  className={`text-[10px] opacity-75 group-hover:opacity-100 transition-opacity ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}
                />
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thưởng Nóng Minigame',
      dataIndex: 'minigameBonus',
      key: 'minigameBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <div className="text-right">
            <span
              className={`tabular-nums whitespace-nowrap font-bold text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
            >
              +{formatVND(val)}
            </span>
            {!isDayMode && !isPastPeriod && proj.projectedMinigameBonus > 0 && (
              <div className="flex items-center justify-end gap-1 text-[11px] text-amber-500/90 font-medium tabular-nums mt-0.5">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedMinigameBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Phụ Cấp Extra',
      dataIndex: 'extraSupport',
      key: 'extraSupport',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        if (!val || val <= 0) {
          return <span className="text-slate-400 dark:text-slate-600">-</span>;
        }
        return (
          <Tooltip title={record.extraSupportNote || 'Phụ cấp Extra đã duyệt trên hệ thống'}>
            <div className="text-right">
              <span
                className={`tabular-nums whitespace-nowrap font-bold text-sm ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}
              >
                +{formatVND(val)}
              </span>
              <div className="text-[11px] text-slate-500 truncate max-w-[120px]">
                {record.extraSupportNote || 'Đã duyệt'}
              </div>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Tổng Thu Nhập Tạm Tính',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <div className="text-right">
            <span
              className={`tabular-nums whitespace-nowrap font-extrabold text-base ${isDark ? 'text-amber-300' : 'text-amber-600'}`}
            >
              {formatVND(val)}
            </span>
            {!isDayMode && !isPastPeriod && proj.projectedTotalIncome > 0 && (
              <Tooltip
                title={`Dự đoán tổng thu nhập về đích cuối ${periodNoun}: ~${formatVND(proj.projectedTotalIncome)}đ`}
              >
                <div className="flex items-center justify-end gap-1 text-xs text-emerald-400 font-semibold tabular-nums mt-0.5 cursor-help">
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
      title: 'Thao Tác',
      key: 'action',
      align: 'center' as const,
      width: 140,
      render: (_: unknown, record: CcPaystubRecord) => (
        <Button
          size="small"
          type="primary"
          icon={<EyeOutlined />}
          onClick={() => handleOpenDetailModal(record)}
          style={{ fontWeight: '500' }}
        >
          Chi Tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {/* SUMMARY STAT CARDS AT TOP (EXTRACTED) */}
      <CcIncomeSummaryCards
        summary={summary}
        projectedSummary={projectedSummary}
        renderForecastSubtext={renderForecastSubtext}
        isDark={isDark}
      />

      {/* MAIN CC PAYSTUB TABLE CARD */}
      <Card
        title={
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <WalletOutlined className="text-amber-500 text-lg" />
              <span className="font-bold text-base" style={{ color: token.colorText }}>
                Thu Nhập CC Live
              </span>
            </div>

            <Input
              placeholder="Tìm tên CC, chi nhánh..."
              prefix={<SearchOutlined className={isDark ? 'text-slate-400' : 'text-slate-500'} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220 }}
              size="small"
              allowClear
            />
          </div>
        }
        variant="outlined"
        style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
        styles={{ body: { padding: 0 } }}
        className="full-bleed-card shadow-sm rounded-xl"
      >
        {isMobile ? (
          <div className="p-2 sm:p-3">
            <MobileRecordList
              records={filteredData}
              loading={loading}
              getKey={(record) => String(record.consultantId)}
              emptyDescription="Không tìm thấy dữ liệu thu nhập CC"
              className="cc-income-mobile-record-list"
              renderRecord={(record, index) => {
                const proj = getProjectedRecord(record);
                return (
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-400">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                      </span>
                      <CcAvatar name={record.displayName} src={record.avatar} size={32} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold" style={{ color: token.colorText }}>
                          {record.displayName}
                        </div>
                        <div className="text-xs text-slate-400">{formatStoreCode(record.store)}</div>
                      </div>
                      <Tooltip title={`Xem giờ làm của ${record.displayName}`}>
                        <Button
                          aria-label={`Xem giờ làm của ${record.displayName}`}
                          className="!flex !h-8 !w-8 !min-w-8 !items-center !justify-center rounded-lg"
                          icon={<ClockCircleOutlined />}
                          size="small"
                          type="text"
                          onClick={() => handleOpenWorkLogModal(record)}
                        />
                      </Tooltip>
                    </div>
                    <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-2 border-t border-slate-200 pt-2 dark:border-slate-800">
                      {[
                        {
                          label: 'Lương giờ',
                          value: record.hourlyWage || 0,
                          projected: proj.projectedHourlyWage,
                          color: 'text-sky-500 dark:text-sky-400',
                          onClick: () => handleOpenWorkLogModal(record),
                        },
                        {
                          label: 'Xoay',
                          value: record.ccXoayBonus || 0,
                          projected: proj.projectedCcXoayBonus,
                          color: 'text-purple-500 dark:text-purple-400',
                          onClick: () => handleOpenCcXoayModal(record),
                        },
                        {
                          label: 'Combo & SP',
                          value: record.comboProductBonus || 0,
                          projected: proj.projectedComboProductBonus,
                          color: 'text-emerald-500 dark:text-emerald-400',
                          onClick: () => handleOpenComboModal(record),
                        },
                        {
                          label: 'Tip',
                          value: record.ccTipBonus || 0,
                          projected: proj.projectedCcTipBonus,
                          color: 'text-amber-600 dark:text-amber-300',
                          onClick: () => handleOpenTipModal(record),
                        },
                        {
                          label: 'Kim cương',
                          value: record.diamondBonus || 0,
                          projected: proj.projectedDiamondBonus,
                          color: 'text-cyan-500 dark:text-cyan-300',
                          onClick: () => handleOpenDiamondModal(record),
                        },
                        {
                          label: 'Minigame',
                          value: record.minigameBonus || 0,
                          projected: proj.projectedMinigameBonus,
                          color: 'text-yellow-600 dark:text-yellow-300',
                        },
                        {
                          label: 'Phụ cấp lễ x3',
                          value: record.holidayPremiumPay || 0,
                          projected: proj.projectedHolidayPay,
                          color: 'text-rose-500 dark:text-rose-300',
                        },
                      ].map((income) => (
                        <div
                          className={`min-w-0 ${income.onClick ? 'cursor-pointer hover:opacity-80 active:scale-95 transition-all' : ''}`}
                          key={income.label}
                          onClick={income.onClick}
                        >
                          <dt
                            className="truncate text-[10px] leading-4 text-slate-500 flex items-center justify-between"
                            title={income.label}
                          >
                            <span>{income.label}</span>
                            {income.onClick && <EyeOutlined className="text-[9px] opacity-60" />}
                          </dt>
                          <Tooltip title={`${income.label}: +${formatVND(income.value)}`}>
                            <dd className={`truncate whitespace-nowrap text-xs font-bold tabular-nums ${income.color}`}>
                              +{formatCompactVND(income.value)}
                            </dd>
                          </Tooltip>
                          {!isDayMode && !isPastPeriod && (income.projected || 0) > 0 && (
                            <div className="text-[10px] text-emerald-500/80 font-medium tabular-nums">
                              🔮 ~{formatCompactVND(income.projected)}
                            </div>
                          )}
                        </div>
                      ))}
                    </dl>
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2">
                      <div className="min-w-0">
                        <div className="text-[10px] font-medium text-slate-500">∑ Thu nhập</div>
                        <Tooltip title={`Thu nhập: ${formatVND(record.totalIncome || 0)}`}>
                          <div className="overflow-hidden text-ellipsis whitespace-nowrap text-base font-bold tabular-nums text-amber-600 dark:text-amber-300">
                            {formatCompactVND(record.totalIncome || 0)}
                          </div>
                        </Tooltip>
                        {!isDayMode && !isPastPeriod && (proj.projectedTotalIncome || 0) > 0 && (
                          <div className="text-[11px] font-semibold text-emerald-500/90 tabular-nums">
                            🔮 ~{formatCompactVND(proj.projectedTotalIncome)}
                          </div>
                        )}
                      </div>
                      <Button
                        icon={<EyeOutlined />}
                        size="small"
                        type="primary"
                        onClick={() => handleOpenDetailModal(record)}
                      >
                        Chi tiết
                      </Button>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        ) : (
          <Table
            dataSource={filteredData}
            columns={columns}
            rowKey="consultantId"
            loading={loading}
            pagination={false}
            size="middle"
            bordered
            className="antd-custom-table"
            locale={{ emptyText: 'Không tìm thấy dữ liệu thu nhập CC' }}
          />
        )}

        <Divider style={{ margin: '16px 0' }} />

        <div className="flex justify-between items-center px-4 flex-wrap gap-4">
          <div>
            <Text className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              ∑ THU NHẬP TẠM TÍNH (LIVE SALARY):
            </Text>
            <div className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
              💡 Mẹo: Click vào cột Lương Giờ để xem Báo cáo Ca làm việc IN/OUT chi tiết theo từng ngày.
            </div>
          </div>
          <div
            className={`tabular-nums whitespace-nowrap text-2xl font-extrabold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}
          >
            {formatVND(summary.grandTotalIncome)}
          </div>
        </div>
      </Card>

      {/* Paystub Detail Modal (EXTRACTED) */}
      <CcPaystubDetailModal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        selectedRecord={selectedRecord}
        dateRange={dateRange}
        onOpenAllowanceModal={() => setIsAllowanceModalOpen(true)}
        onDeleteAllowance={handleDeleteAllowance}
        formatHoursToHoursMinutes={formatHoursToHoursMinutes}
      />

      {/* HOURLY WAGE / DAILY WORK LOG IN-OUT MODAL (EXTRACTED) */}
      <CcWorkLogDetailModal
        open={workLogModalOpen}
        onCancel={() => setWorkLogModalOpen(false)}
        record={workLogRecord}
        modalWidth={modalWidth}
        updateModalWidth={updateModalWidth}
        isMobile={isMobile}
        handleMouseDown={handleMouseDown}
        isResizing={isResizing}
        isDark={isDark}
        workLogSummary={workLogSummary}
        workLogs={workLogs}
        workLogLoading={workLogLoading}
        workLogPage={workLogPage}
        setWorkLogPage={setWorkLogPage}
        workLogPageSize={workLogPageSize}
        setWorkLogPageSize={setWorkLogPageSize}
        formatHoursToHoursMinutes={formatHoursToHoursMinutes}
      />

      {/* CC Xoay Detail Modal (EXTRACTED) */}
      <CcXoayDetailModal
        open={ccXoayModalOpen}
        onCancel={() => setCcXoayModalOpen(false)}
        record={ccXoayRecord}
        loading={ccXoayLoading}
        summary={ccXoaySummary}
        logs={ccXoayLogs}
        isDark={isDark}
      />

      {/* MODAL THƯỞNG COMBO & SẢN PHẨM */}
      {comboModalRecord && (
        <CcThuongTransactionsModal
          open={comboModalOpen}
          onClose={() => setComboModalOpen(false)}
          date={isDayMode ? dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD') : undefined}
          dateFrom={
            !isDayMode
              ? dateRange?.[0]?.format('YYYY-MM-DD') || dayjs().startOf('month').format('YYYY-MM-DD')
              : undefined
          }
          dateTo={
            !isDayMode ? dateRange?.[1]?.format('YYYY-MM-DD') || dayjs().endOf('month').format('YYYY-MM-DD') : undefined
          }
          consultantId={comboModalRecord.consultantId}
          consultantName={comboModalRecord.displayName}
          includeVat={true}
        />
      )}

      {/* MODAL CHI TIẾT CA TIP (20%) (EXTRACTED) */}
      <CcTipDetailModal
        open={tipModalOpen}
        onCancel={() => setTipModalOpen(false)}
        record={tipModalRecord}
        loading={tipModalLoading}
        summary={tipModalSummary}
        filter={tipModalFilter}
        setFilter={setTipModalFilter}
        search={tipModalSearch}
        setSearch={setTipModalSearch}
        records={filteredTipModalRecords}
      />

      {/* MODAL THƯỞNG KIM CƯƠNG */}
      {diamondRecord && (
        <CcDiamondDetailModal
          open={diamondModalOpen}
          onClose={() => setDiamondModalOpen(false)}
          ccRecord={diamondRecord}
          dateRange={dateRange}
        />
      )}

      {/* MODAL THÊM PHỤ CẤP KHÁC CHO CC (EXTRACTED) */}
      <CcAllowanceModal
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
        selectedRecord={selectedRecord}
        dateRange={dateRange}
        allowanceFormType={allowanceFormType}
        setAllowanceFormType={setAllowanceFormType}
        allowanceTitle={allowanceTitle}
        setAllowanceTitle={setAllowanceTitle}
        allowanceAmount={allowanceAmount}
        setAllowanceAmount={setAllowanceAmount}
        allowanceNote={allowanceNote}
        setAllowanceNote={setAllowanceNote}
      />
    </div>
  );
}
