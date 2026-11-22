'use client';

import React from 'react';
import type { LeaderboardEntry } from '@mos-lab/shared';
import { formatAuditCurrency, type AppointmentsAuditTotals } from './appointmentsAuditTypes';

export interface AuditPaystubSummaryCardsProps {
  drilldownTotals: AppointmentsAuditTotals;
  selectedStaffRecord: LeaderboardEntry | null;
  liveTotalSalary: number;
  themeMode: string;
}

export function AuditPaystubSummaryCards({
  drilldownTotals,
  selectedStaffRecord,
  liveTotalSalary,
  themeMode,
}: AuditPaystubSummaryCardsProps) {
  const isDark = themeMode === 'dark';
  const salary = selectedStaffRecord?.salary;

  const baseCardClass = isDark
    ? 'rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1.5'
    : 'rounded-lg border border-[var(--mos-border-secondary)] bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 px-2 py-1.5';

  const highlightCardClass = isDark
    ? 'rounded-lg border border-amber-500/60 bg-amber-950/35 px-2 py-1.5'
    : 'rounded-lg border border-amber-300 bg-amber-50/90 dark:border-amber-500/60 dark:bg-amber-950/35 px-2 py-1.5';

  const titleClass = 'text-[9px] font-semibold uppercase tracking-tight text-[var(--mos-text-muted)] truncate';
  const subTextClass = 'mt-0.5 text-[9px] text-[var(--mos-text-muted)] truncate tabular-nums';
  const unitClass = 'text-[10px] font-normal text-[var(--mos-text-muted)]';

  const checkinRate =
    drilldownTotals.totalCount > 0 ? Math.round((drilldownTotals.checkinCount / drilldownTotals.totalCount) * 100) : 0;

  const baseSalary = salary?.baseSalary || 0;
  const doneBonus = salary?.doneBonus || 0;
  const missedBonus = salary?.missedBonus || 0;
  const tipBonus = salary?.tipBonus || 0;
  const revBonus = salary?.revBonus || 0;
  const revLevelRate = salary?.revLevelRate || 0;
  const revLevelMin = salary?.revLevelMin || 0;

  const missedColorClass =
    missedBonus < 0
      ? 'text-rose-500 dark:text-rose-400'
      : missedBonus > 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-[var(--mos-text)]';

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-8">
      {/* Card 1: Lịch hẹn & Check-in */}
      <div className={baseCardClass}>
        <div className={titleClass}>LỊCH HẸN / CHECK-IN</div>
        <div className="mt-0.5 whitespace-nowrap text-sm font-bold tabular-nums text-[var(--mos-text)]">
          {drilldownTotals.totalCount} <span className={unitClass}>lượt</span>
          {' / '}
          <span className="text-emerald-600 dark:text-emerald-400">{drilldownTotals.checkinCount}</span>
        </div>
        <div className={subTextClass}>Tỷ lệ đến: {checkinRate}%</div>
      </div>

      {/* Card 2: Lương cứng */}
      <div className={baseCardClass}>
        <div className={titleClass}>LƯƠNG CỨNG</div>
        <div className="mt-0.5 whitespace-nowrap text-sm font-bold tabular-nums text-[var(--mos-text)]">
          {formatAuditCurrency(baseSalary)} <span className={unitClass}>đ</span>
        </div>
        <div className={subTextClass}>Cố định hàng tháng</div>
      </div>

      {/* Card 3: Hoa hồng Đặt lịch */}
      <div className={baseCardClass}>
        <div className={titleClass}>HOA HỒNG ĐẶT LỊCH (LIVE)</div>
        <div className="mt-0.5 whitespace-nowrap text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {formatAuditCurrency(drilldownTotals.totalBookingBonus)} <span className={unitClass}>đ</span>
        </div>
        <div className={subTextClass}>Cộng dồn đơn thành công</div>
      </div>

      {/* Card 4: Thưởng mốc Done */}
      <div className={baseCardClass}>
        <div className={titleClass}>THƯỞNG MỐC DONE</div>
        <div
          className={`mt-0.5 whitespace-nowrap text-sm font-bold tabular-nums ${
            doneBonus > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--mos-text)]'
          }`}
        >
          {formatAuditCurrency(doneBonus)} <span className={unitClass}>đ</span>
        </div>
        <div className={subTextClass}>
          {salary?.doneLevelCount ? `Mốc đạt: >= ${salary.doneLevelCount} lượt` : 'Chưa đạt mốc thưởng'}
        </div>
      </div>

      {/* Card 5: Thưởng / Phạt Lỡ */}
      <div className={baseCardClass}>
        <div className={titleClass}>THƯỞNG / PHẠT LỠ</div>
        <div className={`mt-0.5 whitespace-nowrap text-sm font-bold tabular-nums ${missedColorClass}`}>
          {missedBonus > 0 ? '+' : ''}
          {formatAuditCurrency(missedBonus)} <span className={unitClass}>đ</span>
        </div>
        <div className={subTextClass}>
          Lỡ: {((salary?.missedRate || 0) * 100).toFixed(1)}%{' '}
          {salary?.missedLevelRate ? `(Mốc <= ${salary.missedLevelRate}%)` : ''}
        </div>
      </div>

      {/* Card 6: Thưởng Tips (7%) */}
      <div className={baseCardClass}>
        <div className={titleClass}>THƯỞNG TIPS (7%)</div>
        <div className="mt-0.5 whitespace-nowrap text-sm font-bold tabular-nums text-[var(--mos-text)]">
          {formatAuditCurrency(tipBonus)} <span className={unitClass}>đ</span>
        </div>
        <div className={subTextClass}>
          Tổng tips: {formatAuditCurrency(drilldownTotals.totalTips)}
          {'\u00A0'}đ
        </div>
      </div>

      {/* Card 7: Thưởng Doanh thu Net */}
      <div className={baseCardClass}>
        <div className={titleClass}>THƯỞNG DOANH THU NET</div>
        <div
          className={`mt-0.5 whitespace-nowrap text-sm font-bold tabular-nums ${
            revBonus > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[var(--mos-text)]'
          }`}
        >
          {formatAuditCurrency(revBonus)} <span className={unitClass}>đ</span>
        </div>
        <div className={subTextClass}>
          {revLevelRate > 0
            ? `${(revLevelRate * 100).toFixed(1)}% (Mốc >= ${revLevelMin / 1000000}M)`
            : `Chưa đạt (DS: ${(drilldownTotals.totalNetRevenue / 1000000).toFixed(1)}M)`}
        </div>
      </div>

      {/* Card 8: TỔNG THU NHẬP TẠM TÍNH (LIVE) */}
      <div className={highlightCardClass}>
        <div
          className={`truncate text-[9px] font-bold uppercase ${
            isDark ? 'text-amber-400' : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          ∑ THU NHẬP (LIVE)
        </div>
        <div
          className={`mt-0.5 whitespace-nowrap text-sm font-extrabold tabular-nums ${
            isDark ? 'text-amber-300' : 'text-amber-700 dark:text-amber-300'
          }`}
        >
          {formatAuditCurrency(liveTotalSalary)} <span className="text-[10px] font-normal">đ</span>
        </div>
        <div
          className={`mt-0.5 text-[9px] ${isDark ? 'text-amber-400/80' : 'text-amber-700/80 dark:text-amber-400/80'}`}
        >
          Lương cứng + thưởng live
        </div>
      </div>
    </div>
  );
}
