'use client';

import React from 'react';
import BkDoneBonusDetailsDrawer from './BkDoneBonusDetailsDrawer';
import BkGameCreateModal from './BkGameCreateModal';
import BkGameEditModal from './BkGameEditModal';
import BkGameFinalizeModal from './BkGameFinalizeModal';
import BkTeamBookingDoneBonusDetailsDrawer from './BkTeamBookingDoneBonusDetailsDrawer';
import BkTeamBookingDoneBonusPanel from './BkTeamBookingDoneBonusPanel';
import { BkGameArenaBanner } from './bk-game-tab/BkGameArenaBanner';
import { BkGameHeaderToolbar } from './bk-game-tab/BkGameHeaderToolbar';
import { BkGameLeaderboardSection } from './bk-game-tab/BkGameLeaderboardSection';
import { BkGamePodiumArena } from './bk-game-tab/BkGamePodiumArena';
import { BkGameTeamKpiArena } from './bk-game-tab/BkGameTeamKpiArena';
import type { BkGameTabProps, GameMetric, PodiumEntry, RankedGameEntry } from './bk-game-tab/bkGameUtils';
import { useBkGameData } from './bk-game-tab/useBkGameData';

export type { BkGameTabProps, GameMetric, PodiumEntry, RankedGameEntry };

