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
  Info,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import { NATURAL_EYE_SHAPES, type EyeShapeOption } from './NaturalLashAssessmentData';

export interface EyeShapeDetailedInfo extends EyeShapeOption {
  shortName: string;
  categoryTitle: string;
  anatomicalSign: string;
  dangerRisk: string;
  technicianTip: string;
}

export const EYE_SHAPES_EXTENDED_DETAILS: EyeShapeDetailedInfo[] = [
  {
    ...NATURAL_EYE_SHAPES[0],
    shortName: 'Mí lót',
    categoryTitle: 'CHÙNG DA · SỤP MÍ TRÊN',
    anatomicalSign: 'Nếp gấp mí đôi bị vạt da trên che khuất hoàn toàn khi nhìn thẳng, chân mi bị đè ép chúc xuống.',
    dangerRisk:
      'Tuyệt đối tránh độ cong nhẹ (B, J) hoặc nối quá dài ở giữa vì vạt da sụp sẽ đè bẹp ngọn mi, gây cấn mắt và che khuất tầm nhìn.',
    technicianTip:
      'Nâng góc đặt mi vuông góc 90° so với bờ mí. Khuyên dùng độ cong CC hoặc L chân phẳng để ngọn mi vươn qua vạt da đè.',
  },
  {
    ...NATURAL_EYE_SHAPES[1],
    shortName: 'Một mí',
    categoryTitle: 'PHẲNG MỊN · KHÔNG NẾP GẤP',
    anatomicalSign:
      'Bầu mắt phẳng mịn liền mạch từ chân mày xuống bờ mi, góc khóe mắt trong thường có nếp quạt rẻ quạt (Epicanthic fold).',
    dangerRisk:
      'Tránh chiều dài quá ngắn (< 9mm) ở giữa mắt vì khi mở mắt mí sẽ nuốt trọn sợi mi. Tránh mi quá dày nặng làm sụp góc mắt.',
    technicianTip:
      'Chọn mi chân dán phẳng dài (Flat Base / L Curl) để tăng diện tích tiếp xúc keo trên nền mi thẳng chúc.',
  },
  {
    ...NATURAL_EYE_SHAPES[2],
    shortName: 'Mắt tròn',
    categoryTitle: 'MỞ RỘNG DỌC · CẦU MẮT LỚN',
    anatomicalSign:
      'Độ mở mắt theo chiều dọc rất lớn, lộ rõ phần tròng trắng phía dưới con ngươi, viền mí cong hình vòm cao.',
    dangerRisk:
      'Tránh độ cong quá gắt (D, U) kết hợp độ dài lớn ở chính giữa mắt vì sẽ tạo cảm giác mắt bị trợn tròn hoặc ngạc nhiên liên tục.',
    technicianTip:
      'Ưu tiên dáng Wing kéo dài đuôi để tạo sự cân bằng ngang cho mắt, hoặc dáng Doll nhẹ nhàng với độ cong C vừa phải.',
  },
  {
    ...NATURAL_EYE_SHAPES[3],
    shortName: 'Hạnh nhân',
    categoryTitle: 'TỶ LỆ VÀNG · ĐUÔI XẾCH DUYÊN',
    anatomicalSign:
      'Đường viền mí trên và dưới cong đều hoàn hảo, con ngươi chạm khít cả 2 bờ viền mí, đuôi mắt xếch nhẹ thanh thoát.',
    dangerRisk:
      'Hầu như không có rủi ro về mặt tạo hình, chỉ cần tuân thủ quy tắc tải trọng an toàn (+2mm so với mi thật).',
    technicianTip:
      'Tự do sáng tạo mọi form mi: Natural thanh lịch, Wing đuôi dài thanh thoát, Doll búp bê, hoặc Kim-K thời thượng.',
  },
  {
    ...NATURAL_EYE_SHAPES[4],
    shortName: 'Mắt sâu',
    categoryTitle: 'HỐC MẮT SÂU · GỜ XƯƠNG MÀY CAO',
    anatomicalSign:
      'Gờ xương chân mày nhô cao rõ rệt, nhãn cầu lùi sâu vào trong hốc mắt tạo khoảng trũng và bóng đổ tự nhiên.',
    dangerRisk:
      'Tuyệt đối tránh độ cong quá gắt (D, U) với chiều dài ngắn vì ngọn mi sẽ cong ngược đâm vào bầu mắt hoặc chạm xương hốc mắt.',
    technicianTip:
      'Nối dài hơn bình thường +1 đến 2mm với độ cong vươn xa (CC hoặc L) để đưa ngọn mi vươn ra khỏi vùng bóng tối của hốc mắt.',
  },
];

