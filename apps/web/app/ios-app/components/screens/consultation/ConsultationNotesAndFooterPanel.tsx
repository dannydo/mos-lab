'use client';

import React from 'react';
import { FileText, ShieldCheck, CheckCircle2, Lock, ArrowRight } from 'lucide-react';
import { CvFeather2Badge } from '../../ui-kit/CvFeatherLabels';
import type { ActiveActorProfile } from '../../../state/useIosAppState';
import type { LashPricingAndCvPointResult } from '../LashMaterialConstraintMatrix';

interface ConsultationNotesAndFooterPanelProps {
  isDark: boolean;
  actor?: ActiveActorProfile;
  notes: string;
  setNotes: (notes: string) => void;
  mustCompleteNaturalLashBeforeProceeding: boolean;
  showMandatoryLashCheckAlert: boolean;
  isNaturalLashComplete: boolean;
  missingNaturalLashFields: string[];
  completedNaturalLashCount: number;
  confirmLashCheckBtnRef: React.RefObject<HTMLButtonElement | null>;
  handleConfirmNaturalLashOnly: () => void;
  cleanServiceName: string;
  specsSummaryString: string;
  livePricingAndCvPoints: LashPricingAndCvPointResult;
  hasUnderMink: boolean;
  underMinkServiceType: 'Normal' | 'Retain';
  cvllAssignmentMode: 'SELF_SERVICE' | 'ASSIGN_OTHER';
  setCvllAssignmentMode: (mode: 'SELF_SERVICE' | 'ASSIGN_OTHER') => void;
  activeSubTab: 'SPECS' | 'PROFILE';
  setActiveSubTab: (tab: 'SPECS' | 'PROFILE') => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  triggerMandatoryLashCheckGuard: () => void;
  handleSubmit: () => void;
  comboPurchaseTotal: number;
  showStaffRewards?: boolean;
}

