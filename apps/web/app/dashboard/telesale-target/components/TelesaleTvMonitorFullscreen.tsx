'use client';

import React from 'react';
import { useTheme } from '../../../../context/ThemeContext';
import { TelesaleTvBookSidePanel } from './TelesaleTvBookSidePanel';
import { TelesaleTvCheckinSidePanel } from './TelesaleTvCheckinSidePanel';
import { TelesaleTvJournalModal } from './TelesaleTvJournalModal';
import { TelesaleTvLiveCelebrationBanner } from './TelesaleTvLiveCelebrationBanner';
import { TelesaleTvQuotesDrawer } from './TelesaleTvQuotesDrawer';
import { TelesaleTvStaffContributionGrid } from './TelesaleTvStaffContributionGrid';
import { TvFullscreenGaugeCard } from './telesale-tv-monitor-fullscreen/TvFullscreenGaugeCard';
import { TvFullscreenTickerFooter } from './telesale-tv-monitor-fullscreen/TvFullscreenTickerFooter';
import { TvFullscreenTopBar } from './telesale-tv-monitor-fullscreen/TvFullscreenTopBar';
import type {
  TelesaleTvMonitorFullscreenProps,
  TvFullscreenCardTierStyles,
  TvFullscreenCardVariant,
  TvFullscreenTier,
} from './telesale-tv-monitor-fullscreen/tvFullscreenTypes';
import { useTelesaleTvMonitorFullscreen } from './telesale-tv-monitor-fullscreen/useTelesaleTvMonitorFullscreen';

export type { TelesaleTvMonitorFullscreenProps, TvFullscreenCardTierStyles, TvFullscreenCardVariant, TvFullscreenTier };

/** Dedicated fullscreen TV Monitor War Room experience for live Telesales Book & Check-in tracking. */
export const TelesaleTvMonitorFullscreen: React.FC<TelesaleTvMonitorFullscreenProps> = ({
  overview,
  open,
  onClose,
  liveCelebration: externalCelebration,
}) => {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const {
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
  } = useTelesaleTvMonitorFullscreen({
    overview,
    open,
    onClose,
    externalCelebration,
  });

  if (!open) return null;

  return (
    <div
      ref={fullscreenContainerRef}
      className={`fixed inset-0 z-[99999] flex flex-col justify-between select-none overflow-hidden font-sans h-screen max-h-screen transition-colors duration-300 ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-100 text-slate-800'
      }`}
    >
      <TelesaleTvLiveCelebrationBanner
        celebration={activeCelebration}
        isSpeaking={isSpeaking}
        isFadingOut={isFadingOut}
      />

      {/* Ambient background glows for TV high-contrast ambiance */}
      <div
        className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none ${
          isDark ? 'bg-amber-500/10' : 'bg-amber-400/[0.08]'
        }`}
      />
      <div
        className={`absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[140px] pointer-events-none ${
          isDark ? 'bg-emerald-500/10' : 'bg-emerald-400/[0.08]'
        }`}
      />

      {/* Top & Main Cockpit Content Area */}
      <div className="flex-1 flex flex-col min-h-0 w-full p-3 sm:p-4 pb-1 overflow-hidden">
        <TvFullscreenTopBar
          isDark={isDark}
          timeDisplay={timeDisplay}
          bookCount={overview.todayBookList?.length || 0}
          checkinCount={overview.todayCheckinList?.length || 0}
          showBookPanel={showBookPanel}
          showCheckinPanel={showCheckinPanel}
          onToggleBookPanel={() => toggleBookPanel(!showBookPanel)}
          onToggleCheckinPanel={() => toggleCheckinPanel(!showCheckinPanel)}
          settingsPopoverOpen={settingsPopoverOpen}
          onSettingsPopoverOpenChange={setSettingsPopoverOpen}
          voiceSettings={voiceSettings}
          onUpdateVoiceSettings={updateVoiceSettings}
          onOpenQuotesManager={handleOpenQuotesManager}
          onTriggerDemoCelebration={triggerDemoCelebration}
          onTriggerTestFireworks={triggerTestFireworks}
          isQuietHours={isQuietHours}
          onToggleSound={handleToggleSound}
          showStaffGrid={showStaffGrid}
          onToggleStaffGrid={handleToggleStaffGrid}
          isManagerOrAdmin={isManagerOrAdmin}
          onOpenJournal={handleOpenJournal}
          isBrowserFullscreen={isBrowserFullscreen}
          onToggleBrowserFullscreen={toggleBrowserFullscreen}
          onClose={onClose}
          shiftNodes={shiftNodes}
          shiftProgress={shiftProgress}
          fullscreenContainerRef={fullscreenContainerRef}
        />

        {/* 2. ELASTIC 3-ZONE COCKPIT: LEFT BOOK PANEL | CENTER CARDS & STAFF | RIGHT CHECK-IN PANEL */}
        <div className="relative z-10 flex flex-row gap-2.5 sm:gap-3 xl:gap-4 my-1 flex-1 items-stretch min-h-0 w-full overflow-hidden">
          {showBookPanel && (
            <TelesaleTvBookSidePanel
              bookList={overview.todayBookList}
              isDark={isDark}
              onClose={() => toggleBookPanel(false)}
            />
          )}

          <div className="flex-1 flex flex-col justify-between min-w-0 h-full overflow-hidden transition-all duration-300">
            <main className="relative grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3.5 xl:gap-4 flex-1 items-stretch min-h-0 mb-2">
              <TvFullscreenGaugeCard
                variant="book"
                isDark={isDark}
                metrics={metrics}
                fireworksEnabled={voiceSettings.fireworksEnabled ?? true}
                soundEnabled={voiceSettings.soundEnabled}
                volume={voiceSettings.volume}
                isTestFireworksActive={testFireworksBook}
                isFrenzyActive={frenzyBook}
              />

              <TvFullscreenGaugeCard
                variant="checkin"
                isDark={isDark}
                metrics={metrics}
                fireworksEnabled={voiceSettings.fireworksEnabled ?? true}
                soundEnabled={voiceSettings.soundEnabled}
                volume={voiceSettings.volume}
                isTestFireworksActive={testFireworksCheckin}
                isFrenzyActive={frenzyCheckin}
              />
            </main>

            {showStaffGrid && (
              <TelesaleTvStaffContributionGrid
                staffTargets={overview.staffTargets}
                totalTeamBookToday={metrics.bookActual}
                dailyBookTarget={metrics.bookTarget}
                pacing={pacing}
              />
            )}
          </div>

          {showCheckinPanel && (
            <TelesaleTvCheckinSidePanel
              checkinList={overview.todayCheckinList}
              isDark={isDark}
              onClose={() => toggleCheckinPanel(false)}
            />
          )}
        </div>
      </div>

      <TvFullscreenTickerFooter isDark={isDark} pacing={pacing} metrics={metrics} topStaff={topStaff} />

      <TelesaleTvJournalModal
        open={journalOpen}
        onClose={() => setJournalOpen(false)}
        staffList={overview.staffTargets || []}
      />

      <TelesaleTvQuotesDrawer
        open={quotesDrawerOpen}
        onClose={() => setQuotesDrawerOpen(false)}
        zIndex={100010}
        getContainer={() => fullscreenContainerRef.current || document.body}
      />
    </div>
  );
};
