'use client';

import React from 'react';
import { Popover, Tooltip } from 'antd';
import { ClipboardList, Maximize2, Settings, Sparkles, Tv, Volume2, VolumeX } from 'lucide-react';
import type { TvCelebrationSettings, useTelesaleTvLiveCelebration } from '../../hooks/useTelesaleTvLiveCelebration';
import { TvMonitorSettingsPopover } from './TvMonitorSettingsPopover';
import type { TestFireworksKind } from './tvMonitorCardTypes';

interface TvMonitorHeaderBarProps {
  isDark: boolean;
  dateLabel: string;
  soundEnabled: boolean;
  fireworksEnabled: boolean;
  volume: number;
  settings: TvCelebrationSettings;
  settingsOpen: boolean;
  onSettingsOpenChange: (open: boolean) => void;
  testFireworksBook: boolean;
  testFireworksCheckin: boolean;
  testFireworksDone: boolean;
  isManagerOrAdmin: boolean;
  onQuickSoundToggle: () => void;
  onQuickFireworksToggle: () => void;
  onUpdateSettings: (next: Partial<TvCelebrationSettings>) => void;
  onOpenQuotesDrawer: () => void;
  onTriggerTestFireworks: (type: TestFireworksKind) => void;
  onStopTestFireworks: () => void;
  onTriggerDemoCelebration?: ReturnType<typeof useTelesaleTvLiveCelebration>['triggerDemoCelebration'];
  onOpenJournal: () => void;
  onOpenFullscreen?: () => void;
}

/** Header bar for the Today TV Monitor card with date badge, quick toggles, settings popover, journal, and fullscreen trigger. */
export const TvMonitorHeaderBar: React.FC<TvMonitorHeaderBarProps> = ({
  isDark,
  dateLabel,
  soundEnabled,
  fireworksEnabled,
  volume,
  settings,
  settingsOpen,
  onSettingsOpenChange,
  testFireworksBook,
  testFireworksCheckin,
  testFireworksDone,
  isManagerOrAdmin,
  onQuickSoundToggle,
  onQuickFireworksToggle,
  onUpdateSettings,
  onOpenQuotesDrawer,
  onTriggerTestFireworks,
  onStopTestFireworks,
  onTriggerDemoCelebration,
  onOpenJournal,
  onOpenFullscreen,
}) => {
  const settingsPopoverContent = (
    <TvMonitorSettingsPopover
      isDark={isDark}
      settings={settings}
      fireworksEnabled={fireworksEnabled}
      soundEnabled={soundEnabled}
      volume={volume}
      testFireworksBook={testFireworksBook}
      testFireworksCheckin={testFireworksCheckin}
      testFireworksDone={testFireworksDone}
      onUpdateSettings={onUpdateSettings}
      onOpenQuotesDrawer={onOpenQuotesDrawer}
      onTriggerTestFireworks={onTriggerTestFireworks}
      onStopTestFireworks={onStopTestFireworks}
      onTriggerDemoCelebration={onTriggerDemoCelebration}
    />
  );

  return (
    <div className="flex items-center justify-between mb-2 gap-2">
      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center justify-center p-1 rounded-lg ${
            isDark
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}
        >
          <Tv className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400 animate-pulse' : 'text-amber-600 animate-pulse'}`} />
        </span>
        <span className={`${isDark ? 'text-amber-300' : 'text-amber-800'} text-xs font-black uppercase tracking-wider`}>
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
          {dateLabel}
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
            onClick={onQuickSoundToggle}
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
            onClick={onQuickFireworksToggle}
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
              className={`w-3.5 h-3.5 ${
                fireworksEnabled
                  ? isDark
                    ? 'text-emerald-400'
                    : 'text-emerald-600'
                  : isDark
                    ? 'text-zinc-500'
                    : 'text-slate-400'
              }`}
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
          onOpenChange={onSettingsOpenChange}
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
              onClick={onOpenJournal}
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
  );
};
