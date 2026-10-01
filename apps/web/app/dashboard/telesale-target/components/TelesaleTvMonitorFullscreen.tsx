'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Tooltip, Progress, theme, Popover, Slider, Switch, Select } from 'antd';
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
} from 'lucide-react';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { TelesaleTargetOverview } from '@mos-lab/shared';
import { calculateShiftPacing, calculateTvMonitorMetrics } from '../utils/tv-monitor-pacing';
import { TelesaleTvCelebration } from './TelesaleTvCelebration';
import { useTelesaleTvLiveCelebration } from '../hooks/useTelesaleTvLiveCelebration';
import { TelesaleTvLiveCelebrationBanner } from './TelesaleTvLiveCelebrationBanner';
import { TelesaleTvStaffContributionGrid } from './TelesaleTvStaffContributionGrid';

interface TelesaleTvMonitorFullscreenProps {
  overview: TelesaleTargetOverview;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const TelesaleTvMonitorFullscreen: React.FC<TelesaleTvMonitorFullscreenProps> = ({
  overview,
  open,
  onClose,
  onRefresh,
  refreshing = false,
}) => {
  const { token } = theme.useToken();
  const [now, setNow] = useState<Date>(new Date());
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

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
  const {
    settings: voiceSettings,
    updateSettings: updateVoiceSettings,
    activeCelebration,
    isSpeaking,
    isQuietHours,
    ingestLiveEvents,
    checkMilestones,
    triggerDemoCelebration,
  } = useTelesaleTvLiveCelebration();

  // Ingest live events & check milestones whenever overview is updated
  useEffect(() => {
    if (!open || !overview) return;
    if (overview.todayLiveEvents) {
      ingestLiveEvents(overview.todayLiveEvents);
    }
    checkMilestones(overview.teamDaily.date, metrics.bookActual, metrics.doneActual);
  }, [open, overview, ingestLiveEvents, checkMilestones, metrics.bookActual, metrics.doneActual]);

  // Trigger celebration when completed
  useEffect(() => {
    if (open && metrics.teamState === 'COMPLETED') {
      setShowCelebration(true);
    }
  }, [open, metrics.teamState]);

  if (!open) return null;

  const isDoneOver100 = metrics.donePercent >= 100;
  const isBookOver100 = metrics.bookPercent >= 100;

  const dateFormatted = dayjs(now).locale('vi').format('dddd, [ngày] DD/MM/YYYY');
  // Capitalize first letter of day of week
  const dateDisplay = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);
  const timeDisplay = dayjs(now).format('HH:mm:ss');

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
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 text-zinc-100 flex flex-col justify-between p-4 sm:p-8 lg:p-10 select-none overflow-y-auto font-sans">
      <TelesaleTvCelebration active={showCelebration} onComplete={() => setShowCelebration(false)} />
      <TelesaleTvLiveCelebrationBanner celebration={activeCelebration} isSpeaking={isSpeaking} />

      {/* Ambient background glows for TV high-contrast ambiance */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* 1. TOP BAR */}
      <header className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <Flame className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-serif tracking-[0.25em] text-xs font-bold uppercase">
                WINGS LASHES
              </span>
              <span className="text-zinc-600">•</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-emerald-950/90 text-emerald-400 border border-emerald-600/60">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                REALTIME
              </span>
            </div>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-black text-zinc-100 tracking-tight m-0">
              TELESALES TV MONITOR · WAR ROOM
            </h1>
          </div>
        </div>

