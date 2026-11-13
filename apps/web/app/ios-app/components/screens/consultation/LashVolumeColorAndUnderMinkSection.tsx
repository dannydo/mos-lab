'use client';

import React from 'react';
import { Sparkles, Crown, CheckCircle2, ArrowDownRight } from 'lucide-react';
import {
  getWingsMenuDetail,
  UNDER_MINK_PREP_SPEC,
  parseUnderMinkLengthMm,
  parseUnderMinkCountFibers,
  stepUnderMinkLength,
  stepUnderMinkCount,
  type LashMaterialSpec,
} from '../LashMaterialConstraintMatrix';

interface LashVolumeColorAndUnderMinkSectionProps {
  isDark: boolean;
  currentMaterialSpec: LashMaterialSpec;
  selectedVolume: string;
  setSelectedVolume: (vol: string) => void;
  serviceType: 'Normal' | 'Retain';
  selectedCount: string;
  setSelectedCount: (cnt: string) => void;
  selectedColors: string[];
  setSelectedColors: React.Dispatch<React.SetStateAction<string[]>>;
  hasUnderMink: boolean;
  setHasUnderMink: React.Dispatch<React.SetStateAction<boolean>>;
  underMinkCurl: 'B' | 'C';
  setUnderMinkCurl: React.Dispatch<React.SetStateAction<'B' | 'C'>>;
  underMinkLength: string;
  setUnderMinkLength: React.Dispatch<React.SetStateAction<string>>;
  underMinkCount: string;
  setUnderMinkCount: React.Dispatch<React.SetStateAction<string>>;
  underMinkServiceType: 'Normal' | 'Retain';
  setUnderMinkServiceType: React.Dispatch<React.SetStateAction<'Normal' | 'Retain'>>;
  hasUnderMinkCombo: boolean;
  underComboNormalRemaining: number;
  underComboRetainRemaining: number;
}

