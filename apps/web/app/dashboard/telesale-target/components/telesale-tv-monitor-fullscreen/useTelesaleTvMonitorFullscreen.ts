import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import dayjs from 'dayjs';
import type { TelesaleTargetOverview } from '@mos-lab/shared';
import { calculateShiftPacing, calculateTvMonitorMetrics } from '../../utils/tv-monitor-pacing';
import { useTelesaleTvLiveCelebration } from '../../hooks/useTelesaleTvLiveCelebration';
import {
  BOOK_PANEL_STORAGE_KEY,
  CHECKIN_PANEL_STORAGE_KEY,
  FRENZY_DURATION_MS,
  TEST_FIREWORKS_DURATION_MS,
} from './tvFullscreenTypes';
import {
  computeShiftNodes,
  computeShiftTimelineProgress,
  findTopBookStaff,
  persistPanelVisibility,
  readIsFullscreenManagerOrAdmin,
  readStoredPanelVisibility,
} from './tvFullscreenUtils';

interface UseTelesaleTvMonitorFullscreenParams {
  overview: TelesaleTargetOverview;
  open: boolean;
  onClose: () => void;
  externalCelebration?: ReturnType<typeof useTelesaleTvLiveCelebration>;
}

/** Coordinates fullscreen TV clock, pacing, side-panel persistence, keyboard shortcuts, fireworks, and celebration state. */
export function useTelesaleTvMonitorFullscreen({
  overview,
  open,
  onClose,
  externalCelebration,
}: UseTelesaleTvMonitorFullscreenParams) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState<boolean>(false);
  const [showStaffGrid, setShowStaffGrid] = useState<boolean>(true);
  const [journalOpen, setJournalOpen] = useState<boolean>(false);
  const [quotesDrawerOpen, setQuotesDrawerOpen] = useState<boolean>(false);
  const [settingsPopoverOpen, setSettingsPopoverOpen] = useState<boolean>(false);
  const [showBookPanel, setShowBookPanel] = useState<boolean>(() => readStoredPanelVisibility(BOOK_PANEL_STORAGE_KEY));
  const [showCheckinPanel, setShowCheckinPanel] = useState<boolean>(() =>
    readStoredPanelVisibility(CHECKIN_PANEL_STORAGE_KEY)
  );

  const [testFireworksBook, setTestFireworksBook] = useState(false);
  const [testFireworksCheckin, setTestFireworksCheckin] = useState(false);
  const [frenzyBook, setFrenzyBook] = useState(false);
  const [frenzyCheckin, setFrenzyCheckin] = useState(false);

  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const bookTestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkinTestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isManagerOrAdmin = useMemo(() => readIsFullscreenManagerOrAdmin(), []);

  const toggleBookPanel = useCallback((val: boolean) => {
    setShowBookPanel(val);
    persistPanelVisibility(BOOK_PANEL_STORAGE_KEY, val);
  }, []);

  const toggleCheckinPanel = useCallback((val: boolean) => {
    setShowCheckinPanel(val);
    persistPanelVisibility(CHECKIN_PANEL_STORAGE_KEY, val);
  }, []);

  const handleOpenJournal = useCallback(() => {
    if (!isManagerOrAdmin) {
      message.warning('Chỉ Quản lý (Manager) và Quản trị viên (Admin) mới có quyền truy cập Nhật ký TV Monitor');
      return;
    }
    setJournalOpen(true);
  }, [isManagerOrAdmin]);

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (journalOpen) {
          setJournalOpen(false);
          return;
        }
        if (document.querySelector('.ant-modal-root, .ant-popover:not(.ant-popover-hidden)')) {
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, journalOpen]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    return () => {
      if (bookTestTimerRef.current) clearTimeout(bookTestTimerRef.current);
      if (checkinTestTimerRef.current) clearTimeout(checkinTestTimerRef.current);
    };
  }, []);

  const toggleBrowserFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsBrowserFullscreen(true);
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
      setIsBrowserFullscreen(false);
    }
  }, []);

  const pacing = calculateShiftPacing(now);
  const metrics = calculateTvMonitorMetrics(overview.teamDaily, pacing);

  const internalCelebration = useTelesaleTvLiveCelebration();
  const celebration = externalCelebration || internalCelebration;
  const {
    settings: voiceSettings,
    updateSettings: updateVoiceSettings,
    activeCelebration,
    isSpeaking,
    isFadingOut,
    isQuietHours,
    ingestLiveEvents,
    checkMilestones,
    triggerDemoCelebration,
  } = celebration;

  useEffect(() => {
    if (!open || !overview) return;
    if (overview.todayLiveEvents) {
      ingestLiveEvents(overview.todayLiveEvents);
    }
    checkMilestones(overview.teamDaily.date, metrics.bookActual, metrics.doneActual, metrics.checkinActual);
  }, [
    open,
    overview,
    ingestLiveEvents,
    checkMilestones,
    metrics.bookActual,
    metrics.doneActual,
    metrics.checkinActual,
  ]);

  const prevBookPercentRef = useRef(metrics.bookPercent);
  const prevCheckinPercentRef = useRef(metrics.checkinPercent);

  useEffect(() => {
    if (metrics.bookPercent >= 100 && prevBookPercentRef.current < 100) {
      setFrenzyBook(true);
      const timer = setTimeout(() => setFrenzyBook(false), FRENZY_DURATION_MS);
      return () => clearTimeout(timer);
    }
    prevBookPercentRef.current = metrics.bookPercent;
  }, [metrics.bookPercent]);

  useEffect(() => {
    if (metrics.checkinPercent >= 100 && prevCheckinPercentRef.current < 100) {
      setFrenzyCheckin(true);
      const timer = setTimeout(() => setFrenzyCheckin(false), FRENZY_DURATION_MS);
      return () => clearTimeout(timer);
    }
    prevCheckinPercentRef.current = metrics.checkinPercent;
  }, [metrics.checkinPercent]);

  const triggerTestFireworks = useCallback((card: 'BOOK' | 'DONE' | 'CHECKIN') => {
    if (card === 'BOOK') {
      if (bookTestTimerRef.current) clearTimeout(bookTestTimerRef.current);
      setTestFireworksBook(true);
      bookTestTimerRef.current = setTimeout(() => setTestFireworksBook(false), TEST_FIREWORKS_DURATION_MS);
    } else if (card === 'CHECKIN') {
      if (checkinTestTimerRef.current) clearTimeout(checkinTestTimerRef.current);
      setTestFireworksCheckin(true);
      checkinTestTimerRef.current = setTimeout(() => setTestFireworksCheckin(false), TEST_FIREWORKS_DURATION_MS);
    }
  }, []);

  const handleToggleSound = useCallback(() => {
    const next = !voiceSettings.soundEnabled;
    updateVoiceSettings({ soundEnabled: next });
    if (next) {
      message.success('Đã bật âm thanh TV Monitor');
    } else {
      message.info('Đã tắt tiếng TV Monitor');
    }
  }, [voiceSettings.soundEnabled, updateVoiceSettings]);

  const handleToggleStaffGrid = useCallback(() => {
    const next = !showStaffGrid;
    setShowStaffGrid(next);
    if (next) {
      message.success('Đã hiển thị bảng đóng góp nhân sự');
    } else {
      message.info('Đã thu gọn bảng nhân sự (Mở rộng 2 đồng hồ)');
    }
  }, [showStaffGrid]);

  const handleOpenQuotesManager = useCallback(() => {
    setSettingsPopoverOpen(false);
    setQuotesDrawerOpen(true);
  }, []);

  const timeDisplay = dayjs(now).format('HH:mm:ss');
  const topStaff = useMemo(() => findTopBookStaff(overview.staffTargets), [overview.staffTargets]);
  const shiftNodes = useMemo(() => computeShiftNodes(now), [now]);
  const shiftProgress = useMemo(() => computeShiftTimelineProgress(now), [now]);

  return {
    fullscreenContainerRef,
    isBrowserFullscreen,
    showStaffGrid,
    journalOpen,
    setJournalOpen,
    quotesDrawerOpen,
    setQuotesDrawerOpen,
    settingsPopoverOpen,
    setSettingsPopoverOpen,
    showBookPanel,
    showCheckinPanel,
    toggleBookPanel,
    toggleCheckinPanel,
    isManagerOrAdmin,
    handleOpenJournal,
    toggleBrowserFullscreen,
    pacing,
    metrics,
    voiceSettings,
    updateVoiceSettings,
    activeCelebration,
    isSpeaking,
    isFadingOut,
    isQuietHours,
    triggerDemoCelebration,
    testFireworksBook,
    testFireworksCheckin,
    frenzyBook,
    frenzyCheckin,
    triggerTestFireworks,
    handleToggleSound,
    handleToggleStaffGrid,
    handleOpenQuotesManager,
    timeDisplay,
    topStaff,
    shiftNodes,
    shiftProgress,
  };
}
