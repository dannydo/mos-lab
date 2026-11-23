'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { resolveNormalizedPaymentBreakdown, type IosPaymentBreakdown, type IosPaymentMethod } from '@mos-lab/shared';
import { Heart, QrCode, ShieldCheck, X } from 'lucide-react';
import type { BookingItem } from '../../state/mockData';
import { buildCheckoutVietQrInfo } from '../../state/iosBillingMath';
import { compressLashImage } from '../../utils/imageCompressor';
import type { VietQrSplitMode } from '../screens/checkout/CheckoutVietQrModal';
import { PreCheckoutQrSection } from './PreCheckoutQrSection';

export interface SavePreCheckoutPaymentPayload {
  preCheckoutServicePaidAmount: number;
  preCheckoutTipAmount: number;
  preCheckoutPaymentMethod: IosPaymentMethod;
  preCheckoutPaymentBreakdown: IosPaymentBreakdown;
  preCheckoutQrSplitMode: VietQrSplitMode;
  preCheckoutTransferProofPhoto?: string;
  preCheckoutTipTransferProofPhoto?: string;
  preCheckoutNote?: string;
}

export interface PreCheckoutPaymentModalProps {
  open: boolean;
  isDark: boolean;
  booking?: BookingItem;
  quotedServiceTotalWithVat: number;
  onClose: () => void;
  onSave: (payload: SavePreCheckoutPaymentPayload) => Promise<void> | void;
}

const TIP_PRESETS = [
  { value: 0, label: '0đ' },
  { value: 50000, label: '50K' },
  { value: 100000, label: '100K' },
  { value: 200000, label: '200K' },
  { value: 500000, label: '500K' },
];

