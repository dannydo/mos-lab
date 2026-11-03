'use client';

import React, { useState } from 'react';
import { X, Check, CheckCircle2, Sparkles, ZoomIn } from 'lucide-react';
import { ALL_LASH_DESIGNS, type LashDesignOption } from './LashMaterialConstraintMatrix';

interface LashDesignCompareModalProps {
  open: boolean;
  selectedDesignId: string;
  allowedDesignIds?: string[];
  materialName?: string;
  onClose: () => void;
  onSelectDesign: (designId: string) => void;
}

export const LashDesignCompareModal: React.FC<LashDesignCompareModalProps> = ({
  open,
  selectedDesignId,
  allowedDesignIds,
  materialName,
  onClose,
  onSelectDesign,
}) => {
  const [activeZoomStyle, setActiveZoomStyle] = useState<LashDesignOption | null>(null);

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
              <Sparkles className="w-3.5 h-3.5" />
              SO SÁNH 4 DÁNG MI TRÊN CÙNG 1 KHUÔN MẮT
            </div>
            <div className="text-[13px] font-black text-white truncate mt-0.5">
              Cùng 1 người mẫu · Cùng mắt thật & góc chụp
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng so sánh dáng mi"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {/* Active Zoom High-Res Preview if clicked */}
          {activeZoomStyle && (
            <div className="bg-[#1E293B] rounded-2xl p-2.5 border border-[#FFB400]/40 shadow-lg space-y-2 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-[#FFB400] uppercase">
                  Phóng to: {activeZoomStyle.name}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveZoomStyle(null)}
                  className="text-[10px] text-gray-400 hover:text-white"
                >
                  Thu nhỏ ✕
                </button>
              </div>
              <div className="aspect-square w-full rounded-xl overflow-hidden bg-black">
                <img src={activeZoomStyle.image} alt={activeZoomStyle.name} className="w-full h-full object-cover" />
              </div>
              <div className="text-[11.5px] text-gray-200 font-medium">
                {activeZoomStyle.desc} · <strong className="text-amber-400">{activeZoomStyle.eyeEffect}</strong>
              </div>
            </div>
          )}

          {/* 2x2 Visual Comparison Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {ALL_LASH_DESIGNS.map((d) => {
              const isSelected = selectedDesignId === d.id;
              const isAllowed = !allowedDesignIds || allowedDesignIds.includes(d.id);

              return (
                <div
                  key={d.id}
                  onClick={() => {
                    if (isAllowed) {
                      onSelectDesign(d.id);
                    }
                  }}
                  className={`rounded-2xl border p-2 flex flex-col justify-between transition-all select-none cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-amber-500/15 border-[#FFB400] ring-2 ring-[#FFB400]/50 shadow-md'
                      : isAllowed
                        ? 'bg-[#1E293B]/90 border-white/10 hover:border-white/30'
                        : 'bg-[#1E293B]/40 border-white/5 opacity-55 cursor-not-allowed'
                  }`}
                >
                  <div>
                    {/* Image with zoom badge */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black mb-2 border border-white/10 group">
                      <img
                        src={d.image}
                        alt={d.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[10px] font-black text-[#FFB400] uppercase tracking-wider">
                        {d.shortName}
                      </span>
                      <button
                        type="button"
                        aria-label={`Phóng to ${d.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveZoomStyle(d);
                        }}
                        className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center transition-colors"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>

                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#FFB400] text-black flex items-center justify-center shadow-xs">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="text-[12px] font-black text-white flex items-center justify-between">
                      <span>{d.shortName}</span>
                      {!isAllowed && (
                        <span className="text-[9px] font-extrabold text-rose-400 bg-rose-950/60 px-1 rounded">
                          Khóa
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-2 leading-snug">{d.desc}</div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[9.5px] font-bold text-amber-400 truncate pr-1">{d.eyeEffect}</span>
                    {isAllowed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDesign(d.id);
                          onClose();
                        }}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0 transition-colors ${
                          isSelected ? 'bg-[#FFB400] text-black' : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {isSelected ? 'Đang chọn' : 'Chọn'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-[#1E293B]/70 rounded-xl p-2.5 border border-white/10 text-[10.5px] text-gray-300">
            <span className="text-[#FFB400] font-black uppercase">Mẹo tư vấn khách hàng:</span> Cho khách xem 4 tấm ảnh
            cận cảnh trên cùng 1 mắt mẫu để khách dễ dàng hình dung mắt mình khi lên form Natural, Doll, Wing hay Sole
            Katun Kim-K.
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#0B1120] border-t border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-gray-400">
            Đang chọn: <strong className="text-[#FFB400]">{selectedDesignId}</strong>
            {materialName && <span className="opacity-75"> ({materialName})</span>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#FFB400] hover:bg-[#f0a800] text-black font-black text-[12px] shadow-md cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
