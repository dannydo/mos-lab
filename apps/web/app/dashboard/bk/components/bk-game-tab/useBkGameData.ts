'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Dayjs } from 'dayjs';
import {
  BK_GAME_SCORING_RULES,
  type BkBookingLeaderboardEntry,
  type BkGame,
  type BkGameDetailResponse,
} from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import {
  buildStaffDoneBonusMap,
  buildStaffTeamBookingDoneBonusMap,
  rankLeaderboardEntries,
  resolvePodiumEntries,
  type GameMetric,
} from './bkGameUtils';

interface UseBkGameDataParams {
  dateRange: [Dayjs, Dayjs];
}

export function useBkGameData({ dateRange }: UseBkGameDataParams) {
  // Live Leaderboard states
  const [metric, setMetric] = useState<GameMetric>('bookings');
  const [leaderboard, setLeaderboard] = useState<BkBookingLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configured games states
  const [games, setGames] = useState<BkGame[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [gameDetail, setGameDetail] = useState<BkGameDetailResponse | null>(null);
  const [gameLoading, setGameLoading] = useState(false);

  // Modals & Drawers
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [doneBonusDrawerOpen, setDoneBonusDrawerOpen] = useState(false);
  const [selectedBonusStaffId, setSelectedBonusStaffId] = useState<number | null>(null);
  const [teamBookingDoneDrawerOpen, setTeamBookingDoneDrawerOpen] = useState(false);
  const [selectedTeamBkBonusStaffId, setSelectedTeamBkBonusStaffId] = useState<number | null>(null);
  const [selectedTeamBkBonusDate, setSelectedTeamBkBonusDate] = useState<string | null>(null);

  // Countdown timer in seconds
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  // 1. Load Live leaderboard (from BK Leaderboard)
  const loadLeaderboard = useCallback(
    async (options?: { silent?: boolean; skipCache?: boolean }) => {
      if (!options?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const params: Record<string, unknown> = {
          storeId: 'ALL',
        };
        if (selectedGameId) {
          params.gameId = selectedGameId;
        } else {
          params.dateFrom = dateRange[0].format('YYYY-MM-DD');
          params.dateTo = dateRange[1].format('YYYY-MM-DD');
        }
        if (options?.skipCache) {
          params.skipCache = true;
        }
        const response = await apiClient.bk.getBookingLeaderboard(params);
        setLeaderboard(response.leaderboard || []);
        setLastUpdatedAt(new Date());
      } catch {
        if (!options?.silent) {
          setError('Không thể tải bảng xếp hạng Game BK. Vui lòng thử lại.');
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [dateRange, selectedGameId]
  );

  // 2. Load Configured Games list
  const loadGames = useCallback(async () => {
    if (typeof apiClient.bk?.getGames !== 'function') return;
    try {
      const res = await apiClient.bk.getGames({ status: 'ALL' });
      setGames(res.games || []);
      if (res.games && res.games.length > 0) {
        const active = res.games.find((g) => g.status === 'ACTIVE') || res.games[0];
        setSelectedGameId((prev) => (prev ? prev : active.id));
      }
    } catch {
      // Ignore
    }
  }, []);

  // 3. Load Selected Game detail
  const loadSelectedGameDetail = useCallback(async (gameId: number, options?: { silent?: boolean }) => {
    if (typeof apiClient.bk?.getGameDetail !== 'function') return;
    if (!options?.silent) {
      setGameLoading(true);
    }
    try {
      const detail = await apiClient.bk.getGameDetail(gameId);
      setGameDetail(detail);
      if (detail?.stats) {
        setSecondsRemaining(detail.stats.timeRemainingSeconds);
      }
      setLastUpdatedAt(new Date());
    } catch {
      // Ignore
    } finally {
      if (!options?.silent) {
        setGameLoading(false);
      }
    }
  }, []);

  // Initial and periodic live refresh (15s + immediate sync on tab focus/visibility)
  useEffect(() => {
    void loadLeaderboard();
    void loadGames();

    const refreshLive = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void loadLeaderboard({ silent: true, skipCache: true });
      if (selectedGameId) {
        void loadSelectedGameDetail(selectedGameId, { silent: true });
      }
    };

    const timer = window.setInterval(refreshLive, 15_000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLive();
      }
    };
    window.addEventListener('focus', refreshLive);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshLive);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadLeaderboard, loadGames, selectedGameId, loadSelectedGameDetail]);

  useEffect(() => {
    if (selectedGameId) {
      void loadSelectedGameDetail(selectedGameId);
    }
  }, [selectedGameId, loadSelectedGameDetail]);

  // Local 1-second interval for countdown clock
  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const interval = window.setInterval(() => {
      setSecondsRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [secondsRemaining]);

  // Ranked entries
  const rankedEntries = useMemo(() => rankLeaderboardEntries(leaderboard, metric), [leaderboard, metric]);
  const totalScore = useMemo(() => rankedEntries.reduce((total, entry) => total + entry.gameScore, 0), [rankedEntries]);
  const leaderScore = rankedEntries[0]?.gameScore || 0;

  // Selected game stats
  const activeGame = gameDetail?.game;
  const scoringRule =
    gameDetail?.scoringRule ||
    (activeGame ? BK_GAME_SCORING_RULES[activeGame.metricType] : undefined) ||
    BK_GAME_SCORING_RULES.BOOKINGS;
  const gameLeaderboard = gameDetail?.leaderboard || [];

  const { top1, top2, top3 } = useMemo(
    () => resolvePodiumEntries(gameLeaderboard, rankedEntries),
    [gameLeaderboard, rankedEntries]
  );

  const hasDoneBonusConfig = Boolean(
    activeGame?.doneBonusConfig &&
    (Array.isArray(activeGame.doneBonusConfig) ? activeGame.doneBonusConfig.length > 0 : true)
  );
  const totalDoneBonusAmount = gameDetail?.doneBonusesSummary?.totalDoneBonus ?? 0;
  const totalDoneBonusBookings = gameDetail?.doneBonusesSummary?.totalDoneBookings ?? 0;

  const staffDoneBonusMap = useMemo(() => buildStaffDoneBonusMap(gameDetail), [gameDetail]);

  const teamBookingDoneBonusSummary = gameDetail?.teamBookingDoneBonusSummary || null;
  const hasTeamBookingDoneBonus = Boolean(teamBookingDoneBonusSummary && teamBookingDoneBonusSummary.config?.enabled);

  const staffTeamBookingDoneBonusMap = useMemo(
    () => buildStaffTeamBookingDoneBonusMap(teamBookingDoneBonusSummary, gameDetail),
    [teamBookingDoneBonusSummary, gameDetail]
  );

  const openDoneBonusDrawer = useCallback((staffId: number | null = null) => {
    setSelectedBonusStaffId(staffId);
    setDoneBonusDrawerOpen(true);
  }, []);

  const openTeamBookingDoneDrawer = useCallback((staffId: number | null = null, rewardDate: string | null = null) => {
    setSelectedTeamBkBonusStaffId(staffId);
    setSelectedTeamBkBonusDate(rewardDate);
    setTeamBookingDoneDrawerOpen(true);
  }, []);

  const refreshAll = useCallback(() => {
    void loadLeaderboard({ skipCache: true });
    void loadGames();
    if (selectedGameId) {
      void loadSelectedGameDetail(selectedGameId);
    }
  }, [loadLeaderboard, loadGames, selectedGameId, loadSelectedGameDetail]);

  return {
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
  };
}
