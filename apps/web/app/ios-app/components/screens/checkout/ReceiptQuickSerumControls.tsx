'use client';

import React from 'react';
import type { IosScannedProductUnit } from '@mos-lab/shared';
import { QrCode, X } from 'lucide-react';

interface ReceiptScannedSerialChipsProps {
  isDark: boolean;
  productName: string;
  scannedUnits?: IosScannedProductUnit[];
  onRemoveUnit: (inventoryWarehouseItemId?: number) => void;
  onOpenScanner?: () => void;
}

export function ReceiptScannedSerialChips({
  isDark,
  productName,
  scannedUnits = [],
  onRemoveUnit,
  onOpenScanner,
}: ReceiptScannedSerialChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {scannedUnits.length > 0 ? (
        scannedUnits.map((unit) => {
          const label =
            unit.firstInventoryWarehouseOrderItemId > 0 ? `#${unit.firstInventoryWarehouseOrderItemId}` : unit.scanCode;
          return (
            <button
              key={unit.inventoryWarehouseItemId}
              type="button"
              onClick={() => onRemoveUnit(unit.inventoryWarehouseItemId)}
              aria-label={`Xóa ${productName} tem ${label}`}
              data-testid={`checkout-serial-chip-${unit.inventoryWarehouseItemId}`}
              className={`min-h-[34px] inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold tabular-nums touch-manipulation cursor-pointer active:scale-95 transition-colors ${
                isDark
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-100 hover:border-rose-500/70'
                  : 'bg-neutral-100 border-neutral-200 text-neutral-800 hover:border-rose-400'
              }`}
            >
              <span>{label}</span>
              <X className="w-3 h-3 text-rose-500" aria-hidden="true" />
            </button>
          );
        })
      ) : (
        <button
          type="button"
          onClick={() => onRemoveUnit()}
          aria-label={`Bớt 1 ${productName}`}
          data-testid="checkout-product-remove-legacy-btn"
          className={`min-h-[34px] inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold touch-manipulation cursor-pointer active:scale-95 transition-colors ${
            isDark
              ? 'bg-neutral-800 border-neutral-700 text-rose-300 hover:border-rose-500/70'
              : 'bg-rose-50 border-rose-200 text-rose-700 hover:border-rose-400'
          }`}
        >
          <span>Bớt 1</span>
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      )}

      {onOpenScanner && (
        <button
          type="button"
          onClick={onOpenScanner}
          aria-label={`Quét QR thêm ${productName}`}
          data-testid="checkout-product-scan-more-btn"
          className={`min-h-[34px] inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-[11px] font-black touch-manipulation cursor-pointer active:scale-95 transition-colors ${
            isDark
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
              : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
          }`}
        >
          <QrCode className="w-3.5 h-3.5" aria-hidden="true" />
          <span>+ Quét QR</span>
        </button>
      )}
    </div>
  );
}

interface ReceiptQuickScanProductRowProps {
  isDark: boolean;
  onOpenScanner: () => void;
}

export function ReceiptQuickScanProductRow({ isDark, onOpenScanner }: ReceiptQuickScanProductRowProps) {
  return (
    <div className={`px-3.5 py-2.5 ${isDark ? 'bg-amber-950/15' : 'bg-amber-50/40'}`}>
      <button
        type="button"
        data-testid="checkout-quick-scan-qr-btn"
        onClick={onOpenScanner}
        className={`w-full min-h-[44px] rounded-xl px-3.5 py-2 border flex items-center justify-between gap-2 touch-manipulation cursor-pointer active:scale-[0.99] transition-all ${
          isDark
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 hover:bg-amber-500/25'
            : 'bg-white border-amber-300 text-amber-950 hover:bg-amber-50 shadow-2xs'
        }`}
      >
        <span className="inline-flex items-center gap-2 text-[12.5px] font-extrabold min-w-0 truncate">
          <span
            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
              isDark ? 'bg-[#FFB400] text-black' : 'bg-[#FF9500] text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5 stroke-[2.5]" aria-hidden="true" />
          </span>
          <span className="truncate">Quét QR thêm sản phẩm</span>
        </span>
        <span className="text-[11px] font-black shrink-0 text-[#FF9500]">Dưỡng Mi / Bán lẻ</span>
      </button>
    </div>
  );
}
