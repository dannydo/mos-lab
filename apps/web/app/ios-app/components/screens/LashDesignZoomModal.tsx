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
  Lock,
  Info,
  HelpCircle,
} from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { ALL_LASH_DESIGNS, type LashDesignOption } from './LashMaterialConstraintMatrix';
import { CvFeather1Badge } from '../ui-kit/CvFeatherLabels';

export interface LashDesignDetail extends LashDesignOption {
  categoryTitle: string;
  suitableEyes: string;
  aestheticEffect: string;
  technicianTip: string;
  designRule: string;
}

export const LASH_DESIGN_FULL_DETAILS: LashDesignDetail[] = [
  {
    id: 'Natural',
    name: 'Natural (Tự nhiên)',
    shortName: 'Natural',
    desc: 'Ôm đều theo cung mi thật, hài hòa thanh lịch',
    eyeEffect: 'Tự nhiên như mi thật mọc dài',
    image: '/lashes/designs/lash-design-natural.jpg',
    categoryTitle: 'THANH LỊCH · CỔ ĐIỂN',
    suitableEyes: 'Mắt tròn, mắt hạnh nhân, khách lần đầu nối mi, khách công sở thích nhẹ nhàng.',
    aestheticEffect: 'Mở rộng ánh nhìn tinh tế, tôn nét dịu dàng tự nhiên, nối như không nối.',
    technicianTip: 'Phân bổ chiều dài ôm đều theo viền mí, chuyển tiếp độ dài mượt mà không gãy nếp.',
    designRule: 'Tỷ lệ phân tầng 1:1, độ dài tăng nhẹ ở 1/3 giữa rồi hạ êm về hai đầu.',
  },
  {
    id: 'Doll',
    name: 'Doll (Búp bê tròn mắt)',
    shortName: 'Doll',
    desc: 'Điểm nhấn sợi dài ở chính giữa con ngươi',
    eyeEffect: 'Mở to tròn mắt long lanh',
    image: '/lashes/designs/lash-design-doll.jpg',
    categoryTitle: 'NGỌT NGÀO · MẮT TRÒN',
    suitableEyes: 'Mắt một mí, mí lót, mắt dài hẹp hoặc mắt hơi sâu muốn mở to tròn theo chiều dọc.',
    aestheticEffect: 'Tạo hiệu ứng mắt búp bê tròn xoe, long lanh cuốn hút và trẻ trung hơn.',
    technicianTip: 'Đặt sợi dài nhất chính xác tại vị trí tâm con ngươi mắt khi khách nhìn thẳng.',
    designRule: 'Đỉnh dài nhất ở trung tâm (Zone 3), hạ độ dài nhanh hơn về đầu và đuôi mắt.',
  },
  {
    id: 'Wing',
    name: 'Wing (Đuôi dài thanh thoát)',
    shortName: 'Wing',
    desc: 'Tăng dần chiều dài về phía đuôi mắt',
    eyeEffect: 'Kéo dài đuôi mắt sắc sảo, thanh thoát',
    image: '/lashes/designs/lash-design-wing.jpg',
    categoryTitle: 'THANH THOÁT · SẮC SẢO',
    suitableEyes: 'Mắt tròn, mắt có khoảng cách hai mắt hơi gần nhau, khách thích phong cách kiêu kỳ.',
    aestheticEffect: 'Kéo dài đuôi mắt tạo dáng đuôi dài thanh thoát, kiêu sa và có chiều sâu ánh nhìn.',
    technicianTip: 'Hạ độ dài ở 2 - 3 sợi cuối cùng sát khóe đuôi mắt để tránh mi bị sụp hoặc nặng mí.',
    designRule: 'Độ dài tăng lũy tiến từ đầu mắt đến 4/5 đuôi mắt rồi hạ 1mm ở sợi cuối.',
  },
  {
    id: 'Kim - K',
    name: 'Kim K',
    shortName: 'Kim K',
    desc: 'Đan xen các trụ sợi dài ngắn tạo hiệu ứng tia',
    eyeEffect: 'Bắt sáng nổi bật, cá tính thời thượng',
    image: '/lashes/designs/lash-design-kimk.jpg',
    categoryTitle: 'CÁ TÍNH · THỜI THƯỢNG',
    suitableEyes: 'Mắt to, hai mí rõ, khách hay makeup dự tiệc hoặc thích phong cách cá tính hiện đại.',
    aestheticEffect: 'Tạo hiệu ứng tia sole bắt sáng cực kỳ sắc nét, nổi bật dưới ánh đèn và khi chụp ảnh.',
    technicianTip: 'Định hình các trụ tia dài vững chắc trước, sau đó phối tầng sợi ngắn đệm dày chân mi.',
    designRule: 'Khoảng cách giữa các trụ tia từ 2 - 3mm, chênh lệch trụ tia với lớp nền từ 2 - 3mm.',
  },
];

