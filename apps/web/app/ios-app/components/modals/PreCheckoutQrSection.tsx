'use client';

import React from 'react';
import type { VietQrSplitMode } from '../screens/checkout/CheckoutVietQrModal';

interface PreCheckoutQrInfo {
  vietQrUrl: string;
  qrTransferContent: string;
  serviceQrAmount: number;
  serviceQrUrl: string;
  serviceQrContent: string;
  tipQrAmount: number;
  tipQrUrl: string;
  tipQrContent: string;
  isTipOnlyQr: boolean;
}

interface SplitQrTileProps {
  isDark: boolean;
  variant: 'service' | 'tip';
  title: string;
  qrUrl: string;
  amount: number;
  content: string;
  copyKey: string;
  copySuccess: string | null;
  proof: string | null;
  emptyLabel: string;
  savedLabel: string;
  removeAriaLabel: string;
  onCopy: (text: string, label: string) => void;
  onPickProof: () => void;
  onRemoveProof: () => void;
}

function SplitQrTile({
  isDark,
  variant,
  title,
  qrUrl,
  amount,
  content,
  copyKey,
  copySuccess,
  proof,
  emptyLabel,
  savedLabel,
  removeAriaLabel,
  onCopy,
  onPickProof,
  onRemoveProof,
}: SplitQrTileProps) {
  const isTip = variant === 'tip';
  return (
    <div
      className={`rounded-xl border p-2 space-y-1.5 ${
        isDark
          ? isTip
            ? 'bg-neutral-950 border-rose-700/40'
            : 'bg-neutral-950 border-amber-700/40'
          : isTip
            ? 'bg-white border-rose-200'
            : 'bg-white border-amber-200'
      }`}
    >
      <div className={`text-[10px] font-black uppercase ${isTip ? 'text-rose-500' : 'text-[#FF9500]'}`}>{title}</div>
      <div className="bg-white p-1 rounded-lg border border-gray-200 aspect-square flex items-center justify-center">
        <img src={qrUrl} alt={title} className="w-full h-full object-contain" />
      </div>
      <div className={`text-[11px] font-black tabular-nums ${isTip ? 'text-rose-500' : 'text-[#E11D48]'}`}>
        {amount.toLocaleString('vi-VN')}đ
      </div>
      <button
        type="button"
        onClick={() => onCopy(content, copyKey)}
        className="w-full text-[10px] font-bold py-1 px-1.5 rounded bg-gray-500/10 truncate cursor-pointer"
      >
        {copySuccess === copyKey ? '✓ Đã chép' : content}
      </button>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onPickProof}
          className={`flex-1 text-[10px] font-bold py-1 rounded-lg border border-dashed cursor-pointer ${
            isTip ? 'border-rose-500/60 text-rose-400' : 'border-sky-500/60 text-sky-400'
          }`}
        >
          {proof ? savedLabel : emptyLabel}
        </button>
        {proof && (
          <button
            type="button"
            aria-label={removeAriaLabel}
            onClick={onRemoveProof}
            className="px-1.5 py-1 text-[10px] font-bold rounded-lg border border-rose-500/40 text-rose-400 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export interface PreCheckoutQrSectionProps {
  isDark: boolean;
  canSplitTwoQr: boolean;
  effectiveQrMode: VietQrSplitMode;
  totalToCollect: number;
  qrInfo: PreCheckoutQrInfo;
  copySuccess: string | null;
  serviceProof: string | null;
  tipProof: string | null;
  onChangeQrSplitMode: (mode: VietQrSplitMode) => void;
  onCopy: (text: string, label: string) => void;
  onPickServiceProof: () => void;
  onPickTipProof: () => void;
  onClearServiceProof: () => void;
  onClearTipProof: () => void;
}

export function PreCheckoutQrSection({
  isDark,
  canSplitTwoQr,
  effectiveQrMode,
  totalToCollect,
  qrInfo,
  copySuccess,
  serviceProof,
  tipProof,
  onChangeQrSplitMode,
  onCopy,
  onPickServiceProof,
  onPickTipProof,
  onClearServiceProof,
  onClearTipProof,
}: PreCheckoutQrSectionProps) {
  const singleProof = qrInfo.isTipOnlyQr ? tipProof : serviceProof;

  return (
    <div className="space-y-2 pt-1">
      {canSplitTwoQr && (
        <div
          className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${
            isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-gray-200'
          }`}
        >
          <button
            type="button"
            data-testid="precheckout-qr-combined-btn"
            onClick={() => onChangeQrSplitMode('COMBINED')}
            className={`py-1.5 rounded-lg text-[10.5px] font-extrabold cursor-pointer ${
              effectiveQrMode === 'COMBINED' ? 'bg-[#FFB400] text-black' : 'text-[var(--mos-text-muted)]'
            }`}
          >
            1 QR Gộp (DV + Tip)
          </button>
          <button
            type="button"
            data-testid="precheckout-qr-separate-btn"
            onClick={() => onChangeQrSplitMode('SEPARATE')}
            className={`py-1.5 rounded-lg text-[10.5px] font-extrabold cursor-pointer ${
              effectiveQrMode === 'SEPARATE' ? 'bg-emerald-500 text-black' : 'text-[var(--mos-text-muted)]'
            }`}
          >
            Tách 2 QR (DV · Tip riêng)
          </button>
        </div>
      )}

      {effectiveQrMode === 'SEPARATE' && canSplitTwoQr ? (
        <div className="grid grid-cols-2 gap-2" data-testid="precheckout-split-qr-grid">
          <SplitQrTile
            isDark={isDark}
            variant="service"
            title="QR Dịch Vụ"
            qrUrl={qrInfo.serviceQrUrl}
            amount={qrInfo.serviceQrAmount}
            content={qrInfo.serviceQrContent}
            copyKey="svc"
            copySuccess={copySuccess}
            proof={serviceProof}
            emptyLabel="📷 Bill DV"
            savedLabel="✓ Đã có bill DV"
            removeAriaLabel="Xóa ảnh bill dịch vụ"
            onCopy={onCopy}
            onPickProof={onPickServiceProof}
            onRemoveProof={onClearServiceProof}
          />
          <SplitQrTile
            isDark={isDark}
            variant="tip"
            title="♥ QR Tiền Tip"
            qrUrl={qrInfo.tipQrUrl}
            amount={qrInfo.tipQrAmount}
            content={qrInfo.tipQrContent}
            copyKey="tip"
            copySuccess={copySuccess}
            proof={tipProof}
            emptyLabel="📷 Bill Tip"
            savedLabel="✓ Đã có bill Tip"
            removeAriaLabel="Xóa ảnh bill tip"
            onCopy={onCopy}
            onPickProof={onPickTipProof}
            onRemoveProof={onClearTipProof}
          />
        </div>
      ) : (
        <div
          className={`rounded-xl border p-2.5 flex items-center gap-3 ${
            isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-white border-gray-200'
          }`}
        >
          <div className="bg-white p-1 rounded-xl border border-gray-200 w-28 h-28 shrink-0 flex items-center justify-center">
            <img src={qrInfo.vietQrUrl} alt="VietQR Thu Trước" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1 min-w-0 space-y-1 text-[11px]">
            <div className="font-black text-[#E11D48] text-[13.5px] tabular-nums">
              {totalToCollect.toLocaleString('vi-VN')} VNĐ
            </div>
            <div className="font-bold text-[var(--mos-text-muted)]">VCB · 1024731897</div>
            <button
              type="button"
              onClick={() => onCopy(qrInfo.qrTransferContent, 'single')}
              className="text-left font-black text-[#E11D48] bg-rose-500/10 px-2 py-0.5 rounded-md truncate max-w-full cursor-pointer"
            >
              {copySuccess === 'single' ? '✓ Đã sao chép nội dung' : `ND: ${qrInfo.qrTransferContent}`}
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => (qrInfo.isTipOnlyQr ? onPickTipProof() : onPickServiceProof())}
                className="flex-1 text-center text-[10.5px] font-bold py-1 px-2 rounded-lg border border-dashed border-sky-500/60 text-sky-400 cursor-pointer"
              >
                {singleProof ? '✓ Đã đính kèm ảnh bill CK' : '📷 Chụp ảnh bill CK (tùy chọn)'}
              </button>
              {singleProof && (
                <button
                  type="button"
                  aria-label="Xóa ảnh bill chuyển khoản"
                  onClick={() => (qrInfo.isTipOnlyQr ? onClearTipProof() : onClearServiceProof())}
                  className="px-2 py-1 text-[10.5px] font-bold rounded-lg border border-rose-500/40 text-rose-400 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
