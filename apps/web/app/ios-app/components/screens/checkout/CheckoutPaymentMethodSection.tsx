'use client';

import React, { useState } from 'react';
import type { IosPaymentBreakdown } from '@mos-lab/shared';
import { IosCloudSyncBadge, IosCloudSyncStatus } from '../../ui-kit/IosCloudSyncBadge';

export type PaymentChannelKey = 'VIETQR' | 'POS' | 'CASH';

export interface CheckoutPaymentMethodSectionProps {
  isDark: boolean;
  showStaffRewards?: boolean;
  canDirectCounterSettle?: boolean;
  selectedMethod: PaymentChannelKey;
  onSelectMethod: (method: PaymentChannelKey) => void;
  isSplitMode: boolean;
  onToggleSplitMode: (nextSplit: boolean) => void;
  paymentBreakdown: IosPaymentBreakdown;
  onChangeSplitAmount: (channel: PaymentChannelKey, amount: number) => void;
  finalGrandTotal: number;
  effectiveDiamondUsed: number;
  diamondDiscountAmount: number;
  transferProofPhoto: string | null;
  proofCloudSyncStatus: IosCloudSyncStatus;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCaptureProof: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProceed: () => void;
}

const PAYMENT_CHANNELS: ReadonlyArray<{
  id: PaymentChannelKey;
  field: keyof IosPaymentBreakdown;
  label: string;
}> = [
  { id: 'VIETQR', field: 'vietqrAmount', label: 'Chuyển khoản QR (Bank)' },
  { id: 'POS', field: 'posAmount', label: 'Thẻ ngân hàng (POS)' },
  { id: 'CASH', field: 'cashAmount', label: 'Tiền mặt (Cash)' },
];

