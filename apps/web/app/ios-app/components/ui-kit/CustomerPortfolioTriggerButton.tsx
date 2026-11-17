'use client';

import React, { useMemo, useState } from 'react';
import { Camera } from 'lucide-react';
import type { IosBookingItem, IosBookingProgress, IosCustomerHistoryTab } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { getLocalProgressSnapshot } from '../../state/offlineSync';
import { CustomerHistoryAndSpendingSheet } from './CustomerHistoryAndSpendingSheet';

interface CustomerPortfolioTriggerButtonProps {
  booking?: (Partial<IosBookingItem> & Pick<IosBookingItem, 'id' | 'customerName'>) | null;
  customerFacingMode?: boolean;
  isSimulationMode?: boolean;
  initialTab?: IosCustomerHistoryTab;
  compact?: boolean;
  label?: string;
}

function countCapturedPhotos(
  booking?: Partial<IosBookingItem> | null,
  localSnap?: Partial<IosBookingProgress> | null
): number {
  const candidates = [
    booking?.progress?.beforePhotoUrl || localSnap?.beforePhotoUrl,
    booking?.progress?.cleanedPhotoUrl || localSnap?.cleanedPhotoUrl,
    booking?.progress?.afterPhotoUrl || localSnap?.afterPhotoUrl,
    booking?.progress?.underBeforePhotoUrl || localSnap?.underBeforePhotoUrl,
    booking?.progress?.underCleanedPhotoUrl || localSnap?.underCleanedPhotoUrl,
    booking?.progress?.underAfterPhotoUrl || localSnap?.underAfterPhotoUrl,
  ];
  return candidates.filter((u) => typeof u === 'string' && u.trim().length > 0 && !u.trim().startsWith('DECLINED:'))
    .length;
}

export function CustomerPortfolioTriggerButton({
  booking,
  customerFacingMode = false,
  isSimulationMode = false,
  initialTab = 'LASH_PHOTOS',
  compact = false,
  label,
}: CustomerPortfolioTriggerButtonProps) {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const [isOpen, setIsOpen] = useState(false);

  const bookingId = booking?.id ?? 0;
  const localSnap = useMemo(
    () => (bookingId > 0 ? (getLocalProgressSnapshot(bookingId) as Partial<IosBookingProgress> | null) : null),
    [bookingId]
  );

  if (!booking) return null;

  const photoCount = countCapturedPhotos(booking, localSnap);
  const visitCount = Math.max(0, (booking.customerVisits || 1) - 1);
  const badgeText =
    photoCount > 0 ? `${photoCount} ảnh hôm nay` : visitCount > 0 ? `${visitCount} lần trước` : 'Mở hồ sơ';

  return (
    <>
      <button
        type="button"
        data-testid="open-lash-portfolio-btn"
        onClick={() => setIsOpen(true)}
        className={`w-full rounded-2xl border flex items-center justify-between gap-2 transition-all active:scale-[0.99] cursor-pointer ${
          compact ? 'px-3 py-2 text-[11.5px]' : 'px-3.5 py-2.5 text-[12px]'
        } font-extrabold shadow-xs ${
          isDark
            ? 'border-amber-500/35 bg-amber-950/25 text-amber-200 hover:bg-amber-950/40'
            : 'border-amber-300 bg-amber-50/90 text-amber-900 hover:bg-amber-100/80'
        }`}
      >
        <span className="inline-flex items-center gap-2 min-w-0 truncate">
          <Camera className={`h-4 w-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
          <span className="truncate">{label || '📸 Hồ Sơ Ảnh (B/C/A) & Lịch Sử Mi'}</span>
        </span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums leading-none ${
            isDark ? 'bg-amber-400 text-black' : 'bg-amber-400 text-black'
          }`}
        >
          {badgeText}
        </span>
      </button>

      <CustomerHistoryAndSpendingSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        booking={booking}
        initialTab={initialTab}
        isSimulationMode={isSimulationMode}
        customerFacingMode={customerFacingMode}
      />
    </>
  );
}