export function LashVolumeColorAndUnderMinkSection({
  isDark,
  currentMaterialSpec,
  selectedVolume,
  setSelectedVolume,
  serviceType,
  selectedCount,
  setSelectedCount,
  selectedColors,
  setSelectedColors,
  hasUnderMink,
  setHasUnderMink,
  underMinkCurl,
  setUnderMinkCurl,
  underMinkLength,
  setUnderMinkLength,
  underMinkCount,
  setUnderMinkCount,
  underMinkServiceType,
  setUnderMinkServiceType,
  hasUnderMinkCombo,
  underComboNormalRemaining,
  underComboRetainRemaining,
}: LashVolumeColorAndUnderMinkSectionProps) {
  return (
    <>
      {/* 3.4 KỸ THUẬT FAN / SỐ SỢI & MÀU SẮC CỦA CHẤT LIỆU */}
      <div
        className={`rounded-2xl p-3 shadow-xs border space-y-2.5 transition-colors ${'bg-[var(--mos-surface)] border-[var(--mos-surface-border)]'}`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-extrabold uppercase text-[var(--mos-text)]`}>
            3.4 Kỹ Thuật Volume · Mật Độ & Màu Sắc
          </span>
          <span className={`text-[10px] ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}>
            {currentMaterialSpec.shortLabel}
          </span>
        </div>

        {currentMaterialSpec.allowedVolumes.length > 1 && (
          <div>
            <div className={`text-[10px] font-semibold mb-1 text-[var(--mos-text-muted)]`}>Kỹ thuật fan cho phép:</div>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {currentMaterialSpec.allowedVolumes.map((vol) => (
                <button
                  key={vol}
                  type="button"
                  onClick={() => setSelectedVolume(vol)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                    selectedVolume === vol
                      ? 'bg-[#FFB400] text-black shadow-xs font-black'
                      : isDark
                        ? 'bg-[#141416] text-neutral-400 hover:text-white border border-neutral-800'
                        : 'bg-[#F2F2F7] text-gray-700'
                  }`}
                >
                  {vol}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mật độ sợi / fan hoàn thành theo Menu Wings Lashes */}
        <div className={`pt-2 border-t border-[var(--mos-surface-border)]`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10.5px] font-extrabold ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>
              BẬC SỐ LƯỢNG SỢI / FAN (MENU WINGS):
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                isDark
                  ? 'text-amber-300 bg-amber-950/60 border-amber-800'
                  : 'text-amber-900 bg-amber-100/80 border-amber-300'
              }`}
            >
              {serviceType === 'Retain' ? 'Dặm Refill' : 'Nối Mới'} · Chưa VAT
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {currentMaterialSpec.allowedCounts.map((cnt) => {
              const active = selectedCount === cnt;
              const detail = getWingsMenuDetail(currentMaterialSpec.code, cnt, selectedVolume);
              const numStr = cnt.split(' ')[0];
              const unitStr =
                currentMaterialSpec.code === 'UNDER_MINK' ||
                currentMaterialSpec.code === 'FLAWLESS_MINK' ||
                currentMaterialSpec.code === 'NEW_CLASSIC'
                  ? 'sợi'
                  : currentMaterialSpec.code === 'IVYLIGHT'
                    ? 'nhịp'
                    : 'fan';
              const newPrice = detail?.newPrice;
              const refillPrice = detail?.refillPrice;
              const newPriceStr = newPrice ? `${Math.round(newPrice / 1000).toLocaleString('vi-VN')}K` : '';
              const refillPriceStr = refillPrice ? `${Math.round(refillPrice / 1000).toLocaleString('vi-VN')}K` : '';
              const price = detail ? (serviceType === 'Retain' ? detail.refillPrice : detail.newPrice) : null;
              const priceStr = price ? `${Math.round(price / 1000).toLocaleString('vi-VN')}K` : '';
              const badge = detail?.badge;

              return (
                <button
                  key={cnt}
                  type="button"
                  onClick={() => setSelectedCount(cnt)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
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
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-black leading-tight tabular-nums">
                        {numStr} {unitStr}
                      </span>
                      {badge === 'BEST SELLER' && (
                        <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black px-1.5 py-0.5 rounded-md bg-[#DC2626] text-white uppercase tracking-wider shadow-xs -rotate-2 border border-red-300/40">
                          <Sparkles className="w-2.5 h-2.5 fill-white text-white shrink-0" />
                          BEST SELLER
                        </span>
                      )}
                      {badge === 'MOST POPULAR' && (
                        <span className="inline-flex items-center gap-0.5 text-[8.5px] font-black px-1.5 py-0.5 rounded-md bg-[#DC2626] text-white uppercase tracking-wider shadow-xs border border-rose-300/40">
                          <Crown className="w-2.5 h-2.5 fill-white text-white shrink-0" />
                          MOST POPULAR
                        </span>
                      )}
                    </div>
                    {newPriceStr && refillPriceStr ? (
                      <div className="flex items-center gap-1.5 tabular-nums text-right shrink-0">
                        <span
                          className={
                            serviceType === 'Normal'
                              ? active
                                ? 'font-black text-[13px] text-[#FFB400]'
                                : isDark
                                  ? 'font-black text-[13px] text-white'
                                  : 'font-black text-[13px] text-neutral-900'
                              : active
                                ? isDark
                                  ? 'text-[11px] font-medium text-amber-200/70'
                                  : 'text-[11px] font-medium text-amber-900/70'
                                : isDark
                                  ? 'text-[11px] font-medium text-neutral-400'
                                  : 'text-[11px] font-medium text-neutral-500'
                          }
                        >
                          <span className="text-[9.5px] uppercase font-bold mr-0.5 opacity-80">Mới</span>
                          {newPriceStr}
                        </span>
                        <span className={isDark ? 'text-neutral-600 text-[10px]' : 'text-neutral-300 text-[10px]'}>
                          ·
                        </span>
                        <span
                          className={
                            serviceType === 'Retain'
                              ? active
                                ? 'font-black text-[13px] text-[#FFB400]'
                                : isDark
                                  ? 'font-black text-[13px] text-white'
                                  : 'font-black text-[13px] text-neutral-900'
                              : active
                                ? isDark
                                  ? 'text-[11px] font-medium text-amber-200/70'
                                  : 'text-[11px] font-medium text-amber-900/70'
                                : isDark
                                  ? 'text-[11px] font-medium text-neutral-400'
                                  : 'text-[11px] font-medium text-neutral-500'
                          }
                        >
                          <span className="text-[9.5px] uppercase font-bold mr-0.5 opacity-80">Dặm</span>
                          {refillPriceStr}
                        </span>
                      </div>
                    ) : priceStr ? (
                      <span
                        className={`text-[13px] font-black tabular-nums ${
                          active
                            ? isDark
                              ? 'text-amber-400'
                              : 'text-amber-800'
                            : isDark
                              ? 'text-white'
                              : 'text-gray-900'
                        }`}
                      >
                        {priceStr}
                      </span>
                    ) : null}
                  </div>

                  <div
                    className={`flex items-center justify-between text-[10px] mt-1.5 pt-1 border-t ${
                      isDark ? 'border-neutral-800 text-neutral-400' : 'border-gray-100/80 text-gray-500'
                    }`}
                  >
                    <span>{detail ? `${detail.totalFibers} sợi / 2 mắt` : cnt}</span>
                    <span className={`font-semibold ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>
                      {detail ? `~${detail.durationMin} phút` : ''}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Màu sắc sợi mi */}
        <div className={`pt-1.5 border-t border-[var(--mos-surface-border)]`}>
          <div className="flex items-center justify-between mb-1.5">
            <div className={`text-[10px] font-semibold text-[var(--mos-text-muted)]`}>Màu sắc sợi mi:</div>
            <span
              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${
                isDark
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              Chọn được nhiều màu
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {currentMaterialSpec.allowedColors.map((c) => {
              const isSelected = selectedColors.includes(c.id) || selectedColors.some((sc) => sc.includes(c.label));
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      if (selectedColors.length > 1) {
                        setSelectedColors((prev) => prev.filter((id) => id !== c.id && !id.includes(c.label)));
                      }
                    } else {
                      setSelectedColors((prev) => [...prev, c.id]);
                    }
                  }}
                  className={`p-2 rounded-xl border flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-[#2A2315] border-[#FFB400] text-white font-bold shadow-xs ring-1 ring-amber-400'
                        : 'bg-amber-50/90 border-[#FFB400] text-black font-bold shadow-xs ring-1 ring-amber-400'
                      : isDark
                        ? 'bg-[#18181A] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                        : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: c.colorCode }}
                    />
                    <span className="text-[11px] truncate font-semibold">{c.label}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#FF9500] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* OPTION LÀM KÈM: MI DƯỚI (UNDER MINK) */}
      {hasUnderMink && (
        <div>
          <div className="text-[11px] font-extrabold text-gray-700 uppercase tracking-wider px-1 mb-1.5 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-purple-700 text-white text-[10px] font-black inline-flex items-center justify-center">
                +
              </span>
              <span>OPTION MI DƯỚI (UNDER MINK)</span>
            </div>
            <button
              type="button"
              onClick={() => setHasUnderMink(false)}
              className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-red-50"
            >
              Bỏ chọn ✕
            </button>
          </div>

          <div
            className={`rounded-2xl p-2.5 shadow-xs border space-y-2 transition-colors ${
              isDark ? 'bg-[#1C1C1E] border-purple-900/60' : 'bg-white border-purple-100'
            }`}
          >
            <div
              className={`flex items-center justify-between p-2 rounded-xl border ${
                isDark ? 'bg-purple-950/40 border-purple-800/60' : 'bg-purple-50/80 border-purple-200'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <ArrowDownRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className={`text-[12px] font-black truncate ${isDark ? 'text-purple-300' : 'text-purple-950'}`}>
                  +Mi Dưới Under
                </span>
                <span
                  className={`text-[11px] font-semibold tabular-nums ${isDark ? 'text-purple-300' : 'text-purple-800/80'}`}
                >
                  {underMinkCurl.replace(/^Cong\s+/i, '')} · {underMinkLength.replace(/\s*mm/gi, '')} · {underMinkCount}
                </span>
              </div>
              <div
                className={`text-[12px] font-black shrink-0 tabular-nums ${isDark ? 'text-purple-300' : 'text-purple-700'}`}
              >
                {hasUnderMinkCombo ? '0đ (Trừ gói)' : underMinkServiceType === 'Retain' ? '+250K' : '+390K'}
              </div>
            </div>

            <div
              className={`pt-2 border-t flex items-center justify-between gap-1 text-[10px] tabular-nums whitespace-nowrap ${
                isDark ? 'border-neutral-800' : 'border-neutral-100'
              }`}
            >
              <div className="flex items-center gap-1">
                <div
                  className={`inline-flex items-center p-0.5 rounded-lg border ${
                    isDark ? 'bg-[#141416] border-neutral-700' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  {(['B', 'C'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setUnderMinkCurl(c)}
                      className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                        underMinkCurl === c
                          ? 'bg-purple-600 text-white shadow-2xs'
                          : isDark
                            ? 'text-neutral-400 hover:text-white'
                            : 'text-neutral-600 hover:text-black'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <div
                  className={`inline-flex items-center p-0.5 rounded-lg border tabular-nums ${
                    isDark ? 'bg-[#141416] border-neutral-700' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setUnderMinkLength((prev) => stepUnderMinkLength(prev, -1))}
                    disabled={parseUnderMinkLengthMm(underMinkLength) <= UNDER_MINK_PREP_SPEC.minLengthMm}
                    className={`w-5 h-5 rounded-md font-black disabled:opacity-30 cursor-pointer inline-flex items-center justify-center ${
                      isDark
                        ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                        : 'text-neutral-500 hover:text-black hover:bg-neutral-200/70'
                    }`}
                  >
                    −
                  </button>
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[20px] text-center shadow-2xs">
                    {parseUnderMinkLengthMm(underMinkLength)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUnderMinkLength((prev) => stepUnderMinkLength(prev, 1))}
                    disabled={parseUnderMinkLengthMm(underMinkLength) >= UNDER_MINK_PREP_SPEC.maxLengthMm}
                    className={`w-5 h-5 rounded-md font-black disabled:opacity-30 cursor-pointer inline-flex items-center justify-center ${
                      isDark
                        ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                        : 'text-neutral-500 hover:text-black hover:bg-neutral-200/70'
                    }`}
                  >
                    +
                  </button>
                </div>

                <div
                  className={`inline-flex items-center p-0.5 rounded-lg border tabular-nums ${
                    isDark ? 'bg-[#141416] border-neutral-700' : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setUnderMinkCount((prev) => stepUnderMinkCount(prev, -10))}
                    disabled={parseUnderMinkCountFibers(underMinkCount) <= UNDER_MINK_PREP_SPEC.minCountFibers}
                    className={`w-5 h-5 rounded-md font-black disabled:opacity-30 cursor-pointer inline-flex items-center justify-center ${
                      isDark
                        ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                        : 'text-neutral-500 hover:text-black hover:bg-neutral-200/70'
                    }`}
                  >
                    −
                  </button>
                  <span className="px-1.5 py-0.5 rounded-md bg-purple-600 text-white font-extrabold min-w-[22px] text-center shadow-2xs">
                    {parseUnderMinkCountFibers(underMinkCount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setUnderMinkCount((prev) => stepUnderMinkCount(prev, 10))}
                    disabled={parseUnderMinkCountFibers(underMinkCount) >= UNDER_MINK_PREP_SPEC.maxCountFibers}
                    className={`w-5 h-5 rounded-md font-black disabled:opacity-30 cursor-pointer inline-flex items-center justify-center ${
                      isDark
                        ? 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                        : 'text-neutral-500 hover:text-black hover:bg-neutral-200/70'
                    }`}
                  >
                    +
                  </button>
                </div>
              </div>

              <div
                className={`inline-flex items-center p-0.5 rounded-lg border shrink-0 ${
                  isDark ? 'bg-[#141416] border-purple-800' : 'bg-neutral-50 border-purple-200'
                }`}
                title={
                  hasUnderMinkCombo
                    ? `Khách có gói Combo Mi Dưới · Tự động trừ vào gói (0đ)`
                    : 'Chọn độc lập Mi Dưới: Nối Mới (390K) hoặc Dặm (250K)'
                }
              >
                <button
                  type="button"
                  onClick={() => setUnderMinkServiceType('Normal')}
                  className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                    underMinkServiceType === 'Normal'
                      ? 'bg-[#FFB400] text-black shadow-2xs'
                      : isDark
                        ? 'text-neutral-400 hover:text-white'
                        : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  {hasUnderMinkCombo ? `Mới (${underComboNormalRemaining})` : 'Mới'}
                </button>
                <button
                  type="button"
                  onClick={() => setUnderMinkServiceType('Retain')}
                  className={`px-1.5 py-0.5 rounded-md font-bold cursor-pointer transition-all whitespace-nowrap ${
                    underMinkServiceType === 'Retain'
                      ? 'bg-[#34C759] text-white shadow-2xs'
                      : isDark
                        ? 'text-neutral-400 hover:text-white'
                        : 'text-neutral-500 hover:text-black'
                  }`}
                >
                  {hasUnderMinkCombo ? `Dặm (${underComboRetainRemaining})` : 'Dặm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
