'use client';

import React, { useMemo, useState } from 'react';
import { X, Trophy, TrendingUp, Clock, RotateCcw, BarChart3, Loader2, Pencil, Play } from 'lucide-react';
import type { IosBookingItem, IosSimulationAttemptSummary, IosUpdateSimulationAttemptRequest } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { FeatherSvg } from '../ui-kit/CvFeatherLabels';
import { SimulationAttemptEditModal } from './SimulationAttemptEditModal';

interface IosSimulationHistorySheetProps {
  isOpen: boolean;
  onClose: () => void;
  booking?: IosBookingItem;
  attempts: IosSimulationAttemptSummary[];
  isLoading?: boolean;
  isReadOnly?: boolean;
  isBusy?: boolean;
  onRevertConsultation?: (bookingId: number) => void;
  onResetToIncoming?: (bookingId: number) => void;
  onUpdateAttempt?: (attemptId: string, updates: IosUpdateSimulationAttemptRequest) => Promise<void>;
  onApplyAttempt?: (bookingId: number, attempt: IosSimulationAttemptSummary) => void;
}

const SOURCE_LABELS: Record<string, string> = {
  COMPLETE_ORDER: 'Đã checkout hoàn tất',
  SIM_REVERT_CONSULTATION: 'Lưu trước khi đổi tư vấn',
  SIM_RESET_TO_INCOMING: 'Lưu trước khi reset về Chờ đón',
};

