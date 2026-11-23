'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import type dayjs from 'dayjs';
import type { LeaderboardEntry } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  AUDIT_PAGE_BATCH_SIZE,
  computeAuditDrilldownTotals,
  computeLiveTotalSalary,
  filterBookerAppointments,
  type AppointmentsAuditServiceFilter,
  type AppointmentsAuditStatusFilter,
  type BookerAppointmentItem,
} from './appointmentsAuditTypes';

export interface UseAppointmentsAuditOptions {
  open: boolean;
  selectedBookerId: number | null;
  selectedStaffRecord: LeaderboardEntry | null;
  dateRange: [dayjs.Dayjs, dayjs.Dayjs];
}

export function useAppointmentsAudit({
  open,
  selectedBookerId,
  selectedStaffRecord,
  dateRange,
}: UseAppointmentsAuditOptions) {
  const [bookerAppointments, setBookerAppointments] = useState<BookerAppointmentItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [drillSearchText, setDrillSearchText] = useState('');
  const [drillStatusFilter, setDrillStatusFilter] = useState<AppointmentsAuditStatusFilter>('ALL');
  const [drillServiceFilter, setDrillServiceFilter] = useState<AppointmentsAuditServiceFilter>('ALL');

  const [visibleCount, setVisibleCount] = useState(AUDIT_PAGE_BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !selectedBookerId) return;

    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const startDate = dateRange[0].format('YYYY-MM-DD');
        const endDate = dateRange[1].format('YYYY-MM-DD');
        const data = await apiClient.kpi.getBookerAppointments({
          staffId: selectedBookerId,
          startDate,
          endDate,
        });
        setBookerAppointments(Array.isArray(data) ? (data as BookerAppointmentItem[]) : []);
        setDrillSearchText('');
        setDrillStatusFilter('ALL');
        setDrillServiceFilter('ALL');
        setVisibleCount(AUDIT_PAGE_BATCH_SIZE);
      } catch (err) {
        console.error('Fetch booker appointments error:', err);
        message.error('Không thể tải danh sách khách hàng đặt lịch.');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [open, selectedBookerId, dateRange]);

  const filteredAppointments = useMemo(
    () =>
      filterBookerAppointments(bookerAppointments, {
        searchText: drillSearchText,
        statusFilter: drillStatusFilter,
        serviceFilter: drillServiceFilter,
      }),
    [bookerAppointments, drillSearchText, drillStatusFilter, drillServiceFilter]
  );

  useEffect(() => {
    setVisibleCount(AUDIT_PAGE_BATCH_SIZE);
  }, [drillSearchText, drillStatusFilter, drillServiceFilter]);

  const drilldownTotals = useMemo(() => computeAuditDrilldownTotals(filteredAppointments), [filteredAppointments]);

  const liveTotalSalary = useMemo(
    () => computeLiveTotalSalary(selectedStaffRecord, drilldownTotals.totalBookingBonus),
    [selectedStaffRecord, drilldownTotals.totalBookingBonus]
  );

  const visibleAppointments = useMemo(
    () => filteredAppointments.slice(0, visibleCount),
    [filteredAppointments, visibleCount]
  );

  useEffect(() => {
    if (!open) return;

    let observer: IntersectionObserver | null = null;
    let active = true;

    const timer = setTimeout(() => {
      if (!active) return;

      const drawerBody = document.querySelector('.ant-drawer-body');

      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + AUDIT_PAGE_BATCH_SIZE, filteredAppointments.length));
          }
        },
        {
          root: drawerBody || null,
          rootMargin: '150px',
          threshold: 0.1,
        }
      );

      const currentTarget = loadMoreRef.current;
      if (currentTarget) {
        observer.observe(currentTarget);
      }
    }, 150);

    return () => {
      active = false;
      clearTimeout(timer);
      const currentTarget = loadMoreRef.current;
      if (currentTarget && observer) {
        observer.unobserve(currentTarget);
      }
    };
  }, [open, filteredAppointments.length]);

  return {
    bookerAppointments,
    filteredAppointments,
    visibleAppointments,
    loading,
    drillSearchText,
    setDrillSearchText,
    drillStatusFilter,
    setDrillStatusFilter,
    drillServiceFilter,
    setDrillServiceFilter,
    visibleCount,
    loadMoreRef,
    drilldownTotals,
    liveTotalSalary,
  };
}
