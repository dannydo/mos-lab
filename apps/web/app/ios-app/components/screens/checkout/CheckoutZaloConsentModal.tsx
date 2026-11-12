'use client';

import React from 'react';

export interface CheckoutZaloConsentModalProps {
  open: boolean;
  isDark: boolean;
  customerName: string;
  customerPhone: string;
  zaloPhone: string;
  onSetZaloPhone: (phone: string) => void;
  isSendingZalo: boolean;
  isZaloSentSuccess: boolean;
  onConfirmZaloSend: () => void;
  onSkipZalo: () => void;
}

export function CheckoutZaloConsentModal({
  open,
  isDark,
  customerName,
  customerPhone,
  zaloPhone,
  onSetZaloPhone,
  isSendingZalo,
  isZaloSentSuccess,
  onConfirmZaloSend,
  onSkipZalo,
}: CheckoutZaloConsentModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 select-none">
      <div
        className={`${
          isDark ? 'bg-neutral-900 border-neutral-700 text-white' : 'bg-white border-neutral-200'
        } rounded-3xl max-w-[390px] w-full overflow-hidden shadow-2xl flex flex-col border`}
      >
        {/* Header Xanh Zalo + Logo Wings + Zalo Official Pill */}
        <div className="bg-gradient-to-r from-[#0068FF] to-[#0052CC] text-white p-3.5 flex items-center justify-between border-b border-blue-400/30">
          <div className="flex items-center gap-2.5">
            <img
              src="/images/combo-cards/wings-logo-gold.png"
              alt="Wings Lashes Logo"
              className="h-7 w-auto object-contain shrink-0 brightness-125"
            />
            <div>
              <div className="text-[13.5px] font-black tracking-wider text-white leading-tight">WINGS LASHES</div>
              <div className="text-[10px] text-blue-100 font-medium">Hệ Thống Nối Mi Bóng Tối</div>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-xs text-white text-[11px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
            <span>💬</span> Zalo Official
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3 max-h-[calc(85vh-130px)] overflow-y-auto">
          <div className="text-center space-y-0.5">
            <div className={`text-[15px] font-black ${isDark ? 'text-white' : 'text-gray-900'} tracking-tight`}>
              KẾT NỐI ZALO NHẬN HÓA ĐƠN
            </div>
            <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-gray-500'} font-medium`}>
              Bảo hành dặm mi 3 ngày & Tặng Voucher 50K
            </div>
          </div>

          {/* Hộp gợi ý lời thoại cho CV/Lễ Tân */}
          <div
            className={`${
              isDark ? 'bg-blue-950/40 border-blue-800/60' : 'bg-blue-50/90 border-blue-200'
            } rounded-2xl p-2.5 space-y-1 border`}
          >
            <div className="text-[10px] font-extrabold text-[#0052CC] flex items-center gap-1 uppercase tracking-wide">
              <span>🎙️</span> Lời thoại xin phép khách hàng:
            </div>
            <div
              className={`text-[11.5px] ${isDark ? 'text-blue-200' : 'text-blue-950'} font-medium italic leading-relaxed`}
            >
              &ldquo;Dạ chị {customerName} ơi, Wings xin phép gửi Hóa đơn điện tử, Thẻ bảo hành dặm mi trong 3 ngày và
              Voucher ưu đãi 50K qua Zalo số này cho chị nhé ạ!&rdquo;
            </div>
          </div>

          {/* SĐT Zalo */}
          <div className="space-y-1">
            <div
              className={`flex justify-between items-center text-[10.5px] font-bold ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}
            >
              <span>SỐ ĐIỆN THOẠI NHẬN ZALO:</span>
              <span className="text-[10px] text-blue-400 font-semibold">Chạm để sửa nếu dùng số khác</span>
            </div>
            <div
              className={`flex items-center gap-2 ${
                isDark
                  ? 'bg-neutral-950 border-neutral-700 focus-within:border-[#0068FF] focus-within:bg-neutral-900'
                  : 'bg-gray-50 border-gray-300 focus-within:border-[#0068FF] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-100'
              } border rounded-xl px-3 py-2 transition-all`}
            >
              <span className="text-base leading-none">📱</span>
              <input
                type="tel"
                value={zaloPhone}
                onChange={(e) => onSetZaloPhone(e.target.value)}
                placeholder="Nhập số điện thoại Zalo..."
                className={`flex-1 bg-transparent text-[14px] font-extrabold ${
                  isDark ? 'text-white' : 'text-black'
                } outline-none tabular-nums`}
              />
              {zaloPhone !== customerPhone && (
                <button
                  type="button"
                  onClick={() => onSetZaloPhone(customerPhone)}
                  className={`text-[10px] text-blue-400 hover:text-blue-300 font-bold ${
                    isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-white border-blue-200'
                  } px-2 py-0.5 rounded border cursor-pointer`}
                >
                  Đặt lại
                </button>
              )}
            </div>
          </div>

          {/* 3 Quyền lợi Zalo */}
          <div
            className={`${
              isDark
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                : 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
            } rounded-2xl p-2.5 space-y-1 text-[11px] border`}
          >
            <div
              className={`font-extrabold ${isDark ? 'text-emerald-300' : 'text-emerald-950'} flex items-center gap-1 text-[11.5px]`}
            >
              <span>🎁</span> QUYỀN LỢI KHÁCH NHẬN ĐƯỢC QUA ZALO:
            </div>
            <div className="space-y-1 font-medium">
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-black shrink-0">✓</span>
                <span>
                  <strong className={isDark ? 'text-emerald-100' : 'text-emerald-950'}>
                    Hóa đơn điện tử chi tiết:
                  </strong>{' '}
                  Minh bạch từng dịch vụ, tiền tip & số dư ví.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-black shrink-0">✓</span>
                <span>
                  <strong className={isDark ? 'text-emerald-100' : 'text-emerald-950'}>
                    Thẻ bảo hành dặm mi 3 ngày:
                  </strong>{' '}
                  Bảo hành dặm mi chuẩn Wings hoàn toàn miễn phí.
                </span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-black shrink-0">✓</span>
                <span>
                  <strong className={isDark ? 'text-emerald-100' : 'text-emerald-950'}>Voucher 50.000đ:</strong> Tự động
                  tích lũy vào tài khoản cho lần ghé tới.
                </span>
              </div>
            </div>
          </div>

          {/* QR Zalo OA Wings Lashes */}
          <div
            className={`flex items-center gap-3 p-2.5 ${
              isDark ? 'bg-blue-950/30 border-blue-800/60' : 'bg-blue-50/70 border-blue-200'
            } rounded-2xl border`}
          >
            <div className="w-16 h-16 bg-white p-1 rounded-xl border border-blue-300 shrink-0 shadow-2xs flex items-center justify-center relative overflow-hidden">
              <svg viewBox="0 0 100 100" className="w-full h-full text-blue-950 fill-current">
                {/* Corner 1 */}
                <rect x="5" y="5" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="5" />
                <rect x="12" y="12" width="12" height="12" rx="2" fill="currentColor" />
                {/* Corner 2 */}
                <rect x="69" y="5" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="5" />
                <rect x="76" y="12" width="12" height="12" rx="2" fill="currentColor" />
                {/* Corner 3 */}
                <rect x="5" y="69" width="26" height="26" rx="4" fill="none" stroke="currentColor" strokeWidth="5" />
                <rect x="12" y="76" width="12" height="12" rx="2" fill="currentColor" />
                {/* Data dots */}
                <rect x="38" y="8" width="6" height="6" rx="1" />
                <rect x="48" y="14" width="6" height="6" rx="1" />
                <rect x="58" y="8" width="6" height="6" rx="1" />
                <rect x="8" y="38" width="6" height="6" rx="1" />
                <rect x="18" y="48" width="6" height="6" rx="1" />
                <rect x="8" y="58" width="6" height="6" rx="1" />
                <rect x="42" y="35" width="6" height="6" rx="1" />
                <rect x="52" y="35" width="6" height="6" rx="1" />
                <rect x="68" y="42" width="6" height="6" rx="1" />
                <rect x="78" y="48" width="6" height="6" rx="1" />
                <rect x="88" y="42" width="6" height="6" rx="1" />
                <rect x="68" y="62" width="6" height="6" rx="1" />
                <rect x="78" y="72" width="6" height="6" rx="1" />
                <rect x="88" y="82" width="6" height="6" rx="1" />
                <rect x="38" y="75" width="6" height="6" rx="1" />
                <rect x="48" y="85" width="6" height="6" rx="1" />
                <rect x="58" y="75" width="6" height="6" rx="1" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 rounded-full bg-[#0068FF] text-white flex items-center justify-center shadow-xs border border-white">
                  <span className="text-[8.5px] font-black tracking-tighter">Zalo</span>
                </div>
              </div>
            </div>
            <div className={`text-[10.5px] ${isDark ? 'text-neutral-300' : 'text-gray-700'} space-y-0.5`}>
              <div className="font-bold text-[#0068FF] flex items-center gap-1">
                <span>Mã QR Zalo OA Wings Lashes</span>
              </div>
              <div className={`${isDark ? 'text-neutral-400' : 'text-gray-500'} leading-snug`}>
                Khách có thể quét camera để bấm <strong>Quan tâm OA</strong> và nhận tin nhắn kèm hình ảnh hóa đơn ngay.
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div
          className={`p-3 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-100'} border-t space-y-2 shrink-0`}
        >
          <button
            type="button"
            onClick={onConfirmZaloSend}
            disabled={isSendingZalo || isZaloSentSuccess}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#0068FF] hover:bg-[#0052CC] text-white font-black text-[13.5px] shadow-md active:scale-98 transition-transform text-center tracking-wide cursor-pointer flex items-center justify-center gap-2"
          >
            {isSendingZalo ? (
              <>
                <span className="animate-spin text-base">⏳</span>
                <span>ĐANG GỬI QUA ZALO...</span>
              </>
            ) : isZaloSentSuccess ? (
              <>
                <span className="text-base text-emerald-300">✓</span>
                <span className="text-emerald-200">ĐÃ GỬI ZALO THÀNH CÔNG!</span>
              </>
            ) : (
              <>
                <span className="text-base">💬</span>
                <span>KHÁCH ĐỒNG Ý · GỬI QUA ZALO NGAY</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onSkipZalo}
            disabled={isSendingZalo || isZaloSentSuccess}
            className={`w-full py-2 px-4 rounded-xl ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            } font-bold text-[12px] text-center cursor-pointer`}
          >
            Khách không dùng Zalo / Bỏ qua
          </button>
        </div>
      </div>
    </div>
  );
}
