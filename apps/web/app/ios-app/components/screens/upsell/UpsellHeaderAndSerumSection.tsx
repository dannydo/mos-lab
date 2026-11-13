'use client';

import React from 'react';
import { Wallet, Info, AlertTriangle } from 'lucide-react';
import { calculateComboRedemptionAccounting, formatExpiryDateDdMmYyyy } from '@mos-lab/shared';
import { BookingItem, SERUM_TIERS_CVL } from '../../../state/mockData';
import { CvFeather2Badge, CvFeather1Badge, FeatherSvg } from '../../ui-kit/CvFeatherLabels';
import { ComboSessionBadge } from '../../ui-kit/ComboSessionBadge';
import { ComboExpiryStatusBadge } from '../../ui-kit/ComboExpiryStatusBadge';
import { formatComboName } from '../LashMaterialConstraintMatrix';

type RedemptionAccountingResult = ReturnType<typeof calculateComboRedemptionAccounting>;
type SerumTierItem = (typeof SERUM_TIERS_CVL)[number];

export interface UpsellHeaderAndSerumSectionProps {
  isDark: boolean;
  booking?: BookingItem;
  customerName: string;
  customerPhone: string;
  customerVisits: number;
  isNewClient: boolean;
  serviceName: string;
  assignedStaffName: string;
  assignedStaffTier: string;
  isExistingComboLive: boolean;
  redemptionAccounting: RedemptionAccountingResult | null;
  simulateOnlyRefillLeft: boolean;
  onToggleSimulateOnlyRefillLeft: () => void;
  yeppeumCount: number;
  onDecrementYeppeum: () => void;
  onIncrementYeppeum: () => void;
  selectedSerumTier: SerumTierItem;
  showStaffRewards: boolean;
  onOpenSerumInfoModal: () => void;
  onOpenWalletModal?: () => void;
}

