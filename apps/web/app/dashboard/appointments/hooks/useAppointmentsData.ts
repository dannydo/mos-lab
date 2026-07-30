'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { apiClient } from '../../../../lib/api-client';

dayjs.extend(isoWeek);

import { Appointment, Staff } from '@mos-lab/shared';

const defaultColumnConfig = {
  stt: { visible: true, width: 55, label: 'STT' },
  customerName: { visible: true, width: 220, label: 'Khách hàng' },
  customerPhone: { visible: true, width: 140, label: 'Số Điện Thoại' },
  appointmentTime: { visible: true, width: 150, label: 'Thời Gian Hẹn' },
  serviceName: { visible: true, width: 200, label: 'Dịch vụ chính' },
  totalPrice: { visible: true, width: 130, label: 'Giá trị ước tính' },
  netRevenue: { visible: true, width: 130, label: 'Doanh thu Net' },
  tipAmount: { visible: true, width: 120, label: 'Tiền tips' },
  bookingBonus: { visible: true, width: 130, label: 'Hoa hồng OC' },
  bookingChannel: { visible: true, width: 120, label: 'Kênh đặt lịch' },
  bookerName: { visible: true, width: 150, label: 'Booker / Phân bổ' },
  promotion: { visible: true, width: 150, label: 'Khuyến mãi' },
  bookingNote: { visible: true, width: 220, label: 'Ghi chú đặt lịch' },
  orderState: { visible: true, width: 120, label: 'Trạng thái' },
};

