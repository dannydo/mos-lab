'use client';

import React from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

export interface LightboxOverlaysProps {
  copiedFeedback: string | null;
  totalItems: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
}

export const LightboxOverlays: React.FC<LightboxOverlaysProps> = ({
  copiedFeedback,
  totalItems,
  currentIndex,
  onPrev,
  onNext,
}) => {
  return (
    <>
      {/* Floating Copy Feedback Banner inside Lightbox Viewport (MOS-BUG-199) */}
      {copiedFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-14 inset-x-0 z-[2220] flex justify-center pointer-events-none transition-all duration-200"
        >
          <div className="pointer-events-auto flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-xs shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5)] backdrop-blur-md animate-in fade-in zoom-in-95 bg-[rgba(16,185,129,0.95)] text-white border border-white/35">
            <Check size={14} className="text-white shrink-0" />
            <span>{copiedFeedback}</span>
          </div>
        </div>
      )}

      {/* Prev & Next Navigation Floating Buttons */}
      {totalItems > 1 && (
        <>
          <button
            type="button"
            aria-label="Hình trước"
            title={`Hình trước (${((currentIndex - 1 + totalItems) % totalItems) + 1}/${totalItems}) · Phím ←`}
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="fixed left-4 top-1/2 -translate-y-1/2 z-[2210] w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-2xl transition-transform hover:scale-110 active:scale-95 text-white bg-[rgba(15,23,42,0.85)] border border-white/20"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            type="button"
            aria-label="Hình tiếp theo"
            title={`Hình tiếp theo (${((currentIndex + 1) % totalItems) + 1}/${totalItems}) · Phím →`}
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="fixed right-4 top-1/2 -translate-y-1/2 z-[2210] w-12 h-12 rounded-full flex items-center justify-center cursor-pointer shadow-2xl transition-transform hover:scale-110 active:scale-95 text-white bg-[rgba(15,23,42,0.85)] border border-white/20"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}
    </>
  );
};
