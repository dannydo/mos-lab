'use client';

import React from 'react';
import { Sparkles, CheckCircle2, Lock, X } from 'lucide-react';
import { BookingItem, SERUM_TIERS_CVL } from '../../../state/mockData';
import { FeatherSvg } from '../../ui-kit/CvFeatherLabels';

export interface UpsellModalsProps {
  isDark: boolean;
  booking?: BookingItem;
  customerName: string;
  isSerumInfoModalOpen: boolean;
  onCloseSerumInfoModal: () => void;
  selectedSerumTierId: string;
  yeppeumCount: number;
  onSelectSerumTier: (tierId: string) => void;
  isLockedWelcomeModalOpen: boolean;
  onCloseLockedWelcomeModal: () => void;
}

export function UpsellModals({
  isDark,
  booking,
  customerName,
  isSerumInfoModalOpen,
  onCloseSerumInfoModal,
  selectedSerumTierId,
  yeppeumCount,
  onSelectSerumTier,
  isLockedWelcomeModalOpen,
  onCloseLockedWelcomeModal,
}: UpsellModalsProps) {
  return (
    <>
      {/* Yeppeum Serum Commission & Tier Info Modal */}
      {isSerumInfoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-150">
          <div className="fixed inset-0 bg-black/65 backdrop-blur-xs" onClick={onCloseSerumInfoModal} />
          <div
            className={`relative ${isDark ? 'bg-[#1C1C1E] text-white border-neutral-800' : 'bg-white border-neutral-200'} rounded-t-3xl sm:rounded-3xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto z-10 border`}
          >
            {/* Header: Title on Left, Close [✕] on Right */}
            <div
              className={`flex items-start justify-between gap-3 pb-3 border-b ${isDark ? 'border-neutral-800' : 'border-gray-100'}`}
            >
              <div>
                <div
                  className={`flex items-center gap-1.5 ${isDark ? 'text-amber-300' : 'text-amber-900'} font-extrabold text-[15px]`}
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3>Thang Thưởng Dưỡng Mi Yeppeum Korea</h3>
                </div>
                <p className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-gray-500'} mt-0.5`}>
                  Quy tắc Điều răn CV-002 · Bán đúng giá niêm yết hoặc chọn mức ưu đãi áp dụng
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseSerumInfoModal}
                className={`w-8 h-8 rounded-full ${isDark ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'} flex items-center justify-center transition-colors shrink-0 cursor-pointer`}
                aria-label="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of 4 Tiers */}
            <div className="space-y-2.5">
              {SERUM_TIERS_CVL.map((t) => {
                const isSelected = selectedSerumTierId === t.id && yeppeumCount > 0;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onSelectSerumTier(t.id)}
                    className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? isDark
                          ? 'bg-amber-950/40 border-2 border-[#FFB400] shadow-xs'
                          : 'bg-amber-50/90 border-2 border-[#FF9500] shadow-xs'
                        : isDark
                          ? 'bg-neutral-900/90 border-neutral-800 hover:bg-neutral-800/80'
                          : 'bg-[#F9F9FB] border-gray-200 hover:bg-gray-100/80'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[14px] font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          {t.label}
                        </span>
                        {isSelected && (
                          <span className="bg-[#FF9500] text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                            Đang chọn
                          </span>
                        )}
                      </div>
                      <div className={`text-[11px] ${isDark ? 'text-neutral-300' : 'text-gray-600'} mt-1 leading-snug`}>
                        {t.id === 'serum-orig' && 'Bán đúng giá niêm yết khi khách mua lẻ tại giường.'}
                        {t.id === 'serum-disc-light' && 'Áp dụng giảm dưới 50% theo chương trình ưu đãi nhẹ.'}
                        {t.id === 'serum-disc-deep' && 'Áp dụng Flash sale, xả hàng hoặc ưu đãi sâu ≥ 50%.'}
                        {t.id === 'serum-free' &&
                          'Tặng kèm miễn phí (Trị giá 1.100.000đ) khi khách chốt gói Combo lớn.'}
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <span
                        className={`inline-flex items-center gap-0.5 text-[12px] font-black ${isDark ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30' : 'text-emerald-700 bg-emerald-50 border-emerald-200'} border px-2 py-1 rounded-lg tabular-nums`}
                      >
                        +{Math.round(t.cvBonus / 1000)}
                        <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                        /cây
                      </span>
                      {isSelected ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <span
                          className={`text-[10.5px] font-semibold ${isDark ? 'text-neutral-400' : 'text-gray-400'}`}
                        >
                          Chọn
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer summary */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={onCloseSerumInfoModal}
                className={`w-full py-2.5 rounded-xl ${isDark ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'} text-[13px] font-bold transition-colors cursor-pointer`}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Locked Welcome Package Explanation Modal */}
      {isLockedWelcomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="fixed inset-0 bg-black/65 backdrop-blur-xs" onClick={onCloseLockedWelcomeModal} />
          <div
            className={`relative ${isDark ? 'bg-[#1C1C1E] text-white border-neutral-800' : 'bg-white border-amber-200'} rounded-3xl w-full max-w-sm p-5 shadow-2xl border space-y-4 z-10 animate-in zoom-in-95 duration-150`}
          >
            <div className="text-center space-y-2">
              <div
                className={`w-12 h-12 rounded-2xl ${isDark ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800'} flex items-center justify-center mx-auto shadow-xs`}
              >
                <Lock className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className={`text-[16px] font-black ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  Đặc Quyền Gói Welcome (2 Tặng 1)
                </h3>
                <p
                  className={`text-[11.5px] font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'} mt-0.5 inline-flex items-center justify-center gap-1`}
                >
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Chỉ áp dụng trong ngày đầu tiên ghé salon</span>
                </p>
              </div>
            </div>

            <div
              className={`${isDark ? 'bg-neutral-900/90 border-neutral-800 text-neutral-300' : 'bg-amber-50/80 border-amber-200/80 text-neutral-700'} rounded-2xl p-3.5 border space-y-2 text-[12px] leading-relaxed`}
            >
              <p>
                Gói <strong>Welcome (2 tặng 1)</strong> là chính sách chào mừng đặc biệt chỉ dành riêng cho khách hàng
                trải nghiệm dịch vụ trong <strong>ngày đầu tiên</strong> tại Wings.
              </p>
              <p className={`${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Chị <strong>{customerName}</strong> hiện tại đã qua ngày đầu tiên (Lần ghé thứ{' '}
                <strong>{booking?.customerVisits ?? 2}</strong>), nên gói này đã tự động đóng để đảm bảo đúng quy chế
                salon.
              </p>
            </div>

            <div
              className={`${isDark ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-900'} rounded-2xl p-3 border text-[11.5px] leading-snug`}
            >
              <span
                className={`font-extrabold ${isDark ? 'text-emerald-300' : 'text-emerald-800'} flex items-center gap-1 mb-0.5`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Gợi ý tư vấn cho CV:</span>
                <FeatherSvg className="w-3 h-3 text-amber-500" />
              </span>
              Hướng dẫn chị chốt gói <strong>4 tặng 1</strong> (+22%) hoặc <strong>7 tặng 3</strong> (tiết kiệm đến 41%)
              để nhận trọn vẹn đặc quyền và số buổi tối đa nhé!
            </div>

            <button
              type="button"
              onClick={onCloseLockedWelcomeModal}
              className="w-full py-3 rounded-2xl bg-[#FFB400] text-black text-[13.5px] font-extrabold active:scale-98 transition-transform cursor-pointer shadow-md"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
