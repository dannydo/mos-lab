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
} from '@ant-design/icons';
import {
  CcPaystubRecord,
  CcPaystubResponse,
  CcWorkLogDetailRecord,
  CcWorkLogDetailResponse,
  ReportPeriodComparison,
  removeVietnameseTones,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import dayjs from 'dayjs';
import CcAvatar from './CcAvatar';
import CcPeriodComparison from './CcPeriodComparison';
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
    totalHolidayBasePay: 0,
    totalHolidayPremiumPay: 0,
    totalHolidayPayrollAddition: 0,
    totalDiamondBonus: 0,
    grandTotalIncome: 0,
  });

  const [searchText, setSearchText] = useState('');

  // Individual Paystub Detail Modal State
  const [selectedRecord, setSelectedRecord] = useState<CcPaystubRecord | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
          const totalInc =
            (r.hourlyWage || 0) +
            (r.ccXoayBonus || 0) +
            (r.comboProductBonus || 0) +
            (r.ccTipBonus || 0) +
            (r.minigameBonus || 0) +
            (r.holidayPaystubAdjustment || 0) +
            dInfo.thuong;

          return {
            ...r,
            diamondBonus: dInfo.thuong,
            diamondCount: dInfo.cnt,
            totalIncome: totalInc,
          };
        });

        setPaystubData(enrichedData);

        if (res.summary) {
          const comparisonPaystub = comparisonResults?.[0]?.summary;
          const comparisonDiamondBonus = comparisonResults?.[1]?.totalDiamondBonus || 0;
          setSummary({
            totalHourlyWage: res.summary.totalHourlyWage || 0,
            totalCcXoayBonus: res.summary.totalCcXoayBonus || 0,
            totalComboProductBonus: res.summary.totalComboProductBonus || 0,
            totalMinigameBonus: res.summary.totalMinigameBonus || 0,
            totalCcTipBonus: res.summary.totalCcTipBonus || 0,
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
      render: (val: number, record: CcPaystubRecord) => (
        <Tooltip title={`Click để xem Chi Tiết Ca Check-in Xoay (${record.checkinCount} lượt check-in)`}>
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
            <div
              className={`text-[11px] tabular-nums flex items-center justify-end gap-1 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}
            >
              <span>({record.checkinCount} lượt)</span>
              <EyeOutlined
                className={`text-[10px] opacity-75 group-hover:opacity-100 transition-opacity ${isDark ? 'text-purple-300' : 'text-purple-600'}`}
              />
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Thưởng Combo & SP',
      dataIndex: 'comboProductBonus',
      key: 'comboProductBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => (
        <Tooltip title={`${record.comboCount} combo + ${record.productCount} sản phẩm`}>
          <div className="text-right">
            <span
              className={`tabular-nums whitespace-nowrap font-bold text-sm ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}
            >
              +{formatVND(val)}
            </span>
            <div className={`text-[11px] tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
              ({record.comboCount} combo / {record.productCount} SP)
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Thưởng CC Tip (20%)',
      dataIndex: 'ccTipBonus',
      key: 'ccTipBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => (
        <Tooltip title={`Nhận 20% tiền tip từ ${record.tippedVisitsCount || 0} lượt khách`}>
          <div className="text-right">
            <span
              className={`tabular-nums whitespace-nowrap font-bold text-sm ${isDark ? 'text-amber-300' : 'text-amber-600'}`}
            >
              +{formatVND(val)}
            </span>
            <div className={`text-[11px] tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
              ({record.tippedVisitsCount || 0} ca tip)
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Thưởng Kim Cương',
      dataIndex: 'diamondBonus',
      key: 'diamondBonus',
      align: 'right' as const,
      render: (val: number, record: CcPaystubRecord) => (
        <Tooltip title={`Giới thiệu ${record.diamondCount || 0} khách hàng mới`}>
          <div className="text-right">
            <span
              className={`tabular-nums whitespace-nowrap font-bold text-sm ${isDark ? 'text-cyan-300' : 'text-cyan-600'}`}
            >
              +{formatVND(val)}
            </span>
            <div className={`text-[11px] tabular-nums ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
              ({record.diamondCount || 0} khách 💎)
            </div>
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Thưởng Nóng Minigame',
      dataIndex: 'minigameBonus',
      key: 'minigameBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span
          className={`tabular-nums whitespace-nowrap font-bold text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
        >
          +{formatVND(val)}
        </span>
      ),
    },
    {
      title: 'Tổng Thu Nhập Tạm Tính',
      dataIndex: 'totalIncome',
      key: 'totalIncome',
      align: 'right' as const,
      render: (val: number) => (
        <span
          className={`tabular-nums whitespace-nowrap font-extrabold text-base ${isDark ? 'text-amber-300' : 'text-amber-600'}`}
        >
          {formatVND(val)}
        </span>
      ),
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
          style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000', fontWeight: '500' }}
        >
          Chi Tiết
        </Button>
      ),
    },
  ];

  // Paystub detail modal breakdown items
  const modalPaystubDetails = selectedRecord
    ? [
        {
          key: 1,
          item: 'Lương Cứng Cơ Bản (Wage)',
          amount: selectedRecord.hourlyWage,
          note: `${selectedRecord.totalWorkHours} giờ làm việc @ ${(selectedRecord.hourlyRate || 25000).toLocaleString('vi-VN')}đ/h`,
        },
        {
          key: 2,
          item: 'Thưởng CC Xoay (Lượt Khách Check-in)',
          amount: selectedRecord.ccXoayBonus,
          note: `Bóc tách ${selectedRecord.checkinCount} lượt check-in`,
        },
        {
          key: 3,
          item: 'Thưởng Bán Combo & Sản Phẩm',
          amount: selectedRecord.comboProductBonus,
          note: `${selectedRecord.comboCount} combo + ${selectedRecord.productCount} sản phẩm`,
        },
        {
          key: 4,
          item: 'Thưởng CC Tip (20% Tip Share)',
          amount: selectedRecord.ccTipBonus || 0,
          note: `Thực nhận 20% tip từ ${selectedRecord.tippedVisitsCount || 0} lượt khách cho`,
        },
        {
          key: 5,
          item: 'Thưởng CT Kim Cương (Giới thiệu KH)',
          amount: selectedRecord.diamondBonus || 0,
          note: `Giới thiệu ${selectedRecord.diamondCount || 0} khách hàng mới`,
        },
        {
          key: 'holiday-base',
          item: 'Lương ngày lễ 1x',
          amount: selectedRecord.holidayBasePay || 0,
          note: `${selectedRecord.holidayWorkedHours || 0} giờ đi làm + ${selectedRecord.holidayPaidLeaveHours || 0} giờ nghỉ lễ; 1x giờ làm đã nằm trong Lương giờ`,
        },
        {
          key: 'holiday-premium',
          item: 'Phụ cấp đi làm lễ x3',
          amount: selectedRecord.holidayPremiumPay || 0,
          note: `${selectedRecord.holidayWorkedDays || 0} ngày có roster và chấm công hợp lệ`,
        },
        { key: 6, item: 'Thưởng Kỹ Thuật & Gamification Points', amount: 0, note: 'Điểm kỹ thuật quy đổi' },
        { key: 7, item: 'Thưởng Nóng Minigame', amount: selectedRecord.minigameBonus, note: 'Vượt mốc minigame tuần' },
      ]
    : [];

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
                color: isDark ? '#fbbf24' : '#d4a84b',
                fontVariantNumeric: 'tabular-nums',
              }}
              prefix={<DollarOutlined />}
            />
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
            style={{ background: token.colorBgContainer, borderColor: isDark ? '#fbbf24' : '#d4a84b' }}
          >
            <Statistic
              title="Thu Nhập"
              value={summary.grandTotalIncome}
              suffix="đ"
              precision={0}
              valueStyle={{
                fontSize: '15px',
                color: isDark ? '#fde047' : '#d4a84b',
                fontWeight: 'bold',
                fontVariantNumeric: 'tabular-nums',
              }}
              prefix={<WalletOutlined />}
            />
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
        style={{ background: token.colorBgContainer, borderColor: isDark ? '#fbbf24' : '#d4a84b' }}
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
              renderRecord={(record, index) => (
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
                      { label: 'Lương giờ', value: record.hourlyWage || 0, color: 'text-sky-500 dark:text-sky-400' },
                      { label: 'Xoay', value: record.ccXoayBonus || 0, color: 'text-purple-500 dark:text-purple-400' },
                      {
                        label: 'Combo & SP',
                        value: record.comboProductBonus || 0,
                        color: 'text-emerald-500 dark:text-emerald-400',
                      },
                      { label: 'Tip', value: record.ccTipBonus || 0, color: 'text-amber-600 dark:text-amber-300' },
                      {
                        label: 'Kim cương',
                        value: record.diamondBonus || 0,
                        color: 'text-cyan-500 dark:text-cyan-300',
                      },
                      {
                        label: 'Minigame',
                        value: record.minigameBonus || 0,
                        color: 'text-yellow-600 dark:text-yellow-300',
                      },
                      {
                        label: 'Phụ cấp lễ x3',
                        value: record.holidayPremiumPay || 0,
                        color: 'text-rose-500 dark:text-rose-300',
                      },
                    ].map((income) => (
                      <div className="min-w-0" key={income.label}>
                        <dt className="truncate text-[10px] leading-4 text-slate-500" title={income.label}>
                          {income.label}
                        </dt>
                        <Tooltip title={`${income.label}: +${formatVND(income.value)}`}>
                          <dd className={`truncate whitespace-nowrap text-xs font-bold tabular-nums ${income.color}`}>
                            +{formatCompactVND(income.value)}
                          </dd>
                        </Tooltip>
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
              )}
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

      {/* INDIVIDUAL CC PAYSTUB DETAIL MODAL */}
      {selectedRecord && (
        <Modal
          open={modalOpen}
          onCancel={() => setModalOpen(false)}
          width={700}
          title={
            <div className="flex items-center gap-2">
              <WalletOutlined className="text-amber-500 text-xl" />
              <span className="font-bold text-lg">Phiếu Lương Live - CC: {selectedRecord.displayName}</span>
              <Tag color={selectedRecord.store === 'PXL' ? 'blue' : 'purple'}>CN: {selectedRecord.store}</Tag>
            </div>
          }
          footer={[
            <Button
              key="close"
              type="primary"
              onClick={() => setModalOpen(false)}
              style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
            >
              Đóng Phiếu Lương
            </Button>,
          ]}
        >
          <Table
            dataSource={modalPaystubDetails}
            pagination={false}
            size="small"
            bordered
            className="antd-custom-table my-4"
            columns={[
              {
                title: 'Khoản Thu Nhập',
                dataIndex: 'item',
                key: 'item',
                render: (val: string) => <span className="font-semibold">{val}</span>,
              },
              {
                title: 'Số Tiền (đ)',
                dataIndex: 'amount',
                key: 'amount',
                align: 'right' as const,
                render: (val: number) => (
                  <span className="tabular-nums whitespace-nowrap font-bold text-emerald-500">+{formatVND(val)}</span>
                ),
              },
              {
                title: 'Ghi Chú',
                dataIndex: 'note',
                key: 'note',
                render: (val: string) => (
                  <Text type="secondary" className="text-xs">
                    {val}
                  </Text>
                ),
              },
            ]}
          />

          <Divider style={{ margin: '16px 0' }} />

          <div className="flex justify-between items-center px-4 py-2 bg-amber-500/10 rounded-lg">
            <div>
              <Text type="secondary" className="text-xs font-bold uppercase text-amber-500">
                ∑ THU NHẬP TẠM TÍNH (LIVE SALARY):
              </Text>
              <div className="text-xs text-gray-400">
                Bao gồm lương cứng ca làm, CC Bonus Xoay, thưởng Combo/SP, Points và Minigame
              </div>
            </div>
            <div className="tabular-nums whitespace-nowrap text-2xl font-extrabold text-amber-500">
              {formatVND(selectedRecord.totalIncome)}
            </div>
          </div>
        </Modal>
      )}

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
                rowKey={(r) => `${r.work_date || ''}-${r.first_in || ''}`}
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
              <Button
                type="primary"
                onClick={() => setWorkLogModalOpen(false)}
                style={{ background: '#D4A84B', borderColor: '#D4A84B', color: '#000' }}
              >
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
    </div>
  );
}
