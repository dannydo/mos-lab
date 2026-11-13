'use client';

import React from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
import { BookingItem } from '../../../state/mockData';
import { CvFeather1Badge } from '../../ui-kit/CvFeatherLabels';
import { calculateLashPricingAndCvPoints, resolveQuickCheckInComboPreset } from '../LashMaterialConstraintMatrix';
import { Check, Sparkles, RotateCw, AlertTriangle, Info, X } from 'lucide-react';

type QuickCheckInPreset = ReturnType<typeof resolveQuickCheckInComboPreset>;
type PointsBreakdown = ReturnType<typeof calculateLashPricingAndCvPoints>;

export interface PendingOverrideState {
  title: string;
  message: string;
  reasons: string[];
  onConfirm: (reason: string) => void;
}

export interface PendingComboNewConfirmationState {
  title: string;
  remainingSessions: number;
  onConfirm: () => void;
}

interface CheckInModalsProps {
  pendingOverride: PendingOverrideState | null;
  setPendingOverride: React.Dispatch<React.SetStateAction<PendingOverrideState | null>>;
  selectedOverrideReasonDraft: string;
  setSelectedOverrideReasonDraft: React.Dispatch<React.SetStateAction<string>>;
  pendingComboNewConfirmation: PendingComboNewConfirmationState | null;
  setPendingComboNewConfirmation: React.Dispatch<React.SetStateAction<PendingComboNewConfirmationState | null>>;
  isRotationInfoOpen: boolean;
  setIsRotationInfoOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activePointsBreakdown: PointsBreakdown;
  isComboLive: boolean;
  preset: QuickCheckInPreset;
  serviceName: string;
  quickServiceType: 'Normal' | 'Retain';
  quickUnderServiceType: 'Normal' | 'Retain';
  booking: BookingItem;
}

