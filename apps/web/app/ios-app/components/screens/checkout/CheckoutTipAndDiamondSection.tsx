'use client';

import React from 'react';
import { calculateActorTipBreakdown } from '../../../state/useIosBillingCheckout';

type ActorTipBreakdown = ReturnType<typeof calculateActorTipBreakdown>;

export interface RoundUpSuggestionItem {
  targetTotal: number;
  tipAmount: number;
  label: string;
}

export interface CheckoutTipAndDiamondSectionProps {
  isDark: boolean;
  tipAmount: number;
  onSetTipAmount: (val: number) => void;
  activeRoundTarget: number | null;
  onSetActiveRoundTarget: (val: number | null) => void;
  isCustomTipOpen: boolean;
  onSetIsCustomTipOpen: (open: boolean) => void;
  customTipInput: string;
  onSetCustomTipInput: (val: string) => void;
  roundUpSuggestions: RoundUpSuggestionItem[];
  showStaffRewards: boolean;
  actorTipBreakdown: ActorTipBreakdown;
  customerDiamondBalance: number;
  maxDiamondCanUse: number;
  effectiveDiamondUsed: number;
  diamondDiscountAmount: number;
  diamondRate: number;
  onSetDiamondUsed: (val: number) => void;
}

export function CheckoutTipAndDiamondSection({
  isDark,
  tipAmount,
  onSetTipAmount,
  activeRoundTarget,
  onSetActiveRoundTarget,
  isCustomTipOpen,
  onSetIsCustomTipOpen,
  customTipInput,
  onSetCustomTipInput,
  roundUpSuggestions,
  showStaffRewards,
  actorTipBreakdown,
  customerDiamondBalance,
  maxDiamondCanUse,
  effectiveDiamondUsed,
  diamondDiscountAmount,
  diamondRate,
  onSetDiamondUsed,
}: CheckoutTipAndDiamondSectionProps) {
  return (
    <>
      {/* Section 1B: Tiền Tip Cho Chuyên Viên (Hỗ trợ Tip theo mốc + Làm chẵn tổng thanh toán) */}
      <div>
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider px-1 mb-1.5">
          <span className={isDark ? 'text-neutral-400' : 'text-gray-500'}>TIỀN TIP CHO CHUYÊN VIÊN</span>
          <span className={`text-[10px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'} lowercase font-medium`}>
            tùy chọn theo độ hài lòng
          </span>
        </div>
        <div
          className={`${
            isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-neutral-100 shadow-sm'
          } rounded-2xl p-3 border space-y-2.5`}
        >
          {/* Hàng 1: Tip theo mốc cố định + nút Khác */}
          <div>
            <div
              className={`text-[10.5px] ${isDark ? 'text-neutral-400' : 'text-gray-400'} font-semibold mb-1 uppercase tracking-wide`}
            >
              Mốc tip thông dụng:
            </div>
            <div className="grid grid-cols-6 gap-1">
              {[
                { value: 0, label: '0đ' },
                { value: 50000, label: '50K' },
                { value: 100000, label: '100K' },
                { value: 200000, label: '200K' },
                { value: 500000, label: '500K' },
              ].map((p) => {
                const isSelected = tipAmount === p.value && !activeRoundTarget && !isCustomTipOpen;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      onSetTipAmount(p.value);
                      onSetActiveRoundTarget(null);
                      onSetIsCustomTipOpen(false);
                    }}
                    className={`py-2 rounded-xl text-[12px] font-extrabold text-center transition-all tabular-nums cursor-pointer active:scale-95 ${
                      isSelected
                        ? 'bg-[#FFB400] text-black shadow-xs font-black'
                        : isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                          : 'bg-[#F2F2F7] hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => onSetIsCustomTipOpen(!isCustomTipOpen)}
                className={`py-2 rounded-xl text-[11px] font-extrabold text-center transition-all cursor-pointer active:scale-95 ${
                  isCustomTipOpen ||
                  (tipAmount > 0 && ![0, 50000, 100000, 200000, 500000].includes(tipAmount) && !activeRoundTarget)
                    ? 'bg-purple-600 text-white shadow-xs font-black'
                    : isDark
                      ? 'bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800'
                      : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                }`}
              >
                {isCustomTipOpen ? '✕ Đóng' : 'Khác ⌨️'}
              </button>
            </div>
          </div>

          {/* Hàng 2: Gợi ý làm tròn chẵn tổng thanh toán */}
          {roundUpSuggestions.length > 0 && (
            <div className={`pt-1 border-t ${isDark ? 'border-neutral-800' : 'border-gray-100'}`}>
              <div
                className={`text-[10.5px] ${isDark ? 'text-amber-400' : 'text-amber-700'} font-bold mb-1 flex items-center gap-1`}
              >
                <span>✨</span> HOẶC LÀM TRÒN CHẴN TỔNG ĐƠN (QUẸT THẺ / CHUYỂN KHOẢN):
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {roundUpSuggestions.map((opt) => {
                  const isSelected = activeRoundTarget === opt.targetTotal;
                  return (
                    <button
                      key={opt.targetTotal}
                      type="button"
                      onClick={() => {
                        onSetTipAmount(opt.tipAmount);
                        onSetActiveRoundTarget(opt.targetTotal);
                        onSetIsCustomTipOpen(false);
                      }}
                      className={`p-2 rounded-xl text-center transition-all cursor-pointer active:scale-95 border ${
                        isSelected
                          ? 'bg-amber-500 text-black border-amber-600 shadow-xs font-black'
                          : isDark
                            ? 'bg-amber-950/30 hover:bg-amber-900/40 text-amber-200 border-amber-600/40'
                            : 'bg-amber-50/70 hover:bg-amber-100/70 text-amber-950 border-amber-200/80'
                      }`}
                    >
                      <div className="text-[12px] font-black tabular-nums">{opt.label}</div>
                      <div
                        className={`text-[10px] tabular-nums font-semibold ${
                          isSelected ? 'text-black' : isDark ? 'text-amber-400' : 'text-amber-700'
                        }`}
                      >
                        (+{Math.round(opt.tipAmount / 1000).toLocaleString('vi-VN')}K tip)
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Khối Nhập Tùy Chỉnh (Custom Tip Amount) khi bấm Khác ⌨️ */}
          {isCustomTipOpen && (
            <div
              className={`${
                isDark ? 'bg-purple-950/30 border-purple-800' : 'bg-purple-50/70 border-purple-200'
              } border rounded-xl p-2.5 space-y-2 text-[11px] animate-fadeIn`}
            >
              <div
                className={`flex items-center justify-between ${isDark ? 'text-purple-200' : 'text-purple-950'} font-bold`}
              >
                <span>Nhập số tiền tip tùy ý (300K, 700K...):</span>
                <span className={`text-[10px] ${isDark ? 'text-purple-400' : 'text-purple-700'} font-normal`}>
                  Đơn vị: VNĐ
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={customTipInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    onSetCustomTipInput(digits ? Number(digits).toLocaleString('vi-VN') : '');
                  }}
                  placeholder="Ví dụ: 700.000"
                  className={`flex-1 ${
                    isDark
                      ? 'bg-neutral-900 border-purple-700 text-white placeholder-neutral-500'
                      : 'bg-white border-purple-300 text-black placeholder-neutral-400'
                  } border rounded-xl px-3 py-2 text-[13px] font-black tabular-nums focus:outline-none focus:ring-2 focus:ring-purple-400`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const digits = customTipInput.replace(/\D/g, '');
                    const val = parseInt(digits, 10);
                    if (!isNaN(val) && val >= 0) {
                      onSetTipAmount(val);
                      onSetActiveRoundTarget(null);
                      onSetIsCustomTipOpen(false);
                    }
                  }}
                  className="bg-purple-600 text-white font-extrabold px-3 py-2 rounded-xl text-[12px] hover:bg-purple-700 active:scale-95 cursor-pointer shrink-0"
                >
                  Áp dụng
                </button>
              </div>
              {/* Phím tắt nhanh cho tip lớn */}
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className={`text-[10px] ${isDark ? 'text-purple-300' : 'text-purple-800'} font-semibold`}>
                  Chọn nhanh:
                </span>
                {[300000, 500000, 700000, 1000000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      onSetTipAmount(amt);
                      onSetCustomTipInput(amt.toLocaleString('vi-VN'));
                      onSetActiveRoundTarget(null);
                      onSetIsCustomTipOpen(false);
                    }}
                    className={`${
                      isDark
                        ? 'bg-neutral-800 hover:bg-neutral-700 text-purple-200 border-purple-800'
                        : 'bg-white hover:bg-purple-100 text-purple-900 border-purple-200'
                    } border rounded-lg px-2 py-0.5 text-[10.5px] font-bold tabular-nums cursor-pointer`}
                  >
                    +{Math.round(amt / 1000)}K
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Thẻ Kết Quả Phân Bổ Tip */}
          {tipAmount > 0 ? (
            <div
              className={`${
                isDark ? 'bg-emerald-950/40 border-emerald-500/40' : 'bg-emerald-50/80 border-emerald-200/80'
              } border rounded-xl p-2.5 space-y-1.5 text-[11px]`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base leading-none">💖</span>
                  <div className="min-w-0">
                    <div className={`font-extrabold ${isDark ? 'text-emerald-200' : 'text-emerald-950'} truncate`}>
                      {activeRoundTarget
                        ? `Làm tròn tổng đơn ${activeRoundTarget.toLocaleString('vi-VN')}đ (Tip: +${tipAmount.toLocaleString('vi-VN')}đ)`
                        : `Đã ghi nhận tip ${tipAmount.toLocaleString('vi-VN')}đ`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  <span
                    className={`text-[11px] font-black ${
                      isDark
                        ? 'text-emerald-300 bg-neutral-900 border-emerald-600'
                        : 'text-emerald-800 bg-white border-emerald-300'
                    } px-2 py-0.5 rounded-lg border tabular-nums`}
                  >
                    +{Math.round(tipAmount / 1000)}K
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onSetTipAmount(0);
                      onSetActiveRoundTarget(null);
                      onSetIsCustomTipOpen(false);
                    }}
                    className={`text-[10px] ${
                      isDark
                        ? 'text-neutral-400 hover:text-rose-400 bg-neutral-800 border-neutral-700'
                        : 'text-gray-400 hover:text-red-500 bg-white border-gray-200'
                    } font-bold px-1.5 py-0.5 rounded border cursor-pointer`}
                  >
                    Bỏ tip
                  </button>
                </div>
              </div>
              {showStaffRewards && (
                <div
                  className={`pt-1.5 border-t ${
                    isDark ? 'border-emerald-800/50 text-emerald-300' : 'border-emerald-200 text-emerald-800'
                  } text-[10px] font-semibold flex items-center justify-between gap-2 flex-wrap tabular-nums`}
                >
                  <span>
                    Chia thưởng 70/10/10: Làm mi {actorTipBreakdown.techStaffName} (70%) · In{' '}
                    {actorTipBreakdown.checkInStaffName} (10%) · Out {actorTipBreakdown.checkOutStaffName} (10%)
                  </span>
                  <span className="font-black">
                    Bạn nhận ({actorTipBreakdown.actorEarnedPercent}%): +
                    {actorTipBreakdown.actorEarnedAmount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`${
                isDark
                  ? 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              } border rounded-xl py-2 px-3 text-center text-[11px] font-medium`}
            >
              Khách không gửi tip trong ca này · Không tính thêm phí
            </div>
          )}
        </div>
      </div>

      {/* Section 1C: Ví Kim Cương (1 💎 = 1.000 VNĐ) */}
      <div>
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider px-1 mb-1.5">
          <span className={`flex items-center gap-1 ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
            <span>💎</span> VÍ KIM CƯƠNG
          </span>
          <span
            className={`text-[10px] font-bold ${
              isDark ? 'text-cyan-300 bg-cyan-950/50 border-cyan-800' : 'text-cyan-800 bg-cyan-50 border-cyan-200'
            } border px-2 py-0.5 rounded-full tabular-nums`}
          >
            Số dư: {customerDiamondBalance} 💎
          </span>
        </div>
        <div
          className={`${
            isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-neutral-100 shadow-sm'
          } rounded-2xl p-3 border space-y-2.5`}
        >
          {customerDiamondBalance > 0 ? (
            <>
              <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-gray-500'} font-medium`}>
                Chọn số Kim Cương dùng để cấn trừ (1 💎 = 1.000đ):
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-5 gap-1.5">
                {[0, 50, 100, 200].map((preset) => {
                  const disabled = preset > maxDiamondCanUse;
                  const isSelected = effectiveDiamondUsed === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={disabled}
                      onClick={() => onSetDiamondUsed(preset)}
                      className={`py-2 rounded-xl text-[12px] font-extrabold text-center transition-all tabular-nums cursor-pointer active:scale-95 ${
                        disabled
                          ? isDark
                            ? 'bg-neutral-800/40 text-neutral-600 cursor-not-allowed'
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : isSelected
                            ? 'bg-cyan-600 text-white shadow-xs font-black'
                            : isDark
                              ? 'bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 border border-cyan-800'
                              : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-100'
                      }`}
                    >
                      {preset} 💎
                    </button>
                  );
                })}
                {/* Max Button */}
                <button
                  type="button"
                  disabled={maxDiamondCanUse <= 0}
                  onClick={() => onSetDiamondUsed(maxDiamondCanUse)}
                  className={`py-2 rounded-xl text-[12px] font-extrabold text-center transition-all tabular-nums cursor-pointer active:scale-95 ${
                    maxDiamondCanUse <= 0
                      ? isDark
                        ? 'bg-neutral-800/40 text-neutral-600 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : effectiveDiamondUsed === maxDiamondCanUse && maxDiamondCanUse > 0
                        ? 'bg-cyan-600 text-white shadow-xs font-black'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-xs font-black'
                  }`}
                >
                  {maxDiamondCanUse} 💎
                </button>
              </div>

              {/* Status banner */}
              {effectiveDiamondUsed > 0 ? (
                <div
                  className={`${
                    isDark ? 'bg-cyan-950/40 border-cyan-800/60' : 'bg-cyan-50/90 border-cyan-200'
                  } border rounded-xl p-2.5 flex items-center justify-between text-[11px]`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-base leading-none">💎</span>
                    <div className="min-w-0">
                      <div className={`font-extrabold ${isDark ? 'text-cyan-200' : 'text-cyan-950'} truncate`}>
                        Đã trừ {effectiveDiamondUsed} 💎 (-{diamondDiscountAmount.toLocaleString('vi-VN')}đ)
                      </div>
                      <div className={`text-[10px] ${isDark ? 'text-cyan-300' : 'text-cyan-800'} font-medium`}>
                        Số dư ví còn lại sau ca:{' '}
                        <strong className={isDark ? 'text-cyan-100' : 'text-cyan-950'}>
                          {customerDiamondBalance - effectiveDiamondUsed} 💎
                        </strong>{' '}
                        (quy đổi{' '}
                        {((customerDiamondBalance - effectiveDiamondUsed) * diamondRate).toLocaleString('vi-VN')}đ)
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSetDiamondUsed(0)}
                    className={`text-[10px] font-bold ${
                      isDark
                        ? 'text-neutral-400 hover:text-rose-400 bg-neutral-800 border-neutral-700'
                        : 'text-gray-500 hover:text-red-600 bg-white border-gray-200'
                    } px-2 py-1 rounded-lg border shrink-0 ml-1 cursor-pointer`}
                  >
                    Bỏ dùng
                  </button>
                </div>
              ) : (
                <div
                  className={`${
                    isDark
                      ? 'bg-neutral-800/60 border-neutral-700/60 text-neutral-400'
                      : 'bg-gray-50 border-gray-200 text-gray-500'
                  } border rounded-xl py-2 px-3 text-center text-[11px] font-medium`}
                >
                  Chưa dùng Kim Cương · Giữ nguyên {customerDiamondBalance} 💎 trong ví cho các ca sau
                </div>
              )}
            </>
          ) : (
            <div
              className={`${
                isDark
                  ? 'bg-neutral-800/40 border-neutral-800 text-neutral-500'
                  : 'bg-gray-50 border-gray-200 text-gray-400'
              } border rounded-xl py-2.5 px-3 text-center text-[11px] font-medium`}
            >
              Khách chưa có số dư Kim Cương trong ví (0 💎)
            </div>
          )}
        </div>
      </div>
    </>
  );
}
