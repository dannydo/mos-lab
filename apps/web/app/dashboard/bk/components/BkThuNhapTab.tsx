'use client';

import { MobileRecordList, TableIndexHeader } from '~/components/ui';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import {
  Card,
  Table,
  Tag,
  Modal,
  Typography,
  Row,
  Col,
  Statistic,
  theme,
  Space,
  Button,
  Tooltip,
  Select,
  Input,
  Tabs,
  message,
} from 'antd';
import {
  WalletOutlined,
  EyeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  GiftOutlined,
  TrophyOutlined,
  CompressOutlined,
  ExpandOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  LoginOutlined,
  LogoutOutlined,
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import {
  BkPaystubRecord,
  BkWorkLogRecord,
  BkWorkLogResponse,
  TelesalesAttendanceExceptionType,
  TELESALES_ATTENDANCE_EXCEPTION_OPTIONS,
  type ReportComparisonMode,
  calculateFractionToday,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { useTheme } from '../../../../context/ThemeContext';
import BkAvatar from './BkAvatar';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';
import { usePreviousReportPeriod } from '../../../../hooks/usePreviousReportPeriod';
import PeriodComparison from '../../../../components/ui/PeriodComparison';
import { formatCompactVND } from '../../../../lib/format-utils';

const { Text, Title } = Typography;

export const formatStoreCode = (store?: string | null): string => {
  if (!store) return 'HQ';
  const s = String(store).toUpperCase().trim();
  if (s.includes('ESTELLA') || s.includes('EP')) return 'EP';
  if (s.includes('THAM') || s.includes('DE') || s.includes('DT')) return 'DT';
  if (s.includes('HQ') || s.includes('HEAD')) return 'HQ';
  if (s.includes('PXL') || s.includes('PHAN')) return 'PXL';
  return s;
};

interface BkThuNhapTabProps {
  dateRange: [any, any];
  selectedStore: string;
  selectedBooker: string;
  comparisonMode: ReportComparisonMode;
}

export default function BkThuNhapTab({ dateRange, selectedStore, selectedBooker, comparisonMode }: BkThuNhapTabProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';
  const previousPeriod = usePreviousReportPeriod(dateRange, comparisonMode);

  const [loading, setLoading] = useState(false);
  const [paystubs, setPaystubs] = useState<BkPaystubRecord[]>([]);
  const [summary, setSummary] = useState({
    totalBaseSalary: 0,
    totalDoneBonus: 0,
    totalTipBonus: 0,
    totalRevenueBonus: 0,
    totalHolidayBasePay: 0,
    totalHolidayPremiumPay: 0,
    totalHolidayPayrollAddition: 0,
    grandTotalIncome: 0,
  });
  const [previousSummary, setPreviousSummary] = useState<{
    totalBaseSalary: number;
    totalDoneBonus: number;
    totalTipBonus: number;
    totalRevenueBonus: number;
    totalHolidayBasePay: number;
    totalHolidayPremiumPay: number;
    totalHolidayPayrollAddition: number;
    grandTotalIncome: number;
  } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [activePaystub, setActivePaystub] = useState<BkPaystubRecord | null>(null);

  const [workLogModalOpen, setWorkLogModalOpen] = useState(false);
  const [workLogLoading, setWorkLogLoading] = useState(false);
  const [workLogRecord, setWorkLogRecord] = useState<BkPaystubRecord | null>(null);
  const [workLogData, setWorkLogData] = useState<BkWorkLogResponse | null>(null);

  const handleOpenWorkLogs = async (record: BkPaystubRecord) => {
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
  };

  const [exceptionModalOpen, setExceptionModalOpen] = useState(false);
  const [selectedWorkLog, setSelectedWorkLog] = useState<BkWorkLogRecord | null>(null);
  const [exceptionType, setExceptionType] = useState<TelesalesAttendanceExceptionType | 'CLEAR'>('OFF_MORNING');
  const [exceptionReason, setExceptionReason] = useState('');
  const [manualInTime, setManualInTime] = useState('08:00');
  const [manualOutTime, setManualOutTime] = useState('17:00');
  const [exceptionNote, setExceptionNote] = useState('');
  const [savingException, setSavingException] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'attendance' | 'audit'>('attendance');

  const openExceptionModal = (row: BkWorkLogRecord) => {
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
  };

  const handleSaveException = async (overrideType?: TelesalesAttendanceExceptionType | 'CLEAR') => {
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

      // Refresh work logs
      await handleOpenWorkLogs(workLogRecord);
      // Refresh main paystub table & stats
      await fetchPaystub();
    } catch (err: any) {
      console.error('Error saving exception:', err);
      message.error(err?.response?.data?.message || err?.message || 'Lỗi khi lưu ngoại lệ chấm công.');
    } finally {
      setSavingException(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

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

  const getProjectedRecord = useCallback(
    (record: BkPaystubRecord) => {
      const holidayActual = record.holidayPayrollAddition || record.holidayPremiumPay || 0;
      if (isPastPeriod) {
        return {
          projectedBaseSalary: record.calculatedBaseSalary || 0,
          projectedDoneBonus: record.doneBonus || 0,
          projectedTipBonus: record.tipBonus || 0,
          projectedRevenueBonus: record.revenueBonus || 0,
          projectedHolidayPay: holidayActual,
          projectedTotalIncome: record.totalIncome || 0,
        };
      }

      const standardDays = record.standardWorkDays || 26;
      const actualDays = record.actualWorkDays || 0;
      const projectedDays =
        actualDays > 0 ? Math.min(standardDays, Math.max(actualDays, Math.round(actualDays / (ratio || 1)))) : 0;

      const projectedBaseSalary =
        standardDays > 0
          ? Math.round(((record.monthlyBaseSalary || 0) / standardDays) * projectedDays)
          : record.calculatedBaseSalary || 0;

      const projectedDoneBonus = Math.round((record.doneBonus || 0) / (ratio || 1));
      const projectedTipBonus = Math.round((record.tipBonus || 0) / (ratio || 1));
      const projectedRevenueBonus = Math.round((record.revenueBonus || 0) / (ratio || 1));
      const projectedHolidayPay = holidayActual;

      const projectedTotalIncome =
        projectedBaseSalary + projectedDoneBonus + projectedTipBonus + projectedRevenueBonus + projectedHolidayPay;

      return {
        projectedBaseSalary,
        projectedDoneBonus,
        projectedTipBonus,
        projectedRevenueBonus,
        projectedHolidayPay,
        projectedTotalIncome,
      };
    },
    [isPastPeriod, ratio]
  );

  const projectedSummary = useMemo(() => {
    if (isPastPeriod) {
      return {
        projectedBaseSalary: summary.totalBaseSalary,
        projectedDoneBonus: summary.totalDoneBonus,
        projectedRevenueBonus: summary.totalRevenueBonus,
        projectedTipBonus: summary.totalTipBonus,
        projectedTotalIncome: summary.grandTotalIncome,
      };
    }

    let sumProjectedBase = 0;
    if (paystubs.length > 0) {
      sumProjectedBase = paystubs.reduce((acc, r) => {
        const proj = getProjectedRecord(r);
        return acc + proj.projectedBaseSalary;
      }, 0);
    } else {
      sumProjectedBase = Math.round((summary.totalBaseSalary || 0) / (ratio || 1));
    }

    const projectedDoneBonus = Math.round((summary.totalDoneBonus || 0) / (ratio || 1));
    const projectedRevenueBonus = Math.round((summary.totalRevenueBonus || 0) / (ratio || 1));
    const projectedTipBonus = Math.round((summary.totalTipBonus || 0) / (ratio || 1));
    const holidayAddition = summary.totalHolidayPayrollAddition || summary.totalHolidayPremiumPay || 0;
    const projectedTotalIncome =
      sumProjectedBase + projectedDoneBonus + projectedRevenueBonus + projectedTipBonus + holidayAddition;

    return {
      projectedBaseSalary: sumProjectedBase,
      projectedDoneBonus,
      projectedRevenueBonus,
      projectedTipBonus,
      projectedTotalIncome,
    };
  }, [summary, paystubs, ratio, isPastPeriod, getProjectedRecord]);

  const renderForecastSubtext = (projectedVal: number) => {
    if (isDayMode) return null;

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

  const fetchPaystub = async () => {
    setLoading(true);
    try {
      const [res, previousRes] = await Promise.all([
        apiClient.bk.getPaystub({
          dateFrom: dateRange[0].format('YYYY-MM-DD'),
          dateTo: dateRange[1].format('YYYY-MM-DD'),
          storeId: selectedStore,
        }),
        previousPeriod
          ? apiClient.bk.getPaystub({ ...previousPeriod.params, storeId: selectedStore })
          : Promise.resolve(null),
      ]);
      setPaystubs(res.data || []);
      setSummary(
        res.summary || {
          totalBaseSalary: 0,
          totalDoneBonus: 0,
          totalTipBonus: 0,
          totalRevenueBonus: 0,
          totalHolidayBasePay: 0,
          totalHolidayPremiumPay: 0,
          totalHolidayPayrollAddition: 0,
          grandTotalIncome: 0,
        }
      );
      setPreviousSummary(previousRes?.summary || null);
    } catch (err) {
      console.error('Error loading BK paystub', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPaystub();
  }, [dateRange, previousPeriod, selectedStore]);

  const openBreakdownModal = (record: BkPaystubRecord) => {
    setActivePaystub(record);
    setModalOpen(true);
  };

  const columns = [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 50,
      align: 'center' as const,
      render: (_: any, __: any, index: number) => (
        <span className="tabular-nums font-semibold text-slate-500 text-xs">#{index + 1}</span>
      ),
    },
    {
      title: 'Booker',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (name: string, record: BkPaystubRecord) => (
        <Space className="whitespace-nowrap" size={8}>
          <BkAvatar name={name} src={record.avatar} size={32} />
          <div>
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="font-semibold text-xs whitespace-nowrap" style={{ color: token.colorText }}>
                {name}
              </span>
              <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                · {formatStoreCode(record.store)}
              </span>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Số Ngày Công',
      dataIndex: 'actualWorkDays',
      key: 'actualWorkDays',
      align: 'center' as const,
      render: (val: number, r: BkPaystubRecord) => (
        <Tooltip title="Click để xem Báo Cáo Chi Tiết Ca Làm Việc (IN/OUT) từng ngày">
          <div
            className="flex flex-col items-center justify-center cursor-pointer hover:bg-blue-500/10 p-1 rounded-lg transition-colors border border-transparent hover:border-blue-500/30"
            role="button"
            tabIndex={0}
            onClick={() => handleOpenWorkLogs(r)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpenWorkLogs(r);
              }
            }}
          >
            <span className="tabular-nums text-xs text-blue-400 font-semibold whitespace-nowrap hover:underline underline-offset-2">
              {val} / {r.standardWorkDays} ngày
            </span>
            {r.actualCheckInDays !== undefined && r.actualCheckInDays !== val && (
              <span className="text-[10px] text-emerald-500 tabular-nums">
                ({r.actualCheckInDays} máy{' '}
                {r.workDaysAdjustment && r.workDaysAdjustment > 0 ? `+${r.workDaysAdjustment}` : r.workDaysAdjustment}{' '}
                duyệt)
              </span>
            )}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Lương Cứng',
      dataIndex: 'calculatedBaseSalary',
      key: 'calculatedBaseSalary',
      align: 'right' as const,
      render: (val: number, r: BkPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <Tooltip title="Click để xem chi tiết chấm công & ca làm việc (IN/OUT)">
            <div
              className="cursor-pointer hover:bg-blue-500/10 p-1 rounded-lg transition-colors border border-transparent hover:border-blue-500/30 inline-block text-right"
              role="button"
              tabIndex={0}
              onClick={() => handleOpenWorkLogs(r)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpenWorkLogs(r);
                }
              }}
            >
              <span className="tabular-nums font-semibold text-xs text-blue-400 hover:underline underline-offset-2">
                {formatCurrency(val)}
              </span>
              {!isDayMode && !isPastPeriod && proj.projectedBaseSalary > 0 && (
                <div className="flex items-center justify-end gap-1 text-[11px] text-blue-400/80 font-medium tabular-nums">
                  <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                    🔮
                  </span>
                  <span>~{formatCompactVND(proj.projectedBaseSalary)}</span>
                </div>
              )}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thưởng Done',
      dataIndex: 'doneBonus',
      key: 'doneBonus',
      align: 'right' as const,
      render: (val: number, r: BkPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-xs text-emerald-400">+{formatCurrency(val)}</span>
            {!isDayMode && !isPastPeriod && proj.projectedDoneBonus > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-emerald-500/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedDoneBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thưởng BK Tip',
      dataIndex: 'tipBonus',
      key: 'tipBonus',
      align: 'right' as const,
      render: (val: number, r: BkPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-xs text-pink-400">+{formatCurrency(val)}</span>
            {!isDayMode && !isPastPeriod && proj.projectedTipBonus > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-pink-500/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedTipBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Thưởng Doanh Thu',
      dataIndex: 'revenueBonus',
      key: 'revenueBonus',
      align: 'right' as const,
      render: (val: number, r: BkPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-xs text-purple-400">+{formatCurrency(val)}</span>
            {!isDayMode && !isPastPeriod && proj.projectedRevenueBonus > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-purple-500/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedRevenueBonus)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Phụ cấp lễ x3',
      dataIndex: 'holidayPremiumPay',
      key: 'holidayPremiumPay',
      align: 'right' as const,
      render: (val: number, r: BkPaystubRecord) => {
        const proj = getProjectedRecord(r);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-semibold text-xs text-rose-400">+{formatCurrency(val || 0)}</span>
            {!isDayMode && !isPastPeriod && (proj.projectedHolidayPay || 0) > 0 && (
              <div className="flex items-center gap-1 text-[11px] text-rose-500/80 font-medium tabular-nums">
                <span role="img" aria-label={`Dự đoán cuối ${periodNoun}`} className="text-[10px]">
                  🔮
                </span>
                <span>~{formatCompactVND(proj.projectedHolidayPay)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Tổng Thu Nhập Tạm Tính',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      align: 'right' as const,
      render: (val: number, record: BkPaystubRecord) => {
        const proj = getProjectedRecord(record);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular-nums font-bold text-sm text-emerald-400">{formatCurrency(val)}</span>
            {!isDayMode && !isPastPeriod && proj.projectedTotalIncome > 0 && (
              <Tooltip
                title={`Dự đoán tổng thu nhập về đích cuối ${periodNoun}: ~${formatCurrency(proj.projectedTotalIncome)}`}
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
      title: 'Thao tác',
      key: 'action',
      align: 'center' as const,
      render: (_: any, record: BkPaystubRecord) => (
        <Space size={6}>
          <Button
            type="default"
            size="small"
            icon={<ClockCircleOutlined className="text-blue-400" />}
            className="text-[11px] font-medium border-slate-700 hover:border-blue-400 hover:text-blue-400 px-2"
            onClick={() => handleOpenWorkLogs(record)}
          >
            Chấm công
          </Button>
          <Button
            type="default"
            size="small"
            icon={<EyeOutlined className="text-amber-400" />}
            className="text-[11px] font-medium border-slate-700 hover:border-amber-400 hover:text-amber-400 px-2"
            onClick={() => openBreakdownModal(record)}
          >
            Phiếu lương
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Lương Cứng</span>}
              value={summary.totalBaseSalary}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#2563eb', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<WalletOutlined className="mr-2" />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalBaseSalary}
              previousValue={previousSummary?.totalBaseSalary || 0}
              formatter={formatCurrency}
              compact={isMobile}
            />
            {renderForecastSubtext(projectedSummary.projectedBaseSalary)}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Thưởng Done</span>}
              value={summary.totalDoneBonus}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#10b981', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<CheckCircleOutlined className="mr-2" />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalDoneBonus}
              previousValue={previousSummary?.totalDoneBonus || 0}
              formatter={formatCurrency}
              compact={isMobile}
            />
            {renderForecastSubtext(projectedSummary.projectedDoneBonus)}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Thưởng Doanh Thu</span>}
              value={summary.totalRevenueBonus}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#9333ea', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<TrophyOutlined className="mr-2" />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalRevenueBonus}
              previousValue={previousSummary?.totalRevenueBonus || 0}
              formatter={formatCurrency}
              compact={isMobile}
            />
            {renderForecastSubtext(projectedSummary.projectedRevenueBonus)}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Thưởng Tip</span>}
              value={summary.totalTipBonus}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#ec4899', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<GiftOutlined className="mr-2" />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.totalTipBonus}
              previousValue={previousSummary?.totalTipBonus || 0}
              formatter={formatCurrency}
              compact={isMobile}
            />
            {renderForecastSubtext(projectedSummary.projectedTipBonus)}
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} xl={4}>
          <Card
            className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl"
            style={{ background: token.colorBgContainer }}
          >
            <Statistic
              title={<span className="text-xs font-semibold text-slate-500 uppercase">∑ Thu Nhập Tạm Tính</span>}
              value={summary.grandTotalIncome}
              formatter={(val) => formatCurrency(Number(val))}
              valueStyle={{ color: '#059669', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
              prefix={<DollarOutlined className="mr-2" />}
            />
            <PeriodComparison
              comparison={previousPeriod?.comparison}
              currentValue={summary.grandTotalIncome}
              previousValue={previousSummary?.grandTotalIncome || 0}
              formatter={formatCurrency}
              compact={isMobile}
            />
            {renderForecastSubtext(projectedSummary.projectedTotalIncome)}
          </Card>
        </Col>
      </Row>

      {/* Paystub Table */}
      <Card
        className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mt-6"
        style={{ background: token.colorBgContainer, marginTop: '24px' }}
      >
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <WalletOutlined className="text-xl" />
            </div>
            <div>
              <h3 className="text-lg font-bold m-0" style={{ color: token.colorText }}>
                Bảng Lương Live Paystub Booker
              </h3>
              <Text type="secondary" className="text-xs">
                Tổng hợp thu nhập tự động cho Booker trong tháng / chu kỳ lọc
              </Text>
            </div>
          </div>

          <Tooltip title={isCompact ? 'Chuyển Chế Độ Xem Chuẩn' : 'Chuyển Chế Độ Xem Gọn (Compact)'}>
            <Button
              icon={isCompact ? <ExpandOutlined /> : <CompressOutlined />}
              size="small"
              onClick={() => setIsCompact(!isCompact)}
              className={isCompact ? 'text-amber-500 border-amber-500/50' : ''}
            />
          </Tooltip>
        </div>

        {isMobile ? (
          <div className="p-3">
            <MobileRecordList
              records={paystubs}
              loading={loading}
              getKey={(record) => String(record.staffId)}
              emptyDescription="Chưa có dữ liệu thu nhập Booker"
              renderRecord={(record, index) => (
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-400">
                      #{index + 1}
                    </span>
                    <BkAvatar name={record.staffName} src={record.avatar} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold" style={{ color: token.colorText }}>
                        {record.staffName}
                      </div>
                      <div className="text-xs text-slate-400">
                        {formatStoreCode(record.store)} · {record.actualWorkDays}/{record.standardWorkDays} ngày
                      </div>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Lương cứng</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-sky-400">
                        {formatCurrency(record.calculatedBaseSalary || 0)}
                      </dd>
                      {!isDayMode && !isPastPeriod && (getProjectedRecord(record).projectedBaseSalary || 0) > 0 && (
                        <div className="text-[10px] text-sky-400/80 font-medium tabular-nums">
                          🔮 ~{formatCompactVND(getProjectedRecord(record).projectedBaseSalary)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Thưởng</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-emerald-400">
                        +{formatCurrency((record.doneBonus || 0) + (record.tipBonus || 0) + (record.revenueBonus || 0))}
                      </dd>
                      {!isDayMode && !isPastPeriod && (
                        <div className="text-[10px] text-emerald-500/80 font-medium tabular-nums">
                          🔮 ~
                          {formatCompactVND(
                            (getProjectedRecord(record).projectedDoneBonus || 0) +
                              (getProjectedRecord(record).projectedTipBonus || 0) +
                              (getProjectedRecord(record).projectedRevenueBonus || 0)
                          )}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Phụ cấp lễ x3</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-rose-400">
                        +{formatCurrency(record.holidayPremiumPay || 0)}
                      </dd>
                      {!isDayMode && !isPastPeriod && (getProjectedRecord(record).projectedHolidayPay || 0) > 0 && (
                        <div className="text-[10px] text-rose-400/80 font-medium tabular-nums">
                          🔮 ~{formatCompactVND(getProjectedRecord(record).projectedHolidayPay)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <dt className="text-[10px] text-slate-500">Thu nhập</dt>
                      <dd className="truncate text-sm font-bold tabular-nums text-amber-400">
                        {formatCurrency(record.totalIncome || 0)}
                      </dd>
                      {!isDayMode && !isPastPeriod && (
                        <div className="text-[10px] text-emerald-500/80 font-medium tabular-nums">
                          🔮 ~{formatCompactVND(getProjectedRecord(record).projectedTotalIncome)}
                        </div>
                      )}
                    </div>
                  </dl>
                  <div className="mt-3 flex justify-end">
                    <Button
                      size="small"
                      icon={<EyeOutlined className="text-amber-400" />}
                      onClick={() => openBreakdownModal(record)}
                    >
                      Chi tiết
                    </Button>
                  </div>
                </div>
              )}
            />
          </div>
        ) : (
          <Table
            dataSource={paystubs}
            columns={columns}
            rowKey="staffId"
            loading={loading}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
            className={isCompact ? 'antd-custom-table compact-table' : 'antd-custom-table'}
          />
        )}
      </Card>

      {/* Breakdown Modal */}
      {activePaystub && (
        <Modal
          title={
            <div className="flex items-center gap-2">
              <WalletOutlined className="text-emerald-500 text-lg" />
              <span>
                Phiếu Lương Chi Tiết - Booker: <strong className="text-emerald-600">{activePaystub.staffName}</strong>
              </span>
            </div>
          }
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          footer={null}
          width={650}
          destroyOnHidden
        >
          <div className="space-y-4 py-3 tabular-nums">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Lương Cứng Tính Theo Ngày Công</div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {formatCurrency(activePaystub.monthlyBaseSalary)} / {activePaystub.standardWorkDays} ngày x{' '}
                  {activePaystub.actualWorkDays} ngày thực tế
                  {activePaystub.actualCheckInDays !== undefined &&
                    activePaystub.actualCheckInDays !== activePaystub.actualWorkDays && (
                      <span className="text-xs text-emerald-500 ml-1.5 font-normal">
                        ({activePaystub.actualCheckInDays} ngày máy{' '}
                        {activePaystub.workDaysAdjustment && activePaystub.workDaysAdjustment > 0
                          ? `+${activePaystub.workDaysAdjustment}`
                          : activePaystub.workDaysAdjustment}{' '}
                        ngày duyệt bù)
                      </span>
                    )}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <Button
                    type="link"
                    size="small"
                    icon={<ClockCircleOutlined />}
                    className="text-xs text-blue-500 p-0 h-auto font-medium"
                    onClick={() => {
                      setModalOpen(false);
                      handleOpenWorkLogs(activePaystub);
                    }}
                  >
                    Xem chi tiết chấm công IN/OUT từng ngày →
                  </Button>
                </div>
              </div>
              <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(activePaystub.calculatedBaseSalary)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Thưởng Đơn Completed (Done)</div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Gồm thưởng lượt Done, Promo & Mốc thưởng
                </div>
              </div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(activePaystub.doneBonus)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Thưởng BK Tip (% Share)</div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Phần % thưởng Tip khách cho trên các đơn book
                </div>
              </div>
              <div className="text-base font-bold text-pink-600 dark:text-pink-400">
                +{formatCurrency(activePaystub.tipBonus)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <div>
                <div className="text-xs text-slate-500 font-semibold uppercase">Thưởng Hoa Hồng Doanh Thu</div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Tính trên Tổng doanh thu đơn Completed (Lẻ + Combo + SP)
                </div>
              </div>
              <div className="text-base font-bold text-purple-600 dark:text-purple-400">
                +{formatCurrency(activePaystub.revenueBonus)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex justify-between items-center">
              <div>
                <div className="text-xs text-rose-600 dark:text-rose-300 font-semibold uppercase">Lương ngày lễ 1x</div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {activePaystub.holidayWorkedHours || 0} giờ làm + {activePaystub.holidayPaidLeaveHours || 0} giờ nghỉ
                  lễ; 1x đã nằm trong lương tháng
                </div>
              </div>
              <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(activePaystub.holidayBasePay || 0)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex justify-between items-center">
              <div>
                <div className="text-xs text-rose-600 dark:text-rose-300 font-semibold uppercase">
                  Phụ cấp đi làm lễ x3
                </div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {activePaystub.holidayWorkedDays || 0} ngày có roster và chấm công hợp lệ
                </div>
              </div>
              <div className="text-base font-bold text-rose-600 dark:text-rose-400">
                +{formatCurrency(activePaystub.holidayPremiumPay || 0)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex justify-between items-center mt-6">
              <div className="font-bold text-base text-emerald-700 dark:text-emerald-300">∑ THU NHẬP TẠM TÍNH</div>
              <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(activePaystub.totalIncome)}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Báo Cáo Chấm Công IN/OUT Chi Tiết */}
      {workLogRecord && (
        <Modal
          title={
            <div className="flex items-center gap-2 pr-6">
              <ClockCircleOutlined className="text-blue-500 text-lg" />
              <span>
                Báo Cáo Chi Tiết Chấm Công (IN/OUT) - Booker:{' '}
                <strong className="text-blue-600 dark:text-blue-400">{workLogRecord.staffName}</strong>
              </span>
              <Tag color={workLogRecord.store === 'PXL' ? 'blue' : 'purple'} className="ml-2 font-mono">
                {workLogRecord.store}
              </Tag>
              {workLogData?.isTelesalesExecutive && (
                <Tag color="cyan" className="font-semibold text-xs py-0.5">
                  Vai trò: Telesales Executive
                </Tag>
              )}
            </div>
          }
          open={workLogModalOpen}
          onCancel={() => setWorkLogModalOpen(false)}
          footer={null}
          width={920}
          destroyOnHidden
        >
          {workLogLoading ? (
            <div className="py-12 flex flex-col justify-center items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-500">Đang tải dữ liệu quẹt thẻ...</span>
            </div>
          ) : workLogData ? (
            <div className="space-y-4 py-2">
              {/* Summary Stats */}
              <Row gutter={[12, 12]}>
                <Col xs={12} sm={6}>
                  <Card
                    size="small"
                    className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
                  >
                    <Statistic
                      title={<span className="text-xs text-slate-500 uppercase font-semibold">∑ Ngày Đi Làm</span>}
                      value={`${workLogData.actualWorkDays} / ${workLogData.standardWorkDays}`}
                      suffix="ngày"
                      className="[&_.ant-statistic-content-value]:text-blue-600 dark:[&_.ant-statistic-content-value]:text-blue-400"
                      valueStyle={{ fontSize: '15px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      prefix={<CalendarOutlined className="text-blue-600 dark:text-blue-400" />}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card
                    size="small"
                    className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
                  >
                    <Statistic
                      title={<span className="text-xs text-slate-500 uppercase font-semibold">∑ Quẹt Thẻ Máy</span>}
                      value={workLogData.actualCheckInDays}
                      suffix={
                        workLogData.workDaysAdjustment > 0
                          ? `(+${workLogData.workDaysAdjustment} duyệt)`
                          : workLogData.workDaysAdjustment < 0
                            ? `(${workLogData.workDaysAdjustment} duyệt)`
                            : 'ngày'
                      }
                      className="[&_.ant-statistic-content-value]:text-emerald-600 dark:[&_.ant-statistic-content-value]:text-emerald-400"
                      valueStyle={{ fontSize: '15px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      prefix={<CheckCircleOutlined className="text-emerald-600 dark:text-emerald-400" />}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card
                    size="small"
                    className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
                  >
                    <Statistic
                      title={<span className="text-xs text-slate-500 uppercase font-semibold">∑ Giờ Làm Việc</span>}
                      value={workLogData.summary.totalWorkingHours}
                      suffix="giờ"
                      className="[&_.ant-statistic-content-value]:text-purple-600 dark:[&_.ant-statistic-content-value]:text-purple-400"
                      valueStyle={{ fontSize: '15px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      prefix={<ClockCircleOutlined className="text-purple-600 dark:text-purple-400" />}
                    />
                  </Card>
                </Col>
                <Col xs={12} sm={6}>
                  <Card
                    size="small"
                    className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700"
                  >
                    <Statistic
                      title={<span className="text-xs text-slate-500 uppercase font-semibold">∑ Lương Cứng Nhận</span>}
                      value={workLogData.calculatedBaseSalary}
                      formatter={(val) => formatCurrency(Number(val))}
                      className="[&_.ant-statistic-content-value]:text-sky-600 dark:[&_.ant-statistic-content-value]:text-sky-400"
                      valueStyle={{ fontSize: '15px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      prefix={<DollarOutlined className="text-sky-600 dark:text-sky-400" />}
                    />
                  </Card>
                </Col>
              </Row>

              {workLogData.isTelesalesExecutive && (
                <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <InfoCircleOutlined className="text-blue-500 text-sm shrink-0" />
                    <span>
                      Hệ thống áp dụng <strong>Ngoại lệ chấm công</strong> theo ngày cho Telesales Executive. Giờ
                      check-in/out thực tế của máy luôn được lưu trữ toàn vẹn để đối soát.
                    </span>
                  </div>
                  {(workLogData.summary.totalExceptionDays || 0) > 0 && (
                    <Tag color="orange" className="font-bold tabular-nums m-0">
                      {workLogData.summary.totalExceptionDays} ngày đã duyệt ngoại lệ
                    </Tag>
                  )}
                </div>
              )}

              {workLogData.isTelesalesExecutive ? (
                <Tabs
                  activeKey={activeDrawerTab}
                  onChange={(k) => setActiveDrawerTab(k as 'attendance' | 'audit')}
                  items={[
                    {
                      key: 'attendance',
                      label: (
                        <span className="flex items-center gap-1.5 font-medium">
                          <ClockCircleOutlined /> Ca làm việc & Chấm công
                        </span>
                      ),
                      children: (
                        <Table
                          dataSource={workLogData.data}
                          rowKey="workDate"
                          size="small"
                          pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '31', '50'] }}
                          bordered
                          columns={[
                            {
                              title: 'Ngày Làm Việc',
                              dataIndex: 'workDate',
                              key: 'workDate',
                              width: 130,
                              render: (val: string, r: BkWorkLogRecord) => (
                                <div className="flex flex-col">
                                  <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200 text-xs">
                                    {val}
                                  </span>
                                  <span className="text-[11px] text-slate-500">{r.dayOfWeek}</span>
                                </div>
                              ),
                            },
                            {
                              title: 'Giờ Vào (IN)',
                              dataIndex: 'firstIn',
                              key: 'firstIn',
                              align: 'center' as const,
                              width: 130,
                              render: (val: string | null, r: BkWorkLogRecord) => {
                                const isManual = r.exception?.exceptionType === 'MANUAL_CHECKIN_OUT';
                                const manualIn = r.exception?.manualInTime || r.manualInTime;
                                return (
                                  <div className="flex flex-col items-center gap-1">
                                    {val ? (
                                      <Tag
                                        color={isManual ? 'default' : 'green'}
                                        className={`tabular-nums font-mono font-semibold m-0 text-xs py-0.5 px-2 inline-flex items-center ${
                                          isManual ? 'opacity-60' : ''
                                        }`}
                                      >
                                        <LoginOutlined className="mr-1" /> {val}
                                      </Tag>
                                    ) : (
                                      <Tag className="tabular-nums text-slate-400 m-0 text-[11px]">Chưa quẹt IN</Tag>
                                    )}
                                    {isManual && manualIn && (
                                      <Tooltip title={`Bổ sung IN thủ công: ${manualIn} (Manual / Manager Approved)`}>
                                        <Tag
                                          color="cyan"
                                          className="tabular-nums font-mono font-semibold m-0 text-[10px] py-0.5 px-1.5 inline-flex items-center gap-0.5 border-cyan-400"
                                        >
                                          <LoginOutlined /> {manualIn} (Bổ sung)
                                        </Tag>
                                      </Tooltip>
                                    )}
                                  </div>
                                );
                              },
                            },
                            {
                              title: 'Giờ Ra (OUT)',
                              dataIndex: 'lastOut',
                              key: 'lastOut',
                              align: 'center' as const,
                              width: 130,
                              render: (val: string | null, r: BkWorkLogRecord) => {
                                const isManual = r.exception?.exceptionType === 'MANUAL_CHECKIN_OUT';
                                const manualOut = r.exception?.manualOutTime || r.manualOutTime;
                                return (
                                  <div className="flex flex-col items-center gap-1">
                                    {val ? (
                                      <Tag
                                        color={isManual ? 'default' : 'volcano'}
                                        className={`tabular-nums font-mono font-semibold m-0 text-xs py-0.5 px-2 inline-flex items-center ${
                                          isManual ? 'opacity-60' : ''
                                        }`}
                                      >
                                        <LogoutOutlined className="mr-1" /> {val}
                                      </Tag>
                                    ) : (
                                      <Tag className="tabular-nums text-slate-400 m-0 text-[11px]">Chưa quẹt OUT</Tag>
                                    )}
                                    {isManual && manualOut && (
                                      <Tooltip title={`Bổ sung OUT thủ công: ${manualOut} (Manual / Manager Approved)`}>
                                        <Tag
                                          color="cyan"
                                          className="tabular-nums font-mono font-semibold m-0 text-[10px] py-0.5 px-1.5 inline-flex items-center gap-0.5 border-cyan-400"
                                        >
                                          <LogoutOutlined /> {manualOut} (Bổ sung)
                                        </Tag>
                                      </Tooltip>
                                    )}
                                  </div>
                                );
                              },
                            },
                            {
                              title: 'Thời Gian Làm',
                              dataIndex: 'workingMinute',
                              key: 'workingMinute',
                              align: 'right' as const,
                              width: 110,
                              render: (val: number, r: BkWorkLogRecord) => (
                                <div className="text-right">
                                  <span className="tabular-nums font-semibold text-xs text-slate-700 dark:text-slate-300">
                                    {val > 0 ? `${val} phút` : '--'}
                                  </span>
                                  {val > 0 && (
                                    <span className="block text-[10px] text-slate-400">({r.totalHours}h)</span>
                                  )}
                                </div>
                              ),
                            },
                            {
                              title: 'Trạng Thái',
                              dataIndex: 'isCheckIn',
                              key: 'isCheckIn',
                              align: 'center' as const,
                              width: 140,
                              render: (isCheckIn: boolean, r: BkWorkLogRecord) => {
                                if (r.exceptionBadge) {
                                  return (
                                    <Tooltip
                                      title={
                                        <div className="text-xs space-y-1">
                                          <div>
                                            <span className="text-slate-300">Loại ngoại lệ:</span>{' '}
                                            <strong>
                                              {TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[r.exceptionBadge.type]?.label ||
                                                r.exceptionBadge.text}
                                            </strong>
                                          </div>
                                          {r.exception?.exceptionType === 'MANUAL_CHECKIN_OUT' && (
                                            <>
                                              <div>
                                                <span className="text-slate-300">IN bổ sung:</span>{' '}
                                                <strong className="text-cyan-400 font-mono">
                                                  {r.exception.manualInTime || '--'}
                                                </strong>
                                              </div>
                                              <div>
                                                <span className="text-slate-300">OUT bổ sung:</span>{' '}
                                                <strong className="text-cyan-400 font-mono">
                                                  {r.exception.manualOutTime || '--'}
                                                </strong>
                                              </div>
                                              {r.exception.note && (
                                                <div>
                                                  <span className="text-slate-300">Ghi chú:</span>{' '}
                                                  <span className="italic">{r.exception.note}</span>
                                                </div>
                                              )}
                                              <div>
                                                <span className="text-slate-300">Đánh dấu:</span>{' '}
                                                <Tag color="cyan" className="m-0 text-[10px]">
                                                  Manual / Manager Approved
                                                </Tag>
                                              </div>
                                            </>
                                          )}
                                          <div>
                                            <span className="text-slate-300">Lý do:</span>{' '}
                                            <strong>{r.exception?.reason}</strong>
                                          </div>
                                          {r.exception?.approvedByName && (
                                            <div>
                                              <span className="text-slate-300">Duyệt bởi:</span>{' '}
                                              {r.exception.approvedByName}
                                            </div>
                                          )}
                                          {r.exception?.updatedAt && (
                                            <div>
                                              <span className="text-slate-300">Thời gian:</span>{' '}
                                              {dayjs(r.exception.updatedAt).format('DD/MM/YYYY HH:mm')}
                                            </div>
                                          )}
                                          <div>
                                            <span className="text-slate-300">Ngày công tính lại:</span>{' '}
                                            <strong className="text-emerald-400">
                                              {r.effectiveWorkCredit} ngày công
                                            </strong>
                                          </div>
                                        </div>
                                      }
                                    >
                                      <Tag
                                        color={r.exceptionBadge.color}
                                        className="text-[11px] font-semibold m-0 cursor-help"
                                      >
                                        {r.exceptionBadge.text}
                                      </Tag>
                                    </Tooltip>
                                  );
                                }
                                if (isCheckIn) {
                                  return (
                                    <Tag color="success" className="text-[11px] m-0">
                                      Đủ công
                                    </Tag>
                                  );
                                }
                                if (r.dayOfWeek === 'Chủ Nhật') {
                                  return (
                                    <Tag color="default" className="text-[11px] m-0 text-slate-400">
                                      Chủ Nhật (OFF)
                                    </Tag>
                                  );
                                }
                                return (
                                  <Tag color="warning" className="text-[11px] m-0">
                                    Nghỉ (OFF)
                                  </Tag>
                                );
                              },
                            },
                            {
                              title: 'Lương Ngày',
                              dataIndex: 'dailySalary',
                              key: 'dailySalary',
                              align: 'right' as const,
                              width: 120,
                              render: (val: number) => (
                                <span
                                  className={`tabular-nums font-semibold text-xs ${
                                    val > 0 ? 'text-blue-500' : 'text-slate-400'
                                  }`}
                                >
                                  {val > 0 ? formatCurrency(val) : '0 ₫'}
                                </span>
                              ),
                            },
                            {
                              title: 'Ngoại Lệ',
                              key: 'exceptionAction',
                              align: 'center' as const,
                              width: 120,
                              render: (_: any, r: BkWorkLogRecord) => {
                                if (workLogData.canManageExceptions) {
                                  return (
                                    <Button
                                      size="small"
                                      type={r.exception ? 'primary' : 'default'}
                                      ghost={!!r.exception}
                                      icon={<EditOutlined />}
                                      className="text-[11px] font-medium"
                                      onClick={() => openExceptionModal(r)}
                                    >
                                      {r.exception ? 'Sửa' : 'Duyệt'}
                                    </Button>
                                  );
                                }
                                return (
                                  <Tooltip title="Chỉ Quản lý (Manager) hoặc Admin mới có quyền thao tác">
                                    <span className="text-[11px] text-slate-400 italic">Chỉ xem</span>
                                  </Tooltip>
                                );
                              },
                            },
                          ]}
                        />
                      ),
                    },
                    {
                      key: 'audit',
                      label: (
                        <span className="flex items-center gap-1.5 font-medium">
                          <HistoryOutlined /> Lịch sử Audit Log ({workLogData.auditLogs?.length || 0})
                        </span>
                      ),
                      children: (
                        <Table
                          dataSource={workLogData.auditLogs || []}
                          rowKey="id"
                          size="small"
                          pagination={{ pageSize: 10 }}
                          bordered
                          locale={{ emptyText: 'Chưa có lịch sử điều chỉnh ngoại lệ chấm công' }}
                          columns={[
                            {
                              title: 'Thời Gian Chỉnh',
                              dataIndex: 'createdAt',
                              key: 'createdAt',
                              width: 150,
                              render: (val: string) => (
                                <span className="tabular-nums text-xs text-slate-600 dark:text-slate-300 font-mono">
                                  {dayjs(val).format('DD/MM/YYYY HH:mm:ss')}
                                </span>
                              ),
                            },
                            {
                              title: 'Ngày Làm Việc',
                              dataIndex: 'workDate',
                              key: 'workDate',
                              width: 110,
                              render: (val: string) => (
                                <span className="tabular-nums text-xs font-semibold">{val}</span>
                              ),
                            },
                            {
                              title: 'Hành Động',
                              dataIndex: 'action',
                              key: 'action',
                              width: 110,
                              align: 'center' as const,
                              render: (val: string) =>
                                val === 'CREATE' ? (
                                  <Tag color="blue">Thêm mới</Tag>
                                ) : val === 'UPDATE' ? (
                                  <Tag color="orange">Cập nhật</Tag>
                                ) : (
                                  <Tag color="red">Xóa</Tag>
                                ),
                            },
                            {
                              title: 'Trạng Thái Trước → Sau',
                              key: 'statusChange',
                              width: 220,
                              render: (_: any, r: SafeAny) => {
                                const prevLabel = r.previousType
                                  ? TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[r.previousType]?.shortLabel || r.previousType
                                  : 'Mặc định';
                                const nextLabel = r.newType
                                  ? TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[r.newType]?.shortLabel || r.newType
                                  : 'Mặc định';
                                return (
                                  <span className="text-xs">
                                    <span className="text-slate-400">{prevLabel}</span> →{' '}
                                    <strong className="text-emerald-500">{nextLabel}</strong>
                                  </span>
                                );
                              },
                            },
                            {
                              title: 'Lý Do & Chi Tiết Bổ Sung',
                              key: 'reasonDetails',
                              render: (_: any, r: SafeAny) => (
                                <div className="space-y-1">
                                  <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                    {r.reason}
                                  </div>
                                  {(r.manualInTime || r.manualOutTime) && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <Tag color="cyan" className="tabular-nums font-mono text-[10px] m-0">
                                        IN: {r.manualInTime || '--'} · OUT: {r.manualOutTime || '--'}
                                      </Tag>
                                      {r.note && <span className="text-[11px] text-slate-400 italic">({r.note})</span>}
                                    </div>
                                  )}
                                </div>
                              ),
                            },
                            {
                              title: 'Người Chỉnh',
                              dataIndex: 'performedByName',
                              key: 'performedByName',
                              width: 130,
                              render: (val: string) => (
                                <span className="text-xs font-semibold text-blue-500">{val || 'Quản lý'}</span>
                              ),
                            },
                          ]}
                        />
                      ),
                    },
                  ]}
                />
              ) : (
                <Table
                  dataSource={workLogData.data}
                  rowKey="workDate"
                  size="small"
                  pagination={{ pageSize: 15, showSizeChanger: true, pageSizeOptions: ['15', '31', '50'] }}
                  bordered
                  columns={[
                    {
                      title: 'Ngày Làm Việc',
                      dataIndex: 'workDate',
                      key: 'workDate',
                      width: 140,
                      render: (val: string, r: BkWorkLogRecord) => (
                        <div className="flex flex-col">
                          <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200 text-xs">
                            {val}
                          </span>
                          <span className="text-[11px] text-slate-500">{r.dayOfWeek}</span>
                        </div>
                      ),
                    },
                    {
                      title: 'Giờ Vào (IN)',
                      dataIndex: 'firstIn',
                      key: 'firstIn',
                      align: 'center' as const,
                      width: 130,
                      render: (val: string | null) =>
                        val ? (
                          <Tag
                            color="green"
                            className="tabular-nums font-mono font-semibold m-0 text-xs py-0.5 px-2 inline-flex items-center"
                          >
                            <LoginOutlined className="mr-1" /> {val}
                          </Tag>
                        ) : (
                          <Tag className="tabular-nums text-slate-400 m-0 text-[11px]">Chưa quẹt IN</Tag>
                        ),
                    },
                    {
                      title: 'Giờ Ra (OUT)',
                      dataIndex: 'lastOut',
                      key: 'lastOut',
                      align: 'center' as const,
                      width: 130,
                      render: (val: string | null) =>
                        val ? (
                          <Tag
                            color="volcano"
                            className="tabular-nums font-mono font-semibold m-0 text-xs py-0.5 px-2 inline-flex items-center"
                          >
                            <LogoutOutlined className="mr-1" /> {val}
                          </Tag>
                        ) : (
                          <Tag className="tabular-nums text-slate-400 m-0 text-[11px]">Chưa quẹt OUT</Tag>
                        ),
                    },
                    {
                      title: 'Thời Gian Làm',
                      dataIndex: 'workingMinute',
                      key: 'workingMinute',
                      align: 'right' as const,
                      width: 130,
                      render: (val: number, r: BkWorkLogRecord) => (
                        <div className="text-right">
                          <span className="tabular-nums font-semibold text-xs text-slate-700 dark:text-slate-300">
                            {val > 0 ? `${val} phút` : '--'}
                          </span>
                          {val > 0 && <span className="block text-[10px] text-slate-400">({r.totalHours}h)</span>}
                        </div>
                      ),
                    },
                    {
                      title: 'Trạng Thái',
                      dataIndex: 'isCheckIn',
                      key: 'isCheckIn',
                      align: 'center' as const,
                      width: 130,
                      render: (isCheckIn: boolean, r: BkWorkLogRecord) => {
                        if (isCheckIn) {
                          return (
                            <Tag color="success" className="text-[11px] m-0">
                              Đủ công
                            </Tag>
                          );
                        }
                        if (r.dayOfWeek === 'Chủ Nhật') {
                          return (
                            <Tag color="default" className="text-[11px] m-0 text-slate-400">
                              Chủ Nhật (OFF)
                            </Tag>
                          );
                        }
                        return (
                          <Tag color="warning" className="text-[11px] m-0">
                            Nghỉ (OFF)
                          </Tag>
                        );
                      },
                    },
                    {
                      title: 'Lương Ngày',
                      dataIndex: 'dailySalary',
                      key: 'dailySalary',
                      align: 'right' as const,
                      width: 130,
                      render: (val: number) => (
                        <span
                          className={`tabular-nums font-semibold text-xs ${
                            val > 0 ? 'text-blue-500' : 'text-slate-400'
                          }`}
                        >
                          {val > 0 ? formatCurrency(val) : '0 ₫'}
                        </span>
                      ),
                    },
                  ]}
                />
              )}
            </div>
          ) : null}
        </Modal>
      )}

      {/* Modal Duyệt / Chỉnh sửa Ngoại lệ Chấm công (MOS-BUG-88) */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <EditOutlined className="text-amber-500 text-lg" />
            <span>
              Ngoại lệ chấm công: <strong className="text-blue-500">{selectedWorkLog?.workDate}</strong> (
              {selectedWorkLog?.dayOfWeek})
            </span>
          </div>
        }
        open={exceptionModalOpen}
        onCancel={() => setExceptionModalOpen(false)}
        footer={null}
        width={560}
        destroyOnHidden
      >
        {selectedWorkLog && workLogData && (
          <div className="space-y-4 py-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Nhân viên:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {workLogRecord?.staffName} ·{' '}
                  <Tag color="cyan" className="m-0 text-[10px]">
                    Telesales Executive
                  </Tag>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Dữ liệu máy quẹt thẻ:</span>
                <span className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                  IN: {selectedWorkLog.firstIn || 'Chưa quẹt'} · OUT: {selectedWorkLog.lastOut || 'Chưa quẹt'} (
                  {selectedWorkLog.workingMinute} phút)
                </span>
              </div>
              <div className="text-[11px] text-slate-400 italic">
                * Giờ Check-in / Check-out thực tế trên hệ thống được giữ nguyên 100% để đối soát.
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Loại ngoại lệ chấm công <span className="text-rose-500">*</span>:
              </label>
              <Select
                value={exceptionType}
                onChange={(val) => setExceptionType(val as any)}
                className="w-full"
                options={[
                  ...Object.values(TELESALES_ATTENDANCE_EXCEPTION_OPTIONS).map((opt) => ({
                    value: opt.type,
                    label: (
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{opt.label}</span>
                        <Tag color={opt.badgeColor} className="m-0 text-[10px]">
                          {opt.badgeText}
                        </Tag>
                      </div>
                    ),
                  })),
                  ...(selectedWorkLog.exception
                    ? [
                        {
                          value: 'CLEAR' as const,
                          label: <span className="text-slate-400">(Hủy ngoại lệ · Quay về chấm công theo máy)</span>,
                        },
                      ]
                    : []),
                ]}
              />
            </div>

            {exceptionType === 'MANUAL_CHECKIN_OUT' && (
              <div className="space-y-3 p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800/50">
                <div className="text-[11px] text-cyan-800 dark:text-cyan-300 font-medium flex items-center gap-1.5">
                  <InfoCircleOutlined />
                  <span>
                    Dữ liệu gốc máy chấm công được giữ nguyên để đối soát. IN/OUT bổ sung được đánh dấu Manual / Manager
                    Approved.
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <LoginOutlined className="text-emerald-500" /> Giờ IN bổ sung{' '}
                      <span className="text-rose-500">*</span>:
                    </label>
                    <Input
                      placeholder="HH:mm (VD: 08:00)"
                      value={manualInTime}
                      onChange={(e) => setManualInTime(e.target.value)}
                      className="tabular-nums font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <LogoutOutlined className="text-volcano-500" /> Giờ OUT bổ sung{' '}
                      <span className="text-rose-500">*</span>:
                    </label>
                    <Input
                      placeholder="HH:mm (VD: 17:00)"
                      value={manualOutTime}
                      onChange={(e) => setManualOutTime(e.target.value)}
                      className="tabular-nums font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Ghi chú thêm (nếu cần):
                  </label>
                  <Input
                    placeholder="Ghi chú nội bộ cho ca làm việc..."
                    value={exceptionNote}
                    onChange={(e) => setExceptionNote(e.target.value)}
                    maxLength={200}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>
                  Lý do duyệt ngoại lệ <span className="text-rose-500">*</span>:
                </span>
                <span className="text-[11px] text-slate-400 font-normal">Bắt buộc nhập lý do</span>
              </label>
              <Input.TextArea
                rows={3}
                placeholder={
                  exceptionType === 'MANUAL_CHECKIN_OUT'
                    ? 'Nhân viên có đi làm thực tế, chấm công lỗi không ghi nhận IN/OUT. Manager xác nhận.'
                    : 'Ví dụ: Đau bụng – xin OFF buổi sáng, Manager duyệt'
                }
                value={exceptionReason}
                onChange={(e) => setExceptionReason(e.target.value)}
                maxLength={500}
                showCount
              />
            </div>

            {/* Preview Box */}
            {(() => {
              const opt = exceptionType !== 'CLEAR' ? TELESALES_ATTENDANCE_EXCEPTION_OPTIONS[exceptionType] : null;
              const credit = opt ? opt.workCredit : selectedWorkLog.isCheckIn ? 1.0 : 0.0;
              const dailyRate =
                workLogData.standardWorkDays > 0
                  ? Math.round(workLogData.monthlyBaseSalary / workLogData.standardWorkDays)
                  : 0;
              const previewDailySalary = Math.round(credit * dailyRate);

              return (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1.5 tabular-nums">
                  <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <InfoCircleOutlined />
                    <span>Xem trước kết quả tự động tính lại:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="text-slate-500">Ngày công tính lại:</span>{' '}
                      <strong className="text-blue-600 dark:text-blue-400 font-bold">{credit} ngày công</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Lương ngày tính lại:</span>{' '}
                      <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatCurrency(previewDailySalary)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-700">
              {selectedWorkLog.exception ? (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  loading={savingException}
                  onClick={() => handleSaveException('CLEAR')}
                >
                  Hủy ngoại lệ
                </Button>
              ) : (
                <div />
              )}
              <Space>
                <Button onClick={() => setExceptionModalOpen(false)}>Đóng</Button>
                <Button type="primary" loading={savingException} onClick={() => handleSaveException()}>
                  Lưu ngoại lệ
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
