'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Popover, Progress, Segmented, Select, Tooltip, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { Trophy, RefreshCw, Plus, Clock, ShieldAlert, Swords, CheckCircle2, Info, Sparkles } from 'lucide-react';
import type { BkBookingLeaderboardEntry, BkGame, BkGameDetailResponse } from '@mos-lab/shared';
import { BK_GAME_SCORING_RULES } from '@mos-lab/shared';
import { AppIcon, DataSection, DataTable, MetricGrid, StatePanel, StatusTag } from '~/components/ui';
import { apiClient } from '~/lib/api-client';
import BkAvatar from './BkAvatar';
import BkGameCreateModal from './BkGameCreateModal';
import BkGameFinalizeModal from './BkGameFinalizeModal';

type GameMetric = 'calls' | 'pickups' | 'bookings' | 'done';

interface BkGameTabProps {
  dateRange: [Dayjs, Dayjs];
  comparisonMode: 'month' | 'week' | 'day';
}

const METRIC_OPTIONS: { label: string; value: GameMetric }[] = [
  { label: 'Cuộc gọi', value: 'calls' },
  { label: 'Khách nghe máy', value: 'pickups' },
  { label: 'Booking', value: 'bookings' },
  { label: 'Done', value: 'done' },
];

const METRIC_LABEL: Record<GameMetric, string> = {
  calls: 'Cuộc gọi',
  pickups: 'Khách nghe máy',
  bookings: 'Booking tạo mới',
  done: 'Done',
};

function metricValue(entry: BkBookingLeaderboardEntry, metric: GameMetric): number {
  if (metric === 'calls') return entry.callCount;
  if (metric === 'pickups') return entry.pickupCount;
  if (metric === 'bookings') return entry.totalCreatedBookings;
  return entry.doneBookings;
}

