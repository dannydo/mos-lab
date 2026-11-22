'use client';

import React from 'react';
import { Badge, Button, Popover, Tooltip } from 'antd';
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Flame,
  Maximize2,
  Minimize2,
  Settings,
  User,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { TvCelebrationSettings, useTelesaleTvLiveCelebration } from '../../hooks/useTelesaleTvLiveCelebration';
import { TvFullscreenSettingsPopover } from './TvFullscreenSettingsPopover';
import { TvFullscreenShiftTimeline } from './TvFullscreenShiftTimeline';
import type { ShiftTimelineProgress, TvFullscreenDemoFireworkKind } from './tvFullscreenTypes';

interface PanelToggleButtonProps {
  isDark: boolean;
  active: boolean;
  count: number;
  tooltipTitle: string;
  testId: string;
  ariaLabel: string;
  onToggle: () => void;
  tone: 'amber' | 'emerald';
  icon: 'calendar' | 'checkin';
}

const PanelToggleButton: React.FC<PanelToggleButtonProps> = ({
  isDark,
  active,
  count,
  tooltipTitle,
  testId,
  ariaLabel,
  onToggle,
  tone,
  icon,
}) => {
  const isAmber = tone === 'amber';
  const activeButtonClass = isAmber
    ? isDark
      ? '!border-amber-400 !bg-amber-500/25 !text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.35)]'
      : '!border-amber-500 !bg-amber-100 !text-amber-800 shadow-sm'
    : isDark
      ? '!border-emerald-400 !bg-emerald-500/25 !text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.35)]'
      : '!border-emerald-500 !bg-emerald-100 !text-emerald-800 shadow-sm';

  const inactiveButtonClass = isDark
    ? '!border-zinc-700/60 !bg-zinc-800/90 !text-zinc-400 hover:!text-zinc-200 hover:!bg-zinc-700/80 hover:!border-zinc-600'
    : '!border-slate-200 !bg-white !text-slate-600 hover:!bg-slate-100 shadow-sm';

  const iconClass = active
    ? isAmber
      ? isDark
        ? 'text-amber-300'
        : 'text-amber-700'
      : isDark
        ? 'text-emerald-300'
        : 'text-emerald-700'
    : isDark
      ? 'text-zinc-400'
      : 'text-slate-500';

  const ledClass = active
    ? isAmber
      ? isDark
        ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,1)] animate-pulse'
        : 'bg-amber-600 shadow-sm'
      : isDark
        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,1)] animate-pulse'
        : 'bg-emerald-600 shadow-sm'
    : isDark
      ? 'bg-zinc-600/70'
      : 'bg-slate-300';

  const activeBadgeBg = isAmber ? 'rgb(245, 158, 11)' : 'rgb(16, 185, 129)';
  const IconComp = icon === 'calendar' ? Calendar : CheckCircle2;

  return (
    <Tooltip title={tooltipTitle}>
      <Badge
        count={count}
        overflowCount={99}
        showZero={true}
        offset={[-2, 2]}
        size="small"
        styles={{
          root: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
          indicator: {
            backgroundColor: active ? activeBadgeBg : isDark ? 'rgb(63, 63, 70)' : 'rgb(148, 163, 184)',
            color: 'rgb(255, 255, 255)',
            fontWeight: 700,
            fontSize: '10px',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.5)',
          },
        }}
      >
        <Button
          type="text"
          data-testid={testId}
          aria-label={ariaLabel}
          onClick={onToggle}
          className={`relative !rounded-xl !h-10 !w-10 !p-0 !inline-flex !items-center !justify-center !leading-none !border transition-all cursor-pointer ${
            active ? activeButtonClass : inactiveButtonClass
          }`}
        >
          <IconComp className={`w-4 h-4 shrink-0 -translate-y-0.5 transition-all ${iconClass}`} />
          <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full transition-all ${ledClass}`} />
        </Button>
      </Badge>
    </Tooltip>
  );
};

interface TvFullscreenTopBarProps {
  isDark: boolean;
  timeDisplay: string;
  bookCount: number;
  checkinCount: number;
  showBookPanel: boolean;
  showCheckinPanel: boolean;
  onToggleBookPanel: () => void;
  onToggleCheckinPanel: () => void;
  settingsPopoverOpen: boolean;
  onSettingsPopoverOpenChange: (open: boolean) => void;
  voiceSettings: TvCelebrationSettings;
  onUpdateVoiceSettings: (next: Partial<TvCelebrationSettings>) => void;
  onOpenQuotesManager: () => void;
  onTriggerDemoCelebration: ReturnType<typeof useTelesaleTvLiveCelebration>['triggerDemoCelebration'];
  onTriggerTestFireworks: (card: TvFullscreenDemoFireworkKind) => void;
  isQuietHours: boolean;
  onToggleSound: () => void;
  showStaffGrid: boolean;
  onToggleStaffGrid: () => void;
  isManagerOrAdmin: boolean;
  onOpenJournal: () => void;
  isBrowserFullscreen: boolean;
  onToggleBrowserFullscreen: () => void;
  onClose: () => void;
  shiftNodes: string[];
  shiftProgress: ShiftTimelineProgress;
  fullscreenContainerRef: React.RefObject<HTMLDivElement | null>;
}

/** Top header bar with brand identity, centered master clock, toolbar controls, and hourly shift timeline. */
export const TvFullscreenTopBar: React.FC<TvFullscreenTopBarProps> = ({
  isDark,
  timeDisplay,
  bookCount,
  checkinCount,
  showBookPanel,
  showCheckinPanel,
  onToggleBookPanel,
  onToggleCheckinPanel,
  settingsPopoverOpen,
  onSettingsPopoverOpenChange,
  voiceSettings,
  onUpdateVoiceSettings,
  onOpenQuotesManager,
  onTriggerDemoCelebration,
  onTriggerTestFireworks,
  isQuietHours,
  onToggleSound,
  showStaffGrid,
  onToggleStaffGrid,
  isManagerOrAdmin,
  onOpenJournal,
  isBrowserFullscreen,
  onToggleBrowserFullscreen,
  onClose,
  shiftNodes,
  shiftProgress,
  fullscreenContainerRef,
}) => {
  const soundActive = voiceSettings.soundEnabled && !isQuietHours;

  return (
    <header className="relative z-10 w-full shrink-0 flex flex-col items-center">
      {/* ROW 1: THE UNIFIED HORIZONTAL TOP CAPSULE BAR */}
      <div
        className={`relative w-full h-14 rounded-2xl flex items-center justify-between px-3 overflow-hidden backdrop-blur-md transition-colors ${
          isDark
            ? 'bg-zinc-900/95 border border-zinc-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.5)]'
            : 'bg-white/95 border border-slate-200/90 shadow-[0_4px_20px_rgba(0,0,0,0.06)]'
        }`}
      >
        <div
          className={`absolute inset-0 pointer-events-none bg-gradient-to-r ${
            isDark
              ? 'from-amber-500/[0.04] via-transparent to-zinc-500/[0.03]'
              : 'from-amber-500/[0.05] via-transparent to-slate-200/[0.25]'
          }`}
        />

        {/* Left: Pure Brand Identity */}
        <div className="flex items-center gap-2.5 pl-1 shrink-0 relative z-10">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
              isDark
                ? 'bg-amber-500/15 border-amber-400/40 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                : 'bg-amber-100 border-amber-300 text-amber-700 shadow-sm'
            }`}
          >
            <Flame className="w-5 h-5 fill-amber-400/20" />
          </div>
          <div className="flex flex-col justify-center">
            <div
              className={`font-serif tracking-[0.24em] text-[11px] font-bold uppercase leading-none ${
                isDark ? 'text-amber-300' : 'text-amber-800'
              }`}
            >
              WINGS LASHES
            </div>
            <div
              className={`text-xs sm:text-sm font-black tracking-wider uppercase font-sans mt-1 leading-tight ${
                isDark ? 'text-zinc-100 drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]' : 'text-slate-900'
              }`}
            >
              TELESALES WAR ROOM
              <span className="sr-only">TELESALES TV MONITOR · WAR ROOM</span>
            </div>
          </div>
        </div>

        {/* Center: Large Clean Sans-Serif Master Clock */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className={`text-3xl sm:text-[36px] font-black font-sans tracking-[0.02em] tabular-nums leading-none select-none ${
              isDark
                ? 'text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.25)]'
                : 'text-slate-900 drop-shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
            }`}
          >
            {timeDisplay}
          </span>
        </div>

        {/* Right Toolbar Controls */}
        <div className="flex items-center gap-2 shrink-0 relative z-10">
          <PanelToggleButton
            isDark={isDark}
            active={showBookPanel}
            count={bookCount}
            tooltipTitle={
              showBookPanel
                ? `Panel Book hôm nay: Đang BẬT (${bookCount} lịch hẹn) · Bấm để thu gọn`
                : `Panel Book hôm nay: Đang TẮT (${bookCount} lịch hẹn) · Bấm để mở rộng`
            }
            testId="tv-toggle-book-panel-button"
            ariaLabel="Toggle Panel Book Hôm Nay"
            onToggle={onToggleBookPanel}
            tone="amber"
            icon="calendar"
          />

          <PanelToggleButton
            isDark={isDark}
            active={showCheckinPanel}
            count={checkinCount}
            tooltipTitle={
              showCheckinPanel
                ? `Panel Check-in hôm nay: Đang BẬT (${checkinCount} khách) · Bấm để thu gọn`
                : `Panel Check-in hôm nay: Đang TẮT (${checkinCount} khách) · Bấm để mở rộng`
            }
            testId="tv-toggle-checkin-panel-button"
            ariaLabel="Toggle Panel Check-in Hôm Nay"
            onToggle={onToggleCheckinPanel}
            tone="emerald"
            icon="checkin"
          />

          <div className={`h-5 w-px shrink-0 mx-0.5 self-center ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />

          <Popover
            content={
              <TvFullscreenSettingsPopover
                isDark={isDark}
                voiceSettings={voiceSettings}
                onUpdateVoiceSettings={onUpdateVoiceSettings}
                onOpenQuotesManager={onOpenQuotesManager}
                onTriggerDemoCelebration={onTriggerDemoCelebration}
                onTriggerTestFireworks={onTriggerTestFireworks}
                fullscreenContainerRef={fullscreenContainerRef}
              />
            }
            trigger="click"
            placement="bottomRight"
            open={settingsPopoverOpen}
            onOpenChange={onSettingsPopoverOpenChange}
            zIndex={100005}
            getPopupContainer={() => fullscreenContainerRef.current || document.body}
            overlayClassName="tv-sound-settings-popover"
          >
            <Tooltip title="Cài đặt Pháo bông & Âm thanh TV">
              <Button
                type="text"
                data-testid="tv-fullscreen-settings-button"
                aria-label="Cài đặt TV Monitor"
                className={`!rounded-xl !h-10 !w-10 !p-0 !inline-flex !items-center !justify-center !leading-none border transition-all cursor-pointer ${
                  isDark
                    ? 'border-zinc-700/60 bg-zinc-800/90 hover:bg-zinc-700/80 text-zinc-300'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600 shadow-sm'
                }`}
              >
                <Settings className={`w-4 h-4 shrink-0 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`} />
              </Button>
            </Tooltip>
          </Popover>

          <Tooltip
            title={
              soundActive
                ? 'Âm thanh TV đang BẬT · Bấm để tắt tiếng nhanh'
                : 'Âm thanh TV đang TẮT · Bấm để bật tiếng nhanh'
            }
          >
            <Button
              type="text"
              data-testid="tv-sound-settings-button"
              aria-label={soundActive ? 'Loa: Bật' : 'Loa: Tắt'}
              onClick={onToggleSound}
              className={`!rounded-xl !h-10 !w-10 !p-0 !inline-flex !items-center !justify-center !leading-none border transition-all cursor-pointer ${
                soundActive
                  ? isDark
                    ? '!text-amber-400 border-amber-500/50 bg-amber-500/15 hover:!bg-amber-500/25 shadow-sm shadow-amber-500/10'
                    : '!text-amber-600 border-amber-400 bg-amber-50 hover:!bg-amber-100 shadow-sm'
                  : isDark
                    ? '!text-zinc-400 border-zinc-700/60 bg-zinc-800/90 hover:!bg-zinc-700/80'
                    : '!text-slate-500 border-slate-200 bg-white hover:!bg-slate-100 shadow-sm'
              }`}
            >
              {!soundActive ? (
                <VolumeX className={`w-4 h-4 shrink-0 ${isDark ? 'text-zinc-400' : 'text-slate-400'}`} />
              ) : (
                <Volume2 className={`w-4 h-4 shrink-0 animate-pulse ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              )}
            </Button>
          </Tooltip>

          <Tooltip
            title={
              showStaffGrid
                ? 'Bảng nhân sự đang HIỆN · Bấm để thu gọn chỉ xem 2 đồng hồ'
                : 'Bảng nhân sự đang ẨN · Bấm để hiển thị chi tiết từng nhân viên'
            }
          >
            <Button
              type="text"
              data-testid="tv-staff-toggle-button"
              aria-label={showStaffGrid ? 'Ẩn bảng nhân viên' : 'Hiện bảng nhân viên'}
              onClick={onToggleStaffGrid}
              className={`!rounded-xl !h-10 !w-10 !p-0 !inline-flex !items-center !justify-center !leading-none border transition-all cursor-pointer ${
                showStaffGrid
                  ? isDark
                    ? '!text-amber-300 border-amber-500/40 bg-zinc-800/90 hover:!bg-zinc-700/80 shadow-sm shadow-amber-500/10'
                    : '!text-amber-600 border-amber-400 bg-amber-50 hover:!bg-amber-100 shadow-sm'
                  : isDark
                    ? '!text-zinc-500 border-zinc-800 bg-zinc-900/80 hover:!text-zinc-300 hover:border-zinc-700'
                    : '!text-slate-500 border-slate-200 bg-white hover:!bg-slate-100 shadow-sm'
              }`}
            >
              <User
                className={`w-4 h-4 shrink-0 ${
                  showStaffGrid
                    ? isDark
                      ? 'text-amber-300'
                      : 'text-amber-600'
                    : isDark
                      ? 'text-zinc-400'
                      : 'text-slate-400'
                }`}
              />
            </Button>
          </Tooltip>

          {isManagerOrAdmin && (
            <Tooltip title="Nhật ký giám sát Live TV Monitor">
              <Button
                type="text"
                data-testid="tv-journal-button"
                aria-label="Nhật ký TV Monitor"
                onClick={onOpenJournal}
                className={`!rounded-xl !h-10 !w-10 !p-0 !inline-flex !items-center !justify-center !leading-none border transition-all cursor-pointer ${
                  isDark
                    ? 'border-zinc-700/60 bg-zinc-800/90 hover:bg-zinc-700/80 hover:border-amber-500/40 text-zinc-300'
                    : 'border-slate-200 bg-white hover:bg-slate-100 hover:border-amber-400 text-slate-600 shadow-sm'
                }`}
              >
                <ClipboardList
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isDark ? 'text-zinc-300 hover:text-amber-300' : 'text-slate-600 hover:text-amber-600'
                  }`}
                />
              </Button>
            </Tooltip>
          )}

          <Tooltip
            title={
              isBrowserFullscreen ? 'Thoát toàn màn hình trình duyệt (F11/Esc)' : 'Toàn màn hình trình duyệt (F11)'
            }
          >
            <Button
              type="text"
              data-testid="tv-fullscreen-toggle-button"
              aria-label={isBrowserFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}
              onClick={onToggleBrowserFullscreen}
              className={`!rounded-xl !h-10 !w-10 !p-0 !inline-flex !items-center !justify-center !leading-none border transition-all cursor-pointer ${
                isBrowserFullscreen
                  ? isDark
                    ? 'border-amber-500/40 bg-zinc-800/90 text-amber-300'
                    : 'border-amber-400 bg-amber-50 text-amber-600 shadow-sm'
                  : isDark
                    ? 'border-zinc-700/60 bg-zinc-800/90 hover:bg-zinc-700/80 text-zinc-300'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600 shadow-sm'
              }`}
            >
              {isBrowserFullscreen ? (
                <Minimize2 className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-300' : 'text-amber-600'}`} />
              ) : (
                <Maximize2 className={`w-4 h-4 shrink-0 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`} />
              )}
            </Button>
          </Tooltip>

          <Tooltip title="Thoát chế độ TV Monitor (Phím Esc)">
            <Button
              type="text"
              data-testid="tv-close-button"
              aria-label="Đóng TV"
              onClick={onClose}
              className={`!rounded-xl !h-10 px-3.5 !inline-flex !items-center !justify-center !leading-none gap-1.5 text-xs shadow-md transition-all cursor-pointer !font-semibold !border ${
                isDark
                  ? '!bg-zinc-800/90 hover:!bg-zinc-700/80 !text-zinc-200 !border-zinc-700/60'
                  : '!bg-white hover:!bg-slate-100 !text-slate-700 !border-slate-200 shadow-sm'
              }`}
            >
              <X className={`w-4 h-4 shrink-0 ${isDark ? 'text-zinc-300' : 'text-slate-600'}`} />
              <span>Đóng TV</span>
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ROW 2: EXPANSIVE SHIFT TIMELINE BAR */}
      <TvFullscreenShiftTimeline isDark={isDark} shiftNodes={shiftNodes} shiftProgress={shiftProgress} />
    </header>
  );
};
