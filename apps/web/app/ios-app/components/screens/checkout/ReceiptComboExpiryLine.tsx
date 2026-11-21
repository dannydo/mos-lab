'use client';

import React from 'react';
import { CalendarClock } from 'lucide-react';
import {
  formatExpiryDateDdMmYyyy,
  resolveActiveBookingComboWallets,
  type ResolveActiveBookingComboWalletsResult,
} from '@mos-lab/shared';
import type { BookingItem } from '../../../state/mockData';

export interface ReceiptComboExpiryLineProps {
  dateExpired?: string | null;
  dateExpiredDisplay?: string | null;
  expiryFormulaSummary?: string | null;
  revivedExpiredSessions?: number;
  isDark: boolean;
  variant?: 'combo' | 'under' | 'redemption';
  showFormula?: boolean;
}

export function ReceiptComboExpiryLine({
  dateExpired,
  dateExpiredDisplay,
  expiryFormulaSummary,
  revivedExpiredSessions = 0,
  isDark,
  variant = 'combo',
  showFormula = false,
}: ReceiptComboExpiryLineProps) {
  const displayDate = dateExpiredDisplay || formatExpiryDateDdMmYyyy(dateExpired);
  if (!displayDate && revivedExpiredSessions <= 0) {
    return null;
  }

  const toneClass =
    variant === 'under'
      ? isDark
        ? 'text-purple-300'
        : 'text-purple-800'
      : variant === 'redemption'
        ? isDark
          ? 'text-sky-300'
          : 'text-sky-800'
        : isDark
          ? 'text-amber-300'
          : 'text-amber-800';

  return (
    <div className="pt-0.5 space-y-0.5 tabular-nums">
      <div className={`inline-flex items-center gap-1 flex-wrap text-[10.5px] font-extrabold ${toneClass}`}>
        <CalendarClock className="w-3 h-3 shrink-0" />
        {displayDate && <span>HSD: {displayDate}</span>}
        {revivedExpiredSessions > 0 && (
          <span className={isDark ? 'text-emerald-300' : 'text-emerald-700'}>
            {displayDate ? '· ' : ''}Đã cứu {revivedExpiredSessions} buổi gói cũ
          </span>
        )}
      </div>
      {showFormula && expiryFormulaSummary && (
        <div className={`text-[9.5px] font-medium leading-snug text-[var(--mos-text-muted)]`}>
          {expiryFormulaSummary}
        </div>
      )}
    </div>
  );
}

function cleanComboTitle(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\(\d+\s*lần\)/gi, '').trim();
}

