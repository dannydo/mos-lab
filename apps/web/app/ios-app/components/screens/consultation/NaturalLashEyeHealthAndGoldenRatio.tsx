'use client';

import React from 'react';
import { Images, Info, Sparkles } from 'lucide-react';
import { NATURAL_EYE_SHAPES, type computeLashRecommendation } from '../NaturalLashAssessmentData';
import type { ConsultationInfoModalPayload } from './ConsultationTypes';

interface NaturalLashEyeHealthAndGoldenRatioProps {
  isDark: boolean;
  showMandatoryLashCheckAlert: boolean;
  completedNaturalLashCount: number;
  selectedEyeShape: string;
  setSelectedEyeShape: (eyeId: string) => void;
  setZoomEyeShapeId: (eyeId: string) => void;
  setIsEyeCompareOpen: (open: boolean) => void;
  eyeShapeFirstBtnRef: React.RefObject<HTMLButtonElement | null>;
  selectedLashHealth: string;
  setSelectedLashHealth: (healthId: string) => void;
  lashHealthFirstBtnRef: React.RefObject<HTMLButtonElement | null>;
  selectedMedicalProblem: string;
  setSelectedMedicalProblem: (problemId: string) => void;
  medicalProblemFirstBtnRef: React.RefObject<HTMLButtonElement | null>;
  recommendation: ReturnType<typeof computeLashRecommendation> | null;
  setActiveInfoModal: (payload: ConsultationInfoModalPayload | null) => void;
}

