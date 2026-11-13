'use client';

import React from 'react';
import { CalendarClock } from 'lucide-react';
import { formatExpiryDateDdMmYyyy } from '@mos-lab/shared';
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
        <div className={`text-[9.5px] font-medium leading-snug ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
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
              className={`tabular-nums ${isDark ? 'text-white' : 'text-black'} font-extrabold whitespace-nowrap shrink-0 text-[12.5px]`}
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
              className={`tabular-nums ${isDark ? 'text-white' : 'text-black'} font-extrabold whitespace-nowrap shrink-0 text-[12.5px]`}
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
          • {comboRedemption.explanation} · Combo Mi Trên còn ✦ <strong>{comboRedemption.paidRemaining ?? 0}</strong> ·
          ↻ <strong>{comboRedemption.bonusRemaining ?? 0}</strong>
          <ReceiptComboExpiryLine
            dateExpired={comboRedemption.dateExpired ?? booking?.comboLiveStatus?.dateExpired}
            dateExpiredDisplay={comboRedemption.dateExpiredDisplay}
            isDark={isDark}
            variant="redemption"
          />
        </div>
      )}
    </>
  );
}
