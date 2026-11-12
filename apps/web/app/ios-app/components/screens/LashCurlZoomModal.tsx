'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sparkles,
  Layers,
  CheckCircle2,
  Sliders,
  HelpCircle,
  LayoutGrid,
  Maximize2,
  Lock,
  Info,
} from 'lucide-react';
import { LASH_CURL_LIST, type LashCurlDetail } from './LashCurlData';
import { LashCurlIllustration } from './LashCurlIllustration';
import { LashCurlOverviewChart } from './LashCurlOverviewChart';
import { CvFeather1Badge } from '../ui-kit/CvFeatherLabels';

interface LashCurlZoomModalProps {
  isOpen: boolean;
  initialCurlId?: string;
  allowedCurls?: string[];
  materialName?: string;
  lockedCurlReason?: string;
  onClose: () => void;
  onSelectCurl: (curlId: string) => void;
}

export const LashCurlZoomModal: React.FC<LashCurlZoomModalProps> = ({
  isOpen,
  initialCurlId = 'CC',
  allowedCurls,
  materialName,
  lockedCurlReason,
  onClose,
  onSelectCurl,
}) => {
  const initialIndex = Math.max(
    0,
    LASH_CURL_LIST.findIndex((c) => c.id === initialCurlId)
  );
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 3);
  const [viewMode, setViewMode] = useState<'single' | 'chart'>('single');
  const [isInfoSheetOpen, setIsInfoSheetOpen] = useState(false);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    if (isOpen) {
      const idx = LASH_CURL_LIST.findIndex((c) => c.id === initialCurlId);
      if (idx >= 0) setCurrentIndex(idx);
      setIsInfoSheetOpen(false);
    }
  }, [isOpen, initialCurlId]);

  const currentCurl: LashCurlDetail = LASH_CURL_LIST[currentIndex] || LASH_CURL_LIST[3];

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : LASH_CURL_LIST.length - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < LASH_CURL_LIST.length - 1 ? prev + 1 : 0));
  }, []);

  // Auto-scroll active tab into view when current curl changes
  useEffect(() => {
    if (!isOpen || viewMode !== 'single') return;
    const activeCurl = LASH_CURL_LIST[currentIndex];
    if (activeCurl && tabRefs.current[activeCurl.id]) {
      tabRefs.current[activeCurl.id]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentIndex, isOpen, viewMode]);

  // Keyboard navigation (Left / Right arrow keys, ESC to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'Escape') {
        if (isInfoSheetOpen) {
          setIsInfoSheetOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose, isInfoSheetOpen]);

  // High-sensitivity touch swipe support with vertical scroll tolerance for iOS Safari
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.targetTouches[0].clientX;
    touchStartYRef.current = e.targetTouches[0].clientY;
    touchEndXRef.current = e.targetTouches[0].clientX;
    touchEndYRef.current = e.targetTouches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndXRef.current = e.targetTouches[0].clientX;
    touchEndYRef.current = e.targetTouches[0].clientY;
  };

  const handleTouchEnd = () => {
    if (
      touchStartXRef.current === null ||
      touchEndXRef.current === null ||
      touchStartYRef.current === null ||
      touchEndYRef.current === null
    ) {
      return;
    }
    const deltaX = touchStartXRef.current - touchEndXRef.current;
    const deltaY = touchStartYRef.current - touchEndYRef.current;
    const minSwipeDistance = 28;

    // Trigger horizontal swipe only when horizontal travel dominates vertical gesture
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY) * 1.1) {
      if (deltaX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchEndXRef.current = null;
    touchEndYRef.current = null;
  };

  const handleTouchCancel = () => {
    touchStartXRef.current = null;
    touchStartYRef.current = null;
    touchEndXRef.current = null;
    touchEndYRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thước đo độ cong sợi mi"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between text-white select-none overflow-hidden h-[100dvh]"
    >
      {/* 1. Header Bar: Minimalist with Close button strictly placed at top right */}
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-black tracking-widest text-[#FFB400] bg-[#FFB400]/20 px-2 py-0.5 rounded-full">
            Thước Đo Độ Cong
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            ({currentIndex + 1}/{LASH_CURL_LIST.length})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Fast Toggle Mode (BL Chart vs Zoom) */}
          <button
            type="button"
            onClick={() => setViewMode((prev) => (prev === 'single' ? 'chart' : 'single'))}
            className={`p-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'chart'
                ? 'bg-[#FFB400] border-[#FFB400] text-black shadow-sm'
                : 'bg-white/10 border-white/10 text-gray-300 hover:text-white'
            }`}
          >
            {viewMode === 'chart' ? (
              <>
                <Maximize2 className="w-4 h-4" />
                <span className="text-[11px] font-bold">Phóng To</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-4 h-4" />
                <span className="text-[11px] font-bold">Bảng So Sánh</span>
              </>
            )}
          </button>

          {/* Right close button [✕] - Mandatory Right Placement Invariant */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng thước đo độ cong"
            className="w-9 h-9 rounded-full bg-white/10 active:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Top Fast-Switch Pill Tab Bar (Only in Single Mode) */}
      {viewMode === 'single' && (
        <div className="px-3 py-1.5 bg-white/[0.03] border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
          {LASH_CURL_LIST.map((curl, idx) => {
            const active = idx === currentIndex;
            const isAllowed = !allowedCurls || allowedCurls.includes(curl.id);
            return (
              <button
                key={curl.id}
                ref={(el) => {
                  tabRefs.current[curl.id] = el;
                }}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                style={{ touchAction: 'manipulation' }}
                className={`flex-1 min-w-[54px] py-1 px-2 rounded-xl text-center text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border relative cursor-pointer active:scale-95 ${
                  active
                    ? 'bg-[#FFB400] border-[#FFB400] text-black shadow-md ring-2 ring-[#FFB400]/40'
                    : isAllowed
                      ? 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                      : 'bg-white/[0.03] border-white/5 text-gray-500 hover:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-0.5 leading-none">
                  <span>{curl.code}</span>
                  {!isAllowed && <Lock className="w-2.5 h-2.5 text-rose-400" />}
                </div>
                <span className={`text-[9px] ${active ? 'text-black/80 font-bold' : 'text-gray-400'}`}>
                  {curl.angleLabel}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* 3. Main Center Hero Canvas Area (Minimalism - No Scroll Required on iPhone) */}
      <div className="flex-1 min-h-0 flex flex-col p-2.5 overflow-hidden relative">
        {viewMode === 'chart' ? (
          /* BẢNG SO SÁNH TỔNG HỢP (BL LASHES STYLE) */
          <div className="flex-1 overflow-y-auto">
            <LashCurlOverviewChart
              selectedCurlId={currentCurl.id}
              onSelectCurl={(id) => {
                const idx = LASH_CURL_LIST.findIndex((c) => c.id === id);
                if (idx >= 0) setCurrentIndex(idx);
                setViewMode('single');
              }}
            />
          </div>
        ) : (
          /* HERO CANVAS MINIMALISM CHO IPHONE */
          <div
            style={{ touchAction: 'pan-y' }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchCancel}
            className="flex-1 w-full bg-gradient-to-b from-white/10 via-white/5 to-transparent rounded-3xl p-3 border border-white/10 shadow-2xl relative flex flex-col justify-between items-center overflow-hidden"
          >
            {/* Top Bar inside Canvas: Curl Name + Info Trigger (i) */}
            <div className="w-full flex items-center justify-between px-1 mb-1 z-10 shrink-0">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/90">
                  {currentCurl.categoryTitle}
                </span>
                <h3 className="text-xl font-black text-[#FFB400] tracking-tight leading-tight">
                  {currentCurl.code} Curl · {currentCurl.degrees}°
                </h3>
              </div>

              {/* Minimalist (i) Info Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsInfoSheetOpen(true);
                }}
                aria-label="Xem kịch bản tư vấn và thông tin kỹ thuật"
                style={{ touchAction: 'manipulation' }}
                className="w-10 h-10 rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:bg-[#FFB400] active:text-black border border-amber-400/40 text-[#FFB400] flex items-center justify-center shadow-lg transition-all cursor-pointer active:scale-90"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>

            {/* Hero SVG Vector Illustration: Full Width & Maximum Height */}
            <div className="w-full flex-1 flex items-center justify-center my-auto min-h-0 relative px-1">
              <LashCurlIllustration curl={currentCurl} variant="zoom" className="w-full h-full max-h-[340px]" />
            </div>

            {/* Bottom Ergonomic Navigation Bar: Prev Button + 7 Dots Indicator + Next Button */}
            <div className="w-full flex items-center justify-between px-2 pt-2 pb-1 z-10 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                aria-label="Độ cong trước"
                style={{ touchAction: 'manipulation' }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-[#FFB400] active:text-black border border-white/10 text-gray-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-90"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* 7 Clickable Navigation Dots */}
              <div className="flex items-center gap-1.5">
                {LASH_CURL_LIST.map((curl, dotIdx) => {
                  const isDotActive = dotIdx === currentIndex;
                  return (
                    <button
                      key={curl.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentIndex(dotIdx);
                      }}
                      aria-label={`Chuyển đến độ cong ${curl.label}`}
                      className={`transition-all duration-200 cursor-pointer ${
                        isDotActive
                          ? 'w-7 h-2 rounded-full bg-[#FFB400] shadow-sm'
                          : 'w-2 h-2 rounded-full bg-white/30 hover:bg-white/60 active:scale-125'
                      }`}
                    />
                  );
                })}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                aria-label="Độ cong kế tiếp"
                style={{ touchAction: 'manipulation' }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-[#FFB400] active:text-black border border-white/10 text-gray-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-90"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Bottom Action Footer */}
      <div className="p-3 bg-black/95 border-t border-white/10 flex flex-col gap-1.5 shrink-0">
        {allowedCurls && !allowedCurls.includes(currentCurl.id) && (
          <div className="text-[10.5px] text-rose-300 bg-rose-500/15 border border-rose-500/30 rounded-xl px-2.5 py-1 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>
              <strong>Hạn chế kỹ thuật ({materialName || 'Chất liệu đang chọn'}):</strong>{' '}
              {lockedCurlReason || `Không áp dụng độ cong ${currentCurl.code} cho chất liệu này.`}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-[13px] active:scale-98 transition-all cursor-pointer"
          >
            Đóng
          </button>

          {!allowedCurls || allowedCurls.includes(currentCurl.id) ? (
            <button
              type="button"
              onClick={() => {
                onSelectCurl(currentCurl.id);
                onClose();
              }}
              className="flex-2 py-3 px-4 rounded-2xl bg-[#FFB400] active:bg-[#e09e00] text-black font-black text-[14px] flex items-center justify-center gap-1.5 shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate">
                Chọn Độ Cong {currentCurl.code} ({currentCurl.degrees}°)
              </span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex-2 py-3 px-4 rounded-2xl bg-neutral-800 border border-white/10 text-gray-400 font-bold text-[13px] flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              <Lock className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Khóa Theo Chất Liệu</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Minimalist Bottom Sheet for Information & Consultation (Triggered by (i)) */}
      {isInfoSheetOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">
          {/* Backdrop Click to Close */}
          <div className="flex-1 w-full" onClick={() => setIsInfoSheetOpen(false)} />

          {/* Sheet Body Container */}
          <div className="w-full bg-neutral-900 border-t border-white/20 rounded-t-3xl p-4 flex flex-col max-h-[75vh] shadow-2xl animate-in slide-in-from-bottom duration-250">
            {/* Top Swipe Drag Pill */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 shrink-0" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Kịch Bản Tư Vấn & Kỹ Thuật
                </span>
                <h4 className="text-base font-black text-white">
                  Độ Cong {currentCurl.code} Curl ({currentCurl.degrees}°)
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setIsInfoSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Scrollable Content */}
            <div className="flex-1 overflow-y-auto pt-3 space-y-3 pr-1">
              {/* Technical Specifications */}
              <div className="grid grid-cols-3 gap-2 bg-white/5 rounded-2xl p-2.5 border border-white/10 text-center font-mono text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block">Góc uốn</span>
                  <strong className="text-[#FFB400] text-sm">{currentCurl.degrees}°</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Chân dán keo</span>
                  <strong className="text-white text-sm">1.5 - 2.0 mm</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Ngọn mi</span>
                  <strong className="text-amber-300 text-sm">Vuốt nhọn</strong>
                </div>
              </div>

              {/* Eye Shapes */}
              <div className="flex items-start gap-2.5 text-[12px] bg-white/5 p-3 rounded-2xl border border-white/5">
                <Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300 block mb-0.5">Dáng mắt phù hợp:</span>
                  <span className="text-gray-200 leading-relaxed">{currentCurl.suitableEyes}</span>
                </div>
              </div>

              {/* Aesthetic Effect */}
              <div className="flex items-start gap-2.5 text-[12px] bg-white/5 p-3 rounded-2xl border border-white/5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300 block mb-0.5">Hiệu ứng thẩm mỹ:</span>
                  <span className="text-gray-200 leading-relaxed">{currentCurl.aestheticEffect}</span>
                </div>
              </div>

              {/* Recommended Lash Styles */}
              <div className="flex items-start gap-2.5 text-[12px] bg-white/5 p-3 rounded-2xl border border-white/5">
                <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-300 block mb-0.5">Dáng mi Wings gợi ý:</span>
                  <span className="text-gray-200 leading-relaxed">{currentCurl.recommendedStyles}</span>
                </div>
              </div>

              {/* Technician Tip */}
              <div className="flex items-start gap-2.5 text-[11.5px] bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-400 block mb-0.5">
                    Lưu ý kỹ thuật cho <CvFeather1Badge />:
                  </span>
                  <span className="text-amber-100 leading-relaxed">{currentCurl.technicianTip}</span>
                </div>
              </div>
            </div>

            {/* Bottom Sheet Close Button */}
            <div className="pt-3 border-t border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setIsInfoSheetOpen(false)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs active:scale-98 transition-all cursor-pointer"
              >
                Thu gọn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
