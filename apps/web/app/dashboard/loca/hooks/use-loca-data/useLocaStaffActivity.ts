'use client';

import { useState, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import type { LocaStaffActivityLogItem, LocaStaffActivityStats } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { readUrlOrStorageNumber, readUrlOrStorageString, updateUrlSearchParams } from './locaStorageHelpers';
import type { LocaActivityViewMode } from './types';

export function useLocaStaffActivity(activeTab: string) {
  const [activityPage, setActivityPageState] = useState<number>(() =>
    readUrlOrStorageNumber('activityPage', 'mos_loca_activity_page', 1)
  );

  const [activityPageSize, setActivityPageSizeState] = useState<number>(() =>
    readUrlOrStorageNumber('activityPageSize', 'mos_loca_activity_pageSize', 20)
  );

  const [selectedActivityStaffId, setSelectedActivityStaffIdState] = useState<string>(() =>
    readUrlOrStorageString(['activityStaffId'], 'mos_loca_activity_staffId', 'ALL')
  );

  const setSelectedActivityStaffId = useCallback((staffId: string) => {
    setSelectedActivityStaffIdState(staffId);
    setActivityPageState(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activity_staffId', staffId);
      localStorage.setItem('mos_loca_activity_page', '1');
      updateUrlSearchParams({ activityStaffId: staffId, activityPage: '1' });
    }
  }, []);

  const [activityViewMode, setActivityViewModeState] = useState<LocaActivityViewMode>(() => {
    const savedMode = readUrlOrStorageString(['activityViewMode'], 'mos_loca_activity_viewMode', '');
    if (savedMode && ['month', 'week', 'day'].includes(savedMode)) {
      return savedMode as LocaActivityViewMode;
    }
    return 'month';
  });

  const setActivityViewMode = useCallback((mode: LocaActivityViewMode) => {
    setActivityViewModeState(mode);
    setActivityPageState(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activity_viewMode', mode);
      localStorage.setItem('mos_loca_activity_page', '1');
      updateUrlSearchParams({ activityViewMode: mode, activityPage: '1' });
    }
  }, []);

  const [activityReferenceDate, setActivityReferenceDateState] = useState<dayjs.Dayjs>(() => {
    const savedRefDate = readUrlOrStorageString(['activityRefDate'], 'mos_loca_activity_refDate', '');
    if (savedRefDate && dayjs(savedRefDate).isValid()) {
      return dayjs(savedRefDate);
    }
    return dayjs();
  });

  const setActivityReferenceDate = useCallback((date: dayjs.Dayjs) => {
    setActivityReferenceDateState(date);
    setActivityPageState(1);
    if (typeof window !== 'undefined') {
      const dateStr = date.format('YYYY-MM-DD');
      localStorage.setItem('mos_loca_activity_refDate', dateStr);
      localStorage.setItem('mos_loca_activity_page', '1');
      updateUrlSearchParams({ activityRefDate: dateStr, activityPage: '1' });
    }
  }, []);

  const handleNavigateActivityDate = useCallback(
    (direction: number) => {
      const unit = activityViewMode === 'month' ? 'month' : activityViewMode === 'week' ? 'week' : 'day';
      const nextDate = direction > 0 ? activityReferenceDate.add(1, unit) : activityReferenceDate.subtract(1, unit);
      setActivityReferenceDate(nextDate);
    },
    [activityViewMode, activityReferenceDate, setActivityReferenceDate]
  );

  const [activitySearchQuery, setActivitySearchQueryState] = useState<string>(() =>
    readUrlOrStorageString(['activitySearch'], 'mos_loca_activity_search', '')
  );

  const setActivitySearchQuery = useCallback((query: string) => {
    setActivitySearchQueryState(query);
    setActivityPageState(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activity_search', query);
      localStorage.setItem('mos_loca_activity_page', '1');
      updateUrlSearchParams({ activitySearch: query || null, activityPage: '1' });
    }
  }, []);

  const [activityActionTypeFilter, setActivityActionTypeFilterState] = useState<string>(() =>
    readUrlOrStorageString(['activityActionType'], 'mos_loca_activity_actionType', 'ALL')
  );

  const setActivityActionTypeFilter = useCallback((type: string) => {
    setActivityActionTypeFilterState(type);
    setActivityPageState(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activity_actionType', type);
      localStorage.setItem('mos_loca_activity_page', '1');
      updateUrlSearchParams({ activityActionType: type, activityPage: '1' });
    }
  }, []);

  const [activityTouchpointKey, setActivityTouchpointKeyState] = useState<string>(() =>
    readUrlOrStorageString(['activityTouchpointKey'], 'mos_loca_activity_touchpointKey', 'ALL')
  );

  const setActivityTouchpointKey = useCallback((key: string) => {
    setActivityTouchpointKeyState(key);
    setActivityPageState(1);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activity_touchpointKey', key);
      localStorage.setItem('mos_loca_activity_page', '1');
      updateUrlSearchParams({ activityTouchpointKey: key, activityPage: '1' });
    }
  }, []);

  const setActivityPage = useCallback((p: number) => {
    setActivityPageState(p);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mos_loca_activity_page', String(p));
      updateUrlSearchParams({ activityPage: String(p) });
    }
  }, []);

  const setActivityPageSize = useCallback((s: number) => {
    setActivityPageSizeState((prevSize) => {
      if (prevSize !== s) {
        setActivityPageState(1);
        if (typeof window !== 'undefined') {
          localStorage.setItem('mos_loca_activity_pageSize', String(s));
          localStorage.setItem('mos_loca_activity_page', '1');
          updateUrlSearchParams({ activityPageSize: String(s), activityPage: '1' });
        }
      }
      return s;
    });
  }, []);

  const [staffActivityStats, setStaffActivityStats] = useState<LocaStaffActivityStats | null>(null);
  const [staffActivityLogs, setStaffActivityLogs] = useState<LocaStaffActivityLogItem[]>([]);
  const [staffActivityTotal, setStaffActivityTotal] = useState(0);
  const [staffActivityLoading, setStaffActivityLoading] = useState(false);

  const fetchStaffActivityData = useCallback(async () => {
    setStaffActivityLoading(true);
    try {
      let startDateStr: string;
      let endDateStr: string;

      if (activityViewMode === 'month') {
        startDateStr = activityReferenceDate.startOf('month').format('YYYY-MM-DD');
        endDateStr = activityReferenceDate.endOf('month').format('YYYY-MM-DD');
      } else if (activityViewMode === 'week') {
        startDateStr = activityReferenceDate.startOf('isoWeek').format('YYYY-MM-DD');
        endDateStr = activityReferenceDate.endOf('isoWeek').format('YYYY-MM-DD');
      } else {
        startDateStr = activityReferenceDate.startOf('day').format('YYYY-MM-DD');
        endDateStr = activityReferenceDate.endOf('day').format('YYYY-MM-DD');
      }

      const params: Record<string, unknown> = {
        staffId: selectedActivityStaffId,
        datePreset: 'custom',
        startDate: startDateStr,
        endDate: endDateStr,
        page: activityPage,
        pageSize: activityPageSize,
        actionType: activityActionTypeFilter,
        touchpointKey: activityTouchpointKey,
        search: activitySearchQuery,
      };

      const res = await apiClient.customers.getLocaStaffActivity(params);
      setStaffActivityStats(res.stats);
      setStaffActivityLogs(res.logs || []);
      setStaffActivityTotal(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load staff activity data:', err);
    } finally {
      setStaffActivityLoading(false);
    }
  }, [
    selectedActivityStaffId,
    activityViewMode,
    activityReferenceDate,
    activitySearchQuery,
    activityActionTypeFilter,
    activityTouchpointKey,
    activityPage,
    activityPageSize,
  ]);

  useEffect(() => {
    if (activeTab === 'STAFF_ACTIVITY') {
      fetchStaffActivityData();
    }
  }, [activeTab, fetchStaffActivityData]);

  return {
    selectedActivityStaffId,
    activityViewMode,
    activityReferenceDate,
    activitySearchQuery,
    activityActionTypeFilter,
    activityTouchpointKey,
    activityPage,
    activityPageSize,
    staffActivityStats,
    staffActivityLogs,
    staffActivityTotal,
    staffActivityLoading,
    setSelectedActivityStaffId,
    setActivityViewMode,
    setActivityReferenceDate,
    handleNavigateActivityDate,
    setActivitySearchQuery,
    setActivityActionTypeFilter,
    setActivityTouchpointKey,
    setActivityPage,
    setActivityPageSize,
    fetchStaffActivityData,
  };
}