        {/* Center: Big Digital Clock & Date */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="text-4xl sm:text-5xl lg:text-6xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 tabular-nums drop-shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            {timeDisplay}
          </div>
          <div className="text-xs sm:text-sm text-zinc-400 font-mono mt-0.5 font-medium">
            {dateDisplay} · <span className="text-amber-300 font-semibold">{pacing.shiftStatusLabel}</span>
          </div>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-2">
          {/* Sound & Voice Celebration Settings Popover */}
          <Popover
            content={soundSettingsContent}
            trigger="click"
            placement="bottomRight"
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
                    ? '!text-amber-400 border-amber-500/40 hover:!bg-amber-500/20'
                    : '!text-zinc-400 border-zinc-700 hover:!bg-zinc-800'
                }`}
              />
            </Tooltip>
          </Popover>

          {/* Confetti celebration manual trigger */}
          <Tooltip title="Bắn pháo hoa ăn mừng thành tích">
            <Button
              type="text"
              icon={<Sparkles className="w-4 h-4 text-amber-400" />}
              onClick={() => setShowCelebration(true)}
              className="!text-amber-400 hover:!bg-amber-500/20 !rounded-xl !h-10 !w-10 !p-0 flex items-center justify-center border border-amber-500/30"
            />
          </Tooltip>

          {/* Refresh Data */}
          {onRefresh && (
            <Tooltip title="Làm mới số liệu ngay lập tức">
              <Button
                type="text"
                icon={<RotateCw className={`w-4 h-4 text-zinc-300 ${refreshing ? 'animate-spin' : ''}`} />}
                onClick={onRefresh}
                className="!text-zinc-300 hover:!bg-zinc-800 !rounded-xl !h-10 !w-10 !p-0 flex items-center justify-center border border-zinc-700"
              />
            </Tooltip>
          )}

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
              className="!text-zinc-300 hover:!bg-zinc-800 !rounded-xl !h-10 !w-10 !p-0 flex items-center justify-center border border-zinc-700"
            />
          </Tooltip>

          {/* Close TV View */}
          <Tooltip title="Thoát chế độ TV Monitor (Phím Esc)">
            <Button
              type="primary"
              icon={<X className="w-4 h-4" />}
              onClick={onClose}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold border border-zinc-600 rounded-xl h-10 px-4 flex items-center gap-1.5"
            >
              <span>Đóng TV</span>
            </Button>
          </Tooltip>
        </div>
      </header>

      {/* 2. MAIN TV MONITOR BODY: 2 GIANT HIGH-CONTRAST COLUMNS (MOS-BUG-75: Book dẫn dắt -> Done theo sau) */}
      <main className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 my-4 flex-1 items-stretch">
        {/* COLUMN 1: BOOK HÔM NAY (TẠO LỊCH - HÀNH ĐỘNG CHÍNH DẪN DẮT) */}
        <div
          className={`rounded-3xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between border backdrop-blur-xl transition-all shadow-2xl relative overflow-hidden ${
            isBookOver100
              ? 'bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-950 border-amber-400/90 shadow-[0_0_40px_rgba(245,158,11,0.2)]'
              : 'bg-gradient-to-b from-blue-950/30 via-zinc-900/90 to-zinc-950/90 border-blue-500/40 hover:border-blue-400/60 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
          }`}
        >
          {/* Ambient inner glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Card Title */}
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2.5 text-zinc-300 font-bold text-sm sm:text-base lg:text-lg uppercase tracking-wider">
                <Calendar className="w-6 h-6 text-blue-400" />
                <span className="text-blue-200">BOOK HÔM NAY · TẠO LỊCH</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-950/80 text-blue-300 border border-blue-500/40">
                HÀNH ĐỘNG DẪN DẮT · Chỉ tiêu: ≥ {metrics.bookTarget} Book
              </span>
            </div>

            {/* Giant Big Numbers (Readable from 5-10 meters) */}
            <div className="mt-4 lg:mt-6 flex items-baseline justify-center sm:justify-start gap-3">
              <span
                data-testid="tv-monitor-fullscreen-book-actual"
                className="text-7xl sm:text-8xl lg:text-9xl font-black font-mono text-blue-300 tabular-nums tracking-tighter drop-shadow-lg"
              >
                {metrics.bookActual}
              </span>
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold font-mono text-zinc-500 tabular-nums">
                / {metrics.bookTarget}
              </span>
              <span className="text-base sm:text-xl font-bold text-blue-400 font-mono ml-2">Book</span>
            </div>

            {/* Massive Thick Progress Bar */}
            <div className="mt-4 lg:mt-6">
              <Progress
                percent={Math.min(100, metrics.bookPercent)}
                strokeColor={
                  isBookOver100 ? token.colorWarning : metrics.gapBook >= 0 ? token.colorInfo : token.colorWarning
                }
                size={['100%', 28]}
                showInfo={false}
                className="rounded-2xl"
              />
              <div className="flex justify-between items-center text-sm sm:text-base font-mono mt-2.5 font-bold">
                <span className="text-zinc-400">Tiến độ hoàn thành</span>
                <span
                  className={`text-lg sm:text-xl font-black ${
                    isBookOver100
                      ? 'text-amber-400 animate-pulse'
                      : metrics.bookPercent >= 75
                        ? 'text-blue-300'
                        : 'text-zinc-200'
                  }`}
                >
                  {isBookOver100 ? `✨ ${metrics.bookPercent}% VƯỢT CHỈ TIÊU` : `${metrics.bookPercent}%`}
                </span>
              </div>
            </div>
          </div>

          {/* High-Visibility Pacing Breakdown Line */}
          <div className="mt-6 pt-5 border-t border-blue-900/40 bg-black/40 rounded-2xl p-4 sm:p-5 border border-blue-500/20">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
              <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-[11px] sm:text-xs text-zinc-400 uppercase">Đã đạt</div>
                <div className="text-xl sm:text-2xl font-black text-blue-200 tabular-nums">{metrics.bookActual}</div>
              </div>
              <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-[11px] sm:text-xs text-zinc-400 uppercase">Kỳ vọng giờ này</div>
                <div className="text-xl sm:text-2xl font-black text-zinc-300 tabular-nums">{metrics.expectedBook}</div>
              </div>
              <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-[11px] sm:text-xs text-zinc-400 uppercase">Nhịp (Gap)</div>
                <div
                  className={`text-xl sm:text-2xl font-black tabular-nums ${
                    metrics.gapBook >= 0
                      ? 'text-emerald-400'
                      : metrics.gapBook === -1
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {metrics.gapBook >= 0 ? `+${metrics.gapBook}` : metrics.gapBook}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-[11px] sm:text-xs text-zinc-400 uppercase">Còn thiếu</div>
                <div className="text-xl sm:text-2xl font-black text-blue-300 tabular-nums">{metrics.remainingBook}</div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-blue-900/40 flex items-center justify-between text-xs sm:text-sm font-mono text-zinc-400">
              <span>Định mức tối thiểu mỗi ngày:</span>
              <span className="text-blue-300 font-bold tabular-nums">25 Cuộc hẹn thành công</span>
            </div>
          </div>
        </div>

        {/* COLUMN 2: DONE HÔM NAY (KHÁCH LẺ - KẾT QUẢ THEO SAU) */}
        <div
          className={`rounded-3xl p-6 sm:p-8 lg:p-10 flex flex-col justify-between border backdrop-blur-xl transition-all shadow-2xl relative overflow-hidden ${
            isDoneOver100
              ? 'bg-gradient-to-b from-amber-950/40 via-zinc-900 to-zinc-950 border-amber-400/90 shadow-[0_0_40px_rgba(245,158,11,0.2)]'
              : 'bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border-zinc-800 hover:border-amber-500/50'
          }`}
        >
          {/* Ambient inner glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Card Title */}
          <div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2.5 text-zinc-300 font-bold text-sm sm:text-base lg:text-lg uppercase tracking-wider">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span>DONE HÔM NAY</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                Chỉ tiêu: {metrics.doneTarget} Done
              </span>
            </div>

            {/* Giant Big Numbers (Readable from 5-10 meters) */}
            <div className="mt-4 lg:mt-6 flex items-baseline justify-center sm:justify-start gap-3">
              <span
                data-testid="tv-monitor-fullscreen-done-actual"
                className="text-7xl sm:text-8xl lg:text-9xl font-black font-mono text-zinc-100 tabular-nums tracking-tighter drop-shadow-lg"
              >
                {metrics.doneActual}
              </span>
              <span className="text-3xl sm:text-4xl lg:text-5xl font-bold font-mono text-zinc-500 tabular-nums">
                / {metrics.doneTarget}
              </span>
              <span className="text-base sm:text-xl font-bold text-zinc-400 font-mono ml-2">Done</span>
            </div>

            {/* Massive Thick Progress Bar */}
            <div className="mt-4 lg:mt-6">
              <Progress
                percent={Math.min(100, metrics.donePercent)}
                strokeColor={
                  isDoneOver100 ? token.colorWarning : metrics.gapDone >= 0 ? token.colorSuccess : token.colorWarning
                }
                size={['100%', 28]}
                showInfo={false}
                className="rounded-2xl"
              />
              <div className="flex justify-between items-center text-sm sm:text-base font-mono mt-2.5 font-bold">
                <span className="text-zinc-400">Tiến độ hoàn thành</span>
                <span
                  className={`text-lg sm:text-xl font-black ${
                    isDoneOver100
                      ? 'text-amber-400 animate-pulse'
                      : metrics.donePercent >= 75
                        ? 'text-emerald-300'
                        : 'text-zinc-200'
                  }`}
                >
                  {isDoneOver100 ? `✨ ${metrics.donePercent}% VƯỢT CHỈ TIÊU` : `${metrics.donePercent}%`}
                </span>
              </div>
            </div>
          </div>

          {/* High-Visibility Pacing Breakdown Line */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 bg-black/40 rounded-2xl p-4 sm:p-5 border border-zinc-800/60">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
              <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-[11px] sm:text-xs text-zinc-400 uppercase">Đã đạt</div>
                <div className="text-xl sm:text-2xl font-black text-zinc-100 tabular-nums">{metrics.doneActual}</div>
              </div>
              <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-[11px] sm:text-xs text-zinc-400 uppercase">Kỳ vọng giờ này</div>
                <div className="text-xl sm:text-2xl font-black text-zinc-300 tabular-nums">{metrics.expectedDone}</div>
              </div>
              <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-[11px] sm:text-xs text-zinc-400 uppercase">Nhịp (Gap)</div>
                <div
                  className={`text-xl sm:text-2xl font-black tabular-nums ${
                    metrics.gapDone >= 0
                      ? 'text-emerald-400'
                      : metrics.gapDone === -1
                        ? 'text-amber-400'
                        : 'text-rose-400'
                  }`}
                >
                  {metrics.gapDone >= 0 ? `+${metrics.gapDone}` : metrics.gapDone}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="text-[11px] sm:text-xs text-zinc-400 uppercase">Còn thiếu</div>
                <div className="text-xl sm:text-2xl font-black text-amber-300 tabular-nums">
                  {metrics.remainingDone}
                </div>
              </div>
            </div>

            {metrics.comboLiveDoneActual > 0 && (
              <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-xs sm:text-sm font-mono text-purple-300">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Đơn Combo Live hôm nay:
                </span>
                <span className="font-bold tabular-nums">+{metrics.comboLiveDoneActual} Done</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 2.5 INDIVIDUAL STAFF CONTRIBUTIONS TODAY (MOS-FEAT-83) */}
      <TelesaleTvStaffContributionGrid staffTargets={overview.staffTargets} totalTeamBookToday={metrics.bookActual} />

      {/* 3. BOTTOM SECTION: COUNTDOWN & ACTIONABLE MESSAGE & TEAM STATUS */}
      <footer className="relative z-10 border-t border-zinc-800/80 pt-4 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Countdown */}
        <div className="flex items-center gap-3 bg-black/60 border border-zinc-800 rounded-2xl px-5 py-3">
          <Clock className="w-6 h-6 text-amber-400 animate-pulse shrink-0" />
          <div>
            <div className="text-[10px] sm:text-xs uppercase font-mono text-zinc-400 tracking-wider">
              Thời gian làm việc ca ngày
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black font-mono text-amber-300 tabular-nums">
              {pacing.countdownText}
            </div>
          </div>
        </div>

        {/* Actionable Message Banner */}
        <div className="flex-1 text-center px-4">
          <div className="inline-flex items-center justify-center gap-2.5 bg-gradient-to-r from-amber-950/70 via-zinc-900/90 to-amber-950/70 border border-amber-500/40 rounded-2xl px-6 py-3 shadow-lg max-w-3xl">
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
            <span className="text-base sm:text-lg lg:text-xl font-bold text-amber-100 font-mono tracking-wide">
              {metrics.actionableMessage}
            </span>
          </div>
        </div>

        {/* Team Status Badge */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center justify-center px-5 py-3 rounded-2xl text-sm sm:text-base lg:text-lg font-black tracking-wider uppercase border shadow-lg ${getTeamStateBannerClass()}`}
          >
            {metrics.teamStateBadge}
          </div>
        </div>
      </footer>
    </div>
  );
};
