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
import { KpiTeamMonthCard, KpiStaffLeaderboardCard } from './components/KpiOverviewCards';
import { TelesaleTodayTvMonitorCard } from './components/TelesaleTodayTvMonitorCard';
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
import { useTheme } from '../../../context/ThemeContext';

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
      metrics.doneActual,
      metrics.checkinActual
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
      {/* 1. COMPACT TOP HEADER BAR (SLIM LUXURY THEME - ~46px) */}
      <header
        className={`relative overflow-hidden rounded-2xl px-3.5 py-1.5 backdrop-blur-xl shrink-0 transition-all ${
          isDark
            ? 'bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/30 border border-amber-500/40 shadow-xl'
            : 'bg-white/95 border border-slate-200/90 shadow-sm'
        }`}
      >
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2">
          {/* Brand & Titles */}
          <div className="flex items-center gap-3">
            {/* Wing Logo Emblem */}
            <div
              className={`w-8 h-8 rounded-xl p-0.5 shrink-0 flex items-center justify-center shadow-md ${
                isDark
                  ? 'bg-gradient-to-br from-amber-400 via-amber-600 to-amber-800 shadow-amber-500/20'
                  : 'bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/10'
              }`}
            >
              <div
                className={`w-full h-full rounded-[10px] flex items-center justify-center ${
                  isDark ? 'bg-zinc-950' : 'bg-white'
                }`}
              >
                <span className={`text-[10px] font-black font-mono ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                  W
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-mono font-bold uppercase tracking-wider hidden sm:inline ${
                  isDark ? 'text-amber-400' : 'text-amber-800'
                }`}
              >
                WAR ROOM TELESALES
              </span>
              <span className={`hidden sm:inline ${isDark ? 'text-zinc-600' : 'text-slate-300'}`}>•</span>
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-mono border ${
                  isDark
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                REALTIME
              </span>
            </div>

            {/* Month Navigator Group */}
            <div
              className={`inline-flex items-center gap-0.5 rounded-xl p-0.5 shadow-inner border ${
                isDark ? 'bg-black/60 border-amber-500/40' : 'bg-slate-100 border-slate-200'
              }`}
            >
              <Button
                type="text"
                size="small"
                icon={<ChevronLeft className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-slate-600'}`} />}
                onClick={handlePrevMonth}
                className={`!rounded-lg !h-6 !w-6 !p-0 flex items-center justify-center ${
                  isDark ? '!text-amber-400 hover:!bg-amber-500/20' : '!text-slate-600 hover:!bg-slate-200'
                }`}
                title="Tháng trước"
              />

              <Dropdown
                menu={{
                  items: availableMonths.map((m) => ({
                    key: m,
                    label: (
                      <span
                        className={`font-mono text-xs flex items-center justify-between gap-4 ${
                          m === selectedMonth ? 'font-bold text-amber-500' : ''
                        }`}
                      >
                        <span>
                          Tháng {m.split('-')[1]}/{m.split('-')[0]}
                        </span>
                        {m === '2026-10' && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              isDark ? 'text-zinc-400 bg-zinc-800' : 'text-slate-500 bg-slate-100'
                            }`}
                          >
                            Chuẩn
                          </span>
                        )}
                        {m === selectedMonth && <span className="text-amber-500 text-xs">●</span>}
                      </span>
                    ),
                    onClick: () => handleMonthChange(m),
                  })),
                }}
                trigger={['click']}
              >
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded-lg border text-xs font-bold font-mono flex items-center gap-1 transition-all cursor-pointer ${
                    isDark
                      ? 'bg-gradient-to-r from-amber-500/20 to-amber-700/20 hover:from-amber-500/30 hover:to-amber-700/30 text-amber-300 border-amber-500/30'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
                  }`}
                >
                  <Calendar className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <span>
                    T{monthNumStr}/{yearStr}
                  </span>
                  <span className={`text-[9px] ${isDark ? 'text-amber-400/80' : 'text-slate-400'}`}>▼</span>
                </button>
              </Dropdown>

              <Button
                type="text"
                size="small"
                icon={<ChevronRight className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-slate-600'}`} />}
                onClick={handleNextMonth}
                className={`!rounded-lg !h-6 !w-6 !p-0 flex items-center justify-center ${
                  isDark ? '!text-amber-400 hover:!bg-amber-500/20' : '!text-slate-600 hover:!bg-slate-200'
                }`}
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
              className={`!h-6 !rounded-lg !text-[11px] font-mono w-24 text-center hidden md:inline-flex ${
                isDark
                  ? '!bg-zinc-900/80 !border-zinc-700 hover:!border-amber-500/40 !text-zinc-200'
                  : '!bg-white !border-slate-200 hover:!border-amber-400 !text-slate-700 shadow-2xs'
              }`}
              placeholder="Chọn tháng"
            />
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 1. Quay về BK */}
            <Tooltip title="Quay về trang Quản lý BK">
              <Link href="/dashboard/bk">
                <button
                  type="button"
                  aria-label="Về BK"
                  className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                    isDark
                      ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                      : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-2xs'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="sr-only">Về BK</span>
                </button>
              </Link>
            </Tooltip>

            {/* 2. Bộ chọn Đội nhóm (Team Selector) */}
            <Tooltip title="Chọn Đội nhóm áp dụng làm nguồn nhân sự cho War Room">
              <button
                type="button"
                aria-label={`Team: ${overview?.teamName || 'Telesales'}`}
                onClick={() => setTeamSelectModalOpen(true)}
                className={`h-7 px-2.5 rounded-lg border text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-amber-500/40 text-zinc-300 hover:text-amber-300'
                    : 'border-slate-200 bg-white hover:bg-slate-100 hover:border-amber-400 text-slate-700 hover:text-amber-800 shadow-2xs'
                }`}
              >
                <Users className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
                  Team:{' '}
                  <strong className={`font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    {overview?.teamName || 'Telesales'}
                  </strong>
                </span>
              </button>
            </Tooltip>

            <span className={`w-px h-4 shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />

            {/* 3. Sao chép chỉ tiêu */}
            <Tooltip title="Sao chép toàn bộ chỉ tiêu kế hoạch sang tháng mới">
              <button
                type="button"
                aria-label="Sao chép"
                onClick={() => setCloneModalOpen(true)}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-amber-500/40 text-zinc-400 hover:text-amber-300'
                    : 'border-slate-200 bg-white hover:bg-slate-100 hover:border-amber-400 text-slate-600 hover:text-amber-800 shadow-2xs'
                }`}
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="sr-only">Sao chép</span>
              </button>
            </Tooltip>

            {/* 4. Cài đặt KPI */}
            <Tooltip title="Cài đặt chỉ tiêu Done của 4 nhóm khách hàng và KPI Team">
              <button
                type="button"
                aria-label="Cài đặt KPI"
                onClick={() => setConfigModalOpen(true)}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 hover:border-amber-500/40 text-zinc-400 hover:text-amber-300'
                    : 'border-slate-200 bg-white hover:bg-slate-100 hover:border-amber-400 text-slate-600 hover:text-amber-800 shadow-2xs'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="sr-only">Cài Đặt KPI</span>
              </button>
            </Tooltip>

            {/* 5. Cập nhật số liệu tức thì (Refresh) */}
            <Tooltip title="Cập nhật số liệu tức thì">
              <button
                type="button"
                aria-label="Làm mới"
                onClick={() => fetchOverview(selectedMonth, false)}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-2xs'
                }`}
              >
                <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />
                <span className="sr-only">Làm mới</span>
              </button>
            </Tooltip>

            <span className={`w-px h-4 shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-slate-200'}`} />

            {/* 6. TV Monitor Hero Button */}
            <Tooltip title="Mở Chế độ TV Monitor toàn màn hình cho phòng Telesales">
              <button
                type="button"
                aria-label="TV Monitor"
                onClick={() => setTvModeOpen(true)}
                className={`h-7 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  isDark
                    ? 'border-amber-500/40 bg-amber-500/15 hover:bg-amber-500/25 hover:border-amber-400 text-amber-300 hover:text-amber-200 shadow-sm shadow-amber-500/10'
                    : 'border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 text-amber-800 hover:text-amber-900 shadow-2xs'
                }`}
              >
                <Tv className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span className="text-[11px] font-bold">TV Monitor</span>
              </button>
            </Tooltip>

            {/* 7. Toàn màn hình trình duyệt */}
            <Tooltip title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình'}>
              <button
                type="button"
                aria-label={isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}
                onClick={toggleFullscreen}
                className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                  isDark
                    ? 'border-zinc-800 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                    : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 shadow-2xs'
                }`}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                <span className="sr-only">{isFullscreen ? 'Thu nhỏ' : 'Toàn màn hình'}</span>
              </button>
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
            {/* Box 2: TV Monitor Hôm Nay (Top 42%) */}
            <div className="h-[42%] overflow-hidden">
              <TelesaleTodayTvMonitorCard
                overview={overview}
                isTvOpen={tvModeOpen}
                onOpenFullscreen={() => setTvModeOpen(true)}
                liveCelebration={liveCelebration}
              />
            </div>

            {/* Box 4: Hành Động Mỗi Ngày (Bottom 56%) */}
            <div className="h-[56%] overflow-hidden">
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
