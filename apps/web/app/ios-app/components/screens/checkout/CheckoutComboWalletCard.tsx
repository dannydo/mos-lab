'use client';

import React, { useCallback } from 'react';
import {
  formatExpiryDateDdMmYyyy,
  matchComboCategoryAndVolumeFromBooking,
  resolveActiveBookingComboWallets,
  type ResolveActiveBookingComboWalletsResult,
} from '@mos-lab/shared';
import { Wallet } from 'lucide-react';
import type { BookingItem } from '../../../state/mockData';
import { ComboWalletSelectorList } from '../../ui-kit/ComboWalletSelectorList';
import { getWingsMenuDetail, parseDaysSinceLastVisit } from '../LashMaterialConstraintMatrix';
import { computeUpsellRedemptionAccounting } from '../upsell/upsellAccountingHelpers';

export function resolveCheckoutFallbackServicePrice(booking: BookingItem | undefined, serviceName: string): number {
  if (booking?.servicePrice && booking.servicePrice > 0) return booking.servicePrice;
  const menuDetail = getWingsMenuDetail(
    booking?.attributes?.material || serviceName || '',
    booking?.attributes?.count || '',
    booking?.attributes?.volume || ''
  );
  if (menuDetail) {
    const isRetainSvc =
      String(booking?.serviceType || '').toLowerCase() === 'retain' ||
      serviceName.toLowerCase().includes('dặm') ||
      serviceName.toLowerCase().includes('refill');
    return isRetainSvc ? menuDetail.refillPrice : menuDetail.newPrice;
  }
  return 770000;
}

export type SelectComboWalletHandler = (params: {
  targetBookingId?: number;
  selectedUpperComboBalanceId?: number | null;
  selectedUnderComboBalanceId?: number | null;
  skipUpperCombo?: boolean;
  skipUnderCombo?: boolean;
  comboRedemption?: BookingItem['comboRedemption'] | null;
}) => void;

export function buildCheckoutUpperWalletRedemption(
  booking: BookingItem,
  walletBalanceId: number
): BookingItem['comboRedemption'] | null {
  const simulatedBooking: BookingItem = {
    ...booking,
    selectedUpperComboBalanceId: walletBalanceId,
    skipUpperCombo: false,
  };
  const nextResolved = resolveActiveBookingComboWallets(simulatedBooking);
  const nextEff = nextResolved.effectiveComboLiveStatus;
  const existingComboMatch = matchComboCategoryAndVolumeFromBooking({
    comboName: nextEff.comboName,
    serviceKey: nextEff.serviceKey,
    serviceName: booking.originalBookedServiceName || booking.serviceName,
  });
  const targetMatch = matchComboCategoryAndVolumeFromBooking({
    serviceName: booking.serviceName,
    servicePrice: booking.servicePrice,
    material: booking.attributes?.material,
    volume: booking.attributes?.volume,
    count: booking.attributes?.count,
    comboName: nextEff.comboName,
    serviceKey: nextEff.serviceKey,
  });
  const daysSince = parseDaysSinceLastVisit(booking.lashHistory?.[0]?.date);
  const acct = nextResolved.isRedeemingUpperToday
    ? computeUpsellRedemptionAccounting({
        isExistingComboLive: true,
        simulateOnlyRefillLeft: false,
        booking: simulatedBooking,
        existingComboCategoryId: existingComboMatch.categoryId,
        existingComboVolume: existingComboMatch.volume,
        targetCategoryId: targetMatch.categoryId,
        targetVolume: targetMatch.volume,
        daysSinceLastVisit: daysSince,
      })
    : null;

  if (!nextResolved.isRedeemingUpperToday || !acct) {
    return null;
  }

  return {
    balanceId: nextResolved.selectedUpperComboBalanceId,
    redeemSession: true,
    comboName: acct.comboName,
    deductedBucket: acct.deductedBucket,
    typeConversionSurcharge: acct.typeConversionSurcharge,
    upgradeVolumeSurcharge: acct.upgradeVolumeSurcharge,
    totalCustomerPayToday: acct.totalCustomerPayToday,
    recognizedRevenueToday: acct.recognizedRevenueToday,
    remainingAfterToday: acct.walletAfter.totalRemaining,
    explanation: acct.explanation,
    totalSessions:
      acct.walletBefore.paidNew +
      acct.walletBefore.paidRefill +
      acct.walletBefore.bonusNew +
      acct.walletBefore.bonusRefill +
      1,
    paidRemaining: acct.walletAfter.paidNew + acct.walletAfter.paidRefill,
    bonusRemaining: acct.walletAfter.bonusNew + acct.walletAfter.bonusRefill,
    dateExpired: nextEff.dateExpired || null,
    dateExpiredDisplay: formatExpiryDateDdMmYyyy(nextEff.dateExpired) || null,
  };
}

