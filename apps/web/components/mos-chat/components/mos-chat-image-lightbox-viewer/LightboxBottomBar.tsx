'use client';

import React from 'react';
import { ZOOM_PRESETS, ZOOM_PRESET_TOLERANCE, type MosChatImageLightboxItem } from './lightboxTypes';

export interface LightboxBottomBarProps {
  items: MosChatImageLightboxItem[];
  currentIndex: number;
  zoom: number;
  isCurrentFit: boolean;
  onFitZoom: () => void;
  onSelectPresetZoom: (preset: number) => void;
  onSelectIndex: (index: number) => void;
}

export const LightboxBottomBar: React.FC<LightboxBottomBarProps> = ({
  items,
  currentIndex,
  zoom,
  isCurrentFit,
  onFitZoom,
  onSelectPresetZoom,
  onSelectIndex,
}) => {
  const totalItems = items.length;

  return (
    <>
      {/* Bottom Floating Quick Preset Bar & Helper Hint - Inset-X-0 flex container for 100% robust horizontal centering */}
      <div className="fixed bottom-3 inset-x-0 z-[2210] flex justify-center pointer-events-none px-4">
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full shadow-2xl border border-white/[0.16] bg-[rgba(15,23,42,0.90)] text-slate-300 text-[11px] select-none backdrop-blur-md"
        >
          <span className="hidden md:inline font-medium">
            💡 Chuột phải / Phím C để sao chép ảnh • Cuộn chuột / Phím +/- để phóng to • Kéo rê để di chuyển • Phím F:
            Vừa khung • Phím 1: 100%
          </span>

          <div className="flex items-center gap-1 pl-1 font-mono text-[10.5px]">
            {/* Fit Preset Pill */}
            <button
              type="button"
              onClick={onFitZoom}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors font-bold ${
                isCurrentFit ? 'bg-amber-500 text-slate-950 shadow-xs' : 'hover:bg-slate-700 text-slate-300'
              }`}
            >
              Fit
            </button>

            {ZOOM_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onSelectPresetZoom(preset)}
                className={`px-1.5 py-0.5 rounded tabular-nums cursor-pointer transition-colors ${
                  !isCurrentFit && Math.abs(zoom - preset) < ZOOM_PRESET_TOLERANCE
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                    : 'hover:bg-slate-700 text-slate-300'
                }`}
              >
                {Math.round(preset * 100)}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Thumbnail Strip (if multiple images) - Inset-X-0 flex container for 100% robust horizontal centering */}
      {totalItems > 1 && (
        <div className="fixed bottom-12 inset-x-0 z-[2210] flex justify-center pointer-events-none px-4">
          <div
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-2xl max-w-[85vw] overflow-x-auto shadow-2xl backdrop-blur-md bg-[rgba(15,23,42,0.88)] border border-white/[0.16]"
          >
            {items.map((item, idx) => {
              const isActive = idx === currentIndex;
              return (
                <button
                  key={item.url || idx}
                  type="button"
                  aria-label={`Xem ảnh ${idx + 1}`}
                  onClick={() => onSelectIndex(idx)}
                  className={`w-11 h-11 rounded-lg overflow-hidden shrink-0 cursor-pointer border-2 transition-all ${
                    isActive
                      ? 'border-amber-400 scale-105 shadow-md shadow-amber-500/30'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={item.url} alt={item.name || `Hình ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
};
