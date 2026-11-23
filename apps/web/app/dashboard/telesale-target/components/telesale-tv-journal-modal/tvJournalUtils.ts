import dayjs from 'dayjs';
import type { TelesaleTvEventLog, TelesaleTvJournalOverview } from '@mos-lab/shared';
import type { TvJournalFilters } from './tvJournalTypes';

const TV_JOURNAL_STORAGE_PREFIX = 'MOS_TV_MONITOR_EVENT_LOGS_';

/** Returns the localStorage key holding client-side TV execution logs for a date (`YYYY-MM-DD`). */
export function getTvJournalStorageKey(dateStr: string): string {
  return `${TV_JOURNAL_STORAGE_PREFIX}${dateStr}`;
}

/** Reads client-side TV execution logs from localStorage; returns `null` when absent or unreadable. */
export function readClientTvJournalLogs(dateStr: string): TelesaleTvEventLog[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(getTvJournalStorageKey(dateStr));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TelesaleTvEventLog[]) : null;
  } catch {
    return null;
  }
}

/** Formats an event timestamp in `Asia/Ho_Chi_Minh` 24h time, preferring preformatted time when present. */
export function formatTvJournalTime(timestamp?: string | null, preformatted?: string): string | null {
  if (preformatted) return preformatted;
  if (!timestamp) return null;
  try {
    return new Date(timestamp).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  } catch {
    return dayjs(timestamp).format('HH:mm:ss');
  }
}

/** Sorts TV event logs descending by timestamp and computes overview execution counters. */
export function summarizeTvJournalEvents(events: TelesaleTvEventLog[]): TelesaleTvJournalOverview {
  const sortedEvents = [...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return {
    totalEvents: sortedEvents.length,
    voiceSuccess: sortedEvents.filter((e) => e.voiceTriggered).length,
    voiceError: sortedEvents.filter((e) => e.eventReceived && !e.voiceTriggered).length,
    overlaySuccess: sortedEvents.filter((e) => e.overlayTriggered).length,
    overlayError: sortedEvents.filter((e) => e.eventReceived && !e.overlayTriggered).length,
    latestEventTime: sortedEvents.length > 0 ? sortedEvents[0].timestamp : null,
    events: sortedEvents,
  };
}

/** Merges server journal records with client execution logs, letting local TV execution details override. */
export function mergeTvJournalEvents(
  serverJournal: TelesaleTvJournalOverview,
  clientLogs: TelesaleTvEventLog[]
): TelesaleTvJournalOverview {
  const clientLogMap = new Map<string, TelesaleTvEventLog>();
  for (const log of clientLogs) {
    clientLogMap.set(log.id, log);
  }

  const mergedEvents = (serverJournal.events || []).map((ev) => {
    const clientExec = clientLogMap.get(ev.id);
    if (!clientExec) return ev;
    return {
      ...ev,
      eventReceived: clientExec.eventReceived,
      voiceTriggered: clientExec.voiceTriggered,
      voiceErrorReason: clientExec.voiceErrorReason,
      overlayTriggered: clientExec.overlayTriggered,
      overlayErrorReason: clientExec.overlayErrorReason,
      status: clientExec.status,
      errorMessage: clientExec.errorMessage,
    };
  });

  // Include client-only events (e.g. milestones triggered locally) not yet returned by the API.
  const seenIds = new Set(mergedEvents.map((ev) => ev.id));
  for (const clientLog of clientLogs) {
    if (!seenIds.has(clientLog.id)) {
      mergedEvents.push(clientLog);
    }
  }

  return summarizeTvJournalEvents(mergedEvents);
}

/** Filters TV journal events by staff, event type, and final execution status. */
export function filterTvJournalEvents(
  events: TelesaleTvEventLog[],
  { staffFilter, typeFilter, statusFilter }: TvJournalFilters
): TelesaleTvEventLog[] {
  const normalizedStaffFilter = staffFilter.toLowerCase();

  return events.filter((ev) => {
    if (staffFilter !== 'ALL') {
      const staffMatch =
        String(ev.staffId) === staffFilter || ev.staffName?.toLowerCase().includes(normalizedStaffFilter);
      if (!staffMatch) return false;
    }

    if (typeFilter !== 'ALL' && ev.type !== typeFilter) {
      return false;
    }

    if (statusFilter !== 'ALL' && ev.status !== statusFilter) {
      return false;
    }

    return true;
  });
}