export interface CheckoutComboWalletCardProps {
  isDark: boolean;
  isSettled: boolean;
  booking?: BookingItem;
  resolvedWallets: ResolveActiveBookingComboWalletsResult;
  onSelectComboWallet?: SelectComboWalletHandler;
}

export function CheckoutComboWalletCard({
  isDark,
  isSettled,
  booking,
  resolvedWallets,
  onSelectComboWallet,
}: CheckoutComboWalletCardProps) {
  const handleSelectUpperWallet = useCallback(
    (walletBalanceId: number) => {
      if (!booking || !onSelectComboWallet) return;
      onSelectComboWallet({
        selectedUpperComboBalanceId: walletBalanceId,
        skipUpperCombo: false,
        comboRedemption: buildCheckoutUpperWalletRedemption(booking, walletBalanceId),
      });
    },
    [booking, onSelectComboWallet]
  );

  const hasUnderMink = Boolean(booking?.attributes?.hasUnderMink);
  if (
    isSettled ||
    !onSelectComboWallet ||
    (resolvedWallets.upperWallets.length === 0 && !(hasUnderMink && resolvedWallets.underWallets.length > 0))
  ) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border p-3 space-y-2 shadow-2xs ${
        isDark ? 'bg-neutral-900/90 border-neutral-800' : 'bg-white border-neutral-200/80'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5" />
          Chọn Ví Gói Combo Ca Này
        </span>
        {resolvedWallets.skipUpperCombo && resolvedWallets.liveUpperWallets.length > 0 && (
          <span className="text-[10px] font-black text-amber-400">Đi lẻ ca này · Giữ gói ❖</span>
        )}
      </div>
      {resolvedWallets.upperWallets.length > 0 && (
        <ComboWalletSelectorList
          wallets={resolvedWallets.upperWallets}
          selectedBalanceId={resolvedWallets.selectedUpperComboBalanceId}
          skipCombo={resolvedWallets.skipUpperCombo}
          serviceGroup="upper"
          compact
          onSelectWallet={(wallet) => handleSelectUpperWallet(wallet.balanceId)}
          onSelectSkipCombo={() =>
            onSelectComboWallet({
              selectedUpperComboBalanceId: null,
              skipUpperCombo: true,
              comboRedemption: null,
            })
          }
        />
      )}
      {hasUnderMink && resolvedWallets.underWallets.length > 0 && (
        <ComboWalletSelectorList
          wallets={resolvedWallets.underWallets}
          selectedBalanceId={resolvedWallets.selectedUnderComboBalanceId}
          skipCombo={resolvedWallets.skipUnderCombo}
          serviceGroup="under"
          compact
          className={resolvedWallets.upperWallets.length > 0 ? 'pt-2 border-t border-neutral-500/20' : ''}
          onSelectWallet={(wallet) =>
            onSelectComboWallet({
              selectedUnderComboBalanceId: wallet.balanceId,
              skipUnderCombo: false,
            })
          }
          onSelectSkipCombo={() =>
            onSelectComboWallet({
              selectedUnderComboBalanceId: null,
              skipUnderCombo: true,
            })
          }
        />
      )}
    </div>
  );
}