export default function BkGameTab({ dateRange, comparisonMode }: BkGameTabProps) {
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

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);

  // Countdown timer in seconds
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // 1. Load Live leaderboard (from BK Leaderboard)
  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.bk.getBookingLeaderboard({
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: 'ALL',
      });
      setLeaderboard(response.leaderboard || []);
    } catch {
      setError('Không thể tải bảng xếp hạng Game BK. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

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
  const loadSelectedGameDetail = useCallback(async (gameId: number) => {
    if (typeof apiClient.bk?.getGameDetail !== 'function') return;
    setGameLoading(true);
    try {
      const detail = await apiClient.bk.getGameDetail(gameId);
      setGameDetail(detail);
      setSecondsRemaining(detail.stats.timeRemainingSeconds);
    } catch {
      // Ignore
    } finally {
      setGameLoading(false);
    }
  }, []);

  // Initial and periodic refresh
  useEffect(() => {
    void loadLeaderboard();
    void loadGames();

    const timer = window.setInterval(() => {
      void loadLeaderboard();
      if (selectedGameId) {
        void loadSelectedGameDetail(selectedGameId);
      }
    }, 30_000);

    return () => window.clearInterval(timer);
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

  // Format countdown
  const formatCountdown = (totalSec: number) => {
    if (totalSec <= 0) return 'ĐÃ HẾT GIỜ';
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (days > 0) {
      return `${days} ngày ${pad(hours)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  };

  // Ranked entries
  const rankedEntries = useMemo(
    () =>
      [...leaderboard]
        .sort(
          (left, right) =>
            metricValue(right, metric) - metricValue(left, metric) || left.displayName.localeCompare(right.displayName)
        )
        .map((entry, index) => ({ ...entry, gameRank: index + 1, gameScore: metricValue(entry, metric) })),
    [leaderboard, metric]
  );

  const totalScore = rankedEntries.reduce((total, entry) => total + entry.gameScore, 0);
  const leaderScore = rankedEntries[0]?.gameScore || 0;

  // Selected game stats
  const activeGame = gameDetail?.game;
  const scoringRule =
    gameDetail?.scoringRule ||
    (activeGame ? BK_GAME_SCORING_RULES[activeGame.metricType] : undefined) ||
    BK_GAME_SCORING_RULES.BOOKINGS;
  const gameLeaderboard = gameDetail?.leaderboard || [];
  const top1 =
    gameLeaderboard[0] ||
    (rankedEntries[0]
      ? {
          staffName: rankedEntries[0].displayName,
          score: rankedEntries[0].gameScore,
          avatar: rankedEntries[0].avatar,
          targetProgressPercent: 100,
        }
      : null);
  const top2 =
    gameLeaderboard[1] ||
    (rankedEntries[1]
      ? {
          staffName: rankedEntries[1].displayName,
          score: rankedEntries[1].gameScore,
          avatar: rankedEntries[1].avatar,
          targetProgressPercent: 90,
        }
      : null);
  const top3 =
    gameLeaderboard[2] ||
    (rankedEntries[2]
      ? {
          staffName: rankedEntries[2].displayName,
          score: rankedEntries[2].gameScore,
          avatar: rankedEntries[2].avatar,
          targetProgressPercent: 80,
        }
      : null);

  return (
    <div className="space-y-4">
      {/* Informational Alert if no active campaign is running */}
      {!activeGame && (
        <Alert
          showIcon
          type="info"
          message="Game BK · bảng thi đua trực tiếp"
          description="Điểm được lấy từ BK Leaderboard chuẩn trong kỳ đang chọn. Manager có thể bấm 'Tạo Game Mới' để thiết lập mục tiêu, cược, chia đội và hình phạt vui."
        />
      )}

      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
        <div>
          <Typography.Title level={4} className="!mb-0 flex items-center gap-2">
            <AppIcon icon={Trophy} size="md" className="text-amber-500" />
            <span>Game BK</span>
          </Typography.Title>
          <Typography.Text type="secondary" className="text-xs">
            Thi đua theo {comparisonMode === 'day' ? 'ngày' : comparisonMode === 'week' ? 'tuần' : 'tháng'} · tự làm mới
            mỗi 30 giây
          </Typography.Text>
        </div>

        <div className="flex items-center gap-2">
          {games.length > 0 && (
            <Select
              value={selectedGameId}
              onChange={setSelectedGameId}
              className="min-w-[240px]"
              options={games.map((g) => ({
                value: g.id,
                label: (
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{g.title}</span>
                    <StatusTag
                      status={g.status === 'ACTIVE' ? 'success' : g.status === 'COMPLETED' ? 'default' : 'warning'}
                      label={g.status === 'ACTIVE' ? 'Đang chạy' : g.status === 'COMPLETED' ? 'Đã chốt' : 'Nháp'}
                    />
                  </div>
                ),
              }))}
            />
          )}

          <Button
            type="primary"
            icon={<AppIcon icon={Plus} size="sm" />}
            onClick={() => setCreateModalOpen(true)}
            className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 font-medium"
          >
            Tạo Game Mới
          </Button>

          <Button
            icon={<AppIcon icon={RefreshCw} size="action" />}
            onClick={() => {
              void loadLeaderboard();
              void loadGames();
              if (selectedGameId) void loadSelectedGameDetail(selectedGameId);
            }}
            loading={loading || gameLoading}
          >
            Làm mới
          </Button>
        </div>
      </div>

      {/* ARENA BANNER & CARDS (When a campaign game is active) */}
      {activeGame && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl border border-slate-700/60">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <StatusTag
                    status="gold"
                    label={activeGame.gameType === 'TEAM' ? 'Chia Đội Đối Đầu' : 'Thi Đấu Cá Nhân'}
                  />
                  <StatusTag
                    status={activeGame.status === 'ACTIVE' ? 'success' : 'default'}
                    label={activeGame.status === 'ACTIVE' ? 'Đang Diễn Ra' : 'Đã Kết Thúc'}
                  />
                </div>
                <Typography.Title level={3} className="!text-white !mb-1 font-extrabold tracking-tight">
                  {activeGame.title}
                </Typography.Title>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <Typography.Text className="text-slate-300 text-sm">
                    {activeGame.description || `Thi đua đo lường theo chỉ số: ${scoringRule.label}`}
                  </Typography.Text>
                  <Popover
                    trigger="click"
                    placement="bottomLeft"
                    title={
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-100">
                        <AppIcon icon={Sparkles} size="sm" className="text-blue-500" />
                        <span>Công Thức & Quy Tắc Tính Điểm</span>
                      </div>
                    }
                    content={
                      <div className="max-w-md space-y-2.5 text-xs py-1" data-testid="bk-game-scoring-popover">
                        <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold flex items-center justify-between">
                          <span>🎯 {scoringRule.formula}</span>
                          <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {scoringRule.unit}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 !mb-0 leading-relaxed">
                          {scoringRule.description}
                        </p>
                        <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-slate-800 text-[11px]">
                          <div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Thời gian game: </span>
                            <span className="text-slate-600 dark:text-slate-400">
                              {dayjs(activeGame.startDate).format('DD/MM/YYYY HH:mm')} –{' '}
                              {dayjs(activeGame.endDate).format('DD/MM/YYYY HH:mm')}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Nguồn trích xuất: </span>
                            <span className="text-slate-600 dark:text-slate-400">{scoringRule.dataSource}</span>
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                          💡 <strong>Quy tắc đối soát:</strong> Điểm thi đua trên Đấu trường được tính riêng từ thời
                          điểm bắt đầu đến kết thúc của game ({dayjs(activeGame.startDate).format('DD/MM')} –{' '}
                          {dayjs(activeGame.endDate).format('DD/MM')}), không bị ảnh hưởng bởi bộ lọc thời gian
                          (tháng/tuần/ngày) của Bảng xếp hạng bên dưới.
                        </div>
                      </div>
                    }
                  >
                    <button
                      type="button"
                      aria-label="Xem công thức tính điểm"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 hover:bg-blue-500/30 text-cyan-300 border border-cyan-400/40 transition-all cursor-pointer shadow-sm"
                    >
                      <AppIcon icon={Info} size="sm" />
                      <span>Xem công thức tính điểm</span>
                    </button>
                  </Popover>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                  <span>
                    Thời gian: {dayjs(activeGame.startDate).format('DD/MM/YYYY HH:mm')} –{' '}
                    {dayjs(activeGame.endDate).format('DD/MM/YYYY HH:mm')}
                  </span>
                </div>
              </div>

              {/* Countdown Box */}
              <div className="bg-black/40 backdrop-blur-md rounded-xl p-4 border border-white/10 text-center min-w-[200px]">
                <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-medium mb-1 uppercase tracking-wider">
                  <AppIcon icon={Clock} size="sm" />
                  <span>Thời Gian Còn Lại</span>
                </div>
                <div className="text-2xl font-black tabular-nums tracking-wider text-amber-300">
                  {formatCountdown(secondsRemaining)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Tự động cập nhật mỗi 30s</div>
              </div>
            </div>

            {/* 4 Summary Stat Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
              <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                <div className="text-xs text-slate-400 uppercase font-medium flex items-center justify-between">
                  <span>Mục Tiêu KPI</span>
                  <Tooltip title={`Công thức: ${scoringRule.formula}`}>
                    <span className="text-[10px] lowercase text-cyan-300/80 cursor-help underline decoration-dotted">
                      {scoringRule.unit}
                    </span>
                  </Tooltip>
                </div>
                <div className="text-xl font-bold mt-1 text-white tabular-nums">
                  {activeGame.targetScore ? `${activeGame.targetScore} điểm` : 'Tự do'}
                </div>
                <div className="text-xs text-emerald-400 mt-0.5">
                  Toàn đội: {gameDetail?.stats.totalScore || 0} điểm
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                <div className="text-xs text-slate-400 uppercase font-medium">Quỹ Giải Thưởng</div>
                <div className="text-xl font-bold mt-1 text-amber-400 tabular-nums">
                  {activeGame.rewardPool.toLocaleString('vi-VN')} đ
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {activeGame.entryFee > 0 ? `Cược: ${activeGame.entryFee.toLocaleString('vi-VN')}đ` : 'Miễn phí'}
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                <div className="text-xs text-slate-400 uppercase font-medium">Dẫn Đầu (Top 1)</div>
                <div className="text-xl font-bold mt-1 text-white truncate">{top1?.staffName || 'Chưa có'}</div>
                <div className="text-xs text-amber-300 mt-0.5 tabular-nums">{top1 ? `${top1.score} điểm` : '-'}</div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-xl border border-white/10">
                <div className="text-xs text-slate-400 uppercase font-medium flex items-center gap-1 text-rose-300">
                  <AppIcon icon={ShieldAlert} size="sm" />
                  <span>Hình Phạt Vui</span>
                </div>
                <div className="text-sm font-semibold mt-1 text-rose-200 line-clamp-1">
                  {activeGame.penaltyDescription || 'Chưa thiết lập'}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">Dành cho người không đạt</div>
              </div>
            </div>
          </div>

          {/* CHAMPIONSHIP ARENA: TOP 3 PODIUM + BATTLE / CHALLENGE PANEL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
            {/* TOP 3 PODIUM */}
            <div
              className={
                activeGame.gameType === 'TEAM' && gameDetail?.teams && gameDetail.teams.length >= 2
                  ? 'lg:col-span-7 flex flex-col'
                  : 'lg:col-span-8 flex flex-col'
              }
            >
              <div className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-5 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                      <AppIcon icon={Trophy} size="md" />
                    </div>
                    <div>
                      <Typography.Title level={5} className="!mb-0 font-bold tracking-tight">
                        Top 3 Bảng Xếp Hạng
                      </Typography.Title>
                      <Typography.Text type="secondary" className="text-xs">
                        Bục vinh danh những cá nhân xuất sắc nhất
                      </Typography.Text>
                    </div>
                  </div>
                  <StatusTag status="gold" label="PODIUM" />
                </div>

                {/* Olympic 3-Step Podium Pedestal */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end pt-6 pb-2 px-1 max-w-lg mx-auto w-full">
                  {/* #2 Silver (Left) */}
                  <div className="flex flex-col items-center text-center">
                    {top2 ? (
                      <>
                        <div className="relative mb-2">
                          <div className="relative inline-block rounded-full ring-2 ring-slate-400 dark:ring-slate-500 p-0.5 shadow-sm">
                            <BkAvatar name={top2.staffName} src={top2.avatar} size={46} />
                          </div>
                          <span className="absolute -bottom-1 -right-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-white dark:ring-slate-900">
                            #2
                          </span>
                        </div>
                        <div className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate max-w-[100px] mb-0.5">
                          {top2.staffName}
                        </div>
                        <div className="text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                          {top2.score} {activeGame.metricType === 'BOOKINGS' ? 'Booking' : 'Điểm'}
                        </div>
                        {/* Silver Pedestal Step */}
                        <div className="w-full mt-3 h-24 rounded-t-xl bg-gradient-to-t from-slate-200/90 to-slate-100/60 dark:from-slate-800 dark:to-slate-700/50 border-t-2 border-slate-300 dark:border-slate-500 flex flex-col items-center justify-center shadow-sm">
                          <span className="text-2xl font-black text-slate-400 dark:text-slate-500">2</span>
                          <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                            Á Quân
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 italic py-8">Chưa có</div>
                    )}
                  </div>

                  {/* #1 Gold (Center - Elevated & Glowing) */}
                  <div className="flex flex-col items-center text-center -mt-6">
                    {top1 ? (
                      <>
                        <div className="relative mb-2">
                          <div className="text-amber-500 mb-0.5 flex justify-center animate-bounce">
                            <AppIcon icon={Trophy} size="md" />
                          </div>
                          <div className="relative inline-block rounded-full ring-4 ring-amber-400 dark:ring-amber-500 shadow-md shadow-amber-500/20 p-0.5 scale-105">
                            <BkAvatar name={top1.staffName} src={top1.avatar} size={56} />
                          </div>
                          <span className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 text-xs font-black px-1.5 py-0.5 rounded-full ring-2 ring-white dark:ring-slate-900 shadow">
                            #1
                          </span>
                        </div>
                        <div className="font-bold text-sm sm:text-base text-amber-600 dark:text-amber-400 truncate max-w-[120px] mb-0.5">
                          {top1.staffName}
                        </div>
                        <div className="text-xs sm:text-sm font-black text-amber-500 tabular-nums">
                          {top1.score} {activeGame.metricType === 'BOOKINGS' ? 'Booking' : 'Điểm'}
                        </div>
                        {/* Gold Pedestal Step */}
                        <div className="w-full mt-3 h-32 rounded-t-xl bg-gradient-to-t from-amber-500/30 via-amber-400/20 to-amber-300/30 dark:from-amber-600/40 dark:via-amber-500/20 dark:to-amber-400/30 border-t-4 border-amber-400 flex flex-col items-center justify-center shadow-md shadow-amber-500/10">
                          <span className="text-3xl font-black text-amber-500 dark:text-amber-400">1</span>
                          <span className="text-[10px] uppercase font-black tracking-wider text-amber-600 dark:text-amber-400">
                            Quán Quân
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 italic py-8">Chưa có</div>
                    )}
                  </div>

                  {/* #3 Bronze (Right) */}
                  <div className="flex flex-col items-center text-center">
                    {top3 ? (
                      <>
                        <div className="relative mb-2">
                          <div className="relative inline-block rounded-full ring-2 ring-amber-700/60 dark:ring-amber-600/60 p-0.5 shadow-sm">
                            <BkAvatar name={top3.staffName} src={top3.avatar} size={42} />
                          </div>
                          <span className="absolute -bottom-1 -right-1 bg-amber-800 text-amber-100 text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-1 ring-white dark:ring-slate-900">
                            #3
                          </span>
                        </div>
                        <div className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 truncate max-w-[100px] mb-0.5">
                          {top3.staffName}
                        </div>
                        <div className="text-xs font-bold text-amber-700 dark:text-amber-500 tabular-nums">
                          {top3.score} {activeGame.metricType === 'BOOKINGS' ? 'Booking' : 'Điểm'}
                        </div>
                        {/* Bronze Pedestal Step */}
                        <div className="w-full mt-3 h-20 rounded-t-xl bg-gradient-to-t from-amber-900/20 to-amber-800/10 dark:from-amber-950 dark:to-amber-900/40 border-t-2 border-amber-700 flex flex-col items-center justify-center shadow-sm">
                          <span className="text-2xl font-black text-amber-700 dark:text-amber-600">3</span>
                          <span className="text-[9px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-500">
                            Hạng Ba
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 italic py-8">Chưa có</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SIDE PANEL: TEAM BATTLE OR CHALLENGE OVERVIEW */}
            <div
              className={
                activeGame.gameType === 'TEAM' && gameDetail?.teams && gameDetail.teams.length >= 2
                  ? 'lg:col-span-5 flex flex-col'
                  : 'lg:col-span-4 flex flex-col'
              }
            >
              {activeGame.gameType === 'TEAM' && gameDetail?.teams && gameDetail.teams.length >= 2 ? (
                <div className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <AppIcon icon={Swords} size="md" className="text-rose-500" />
                        <Typography.Title level={5} className="!mb-0 font-bold">
                          Đối Đầu Đồng Đội
                        </Typography.Title>
                      </div>
                      <StatusTag status="error" label="LIVE BATTLE" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 items-center">
                      <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20">
                        <div className="font-bold text-sm text-blue-600 dark:text-blue-400 truncate">
                          {gameDetail.teams[0].teamName}
                        </div>
                        <div className="text-xl font-black tabular-nums text-blue-600 dark:text-blue-400 mt-1">
                          {gameDetail.teams[0].score} <span className="text-xs font-normal">điểm</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {gameDetail.teams[0].participants?.length || 0} thành viên
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20">
                        <div className="font-bold text-sm text-rose-600 dark:text-rose-400 truncate">
                          {gameDetail.teams[1].teamName}
                        </div>
                        <div className="text-xl font-black tabular-nums text-rose-600 dark:text-rose-400 mt-1">
                          {gameDetail.teams[1].score} <span className="text-xs font-normal">điểm</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          {gameDetail.teams[1].participants?.length || 0} thành viên
                        </div>
                      </div>
                    </div>

                    {/* Battle Progress Bar */}
                    <div className="mt-4">
                      {(() => {
                        const t1 = gameDetail.teams[0].score;
                        const t2 = gameDetail.teams[1].score;
                        const sum = t1 + t2;
                        const p1 = sum > 0 ? Math.round((t1 / sum) * 100) : 50;
                        return (
                          <div>
                            <div className="flex justify-between text-xs font-semibold mb-1">
                              <span className="text-blue-600">
                                {gameDetail.teams[0].teamName} ({p1}%)
                              </span>
                              <span className="text-rose-600">
                                {gameDetail.teams[1].teamName} ({100 - p1}%)
                              </span>
                            </div>
                            <Progress
                              percent={p1}
                              strokeColor="var(--ant-color-primary)"
                              trailColor="var(--ant-color-error)"
                              showInfo={false}
                              className="!m-0"
                            />
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {activeGame.status === 'ACTIVE' && (
                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                      <Button
                        type="primary"
                        icon={<AppIcon icon={CheckCircle2} size="sm" />}
                        onClick={() => setFinalizeModalOpen(true)}
                        className="w-full !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 font-semibold"
                      >
                        Chốt & Công Bố Kết Quả Đội Thắng
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 backdrop-blur-sm p-5 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Typography.Title level={5} className="!mb-0 font-bold">
                        Tiến Độ & Thưởng Phạt
                      </Typography.Title>
                      <StatusTag status="gold" label={`${activeGame.rewardPool.toLocaleString('vi-VN')} đ`} />
                    </div>

                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">Mục tiêu toàn đội:</span>
                          <span className="font-bold tabular-nums">
                            {gameDetail?.stats.totalScore || 0} / {activeGame.targetScore || 50}
                          </span>
                        </div>
                        <Progress
                          percent={Math.min(
                            100,
                            Math.round(((gameDetail?.stats.totalScore || 0) / (activeGame.targetScore || 50)) * 100)
                          )}
                          strokeColor="var(--ant-color-primary)"
                          size="small"
                        />
                      </div>

                      <div className="p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-rose-600 dark:text-rose-400 mb-1">
                          <AppIcon icon={ShieldAlert} size="sm" />
                          <span>Hình Phạt Vui Áp Dụng:</span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          {activeGame.penaltyDescription || 'Bao trà sữa / bánh tráng cả team'}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 text-xs">
                        <div className="font-bold text-amber-700 dark:text-amber-400 mb-0.5">Cơ Cấu Giải Thưởng:</div>
                        <div className="text-slate-600 dark:text-slate-300">
                          {activeGame.rewardDescription || 'Quán quân nhận toàn bộ quỹ cược + thưởng cty'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {activeGame.status === 'ACTIVE' && (
                    <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80">
                      <Button
                        type="primary"
                        icon={<AppIcon icon={CheckCircle2} size="sm" />}
                        onClick={() => setFinalizeModalOpen(true)}
                        className="w-full !bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600 font-semibold"
                      >
                        Chốt & Công Bố Kết Quả
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* METRIC SELECTOR & SUMMARY GRID (100% Backwards Compatible & Accessible) */}
      <Segmented<GameMetric>
        aria-label="Chỉ số xếp hạng Game BK"
        options={METRIC_OPTIONS}
        value={metric}
        onChange={setMetric}
      />

      <MetricGrid
        items={[
          { key: 'participants', title: 'Người tham gia', value: rankedEntries.length, format: 'number' },
          { key: 'total', title: `Tổng ${METRIC_LABEL[metric]}`, value: totalScore, format: 'number' },
          { key: 'leader', title: `Dẫn đầu ${METRIC_LABEL[metric]}`, value: leaderScore, format: 'number' },
        ]}
      />

      {/* DATA SECTION: LEADERBOARD TABLE */}
      <DataSection
        title={`Bảng xếp hạng · ${METRIC_LABEL[metric]}`}
        extra={
          activeGame &&
          activeGame.status === 'ACTIVE' && (
            <Button
              type="primary"
              icon={<AppIcon icon={CheckCircle2} size="sm" />}
              onClick={() => setFinalizeModalOpen(true)}
              className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-600"
            >
              Chốt & Công Bố Kết Quả
            </Button>
          )
        }
      >
        {activeGame && (
          <div
            data-testid="bk-game-table-disclaimer"
            className="mb-3 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 text-xs flex items-center justify-between gap-2"
          >
            <span className="text-slate-600 dark:text-slate-400">
              📌 <strong>Lưu ý hiển thị:</strong> Bảng xếp hạng bên dưới hiển thị số liệu theo bộ lọc thời gian chung (
              {comparisonMode === 'day' ? 'theo ngày' : comparisonMode === 'week' ? 'theo tuần' : 'theo tháng'}). Điểm
              thi đua của game <strong>{activeGame.title}</strong> trên Đấu trường được tính riêng từ{' '}
              <strong>{dayjs(activeGame.startDate).format('DD/MM/YYYY HH:mm')}</strong> đến{' '}
              <strong>{dayjs(activeGame.endDate).format('DD/MM/YYYY HH:mm')}</strong> theo công thức:{' '}
              <em>{scoringRule.formula}</em>.
            </span>
          </div>
        )}

        {error ? (
          <StatePanel
            kind="error"
            title="Không tải được Game BK"
            description={error}
            extra={<Button onClick={() => void loadLeaderboard()}>Thử lại</Button>}
          />
        ) : !loading && rankedEntries.length === 0 ? (
          <StatePanel
            kind="empty"
            title="Chưa có dữ liệu thi đua"
            description="Không có hoạt động BK trong khoảng thời gian đang chọn."
          />
        ) : (
          <DataTable
            rowKey="bookerId"
            loading={loading}
            dataSource={rankedEntries}
            pagination={false}
            columnPriority={{
              rank: 'secondary',
              staff: 'primary',
              score: 'primary',
              calls: 'secondary',
              pickups: 'secondary',
              bookings: 'secondary',
              done: 'secondary',
            }}
            columns={[
              {
                title: '#',
                dataIndex: 'gameRank',
                key: 'rank',
                width: 64,
                render: (value) => <span className="tabular-nums font-semibold">{value}</span>,
              },
              {
                title: 'Telesales',
                dataIndex: 'displayName',
                key: 'staff',
                render: (name, record) => (
                  <div className="flex min-w-0 items-center gap-2">
                    <BkAvatar name={name || 'Booker'} src={record.avatar} size={32} />
                    <span className="truncate font-medium">{name || 'Chưa có tên'}</span>
                  </div>
                ),
              },
              {
                title: METRIC_LABEL[metric],
                dataIndex: 'gameScore',
                key: 'score',
                align: 'right',
                render: (value) => <span className="tabular-nums font-semibold">{value}</span>,
              },
              {
                title: 'Gọi',
                dataIndex: 'callCount',
                key: 'calls',
                align: 'right',
                render: (value) => <span className="tabular-nums">{value}</span>,
              },
              {
                title: 'Nghe máy',
                dataIndex: 'pickupCount',
                key: 'pickups',
                align: 'right',
                render: (value) => <span className="tabular-nums">{value}</span>,
              },
              {
                title: 'Booking',
                dataIndex: 'totalCreatedBookings',
                key: 'bookings',
                align: 'right',
                render: (value) => <span className="tabular-nums">{value}</span>,
              },
              {
                title: 'Done',
                dataIndex: 'doneBookings',
                key: 'done',
                align: 'right',
                render: (value) => <span className="tabular-nums">{value}</span>,
              },
            ]}
          />
        )}
      </DataSection>

      {/* MODAL: CREATE GAME */}
      <BkGameCreateModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={(newGame) => {
          void loadGames();
          setSelectedGameId(newGame.id);
        }}
      />

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
    </div>
  );
}
