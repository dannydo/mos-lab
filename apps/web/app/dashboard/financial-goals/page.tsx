'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, message, Tooltip, Dropdown } from 'antd';
import {
  Target,
  RotateCw,
  Settings,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import dayjs from 'dayjs';
import { FinancialGoalsOverview } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { ToolbarToggle } from '../../../components/ui';
import { FinancialGoalOverviewCards } from './components/FinancialGoalOverviewCards';
import { FinancialGoalDailyTable } from './components/FinancialGoalDailyTable';
import { FinancialGoalConfigModal } from './components/FinancialGoalConfigModal';
import { useTheme } from '../../../context/ThemeContext';

function FinancialGoalsContent() {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const router = useRouter();
  const searchParams = useSearchParams();

  // Default to current VN month or 2026-11
  const defaultMonth = dayjs().format('YYYY-MM');
  const urlMonth = searchParams?.get('month') || (defaultMonth === '2026-10' ? '2026-11' : defaultMonth);

  const [selectedMonth, setSelectedMonth] = useState<string>(urlMonth);
  const [availableMonths, setAvailableMonths] = useState<string[]>(['2026-11', '2026-10']);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [overview, setOverview] = useState<FinancialGoalsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);

  // Include VAT state (Default: true, synced with localStorage and URL query)
  const [includeVat, setIncludeVat] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const vatParam = urlParams.get('vat') || urlParams.get('includeVat');
      if (vatParam !== null) {
        return vatParam !== 'false' && vatParam !== '0';
      }
      const saved = localStorage.getItem('financial_goals_include_vat');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  // Sync with URL query parameter
  useEffect(() => {
    if (urlMonth && urlMonth !== selectedMonth && /^\d{4}-\d{2}$/.test(urlMonth)) {
      setSelectedMonth(urlMonth);
    }
  }, [urlMonth, selectedMonth]);

  // Load configured months list
  const loadAvailableMonths = useCallback(async () => {
    try {
      const months = await apiClient.financialGoals.getMonths();
      if (Array.isArray(months) && months.length > 0) {
        setAvailableMonths(months.filter((m) => typeof m === 'string' && m.includes('-')));
      }
    } catch {
      // Fallback window
    }
  }, []);

  useEffect(() => {
    loadAvailableMonths();
  }, [loadAvailableMonths]);

  // Fetch overview data for month and VAT state
  const fetchOverview = useCallback(
    async (monthToFetch = selectedMonth, isSilent = false, vatToFetch = includeVat) => {
      if (!isSilent) setRefreshing(true);
      try {
        const data = await apiClient.financialGoals.getOverview(monthToFetch, vatToFetch);
        setOverview(data);
        setError(null);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi tải dữ liệu mục tiêu tài chính';
        setError(msg);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedMonth, includeVat]
  );

  useEffect(() => {
    fetchOverview(selectedMonth, false, includeVat);
  }, [selectedMonth, includeVat, fetchOverview]);

  // VAT toggle handler
  const handleToggleVat = (checked: boolean) => {
    setIncludeVat(checked);
    if (typeof window !== 'undefined') {
      localStorage.setItem('financial_goals_include_vat', String(checked));
      const url = new URL(window.location.href);
      if (!checked) {
        url.searchParams.set('vat', 'false');
      } else {
        url.searchParams.delete('vat');
      }
      router.replace(url.pathname + url.search);
    }
  };

  // Month change navigation
  const handleMonthChange = (newMonth: string) => {
    if (!newMonth || newMonth === selectedMonth) return;
    setSelectedMonth(newMonth);
    const vatSuffix = !includeVat ? '&vat=false' : '';
    router.push(`/dashboard/financial-goals?month=${newMonth}${vatSuffix}`);
  };

  const handlePrevMonth = () => {
    const prev = dayjs(selectedMonth + '-01').subtract(1, 'month').format('YYYY-MM');
    handleMonthChange(prev);
  };

  const handleNextMonth = () => {
    const next = dayjs(selectedMonth + '-01').add(1, 'month').format('YYYY-MM');
    handleMonthChange(next);
  };

  const monthMenuItems = availableMonths.map((m) => {
    const parts = m.split('-');
    return {
      key: m,
      label: (
        <span className="font-mono flex items-center justify-between gap-4">
          <span>Tháng {parts[1]}/{parts[0]}</span>
          {m === selectedMonth && <span className="text-amber-500 font-bold">●</span>}
        </span>
      ),
      onClick: () => handleMonthChange(m),
    };
  });

  const [yearStr, monthNumStr] = selectedMonth.split('-');

  return (
    <div className="space-y-5 p-3 md:p-6 max-w-[1600px] mx-auto">
      {/* =========================================================================
          TOP ACTION BAR & BREADCRUMB
         ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Title & Subtitle */}
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-bold tracking-wider uppercase border ${
                isDark
                  ? 'bg-amber-950/70 text-amber-300 border-amber-800/60'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              FINANCIAL GOALS
            </span>
            <span className={`text-xs font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
              • Toàn Hệ Thống Wings Lashes
            </span>
          </div>

          <h1 className={`text-xl md:text-2xl font-black tracking-tight mt-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Mục Tiêu Tài Chính – Tháng {monthNumStr}/{yearStr}
          </h1>
        </div>

        {/* Right: Month Selector & Controls */}
        <div className="flex items-center gap-2">
          {/* Month Stepper */}
          <div
            className={`inline-flex items-center rounded-xl border p-0.5 ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <Tooltip title="Tháng trước">
              <Button
                type="text"
                size="small"
                icon={<ChevronLeft className="w-4 h-4" />}
                onClick={handlePrevMonth}
                className="hover:text-amber-500"
              />
            </Tooltip>

            <Dropdown menu={{ items: monthMenuItems }} trigger={['click']}>
              <button
                type="button"
                className={`px-3 py-1 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer rounded-lg transition-colors ${
                  isDark
                    ? 'text-zinc-100 hover:bg-zinc-800'
                    : 'text-slate-800 hover:bg-slate-100'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>Tháng {monthNumStr}/{yearStr}</span>
              </button>
            </Dropdown>

            <Tooltip title="Tháng tiếp theo">
              <Button
                type="text"
                size="small"
                icon={<ChevronRight className="w-4 h-4" />}
                onClick={handleNextMonth}
                className="hover:text-amber-500"
              />
            </Tooltip>
          </div>

          {/* VAT Toggle */}
          <div
            className={`inline-flex items-center px-2.5 py-1 rounded-xl border text-xs font-mono transition-colors ${
              isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <ToolbarToggle
              label={
                <span className="flex items-center gap-1.5 font-bold">
                  <span>VAT 8%</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                      includeVat
                        ? isDark
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                        : isDark
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {includeVat ? 'Bật' : 'Bỏ VAT'}
                  </span>
                </span>
              }
              aria-label="Bật hoặc bỏ thuế VAT 8%"
              checked={includeVat}
              onChange={handleToggleVat}
              className="text-amber-500 dark:text-amber-300"
            />
          </div>

          {/* Refresh Button */}
          <Tooltip title="Làm mới số liệu thực tế">
            <Button
              icon={<RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-500' : ''}`} />}
              onClick={() => fetchOverview(selectedMonth, false, includeVat)}
              loading={refreshing}
            >
              Làm mới
            </Button>
          </Tooltip>

          {/* Settings Button */}
          <Button
            type="primary"
            icon={<Settings className="w-4 h-4" />}
            onClick={() => setConfigModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-500"
          >
            Cài đặt KPI
          </Button>
        </div>
      </div>

      {/* =========================================================================
          CONTENT BODY
         ========================================================================= */}
      {loading && !overview ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
          <span className={`text-sm font-mono ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
            Đang tải dữ liệu mục tiêu tài chính...
          </span>
        </div>
      ) : error ? (
        <div
          className={`rounded-2xl border p-6 text-center space-y-3 ${
            isDark ? 'bg-rose-950/20 border-rose-900 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          <p className="font-semibold">{error}</p>
          <Button type="primary" danger onClick={() => fetchOverview(selectedMonth)}>
            Thử lại
          </Button>
        </div>
      ) : overview ? (
        <div className="space-y-6">
          {/* Main & Component Overview Cards */}
          <FinancialGoalOverviewCards
            overview={overview}
            includeVat={includeVat}
            onOpenConfig={() => setConfigModalOpen(true)}
          />

          {/* Daily Pacing & Breakdown Table */}
          <FinancialGoalDailyTable
            data={overview.dailyBreakdown || []}
            month={overview.month}
            includeVat={includeVat}
          />
        </div>
      ) : null}

      {/* =========================================================================
          TARGET CONFIGURATION MODAL
         ========================================================================= */}
      <FinancialGoalConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        overview={overview}
        onSuccess={() => fetchOverview(selectedMonth, true)}
      />
    </div>
  );
}

export default function FinancialGoalsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
        </div>
      }
    >
      <FinancialGoalsContent />
    </Suspense>
  );
}
