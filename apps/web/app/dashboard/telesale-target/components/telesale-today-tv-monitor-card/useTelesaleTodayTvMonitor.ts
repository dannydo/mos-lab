import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TelesaleDailySnapshotItem, TelesaleTargetOverview } from '@mos-lab/shared';
import { calculateShiftPacing, calculateTvMonitorMetrics } from '../../utils/tv-monitor-pacing';
import type { TvCelebrationSettings, useTelesaleTvLiveCelebration } from '../../hooks/useTelesaleTvLiveCelebration';
import { readIsManagerOrAdmin } from './tvMonitorCardStyles';
import {
  DEFAULT_LOCAL_TV_SETTINGS,
  TEST_FIREWORKS_DURATION_MS,
  TV_SETTINGS_STORAGE_KEY,
  TV_SETTINGS_UPDATED_EVENT,
  type TestFireworksKind,
} from './tvMonitorCardTypes';

interface UseTelesaleTodayTvMonitorParams {
  overview: TelesaleTargetOverview;
  liveCelebration?: ReturnType<typeof useTelesaleTvLiveCelebration>;
}

/** Manages clock pacing, TV monitor settings sync, test fireworks, and journal/quotes modal state. */
export function useTelesaleTodayTvMonitor({ overview, liveCelebration }: UseTelesaleTodayTvMonitorParams) {
  const { teamDaily } = overview;

  const [now, setNow] = useState<Date>(new Date());
  const [journalOpen, setJournalOpen] = useState<boolean>(false);
  const [journalDate, setJournalDate] = useState<string>(teamDaily.date);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [quotesDrawerOpen, setQuotesDrawerOpen] = useState<boolean>(false);

  const [localSettings, setLocalSettings] = useState<TvCelebrationSettings>(DEFAULT_LOCAL_TV_SETTINGS);
  const [testFireworksBook, setTestFireworksBook] = useState<boolean>(false);
  const [testFireworksCheckin, setTestFireworksCheckin] = useState<boolean>(false);
  const [testFireworksDone, setTestFireworksDone] = useState<boolean>(false);
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (liveCelebration) return;
    try {
      const raw = localStorage.getItem(TV_SETTINGS_STORAGE_KEY);
      if (raw) {
        setLocalSettings((prev) => ({ ...prev, ...JSON.parse(raw) }));
      }
    } catch {
      // Ignore invalid localStorage payload
    }
  }, [liveCelebration]);

  const settings = liveCelebration ? liveCelebration.settings : localSettings;

  const updateSettings = useCallback(
    (newSettings: Partial<TvCelebrationSettings>) => {
      if (liveCelebration) {
        liveCelebration.updateSettings(newSettings);
        return;
      }
      setLocalSettings((prev) => {
        const updated = { ...prev, ...newSettings };
        try {
          localStorage.setItem(TV_SETTINGS_STORAGE_KEY, JSON.stringify(updated));
          window.dispatchEvent(new CustomEvent(TV_SETTINGS_UPDATED_EVENT, { detail: updated }));
        } catch {
          // Ignore storage quota or SSR errors
        }
        return updated;
      });
    },
    [liveCelebration]
  );

  const stopTestFireworks = useCallback(() => {
    if (testTimerRef.current) clearTimeout(testTimerRef.current);
    setTestFireworksBook(false);
    setTestFireworksCheckin(false);
    setTestFireworksDone(false);
  }, []);

  const triggerTestFireworks = useCallback((type: TestFireworksKind) => {
    if (testTimerRef.current) clearTimeout(testTimerRef.current);
    setTestFireworksBook(type === 'BOOK');
    setTestFireworksCheckin(type === 'CHECKIN');
    setTestFireworksDone(type === 'DONE');

    testTimerRef.current = setTimeout(() => {
      if (type === 'BOOK') setTestFireworksBook(false);
      else if (type === 'CHECKIN') setTestFireworksCheckin(false);
      else setTestFireworksDone(false);
    }, TEST_FIREWORKS_DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (testTimerRef.current) clearTimeout(testTimerRef.current);
    };
  }, []);

  // Update clock every 30 seconds for shift pacing without causing 5s layout re-renders
  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setNow(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const isManagerOrAdmin = useMemo(() => readIsManagerOrAdmin(), []);
  const pacing = calculateShiftPacing(now);
  const metrics = calculateTvMonitorMetrics(teamDaily, pacing);

  const pastDailySnapshots: TelesaleDailySnapshotItem[] = useMemo(() => {
    const list = overview.dailySnapshots && overview.dailySnapshots.length > 0 ? overview.dailySnapshots : [];
    // Loại trừ ngày hôm nay vì đã có 2 đồng hồ lớn ở trên
    return list.filter((item) => item.date !== teamDaily.date && !item.isToday);
  }, [overview.dailySnapshots, teamDaily.date]);

  const handleOpenJournalForDate = useCallback((dateStr: string) => {
    setJournalDate(dateStr);
    setJournalOpen(true);
  }, []);

  const handleOpenTodayJournal = useCallback(() => {
    setJournalDate(teamDaily.date);
    setJournalOpen(true);
  }, [teamDaily.date]);

  const handleOpenQuotesFromSettings = useCallback(() => {
    setSettingsOpen(false);
    setQuotesDrawerOpen(true);
  }, []);

  const fireworksEnabled = settings.fireworksEnabled ?? true;
  const soundEnabled = settings.soundEnabled ?? true;
  const volume = settings.volume ?? 0.9;

  const handleQuickSoundToggle = useCallback(() => {
    const nextSound = !soundEnabled;
    updateSettings({ soundEnabled: nextSound });
    if (nextSound && metrics.checkinPercent >= 100) {
      triggerTestFireworks('CHECKIN');
      liveCelebration?.triggerDemoCelebration('CHECKIN_18');
    }
  }, [soundEnabled, updateSettings, metrics.checkinPercent, triggerTestFireworks, liveCelebration]);

  const handleQuickFireworksToggle = useCallback(() => {
    updateSettings({ fireworksEnabled: !fireworksEnabled });
  }, [fireworksEnabled, updateSettings]);

  const handleReplayCheckinCelebration = useCallback(() => {
    if (!soundEnabled) updateSettings({ soundEnabled: true });
    triggerTestFireworks('CHECKIN');
    liveCelebration?.triggerDemoCelebration('CHECKIN_18');
  }, [soundEnabled, updateSettings, triggerTestFireworks, liveCelebration]);

  return {
    journalOpen,
    setJournalOpen,
    journalDate,
    settingsOpen,
    setSettingsOpen,
    quotesDrawerOpen,
    setQuotesDrawerOpen,
    settings,
    updateSettings,
    fireworksEnabled,
    soundEnabled,
    volume,
    testFireworksBook,
    testFireworksCheckin,
    testFireworksDone,
    triggerTestFireworks,
    stopTestFireworks,
    isManagerOrAdmin,
    pacing,
    metrics,
    pastDailySnapshots,
    handleOpenJournalForDate,
    handleOpenTodayJournal,
    handleOpenQuotesFromSettings,
    handleQuickSoundToggle,
    handleQuickFireworksToggle,
    handleReplayCheckinCelebration,
  };
}
