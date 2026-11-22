'use client';

import React from 'react';
import { Flame } from 'lucide-react';
import { AppIcon, StatusTag } from '~/components/ui';
import type { CapSummary } from './cc-xoay-utils';

interface CcXoayCapBannerProps {
  capSummary: CapSummary;
}

export function CcXoayCapBanner({ capSummary }: CcXoayCapBannerProps) {
  if (capSummary.cappedCount === 0 && capSummary.warningCount === 0) {
    return null;
  }

  return (
    <div className="p-3 border-b border-amber-500/20 bg-amber-500/10 flex flex-wrap items-center justify-between gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <AppIcon icon={Flame} size={14} className="text-amber-500 shrink-0" aria-hidden />
        <span className="font-semibold text-amber-800 dark:text-amber-300">
          ⚠️ Quản Lý Hạn Mức Vòng Xoay (Trần 1.5x CC Daily Bonus Tháng):
        </span>
        {capSummary.cappedCount > 0 ? (
          <StatusTag
            status="error"
            label={`⛔ ${capSummary.cappedCount} CC ĐẠT TRẦN (${capSummary.cappedNames.join(', ')})`}
            className="font-bold"
          />
        ) : null}
        {capSummary.warningCount > 0 ? (
          <StatusTag
            status="warning"
            label={`⚠️ ${capSummary.warningCount} CC SẮP CHẠM TRẦN (${capSummary.warningNames.join(', ')})`}
            className="font-bold"
          />
        ) : null}
      </div>
      <span className="text-[11px] text-slate-600 dark:text-slate-400 italic">
        *Thưởng Vòng xoay tối đa = 1.5 × CC Daily Bonus tháng
      </span>
    </div>
  );
}
