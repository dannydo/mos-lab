'use client';

import React from 'react';
import { Info, QrCode, X } from 'lucide-react';
import { BookingItem, SERUM_TIERS_CVL } from '../../../state/mockData';
import { FeatherSvg } from '../../ui-kit/CvFeatherLabels';
import { formatCartProductDisplayName, isYeppeumProductItem } from './upsellCheckoutHelpers';

export interface UpsellSerumCardProps {
  isDark: boolean;
  isExistingComboLive: boolean;
  yeppeumCount: number;
  cartProducts?: NonNullable<BookingItem['cartProducts']>;
  onOpenQrScanner: () => void;
  onRemoveScannedUnit: (productIndex: number, inventoryWarehouseItemId?: number) => void;
  selectedSerumTier: (typeof SERUM_TIERS_CVL)[number];
  showStaffRewards: boolean;
  onOpenSerumInfoModal: () => void;
}

export function UpsellSerumCard({
  isDark,
  isExistingComboLive,
  yeppeumCount,
  cartProducts = [],
  onOpenQrScanner,
  onRemoveScannedUnit,
  selectedSerumTier,
  showStaffRewards,
  onOpenSerumInfoModal,
}: UpsellSerumCardProps) {
  const yeppeumEntryIdx = cartProducts.findIndex((p) => isYeppeumProductItem(p) && p.quantity > 0);
  const yeppeumItem = yeppeumEntryIdx >= 0 ? cartProducts[yeppeumEntryIdx] : undefined;
  const scannedYeppeumUnits = yeppeumItem?.scannedUnits || [];
  const otherProducts = cartProducts
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => !isYeppeumProductItem(item) && item.quantity > 0);

  const isSelected = yeppeumCount > 0 || otherProducts.length > 0;
  const unitPriceText =
    selectedSerumTier.price > 0 ? `${selectedSerumTier.price.toLocaleString('vi-VN')}đ` : 'Tặng kèm';
  const totalPrice = selectedSerumTier.price * yeppeumCount;
  const totalPriceText = selectedSerumTier.price > 0 ? `${totalPrice.toLocaleString('vi-VN')}đ` : '0đ (Tặng kèm)';

  return (
    <div>
      <div
        className={`text-[11px] font-extrabold ${
          isDark ? 'text-amber-400' : 'text-amber-800'
        } uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between`}
      >
        <span>{isExistingComboLive ? '3. DƯỠNG MI YEPPEUM KOREA' : '2. DƯỠNG MI YEPPEUM KOREA'}</span>
        {isSelected && (
          <span
            className={`text-[10.5px] font-black px-2 py-0.5 rounded-full tabular-nums ${
              isDark
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}
          >
            Đã chọn ×{yeppeumCount}
          </span>
        )}
      </div>

      <div
        className={`${
          isSelected
            ? isDark
              ? 'bg-neutral-900/95 border-[#FFB400] ring-1 ring-[#FFB400]/30'
              : 'bg-amber-50/30 border-[#FFB400] ring-1 ring-[#FFB400]/25'
            : isDark
              ? 'bg-neutral-900/90 border-neutral-800'
              : 'bg-white border-[#FFB400]/75'
        } border-2 rounded-2xl p-3.5 shadow-sm space-y-3 transition-colors`}
      >
        {/* Top Product Identity */}
        <div className="flex gap-3 items-start">
          <div className="w-16 h-16 rounded-xl bg-[#1C1C1E] border border-neutral-700/60 flex flex-col items-center justify-center p-2 shrink-0">
            <span className="text-[#FFB400] font-black text-[10px] tracking-wider text-center leading-tight">
              YEPPEUM
            </span>
            <span className="text-white text-[9.5px] font-bold mt-0.5 tracking-wider">KOREA</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[14.5px] font-extrabold text-[var(--mos-text)] leading-snug">
                Dưỡng Mi Yeppeum Korea
              </span>
              <span
                className={`text-[13px] font-black tabular-nums shrink-0 ${
                  isDark ? 'text-amber-300' : 'text-amber-800'
                }`}
              >
                {unitPriceText}
              </span>
            </div>
            <p className={`text-[11.5px] ${isDark ? 'text-neutral-400' : 'text-gray-600'} mt-1 leading-snug`}>
              Phục hồi nang mi thật, không làm thâm mắt. Giải pháp tuyệt vời cho những người vừa nối vừa dưỡng mi.
            </p>
          </div>
        </div>

        {/* Strict Per-Bottle QR Scanner + Serial Chips (44px+ Thumb Targets) */}
        {yeppeumCount === 0 ? (
          <button
            type="button"
            data-testid="upsell-serum-scan-qr-btn"
            onClick={onOpenQrScanner}
            className={`w-full min-h-[46px] rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 font-black text-[13.5px] touch-manipulation cursor-pointer active:scale-[0.98] transition-all shadow-xs ${
              isDark
                ? 'bg-gradient-to-r from-[#FFB400] to-[#FF9500] text-black hover:brightness-105'
                : 'bg-gradient-to-r from-[#FF9F0A] to-[#FF9500] text-white hover:brightness-105'
            }`}
          >
            <QrCode className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
            <span>Quét QR thêm cây · {unitPriceText}</span>
          </button>
        ) : (
          <div className="space-y-2.5">
            <div
              className={`rounded-xl border p-3 space-y-2.5 ${
                isDark ? 'bg-neutral-950/80 border-amber-500/40' : 'bg-white border-amber-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-black text-[var(--mos-text)] tabular-nums">
                  {yeppeumCount} cây đã gắn tem kho
                </span>
                <span className={`text-[13px] font-black tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  {totalPriceText}
                </span>
              </div>

              {scannedYeppeumUnits.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {scannedYeppeumUnits.map((unit) => {
                    const label =
                      unit.firstInventoryWarehouseOrderItemId > 0
                        ? `#${unit.firstInventoryWarehouseOrderItemId}`
                        : unit.scanCode;
                    return (
                      <button
                        key={unit.inventoryWarehouseItemId}
                        type="button"
                        data-testid={`upsell-serial-chip-${unit.inventoryWarehouseItemId}`}
                        onClick={() => onRemoveScannedUnit(yeppeumEntryIdx, unit.inventoryWarehouseItemId)}
                        aria-label={`Xóa cây ${label}`}
                        className={`min-h-[38px] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] font-bold tabular-nums touch-manipulation cursor-pointer active:scale-95 transition-colors ${
                          isDark
                            ? 'bg-neutral-900 border-neutral-700 text-neutral-100 hover:border-rose-500/70'
                            : 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:border-rose-400'
                        }`}
                      >
                        <span>{label}</span>
                        <X className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => yeppeumEntryIdx >= 0 && onRemoveScannedUnit(yeppeumEntryIdx)}
                  className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-500/40 text-rose-500 text-[11.5px] font-bold cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Bớt 1 cây</span>
                </button>
              )}

              <button
                type="button"
                data-testid="upsell-serum-scan-qr-btn"
                onClick={onOpenQrScanner}
                className={`w-full min-h-[44px] rounded-xl px-3.5 py-2 flex items-center justify-center gap-2 font-black text-[13px] touch-manipulation cursor-pointer active:scale-[0.98] transition-all shadow-2xs ${
                  isDark ? 'bg-[#FFB400] text-black hover:bg-[#ffc233]' : 'bg-[#FF9500] text-white hover:bg-[#f08c00]'
                }`}
              >
                <QrCode className="w-4 h-4 stroke-[2.5]" aria-hidden="true" />
                <span>Quét QR thêm cây</span>
              </button>
            </div>
          </div>
        )}

        {/* Non-Serum Scanned Catalog Products */}
        {otherProducts.length > 0 && (
          <div className="pt-2 border-t border-[var(--mos-surface-border)] space-y-2">
            {otherProducts.map(({ item, idx }) => {
              const units = item.scannedUnits || [];
              return (
                <div
                  key={`${item.productId}-${idx}`}
                  className={`rounded-xl border p-2.5 space-y-1.5 ${
                    isDark ? 'bg-neutral-950/70 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[12.5px] font-bold">
                    <span className="truncate text-[var(--mos-text)]">
                      {formatCartProductDisplayName(item.productName)} (×{item.quantity})
                    </span>
                    <span className="tabular-nums text-amber-500 shrink-0">
                      {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                  {units.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {units.map((unit) => {
                        const label =
                          unit.firstInventoryWarehouseOrderItemId > 0
                            ? `#${unit.firstInventoryWarehouseOrderItemId}`
                            : unit.scanCode;
                        return (
                          <button
                            key={unit.inventoryWarehouseItemId}
                            type="button"
                            onClick={() => onRemoveScannedUnit(idx, unit.inventoryWarehouseItemId)}
                            className={`min-h-[34px] inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold tabular-nums cursor-pointer ${
                              isDark
                                ? 'bg-neutral-900 border-neutral-700 text-neutral-200'
                                : 'bg-white border-neutral-200 text-neutral-800'
                            }`}
                          >
                            <span>{label}</span>
                            <X className="w-3 h-3 text-rose-500" aria-hidden="true" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Tier Selector & (i) Commission Info Bar */}
        {(showStaffRewards || selectedSerumTier.id !== 'serum-orig') && (
          <div className="pt-2 border-t border-[var(--mos-surface-border)]">
            {showStaffRewards ? (
              <button
                type="button"
                onClick={onOpenSerumInfoModal}
                title="Xem chi tiết thang thưởng"
                aria-label="Chọn mức giá và xem thang thưởng dưỡng mi"
                className={`w-full min-h-[44px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border transition-all text-left touch-manipulation cursor-pointer active:scale-[0.99] ${
                  isDark
                    ? 'bg-amber-950/30 border-amber-500/35 hover:bg-amber-950/50'
                    : 'bg-amber-50/80 border-amber-200/90 hover:bg-amber-100/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-[13px] font-black tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-950'} truncate`}
                  >
                    {selectedSerumTier.price > 0 ? `${selectedSerumTier.price.toLocaleString('vi-VN')}đ` : 'Tặng kèm'}
                  </span>
                  {selectedSerumTier.id !== 'serum-orig' && (
                    <span
                      className={`text-[10.5px] font-bold ${
                        isDark
                          ? 'text-neutral-300 bg-black/60 border-neutral-700'
                          : 'text-gray-600 bg-white border-gray-200'
                      } px-2 py-0.5 rounded-md border truncate`}
                    >
                      {selectedSerumTier.label.split('(')[0].trim()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-black ${
                      isDark
                        ? 'text-emerald-300 bg-emerald-950/50 border-emerald-500/40'
                        : 'text-emerald-700 bg-white border-emerald-200'
                    } px-2 py-0.5 rounded-md border tabular-nums`}
                  >
                    +{Math.round(selectedSerumTier.cvBonus / 1000)}
                    <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                  </span>
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center border ${
                      isDark
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                        : 'bg-amber-100 text-amber-900 border-amber-300'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                </div>
              </button>
            ) : (
              <div
                className={`min-h-[40px] flex items-center justify-between gap-2 px-3 py-2 rounded-xl border ${
                  isDark ? 'bg-amber-950/30 border-amber-500/30' : 'bg-amber-50/80 border-amber-200/90'
                }`}
              >
                <span
                  className={`text-[13px] font-black tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-950'} truncate`}
                >
                  {selectedSerumTier.price > 0 ? `${selectedSerumTier.price.toLocaleString('vi-VN')}đ` : 'Tặng kèm'}
                </span>
                <span
                  className={`text-[10.5px] font-bold ${
                    isDark
                      ? 'text-neutral-300 bg-black/60 border-neutral-700'
                      : 'text-gray-600 bg-white border-gray-200'
                  } px-2 py-0.5 rounded-md border truncate`}
                >
                  {selectedSerumTier.label.split('(')[0].trim()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
