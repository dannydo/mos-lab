'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import dynamic from 'next/dynamic';
import { useTheme } from '../../../context/ThemeContext';
import { apiClient } from '../../../lib/api-client';
import { Appointment, vietnameseSearchFilter } from '@mos-lab/shared';
import { formatVND } from '../../../lib/format-utils';

import ScheduleListView from './components/ScheduleListView';
import MultiDayColumnView from './components/MultiDayColumnView';
import FullCalendarGrid from './components/FullCalendarGrid';

const CustomerDetailDrawer = dynamic(() => import('../../../components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = dynamic(() => import('../../../components/BookingWizardDrawer'), { ssr: false });
const RescheduleBookingModal = dynamic(
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
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Staff options
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

  // Appointments data
  const [loading, setLoading] = useState<boolean>(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [totalAppointments, setTotalAppointments] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Modal / Drawer states
  const [detailCustomerId, setDetailCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState<boolean>(false);

  const [bookingWizardOpen, setBookingWizardOpen] = useState<boolean>(false);
  const [bookingInitialCustomer, setBookingInitialCustomer] = useState<any>(null);

  const [rescheduleModalOpen, setRescheduleModalOpen] = useState<boolean>(false);
  const [selectedRescheduleAppt, setSelectedRescheduleAppt] = useState<Appointment | null>(null);

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

  // Fetch appointments from Backend API
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const [start, end] = computedDateRange;
      const params: Record<string, any> = {
        dateFrom: start.format('YYYY-MM-DD 00:00:00'),
        dateTo: end.format('YYYY-MM-DD 23:59:59'),
        page: viewMode === 'list' ? currentPage : 1,
        pageSize: viewMode === 'list' ? pageSize : 500,
      };

      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      if (selectedStaffId !== 'all') {
        params.staffId = selectedStaffId;
      }

      const res = await apiClient.customers.getAppointments(params);
      const rawData = res.data || [];
      setAppointments(rawData);
      setTotalAppointments(res.total || rawData.length);
    } catch (err: any) {
      message.error(err?.message || 'Lỗi tải danh sách lịch hẹn');
    } finally {
      setLoading(false);
    }
  }, [computedDateRange, viewMode, currentPage, pageSize, selectedStatus, selectedStaffId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Filtered appointments client-side for fast search and channel filter
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      // Channel filter
      if (selectedChannel !== 'all' && appt.bookingChannel !== selectedChannel) {
        return false;
      }

      // Search query filter (search customerName, phone, serviceName)
      if (searchQuery.trim()) {
        const query = searchQuery.trim();
        const custName = appt.customerName || (appt as any).userName || '';
        const phone = appt.customerPhone || (appt as any).phone || '';
        const service = appt.serviceName || (appt as any).packageName || '';

        const nameMatch = vietnameseSearchFilter(query, custName);
        const phoneMatch = phone.includes(query);
        const serviceMatch = vietnameseSearchFilter(query, service);

        if (!nameMatch && !phoneMatch && !serviceMatch) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, selectedChannel, searchQuery]);

  // Quick stats summary calculations
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
    <div className="schedule-calendar-page p-4 md:p-6 space-y-5 max-w-[1600px] mx-auto">
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
              <Button icon={<ReloadOutlined />} onClick={fetchAppointments} size="small" loading={loading} />
            </Tooltip>
          </div>
        </div>

        {/* Multi-dimensional Filters Row */}
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Tìm theo Tên KH, SĐT, Dịch vụ..."
            prefix={<SearchOutlined className="text-slate-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
            allowClear
            size="small"
          />

          <Select
            value={selectedStaffId}
            onChange={setSelectedStaffId}
            size="small"
            className="w-44"
            options={[
              { value: 'all', label: 'Tất cả Chuyên viên' },
              ...staffList.map((s) => ({ value: s.id, label: s.name })),
            ]}
          />

          <Select
            value={selectedStatus}
            onChange={setSelectedStatus}
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
            value={selectedChannel}
            onChange={setSelectedChannel}
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
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
          appointments={filteredAppointments}
          onSelectSlot={(date, hour) => {
            setBookingInitialCustomer(null);
            setBookingWizardOpen(true);
          }}
          onViewCustomerDetail={(customerId) => {
            setDetailCustomerId(customerId);
            setCustomerDrawerOpen(true);
          }}
          onReschedule={(appt) => {
            setSelectedRescheduleAppt(appt);
            setRescheduleModalOpen(true);
          }}
        />
      )}

      {viewMode === 'list' && (
        <ScheduleListView
          loading={loading}
          appointments={filteredAppointments}
          total={totalAppointments}
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
            setSelectedRescheduleAppt(appt);
            setRescheduleModalOpen(true);
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
