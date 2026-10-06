'use client';

import React from 'react';
import {
  Wallet,
  CheckCircle2,
  Trophy,
  AlertCircle,
  TrendingUp,
  ArrowDown,
  ArrowRight,
  Coins,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { BkSalaryResult, SalaryBranchInfo } from './contracts/salary-explainer.types';
import { AppIcon, StatusTag } from '../ui';

interface SalaryInfographicProps {
  result: BkSalaryResult;
  onSelectBranch?: (branchKey: string) => void;
  activeBranchKey?: string;
}

const ACCENT_STYLES: Record<
  SalaryBranchInfo['accent'],
  {
    bg: string;
    border: string;
    text: string;
    badgeBg: string;
    badgeText: string;
    icon: LucideIcon;
  }
> = {
  blue: {
    bg: 'bg-blue-50/70 dark:bg-blue-950/30',
    border: 'border-blue-200/80 dark:border-blue-800/50',
    text: 'text-blue-700 dark:text-blue-300',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-700 dark:text-blue-300',
    icon: Wallet,
  },
  emerald: {
    bg: 'bg-emerald-50/70 dark:bg-emerald-950/30',
    border: 'border-emerald-200/80 dark:border-emerald-800/50',
    text: 'text-emerald-700 dark:text-emerald-300',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    icon: CheckCircle2,
  },
  purple: {
    bg: 'bg-purple-50/70 dark:bg-purple-950/30',
    border: 'border-purple-200/80 dark:border-purple-800/50',
    text: 'text-purple-700 dark:text-purple-300',
    badgeBg: 'bg-purple-500/15',
    badgeText: 'text-purple-700 dark:text-purple-300',
    icon: Trophy,
  },
  amber: {
    bg: 'bg-amber-50/70 dark:bg-amber-950/30',
    border: 'border-amber-200/80 dark:border-amber-800/50',
    text: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-700 dark:text-amber-300',
    icon: AlertCircle,
  },
  rose: {
    bg: 'bg-rose-50/70 dark:bg-rose-950/30',
    border: 'border-rose-200/80 dark:border-rose-800/50',
    text: 'text-rose-700 dark:text-rose-300',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-700 dark:text-rose-300',
    icon: AlertCircle,
  },
  cyan: {
    bg: 'bg-cyan-50/70 dark:bg-cyan-950/30',
    border: 'border-cyan-200/80 dark:border-cyan-800/50',
    text: 'text-cyan-700 dark:text-cyan-300',
    badgeBg: 'bg-cyan-500/15',
    badgeText: 'text-cyan-700 dark:text-cyan-300',
    icon: TrendingUp,
  },
};

export default function SalaryInfographic({ result, onSelectBranch, activeBranchKey }: SalaryInfographicProps) {
  const { branches, totalIncome } = result;

  return (
    <div className="w-full flex flex-col gap-4 py-2">
      {/* Header Infographic Tagline */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
            <AppIcon icon={Sparkles} size="sm" />
          </div>
          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
            Sơ Đồ 5 Dòng Tiền Thu Nhập Booker (BK-006)
          </span>
        </div>
        <StatusTag status="gold" label="Đa nguồn · Lũy tiến" />
      </div>

      {/* 5 Incoming Streams Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {branches.map((branch, index) => {
          const style = ACCENT_STYLES[branch.accent] || ACCENT_STYLES.blue;
          const BranchIcon = style.icon;
          const isSelected = activeBranchKey === branch.key;

          return (
            <div
              key={branch.key}
              onClick={() => onSelectBranch?.(branch.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelectBranch?.(branch.key);
              }}
              className={`relative rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 text-left cursor-pointer ${
                style.bg
              } ${style.border} ${
                isSelected ? 'ring-2 ring-blue-500 shadow-md scale-[1.02]' : 'hover:shadow-sm hover:scale-[1.01]'
              }`}
            >
              {/* Header card with Step Number & Icon */}
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${style.badgeBg} ${style.badgeText}`}
                  >
                    {index + 1}
                  </span>
                  <span className="font-semibold text-xs text-slate-800 dark:text-slate-100 line-clamp-1">
                    {branch.shortLabel}
                  </span>
                </div>
                <div className={`p-1 rounded-md ${style.badgeBg} ${style.badgeText}`}>
                  <AppIcon icon={BranchIcon} size="sm" />
                </div>
              </div>

              {/* Amount Display */}
              <div className="my-1">
                <div
                  className={`text-base font-bold tabular-nums tracking-tight ${
                    branch.amount < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {branch.amount < 0 ? '-' : '+'}
                  {Math.abs(branch.amount).toLocaleString('vi-VN')}
                  <span className="text-[11px] font-normal text-slate-500 ml-0.5">đ</span>
                </div>
              </div>

              {/* Formula & Note */}
              <div className="text-[11px] text-slate-600 dark:text-slate-400 border-t border-slate-200/50 dark:border-slate-800/60 pt-1.5 mt-1 flex flex-col gap-0.5">
                <div className="font-medium text-slate-700 dark:text-slate-300 truncate" title={branch.formula}>
                  {branch.formula}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{branch.highlightNote}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Convergence Indicator */}
      <div className="flex items-center justify-center -my-1 text-slate-400 dark:text-slate-500">
        <div className="hidden lg:flex items-center gap-1 text-xs">
          <span>Hội tụ 5 dòng tiền vào tổng lương</span>
          <AppIcon icon={ArrowDown} size="sm" />
        </div>
        <div className="lg:hidden flex items-center gap-1 text-xs">
          <AppIcon icon={ArrowDown} size="sm" />
        </div>
      </div>

      {/* Grand Total Center Card */}
      <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
            <AppIcon icon={Coins} size="lg" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-emerald-700 dark:text-emerald-400">
              Tổng Thu Nhập Booker Tạm Tính
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Lương ca + Check-in + Mốc Done + Thưởng/Phạt Missed + Hoa hồng & Tip
            </div>
          </div>
        </div>

        <div className="text-right sm:text-right w-full sm:w-auto flex flex-col items-end">
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
            {totalIncome.toLocaleString('vi-VN')}
            <span className="text-base font-semibold ml-1 text-emerald-700 dark:text-emerald-300">đ</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
            <span>Chi trả chuẩn kỳ lương hàng tháng</span>
          </div>
        </div>
      </div>
    </div>
  );
}
