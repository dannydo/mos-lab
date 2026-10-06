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

// Tiến độ thực tế: đỏ < 80%, vàng 80-99%, xanh >= 100%
const getProgressTier = (percent: number): 'rose' | 'amber' | 'emerald' => {
  if (percent < 80) return 'rose';
  if (percent < 100) return 'amber';
  return 'emerald';
};

const getCardTierStyles = (tier: 'rose' | 'amber' | 'emerald') => {
  switch (tier) {
    case 'emerald':
      return {
        container:
          'bg-gradient-to-b from-emerald-950/30 to-zinc-950/80 rounded-2xl p-2.5 border border-emerald-500/40 flex flex-col justify-between shadow-inner shadow-[0_0_20px_rgba(16,185,129,0.15)] relative overflow-hidden',
        badge:
          'text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/40 font-mono font-bold text-[9px]',
        title: 'text-emerald-200 text-xs font-bold',
        icon: 'text-emerald-400',
        bottomBorder: 'border-emerald-900/40',
        bottomText: 'text-emerald-300 font-bold',
        targetBadge: 'text-[9px] text-emerald-400 font-mono',
      };
    case 'amber':
      return {
        container:
          'bg-gradient-to-b from-amber-950/30 to-zinc-950/80 rounded-2xl p-2.5 border border-amber-500/40 flex flex-col justify-between shadow-inner shadow-[0_0_20px_rgba(245,158,11,0.15)] relative overflow-hidden',
        badge:
          'text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-500/40 font-mono font-bold text-[9px]',
        title: 'text-amber-200 text-xs font-bold',
        icon: 'text-amber-400',
        bottomBorder: 'border-amber-900/40',
        bottomText: 'text-amber-300 font-bold',
        targetBadge: 'text-[9px] text-amber-400 font-mono',
      };
    case 'rose':
    default:
      return {
        container:
          'bg-gradient-to-b from-rose-950/30 to-zinc-950/80 rounded-2xl p-2.5 border border-rose-500/40 flex flex-col justify-between shadow-inner shadow-[0_0_20px_rgba(244,63,94,0.15)] relative overflow-hidden',
        badge:
          'text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-500/40 font-mono font-bold text-[9px]',
        title: 'text-rose-200 text-xs font-bold',
        icon: 'text-rose-400',
        bottomBorder: 'border-rose-900/40',
        bottomText: 'text-rose-300 font-bold',
        targetBadge: 'text-[9px] text-rose-400 font-mono',
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
  const [testFireworksDone, setTestFireworksDone] = useState(false);
  const testTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerTestFireworks = (type: 'BOOK' | 'DONE') => {
    if (testTimerRef.current) clearTimeout(testTimerRef.current);
    if (type === 'BOOK') {
      setTestFireworksBook(true);
      setTestFireworksDone(false);
      testTimerRef.current = setTimeout(() => setTestFireworksBook(false), 8000);
    } else {
      setTestFireworksDone(true);
      setTestFireworksBook(false);
      testTimerRef.current = setTimeout(() => setTestFireworksDone(false), 8000);
    }
  };

  const stopTestFireworks = () => {
    if (testTimerRef.current) clearTimeout(testTimerRef.current);
    setTestFireworksBook(false);
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
  const isBookOver100 = metrics.bookPercent >= 100;

  const expectedBookPacingPercent = Math.min(
    100,
    Math.round(((metrics.expectedBook || 0) / (metrics.bookTarget || 1)) * 100)
  );

  const expectedDonePacingPercent = Math.min(
    100,
    Math.round(((metrics.expectedDone || 0) / (metrics.doneTarget || 1)) * 100)
  );

  const bookTier = metrics.bookTier;
  const doneTier = metrics.doneTier;
  const bookStyles = getCardTierStyles(bookTier);
  const doneStyles = getCardTierStyles(doneTier);

  // Popover configuration content for fireworks and sound
  const settingsPopoverContent = (
    <div className="w-72 sm:w-80 p-1 flex flex-col gap-3.5 text-zinc-100">
      {/* Title */}
      <div className="border-b border-zinc-800/80 pb-2 flex items-center justify-between">
        <div>
          <span className="font-bold text-xs sm:text-sm text-zinc-100 flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-amber-400" />
            Cấu hình Pháo bông & Âm thanh
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">TV Monitor Telesales Hôm Nay</span>
        </div>
      </div>

      {/* Switch 1: Fireworks */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Pháo bông chúc mừng
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5 leading-tight">
            Tự động bắn pháo khi Book hoặc Done đạt ≥ 100%
          </span>
        </div>
        <Switch
          checked={fireworksEnabled}
          onChange={(checked) => updateSettings({ fireworksEnabled: checked })}
          className="bg-zinc-700 shrink-0"
        />
      </div>

      {/* Switch 2: Sound */}
      <div className="flex items-center justify-between gap-2 border-t border-zinc-800/80 pt-2.5">
        <div>
          <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
            Âm thanh hiệu ứng & Loa
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5 leading-tight">
            Tiếng rít phóng pháo hoa, tiếng nổ boom & chúc mừng
          </span>
        </div>
        <Switch
          checked={soundEnabled}
          onChange={(checked) => updateSettings({ soundEnabled: checked })}
          className="bg-zinc-700 shrink-0"
        />
      </div>

      {/* Slider: Volume */}
      <div className="border-t border-zinc-800/80 pt-2.5">
        <div className="flex justify-between text-[11px] font-mono text-zinc-400 mb-1">
          <span>Âm lượng loa</span>
          <span className="text-amber-300 font-bold tabular-nums">{Math.round(volume * 100)}%</span>
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
      <div className="border-t border-zinc-800/80 pt-2.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono text-zinc-300 font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Bắn thử nghiệm pháo hoa:
          </span>
          {(testFireworksBook || testFireworksDone) && (
            <button
              type="button"
              onClick={stopTestFireworks}
              className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5 font-bold cursor-pointer"
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
                ? 'bg-emerald-600 text-white border-emerald-400 animate-pulse'
                : 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900'
            }`}
          >
            🎆 Pháo Book
          </Button>
          <Button
            size="small"
            onClick={() => triggerTestFireworks('DONE')}
            className={`text-[11px] font-bold h-7 rounded-lg transition-all ${
              testFireworksDone
                ? 'bg-amber-600 text-white border-amber-400 animate-pulse'
                : 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:bg-amber-900'
            }`}
          >
            🎆 Pháo Done
          </Button>
        </div>
      </div>

      {/* Section: Test Voice Celebrations */}
      {liveCelebration?.triggerDemoCelebration && (
        <div className="border-t border-zinc-800/80 pt-2.5 flex flex-col gap-1.5">
          <span className="text-[11px] font-mono text-zinc-300 font-bold flex items-center gap-1">
            <Volume2 className="w-3 h-3 text-blue-400" />
            Thử loa giọng nói:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="small"
              onClick={() => liveCelebration.triggerDemoCelebration('BOOK')}
              className="text-[11px] bg-blue-950/80 border-blue-500/60 text-blue-300 hover:bg-blue-900 h-7 rounded-lg font-medium"
            >
              Loa Book
            </Button>
            <Button
              size="small"
              onClick={() => liveCelebration.triggerDemoCelebration('DONE')}
              className="text-[11px] bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900 h-7 rounded-lg font-medium"
            >
              Loa Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <section
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-b from-amber-950/25 via-zinc-950/95 to-zinc-950 border p-3.5 glass-card shadow-2xl backdrop-blur-md h-full flex flex-col justify-between group transition-all duration-300 ${
        isDoneOver100 || isBookOver100
          ? 'border-amber-400/90 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
          : 'border-amber-500/35 hover:border-amber-400/70'
      }`}
    >
      <TelesaleTvJournalModal open={journalOpen} onClose={() => setJournalOpen(false)} />

      {/* 1. Header Bar */}
      <div>
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center p-1 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <Tv className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            </span>
            <div>
              <span className="text-amber-300 text-xs font-black uppercase tracking-wider block">
                TV MONITOR HÔM NAY
              </span>
              <span className="text-[10px] text-zinc-400 font-mono block leading-none mt-0.5">
                {pacing.shiftStatusLabel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-zinc-300 bg-black/60 px-2 py-0.5 rounded-lg border border-zinc-800 font-mono tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {teamDaily.date}
            </span>

            {/* Quick Loa toggle button */}
            <Tooltip
              title={
                soundEnabled
                  ? 'Âm thanh TV đang BẬT · Bấm để tắt tiếng nhanh'
                  : 'Âm thanh TV đang TẮT · Bấm để bật tiếng nhanh'
              }
            >
              <button
                type="button"
                data-testid="tv-card-sound-toggle"
                onClick={() => updateSettings({ soundEnabled: !soundEnabled })}
                className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-lg border font-medium transition-all cursor-pointer ${
                  soundEnabled
                    ? 'text-amber-300/90 bg-amber-950/40 border-amber-500/30 hover:bg-amber-900/50 hover:border-amber-400/50'
                    : 'text-zinc-500 bg-zinc-900/60 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="w-3 h-3 text-amber-400" />
                ) : (
                  <VolumeX className="w-3 h-3 text-zinc-500" />
                )}
                <span className="hidden xs:inline">{soundEnabled ? 'Loa: Bật' : 'Loa: Tắt'}</span>
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
                onClick={() => updateSettings({ fireworksEnabled: !fireworksEnabled })}
                className={`inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-lg border font-medium transition-all cursor-pointer ${
                  fireworksEnabled
                    ? 'text-emerald-300/90 bg-emerald-950/40 border-emerald-500/30 hover:bg-emerald-900/50 hover:border-emerald-400/50'
                    : 'text-zinc-500 bg-zinc-900/60 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700'
                }`}
              >
                <Sparkles className={`w-3 h-3 ${fireworksEnabled ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <span className="hidden xs:inline">{fireworksEnabled ? 'Pháo: Bật' : 'Pháo: Tắt'}</span>
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
                <Button
                  type="default"
                  size="small"
                  data-testid="tv-card-settings-button"
                  icon={<Settings className="w-3 h-3 text-zinc-300" />}
                  className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700 rounded-lg text-xs h-6 px-1.5 flex items-center cursor-pointer"
                />
              </Tooltip>
            </Popover>

            {isManagerOrAdmin && (
              <Tooltip title="Nhật ký giám sát Live TV Monitor">
                <Button
                  type="default"
                  size="small"
                  data-testid="tv-journal-card-button"
                  icon={<ClipboardList className="w-3 h-3 text-amber-300" />}
                  onClick={() => setJournalOpen(true)}
                  className="bg-zinc-900 hover:bg-zinc-800 text-amber-300 border-zinc-700 rounded-lg text-xs h-6 px-1.5 flex items-center gap-1"
                >
                  <span className="hidden lg:inline text-[10px]">Nhật ký TV</span>
                </Button>
              </Tooltip>
            )}

            {onOpenFullscreen && (
              <Tooltip title="Mở Chế độ TV Monitor toàn màn hình cho phòng Telesales">
                <Button
                  type="primary"
                  size="small"
                  icon={<Maximize2 className="w-3 h-3" />}
                  onClick={onOpenFullscreen}
                  className="bg-amber-500 hover:bg-amber-400 text-black font-bold border-0 rounded-lg text-xs h-6 px-2 flex items-center gap-1 shadow-md shadow-amber-500/20"
                >
                  <span className="hidden lg:inline text-[10px]">Mở TV</span>
                </Button>
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
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-0.5 relative z-10">
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
              <div className="mt-2 bg-black/60 border border-zinc-800/90 rounded-xl p-1.5 grid grid-cols-4 gap-0.5 text-center font-mono divide-x divide-zinc-800 text-[9px] relative z-10">
                <div>
                  <span className="text-zinc-500 block">Kỳ vọng</span>
                  <span className="text-xs font-black text-zinc-200 block tabular-nums">
                    {metrics.expectedBook} Book
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Nhịp</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${
                      metrics.gapBook >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {metrics.gapBook >= 0 ? `+${metrics.gapBook}` : metrics.gapBook}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Còn thiếu</span>
                  <span className={`text-xs font-black block tabular-nums ${bookStyles.bottomText}`}>
                    {metrics.remainingBook} Book
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Mục tiêu</span>
                  <span className="text-xs font-black text-zinc-200 block tabular-nums">≥{metrics.bookTarget}</span>
                </div>
              </div>
            </div>

            <div
              className={`mt-2 pt-1.5 border-t ${bookStyles.bottomBorder} text-[9px] sm:text-[9.5px] text-zinc-400 font-mono flex items-center justify-between gap-1 whitespace-nowrap relative z-10`}
            >
              <span>
                Mục tiêu: <strong className={bookStyles.bottomText}>≥{metrics.bookTarget} Book</strong>
              </span>
              <span className="text-purple-300 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                Combo: +{metrics.comboLiveBookActual || 0} Book
              </span>
            </div>
          </div>

          {/* Card 2.2: Done Hôm Nay */}
          <div className={doneStyles.container}>
            {/* Pháo bông thực tế khi đạt mốc >= 100% hoặc khi test (tắt khi mở TV fullscreen) */}
            <RealisticCardFireworks
              active={!isTvOpen && (testFireworksDone || (fireworksEnabled && isDoneOver100))}
              isFrenzy={testFireworksDone}
              soundEnabled={!isTvOpen && soundEnabled}
              volume={volume}
              theme="emerald"
              cardLabel="DONE"
            />
            <div>
              <div className="flex items-center justify-between text-zinc-400 text-xs mb-0.5 relative z-10">
                <span className="flex items-center gap-1">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${doneTier === 'emerald' ? 'bg-emerald-400' : doneTier === 'amber' ? 'bg-amber-400' : 'bg-rose-400'}`}
                  />
                  <strong className={doneStyles.title}>DONE KHÁCH LẺ</strong>
                </span>
                <span className={doneStyles.targetBadge}>Chỉ tiêu: {metrics.doneTarget}</span>
              </div>

              {/* Semicircle Gauge (Done Hôm Nay) */}
              <div className="relative z-10">
                <SemicircleGauge
                  percent={metrics.donePercent}
                  actual={metrics.doneActual}
                  target={metrics.doneTarget}
                  label=""
                  hideLabelText={true}
                  tone={doneTier}
                  pacingPercent={expectedDonePacingPercent}
                  gapText={`GAP: ${metrics.gapDone >= 0 ? '+' : ''}${metrics.gapDone}`}
                  gapType={metrics.gapDone >= 0 ? 'positive' : 'negative'}
                />
              </div>

              {/* Horizontal Ribbon 4 Cột */}
              <div className="mt-2 bg-black/60 border border-zinc-800/90 rounded-xl p-1.5 grid grid-cols-4 gap-0.5 text-center font-mono divide-x divide-zinc-800 text-[9px] relative z-10">
                <div>
                  <span className="text-zinc-500 block">Kỳ vọng</span>
                  <span className="text-xs font-black text-zinc-200 block tabular-nums">
                    {metrics.expectedDone} Done
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Nhịp</span>
                  <span
                    className={`text-xs font-black block tabular-nums ${
                      metrics.gapDone >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {metrics.gapDone >= 0 ? `+${metrics.gapDone}` : metrics.gapDone}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Còn thiếu</span>
                  <span className={`text-xs font-black block tabular-nums ${doneStyles.bottomText}`}>
                    {metrics.remainingDone} Done
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Mục tiêu</span>
                  <span className="text-xs font-black text-zinc-200 block tabular-nums">{metrics.doneTarget}</span>
                </div>
              </div>
            </div>

            <div
              className={`mt-2 pt-1.5 border-t ${doneStyles.bottomBorder} text-[9px] sm:text-[9.5px] text-zinc-400 font-mono flex items-center justify-between gap-1 whitespace-nowrap relative z-10`}
            >
              <span>
                Chỉ tiêu: <strong className={doneStyles.bottomText}>{metrics.doneTarget} Khách lẻ</strong>
              </span>
              <span className="text-purple-300 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                Combo: +{metrics.comboLiveDoneActual || 0} Done
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Box 2 Footer Action Banner */}
      <div className="mt-2 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
        <span className="text-zinc-300 flex items-center gap-1">
          Nhịp ngày: <strong className="text-amber-300">{pacing.shiftStatusLabel}</strong>
        </span>
        <span className="text-zinc-400">
          Cần thêm: <strong className="text-blue-300">+{metrics.remainingBook} Book</strong> trước 22:00
        </span>
      </div>
    </section>
  );
};