export function ThermalReceiptComboItemsSection({
  isDark,
  booking,
  selectedCombo,
  selectedUnderCombo,
  comboRedemption,
}: {
  isDark: boolean;
  booking?: BookingItem;
  selectedCombo: BookingItem['selectedCombo'] | null;
  selectedUnderCombo: BookingItem['selectedUnderCombo'] | null;
  comboRedemption: BookingItem['comboRedemption'] | null;
}) {
  const resolvedWallets = resolveActiveBookingComboWallets(booking || {});
  const activeUnderWallet = resolvedWallets.activeUnderWallet;
  const hasUnderRedemption = Boolean(
    booking?.attributes?.hasUnderMink && resolvedWallets.isRedeemingUnderToday && activeUnderWallet
  );
  const underBalanceSuffix =
    resolvedWallets.underWallets.length >= 2 && activeUnderWallet && activeUnderWallet.balanceId > 0
      ? ` (#${activeUnderWallet.balanceId})`
      : '';
  return (
    <>
      {selectedCombo && (
        <div className="space-y-1">
          <div className={`flex justify-between items-baseline gap-2 ${isDark ? 'text-neutral-200' : 'text-black'}`}>
            <span className="font-bold text-[12.5px] flex-1 min-w-0">
              {comboRedemption ? '2. Mua thêm: ' : '2. '}
              {cleanComboTitle(selectedCombo.name)}
            </span>
            <span
              className={`tabular-nums text-[var(--mos-text)] font-extrabold whitespace-nowrap shrink-0 text-[12.5px]`}
            >
              {selectedCombo.price.toLocaleString('vi-VN')} đ
            </span>
          </div>
          {selectedCombo.remainingAfterToday && (
            <div
              className={`text-[10px] ${isDark ? 'text-indigo-300 bg-indigo-950/50 border-indigo-800' : 'text-indigo-900 bg-indigo-50/80 border-indigo-200'} px-2 py-1 rounded-md border tabular-nums`}
            >
              ✨ Combo Mi Trên: ✦{' '}
              <strong>{selectedCombo.remainingAfterToday.paidNew + selectedCombo.remainingAfterToday.bonusNew}</strong>{' '}
              · ↻{' '}
              <strong>
                {selectedCombo.remainingAfterToday.paidRefill + selectedCombo.remainingAfterToday.bonusRefill}
              </strong>{' '}
              (Đủ {selectedCombo.remainingAfterToday.totalRemaining} buổi)
            </div>
          )}
          <ReceiptComboExpiryLine
            dateExpired={selectedCombo.dateExpired}
            dateExpiredDisplay={selectedCombo.dateExpiredDisplay}
            expiryFormulaSummary={selectedCombo.expiryFormulaSummary}
            revivedExpiredSessions={selectedCombo.revivedExpiredSessions}
            isDark={isDark}
            variant="combo"
            showFormula
          />
        </div>
      )}

      {selectedUnderCombo && (
        <div className="space-y-1">
          <div className={`flex justify-between items-baseline gap-2 ${isDark ? 'text-neutral-200' : 'text-black'}`}>
            <span className="font-bold text-[12.5px] flex-1 min-w-0">
              {selectedCombo ? '2B. ' : '2. '}
              {cleanComboTitle(selectedUnderCombo.name)}
            </span>
            <span
              className={`tabular-nums text-[var(--mos-text)] font-extrabold whitespace-nowrap shrink-0 text-[12.5px]`}
            >
              {selectedUnderCombo.price.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div
            className={`text-[10px] ${isDark ? 'text-purple-300 bg-purple-950/50 border-purple-800' : 'text-purple-900 bg-purple-50/80 border-purple-200'} px-2 py-1 rounded-md border tabular-nums`}
          >
            ✨ Combo Mi Dưới:{' '}
            {selectedUnderCombo.remainingAfterToday
              ? `Còn ${selectedUnderCombo.remainingAfterToday.totalRemaining} buổi sau ca hôm nay (Gói ${selectedUnderCombo.sessions || 5} buổi)`
              : `Đủ ${selectedUnderCombo.sessions || 5} buổi (Mi Dưới)`}
          </div>
          <ReceiptComboExpiryLine
            dateExpired={selectedUnderCombo.dateExpired}
            dateExpiredDisplay={selectedUnderCombo.dateExpiredDisplay}
            revivedExpiredSessions={selectedUnderCombo.revivedExpiredSessions}
            isDark={isDark}
            variant="under"
          />
        </div>
      )}

      {comboRedemption && (
        <div
          className={`text-[10.5px] ${isDark ? 'text-sky-300 bg-sky-950/50 border-sky-800' : 'text-sky-900 bg-sky-50 border-sky-200'} p-2 rounded-lg border tabular-nums`}
        >
          • {comboRedemption.explanation} · Combo Mi Trên
          {resolvedWallets.upperWallets.length >= 2 &&
          (comboRedemption.balanceId || resolvedWallets.selectedUpperComboBalanceId)
            ? ` #${comboRedemption.balanceId || resolvedWallets.selectedUpperComboBalanceId}`
            : ''}{' '}
          còn ✦ <strong>{comboRedemption.paidRemaining ?? 0}</strong> · ↻{' '}
          <strong>{comboRedemption.bonusRemaining ?? 0}</strong>
          <ReceiptComboExpiryLine
            dateExpired={comboRedemption.dateExpired ?? resolvedWallets.effectiveComboLiveStatus.dateExpired}
            dateExpiredDisplay={comboRedemption.dateExpiredDisplay}
            isDark={isDark}
            variant="redemption"
          />
        </div>
      )}

      {hasUnderRedemption && activeUnderWallet && (
        <div
          className={`text-[10.5px] ${isDark ? 'text-purple-300 bg-purple-950/50 border-purple-800' : 'text-purple-900 bg-purple-50 border-purple-200'} p-2 rounded-lg border tabular-nums`}
        >
          • Trừ 1 lượt gói Mi Dưới: {activeUnderWallet.comboName}
          {underBalanceSuffix} · ✦ <strong>{activeUnderWallet.normalRemaining}</strong> · ↻{' '}
          <strong>{activeUnderWallet.retainRemaining}</strong>
          <ReceiptComboExpiryLine dateExpired={activeUnderWallet.dateExpired} isDark={isDark} variant="under" />
        </div>
      )}
    </>
  );
}

export function CheckoutServiceComboStatusBadges({
  isDark,
  booking,
  resolvedWallets,
  comboRedemption,
  hasNewComboWaiver,
  selectedCombo,
  effectiveServiceCharge,
  upgradePrice,
}: {
  isDark: boolean;
  booking?: BookingItem;
  resolvedWallets: ResolveActiveBookingComboWalletsResult;
  comboRedemption: BookingItem['comboRedemption'] | null;
  hasNewComboWaiver: boolean;
  selectedCombo: BookingItem['selectedCombo'] | null;
  effectiveServiceCharge: number;
  upgradePrice: number;
}) {
  const hasMultipleUpperWallets = resolvedWallets.upperWallets.length >= 2;
  const hasMultipleUnderWallets = resolvedWallets.underWallets.length >= 2;
  const activeUpperBalanceId = comboRedemption?.balanceId ?? resolvedWallets.selectedUpperComboBalanceId ?? null;
  const activeUnderWallet = resolvedWallets.activeUnderWallet;
  const isRedeemingUnderToday = Boolean(
    booking?.attributes?.hasUnderMink && resolvedWallets.isRedeemingUnderToday && activeUnderWallet
  );

  return (
    <>
      {comboRedemption ? (
        <div className="pt-0.5 space-y-0.5 text-[10px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`font-bold ${
                isDark ? 'text-sky-300 bg-sky-950/40 border-sky-500/40' : 'text-sky-700 bg-sky-50 border-sky-200'
              } border px-1.5 py-0.5 rounded`}
            >
              Trừ 1 lượt gói ({comboRedemption.comboName || 'Gói cũ'}
              {hasMultipleUpperWallets && activeUpperBalanceId ? ` #${activeUpperBalanceId}` : ''})
            </span>
            <span className="text-neutral-400 font-semibold tabular-nums">
              Combo còn: ✦ {comboRedemption.paidRemaining ?? 0} · ↻ {comboRedemption.bonusRemaining ?? 0}
            </span>
          </div>
          <ReceiptComboExpiryLine
            dateExpired={comboRedemption.dateExpired ?? resolvedWallets.effectiveComboLiveStatus.dateExpired}
            dateExpiredDisplay={comboRedemption.dateExpiredDisplay}
            isDark={isDark}
            variant="redemption"
          />
        </div>
      ) : hasNewComboWaiver ? (
        <div className="pt-0.5">
          <span
            className={`inline-flex items-center text-[10px] font-bold ${
              isDark
                ? 'text-emerald-300 bg-emerald-950/40 border-emerald-500/40'
                : 'text-emerald-700 bg-emerald-50 border-emerald-200'
            } border px-1.5 py-0.5 rounded`}
          >
            {effectiveServiceCharge === 0
              ? 'Trừ Buổi 1 (Miễn phí ca này)'
              : 'Trừ Buổi 1 gói đã chọn · Thu lẻ phần còn lại'}
          </span>
        </div>
      ) : selectedCombo ? (
        <div className="pt-0.5">
          <span
            className={`inline-flex items-center text-[10px] font-bold ${
              isDark
                ? 'text-indigo-300 bg-indigo-950/40 border-indigo-500/40'
                : 'text-indigo-700 bg-indigo-50 border-indigo-200'
            } border px-1.5 py-0.5 rounded`}
          >
            Trả lẻ ca này · Giữ trọn số buổi gói
          </span>
        </div>
      ) : resolvedWallets.skipUpperCombo && resolvedWallets.liveUpperWallets.length > 0 ? (
        <div className="pt-0.5">
          <span
            className={`inline-flex items-center text-[10px] font-bold ${
              isDark
                ? 'text-amber-300 bg-amber-950/40 border-amber-500/40'
                : 'text-amber-800 bg-amber-50 border-amber-200'
            } border px-1.5 py-0.5 rounded`}
          >
            Trả lẻ ca này · Giữ nguyên gói ❖
          </span>
        </div>
      ) : (
        upgradePrice > 0 && (
          <div className="pt-0.5">
            <span
              className={`inline-flex items-center text-[10px] font-bold ${
                isDark
                  ? 'text-emerald-300 bg-emerald-950/40 border-emerald-500/40'
                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
              } border px-1.5 py-0.5 rounded tabular-nums`}
            >
              Nâng cấp (+{upgradePrice.toLocaleString('vi-VN')}đ)
            </span>
          </div>
        )
      )}
      {isRedeemingUnderToday && activeUnderWallet && (
        <div className="pt-0.5 flex items-center gap-1.5 flex-wrap text-[10px]">
          <span
            className={`font-bold ${
              isDark
                ? 'text-purple-300 bg-purple-950/40 border-purple-500/40'
                : 'text-purple-700 bg-purple-50 border-purple-200'
            } border px-1.5 py-0.5 rounded`}
          >
            Trừ 1 lượt gói Mi Dưới ({activeUnderWallet.comboName}
            {hasMultipleUnderWallets && activeUnderWallet.balanceId > 0 ? ` #${activeUnderWallet.balanceId}` : ''})
          </span>
          <span className="text-neutral-400 font-semibold tabular-nums">
            ✦ {activeUnderWallet.normalRemaining} · ↻ {activeUnderWallet.retainRemaining}
          </span>
        </div>
      )}
    </>
  );
}