export function IosSimulationHistorySheet({
  isOpen,
  onClose,
  booking,
  attempts,
  isLoading = false,
  isReadOnly = false,
  isBusy = false,
  onRevertConsultation,
  onResetToIncoming,
  onUpdateAttempt,
  onApplyAttempt,
}: IosSimulationHistorySheetProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';
  const [editingAttempt, setEditingAttempt] = useState<IosSimulationAttemptSummary | null>(null);

  const bestMetrics = useMemo(() => {
    if (!attempts || attempts.length === 0) return { bestRewardId: '', bestRevenueId: '' };
    let maxReward = -1;
    let bestRewardId = '';
    let maxRevenue = -1;
    let bestRevenueId = '';
    for (const a of attempts) {
      if ((a.totalEstimatedReward || 0) > maxReward) {
        maxReward = a.totalEstimatedReward || 0;
        bestRewardId = a.attemptId;
      }
      if ((a.grandTotal || 0) > maxRevenue) {
        maxRevenue = a.grandTotal || 0;
        bestRevenueId = a.attemptId;
      }
    }
    return { bestRewardId, bestRevenueId };
  }, [attempts]);

  if (!isOpen) return null;

  return (
    <div
      onClick={() => {
        if (!isBusy) onClose();
      }}
      className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[430px] max-h-[88dvh] rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isDark ? 'bg-[#141414] border-neutral-800 text-white' : 'bg-white border-neutral-200 text-neutral-900'
        }`}
      >
        {/* Header (Drawer Close Button Placement Invariant: Always End/Right) */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between gap-2 shrink-0 ${
            isDark ? 'border-neutral-800' : 'border-neutral-200'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-amber-500 shrink-0" />
              <h3 className="text-[14px] font-black truncate">
                So sánh Phương án Tư vấn · {booking?.customerName || 'Khách hàng'}
              </h3>
            </div>
            <p className={`text-[11px] truncate tabular-nums ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              {booking?.orderNumber ? `#${booking.orderNumber} · ` : ''}
              Đã lưu {attempts.length} phương án trong Sandbox
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${
              isDark
                ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs opacity-70">
              <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
              <span>Đang tải lịch sử phương án mô phỏng...</span>
            </div>
          ) : attempts.length === 0 ? (
            <div
              className={`rounded-2xl p-6 text-center border space-y-1.5 ${
                isDark
                  ? 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
                  : 'bg-neutral-50 border-neutral-200 text-neutral-600'
              }`}
            >
              <div className="text-[13px] font-black text-amber-500">Chưa có phương án được lưu</div>
              <p className="text-[11.5px] leading-relaxed">
                Hãy hoàn tất tư vấn & checkout (hoặc bấm Revert thử lại kịch bản) để hệ thống ghi nhận và so sánh thu
                nhập / doanh thu giữa các phương án.
              </p>
            </div>
          ) : (
            attempts.map((a) => {
              const isBestReward = bestMetrics.bestRewardId === a.attemptId && (a.totalEstimatedReward || 0) > 0;
              const isBestRevenue = bestMetrics.bestRevenueId === a.attemptId && (a.grandTotal || 0) > 0;
              const mins = a.elapsedSeconds > 0 ? Math.max(1, Math.round(a.elapsedSeconds / 60)) : 0;

              return (
                <div
                  key={a.attemptId}
                  className={`rounded-2xl p-3 border space-y-2 ${
                    isBestReward
                      ? isDark
                        ? 'bg-emerald-950/25 border-emerald-500/50'
                        : 'bg-emerald-50/70 border-emerald-300'
                      : isDark
                        ? 'bg-neutral-900/80 border-neutral-800'
                        : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10.5px] font-black tabular-nums leading-none">
                        PA #{a.attemptNumber}
                      </span>
                      <span className={`text-[10.5px] font-bold ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                        {SOURCE_LABELS[a.sourceAction] || a.sourceAction}
                      </span>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      {isBestReward && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9.5px] font-black leading-none">
                          <Trophy className="w-2.5 h-2.5" />
                          <span>Thu nhập cao nhất</span>
                        </span>
                      )}
                      {isBestRevenue && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[9.5px] font-black leading-none">
                          <TrendingUp className="w-2.5 h-2.5" />
                          <span>Bill cao nhất</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Service + Combo + Upsell breakdown */}
                  <div className="text-[11.5px] space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold truncate">
                        {a.serviceName}
                        {a.selectedStyle ? ` · ${a.selectedStyle}` : ''}
                      </span>
                      <span className="font-bold tabular-nums shrink-0">{a.servicePrice.toLocaleString('vi-VN')}đ</span>
                    </div>

                    {a.selectedComboName && (
                      <div className="flex justify-between gap-2 text-amber-500">
                        <span className="truncate font-semibold">+ Combo: {a.selectedComboName}</span>
                        <span className="font-bold tabular-nums shrink-0">
                          {a.selectedComboPrice.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    )}

                    {a.selectedUnderComboName && (
                      <div className="flex justify-between gap-2 text-amber-500">
                        <span className="truncate font-semibold">+ Mi dưới: {a.selectedUnderComboName}</span>
                        <span className="font-bold tabular-nums shrink-0">
                          {a.selectedUnderComboPrice.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    )}

                    {a.upsellProducts.length > 0 && (
                      <div className="flex justify-between gap-2 text-sky-400">
                        <span className="truncate font-semibold">
                          + Upsell ({a.upsellProducts.map((p) => `${p.productName} x${p.quantity}`).join(', ')})
                        </span>
                        <span className="font-bold tabular-nums shrink-0">
                          {a.upsellTotal.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    )}

                    {a.promotionName && (
                      <div className="flex justify-between gap-2 text-emerald-500 text-[11px]">
                        <span className="truncate">Ưu đãi: {a.promotionName}</span>
                        <span className="tabular-nums shrink-0">
                          -{a.promotionDiscountAmount.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Key Bottom Metrics Grid */}
                  <div
                    className={`grid grid-cols-3 gap-1.5 pt-2 border-t text-center ${
                      isDark ? 'border-neutral-800' : 'border-neutral-200'
                    }`}
                  >
                    <div className={`p-1.5 rounded-xl ${isDark ? 'bg-neutral-950/70' : 'bg-white'}`}>
                      <div className="text-[9.5px] opacity-65 font-semibold">Khách thanh toán</div>
                      <div className="text-[12px] font-black tabular-nums">{a.grandTotal.toLocaleString('vi-VN')}đ</div>
                    </div>
                    <div className={`p-1.5 rounded-xl ${isDark ? 'bg-neutral-950/70' : 'bg-white'}`}>
                      <div className="text-[9.5px] opacity-65 font-semibold">Thưởng + Tip CV</div>
                      <div className="text-[12px] font-black text-emerald-400 tabular-nums">
                        +{a.totalEstimatedReward.toLocaleString('vi-VN')}đ
                      </div>
                    </div>
                    <div className={`p-1.5 rounded-xl ${isDark ? 'bg-neutral-950/70' : 'bg-white'}`}>
                      <div className="text-[9.5px] opacity-65 font-semibold">Điểm Xoay Tua</div>
                      <div className="text-[12px] font-black text-amber-400 tabular-nums inline-flex items-center justify-center gap-0.5">
                        <span>+{a.cvRotationPoints}</span>
                        <FeatherSvg className="w-2.5 h-2.5 text-amber-500" />
                      </div>
                    </div>
                  </div>

                  {a.notes && (
                    <div
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] leading-relaxed border ${
                        isDark
                          ? 'bg-neutral-950/50 border-amber-500/20 text-amber-300'
                          : 'bg-amber-50/70 border-amber-200 text-amber-800'
                      }`}
                    >
                      <span className="font-bold opacity-75">Ghi chú:</span> {a.notes}
                    </div>
                  )}

                  {mins > 0 && (
                    <div className="flex items-center justify-between text-[10px] opacity-65 pt-0.5 tabular-nums">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Thời lượng làm mi: {mins} phút
                      </span>
                      <span>
                        {new Date(a.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Scenario Action Buttons: Edit & Apply */}
                  {!isReadOnly && (
                    <div
                      className={`flex items-center justify-end gap-1.5 pt-1.5 border-t ${
                        isDark ? 'border-neutral-800/80' : 'border-neutral-200'
                      }`}
                    >
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => setEditingAttempt(a)}
                        aria-label={`Chỉnh sửa kịch bản PA #${a.attemptNumber}`}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50 ${
                          isDark
                            ? 'bg-neutral-900 border-amber-500/40 text-amber-400 hover:bg-neutral-800'
                            : 'bg-white border-amber-400 text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        <Pencil className="w-3 h-3 text-amber-500" />
                        <span>Chỉnh sửa kịch bản</span>
                      </button>

                      {onApplyAttempt && booking && booking.id > 0 && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            onClose();
                            onApplyAttempt(booking.id, a);
                          }}
                          aria-label={`Nạp kịch bản PA #${a.attemptNumber} vào bàn làm việc`}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors bg-amber-500 hover:bg-amber-400 text-black shadow-xs disabled:opacity-50"
                        >
                          <Play className="w-3 h-3 fill-black" />
                          <span>Nạp kịch bản</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer quick retry buttons */}
        {!isReadOnly && booking && booking.id > 0 && (
          <div
            className={`p-3 border-t grid grid-cols-2 gap-2 shrink-0 ${
              isDark ? 'border-neutral-800 bg-neutral-950/70' : 'border-neutral-200 bg-neutral-50'
            }`}
          >
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                onClose();
                onRevertConsultation?.(booking.id);
              }}
              className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-[11.5px] flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Thử kịch bản mới</span>
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                onClose();
                onResetToIncoming?.(booking.id);
              }}
              className={`py-2.5 px-3 rounded-xl border font-bold text-[11.5px] cursor-pointer disabled:opacity-60 ${
                isDark
                  ? 'bg-neutral-900 border-neutral-700 text-neutral-200'
                  : 'bg-white border-neutral-300 text-neutral-800'
              }`}
            >
              Reset về Chờ đón
            </button>
          </div>
        )}

        {/* Edit Modal */}
        {editingAttempt && (
          <SimulationAttemptEditModal
            isOpen={Boolean(editingAttempt)}
            onClose={() => setEditingAttempt(null)}
            attempt={editingAttempt}
            bookingId={booking?.id || 0}
            isBusy={isBusy}
            onSave={async (attemptId, updates) => {
              if (onUpdateAttempt) {
                await onUpdateAttempt(attemptId, updates);
              }
              setEditingAttempt(null);
            }}
            onApplyToWorkspace={
              onApplyAttempt && booking && booking.id > 0
                ? (updatedAttempt) => {
                    setEditingAttempt(null);
                    onClose();
                    onApplyAttempt(booking.id, updatedAttempt);
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
