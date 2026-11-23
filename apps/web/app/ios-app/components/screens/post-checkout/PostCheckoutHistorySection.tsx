'use client';

import React from 'react';
import { formatIosPaymentMethodLabel } from '@mos-lab/shared';
import { ArrowRightLeft, CheckCircle2, Clock, History, XCircle } from 'lucide-react';
import type { BookingItem } from '../../../state/mockData';

export interface PostCheckoutReceiptReconciliationBoxProps {
  booking: BookingItem;
  isDark: boolean;
}

export function PostCheckoutReceiptReconciliationBox({ booking, isDark }: PostCheckoutReceiptReconciliationBoxProps) {
  const prevTotal = booking.billing?.previousPaidGrandTotal;
  const adjustments = booking.postCheckoutAdjustments || [];
  const appliedList = adjustments.filter((e) => e.status === 'APPLIED');
  const latestApplied = appliedList.length > 0 ? appliedList[appliedList.length - 1] : null;

  if (prevTotal === undefined || !latestApplied) {
    return null;
  }

  const grandTotal = Math.max(0, Number(booking.billing?.grandTotal ?? 0));
  const mode = booking.billing?.lastAdjustmentMode || latestApplied.paymentMode;
  const deltaAmt = Number(booking.billing?.lastAdjustmentDeltaAmount ?? latestApplied.deltaAmount ?? 0);

  return (
    <div
      data-testid="post-checkout-reconciliation-box"
      className={`mt-2 rounded-xl border p-2.5 space-y-1 text-[11px] tabular-nums ${
        isDark
          ? 'bg-emerald-950/25 border-emerald-800/50 text-neutral-200'
          : 'bg-emerald-50/70 border-emerald-200 text-gray-800'
      }`}
    >
      <div
        className={`font-black text-[10.5px] uppercase tracking-wider ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}
      >
        Đối soát điều chỉnh sau checkout
      </div>
      <div className="flex justify-between gap-2">
        <span className={isDark ? 'text-neutral-400' : 'text-gray-600'}>Đã thanh toán đợt trước:</span>
        <span className="font-bold text-right">
          {prevTotal.toLocaleString('vi-VN')} đ (
          {formatIosPaymentMethodLabel({
            grandTotal: prevTotal,
            paymentMethod: booking.billing?.previousPaymentMethod,
            paymentBreakdown: booking.billing?.previousPaymentBreakdown,
          })}
          )
        </span>
      </div>
      <div className="flex justify-between gap-2">
        <span className={isDark ? 'text-neutral-400' : 'text-gray-600'}>
          {mode === 'VOID_AND_RECOLLECT' ? 'Thu lại toàn bộ:' : '+ Thu bổ sung:'}
        </span>
        <span className="font-bold text-amber-500 text-right">
          {deltaAmt >= 0 ? `+${deltaAmt.toLocaleString('vi-VN')}` : deltaAmt.toLocaleString('vi-VN')} đ
        </span>
      </div>
      <div className="flex justify-between gap-2 pt-1 border-t border-dashed border-emerald-700/30 font-extrabold">
        <span>Tổng thanh toán lũy kế:</span>
        <span className="text-right">
          {grandTotal.toLocaleString('vi-VN')} đ (
          {formatIosPaymentMethodLabel({
            grandTotal,
            diamondUsed: booking.billing?.diamondUsed,
            paymentMethod: booking.billing?.paymentMethod,
            paymentBreakdown: booking.billing?.paymentBreakdown,
          })}
          )
        </span>
      </div>
    </div>
  );
}

export interface PostCheckoutAuditTimelineProps {
  booking: BookingItem;
  isDark: boolean;
  showStaffRewards: boolean;
  onOpenSheet?: () => void;
}

function formatViDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

export function PostCheckoutAuditTimeline({
  booking,
  isDark,
  showStaffRewards,
  onOpenSheet,
}: PostCheckoutAuditTimelineProps) {
  const pending = booking.pendingPostCheckoutAdjustment;
  const history = [...(booking.postCheckoutAdjustments || [])].reverse();

  if (!pending && (!showStaffRewards || history.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-2.5 mt-3">
      {pending && (
        <div
          data-testid="post-checkout-pending-banner"
          className={`rounded-2xl border p-3 space-y-2 ${
            isDark
              ? 'bg-amber-950/40 border-amber-700/70 text-amber-100'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[12px] font-black text-amber-500">⏳ Đang chờ Quầy duyệt điều chỉnh gói Combo</span>
            {onOpenSheet && (
              <button
                type="button"
                onClick={onOpenSheet}
                className="px-2.5 py-1 rounded-lg bg-[#FFB400] text-black text-[10.5px] font-black cursor-pointer shrink-0"
              >
                Mở duyệt / Xem chi tiết
              </button>
            )}
          </div>
          <div className="text-[11px] font-semibold tabular-nums flex flex-wrap gap-x-3 gap-y-0.5">
            <span>
              Gửi bởi: <strong>{pending.requestedByStaffName}</strong>
            </span>
            <span>
              Hình thức:{' '}
              <strong>{pending.paymentMode === 'VOID_AND_RECOLLECT' ? 'Hủy & thu lại' : 'Thu bổ sung'}</strong>
            </span>
            <span>
              Cần thu đợt này:{' '}
              <strong className="text-amber-500">{pending.amountToCollectNow.toLocaleString('vi-VN')} đ</strong>
            </span>
          </div>
        </div>
      )}

      {showStaffRewards && history.length > 0 && (
        <div
          data-testid="post-checkout-audit-timeline"
          className={`rounded-2xl border p-3 space-y-2 ${
            isDark ? 'bg-[#18181B] border-neutral-800 text-neutral-100' : 'bg-gray-50 border-gray-200 text-gray-900'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-500">
            <History className="w-3.5 h-3.5" />
            <span>Lịch sử điều chỉnh sau checkout ({history.length})</span>
          </div>
          <div className="space-y-2">
            {history.map((entry) => {
              const badgeCls =
                entry.status === 'APPLIED'
                  ? isDark
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : entry.status === 'REJECTED'
                    ? isDark
                      ? 'bg-rose-950/60 text-rose-300 border-rose-700/60'
                      : 'bg-rose-50 text-rose-800 border-rose-300'
                    : isDark
                      ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                      : 'bg-amber-50 text-amber-800 border-amber-300';

              return (
                <div
                  key={entry.adjustmentId}
                  className={`rounded-xl border p-2.5 text-[11px] space-y-1 tabular-nums ${
                    isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black ${badgeCls}`}
                    >
                      {entry.status === 'APPLIED' ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : entry.status === 'REJECTED' ? (
                        <XCircle className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      <span>
                        {entry.status === 'APPLIED'
                          ? 'Đã kết chuyển'
                          : entry.status === 'REJECTED'
                            ? 'Từ chối'
                            : 'Chờ Quầy duyệt'}
                      </span>
                    </span>
                    <span className="text-[10px] opacity-70">
                      {formatViDateTime(entry.resolvedAt || entry.createdAt)}
                    </span>
                  </div>

                  <div>
                    Gửi: <strong>{entry.requestedByStaffName}</strong>
                    {entry.approvedByStaffName ? (
                      <>
                        {' '}
                        · Xử lý: <strong>{entry.approvedByStaffName}</strong>
                      </>
                    ) : null}
                  </div>

                  {entry.checkOutStaffReplaced && (
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <ArrowRightLeft className="w-3 h-3 shrink-0" />
                      <span>
                        Chuyển Checkout: {entry.previousCheckOutStaffName || 'Cũ'} → {entry.newCheckOutStaffName}
                      </span>
                    </div>
                  )}

                  <div>
                    Combo: <strong>{entry.beforeSnapshot.selectedComboName || 'Làm lẻ'}</strong> →{' '}
                    <strong>{entry.afterSnapshot.selectedComboName || 'Làm lẻ'}</strong> · Chênh lệch:{' '}
                    <strong>
                      {entry.deltaAmount >= 0
                        ? `+${entry.deltaAmount.toLocaleString('vi-VN')}`
                        : entry.deltaAmount.toLocaleString('vi-VN')}{' '}
                      đ
                    </strong>
                  </div>

                  {entry.reason && <div className="opacity-80">Lý do: {entry.reason}</div>}
                  {entry.rejectionReason && <div className="text-rose-400">Lý do từ chối: {entry.rejectionReason}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export interface PostCheckoutTransferProofBoxProps {
  booking: BookingItem;
  isDark: boolean;
  branchCode: string;
}

export function PostCheckoutTransferProofBox({ booking, isDark, branchCode }: PostCheckoutTransferProofBoxProps) {
  if (!booking?.billing?.transferProofPhoto && !booking?.billing?.tipTransferProofPhoto) return null;
  return (
    <div
      className={`${isDark ? 'bg-sky-950/30 border-sky-800' : 'bg-sky-50 border-sky-200'} p-2.5 rounded-xl border flex items-center justify-between gap-3`}
    >
      <div className="space-y-0.5 min-w-0">
        <div className={`text-[11px] font-bold ${isDark ? 'text-sky-300' : 'text-sky-950'} flex items-center gap-1.5`}>
          <span className="text-base leading-none">📸</span>
          <span>
            {booking?.billing?.tipTransferProofPhoto && booking?.billing?.transferProofPhoto
              ? 'Ảnh bill DV & Tiền Tip đối soát (VCB):'
              : 'Ảnh bill chuyển khoản đối soát (VCB):'}
          </span>
        </div>
        <div className={`text-[10px] ${isDark ? 'text-sky-400' : 'text-sky-800'} font-medium truncate`}>
          Mã GD: {branchCode} {booking?.orderNumber?.replace(/\D/g, '') || booking?.id}{' '}
          {booking?.billing?.qrSplitTipSeparate ? 'DV + TIP (Tách 2 QR)' : 'DV TIP...'}
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {booking?.billing?.transferProofPhoto && (
          <img
            src={booking.billing.transferProofPhoto}
            alt="Bill đối soát"
            className={`w-12 h-12 object-cover rounded-lg border ${isDark ? 'border-sky-700' : 'border-sky-300'} shadow-2xs shrink-0 cursor-pointer`}
          />
        )}
        {booking?.billing?.tipTransferProofPhoto && (
          <img
            src={booking.billing.tipTransferProofPhoto}
            alt="Bill Tip đối soát"
            className={`w-12 h-12 object-cover rounded-lg border ${isDark ? 'border-rose-700' : 'border-rose-300'} shadow-2xs shrink-0 cursor-pointer`}
          />
        )}
      </div>
    </div>
  );
}

export interface PostCheckoutDoneCtaButtonProps {
  isDark: boolean;
  isPendingPostAdj: boolean;
  onClick: () => void;
  onOpenTipQr?: () => void;
}

export function PostCheckoutDoneCtaButton({
  isDark,
  isPendingPostAdj,
  onClick,
  onOpenTipQr,
}: PostCheckoutDoneCtaButtonProps) {
  if (isPendingPostAdj) {
    return (
      <button
        type="button"
        data-testid="open-post-checkout-combo-btn"
        onClick={onClick}
        className={`w-full py-3 px-4 rounded-2xl border font-extrabold text-[13.5px] shadow-xs active:scale-98 transition-transform text-center cursor-pointer ${
          isDark ? 'bg-amber-950/60 border-amber-500 text-amber-300' : 'bg-amber-50 border-amber-500 text-amber-900'
        }`}
      >
        ⏳ DUYỆT / XỬ LÝ ĐIỀU CHỈNH GÓI COMBO
      </button>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        data-testid="open-post-checkout-tip-qr-btn"
        onClick={onOpenTipQr || onClick}
        className={`py-3 px-3 rounded-2xl border font-extrabold text-[12.5px] shadow-xs active:scale-98 transition-transform text-center cursor-pointer ${
          isDark ? 'bg-rose-950/40 border-rose-500/70 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800'
        }`}
      >
        ♥ Thêm Tip / QR Tip
      </button>
      <button
        type="button"
        data-testid="open-post-checkout-combo-btn"
        onClick={onClick}
        className={`py-3 px-3 rounded-2xl border font-extrabold text-[12.5px] shadow-xs active:scale-98 transition-transform text-center cursor-pointer ${
          isDark ? 'bg-neutral-900 border-amber-500/70 text-amber-300' : 'bg-white border-amber-500 text-amber-900'
        }`}
      >
        + Điều chỉnh Combo
      </button>
    </div>
  );
}
