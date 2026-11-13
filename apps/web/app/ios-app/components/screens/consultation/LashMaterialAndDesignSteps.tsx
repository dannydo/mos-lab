'use client';

import React from 'react';
import { Info, Sliders, Feather, Zap, Leaf, Layers, Eye, Sparkles, CheckCircle2, Crown } from 'lucide-react';
import { ALL_LASH_DESIGNS, type LashMaterialSpec } from '../LashMaterialConstraintMatrix';
import type { InfoModalType } from '../LashConsultationInfoModal';

interface LashMaterialAndDesignStepsProps {
  isDark: boolean;
  isSuperAdmin: boolean;
  materialCatalog: LashMaterialSpec[];
  selectedMaterial: string;
  currentMaterialSpec: LashMaterialSpec;
  selectedStyle: string;
  setSelectedStyle: (style: string) => void;
  setZoomDesignId: (style: string) => void;
  setIsCompareDesignsOpen: (open: boolean) => void;
  setInfoModalKey: (key: InfoModalType) => void;
  setIsConfiguratorOpen: (open: boolean) => void;
  handleSelectMaterial: (mat: LashMaterialSpec) => void;
}

export function LashMaterialAndDesignSteps({
  isDark,
  isSuperAdmin,
  materialCatalog,
  selectedMaterial,
  currentMaterialSpec,
  selectedStyle,
  setSelectedStyle,
  setZoomDesignId,
  setIsCompareDesignsOpen,
  setInfoModalKey,
  setIsConfiguratorOpen,
  handleSelectMaterial,
}: LashMaterialAndDesignStepsProps) {
  return (
    <>
      {/* BƯỚC 1: CHỌN CHẤT LIỆU / DÒNG MI (MATERIAL FAMILY) */}
      <div>
        <div
          className={`text-[11px] font-extrabold uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between ${
            isDark ? 'text-neutral-300' : 'text-gray-700'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-black text-[#FFB400] text-[10px] font-black inline-flex items-center justify-center">
              1
            </span>
            <span>BƯỚC 1: DÒNG MI</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setInfoModalKey('MATERIAL')}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${
                isDark
                  ? 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/80 border border-amber-800'
                  : 'bg-amber-100/90 text-amber-800 hover:bg-amber-200'
              }`}
              title="Xem quy chuẩn dòng mi"
            >
              <Info className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={() => setIsConfiguratorOpen(true)}
                aria-label="Cấu hình ma trận chất liệu (Chỉ Super Admin)"
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${
                  isDark
                    ? 'bg-neutral-800 text-[#FFB400] hover:bg-neutral-700 border border-neutral-700'
                    : 'bg-neutral-900 text-[#FFB400] hover:bg-black'
                }`}
                title="Cấu hình ma trận chất liệu (Chỉ Super Admin)"
              >
                <Sliders className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        <div
          className={`rounded-2xl p-2.5 shadow-xs border transition-colors ${'bg-[var(--mos-surface)] border-[var(--mos-surface-border)]'}`}
        >
          <div className="grid grid-cols-2 gap-2">
            {materialCatalog
              .filter((mat) => mat.code !== 'UNDER_MINK')
              .map((mat) => {
                const active = selectedMaterial === mat.id;
                const startingPrice =
                  mat.code === 'FLAWLESS_MINK'
                    ? '770K'
                    : mat.code === 'ULTRALIGHT'
                      ? '550K'
                      : mat.code === 'HYPERLIGHT'
                        ? '440K'
                        : mat.code === 'IVYLIGHT'
                          ? '770K'
                          : '390K';

                const icon =
                  mat.code === 'ULTRALIGHT' ? (
                    <Feather className="w-3.5 h-3.5 text-amber-500" />
                  ) : mat.code === 'HYPERLIGHT' ? (
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                  ) : mat.code === 'IVYLIGHT' ? (
                    <Leaf className="w-3.5 h-3.5 text-emerald-500" />
                  ) : mat.code === 'NEW_VOLUME' ? (
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  ) : mat.code === 'NEW_CLASSIC' ? (
                    <Eye className="w-3.5 h-3.5 text-blue-400" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  );

                return (
                  <button
                    key={mat.id}
                    type="button"
                    onClick={() => handleSelectMaterial(mat)}
                    className={`p-2 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                      active
                        ? isDark
                          ? 'bg-[#2A2315] border-[#FFB400] text-white shadow-xs ring-1 ring-[#FFB400]'
                          : 'bg-amber-50/95 border-[#FFB400] text-black shadow-xs ring-1 ring-[#FFB400]'
                        : isDark
                          ? 'bg-[#18181A] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                          : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {icon}
                        <span className="text-[12px] font-black leading-tight truncate">{mat.shortLabel}</span>
                      </div>
                      {active && <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9500] shrink-0" />}
                    </div>

                    <div
                      className={`flex items-center justify-between mt-1.5 pt-1.5 border-t ${
                        isDark ? 'border-neutral-800' : 'border-gray-100'
                      }`}
                    >
                      {(() => {
                        const badgeText = mat.badge.split('·')[0].trim();
                        const isBest = badgeText === 'BEST SELLER';
                        const isPop = badgeText === 'MOST POPULAR';
                        if (isBest || isPop) {
                          return (
                            <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-md bg-[#DC2626] text-white leading-none uppercase tracking-wide inline-flex items-center gap-0.5 shadow-2xs">
                              {isBest ? (
                                <Sparkles className="w-2 h-2 fill-white text-white shrink-0" />
                              ) : (
                                <Crown className="w-2 h-2 fill-white text-white shrink-0" />
                              )}
                              {badgeText}
                            </span>
                          );
                        }
                        return (
                          <span
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded leading-none ${
                              active
                                ? isDark
                                  ? 'bg-[#3A301E] text-[#FFB400]'
                                  : 'bg-black text-[#FFB400]'
                                : isDark
                                  ? 'bg-neutral-800 text-neutral-400'
                                  : 'bg-gray-200/80 text-gray-600'
                            }`}
                          >
                            {badgeText}
                          </span>
                        );
                      })()}
                      <span className={`text-[10.5px] font-bold tabular-nums text-[var(--mos-text-muted)]`}>
                        từ {startingPrice}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* BƯỚC 2: THIẾT KẾ TRÊN HẠN CHẾ CỦA CHẤT LIỆU (CONSTRAINED DESIGN) */}
      <div>
        <div
          className={`text-[11px] font-extrabold uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between ${
            isDark ? 'text-neutral-300' : 'text-gray-700'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-black text-[#FFB400] text-[10px] font-black inline-flex items-center justify-center">
              2
            </span>
            <span>BƯỚC 2: DÁNG MI ({currentMaterialSpec.shortLabel.toUpperCase()})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setInfoModalKey('DESIGN')}
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${
                isDark
                  ? 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/80 border border-amber-800'
                  : 'bg-amber-100/90 text-amber-800 hover:bg-amber-200'
              }`}
              title="Xem quy chuẩn 4 dáng mi & dáng mắt"
            >
              <Info className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        <div
          className={`rounded-2xl p-2.5 shadow-xs border transition-colors ${'bg-[var(--mos-surface)] border-[var(--mos-surface-border)]'}`}
        >
          <div
            className={`grid gap-2 ${currentMaterialSpec.allowedDesigns.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
          >
            {ALL_LASH_DESIGNS.filter((style) => currentMaterialSpec.allowedDesigns.includes(style.id)).map((style) => {
              const active = selectedStyle === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => {
                    setSelectedStyle(style.id);
                    setZoomDesignId(style.id);
                    setIsCompareDesignsOpen(true);
                  }}
                  className={`p-1 rounded-xl border text-left transition-all relative cursor-pointer overflow-hidden ${
                    active
                      ? isDark
                        ? 'bg-[#2A2315] border-[#FFB400] text-white shadow-xs ring-2 ring-[#FFB400]/40'
                        : 'bg-amber-50/95 border-[#FFB400] text-black shadow-xs ring-2 ring-[#FFB400]/40'
                      : isDark
                        ? 'bg-[#18181A] border-neutral-800 hover:border-neutral-700 text-neutral-300'
                        : 'bg-[#F9F9FB] border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="relative aspect-4/3 w-full rounded-lg overflow-hidden bg-neutral-950 border border-black/10 shadow-2xs group">
                    <img
                      src={style.image}
                      alt={style.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span
                      className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider backdrop-blur-md shadow-xs ${
                        active ? 'bg-[#FFB400] text-black' : 'bg-black/75 text-white'
                      }`}
                    >
                      {style.shortName}
                    </span>
                    {active && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#FFB400] text-black flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
