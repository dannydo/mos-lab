'use client';

import React from 'react';
import { Progress, Tooltip, theme } from 'antd';
import {
  Trophy,
  Sparkles,
  TrendingUp,
  Target,
  Package,
  Scissors,
  ShoppingBag,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { FinancialGoalsOverview, FinancialGoalItem } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

interface FinancialGoalOverviewCardsProps {
  overview: FinancialGoalsOverview;
  onOpenConfig?: () => void;
}

const formatCurrency = (amount: number): string => {
  return `${Math.round(amount).toLocaleString('vi-VN')}đ`;
};

const formatShortCurrency = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(2)} tỷ`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)} tr`;
  }
  return `${amount.toLocaleString('vi-VN')}đ`;
};

export const FinancialGoalOverviewCards: React.FC<FinancialGoalOverviewCardsProps> = ({ overview }) => {
  const { themeMode } = useTheme();
  const { token } = theme.useToken();
  const isDark = themeMode === 'dark';

  const { month, daysInMonth, workDaysElapsed, workDaysRemaining, periodStatus, pacingRatio, kpiMain, kpiSub } =
    overview;

  const [yearStr, monthNumStr] = month.split('-');

  // Pacing status pill style
  const getPacingBadge = (item: FinancialGoalItem) => {
    if (periodStatus === 'NOT_STARTED') {
      return (
        <span
          className={`text-xs px-2.5 py-0.5 rounded font-mono font-medium border ${
            isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          Chưa bắt đầu
        </span>
      );
    }
    if (periodStatus === 'COMPLETED') {
      return (
        <span
          className={`text-xs px-2.5 py-0.5 rounded font-mono font-semibold border ${
            item.isAchieved
              ? isDark
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
                : 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : isDark
                ? 'bg-rose-950/80 text-rose-300 border-rose-600/50'
                : 'bg-rose-50 text-rose-700 border-rose-300'
          }`}
        >
          {item.isAchieved ? 'Đã hoàn thành' : 'Chưa đạt mục tiêu'}
        </span>
      );
    }
    if (item.isAchieved) {
      return (
        <span className="text-[11px] px-2.5 py-0.5 rounded font-black font-mono bg-gradient-to-r from-amber-500 to-yellow-400 text-black shadow-sm flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> VƯỢT {item.percent}%
        </span>
      );
    }
    if (item.pacingStatus === 'AHEAD') {
      return (
        <span
          className={`text-xs px-2 py-0.5 rounded font-mono font-semibold border flex items-center gap-1 ${
            isDark
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/50'
              : 'bg-emerald-50 text-emerald-700 border-emerald-300'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> Vượt nhịp ({item.percent}%)
        </span>
      );
    }
    if (item.pacingStatus === 'ON_TRACK') {
      return (
        <span
          className={`text-xs px-2 py-0.5 rounded font-mono font-semibold border flex items-center gap-1 ${
            isDark ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/50' : 'bg-cyan-50 text-cyan-700 border-cyan-300'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Đúng nhịp ({item.percent}%)
        </span>
      );
    }
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded font-mono font-semibold border flex items-center gap-1 ${
          isDark ? 'bg-rose-950/80 text-rose-300 border-rose-600/50' : 'bg-rose-50 text-rose-700 border-rose-300'
        }`}
      >
        <ArrowDownRight className="w-3.5 h-3.5" /> Chậm nhịp ({item.percent}%)
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* =========================================================================
          1. HERO CARD: KPI TỔNG DOANH THU MỤC TIÊU
         ========================================================================= */}
      <section
        className={`rounded-3xl border p-5 md:p-6 transition-all duration-300 shadow-xl relative overflow-hidden ${
          isDark
            ? kpiMain.isAchieved
              ? 'bg-gradient-to-br from-amber-950/30 via-zinc-950 to-zinc-950 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
              : 'bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-950 border-zinc-800/90'
            : kpiMain.isAchieved
              ? 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-amber-300 shadow-lg'
              : 'bg-white border-slate-200'
        }`}
      >
        {/* Glow ambient decoration */}
        <div
          className={`absolute -right-20 -top-20 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
            isDark
              ? kpiMain.isAchieved
                ? 'bg-amber-500/10'
                : 'bg-blue-600/5'
              : kpiMain.isAchieved
                ? 'bg-amber-400/15'
                : 'bg-blue-200/30'
          }`}
        />

        <div className="relative z-10">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-700'
                }`}
              >
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span
                  className={`text-xs uppercase font-mono font-bold tracking-wider ${
                    isDark ? 'text-amber-400' : 'text-amber-800'
                  }`}
                >
                  KPI CHÍNH HỆ THỐNG WINGS LASHES
                </span>
                <h2
                  className={`text-xl md:text-2xl font-black tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Tổng Doanh Thu Tháng {monthNumStr}/{yearStr}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">{getPacingBadge(kpiMain)}</div>
          </div>

          {/* Big Number & Progress Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Column: Big Actual vs Target Numbers */}
            <div className="lg:col-span-5 space-y-2">
              <div className="flex items-baseline gap-3">
                <span
                  className={`text-3xl md:text-4xl lg:text-5xl font-black tabular-nums tracking-tight ${
                    isDark
                      ? kpiMain.isAchieved
                        ? 'text-amber-300'
                        : 'text-white'
                      : kpiMain.isAchieved
                        ? 'text-amber-600'
                        : 'text-slate-900'
                  }`}
                >
                  {formatCurrency(kpiMain.actual)}
                </span>
                <span
                  className={`text-xs md:text-sm font-mono font-semibold ${
                    isDark ? 'text-zinc-500' : 'text-slate-400'
                  }`}
                >
                  / {formatCurrency(kpiMain.target)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm">
                <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>
                  Tỷ lệ hoàn thành:{' '}
                  <strong
                    className={`tabular-nums font-mono font-bold ${
                      kpiMain.isAchieved
                        ? isDark
                          ? 'text-amber-300'
                          : 'text-amber-700'
                        : kpiMain.percent >= 80
                          ? isDark
                            ? 'text-emerald-300'
                            : 'text-emerald-700'
                          : isDark
                            ? 'text-rose-400'
                            : 'text-rose-600'
                    }`}
                  >
                    {kpiMain.percent}%
                  </strong>
                </span>

                <span className={isDark ? 'text-zinc-500' : 'text-slate-300'}>•</span>

                {kpiMain.isAchieved ? (
                  <span className="text-emerald-500 font-medium flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Vượt mục tiêu:{' '}
                    <strong className="font-mono tabular-nums">+{formatCurrency(kpiMain.surplus)}</strong>
                  </span>
                ) : (
                  <span className={isDark ? 'text-zinc-400' : 'text-slate-600'}>
                    Còn thiếu:{' '}
                    <strong
                      className={`font-mono tabular-nums ${isDark ? 'text-amber-400/90' : 'text-amber-700'}`}
                    >
                      {formatCurrency(kpiMain.remaining)}
                    </strong>
                  </span>
                )}
              </div>
            </div>

            {/* Middle Column: Visual Progress Bar */}
            <div className="lg:col-span-4 space-y-2">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Tiến độ doanh thu</span>
                <span className={`font-bold tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  {kpiMain.percent}%
                </span>
              </div>
              <Progress
                percent={Math.min(100, kpiMain.percent)}
                strokeColor={kpiMain.isAchieved ? token.colorWarning : token.colorSuccess}
                trailColor={token.colorBorderSecondary}
                showInfo={false}
                size={{ height: 12 }}
              />
              <div className="flex justify-between items-center text-[11px] font-mono text-zinc-500">
                <span>0đ</span>
                <span>Mục tiêu: {formatShortCurrency(kpiMain.target)}</span>
              </div>
            </div>

            {/* Right Column: Time Pacing & Daily Requirement */}
            <div
              className={`lg:col-span-3 rounded-2xl p-3 border ${
                isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-slate-50 border-slate-200'
              } space-y-2 text-xs`}
            >
              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <Calendar className="w-3.5 h-3.5" /> Tiến độ tháng:
                </span>
                <span className="font-mono font-bold tabular-nums">
                  {workDaysElapsed}/{daysInMonth} ngày{' '}
                  <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>
                    ({Math.round(pacingRatio * 100)}%)
                  </span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className={`flex items-center gap-1.5 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}>
                  <Clock className="w-3.5 h-3.5" /> Ngày còn lại:
                </span>
                <span className="font-mono font-bold tabular-nums">
                  {workDaysRemaining > 0 ? `${workDaysRemaining} ngày` : 'Đã kết thúc kỳ'}
                </span>
              </div>

              <div className="pt-1.5 border-t border-dashed border-zinc-700/40 flex items-center justify-between">
                <span className={isDark ? 'text-zinc-400' : 'text-slate-500'}>Cần đạt/ngày:</span>
                <strong
                  className={`font-mono tabular-nums ${
                    kpiMain.isAchieved
                      ? 'text-emerald-500 font-semibold'
                      : isDark
                        ? 'text-amber-300'
                        : 'text-amber-700'
                  }`}
                >
                  {kpiMain.isAchieved ? 'Đã về đích 🎉' : `${formatShortCurrency(kpiMain.dailyRequired)}/ngày`}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. KPI THÀNH PHẦN (3 CARDS BÊN DƯỚI)
         ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <span
            className={`text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
              isDark ? 'text-zinc-400' : 'text-slate-600'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-blue-500" /> CÁC CHỈ TIÊU THÀNH PHẦN (COMBO • KHÁCH LẺ • SẢN PHẨM)
          </span>
          <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>
            Tự động đồng bộ doanh thu thực tế từ mOS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 2.1 DOANH THU COMBO */}
          <ComponentKpiCard
            item={kpiSub.combo}
            title="Doanh Thu Combo"
            subtitle="Gói dịch vụ nối mi / uốn mi"
            icon={<Package className="w-4 h-4 text-purple-400" />}
            colorClass="purple"
            gradient="from-purple-500 to-indigo-500"
            periodStatus={periodStatus}
            workDaysRemaining={workDaysRemaining}
            isDark={isDark}
          />

          {/* 2.2 DOANH THU KHÁCH LẺ */}
          <ComponentKpiCard
            item={kpiSub.retail}
            title="Doanh Thu Khách Lẻ"
            subtitle="Dịch vụ lẻ, dặm mi, tháo mi"
            icon={<Scissors className="w-4 h-4 text-emerald-400" />}
            colorClass="emerald"
            gradient="from-emerald-500 to-teal-500"
            periodStatus={periodStatus}
            workDaysRemaining={workDaysRemaining}
            isDark={isDark}
          />

          {/* 2.3 DOANH THU SẢN PHẨM */}
          <ComponentKpiCard
            item={kpiSub.product}
            title="Doanh Thu Sản Phẩm"
            subtitle="Dưỡng mi, mascara, phụ kiện"
            icon={<ShoppingBag className="w-4 h-4 text-amber-400" />}
            colorClass="amber"
            gradient="from-amber-500 to-orange-500"
            periodStatus={periodStatus}
            workDaysRemaining={workDaysRemaining}
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  );
};

interface ComponentKpiCardProps {
  item: FinancialGoalItem;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  colorClass: 'purple' | 'emerald' | 'amber';
  gradient: string;
  periodStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  workDaysRemaining: number;
  isDark: boolean;
}

const ComponentKpiCard: React.FC<ComponentKpiCardProps> = ({
  item,
  title,
  subtitle,
  icon,
  colorClass,
  gradient,
  periodStatus,
  workDaysRemaining,
  isDark,
}) => {
  const { token } = theme.useToken();
  const isAchieved = item.isAchieved;

  const strokeColor = isAchieved
    ? token.colorWarning
    : colorClass === 'purple'
      ? token.colorInfo
      : colorClass === 'emerald'
        ? token.colorSuccess
        : token.colorWarning;

  return (
    <div
      className={`rounded-2xl border p-4 transition-all duration-200 flex flex-col justify-between shadow-sm relative overflow-hidden ${
        isDark
          ? isAchieved
            ? 'bg-zinc-900/90 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
            : 'bg-zinc-900/70 border-zinc-800 hover:border-zinc-700'
          : isAchieved
            ? 'bg-white border-amber-300 shadow-md'
            : 'bg-white border-slate-200/90 hover:border-slate-300'
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                isDark ? 'bg-zinc-800' : 'bg-slate-100'
              }`}
            >
              {icon}
            </div>
            <div>
              <h3 className={`text-sm font-bold tracking-tight ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
                {title}
              </h3>
              <p className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-slate-400'}`}>{subtitle}</p>
            </div>
          </div>

          <div>
            {isAchieved ? (
              <span className="text-[10px] px-2 py-0.5 rounded font-black font-mono bg-gradient-to-r from-amber-500 to-yellow-400 text-black flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3 h-3" /> {item.percent}%
              </span>
            ) : (
              <span
                className={`text-[11px] font-mono font-bold tabular-nums px-2 py-0.5 rounded border ${
                  item.pacingStatus === 'AHEAD' || item.pacingStatus === 'ON_TRACK'
                    ? isDark
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : isDark
                      ? 'bg-rose-950/80 text-rose-300 border-rose-700/50'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                }`}
              >
                {item.pacingStatusLabel}
              </span>
            )}
          </div>
        </div>

        {/* Big Numbers */}
        <div className="my-3">
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-black tabular-nums tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              {formatCurrency(item.actual)}
            </span>
            <span className={`text-xs font-mono font-bold tabular-nums ${isDark ? 'text-zinc-400' : 'text-slate-600'}`}>
              {item.percent}%
            </span>
          </div>

          <div className="flex justify-between items-center text-xs mt-1">
            <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>
              Mục tiêu: <strong className="font-mono tabular-nums">{formatCurrency(item.target)}</strong>
            </span>
            {item.sharePercent !== undefined && item.sharePercent > 0 && (
              <span
                className={`text-[11px] font-mono ${isDark ? 'text-cyan-400/90' : 'text-cyan-700 font-semibold'}`}
                title="Tỷ trọng trong tổng doanh thu"
              >
                {item.sharePercent}% tổng
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <Progress
          percent={Math.min(100, item.percent)}
          strokeColor={strokeColor}
          trailColor={token.colorBorderSecondary}
          showInfo={false}
          size={{ height: 8 }}
        />
      </div>

      {/* Card Footer / Contextual Stats */}
      <div
        className={`mt-3 pt-2.5 border-t border-dashed flex items-center justify-between text-xs font-mono ${
          isDark ? 'border-zinc-800 text-zinc-400' : 'border-slate-100 text-slate-500'
        }`}
      >
        <span>
          {isAchieved ? (
            <span className="text-emerald-500 font-semibold">
              Vượt: +{formatShortCurrency(item.surplus)}
            </span>
          ) : (
            <span>
              Thiếu: <strong className={isDark ? 'text-amber-300/90' : 'text-amber-700'}>{formatShortCurrency(item.remaining)}</strong>
            </span>
          )}
        </span>

        <span>
          {periodStatus === 'COMPLETED' ? (
            <span className={isDark ? 'text-zinc-500' : 'text-slate-400'}>Đã chốt kỳ</span>
          ) : isAchieved ? (
            <span className="text-emerald-500 font-semibold">Đã đạt KPI 🎉</span>
          ) : workDaysRemaining > 0 ? (
            <span title="Số tiền cần đạt mỗi ngày còn lại">
              Cần: <strong className={isDark ? 'text-zinc-200' : 'text-slate-800'}>{formatShortCurrency(item.dailyRequired)}/ngày</strong>
            </span>
          ) : (
            <span>-</span>
          )}
        </span>
      </div>
    </div>
  );
};
