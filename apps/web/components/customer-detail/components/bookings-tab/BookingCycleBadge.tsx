'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { RefreshCw, Shield } from 'lucide-react';
import type { BookingCycleInfo } from './types';

export interface BookingCycleBadgeProps {
  cycleInfo?: BookingCycleInfo;
  hasCombo: boolean;
  themeMode: 'light' | 'dark';
}

export const BookingCycleBadge: React.FC<BookingCycleBadgeProps> = ({ cycleInfo, hasCombo, themeMode }) => {
  if (!cycleInfo) return null;

  const isDark = themeMode === 'dark';

  if (cycleInfo.isWarranty) {
    return (
      <Tooltip title="Đơn bảo hành kỹ thuật (Fix/Log/Adjust) - Không tính vào chu kỳ làm mi chuẩn theo Điều răn CARE-001">
        <span
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-tight ${
            isDark ? 'border-blue-400/30 bg-blue-500/15 text-blue-400' : 'border-blue-200 bg-blue-50 text-blue-600'
          }`}
        >
          <Shield className="h-2.5 w-2.5 shrink-0" />
          <span>Bảo hành kỹ thuật</span>
        </span>
      </Tooltip>
    );
  }

  if (cycleInfo.isFirstOrder) {
    return (
      <Tooltip title="Đơn đặt lịch hoàn tất đầu tiên của khách hàng">
        <span
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-tight ${
            isDark
              ? 'border-slate-400/30 bg-slate-400/15 text-slate-300'
              : 'border-slate-300 bg-slate-100 text-slate-600'
          }`}
        >
          <RefreshCw className="h-2.5 w-2.5 shrink-0" />
          <span>Chu kỳ: Đơn đầu</span>
        </span>
      </Tooltip>
    );
  }

  if (cycleInfo.cycleDays !== null) {
    const maxLimit = hasCombo ? 25 : 21;
    const isOverdue = cycleInfo.cycleDays > maxLimit;

    const badgeClasses = isOverdue
      ? isDark
        ? 'border-amber-400/35 bg-amber-500/20 text-amber-400'
        : 'border-amber-200 bg-amber-50 text-amber-700'
      : isDark
        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-400'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700';

    const tooltipText = `Chu kỳ: ${cycleInfo.cycleDays} ngày (tính từ đơn hoàn tất liền trước: ${
      cycleInfo.prevCompletedDateStr || 'N/A'
    }${isOverdue ? ` - Quá hạn dặm >${maxLimit} ngày` : ''})`;

    return (
      <Tooltip title={tooltipText}>
        <span
          className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-tight ${badgeClasses}`}
        >
          <RefreshCw className="h-2.5 w-2.5 shrink-0" />
          <span>Chu kỳ: {cycleInfo.cycleDays} ngày</span>
        </span>
      </Tooltip>
    );
  }

  return null;
};
