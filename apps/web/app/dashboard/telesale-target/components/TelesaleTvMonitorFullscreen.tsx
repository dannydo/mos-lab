'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button, Tooltip, Progress, theme, Popover, Slider, Switch, Select, message } from 'antd';
import {
  X,
  Maximize2,
  Minimize2,
  RotateCw,
  Sparkles,
  CheckCircle2,
  Calendar,
  Clock,
  Flame,
  Volume2,
  VolumeX,
  ClipboardList,
  Rocket,
  Crown,
  Settings,
  User,
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { TelesaleTargetOverview, isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { calculateShiftPacing, calculateTvMonitorMetrics } from '../utils/tv-monitor-pacing';
import { getKpiProgressStroke } from '../utils/kpi-color-utils';
import { useTelesaleTvLiveCelebration } from '../hooks/useTelesaleTvLiveCelebration';
import { TelesaleTvLiveCelebrationBanner } from './TelesaleTvLiveCelebrationBanner';
import { TelesaleTvStaffContributionGrid } from './TelesaleTvStaffContributionGrid';
import { TelesaleTvJournalModal } from './TelesaleTvJournalModal';
import { SemicircleGauge } from './SemicircleGauge';
import { RealisticCardFireworks } from './RealisticCardFireworks';

interface TelesaleTvMonitorFullscreenProps {
  overview: TelesaleTargetOverview;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  liveCelebration?: ReturnType<typeof useTelesaleTvLiveCelebration>;
}

export const TelesaleTvMonitorFullscreen: React.FC<TelesaleTvMonitorFullscreenProps> = ({
  overview,
  open,
  onClose,
  onRefresh,
  refreshing = false,
  liveCelebration: externalCelebration,
}) => {
  const { token } = theme.useToken();
  const [now, setNow] = useState<Date>(new Date());
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState<boolean>(false);
  const [journalOpen, setJournalOpen] = useState<boolean>(false);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);

  const isManagerOrAdmin = useMemo(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = localStorage.getItem('mos_user') || localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        return isAdminOrSuperAdminRole(u?.role) || u?.role === 'manager';
      }
    } catch {}
    return true;
  }, []);

  const handleOpenJournal = () => {
    if (!isManagerOrAdmin) {
      message.warning('Chỉ Quản lý (Manager) và Quản trị viên (Admin) mới có quyền truy cập Nhật ký TV Monitor');
      return;
    }
    setJournalOpen(true);
  };

  // 1. Clock timer running every second for high-precision TV clock
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [open]);

  // 2. Keyboard listener for ESC to close
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // 3. Browser fullscreen toggle
  const toggleBrowserFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsBrowserFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsBrowserFullscreen(false);
      }
    }
  }, []);

  const pacing = calculateShiftPacing(now);
  const metrics = calculateTvMonitorMetrics(overview.teamDaily, pacing);

  // Live Voice Celebration hook (MOS-FEAT-83)
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

  // Ingest live events & check milestones whenever overview is updated
  useEffect(() => {
    if (!open || !overview) return;
    if (overview.todayLiveEvents) {
      ingestLiveEvents(overview.todayLiveEvents);
    }
    checkMilestones(overview.teamDaily.date, metrics.bookActual, metrics.doneActual);
  }, [open, overview, ingestLiveEvents, checkMilestones, metrics.bookActual, metrics.doneActual]);

  const isDoneOver100 = metrics.donePercent >= 100;
  const isBookOver100 = metrics.bookPercent >= 100;

  // Tiến độ thực tế: đỏ < 80, vàng 80-99, xanh >= 100
  const getProgressTier = (percent: number): 'rose' | 'amber' | 'emerald' => {
    if (percent < 80) return 'rose';
    if (percent < 100) return 'amber';
    return 'emerald';
  };

  const bookTier = metrics.bookTier;
  const doneTier = metrics.doneTier;

  // Demo fireworks testing state & milestone frenzy detection
  const [testFireworksBook, setTestFireworksBook] = useState(false);
  const [testFireworksDone, setTestFireworksDone] = useState(false);
  const [frenzyBook, setFrenzyBook] = useState(false);
  const [frenzyDone, setFrenzyDone] = useState(false);
  const prevBookPercentRef = useRef(metrics.bookPercent);
  const prevDonePercentRef = useRef(metrics.donePercent);

  useEffect(() => {
    if (metrics.bookPercent >= 100 && prevBookPercentRef.current < 100) {
      setFrenzyBook(true);
      const timer = setTimeout(() => setFrenzyBook(false), 8000);
      return () => clearTimeout(timer);
    }
    prevBookPercentRef.current = metrics.bookPercent;
  }, [metrics.bookPercent]);

  useEffect(() => {
    if (metrics.donePercent >= 100 && prevDonePercentRef.current < 100) {
      setFrenzyDone(true);
      const timer = setTimeout(() => setFrenzyDone(false), 8000);
      return () => clearTimeout(timer);
    }
    prevDonePercentRef.current = metrics.donePercent;
  }, [metrics.donePercent]);

  const triggerTestFireworks = (card: 'BOOK' | 'DONE') => {
    if (card === 'BOOK') {
      setTestFireworksBook(true);
      setTimeout(() => setTestFireworksBook(false), 8000);
    } else {
      setTestFireworksDone(true);
      setTimeout(() => setTestFireworksDone(false), 8000);
    }
  };

  const getCardTierStyles = (tier: 'rose' | 'amber' | 'emerald') => {
    switch (tier) {
      case 'emerald':
        return {
          container:
            'bg-gradient-to-b from-emerald-950/40 via-zinc-900/90 to-zinc-950/90 border-emerald-400/90 shadow-[0_0_40px_rgba(16,185,129,0.32)] hover:border-emerald-300',
          ambientGlow: 'bg-emerald-500/20',
          headerTargetBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40',
          ribbonBorder: 'border-emerald-900/40 border border-emerald-500/25',
          ribbonActualText: 'text-emerald-300',
          iconBox: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
        };
      case 'amber':
        return {
          container:
            'bg-gradient-to-b from-amber-950/40 via-zinc-900/90 to-zinc-950/90 border-amber-400/85 shadow-[0_0_35px_rgba(245,158,11,0.25)] hover:border-amber-300',
          ambientGlow: 'bg-amber-500/15',
          headerTargetBadge: 'bg-amber-950/80 text-amber-300 border-amber-500/40',
          ribbonBorder: 'border-amber-900/40 border border-amber-500/25',
          ribbonActualText: 'text-amber-300',
          iconBox: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
        };
      case 'rose':
      default:
        return {
          container:
            'bg-gradient-to-b from-rose-950/40 via-zinc-900/90 to-zinc-950/90 border-rose-500/70 shadow-[0_0_35px_rgba(244,63,94,0.25)] hover:border-rose-400',
          ambientGlow: 'bg-rose-500/15',
          headerTargetBadge: 'bg-rose-950/80 text-rose-300 border-rose-500/40',
          ribbonBorder: 'border-rose-900/40 border border-rose-500/25',
          ribbonActualText: 'text-rose-300',
          iconBox: 'bg-rose-500/20 border-rose-500/40 text-rose-400',
        };
    }
  };

  const bookStyles = getCardTierStyles(bookTier);
  const doneStyles = getCardTierStyles(doneTier);

  const dateFormatted = dayjs(now).locale('vi').format('dddd, [ngày] DD/MM/YYYY');
  // Capitalize first letter of day of week
  const dateDisplay = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
  const dayOfWeek = dayjs(now).locale('vi').format('dddd');
  const dayOfWeekCap = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
  const dateOnly = dayjs(now).format('DD/MM/YYYY');
  const timeDisplay = dayjs(now).format('HH:mm:ss');

  const topStaff = useMemo(() => {
    if (!overview.staffTargets || overview.staffTargets.length === 0) return null;
    return [...overview.staffTargets].sort((a, b) => (b.bookToday ?? 0) - (a.bookToday ?? 0))[0];
  }, [overview.staffTargets]);

  const shiftNodes = useMemo(() => {
    const currentHour = now.getHours();
    if (currentHour < 12) {
      return ['[8h]', '[9h]', '[10h]', '[11h]', '[12h]'];
    }
    return ['[13h]', '[14h]', '[15h]', '[16h]', '[17h]'];
  }, [now]);

  const shiftProgress = useMemo(() => {
    const currentMinutesOfDay = now.getHours() * 60 + now.getMinutes();
    const currentHour = now.getHours();
    const isMorning = currentHour < 12;
    const shiftStart = isMorning ? 8 * 60 : 13 * 60;
    const shiftEnd = isMorning ? 12 * 60 : 17 * 60;
    const duration = shiftEnd - shiftStart;
    const elapsed = currentMinutesOfDay - shiftStart;
    const percent = Math.min(100, Math.max(0, (elapsed / duration) * 100));
    const timeFormatted = dayjs(now).format('HH:mm');
    return { percent, timeFormatted, isMorning };
  }, [now]);

  const getGapBadgeClass = (gap: number) => {
    if (gap >= 0) return 'text-emerald-300 bg-emerald-950/80 border-emerald-500/50';
    if (gap === -1) return 'text-amber-300 bg-amber-950/80 border-amber-500/50';
    return 'text-rose-300 bg-rose-950/80 border-rose-500/50';
  };

  const getTeamStateBannerClass = () => {
    switch (metrics.teamState) {
      case 'COMPLETED':
        return 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 text-black font-black border-emerald-300 shadow-[0_0_30px_rgba(16,185,129,0.4)]';
      case 'ACCELERATING':
        return 'bg-emerald-950 text-emerald-300 border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.2)]';
      case 'APPROACHING':
        return 'bg-amber-950 text-amber-300 border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.2)]';
      case 'ON_PACE':
        return 'bg-blue-950 text-blue-300 border-blue-500/70 shadow-[0_0_20px_rgba(59,130,246,0.2)]';
      case 'WARMUP':
        return 'bg-sky-950 text-sky-300 border-sky-500/70';
      default:
        return 'bg-rose-950 text-rose-300 border-rose-500/70 shadow-[0_0_20px_rgba(244,63,94,0.2)]';
    }
  };

  const soundSettingsContent = (
    <div className="w-72 p-1 flex flex-col gap-4 text-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <div>
          <span className="font-bold text-sm flex items-center gap-1.5 text-zinc-100">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Hiệu ứng pháo bông
          </span>
          <span className="text-[10px] text-zinc-400 block">Tự động bắn khi đạt mốc ≥ 100%</span>
        </div>
        <Switch
          checked={voiceSettings.fireworksEnabled ?? true}
          onChange={(checked) => updateVoiceSettings({ fireworksEnabled: checked })}
          className="bg-zinc-700"
        />
      </div>

      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <span className="font-bold text-sm flex items-center gap-1.5 text-zinc-100">
          <Volume2 className="w-4 h-4 text-amber-400" />
          Âm thanh chúc mừng
        </span>
        <Switch
          checked={voiceSettings.soundEnabled}
          onChange={(checked) => updateVoiceSettings({ soundEnabled: checked })}
          className="bg-zinc-700"
        />
      </div>

      <div>
        <div className="flex justify-between text-xs font-mono text-zinc-400 mb-1">
          <span>Âm lượng loa</span>
          <span className="text-amber-300 font-bold">{Math.round(voiceSettings.volume * 100)}%</span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={voiceSettings.volume}
          onChange={(val) => updateVoiceSettings({ volume: val })}
          disabled={!voiceSettings.soundEnabled}
        />
      </div>

      <div>
        <span className="text-xs text-zinc-400 block mb-1">Loại sự kiện phát loa</span>
        <Select
          value={voiceSettings.eventTypeFilter}
          onChange={(val) => updateVoiceSettings({ eventTypeFilter: val })}
          className="w-full"
          getPopupContainer={(trigger) => trigger.parentElement || fullscreenContainerRef.current || document.body}
          options={[
            { label: 'Tất cả (Book & Done)', value: 'ALL' },
            { label: 'Chỉ Book mới', value: 'BOOK_ONLY' },
            { label: 'Chỉ Done mới', value: 'DONE_ONLY' },
          ]}
        />
      </div>

      <div>
        <span className="text-xs text-zinc-400 block mb-1">Chất giọng phát loa</span>
        <Select
          value={voiceSettings.voiceStyle || 'MALE_CHARM'}
          onChange={(val) => updateVoiceSettings({ voiceStyle: val })}
          className="w-full"
          getPopupContainer={(trigger) => trigger.parentElement || fullscreenContainerRef.current || document.body}
          options={[
            { label: '👑 Nam thần Nam Minh (Studio Neural · Trầm ấm & gợi cảm)', value: 'MALE_CHARM' },
            { label: '🌸 Nữ thần Hoài My (Studio Neural · Ngọt ngào & ân cần)', value: 'FEMALE_SWEET' },
            { label: '💻 Trình duyệt máy (Local Speech Synth)', value: 'BROWSER_LOCAL' },
          ]}
        />
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800 pt-2.5">
        <div>
          <span className="text-xs font-medium block text-zinc-200">Chế độ im lặng</span>
          <span className="text-[10px] text-zinc-400 block">Tự động nghỉ 12:00-13:30</span>
        </div>
        <Switch
          checked={voiceSettings.quietModeEnabled}
          onChange={(checked) => updateVoiceSettings({ quietModeEnabled: checked })}
          className="bg-zinc-700"
        />
      </div>

      <div className="border-t border-zinc-800 pt-2.5 flex flex-col gap-1.5">
        <span className="text-[11px] font-mono text-zinc-400">Thử nghiệm loa (Demo):</span>
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            size="small"
            className="text-[11px] bg-blue-950 border-blue-600 text-blue-300 hover:bg-blue-900"
            onClick={() => triggerDemoCelebration('BOOK')}
          >
            Test Book
          </Button>
          <Button
            size="small"
            className="text-[11px] bg-emerald-950 border-emerald-600 text-emerald-300 hover:bg-emerald-900"
            onClick={() => triggerDemoCelebration('DONE')}
          >
            Test Done
          </Button>
          <Button
            size="small"
            className="text-[11px] bg-amber-950 border-amber-600 text-amber-300 hover:bg-amber-900"
            onClick={() => triggerDemoCelebration('MILESTONE')}
          >
            Milestone
          </Button>
        </div>
      </div>

      <div className="border-t border-zinc-800 pt-2.5 flex flex-col gap-1.5">
        <span className="text-[11px] font-mono text-zinc-400">Thử nghiệm pháo hoa:</span>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            size="small"
            className="text-[11px] bg-sky-950 border-sky-500/70 text-sky-300 hover:bg-sky-900 font-bold"
            onClick={() => triggerTestFireworks('BOOK')}
          >
            🎆 Pháo Book
          </Button>
          <Button
            size="small"
            className="text-[11px] bg-emerald-950 border-emerald-500/70 text-emerald-300 hover:bg-emerald-900 font-bold"
            onClick={() => triggerTestFireworks('DONE')}
          >
            🎆 Pháo Done
          </Button>
        </div>
      </div>
    </div>
  );

  if (!open) return null;

  return (
    <div
      ref={fullscreenContainerRef}
      className="fixed inset-0 z-[99999] bg-zinc-950 text-zinc-100 flex flex-col justify-between p-3 sm:p-4 select-none overflow-hidden font-sans h-screen max-h-screen"
    >
      <TelesaleTvLiveCelebrationBanner
        celebration={activeCelebration}
        isSpeaking={isSpeaking}
        isFadingOut={isFadingOut}
      />

      {/* Ambient background glows for TV high-contrast ambiance */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 1. TOP BAR (MOCKUP 3: WALL STREET FINANCIAL WAR ROOM) */}
      {/* 1. TOP BAR (MOCKUP 3: WALL STREET FINANCIAL WAR ROOM) */}
      <header className="relative z-10 w-full shrink-0 flex flex-col items-center">
        {/* ROW 1: THE UNIFIED HORIZONTAL TOP CAPSULE BAR */}
        <div className="relative w-full h-14 rounded-2xl bg-zinc-900/95 border border-zinc-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.5)] flex items-center justify-between px-3 overflow-hidden backdrop-blur-md">
          {/* Subtle horizontal gradient highlight across top bar */}
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/[0.04] via-transparent to-zinc-500/[0.03] pointer-events-none" />

          {/* Left: Brand Plate with Chamfered Metallic Gold Slice */}
          <div className="relative flex items-center h-full -ml-3 pl-3 pr-8 shrink-0">
            {/* SVG Background for Brand Plate + Diagonal Slanted Gold Slice */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              preserveAspectRatio="none"
              viewBox="0 0 350 56"
            >
              <defs>
                {/* Metallic Gold Gradient for the angled slice */}
                <linearGradient id="goldSliceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgb(254, 240, 138)" />
                  <stop offset="35%" stopColor="rgb(245, 158, 11)" />
                  <stop offset="70%" stopColor="rgb(217, 119, 6)" />
                  <stop offset="100%" stopColor="rgb(146, 64, 14)" />
                </linearGradient>
                {/* Brand Plate Warm Cognac/Bronze fill */}
                <linearGradient id="brandCognacGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgb(55, 28, 8)" stopOpacity="0.95" />
                  <stop offset="50%" stopColor="rgb(36, 18, 5)" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="rgb(18, 11, 4)" stopOpacity="0.98" />
                </linearGradient>
                {/* Gold outline */}
                <linearGradient id="brandOuterBorder" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgb(245, 158, 11)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="rgb(180, 83, 9)" stopOpacity="0.4" />
                </linearGradient>
              </defs>

              {/* Main Cognac Body with rounded left and slanted right (top=318, bottom=304) */}
              <path
                d="M 15 1 L 318 1 L 304 55 L 15 55 A 14 14 0 0 1 1 41 L 1 15 A 14 14 0 0 1 15 1 Z"
                fill="url(#brandCognacGrad)"
                stroke="url(#brandOuterBorder)"
                strokeWidth="1.2"
              />

              {/* Angled Metallic Gold Slice (chamfered accent band, width ~18px) */}
              <polygon
                points="318,1 338,1 324,55 304,55"
                fill="url(#goldSliceGrad)"
                filter="drop-shadow(0 0 4px rgba(245,158,11,0.5))"
              />
            </svg>

            {/* Brand Content */}
            <div className="relative z-10 flex items-center gap-3 pl-2 pr-10">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.35)]">
                <Flame className="w-5 h-5 text-amber-400 fill-amber-400/20" />
              </div>
              <div>
                <div className="text-amber-300 font-serif tracking-[0.26em] text-[11px] font-bold uppercase leading-none">
                  WINGS LASHES
                </div>
                <div className="text-xs sm:text-sm font-black text-zinc-100 tracking-wider m-0 uppercase font-sans mt-1 leading-tight drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]">
                  TELESALES WAR ROOM
                  <span className="sr-only">TELESALES TV MONITOR · WAR ROOM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center: Large Clean Sans-Serif Master Clock - Proportional Size & Perfect Optical Center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-3xl sm:text-[36px] font-black font-sans tracking-[0.02em] text-white tabular-nums drop-shadow-[0_0_20px_rgba(255,255,255,0.25)] leading-none select-none">
              {timeDisplay}
            </span>
          </div>

          {/* Right Toolbar Controls: 5 dark rounded buttons */}
          <div className="flex items-center gap-2 shrink-0 relative z-10">
            {/* Settings */}
            <Popover
              content={soundSettingsContent}
              trigger="click"
              placement="bottomRight"
              zIndex={100005}
              getPopupContainer={() => fullscreenContainerRef.current || document.body}
              overlayClassName="tv-sound-settings-popover"
            >
              <Tooltip title="Cài đặt Pháo bông & Âm thanh TV">
                <Button
                  type="text"
                  data-testid="tv-fullscreen-settings-button"
                  icon={<Settings className="w-4 h-4 text-zinc-300" />}
                  className="!rounded-xl !h-10 !w-10 !p-0 flex items-center justify-center border border-zinc-700/60 bg-zinc-800/90 hover:bg-zinc-700/80 text-zinc-300"
                />
              </Tooltip>
            </Popover>

            {/* Sound & Voice Celebration Settings Popover */}
            <Popover
              content={soundSettingsContent}
              trigger="click"
              placement="bottomRight"
              zIndex={100005}
              getPopupContainer={() => fullscreenContainerRef.current || document.body}
              overlayClassName="tv-sound-settings-popover"
            >
              <Tooltip title="Cài đặt âm thanh & Live Voice Celebration">
                <Button
                  type="text"
                  data-testid="tv-sound-settings-button"
                  icon={
                    !voiceSettings.soundEnabled || isQuietHours ? (
                      <VolumeX className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
                    )
                  }
                  className={`!rounded-xl !h-10 !w-10 !p-0 flex items-center justify-center border ${
                    voiceSettings.soundEnabled && !isQuietHours
                      ? '!text-amber-400 border-amber-500/50 bg-zinc-800/90 hover:!bg-amber-500/20'
                      : '!text-zinc-400 border-zinc-700/60 bg-zinc-800/90 hover:!bg-zinc-700/80'
                  }`}
                />
              </Tooltip>
            </Popover>

            {/* TV Journal Modal Trigger (MOS-BUG-90) */}
            <Tooltip title="Nhật ký giám sát Live TV Monitor">
              <Button
                type="text"
                data-testid="tv-journal-button"
                icon={<User className="w-4 h-4 text-zinc-300" />}
                onClick={handleOpenJournal}
                className="!rounded-xl !h-10 !w-10 !p-0 flex items-center justify-center border border-zinc-700/60 bg-zinc-800/90 hover:bg-zinc-700/80 text-zinc-300"
              />
            </Tooltip>

            {/* Browser Fullscreen toggle */}
            <Tooltip title={isBrowserFullscreen ? 'Thoát toàn màn hình trình duyệt' : 'Toàn màn hình trình duyệt'}>
              <Button
                type="text"
                icon={
                  isBrowserFullscreen ? (
                    <Minimize2 className="w-4 h-4 text-zinc-300" />
                  ) : (
                    <Maximize2 className="w-4 h-4 text-zinc-300" />
                  )
                }
                onClick={toggleBrowserFullscreen}
                className="!rounded-xl !h-10 !w-10 !p-0 flex items-center justify-center border border-zinc-700/60 bg-zinc-800/90 hover:bg-zinc-700/80 text-zinc-300"
              />
            </Tooltip>

            {/* Close TV View */}
            <Tooltip title="Thoát chế độ TV Monitor (Phím Esc)">
              <Button
                type="text"
                icon={<X className="w-4 h-4 text-zinc-300" />}
                onClick={onClose}
                className="!bg-zinc-800/90 hover:!bg-zinc-700/80 !text-zinc-200 !font-semibold !border !border-zinc-700/60 !rounded-xl !h-10 px-3.5 flex items-center gap-1.5 text-xs shadow-md"
              >
                <span>Đóng TV</span>
              </Button>
            </Tooltip>
          </div>
        </div>

        {/* ROW 2: EXPANSIVE SHIFT TIMELINE BAR (WIDTH ~1160px, CENTERED, MATCHING MOCKUP 3) */}
        <div className="w-full max-w-[1160px] mx-auto relative flex items-center justify-between h-10 mt-3 mb-2 sm:mt-4 sm:mb-3 px-4">
          {/* Layer 1: Background & Active Track SVG (z-0, sits behind hour node pills) */}
          <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-0">
            <defs>
              {/* Trailing Fading Beam Gradient (from subtle amber to brilliant white/gold core) */}
              <linearGradient id="activeTrailingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(245, 158, 11, 0)" />
                <stop offset="25%" stopColor="rgba(245, 158, 11, 0.2)" />
                <stop offset="65%" stopColor="rgba(186, 230, 253, 0.6)" />
                <stop offset="90%" stopColor="rgba(255, 255, 255, 0.9)" />
                <stop offset="100%" stopColor="rgba(255, 255, 255, 1)" />
              </linearGradient>
            </defs>

            {/* Background dashed line (full future track between first and last node) */}
            <line x1="2%" y1="20" x2="98%" y2="20" stroke="rgb(63, 63, 70)" strokeWidth="1.8" strokeDasharray="4 4" />

            {/* Glowing Trailing Diffuse Beam (Behind the orb, fading trail) */}
            <rect
              x="2%"
              y="16"
              width={`${Math.max(0, shiftProgress.percent - 2)}%`}
              height="8"
              rx="4"
              fill="url(#activeTrailingGrad)"
              opacity="0.7"
              filter="blur(3px)"
            />

            {/* Glowing Active Trailing Beam (Solid crisp bar with trail fade) */}
            <rect
              x="2%"
              y="18.5"
              width={`${Math.max(0, shiftProgress.percent - 2)}%`}
              height="3"
              rx="1.5"
              fill="url(#activeTrailingGrad)"
              filter="drop-shadow(0 0 5px rgba(255,255,255,0.95)) drop-shadow(0 0 12px rgba(245,158,11,0.8))"
            />
          </svg>

          {/* Layer 2: Shift Hour Nodes (z-10, sits ON TOP of trailing beam, so [15h] text is on top of beam) */}
          <div className="relative w-full flex items-center justify-between z-10 pointer-events-none">
            {shiftNodes.map((node, idx) => {
              const nodePercent = (idx / (shiftNodes.length - 1)) * 100;
              const isPast = nodePercent <= shiftProgress.percent;
              return (
                <span
                  key={node}
                  className={`px-1.5 py-0.5 rounded font-mono text-xs sm:text-sm font-bold bg-zinc-950 transition-colors ${
                    isPast ? 'text-amber-400' : 'text-zinc-500'
                  }`}
                >
                  {node}
                </span>
              );
            })}
          </div>

          {/* Layer 3: Current Time Indicator (z-20, sits ON TOP of hour nodes so glowing orb is on top of [16h]) */}
          <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-20">
            <svg x={`${shiftProgress.percent}%`} y="20" overflow="visible">
              {/* Floating Time Label above Orb */}
              <text
                x="0"
                y="-15"
                textAnchor="middle"
                fill="rgb(251, 191, 36)"
                fontSize="13"
                fontFamily="monospace"
                fontWeight="bold"
                filter="drop-shadow(0 0 6px rgba(245,158,11,0.9))"
              >
                {shiftProgress.timeFormatted}
              </text>

              {/* Glowing Orb Halo */}
              <circle
                cx="0"
                cy="0"
                r="11"
                fill="rgba(245, 158, 11, 0.4)"
                filter="drop-shadow(0 0 12px rgb(245,158,11))"
              />

              {/* Glowing Orb Ring */}
              <circle
                cx="0"
                cy="0"
                r="6.5"
                fill="white"
                stroke="rgb(245, 158, 11)"
                strokeWidth="2.5"
                filter="drop-shadow(0 0 10px rgb(255,255,255))"
              />
            </svg>
          </svg>
        </div>
      </header>

      {/* 2. MAIN TV MONITOR BODY: DUAL SEMICIRCLE COCKPIT (OPTION 1) */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-3.5 lg:gap-5 my-1 flex-1 items-stretch min-h-0">
        {/* COLUMN 1: BOOK HÔM NAY (TẠO LỊCH - HÀNH ĐỘNG DẪN DẮT) */}
        <div
          className={`rounded-3xl p-4 sm:p-5 lg:p-6 flex flex-col justify-between border backdrop-blur-xl transition-all shadow-2xl relative overflow-hidden ${bookStyles.container}`}
        >
          {/* Realistic Physics Fireworks (bắn khi đạt mốc >= 100% hoặc khi test) */}
          <RealisticCardFireworks
            active={testFireworksBook || ((voiceSettings.fireworksEnabled ?? true) && isBookOver100)}
            isFrenzy={frenzyBook || testFireworksBook}
            soundEnabled={voiceSettings.soundEnabled}
            volume={voiceSettings.volume}
            theme={bookTier === 'emerald' ? 'emerald' : bookTier === 'amber' ? 'amber' : 'gold'}
            cardLabel="BOOK"
          />

          {/* Ambient inner glow */}
          <div
            className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${bookStyles.ambientGlow}`}
          />

          {/* Header */}
          <div className="flex items-center justify-between shrink-0 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${bookStyles.iconBox}`}>
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight m-0">
                BOOK HÔM NAY · TẠO LỊCH
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-xl font-mono text-xs font-bold border ${bookStyles.headerTargetBadge}`}
              >
                Chỉ tiêu: ≥ {metrics.bookTarget} Book
              </span>
              <span
                className={`px-3 py-1 rounded-xl font-mono text-xs font-black border ${
                  metrics.gapBook >= 0
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                    : metrics.gapBook === -1
                      ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                      : 'bg-rose-950 text-rose-300 border-rose-500/40'
                }`}
              >
                {metrics.gapBook >= 0 ? `+${metrics.gapBook} ĐÚNG NHỊP` : `${metrics.gapBook} CHẬM NHỊP`}
              </span>
            </div>
          </div>

          {/* Semicircle Gauge (Option 1) - Hero Centered */}
          <div className="flex-1 flex flex-col items-center justify-center my-auto min-h-0 py-1 w-full max-w-[720px] mx-auto relative z-10">
            <SemicircleGauge
              percent={metrics.bookPercent}
              actual={metrics.bookActual}
              target={metrics.bookTarget}
              unit="Book"
              label=""
              hideLabelText={true}
              hideUnitText={true}
              tone={bookTier}
              sizeVariant="tv"
              actualDataTestId="tv-monitor-fullscreen-book-actual"
              heightClass="h-[290px] sm:h-[315px] lg:h-[330px]"
              showPacingArc={false}
              gapText={
                metrics.gapBook >= 0 ? `GAP: +${metrics.gapBook} VƯỢT NHỊP` : `GAP: ${metrics.gapBook} CHẬM NHỊP`
              }
              gapType={metrics.gapBook >= 0 ? 'positive' : metrics.gapBook === -1 ? 'neutral' : 'negative'}
            />
          </div>

          {/* 4-Stat Horizontal Ribbon (Option 1) */}
          <div
            className={`mt-auto shrink-0 bg-black/50 rounded-2xl p-3 sm:p-4 relative z-10 ${bookStyles.ribbonBorder}`}
          >
            <div className="grid grid-cols-4 gap-2 text-center font-mono divide-x divide-zinc-800">
              <div>
                <span className="text-[11px] sm:text-xs text-zinc-400 block mb-1">Đã đạt</span>
                <span className={`text-xl sm:text-2xl font-black block tabular-nums ${bookStyles.ribbonActualText}`}>
                  {metrics.bookActual}
                </span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-zinc-400 block mb-1">Kỳ vọng giờ này</span>
                <span className="text-xl sm:text-2xl font-black text-zinc-300 block tabular-nums">
                  {metrics.expectedBook}
                </span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-zinc-400 block mb-1">Nhịp (Gap)</span>
                <span
                  className={`text-xl sm:text-2xl font-black block tabular-nums ${
                    metrics.gapBook >= 0
                      ? 'text-emerald-400'
                      : metrics.gapBook === -1
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {metrics.gapBook >= 0 ? `+${metrics.gapBook}` : metrics.gapBook}
                </span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-zinc-400 block mb-1">Còn thiếu</span>
                <span className="text-xl sm:text-2xl font-black text-amber-300 block tabular-nums">
                  {metrics.remainingBook}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>
                Định mức tối thiểu mỗi ngày:{' '}
                <strong className="text-zinc-200">{metrics.bookTarget} Cuộc hẹn thành công</strong>
              </span>
              <span className="text-purple-300 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Combo: +{metrics.comboLiveBookActual || 0} Book
              </span>
            </div>
          </div>
        </div>

        {/* COLUMN 2: DONE HÔM NAY (KHÁCH LẺ - KẾT QUẢ THEO SAU) */}
        <div
          className={`rounded-3xl p-4 sm:p-5 lg:p-6 flex flex-col justify-between border backdrop-blur-xl transition-all shadow-2xl relative overflow-hidden ${doneStyles.container}`}
        >
          {/* Realistic Physics Fireworks (bắn khi đạt mốc >= 100% hoặc khi test) */}
          <RealisticCardFireworks
            active={testFireworksDone || ((voiceSettings.fireworksEnabled ?? true) && isDoneOver100)}
            isFrenzy={frenzyDone || testFireworksDone}
            soundEnabled={voiceSettings.soundEnabled}
            volume={voiceSettings.volume}
            theme={doneTier === 'emerald' ? 'emerald' : doneTier === 'amber' ? 'amber' : 'gold'}
            cardLabel="DONE"
          />

          {/* Ambient inner glow */}
          <div
            className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${doneStyles.ambientGlow}`}
          />

          {/* Header */}
          <div className="flex items-center justify-between shrink-0 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${doneStyles.iconBox}`}>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight m-0">DONE KHÁCH LẺ</h2>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono font-bold">
                    KPI CHÍNH
                  </span>
                </div>
                <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
                  Khách lẻ đơn hoàn tất hôm nay (Single)
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-xl font-mono text-xs font-bold border ${doneStyles.headerTargetBadge}`}
              >
                Chỉ tiêu: {metrics.doneTarget} Done
              </span>
              <span
                className={`px-3 py-1 rounded-xl font-mono text-xs font-black border ${
                  metrics.gapDone >= 0
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                    : metrics.gapDone === -1
                      ? 'bg-amber-950 text-amber-300 border-amber-500/40'
                      : 'bg-rose-950 text-rose-300 border-rose-500/40'
                }`}
              >
                {metrics.gapDone >= 0 ? `+${metrics.gapDone} ĐÚNG NHỊP` : `${metrics.gapDone} CHẬM NHỊP`}
              </span>
            </div>
          </div>

          {/* Semicircle Gauge (Option 1) - Hero Centered */}
          <div className="flex-1 flex flex-col items-center justify-center my-auto min-h-0 py-1 w-full max-w-[720px] mx-auto relative z-10">
            <SemicircleGauge
              percent={metrics.donePercent}
              actual={metrics.doneActual}
              target={metrics.doneTarget}
              unit="Done"
              label=""
              hideLabelText={true}
              hideUnitText={true}
              tone={doneTier}
              sizeVariant="tv"
              actualDataTestId="tv-monitor-fullscreen-done-actual"
              heightClass="h-[290px] sm:h-[315px] lg:h-[330px]"
              showPacingArc={false}
              gapText={
                metrics.gapDone >= 0 ? `GAP: +${metrics.gapDone} VƯỢT NHỊP` : `GAP: ${metrics.gapDone} CHẬM NHỊP`
              }
              gapType={metrics.gapDone >= 0 ? 'positive' : metrics.gapDone === -1 ? 'neutral' : 'negative'}
            />
          </div>

          {/* 4-Stat Horizontal Ribbon (Option 1) */}
          <div
            className={`mt-auto shrink-0 bg-black/50 rounded-2xl p-3 sm:p-4 relative z-10 ${doneStyles.ribbonBorder}`}
          >
            <div className="grid grid-cols-4 gap-2 text-center font-mono divide-x divide-zinc-800">
              <div>
                <span className="text-[11px] sm:text-xs text-zinc-400 block mb-1">Đã đạt</span>
                <span className={`text-xl sm:text-2xl font-black block tabular-nums ${doneStyles.ribbonActualText}`}>
                  {metrics.doneActual}
                </span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-zinc-400 block mb-1">Kỳ vọng giờ này</span>
                <span className="text-xl sm:text-2xl font-black text-zinc-300 block tabular-nums">
                  {metrics.expectedDone}
                </span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-zinc-400 block mb-1">Nhịp (Gap)</span>
                <span
                  className={`text-xl sm:text-2xl font-black block tabular-nums ${
                    metrics.gapDone >= 0
                      ? 'text-emerald-400'
                      : metrics.gapDone === -1
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {metrics.gapDone >= 0 ? `+${metrics.gapDone}` : metrics.gapDone}
                </span>
              </div>
              <div>
                <span className="text-[11px] sm:text-xs text-zinc-400 block mb-1">Còn thiếu</span>
                <span className="text-xl sm:text-2xl font-black text-amber-300 block tabular-nums">
                  {metrics.remainingDone}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>
                Chỉ tiêu phân bổ ca: <strong className="text-zinc-200">{metrics.doneTarget} Khách lẻ</strong>
              </span>
              <span className="text-purple-300 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Combo: +{metrics.comboLiveDoneActual || 0} Done
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* 2.5 INDIVIDUAL STAFF CONTRIBUTIONS TODAY (MOS-FEAT-83) */}
      <TelesaleTvStaffContributionGrid staffTargets={overview.staffTargets} totalTeamBookToday={metrics.bookActual} />

      {/* 3. BOTTOM SECTION: WALL STREET TICKER TAPE (MOCKUP 3) */}
      <footer className="relative z-10 w-full h-14 bg-zinc-950/98 border-t border-zinc-800/90 shadow-[0_-4px_24px_rgba(0,0,0,0.5)] px-8 flex items-center justify-between text-sm sm:text-base font-sans shrink-0 -mx-3 sm:-mx-4 -mb-3 sm:-mb-4 backdrop-blur-md">
        <div className="flex items-center gap-2.5 leading-none">
          <Clock className="w-5 h-5 text-amber-400 animate-pulse shrink-0" />
          <span className="text-zinc-400 font-semibold leading-none">Ca chiều:</span>
          <span className="text-amber-300 font-black tabular-nums text-base sm:text-lg leading-none">
            {pacing.hoursRemaining !== undefined && pacing.minsRemaining !== undefined
              ? `Còn ${pacing.hoursRemaining}h ${pacing.minsRemaining < 10 ? '0' : ''}${pacing.minsRemaining}m`
              : pacing.countdownText}
          </span>
        </div>

        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] mx-2 shrink-0" />

        <div className="flex items-center gap-2.5 leading-none">
          <span className="text-lg leading-none">🎯</span>
          <span className="text-zinc-400 font-semibold leading-none">Tiến độ:</span>
          <span className="text-blue-300 font-black tabular-nums text-base sm:text-lg leading-none">
            {metrics.bookActual}/{metrics.bookTarget} Book ({metrics.bookPercent}%)
          </span>
        </div>

        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] mx-2 shrink-0" />

        <div className="flex items-center gap-2.5 leading-none">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-zinc-400 font-semibold leading-none">Cần</span>
          <span className="text-amber-300 font-black tabular-nums text-base sm:text-lg leading-none">
            {metrics.remainingBook} Book
          </span>
          <span className="text-zinc-400 font-semibold leading-none">nữa</span>
        </div>

        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] mx-2 shrink-0" />

        <div className="flex items-center gap-2.5 leading-none">
          <Rocket className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-zinc-400 font-semibold leading-none">Vượt nhịp:</span>
          <span
            className={`font-black tabular-nums text-base sm:text-lg leading-none ${
              metrics.gapBook >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {metrics.gapBook >= 0 ? `+${metrics.gapBook}` : metrics.gapBook}
          </span>
        </div>

        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)] mx-2 shrink-0" />

        <div className="flex items-center gap-2.5 leading-none">
          <Crown className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-zinc-400 font-semibold leading-none">Dẫn đầu:</span>
          <span className="text-amber-200 font-black text-base sm:text-lg leading-none">
            {topStaff && (topStaff.bookToday ?? 0) > 0 ? `${topStaff.name} (${topStaff.bookToday} Book)` : 'Chưa có'}
          </span>
        </div>
      </footer>

      {/* TV Journal Modal (MOS-BUG-90) */}
      <TelesaleTvJournalModal
        open={journalOpen}
        onClose={() => setJournalOpen(false)}
        staffList={overview.staffTargets || []}
      />
    </div>
  );
};
