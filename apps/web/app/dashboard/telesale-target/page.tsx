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
  Users,
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
import { TeamSelectModal } from './components/TeamSelectModal';
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
  const [teamSelectModalOpen, setTeamSelectModalOpen] = useState<boolean>(false);

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
    liveCelebration.checkMilestones(overview.teamDaily.date, metrics.bookActual, metrics.doneActual);
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
      className={`min-h-screen xl:h-screen xl:max-h-[1080px] xl:overflow-hidden bg-zinc-950 text-zinc-100 ${
        isFullscreen ? 'p-2 sm:p-3' : 'p-2.5 sm:p-3'
      } w-full flex flex-col justify-between space-y-2 antialiased`}
    >
      {/* 1. COMPACT TOP HEADER BAR (SLIM LUXURY THEME - ~46px) */}
      <header className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/30 border border-amber-500/40 px-3.5 py-1.5 shadow-xl backdrop-blur-xl shrink-0">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          {/* Brand & Titles */}
          <div className="flex items-center gap-3">
            {/* Wing Logo Emblem */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 p-0.5 shadow-md shadow-amber-500/20 shrink-0 flex items-center justify-center">
              <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                <span className="text-[10px] font-black text-amber-400 font-mono">W</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-xs font-mono font-bold uppercase tracking-wider hidden sm:inline">
                WAR ROOM TELESALES
              </span>
              <span className="text-zinc-600 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-700/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                REALTIME
              </span>
            </div>

            {/* Month Navigator Group */}
            <div className="inline-flex items-center gap-0.5 bg-black/60 border border-amber-500/40 rounded-xl p-0.5 shadow-inner">
              <Button
                type="text"
                size="small"
                icon={<ChevronLeft className="w-3.5 h-3.5 text-amber-400" />}
                onClick={handlePrevMonth}
                className="!text-amber-400 hover:!bg-amber-500/20 !rounded-lg !h-6 !w-6 !p-0 flex items-center justify-center"
                title="Tháng trước"
              />

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
                  className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-700/20 hover:from-amber-500/30 hover:to-amber-700/30 text-amber-300 border border-amber-500/30 text-xs font-bold font-mono flex items-center gap-1 transition-all cursor-pointer"
                >
                  <Calendar className="w-3 h-3 text-amber-400" />
                  <span>
                    T{monthNumStr}/{yearStr}
                  </span>
                  <span className="text-[9px] text-amber-400/80">▼</span>
                </button>
              </Dropdown>

              <Button
                type="text"
                size="small"
                icon={<ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
                onClick={handleNextMonth}
                className="!text-amber-400 hover:!bg-amber-500/20 !rounded-lg !h-6 !w-6 !p-0 flex items-center justify-center"
                title="Tháng sau"
              />
            </div>

            {/* Calendar MonthPicker */}
            <DatePicker
              picker="month"
              format="MM/YYYY"
              value={dayjs(`${selectedMonth}-01`)}
              onChange={(d: Dayjs | null) => d && d.isValid() && handleMonthChange(d.format('YYYY-MM'))}
              allowClear={false}
              className="!h-6 !rounded-lg !bg-zinc-900/80 !border-zinc-700 hover:!border-amber-500/40 !text-zinc-200 !text-[11px] font-mono w-24 text-center hidden md:inline-flex"
              placeholder="Chọn tháng"
            />
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5">
            <Link href="/dashboard/bk">
              <Button
                size="small"
                icon={<ArrowLeft className="w-3 h-3" />}
                className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700 text-xs h-7 px-2 rounded-lg flex items-center"
              >
                <span className="hidden sm:inline text-[11px]">Về BK</span>
              </Button>
            </Link>

            <Tooltip title="Sao chép toàn bộ chỉ tiêu kế hoạch sang tháng mới">
              <Button
                size="small"
                icon={<Copy className="w-3 h-3" />}
                onClick={() => setCloneModalOpen(true)}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 text-xs h-7 px-2 rounded-lg font-medium flex items-center gap-1 shadow-sm"
              >
                <span className="hidden md:inline text-[11px]">Sao chép</span>
              </Button>
            </Tooltip>

            <Tooltip title="Cài đặt chỉ tiêu Done của 4 nhóm khách hàng và KPI Team">
              <Button
                size="small"
                icon={<Settings className="w-3 h-3" />}
                onClick={() => setConfigModalOpen(true)}
                className="bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-500/40 text-xs h-7 px-2 rounded-lg font-medium flex items-center"
              >
                <span className="hidden md:inline text-[11px]">Cài Đặt KPI</span>
              </Button>
            </Tooltip>

            <Tooltip title="Chọn Đội nhóm áp dụng làm nguồn nhân sự cho War Room">
              <Button
                size="small"
                icon={<Users className="w-3 h-3" />}
                onClick={() => setTeamSelectModalOpen(true)}
                className="bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-500/40 text-xs h-7 px-2 rounded-lg font-medium flex items-center gap-1 shadow-sm"
              >
                <span className="text-[11px]">Team: {overview?.teamName || 'Telesales'}</span>
              </Button>
            </Tooltip>

            <Tooltip title="Cập nhật số liệu tức thì">
              <Button
                size="small"
                icon={<RotateCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />}
                onClick={() => fetchOverview(selectedMonth, false)}
                className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700 text-xs h-7 px-2 rounded-lg flex items-center"
              >
                <span className="hidden sm:inline text-[11px]">Làm mới</span>
              </Button>
            </Tooltip>

            <Tooltip title="Mở Chế độ TV Monitor toàn màn hình cho phòng Telesales">
              <Button
                type="primary"
                size="small"
                icon={<Tv className="w-3 h-3" />}
                onClick={() => setTvModeOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold border-0 text-xs h-7 px-2.5 rounded-lg shadow-md shadow-amber-500/20 flex items-center gap-1"
              >
                <span className="text-[11px]">TV Monitor</span>
              </Button>
            </Tooltip>

            <Tooltip title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}>
              <Button
                size="small"
                icon={isFullscreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                onClick={toggleFullscreen}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700 h-7 w-7 !p-0 rounded-lg flex items-center justify-center"
              />
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Real-time Voice & Visual Celebration Overlay */}
      {!tvModeOpen && (
        <TelesaleTvLiveCelebrationBanner
          celebration={liveCelebration.activeCelebration}
          isSpeaking={liveCelebration.isSpeaking}
          isFadingOut={liveCelebration.isFadingOut}
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
      {/* 2. ZERO-SCROLL BODY (ROW 1: 54% | ROW 2: 42%)                */}
      {/* ============================================================ */}
      {overview && (
        <div className="flex-1 flex flex-col justify-between gap-2.5 overflow-hidden">
          {/* ROW 1: 3 KPI OVERVIEW CARDS (54% Height) */}
          <div className="xl:h-[54%] w-full overflow-hidden">
            <KpiOverviewCards overview={overview} onOpenTvFullscreen={() => setTvModeOpen(true)} />
          </div>

          {/* ROW 2: ACTION SCHEDULE 33% + DATA PIPELINE STAGES 67% (42% Height) */}
          <div className="xl:h-[42%] grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch overflow-hidden">
            {/* Left Column (4 cols = 33%): HÀNH ĐỘNG MỖI NGÀY - UPGRADE 1A */}
            <div className="lg:col-span-4 h-full overflow-hidden">
              <DailyActionSchedule overview={overview} />
            </div>

            {/* Right Column (8 cols = 67%): 4 PHỄU DATA PIPELINE KHÁCH HÀNG */}
            <div className="lg:col-span-8 h-full overflow-hidden">
              <DataPipelineStages stages={overview.pipelineStages} onSelectStage={handleStageSelect} />
            </div>
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
        onSuccess={async () => {
          await fetchOverview(selectedMonth, false);
        }}
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

      {/* 7. MODAL: SELECT TEAM (MOS-BUG-93) */}
      <TeamSelectModal
        open={teamSelectModalOpen}
        onClose={() => setTeamSelectModalOpen(false)}
        currentMonth={selectedMonth}
        overview={overview}
        onSuccess={async () => {
          await fetchOverview(selectedMonth, false);
        }}
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
