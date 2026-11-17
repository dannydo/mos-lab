'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { IosServicingRound } from '@mos-lab/shared';

interface AfterRoundComparisonStripProps {
  activeRound: IosServicingRound;
  hasUnderMink: boolean;
  isDark: boolean;
  beforePhotoUrl: string | null;
  cleanedPhotoUrl: string | null;
  upperBeforeUrl?: string | null;
  upperCleanedUrl?: string | null;
  upperAfterUrl?: string | null;
  isDisplayablePhoto: (url: string | null | undefined) => boolean;
  onZoomPhoto: (photo: { url: string; title: string }) => void;
}

export function AfterRoundComparisonStrip({
  activeRound,
  hasUnderMink,
  isDark,
  beforePhotoUrl,
  cleanedPhotoUrl,
  upperBeforeUrl,
  upperCleanedUrl,
  upperAfterUrl,
  isDisplayablePhoto,
  onZoomPhoto,
}: AfterRoundComparisonStripProps) {
  const [showUpperRecap, setShowUpperRecap] = useState(false);
  const roundLabel = hasUnderMink ? (activeRound === 'UNDER' ? 'Vòng 2 · Mi Dưới' : 'Vòng 1 · Mi Trên') : '';

  return (
    <div className="space-y-2.5">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <div className="text-[11px] font-bold text-[var(--mos-text-muted)] uppercase tracking-wider">
            ĐỐI CHIẾU VỚI 2 ẢNH TRƯỚC {roundLabel ? `(${roundLabel})` : ''}
          </div>
          <span className="text-[10px] text-[var(--mos-text-muted)] font-semibold">Bấm để phóng to</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {[
            {
              url: beforePhotoUrl,
              alt: 'Before',
              badge: '1. Mắt Mộc',
              badgeClass: 'bg-black/85 text-amber-400 border border-amber-500/30',
              title: `Ảnh 1: Before Mắt Mộc ${roundLabel}`,
              empty: 'Chưa có ảnh Before',
            },
            {
              url: cleanedPhotoUrl,
              alt: 'Cleaned',
              badge: '2. Vệ Sinh',
              badgeClass: 'bg-blue-600 text-white',
              title: `Ảnh 2: Vệ Sinh Nhắm Mắt ${roundLabel}`,
              empty: 'Chưa có ảnh Vệ Sinh',
            },
          ].map((slot) => (
            <div
              key={slot.alt}
              onClick={() => isDisplayablePhoto(slot.url) && onZoomPhoto({ url: slot.url!, title: slot.title })}
              className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#1C1C1E] border border-neutral-700 shadow-inner group cursor-pointer"
            >
              {isDisplayablePhoto(slot.url) ? (
                <>
                  <img src={slot.url!} alt={slot.alt} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white backdrop-blur-xs">
                    <Maximize2 className="w-3 h-3" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-neutral-400 text-[10px] p-2 text-center">
                  {slot.empty}
                </div>
              )}
              <span
                className={`absolute bottom-1.5 left-1.5 text-[9.5px] font-black px-1.5 py-0.5 rounded shadow-xs ${slot.badgeClass}`}
              >
                {slot.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      {hasUnderMink && activeRound === 'UNDER' && (
        <div className="bg-[var(--mos-surface)] border border-[var(--mos-surface-border)] rounded-xl px-3 py-2">
          <button
            type="button"
            onClick={() => setShowUpperRecap((v) => !v)}
            className="w-full flex items-center justify-between text-[11px] font-extrabold text-[var(--mos-text)] cursor-pointer"
          >
            <span>📸 Bộ 3 ảnh Vòng 1 (Mi Trên) đã lưu</span>
            {showUpperRecap ? (
              <ChevronUp className="w-4 h-4 text-[var(--mos-text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--mos-text-muted)]" />
            )}
          </button>
          {showUpperRecap && (
            <div className="grid grid-cols-3 gap-1.5 mt-2 pt-2 border-t border-[var(--mos-surface-border)]">
              {[
                { label: 'Before Trên', url: upperBeforeUrl },
                { label: 'Vệ Sinh Trên', url: upperCleanedUrl },
                { label: 'After Trên', url: upperAfterUrl },
              ].map((u) => (
                <div
                  key={u.label}
                  onClick={() =>
                    isDisplayablePhoto(u.url) && onZoomPhoto({ url: u.url!, title: `Vòng 1 · ${u.label}` })
                  }
                  className={`relative aspect-[4/3] rounded-lg overflow-hidden border ${
                    isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-neutral-100 border-neutral-200'
                  } cursor-pointer`}
                >
                  {isDisplayablePhoto(u.url) ? (
                    <img src={u.url!} alt={u.label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-[var(--mos-text-muted)] px-1 text-center">
                      Đã bỏ qua
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 bg-black/80 text-white text-[8px] font-bold px-1 py-0.5 rounded">
                    {u.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
