import { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import type { Dayjs } from 'dayjs';
import type { Appointment } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { formatOrGenerateCustomerPhone } from '~/components/booking/constants';
import {
  APPOINTMENTS_CACHE_MAX_ENTRIES,
  type CachedAppointmentsEntry,
  type DailyCapacityMap,
  type ScheduleViewMode,
  type StaffOption,
} from './scheduleCalendarTypes';

interface UseScheduleCalendarDataParams {
  computedDateRange: [Dayjs, Dayjs];
  viewMode: ScheduleViewMode;
  currentPage: number;
  pageSize: number;
  selectedStaffId: string;
}

export function useScheduleCalendarData({
  computedDateRange,
  viewMode,
  currentPage,
  pageSize,
  selectedStaffId,
}: UseScheduleCalendarDataParams) {
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dailyCapacities, setDailyCapacities] = useState<DailyCapacityMap>({});

  const appointmentsCacheRef = useRef<Map<string, CachedAppointmentsEntry>>(new Map());

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
      .catch((err: unknown) => {
        console.error('Failed to fetch staff list:', err);
      });
  }, []);

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
        setLoading(false);
        return;
      }

      setLoading(true);
      const res = await apiClient.customers.getAppointments(params);
      const rawData = (res.data || []).map((item: any) => ({
        ...item,
        customerPhone: formatOrGenerateCustomerPhone(item),
      }));
      const caps = (res.dailyCapacities || {}) as DailyCapacityMap;
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

  return {
    staffList,
    loading,
    appointments,
    dailyCapacities,
    fetchAppointments,
  };
}
