'use client';

import React, { useEffect, useState } from 'react';
import { Columns2, X } from 'lucide-react';
import type { LashHistoryPhoto } from '@mos-lab/shared';

export interface LashPhotoComparePayload {
  title: string;
  subtitle?: string;
  photos: LashHistoryPhoto[];
  underPhotos?: LashHistoryPhoto[];
  initialRound?: 'UPPER' | 'UNDER';
  initialStage?: 'before' | 'cleaned' | 'after' | 'COMPARE';
}

interface LashPhotoCompareLightboxProps {
  payload: LashPhotoComparePayload | null;
  onClose: () => void;
}

export function LashPhotoCompareLightbox({ payload, onClose }: LashPhotoCompareLightboxProps) {
  const [activeRound, setActiveRound] = useState<'UPPER' | 'UNDER'>('UPPER');
  const [activeStage, setActiveStage] = useState<'before' | 'cleaned' | 'after' | 'COMPARE'>('COMPARE');

  useEffect(() => {
    if (!payload) return;
    const round = payload.initialRound === 'UNDER' && payload.underPhotos?.length ? 'UNDER' : 'UPPER';
    setActiveRound(round);
    const list = round === 'UNDER' ? payload.underPhotos || [] : payload.photos;
    const hasBefore = list.some((p) => p.type === 'before');
    const hasAfter = list.some((p) => p.type === 'after');
    if (payload.initialStage) {
      setActiveStage(payload.initialStage);
    } else if (hasBefore && hasAfter) {
      setActiveStage('COMPARE');
    } else {
      setActiveStage(list[0]?.type || 'after');
    }
  }, [payload]);

  if (!payload) return null;

  const activePhotos = activeRound === 'UNDER' ? payload.underPhotos || [] : payload.photos;
  const beforePhoto = activePhotos.find((p) => p.type === 'before');
  const cleanedPhoto = activePhotos.find((p) => p.type === 'cleaned');
  const afterPhoto = activePhotos.find((p) => p.type === 'after');
  const canCompare = Boolean(beforePhoto && afterPhoto);
  const selectedPhoto =
    activePhotos.find((p) => p.type === activeStage) || afterPhoto || cleanedPhoto || beforePhoto || activePhotos[0];

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-black/95 text-white animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label="So sánh và phóng to ảnh bộ mi"
      onClick={onClose}
    >
      {/* Top Bar: Title Left · Close [X] Right */}
      <div
        className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <div className="truncate text-[14px] font-black text-white">{payload.title}</div>
          {payload.subtitle && (
            <div className="truncate text-[11px] font-medium text-neutral-400">{payload.subtitle}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng xem ảnh"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 active:scale-95 transition-all cursor-pointer"
        >
          <X className="h-4 w-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Round + Mode Strip */}
      <div
        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 border-b border-white/10 bg-black/50"
        onClick={(e) => e.stopPropagation()}
      >
        {payload.underPhotos && payload.underPhotos.length > 0 ? (
          <div className="inline-flex rounded-xl bg-white/10 p-0.5 text-[11px] font-bold">
            {(['UPPER', 'UNDER'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setActiveRound(r)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  activeRound === r ? 'bg-amber-400 text-black font-black' : 'text-neutral-300'
                }`}
              >
                {r === 'UPPER' ? `Mi Trên (${payload.photos.length})` : `Mi Dưới (${payload.underPhotos!.length})`}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          {canCompare && (
            <button
              type="button"
              onClick={() => setActiveStage('COMPARE')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activeStage === 'COMPARE'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-white/10 text-neutral-200 hover:bg-white/15'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              <span>So Sánh B/A</span>
            </button>
          )}
          {activePhotos.map((p) => (
            <button
              key={p.type}
              type="button"
              onClick={() => setActiveStage(p.type)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activeStage === p.type
                  ? 'bg-amber-400 text-black font-black'
                  : 'bg-white/10 text-neutral-300 hover:bg-white/15'
              }`}
            >
              {p.type === 'before' ? '1. Before' : p.type === 'cleaned' ? '2. Cleaning' : '3. After'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Viewer */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        {activeStage === 'COMPARE' && beforePhoto && afterPhoto ? (
          <div className="w-full max-w-[440px] grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { tag: '1. BEFORE · MẮT MỘC', photo: beforePhoto, tone: 'bg-amber-400 text-black' },
              { tag: '3. AFTER · HOÀN THIỆN', photo: afterPhoto, tone: 'bg-emerald-500 text-slate-950' },
            ].map((pane) => (
              <div
                key={pane.tag}
                onClick={() => setActiveStage(pane.photo.type)}
                className="relative rounded-2xl overflow-hidden border border-white/15 bg-neutral-900 cursor-pointer"
              >
                <img src={pane.photo.url} alt={pane.tag} className="w-full aspect-[4/3] object-cover" />
                <span
                  className={`absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[10.5px] font-black shadow-md ${pane.tone}`}
                >
                  {pane.tag}
                </span>
              </div>
            ))}
          </div>
        ) : selectedPhoto ? (
          <div className="flex flex-col items-center gap-2 max-w-full max-h-full">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.label}
              className="max-w-full max-h-[68vh] object-contain rounded-2xl border border-white/15 shadow-2xl"
            />
            <span className="text-[12px] font-bold text-amber-300">{selectedPhoto.label}</span>
          </div>
        ) : (
          <div className="text-xs text-neutral-400">Chưa có ảnh cho vòng dịch vụ này.</div>
        )}
      </div>

      {/* Footer Thumbnail Strip */}
      {activePhotos.length > 0 && (
        <div
          className="flex items-center justify-center gap-2.5 border-t border-white/10 px-4 py-3 bg-black/70"
          onClick={(e) => e.stopPropagation()}
        >
          {activePhotos.map((p) => (
            <button
              key={p.type}
              type="button"
              onClick={() => setActiveStage(p.type)}
              className={`relative w-20 aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                activeStage === p.type ? 'border-amber-400 scale-105' : 'border-white/20 opacity-75 hover:opacity-100'
              }`}
            >
              <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
              <span className="absolute bottom-0.5 left-0.5 right-0.5 rounded bg-black/75 text-[8.5px] font-bold text-white text-center truncate px-0.5">
                {p.type === 'before' ? 'Before' : p.type === 'cleaned' ? 'Cleaning' : 'After'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
