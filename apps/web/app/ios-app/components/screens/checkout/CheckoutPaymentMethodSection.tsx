'use client';

import React from 'react';
import { IosCloudSyncBadge, IosCloudSyncStatus } from '../../ui-kit/IosCloudSyncBadge';

export interface CheckoutPaymentMethodSectionProps {
  isDark: boolean;
  selectedMethod: 'CASH' | 'POS' | 'VIETQR';
  onSelectMethod: (method: 'CASH' | 'POS' | 'VIETQR') => void;
  finalGrandTotal: number;
  effectiveDiamondUsed: number;
  diamondDiscountAmount: number;
  transferProofPhoto: string | null;
  proofCloudSyncStatus: IosCloudSyncStatus;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onCaptureProof: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProceed: () => void;
}

export function CheckoutPaymentMethodSection({
  isDark,
  selectedMethod,
  onSelectMethod,
  finalGrandTotal,
  effectiveDiamondUsed,
  diamondDiscountAmount,
  transferProofPhoto,
  proofCloudSyncStatus,
  fileInputRef,
  onCaptureProof,
  onProceed,
}: CheckoutPaymentMethodSectionProps) {
  return (
    <>
      {/* Section 2: Hình Thức Thanh Toán */}
      <div>
        <div className="text-[11px] font-black text-neutral-400 uppercase tracking-wider px-1 mb-1.5">
          Hình Thức Thanh Toán
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
            {(
              [
                { id: 'VIETQR', label: 'Chuyển khoản QR (Bank)' },
                { id: 'POS', label: 'Thẻ ngân hàng (POS)' },
                { id: 'CASH', label: 'Tiền mặt (Cash)' },
              ] as const
            ).map((m) => {
              const active = selectedMethod === m.id;
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
            })}
          </div>
        )}

        {/* Khối bắt buộc chụp biên lai POS khi chọn Thẻ ngân hàng (POS) và tổng tiền > 0 */}
        {finalGrandTotal > 0 && selectedMethod === 'POS' && (
          <div
            className={`mt-2.5 ${
              isDark ? 'bg-sky-950/40 border-sky-800/60' : 'bg-sky-50/80 border-sky-200/90'
            } rounded-2xl p-3 border space-y-2`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">📸</span>
                <span className={`text-[11.5px] font-bold ${isDark ? 'text-sky-200' : 'text-sky-950'}`}>
                  Ảnh biên lai máy POS đối soát (Bắt buộc)
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
                  <div className={`text-[9.5px] ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
                    Chạm vào ảnh để chụp lại
                  </div>
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
        <div
          className={`text-[10.5px] font-medium px-3 py-1.5 rounded-xl border ${
            finalGrandTotal === 0 || selectedMethod === 'VIETQR'
              ? isDark
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : isDark
                ? 'bg-amber-950/30 border-amber-800/60 text-amber-300'
                : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {finalGrandTotal === 0 || selectedMethod === 'VIETQR'
            ? '✓ Tự động chốt Completed & ghi nhận ngay lên Báo Cáo CV / Thuế.'
            : '⏳ Tiền mặt / POS: Khóa thưởng Checkout của bạn & chuyển Quầy thu ngân xác nhận Completed.'}
        </div>
        <button
          type="button"
          onClick={onProceed}
          disabled={finalGrandTotal > 0 && selectedMethod === 'POS' && !transferProofPhoto}
          className={`w-full py-3.5 px-4 rounded-2xl font-black text-[15px] shadow-sm transition-all text-center tracking-tight ${
            finalGrandTotal > 0 && selectedMethod === 'POS' && !transferProofPhoto
              ? isDark
                ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/60 cursor-not-allowed opacity-60'
                : 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed opacity-60'
              : finalGrandTotal === 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white active:scale-98 cursor-pointer'
                : selectedMethod === 'VIETQR'
                  ? 'bg-gradient-to-r from-[#FF9500] to-[#FFB400] text-black active:scale-98 cursor-pointer'
                  : 'bg-[#FFB400] text-black active:scale-98 cursor-pointer'
          }`}
        >
          {finalGrandTotal === 0
            ? `Xác Nhận Chốt Đơn (Trừ ${effectiveDiamondUsed} 💎 · 0đ)`
            : selectedMethod === 'VIETQR'
              ? `Mở Mã QR Thanh Toán · ${finalGrandTotal.toLocaleString('vi-VN')}đ`
              : selectedMethod === 'POS'
                ? !transferProofPhoto
                  ? '🔒 Bắt Buộc Chụp Biên Lai POS Để Chốt Đơn'
                  : `Xác Nhận Quẹt Thẻ (POS) · ${finalGrandTotal.toLocaleString('vi-VN')}đ`
                : `Xác Nhận Thu Tiền Mặt · ${finalGrandTotal.toLocaleString('vi-VN')}đ`}
        </button>
      </div>
    </>
  );
}
