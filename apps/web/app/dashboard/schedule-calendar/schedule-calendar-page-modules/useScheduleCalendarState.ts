import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { computeDateRangeBounds } from './scheduleCalendarHelpers';
import type { ScheduleViewMode } from './scheduleCalendarTypes';

export function useScheduleCalendarState(usesAgendaComposition: boolean) {
  const [viewMode, setViewMode] = useState<ScheduleViewMode>('overview');

  const [startDate, setStartDate] = useState<Dayjs>(() => dayjs());
  const [daysCount, setDaysCount] = useState<number>(5);
  const [dateRangePreset, setDateRangePreset] = useState<string>('next5');
  const [customRange, setCustomRange] = useState<[Dayjs, Dayjs] | null>(null);

  // Phones and portrait iPads start with a decision-oriented day agenda. A
  // user-selected list/grid view is never reset when rotating to a wider tier.
  useEffect(() => {
    if (!usesAgendaComposition) return;
    setViewMode((current) => (current === 'overview' ? 'list' : current));
    setDaysCount(1);
    setDateRangePreset((current) => (current === 'custom' ? current : 'today'));
  }, [usesAgendaComposition]);

  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(50);

  const computedDateRange = useMemo<[Dayjs, Dayjs]>(
    () => computeDateRangeBounds(startDate, daysCount, dateRangePreset, customRange),
    [startDate, daysCount, dateRangePreset, customRange]
  );

  // A preset always starts from today; moving backward or forward afterwards
  // keeps the selected period length while preserving the user's context.
  const handlePresetChange = useCallback((preset: string) => {
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
  }, []);

  const handlePrevRange = useCallback(() => {
    if (customRange) {
      const periodLength = customRange[1].startOf('day').diff(customRange[0].startOf('day'), 'day') + 1;
      setCustomRange([
        customRange[0].clone().subtract(periodLength, 'day'),
        customRange[1].clone().subtract(periodLength, 'day'),
      ]);
      return;
    }
    setStartDate((prev) => prev.clone().subtract(daysCount, 'day'));
  }, [customRange, daysCount]);

  const handleNextRange = useCallback(() => {
    if (customRange) {
      const periodLength = customRange[1].startOf('day').diff(customRange[0].startOf('day'), 'day') + 1;
      setCustomRange([
        customRange[0].clone().add(periodLength, 'day'),
        customRange[1].clone().add(periodLength, 'day'),
      ]);
      return;
    }
    setStartDate((prev) => prev.clone().add(daysCount, 'day'));
  }, [customRange, daysCount]);

  const handleTodayReset = useCallback(() => {
    handlePresetChange('next5');
  }, [handlePresetChange]);

  const handleCustomRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (dates && dates[0] && dates[1]) {
        const range: [Dayjs, Dayjs] = [dates[0].startOf('day'), dates[1].endOf('day')];
        setCustomRange(range);
        setDateRangePreset('custom');
        setStartDate(range[0]);
        setDaysCount(range[1].startOf('day').diff(range[0].startOf('day'), 'day') + 1);
      } else {
        handleTodayReset();
      }
    },
    [handleTodayReset]
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  }, []);

  const handleStaffChange = useCallback((value: string) => {
    setSelectedStaffId(value);
    setCurrentPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setSelectedStatus(value);
    setCurrentPage(1);
  }, []);

  const handleChannelChange = useCallback((value: string) => {
    setSelectedChannel(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback((page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
  }, []);

  const handleGridSelectDate = useCallback((date: Dayjs) => {
    setStartDate(date);
    setViewMode('overview');
  }, []);

  return {
    viewMode,
    setViewMode,
    startDate,
    daysCount,
    dateRangePreset,
    customRange,
    computedDateRange,
    selectedBranch,
    setSelectedBranch,
    selectedStaffId,
    selectedStatus,
    selectedChannel,
    searchQuery,
    currentPage,
    pageSize,
    handlePresetChange,
    handlePrevRange,
    handleNextRange,
    handleCustomRangeChange,
    handleSearchChange,
    handleStaffChange,
    handleStatusChange,
    handleChannelChange,
    handlePageChange,
    handleGridSelectDate,
  };
}
