'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { DualThumbRangeSlider } from './DualThumbRangeSlider';
import type { NATURAL_LASH_LENGTH_OPTIONS, NATURAL_LASH_THICKNESS_OPTIONS } from '../NaturalLashAssessmentData';
import type { ConsultationInfoModalPayload } from './ConsultationTypes';

interface NaturalLashMeasurementsCardProps {
  isDark: boolean;
  isNaturalLashComplete: boolean;
  completedNaturalLashCount: number;
  showMandatoryLashCheckAlert: boolean;
  naturalLengthRange: [number, number] | null;
  setNaturalLengthRange: (val: [number, number]) => void;
  naturalLengthLabel: string | null;
  naturalLengthSpec: (typeof NATURAL_LASH_LENGTH_OPTIONS)[number] | null;
  lengthInputRef: React.RefObject<HTMLInputElement | null>;
  naturalThicknessRange: [number, number] | null;
  setNaturalThicknessRange: (val: [number, number]) => void;
  naturalThicknessLabel: string | null;
  naturalThicknessSpec: (typeof NATURAL_LASH_THICKNESS_OPTIONS)[number] | null;
  thicknessInputRef: React.RefObject<HTMLInputElement | null>;
  naturalCountRange: [number, number] | null;
  setNaturalCountRange: (val: [number, number]) => void;
  naturalCountLabel: string | null;
  countInputRef: React.RefObject<HTMLInputElement | null>;
  selectedLashTrail: string;
  setSelectedLashTrail: (trail: string) => void;
  directionFirstBtnRef: React.RefObject<HTMLButtonElement | null>;
  setActiveInfoModal: (payload: ConsultationInfoModalPayload | null) => void;
}

