'use client';

import React from 'react';
import { IosCloudSyncBadge, IosCloudSyncStatus } from '../../ui-kit/IosCloudSyncBadge';

export interface CheckoutVietQrModalProps {
  open: boolean;
  isDark: boolean;
  branchCode: string;
  vietQrUrl: string;
  qrTransferContent: string;
  finalGrandTotal: number;
  copySuccess: string | null;
  onCopyToClipboard: (text: string, label: string) => void;
  transferProofPhoto: string | null;
  proofCloudSyncStatus: IosCloudSyncStatus;
  onTriggerFilePicker: () => void;
  onConfirmQrPaid: () => void;
  onClose: () => void;
}

export function CheckoutVietQrModal({
  open,
  isDark,
  branchCode,
  vietQrUrl,
  qrTransferContent,
  finalGrandTotal,
  copySuccess,
  onCopyToClipboard,
  transferProofPhoto,
  proofCloudSyncStatus,
  onTriggerFilePicker,
  onConfirmQrPaid,
  onClose,
}: CheckoutVietQrModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div
        className={`${
          isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-200'
        } rounded-3xl max-w-[390px] w-full overflow-hidden shadow-2xl flex flex-col border`}
      >
        {/* Header đen + logo Wings + badge DT */}
        <div className="bg-black text-white p-3.5 flex items-center justify-between border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/combo-cards/wings-logo-gold.png"
              alt="Wings Lashes Logo"
              className="h-7 w-auto object-contain shrink-0"
            />
            <div>
              <div className="text-[14px] font-black tracking-wider text-[#FFB400] leading-tight">WINGS LASHES</div>
              <div className="text-[10px] text-gray-300 font-medium">Hệ Thống Nối Mi Bóng Tối</div>
            </div>
          </div>
          <div className="bg-[#16A34A] text-white text-[11px] font-black px-2.5 py-1 rounded-lg tracking-wider">
            {branchCode}
          </div>
        </div>

        {/* Dải cam tiêu đề chuẩn Sheet */}
        <div className="bg-[#FF9500] text-black font-black text-center py-1.5 text-[12px] tracking-wider uppercase shadow-xs">
          QR THANH TOÁN DỊCH VỤ
        </div>

        {/* Body: Mã QR & Thông tin thanh toán (Scrollable) */}
        <div className="p-3.5 space-y-2.5 overflow-y-auto max-h-[calc(85vh-150px)]">
          {/* Image QR Code to rõ tối đa */}
          <div className="flex justify-center">
            <div className="bg-white p-2 rounded-2xl border-2 border-neutral-200 shadow-sm max-w-[270px] w-full aspect-square flex items-center justify-center">
              <img
                src={vietQrUrl}
                alt="VietQR Chuyển Khoản Wings"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          </div>

          {/* Thông tin chuyển khoản chi tiết */}
          <div
            className={`${
              isDark ? 'bg-neutral-950 border-neutral-800' : 'bg-gray-50 border-gray-200'
            } rounded-2xl p-2.5 border space-y-1.5 text-[12px]`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[var(--mos-text-muted)] font-bold text-[11px]`}>Nội Dung:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[#E11D48] font-black text-[13px] tracking-wide tabular-nums">
                  {qrTransferContent}
                </span>
                <button
                  type="button"
                  onClick={() => onCopyToClipboard(qrTransferContent, 'content')}
                  title="Sao chép nội dung"
                  aria-label="Sao chép nội dung"
                  className={`w-6 h-6 rounded-md ${
                    isDark
                      ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  } border flex items-center justify-center text-[11px] active:scale-90 transition-transform cursor-pointer shadow-2xs`}
                >
                  {copySuccess === 'content' ? (
                    <span className="text-emerald-500 font-bold text-[11px]">✓</span>
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className={`text-[var(--mos-text-muted)] font-bold text-[11px]`}>Số Tiền:</span>
              <span className="text-[#E11D48] font-black text-[15px] tabular-nums">
                {finalGrandTotal.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>

            <div className={`flex items-center justify-between ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>
              <span className={`text-[var(--mos-text-muted)] font-medium text-[11px]`}>Ngân Hàng:</span>
              <span className={`font-bold ${isDark ? 'text-neutral-100' : 'text-gray-900'}`}>Vietcombank (VCB)</span>
            </div>

            <div className={`flex items-center justify-between ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>
              <span className={`text-[var(--mos-text-muted)] font-medium text-[11px]`}>Tên Tài Khoản:</span>
              <span className={`font-black ${isDark ? 'text-neutral-100' : 'text-gray-900'} text-[11px] uppercase`}>
                CÔNG TY TNHH WINGS&apos; LIFE
              </span>
            </div>

            <div className={`flex items-center justify-between ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>
              <span className={`text-[var(--mos-text-muted)] font-medium text-[11px]`}>Số Tài Khoản:</span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-black ${isDark ? 'text-neutral-100' : 'text-gray-900'} tabular-nums text-[13px]`}
                >
                  1024731897
                </span>
                <button
                  type="button"
                  onClick={() => onCopyToClipboard('1024731897', 'acc')}
                  title="Sao chép số tài khoản"
                  aria-label="Sao chép số tài khoản"
                  className={`w-6 h-6 rounded-md ${
                    isDark
                      ? 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  } border flex items-center justify-center text-[11px] active:scale-90 transition-transform cursor-pointer shadow-2xs`}
                >
                  {copySuccess === 'acc' ? (
                    <span className="text-emerald-500 font-bold text-[11px]">✓</span>
                  ) : (
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Chức năng xin chụp lại màn hình chuyển khoản của khách hàng */}
          <div
            className={`${
              isDark ? 'bg-sky-950/40 border-sky-800/60' : 'bg-sky-50/80 border-sky-200/90'
            } rounded-2xl p-2.5 border space-y-1.5`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base leading-none">📸</span>
                <span className={`text-[11.5px] font-bold ${isDark ? 'text-sky-200' : 'text-sky-950'}`}>
                  Ảnh bill chuyển khoản đối soát (Bắt buộc)
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
                  alt="Ảnh bill đối soát"
                  className={`w-11 h-11 object-cover rounded-lg border ${
                    isDark ? 'border-neutral-700' : 'border-gray-200'
                  } shadow-2xs shrink-0 cursor-pointer`}
                  onClick={onTriggerFilePicker}
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'} truncate`}>
                    ✓ Đã lưu ảnh bill chuyển khoản
                  </div>
                  <div className={`text-[9.5px] text-[var(--mos-text-muted)]`}>Chạm vào ảnh để chụp lại</div>
                </div>
                <button
                  type="button"
                  onClick={onTriggerFilePicker}
                  className={`px-2 py-1 text-[10.5px] font-bold ${
                    isDark
                      ? 'text-sky-300 bg-sky-950/60 hover:bg-sky-900/60 border-sky-700'
                      : 'text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-300'
                  } rounded-lg border cursor-pointer shrink-0 active:scale-95`}
                >
                  Chụp lại
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onTriggerFilePicker}
                className={`w-full py-2 px-3 ${
                  isDark
                    ? 'bg-neutral-900 hover:bg-sky-950/50 border-sky-700 text-sky-300'
                    : 'bg-white hover:bg-sky-50 border-sky-300 text-sky-800'
                } active:scale-98 transition-all rounded-xl border-2 border-dashed font-bold text-[11.5px] flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs`}
              >
                <span className="text-sm">📷</span>
                <span>Xin chụp lại màn hình chuyển khoản của khách</span>
              </button>
            )}
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className={`p-3 bg-[var(--mos-surface)] border-[var(--mos-surface-border)] border-t space-y-2 shrink-0`}>
          <button
            type="button"
            onClick={onConfirmQrPaid}
            disabled={!transferProofPhoto}
            className={`w-full py-3 px-4 rounded-2xl ${
              !transferProofPhoto
                ? isDark
                  ? 'bg-neutral-800 text-neutral-500 border border-neutral-700/60 cursor-not-allowed opacity-60'
                  : 'bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed opacity-60'
                : 'bg-[#16A34A] hover:bg-[#15803D] text-white shadow-md active:scale-98 cursor-pointer'
            } font-black transition-all text-center tracking-wide flex flex-col items-center justify-center leading-snug gap-0.5`}
          >
            <span className="text-[13.5px]">
              {!transferProofPhoto ? '🔒 BẮT BUỘC CHỤP ẢNH BILL CHUYỂN KHOẢN' : '✓ ĐÃ NHẬN TIỀN THÀNH CÔNG'}
            </span>
            <span className="text-[12px] opacity-95 font-extrabold uppercase tracking-wide">
              {!transferProofPhoto ? 'ĐỂ ĐỐI SOÁT KẾ TOÁN & XUẤT HÓA ĐƠN' : 'XUẤT HÓA ĐƠN'}
            </span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`w-full py-2 px-4 rounded-xl ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            } font-bold text-[12px] text-center cursor-pointer`}
          >
            ‹ Đóng / Đổi hình thức thanh toán khác
          </button>
        </div>
      </div>
    </div>
  );
}
