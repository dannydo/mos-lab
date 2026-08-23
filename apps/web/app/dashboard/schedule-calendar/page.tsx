'use client';
// Force Turbopack recompile v2
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback, useMemo, useRef, useDeferredValue } from 'react';
import { Button, DatePicker, Select, Segmented, Typography, Spin, message, Tooltip, theme } from 'antd';
import {
  CalendarOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  LeftOutlined,
  RightOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import nextDynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';
import { useMediaQuery, useResponsiveTier } from '../../../hooks/useResponsiveTier';
import { apiClient } from '../../../lib/api-client';
import { Appointment } from '@mos-lab/shared';
import { removeVietnameseTones, vietnameseSearchFilter } from '../../../lib/utils/search';
import { formatVND } from '../../../lib/format-utils';
import { isStaffOffOnDate, formatOrGenerateCustomerPhone } from '../../../components/booking/constants';
import { SearchField } from '~/components/ui';

import ScheduleListView from './components/ScheduleListView';
import MultiDayColumnView, { getBranchBadgeInfo } from './components/MultiDayColumnView';
import FullCalendarGrid from './components/FullCalendarGrid';
import { OffDayRescheduleWarningModal } from './components/OffDayRescheduleWarningModal';

const CustomerDetailDrawer = nextDynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = nextDynamic(() => import('../../../components/BookingWizardDrawer'), { ssr: false });
const RescheduleBookingModal = nextDynamic(
  () => import('../../../components/RescheduleBookingModal').then((m) => m.RescheduleBookingModal),
  { ssr: false }
);

dayjs.extend(isoWeek);
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const APPOINTMENTS_CACHE_MAX_ENTRIES = 24;

export default function ScheduleCalendarPage() {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const responsiveTier = useResponsiveTier();
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const usesAgendaComposition = responsiveTier === 'mobile' || (responsiveTier === 'tablet' && isPortrait);

  // View state: 'overview' | 'list' | 'grid'
  const [viewMode, setViewMode] = useState<'overview' | 'list' | 'grid'>('overview');

  // Date range state
  const [startDate, setStartDate] = useState<Dayjs>(dayjs());
  const [daysCount, setDaysCount] = useState<number>(5);
  const [dateRangePreset, setDateRangePreset] = useState<string>('next5');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);

  // Phones and portrait iPads start with a decision-oriented day agenda.  A
  // user-selected list/grid view is never reset when rotating to a wider tier.
  useEffect(() => {
    if (!usesAgendaComposition) return;
    setViewMode((current) => (current === 'overview' ? 'list' : current));
    setDaysCount(1);
    setDateRangePreset((current) => (current === 'custom' ? current : 'today'));
  }, [usesAgendaComposition]);

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
          branchCode?: string;
          shift?: string;
          bookedCount?: number;
          doneCount?: number;
          avgDurationMinutes?: { normalAvg?: number; retainAvg?: number; removalAvg?: number; overallAvg?: number };
        }>;
        offStaffList?: Array<{
          id: number;
          name: string;
          branchName?: string;
          branchCode?: string;
          reason: string;
          type?: string;
        }>;
      }
    >
  >({});
  const [totalAppointments, setTotalAppointments] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const branchCounts = useMemo(() => {
    const counts = { all: appointments.length, EP: 0, DT: 0, PXL: 0 };
    appointments.forEach((appt) => {
      const b = getBranchBadgeInfo(appt.storeId, appt.branchName, appt.branchCode);
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

  // Keep the test hook out of render so React can safely replay renders.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const testWindow = window as typeof window & {
      __testHandleReschedule?: typeof handleRescheduleRequest;
    };
    testWindow.__testHandleReschedule = handleRescheduleRequest;

    return () => {
      if (testWindow.__testHandleReschedule === handleRescheduleRequest) {
        delete testWindow.__testHandleReschedule;
      }
    };
  }, [handleRescheduleRequest]);

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

      // Bounded cache keeps date-navigation fast without retaining every
      // historical range visited in a long-running dashboard session.
      const cache = appointmentsCacheRef.current;
      cache.delete(cacheKey);
      cache.set(cacheKey, { data: rawData, dailyCapacities: caps, total: tot });
      if (cache.size > APPOINTMENTS_CACHE_MAX_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey) cache.delete(oldestKey);
      }
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
    return appointments.filter((appt) => {
      // Branch filter
      if (selectedBranch !== 'all') {
        const b = getBranchBadgeInfo(appt.storeId, appt.branchName, appt.branchCode);
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

  // A preset always starts from today; moving backward or forward afterwards
  // keeps the selected period length while preserving the user's context.
  const handlePresetChange = (preset: string) => {
    const today = dayjs();

    setStartDate(today);
    setDateRangePreset(preset);
    setCustomRange(null);
    if (preset === 'today') setDaysCount(1);
    else if (preset === 'next3') setDaysCount(3);
    else if (preset === 'next5') setDaysCount(5);
    else if (preset === 'next7') setDaysCount(7);
    else if (preset === 'thisWeek') setDaysCount(7);
    else if (preset === 'thisMonth') setDaysCount(today.daysInMonth());
  };

  const handlePrevRange = () => {
    if (customRange) {
      const periodLength = customRange[1].startOf('day').diff(customRange[0].startOf('day'), 'day') + 1;
      setCustomRange([
        customRange[0].clone().subtract(periodLength, 'day'),
        customRange[1].clone().subtract(periodLength, 'day'),
      ]);
      return;
    }
    setStartDate((prev) => prev.clone().subtract(daysCount, 'day'));
  };

  const handleNextRange = () => {
    if (customRange) {
      const periodLength = customRange[1].startOf('day').diff(customRange[0].startOf('day'), 'day') + 1;
      setCustomRange([
        customRange[0].clone().add(periodLength, 'day'),
        customRange[1].clone().add(periodLength, 'day'),
      ]);
      return;
    }
    setStartDate((prev) => prev.clone().add(daysCount, 'day'));
  };

  const handleTodayReset = () => {
    handlePresetChange('next5');
  };

  return (
    <div className="responsive-page responsive-workspace schedule-calendar-page w-full p-4 md:p-6 space-y-5">
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
        <div className="flex flex-wrap items-center gap-2">
          <Tooltip title="Đặt lịch mới">
            <Button
              type="primary"
              aria-label="Đặt lịch mới"
              icon={
                <span aria-hidden className="relative inline-flex size-4 items-center justify-center">
                  <CalendarOutlined className="text-base" />
                  <span className="absolute -right-1 -bottom-1 inline-flex size-2 items-center justify-center rounded-full bg-emerald-500 text-white ring-1 ring-white dark:ring-slate-900">
                    <PlusOutlined className="text-[6px] leading-none" />
                  </span>
                </span>
              }
              className="!size-8 !min-w-8 !rounded-lg !border-none !bg-emerald-500 !p-0 text-white shadow-sm shadow-emerald-500/20 hover:!bg-emerald-600"
              onClick={() => {
                setBookingInitialCustomer(null);
                setBookingWizardOpen(true);
              }}
            />
          </Tooltip>

          <Segmented
            value={selectedBranch}
            onChange={(val) => setSelectedBranch(val as string)}
            options={[
              {
                label: usesAgendaComposition
                  ? `Tất cả (${branchCounts.all})`
                  : `Tất cả Chi nhánh (${branchCounts.all})`,
                value: 'all',
              },
              { label: `Đề Thám (${branchCounts.DT})`, value: 'DT' },
              {
                label: usesAgendaComposition ? `Estella (${branchCounts.EP})` : `Estella Place (${branchCounts.EP})`,
                value: 'EP',
              },
            ]}

            className="schedule-calendar-branch-control bg-slate-100 dark:bg-slate-800 p-1 font-semibold text-xs"
          />

          <Segmented
            value={viewMode}
            onChange={(val) => setViewMode(val as any)}
            options={
              usesAgendaComposition
                ? [
                    { label: 'Agenda', value: 'list', icon: <UnorderedListOutlined /> },
                    { label: 'Lịch', value: 'grid', icon: <CalendarOutlined /> },
                  ]
                : [
                    { label: 'Overview Đa cột', value: 'overview', icon: <AppstoreOutlined /> },
                    { label: 'Danh sách', value: 'list', icon: <UnorderedListOutlined /> },
                    { label: 'Lịch lưới', value: 'grid', icon: <CalendarOutlined /> },
                  ]
            }
            className="schedule-calendar-view-control bg-slate-100 dark:bg-slate-800 p-1 font-medium"
          />
        </div>
      </div>

      {/* Date Range Navigation & Summary Strip */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-3">
        {/* One compact time toolbar keeps navigation, preset and custom range in one place. */}
        <div className="schedule-calendar-date-toolbar flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <Tooltip title="Khoảng lịch trước">
            <Button
              icon={<LeftOutlined />}
              aria-label="Khoảng lịch trước"
              onClick={handlePrevRange}
              className="!size-8 !min-w-8 !rounded-lg !p-0"
            />
          </Tooltip>

          <RangePicker
            aria-label="Chọn khoảng ngày tìm kiếm"
            className="schedule-calendar-range-picker !h-8 w-full sm:!w-[232px]"
            format="DD/MM/YYYY"
            value={customRange ?? computedDateRange}
            onChange={(dates) => {
              if (dates && dates[0] && dates[1]) {
                const range: [Dayjs, Dayjs] = [dates[0].startOf('day'), dates[1].endOf('day')];
                setCustomRange(range);
                setDateRangePreset('custom');
                setStartDate(range[0]);
                setDaysCount(range[1].startOf('day').diff(range[0].startOf('day'), 'day') + 1);
              } else {
                handleTodayReset();
              }
            }}
          />

          <Tooltip title="Khoảng lịch tiếp theo">
            <Button
              icon={<RightOutlined />}
              aria-label="Khoảng lịch tiếp theo"
              onClick={handleNextRange}
              className="!size-8 !min-w-8 !rounded-lg !p-0"
            />
          </Tooltip>

          <Select
            aria-label="Chọn khoảng xem lịch"
            value={dateRangePreset}
            onChange={handlePresetChange}
            className="!h-8 w-full sm:!w-36"
            options={[
              { value: 'today', label: 'Hôm nay' },
              { value: 'next3', label: '3 ngày tới' },
              { value: 'next5', label: '5 ngày tới' },
              { value: 'next7', label: '7 ngày tới' },
              { value: 'thisWeek', label: 'Tuần này' },
              { value: 'thisMonth', label: 'Tháng này' },
              ...(dateRangePreset === 'custom' ? [{ value: 'custom', label: 'Tùy chọn' }] : []),
            ]}
          />

          <Tooltip title="Tải lại dữ liệu">
            <Button
              icon={<ReloadOutlined />}
              aria-label="Tải lại dữ liệu lịch hẹn"
              onClick={fetchAppointments}
              loading={loading}
              className="!size-8 !min-w-8 !rounded-lg !p-0"
            />
          </Tooltip>
        </div>

        {/* Multi-dimensional Filters Row */}
        <div className="schedule-calendar-filters flex flex-wrap items-center w-full">
          <SearchField
            behavior="filter"
            id="calendar-search-input"
            name="calendarSearch"
            aria-label="Tìm theo Tên KH, SĐT, Dịch vụ"
            placeholder="Tìm theo Tên KH, SĐT, Dịch vụ..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="schedule-calendar-filter-search"
            allowClear
          />

          <Select
            aria-label="Lọc theo Chuyên viên"
            value={selectedStaffId}
            onChange={(val) => {
              setSelectedStaffId(val);
              setCurrentPage(1);
            }}
            className="schedule-calendar-filter-control"
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
            className="schedule-calendar-filter-control"
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
            className="schedule-calendar-filter-control"
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
        <div className="schedule-calendar-summary-grid grid grid-cols-2 gap-3 pt-2">
          <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <Text type="secondary" className="text-xs font-medium">
              ∑ Lịch hẹn
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

      <OffDayRescheduleWarningModal
        open={preOffDayModalOpen}
        appointment={preOffDayAppt}
        targetDate={preOffDayTargetDate}
        nextWorkingDate={preOffDayNextWorkingDate}
        themeMode={themeMode}
        onCancel={() => {
          setPreOffDayModalOpen(false);
          setPreOffDayAppt(null);
        }}
        onContinue={() => {
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
      />

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