export function NaturalLashMeasurementsCard({
  isDark,
  isNaturalLashComplete,
  completedNaturalLashCount,
  showMandatoryLashCheckAlert,
  naturalLengthRange,
  setNaturalLengthRange,
  naturalLengthLabel,
  naturalLengthSpec,
  lengthInputRef,
  naturalThicknessRange,
  setNaturalThicknessRange,
  naturalThicknessLabel,
  naturalThicknessSpec,
  thicknessInputRef,
  naturalCountRange,
  setNaturalCountRange,
  naturalCountLabel,
  countInputRef,
  selectedLashTrail,
  setSelectedLashTrail,
  directionFirstBtnRef,
  setActiveInfoModal,
}: NaturalLashMeasurementsCardProps) {
  return (
    <div
      className={`rounded-2xl p-3 shadow-xs border space-y-3 transition-colors ${
        isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-100'
      }`}
    >
      <div
        className={`flex items-center justify-between pb-1 border-b ${isDark ? 'border-neutral-800' : 'border-gray-100'}`}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-black text-[#FFB400] text-[10.5px] font-black inline-flex items-center justify-center">
            1
          </span>
          <span
            className={`text-[11.5px] font-extrabold uppercase tracking-tight ${isDark ? 'text-white' : 'text-black'}`}
          >
            Đo 4 thông số mi thật
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tabular-nums inline-flex items-center justify-center leading-none ${
            isNaturalLashComplete
              ? isDark
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : isDark
                ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {isNaturalLashComplete ? 'Đã đo đủ 7/7' : `Bắt buộc đo (${completedNaturalLashCount}/7)`}
        </span>
      </div>

      <div className="space-y-3">
        {/* Dòng 1: Chiều Dài (Dual Slider 5 - 15) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`text-[11.5px] font-extrabold ${isDark ? 'text-neutral-300' : 'text-gray-800'}`}>
                Dài
              </span>
              <button
                type="button"
                onClick={() =>
                  setActiveInfoModal({
                    title: 'Chiều Dài Mi Thật',
                    badge:
                      naturalLengthLabel && naturalLengthSpec
                        ? `Đang chọn: ${naturalLengthLabel}mm (${naturalLengthSpec.tierLabel})`
                        : 'Chưa đo chiều dài mi thật',
                    content:
                      'Đo cữ thước mm thực tế bờ mi khách. Tỷ lệ vàng khoa học: Chiều dài mi nối an toàn tối đa = Chiều dài mi thật + 2mm (tối đa +3mm với mi siêu khỏe).',
                    advice: naturalLengthSpec?.advice,
                  })
                }
                className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                }`}
                title="Xem hướng dẫn đo chiều dài"
              >
                <Info className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
            {naturalLengthLabel ? (
              <span className="px-2 py-0.5 rounded-full bg-[#FFB400] text-black font-black text-[11.5px] tabular-nums shadow-xs">
                {naturalLengthLabel}
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center justify-center leading-none ${
                  showMandatoryLashCheckAlert
                    ? isDark
                      ? 'bg-rose-950/70 text-rose-300 border-rose-600'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                    : isDark
                      ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}
              >
                {showMandatoryLashCheckAlert ? 'Bắt buộc đo' : 'Chưa đo'}
              </span>
            )}
          </div>

          <DualThumbRangeSlider
            min={5}
            max={15}
            step={1}
            value={naturalLengthRange}
            onChange={setNaturalLengthRange}
            labelName="Dài"
            unitSuffix="mm"
            isMissingAlert={showMandatoryLashCheckAlert && !naturalLengthRange}
            inputRef={lengthInputRef}
            isDark={isDark}
          />
        </div>

        {/* Dòng 2: Độ Dày (Dual Slider 0.05 - 0.20, step 0.01) */}
        <div className={`space-y-1 pt-2 border-t ${isDark ? 'border-neutral-800' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`text-[11.5px] font-extrabold ${isDark ? 'text-neutral-300' : 'text-gray-800'}`}>
                Dày
              </span>
              <button
                type="button"
                onClick={() =>
                  setActiveInfoModal({
                    title: 'Độ Dày Sợi Mi Thật',
                    badge:
                      naturalThicknessLabel && naturalThicknessSpec
                        ? `Đang chọn: ${naturalThicknessLabel}mm (${naturalThicknessSpec.name})`
                        : 'Chưa đo độ dày mi thật',
                    content:
                      naturalThicknessSpec?.safetyRule ||
                      'Đo độ dày sợi mi thật để tính tải trọng nang mi an toàn (0.05–0.07mm cho mi mảnh, 0.07–0.10mm cho mi vừa, 0.12–0.15mm cho mi khỏe).',
                    advice: naturalThicknessSpec
                      ? `Khuyên dùng: ${naturalThicknessSpec.recommendedMaterial}`
                      : undefined,
                  })
                }
                className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                }`}
                title="Xem tải trọng nang mi"
              >
                <Info className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
            {naturalThicknessLabel ? (
              <span className="px-2 py-0.5 rounded-full bg-[#FFB400] text-black font-black text-[11px] tabular-nums shadow-xs">
                {naturalThicknessLabel}
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center justify-center leading-none ${
                  showMandatoryLashCheckAlert
                    ? isDark
                      ? 'bg-rose-950/70 text-rose-300 border-rose-600'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                    : isDark
                      ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}
              >
                {showMandatoryLashCheckAlert ? 'Bắt buộc đo' : 'Chưa đo'}
              </span>
            )}
          </div>

          <DualThumbRangeSlider
            min={0.05}
            max={0.2}
            step={0.01}
            value={naturalThicknessRange}
            onChange={setNaturalThicknessRange}
            formatValue={(v) => v.toFixed(2)}
            labelName="Dày"
            unitSuffix="mm"
            isMissingAlert={showMandatoryLashCheckAlert && !naturalThicknessRange}
            inputRef={thicknessInputRef}
            isDark={isDark}
          />
        </div>

        {/* Dòng 3: Số Sợi / Mật Độ (Dual Slider 40 - 200, step 5) */}
        <div className={`space-y-1 pt-2 border-t ${isDark ? 'border-neutral-800' : 'border-gray-100'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className={`text-[11.5px] font-extrabold ${isDark ? 'text-neutral-300' : 'text-gray-800'}`}>
                Số sợi
              </span>
              <button
                type="button"
                onClick={() =>
                  setActiveInfoModal({
                    title: 'Số Lượng & Mật Độ Sợi Mi Thật',
                    badge: naturalCountLabel ? `Đang chọn: ${naturalCountLabel} sợi/mắt` : 'Chưa đếm số sợi mi thật',
                    content:
                      'Đếm sơ bộ số lượng sợi mi thật trên một bờ mí trên: 40-60 sợi (thưa, khuyên làm fan nhẹ 2D-3D bù khuyết), 60-80 sợi (tiêu chuẩn, tải trọng cân bằng), 80-120+ sợi (dày khỏe, thích hợp nối classic hoặc volume đậm).',
                  })
                }
                className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                }`}
                title="Xem hướng dẫn mật độ sợi"
              >
                <Info className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
            {naturalCountLabel ? (
              <span className="px-2 py-0.5 rounded-full bg-[#FFB400] text-black font-black text-[11px] tabular-nums shadow-xs">
                {naturalCountLabel}
              </span>
            ) : (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center justify-center leading-none ${
                  showMandatoryLashCheckAlert
                    ? isDark
                      ? 'bg-rose-950/70 text-rose-300 border-rose-600'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                    : isDark
                      ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}
              >
                {showMandatoryLashCheckAlert ? 'Bắt buộc đo' : 'Chưa đo'}
              </span>
            )}
          </div>

          <DualThumbRangeSlider
            min={40}
            max={200}
            step={5}
            value={naturalCountRange}
            onChange={setNaturalCountRange}
            labelName="Số sợi"
            unitSuffix=" sợi"
            isMissingAlert={showMandatoryLashCheckAlert && !naturalCountRange}
            inputRef={countInputRef}
            isDark={isDark}
          />
        </div>

        {/* Dòng 4: Hướng Mọc (Dùng UNICODE toàn bộ) */}
        <div
          className={`flex items-center justify-between gap-1 pt-2 border-t ${isDark ? 'border-neutral-800' : 'border-gray-100'}`}
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`text-[11.5px] font-extrabold ${isDark ? 'text-neutral-300' : 'text-gray-800'}`}>
              Hướng
            </span>
            <button
              type="button"
              onClick={() =>
                setActiveInfoModal({
                  title: 'Hướng Mọc Mi Thật',
                  badge: selectedLashTrail ? `Đang chọn: ${selectedLashTrail}` : 'Chưa chọn hướng mọc',
                  content:
                    'Hướng mọc quyết định độ cong cần chọn: Mi chúc xuống (↘) cần độ cong CC hoặc D để nâng bờ mi không sụp mắt; mi mọc thẳng (➔) chọn cong C/B; mi hướng lên (↗) chọn cong B nhẹ nhàng; mi đan chéo (⇄) cần định hình trục mi.',
                })
              }
              className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                isDark
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
              }`}
              title="Xem hướng mọc mi"
            >
              <Info className="w-3 h-3 stroke-[2.5]" />
            </button>
            {!selectedLashTrail && (
              <span
                className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full border inline-flex items-center justify-center leading-none ${
                  showMandatoryLashCheckAlert
                    ? isDark
                      ? 'bg-rose-950/70 text-rose-300 border-rose-600'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                    : isDark
                      ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      : 'bg-gray-100 text-gray-500 border-gray-200'
                }`}
              >
                {showMandatoryLashCheckAlert ? 'Bắt buộc' : 'Chưa chọn'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {[
              { id: 'Chúc xuống (Downwards)', icon: '↘', title: 'Chúc xuống' },
              { id: 'Mọc thẳng (Straight)', icon: '➔', title: 'Mọc thẳng' },
              { id: 'Hướng lên (Upwards)', icon: '↗', title: 'Hướng lên' },
              { id: 'Lộn xộn/Đan chéo (Criss-Cross)', icon: '⇄', title: 'Lộn xộn' },
            ].map((dir, idx) => {
              const active = selectedLashTrail === dir.id;
              return (
                <button
                  key={dir.id}
                  ref={idx === 0 ? directionFirstBtnRef : undefined}
                  type="button"
                  title={dir.title}
                  aria-pressed={active}
                  onClick={() => setSelectedLashTrail(dir.id)}
                  className={`w-9 h-8 rounded-lg text-center transition-all cursor-pointer text-[16px] font-black flex items-center justify-center focus-visible:outline-2 focus-visible:outline-[#FFB400] ${
                    active
                      ? 'bg-[#FFB400] text-black shadow-xs ring-1 ring-amber-400'
                      : showMandatoryLashCheckAlert && !selectedLashTrail
                        ? isDark
                          ? 'bg-rose-950/30 border border-dashed border-rose-500/80 text-rose-200 hover:bg-rose-900/40'
                          : 'bg-rose-50 border border-dashed border-rose-400 text-rose-700 hover:bg-rose-100'
                        : isDark
                          ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {dir.icon}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