export function CheckInModals({
  pendingOverride,
  setPendingOverride,
  selectedOverrideReasonDraft,
  setSelectedOverrideReasonDraft,
  pendingComboNewConfirmation,
  setPendingComboNewConfirmation,
  isRotationInfoOpen,
  setIsRotationInfoOpen,
  activePointsBreakdown,
  isComboLive,
  preset,
  serviceName,
  quickServiceType,
  quickUnderServiceType,
  booking,
}: CheckInModalsProps) {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  return (
    <>
      {/* Modal Cảnh Báo Xác Nhận khi CVL Override trái chu kỳ 25 ngày ngay trên màn Quick Check-in */}
      {pendingOverride && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[360px] bg-[var(--mos-surface)] text-[var(--mos-text)] rounded-3xl p-4 shadow-2xl border-2 border-rose-500 space-y-3">
            <div className="flex items-start gap-2.5">
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                  isDark ? 'bg-rose-500/20 text-rose-400' : 'bg-rose-100 text-rose-600'
                }`}
              >
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[13.5px] font-black text-[var(--mos-text)] leading-snug">{pendingOverride.title}</h3>
                <p className="text-[11.5px] text-[var(--mos-text-muted)] font-medium mt-1 leading-relaxed">
                  {pendingOverride.message}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="text-[10.5px] font-extrabold text-[var(--mos-text-muted)] uppercase flex items-center gap-1">
                <span>Chọn lý do</span>
                <CvFeather1Badge />
                <span>Override (Bắt buộc ghi nhận):</span>
              </div>
              <div className="space-y-1.5">
                {pendingOverride.reasons.map((r) => {
                  const active = selectedOverrideReasonDraft === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setSelectedOverrideReasonDraft(r)}
                      className={`w-full text-left p-2.5 rounded-xl border text-[11.5px] font-bold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        active
                          ? isDark
                            ? 'bg-rose-950/40 border-rose-500 text-rose-200 shadow-2xs'
                            : 'bg-rose-50 border-rose-500 text-rose-950 shadow-2xs'
                          : 'bg-[var(--mos-surface-raised)] border-[var(--mos-surface-border)] text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)]'
                      }`}
                    >
                      <span className="leading-snug">{r}</span>
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 border ${
                          active ? 'border-rose-600 bg-rose-600 text-white' : 'border-[var(--mos-surface-border-strong)]'
                        }`}
                      >
                        {active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingOverride(null)}
                className="py-2.5 px-3 rounded-xl bg-[var(--mos-surface-muted)] hover:opacity-90 text-[var(--mos-text)] text-[12px] font-extrabold cursor-pointer"
              >
                Hủy · Giữ chuẩn
              </button>
              <button
                type="button"
                onClick={() => pendingOverride.onConfirm(selectedOverrideReasonDraft || pendingOverride.reasons[0])}
                className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[12px] font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                <span>Xác nhận Override</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác Nhận Nối Mới Cho Khách Combo (Trừ 1 suất Mới không hoàn phí · Bắt buộc gỡ 100% mi cũ) */}
      {pendingComboNewConfirmation && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-[370px] bg-[var(--mos-surface)] text-[var(--mos-text)] rounded-3xl p-4.5 shadow-2xl border-2 border-amber-500/80 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div
                className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                  isDark
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-amber-50 border-amber-300 text-amber-700'
                }`}
              >
                <Sparkles className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h3 className={`text-[14px] font-black leading-snug ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  {pendingComboNewConfirmation.title}
                </h3>
                <p className="text-[11px] text-[var(--mos-text-muted)] font-medium mt-0.5">
                  Khách hàng còn{' '}
                  <strong className="text-[var(--mos-text)] font-extrabold">
                    {pendingComboNewConfirmation.remainingSessions} lần Nối Mới
                  </strong>{' '}
                  trong gói
                </p>
              </div>
            </div>

            {/* 2 Warning / Instruction Cards */}
            <div className="space-y-2 text-[11.5px]">
              {/* Card 1: Khách hàng */}
              <div className="bg-[var(--mos-surface-raised)] border border-[var(--mos-surface-border)] rounded-2xl p-3 space-y-1">
                <div
                  className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isDark ? 'text-amber-400' : 'text-amber-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                  <span>DÀNH CHO KHÁCH HÀNG</span>
                </div>
                <p className="text-[var(--mos-text)] leading-relaxed font-medium">
                  Khách được đi <strong className={isDark ? 'text-amber-300' : 'text-amber-700'}>Nối Mới thoải mái</strong>. Hệ thống sẽ{' '}
                  <strong className="text-[var(--mos-text)]">TRỪ 1 LẦN NỐI MỚI</strong> trong gói (không hoàn phí/bù trừ nếu bộ mi
                  cũ vẫn còn nhiều).
                </p>
              </div>

              {/* Card 2: Quy chuẩn bắt buộc cho Chuyên viên */}
              <div
                className={`rounded-2xl p-3 space-y-1 border ${
                  isDark ? 'bg-amber-950/40 border-amber-500/50' : 'bg-amber-50 border-amber-300'
                }`}
              >
                <div
                  className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                    isDark ? 'text-amber-400' : 'text-amber-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 stroke-[2.2] shrink-0" />
                  <span>QUY CHUẨN KỸ THUẬT (BẮT BUỘC)</span>
                </div>
                <p className={`leading-relaxed font-bold ${isDark ? 'text-amber-100/90' : 'text-amber-950'}`}>
                  Chuyên viên{' '}
                  <strong className={`underline underline-offset-2 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    BẮT BUỘC phải gỡ ra toàn bộ mi cũ
                  </strong>{' '}
                  và <strong>nối bộ mi mới 100%</strong> cho khách hàng (không được dặm đè lên mi
                  cũ khi trừ suất Nối Mới)!
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setPendingComboNewConfirmation(null)}
                className="py-2.5 px-3 rounded-xl bg-[var(--mos-surface-muted)] hover:opacity-90 text-[var(--mos-text)] text-[12px] font-bold cursor-pointer transition-all"
              >
                Hủy · Giữ Dặm
              </button>
              <button
                type="button"
                onClick={() => pendingComboNewConfirmation.onConfirm()}
                className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black text-[12px] font-black shadow-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Xác nhận Nối Mới</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet Giải Thích Cách Tính Điểm Vòng Xoay (CV Xoay · Điều răn CV-001) */}
      {isRotationInfoOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setIsRotationInfoOpen(false)}
        >
          <div
            className="w-full max-w-[400px] bg-[var(--mos-surface)] text-[var(--mos-text)] rounded-t-3xl sm:rounded-3xl p-4 shadow-2xl border border-[var(--mos-surface-border)] space-y-3 max-h-[86vh] overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Tiêu đề góc trái · Nút đóng [✕] góc phải (Chuẩn UI Invariant) */}
            <div className="flex items-start justify-between gap-2 pb-2 border-b border-[var(--mos-surface-border)]">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <RotateCw className={`w-4 h-4 shrink-0 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  <h3 className="text-[13.5px] font-black text-[var(--mos-text)]">Cách Tính Điểm Vòng Xoay (CV Xoay)</h3>
                </div>
                <p className="text-[10.5px] text-[var(--mos-text-muted)] font-medium mt-0.5">
                  Đồng bộ 100% Báo cáo CV → Tab CV Xoay (Điều răn CV-001)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRotationInfoOpen(false)}
                aria-label="Đóng"
                className="w-7 h-7 rounded-full bg-[var(--mos-surface-muted)] hover:opacity-80 text-[var(--mos-text)] flex items-center justify-center shrink-0 cursor-pointer transition-all"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

            {/* 1. Chi tiết tính điểm của ca làm hiện tại */}
            <div
              className={`border rounded-2xl p-3 space-y-2 tabular-nums ${
                isDark ? 'bg-blue-950/35 border-blue-500/35' : 'bg-blue-50/70 border-blue-200'
              }`}
            >
              <div
                className={`flex items-center justify-between text-[11px] font-extrabold ${
                  isDark ? 'text-blue-200' : 'text-blue-950'
                }`}
              >
                <span>CA LÀM HIỆN TẠI ({activePointsBreakdown.serviceSetsCount} BỘ MI)</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10.5px] font-black">
                  Tổng +{activePointsBreakdown.totalPoints} pts
                </span>
              </div>

              <div className="bg-[var(--mos-surface)] rounded-xl p-2 border border-[var(--mos-surface-border)] space-y-0.5 text-[10.5px]">
                <div className="flex items-center justify-between font-extrabold text-[var(--mos-text)]">
                  <span>
                    Bộ 1 · Mi Trên ({isComboLive ? preset.materialShortLabel : serviceName.split(' ')[0]} ·{' '}
                    {preset.isAlwaysFullSet
                      ? 'Mi Mới'
                      : (isComboLive ? quickServiceType : booking?.serviceType) === 'Retain'
                        ? 'Dặm'
                        : 'Mi Mới'}
                    )
                  </span>
                  <span className={`font-black ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    +{activePointsBreakdown.upperSetPoints} pts
                  </span>
                </div>
                <div className="text-[10px] text-[var(--mos-text-muted)] font-medium">
                  {activePointsBreakdown.upperSetBreakdownLabel}
                </div>
              </div>

              {activePointsBreakdown.serviceSetsCount === 2 && (
                <div
                  className={`bg-[var(--mos-surface)] rounded-xl p-2 border space-y-0.5 text-[10.5px] ${
                    isDark ? 'border-purple-500/40' : 'border-purple-200'
                  }`}
                >
                  <div
                    className={`flex items-center justify-between font-extrabold ${
                      isDark ? 'text-purple-200' : 'text-purple-950'
                    }`}
                  >
                    <span>Bộ 2 · Mi Dưới (Under Mink · {quickUnderServiceType === 'Retain' ? 'Dặm' : 'Mi Mới'})</span>
                    <span className={`font-black ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                      +{activePointsBreakdown.underSetPoints} pts
                    </span>
                  </div>
                  <div className={`text-[10px] font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                    {activePointsBreakdown.underSetBreakdownLabel} (Độc lập vòng xoay)
                  </div>
                </div>
              )}

              <div
                className={`text-[10px] font-medium leading-relaxed pt-0.5 flex items-start gap-1 ${
                  isDark ? 'text-blue-200' : 'text-blue-900'
                }`}
              >
                <Info className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                <span>
                  Khi khách nối cả <strong>Mi Trên + Mi Dưới</strong>, Chuyên Viên được nhận đủ{' '}
                  <strong>2 Bộ Mi độc lập</strong> vào tổng số bộ trong tháng để tính thưởng lũy tiến bậc hai.
                </span>
              </div>
            </div>

            {/* 2. Bảng quy chuẩn 6 thành phần điểm CV Xoay */}
            <div className="space-y-1.5 text-[10.5px] tabular-nums">
              <div className="text-[10px] font-extrabold text-[var(--mos-text-muted)] uppercase tracking-wider">
                BẢNG ĐIỂM CHUẨN 6 THÀNH PHẦN (TAB CV XOAY)
              </div>

              <div className="bg-[var(--mos-surface-raised)] rounded-xl p-2.5 border border-[var(--mos-surface-border)] space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-[var(--mos-text)] shrink-0">1. Dòng mi (Class):</span>
                  <span className="text-right text-[var(--mos-text-muted)] font-medium">
                    Classic <strong>+0</strong> · Volume/Ultra/Hyper <strong>+3</strong> · Mink/Under{' '}
                    <strong>+5</strong> · Ivylight <strong>+20</strong>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-[var(--mos-surface-border)]">
                  <span className="font-bold text-[var(--mos-text)] shrink-0">2. Kỹ thuật Fan (Fan):</span>
                  <span className="text-right text-[var(--mos-text-muted)] font-medium">
                    1D/2D/Under <strong>+0</strong> · 2X/3D/3X/3L <strong>+1</strong> · 4D/4X/4L <strong>+2</strong> ·
                    5D/5X/5L <strong>+3</strong>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-[var(--mos-surface-border)]">
                  <span className="font-bold text-[var(--mos-text)] shrink-0">3. Loại ca (Type):</span>
                  <span className="text-right text-[var(--mos-text-muted)] font-medium">
                    Dặm (Retain) <strong>+0</strong> · Nối Mới (Normal) <strong>+7</strong> · Sửa mi (FAL){' '}
                    <strong>+15</strong>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-[var(--mos-surface-border)]">
                  <span className="font-bold text-[var(--mos-text)] shrink-0">4. Số lượng (Lash):</span>
                  <span className="text-right text-[var(--mos-text-muted)] font-medium">
                    ≤50 (gồm Mi Dưới) <strong>+17</strong> · 60 <strong>+20</strong> · 70 <strong>+23</strong> · 80{' '}
                    <strong>+26</strong> · 90 <strong>+29</strong> · 100 <strong>+32</strong> · 110 <strong>+35</strong>{' '}
                    · 120 <strong>+38</strong> · 130+ <strong>+41</strong>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-[var(--mos-surface-border)]">
                  <span className="font-bold text-[var(--mos-text)] shrink-0">5. Dáng mi (Design):</span>
                  <span className="text-right text-[var(--mos-text-muted)] font-medium">
                    Natural <strong>+0</strong> · Kim-K / Katun <strong>+5</strong> · Wing <strong>+6</strong> · Doll{' '}
                    <strong>+7</strong>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-[var(--mos-surface-border)]">
                  <span className="font-bold text-[var(--mos-text)] shrink-0">6. Phối màu (Color):</span>
                  <span className="text-right text-[var(--mos-text-muted)] font-medium">
                    Đen <strong>+0</strong> · Nâu / Xanh / Tím / Phối màu <strong>+5</strong>
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsRotationInfoOpen(false)}
              className="w-full py-2.5 rounded-xl bg-[var(--mos-accent)] hover:opacity-95 text-[var(--mos-accent-contrast)] font-extrabold text-[12px] cursor-pointer transition-all"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
