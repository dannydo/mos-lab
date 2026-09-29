'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button, message, Tooltip } from 'antd';
import { Trophy, Maximize2, Minimize2, RotateCw, Settings, ArrowLeft, Loader2 } from 'lucide-react';
import { TelesaleTargetOverview, TelesalePipelineStage } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { KpiOverviewCards } from './components/KpiOverviewCards';
import { DailyActionSchedule } from './components/DailyActionSchedule';
import { DataPipelineStages } from './components/DataPipelineStages';
import { CustomerPoolDrawer } from './components/CustomerPoolDrawer';
import { TargetConfigModal } from './components/TargetConfigModal';

export default function TelesaleTargetPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [overview, setOverview] = useState<TelesaleTargetOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Drawer & Modal state
  const [selectedStage, setSelectedStage] = useState<TelesalePipelineStage | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);

  const fetchOverview = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const data = await apiClient.telesaleTarget.getOverview('2026-10');
      setOverview(data);
      setError(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as { message?: string })?.message ||
        'Không thể tải dữ liệu mục tiêu Telesales Tháng 10';
      setError(msg);
      if (!isSilent) {
        message.error('Không thể tải dữ liệu mục tiêu Telesales Tháng 10');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchOverview(true);
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchOverview]);

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
          Đang khởi tạo War Room Telesales Tháng 10...
        </p>
      </div>
    );
  }

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
                  strokeWidth="1.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253"
                  />
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

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3 mt-1.5">
                <span className="text-sm sm:text-base font-bold text-amber-300 font-mono">THÁNG 10/2026</span>
                <span className="text-zinc-600 hidden sm:inline">•</span>
                <span className="text-xs text-zinc-300 font-medium tracking-wide">
                  TEAMWORK · MORE BOOK · MORE DONE · GROW TOGETHER
                </span>
              </div>

              <div className="text-[11px] text-zinc-400 mt-1 italic hidden md:block">
                GOOD CALL • GOOD BOOK • HAPPY CLIENT • RẤT WINGS
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
                onClick={() => fetchOverview(false)}
                className="bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700 text-xs rounded-xl flex items-center"
              >
                Làm mới
              </Button>
            </Tooltip>

            <Tooltip title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Mở toàn màn hình TV Monitor'}>
              <Button
                type="primary"
                icon={isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                onClick={toggleFullscreen}
                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold border-0 text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center"
              >
                {isFullscreen ? 'Thu nhỏ' : 'TV Monitor'}
              </Button>
            </Tooltip>
          </div>
        </div>
      </header>

      {/* Fallback / Error State if overview is null and not loading */}
      {!overview && !loading && (
        <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 to-zinc-950 p-8 text-center backdrop-blur-xl shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-amber-900/30 text-amber-400 shadow-lg shadow-amber-500/10">
            <RotateCw className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-zinc-100">Chưa thể hiển thị dữ liệu War Room Telesales</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            {error ||
              'Máy chủ API vừa khởi động lại hoặc đường truyền mạng chập chờn. Anh vui lòng bấm Thử lại để tải dữ liệu realtime.'}
          </p>
          <Button
            type="primary"
            onClick={() => fetchOverview(false)}
            loading={refreshing}
            icon={<RotateCw className="w-4 h-4" />}
            className="mt-5 rounded-xl border-0 bg-amber-500 font-semibold text-black hover:bg-amber-400 shadow-lg shadow-amber-500/20 px-6 py-2 h-auto flex items-center gap-2 mx-auto"
          >
            Thử lại ngay
          </Button>
        </div>
      )}

      {/* 2. ROW 1: KPI OVERVIEW CARDS (Team Month, Daily, Staff) */}
      {overview && <KpiOverviewCards overview={overview} />}

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
      />

      {/* 5. MODAL: KPI TARGET CONFIGURATION */}
      <TargetConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        overview={overview}
        onSuccess={() => fetchOverview(false)}
      />
    </div>
  );
}