interface LashDesignZoomModalProps {
  isOpen: boolean;
  initialDesignId?: string;
  allowedDesigns?: string[];
  materialName?: string;
  lockedDesignReasons?: Record<string, string>;
  onClose: () => void;
  onSelectDesign: (designId: string) => void;
}

export const LashDesignZoomModal: React.FC<LashDesignZoomModalProps> = ({
  isOpen,
  initialDesignId = 'Natural',
  allowedDesigns,
  materialName,
  lockedDesignReasons,
  onClose,
  onSelectDesign,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const initialIndex = Math.max(
    0,
    LASH_DESIGN_FULL_DETAILS.findIndex((d) => d.id === initialDesignId)
  );
  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [isInfoSheetOpen, setIsInfoSheetOpen] = useState(false);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    if (isOpen) {
      const idx = LASH_DESIGN_FULL_DETAILS.findIndex((d) => d.id === initialDesignId);
      if (idx >= 0) setCurrentIndex(idx);
      setIsInfoSheetOpen(false);
    }
  }, [isOpen, initialDesignId]);

  const currentDesign = LASH_DESIGN_FULL_DETAILS[currentIndex] || LASH_DESIGN_FULL_DETAILS[0];

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : LASH_DESIGN_FULL_DETAILS.length - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < LASH_DESIGN_FULL_DETAILS.length - 1 ? prev + 1 : 0));
  }, []);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!isOpen) return;
    const activeDesign = LASH_DESIGN_FULL_DETAILS[currentIndex];
    if (activeDesign && tabRefs.current[activeDesign.id]) {
      tabRefs.current[activeDesign.id]?.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentIndex, isOpen]);

  // Keyboard navigation
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

  // Touch Swipe gestures
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

  const isAllowed = !allowedDesigns || allowedDesigns.includes(currentDesign.id);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thước đo dáng mi thiết kế"
      className="fixed inset-0 z-50 bg-[var(--background)]/95 backdrop-blur-xl flex flex-col justify-between text-[var(--mos-text)] select-none overflow-hidden h-[100dvh]"
    >
      {/* 1. Header Bar: Minimalist with Close button strictly placed at top right (NO Comparison button) */}
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2 border-b border-[var(--mos-surface-border)] shrink-0">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full ${isDark ? 'text-[#FFB400] bg-[#FFB400]/20' : 'text-amber-800 bg-amber-100'}`}>
            Dáng Mi Thiết Kế
          </span>
          <span className="text-[11px] text-[var(--mos-text-muted)] font-mono tabular-nums">
            ({currentIndex + 1}/{LASH_DESIGN_FULL_DETAILS.length})
          </span>
        </div>

        {/* Right close button [✕] - Mandatory Right Placement Invariant */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng thước đo dáng mi"
          className="w-9 h-9 rounded-full bg-[var(--mos-surface-muted)] active:opacity-80 flex items-center justify-center text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] transition-all cursor-pointer border border-[var(--mos-surface-border)]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Top Fast-Switch Pill Tab Bar */}
      <div className="px-3 py-1.5 bg-[var(--mos-surface)] border-b border-[var(--mos-surface-border)] flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {LASH_DESIGN_FULL_DETAILS.map((design, idx) => {
          const active = idx === currentIndex;
          const allowed = !allowedDesigns || allowedDesigns.includes(design.id);
          return (
            <button
              key={design.id}
              ref={(el) => {
                tabRefs.current[design.id] = el;
              }}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              style={{ touchAction: 'manipulation' }}
              className={`flex-1 min-w-[70px] py-1.5 px-2.5 rounded-xl text-center text-xs font-black transition-all flex items-center justify-center gap-1 border relative cursor-pointer active:scale-95 ${
                active
                  ? 'bg-[#FFB400] border-[#FFB400] text-black shadow-md ring-2 ring-[#FFB400]/40'
                  : allowed
                    ? 'bg-[var(--mos-surface-raised)] border-[var(--mos-surface-border)] text-[var(--mos-text)] hover:opacity-85'
                    : 'bg-[var(--mos-surface-muted)] border-[var(--mos-surface-border)] text-[var(--mos-text-muted)] opacity-60'
              }`}
            >
              <span>{design.shortName}</span>
              {!allowed && <Lock className="w-2.5 h-2.5 text-rose-500 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* 3. Main Center Hero Canvas Area (Minimalism - No Scroll Required on iPhone) */}
      <div className="flex-1 min-h-0 flex flex-col p-2.5 overflow-hidden relative">
        <div
          style={{ touchAction: 'pan-y' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          className="flex-1 w-full bg-[var(--mos-surface)] rounded-3xl p-3 border border-[var(--mos-surface-border)] shadow-xl relative flex flex-col justify-between items-center overflow-hidden"
        >
          {/* Top Bar inside Canvas: Design Name + Info Trigger (i) */}
          <div className="w-full flex items-center justify-between px-1 mb-1 z-10 shrink-0">
            <div className="flex flex-col">
              <span className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-amber-400/90' : 'text-amber-700'}`}>
                {currentDesign.categoryTitle}
              </span>
              <h3 className={`text-xl font-black tracking-tight leading-tight ${isDark ? 'text-[#FFB400]' : 'text-amber-700'}`}>
                {currentDesign.id === 'Kim - K'
                  ? 'Kim K'
                  : `${currentDesign.shortName} · ${currentDesign.name.replace(/.*\(|\).*/g, '')}`}
              </h3>
            </div>

            {/* Minimalist (i) Info Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsInfoSheetOpen(true);
              }}
              aria-label="Xem kịch bản tư vấn và thông tin kỹ thuật dáng mi"
              style={{ touchAction: 'manipulation' }}
              className={`w-10 h-10 rounded-full active:bg-[#FFB400] active:text-black border flex items-center justify-center shadow-lg transition-all cursor-pointer active:scale-90 ${isDark ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-[#FFB400]' : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-700'}`}
            >
              <Info className="w-5 h-5" />
            </button>
          </div>

          {/* Hero Image Container: Full Width & Maximum Height */}
          <div className="w-full flex-1 flex items-center justify-center my-auto min-h-0 relative px-1">
            <div className="relative w-full h-full max-w-[420px] max-h-[360px] rounded-2xl overflow-hidden border border-[var(--mos-surface-border)] bg-black shadow-2xl flex items-center justify-center">
              <img
                src={currentDesign.image}
                alt={currentDesign.name}
                className="w-full h-full object-cover select-none pointer-events-none"
              />
              {/* Badge name overlay in top-left */}
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                {currentDesign.shortName}
              </div>
            </div>
          </div>

          {/* Bottom Ergonomic Navigation Bar: Prev Button + 4 Dots Indicator + Next Button */}
          <div className="w-full flex items-center justify-between px-2 pt-2 pb-1 z-10 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Dáng mi trước"
              style={{ touchAction: 'manipulation' }}
              className="w-9 h-9 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-80 active:bg-[#FFB400] active:text-black border border-[var(--mos-surface-border)] text-[var(--mos-text)] flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Clickable Navigation Dots */}
            <div className="flex items-center gap-1.5">
              {LASH_DESIGN_FULL_DETAILS.map((design, dotIdx) => {
                const isDotActive = dotIdx === currentIndex;
                return (
                  <button
                    key={design.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(dotIdx);
                    }}
                    aria-label={`Chuyển đến dáng mi ${design.shortName}`}
                    className={`transition-all duration-200 cursor-pointer ${
                      isDotActive
                        ? 'w-7 h-2 rounded-full bg-[#FFB400] shadow-sm'
                        : 'w-2 h-2 rounded-full bg-[var(--mos-surface-border-strong)] hover:opacity-80 active:scale-125'
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
              aria-label="Dáng mi kế tiếp"
              style={{ touchAction: 'manipulation' }}
              className="w-9 h-9 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-80 active:bg-[#FFB400] active:text-black border border-[var(--mos-surface-border)] text-[var(--mos-text)] flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Action Footer */}
      <div className="p-3 bg-[var(--mos-surface)] border-t border-[var(--mos-surface-border)] flex flex-col gap-1.5 shrink-0">
        {allowedDesigns && !allowedDesigns.includes(currentDesign.id) && (
          <div className={`text-[10.5px] rounded-xl px-2.5 py-1 flex items-center gap-1.5 border ${isDark ? 'text-rose-300 bg-rose-500/15 border-rose-500/30' : 'text-rose-700 bg-rose-50 border-rose-200'}`}>
            <Lock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>
              <strong>Hạn chế kỹ thuật ({materialName || 'Chất liệu đang chọn'}):</strong>{' '}
              {lockedDesignReasons?.[currentDesign.id] ||
                `Không áp dụng dáng mi ${currentDesign.shortName} cho chất liệu này.`}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-3 rounded-2xl bg-[var(--mos-surface-muted)] hover:opacity-80 text-[var(--mos-text)] border border-[var(--mos-surface-border)] font-bold text-[13px] active:scale-98 transition-all cursor-pointer"
          >
            Đóng
          </button>

          {isAllowed ? (
            <button
              type="button"
              onClick={() => {
                onSelectDesign(currentDesign.id);
                onClose();
              }}
              className="flex-2 py-3 px-4 rounded-2xl bg-[var(--mos-accent)] active:opacity-90 text-[var(--mos-accent-contrast)] font-black text-[14px] flex items-center justify-center gap-1.5 shadow-lg active:scale-98 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Chọn Dáng Mi {currentDesign.shortName}</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex-2 py-3 px-4 rounded-2xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-text-muted)] font-bold text-[13px] flex items-center justify-center gap-1.5 cursor-not-allowed"
            >
              <Lock className="w-4 h-4 text-rose-500 shrink-0" />
              <span>Khóa Theo Chất Liệu</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Minimalist Bottom Sheet for Information & Consultation (Triggered by (i)) */}
      {isInfoSheetOpen && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">
          {/* Backdrop Click to Close */}
          <div className="flex-1 w-full" onClick={() => setIsInfoSheetOpen(false)} />

          {/* Sheet Body Container */}
          <div className="w-full bg-[var(--mos-surface)] text-[var(--mos-text)] border-t border-[var(--mos-surface-border)] rounded-t-3xl p-4 flex flex-col max-h-[75vh] shadow-2xl animate-in slide-in-from-bottom duration-250">
            {/* Top Swipe Drag Pill */}
            <div className="w-12 h-1.5 bg-[var(--mos-surface-border-strong)] rounded-full mx-auto mb-3 shrink-0" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[var(--mos-surface-border)] shrink-0">
              <div>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                  Kịch Bản Tư Vấn & Kỹ Thuật
                </span>
                <h4 className="text-base font-black text-[var(--mos-text)]">
                  Dáng Mi {currentDesign.id === 'Kim - K' ? 'Kim K' : currentDesign.name}
                </h4>
              </div>

              <button
                type="button"
                onClick={() => setIsInfoSheetOpen(false)}
                className="w-8 h-8 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-80 flex items-center justify-center text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] cursor-pointer border border-[var(--mos-surface-border)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Scrollable Content */}
            <div className="flex-1 overflow-y-auto pt-3 space-y-3 pr-1">
              {/* Eye Shapes */}
              <div className="flex items-start gap-2.5 text-[12px] bg-[var(--mos-surface-raised)] p-3 rounded-2xl border border-[var(--mos-surface-border)]">
                <Eye className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                <div>
                  <span className={`font-bold block mb-0.5 ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>Dáng mắt phù hợp:</span>
                  <span className="text-[var(--mos-text)] leading-relaxed">{currentDesign.suitableEyes}</span>
                </div>
              </div>

              {/* Aesthetic Effect */}
              <div className="flex items-start gap-2.5 text-[12px] bg-[var(--mos-surface-raised)] p-3 rounded-2xl border border-[var(--mos-surface-border)]">
                <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <div>
                  <span className={`font-bold block mb-0.5 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Hiệu ứng thẩm mỹ:</span>
                  <span className="text-[var(--mos-text)] leading-relaxed">{currentDesign.aestheticEffect}</span>
                </div>
              </div>

              {/* Design Rule */}
              <div className="flex items-start gap-2.5 text-[12px] bg-[var(--mos-surface-raised)] p-3 rounded-2xl border border-[var(--mos-surface-border)]">
                <Layers className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <div>
                  <span className={`font-bold block mb-0.5 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>Quy tắc phân bổ chiều dài:</span>
                  <span className="text-[var(--mos-text)] leading-relaxed">{currentDesign.designRule}</span>
                </div>
              </div>

              {/* Technician Tip */}
              <div className={`flex items-start gap-2.5 text-[11.5px] border rounded-2xl p-3 ${isDark ? 'bg-amber-500/10 border-amber-500/20' : 'bg-amber-50 border-amber-200'}`}>
                <HelpCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <div>
                  <span className={`font-bold block mb-0.5 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                    Lưu ý kỹ thuật cho <CvFeather1Badge />:
                  </span>
                  <span className={`leading-relaxed ${isDark ? 'text-amber-100' : 'text-amber-950'}`}>{currentDesign.technicianTip}</span>
                </div>
              </div>
            </div>

            {/* Bottom Sheet Close Button */}
            <div className="pt-3 border-t border-[var(--mos-surface-border)] shrink-0">
              <button
                type="button"
                onClick={() => setIsInfoSheetOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[var(--mos-surface-muted)] hover:opacity-80 text-[var(--mos-text)] border border-[var(--mos-surface-border)] font-bold text-xs active:scale-98 transition-all cursor-pointer"
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