export function NaturalLashEyeHealthAndGoldenRatio({
  isDark,
  showMandatoryLashCheckAlert,
  completedNaturalLashCount,
  selectedEyeShape,
  setSelectedEyeShape,
  setZoomEyeShapeId,
  setIsEyeCompareOpen,
  eyeShapeFirstBtnRef,
  selectedLashHealth,
  setSelectedLashHealth,
  lashHealthFirstBtnRef,
  selectedMedicalProblem,
  setSelectedMedicalProblem,
  medicalProblemFirstBtnRef,
  recommendation,
  setActiveInfoModal,
}: NaturalLashEyeHealthAndGoldenRatioProps) {
  return (
    <>
      {/* CARD 2: DÁNG MẮT & SỨC KHỎE NANG MI */}
      <div
        className={`rounded-2xl p-3 shadow-xs border space-y-3 ${
          isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-white border-neutral-100'
        }`}
      >
        <div
          className={`flex items-center justify-between pb-1 border-b ${
            isDark ? 'border-neutral-800' : 'border-gray-100'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-black text-[#FFB400] text-[10.5px] font-black inline-flex items-center justify-center">
              2
            </span>
            <span
              className={`text-[11.5px] font-extrabold uppercase tracking-tight ${isDark ? 'text-white' : 'text-black'}`}
            >
              Dáng mắt & sức khỏe
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setZoomEyeShapeId(selectedEyeShape || NATURAL_EYE_SHAPES[0].id);
              setIsEyeCompareOpen(true);
            }}
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${
              isDark
                ? 'text-amber-300 bg-amber-950/60 hover:bg-amber-900/60 border-amber-800'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300'
            }`}
          >
            <Images className="w-3 h-3 text-[#FF9500]" />
            <span>So sánh 5 dáng (i)</span>
          </button>
        </div>

        <div className="space-y-2.5">
          {/* Dáng mắt: 5 chip nhỏ kèm thumbnail mini */}
          <div>
            <div
              className={`text-[11px] font-extrabold mb-1.5 flex items-center justify-between ${
                isDark ? 'text-neutral-400' : 'text-gray-700'
              }`}
            >
              <span>Dáng mắt khách</span>
              {selectedEyeShape ? (
                <span className="text-[10px] text-amber-500 font-bold">
                  {NATURAL_EYE_SHAPES.find((e) => e.id === selectedEyeShape)
                    ?.name.split('(')[0]
                    .trim()}
                </span>
              ) : (
                <span
                  className={`text-[10px] font-bold ${
                    showMandatoryLashCheckAlert
                      ? isDark
                        ? 'text-rose-400'
                        : 'text-rose-600'
                      : isDark
                        ? 'text-neutral-500'
                        : 'text-gray-400'
                  }`}
                >
                  {showMandatoryLashCheckAlert ? 'Bắt buộc chọn' : 'Chưa chọn'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {NATURAL_EYE_SHAPES.map((eye, idx) => {
                const active = selectedEyeShape === eye.id;
                const shortName = eye.name.split('(')[0].replace('Mắt', '').trim();
                return (
                  <button
                    key={eye.id}
                    ref={idx === 0 ? eyeShapeFirstBtnRef : undefined}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setSelectedEyeShape(eye.id);
                      setZoomEyeShapeId(eye.id);
                    }}
                    className={`p-1 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center focus-visible:outline-2 focus-visible:outline-[#FFB400] ${
                      active
                        ? isDark
                          ? 'bg-[#2A2315] border-[#FFB400] text-white font-black shadow-xs ring-1 ring-amber-400'
                          : 'bg-amber-50 border-[#FFB400] text-black font-black shadow-xs ring-1 ring-amber-400'
                        : showMandatoryLashCheckAlert && !selectedEyeShape
                          ? isDark
                            ? 'bg-rose-950/20 border-dashed border-rose-500/70 text-rose-200 hover:bg-rose-900/30'
                            : 'bg-rose-50/70 border-dashed border-rose-300 text-rose-800 hover:bg-rose-100'
                          : isDark
                            ? 'bg-[#18181A] border-neutral-800 text-neutral-400 hover:bg-neutral-800'
                            : 'bg-gray-50 border-gray-100 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-900 border border-black/10 shrink-0 mb-1">
                      <img src={eye.image} alt={eye.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <span className="text-[9.5px] font-bold leading-tight truncate max-w-full">{shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Nang mi */}
          <div className={`pt-2 border-t ${isDark ? 'border-neutral-800' : 'border-gray-100'}`}>
            <div
              className={`text-[11px] font-extrabold mb-1.5 flex items-center justify-between ${
                isDark ? 'text-neutral-400' : 'text-gray-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>Nang mi</span>
                {!selectedLashHealth && (
                  <span
                    className={`text-[9.5px] font-bold ${
                      showMandatoryLashCheckAlert
                        ? isDark
                          ? 'text-rose-400'
                          : 'text-rose-600'
                        : isDark
                          ? 'text-neutral-500'
                          : 'text-gray-400'
                    }`}
                  >
                    · {showMandatoryLashCheckAlert ? 'Bắt buộc chọn' : 'Chưa chọn'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setActiveInfoModal({
                    title: 'Tình Trạng Nang Mi & Tiền Sử',
                    content:
                      'Đánh giá nang mi giúp xác định dòng mi an toàn: Mi mới lần đầu cần keo dịu nhẹ; mi tổn thương/gãy rụng chỉ nối 0.05-0.07mm kết hợp dưỡng Yeppeum.',
                  })
                }
                className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                }`}
                title="Xem hướng dẫn nang mi"
              >
                <Info className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'Khách mới lần đầu nối mi (Virgin Lashes)', short: 'Mới lần đầu' },
                { id: 'Mi khỏe (Healthy)', short: 'Khỏe mạnh' },
                { id: 'Mi thưa/khuyết (Gappy)', short: 'Thưa khuyết' },
                { id: 'Mi yếu/gãy rụng sau nối sai nơi khác (Damaged)', short: 'Yếu tổn thương' },
              ].map((h, idx) => {
                const active = selectedLashHealth === h.id;
                return (
                  <button
                    key={h.id}
                    ref={idx === 0 ? lashHealthFirstBtnRef : undefined}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedLashHealth(h.id)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer font-bold text-[10px] leading-tight focus-visible:outline-2 focus-visible:outline-[#FFB400] ${
                      active
                        ? 'bg-[#FFB400] text-black shadow-xs font-black'
                        : showMandatoryLashCheckAlert && !selectedLashHealth
                          ? isDark
                            ? 'bg-rose-950/30 border border-dashed border-rose-500/70 text-rose-200 hover:bg-rose-900/40'
                            : 'bg-rose-50 border border-dashed border-rose-300 text-rose-800 hover:bg-rose-100'
                          : isDark
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {h.short}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Độ nhạy cảm mắt */}
          <div className={`pt-2 border-t ${isDark ? 'border-neutral-800' : 'border-gray-100'}`}>
            <div
              className={`text-[11px] font-extrabold mb-1.5 flex items-center justify-between ${
                isDark ? 'text-neutral-400' : 'text-gray-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span>Độ nhạy cảm</span>
                {!selectedMedicalProblem && (
                  <span
                    className={`text-[9.5px] font-bold ${
                      showMandatoryLashCheckAlert
                        ? isDark
                          ? 'text-rose-400'
                          : 'text-rose-600'
                        : isDark
                          ? 'text-neutral-500'
                          : 'text-gray-400'
                    }`}
                  >
                    · {showMandatoryLashCheckAlert ? 'Bắt buộc chọn' : 'Chưa chọn'}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setActiveInfoModal({
                    title: 'Lưu Ý Độ Nhạy Cảm Mắt',
                    content:
                      'Mắt nhạy cảm dùng keo siêu êm dịu Wings và sấy quạt kỹ; mắt hở khi ngủ dán pad che kín lòng trắng mắt; mắt mới phun mí thao tác nhẹ tay tránh chạm chân mí.',
                  })
                }
                className={`w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                  isDark
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-400'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-500'
                }`}
                title="Xem lưu ý nhạy cảm"
              >
                <Info className="w-3 h-3 stroke-[2.5]" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {[
                { id: 'Bình thường (Good)', short: 'Bình thường' },
                { id: 'Mắt nhạy cảm (Sensitive)', short: 'Nhạy cảm' },
                { id: 'Mắt hở khi ngủ', short: 'Hở khi ngủ' },
                { id: 'Mới phẫu thuật / phun mí', short: 'Mới phun/PT' },
              ].map((m, idx) => {
                const active = selectedMedicalProblem === m.id;
                return (
                  <button
                    key={m.id}
                    ref={idx === 0 ? medicalProblemFirstBtnRef : undefined}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedMedicalProblem(m.id)}
                    className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer font-bold text-[10px] leading-tight focus-visible:outline-2 focus-visible:outline-[#FFB400] ${
                      active
                        ? 'bg-[#FFB400] text-black shadow-xs font-black'
                        : showMandatoryLashCheckAlert && !selectedMedicalProblem
                          ? isDark
                            ? 'bg-rose-950/30 border border-dashed border-rose-500/70 text-rose-200 hover:bg-rose-900/40'
                            : 'bg-rose-50 border border-dashed border-rose-300 text-rose-800 hover:bg-rose-100'
                          : isDark
                            ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {m.short}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CARD 3: KHUYẾN NGHỊ KHOA HỌC WINGS (CHỈ TÍNH TOÁN SAU KHI ĐO ĐỦ 7/7 THÔNG SỐ) */}
      <div className={`rounded-2xl p-3 shadow-sm border space-y-2.5 ${isDark ? 'bg-[#1C1C1E] text-white border-amber-500/30' : 'bg-[var(--mos-surface)] text-[var(--mos-text)] border-amber-300'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#FFB400]" />
            <span className={`text-[11.5px] font-black uppercase tracking-wide ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
              Gợi ý tỷ lệ vàng Wings
            </span>
          </div>
          {recommendation ? (
            <button
              type="button"
              onClick={() =>
                setActiveInfoModal({
                  title: 'Kịch Bản Tư Vấn & Phân Tích Nang Mi',
                  badge: `Khuyên dùng: ${recommendation.recommendedMaterial}`,
                  content: recommendation.consultationScript,
                  advice: `Dáng ${recommendation.recommendedDesign} · Cong ${recommendation.recommendedCurl} · Độ dày ${recommendation.recommendedThickness} · Dài an toàn ≤ ${recommendation.maxSafeMm}mm`,
                })
              }
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${isDark ? 'text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/30' : 'text-amber-800 bg-amber-100 hover:bg-amber-200 border-amber-300'}`}
            >
              <Info className="w-3 h-3" />
              <span>Kịch bản tư vấn (i)</span>
            </button>
          ) : (
            <span className="text-[10px] font-bold text-[var(--mos-text-muted)] bg-[var(--mos-surface-muted)] px-2 py-0.5 rounded-full border border-[var(--mos-surface-border)] tabular-nums">
              Chờ đo đủ {completedNaturalLashCount}/7
            </span>
          )}
        </div>

        {recommendation ? (
          <div className="grid grid-cols-4 gap-1 text-center">
            <div className="bg-[var(--mos-surface-raised)] border border-[var(--mos-surface-border)] rounded-lg py-1 px-1 min-w-0">
              <span className="text-[8px] font-bold text-[var(--mos-text-muted)] uppercase block">Dòng mi</span>
              <span className={`text-[10px] font-black block truncate mt-0.5 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                {recommendation.recommendedMaterial.replace(/New\s*/i, '').replace(/\s*\(.*\)/, '')}
              </span>
            </div>
            <div className="bg-[var(--mos-surface-raised)] border border-[var(--mos-surface-border)] rounded-lg py-1 px-1 min-w-0">
              <span className="text-[8px] font-bold text-[var(--mos-text-muted)] uppercase block">Dáng/Cong</span>
              <span className="text-[10px] font-black text-[var(--mos-text)] block truncate mt-0.5">
                {recommendation.recommendedDesign} {recommendation.recommendedCurl}
              </span>
            </div>
            <div className="bg-[var(--mos-surface-raised)] border border-[var(--mos-surface-border)] rounded-lg py-1 px-1 min-w-0">
              <span className="text-[8px] font-bold text-[var(--mos-text-muted)] uppercase block">Dày</span>
              <span className={`text-[10px] font-black block truncate mt-0.5 tabular-nums ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>
                {recommendation.recommendedThickness.replace(/\s*mm/gi, '')}
              </span>
            </div>
            <div className="bg-[var(--mos-surface-raised)] border border-[var(--mos-surface-border)] rounded-lg py-1 px-1 min-w-0">
              <span className="text-[8px] font-bold text-[var(--mos-text-muted)] uppercase block">Dài tối đa</span>
              <span className={`text-[10px] font-black block truncate mt-0.5 tabular-nums ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                ≤ {recommendation.maxSafeMm}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--mos-surface-muted)] border border-dashed border-[var(--mos-surface-border-strong)] rounded-xl px-3 py-2 text-[11px] text-[var(--mos-text-muted)] leading-relaxed">
            Không có thông số mặc định cho khách hàng. Vui lòng đo & chọn đủ{' '}
            <strong className={`tabular-nums ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>7/7</strong> thông số mi thật ở trên để hệ thống tính Tỷ Lệ
            Vàng an toàn.
          </div>
        )}
      </div>
    </>
  );
}
