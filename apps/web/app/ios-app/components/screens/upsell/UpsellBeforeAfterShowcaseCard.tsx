'use client';

import React, { useMemo, useState } from 'react';
import { Camera, Columns2, History, Maximize2 } from 'lucide-react';
import type { IosBookingItem, IosBookingProgress, LashHistoryPhoto } from '@mos-lab/shared';
import { getLocalProgressSnapshot } from '../../../state/offlineSync';
import { CustomerHistoryAndSpendingSheet } from '../../ui-kit/CustomerHistoryAndSpendingSheet';
import {
  LashPhotoCompareLightbox,
  LashPhotoComparePayload,
} from '../../ui-kit/customer-history/LashPhotoCompareLightbox';

interface UpsellBeforeAfterShowcaseCardProps {
  booking?: IosBookingItem;
  isDark: boolean;
  customerFacingMode?: boolean;
}

function isUsableUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  return Boolean(trimmed) && !trimmed.startsWith('DECLINED:');
}

function buildRoundPhotos(urls: { before?: unknown; cleaned?: unknown; after?: unknown }): LashHistoryPhoto[] {
  const out: LashHistoryPhoto[] = [];
  if (isUsableUrl(urls.before)) out.push({ type: 'before', label: '1. Before · Mắt mộc', url: urls.before });
  if (isUsableUrl(urls.cleaned)) out.push({ type: 'cleaned', label: '2. Cleaning · Vệ sinh', url: urls.cleaned });
  if (isUsableUrl(urls.after)) out.push({ type: 'after', label: '3. After · Hoàn thiện', url: urls.after });
  return out;
}

