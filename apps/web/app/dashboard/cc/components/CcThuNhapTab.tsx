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

type CcIncomeSummary = CcPaystubResponse['summary'] & {
  totalDiamondBonus: number;
  comparison?: ReportPeriodComparison & {
    totalDiamondBonus: number;
    totalHourlyWage: number;
    totalCcXoayBonus: number;
    totalComboProductBonus: number;
    totalMinigameBonus: number;
    totalCcTipBonus: number;
    totalHolidayBasePay: number;
    totalHolidayPremiumPay: number;
    totalHolidayPayrollAddition: number;
    grandTotalIncome: number;
  };
};

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
      {/* SUMMARY STAT CARDS AT TOP */}
      <Row gutter={[16, 16]} className="cc-income-summary-row mb-4">
        <Col xs={12} sm={8} lg={4}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="∑ Lương Giờ"
              value={summary.totalHourlyWage}
              suffix="đ"
              precision={0}
              valueStyle={{
                fontSize: '15px',
                color: isDark ? '#60a5fa' : '#1890ff',
                fontVariantNumeric: 'tabular-nums',
              }}
              prefix={<ClockCircleOutlined />}
            />
            {renderForecastSubtext(projectedSummary.projectedHourlyWage)}
            <CcPeriodComparison
              compact
              comparison={summary.comparison}
              currentValue={summary.totalHourlyWage}
              previousValue={summary.comparison?.totalHourlyWage || 0}
              formatter={formatCompactVND}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="Thưởng Xoay"
              value={summary.totalCcXoayBonus}
              suffix="đ"
              precision={0}
              valueStyle={{
                fontSize: '15px',
                color: isDark ? '#c084fc' : '#722ed1',
                fontVariantNumeric: 'tabular-nums',
              }}
              prefix={<ThunderboltOutlined />}
            />
            {renderForecastSubtext(projectedSummary.projectedCcXoayBonus)}
            <CcPeriodComparison
              compact
              comparison={summary.comparison}
              currentValue={summary.totalCcXoayBonus}
              previousValue={summary.comparison?.totalCcXoayBonus || 0}
              formatter={formatCompactVND}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="∑ Thưởng Combo & SP"
              value={summary.totalComboProductBonus}
              suffix="đ"
              precision={0}
              valueStyle={{
                fontSize: '15px',
                color: isDark ? '#4ade80' : '#52c41a',
                fontVariantNumeric: 'tabular-nums',
              }}
              prefix={<GiftOutlined />}
            />
            {renderForecastSubtext(projectedSummary.projectedComboProductBonus)}
            <CcPeriodComparison
              compact
              comparison={summary.comparison}
              currentValue={summary.totalComboProductBonus}
              previousValue={summary.comparison?.totalComboProductBonus || 0}
              formatter={formatCompactVND}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="Thưởng Tip"
              value={summary.totalCcTipBonus}
              suffix="đ"
              precision={0}
              valueStyle={{
                fontSize: '15px',
                color: token.colorPrimary,
                fontVariantNumeric: 'tabular-nums',
              }}
              prefix={<DollarOutlined />}
            />
            {renderForecastSubtext(projectedSummary.projectedCcTipBonus)}
            <CcPeriodComparison
              compact
              comparison={summary.comparison}
              currentValue={summary.totalCcTipBonus}
              previousValue={summary.comparison?.totalCcTipBonus || 0}
              formatter={formatCompactVND}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
          >
            <Statistic
              title="∑ Thưởng Minigame"
              value={summary.totalMinigameBonus}
              suffix="đ"
              precision={0}
              valueStyle={{
                fontSize: '15px',
                color: isDark ? '#fde047' : '#d97706',
                fontVariantNumeric: 'tabular-nums',
              }}
              prefix={<TrophyOutlined />}
            />
            {renderForecastSubtext(projectedSummary.projectedMinigameBonus)}
            <CcPeriodComparison
              compact
              comparison={summary.comparison}
              currentValue={summary.totalMinigameBonus}
              previousValue={summary.comparison?.totalMinigameBonus || 0}
              formatter={formatCompactVND}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} lg={4}>
          <Card
            size="small"
            variant="outlined"
            style={{ background: token.colorBgContainer, borderColor: token.colorPrimary }}
          >
            <Statistic
              title="Thu Nhập"
              value={summary.grandTotalIncome}
              suffix="đ"
              precision={0}
              valueStyle={{
                fontSize: '15px',
                color: token.colorPrimary,
                fontWeight: 'bold',
                fontVariantNumeric: 'tabular-nums',
              }}
              prefix={<WalletOutlined />}
            />
            {renderForecastSubtext(projectedSummary.projectedTotalIncome)}
            <CcPeriodComparison
              compact
              comparison={summary.comparison}
              currentValue={summary.grandTotalIncome}
              previousValue={summary.comparison?.grandTotalIncome || 0}
              formatter={formatCompactVND}
            />
          </Card>
        </Col>
      </Row>

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

      {/* Paystub Detail Modal (Chuẩn cấu trúc 5 nhóm đối chiếu chuẩn Wings mOS) */}
      <Modal
        title={
          <div className="flex items-center justify-between pr-8 border-b pb-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <WalletOutlined className="text-amber-500 text-lg" />
              <span className="font-bold text-base">Phiếu Lương Live Chi Tiết - {selectedRecord?.displayName}</span>
            </div>
            <Space>
              <Tag color="purple" className="font-mono text-xs font-semibold px-2 py-0.5">
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
              💡 Cấu trúc chi tiết đối chiếu chuẩn 100% Wings mOS
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
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1">
                    PAYSLIP • MONTH {dateRange?.[0] ? dayjs(dateRange[0]).format('MM.YYYY') : dayjs().format('MM.YYYY')}
                  </div>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">NICKNAME:</span>{' '}
                      <strong className="text-sm font-semibold">{selectedRecord.displayName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">HỌ TÊN:</span>{' '}
                      <strong className="text-sm font-semibold">
                        {selectedRecord.fullName || selectedRecord.displayName}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">CHỨC VỤ:</span>{' '}
                      <Tag color="purple" className="font-semibold text-xs ml-1">
                        Tư Vấn Viên (CC)
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
                  <div className="text-[11px] text-slate-400">Mã NV: #{selectedRecord.consultantId}</div>
                  <Tag color="green" className="mt-1">
                    Active
                  </Tag>
                </div>
              </div>
            </div>

            {/* 5-group Wings Payslip Table */}
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
                      {selectedRecord.expectedWorkDays || 26} ngày x 8h/ngày
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                      {selectedRecord.expectedWorkHours || 208}
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
                      {(selectedRecord.hourlyRate || 25000).toLocaleString('vi-VN')}đ
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
                                `Ngày ${dayjs(d.date).format('DD/MM')} (ca ${d.shiftHours || 9}h x ${(selectedRecord.hourlyRate || 25000).toLocaleString('vi-VN')}đ)${d.note ? `: ${d.note}` : ''}`
                            )
                            .join('; ')
                        : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      +{Math.round(selectedRecord.offMonthWage || 0).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (7) Lương / Nghỉ lễ x1 */}
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
                      {(selectedRecord.holidayWorkedHours || 0) > 0 || (selectedRecord.holidayPaidLeaveHours || 0) > 0
                        ? `${selectedRecord.holidayWorkedHours || 0} giờ đi làm + ${selectedRecord.holidayPaidLeaveHours || 0} giờ nghỉ lễ (1x giờ làm đã tính trong Lương giờ)`
                        : '—'}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                      +
                      {Math.round(
                        selectedRecord.holidayPaidLeavePay ||
                          selectedRecord.holidayPayrollAddition ||
                          selectedRecord.holidayBasePay ||
                          0
                      ).toLocaleString('vi-VN')}
                      đ
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
                          (selectedRecord.holidayPaidLeavePay || selectedRecord.holidayPayrollAddition || 0)
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
                        ? `${formatHoursToHoursMinutes(selectedRecord.offDaysWorkHours || 0)} x ${(selectedRecord.hourlyRate || 25000).toLocaleString('vi-VN')}đ x 1 (Đã ăn 1x ở Mục 4, thêm 1x ở đây)`
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
                        ? `Đi làm ngày nào cộng ngày đó: ${selectedRecord.holidayWorkedDays || 2} ngày đi làm (${selectedRecord.holidayWorkedHours}h làm x ${(selectedRecord.hourlyRate || 25000).toLocaleString('vi-VN')}đ x 3 = +${Math.round(selectedRecord.holidayPremiumPay || 0).toLocaleString('vi-VN')}đ - HR đi riêng)`
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

                  {/* GROUP 3: THƯỞNG HIỆU SUẤT TƯ VẤN, BÁN HÀNG & TIPS */}
                  <tr className="bg-purple-500/10 dark:bg-purple-950/25 border-y border-purple-500/30">
                    <td
                      colSpan={4}
                      className="py-2 px-3 text-left font-bold text-purple-800 dark:text-purple-200 uppercase tracking-wider text-[11px]"
                    >
                      ⭐ III. Thưởng hiệu suất tư vấn, Bán hàng & Tips
                    </td>
                  </tr>

                  {/* (12) Lượt check-in ca */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      12
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
                      Lượt check-in xoay ca
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      {selectedRecord.checkinCount || 0} lượt check-in phục vụ
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                      {selectedRecord.checkinCount || 0}
                    </td>
                  </tr>

                  {/* (13) Thưởng CC Xoay (Được nhận) */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 font-mono">
                      13
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold">
                      Thưởng CC Xoay (Được nhận)
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 text-[11px] font-normal">
                      {(selectedRecord.ccXoayHoldBonus || 0) > 0
                        ? `Thưởng gốc ${formatVND(selectedRecord.rawCcXoayBonus || 0)}đ từ ${selectedRecord.checkinCount} lượt; cap 150% Daily Bonus, on hold ${formatVND(selectedRecord.ccXoayHoldBonus || 0)}đ`
                        : `Bóc tách ${selectedRecord.checkinCount} lượt check-in`}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-bold text-blue-600 dark:text-blue-400">
                      +{Math.round(selectedRecord.ccXoayBonus).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (14) Thưởng Bán Combo & Sản Phẩm */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold bg-emerald-500/5 dark:bg-emerald-950/10">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 font-mono">
                      14
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-bold text-emerald-700 dark:text-emerald-300">
                      Thưởng Bán Combo & Sản Phẩm
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 text-[11px] font-normal">
                      {selectedRecord.comboCount || 0} combo + {selectedRecord.productCount || 0} sản phẩm
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                      +{Math.round(selectedRecord.comboProductBonus || 0).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (15) Thưởng CC Tip (20% Tip Share) */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 font-mono">
                      15
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 font-medium">
                      Thưởng CC Tip (20% Tip Share)
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-purple-600 dark:text-purple-400 text-[11px]">
                      Thực nhận 20% tip từ {selectedRecord.tippedVisitsCount || 0} lượt khách cho (ngưỡng &ge; 20k)
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-purple-600 dark:text-purple-400">
                      +{Math.round(selectedRecord.ccTipBonus || 0).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (16) Thưởng CT Kim Cương */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-sky-600 dark:text-sky-400 font-mono">
                      16
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
                      Thưởng CT Kim Cương (Giới thiệu KH)
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      Giới thiệu {selectedRecord.diamondCount || 0} khách hàng mới
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold text-sky-600 dark:text-sky-400">
                      +{Math.round(selectedRecord.diamondBonus || 0).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (17) Thưởng Nóng Minigame & Points */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      17
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800">
                      Thưởng Nóng Minigame & Points
                    </td>
                    <td className="py-1.5 px-3 border-r border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-[11px]">
                      Vượt mốc minigame tuần & vòng quay
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums font-semibold">
                      +{Math.round(selectedRecord.minigameBonus || 0).toLocaleString('vi-VN')}đ
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

                  {/* (18) Ngày làm việc thực tế trong tháng */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      18
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

                  {/* (19) Phụ cấp gửi xe */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                      19
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

                  {/* (20) Phụ cấp khác: Mỗi phụ cấp hiển thị 1 dòng riêng */}
                  {selectedRecord.otherAllowancesDetails && selectedRecord.otherAllowancesDetails.length > 0 ? (
                    selectedRecord.otherAllowancesDetails.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400 font-mono text-[11px]">
                          20.{idx + 1}
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
                        20
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
                        className="text-xs text-purple-600 dark:text-purple-400 border-purple-300 dark:border-purple-800 hover:text-purple-500"
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
                      Lương thời gian + Thưởng thời gian (off tuần) + Thưởng CC (Xoay, Combo/SP, Tips, Kim Cương) + Gửi
                      xe + Phụ cấp khác
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold text-blue-700 dark:text-blue-300 text-sm">
                      {Math.round(selectedRecord.totalIncome).toLocaleString('vi-VN')}đ
                    </td>
                  </tr>

                  {/* (21) BHXH */}
                  <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 font-semibold bg-rose-500/5 dark:bg-rose-950/10">
                    <td className="py-1.5 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 font-mono">
                      21
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

                  {/* Chi tiết Wings đóng */}
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

                      {/* Nhân sự đóng */}
                      <tr className="bg-slate-50/60 dark:bg-slate-900/60 text-[11px]">
                        <td className="py-1 px-2 text-center border-r border-slate-200 dark:border-slate-800 text-slate-400"></td>
                        <td className="py-1 px-3 border-r border-slate-200 dark:border-slate-800 pl-6 text-rose-700 dark:text-rose-300 font-medium">
                          ↳ {selectedRecord.displayName} (NLĐ đóng 10.5%)
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
                </tbody>
              </table>
            </div>

            {/* Motivational Message Card */}
            <div className="p-3 bg-gradient-to-r from-purple-500/10 via-amber-500/5 to-transparent border border-purple-300/40 dark:border-purple-800/30 rounded-lg text-center text-xs font-medium text-purple-800 dark:text-purple-300">
              🌟{' '}
              {selectedRecord.congratulationMessage ||
                'Chúc mừng bạn đã hoàn thành xuất sắc ca làm việc! Tiếp tục bùng nổ doanh số và chăm sóc khách hàng chu đáo nhé! 🌟'}{' '}
              💼
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

      {/* HOURLY WAGE / DAILY WORK LOG IN-OUT MODAL */}
      {workLogRecord && (
        <AdaptiveModal
          open={workLogModalOpen}
          onCancel={() => setWorkLogModalOpen(false)}
          intent="data"
          width={modalWidth}
          style={{ top: 30 }}
          className="cc-worklog-modal"
          title={
            <div className="cc-worklog-modal-title select-none">
              <div className="cc-worklog-modal-title-main">
                <ClockCircleOutlined className="text-blue-500 text-xl" />
                <span className="cc-worklog-modal-title-text">
                  Báo Cáo Ca Làm Việc & Lương Giờ (IN/OUT) - CC: {workLogRecord.displayName}
                </span>
                <Tag color={workLogRecord.store === 'PXL' ? 'blue' : 'purple'}>CN: {workLogRecord.store}</Tag>
              </div>

              <div className="cc-worklog-modal-size-controls" aria-label="Chọn kích thước báo cáo">
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
          footer={null}
        >
          <div className="cc-worklog-modal-content">
            {!isMobile && (
              <div
                onMouseDown={handleMouseDown}
                className={`cc-worklog-modal-resize-handle ${isResizing ? 'is-resizing' : ''}`}
                title="Kéo sang ngang để thay đổi chiều rộng Popup (Nhớ kích thước khi F5)"
              >
                <div />
              </div>
            )}

            <Row gutter={[12, 12]} className="cc-worklog-modal-summary">
              <Col xs={12} md={6}>
                <Card size="small" variant="outlined">
                  <Statistic
                    title="∑ Ngày Đi Làm"
                    value={workLogSummary.totalWorkDays}
                    suffix="ngày"
                    valueStyle={{
                      fontSize: '15px',
                      color: isDark ? '#60a5fa' : '#1890ff',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                    prefix={<CalendarOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small" variant="outlined">
                  <Statistic
                    title="∑ Số Giờ Làm"
                    value={formatHoursToHoursMinutes(workLogSummary.totalWorkHours)}
                    valueStyle={{
                      fontSize: '15px',
                      color: isDark ? '#c084fc' : '#722ed1',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                    prefix={<ClockCircleOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small" variant="outlined">
                  <Statistic
                    title="Đơn Giá Lương Giờ"
                    value={workLogSummary.hourlyRate}
                    suffix="đ/h"
                    valueStyle={{
                      fontSize: '15px',
                      color: isDark ? '#4ade80' : '#52c41a',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                    prefix={<DollarOutlined />}
                  />
                </Card>
              </Col>
              <Col xs={12} md={6}>
                <Card size="small" variant="outlined" style={{ borderColor: isDark ? '#60a5fa' : '#1890ff' }}>
                  <Statistic
                    title="∑ Lương Giờ Nhận"
                    value={workLogSummary.totalWage}
                    suffix="đ"
                    precision={0}
                    valueStyle={{
                      fontSize: '15px',
                      color: isDark ? '#60a5fa' : '#1890ff',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 'bold',
                    }}
                  />
                </Card>
              </Col>
            </Row>

            <div className="cc-worklog-modal-table">
              <DataTable
                dataSource={workLogs}
                rowKey={(r, idx) => `${r.work_date || ''}-${r.first_in || ''}-${idx}`}
                loading={workLogLoading}
                pagination={{
                  current: workLogPage,
                  pageSize: workLogPageSize,
                  total: workLogs.length,
                  showSizeChanger: true,
                  pageSizeOptions: ['10', '20', '50', '100'],
                  showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} ngày`,
                  onChange: (page, pageSize) => {
                    setWorkLogPage(page);
                    if (pageSize !== workLogPageSize) {
                      setWorkLogPageSize(pageSize);
                      localStorage.setItem('cc_worklog_modal_page_size', String(pageSize));
                    }
                  },
                }}
                size="small"
                bordered
                className="cc-worklog-table"
                mobileEmptyDescription="Không có ca làm việc trong kỳ này"
                mobileRenderer={(record) => (
                  <div className="cc-worklog-mobile-card">
                    <div className="cc-worklog-mobile-card-head">
                      <span className="font-semibold tabular-nums">{record.work_date}</span>
                      <span className="tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatVND(record.daily_wage)}
                      </span>
                    </div>
                    <div className="cc-worklog-mobile-card-times">
                      <Tag color="green" className="tabular-nums font-mono font-semibold m-0">
                        <LoginOutlined /> {record.first_in}
                      </Tag>
                      <Tag color="volcano" className="tabular-nums font-mono font-semibold m-0">
                        <LogoutOutlined /> {record.last_out}
                      </Tag>
                    </div>
                    <div className="cc-worklog-mobile-card-meta">
                      <span>{record.service_count} lượt phục vụ</span>
                      <span className="tabular-nums font-semibold">
                        {formatHoursToHoursMinutes(record.total_hours)}
                      </span>
                    </div>
                  </div>
                )}
                columns={[
                  {
                    title: 'Ngày Làm Việc',
                    dataIndex: 'work_date',
                    key: 'work_date',
                    width: 130,
                    render: (val: string) => (
                      <Space size={4}>
                        <CalendarOutlined className="text-blue-500 text-xs" />
                        <span className="tabular-nums font-semibold">{val}</span>
                      </Space>
                    ),
                  },
                  {
                    title: 'Check-in Đầu (IN)',
                    dataIndex: 'first_in',
                    key: 'first_in',
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
                    dataIndex: 'last_out',
                    key: 'last_out',
                    width: 140,
                    align: 'center' as const,
                    render: (val: string) => (
                      <Tag color="volcano" className="tabular-nums font-mono font-semibold">
                        <LogoutOutlined className="mr-1" /> {val}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Số Lượt Phục Vụ',
                    dataIndex: 'service_count',
                    key: 'service_count',
                    align: 'right' as const,
                    width: 130,
                    render: (val: number) => (
                      <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-300">{val} lượt</span>
                    ),
                  },
                  {
                    title: 'Số Giờ Tính Lương',
                    dataIndex: 'total_hours',
                    key: 'total_hours',
                    align: 'right' as const,
                    width: 140,
                    render: (val: number) => (
                      <span className={`tabular-nums font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        {formatHoursToHoursMinutes(val)}
                      </span>
                    ),
                  },
                  {
                    title: 'Lương Giờ Trong Ngày',
                    dataIndex: 'daily_wage',
                    key: 'daily_wage',
                    align: 'right' as const,
                    width: 150,
                    render: (val: number) => (
                      <span
                        className={`tabular-nums whitespace-nowrap font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
                      >
                        +{formatVND(val)}
                      </span>
                    ),
                  },
                ]}
              />
            </div>

            <AdaptiveOverlayFooter className="cc-worklog-modal-footer">
              <Text type="secondary" className="cc-worklog-modal-resize-hint text-xs italic">
                💡 Kéo mép phải để chỉnh rộng / hẹp ({modalWidth}px) — Tự động ghi nhớ khi F5
              </Text>
              <Button type="primary" onClick={() => setWorkLogModalOpen(false)}>
                Đóng Báo Cáo Ca Làm
              </Button>
            </AdaptiveOverlayFooter>
          </div>
        </AdaptiveModal>
      )}

      {/* CC Xoay Detail Modal */}
      {ccXoayRecord && (
        <Modal
          open={ccXoayModalOpen}
          onCancel={() => setCcXoayModalOpen(false)}
          width={1000}
          style={{ top: 30 }}
          title={
            <div className="flex items-center gap-2 pr-6 select-none">
              <TrophyOutlined className="text-purple-500 text-xl" />
              <span className="font-bold text-lg">
                Báo Cáo Chi Tiết Ca Check-in Xoay - CC: {ccXoayRecord.displayName}
              </span>
              <Tag color={ccXoayRecord.store === 'PXL' ? 'blue' : 'purple'}>CN: {ccXoayRecord.store}</Tag>
            </div>
          }
          footer={null}
        >
          {ccXoayLoading ? (
            <div className="flex justify-center py-8">
              <Spin />
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <Row gutter={[12, 12]} className="my-4">
                <Col span={8}>
                  <Card size="small" variant="outlined">
                    <Statistic
                      title="∑ Lượt Check-in"
                      value={ccXoaySummary.totalCheckins}
                      suffix="lượt"
                      valueStyle={{
                        fontSize: '15px',
                        color: isDark ? '#c084fc' : '#722ed1',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                      prefix={<CalendarOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" variant="outlined">
                    <Statistic
                      title="∑ Điểm Tích Lũy"
                      value={ccXoaySummary.totalPoints}
                      suffix="pts"
                      valueStyle={{
                        fontSize: '15px',
                        color: isDark ? '#60a5fa' : '#1890ff',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                      prefix={<TrophyOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card size="small" variant="outlined" style={{ borderColor: isDark ? '#c084fc' : '#722ed1' }}>
                    <Statistic
                      title="∑ Thưởng CC Xoay"
                      value={ccXoaySummary.totalBonus}
                      suffix="đ"
                      precision={0}
                      valueStyle={{
                        fontSize: '15px',
                        color: isDark ? '#c084fc' : '#722ed1',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 'bold',
                      }}
                    />
                  </Card>
                </Col>
              </Row>

              <Table
                dataSource={ccXoayLogs}
                rowKey={(r) => `${r.serviceId || r.checkin}-${r.consultantId || ''}`}
                bordered
                pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                size="small"
                className="antd-custom-table"
                columns={[
                  {
                    title: 'Check-in Time',
                    dataIndex: 'checkin',
                    key: 'checkin',
                    width: 140,
                    render: (val: string) => <span className="tabular-nums font-mono text-xs">{val}</span>,
                  },
                  {
                    title: 'Khách Hàng',
                    dataIndex: 'clientName',
                    key: 'clientName',
                    width: 150,
                    render: (val: string) => (
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{val || 'Khách Vãng Lai'}</span>
                    ),
                  },
                  {
                    title: 'Dịch Vụ',
                    dataIndex: 'serviceName',
                    key: 'serviceName',
                    render: (val: string) => (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{val}</span>
                    ),
                  },
                  {
                    title: 'Level CC',
                    dataIndex: 'consultantLevel',
                    key: 'consultantLevel',
                    width: 90,
                    align: 'center' as const,
                    render: (val: number) => (
                      <Tag color="gold" className="font-bold">
                        Lv.{val || 1}
                      </Tag>
                    ),
                  },
                  {
                    title: 'Điểm (+pts)',
                    dataIndex: 'consultantPoints',
                    key: 'consultantPoints',
                    width: 100,
                    align: 'right' as const,
                    render: (val: number) => (
                      <span className="tabular-nums font-semibold text-blue-500">+{val || 0} pts</span>
                    ),
                  },
                  {
                    title: 'Thưởng CC Xoay',
                    dataIndex: 'consultantBonus',
                    key: 'consultantBonus',
                    width: 140,
                    align: 'right' as const,
                    render: (val: number) => (
                      <span className="tabular-nums whitespace-nowrap font-bold text-purple-600 dark:text-purple-400">
                        +{formatVND(val)}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </Modal>
      )}

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

      {/* MODAL CHI TIẾT CA TIP (20%) */}
      {tipModalRecord && (
        <Modal
          open={tipModalOpen}
          onCancel={() => setTipModalOpen(false)}
          width={1100}
          className="top-6"
          title={
            <div className="flex flex-wrap items-center gap-2 pr-6 select-none">
              <GiftOutlined className="text-amber-500 text-xl" />
              <span className="font-bold text-lg">
                Báo Cáo Chi Tiết Ca Tip (20%) - CC: {tipModalRecord.displayName}
              </span>
              <Tag color="gold" className="font-bold">
                20% Tip Share
              </Tag>
              {tipModalRecord.store && <Tag color="blue">CN: {formatStoreCode(tipModalRecord.store)}</Tag>}
            </div>
          }
          footer={null}
        >
          {tipModalLoading ? (
            <div className="flex justify-center py-12">
              <Spin />
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={8}>
                  <Card size="small" variant="outlined" className="bg-sky-500/5 border-sky-500/20">
                    <Statistic
                      title="∑ Khách Tip"
                      value={tipModalSummary.totalCustomerTip}
                      suffix="đ"
                      precision={0}
                      valueStyle={{
                        fontSize: '16px',
                        color: token.colorInfo,
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 'bold',
                      }}
                      prefix={<DollarOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card size="small" variant="outlined" className="bg-emerald-500/5 border-emerald-500/20">
                    <Statistic
                      title="Lượt Tip ≥ 20K"
                      value={tipModalSummary.tippedCount}
                      suffix={`/ ${tipModalSummary.totalVisits} lượt`}
                      valueStyle={{
                        fontSize: '16px',
                        color: token.colorSuccess,
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 'bold',
                      }}
                      prefix={<UserOutlined />}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card size="small" variant="outlined" className="bg-amber-500/5 border-amber-500/30">
                    <Statistic
                      title="∑ Thưởng CC Tip (20%)"
                      value={tipModalSummary.totalCcTipBonus}
                      suffix="đ"
                      precision={0}
                      valueStyle={{
                        fontSize: '16px',
                        color: token.colorWarning,
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 'bold',
                      }}
                      prefix={<GiftOutlined />}
                    />
                  </Card>
                </Col>
              </Row>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                <Segmented<TipFilterType>
                  value={tipModalFilter}
                  onChange={(val) => setTipModalFilter(val)}
                  options={[
                    { label: `Tất cả (${tipModalSummary.totalVisits})`, value: 'ALL' },
                    { label: `Có Tip ≥ 20K (${tipModalSummary.tippedCount})`, value: 'TIPPED' },
                    { label: `Tiền lẻ < 20K (${tipModalSummary.smallChangeCount})`, value: 'SMALL_CHANGE' },
                    { label: `Không Tip (${tipModalSummary.noTipCount})`, value: 'NO_TIP' },
                  ]}
                  size="small"
                />

                <Input
                  placeholder="Tìm khách hàng, dịch vụ, CC..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={tipModalSearch}
                  onChange={(e) => setTipModalSearch(e.target.value)}
                  className="w-56"
                  size="small"
                  allowClear
                />
              </div>

              <Table
                dataSource={filteredTipModalRecords}
                rowKey={(r, idx) => `${r.orderId || r.checkinTime}-${idx}`}
                bordered
                pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                size="small"
                className="antd-custom-table"
                columns={[
                  {
                    title: 'Check-in Time',
                    dataIndex: 'checkinTime',
                    key: 'checkinTime',
                    width: 140,
                    render: (val: string) => <span className="tabular-nums font-mono text-xs">{val}</span>,
                  },
                  {
                    title: 'Khách Hàng',
                    dataIndex: 'clientName',
                    key: 'clientName',
                    width: 150,
                    render: (val: string) => (
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{val || 'Khách Vãng Lai'}</span>
                    ),
                  },
                  {
                    title: 'Dịch Vụ',
                    dataIndex: 'serviceName',
                    key: 'serviceName',
                    render: (val: string) => (
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">{val}</span>
                    ),
                  },
                  {
                    title: 'Chi Nhánh',
                    dataIndex: 'store',
                    key: 'store',
                    width: 90,
                    align: 'center' as const,
                    render: (val: string) => <Tag color="blue">{formatStoreCode(val)}</Tag>,
                  },
                  {
                    title: 'CC In / CC Out',
                    key: 'ccInOut',
                    width: 170,
                    render: (_: unknown, record: CcTipRecord) => {
                      const ccIn = record.ccInName?.trim();
                      const ccOut = record.ccOutName?.trim();
                      if (ccIn && ccOut && ccIn === ccOut) {
                        return <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{ccIn}</span>;
                      }
                      return (
                        <div className="text-xs space-y-0.5">
                          {ccIn && <div className="text-emerald-600 dark:text-emerald-400">In: {ccIn}</div>}
                          {ccOut && <div className="text-amber-600 dark:text-amber-400">Out: {ccOut}</div>}
                        </div>
                      );
                    },
                  },
                  {
                    title: 'Khách Tip',
                    dataIndex: 'totalCustomerTip',
                    key: 'totalCustomerTip',
                    width: 130,
                    align: 'right' as const,
                    render: (val: number, record: CcTipRecord) => (
                      <div className="flex flex-col items-end">
                        <span className="tabular-nums font-semibold text-sky-700 dark:text-sky-400 text-xs">
                          {val > 0 ? `+${val.toLocaleString('vi-VN')} đ` : '0 đ'}
                        </span>
                        {record.tipStatus === 'Small Change' && (
                          <Tag color="orange" className="mr-0 text-[10px] scale-90 origin-right py-0 leading-tight">
                            Tiền lẻ &lt; 20K
                          </Tag>
                        )}
                        {record.tipStatus === 'Tipped' && (
                          <Tag color="green" className="mr-0 text-[10px] scale-90 origin-right py-0 leading-tight">
                            Tip ≥ 20K
                          </Tag>
                        )}
                      </div>
                    ),
                  },
                  {
                    title: '% CC Nhận',
                    dataIndex: 'ccTipPercentage',
                    key: 'ccTipPercentage',
                    width: 95,
                    align: 'center' as const,
                    render: (val: number) => (
                      <Tag color={val > 0 ? 'gold' : 'default'} className="font-bold tabular-nums text-xs m-0">
                        {val}%
                      </Tag>
                    ),
                  },
                  {
                    title: 'Thưởng CC Tip',
                    dataIndex: 'ccTipAmount',
                    key: 'ccTipAmount',
                    width: 130,
                    align: 'right' as const,
                    render: (val: number) => (
                      <span
                        className={`tabular-nums whitespace-nowrap font-bold text-xs ${
                          val > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        {val > 0 ? `+${formatVND(val)}` : '0 đ'}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </Modal>
      )}

      {/* MODAL THƯỞNG KIM CƯƠNG */}
      {diamondRecord && (
        <CcDiamondDetailModal
          open={diamondModalOpen}
          onClose={() => setDiamondModalOpen(false)}
          ccRecord={diamondRecord}
          dateRange={dateRange}
        />
      )}

      {/* MODAL THÊM PHỤ CẤP KHÁC CHO CC */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <span className="text-base font-bold">Thêm phụ cấp khác</span>
            {selectedRecord && <Tag color="purple">{selectedRecord.displayName}</Tag>}
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
              placeholder="VD: Hỗ trợ gửi xe ngoài, Thưởng chiến dịch, Trừ đồng phục..."
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
