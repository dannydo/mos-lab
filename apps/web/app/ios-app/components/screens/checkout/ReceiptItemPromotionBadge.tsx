'use client';

import React from 'react';
import type { IosPromotionOption } from '@mos-lab/shared';
import { Tag, X } from 'lucide-react';

export interface ReceiptItemPromotionBadgeProps {
  isDark: boolean;
  itemAmount: number;
  appliedPromotion?: IosPromotionOption | null;
  discountAmount?: number;
  testIdPrefix: string;
  onOpenPicker?: () => void;
  onClear?: () => void;
}

export function ReceiptItemPromotionBadge({
  isDark,
  itemAmount,
  appliedPromotion,
  discountAmount = 0,
  testIdPrefix,
  onOpenPicker,
  onClear,
}: ReceiptItemPromotionBadgeProps) {
  if (itemAmount <= 0) return null;

  if (appliedPromotion) {
    return (
      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
        <span
          data-testid={`promo-badge-${testIdPrefix}`}
          className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-lg border leading-tight ${
            isDark
              ? 'bg-emerald-950/50 border-emerald-700/70 text-emerald-300'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <Tag className="w-2.5 h-2.5 shrink-0 text-emerald-500" />
          <span className="truncate max-w-[165px]">{appliedPromotion.shortName || appliedPromotion.name}</span>
          {discountAmount > 0 && (
            <span className="font-black tabular-nums whitespace-nowrap">
              · -{discountAmount.toLocaleString('vi-VN')}đ
            </span>
          )}
        </span>
        {onOpenPicker && (
          <button
            type="button"
            data-testid={`change-promo-${testIdPrefix}`}
            onClick={onOpenPicker}
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold border cursor-pointer active:scale-95 ${
              isDark
                ? 'bg-neutral-800 border-neutral-700 text-amber-300 hover:bg-neutral-700'
                : 'bg-white border-neutral-200 text-amber-800 hover:bg-amber-50'
            }`}
          >
            Đổi
          </button>
        )}
        {onClear && (
          <button
            type="button"
            data-testid={`clear-promo-${testIdPrefix}`}
            onClick={onClear}
            aria-label="Gỡ khuyến mãi"
            className={`p-1 rounded-md border cursor-pointer active:scale-95 ${
              isDark
                ? 'bg-neutral-800 border-neutral-700 text-rose-400 hover:bg-rose-950/50'
                : 'bg-white border-neutral-200 text-rose-600 hover:bg-rose-50'
            }`}
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
      </div>
    );
  }

  if (!onOpenPicker) return null;

  return (
    <div className="pt-1">
      <button
        type="button"
        data-testid={`add-promo-${testIdPrefix}`}
        onClick={onOpenPicker}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-dashed text-[10.5px] font-bold cursor-pointer active:scale-95 transition-colors ${
          isDark
            ? 'bg-neutral-800/60 border-neutral-700 text-amber-300 hover:border-amber-500/70'
            : 'bg-amber-50/60 border-amber-300/80 text-amber-900 hover:bg-amber-50'
        }`}
      >
        <Tag className="w-2.5 h-2.5 text-amber-500 shrink-0" />
        <span>+ Khuyến mãi</span>
      </button>
    </div>
  );
}