export function ConsultationNotesAndFooterPanel({
  isDark,
  actor,
  notes,
  setNotes,
  mustCompleteNaturalLashBeforeProceeding,
  showMandatoryLashCheckAlert,
  isNaturalLashComplete,
  missingNaturalLashFields,
  completedNaturalLashCount,
  confirmLashCheckBtnRef,
  handleConfirmNaturalLashOnly,
  cleanServiceName,
  specsSummaryString,
  livePricingAndCvPoints,
  hasUnderMink,
  underMinkServiceType,
  cvllAssignmentMode,
  setCvllAssignmentMode,
  activeSubTab,
  setActiveSubTab,
  scrollContainerRef,
  triggerMandatoryLashCheckGuard,
  handleSubmit,
  comboPurchaseTotal,
  showStaffRewards = false,
}: ConsultationNotesAndFooterPanelProps) {
  return (
    <>
      {/* Ghi Chú Kỹ Thuật & Cam Kết Với Khách */}
      <div>
        <div
          className={`text-[11px] font-extrabold uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1 ${
            isDark ? 'text-neutral-400' : 'text-gray-600'
          }`}
        >
          <FileText className={`w-3.5 h-3.5 text-[var(--mos-text-muted)]`} />
          <span>GHI CHÚ KỸ THUẬT & CAM KẾT VỚI KHÁCH</span>
        </div>
        <div
          className={`rounded-2xl p-3 shadow-xs border ${'bg-[var(--mos-surface)] border-[var(--mos-surface-border)]'}`}
        >
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={`w-full bg-transparent text-[13px] leading-relaxed focus:outline-none resize-none font-medium ${
              isDark ? 'text-neutral-200 placeholder-neutral-600' : 'text-gray-800 placeholder-gray-400'
            }`}
            placeholder="Nhập ghi chú kỹ thuật, loại keo, form mắt..."
          />
        </div>
      </div>

      {mustCompleteNaturalLashBeforeProceeding ? (
        <div
          className={`rounded-2xl p-3.5 border space-y-2.5 shadow-xs ${
            showMandatoryLashCheckAlert
              ? isDark
                ? 'bg-rose-950/30 border-rose-500/70'
                : 'bg-rose-50 border-rose-300'
              : isDark
                ? 'bg-[#1C1C1E] border-amber-500/40'
                : 'bg-amber-50/70 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-2">
            <ShieldCheck
              className={`w-4 h-4 shrink-0 mt-0.5 ${
                showMandatoryLashCheckAlert
                  ? 'text-rose-400'
                  : isNaturalLashComplete
                    ? 'text-emerald-400'
                    : 'text-[#FFB400]'
              }`}
            />
            <p
              className={`text-[11.5px] font-bold leading-relaxed ${isDark ? 'text-neutral-200' : 'text-neutral-800'}`}
            >
              {!isNaturalLashComplete ? (
                <>
                  Kiểm Tra Mi Thật không có thông số mặc định. Bắt buộc đo & chọn đủ{' '}
                  <strong className="tabular-nums">7/7</strong> mục (còn thiếu:{' '}
                  <strong className={isDark ? 'text-amber-300' : 'text-amber-900'}>
                    {missingNaturalLashFields.join(', ')}
                  </strong>
                  ) trước khi xác nhận.
                </>
              ) : (
                <>
                  Đã đo đủ <strong>7/7 thông số mi thật</strong>. Xác nhận ngay để mở khóa{' '}
                  <strong>Thiết Kế Trên Mi Thật</strong>, báo giá và bắt đầu làm mi.
                </>
              )}
            </p>
          </div>
          <button
            ref={confirmLashCheckBtnRef}
            type="button"
            aria-disabled={!isNaturalLashComplete}
            onClick={handleConfirmNaturalLashOnly}
            className={`w-full py-3.5 px-4 rounded-2xl font-black text-[13px] shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer tabular-nums ${
              isNaturalLashComplete
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black active:scale-98'
                : isDark
                  ? 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  : 'bg-gray-200 text-gray-500 border border-gray-300'
            }`}
          >
            {isNaturalLashComplete ? (
              <CheckCircle2 className="w-4.5 h-4.5 stroke-[2.5] shrink-0" />
            ) : (
              <Lock className="w-4 h-4 shrink-0 text-amber-500" />
            )}
            <span>
              {isNaturalLashComplete
                ? 'XÁC NHẬN ĐÃ KIỂM TRA MI THẬT & THIẾT KẾ MI →'
                : `XÁC NHẬN ĐÃ KIỂM TRA MI THẬT & THIẾT KẾ MI (${completedNaturalLashCount}/7)`}
            </span>
          </button>
        </div>
      ) : (
        <>
          {/* BÁO GIÁ DỊCH VỤ GỌN GÀNG & DỄ HIỂU */}
          <div
            className={`rounded-2xl p-3.5 shadow-xs border space-y-2.5 ${'bg-[var(--mos-surface)] border-[var(--mos-surface-border)]'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider ${
                    isDark ? 'text-neutral-500' : 'text-gray-400'
                  }`}
                >
                  Báo giá dịch vụ
                </div>
                <div className={`text-[14.5px] font-black leading-snug mt-0.5 text-[var(--mos-text)]`}>
                  {cleanServiceName}
                </div>
                <div
                  className={`text-[11.5px] font-bold px-2 py-0.5 rounded-lg border inline-block mt-1.5 font-mono tracking-tight shadow-2xs ${
                    isDark
                      ? 'text-amber-300 bg-amber-950/60 border-amber-800'
                      : 'text-[#D97706] bg-amber-50/90 border-amber-200/80'
                  }`}
                >
                  {specsSummaryString}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[18px] font-black text-[#FFB400] tabular-nums leading-none">
                  {livePricingAndCvPoints.skuPrice.toLocaleString('vi-VN')} đ
                </div>
                <div
                  className={`text-[10px] font-bold mt-1 tabular-nums ${isDark ? 'text-neutral-500' : 'text-gray-400'}`}
                >
                  +8% VAT: {livePricingAndCvPoints.totalPriceWithVat.toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>

            {(livePricingAndCvPoints.upgradePrice > 0 || hasUnderMink) && (
              <div className={`pt-2 border-t space-y-1 text-[11px] border-[var(--mos-surface-border)]`}>
                {livePricingAndCvPoints.upgradePrice > 0 && (
                  <div className={`flex items-center justify-between ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
                    <span>Phụ thu nâng cấp:</span>
                    <span className="font-bold text-emerald-400 tabular-nums">
                      +{livePricingAndCvPoints.upgradePrice.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                )}
                {hasUnderMink && (
                  <div className={`flex items-center justify-between ${isDark ? 'text-neutral-400' : 'text-gray-600'}`}>
                    <span>+ Mi Dưới ({underMinkServiceType === 'Retain' ? 'Dặm' : 'Mới'}):</span>
                    <span className="font-bold text-purple-400 tabular-nums">
                      {livePricingAndCvPoints.isUnderMinkComboDeducted
                        ? 'Trừ gói Combo (0 đ)'
                        : underMinkServiceType === 'Retain'
                          ? '+250.000 đ'
                          : '+390.000 đ'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {showStaffRewards && (
              <div
                className={`pt-2 border-t flex items-center justify-between text-[11px] ${
                  isDark ? 'border-neutral-800' : 'border-gray-100'
                }`}
              >
                <span className={`font-medium text-[var(--mos-text-muted)]`}>Vòng xoay:</span>
                <span
                  className={`px-2 py-0.5 rounded-full border font-bold tabular-nums text-[11px] ${
                    isDark ? 'bg-blue-950/60 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  +{livePricingAndCvPoints.totalPoints} pts
                </span>
              </div>
            )}
          </div>

          {/* Chế độ Nhận ca hoặc Phân ca cho CVLL khi tư vấn khách chưa cố định CV khác */}
          {showStaffRewards && actor?.tier === 'CVLL' && (
            <div
              className={`rounded-2xl p-3 border space-y-2 ${
                isDark ? 'bg-[#1C1C1E] border-amber-500/30' : 'bg-amber-50/70 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-extrabold">
                <span className="inline-flex items-center gap-1.5">
                  <CvFeather2Badge />
                  <span className={isDark ? 'text-amber-300' : 'text-amber-900'}>CHẾ ĐỘ ĐIỀU PHỐI CA SAU TƯ VẤN:</span>
                </span>
                <span className={`text-[10px] font-semibold text-[var(--mos-text-muted)]`}>Check-in +10% Tip</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCvllAssignmentMode('SELF_SERVICE')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    cvllAssignmentMode === 'SELF_SERVICE'
                      ? 'bg-[#FFB400] text-black border-amber-500 font-black shadow-xs'
                      : isDark
                        ? 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700 font-bold'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 font-bold'
                  }`}
                >
                  <div className="text-[11.5px] leading-snug">⚡ Tự nhận làm mi</div>
                  <div
                    className={`text-[9.5px] mt-0.5 ${
                      cvllAssignmentMode === 'SELF_SERVICE'
                        ? 'text-black/80 font-bold'
                        : isDark
                          ? 'text-neutral-400'
                          : 'text-gray-500'
                    }`}
                  >
                    Vào thẳng Bước 6 (Hưởng 90% Tip)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setCvllAssignmentMode('ASSIGN_OTHER')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    cvllAssignmentMode === 'ASSIGN_OTHER'
                      ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-xs'
                      : isDark
                        ? 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700 font-bold'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300 font-bold'
                  }`}
                >
                  <div className="text-[11.5px] leading-snug">🤝 Tư vấn hộ · Phân ca</div>
                  <div
                    className={`text-[9.5px] mt-0.5 ${
                      cvllAssignmentMode === 'ASSIGN_OTHER'
                        ? 'text-black/80 font-bold'
                        : isDark
                          ? 'text-neutral-400'
                          : 'text-gray-500'
                    }`}
                  >
                    Qua Bước 4 chọn CV & Giường
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Big Action Button */}
          <div className="pt-1">
            {activeSubTab === 'PROFILE' ? (
              <button
                type="button"
                onClick={() => {
                  if (mustCompleteNaturalLashBeforeProceeding) {
                    triggerMandatoryLashCheckGuard();
                    return;
                  }
                  setActiveSubTab('SPECS');
                  requestAnimationFrame(() => {
                    scrollContainerRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
                  });
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] hover:bg-amber-400 text-black font-extrabold text-[14px] shadow-md active:scale-98 transition-transform flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>CHUYỂN SANG THIẾT KẾ TRÊN MI THẬT</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#FFB400] text-black font-extrabold text-[14px] shadow-md active:scale-98 transition-transform text-center cursor-pointer"
              >
                {comboPurchaseTotal > 0
                  ? `LƯU TƯ VẤN & MUA COMBO (+${comboPurchaseTotal.toLocaleString('vi-VN')} Đ)`
                  : actor?.tier === 'CVLL' && cvllAssignmentMode === 'ASSIGN_OTHER'
                    ? 'LƯU TƯ VẤN & CHỌN CHUYÊN VIÊN LÀM MI →'
                    : 'LƯU TƯ VẤN & BẮT ĐẦU LÀM MI'}
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
