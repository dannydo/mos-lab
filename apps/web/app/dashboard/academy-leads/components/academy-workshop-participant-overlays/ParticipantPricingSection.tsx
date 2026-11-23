'use client';

import { Button, Input, InputNumber } from 'antd';
import { Tag } from 'lucide-react';
import { ACADEMY_WORKSHOP_PRICING_PRESETS } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { formatVndInput, parseVndInput } from '~/lib/format-utils';
import { resolvePricingPresetTierAmount } from './participant-overlay-types';

export interface ParticipantPricingSectionProps {
  workshopFeeVnd: number;
  discountReason: string | null;
  pricingPreset: string;
  customAppliedFee: number | null;
  customReason: string;
  busy: boolean;
  pricingBusy: boolean;
  onSelectPreset: (presetId: string) => void;
  onCustomAppliedFeeChange: (value: number | null) => void;
  onCustomReasonChange: (value: string) => void;
  onApplyPricing: () => void;
}

export function ParticipantPricingSection({
  workshopFeeVnd,
  discountReason,
  pricingPreset,
  customAppliedFee,
  customReason,
  busy,
  pricingBusy,
  onSelectPreset,
  onCustomAppliedFeeChange,
  onCustomReasonChange,
  onApplyPricing,
}: ParticipantPricingSectionProps) {
  return (
    <div className="rounded-xl border border-inherit bg-indigo-50/30 p-3.5 dark:bg-indigo-950/10">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <AppIcon icon={Tag} className="h-3.5 w-3.5 text-indigo-500" />
          <span>Gói vé & Ưu đãi áp dụng</span>
        </div>
        {discountReason && (
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
            {discountReason}
          </span>
        )}
      </div>

      <div className="mb-2.5 rounded-lg border border-indigo-200/60 bg-indigo-50/50 p-2 text-[11px] leading-relaxed text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200">
        <span className="font-semibold">Chính sách Workshop:</span> Thu full được nâng cấp bộ dụng cụ từ 299K lên bộ
        499K Free (đã kèm trong học phí). Học viên đóng cọc nhận bộ 299K cơ bản.
      </div>

      <div className="space-y-2.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ACADEMY_WORKSHOP_PRICING_PRESETS.map((preset) => {
            const isSelected = pricingPreset === preset.id;
            const tierAmount = resolvePricingPresetTierAmount(preset, workshopFeeVnd);

            return (
              <button
                key={preset.id}
                type="button"
                disabled={busy || pricingBusy}
                onClick={() => onSelectPreset(preset.id)}
                className={`flex flex-col rounded-lg border p-2.5 text-left text-xs transition-all ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/80 font-semibold text-indigo-900 ring-1 ring-indigo-500 dark:bg-indigo-900/40 dark:text-indigo-100'
                    : 'border-slate-200 bg-white/70 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-slate-600'
                }`}
              >
                <div className="truncate font-medium">{preset.label}</div>
                <div className="mt-1 font-bold tabular-nums text-slate-800 dark:text-slate-200">
                  {preset.type === 'CUSTOM' ? 'Tùy chỉnh...' : `${tierAmount.toLocaleString('vi-VN')} đ`}
                </div>
              </button>
            );
          })}
        </div>

        {pricingPreset === 'custom' && (
          <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">Mức học phí áp dụng (VND)</div>
              <InputNumber
                min={0}
                precision={0}
                step={50000}
                className="w-full"
                value={customAppliedFee}
                onChange={(val) => onCustomAppliedFeeChange(val ? Number(val) : null)}
                placeholder="Nhập mức phí thực thu"
                formatter={formatVndInput}
                parser={parseVndInput}
              />
            </div>
            <div>
              <div className="mb-1 text-[11px] text-slate-500 dark:text-slate-400">Lý do / Tên gói ưu đãi</div>
              <Input
                value={customReason}
                onChange={(e) => onCustomReasonChange(e.target.value)}
                placeholder="VD: Học bổng đối tác, ưu đãi VIP..."
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {pricingPreset === 'full' && 'Vé tiêu chuẩn: 100% học phí niêm yết (nâng cấp bộ dụng cụ 499K Free)'}
            {pricingPreset === 'discount_10' &&
              `Ưu đãi 10%: ${Math.round(workshopFeeVnd * 0.9).toLocaleString('vi-VN')} đ (giảm ${Math.round(workshopFeeVnd * 0.1).toLocaleString('vi-VN')} đ)`}
            {pricingPreset === 'discount_50' &&
              `Ưu đãi 50%: ${Math.round(workshopFeeVnd * 0.5).toLocaleString('vi-VN')} đ (giảm ${Math.round(workshopFeeVnd * 0.5).toLocaleString('vi-VN')} đ)`}
            {pricingPreset === 'custom' &&
              (customAppliedFee !== null
                ? `Mức phí áp dụng: ${customAppliedFee.toLocaleString('vi-VN')} đ`
                : 'Nhập mức phí áp dụng tùy chỉnh')}
          </div>
          <Button
            size="small"
            type="primary"
            ghost
            loading={pricingBusy}
            onClick={onApplyPricing}
            disabled={busy || pricingBusy}
          >
            Áp dụng gói vé này
          </Button>
        </div>
      </div>
    </div>
  );
}
