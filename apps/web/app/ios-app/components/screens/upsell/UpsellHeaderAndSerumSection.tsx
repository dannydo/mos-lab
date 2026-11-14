'use client';

import React from 'react';
import { Wallet, AlertTriangle } from 'lucide-react';
import { calculateComboRedemptionAccounting, formatExpiryDateDdMmYyyy } from '@mos-lab/shared';
import { BookingItem, SERUM_TIERS_CVL } from '../../../state/mockData';
import { CvFeather2Badge, CvFeather1Badge } from '../../ui-kit/CvFeatherLabels';
import { ComboSessionBadge } from '../../ui-kit/ComboSessionBadge';
import { ComboExpiryStatusBadge } from '../../ui-kit/ComboExpiryStatusBadge';
import { formatComboName } from '../LashMaterialConstraintMatrix';
import { UpsellSerumCard } from './UpsellSerumCard';

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
  cartProducts?: NonNullable<BookingItem['cartProducts']>;
  onOpenQrScanner: () => void;
  onRemoveScannedUnit: (productIndex: number, inventoryWarehouseItemId?: number) => void;
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
  cartProducts,
  onOpenQrScanner,
  onRemoveScannedUnit,
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
        className={`bg-[var(--mos-surface)] border-[var(--mos-surface-border)] rounded-2xl p-3 shadow-2xs border flex items-center gap-3`}
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
              <span className={`text-[15px] font-black text-[var(--mos-text)] tracking-tight truncate`}>
                {customerName}
              </span>
              {customerPhone && (
                <span className={`text-[11.5px] font-bold text-[var(--mos-text-muted)] tabular-nums`}>
                  · {customerPhone}
                </span>
              )}
            </div>
            <div
              className={`text-[11.5px] text-[var(--mos-text-muted)] mt-0.5 font-medium flex items-center gap-1.5 flex-wrap`}
            >
              <span className="truncate">
                Dịch vụ:{' '}
                <strong className={`${isDark ? 'text-neutral-200' : 'text-neutral-900'} font-bold`}>
                  {serviceName}
                </strong>
              </span>
              {showStaffRewards && (
                <>
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
                </>
              )}
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
                <span className={`font-semibold text-[var(--mos-text-muted)]`}>Trước ca:</span>
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
      <UpsellSerumCard
        isDark={isDark}
        isExistingComboLive={isExistingComboLive}
        yeppeumCount={yeppeumCount}
        cartProducts={cartProducts}
        onOpenQrScanner={onOpenQrScanner}
        onRemoveScannedUnit={onRemoveScannedUnit}
        selectedSerumTier={selectedSerumTier}
        showStaffRewards={showStaffRewards}
        onOpenSerumInfoModal={onOpenSerumInfoModal}
      />
    </>
  );
}