export function UpsellBeforeAfterShowcaseCard({
  booking,
  isDark,
  customerFacingMode = false,
}: UpsellBeforeAfterShowcaseCardProps) {
  const [selectedRound, setSelectedRound] = useState<'UPPER' | 'UNDER'>('UPPER');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [lightboxPayload, setLightboxPayload] = useState<LashPhotoComparePayload | null>(null);

  const bookingId = booking?.id ?? 0;
  const localSnap = useMemo(
    () => (bookingId > 0 ? (getLocalProgressSnapshot(bookingId) as Partial<IosBookingProgress> | null) : null),
    [bookingId]
  );

  const upperPhotos = useMemo(
    () =>
      buildRoundPhotos({
        before: booking?.progress?.beforePhotoUrl || localSnap?.beforePhotoUrl,
        cleaned: booking?.progress?.cleanedPhotoUrl || localSnap?.cleanedPhotoUrl,
        after: booking?.progress?.afterPhotoUrl || localSnap?.afterPhotoUrl,
      }),
    [booking?.progress, localSnap]
  );

  const underPhotos = useMemo(
    () =>
      buildRoundPhotos({
        before: booking?.progress?.underBeforePhotoUrl || localSnap?.underBeforePhotoUrl,
        cleaned: booking?.progress?.underCleanedPhotoUrl || localSnap?.underCleanedPhotoUrl,
        after: booking?.progress?.underAfterPhotoUrl || localSnap?.underAfterPhotoUrl,
      }),
    [booking?.progress, localSnap]
  );

  if (!booking) return null;

  const hasUnder = underPhotos.length > 0;
  const effectiveRound: 'UPPER' | 'UNDER' = selectedRound === 'UNDER' && hasUnder ? 'UNDER' : 'UPPER';
  const activePhotos = effectiveRound === 'UNDER' ? underPhotos : upperPhotos;
  const beforePhoto = activePhotos.find((p) => p.type === 'before');
  const afterPhoto = activePhotos.find((p) => p.type === 'after');
  const hasAnyTodayPhoto = upperPhotos.length > 0 || underPhotos.length > 0;

  const openLightbox = (initialStage: 'before' | 'cleaned' | 'after' | 'COMPARE') => {
    setLightboxPayload({
      title: `Đối Chiếu Thành Phẩm · ${booking.customerName}`,
      subtitle: booking.serviceName,
      photos: upperPhotos,
      underPhotos,
      initialRound: effectiveRound,
      initialStage,
    });
  };

  return (
    <div
      data-testid="upsell-before-after-showcase"
      className={`rounded-2xl border p-3 shadow-2xs space-y-2.5 ${
        isDark ? 'bg-[var(--mos-surface)] border-emerald-500/35' : 'bg-white border-emerald-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Camera className="w-4 h-4 text-emerald-500 shrink-0" />
          <span
            className={`text-[11.5px] font-black uppercase tracking-wider truncate ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}
          >
            Đối Chiếu Before &amp; After Hôm Nay
          </span>
        </div>

        {hasUnder ? (
          <div
            className={`inline-flex rounded-lg p-0.5 text-[10px] font-bold ${isDark ? 'bg-neutral-900' : 'bg-neutral-100'}`}
          >
            {(['UPPER', 'UNDER'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRound(r)}
                className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                  effectiveRound === r ? 'bg-amber-400 text-black font-black' : 'text-[var(--mos-text-muted)]'
                }`}
              >
                {r === 'UPPER' ? 'Mi Trên' : 'Mi Dưới'}
              </button>
            ))}
          </div>
        ) : (
          hasAnyTodayPhoto && (
            <button
              type="button"
              onClick={() => openLightbox(beforePhoto && afterPhoto ? 'COMPARE' : activePhotos[0]?.type || 'after')}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold cursor-pointer ${
                isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <Columns2 className="w-3 h-3" />
              <span>Xem đủ {upperPhotos.length + underPhotos.length} ảnh</span>
            </button>
          )
        )}
      </div>

      {hasAnyTodayPhoto ? (
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              label: '1. BEFORE · Mắt mộc',
              photo: beforePhoto,
              stage: 'before' as const,
              badgeCls: 'bg-black/80 text-amber-300',
            },
            {
              label: '3. AFTER · Thành phẩm',
              photo: afterPhoto,
              stage: 'after' as const,
              badgeCls: 'bg-emerald-500 text-slate-950',
            },
          ].map((slot) => (
            <div
              key={slot.stage}
              onClick={() => openLightbox(slot.photo ? slot.stage : 'COMPARE')}
              className={`relative aspect-[4/3] rounded-xl overflow-hidden border cursor-pointer group ${
                isDark ? 'border-neutral-700 bg-neutral-900' : 'border-neutral-200 bg-neutral-100'
              }`}
            >
              {slot.photo ? (
                <>
                  <img
                    src={slot.photo.url}
                    alt={slot.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white">
                    <Maximize2 className="w-3 h-3" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10.5px] text-[var(--mos-text-muted)] px-2 text-center">
                  Chạm để xem ảnh ca hôm nay
                </div>
              )}
              <span
                className={`absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[9.5px] font-black shadow-xs ${slot.badgeCls}`}
              >
                {slot.label}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`rounded-xl border border-dashed px-3 py-2 text-[11px] font-medium ${
            isDark ? 'border-neutral-700 text-neutral-400' : 'border-neutral-200 text-neutral-500'
          }`}
        >
          Chưa chụp ảnh Before/After cho ca này · Bấm nút bên dưới để xem bộ mi các lần ghé trước.
        </div>
      )}

      <button
        type="button"
        data-testid="upsell-open-lash-portfolio-btn"
        onClick={() => setIsHistoryOpen(true)}
        className={`w-full py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-[11.5px] font-extrabold cursor-pointer active:scale-[0.99] transition-all ${
          isDark
            ? 'border-amber-500/35 bg-amber-950/30 text-amber-300 hover:bg-amber-950/50'
            : 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
        }`}
      >
        <History className="w-3.5 h-3.5 shrink-0" />
        <span>📸 Hồ Sơ Ảnh (Before · Cleaning · After) &amp; Lần Ghé Trước</span>
      </button>

      <CustomerHistoryAndSpendingSheet
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        booking={booking}
        initialTab="LASH_PHOTOS"
        customerFacingMode={customerFacingMode}
      />

      <LashPhotoCompareLightbox payload={lightboxPayload} onClose={() => setLightboxPayload(null)} />
    </div>
  );
}
