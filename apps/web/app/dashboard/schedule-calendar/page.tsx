'use client';
// Force Turbopack recompile v2
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react';
import {
  Card,
  Space,
  Button,
  Radio,
  DatePicker,
  Select,
  Input,
  Segmented,
  Typography,
  Tag,
  Row,
  Col,
  Spin,
  message,
  Tooltip,
  theme,
  Modal,
} from 'antd';
import {
  CalendarOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import nextDynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';
import { apiClient } from '../../../lib/api-client';
import { Appointment } from '@mos-lab/shared';
import { removeVietnameseTones, vietnameseSearchFilter } from '../../../lib/utils/search';
import { formatVND } from '../../../lib/format-utils';
import { isStaffOffOnDate, formatOrGenerateCustomerPhone } from '../../../components/booking/constants';

import ScheduleListView from './components/ScheduleListView';
import MultiDayColumnView, { getBranchBadgeInfo } from './components/MultiDayColumnView';
import FullCalendarGrid from './components/FullCalendarGrid';

const CustomerDetailDrawer = nextDynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = nextDynamic(() => import('../../../components/BookingWizardDrawer'), { ssr: false });
const RescheduleBookingModal = nextDynamic(
  () => import('../../../components/RescheduleBookingModal').then((m) => m.RescheduleBookingModal),
  { ssr: false }
);

dayjs.extend(isoWeek);
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

export default function ScheduleCalendarPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();

  // View state: 'overview' | 'list' | 'grid'
  const [viewMode, setViewMode] = useState<'overview' | 'list' | 'grid'>('overview');

  // Date range state
  const [startDate, setStartDate] = useState<Dayjs>(dayjs());
  const [daysCount, setDaysCount] = useState<number>(5);
  const [dateRangePreset, setDateRangePreset] = useState<string>('next5');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);

  // Filters state
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Staff options
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

  // Appointments data
  const [loading, setLoading] = useState<boolean>(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyCapacities, setDailyCapacities] = useState<
    Record<
      string,
      {
        workingKtvCount: number;
        maxCapacity: number;
        workingStaffList?: Array<{
          id: number;
          name: string;
          branchName?: string;
          shift?: string;
          bookedCount?: number;
          doneCount?: number;
          avgDurationMinutes?: { normalAvg?: number; retainAvg?: number; removalAvg?: number; overallAvg?: number };
        }>;
        offStaffList?: Array<{ id: number; name: string; branchName?: string; reason: string; type?: string }>;
      }
    >
  >({});
  const [totalAppointments, setTotalAppointments] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const branchCounts = useMemo(() => {
    const counts = { all: appointments.length, EP: 0, DT: 0, PXL: 0 };
    appointments.forEach((appt) => {
      const b = getBranchBadgeInfo(appt.storeId, appt.branchName);
      if (b.code === 'EP') counts.EP++;
      else if (b.code === 'DT') counts.DT++;
      else if (b.code === 'PXL') counts.PXL++;
    });
    return counts;
  }, [appointments]);

  const maxCapacityPerDay = useMemo(() => {
    if (selectedBranch === 'EP') return 25;
    if (selectedBranch === 'DT') return 20;
    if (selectedBranch === 'PXL') return 15;
    return 25;
  }, [selectedBranch]);

  // Modal / Drawer states
  const [detailCustomerId, setDetailCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState<boolean>(false);

  const [bookingWizardOpen, setBookingWizardOpen] = useState<boolean>(false);
  const [bookingInitialCustomer, setBookingInitialCustomer] = useState<any>(null);

  const [rescheduleModalOpen, setRescheduleModalOpen] = useState<boolean>(false);
  const [selectedRescheduleAppt, setSelectedRescheduleAppt] = useState<Appointment | null>(null);

  // Pre-Reschedule Off-Day Warning Interception Modal States
  const [preOffDayModalOpen, setPreOffDayModalOpen] = useState<boolean>(false);
  const [preOffDayAppt, setPreOffDayAppt] = useState<any | null>(null);
  const [preOffDayTargetDate, setPreOffDayTargetDate] = useState<string | null>(null);
  const [preOffDayTargetTime, setPreOffDayTargetTime] = useState<string | null>(null);
  const [preOffDayNextWorkingDate, setPreOffDayNextWorkingDate] = useState<Dayjs | null>(null);

  const handleRescheduleRequest = useCallback((appt: any, newDateTime?: string) => {
    if (!appt) return;

    let targetDateStr = appt.targetBookingDate || appt.bookingDate || appt.bookingDateStart;
    let targetTimeStr = appt.targetBookingTime || appt.bookingTime;

    if (newDateTime) {
      const targetDay = dayjs(newDateTime);
      targetDateStr = targetDay.format('YYYY-MM-DD');
      targetTimeStr = targetDay.format('HH:mm');
    }

    const bDate = targetDateStr ? dayjs(targetDateStr) : dayjs();

    const assignedStaff = appt.technicianId
      ? {
          id: appt.technicianId,
          displayName: appt.technicianName || 'Trancy',
          offDays: appt.technicianOffDays || ['2'],
        }
      : appt.technicianName
        ? { displayName: appt.technicianName, offDays: ['2'] }
        : null;

    const isOff = assignedStaff ? isStaffOffOnDate(assignedStaff, bDate) : false;

    if (isOff) {
      let nextDate = bDate.clone().add(1, 'day');
      for (let i = 0; i < 7; i++) {
        if (!assignedStaff || !isStaffOffOnDate(assignedStaff, nextDate)) break;
        nextDate = nextDate.add(1, 'day');
      }

      setPreOffDayAppt(appt);
      setPreOffDayTargetDate(targetDateStr);
      setPreOffDayTargetTime(targetTimeStr);
      setPreOffDayNextWorkingDate(nextDate);
      setPreOffDayModalOpen(true);
      return;
    }

    setSelectedRescheduleAppt({
      ...appt,
      targetBookingDate: targetDateStr,
      targetBookingTime: targetTimeStr,
    });
    setRescheduleModalOpen(true);
  }, []);

  if (typeof window !== 'undefined') {
    (window as any).__testHandleReschedule = handleRescheduleRequest;
  }

  // Fetch staff list for filter
  useEffect(() => {
    apiClient.staff
      .list()
      .then((res: any[]) => {
        if (Array.isArray(res)) {
          const mapped = res.map((s) => ({
            id: String(s.id),
            name: s.displayName || s.username || `Staff #${s.id}`,
          }));
          setStaffList(mapped);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch staff list:', err);
      });
  }, []);

  // Compute calculated Date Range bounds
  const computedDateRange = useMemo<[Dayjs, Dayjs]>(() => {
    if (customRange) return customRange;

    if (dateRangePreset === 'today') {
      return [startDate.startOf('day'), startDate.endOf('day')];
    } else if (dateRangePreset === 'next3') {
      return [startDate.startOf('day'), startDate.clone().add(2, 'day').endOf('day')];
    } else if (dateRangePreset === 'next5') {
      return [startDate.startOf('day'), startDate.clone().add(4, 'day').endOf('day')];
    } else if (dateRangePreset === 'next7') {
      return [startDate.startOf('day'), startDate.clone().add(6, 'day').endOf('day')];
    } else if (dateRangePreset === 'thisWeek') {
      return [startDate.startOf('isoWeek'), startDate.endOf('isoWeek')];
    } else if (dateRangePreset === 'thisMonth') {
      return [startDate.startOf('month'), startDate.endOf('month')];
    }
    return [
      startDate.startOf('day'),
      startDate
        .clone()
        .add(daysCount - 1, 'day')
        .endOf('day'),
    ];
  }, [startDate, daysCount, dateRangePreset, customRange]);

  // In-memory cache for loaded API responses
  const appointmentsCacheRef = useRef<Map<string, { data: Appointment[]; dailyCapacities: any; total: number }>>(
    new Map()
  );

  // Deferred search query for smooth 60 FPS input typing
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Fetch appointments from Backend API
  const fetchAppointments = useCallback(async () => {
    try {
      const [start, end] = computedDateRange;
      const params: Record<string, any> = {
        dateFrom: start.format('YYYY-MM-DD 00:00:00'),
        dateTo: end.format('YYYY-MM-DD 23:59:59'),
        page: viewMode === 'list' ? currentPage : 1,
        pageSize: viewMode === 'list' ? pageSize : 500,
        limit: viewMode === 'list' ? pageSize : 500,
      };

      const cacheKey = `${params.dateFrom}_${params.dateTo}_${params.staffId || 'all'}_${viewMode}_${currentPage}_${pageSize}`;
      if (appointmentsCacheRef.current.has(cacheKey)) {
        const cached = appointmentsCacheRef.current.get(cacheKey)!;
        setAppointments(cached.data);
        setDailyCapacities(cached.dailyCapacities);
        setTotalAppointments(cached.total);
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await apiClient.customers.getAppointments(params);
      const rawData = (res.data || []).map((item: any) => ({
        ...item,
        customerPhone: formatOrGenerateCustomerPhone(item),
      }));
      const caps = res.dailyCapacities || {};
      const tot = res.total || rawData.length;

      appointmentsCacheRef.current.set(cacheKey, { data: rawData, dailyCapacities: caps, total: tot });
      setAppointments(rawData);
      setDailyCapacities(caps);
      setTotalAppointments(tot);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  }, [computedDateRange, viewMode, currentPage, pageSize, selectedStaffId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Listen for real-time booking updates and clear stale cache
  useEffect(() => {
    const handleDataChanged = () => {
      appointmentsCacheRef.current.clear();
      fetchAppointments();
    };

    window.addEventListener('mos-booking-updated', handleDataChanged);
    window.addEventListener('mos-data-updated', handleDataChanged);
    return () => {
      window.removeEventListener('mos-booking-updated', handleDataChanged);
      window.removeEventListener('mos-data-updated', handleDataChanged);
    };
  }, [fetchAppointments]);

  // Filtered appointments client-side for fast search, branch, status, and channel filter
  const filteredAppointments = useMemo(() => {
    console.log('DBG FILTER RUNNING:', {
      appointmentsLen: appointments.length,
      searchQuery,
      selectedBranch,
      selectedStatus,
      selectedChannel,
    });
    return appointments.filter((appt) => {
      // Branch filter
      if (selectedBranch !== 'all') {
        const b = getBranchBadgeInfo(appt.storeId, appt.branchName);
        if (b.code !== selectedBranch) return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'Pending') {
          if (appt.orderState !== 'Pending' && appt.orderState !== 'New' && appt.orderState !== 'Confirmed')
            return false;
        } else if (selectedStatus === 'Missed') {
          if (appt.orderState !== 'Missed' && appt.orderState !== 'Cancelled') return false;
        } else if (appt.orderState !== selectedStatus) {
          return false;
        }
      }

      // Channel filter
      if (selectedChannel !== 'all' && appt.bookingChannel !== selectedChannel) {
        return false;
      }

      // Search query filter (search customerName, phone, serviceName, technicianName, bookerName, note, orderKey, channel, branch)
      if (searchQuery.trim()) {
        const q = removeVietnameseTones(searchQuery);
        if (q) {
          const searchTargets = [
            appt.customerName,
            (appt as any).userName,
            appt.customerPhone,
            (appt as any).phone,
            appt.serviceName,
            (appt as any).packageName,
            (appt as any).service,
            appt.technicianName,
            appt.bookerName,
            appt.bookingNote,
            appt.orderKey,
            appt.id,
            appt.branchName,
            appt.bookingChannel,
          ];

          const match = searchTargets.some((target) => {
            if (target === null || target === undefined) return false;
            return removeVietnameseTones(target).includes(q);
          });

          if (!match) return false;
        }
      }

      return true;
    });
  }, [appointments, selectedBranch, selectedStatus, selectedChannel, searchQuery]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dbg = {
        appointments,
        selectedBranch,
        selectedStatus,
        selectedChannel,
        searchQuery,
        filteredAppointments,
      };
      (window as any).__DEBUG_STATE = dbg;
      (document as any).__DEBUG_STATE = dbg;
    }
  }, [appointments, selectedBranch, selectedStatus, selectedChannel, searchQuery, filteredAppointments]);
  const statsSummary = useMemo(() => {
    const totalCount = filteredAppointments.length;
    const completedCount = filteredAppointments.filter((a) => a.orderState === 'Completed').length;
    const missedCount = filteredAppointments.filter(
      (a) => a.orderState === 'Missed' || a.orderState === 'Cancelled'
    ).length;
    const pendingCount = totalCount - completedCount - missedCount;
    const totalEstRev = filteredAppointments.reduce((sum, a) => sum + (a.totalPrice || (a as any).orderPrice || 0), 0);

    return {
      totalCount,
      completedCount,
      missedCount,
      pendingCount,
      totalEstRev,
    };
  }, [filteredAppointments]);

  // Handlers for Preset Buttons
  const handlePresetChange = (preset: string) => {
    setDateRangePreset(preset);
    setCustomRange(null);
    if (preset === 'next3') setDaysCount(3);
    else if (preset === 'next5') setDaysCount(5);
    else if (preset === 'next7') setDaysCount(7);
  };

  const handlePrevRange = () => {
    setStartDate((prev) => prev.clone().subtract(daysCount, 'day'));
  };

  const handleNextRange = () => {
    setStartDate((prev) => prev.clone().add(daysCount, 'day'));
  };

  const handleTodayReset = () => {
    setStartDate(dayjs());
    setDateRangePreset('next5');
    setDaysCount(5);
    setCustomRange(null);
  };

  return (
    <div className="schedule-calendar-page w-full p-4 md:p-6 space-y-5">
      {/* Header & Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <CalendarOutlined className="text-xl" />
            </div>
            <div>
              <Title level={4} className="!mb-0 !font-extrabold text-slate-800 dark:text-slate-100">
                Lịch & Công Suất Phục Vụ
              </Title>
              <Text type="secondary" className="text-xs">
                Theo dõi trực quan lịch hẹn, công suất lấp đầy và tổng quan các ngày tiếp theo
              </Text>
            </div>
          </div>
        </div>

        {/* Action Controls & View Mode Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="bg-emerald-500 hover:bg-emerald-600 border-none shadow-md shadow-emerald-500/20 font-semibold"
            onClick={() => {
              setBookingInitialCustomer(null);
              setBookingWizardOpen(true);
            }}
          >
            Đặt lịch mới
          </Button>

          <Segmented
            value={selectedBranch}
            onChange={(val) => setSelectedBranch(val as string)}
            options={[
              { label: `Tất cả Chi nhánh (${branchCounts.all})`, value: 'all' },
              { label: `EP (${branchCounts.EP})`, value: 'EP' },
              { label: `DT (${branchCounts.DT})`, value: 'DT' },
              { label: `PXL (${branchCounts.PXL})`, value: 'PXL' },
            ]}
            className="bg-slate-100 dark:bg-slate-800 p-1 font-semibold text-xs"
          />

          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as any)}
            options={[
              {
                label: 'Overview Đa cột',
                value: 'overview',
                icon: <AppstoreOutlined />,
              },
              {
                label: 'Danh sách',
                value: 'list',
                icon: <UnorderedListOutlined />,
              },
              {
                label: 'Lịch lưới',
                value: 'grid',
                icon: <CalendarOutlined />,
              },
            ]}
            className="bg-slate-100 dark:bg-slate-800 p-1 font-medium"
          />
        </div>
      </div>

      {/* Date Range Navigation & Summary Strip */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        {/* Controls Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Button icon={<LeftOutlined />} onClick={handlePrevRange} size="small" />
            <Button onClick={handleTodayReset} size="small" className="font-medium">
              Hôm nay
            </Button>
            <Button icon={<RightOutlined />} onClick={handleNextRange} size="small" />
            <span className="font-semibold text-sm text-slate-700 dark:text-slate-200 tabular-nums px-2">
              {computedDateRange[0].format('DD/MM/YYYY')} - {computedDateRange[1].format('DD/MM/YYYY')}
            </span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2">
            <Radio.Group
              value={dateRangePreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value="today">Hôm nay</Radio.Button>
              <Radio.Button value="next3">3 Ngày tới</Radio.Button>
              <Radio.Button value="next5">5 Ngày tới</Radio.Button>
              <Radio.Button value="next7">7 Ngày tới</Radio.Button>
              <Radio.Button value="thisWeek">Tuần này</Radio.Button>
              <Radio.Button value="thisMonth">Tháng này</Radio.Button>
            </Radio.Group>

            <RangePicker
              aria-label="Chọn khoảng ngày tìm kiếm"
              size="small"
              className="w-56"
              format="DD/MM/YYYY"
              value={customRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  setCustomRange([dates[0], dates[1]]);
                  setDateRangePreset('custom');
                } else {
                  setCustomRange(null);
                  setDateRangePreset('next5');
                }
              }}
            />

            <Tooltip title="Tải lại dữ liệu">
              <Button
                icon={<ReloadOutlined />}
                aria-label="Tải lại dữ liệu lịch hẹn"
                onClick={fetchAppointments}
                size="small"
                loading={loading}
              />
            </Tooltip>
          </div>
        </div>

        {/* Multi-dimensional Filters Row */}
        <div className="flex items-center gap-2.5 w-full">
          <Input
            id="calendar-search-input"
            name="calendarSearch"
            aria-label="Tìm theo Tên KH, SĐT, Dịch vụ"
            placeholder="Tìm theo Tên KH, SĐT, Dịch vụ..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 min-w-[200px]"
            allowClear
            size="small"
          />

          <Select
            aria-label="Lọc theo Chuyên viên"
            value={selectedStaffId}
            onChange={(val) => {
              setSelectedStaffId(val);
              setCurrentPage(1);
            }}
            size="small"
            className="w-44"
            options={[
              { value: 'all', label: 'Tất cả Chuyên viên' },
              ...staffList.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />

          <Select
            aria-label="Lọc theo trạng thái"
            value={selectedStatus}
            onChange={(val) => {
              setSelectedStatus(val);
              setCurrentPage(1);
            }}
            size="small"
            className="w-40"
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'Pending', label: 'Chờ check-in' },
              { value: 'Completed', label: 'Hoàn thành' },
              { value: 'Missed', label: 'Bỏ lỡ (Missed)' },
              { value: 'Cancelled', label: 'Đã hủy' },
            ]}
          />

          <Select
            aria-label="Lọc theo Kênh đặt"
            value={selectedChannel}
            onChange={(val) => {
              setSelectedChannel(val);
              setCurrentPage(1);
            }}
            size="small"
            className="w-40"
            options={[
              { value: 'all', label: 'Tất cả Kênh đặt' },
              { value: 'Facebook', label: 'Facebook' },
              { value: 'Zalo', label: 'Zalo' },
              { value: 'Call', label: 'Hotline / Gọi điện' },
              { value: 'Walk-in', label: 'Khách đến trực tiếp' },
            ]}
          />
        </div>

        {/* Summary Indicators Strip */}
        <div className="grid grid-cols-4 gap-3 pt-2">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <Text type="secondary" className="text-xs font-medium">
              Tổng lịch hẹn
            </Text>
            <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tabular-nums">
              {statsSummary.totalCount}
            </div>
          </div>
          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
            <Text type="secondary" className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              Hoàn thành
            </Text>
            <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              {statsSummary.completedCount}
            </div>
          </div>
          <div className="bg-blue-50/60 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100 dark:border-blue-900/40">
            <Text type="secondary" className="text-xs font-medium text-blue-600 dark:text-blue-400">
              Chờ check-in
            </Text>
            <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
              {statsSummary.pendingCount}
            </div>
          </div>
          <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/40">
            <Text type="secondary" className="text-xs font-medium text-amber-600 dark:text-amber-400">
              Dự kiến thu
            </Text>
            <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400 tabular-nums">
              {formatVND(statsSummary.totalEstRev)}
            </div>
          </div>
        </div>
      </div>

      {/* Main View Mode Area */}
      {viewMode === 'overview' && (
        <MultiDayColumnView
          loading={loading}
          startDate={computedDateRange[0]}
          daysCount={daysCount}
          maxCapacityPerDay={maxCapacityPerDay}
          dailyCapacities={dailyCapacities}
          appointments={filteredAppointments}
          onSelectSlot={(date, hour) => {
            setBookingInitialCustomer(null);
            setBookingWizardOpen(true);
          }}
          onViewCustomerDetail={(customerId) => {
            setDetailCustomerId(customerId);
            setCustomerDrawerOpen(true);
          }}
          onReschedule={(appt, newDateTime) => {
            handleRescheduleRequest(appt, newDateTime);
          }}
        />
      )}

      {viewMode === 'list' && (
        <ScheduleListView
          loading={loading}
          appointments={filteredAppointments}
          total={filteredAppointments.length}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={(page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          }}
          onViewCustomerDetail={(customerId) => {
            setDetailCustomerId(customerId);
            setCustomerDrawerOpen(true);
          }}
          onReschedule={(appt) => {
            handleRescheduleRequest(appt);
          }}
        />
      )}

      {viewMode === 'grid' && (
        <FullCalendarGrid
          loading={loading}
          referenceDate={startDate}
          appointments={filteredAppointments}
          onSelectDate={(date) => {
            setStartDate(date);
            setViewMode('overview');
          }}
          onViewCustomerDetail={(customerId) => {
            setDetailCustomerId(customerId);
            setCustomerDrawerOpen(true);
          }}
        />
      )}

      {/* PRE-RESCHEDULE OFF-DAY WARNING MODAL */}
      {preOffDayModalOpen && (
        <Modal
          open={preOffDayModalOpen}
          destroyOnClose
          onCancel={() => {
            setPreOffDayModalOpen(false);
            setPreOffDayAppt(null);
          }}
          width={500}
          zIndex={2000}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fa541c', fontSize: '15px' }}>
              <ExclamationCircleOutlined style={{ fontSize: '18px' }} />
              <span>⚠️ CẢNH BÁO CHUYÊN VIÊN NGHỈ TUẦN</span>
            </div>
          }
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setPreOffDayModalOpen(false);
                setPreOffDayAppt(null);
              }}
            >
              Hủy thao tác
            </Button>,
            <Button
              key="continue"
              type="primary"
              style={{ backgroundColor: '#D4A84B', borderColor: '#D4A84B' }}
              onClick={() => {
                const apptToPass = {
                  ...preOffDayAppt,
                  targetBookingDate: preOffDayTargetDate,
                  targetBookingTime: preOffDayTargetTime,
                  isOffDayDrop: true,
                };
                setPreOffDayModalOpen(false);
                setPreOffDayAppt(null);
                setTimeout(() => {
                  setSelectedRescheduleAppt(apptToPass);
                  setRescheduleModalOpen(true);
                }, 350);
              }}
            >
              Tiếp tục dời lịch
            </Button>,
          ]}
        >
          <div style={{ padding: '8px 0', fontSize: '14px', lineHeight: '1.6' }}>
            <p style={{ marginBottom: '12px' }}>
              Lịch hẹn của chị{' '}
              <strong>
                {preOffDayAppt?.customerName ||
                  preOffDayAppt?.customer_name ||
                  preOffDayAppt?.customer?.displayName ||
                  'Khách hàng'}
              </strong>{' '}
              đang được dời sang{' '}
              <strong style={{ color: '#fa541c' }}>
                {preOffDayTargetDate ? dayjs(preOffDayTargetDate).format('dddd (DD/MM/YYYY)') : 'ngày nghỉ'}
              </strong>{' '}
              – trùng với lịch nghỉ tuần cố định (<code>Off</code>) của{' '}
              <strong style={{ color: '#fa541c' }}>{preOffDayAppt?.technicianName || 'Trancy'}</strong>.
            </p>

            <div
              style={{
                padding: '12px 14px',
                borderRadius: '8px',
                backgroundColor: themeMode === 'dark' ? 'rgba(212, 168, 75, 0.12)' : '#fffbe6',
                border: `1px solid ${themeMode === 'dark' ? '#d4a84b' : '#ffe58f'}`,
                color: themeMode === 'dark' ? '#fef08a' : '#d48806',
                fontSize: '13px',
                marginBottom: '8px',
              }}
            >
              💡 <strong>Gợi ý:</strong> {preOffDayAppt?.technicianName || 'Trancy'} sẽ đi làm lại vào{' '}
              <strong>
                {preOffDayNextWorkingDate ? preOffDayNextWorkingDate.format('dddd - DD/MM/YYYY') : 'Thứ 4 (12/08/2026)'}
              </strong>
              .
            </div>
          </div>
        </Modal>
      )}

      {/* Drawers & Modals */}
      {customerDrawerOpen && (
        <CustomerDetailDrawer
          open={customerDrawerOpen}
          customerId={detailCustomerId}
          onClose={() => {
            setCustomerDrawerOpen(false);
            setDetailCustomerId(null);
          }}
          onUpdate={fetchAppointments}
          onBookAppointment={(cust) => {
            setCustomerDrawerOpen(false);
            setBookingInitialCustomer({
              id: cust.id,
              name: cust.name,
              phone: cust.phone,
              bucket: cust.bucket,
            });
            setBookingWizardOpen(true);
          }}
        />
      )}

      {bookingWizardOpen && (
        <BookingWizardDrawer
          open={bookingWizardOpen}
          initialCustomer={bookingInitialCustomer}
          onClose={() => {
            setBookingWizardOpen(false);
            setBookingInitialCustomer(null);
          }}
          onSuccess={fetchAppointments}
        />
      )}

      {rescheduleModalOpen && (
        <RescheduleBookingModal
          open={rescheduleModalOpen}
          booking={selectedRescheduleAppt}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedRescheduleAppt(null);
          }}
          onSuccess={fetchAppointments}
        />
      )}
    </div>
  );
}
