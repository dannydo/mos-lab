'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, message, Tooltip, DatePicker, Dropdown } from 'antd';
import {
  Trophy,
  Maximize2,
  Minimize2,
  RotateCw,
  Settings,
  ArrowLeft,
  Loader2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Tv,
} from 'lucide-react';
import dayjs, { Dayjs } from 'dayjs';
import { TelesaleTargetOverview, TelesalePipelineStage } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { KpiOverviewCards } from './components/KpiOverviewCards';
import { DailyActionSchedule } from './components/DailyActionSchedule';
import { DataPipelineStages } from './components/DataPipelineStages';
import { CustomerPoolDrawer } from './components/CustomerPoolDrawer';
import { TargetConfigModal } from './components/TargetConfigModal';
import { PlanCloneModal } from './components/PlanCloneModal';
import { TelesaleTvMonitorFullscreen } from './components/TelesaleTvMonitorFullscreen';
import { calculateShiftPacing, calculateTvMonitorMetrics } from './utils/tv-monitor-pacing';
import { useTelesaleTvLiveCelebration } from './hooks/useTelesaleTvLiveCelebration';
import { TelesaleTvLiveCelebrationBanner } from './components/TelesaleTvLiveCelebrationBanner';

function TelesaleTargetContent() {
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
      if (months && months.length > 0) {
        setAvailableMonths(months);
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
        setOverview(data);
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

  // Ingest live events & check milestones whenever overview is updated
  useEffect(() => {
    if (!overview) return;
    if (overview.todayLiveEvents) {
      liveCelebration.ingestLiveEvents(overview.todayLiveEvents);
    }
    const pacing = calculateShiftPacing(new Date());
    const metrics = calculateTvMonitorMetrics(overview.teamDaily, pacing);
    liveCelebration.checkMilestones(
      overview.teamDaily.date,
      metrics.bookActual,
      metrics.doneActual
    );
  }, [overview, liveCelebration]);

  useEffect(() => {
    fetchOverview(selectedMonth);

    // Auto-refresh: 5s if in TV fullscreen mode, 8s in normal War Room mode for prompt celebration
    const pollInterval = tvModeOpen ? 5000 : 8000;
    const interval = setInterval(() => {
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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-amber-400">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
        <p className="mt-4 text-zinc-400 font-mono text-sm tracking-wider">
          Đang khởi tạo War Room Telesales Tháng {selectedMonth.split('-')[1]}/{selectedMonth.split('-')[0]}...
        </p>
      </div>
    );
  }

  const [yearStr, monthNumStr] = selectedMonth.split('-');

  return (
    <div
      className={`min-h-screen bg-zinc-950 text-zinc-100 ${
        isFullscreen ? 'p-4 sm:p-6' : 'p-3 sm:p-6 lg:p-8'
      } w-full space-y-6 antialiased`}
    >
      {/* 1. TOP HEADER BANNER (WINGS LASHES LUXURY THEME) */}
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/30 border border-amber-500/40 p-5 sm:p-7 shadow-2xl backdrop-blur-xl">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-amber-600/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Brand & Titles */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5">
            {/* Wing Logo Emblem */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 p-0.5 shadow-lg shadow-amber-500/20 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex flex-col items-center justify-center">
                <svg
                  className="w-10 h-10 text-amber-400"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest -mt-1">WINGS</span>
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-amber-400 text-xs font-serif tracking-[0.25em] uppercase font-bold">
                  WINGS LASHES
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-xs text-zinc-400 font-mono">WAR ROOM MONITOR</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-700/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REALTIME
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 font-serif tracking-tight m-0">
                KẾ HOẠCH TELESALE / BOOKING
              </h1>

              {/* Month Navigator Group */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mt-2">
                {/* Prev / Dropdown / Next */}
                <div className="inline-flex items-center gap-1 bg-black/60 border border-amber-500/40 rounded-2xl p-1 shadow-inner backdrop-blur-md">
                  <Button
                    type="text"
                    size="small"
                    icon={<ChevronLeft className="w-4 h-4 text-amber-400" />}
                    onClick={handlePrevMonth}
                    className="!text-amber-400 hover:!bg-amber-500/20 !rounded-xl !h-8 !w-8 !p-0 flex items-center justify-center"
                    title="Tháng trước"
                  />

                  {/* Month Display & Quick Dropdown */}
                  <Dropdown
                    menu={{
                      items: availableMonths.map((m) => ({
                        key: m,
                        label: (
                          <span
                            className={`font-mono text-xs flex items-center justify-between gap-4 ${
                              m === selectedMonth ? 'font-bold text-amber-400' : ''
                            }`}
                          >
                            <span>
                              Tháng {m.split('-')[1]}/{m.split('-')[0]}
                            </span>
                            {m === '2026-10' && (
                              <span className="text-[10px] text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800">Chuẩn</span>
                            )}
                            {m === selectedMonth && <span className="text-amber-400 text-xs">●</span>}
                          </span>
                        ),
                        onClick: () => handleMonthChange(m),
                      })),
                    }}
                    trigger={['click']}
                  >
                    <button
                      type="button"
                      className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-700/20 hover:from-amber-500/30 hover:to-amber-700/30 text-amber-300 border border-amber-500/30 text-xs sm:text-sm font-extrabold font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        THÁNG {monthNumStr}/{yearStr}
                      </span>
                      <span className="text-[10px] text-amber-400/80">▼</span>
                    </button>
                  </Dropdown>

                  <Button
                    type="text"
                    size="small"
                    icon={<ChevronRight className="w-4 h-4 text-amber-400" />}
                    onClick={handleNextMonth}
                    className="!text-amber-400 hover:!bg-amber-500/20 !rounded-xl !h-8 !w-8 !p-0 flex items-center justify-center"
                    title="Tháng sau"
                  />
                </div>

                {/* Calendar MonthPicker for Custom Choice */}
                <DatePicker
                  picker="month"
                  format="MM/YYYY"
                  value={dayjs(`${selectedMonth}-01`)}
                  onChange={(d: Dayjs | null) => d && d.isValid() && handleMonthChange(d.format('YYYY-MM'))}
                  allowClear={false}
                  className="!h-8 !rounded-xl !bg-zinc-900/80 !border-zinc-700 hover:!border-amber-500/40 !text-zinc-200 !text-xs font-mono w-28 text-center"
                  placeholder="Chọn tháng"
                />

                <span className="text-zinc-600 hidden md:inline">•</span>
                <span className="text-xs text-zinc-300 font-medium tracking-wide hidden sm:inline">
                  TEAMWORK · MORE BOOK · MORE DONE · GROW TOGETHER
                </span>
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Link href="/dashboard/bk">
              <Button
                icon={<ArrowLeft className="w-3.5 h-3.5" />}
                className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700 text-xs rounded-xl flex items-center"
              >
                Về BK Leaderboard
              </Button>
            </Link>

            {/* Clone Plan Button */}
            <Tooltip title="Sao chép toàn bộ chỉ tiêu kế hoạch sang tháng mới">
              <Button
                icon={<Copy className="w-3.5 h-3.5" />}
                onClick={() => setCloneModalOpen(true)}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 text-xs rounded-xl font-medium flex items-center gap-1.5 shadow-sm"
              >
                Sao chép Kế hoạch
              </Button>
            </Tooltip>

            <Tooltip title="Cài đặt chỉ tiêu Done của 4 nhóm khách hàng và KPI Team">
              <Button
                icon={<Settings className="w-3.5 h-3.5" />}
                onClick={() => setConfigModalOpen(true)}
                className="bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-500/40 text-xs rounded-xl font-medium flex items-center"
              >
                Cài Đặt KPI
              </Button>
            </Tooltip>

            <Tooltip title="Cập nhật số liệu tức thì">
              <Button
                icon={<RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
                onClick={() => fetchOverview(selectedMonth, false)}
                className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700 text-xs rounded-xl flex items-center"
              >
                Làm mới
              </Button>
            </Tooltip>

            <Tooltip title="Mở Chế độ TV Monitor toàn màn hình cho phòng Telesales">
              <Button
                type="primary"
                icon={<Tv className="w-3.5 h-3.5" />}
                onClick={() => setTvModeOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold border-0 text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
              >
                TV Monitor
              </Button>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Real-time Voice & Visual Celebration Banner (MOS-FEAT-83) */}
      <TelesaleTvLiveCelebrationBanner
        celebration={liveCelebration.activeCelebration}
        isSpeaking={liveCelebration.isSpeaking}
      />

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

      {/* 2. ROW 1: KPI OVERVIEW CARDS (Team Month, Daily, Staff) */}
      {overview && (
        <KpiOverviewCards overview={overview} onOpenTvFullscreen={() => setTvModeOpen(true)} />
      )}

      {/* 3. ROW 2: ACTION & SCHEDULE (LEFT) + DATA PIPELINE STAGES (RIGHT) */}
      {overview && (
        <div className="grid grid-cols-1 lg:grid-cols-12 2xl:grid-cols-12 gap-6 w-full">
          {/* Left Column (4 cols on lg, 3 cols on 2xl) */}
          <div className="lg:col-span-4 2xl:col-span-3 space-y-4">
            <DailyActionSchedule overview={overview} />
          </div>

          {/* Right Column (8 cols on lg, 9 cols on 2xl) */}
          <div className="lg:col-span-8 2xl:col-span-9">
            <DataPipelineStages stages={overview.pipelineStages} onSelectStage={handleStageSelect} />
          </div>
        </div>
      )}

      {/* 4. SIDE DRAWER: CUSTOMER POOL DETAILS & 1-CLICK CALL */}
      <CustomerPoolDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        stage={selectedStage}
        currentUserRole="admin"
        staffList={overview?.staffTargets || []}
      />

      {/* 5. MODAL: KPI TARGET CONFIGURATION */}
      <TargetConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        overview={overview}
        onSuccess={() => fetchOverview(selectedMonth, false)}
      />

      {/* 6. MODAL: PLAN CLONE (ANY MONTH) */}
      <PlanCloneModal
        open={cloneModalOpen}
        onClose={() => setCloneModalOpen(false)}
        currentMonth={selectedMonth}
        availableMonths={availableMonths}
        overview={overview}
        onSuccess={handleCloneSuccess}
      />

      {/* 7. DEDICATED FULLSCREEN TV MONITOR VIEW (MOS-BUG-71) */}
      {overview && (
        <TelesaleTvMonitorFullscreen
          overview={overview}
          open={tvModeOpen}
          onClose={() => setTvModeOpen(false)}
          onRefresh={() => fetchOverview(selectedMonth, false)}
          refreshing={refreshing}
          liveCelebration={liveCelebration}
        />
      )}
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
