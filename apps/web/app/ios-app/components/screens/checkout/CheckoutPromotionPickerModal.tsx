'use client';

import React, { useMemo, useState } from 'react';
import {
  calculateIosPromotionDiscount,
  isPromotionEligibleForCustomer,
  type IosPromotionOption,
} from '@mos-lab/shared';
import { Check, Gem, Lock, Search, Tag, X } from 'lucide-react';

export interface CheckoutPromotionPickerModalProps {
  open: boolean;
  isDark: boolean;
  promotions: IosPromotionOption[];
  isLoading: boolean;
  error?: string | null;
  selectedPromotionId?: number | null;
  customerVisits: number;
  serviceAmount: number;
  upgradeAmount: number;
  comboAmount: number;
  productAmount: number;
  vatRate?: number;
  onSelectPromotion: (promo: IosPromotionOption | null) => void;
  onClose: () => void;
}

const APPLY_SCOPE_LABELS: Record<string, string> = {
  single: 'Dịch vụ lẻ',
  combo: 'Gói Combo',
  upgrade: 'Nâng cấp',
  all: 'Toàn hóa đơn',
};

function formatPromoRuleBadge(promo: IosPromotionOption): string {
  if (promo.exactlyAmount > 0) {
    return `Đồng giá ${Math.round(promo.exactlyAmount / 1000).toLocaleString('vi-VN')}K`;
  }
  if (promo.discountPercentage > 0 && promo.discountAmount > 0) {
    return `-${promo.discountPercentage}% & -${Math.round(promo.discountAmount / 1000).toLocaleString('vi-VN')}K`;
  }
  if (promo.discountPercentage > 0) {
    return `Giảm ${promo.discountPercentage}%`;
  }
  if (promo.discountAmount > 0) {
    return `-${promo.discountAmount.toLocaleString('vi-VN')}đ`;
  }
  return 'Ưu đãi';
}