export function UpsellHeaderAndSerumSection({
  isDark,
  booking,
  customerName,
  customerPhone,
  customerVisits,
  isNewClient,
  serviceName,
  assignedStaffName,
  assignedStaffTier,
  isExistingComboLive,
  redemptionAccounting,
  simulateOnlyRefillLeft,
  onToggleSimulateOnlyRefillLeft,
  yeppeumCount,
  onDecrementYeppeum,
  onIncrementYeppeum,
  selectedSerumTier,
  showStaffRewards,
  onOpenSerumInfoModal,
  onOpenWalletModal,
}: UpsellHeaderAndSerumSectionProps) {
  const isOldComboExpired = Boolean(
    booking?.comboLiveStatus?.isExpired && (booking?.comboLiveStatus?.remainingSessions ?? 0) > 0
  );
  const expiredDateLabel = formatExpiryDateDdMmYyyy(booking?.comboLiveStatus?.dateExpired);
  return (
    <>
      {/* 0. Customer & Lash Service Identity Card (Nhận diện khách hàng & Ca phục vụ) */}
      <div
        className={`${isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-neutral-200/80'} rounded-2xl p-3 shadow-2xs border flex items-center gap-3`}
      >
        {/* Customer Avatar */}
        <div className="relative w-11 h-11 flex-shrink-0">
          <div
            className={`w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-neutral-900 border ${
              isOldComboExpired
                ? 'border-2 border-rose-500 ring-2 ring-rose-500/40'
                : isDark
                  ? 'border-neutral-700'
                  : 'border-neutral-200'
            } shadow-xs`}
          >
            {booking?.customerAvatar ? (
              <img
                src={booking.customerAvatar}
                alt={customerName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/ios-assets/no-image.png';
                }}
              />
            ) : (
              <img src="/ios-assets/no-image.png" alt="No Image" className="w-full h-full object-cover" />
            )}
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 ${isDark ? 'border-neutral-900' : 'border-white'} animate-pulse`}
          />
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`text-[15px] font-black ${isDark ? 'text-white' : 'text-neutral-900'} tracking-tight truncate`}
              >
                {customerName}
              </span>
              {customerPhone && (
                <span
                  className={`text-[11.5px] font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-500'} tabular-nums`}
                >
                  · {customerPhone}
                </span>
              )}
            </div>
            <div
              className={`text-[11.5px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'} mt-0.5 font-medium flex items-center gap-1.5 flex-wrap`}
            >
              <span className="truncate">
                Dịch vụ:{' '}
                <strong className={`${isDark ? 'text-neutral-200' : 'text-neutral-900'} font-bold`}>
                  {serviceName}
                </strong>
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <span>
                  CV:{' '}
                  <strong className={`${isDark ? 'text-neutral-300' : 'text-neutral-800'} font-bold`}>
                    {assignedStaffName}
                  </strong>
                </span>
                {assignedStaffTier === 'CVLL' ? <CvFeather2Badge /> : <CvFeather1Badge />}
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] px-2.5 py-1 rounded-full font-black shrink-0 tracking-tight leading-none inline-flex items-center justify-center ${
              isNewClient
                ? isDark
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                : isDark
                  ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/40'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {isNewClient ? 'KHÁCH MỚI' : `LẦN ${customerVisits}`}
          </span>
        </div>
      </div>

      {/* Section 1A-Expired: GÓI CŨ ĐÃ HẾT HẠN — KHÓA TRỪ 0Đ & GỢI Ý MUA MỚI ĐỂ CỨU BUỔI */}
      {isOldComboExpired && (
        <div
          className={`rounded-2xl p-3 border-2 space-y-2 shadow-xs ${
            isDark ? 'bg-rose-950/35 border-rose-600/80 text-rose-100' : 'bg-rose-50/90 border-rose-400 text-rose-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center justify-center gap-1 leading-none py-1 px-2.5 rounded-full bg-rose-600 text-white text-[10.5px] font-black uppercase tracking-wide tabular-nums">
              <AlertTriangle className="w-3 h-3 shrink-0 stroke-[2.5]" />
              <span>HẾT HẠN {expiredDateLabel}</span>
            </span>
            {onOpenWalletModal && (
              <button
                type="button"
                onClick={onOpenWalletModal}
                className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-neutral-900 border-rose-500/50 text-rose-200 hover:bg-neutral-800'
                    : 'bg-white border-rose-300 text-rose-700 hover:bg-rose-100'
                }`}
              >
                Chi tiết Combo
              </button>
            )}
          </div>
          <div className="text-[12.5px] font-black leading-snug">
            {formatComboName(booking?.comboLiveStatus?.comboName, booking?.comboLiveStatus?.packageKey) ||
              'Gói Combo Cũ'}{' '}
            · Còn {booking?.comboLiveStatus?.remainingSessions} buổi đang khóa 0đ
          </div>
          <div
            className={`text-[11px] font-semibold leading-snug tabular-nums ${isDark ? 'text-rose-200/95' : 'text-rose-900'}`}
          >
            Chọn <strong>Mua gói Combo</strong> bên dưới để tự động <strong>cứu toàn bộ buổi tồn</strong> (✦
            {booking?.comboLiveStatus?.normalRemaining ?? 0} Mới +1T/buổi · ↻
            {booking?.comboLiveStatus?.retainRemaining ?? 0} Dặm +25N/buổi).
          </div>
        </div>
      )}

      {/* Section 1A: CA HÔM NAY · TRỪ VÀO GÓI COMBO ĐANG CÓ (Chỉ hiện khi khách có combo đang chạy) */}
      {isExistingComboLive && redemptionAccounting && (
        <div>
          <div
            className={`text-[11px] font-extrabold ${isDark ? 'text-sky-400' : 'text-sky-900'} uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between gap-2`}
          >
            <span className="flex items-center gap-1.5">
              <Wallet className={`w-3.5 h-3.5 ${isDark ? 'text-sky-400' : 'text-sky-700'}`} />
              1. CA HÔM NAY · TRỪ GÓI ❖ ĐANG CÓ
            </span>
            <ComboExpiryStatusBadge
              status={booking?.comboLiveStatus}
              showPace
              theme={isDark ? 'dark' : 'light'}
              onClick={onOpenWalletModal ? () => onOpenWalletModal() : undefined}
            />
          </div>

          <div
            className={`${isDark ? 'bg-sky-950/30 border-sky-500/30' : 'bg-gradient-to-br from-sky-50/90 to-sky-100/60 border-sky-300'} rounded-2xl p-3 border shadow-xs space-y-2`}
          >
            <div>
              <div className={`text-[14px] font-black ${isDark ? 'text-sky-200' : 'text-sky-950'} leading-snug`}>
                {formatComboName(booking?.comboLiveStatus?.comboName, booking?.comboLiveStatus?.packageKey) ||
                  '❖ Gói Đang Active'}
              </div>
              <div
                className={`text-[12px] ${isDark ? 'text-sky-300' : 'text-sky-800'} font-semibold mt-0.5 leading-snug`}
              >
                {booking?.serviceType === 'Retain' ||
                redemptionAccounting.deductedBucket === 'PAID_REFILL' ||
                redemptionAccounting.deductedBucket === 'BONUS_REFILL'
                  ? 'Trừ 1 lượt dặm'
                  : 'Trừ 1 lượt nối mới'}
                {redemptionAccounting.totalCustomerPayToday > 0 && (
                  <span className="text-amber-400 font-black ml-1.5">
                    (+{redemptionAccounting.totalCustomerPayToday.toLocaleString('vi-VN')}đ phụ thu)
                  </span>
                )}
              </div>
            </div>

            {/* Chi tiết số dư ví trước và sau ca */}
            <div
              className={`p-2.5 ${isDark ? 'bg-black/60 border-sky-500/20 text-neutral-300' : 'bg-white border-sky-200/80 text-neutral-600'} rounded-xl border flex items-center justify-between gap-2 text-[11.5px]`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`font-semibold ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>Trước ca:</span>
                <ComboSessionBadge
                  normalRemaining={
                    redemptionAccounting.walletBefore.paidNew + redemptionAccounting.walletBefore.bonusNew
                  }
                  retainRemaining={
                    redemptionAccounting.walletBefore.paidRefill + redemptionAccounting.walletBefore.bonusRefill
                  }
                  remainingSessions={
                    redemptionAccounting.walletBefore.paidNew +
                    redemptionAccounting.walletBefore.bonusNew +
                    redemptionAccounting.walletBefore.paidRefill +
                    redemptionAccounting.walletBefore.bonusRefill
                  }
                  variant="inline"
                  theme={isDark ? 'dark' : 'light'}
                />
              </div>
              <div className={`${isDark ? 'text-neutral-500' : 'text-neutral-400'} font-bold`}>➔</div>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold ${isDark ? 'text-sky-300' : 'text-sky-900'}`}>Sau ca:</span>
                <ComboSessionBadge
                  normalRemaining={redemptionAccounting.walletAfter.paidNew + redemptionAccounting.walletAfter.bonusNew}
                  retainRemaining={
                    redemptionAccounting.walletAfter.paidRefill + redemptionAccounting.walletAfter.bonusRefill
                  }
                  remainingSessions={
                    redemptionAccounting.walletAfter.paidNew +
                    redemptionAccounting.walletAfter.bonusNew +
                    redemptionAccounting.walletAfter.paidRefill +
                    redemptionAccounting.walletAfter.bonusRefill
                  }
                  size="sm"
                  theme={isDark ? 'dark' : 'light'}
                />
              </div>
            </div>

            {/* Nút giả lập test */}
            <div
              className={`pt-1 flex items-center justify-between text-[10px] ${isDark ? 'text-sky-400/80' : 'text-sky-800/80'}`}
            >
              <span>Trạng thái: Đang ưu tiên trừ gói cũ</span>
              <button
                type="button"
                onClick={onToggleSimulateOnlyRefillLeft}
                className={`px-2 py-0.5 rounded-md ${isDark ? 'bg-neutral-800 border-sky-500/40 text-sky-200 hover:bg-neutral-700' : 'bg-white border-sky-300 text-sky-900 hover:bg-sky-50'} border font-bold active:scale-95 cursor-pointer`}
              >
                {simulateOnlyRefillLeft ? 'Đặt lại: Còn suất Nối' : 'Giả lập: Chỉ còn suất Dặm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 1: CÂY DƯỠNG MI YEPPEUM KOREA (THANG THƯỞNG CV) */}
      <div>
        <div
          className={`text-[11px] font-extrabold ${isDark ? 'text-amber-400' : 'text-amber-800'} uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between`}
        >
          <span>{isExistingComboLive ? '3. DƯỠNG MI YEPPEUM KOREA' : '2. DƯỠNG MI YEPPEUM KOREA'}</span>
        </div>

        <div
          className={`${isDark ? 'bg-neutral-900/90 border-[#FFB400]' : 'bg-white border-[#FFB400]'} border-2 rounded-2xl p-3 shadow-sm space-y-2.5`}
        >
          <div className="flex gap-3">
            <div className="w-16 h-18 rounded-xl bg-[#1C1C1E] border border-neutral-700/60 flex flex-col items-center justify-center p-2 shrink-0">
              <span className="text-[#FFB400] font-black text-[10px] tracking-wider text-center leading-tight">
                YEPPEUM
              </span>
              <span className="text-white text-[9.5px] font-bold mt-0.5 tracking-wider">KOREA</span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-1">
                <span className={`text-[14px] font-bold ${isDark ? 'text-white' : 'text-black'} leading-snug`}>
                  Dưỡng Mi Yeppeum Korea
                </span>
                <div
                  className={`${isDark ? 'bg-neutral-800 text-neutral-200 border border-neutral-700/60' : 'bg-[#F2F2F7] text-gray-800'} rounded-lg px-2 py-0.5 flex items-center gap-2 text-[12px] font-bold shrink-0`}
                >
                  <button
                    onClick={onDecrementYeppeum}
                    className={`px-1 ${isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-black'} active:scale-90`}
                  >
                    -
                  </button>
                  <span className="tabular-nums font-black">{yeppeumCount}</span>
                  <button
                    onClick={onIncrementYeppeum}
                    className={`px-1 ${isDark ? 'text-neutral-400 hover:text-white' : 'text-gray-500 hover:text-black'} active:scale-90`}
                  >
                    +
                  </button>
                </div>
              </div>
              <div className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-gray-600'} mt-1 leading-tight`}>
                Phục hồi nang mi thật, không làm thâm mắt. Giải pháp tuyệt vời cho những người vừa nối vừa dưỡng mi.
              </div>
            </div>
          </div>

          {/* Compact Tier Selector Bar & (i) Info Button (Full Width) */}
          <div className={`pt-2 border-t ${isDark ? 'border-neutral-800' : 'border-gray-100'} flex items-center gap-2`}>
            <button
              type="button"
              onClick={onOpenSerumInfoModal}
              className={`flex-1 flex items-center justify-between px-3 py-2 rounded-xl ${isDark ? 'bg-amber-950/30 border-amber-500/30 hover:bg-amber-950/50' : 'bg-amber-50/80 border-amber-200/90 hover:bg-amber-100/80'} border transition-all text-left cursor-pointer active:scale-[0.99]`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[13px] font-black ${isDark ? 'text-amber-300' : 'text-amber-950'} truncate`}>
                  {selectedSerumTier.price > 0
                    ? `${selectedSerumTier.price.toLocaleString('vi-VN')}đ`
                    : 'Tặng kèm (Trị giá 1.100.000đ)'}
                </span>
                <span
                  className={`text-[10.5px] font-bold ${isDark ? 'text-neutral-300 bg-black/60 border-neutral-700' : 'text-gray-600 bg-white border-gray-200'} px-2 py-0.5 rounded-md border truncate`}
                >
                  {selectedSerumTier.label.split('(')[0].trim()}
                </span>
              </div>
              {showStaffRewards && (
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] font-black ${isDark ? 'text-emerald-300 bg-emerald-950/50 border-emerald-500/40' : 'text-emerald-700 bg-white border-emerald-200'} px-2 py-0.5 rounded-md border tabular-nums`}
                  >
                    +{Math.round(selectedSerumTier.cvBonus / 1000)}
                    <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                  </span>
                </div>
              )}
            </button>

            {showStaffRewards && (
              <button
                type="button"
                onClick={onOpenSerumInfoModal}
                className={`w-9 h-9 rounded-xl ${isDark ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 hover:bg-amber-400/30' : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'} flex items-center justify-center font-bold shrink-0 shadow-xs active:scale-90 transition-transform cursor-pointer border`}
                title="Xem chi tiết thang thưởng"
              >
                <Info className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
