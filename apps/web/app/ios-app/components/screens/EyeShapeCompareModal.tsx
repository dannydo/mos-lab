'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Sparkles, ZoomIn, Eye, AlertCircle } from 'lucide-react';
import { NATURAL_EYE_SHAPES, type EyeShapeOption } from './NaturalLashAssessmentData';

interface EyeShapeCompareModalProps {
  open: boolean;
  selectedEyeShapeId: string;
  onClose: () => void;
  onSelectEyeShape: (eyeShapeId: string) => void;
}

export const EyeShapeCompareModal: React.FC<EyeShapeCompareModalProps> = ({
  open,
  selectedEyeShapeId,
  onClose,
  onSelectEyeShape,
}) => {
  const [activeZoomEye, setActiveZoomEye] = useState<EyeShapeOption | null>(null);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center sm:items-center select-none animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] max-h-[94dvh] bg-[#0F172A] text-white sm:rounded-[30px] rounded-t-[28px] overflow-hidden flex flex-col shadow-2xl border border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-4 py-3 bg-[#0B1120] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-2">
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#FFB400] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              SO SÁNH 5 DÁNG MẮT TRÊN CÙNG 1 KHUÔN MẶT
            </div>
            <div className="text-[13px] font-black text-white truncate mt-0.5">
              Nhận diện chuẩn xác dáng mắt · Tư vấn form mi an toàn
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng so sánh dáng mắt"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {/* Active Zoom High-Res Preview if clicked */}
          {activeZoomEye && (
            <div className="bg-[#1E293B] rounded-2xl p-2.5 border border-[#FFB400]/40 shadow-lg space-y-2 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#FFB400] uppercase">Chi tiết: {activeZoomEye.name}</span>
                <button
                  type="button"
                  onClick={() => setActiveZoomEye(null)}
                  className="text-[10px] text-gray-400 hover:text-white"
                >
                  Thu nhỏ ✕
                </button>
              </div>
              <div className="aspect-4/3 w-full rounded-xl overflow-hidden bg-black relative">
                <img src={activeZoomEye.image} alt={activeZoomEye.name} className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-[#FFB400] text-[10px] font-bold">
                  {activeZoomEye.keyFeature}
                </span>
              </div>
              <div className="text-[11.5px] text-gray-200 font-medium space-y-1">
                <div>{activeZoomEye.desc}</div>
                <div className="text-[#34C759] font-bold">
                  💡 Lời khuyên Wings: {activeZoomEye.lashAdvice} (Khuyên dùng dáng{' '}
                  <strong className="text-amber-400">{activeZoomEye.recommendedDesign}</strong>, cong{' '}
                  <strong className="text-amber-400">{activeZoomEye.recommendedCurl}</strong>)
                </div>
              </div>
            </div>
          )}

          {/* 5 Eye Shape Cards */}
          <div className="grid grid-cols-1 gap-2.5">
            {NATURAL_EYE_SHAPES.map((eye) => {
              const isSelected = selectedEyeShapeId === eye.id;

              return (
                <div
                  key={eye.id}
                  onClick={() => {
                    onSelectEyeShape(eye.id);
                  }}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 relative ${
                    isSelected
                      ? 'bg-[#1E293B] border-[#FFB400] ring-2 ring-[#FFB400]/50 shadow-md'
                      : 'bg-[#1E293B]/60 border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Thumbnail Image with Zoom Trigger */}
                  <div className="relative aspect-4/3 w-28 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                    <img src={eye.image} alt={eye.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveZoomEye(eye);
                      }}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-colors shadow-xs"
                      title="Phóng to"
                    >
                      <ZoomIn className="w-3 h-3" />
                    </button>
                    {isSelected && (
                      <span className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#FFB400] text-black flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  {/* Eye Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[13px] font-black text-white truncate">{eye.name}</h4>
                      {isSelected ? (
                        <span className="text-[10px] font-black text-[#FFB400] bg-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
                          Đã chọn
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400">Chọn</span>
                      )}
                    </div>
                    <div className="text-[10.5px] text-gray-300 mt-0.5 font-medium leading-tight">{eye.keyFeature}</div>
                    <div className="text-[10px] text-amber-300 mt-1 font-semibold flex items-center gap-1">
                      <span>Form mi:</span>
                      <strong className="text-white">{eye.recommendedDesign}</strong>
                      <span className="text-gray-400">· Cong</span>
                      <strong className="text-white">{eye.recommendedCurl}</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="p-3 bg-[#0B1120] border-t border-white/10 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-gray-400">
            Dáng đang chọn:{' '}
            <strong className="text-[#FFB400]">
              {NATURAL_EYE_SHAPES.find((e) => e.id === selectedEyeShapeId)?.name || 'Mí lót / Sụp mí'}
            </strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#FFB400] text-black font-extrabold text-[12px] shadow-sm active:scale-95 transition-transform"
          >
            Đóng & Tiếp Tục
          </button>
        </div>
      </div>
    </div>
  );
};