export function ThermalServiceComboSubnote({
  isDark,
  resolvedWallets,
  comboRedemption,
  selectedCombo,
  selectedUnderCombo,
  effectiveServiceCharge,
}: {
  isDark: boolean;
  resolvedWallets: ResolveActiveBookingComboWalletsResult;
  comboRedemption: BookingItem['comboRedemption'] | null;
  selectedCombo: BookingItem['selectedCombo'] | null;
  selectedUnderCombo: BookingItem['selectedUnderCombo'] | null;
  effectiveServiceCharge: number;
}) {
  const hasMultipleUpperWallets = resolvedWallets.upperWallets.length >= 2;
  const activeUpperBalanceId = comboRedemption?.balanceId ?? resolvedWallets.selectedUpperComboBalanceId ?? null;

  if (comboRedemption) {
    return (
      <div className={`text-[10.5px] ${isDark ? 'text-sky-400' : 'text-sky-700'} font-bold`}>
        ✓ Trừ 1 lượt gói
        {comboRedemption.comboName || resolvedWallets.effectiveComboLiveStatus.comboName
          ? ` (${comboRedemption.comboName || resolvedWallets.effectiveComboLiveStatus.comboName}${
              hasMultipleUpperWallets && activeUpperBalanceId ? ` #${activeUpperBalanceId}` : ''
            })`
          : ''}{' '}
        · Combo còn{' '}
        <span className={`tabular-nums font-black ${isDark ? 'text-sky-300' : 'text-sky-900'}`}>
          ✦ {comboRedemption.paidRemaining ?? 0} · ↻ {comboRedemption.bonusRemaining ?? 0}
        </span>
      </div>
    );
  }
  if (
    (selectedCombo && selectedCombo.todaySingleServiceWaived !== false) ||
    (selectedUnderCombo && selectedUnderCombo.todaySingleServiceWaived !== false)
  ) {
    return (
      <div className={`text-[10.5px] ${isDark ? 'text-emerald-400' : 'text-emerald-700'} font-bold`}>
        {effectiveServiceCharge === 0
          ? '✓ Trừ vào Buổi 1 gói mới mua (Miễn thu lẻ ca này)'
          : '✓ Đã trừ Buổi 1 gói mới mua · Thu lẻ dịch vụ còn lại'}
      </div>
    );
  }
  if (selectedCombo) {
    return (
      <div className={`text-[10.5px] ${isDark ? 'text-indigo-400' : 'text-indigo-700'} font-bold`}>
        ✓ Khách trả lẻ ca này · Giữ trọn số buổi gói mới mua
      </div>
    );
  }
  if (resolvedWallets.skipUpperCombo && resolvedWallets.liveUpperWallets.length > 0) {
    return (
      <div className={`text-[10.5px] ${isDark ? 'text-amber-400' : 'text-amber-800'} font-bold`}>
        ✓ Trả lẻ ca này · Giữ nguyên gói ❖
      </div>
    );
  }
  return null;
}