interface EyeShapeCompareModalProps {
  open: boolean;
  selectedEyeShapeId: string;
  initialEyeShapeId?: string;
  onClose: () => void;
  onSelectEyeShape: (eyeShapeId: string) => void;
}

export const EyeShapeCompareModal: React.FC<EyeShapeCompareModalProps> = ({
  open,
  selectedEyeShapeId,
  initialEyeShapeId,
  onClose,
  onSelectEyeShape,
}) => {
  const targetId = initialEyeShapeId || selectedEyeShapeId || NATURAL_EYE_SHAPES[0].id;
  const initialIndex = Math.max(
    0,
    EYE_SHAPES_EXTENDED_DETAILS.findIndex((e) => e.id === targetId)
  );

  const [currentIndex, setCurrentIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [isInfoSheetOpen, setIsInfoSheetOpen] = useState(false);

  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const touchEndXRef = useRef<number | null>(null);
  const touchEndYRef = useRef<number | null>(null);
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    if (open) {
      const startId = initialEyeShapeId || selectedEyeShapeId;
      const idx = EYE_SHAPES_EXTENDED_DETAILS.findIndex((e) => e.id === startId);
      if (idx >= 0) setCurrentIndex(idx);
      setIsInfoSheetOpen(false);
    }
  }, [open, initialEyeShapeId, selectedEyeShapeId]);

  const currentEye = EYE_SHAPES_EXTENDED_DETAILS[currentIndex] || EYE_SHAPES_EXTENDED_DETAILS[0];

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : EYE_SHAPES_EXTENDED_DETAILS.length - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev < EYE_SHAPES_EXTENDED_DETAILS.length - 1 ? prev + 1 : 0));
  }, []);

  // Auto-scroll active tab into view
  useEffect(() => {
    if (!open) return;
    const activeEye = EYE_SHAPES_EXTENDED_DETAILS[currentIndex];
    if (activeEye && tabRefs.current[activeEye.id]) {
      tabRefs.current[activeEye.id]?.scrollIntoView?.({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentIndex, open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
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
  }, [open, handlePrev, handleNext, onClose, isInfoSheetOpen]);

  // Touch Swipe Gesture for iOS
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

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Thước đo và so sánh dáng mắt"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between text-white select-none overflow-hidden h-[100dvh]"
    >
      {/* 1. Header Bar: Minimalist with Close button strictly placed at top right */}
      <div className="flex items-center justify-between px-3.5 pt-2.5 pb-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-black tracking-widest text-[#FFB400] bg-[#FFB400]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Eye className="w-3 h-3" />
            Dáng Mắt Khách
          </span>
          <span className="text-[11px] text-gray-400 font-mono">
            ({currentIndex + 1}/{EYE_SHAPES_EXTENDED_DETAILS.length})
          </span>
        </div>

        {/* Right close button [✕] - Mandatory Right Placement Invariant */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng so sánh dáng mắt"
          className="w-9 h-9 rounded-full bg-white/10 active:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Top Fast-Switch Pill Tab Bar */}
      <div className="px-3 py-1.5 bg-white/[0.03] border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
        {EYE_SHAPES_EXTENDED_DETAILS.map((eye, idx) => {
          const active = idx === currentIndex;
          return (
            <button
              key={eye.id}
              ref={(el) => {
                tabRefs.current[eye.id] = el;
              }}
              type="button"
              onClick={() => setCurrentIndex(idx)}
              style={{ touchAction: 'manipulation' }}
              className={`flex-1 min-w-[62px] py-1 px-1.5 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1 border relative cursor-pointer active:scale-95 ${
                active
                  ? 'bg-[#FFB400] border-[#FFB400] text-black shadow-md ring-2 ring-[#FFB400]/40'
                  : 'bg-white/5 border-white/10 text-gray-200 hover:bg-white/10'
              }`}
            >
              <div className="w-6 h-6 rounded-full overflow-hidden bg-black/50 border border-black/20 shrink-0">
                <img src={eye.image} alt={eye.name} className="w-full h-full object-cover" />
              </div>
              <span
                className={`text-[9.5px] truncate max-w-full leading-tight ${active ? 'font-black text-black' : 'font-bold text-gray-300'}`}
              >
                {eye.shortName}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. Main Center Hero Canvas Area (Minimalism - Zoom Image + Swipe) */}
      <div className="flex-1 min-h-0 flex flex-col p-2.5 overflow-hidden relative">
        <div
          style={{ touchAction: 'pan-y' }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          className="flex-1 w-full bg-gradient-to-b from-white/10 via-white/5 to-transparent rounded-3xl p-3 border border-white/10 shadow-2xl relative flex flex-col justify-between items-center overflow-hidden"
        >
          {/* Top Bar inside Canvas: Eye Shape Name + Info Trigger (i) */}
          <div className="w-full flex items-center justify-between px-1 mb-1 z-10 shrink-0">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400/90 truncate">
                {currentEye.categoryTitle}
              </span>
              <h3 className="text-xl font-black text-[#FFB400] tracking-tight leading-tight truncate">
                {currentEye.name}
              </h3>
            </div>

            {/* Minimalist (i) Info Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsInfoSheetOpen(true);
              }}
              aria-label="Xem giải thích sâu về dáng mắt"
              style={{ touchAction: 'manipulation' }}
              className="w-10 h-10 rounded-full bg-amber-500/15 hover:bg-amber-500/25 active:bg-[#FFB400] active:text-black border border-amber-400/40 text-[#FFB400] flex items-center justify-center shadow-lg transition-all cursor-pointer active:scale-90 shrink-0"
              title="Nhấn để xem giải thích chuyên sâu"
            >
              <Info className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* Hero Zoom Image with Quick Advice Badge */}
          <div
            onClick={() => setIsInfoSheetOpen(true)}
            className="w-full flex-1 flex flex-col items-center justify-center my-auto min-h-0 relative px-1 cursor-pointer group"
          >
            <div className="relative w-full h-full max-h-[360px] rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-neutral-950 flex items-center justify-center">
              <img
                src={currentEye.image}
                alt={currentEye.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* Bottom gradient overlay with recommended specs */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Sparkles className="w-3.5 h-3.5 text-[#FFB400] shrink-0" />
                  <span className="text-gray-300">Khuyên dùng:</span>
                  <strong className="text-white font-extrabold truncate">
                    Dáng {currentEye.recommendedDesign} · Cong {currentEye.recommendedCurl}
                  </strong>
                </div>
                <span className="text-[10px] text-[#FFB400] font-bold bg-[#FFB400]/20 px-2 py-0.5 rounded-full border border-[#FFB400]/30 shrink-0">
                  Chạm xem chi tiết (i)
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Ergonomic Navigation Bar: Prev Button + 5 Dots Indicator + Next Button */}
          <div className="w-full flex items-center justify-between px-2 pt-2 pb-1 z-10 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              aria-label="Dáng mắt trước"
              style={{ touchAction: 'manipulation' }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-[#FFB400] active:text-black border border-white/10 text-gray-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-90"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* 5 Clickable Navigation Dots */}
            <div className="flex items-center gap-1.5">
              {EYE_SHAPES_EXTENDED_DETAILS.map((eye, dotIdx) => {
                const isDotActive = dotIdx === currentIndex;
                return (
                  <button
                    key={eye.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentIndex(dotIdx);
                    }}
                    aria-label={`Chuyển đến dáng mắt ${eye.name}`}
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
              aria-label="Dáng mắt kế tiếp"
              style={{ touchAction: 'manipulation' }}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:bg-[#FFB400] active:text-black border border-white/10 text-gray-200 flex items-center justify-center shadow-md cursor-pointer transition-all active:scale-90"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. Bottom Action Footer */}
      <div className="p-3 bg-black/95 border-t border-white/10 flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 px-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-bold text-[13px] active:scale-98 transition-all cursor-pointer"
        >
          Đóng
        </button>

        <button
          type="button"
          onClick={() => {
            onSelectEyeShape(currentEye.id);
            onClose();
          }}
          className="flex-2 py-3 px-4 rounded-2xl bg-[#FFB400] active:bg-[#e09e00] text-black font-black text-[14px] flex items-center justify-center gap-1.5 shadow-lg active:scale-98 transition-all cursor-pointer"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="truncate">Chọn Dáng {currentEye.shortName}</span>
        </button>
      </div>

      {/* 5. Minimalist Bottom Sheet for In-depth Explanation (Triggered by (i)) */}
      {isInfoSheetOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">
          <div className="flex-1 w-full" onClick={() => setIsInfoSheetOpen(false)} />

          <div className="w-full bg-neutral-900 border-t border-white/20 rounded-t-3xl p-4 flex flex-col max-h-[80vh] shadow-2xl animate-in slide-in-from-bottom duration-250">
            {/* Top Swipe Drag Pill */}
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-3 shrink-0" />

            {/* Sheet Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                  Phân Tích Giải Phẫu Bờ Mí & Kịch Bản Tư Vấn
                </span>
                <h4 className="text-base font-black text-white">{currentEye.name}</h4>
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
            <div className="flex-1 overflow-y-auto pt-3 space-y-3 pr-1 text-[12px]">
              {/* Technical Specifications */}
              <div className="grid grid-cols-2 gap-2 bg-white/5 rounded-2xl p-2.5 border border-white/10 text-center">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Dáng mi khuyên dùng</span>
                  <strong className="text-[#FFB400] text-sm font-black">Dáng {currentEye.recommendedDesign}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Độ cong an toàn</span>
                  <strong className="text-emerald-400 text-sm font-black">Độ Cong {currentEye.recommendedCurl}</strong>
                </div>
              </div>

              {/* Đặc điểm nhận diện cốt lõi */}
              <div className="flex items-start gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/5">
                <Eye className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 block text-[11px] uppercase tracking-wide">
                    Đặc Điểm Nhận Diện Cốt Lõi
                  </strong>
                  <p className="text-gray-200 mt-0.5 leading-relaxed">{currentEye.keyFeature}</p>
                </div>
              </div>

              {/* Cấu trúc giải phẫu bờ mí */}
              <div className="flex items-start gap-2.5 bg-white/5 p-3 rounded-2xl border border-white/5">
                <Layers className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-300 block text-[11px] uppercase tracking-wide">
                    Cấu Trúc Giải Phẫu Bờ Mí
                  </strong>
                  <p className="text-gray-200 mt-0.5 leading-relaxed">{currentEye.desc}</p>
                </div>
              </div>

              {/* Kịch bản tư vấn khoa học Wings */}
              <div className="flex items-start gap-2.5 bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-emerald-300 block text-[11px] uppercase tracking-wide">
                    Lời Khuyên Khoa Học Wings
                  </strong>
                  <p className="text-emerald-100 mt-0.5 leading-relaxed">{currentEye.lashAdvice}</p>
                </div>
              </div>

              {/* Cảnh báo rủi ro an toàn */}
              <div className="flex items-start gap-2.5 bg-rose-500/10 p-3 rounded-2xl border border-rose-500/20">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-rose-300 block text-[11px] uppercase tracking-wide">
                    Rủi Ro Cần Tránh Khi Nối Mi
                  </strong>
                  <p className="text-rose-100 mt-0.5 leading-relaxed">{currentEye.dangerRisk}</p>
                </div>
              </div>

              {/* Lưu ý kỹ thuật cho Chuyên Viên */}
              <div className="flex items-start gap-2.5 bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
                <Wrench className="w-4 h-4 text-[#FFB400] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#FFB400] block text-[11px] uppercase tracking-wide">
                    Lưu Ý Kỹ Thuật Dành Cho Chuyên Viên
                  </strong>
                  <p className="text-amber-100 mt-0.5 leading-relaxed">{currentEye.technicianTip}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
