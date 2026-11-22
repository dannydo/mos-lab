'use client';

import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { TelesaleTvJournalModal } from './TelesaleTvJournalModal';
import { TelesaleTvQuotesDrawer } from './TelesaleTvQuotesDrawer';
import { TvMonitorGaugeCard } from './telesale-today-tv-monitor-card/TvMonitorGaugeCard';
import { TvMonitorHeaderBar } from './telesale-today-tv-monitor-card/TvMonitorHeaderBar';
import { TvMonitorSnapshotsStrip } from './telesale-today-tv-monitor-card/TvMonitorSnapshotsStrip';
import { getTvCardSectionClass } from './telesale-today-tv-monitor-card/tvMonitorCardStyles';
import type { TelesaleTodayTvMonitorCardProps } from './telesale-today-tv-monitor-card/tvMonitorCardTypes';
import { useTelesaleTodayTvMonitor } from './telesale-today-tv-monitor-card/useTelesaleTodayTvMonitor';

export type {
  TelesaleTodayTvMonitorCardProps,
  TestFireworksKind,
  TvCardTierStyles,
  TvMonitorGaugeVariant,
  TvMonitorTier,
} from './telesale-today-tv-monitor-card/tvMonitorCardTypes';

/** Compact Today TV Monitor dashboard card showing live Book/Check-in pacing gauges, settings, and daily snapshots. */
export const TelesaleTodayTvMonitorCard: React.FC<TelesaleTodayTvMonitorCardProps> = ({
  overview,
  onOpenFullscreen,
  isTvOpen = false,
  liveCelebration,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const {
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
  } = useTelesaleTodayTvMonitor({ overview, liveCelebration });

  const isHighlighted = metrics.donePercent >= 100 || metrics.bookPercent >= 100;

  return (
    <section className={getTvCardSectionClass(isDark, isHighlighted)}>
      <TelesaleTvJournalModal open={journalOpen} onClose={() => setJournalOpen(false)} initialDate={journalDate} />
      <TelesaleTvQuotesDrawer open={quotesDrawerOpen} onClose={() => setQuotesDrawerOpen(false)} zIndex={100010} />

      {/* 1. Header Bar + 2 Semicircle Arcs */}
      <div>
        <TvMonitorHeaderBar
          isDark={isDark}
          dateLabel={overview.teamDaily.date}
          soundEnabled={soundEnabled}
          fireworksEnabled={fireworksEnabled}
          volume={volume}
          settings={settings}
          settingsOpen={settingsOpen}
          onSettingsOpenChange={setSettingsOpen}
          testFireworksBook={testFireworksBook}
          testFireworksCheckin={testFireworksCheckin}
          testFireworksDone={testFireworksDone}
          isManagerOrAdmin={isManagerOrAdmin}
          onQuickSoundToggle={handleQuickSoundToggle}
          onQuickFireworksToggle={handleQuickFireworksToggle}
          onUpdateSettings={updateSettings}
          onOpenQuotesDrawer={handleOpenQuotesFromSettings}
          onTriggerTestFireworks={triggerTestFireworks}
          onStopTestFireworks={stopTestFireworks}
          onTriggerDemoCelebration={liveCelebration?.triggerDemoCelebration}
          onOpenJournal={handleOpenTodayJournal}
          onOpenFullscreen={onOpenFullscreen}
        />

        {/* 2 Semicircle Arcs (Book Hôm Nay & Check-in Khách Lẻ) */}
        <div className="grid grid-cols-2 gap-2.5">
          <TvMonitorGaugeCard
            variant="book"
            isDark={isDark}
            isTvOpen={isTvOpen}
            fireworksEnabled={fireworksEnabled}
            soundEnabled={soundEnabled}
            volume={volume}
            isTestFireworksActive={testFireworksBook}
            metrics={metrics}
          />
          <TvMonitorGaugeCard
            variant="checkin"
            isDark={isDark}
            isTvOpen={isTvOpen}
            fireworksEnabled={fireworksEnabled}
            soundEnabled={soundEnabled}
            volume={volume}
            isTestFireworksActive={testFireworksCheckin}
            metrics={metrics}
            onReplayCheckinCelebration={handleReplayCheckinCelebration}
          />
        </div>
      </div>

      {/* 2.5 Dải Snapshot Các Ngày Qua */}
      <TvMonitorSnapshotsStrip
        isDark={isDark}
        month={overview.month}
        snapshots={pastDailySnapshots}
        onSelectDate={handleOpenJournalForDate}
      />

      {/* Box 2 Footer Action Banner */}
      <div
        className={`mt-2 pt-1.5 border-t ${
          isDark ? 'border-zinc-800/80 text-zinc-400' : 'border-slate-200 text-slate-500'
        } flex items-center justify-between text-[11px] font-mono`}
      >
        <span className={`${isDark ? 'text-zinc-300' : 'text-slate-700'} flex items-center gap-1`}>
          Nhịp ngày: <strong className={isDark ? 'text-amber-300' : 'text-amber-700'}>{pacing.shiftStatusLabel}</strong>
        </span>
        <span className="tabular-nums">
          Cần thêm:{' '}
          <strong className={isDark ? 'text-blue-300' : 'text-blue-600'}>+{metrics.remainingBook} Book</strong> trước
          22:00
        </span>
      </div>
    </section>
  );
};
