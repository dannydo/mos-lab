'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  FlaskConical,
  History,
  RotateCcw,
  Eye,
  ChevronDown,
  AlertCircle,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import type { IosBookingItem, IosSimulationMenteeOption } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import {
  IOS_SANDBOX_MODE_OPTIONS,
  type IosSandboxPresetMode,
  type IosSimMaterialCheckItem,
} from '../../state/iosSandboxPresetConfig';
import { IosSimulationModeModal } from './IosSimulationModeModal';

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
  onOpenCreateBooking?: () => void;
  onOpenHistory: (bookingId: number) => void;
  onRevertConsultation: (bookingId: number) => void;
  onResetToIncoming: (bookingId: number) => void;
  onExitSimulation: () => void;
  simPresetMode?: IosSandboxPresetMode;
  onSelectSimPresetMode?: (mode: IosSandboxPresetMode) => void;
  onSimJumpToStep?: (step: number, bookingId?: number) => void;
  simMaterialsChecklist?: IosSimMaterialCheckItem[];
  onToggleSimMaterial?: (id: string) => void;
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
  onOpenHistory,
  onRevertConsultation,
  onResetToIncoming,
  onExitSimulation,
  simPresetMode = 'training',
  onSelectSimPresetMode,
  onSimJumpToStep,
  simMaterialsChecklist = [],
  onToggleSimMaterial,
}: IosSimulationWorkspaceBarProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const [isRevertMenuOpen, setIsRevertMenuOpen] = useState(false);
  const [isMenteeMenuOpen, setIsMenteeMenuOpen] = useState(false);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [popoverTop, setPopoverTop] = useState<number>(32);

  const updatePopoverTop = () => {
    const rect = barRef.current?.getBoundingClientRect();
    setPopoverTop(rect ? Math.max(8, Math.round(rect.bottom + 4)) : 32);
  };

  useEffect(() => {
    setIsRevertMenuOpen(false);
    setIsMenteeMenuOpen(false);
    setIsModeMenuOpen(false);
  }, [activeBooking?.id, currentStep, isSimulationMode]);

  useEffect(() => {
    if (!isRevertMenuOpen && !isMenteeMenuOpen && !isModeMenuOpen) return;
    updatePopoverTop();
    const handleResize = () => updatePopoverTop();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsRevertMenuOpen(false);
        setIsMenteeMenuOpen(false);
        setIsModeMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRevertMenuOpen, isMenteeMenuOpen, isModeMenuOpen]);

  const activePresetMeta = useMemo(
    () => IOS_SANDBOX_MODE_OPTIONS.find((opt) => opt.id === simPresetMode) || IOS_SANDBOX_MODE_OPTIONS[0],
    [simPresetMode]
  );

  const hasMentees = Boolean(menteesList.length > 0 && onSelectMentee);
  const selectedMentee = useMemo(
    () => menteesList.find((m) => Number(m.menteeStaffId) === Number(selectedMenteeStaffId)),
    [menteesList, selectedMenteeStaffId]
  );

  const showBookingActions = useMemo(() => {
    if (!activeBooking || activeBooking.id <= 0) return false;
    return currentStep > 1 || activeBooking.status !== 'INCOMING' || (activeBooking.simulationAttemptCount ?? 0) > 0;
  }, [activeBooking, currentStep]);

  if (!isSimulationMode) return null;

  return (
    <>
      <div ref={barRef} className="shrink-0 z-[45] relative">
        <div
          className={`h-7 px-2.5 border-b flex items-center justify-between gap-1.5 transition-colors ${
            isDark
              ? 'bg-pink-500/10 border-pink-400/25 text-pink-100'
              : 'bg-pink-50/90 border-pink-300/70 text-pink-950'
          }`}
        >
          {/* Left: Minimalist Simulation / Mentee pill + inline PA indicator */}
          <div className="flex items-center gap-1.5 min-w-0">
            {hasMentees ? (
              <button
                type="button"
                onClick={() => {
                  setIsRevertMenuOpen(false);
                  setIsMenteeMenuOpen((prev) => {
                    const next = !prev;
                    if (next) updatePopoverTop();
                    return next;
                  });
                }}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black tracking-wide leading-none min-w-0 max-w-[205px] transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-200'
                    : 'bg-pink-500/15 hover:bg-pink-500/25 text-pink-800'
                }`}
                aria-label="Chọn bài tập mô phỏng"
                aria-expanded={isMenteeMenuOpen}
                title="Chuyển giữa Sandbox của tôi và bài tập của Chuyên Viên"
              >
                <FlaskConical className="w-2.5 h-2.5 shrink-0 text-pink-400" />
                <span className="truncate">{selectedMentee ? selectedMentee.menteeName : 'Sandbox của tôi'}</span>
                <ChevronDown
                  className={`w-2.5 h-2.5 shrink-0 transition-transform ${isMenteeMenuOpen ? 'rotate-180' : ''}`}
                />
              </button>
            ) : (
              <span
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase leading-none shrink-0 ${
                  isDark ? 'bg-pink-500/20 text-pink-200' : 'bg-pink-500/15 text-pink-800'
                }`}
              >
                <FlaskConical className="w-2.5 h-2.5 shrink-0 text-pink-400" />
                <span>Mô phỏng</span>
              </span>
            )}

            {activeBooking && activeBooking.id > 0 && (
              <span
                className={`text-[10px] font-extrabold tabular-nums shrink-0 leading-none ${
                  isDark ? 'text-pink-300/90' : 'text-pink-700'
                }`}
              >
                · PA #
                {Math.max(1, (activeBooking.simulationAttemptCount || 0) + (activeBooking.status === 'DONE' ? 0 : 1))}
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                setIsRevertMenuOpen(false);
                setIsMenteeMenuOpen(false);
                setIsModeMenuOpen((prev) => {
                  const next = !prev;
                  if (next) updatePopoverTop();
                  return next;
                });
              }}
              aria-label="Chọn mode giả lập Sandbox"
              aria-expanded={isModeMenuOpen}
              title="Chuyển đổi chế độ giả lập Sandbox (Training Check-in / Bấm giờ / Sales Combo & Quà)"
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold leading-none shrink-0 transition-colors cursor-pointer ${
                simPresetMode === 'sales'
                  ? isDark
                    ? 'bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                    : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                  : simPresetMode === 'training'
                    ? isDark
                      ? 'bg-sky-500/20 text-sky-200 hover:bg-sky-500/30'
                      : 'bg-sky-100 text-sky-900 hover:bg-sky-200'
                    : isDark
                      ? 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                      : 'bg-white text-neutral-800 border border-pink-200 hover:bg-pink-50'
              }`}
            >
              <SlidersHorizontal className="w-2.5 h-2.5 shrink-0" />
              <span>{activePresetMeta.shortLabel}</span>
              <ChevronDown className={`w-2.5 h-2.5 shrink-0 transition-transform ${isModeMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isReadOnlyMentorView && (
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9.5px] font-bold shrink-0 leading-none ${
                  isDark ? 'bg-sky-500/20 text-sky-300' : 'bg-sky-100 text-sky-800'
                }`}
                title={
                  simulationActorStaffName ? `Đang xem dữ liệu tập luyện của ${simulationActorStaffName}` : undefined
                }
              >
                <Eye className="w-2.5 h-2.5" />
                <span>Xem</span>
              </span>
            )}
          </div>

          {/* Right: Minimalist Flat Ghost Icon Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            {showBookingActions && activeBooking && (
              <>
                {!isReadOnlyMentorView && (
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => {
                      setIsMenteeMenuOpen(false);
                      setIsRevertMenuOpen((prev) => {
                        const next = !prev;
                        if (next) updatePopoverTop();
                        return next;
                      });
                    }}
                    className={`inline-flex items-center justify-center p-1 rounded-md transition-colors active:scale-95 cursor-pointer leading-none ${
                      isDark ? 'text-pink-200 hover:bg-pink-500/20' : 'text-pink-800 hover:bg-pink-500/15'
                    }`}
                    aria-label="Revert kịch bản mô phỏng"
                    title="Hoàn tác / làm lại kịch bản tư vấn cho khách này"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                  </button>
                )}

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onOpenHistory(activeBooking.id)}
                  className={`inline-flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] font-extrabold transition-colors active:scale-95 cursor-pointer leading-none tabular-nums ${
                    isDark ? 'text-pink-200 hover:bg-pink-500/20' : 'text-pink-800 hover:bg-pink-500/15'
                  }`}
                  aria-label="Lịch sử phương án mô phỏng"
                  title="So sánh các phương án tư vấn & chốt đơn"
                >
                  <History className="w-3.5 h-3.5 text-pink-400" />
                  {(activeBooking.simulationAttemptCount ?? 0) > 0 && (
                    <span>{activeBooking.simulationAttemptCount}</span>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              disabled={isBusy}
              onClick={onExitSimulation}
              className={`inline-flex items-center justify-center p-1 rounded-md transition-colors active:scale-95 cursor-pointer leading-none ${
                isDark ? 'text-pink-300 hover:bg-pink-500/25' : 'text-pink-700 hover:bg-pink-500/15'
              }`}
              aria-label="Thoát chế độ Mô phỏng"
              title="Thoát chế độ Mô phỏng, quay về dữ liệu thực tế"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mentee Selector Popover Portal */}
        {isMenteeMenuOpen &&
          hasMentees &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              className="ios-app-font-scope fixed inset-0 z-[80] flex justify-center select-none"
              role="dialog"
              aria-modal="true"
              aria-label="Chọn bài tập mô phỏng"
            >
              <div
                className="fixed inset-0 bg-black/55 backdrop-blur-xs"
                onClick={() => setIsMenteeMenuOpen(false)}
                data-testid="sim-mentee-backdrop"
              />
              <div className="relative w-full max-w-[430px] h-full pointer-events-none">
                <div
                  style={{ top: `${popoverTop}px` }}
                  onClick={(e) => e.stopPropagation()}
                  className={`pointer-events-auto absolute left-2.5 w-[min(280px,calc(100vw-20px))] rounded-2xl border p-2 shadow-2xl z-10 space-y-1 max-h-[65dvh] overflow-y-auto ${
                    isDark ? 'bg-[#1C1C1E] border-pink-400/35 text-white' : 'bg-white border-pink-300 text-neutral-900'
                  }`}
                >
                  <div className="px-1.5 py-1 flex items-center justify-between">
                    <span className="text-[10.5px] font-black uppercase tracking-wider text-pink-400">
                      Xem bài tập mô phỏng
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMenteeMenuOpen(false)}
                      aria-label="Đóng danh sách bài tập"
                      className="p-0.5 rounded-md opacity-70 hover:opacity-100 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectMentee?.(undefined);
                      setIsMenteeMenuOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                      !selectedMenteeStaffId
                        ? isDark
                          ? 'bg-pink-500/20 text-pink-200'
                          : 'bg-pink-50 text-pink-800'
                        : isDark
                          ? 'hover:bg-neutral-800 text-neutral-200'
                          : 'hover:bg-neutral-100 text-neutral-800'
                    }`}
                  >
                    <span>Sandbox của tôi</span>
                    {!selectedMenteeStaffId && <Check className="w-3.5 h-3.5 text-pink-400" />}
                  </button>

                  {menteesList.map((m) => {
                    const isSelected = Number(selectedMenteeStaffId) === Number(m.menteeStaffId);
                    return (
                      <button
                        key={m.menteeStaffId}
                        type="button"
                        onClick={() => {
                          onSelectMentee?.(m.menteeStaffId);
                          setIsMenteeMenuOpen(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-xl flex items-center justify-between text-xs font-bold transition-colors cursor-pointer ${
                          isSelected
                            ? isDark
                              ? 'bg-pink-500/20 text-pink-200'
                              : 'bg-pink-50 text-pink-800'
                            : isDark
                              ? 'hover:bg-neutral-800 text-neutral-200'
                              : 'hover:bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        <span className="truncate">{m.menteeName}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-pink-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body
          )}

        <IosSimulationModeModal
          isOpen={isModeMenuOpen}
          onClose={() => setIsModeMenuOpen(false)}
          isDark={isDark}
          isReadOnlyMentorView={isReadOnlyMentorView}
          activeBooking={activeBooking}
          simPresetMode={simPresetMode}
          onSelectSimPresetMode={onSelectSimPresetMode}
          onSimJumpToStep={onSimJumpToStep}
          simMaterialsChecklist={simMaterialsChecklist}
          onToggleSimMaterial={onToggleSimMaterial}
        />

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
                    isDark
                      ? 'bg-[#1C1C1E] border-amber-500/40 text-white'
                      : 'bg-white border-amber-300 text-neutral-900'
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
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-hidden="true"
            data-testid="simulation-screen-border"
            className="pointer-events-none fixed inset-0 z-[95] flex justify-center"
          >
            <div className="w-full max-w-[430px] h-full border border-pink-400" />
          </div>,
          document.body
        )}
    </>
  );
}
