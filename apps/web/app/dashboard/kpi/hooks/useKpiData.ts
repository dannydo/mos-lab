'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import { apiClient } from '../../../../lib/api-client';

dayjs.extend(isoWeek);

import {
  BookerSalary,
  KPISummary as SharedKPISummary,
  OutcomeBreakdown,
  TrendDay,
  LeaderboardEntry,
  Staff,
} from '@mos-lab/shared';

// Use local type alias to match existing code usage of KpiSummary
type KpiSummary = SharedKPISummary;

export interface UseKpiDataOptions {
  onSuccess?: (msg: string) => void;
  onError?: (msg: string) => void;
}

export function useKpiData(options?: UseKpiDataOptions) {
  const optionsRef = useRef<UseKpiDataOptions | undefined>(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const [currentUser, setCurrentUser] = useState<Staff | null>(null);

  // Filters state
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [referenceDate, setReferenceDate] = useState<dayjs.Dayjs>(dayjs());
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>(() => {
    const start = dayjs().startOf('month');
    const end = dayjs().endOf('month');
    return [start, end];
  });
  // Booker detailed appointments drilldown
  const [selectedBookerId, setSelectedBookerId] = useState<number | null>(null);
  const [selectedBookerName, setSelectedBookerName] = useState<string>('');
  const [selectedStaffRecord, setSelectedStaffRecord] = useState<LeaderboardEntry | null>(null);
  const [appointmentsDrawerOpen, setAppointmentsDrawerOpen] = useState(false);

  const [selectedStaffId, setSelectedStaffId] = useState<string>('ALL');
  const [selectedRole, setSelectedRole] = useState<'telesales' | 'oc'>('telesales');

  // Reset staff selection when role changes
  useEffect(() => {
    setSelectedStaffId('ALL');
  }, [selectedRole]);

  // Data state
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<KpiSummary | null>(null);
  const [breakdown, setBreakdown] = useState<OutcomeBreakdown | null>(null);
  const [trends, setTrends] = useState<TrendDay[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  // Configuration Drawer state
  const [configDrawerOpen, setConfigDrawerOpen] = useState(false);

  // Sync dateRange when viewMode or referenceDate changes
  useEffect(() => {
    let start = referenceDate;
    let end = referenceDate;

    if (viewMode === 'month') {
      start = referenceDate.startOf('month');
      end = referenceDate.endOf('month');
    } else if (viewMode === 'week') {
      start = referenceDate.startOf('isoWeek');
      end = referenceDate.endOf('isoWeek');
    } else if (viewMode === 'day') {
      start = referenceDate.startOf('day');
      end = referenceDate.endOf('day');
    }

    setDateRange((currentRange) => {
      const isUnchanged = currentRange[0].isSame(start) && currentRange[1].isSame(end);
      return isUnchanged ? currentRange : [start, end];
    });
  }, [viewMode, referenceDate]);

  // Fetch logged in user
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('mos_user');
      if (stored) {
        setCurrentUser(JSON.parse(stored));
      }
    }
  }, []);

  // Fetch KPI data
  const fetchKpiData = useCallback(async () => {
    if (!dateRange[0] || !dateRange[1]) return;

    setLoading(true);
    const startDate = dateRange[0].format('YYYY-MM-DD');
    const endDate = dateRange[1].format('YYYY-MM-DD');

    const params: { startDate: string; endDate: string; role: 'telesales' | 'oc'; staffId?: string } = {
      startDate,
      endDate,
      role: selectedRole,
    };
    if (selectedStaffId !== 'ALL') {
      params.staffId = selectedStaffId;
    }

    try {
      const stored = localStorage.getItem('mos_user');
      const userObj = stored ? JSON.parse(stored) : null;
      const isAdmin = userObj && userObj.role === 'admin';

      const [summaryData, trendsData, leaderboardData] = await Promise.all([
        apiClient.kpi.getSummary(params),
        apiClient.kpi.getTrends(params),
        isAdmin
          ? apiClient.kpi.getLeaderboard({ date_from: startDate, date_to: endDate, role: selectedRole })
          : Promise.resolve(null),
      ]);

      setSummary(summaryData as SafeAny);
      setBreakdown(trendsData.breakdown);
      setTrends(trendsData.dailyTrends);
      if (leaderboardData) {
        setLeaderboard(leaderboardData);
      }
    } catch (err) {
      console.error('Fetch KPI data error:', err);
      optionsRef.current?.onError?.((err as SafeAny).response?.data?.message || 'Không thể tải báo cáo hiệu suất');
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedStaffId, selectedRole]);

  useEffect(() => {
    fetchKpiData();
  }, [fetchKpiData]);

  const handleShowAppointments = useCallback(
    (staffId: number, displayName: string) => {
      setSelectedBookerId(staffId);
      setSelectedBookerName(displayName);
      const matchedRecord = leaderboard.find((item) => item.staffId === staffId);
      setSelectedStaffRecord(matchedRecord || null);
      setAppointmentsDrawerOpen(true);
    },
    [leaderboard]
  );

  const getPeriodLabel = () => {
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

    // Day mode
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
  };

  const handleNavigate = (direction: number) => {
    setReferenceDate((prev) => prev.add(direction, viewMode as 'month' | 'week' | 'day'));
  };

  return {
    currentUser,
    viewMode,
    setViewMode,
    referenceDate,
    setReferenceDate,
    dateRange,
    setDateRange,
    selectedBookerId,
    setSelectedBookerId,
    selectedBookerName,
    setSelectedBookerName,
    selectedStaffRecord,
    setSelectedStaffRecord,
    appointmentsDrawerOpen,
    setAppointmentsDrawerOpen,
    selectedStaffId,
    setSelectedStaffId,
    selectedRole,
    setSelectedRole,
    loading,
    summary,
    breakdown,
    trends,
    leaderboard,
    configDrawerOpen,
    setConfigDrawerOpen,
    fetchKpiData,
    handleShowAppointments,
    getPeriodLabel,
    handleNavigate,
  };
}
