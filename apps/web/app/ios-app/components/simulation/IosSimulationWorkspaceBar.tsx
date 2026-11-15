'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FlaskConical, History, RotateCcw, Plus, Eye, ChevronDown, AlertCircle } from 'lucide-react';
import type { IosBookingItem, IosSimulationMenteeOption } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

const SAMPLE_STAGE_LABELS: Record<
  'before' | 'cleaned' | 'after',
  { title: string; subtitle: string; bg: string; accent: string }
> = {
  before: {
    title: 'ANH BEFORE · MAT MOC (TAP LUYEN)',
    subtitle: 'Du lieu anh mau mo phong quy trinh kiem tra mi that',
    bg: '#1E293B',
    accent: '#F59E0B',
  },
  cleaned: {
    title: 'ANH VE SINH NHAM MAT (TAP LUYEN)',
    subtitle: 'Da ve sinh chan mi & dan gel pad chuan ky thuat',
    bg: '#0F172A',
    accent: '#38BDF8',
  },
  after: {
    title: 'ANH AFTER · HOAN THIEN (TAP LUYEN)',
    subtitle: 'Bo mi hoan thien toi muot · Chuan form thiet ke Wings',
    bg: '#064E3B',
    accent: '#34D399',
  },
};

export function getClientTrainingSamplePhoto(stage: 'before' | 'cleaned' | 'after'): string {
  const cfg = SAMPLE_STAGE_LABELS[stage];
  if (typeof document !== 'undefined' && !(typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent))) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = cfg.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = cfg.accent;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(200, 235, 95, 42, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(440, 235, 95, 42, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(cfg.title, canvas.width / 2, 72);

        ctx.fillStyle = 'rgba(255,255,255,0.72)';
        ctx.font = '14px sans-serif';
        ctx.fillText(cfg.subtitle, canvas.width / 2, 420);

        return canvas.toDataURL('image/jpeg', 0.8);
      }
    } catch {
      // fallback to SVG data URI
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="${cfg.bg}"/><ellipse cx="200" cy="235" rx="95" ry="42" fill="none" stroke="${cfg.accent}" stroke-width="4"/><ellipse cx="440" cy="235" rx="95" ry="42" fill="none" stroke="${cfg.accent}" stroke-width="4"/><text x="320" y="72" text-anchor="middle" fill="#ffffff" font-family="sans-serif" font-size="20" font-weight="bold">${cfg.title}</text><text x="320" y="420" text-anchor="middle" fill="#cbd5e1" font-family="sans-serif" font-size="14">${cfg.subtitle}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface IosSimulationWorkspaceBarProps {
  isSimulationMode: boolean;
  isReadOnlyMentorView: boolean;
  simulationActorStaffName?: string;
  menteesList: IosSimulationMenteeOption[];
  selectedMenteeStaffId?: number;
  onSelectMentee?: (staffId: number | undefined) => void;
  activeBooking?: IosBookingItem;
  currentStep: number;
  isBusy?: boolean;
  simActionError?: string | null;
  onDismissError?: () => void;
  onOpenCreateBooking: () => void;
  onOpenHistory: (bookingId: number) => void;
  onRevertConsultation: (bookingId: number) => void;
  onResetToIncoming: (bookingId: number) => void;
  onExitSimulation: () => void;
}

export function IosSimulationWorkspaceBar({
  isSimulationMode,
  isReadOnlyMentorView,
  simulationActorStaffName,
  menteesList,
  selectedMenteeStaffId,
  onSelectMentee,
  activeBooking,
  currentStep,
  isBusy = false,
  simActionError,
  onDismissError,
  onOpenCreateBooking,
  onOpenHistory,
  onRevertConsultation,
  onResetToIncoming,
  onExitSimulation,
}: IosSimulationWorkspaceBarProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const [isRevertMenuOpen, setIsRevertMenuOpen] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [popoverTop, setPopoverTop] = useState<number>(44);

  const updatePopoverTop = () => {
    const rect = barRef.current?.getBoundingClientRect();
    setPopoverTop(rect ? Math.max(8, Math.round(rect.bottom + 6)) : 44);
  };

  useEffect(() => {
    setIsRevertMenuOpen(false);
  }, [activeBooking?.id, currentStep, isSimulationMode]);

  useEffect(() => {
    if (!isRevertMenuOpen) return;
    updatePopoverTop();
    const handleResize = () => updatePopoverTop();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRevertMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRevertMenuOpen]);

  const showBookingActions = useMemo(() => {
    if (!activeBooking || activeBooking.id <= 0) return false;
    return currentStep > 1 || activeBooking.status !== 'INCOMING' || (activeBooking.simulationAttemptCount ?? 0) > 0;
  }, [activeBooking, currentStep]);

  if (!isSimulationMode) return null;

  return (
    <div ref={barRef} className="shrink-0 z-[45] relative">
      <div
        className={`px-2.5 py-1.5 border-b flex items-center justify-between gap-1.5 transition-colors ${
          isDark ? 'bg-amber-950/70 border-amber-500/40 text-amber-100' : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}
      >
        {/* Left: Mode badge + attempt indicator */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase leading-none shrink-0 ${
              isDark ? 'bg-amber-500 text-black' : 'bg-amber-500 text-black shadow-2xs'
            }`}
          >
            <FlaskConical className="w-3 h-3 shrink-0" />
            <span>MÔ PHỎNG</span>
          </span>

          {activeBooking && activeBooking.id > 0 && (
            <span
              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border tabular-nums shrink-0 leading-none ${
                isDark
                  ? 'bg-neutral-900/80 border-amber-500/30 text-amber-300'
                  : 'bg-white border-amber-300 text-amber-900'
              }`}
            >
              PA #{Math.max(1, (activeBooking.simulationAttemptCount || 0) + (activeBooking.status === 'DONE' ? 0 : 1))}
            </span>
          )}

          {isReadOnlyMentorView && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold shrink-0 leading-none ${
                isDark
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'bg-sky-100 text-sky-800 border border-sky-200'
              }`}
              title={
                simulationActorStaffName ? `Đang xem dữ liệu tập luyện của ${simulationActorStaffName}` : undefined
              }
            >
              <Eye className="w-2.5 h-2.5" />
              <span>Chỉ xem</span>
            </span>
          )}
        </div>

        {/* Right: Quick Simulation Workspace Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!isReadOnlyMentorView && (
            <button
              type="button"
              disabled={isBusy}
              onClick={onOpenCreateBooking}
              className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10.5px] font-extrabold transition-all active:scale-95 cursor-pointer leading-none ${
                isDark
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
              }`}
              title="Đặt lịch khách mới hoặc khách quen để tập luyện"
            >
              <Plus className="w-3 h-3" />
              <span>{showBookingActions ? 'Lịch' : 'Đặt lịch'}</span>
            </button>
          )}

          {showBookingActions && activeBooking && (
            <>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onOpenHistory(activeBooking.id)}
                className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10.5px] font-extrabold transition-all active:scale-95 cursor-pointer leading-none tabular-nums border ${
                  isDark
                    ? 'bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
                    : 'bg-white hover:bg-neutral-100 text-neutral-800 border-neutral-300'
                }`}
                title="So sánh các phương án tư vấn & chốt đơn"
              >
                <History className="w-3 h-3 text-amber-500" />
                <span>
                  {(activeBooking.simulationAttemptCount ?? 0) > 0 ? activeBooking.simulationAttemptCount : 'PA'}
                </span>
              </button>

              {!isReadOnlyMentorView && (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setIsRevertMenuOpen((prev) => {
                      const next = !prev;
                      if (next) updatePopoverTop();
                      return next;
                    });
                  }}
                  className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-[10.5px] font-black transition-all active:scale-95 cursor-pointer leading-none border ${
                    isDark
                      ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50'
                      : 'bg-amber-200/80 hover:bg-amber-300 text-amber-950 border-amber-400'
                  }`}
                  title="Hoàn tác / làm lại kịch bản tư vấn cho khách này"
                >
                  <RotateCcw className={`w-3 h-3 ${isBusy ? 'animate-spin' : ''}`} />
                  <span>Revert</span>
                </button>
              )}
            </>
          )}

          <button
            type="button"
            disabled={isBusy}
            onClick={onExitSimulation}
            className={`inline-flex items-center gap-0.5 px-1.5 py-1 rounded-lg text-[10.5px] font-bold transition-all active:scale-95 cursor-pointer leading-none border ${
              isDark
                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30'
                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300'
            }`}
            title="Thoát chế độ Mô phỏng, quay về dữ liệu thực tế"
          >
            <X className="w-3 h-3" />
            <span>Thoát</span>
          </button>
        </div>
      </div>

      {/* Dedicated Mentor Mentee Selector Sub-row */}
      {menteesList.length > 0 && onSelectMentee && (
        <div
          className={`px-2.5 py-1 border-b flex items-center justify-between gap-2 text-[10.5px] ${
            isDark
              ? 'bg-neutral-950/90 border-amber-500/25 text-amber-200/90'
              : 'bg-amber-100/60 border-amber-200 text-amber-950'
          }`}
        >
          <span className="font-bold shrink-0 opacity-85">Xem bài tập:</span>
          <div className="relative flex-1 max-w-[260px]">
            <select
              value={selectedMenteeStaffId ? String(selectedMenteeStaffId) : ''}
              onChange={(e) => {
                const val = e.target.value;
                onSelectMentee(val ? Number(val) : undefined);
              }}
              className={`w-full appearance-none pl-2.5 pr-6 py-0.5 rounded-lg text-[10.5px] font-bold border truncate cursor-pointer focus:outline-none ${
                isDark
                  ? 'bg-neutral-900 border-neutral-700 text-amber-200'
                  : 'bg-white border-amber-300 text-neutral-800'
              }`}
              aria-label="Chọn Chuyên Viên cần xem bài tập luyện"
            >
              <option value="">Sandbox của tôi</option>
              {menteesList.map((m) => (
                <option key={m.menteeStaffId} value={String(m.menteeStaffId)}>
                  {m.menteeName}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-70" />
          </div>
        </div>
      )}

      {/* Revert 2-Level Portal Dialog */}
      {isRevertMenuOpen &&
        activeBooking &&
        !isReadOnlyMentorView &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="ios-app-font-scope fixed inset-0 z-[80] flex justify-center select-none"
            role="dialog"
            aria-modal="true"
            aria-label="Hoàn tác kịch bản mô phỏng"
          >
            <div
              className="fixed inset-0 bg-black/55 backdrop-blur-xs"
              onClick={() => setIsRevertMenuOpen(false)}
              data-testid="sim-revert-backdrop"
            />
            <div className="relative w-full max-w-[430px] h-full pointer-events-none">
              <div
                style={{ top: `${popoverTop}px` }}
                onClick={(e) => e.stopPropagation()}
                className={`pointer-events-auto absolute right-2.5 w-[min(300px,calc(100vw-20px))] rounded-2xl border p-3 shadow-2xl z-10 space-y-2 ${
                  isDark ? 'bg-[#1C1C1E] border-amber-500/40 text-white' : 'bg-white border-amber-300 text-neutral-900'
                }`}
              >
                <div className="px-1 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-amber-500">
                    Làm lại ca · {activeBooking.customerName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRevertMenuOpen(false)}
                    aria-label="Đóng"
                    className="p-0.5 rounded-md opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setIsRevertMenuOpen(false);
                    onRevertConsultation(activeBooking.id);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all active:scale-98 cursor-pointer ${
                    isDark
                      ? 'bg-neutral-900 hover:bg-neutral-800 border-amber-500/40 text-white'
                      : 'bg-amber-50/70 hover:bg-amber-100 border-amber-300 text-neutral-900'
                  }`}
                >
                  <div className="text-[12px] font-black">↺ Thử lại Tư vấn (Giữ đo mi 7/7)</div>
                  <div className={`text-[10.5px] mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Lưu kết quả hiện tại vào Lịch sử PA và quay lại Bước 3 để đổi Combo / Upsell.
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setIsRevertMenuOpen(false);
                    onResetToIncoming(activeBooking.id);
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all active:scale-98 cursor-pointer ${
                    isDark
                      ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-neutral-200'
                      : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800'
                  }`}
                >
                  <div className="text-[12px] font-black">⟲ Reset toàn bộ về Chờ đón</div>
                  <div className={`text-[10.5px] mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                    Xóa thông số tập luyện đã đo &amp; đưa khách trở về Bước 1 (Chờ đón).
                  </div>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Action feedback error banner */}
      {simActionError && (
        <div
          className={`px-3 py-1.5 border-b flex items-center justify-between gap-2 text-[11px] font-bold ${
            isDark ? 'bg-rose-950/90 border-rose-500/40 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
            <span className="truncate">{simActionError}</span>
          </div>
          {onDismissError && (
            <button type="button" onClick={onDismissError} className="shrink-0 p-0.5 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
