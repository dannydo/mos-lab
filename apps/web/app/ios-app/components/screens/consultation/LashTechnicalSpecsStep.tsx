'use client';

import React from 'react';
import { Activity, Info, ZoomIn, ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react';
import { LASH_CURL_LIST } from '../LashCurlData';
import { LashCurlIllustration } from '../LashCurlIllustration';
import { ALL_LASH_THICKNESSES, type LashMaterialSpec } from '../LashMaterialConstraintMatrix';
import type { InfoModalType } from '../LashConsultationInfoModal';
import type { NATURAL_LASH_LENGTH_OPTIONS } from '../NaturalLashAssessmentData';

interface LashTechnicalSpecsStepProps {
  isDark: boolean;
  currentMaterialSpec: LashMaterialSpec;
  naturalLengthLabel: string | null;
  naturalThicknessLabel: string | null;
  naturalCountLabel: string | null;
  naturalLengthSpec: (typeof NATURAL_LASH_LENGTH_OPTIONS)[number] | null;
  setActiveSubTab: (tab: 'SPECS' | 'PROFILE') => void;
  setInfoModalKey: (key: InfoModalType) => void;
  selectedCurl: string;
  setSelectedCurl: (curl: string) => void;
  setZoomCurlId: (curl: string) => void;
  setIsCurlZoomOpen: (open: boolean) => void;
  selectedThickness: string;
  setSelectedThickness: (thick: string) => void;
  thicknessWarning: string | null;
  selectedLengths: number[];
  handleToggleLength: (sizeNum: number) => void;
  lengthWarning: string | null;
  children?: React.ReactNode;
}

export function LashTechnicalSpecsStep({
  isDark,
  currentMaterialSpec,
  naturalLengthLabel,
  naturalThicknessLabel,
  naturalCountLabel,
  naturalLengthSpec,
  setActiveSubTab,
  setInfoModalKey,
  selectedCurl,
  setSelectedCurl,
  setZoomCurlId,
  setIsCurlZoomOpen,
  selectedThickness,
  setSelectedThickness,
  thicknessWarning,
  selectedLengths,
  handleToggleLength,
  lengthWarning,
  children,
}: LashTechnicalSpecsStepProps) {
  return (
    <div className="space-y-3">
      <div
        className={`text-[11px] font-extrabold uppercase tracking-wider px-1 flex items-center justify-between ${
          isDark ? 'text-neutral-300' : 'text-gray-700'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-black text-[#FFB400] text-[10px] font-black inline-flex items-center justify-center">
            3
          </span>
          <span>BƯỚC 3: THÔNG SỐ KỸ THUẬT</span>
        </div>
        <span className={`text-[10px] font-bold ${isDark ? 'text-neutral-400' : 'text-gray-500'}`}>
          {currentMaterialSpec.shortLabel}
        </span>
      </div>

      {/* Thẻ ghim thông số mi thật để đối chiếu an toàn */}
      <div
        className={`border rounded-xl p-2 flex items-center justify-between text-[11px] transition-colors ${
          isDark
            ? 'bg-gradient-to-r from-blue-950/40 to-amber-950/40 border-blue-900/60 text-neutral-300'
            : 'bg-gradient-to-r from-blue-50/80 to-amber-50/80 border-blue-200/80'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Activity className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span className={`font-medium ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>Mi thật:</span>
          {naturalLengthLabel && naturalThicknessLabel ? (
            <strong className={`font-extrabold truncate tabular-nums ${isDark ? 'text-white' : 'text-black'}`}>
              {naturalCountLabel ? `${naturalCountLabel} sợi · ` : ''}
              {naturalLengthLabel}mm · {naturalThicknessLabel}mm
            </strong>
          ) : (
            <span className={`font-bold truncate ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              Chưa có thông số đo
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {naturalLengthSpec && (
            <span className="bg-emerald-600 text-white text-[9.5px] font-black px-2 py-0.5 rounded-full tabular-nums">
              ≤ {naturalLengthSpec.safeMaxExtensionMm}mm
            </span>
          )}
          <button
            type="button"
            onClick={() => setActiveSubTab('PROFILE')}
            className={`font-bold text-[10px] hover:underline pl-1 cursor-pointer ${
              isDark ? 'text-[#FFB400]' : 'text-[#D97706]'
            }`}
          >
            {naturalLengthSpec ? 'Đổi' : 'Đo mi →'}
          </button>
        </div>
      </div>

      {/* 3.1 ĐỘ CONG CỦA CHẤT LIỆU (CURL) */}
      <div
        className={`rounded-2xl p-2.5 shadow-xs border space-y-2 transition-colors ${
          isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-extrabold uppercase ${isDark ? 'text-white' : 'text-black'}`}>
              3.1 Độ Cong
            </span>
            <button
              type="button"
              onClick={() => setInfoModalKey('CURL')}
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                isDark
                  ? 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/80 border border-amber-800'
                  : 'bg-amber-100/90 text-amber-900 hover:bg-amber-200'
              }`}
              title="Bản đồ độ cong"
            >
              <Info className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setZoomCurlId(selectedCurl);
              setIsCurlZoomOpen(true);
            }}
            className={`text-[10.5px] font-bold flex items-center gap-1 active:opacity-70 cursor-pointer shrink-0 ${
              isDark ? 'text-[#FFB400] hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'
            }`}
          >
            <ZoomIn className="w-3 h-3" />
            <span>Trượt xem</span>
          </button>
        </div>

        {(() => {
          const allowedCurlItems = LASH_CURL_LIST.filter((c) => currentMaterialSpec.allowedCurls.includes(c.id));
          const colClass =
            allowedCurlItems.length === 1
              ? 'grid-cols-1 max-w-[200px]'
              : allowedCurlItems.length === 2
                ? 'grid-cols-2'
                : allowedCurlItems.length === 4
                  ? 'grid-cols-2 sm:grid-cols-4'
                  : 'grid-cols-3';

          return (
            <div className={`grid gap-2 ${colClass}`}>
              {allowedCurlItems.map((c) => {
                const active = selectedCurl === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCurl(c.id)}
                    className={`p-2 rounded-xl text-center transition-all flex flex-col items-center justify-between border relative select-none cursor-pointer ${
                      active
                        ? isDark
                          ? 'bg-[#2A2315] border-[#FFB400] text-white font-extrabold shadow-sm ring-1 ring-[#FFB400]'
                          : 'bg-amber-50/90 border-[#FFB400] text-black font-extrabold shadow-sm ring-1 ring-[#FFB400]'
                        : isDark
                          ? 'bg-[#18181A] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                          : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-200'
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={`Xem phóng to góc độ cong ${c.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setZoomCurlId(c.id);
                        setIsCurlZoomOpen(true);
                      }}
                      className={`absolute top-1 right-1 z-10 w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        active
                          ? isDark
                            ? 'bg-[#3A301E] text-[#FFB400]'
                            : 'bg-black text-[#FFB400] hover:bg-neutral-800'
                          : isDark
                            ? 'bg-neutral-800/90 text-neutral-400 hover:text-white'
                            : 'bg-white/90 text-gray-500 hover:text-black shadow-xs'
                      }`}
                    >
                      <ZoomIn className="w-2.5 h-2.5" />
                    </button>

                    <div className="w-full">
                      <LashCurlIllustration curl={c} variant="card" isActive={active} isDark={isDark} />
                    </div>

                    <div className="w-full mt-1">
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className={`text-[13px] font-black ${
                            active
                              ? isDark
                                ? 'text-white'
                                : 'text-black'
                              : isDark
                                ? 'text-neutral-200'
                                : 'text-gray-900'
                          }`}
                        >
                          {c.code}
                        </span>
                        <span
                          className={`text-[9.5px] font-bold px-1 rounded ${
                            active
                              ? 'bg-[#FFB400] text-black'
                              : isDark
                                ? 'bg-neutral-800 text-neutral-300'
                                : 'bg-gray-200 text-gray-700'
                          }`}
                        >
                          {c.angleLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* 3.2 ĐỘ DÀY CỦA CHẤT LIỆU (THICKNESS) */}
      <div
        className={`rounded-2xl p-2.5 shadow-xs border space-y-2 transition-colors ${
          isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-extrabold uppercase ${isDark ? 'text-white' : 'text-black'}`}>
              3.2 Độ Dày Sợi
            </span>
            <button
              type="button"
              onClick={() => setInfoModalKey('THICKNESS')}
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                isDark
                  ? 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/80 border border-amber-800'
                  : 'bg-amber-100/90 text-amber-900 hover:bg-amber-200'
              }`}
              title="Quy chuẩn độ dày"
            >
              <Info className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {(() => {
          const allowedThickItems = ALL_LASH_THICKNESSES.filter((t) =>
            currentMaterialSpec.allowedThicknesses.includes(t.id)
          );
          const colClass =
            allowedThickItems.length === 1
              ? 'grid-cols-1'
              : allowedThickItems.length === 2
                ? 'grid-cols-2'
                : 'grid-cols-3';

          return (
            <div className={`grid gap-2 ${colClass}`}>
              {allowedThickItems.map((thick) => {
                const active = selectedThickness === thick.id;
                return (
                  <button
                    key={thick.id}
                    type="button"
                    onClick={() => setSelectedThickness(thick.id)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all relative cursor-pointer ${
                      active
                        ? 'bg-[#FFB400] border-[#FFB400] text-black font-extrabold shadow-xs'
                        : isDark
                          ? 'bg-[#18181A] border-neutral-800 text-neutral-300 hover:border-neutral-700'
                          : 'bg-[#F9F9FB] border-gray-100 text-gray-800 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-[12.5px] font-black tabular-nums">{thick.label}</div>
                  </button>
                );
              })}
            </div>
          );
        })()}

        {thicknessWarning && (
          <div
            className={`p-2 rounded-xl text-[10.5px] font-semibold flex items-center gap-2 border ${
              isDark ? 'bg-rose-950/60 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span>{thicknessWarning}</span>
          </div>
        )}
      </div>

      {/* 3.3 CHIỀU DÀI & BẢNG NÚT SIZE TỰ CHỌN TỐI ĐA 5 SIZE */}
      <div
        className={`rounded-2xl p-2.5 shadow-xs border space-y-2.5 ${
          isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className={`text-[11px] font-extrabold uppercase ${isDark ? 'text-white' : 'text-black'}`}>
              3.3 Chiều Dài
            </span>
            <button
              type="button"
              onClick={() => setInfoModalKey('LENGTH')}
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs ${
                isDark
                  ? 'bg-amber-950/60 text-amber-300 hover:bg-amber-900/80 border border-amber-800'
                  : 'bg-amber-100/90 text-amber-900 hover:bg-amber-200'
              }`}
              title="Quy tắc chiều dài"
            >
              <Info className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>
          <span
            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border tabular-nums ${
              isDark ? 'text-amber-300 bg-amber-950/60 border-amber-800' : 'text-amber-700 bg-amber-50 border-amber-200'
            }`}
          >
            Đã chọn: {selectedLengths.join(' · ')} ({selectedLengths.length}/5 size)
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[7, 8, 9, 10, 11, 12, 13, 14, 15].map((sizeNum) => {
            const active = selectedLengths.includes(sizeNum);
            const isExceedSafe = naturalLengthSpec ? sizeNum > naturalLengthSpec.safeMaxExtensionMm : false;
            return (
              <button
                key={sizeNum}
                type="button"
                onClick={() => handleToggleLength(sizeNum)}
                className={`h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer relative select-none active:scale-95 ${
                  active
                    ? 'bg-[#FFB400] border-[#FFB400] text-black font-black shadow-md ring-2 ring-[#FFB400]/40'
                    : isDark
                      ? 'bg-[#18181A] border-neutral-800 text-neutral-300 hover:border-neutral-700 font-bold'
                      : 'bg-[#F9F9FB] border-gray-200 text-gray-800 hover:border-gray-300 font-bold'
                }`}
              >
                <span className="text-[16px] font-black leading-none tabular-nums">{sizeNum}</span>
                {active && <CheckCircle2 className="w-3 h-3 text-black absolute top-1 right-1" />}
                {isExceedSafe && !active && (
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute top-1 right-1"
                    title="Vượt ngưỡng an toàn mi thật"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div
          className={`text-[10px] flex items-center justify-between px-0.5 ${isDark ? 'text-neutral-500' : 'text-gray-500'}`}
        >
          <span>Chạm để chọn/bỏ chọn (Tối đa 5 size)</span>
          <span className={`font-mono font-bold ${isDark ? 'text-neutral-300' : 'text-gray-700'}`}>
            {selectedLengths.join(' - ')}
          </span>
        </div>

        {lengthWarning && (
          <div
            className={`p-2 rounded-xl text-[10.5px] font-semibold flex items-center gap-2 border ${
              isDark ? 'bg-amber-950/60 border-amber-800 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{lengthWarning}</span>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}
