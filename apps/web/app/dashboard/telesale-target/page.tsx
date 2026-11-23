'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, message } from 'antd';
import dayjs from 'dayjs';
import { Loader2, RotateCw } from 'lucide-react';
import type { TelesalePipelineStage, TelesaleTargetOverview } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { useTheme } from '../../../context/ThemeContext';
import { DailyActionSchedule } from './components/DailyActionSchedule';
import { DataPipelineStages } from './components/DataPipelineStages';
import { KpiStaffLeaderboardCard, KpiTeamMonthCard } from './components/KpiOverviewCards';
import { TelesaleTargetHeader } from './components/TelesaleTargetHeader';
import { TelesaleTargetOverlays } from './components/TelesaleTargetOverlays';
import { TelesaleTodayTvMonitorCard } from './components/TelesaleTodayTvMonitorCard';
import { TelesaleTvLiveCelebrationBanner } from './components/TelesaleTvLiveCelebrationBanner';
import { useTelesaleTvLiveCelebration } from './hooks/useTelesaleTvLiveCelebration';
import { calculateShiftPacing, calculateTvMonitorMetrics } from './utils/tv-monitor-pacing';

function TelesaleTargetContent() {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const router = useRouter();
  const searchParams = useSearchParams();
  const urlMonth = searchParams?.get('month') || '2026-10';
  const urlMode = searchParams?.get('mode');

  const [selectedMonth, setSelectedMonth] = useState<string>(urlMonth);
  const [availableMonths, setAvailableMonths] = useState<string[]>(['2026-10']);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [overview, setOverview] = useState<TelesaleTargetOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [tvModeOpen, setTvModeOpen] = useState<boolean>(urlMode === 'tv');

  // Drawer & Modal state
  const [selectedStage, setSelectedStage] = useState<TelesalePipelineStage | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);
  const [cloneModalOpen, setCloneModalOpen] = useState<boolean>(false);
  const [teamSelectModalOpen, setTeamSelectModalOpen] = useState<boolean>(false);
  const [quotesDrawerOpen, setQuotesDrawerOpen] = useState<boolean>(false);

  // Synchronize with URL query parameter
  useEffect(() => {
    if (urlMonth && urlMonth !== selectedMonth && /^\d{4}-\d{2}$/.test(urlMonth)) {
      setSelectedMonth(urlMonth);
    }
  }, [urlMonth, selectedMonth]);

  useEffect(() => {
    if (urlMode === 'tv') {
      setTvModeOpen(true);
    }
  }, [urlMode]);

  // Load configured months
  const loadAvailableMonths = useCallback(async () => {
    try {
      const months = await apiClient.telesaleTarget.getMonths();
      if (Array.isArray(months) && months.length > 0) {
        setAvailableMonths(months.filter((m) => typeof m === 'string' && m.includes('-')));
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadAvailableMonths();
  }, [loadAvailableMonths]);

  // Fetch overview data for month
  const fetchOverview = useCallback(
    async (monthToFetch = selectedMonth, isSilent = false) => {
      if (!isSilent) setRefreshing(true);
      try {
        const data = await apiClient.telesaleTarget.getOverview(monthToFetch);
        setOverview((prev) => {
          try {
            return prev && JSON.stringify(prev) === JSON.stringify(data) ? prev : data;
          } catch {
            return data;
          }
        });
        setError(null);
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string; error?: string } }; message?: string })?.response?.data
            ?.message ||
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          (err as { message?: string })?.message ||
          `Không thể tải dữ liệu mục tiêu Telesales Tháng ${monthToFetch}`;
        setError(msg);
        if (!isSilent) {
          message.error(msg);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedMonth]
  );

  // Live Voice Celebration hook active on page level (MOS-FEAT-83)
  const liveCelebration = useTelesaleTvLiveCelebration();
  const { ingestLiveEvents, checkMilestones } = liveCelebration;

  // Ingest live events & check milestones whenever overview is updated
  useEffect(() => {
    if (!overview) return;
    if (overview.todayLiveEvents) {
      ingestLiveEvents(overview.todayLiveEvents);
    }
    const pacing = calculateShiftPacing(new Date());
    const metrics = calculateTvMonitorMetrics(overview.teamDaily, pacing);
    checkMilestones(overview.teamDaily.date, metrics.bookActual, metrics.doneActual, metrics.checkinActual);
  }, [overview, ingestLiveEvents, checkMilestones]);

  useEffect(() => {
    fetchOverview(selectedMonth);

    // Auto-refresh: 5s if in TV fullscreen mode, 8s in normal War Room mode for prompt celebration
    const pollInterval = tvModeOpen ? 5000 : 8000;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchOverview(selectedMonth, true);
    }, pollInterval);

    // Immediate refresh when tab/window gains visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchOverview(selectedMonth, true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchOverview, selectedMonth, tvModeOpen]);

  const handleMonthChange = (newMonth: string) => {
    if (!/^\d{4}-\d{2}$/.test(newMonth)) return;
    setSelectedMonth(newMonth);
    router.push(`/dashboard/telesale-target?month=${newMonth}`);
  };

  const handlePrevMonth = () => {
    const d = dayjs(`${selectedMonth}-01`).subtract(1, 'month');
    handleMonthChange(d.format('YYYY-MM'));
  };

  const handleNextMonth = () => {
    const d = dayjs(`${selectedMonth}-01`).add(1, 'month');
    handleMonthChange(d.format('YYYY-MM'));
  };

  const handleCloneSuccess = (clonedMonth: string) => {
    loadAvailableMonths();
    handleMonthChange(clonedMonth);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  const handleStageSelect = (stage: TelesalePipelineStage) => {
    setSelectedStage(stage);
    setDrawerOpen(true);
  };

  if (loading && !overview) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center ${
          isDark ? 'bg-zinc-950 text-amber-400' : 'bg-slate-50 text-amber-600'
        }`}
      >
        <Loader2 className={`w-10 h-10 animate-spin ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
        <p className={`mt-4 font-mono text-sm tracking-wider ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
          Đang khởi tạo War Room Telesales Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}...
        </p>
      </div>
    );
  }

  const [yearStr, monthNumStr] = selectedMonth.split('-');

  return (
    <div
      className={`min-h-screen xl:h-screen xl:max-h-[1080px] xl:overflow-hidden ${
        isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-slate-50 text-slate-800'
      } ${isFullscreen ? 'p-2 sm:p-3' : 'p-2.5 sm:p-3'} w-full flex flex-col justify-between space-y-2 antialiased`}
    >
      {/* 1. COMPACT TOP HEADER BAR */}
      <TelesaleTargetHeader
        isDark={isDark}
        selectedMonth={selectedMonth}
        availableMonths={availableMonths}
        teamName={overview?.teamName}
        refreshing={refreshing}
        isFullscreen={isFullscreen}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        onMonthChange={handleMonthChange}
        onOpenTeamSelectModal={() => setTeamSelectModalOpen(true)}
        onOpenCloneModal={() => setCloneModalOpen(true)}
        onOpenConfigModal={() => setConfigModalOpen(true)}
        onOpenQuotesDrawer={() => setQuotesDrawerOpen(true)}
        onRefresh={() => {
          void fetchOverview(selectedMonth, false);
        }}
        onOpenTvMode={() => setTvModeOpen(true)}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Real-time Voice & Visual Celebration Overlay */}
      {!tvModeOpen && (
        <TelesaleTvLiveCelebrationBanner
          celebration={liveCelebration.activeCelebration}
          isSpeaking={liveCelebration.isSpeaking}
          isFadingOut={liveCelebration.isFadingOut}
          fireworksEnabled={liveCelebration.settings.fireworksEnabled}
        />
      )}

      {/* Fallback / Error State if overview is null and not loading */}
      {!overview && !loading && (
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-zinc-950 p-8 text-center backdrop-blur-xl shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-900/30 text-amber-400 shadow-lg shadow-amber-500/10">
            <RotateCw className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-zinc-100">
            Chưa thể hiển thị dữ liệu War Room Telesales Tháng {monthNumStr}/{yearStr}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            {error ||
              'Máy chủ API vừa khởi động lại hoặc đường truyền mạng chập chờn. Anh vui lòng bấm Thử lại để tải dữ liệu realtime.'}
          </p>
          <Button
            type="primary"
            onClick={() => fetchOverview(selectedMonth, false)}
            loading={refreshing}
            icon={<RotateCw className="w-4 h-4" />}
            className="mt-5 rounded-xl border-0 bg-amber-500 font-semibold text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20 px-6 py-2 h-auto flex items-center gap-2 mx-auto"
          >
            Thử lại ngay
          </Button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. ZERO-SCROLL BODY (3-COLUMN EXECUTIVE MATRIX)              */}
      {/* ============================================================ */}
      {overview && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-hidden min-h-0">
          {/* CỘT 1 (33% Width = col-span-4): VĨ MÔ & NGUỒN DATA CHU KỲ */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-3 h-full overflow-hidden">
            {/* Box 1: KPI Team Tháng X (Top 53%) */}
            <div className="h-[53%] overflow-hidden">
              <KpiTeamMonthCard overview={overview} />
            </div>

            {/* Box 5: 4 Phễu Data Pipeline (Bottom 45%) */}
            <div className="h-[45%] overflow-hidden">
              <DataPipelineStages stages={overview.pipelineStages} onSelectStage={handleStageSelect} />
            </div>
          </div>

          {/* CỘT 2 (42% Width = col-span-5): CHIẾN TRƯỜNG & TÁC CHIẾN HÔM NAY */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-3 h-full overflow-hidden">
            {/* Box 2: TV Monitor Hôm Nay (Top 51%) */}
            <div className="h-[51%] overflow-hidden">
              <TelesaleTodayTvMonitorCard
                overview={overview}
                isTvOpen={tvModeOpen}
                onOpenFullscreen={() => setTvModeOpen(true)}
                liveCelebration={liveCelebration}
              />
            </div>

            {/* Box 4: Hành Động Mỗi Ngày (Bottom 47%) */}
            <div className="h-[47%] overflow-hidden">
              <DailyActionSchedule
                overview={overview}
                isTvOpen={tvModeOpen}
                fireworksEnabled={liveCelebration.settings.fireworksEnabled}
                soundEnabled={liveCelebration.settings.soundEnabled}
                volume={liveCelebration.settings.volume}
              />
            </div>
          </div>

          {/* CỘT 3 (25% Width = col-span-3): LEADERBOARD 5 CHUYÊN VIÊN TELESALES */}
          <div className="lg:col-span-3 h-full overflow-hidden">
            <KpiStaffLeaderboardCard overview={overview} isFullVertical={true} />
          </div>
        </div>
      )}

      <TelesaleTargetOverlays
        selectedMonth={selectedMonth}
        availableMonths={availableMonths}
        overview={overview}
        refreshing={refreshing}
        drawerOpen={drawerOpen}
        selectedStage={selectedStage}
        configModalOpen={configModalOpen}
        cloneModalOpen={cloneModalOpen}
        teamSelectModalOpen={teamSelectModalOpen}
        quotesDrawerOpen={quotesDrawerOpen}
        tvModeOpen={tvModeOpen}
        liveCelebration={liveCelebration}
        onCloseDrawer={() => setDrawerOpen(false)}
        onCloseConfigModal={() => setConfigModalOpen(false)}
        onCloseCloneModal={() => setCloneModalOpen(false)}
        onCloseTeamSelectModal={() => setTeamSelectModalOpen(false)}
        onCloseQuotesDrawer={() => setQuotesDrawerOpen(false)}
        onCloseTvMode={() => setTvModeOpen(false)}
        onCloneSuccess={handleCloneSuccess}
        onRefresh={async () => {
          await fetchOverview(selectedMonth, false);
        }}
      />
    </div>
  );
}

export default function TelesaleTargetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-amber-400">
          <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
          <p className="mt-4 text-zinc-400 font-mono text-sm tracking-wider">Đang tải War Room Telesales...</p>
        </div>
      }
    >
      <TelesaleTargetContent />
    </Suspense>
  );
}