export default function BkGameTab({ dateRange, comparisonMode }: BkGameTabProps) {
  const {
    metric,
    setMetric,
    loading,
    error,
    games,
    selectedGameId,
    setSelectedGameId,
    gameDetail,
    gameLoading,
    createModalOpen,
    setCreateModalOpen,
    editModalOpen,
    setEditModalOpen,
    finalizeModalOpen,
    setFinalizeModalOpen,
    doneBonusDrawerOpen,
    setDoneBonusDrawerOpen,
    selectedBonusStaffId,
    teamBookingDoneDrawerOpen,
    setTeamBookingDoneDrawerOpen,
    selectedTeamBkBonusStaffId,
    selectedTeamBkBonusDate,
    secondsRemaining,
    lastUpdatedAt,
    rankedEntries,
    totalScore,
    leaderScore,
    activeGame,
    scoringRule,
    top1,
    top2,
    top3,
    hasDoneBonusConfig,
    totalDoneBonusAmount,
    totalDoneBonusBookings,
    staffDoneBonusMap,
    teamBookingDoneBonusSummary,
    hasTeamBookingDoneBonus,
    staffTeamBookingDoneBonusMap,
    loadLeaderboard,
    loadGames,
    loadSelectedGameDetail,
    openDoneBonusDrawer,
    openTeamBookingDoneDrawer,
    refreshAll,
  } = useBkGameData({ dateRange });

  return (
    <div className="space-y-4">
      <BkGameHeaderToolbar
        activeGame={activeGame}
        comparisonMode={comparisonMode}
        games={games}
        selectedGameId={selectedGameId}
        onSelectGameId={setSelectedGameId}
        hasDoneBonusConfig={hasDoneBonusConfig}
        hasTeamBookingDoneBonus={hasTeamBookingDoneBonus}
        loading={loading}
        gameLoading={gameLoading}
        onOpenCreateModal={() => setCreateModalOpen(true)}
        onOpenEditModal={() => setEditModalOpen(true)}
        onOpenDoneBonusDrawer={() => openDoneBonusDrawer(null)}
        onOpenTeamBookingDoneDrawer={() => openTeamBookingDoneDrawer(null, null)}
        onRefresh={refreshAll}
      />

      {activeGame && (
        <div className="space-y-4">
          <BkGameArenaBanner
            activeGame={activeGame}
            gameDetail={gameDetail}
            scoringRule={scoringRule}
            secondsRemaining={secondsRemaining}
            hasDoneBonusConfig={hasDoneBonusConfig}
            totalDoneBonusAmount={totalDoneBonusAmount}
            totalDoneBonusBookings={totalDoneBonusBookings}
            hasTeamBookingDoneBonus={hasTeamBookingDoneBonus}
            teamBookingDoneBonusSummary={teamBookingDoneBonusSummary}
            top1={top1}
            onOpenDoneBonusDrawer={() => openDoneBonusDrawer(null)}
            onOpenTeamBookingDoneDrawer={() => openTeamBookingDoneDrawer(null, null)}
          />

          {activeGame.gameType === 'TEAM_KPI' && gameDetail?.teamKpiSummary ? (
            <BkGameTeamKpiArena
              activeGame={activeGame}
              gameDetail={gameDetail}
              teamKpiSummary={gameDetail.teamKpiSummary}
              onOpenFinalizeModal={() => setFinalizeModalOpen(true)}
            />
          ) : (
            <BkGamePodiumArena
              activeGame={activeGame}
              gameDetail={gameDetail}
              hasTeamBookingDoneBonus={hasTeamBookingDoneBonus}
              top1={top1}
              top2={top2}
              top3={top3}
              onOpenFinalizeModal={() => setFinalizeModalOpen(true)}
            />
          )}

          {hasTeamBookingDoneBonus && teamBookingDoneBonusSummary && (
            <BkTeamBookingDoneBonusPanel
              summary={teamBookingDoneBonusSummary}
              onOpenDetailsDrawer={openTeamBookingDoneDrawer}
              lastUpdatedAt={lastUpdatedAt}
            />
          )}
        </div>
      )}

      <BkGameLeaderboardSection
        metric={metric}
        onChangeMetric={setMetric}
        rankedEntries={rankedEntries}
        totalScore={totalScore}
        leaderScore={leaderScore}
        activeGame={activeGame}
        scoringRule={scoringRule}
        loading={loading}
        error={error}
        hasDoneBonusConfig={hasDoneBonusConfig}
        hasTeamBookingDoneBonus={hasTeamBookingDoneBonus}
        staffDoneBonusMap={staffDoneBonusMap}
        staffTeamBookingDoneBonusMap={staffTeamBookingDoneBonusMap}
        onRetryLoad={() => void loadLeaderboard()}
        onOpenEditModal={() => setEditModalOpen(true)}
        onOpenFinalizeModal={() => setFinalizeModalOpen(true)}
        onOpenDoneBonusDrawer={(staffId) => openDoneBonusDrawer(staffId)}
        onOpenTeamBookingDoneDrawer={openTeamBookingDoneDrawer}
      />

      {/* MODAL: CREATE GAME */}
      <BkGameCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={(newGame) => {
          void loadGames();
          setSelectedGameId(newGame.id);
        }}
      />

      {/* MODAL: EDIT GAME */}
      {activeGame && (
        <BkGameEditModal
          open={editModalOpen}
          game={activeGame}
          onClose={() => setEditModalOpen(false)}
          onSuccess={() => {
            void loadGames();
            if (selectedGameId) void loadSelectedGameDetail(selectedGameId);
            void loadLeaderboard();
          }}
        />
      )}

      {/* MODAL: FINALIZE GAME */}
      {gameDetail && (
        <BkGameFinalizeModal
          open={finalizeModalOpen}
          onClose={() => setFinalizeModalOpen(false)}
          gameDetail={gameDetail}
          onSuccess={() => {
            void loadGames();
            if (selectedGameId) void loadSelectedGameDetail(selectedGameId);
          }}
        />
      )}

      {/* DRAWER: DONE BONUS DETAILS AUDIT */}
      <BkDoneBonusDetailsDrawer
        open={doneBonusDrawerOpen}
        onClose={() => setDoneBonusDrawerOpen(false)}
        gameDetail={gameDetail}
        initialStaffId={selectedBonusStaffId}
      />

      {/* DRAWER: TEAM-BOOKING DONE BONUS DETAILS AUDIT (MOS-BUG-247) */}
      <BkTeamBookingDoneBonusDetailsDrawer
        open={teamBookingDoneDrawerOpen}
        onClose={() => setTeamBookingDoneDrawerOpen(false)}
        gameTitle={activeGame?.title}
        gameId={activeGame?.id}
        summary={teamBookingDoneBonusSummary}
        initialStaffId={selectedTeamBkBonusStaffId}
        initialRewardDate={selectedTeamBkBonusDate}
      />
    </div>
  );
}
