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
} from 'lucide-react';
import { LASH_CURL_LIST, type LashCurlDetail } from './LashCurlData';
import { LashCurlIllustration } from './LashCurlIllustration';
import { LashCurlOverviewChart } from './LashCurlOverviewChart';

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

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    if (isOpen) {
      const idx = LASH_CURL_LIST.findIndex((c) => c.id === initialCurlId);
      if (idx >= 0) setCurrentIndex(idx);
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
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

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
    const minSwipeDistance = 28; // Responsive swipe threshold for mobile

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
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between text-white select-none overflow-hidden"
    >
      {/* 1. Header Bar: Close button strictly placed at top right */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10 shrink-0">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#FFB400] bg-[#FFB400]/20 px-2 py-0.5 rounded-full">
              Thước Đo Độ Cong Mi
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              ({currentIndex + 1}/{LASH_CURL_LIST.length})
            </span>
          </div>
          <h2 className="text-[15px] font-bold text-white mt-0.5">So Sánh Mi Nối Với Mi Thật & Đo Góc</h2>
        </div>

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

      {/* 2. Mode Selector: Single Swipe Carousel vs Full Overview Chart (BL Lashes Style) */}
      <div className="px-3 py-1.5 bg-neutral-900 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        <div className="bg-white/10 p-0.5 rounded-xl flex items-center gap-1 w-full max-w-[340px]">
          <button
            type="button"
            onClick={() => setViewMode('single')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              viewMode === 'single' ? 'bg-[#FFB400] text-black shadow-sm' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Phóng To Từng Độ ({currentCurl.code})</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('chart')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              viewMode === 'chart' ? 'bg-[#FFB400] text-black shadow-sm' : 'text-gray-300 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Bảng So Sánh Chuẩn (BL Chart)</span>
          </button>
        </div>

        <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
          {viewMode === 'single' ? '← Vuốt trượt →' : '3 Nhóm chuẩn'}
        </span>
      </div>

      {/* 3. Top Fast-Switch Pill Tab Bar (Only in Single Mode) */}
      {viewMode === 'single' && (
        <div className="px-3 py-2 bg-white/5 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
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
                className={`flex-1 min-w-[56px] py-1.5 px-2.5 rounded-xl text-center text-xs font-black transition-all flex flex-col items-center justify-center gap-0.5 border relative cursor-pointer active:scale-95 ${
                  active
                    ? 'bg-[#FFB400] border-[#FFB400] text-black shadow-md scale-102 ring-2 ring-[#FFB400]/40'
                    : isAllowed
                      ? 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
                      : 'bg-white/[0.04] border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/10'
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

      {/* 4. Main Body Area */}
      <div
        className="flex-1 flex flex-col px-3.5 py-2.5 overflow-y-auto relative"
        onTouchStart={viewMode === 'single' ? handleTouchStart : undefined}
        onTouchMove={viewMode === 'single' ? handleTouchMove : undefined}
        onTouchEnd={viewMode === 'single' ? handleTouchEnd : undefined}
        onTouchCancel={viewMode === 'single' ? handleTouchCancel : undefined}
      >
        {viewMode === 'chart' ? (
          /* BẢNG SO SÁNH TỔNG HỢP (BL LASHES STYLE) */
          <LashCurlOverviewChart
            selectedCurlId={currentCurl.id}
            onSelectCurl={(id) => {
              const idx = LASH_CURL_LIST.findIndex((c) => c.id === id);
              if (idx >= 0) setCurrentIndex(idx);
              setViewMode('single');
            }}
          />
        ) : (
          /* PHÓNG TO CHI TIẾT TỪNG ĐỘ CONG VỚI MI THẬT & NGỌN NHỌN */
          <>
            {/* Big Graphic Card Container with Built-in 44x44 Touch Chevrons and Pan-Y Swipe Support */}
            <div
              style={{ touchAction: 'pan-y' }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
              className="bg-gradient-to-b from-white/10 to-white/5 rounded-3xl p-3 border border-white/10 shadow-2xl relative overflow-hidden flex flex-col items-center"
            >
              {/* Apple HIG 44x44 Floating Chevrons Centered Inside the Card */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                aria-label="Độ cong trước"
                style={{ touchAction: 'manipulation' }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/80 hover:bg-black active:bg-amber-500 active:text-black border-2 border-amber-400/50 hover:border-amber-400 text-amber-300 shadow-2xl flex items-center justify-center cursor-pointer transition-all active:scale-90"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                aria-label="Độ cong kế tiếp"
                style={{ touchAction: 'manipulation' }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/80 hover:bg-black active:bg-amber-500 active:text-black border-2 border-amber-400/50 hover:border-amber-400 text-amber-300 shadow-2xl flex items-center justify-center cursor-pointer transition-all active:scale-90"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Category Pill + Headline Compact */}
              <div className="w-full flex items-center justify-between mb-1 pl-12 pr-12">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {currentCurl.categoryTitle}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium">{currentCurl.categorySubtitle}</span>
                </div>
                <span className="text-xs font-black text-[#FFB400]">Góc {currentCurl.degrees}°</span>
              </div>

              <h3 className="text-base font-black text-[#FFB400] self-start tracking-tight mb-0.5 pl-12 pr-12">
                {currentCurl.headline}
              </h3>

              {/* Contrast Legend Tag Bar */}
              <div className="w-full flex items-center justify-between bg-black/40 rounded-xl px-2.5 py-1 my-1 text-[10.5px] border border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#9E6B55] inline-block" />
                  <span className="text-[#D4A996] font-bold">Nền: Sợi Mi Thật</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-black border border-amber-400 inline-block" />
                  <span className="text-[#FFB400] font-black">Mi Nối Ngọn Nhọn ({currentCurl.code})</span>
                </div>
              </div>

              {/* SVG Vector Graphic with Protractor, Needle-Sharp Tip & Natural Lash Baseline */}
              <div className="w-full my-0.5">
                <LashCurlIllustration curl={currentCurl} variant="zoom" />
              </div>

              <div className="w-full flex items-center justify-between text-[11px] text-gray-400 px-2 mt-1 border-t border-white/10 pt-2 font-mono">
                <span>
                  Góc uốn: <strong className="text-[#FFB400]">{currentCurl.degrees}°</strong>
                </span>
                <span>
                  Chân bám keo: <strong className="text-white">1.5 - 2.0 mm</strong>
                </span>
                <span>
                  Ngọn mi: <strong className="text-amber-300">Vuốt nhọn sắc nét</strong>
                </span>
              </div>

              {/* Interactive Carousel Navigation Bar with Prev/Next Pills & Dots Indicator */}
              <div className="w-full flex items-center justify-between mt-3 pt-2.5 border-t border-white/10 gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  style={{ touchAction: 'manipulation' }}
                  className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-amber-500/20 text-xs font-bold text-gray-200 hover:text-white flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4 text-amber-400" />
                  <span>{LASH_CURL_LIST[currentIndex > 0 ? currentIndex - 1 : LASH_CURL_LIST.length - 1].code}</span>
                </button>

                {/* 7 Carousel Dots (Clickable) */}
                <div className="flex items-center gap-1.5 py-1">
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
                            ? 'w-6 h-2 rounded-full bg-[#FFB400] shadow-sm'
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
                  style={{ touchAction: 'manipulation' }}
                  className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-amber-500/20 text-xs font-bold text-gray-200 hover:text-white flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                >
                  <span>{LASH_CURL_LIST[currentIndex < LASH_CURL_LIST.length - 1 ? currentIndex + 1 : 0].code}</span>
                  <ChevronRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </div>

            {/* Technical Consultation Details Card for CV🪶 */}
            <div className="mt-2.5 bg-white/5 rounded-2xl p-3 border border-white/10 space-y-2">
              <div className="text-[11px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                <span>Kịch Bản Tư Vấn Cho Khách Hàng</span>
              </div>

              {/* Eye Shapes */}
              <div className="flex items-start gap-2 text-[11.5px]">
                <Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-300">Dáng mắt phù hợp: </span>
                  <span className="text-gray-200">{currentCurl.suitableEyes}</span>
                </div>
              </div>

              {/* Aesthetic Effect */}
              <div className="flex items-start gap-2 text-[11.5px]">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Hiệu ứng thẩm mỹ: </span>
                  <span className="text-gray-200">{currentCurl.aestheticEffect}</span>
                </div>
              </div>

              {/* Recommended Lash Styles */}
              <div className="flex items-start gap-2 text-[11.5px]">
                <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-300">Dáng mi Wings gợi ý: </span>
                  <span className="text-gray-200">{currentCurl.recommendedStyles}</span>
                </div>
              </div>

              {/* Technician Tip */}
              <div className="flex items-start gap-2 text-[11px] bg-amber-500/10 border border-amber-500/20 rounded-xl p-2">
                <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-400">Lưu ý kỹ thuật cho CV🪶: </span>
                  <span className="text-amber-100">{currentCurl.technicianTip}</span>
                </div>
              </div>
            </div>

            {/* Swipe Hint indicator */}
            <div className="text-center text-[10px] text-gray-500 mt-2">
              ← Vuốt sang trái / phải để xem các độ cong khác →
            </div>
          </>
        )}
      </div>

      {/* 5. Bottom Action Footer */}
      <div className="p-3 bg-black/90 border-t border-white/10 flex flex-col gap-1.5 shrink-0">
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
              <CheckCircle2 className="w-4 h-4" />
              <span>Chọn Độ Cong {currentCurl.label}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex-2 py-3 px-4 rounded-2xl bg-neutral-800 border border-white/10 text-gray-400 font-bold text-[13px] flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              <Lock className="w-4 h-4 text-rose-400" />
              <span>Khóa theo chất liệu {materialName}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
