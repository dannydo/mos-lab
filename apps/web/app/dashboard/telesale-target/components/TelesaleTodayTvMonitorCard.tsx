'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Tooltip, Button, theme, Popover, Switch, Slider } from 'antd';
import { Tv, Calendar, Maximize2, Volume2, VolumeX, ClipboardList, Sparkles, Settings, Square } from 'lucide-react';
import { TelesaleTargetOverview, isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { calculateShiftPacing, calculateTvMonitorMetrics } from '../utils/tv-monitor-pacing';
import { TelesaleTvJournalModal } from './TelesaleTvJournalModal';
import { SemicircleGauge } from './SemicircleGauge';
import { RealisticCardFireworks } from './RealisticCardFireworks';
import { useTelesaleTvLiveCelebration, TvCelebrationSettings } from '../hooks/useTelesaleTvLiveCelebration';
import { useTheme } from '../../../../context/ThemeContext';

// Tiến độ thực tế: đỏ < 80%, vàng 80-99%, xanh >= 100%
const getProgressTier = (percent: number): 'rose' | 'amber' | 'emerald' => {
  if (percent < 80) return 'rose';
  if (percent < 100) return 'amber';
  return 'emerald';
};

const getCardTierStyles = (tier: 'rose' | 'amber' | 'emerald', isDark = true) => {
  switch (tier) {
    case 'emerald':
      return {
        container: isDark
          ? 'bg-gradient-to-b from-emerald-950/30 to-zinc-950/80 rounded-2xl p-2.5 border border-emerald-500/40 flex flex-col justify-between shadow-inner shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden'
          : 'bg-gradient-to-b from-emerald-50/70 to-white rounded-2xl p-2.5 border border-emerald-200/90 flex flex-col justify-between shadow-2xs relative overflow-hidden',
        badge: isDark
          ? 'text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/40 font-mono font-bold text-[9px]'
          : 'text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300 font-mono font-bold text-[9px]',
        title: isDark ? 'text-emerald-200 text-xs font-bold' : 'text-emerald-900 text-xs font-bold',
        icon: isDark ? 'text-emerald-400' : 'text-emerald-600',
        bottomBorder: isDark ? 'border-emerald-900/40' : 'border-slate-200',
        bottomText: isDark ? 'text-emerald-300 font-bold' : 'text-emerald-700 font-bold',
        targetBadge: isDark ? 'text-[9px] text-emerald-400 font-mono' : 'text-[9px] text-emerald-700 font-mono',
      };
    case 'amber':
      return {
        container: isDark
          ? 'bg-gradient-to-b from-amber-950/30 to-zinc-950/80 rounded-2xl p-2.5 border border-amber-500/40 flex flex-col justify-between shadow-inner shadow-[0_0_20px_rgba(245,158,11,0.15)] relative overflow-hidden'
          : 'bg-gradient-to-b from-amber-50/70 to-white rounded-2xl p-2.5 border border-amber-200/90 flex flex-col justify-between shadow-2xs relative overflow-hidden',
        badge: isDark
          ? 'text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/40 font-mono font-bold text-[9px]'
          : 'text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 font-mono font-bold text-[9px]',
        title: isDark ? 'text-amber-200 text-xs font-bold' : 'text-amber-900 text-xs font-bold',
        icon: isDark ? 'text-amber-400' : 'text-amber-600',
        bottomBorder: isDark ? 'border-amber-900/40' : 'border-slate-200',
        bottomText: isDark ? 'text-amber-300 font-bold' : 'text-amber-700 font-bold',
        targetBadge: isDark ? 'text-[9px] text-amber-400 font-mono' : 'text-[9px] text-amber-700 font-mono',
      };
    case 'rose':
    default:
      return {
        container: isDark
          ? 'bg-gradient-to-b from-rose-950/30 to-zinc-950/80 rounded-2xl p-2.5 border border-rose-500/40 flex flex-col justify-between shadow-inner shadow-[0_0_20px_rgba(244,63,94,0.15)] relative overflow-hidden'
          : 'bg-gradient-to-b from-rose-50/70 to-white rounded-2xl p-2.5 border border-rose-200/90 flex flex-col justify-between shadow-2xs relative overflow-hidden',
        badge: isDark
          ? 'text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-500/40 font-mono font-bold text-[9px]'
          : 'text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300 font-mono font-bold text-[9px]',
        title: isDark ? 'text-rose-200 text-xs font-bold' : 'text-rose-900 text-xs font-bold',
        icon: isDark ? 'text-rose-400' : 'text-rose-600',
        bottomBorder: isDark ? 'border-rose-900/40' : 'border-slate-200',
        bottomText: isDark ? 'text-rose-300 font-bold' : 'text-rose-700 font-bold',
        targetBadge: isDark ? 'text-[9px] text-rose-400 font-mono' : 'text-[9px] text-rose-700 font-mono',
      };
  }
};

interface TelesaleTodayTvMonitorCardProps {
  overview: TelesaleTargetOverview;
  onOpenFullscreen?: () => void;
  isTvOpen?: boolean;
  liveCelebration?: ReturnType<typeof useTelesaleTvLiveCelebration>;
}

export const TelesaleTodayTvMonitorCard: React.FC<TelesaleTodayTvMonitorCardProps> = ({
  overview,
  onOpenFullscreen,
  isTvOpen = false,
  liveCelebration,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const { teamDaily } = overview;
  const [now, setNow] = useState<Date>(new Date());
  const [journalOpen, setJournalOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

  // Fallback local settings if liveCelebration is not provided
  const [localSettings, setLocalSettings] = useState<TvCelebrationSettings>({
    soundEnabled: true,
    volume: 0.9,
    eventTypeFilter: 'ALL',
    quietModeEnabled: false,
    voiceStyle: 'MALE_CHARM',
    fireworksEnabled: true,
  });

  useEffect(() => {
    if (liveCelebration) return;
    try {
      const raw = localStorage.getItem('MOS_TV_MONITOR_VOICE_SETTINGS');
      if (raw) {
        setLocalSettings((prev) => ({ ...prev, ...JSON.parse(raw) }));
      }
    } catch {}
  }, [liveCelebration]);

  const settings = liveCelebration ? liveCelebration.settings : localSettings;
  const updateSettings = useCallback(
    (newSettings: Partial<TvCelebrationSettings>) => {
      if (liveCelebration) {
        liveCelebration.updateSettings(newSettings);
      } else {
        setLocalSettings((prev) => {
          const updated = { ...prev, ...newSettings };
          try {
            localStorage.setItem('MOS_TV_MONITOR_VOICE_SETTINGS', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('mos:tv-settings-updated', { detail: updated }));
          } catch {}
          return updated;
        });
      }
    },
    [liveCelebration]
  );

  const fireworksEnabled = settings.fireworksEnabled ?? true;
  const soundEnabled = settings.soundEnabled ?? true;
  const volume = settings.volume ?? 0.9;

  // Test fireworks state
  const [testFireworksBook, setTestFireworksBook] = useState(false);
  const [testFireworksCheckin, setTestFireworksCheckin] = useState(false);
  const [testFireworksDone, setTestFireworksDone] = useState(false);
  const testTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerTestFireworks = (type: 'BOOK' | 'DONE' | 'CHECKIN') => {
    if (testTimerRef.current) clearTimeout(testTimerRef.current);
    if (type === 'BOOK') {
      setTestFireworksBook(true);
      setTestFireworksCheckin(false);
      setTestFireworksDone(false);
      testTimerRef.current = setTimeout(() => setTestFireworksBook(false), 8000);
    } else if (type === 'CHECKIN') {
      setTestFireworksCheckin(true);
      setTestFireworksBook(false);
      setTestFireworksDone(false);
      testTimerRef.current = setTimeout(() => setTestFireworksCheckin(false), 8000);
    } else {
      setTestFireworksDone(true);
      setTestFireworksCheckin(false);
      setTestFireworksBook(false);
      testTimerRef.current = setTimeout(() => setTestFireworksDone(false), 8000);
    }
  };

  const stopTestFireworks = () => {
    if (testTimerRef.current) clearTimeout(testTimerRef.current);
    setTestFireworksBook(false);
    setTestFireworksCheckin(false);
    setTestFireworksDone(false);
  };

  useEffect(() => {
    return () => {
      if (testTimerRef.current) clearTimeout(testTimerRef.current);
    };
  }, []);

  const isManagerOrAdmin = useMemo(() => {
    try {
      const stored = localStorage.getItem('mos_auth_user');
      if (stored) {
        const u = JSON.parse(stored);
        return isAdminOrSuperAdminRole(u?.role) || u?.role === 'manager';
      }
    } catch {}
    return true;
  }, []);

  // Update clock every 5 seconds for smooth countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const pacing = calculateShiftPacing(now);
  const metrics = calculateTvMonitorMetrics(teamDaily, pacing);

  const isDoneOver100 = metrics.donePercent >= 100;
  const isCheckinOver100 = metrics.checkinPercent >= 100;
  const isBookOver100 = metrics.bookPercent >= 100;

  const expectedBookPacingPercent = Math.min(
    100,
    Math.round(((metrics.expectedBook || 0) / (metrics.bookTarget || 1)) * 100)
  );

  const expectedCheckinPacingPercent = Math.min(
    100,
    Math.round(((metrics.expectedCheckin || 0) / (metrics.checkinTarget || 1)) * 100)
  );

  const expectedDonePacingPercent = Math.min(
    100,
    Math.round(((metrics.expectedDone || 0) / (metrics.doneTarget || 1)) * 100)
  );

  const bookTier = metrics.bookTier;
  const checkinTier = metrics.checkinTier;
  const doneTier = metrics.doneTier;
  const bookStyles = getCardTierStyles(bookTier, isDark);
  const checkinStyles = getCardTierStyles(checkinTier, isDark);
  const doneStyles = getCardTierStyles(doneTier, isDark);

  // Popover configuration content for fireworks and sound
  const settingsPopoverContent = (
    <div className={`w-72 sm:w-80 p-1 flex flex-col gap-3.5 ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
      {/* Title */}
      <div
        className={`border-b ${isDark ? 'border-zinc-800/80' : 'border-slate-200'} pb-2 flex items-center justify-between`}
      >
        <div>
          <span
            className={`font-bold text-xs sm:text-sm ${isDark ? 'text-zinc-100' : 'text-slate-900'} flex items-center gap-1.5`}
          >
            <Settings className="w-3.5 h-3.5 text-amber-500" />
            Cấu hình Pháo bông & Âm thanh
          </span>
          <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'} block mt-0.5`}>
            TV Monitor Telesales Hôm Nay
          </span>
        </div>
      </div>

      {/* Switch 1: Fireworks */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <span
            className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'} flex items-center gap-1.5`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            Pháo bông chúc mừng
          </span>
          <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'} block mt-0.5 leading-tight`}>
            Tự động bắn pháo khi Book hoặc Done đạt ≥ 100%
          </span>
        </div>
        <Switch
          checked={fireworksEnabled}
          onChange={(checked) => updateSettings({ fireworksEnabled: checked })}
          className={isDark ? 'bg-zinc-700 shrink-0' : 'shrink-0'}
        />
      </div>

      {/* Switch 2: Sound */}
      <div
        className={`flex items-center justify-between gap-2 border-t ${isDark ? 'border-zinc-800/80' : 'border-slate-200'} pt-2.5`}
      >
        <div>
          <span
            className={`text-xs font-semibold ${isDark ? 'text-zinc-200' : 'text-slate-800'} flex items-center gap-1.5`}
          >
            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
            Âm thanh hiệu ứng & Loa
          </span>
          <span className={`text-[10px] ${isDark ? 'text-zinc-400' : 'text-slate-500'} block mt-0.5 leading-tight`}>
            Tiếng rít phóng pháo hoa, tiếng nổ boom & chúc mừng
          </span>
        </div>
        <Switch
          checked={soundEnabled}
          onChange={(checked) => updateSettings({ soundEnabled: checked })}
          className={isDark ? 'bg-zinc-700 shrink-0' : 'shrink-0'}
        />
      </div>

      {/* Slider: Volume */}
      <div className={`border-t ${isDark ? 'border-zinc-800/80' : 'border-slate-200'} pt-2.5`}>
        <div
          className={`flex justify-between text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'} mb-1`}
        >
          <span>Âm lượng loa</span>
          <span className={`${isDark ? 'text-amber-300' : 'text-amber-600'} font-bold tabular-nums`}>
            {Math.round(volume * 100)}%
          </span>
        </div>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(val) => updateSettings({ volume: val })}
          disabled={!soundEnabled}
        />
      </div>

      {/* Section: Test Fireworks */}
      <div className={`border-t ${isDark ? 'border-zinc-800/80' : 'border-slate-200'} pt-2.5 flex flex-col gap-2`}>
        <div className="flex items-center justify-between">
          <span
            className={`text-[11px] font-mono ${isDark ? 'text-zinc-300' : 'text-slate-700'} font-bold flex items-center gap-1`}
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            Bắn thử nghiệm pháo hoa:
          </span>
          {(testFireworksBook || testFireworksDone) && (
            <button
              type="button"
              onClick={stopTestFireworks}
              className={`text-[10px] ${isDark ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:text-rose-700'} flex items-center gap-0.5 font-bold cursor-pointer`}
            >
              <Square className="w-2.5 h-2.5 fill-current" />
              Dừng bắn
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Button
            size="small"
            onClick={() => triggerTestFireworks('BOOK')}
            className={`text-[11px] font-bold h-7 rounded-lg transition-all ${
              testFireworksBook
                ? 'bg-sky-600 text-white border-sky-400 animate-pulse'
                : isDark
                  ? 'bg-sky-950/80 border-sky-500/60 text-sky-300 hover:bg-sky-900'
                  : 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100'
            }`}
          >
            🎆 Pháo Book
          </Button>
          <Button
            size="small"
            onClick={() => triggerTestFireworks('CHECKIN')}
            className={`text-[11px] font-bold h-7 rounded-lg transition-all ${
              testFireworksCheckin
                ? 'bg-emerald-600 text-white border-emerald-400 animate-pulse'
                : isDark
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            🎆 Pháo Check-in
          </Button>
        </div>
      </div>

      {/* Section: Test Voice Celebrations */}
      {liveCelebration?.triggerDemoCelebration && (
        <div className={`border-t ${isDark ? 'border-zinc-800/80' : 'border-slate-200'} pt-2.5 flex flex-col gap-1.5`}>
          <span
            className={`text-[11px] font-mono ${isDark ? 'text-zinc-300' : 'text-slate-700'} font-bold flex items-center gap-1`}
          >
            <Volume2 className="w-3 h-3 text-blue-500" />
            Thử loa giọng nói:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="small"
              onClick={() => liveCelebration.triggerDemoCelebration('BOOK')}
              className={`text-[11px] ${
                isDark
                  ? 'bg-blue-950/80 border-blue-500/60 text-blue-300 hover:bg-blue-900'
                  : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
              } h-7 rounded-lg font-medium`}
            >
              Loa Book
            </Button>
            <Button
              size="small"
              onClick={() => liveCelebration.triggerDemoCelebration('CHECKIN')}
              className={`text-[11px] ${
                isDark
                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
              } h-7 rounded-lg font-medium`}
            >
              Loa Check-in
            </Button>
            <Button
              size="small"
              onClick={() => liveCelebration.triggerDemoCelebration('COMBO')}
              className={`text-[11px] ${
                isDark
                  ? 'bg-purple-950/80 border-purple-500/60 text-purple-300 hover:bg-purple-900'
                  : 'bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100'
              } h-7 rounded-lg font-medium`}
            >
              Loa Combo
            </Button>
            <Button
              size="small"
              onClick={() => liveCelebration.triggerDemoCelebration('TIP')}
              className={`text-[11px] ${
                isDark
                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:bg-amber-900'
                  : 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
              } h-7 rounded-lg font-medium`}
            >
              Loa Tip
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <section
      className={`relative overflow-hidden rounded-3xl border p-3.5 backdrop-blur-md h-full flex flex-col justify-between group transition-all duration-300 ${
        isDark
          ? `bg-gradient-to-b from-amber-950/25 via-zinc-950/95 to-zinc-950 glass-card shadow-2xl ${
              isDoneOver100 || isBookOver100
                ? 'border-amber-400/90 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
                : 'border-amber-500/35 hover:border-amber-400/70'
            }`
          : `bg-white shadow-sm ${
              isDoneOver100 || isBookOver100
                ? 'border-amber-400 shadow-md ring-2 ring-amber-400/20'
                : 'border-slate-200/90 hover:border-amber-400/70'
            }`
      }`}
    >
      <TelesaleTvJournalModal open={journalOpen} onClose={() => setJournalOpen(false)} />

      {/* 1. Header Bar */}
      <div>
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center justify-center p-1 rounded-lg ${
                isDark
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}
            >
              <Tv
                className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400 animate-pulse' : 'text-amber-600 animate-pulse'}`}
              />
            </span>
            <span
              className={`${isDark ? 'text-amber-300' : 'text-amber-800'} text-xs font-black uppercase tracking-wider`}
            >
              TV MONITOR HÔM NAY
            </span>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <span
              className={`hidden sm:inline-flex items-center gap-1 text-[10px] ${
                isDark ? 'text-zinc-300 bg-black/60 border-zinc-800' : 'text-slate-600 bg-slate-100 border-slate-200'
              } px-2 py-0.5 rounded-lg border font-mono tabular-nums`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {teamDaily.date}
            </span>

            {/* Quick Loa toggle button */}
            <Tooltip
              title={
                soundEnabled
                  ? 'Âm thanh TV đang BẬT · Bấm để tắt tiếng nhanh'
                  : 'Loa đang TẮT · Bấm để BẬT âm thanh chúc mừng & pháo hoa'
              }
            >
              <button
                type="button"
                data-testid="tv-card-sound-toggle"
                aria-label={soundEnabled ? 'Loa: Bật' : 'Loa: Tắt'}
                onClick={() => {
                  const nextSound = !soundEnabled;
                  updateSettings({ soundEnabled: nextSound });
                  if (nextSound && metrics.checkinPercent >= 100) {
                    triggerTestFireworks('CHECKIN');
                    liveCelebration?.triggerDemoCelebration('CHECKIN_18');
                  }
                }}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  soundEnabled
                    ? isDark
                      ? 'text-amber-400 bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/25 hover:border-amber-400'
                      : 'text-amber-700 bg-amber-50 border-amber-300 hover:bg-amber-100'
                    : isDark
                      ? 'text-rose-400 bg-rose-950/40 border-rose-500/40 hover:text-rose-300 hover:border-rose-400 animate-pulse'
                      : 'text-rose-600 bg-rose-50 border-rose-300 hover:text-rose-700 animate-pulse'
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )}
                <span className="sr-only">{soundEnabled ? 'Loa: Bật' : 'Loa: Tắt'}</span>
              </button>
            </Tooltip>

            {/* Quick Pháo bông toggle button */}
            <Tooltip
              title={
                fireworksEnabled
                  ? 'Pháo bông đang BẬT · Bấm để tắt hiệu ứng pháo'
                  : 'Pháo bông đang TẮT · Bấm để bật hiệu ứng pháo'
              }
            >
              <button
                type="button"
                data-testid="tv-card-fireworks-toggle"
                aria-label={fireworksEnabled ? 'Pháo: Bật' : 'Pháo: Tắt'}
                onClick={() => updateSettings({ fireworksEnabled: !fireworksEnabled })}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  fireworksEnabled
                    ? isDark
                      ? 'text-emerald-400 bg-emerald-500/15 border-emerald-500/40 hover:bg-emerald-500/25 hover:border-emerald-400'
                      : 'text-emerald-700 bg-emerald-50 border-emerald-300 hover:bg-emerald-100'
                    : isDark
                      ? 'text-zinc-500 bg-zinc-900/80 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                      : 'text-slate-400 bg-slate-50 border-slate-200 hover:text-slate-600'
                }`}
              >
                <Sparkles
                  className={`w-3.5 h-3.5 ${fireworksEnabled ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : isDark ? 'text-zinc-500' : 'text-slate-400'}`}
                />
                <span className="sr-only">{fireworksEnabled ? 'Pháo: Bật' : 'Pháo: Tắt'}</span>
              </button>
            </Tooltip>

            {/* Cài đặt Popover */}
            <Popover
              content={settingsPopoverContent}
              trigger="click"
              placement="bottomRight"
              open={settingsOpen}
              onOpenChange={setSettingsOpen}
              overlayClassName="tv-monitor-settings-popover"
            >
              <Tooltip title="Cài đặt Pháo bông & Âm thanh">
                <button
                  type="button"
                  data-testid="tv-card-settings-button"
                  aria-label="Cài đặt TV"
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    settingsOpen
                      ? isDark
                        ? 'text-amber-300 bg-zinc-800 border-zinc-600'
                        : 'text-amber-700 bg-amber-100 border-amber-300'
                      : isDark
                        ? 'text-zinc-300 bg-zinc-900/80 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-100 hover:border-zinc-700'
                        : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="sr-only">Cài đặt TV</span>
                </button>
              </Tooltip>
            </Popover>

            {isManagerOrAdmin && (
              <Tooltip title="Nhật ký giám sát Live TV Monitor">
                <button
                  type="button"
                  data-testid="tv-journal-card-button"
                  aria-label="Nhật ký TV"
                  onClick={() => setJournalOpen(true)}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isDark
                      ? 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-amber-300 hover:bg-zinc-800 hover:border-zinc-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-amber-700 hover:bg-slate-50'
                  }`}
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  <span className="sr-only">Nhật ký TV</span>
                </button>
              </Tooltip>
            )}

            {onOpenFullscreen && (
              <Tooltip title="Mở Chế độ TV Monitor toàn màn hình cho phòng Telesales">
                <button
                  type="button"
                  data-testid="tv-card-fullscreen-button"
                  aria-label="Mở TV"
                  onClick={onOpenFullscreen}
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isDark
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 hover:border-amber-400 hover:text-amber-300 shadow-sm shadow-amber-500/10'
                      : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-400'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="sr-only">Mở TV</span>
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* 2 Semicircle Arcs (Book Hôm Nay & Done Hôm Nay) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 2.1: Book Hôm Nay (Hành động chính) */}
          <div className={bookStyles.container}>
            {/* Pháo bông thực tế khi đạt mốc >= 100% hoặc khi test (tắt khi mở TV fullscreen) */}
            <RealisticCardFireworks
              active={!isTvOpen && (testFireworksBook || (fireworksEnabled && isBookOver100))}
              isFrenzy={testFireworksBook}
              soundEnabled={!isTvOpen && soundEnabled}
              volume={volume}
              theme="emerald"
              cardLabel="BOOK"
            />
            <div>
              <div
                className={`flex items-center justify-between ${isDark ? 'text-zinc-400' : 'text-slate-500'} text-xs mb-0.5 relative z-10`}
              >
                <span className="flex items-center gap-1">
                  <Calendar className={`w-3.5 h-3.5 ${bookStyles.icon}`} />
                  <strong className={bookStyles.title}>BOOK HÔM NAY</strong>
                </span>
                <span className={bookStyles.badge}>HÀNH ĐỘNG</span>
              </div>

              {/* Semicircle Gauge (Book Hôm Nay) */}
              <div className="relative z-10">
                <SemicircleGauge
                  percent={metrics.bookPercent}
                  actual={metrics.bookActual}
                  target={metrics.bookTarget}
                  label=""
                  hideLabelText={true}
                  tone={bookTier}
                  pacingPercent={expectedBookPacingPercent}
                  gapText={`GAP: ${metrics.gapBook >= 0 ? '+' : ''}${metrics.gapBook}`}
                  gapType={metrics.gapBook >= 0 ? 'positive' : 'negative'}
                />
              </div>

              {/* Horizontal Ribbon 4 Cột */}
              <div
                className={`mt-2 ${
                  isDark
                    ? 'bg-black/60 border-zinc-800/90 divide-zinc-800'
                    : 'bg-slate-50/90 border-slate-200/90 divide-slate-200'
                } border rounded-xl p-1.5 grid grid-cols-4 gap-0.5 text-center font-mono divide-x text-[9px] relative z-10`}
              >
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Kỳ vọng</span>
                  <span
                    className={`text-xs font-black ${isDark ? 'text-zinc-200' : 'text-slate-800'} block tabular-nums`}
                  >
                    {metrics.expectedBook} Book
                  </span>
                </div>
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Nhịp</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${
                      metrics.gapBook >= 0
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : isDark
                          ? 'text-amber-400'
                          : 'text-amber-600'
                    }`}
                  >
                    {metrics.gapBook >= 0 ? `+${metrics.gapBook}` : metrics.gapBook}
                  </span>
                </div>
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Còn thiếu</span>
                  <span className={`text-xs font-black block tabular-nums ${bookStyles.bottomText}`}>
                    {metrics.remainingBook} Book
                  </span>
                </div>
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Mục tiêu</span>
                  <span
                    className={`text-xs font-black ${isDark ? 'text-zinc-200' : 'text-slate-800'} block tabular-nums`}
                  >
                    ≥{metrics.bookTarget}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`mt-2 pt-1.5 border-t ${bookStyles.bottomBorder} text-[9px] sm:text-[9.5px] ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              } font-mono flex items-center justify-between gap-1 whitespace-nowrap relative z-10`}
            >
              <span>
                Mục tiêu: <strong className={bookStyles.bottomText}>≥{metrics.bookTarget} Book</strong>
              </span>
              <span className={`${isDark ? 'text-purple-300' : 'text-purple-700'} font-bold flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-purple-400' : 'bg-purple-500'} shrink-0`} />
                Combo: +{metrics.comboLiveBookActual || 0} Book
              </span>
            </div>
          </div>

          {/* Card 2.2: Check-in Hôm Nay */}
          <div className={checkinStyles.container}>
            {/* Pháo bông thực tế khi đạt mốc >= 100% hoặc khi test (tắt khi mở TV fullscreen) */}
            <RealisticCardFireworks
              active={!isTvOpen && (testFireworksCheckin || (fireworksEnabled && isCheckinOver100))}
              isFrenzy={testFireworksCheckin}
              soundEnabled={!isTvOpen && soundEnabled}
              volume={volume}
              theme="emerald"
              cardLabel="CHECK-IN"
            />
            <div>
              <div
                className={`flex items-center justify-between ${isDark ? 'text-zinc-400' : 'text-slate-500'} text-xs mb-0.5 relative z-10`}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${checkinTier === 'emerald' ? 'bg-emerald-400' : checkinTier === 'amber' ? 'bg-amber-400' : 'bg-rose-400'}`}
                  />
                  <strong className={checkinStyles.title}>CHECK-IN KHÁCH LẺ</strong>
                  {isCheckinOver100 && (
                    <Tooltip title="Đạt 100% chỉ tiêu! Bấm để phát lại chúc mừng & pháo hoa">
                      <button
                        type="button"
                        onClick={() => {
                          if (!soundEnabled) updateSettings({ soundEnabled: true });
                          triggerTestFireworks('CHECKIN');
                          liveCelebration?.triggerDemoCelebration('CHECKIN_18');
                        }}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all cursor-pointer animate-pulse"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                        Chúc mừng!
                      </button>
                    </Tooltip>
                  )}
                </span>
                <span className={checkinStyles.targetBadge}>Chỉ tiêu: {metrics.checkinTarget}</span>
              </div>

              {/* Semicircle Gauge (Check-in Hôm Nay) */}
              <div className="relative z-10">
                <SemicircleGauge
                  percent={metrics.checkinPercent}
                  actual={metrics.checkinActual}
                  target={metrics.checkinTarget}
                  label=""
                  hideLabelText={true}
                  tone={checkinTier}
                  pacingPercent={expectedCheckinPacingPercent}
                  gapText={`GAP: ${metrics.gapCheckin >= 0 ? '+' : ''}${metrics.gapCheckin}`}
                  gapType={metrics.gapCheckin >= 0 ? 'positive' : 'negative'}
                />
              </div>

              {/* Horizontal Ribbon 4 Cột */}
              <div
                className={`mt-2 ${
                  isDark
                    ? 'bg-black/60 border-zinc-800/90 divide-zinc-800'
                    : 'bg-slate-50/90 border-slate-200/90 divide-slate-200'
                } border rounded-xl p-1.5 grid grid-cols-4 gap-0.5 text-center font-mono divide-x text-[9px] relative z-10`}
              >
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Kỳ vọng</span>
                  <span
                    className={`text-xs font-black ${isDark ? 'text-zinc-200' : 'text-slate-800'} block tabular-nums`}
                  >
                    {metrics.expectedCheckin} In
                  </span>
                </div>
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Nhịp</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${
                      metrics.gapCheckin >= 0
                        ? isDark
                          ? 'text-emerald-400'
                          : 'text-emerald-600'
                        : isDark
                          ? 'text-rose-400'
                          : 'text-rose-600'
                    }`}
                  >
                    {metrics.gapCheckin >= 0 ? `+${metrics.gapCheckin}` : metrics.gapCheckin}
                  </span>
                </div>
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Còn thiếu</span>
                  <span className={`text-xs font-black block tabular-nums ${checkinStyles.bottomText}`}>
                    {metrics.remainingCheckin} In
                  </span>
                </div>
                <div>
                  <span className={`${isDark ? 'text-zinc-500' : 'text-slate-400'} block`}>Mục tiêu</span>
                  <span
                    className={`text-xs font-black ${isDark ? 'text-zinc-200' : 'text-slate-800'} block tabular-nums`}
                  >
                    {metrics.checkinTarget}
                  </span>
                </div>
              </div>
            </div>

            <div
              className={`mt-2 pt-1.5 border-t ${checkinStyles.bottomBorder} text-[9px] sm:text-[9.5px] ${
                isDark ? 'text-zinc-400' : 'text-slate-500'
              } font-mono flex items-center justify-between gap-1 whitespace-nowrap relative z-10`}
            >
              <span>
                Chỉ tiêu: <strong className={checkinStyles.bottomText}>{metrics.checkinTarget} Khách lẻ</strong>
              </span>
              <span className={`${isDark ? 'text-purple-300' : 'text-purple-700'} font-bold flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-purple-400' : 'bg-purple-500'} shrink-0`} />
                Combo: +{metrics.comboLiveCheckinActual || 0} Check-in
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Box 2 Footer Action Banner */}
      <div
        className={`mt-2 pt-1.5 border-t ${
          isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-500'
        } flex items-center justify-between text-[11px] font-mono`}
      >
        <span className={`${isDark ? 'text-zinc-300' : 'text-slate-700'} flex items-center gap-1`}>
          Nhịp ngày: <strong className={isDark ? 'text-amber-300' : 'text-amber-700'}>{pacing.shiftStatusLabel}</strong>
        </span>
        <span>
          Cần thêm:{' '}
          <strong className={isDark ? 'text-blue-300' : 'text-blue-600'}>+{metrics.remainingBook} Book</strong> trước
          22:00
        </span>
      </div>
    </section>
  );
};