export function PreCheckoutPaymentModal({
  open,
  isDark,
  booking,
  quotedServiceTotalWithVat,
  onClose,
  onSave,
}: PreCheckoutPaymentModalProps) {
  const safeQuoted = Math.max(0, Math.round(quotedServiceTotalWithVat || 0));
  const [servicePaidAmount, setServicePaidAmount] = useState<number>(
    booking?.billing?.preCheckoutServicePaidAmount ?? safeQuoted
  );
  const [customServiceStr, setCustomServiceStr] = useState<string>('');
  const [isCustomServiceOpen, setIsCustomServiceOpen] = useState<boolean>(false);
  const [tipAmount, setTipAmount] = useState<number>(
    booking?.billing?.preCheckoutTipAmount ?? booking?.billing?.tipAmount ?? 0
  );
  const [customTipStr, setCustomTipStr] = useState<string>('');
  const [isCustomTipOpen, setIsCustomTipOpen] = useState<boolean>(false);
  const [method, setMethod] = useState<'VIETQR' | 'POS' | 'CASH'>(
    booking?.billing?.preCheckoutPaymentMethod === 'POS' || booking?.billing?.preCheckoutPaymentMethod === 'CASH'
      ? booking.billing.preCheckoutPaymentMethod
      : 'VIETQR'
  );
  const [qrSplitMode, setQrSplitMode] = useState<VietQrSplitMode>(
    booking?.billing?.preCheckoutQrSplitMode === 'SEPARATE' || booking?.billing?.qrSplitTipSeparate
      ? 'SEPARATE'
      : 'COMBINED'
  );
  const [serviceProof, setServiceProof] = useState<string | null>(
    booking?.billing?.preCheckoutTransferProofPhoto || booking?.billing?.transferProofPhoto || null
  );
  const [tipProof, setTipProof] = useState<string | null>(
    booking?.billing?.preCheckoutTipTransferProofPhoto || booking?.billing?.tipTransferProofPhoto || null
  );
  const [note, setNote] = useState<string>(booking?.billing?.preCheckoutNote || '');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const serviceFileRef = useRef<HTMLInputElement>(null);
  const tipFileRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef<boolean>(false);
  const initializedBookingIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }
    const isOpeningNow = !wasOpenRef.current;
    const isBookingSwitched = initializedBookingIdRef.current !== booking?.id;
    if (!isOpeningNow && !isBookingSwitched) return;

    wasOpenRef.current = true;
    initializedBookingIdRef.current = booking?.id;

    const savedService = booking?.billing?.preCheckoutServicePaidAmount ?? 0;
    const savedTip = booking?.billing?.preCheckoutTipAmount ?? 0;
    const hasSavedPreCheckout = savedService + savedTip > 0;
    const initService = hasSavedPreCheckout ? savedService : safeQuoted;
    setServicePaidAmount(initService);
    setCustomServiceStr(initService > 0 ? initService.toLocaleString('vi-VN') : '');
    setIsCustomServiceOpen(initService > 0 && initService !== safeQuoted);

    const initTip = hasSavedPreCheckout ? savedTip : (booking?.billing?.tipAmount ?? 0);
    setTipAmount(initTip);
    setCustomTipStr(initTip > 0 ? initTip.toLocaleString('vi-VN') : '');
    setIsCustomTipOpen(initTip > 0 && ![0, 50000, 100000, 200000, 500000].includes(initTip));

    const savedMethod = booking?.billing?.preCheckoutPaymentMethod;
    setMethod(savedMethod === 'POS' || savedMethod === 'CASH' ? savedMethod : 'VIETQR');
    setQrSplitMode(
      booking?.billing?.preCheckoutQrSplitMode === 'SEPARATE' || booking?.billing?.qrSplitTipSeparate
        ? 'SEPARATE'
        : 'COMBINED'
    );
    setServiceProof(booking?.billing?.preCheckoutTransferProofPhoto || booking?.billing?.transferProofPhoto || null);
    setTipProof(booking?.billing?.preCheckoutTipTransferProofPhoto || booking?.billing?.tipTransferProofPhoto || null);
    setNote(booking?.billing?.preCheckoutNote || '');
    setSaveError(null);
  }, [open, booking, safeQuoted]);

  const totalToCollect = Math.max(0, servicePaidAmount + tipAmount);
  const qrInfo = useMemo(
    () =>
      buildCheckoutVietQrInfo({
        booking,
        tipAmount,
        vietQrTransferAmount: totalToCollect,
        tipTransferAmount: tipAmount,
      }),
    [booking, tipAmount, totalToCollect]
  );

  if (!open) return null;

  const canSplitTwoQr = servicePaidAmount > 0 && tipAmount > 0;
  const effectiveQrMode: VietQrSplitMode = canSplitTwoQr ? qrSplitMode : 'COMBINED';

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 1800);
    }
  };

  const handlePickPhoto = async (e: React.ChangeEvent<HTMLInputElement>, target: 'service' | 'tip') => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressLashImage(file, 1024, 0.72);
      if (target === 'service') setServiceProof(compressed);
      else setTipProof(compressed);
    } catch {
      // ignore compression failure
    }
    e.target.value = '';
  };

  const handleConfirmSave = async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      const normalized = resolveNormalizedPaymentBreakdown(totalToCollect, method);
      await onSave({
        preCheckoutServicePaidAmount: servicePaidAmount,
        preCheckoutTipAmount: tipAmount,
        preCheckoutPaymentMethod: normalized.paymentMethod,
        preCheckoutPaymentBreakdown: normalized.breakdown,
        preCheckoutQrSplitMode: effectiveQrMode,
        preCheckoutTransferProofPhoto: serviceProof ?? '',
        preCheckoutTipTransferProofPhoto: tipProof ?? '',
        preCheckoutNote: note.trim(),
      });
      onClose();
    } catch (err) {
      setSaveError(
        err instanceof Error && err.message ? err.message : 'Không thể lưu mục thanh toán trước. Vui lòng thử lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-3 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Thu tiền và Tip trước khi vào phòng mi"
    >
      <div
        className={`${
          isDark ? 'bg-[#141416] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-gray-900'
        } w-full max-w-[420px] max-h-[92vh] rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between gap-2 ${
            isDark ? 'border-neutral-800 bg-neutral-950' : 'border-gray-200 bg-amber-50/70'
          }`}
        >
          <div className="min-w-0">
            <div className="text-[14px] font-black tracking-tight flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-[#FFB400] shrink-0" />
              <span>Thu Tiền &amp; Tip Trước Khi Vào Phòng</span>
            </div>
            <div className="text-[11px] text-[var(--mos-text-muted)] font-semibold truncate">
              {booking?.customerName || 'Khách hàng'} · #{booking?.orderNumber || booking?.id}
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className={`p-1.5 rounded-full border cursor-pointer ${
              isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-300' : 'bg-white border-gray-300 text-gray-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-3.5 space-y-3 overflow-y-auto flex-1">
          {/* 1. Tiền Dịch Vụ thu trước */}
          <div
            className={`rounded-2xl border p-3 space-y-2 ${
              isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#FF9500]">
                1. Tiền Dịch Vụ / Gói Thu Trước (gồm VAT 8%)
              </span>
              <span className="text-[12px] font-black tabular-nums">{servicePaidAmount.toLocaleString('vi-VN')}đ</span>
            </div>

            <div className={`grid ${safeQuoted > 0 ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5`}>
              {safeQuoted > 0 && (
                <button
                  type="button"
                  data-testid="precheckout-service-full-btn"
                  onClick={() => {
                    setServicePaidAmount(safeQuoted);
                    setIsCustomServiceOpen(false);
                  }}
                  className={`py-2 px-1.5 rounded-xl border text-[10.5px] font-extrabold tabular-nums cursor-pointer truncate ${
                    servicePaidAmount === safeQuoted && !isCustomServiceOpen
                      ? 'bg-[#FFB400] border-[#FFB400] text-black'
                      : isDark
                        ? 'bg-neutral-950 border-neutral-800 text-neutral-300'
                        : 'bg-white border-gray-200 text-gray-800'
                  }`}
                >
                  Đủ {safeQuoted.toLocaleString('vi-VN')}đ
                </button>
              )}
              <button
                type="button"
                data-testid="precheckout-service-zero-btn"
                onClick={() => {
                  setServicePaidAmount(0);
                  setIsCustomServiceOpen(false);
                }}
                className={`py-2 px-2 rounded-xl border text-[11px] font-extrabold cursor-pointer ${
                  servicePaidAmount === 0 && !isCustomServiceOpen
                    ? 'bg-emerald-500 border-emerald-500 text-black'
                    : isDark
                      ? 'bg-neutral-950 border-neutral-800 text-neutral-300'
                      : 'bg-white border-gray-200 text-gray-800'
                }`}
              >
                0đ (Chỉ Tip)
              </button>
              <button
                type="button"
                data-testid="precheckout-service-custom-btn"
                onClick={() => setIsCustomServiceOpen((prev) => !prev)}
                className={`py-2 px-2 rounded-xl border text-[11px] font-extrabold cursor-pointer ${
                  isCustomServiceOpen
                    ? 'bg-purple-600 border-purple-500 text-white'
                    : isDark
                      ? 'bg-neutral-950 border-neutral-800 text-purple-300'
                      : 'bg-white border-purple-200 text-purple-800'
                }`}
              >
                {isCustomServiceOpen ? 'Đóng' : 'Nhập khác'}
              </button>
            </div>

            {isCustomServiceOpen && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  inputMode="numeric"
                  data-testid="precheckout-service-custom-input"
                  value={customServiceStr}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    const val = digits ? Number(digits) : 0;
                    setCustomServiceStr(digits ? val.toLocaleString('vi-VN') : '');
                    setServicePaidAmount(val);
                  }}
                  placeholder="Nhập số tiền dịch vụ thu trước..."
                  className={`flex-1 px-3 py-2 rounded-xl border text-[13px] font-black tabular-nums ${
                    isDark ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-gray-300 text-black'
                  }`}
                />
                <span className="text-[11px] font-bold text-[var(--mos-text-muted)]">VNĐ</span>
              </div>
            )}
          </div>

          {/* 2. Tiền Tip cho Chuyên Viên */}
          <div
            className={`rounded-2xl border p-3 space-y-2 ${
              isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                <span>2. Tiền Tip Chuyên Viên (Miễn VAT)</span>
              </span>
              <span className="text-[12px] font-black text-rose-500 tabular-nums">
                {tipAmount.toLocaleString('vi-VN')}đ
              </span>
            </div>

            <div className="grid grid-cols-6 gap-1">
              {TIP_PRESETS.map((p) => {
                const selected = tipAmount === p.value && !isCustomTipOpen;
                return (
                  <button
                    key={p.value}
                    type="button"
                    data-testid={`precheckout-tip-${p.value}`}
                    onClick={() => {
                      setTipAmount(p.value);
                      setIsCustomTipOpen(false);
                    }}
                    className={`py-2 rounded-xl text-[11px] font-extrabold tabular-nums cursor-pointer ${
                      selected
                        ? 'bg-rose-500 text-white shadow-xs'
                        : isDark
                          ? 'bg-neutral-950 border border-neutral-800 text-neutral-300'
                          : 'bg-white border border-gray-200 text-gray-800'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
              <button
                type="button"
                data-testid="precheckout-tip-custom-btn"
                onClick={() => setIsCustomTipOpen((prev) => !prev)}
                className={`py-2 rounded-xl text-[10.5px] font-extrabold cursor-pointer ${
                  isCustomTipOpen
                    ? 'bg-purple-600 text-white'
                    : isDark
                      ? 'bg-neutral-950 border border-purple-800 text-purple-300'
                      : 'bg-purple-50 border border-purple-200 text-purple-800'
                }`}
              >
                Khác
              </button>
            </div>

            {isCustomTipOpen && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  inputMode="numeric"
                  data-testid="precheckout-tip-custom-input"
                  value={customTipStr}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    const val = digits ? Number(digits) : 0;
                    setCustomTipStr(digits ? val.toLocaleString('vi-VN') : '');
                    setTipAmount(val);
                  }}
                  placeholder="Nhập tiền tip tùy ý (vd: 300.000)"
                  className={`flex-1 px-3 py-2 rounded-xl border text-[13px] font-black tabular-nums ${
                    isDark ? 'bg-neutral-950 border-neutral-700 text-white' : 'bg-white border-gray-300 text-black'
                  }`}
                />
                <span className="text-[11px] font-bold text-[var(--mos-text-muted)]">VNĐ</span>
              </div>
            )}

            {tipAmount >= 20000 && (
              <div className="text-[10.5px] font-bold text-emerald-500">
                ✓ Tip ≥ 20K (+1 lượt Tip Rate) · Cộng thẳng vào tổng hóa đơn
              </div>
            )}
          </div>

          {/* 3. Hình thức & Mã QR */}
          {totalToCollect > 0 && (
            <div
              className={`rounded-2xl border p-3 space-y-2.5 ${
                isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-500">
                  3. Hình Thức Thu Trước
                </span>
                <span className="text-[13px] font-black text-[#FFB400] tabular-nums">
                  {totalToCollect.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {(['VIETQR', 'POS', 'CASH'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    data-testid={`precheckout-method-${m}`}
                    onClick={() => setMethod(m)}
                    className={`py-2 rounded-xl border text-[11px] font-extrabold cursor-pointer ${
                      method === m
                        ? 'bg-emerald-500 border-emerald-500 text-black'
                        : isDark
                          ? 'bg-neutral-950 border-neutral-800 text-neutral-300'
                          : 'bg-white border-gray-200 text-gray-800'
                    }`}
                  >
                    {m === 'VIETQR' ? 'Chuyển khoản QR' : m === 'POS' ? 'Thẻ POS' : 'Tiền mặt'}
                  </button>
                ))}
              </div>

              {method === 'VIETQR' && (
                <PreCheckoutQrSection
                  isDark={isDark}
                  canSplitTwoQr={canSplitTwoQr}
                  effectiveQrMode={effectiveQrMode}
                  totalToCollect={totalToCollect}
                  qrInfo={qrInfo}
                  copySuccess={copySuccess}
                  serviceProof={serviceProof}
                  tipProof={tipProof}
                  onChangeQrSplitMode={setQrSplitMode}
                  onCopy={handleCopy}
                  onPickServiceProof={() => serviceFileRef.current?.click()}
                  onPickTipProof={() => tipFileRef.current?.click()}
                  onClearServiceProof={() => setServiceProof(null)}
                  onClearTipProof={() => setTipProof(null)}
                />
              )}

              <input
                ref={serviceFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => void handlePickPhoto(e, 'service')}
              />
              <input
                ref={tipFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => void handlePickPhoto(e, 'tip')}
              />
            </div>
          )}

          {/* Ghi chú */}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú thu trước (ví dụ: Khách CK trước để làm xong về luôn)..."
            className={`w-full px-3 py-2 rounded-xl border text-[11.5px] ${
              isDark ? 'bg-neutral-900 border-neutral-800 text-white' : 'bg-white border-gray-200 text-black'
            }`}
          />
        </div>

        {/* Footer CTA */}
        <div
          className={`p-3 border-t space-y-1.5 ${
            isDark ? 'border-neutral-800 bg-neutral-950' : 'border-gray-200 bg-gray-50'
          }`}
        >
          {saveError && (
            <div
              data-testid="precheckout-save-error"
              role="alert"
              className={`px-3 py-2 rounded-xl border text-[11.5px] font-bold ${
                isDark ? 'bg-rose-950/60 border-rose-700/70 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-800'
              }`}
            >
              {saveError}
            </div>
          )}
          <button
            type="button"
            data-testid="save-pre-checkout-payment-btn"
            disabled={isSaving}
            onClick={() => void handleConfirmSave()}
            className="w-full py-3 px-4 rounded-2xl bg-[#FFB400] hover:brightness-105 text-black font-black text-[13.5px] shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isSaving
                ? 'ĐANG LƯU...'
                : totalToCollect > 0
                  ? `LƯU THU TRƯỚC ${totalToCollect.toLocaleString('vi-VN')}đ & TIẾP TỤC`
                  : 'XÓA / ĐẶT LẠI MỤC THU TRƯỚC'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
