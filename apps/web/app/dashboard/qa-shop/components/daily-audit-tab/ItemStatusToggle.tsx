'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { Check, Minus, X } from 'lucide-react';
import type { QaAuditResult } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';

export interface ItemStatusToggleProps {
  itemId: string;
  itemTitle: string;
  value: QaAuditResult;
  onChange: (itemId: string, newResult: QaAuditResult) => void;
}

export const ItemStatusToggle: React.FC<ItemStatusToggleProps> = ({ itemId, itemTitle, value, onChange }) => {
  const isPass = value === 'PASS';
  const isFail = value === 'FAIL';
  const isNa = value === 'NA';

  return (
    <div
      role="group"
      aria-label={`Đánh giá tiêu chuẩn: ${itemTitle}`}
      className="flex items-center gap-1 self-start sm:self-center shrink-0"
    >
      <Tooltip title="Đạt quy chuẩn (PASS)">
        <button
          type="button"
          onClick={() => onChange(itemId, 'PASS')}
          aria-label={`Đánh giá Đạt cho tiêu chí ${itemTitle}`}
          aria-pressed={isPass}
          className={`p-1.5 rounded-md border transition-all duration-150 flex items-center gap-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 ${
            isPass
              ? 'bg-emerald-50 text-emerald-600 border-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-400 shadow-xs'
              : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-emerald-500 hover:border-emerald-200'
          }`}
        >
          <AppIcon icon={Check} size={12} />
          <span className="sr-only sm:not-sr-only text-[11px]">Đạt</span>
        </button>
      </Tooltip>

      <Tooltip title="Không đạt (FAIL)">
        <button
          type="button"
          onClick={() => onChange(itemId, 'FAIL')}
          aria-label={`Đánh giá Không đạt cho tiêu chí ${itemTitle}`}
          aria-pressed={isFail}
          className={`p-1.5 rounded-md border transition-all duration-150 flex items-center gap-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-1 ${
            isFail
              ? 'bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-400 shadow-xs'
              : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-rose-500 hover:border-rose-200'
          }`}
        >
          <AppIcon icon={X} size={12} />
          <span className="sr-only sm:not-sr-only text-[11px]">Không đạt</span>
        </button>
      </Tooltip>

      <Tooltip title="Không áp dụng (N/A)">
        <button
          type="button"
          onClick={() => onChange(itemId, 'NA')}
          aria-label={`Bỏ qua tiêu chí ${itemTitle}`}
          aria-pressed={isNa}
          className={`p-1.5 rounded-md border transition-all duration-150 flex items-center gap-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1 ${
            isNa
              ? 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 shadow-xs'
              : 'bg-transparent text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-600 hover:border-slate-300'
          }`}
        >
          <AppIcon icon={Minus} size={12} />
          <span className="sr-only sm:not-sr-only text-[11px]">N/A</span>
        </button>
      </Tooltip>
    </div>
  );
};