export interface UseAppointmentsDataOptions {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function useAppointmentsData(options?: UseAppointmentsDataOptions) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [currentUser, setCurrentUser] = useState<Staff | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // ignore
        }
      }
    }
    return null;
  });

  const [columnConfig, setColumnConfig] = useState<Record<string, { visible: boolean; width: number; label: string }>>(
    () => {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('appointment_columns_config_v2');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            const merged = { ...defaultColumnConfig };
            Object.keys(parsed).forEach((key) => {
              if (merged[key as keyof typeof defaultColumnConfig]) {
                merged[key as keyof typeof defaultColumnConfig] = {
                  ...merged[key as keyof typeof defaultColumnConfig],
                  visible: parsed[key].visible,
                  width: parsed[key].width || merged[key as keyof typeof defaultColumnConfig].width,
                };
              }
            });
            return merged;
          } catch {
            // ignore
          }
        }
      }
      return defaultColumnConfig;
    }
  );

  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_appointments_viewMode');
      if (saved && ['month', 'week', 'day'].includes(saved)) {
        return saved as 'month' | 'week' | 'day';
      }
    }
    return 'month';
  });
  const [referenceDate, setReferenceDate] = useState<dayjs.Dayjs>(dayjs());
  const [customRange, setCustomRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const refDateStr = referenceDate.format('YYYY-MM-DD');
  const customStartStr = customRange?.[0]?.format('YYYY-MM-DD') || '';
  const customEndStr = customRange?.[1]?.format('YYYY-MM-DD') || '';

  const dateRange = useMemo<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
    if (customRange) {
      return customRange;
    }
    let start = referenceDate.clone();
    let end = referenceDate.clone();

    if (viewMode === 'month') {
      start = referenceDate.clone().startOf('month');
      end = referenceDate.clone().endOf('month');
    } else if (viewMode === 'week') {
      start = referenceDate.clone().startOf('isoWeek');
      end = referenceDate.clone().endOf('isoWeek');
    } else if (viewMode === 'day') {
      start = referenceDate.clone().startOf('day');
      end = referenceDate.clone().endOf('day');
    }
    return [start, end];
  }, [viewMode, refDateStr, customStartStr, customEndStr]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'missed' | 'completed'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_appointments_activeTab');
      if (saved && ['pending', 'missed', 'completed'].includes(saved)) {
        return saved as 'pending' | 'missed' | 'completed';
      }
    }
    return 'pending';
  });
  const [missedStatusFilter, setMissedStatusFilter] = useState<'ALL' | 'UNTAGGED' | 'FOLLOWUP' | 'RESOLVED'>('ALL');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_appointments_selectedStaffId');
      if (saved) return saved;
    }
    return 'all';
  });
  const [staffList, setStaffList] = useState<SafeAny[]>([]);

  // Appointments data state
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_appointments_currentPage');
      if (saved) return parseInt(saved, 10);
    }
    return 1;
  });
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mos_appointments_pageSize');
      if (saved) return parseInt(saved, 10);
    }
    return 20;
  });
  const [total, setTotal] = useState<number>(0);
  const [summary, setSummary] = useState<SafeAny>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Detailed Modal states
  const [selectedCustomer, setSelectedCustomer] = useState<SafeAny>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailModalLoading, setDetailModalLoading] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<SafeAny[]>([]);
  const [bookingWizardVisible, setBookingWizardVisible] = useState(false);
  const [bookingInitialCustomer, setBookingInitialCustomer] = useState<SafeAny>(null);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedBookingForReschedule, setSelectedBookingForReschedule] = useState<SafeAny>(null);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      apiClient.customers
        .getStaff({ role: 'booker' })
        .then((data) => {
          const bookerTeam = (data || []).filter((s: SafeAny) => {
            const role = (s.role || '').toLowerCase();
            const name = (s.displayName || '').trim();
            return role === 'telesales' || role === 'booker' || name === 'Tâm Nguyễn';
          });
          setStaffList(bookerTeam);
        })
        .catch((err) => console.error('Failed to load staff list:', err));
    }
  }, [currentUser]);

  const saveColumnConfig = (newConfig: typeof columnConfig) => {
    setColumnConfig(newConfig);
    localStorage.setItem('appointment_columns_config_v2', JSON.stringify(newConfig));
  };

  const isFetchingRef = useRef(false);

  const dateFromStr = dateRange[0] ? dateRange[0].format('YYYY-MM-DD 00:00:00') : '';
  const dateToStr = dateRange[1] ? dateRange[1].format('YYYY-MM-DD 23:59:59') : '';

  // Fetch appointments data
  const fetchAppointments = useCallback(
    async (targetPage?: number, targetSize?: number) => {
      if (!dateFromStr || !dateToStr) return;

      const pageToFetch = targetPage !== undefined ? targetPage : currentPage;
      const sizeToFetch = targetSize !== undefined ? targetSize : pageSize;

      isFetchingRef.current = true;
      setLoading(true);
      try {
        const params: SafeAny = {
          dateFrom: dateFromStr,
          dateTo: dateToStr,
          type: activeTab,
          page: pageToFetch,
          limit: sizeToFetch,
        };

        if (activeTab === 'missed' && missedStatusFilter !== 'ALL') {
          params.missedStatusFilter = missedStatusFilter;
        }

        if (currentUser?.role === 'admin' && selectedStaffId !== 'all') {
          params.staffId = selectedStaffId;
        }

        const data = await apiClient.customers.getAppointments(params);
        const fetchedItems = data.data || [];

        setAppointments(fetchedItems);
        setTotal(data.total || 0);
        setSummary(data.summary || null);
      } catch (err) {
        console.error('Fetch appointments error:', err);
        optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể tải lịch hẹn');
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    },
    [dateFromStr, dateToStr, activeTab, selectedStaffId, missedStatusFilter, currentUser, currentPage, pageSize]
  );

  const handlePageChange = useCallback(
    (page: number, size?: number) => {
      setCurrentPage(page);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mos_appointments_currentPage', String(page));
      }
      if (size && size !== pageSize) {
        setPageSize(size);
        if (typeof window !== 'undefined') {
          localStorage.setItem('mos_appointments_pageSize', String(size));
        }
      }
      fetchAppointments(page, size);
    },
    [pageSize, fetchAppointments]
  );

  // Instantly refresh appointments table when popup/modal updates data
  useEffect(() => {
    const handleDataChanged = () => {
      fetchAppointments();
    };
    window.addEventListener('mos-data-updated', handleDataChanged);
    window.addEventListener('mos-call-log-saved', handleDataChanged);
    window.addEventListener('mos-customer-updated', handleDataChanged);
    window.addEventListener('mos-booking-updated', handleDataChanged);
    return () => {
      window.removeEventListener('mos-data-updated', handleDataChanged);
      window.removeEventListener('mos-call-log-saved', handleDataChanged);
      window.removeEventListener('mos-customer-updated', handleDataChanged);
      window.removeEventListener('mos-booking-updated', handleDataChanged);
    };
  }, [fetchAppointments]);

  const handleCancelBooking = async (orderId: number) => {
    try {
      await apiClient.customers.deleteBooking(orderId);
      optionsRef.current?.onSuccess?.('Hủy lịch hẹn thành công!');
      setCurrentPage(1);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mos_appointments_currentPage', '1');
      }
      fetchAppointments(1);
    } catch (err) {
      console.error('[Cancel] Failed to cancel booking:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Có lỗi xảy ra khi hủy lịch hẹn.');
    }
  };

  const filterKey = `${dateFromStr}_${dateToStr}_${activeTab}_${selectedStaffId}_${missedStatusFilter}`;
  const prevFilterKeyRef = useRef('');

  // Handle filter changes (Reset to Page 1 and fetch)
  useEffect(() => {
    if (!currentUser || !dateFromStr || !dateToStr) return;

    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      isFetchingRef.current = false;
      setCurrentPage(1);
      if (typeof window !== 'undefined') {
        localStorage.setItem('mos_appointments_currentPage', '1');
      }
      fetchAppointments(1);
    }
  }, [filterKey, currentUser, fetchAppointments]);

  const handleNavigate = useCallback(
    (direction: number) => {
      setCustomRange(null);
      setReferenceDate((prev) => prev.add(direction, viewMode as 'month' | 'week' | 'day'));
    },
    [viewMode]
  );

  const getPeriodLabel = useCallback(() => {
    if (!dateRange[0] || !dateRange[1]) return 'Chọn thời gian';

    const [start, end] = dateRange;
    let expectedStart = referenceDate;
    let expectedEnd = referenceDate;

    if (viewMode === 'month') {
      expectedStart = referenceDate.startOf('month');
      expectedEnd = referenceDate.endOf('month');
    } else if (viewMode === 'week') {
      expectedStart = referenceDate.startOf('isoWeek');
      expectedEnd = referenceDate.endOf('isoWeek');
    } else if (viewMode === 'day') {
      expectedStart = referenceDate.startOf('day');
      expectedEnd = referenceDate.endOf('day');
    }

    const isMatched = start.isSame(expectedStart, 'day') && end.isSame(expectedEnd, 'day');

    if (!isMatched) {
      return `${start.format('DD/MM')} - ${end.format('DD/MM')}`;
    }

    if (viewMode === 'month') {
      return `Tháng ${referenceDate.format('MM/YYYY')}`;
    }
    if (viewMode === 'week') {
      const startStr = referenceDate.startOf('isoWeek').format('DD/MM');
      const endStr = referenceDate.endOf('isoWeek').format('DD/MM');
      return `Tuần ${referenceDate.isoWeek()} (${startStr} - ${endStr})`;
    }

    const today = dayjs().startOf('day');
    const yesterday = dayjs().subtract(1, 'day').startOf('day');
    const ref = referenceDate.startOf('day');

    if (ref.isSame(today)) {
      return `Hôm nay (${ref.format('DD/MM')})`;
    }
    if (ref.isSame(yesterday)) {
      return `Hôm qua (${ref.format('DD/MM')})`;
    }
    return ref.format('DD/MM/YYYY');
  }, [dateRange, referenceDate, viewMode]);

  const openDetailModal = useCallback(async (customerId: number) => {
    setDetailModalVisible(true);
    setDetailModalLoading(true);
    setCustomerHistory([]);
    setSelectedCustomer(null);

    try {
      const customer = await apiClient.customers.getDetails(customerId);
      setSelectedCustomer(customer);

      const history = await apiClient.customers.getHistory(customerId);
      setCustomerHistory(history);
    } catch (err) {
      console.error('Fetch detailed customer error:', err);
      optionsRef.current?.onError?.(
        (err as SafeAny).response?.data?.message || 'Không thể tải thông tin chi tiết khách hàng'
      );
      setDetailModalVisible(false);
    } finally {
      setDetailModalLoading(false);
    }
  }, []);

  return {
    currentUser,
    columnConfig,
    saveColumnConfig,
    viewMode,
    setViewMode,
    referenceDate,
    setReferenceDate,
    customRange,
    setCustomRange,
    dateRange,
    pickerOpen,
    setPickerOpen,
    activeTab,
    setActiveTab,
    missedStatusFilter,
    setMissedStatusFilter,
    selectedStaffId,
    setSelectedStaffId,
    staffList,
    appointments,
    loading,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    total,
    summary,
    sentinelRef,
    selectedCustomer,
    detailModalVisible,
    setDetailModalVisible,
    detailModalLoading,
    customerHistory,
    bookingWizardVisible,
    setBookingWizardVisible,
    bookingInitialCustomer,
    setBookingInitialCustomer,
    rescheduleModalVisible,
    setRescheduleModalVisible,
    selectedBookingForReschedule,
    setSelectedBookingForReschedule,
    fetchAppointments,
    handlePageChange,
    handleCancelBooking,
    handleNavigate,
    getPeriodLabel,
    openDetailModal,
  };
}
