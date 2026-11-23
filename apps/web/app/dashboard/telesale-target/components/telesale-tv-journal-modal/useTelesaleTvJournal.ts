'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import dayjs from 'dayjs';
import type { TelesaleTvJournalOverview } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import type { TvJournalStatusFilter, TvJournalTypeFilter } from './tvJournalTypes';
import {
  filterTvJournalEvents,
  formatTvJournalTime,
  mergeTvJournalEvents,
  readClientTvJournalLogs,
  summarizeTvJournalEvents,
} from './tvJournalUtils';

interface UseTelesaleTvJournalOptions {
  open: boolean;
  initialDate?: string;
}

/** Manages date selection, API/localStorage journal hydration, and filters for the TV journal modal. */
export function useTelesaleTvJournal({ open, initialDate }: UseTelesaleTvJournalOptions) {
  const [selectedDate, setSelectedDate] = useState<string>(() => initialDate || dayjs().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState<boolean>(false);
  const [journalData, setJournalData] = useState<TelesaleTvJournalOverview | null>(null);

  const [staffFilter, setStaffFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<TvJournalTypeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<TvJournalStatusFilter>('ALL');

  useEffect(() => {
    if (open && initialDate) {
      setSelectedDate(initialDate);
    }
  }, [open, initialDate]);

  const fetchJournal = useCallback(async (dateStr: string) => {
    setLoading(true);
    try {
      const serverJournal = await apiClient.telesaleTarget.getTvJournal({ date: dateStr });
      const clientLogs = readClientTvJournalLogs(dateStr) ?? [];
      setJournalData(mergeTvJournalEvents(serverJournal, clientLogs));
    } catch {
      // Fallback to local storage when API call fails or client is offline
      const fallbackLogs = readClientTvJournalLogs(dateStr);
      if (fallbackLogs) {
        setJournalData(summarizeTvJournalEvents(fallbackLogs));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchJournal(selectedDate);
    }
  }, [open, selectedDate, fetchJournal]);

  const filteredEvents = useMemo(() => {
    if (!journalData?.events) return [];
    return filterTvJournalEvents(journalData.events, { staffFilter, typeFilter, statusFilter });
  }, [journalData, staffFilter, typeFilter, statusFilter]);

  const latestTimeFormatted = useMemo(() => {
    if (!journalData?.latestEventTime) return 'Chưa có sự kiện';
    const firstEvent = journalData.events?.[0];
    return formatTvJournalTime(journalData.latestEventTime, firstEvent?.timeFormatted) ?? 'Chưa có sự kiện';
  }, [journalData]);

  return {
    selectedDate,
    setSelectedDate,
    loading,
    journalData,
    staffFilter,
    setStaffFilter,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    fetchJournal,
    filteredEvents,
    latestTimeFormatted,
  };
}