export function CheckoutPromotionPickerModal({
  open,
  isDark,
  promotions,
  isLoading,
  error,
  selectedPromotionId,
  customerVisits,
  serviceAmount,
  upgradeAmount,
  comboAmount,
  productAmount,
  vatRate = 0.08,
  onSelectPromotion,
  onClose,
}: CheckoutPromotionPickerModalProps) {
  const [keyword, setKeyword] = useState('');

  const filteredPromotions = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return promotions;
    return promotions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.shortName.toLowerCase().includes(q) ||
        p.promotionKey.toLowerCase().includes(q)
    );
  }, [promotions, keyword]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Chọn khuyến mãi thanh toán"
    >
      <div
        className={`w-full sm:max-w-lg max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl overflow-hidden ${
          isDark ? 'bg-[#18181B] border-neutral-800 text-neutral-100' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header — Title left, Close button [✕] right */}
        <div
          className={`px-4 py-3.5 flex items-center justify-between border-b shrink-0 ${
            isDark ? 'border-neutral-800' : 'border-neutral-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 inline-flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-black tracking-tight truncate">Chọn Khuyến Mãi</h2>
              <p className={`text-[11px] font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                {promotions.length} ưu đãi khả dụng · Lần đến #{customerVisits}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng danh sách khuyến mãi"
            className={`w-8 h-8 rounded-full inline-flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
              isDark
                ? 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
                : 'bg-neutral-100 border-neutral-200 text-neutral-600 hover:text-black'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Clear Bar */}
        <div
          className={`px-4 py-2.5 border-b space-y-2 shrink-0 ${isDark ? 'border-neutral-800' : 'border-neutral-100'}`}
        >
          <div className="relative">
            <Search
              className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
                isDark ? 'text-neutral-500' : 'text-neutral-400'
              }`}
            />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Tìm tên ưu đãi hoặc mã promo..."
              className={`w-full pl-9 pr-8 py-2 rounded-xl text-[13px] font-medium border outline-none transition-colors ${
                isDark
                  ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-amber-500'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-900 placeholder-neutral-400 focus:border-amber-500'
              }`}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
                aria-label="Xóa từ khóa"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {selectedPromotionId ? (
            <button
              type="button"
              onClick={() => {
                onSelectPromotion(null);
                onClose();
              }}
              className={`w-full py-1.5 px-3 rounded-xl text-[12px] font-bold border inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                isDark
                  ? 'bg-rose-950/30 border-rose-800/60 text-rose-300 hover:bg-rose-950/50'
                  : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <X className="w-3.5 h-3.5" />
              <span>Bỏ áp dụng khuyến mãi hiện tại</span>
            </button>
          ) : null}
        </div>

        {/* Promotion List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {isLoading ? (
            <div
              className={`py-8 text-center text-[12px] font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}
            >
              Đang tải danh sách khuyến mãi từ hệ thống...
            </div>
          ) : error ? (
            <div
              className={`p-3 rounded-xl border text-[12px] font-medium ${
                isDark ? 'bg-rose-950/30 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
              }`}
            >
              {error}
            </div>
          ) : filteredPromotions.length === 0 ? (
            <div
              className={`py-8 text-center text-[12px] font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}
            >
              Không tìm thấy chương trình khuyến mãi phù hợp.
            </div>
          ) : (
            filteredPromotions.map((promo) => {
              const eligible = isPromotionEligibleForCustomer(promo, customerVisits);
              const isSelected = Number(selectedPromotionId || 0) === promo.promotionId;
              const preview = calculateIosPromotionDiscount({
                promotion: promo,
                serviceAmount,
                upgradeAmount,
                comboAmount,
                productAmount,
                vatRate,
              });

              return (
                <button
                  key={promo.promotionId}
                  type="button"
                  disabled={!eligible}
                  data-testid={`promotion-option-${promo.promotionId}`}
                  onClick={() => {
                    onSelectPromotion(promo);
                    onClose();
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                    !eligible
                      ? isDark
                        ? 'bg-neutral-900/40 border-neutral-800/60 opacity-55 cursor-not-allowed'
                        : 'bg-neutral-50 border-neutral-200/70 opacity-60 cursor-not-allowed'
                      : isSelected
                        ? isDark
                          ? 'bg-amber-950/35 border-amber-500 shadow-sm cursor-pointer'
                          : 'bg-amber-50/80 border-amber-500 shadow-sm cursor-pointer'
                        : isDark
                          ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700 cursor-pointer active:scale-[0.99]'
                          : 'bg-white border-neutral-200 hover:border-amber-300 cursor-pointer active:scale-[0.99]'
                  }`}
                >
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[13px] font-extrabold tracking-tight">{promo.name}</span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500 text-black leading-none">
                          <Check className="w-3 h-3" /> Đang chọn
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-[10.5px] font-bold">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border leading-none ${
                          isDark
                            ? 'bg-emerald-950/50 border-emerald-700/70 text-emerald-300'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        }`}
                      >
                        {formatPromoRuleBadge(promo)}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md border leading-none ${
                          isDark
                            ? 'bg-neutral-800 border-neutral-700 text-neutral-300'
                            : 'bg-neutral-100 border-neutral-200 text-neutral-700'
                        }`}
                      >
                        {APPLY_SCOPE_LABELS[promo.promotionApply] || promo.promotionApply}
                      </span>
                      {promo.isOldUserDisabled && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border leading-none ${
                            eligible
                              ? isDark
                                ? 'bg-sky-950/50 border-sky-700 text-sky-300'
                                : 'bg-sky-50 border-sky-200 text-sky-800'
                              : isDark
                                ? 'bg-rose-950/50 border-rose-700 text-rose-300'
                                : 'bg-rose-50 border-rose-200 text-rose-700'
                          }`}
                        >
                          {!eligible && <Lock className="w-2.5 h-2.5" />}
                          <span>Chỉ khách mới</span>
                        </span>
                      )}
                      {!promo.isCreditAllowed && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border leading-none ${
                            isDark
                              ? 'bg-cyan-950/40 border-cyan-800 text-cyan-300'
                              : 'bg-cyan-50 border-cyan-200 text-cyan-800'
                          }`}
                        >
                          <Gem className="w-2.5 h-2.5" />
                          <span>Không dùng chung Kim Cương</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`text-[13px] font-black tabular-nums whitespace-nowrap ${
                        preview.totalDiscount > 0
                          ? isDark
                            ? 'text-emerald-400'
                            : 'text-emerald-700'
                          : isDark
                            ? 'text-neutral-500'
                            : 'text-neutral-400'
                      }`}
                    >
                      {preview.totalDiscount > 0 ? `-${preview.totalDiscount.toLocaleString('vi-VN')}đ` : '0đ'}
                    </div>
                    <div className={`text-[10px] font-medium ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {eligible ? 'Dự kiến giảm' : `Khách lần #${customerVisits}`}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