export function CheckoutPaymentMethodSection({
  isDark,
  showStaffRewards = false,
  canDirectCounterSettle = false,
  selectedMethod,
  onSelectMethod,
  isSplitMode,
  onToggleSplitMode,
  paymentBreakdown,
  onChangeSplitAmount,
  finalGrandTotal,
  effectiveDiamondUsed,
  diamondDiscountAmount,
  transferProofPhoto,
  proofCloudSyncStatus,
  fileInputRef,
  onCaptureProof,
  onProceed,
}: CheckoutPaymentMethodSectionProps) {
  const [focusedField, setFocusedField] = useState<PaymentChannelKey | null>(null);
  const [draftAmountStr, setDraftAmountStr] = useState<string>('');

  const vietqrAmount = isSplitMode
    ? Math.max(0, Math.round(paymentBreakdown.vietqrAmount || 0))
    : selectedMethod === 'VIETQR'
      ? finalGrandTotal
      : 0;
  const posAmount = isSplitMode
    ? Math.max(0, Math.round(paymentBreakdown.posAmount || 0))
    : selectedMethod === 'POS'
      ? finalGrandTotal
      : 0;
  const cashAmount = isSplitMode
    ? Math.max(0, Math.round(paymentBreakdown.cashAmount || 0))
    : selectedMethod === 'CASH'
      ? finalGrandTotal
      : 0;

  const allocatedTotal = vietqrAmount + posAmount + cashAmount;
  const remainingDelta = finalGrandTotal - allocatedTotal;
  const isAllocationValid = finalGrandTotal === 0 || allocatedTotal === finalGrandTotal;
  const hasVietqr = vietqrAmount > 0;
  const hasPos = posAmount > 0;
  const hasCash = cashAmount > 0;
  const activeChannelCount = [hasVietqr, hasPos, hasCash].filter(Boolean).length;
  const isPureVietqrOrZero = finalGrandTotal === 0 || (!hasPos && !hasCash);
  const needsPosProof = finalGrandTotal > 0 && hasPos && !transferProofPhoto;
  const isActionDisabled = (finalGrandTotal > 0 && !isAllocationValid) || needsPosProof;

  const getChannelAmount = (id: PaymentChannelKey): number => {
    if (id === 'VIETQR') return vietqrAmount;
    if (id === 'POS') return posAmount;
    return cashAmount;
  };

  return (
    <>
      {/* Section 2: Hình Thức Thanh Toán */}
      <div>
        <div className="flex items-center justify-between px-1 mb-1.5 gap-2">
          <span className="text-[11px] font-black text-neutral-400 uppercase tracking-wider">Hình Thức Thanh Toán</span>
          {finalGrandTotal > 0 && (
            <button
              type="button"
              data-testid="toggle-split-payment-btn"
              onClick={() => onToggleSplitMode(!isSplitMode)}
              className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer active:scale-95 ${
                isSplitMode
                  ? isDark
                    ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : isDark
                    ? 'bg-neutral-900 border-neutral-700 text-amber-300 hover:bg-neutral-800'
                    : 'bg-white border-amber-300 text-amber-800 hover:bg-amber-50'
              }`}
            >
              {isSplitMode ? `✓ Kết hợp (${activeChannelCount} loại) · Trả 1 loại` : '+ Chia nhiều hình thức'}
            </button>
          )}
        </div>

        {finalGrandTotal === 0 ? (
          <div
            className={`${
              isDark ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-emerald-50 border-emerald-300'
            } border-2 rounded-2xl p-4 text-center space-y-1 shadow-2xs`}
          >
            <div
              className={`${
                isDark ? 'text-emerald-300' : 'text-emerald-800'
              } font-black text-[14px] flex items-center justify-center gap-1.5`}
            >
              <span>✓</span> ĐÃ THANH TOÁN 100% BẰNG VÍ KIM CƯƠNG
            </div>
            <div className={`text-[11px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-medium`}>
              Đã cấn trừ đủ {effectiveDiamondUsed} 💎 (-{diamondDiscountAmount.toLocaleString('vi-VN')}đ). Không cần thu
              thêm tiền mặt hay chuyển khoản.
            </div>
          </div>
        ) : (
          <div
            className={`${
              isDark
                ? 'bg-neutral-900/90 border-neutral-800 divide-neutral-800/80'
                : 'bg-white border-neutral-200/80 divide-neutral-100'
            } rounded-2xl shadow-2xs border overflow-hidden divide-y`}
          >
            {PAYMENT_CHANNELS.map((m) => {
              const channelAmount = getChannelAmount(m.id);
              const active = isSplitMode ? channelAmount > 0 : selectedMethod === m.id;
              const isFocused = focusedField === m.id;

              if (!isSplitMode) {
                return (
                  <div
                    key={m.id}
                    onClick={() => onSelectMethod(m.id)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${
                      active
                        ? isDark
                          ? 'bg-emerald-950/40'
                          : 'bg-emerald-50/60'
                        : isDark
                          ? 'hover:bg-neutral-800/50'
                          : 'hover:bg-neutral-50'
                    }`}
                  >
                    <span
                      className={`text-[13.5px] ${
                        active
                          ? isDark
                            ? 'text-emerald-300 font-black'
                            : 'text-emerald-800 font-black'
                          : isDark
                            ? 'text-neutral-200 font-bold'
                            : 'text-neutral-900 font-bold'
                      }`}
                    >
                      {active && '✓ '}
                      {m.label}
                    </span>
                    <span
                      className={`text-[13.5px] tabular-nums whitespace-nowrap shrink-0 ${
                        active
                          ? isDark
                            ? 'text-emerald-300 font-black'
                            : 'text-emerald-800 font-black'
                          : isDark
                            ? 'text-neutral-500 font-semibold'
                            : 'text-neutral-400 font-semibold'
                      }`}
                    >
                      {active ? `${finalGrandTotal.toLocaleString('vi-VN')}đ` : '0đ'}
                    </span>
                  </div>
                );
              }

              const suggestedFillTarget = Math.max(0, channelAmount + remainingDelta);

              return (
                <div
                  key={m.id}
                  className={`p-3 space-y-2 transition-colors ${
                    active ? (isDark ? 'bg-emerald-950/25' : 'bg-emerald-50/40') : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (channelAmount > 0) {
                          onChangeSplitAmount(m.id, 0);
                        } else if (remainingDelta > 0) {
                          onChangeSplitAmount(m.id, remainingDelta);
                        }
                      }}
                      className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
                    >
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black border shrink-0 ${
                          active
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : isDark
                              ? 'bg-neutral-800 border-neutral-700 text-transparent'
                              : 'bg-gray-50 border-gray-300 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={`text-[13px] truncate ${
                          active
                            ? isDark
                              ? 'text-emerald-300 font-black'
                              : 'text-emerald-900 font-black'
                            : isDark
                              ? 'text-neutral-300 font-bold'
                              : 'text-neutral-800 font-bold'
                        }`}
                      >
                        {m.label}
                      </span>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-label={`Số tiền ${m.label}`}
                          data-testid={`payment-split-input-${m.id}`}
                          value={isFocused ? draftAmountStr : channelAmount.toLocaleString('vi-VN')}
                          onFocus={() => {
                            setFocusedField(m.id);
                            setDraftAmountStr(channelAmount > 0 ? String(channelAmount) : '');
                          }}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, '');
                            setDraftAmountStr(digits);
                            const parsed = digits ? Math.max(0, Number.parseInt(digits, 10) || 0) : 0;
                            onChangeSplitAmount(m.id, parsed);
                          }}
                          onBlur={() => {
                            setFocusedField(null);
                            setDraftAmountStr('');
                          }}
                          className={`w-32 h-8 px-2.5 pr-6 rounded-xl border text-right text-[13px] font-black tabular-nums outline-none transition-colors ${
                            isDark
                              ? 'bg-neutral-950 border-neutral-700 text-emerald-300 focus:border-emerald-400'
                              : 'bg-white border-gray-300 text-gray-900 focus:border-emerald-600'
                          }`}
                        />
                        <span
                          className={`absolute right-2 text-[11px] font-bold pointer-events-none ${
                            isDark ? 'text-neutral-500' : 'text-gray-400'
                          }`}
                        >
                          đ
                        </span>
                      </div>
                    </div>
                  </div>

                  {remainingDelta !== 0 && suggestedFillTarget !== channelAmount && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        data-testid={`payment-fill-remaining-${m.id}`}
                        onClick={() => onChangeSplitAmount(m.id, suggestedFillTarget)}
                        className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border tabular-nums cursor-pointer active:scale-95 ${
                          remainingDelta > 0
                            ? isDark
                              ? 'bg-amber-950/50 border-amber-700/70 text-amber-300 hover:bg-amber-900/50'
                              : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                            : isDark
                              ? 'bg-neutral-800 border-neutral-700 text-sky-300'
                              : 'bg-sky-50 border-sky-200 text-sky-800'
                        }`}
                      >
                        {remainingDelta > 0
                          ? `Bù đủ +${remainingDelta.toLocaleString('vi-VN')}đ`
                          : `Giảm về ${suggestedFillTarget.toLocaleString('vi-VN')}đ`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isSplitMode && (
              <div
                data-testid="payment-split-status-bar"
                className={`px-3.5 py-2.5 flex items-center justify-between text-[11.5px] font-bold ${
                  isAllocationValid
                    ? isDark
                      ? 'bg-emerald-950/40 text-emerald-300'
                      : 'bg-emerald-50 text-emerald-800'
                    : isDark
                      ? 'bg-rose-950/30 text-rose-300'
                      : 'bg-rose-50 text-rose-800'
                }`}
              >
                <span className="tabular-nums">
                  Đã chia: {allocatedTotal.toLocaleString('vi-VN')}đ / {finalGrandTotal.toLocaleString('vi-VN')}đ
                </span>
                <span className="tabular-nums">
                  {isAllocationValid
                    ? '✓ Đủ 100%'
                    : remainingDelta > 0
                      ? `Thiếu ${remainingDelta.toLocaleString('vi-VN')}đ`
                      : `Vượt ${Math.abs(remainingDelta).toLocaleString('vi-VN')}đ`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Khối bắt buộc chụp biên lai POS khi có thanh toán qua Thẻ ngân hàng (POS) và tổng tiền > 0 */}
        {finalGrandTotal > 0 && hasPos && (
          <div
            className={`mt-2.5 ${
              isDark ? 'bg-sky-950/40 border-sky-800/60' : 'bg-sky-50/80 border-sky-200/90'
            } rounded-2xl p-3 border space-y-2`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">📸</span>
                <span className={`text-[11.5px] font-bold ${isDark ? 'text-sky-200' : 'text-sky-950'}`}>
                  Ảnh biên lai máy POS {posAmount.toLocaleString('vi-VN')}đ (Bắt buộc)
                </span>
              </div>
              {(transferProofPhoto || proofCloudSyncStatus === 'uploading') && (
                <IosCloudSyncBadge status={proofCloudSyncStatus} size="sm" />
              )}
            </div>
            {transferProofPhoto ? (
              <div
                className={`flex items-center gap-2.5 ${
                  isDark ? 'bg-neutral-900 border-sky-800' : 'bg-white border-sky-200'
                } p-2 rounded-xl border shadow-2xs`}
              >
                <img
                  src={transferProofPhoto}
                  alt="Ảnh biên lai POS"
                  className="w-11 h-11 object-cover rounded-lg border border-sky-400/40 shrink-0 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'} truncate`}>
                    ✓ Đã lưu ảnh biên lai POS
                  </div>
                  <div className={`text-[9.5px] text-[var(--mos-text-muted)]`}>Chạm vào ảnh để chụp lại</div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-2.5 px-3 ${
                  isDark
                    ? 'bg-neutral-900 hover:bg-sky-950/50 border-sky-700 text-sky-300'
                    : 'bg-white hover:bg-sky-50 border-sky-300 text-sky-800'
                } active:scale-98 transition-all rounded-xl border-2 border-dashed font-bold text-[11.5px] flex items-center justify-center gap-1.5 cursor-pointer`}
              >
                <span>📷</span>
                <span>Chụp hóa đơn / biên lai máy POS</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input shared by POS and VietQR modal */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onCaptureProof}
      />

      {/* Action Button */}
      <div className="pt-1 space-y-1.5">
        {showStaffRewards && (
          <div
            className={`text-[10.5px] font-medium px-3 py-1.5 rounded-xl border ${
              isPureVietqrOrZero || canDirectCounterSettle
                ? isDark
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : isDark
                  ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {isPureVietqrOrZero || canDirectCounterSettle
              ? '✓ Tự động chốt Completed & ghi nhận ngay lên Báo Cáo CV / Thuế.'
              : '⏳ Tiền mặt / POS: Khóa thưởng Checkout của bạn & chuyển Quầy thu ngân xác nhận Completed.'}
          </div>
        )}
        <button
          type="button"
          onClick={onProceed}
          disabled={isActionDisabled}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-[15px] shadow-sm transition-all text-center tracking-tight ${
            isActionDisabled
              ? isDark
                ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/60 cursor-not-allowed opacity-60'
                : 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed opacity-60'
              : finalGrandTotal === 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-98 cursor-pointer'
                : hasVietqr
                  ? 'bg-gradient-to-r from-[#FF9500] to-[#FFB400] text-black active:scale-98 cursor-pointer'
                  : 'bg-[#FFB400] text-black active:scale-98 cursor-pointer'
          }`}
        >
          {finalGrandTotal === 0
            ? `Xác Nhận Chốt Đơn (Trừ ${effectiveDiamondUsed} 💎 · 0đ)`
            : !isAllocationValid
              ? `Vui Lòng Chia Đủ ${finalGrandTotal.toLocaleString('vi-VN')}đ`
              : needsPosProof
                ? '🔒 Bắt Buộc Chụp Biên Lai POS Để Chốt Đơn'
                : activeChannelCount > 1 && hasVietqr
                  ? `Mở Mã QR (${vietqrAmount.toLocaleString('vi-VN')}đ) · Tổng ${finalGrandTotal.toLocaleString('vi-VN')}đ`
                  : activeChannelCount > 1
                    ? `Xác Nhận Thu Kết Hợp · ${finalGrandTotal.toLocaleString('vi-VN')}đ`
                    : hasVietqr
                      ? `Mở Mã QR Thanh Toán · ${finalGrandTotal.toLocaleString('vi-VN')}đ`
                      : hasPos
                        ? `Xác Nhận Quẹt Thẻ (POS) · ${finalGrandTotal.toLocaleString('vi-VN')}đ`
                        : `Xác Nhận Thu Tiền Mặt · ${finalGrandTotal.toLocaleString('vi-VN')}đ`}
        </button>
      </div>
    </>
  );
}
