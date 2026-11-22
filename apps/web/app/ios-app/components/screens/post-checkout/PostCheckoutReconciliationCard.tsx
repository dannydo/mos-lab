'use client';

import React from 'react';
import {
  formatIosPaymentMethodLabel,
  type ActorTipBreakdown,
  type ComputePostCheckoutFinancialDeltaResult,
  type IosCheckoutStaffOption,
  type IosPaymentBreakdown,
  type IosPaymentMethod,
  type IosPostCheckoutPaymentMode,
  type IosPostCheckoutPendingDraft,
} from '@mos-lab/shared';
import { CheckCircle2, Clock, QrCode, RefreshCw, ShieldCheck } from 'lucide-react';
import { CvFeather1Badge, CvFeather2Badge } from '../../ui-kit/CvFeatherLabels';

export interface PostCheckoutPendingPanelProps {
  isDark: boolean;
  pending: IosPostCheckoutPendingDraft;
  canApproveCounter: boolean;
  isRequester: boolean;
  isSubmitting: boolean;
  rejectionReason: string;
  onChangeRejectionReason: (val: string) => void;
  onApprove: () => void;
  onReject: (customReason?: string) => void;
}

export function PostCheckoutPendingPanel({
  isDark,
  pending,
  canApproveCounter,
  isRequester,
  isSubmitting,
  rejectionReason,
  onChangeRejectionReason,
  onApprove,
  onReject,
}: PostCheckoutPendingPanelProps) {
  return (
    <div className="space-y-3" data-testid="post-checkout-pending-approval-panel">
      <div
        className={`rounded-2xl border p-3.5 space-y-2.5 ${
          isDark ? 'bg-amber-950/30 border-amber-700/60' : 'bg-amber-50 border-amber-300'
        }`}
      >
        <div className="flex items-center gap-2 text-amber-500 text-[12px] font-black uppercase">
          <Clock className="w-4 h-4" />
          <span>Yêu cầu Chờ Quầy duyệt</span>
        </div>
        <div className="text-[12px] space-y-1 tabular-nums">
          <div>
            Người gửi: <strong>{pending.requestedByStaffName}</strong> ({pending.requestedByStaffTier})
          </div>
          <div>
            Phương thức:{' '}
            <strong>
              {pending.paymentMode === 'VOID_AND_RECOLLECT' ? 'Hủy thanh toán cũ & thu lại' : 'Thu bổ sung chênh lệch'}
            </strong>
          </div>
          <div>
            Checkout nhận thưởng: <strong>{pending.targetCheckOutStaffName}</strong> ({pending.targetCheckOutStaffTier})
          </div>
          <div>
            Tổng trước: <strong>{pending.beforeSnapshot.grandTotal.toLocaleString('vi-VN')} đ</strong> → Tổng mới:{' '}
            <strong>{pending.afterSnapshot.grandTotal.toLocaleString('vi-VN')} đ</strong>
          </div>
          <div>
            Cần thu đợt này:{' '}
            <strong className="text-amber-500">{pending.amountToCollectNow.toLocaleString('vi-VN')} đ</strong> (
            {formatIosPaymentMethodLabel({
              grandTotal: pending.amountToCollectNow,
              paymentMethod: pending.deltaPaymentMethod,
              paymentBreakdown: pending.deltaPaymentBreakdown,
            })}
            )
          </div>
          <div>
            Tổng sau gộp:{' '}
            <strong>
              {formatIosPaymentMethodLabel({
                grandTotal: pending.afterSnapshot.grandTotal,
                paymentMethod: pending.combinedPaymentMethod,
                paymentBreakdown: pending.combinedPaymentBreakdown,
              })}
            </strong>
          </div>
          {pending.reason && (
            <div>
              Lý do: <em>{pending.reason}</em>
            </div>
          )}
        </div>
      </div>

      {canApproveCounter ? (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Lý do nếu từ chối yêu cầu (tùy chọn)..."
            value={rejectionReason}
            onChange={(e) => onChangeRejectionReason(e.target.value)}
            className={`w-full px-3 py-2 rounded-xl border text-[12px] ${
              isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onReject()}
              className="py-2.5 rounded-xl border border-rose-500/60 text-rose-500 font-extrabold text-[12px] cursor-pointer disabled:opacity-50"
            >
              TỪ CHỐI YÊU CẦU
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onApprove}
              className="py-2.5 rounded-xl bg-emerald-500 text-black font-black text-[12px] cursor-pointer disabled:opacity-50"
            >
              XÁC NHẬN DUYỆT &amp; KẾT CHUYỂN
            </button>
          </div>
        </div>
      ) : isRequester ? (
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onReject('Nhân viên tự hủy yêu cầu điều chỉnh')}
          className="w-full py-2.5 rounded-xl border border-rose-500/60 text-rose-400 font-extrabold text-[12px] cursor-pointer disabled:opacity-50"
        >
          HỦY YÊU CẦU ĐANG CHỜ
        </button>
      ) : null}
    </div>
  );
}

export interface PostCheckoutReconciliationCardProps {
  isDark: boolean;
  previousPaidTotal: number;
  newGrandTotal: number;
  delta: ComputePostCheckoutFinancialDeltaResult;
  deltaMethod: IosPaymentMethod;
  deltaSplit: IosPaymentBreakdown;
  reason: string;
  showStaffRewards: boolean;
  selectedStaff?: IosCheckoutStaffOption;
  originalCheckOutStaffName: string;
  isCheckoutCc: boolean;
  dualComboBonusTotal: number;
  serumBonusPreview: number;
  tipAmount: number;
  tipBreakdown: ActorTipBreakdown;
  isSubmitting: boolean;
  onSetPaymentMode: (mode: IosPostCheckoutPaymentMode) => void;
  onSetDeltaMethod: (method: IosPaymentMethod) => void;
  onSetDeltaSplit: React.Dispatch<React.SetStateAction<IosPaymentBreakdown>>;
  onSetReason: (val: string) => void;
  onSubmit: () => void;
  onOpenQr?: () => void;
  qrPortionAmount?: number;
  isPureTipDelta?: boolean;
  hasQrProofAttached?: boolean;
}

export function PostCheckoutReconciliationCard({
  isDark,
  previousPaidTotal,
  newGrandTotal,
  delta,
  deltaMethod,
  deltaSplit,
  reason,
  showStaffRewards,
  selectedStaff,
  originalCheckOutStaffName,
  isCheckoutCc,
  dualComboBonusTotal,
  serumBonusPreview,
  tipAmount,
  tipBreakdown,
  isSubmitting,
  onSetPaymentMode,
  onSetDeltaMethod,
  onSetDeltaSplit,
  onSetReason,
  onSubmit,
  onOpenQr,
  qrPortionAmount = 0,
  isPureTipDelta = false,
  hasQrProofAttached = false,
}: PostCheckoutReconciliationCardProps) {
  return (
    <>
      <div
        className={`rounded-2xl border p-3 space-y-2.5 ${
          isDark ? 'bg-[#1C1C1E] border-neutral-800' : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div className="text-[11px] font-black uppercase tracking-wider text-emerald-500">4. Đối Soát Thanh Toán</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={newGrandTotal < previousPaidTotal}
            onClick={() => onSetPaymentMode('TOP_UP')}
            className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold text-left cursor-pointer disabled:opacity-40 ${
              delta.effectiveMode === 'TOP_UP'
                ? isDark
                  ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-500 text-emerald-900'
                : isDark
                  ? 'bg-neutral-900 border-neutral-700 text-neutral-400'
                  : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            Thu bổ sung chênh lệch
          </button>
          <button
            type="button"
            onClick={() => onSetPaymentMode('VOID_AND_RECOLLECT')}
            className={`px-2.5 py-2 rounded-xl border text-[11px] font-bold text-left cursor-pointer ${
              delta.effectiveMode === 'VOID_AND_RECOLLECT'
                ? isDark
                  ? 'bg-amber-950/60 border-amber-400 text-amber-200'
                  : 'bg-amber-50 border-amber-500 text-amber-900'
                : isDark
                  ? 'bg-neutral-900 border-neutral-700 text-neutral-400'
                  : 'bg-white border-gray-200 text-gray-600'
            }`}
          >
            Hủy bill cũ &amp; thu lại từ đầu
          </button>
        </div>

        <div className="space-y-1 text-[12px] tabular-nums">
          <div className="flex justify-between">
            <span className={isDark ? 'text-neutral-400' : 'text-gray-600'}>Đã thu trước đó:</span>
            <strong>{previousPaidTotal.toLocaleString('vi-VN')} đ</strong>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? 'text-neutral-400' : 'text-gray-600'}>Tổng đơn mới (gồm VAT 8% + Tip):</span>
            <strong>{newGrandTotal.toLocaleString('vi-VN')} đ</strong>
          </div>
          <div className="flex justify-between text-[13px] pt-1 border-t border-dashed border-neutral-700/40">
            <span className="font-extrabold">Cần thu ngay đợt này:</span>
            <strong className="text-amber-500" data-testid="post-checkout-collect-now">
              {delta.amountToCollectNow.toLocaleString('vi-VN')} đ
            </strong>
          </div>
        </div>

        {delta.amountToCollectNow > 0 && (
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-4 gap-1.5">
              {(['VIETQR', 'POS', 'CASH', 'MIXED'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`post-checkout-method-${m}`}
                  onClick={() => {
                    onSetDeltaMethod(m);
                    if (m === 'MIXED' && deltaSplit.vietqrAmount + deltaSplit.posAmount + deltaSplit.cashAmount === 0) {
                      onSetDeltaSplit({ vietqrAmount: delta.amountToCollectNow, posAmount: 0, cashAmount: 0 });
                    }
                  }}
                  className={`py-1.5 rounded-lg border text-[10.5px] font-extrabold cursor-pointer ${
                    deltaMethod === m
                      ? 'bg-[#FFB400] border-[#FFB400] text-black'
                      : isDark
                        ? 'bg-neutral-900 border-neutral-700 text-neutral-300'
                        : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  {m === 'MIXED' ? 'Kết hợp' : m === 'VIETQR' ? 'VietQR' : m}
                </button>
              ))}
            </div>
            {deltaMethod === 'MIXED' && (
              <div className="grid grid-cols-3 gap-1.5 text-[10.5px] tabular-nums">
                {(['vietqrAmount', 'posAmount', 'cashAmount'] as const).map((k) => (
                  <label key={k} className="space-y-0.5 block">
                    <span className="opacity-75 font-bold">
                      {k === 'vietqrAmount' ? 'VietQR' : k === 'posAmount' ? 'POS' : 'Tiền mặt'}
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={deltaSplit[k]}
                      onChange={(e) =>
                        onSetDeltaSplit((prev) => ({
                          ...prev,
                          [k]: Math.max(0, Math.round(Number(e.target.value) || 0)),
                        }))
                      }
                      className={`w-full px-2 py-1 rounded-lg border text-right font-bold tabular-nums ${
                        isDark
                          ? 'bg-neutral-900 border-neutral-700 text-neutral-100'
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <textarea
            rows={2}
            placeholder={
              delta.requiresReason
                ? 'Bắt buộc nhập lý do hủy / giảm tiền đơn đã hoàn tất...'
                : 'Ghi chú điều chỉnh (tùy chọn)...'
            }
            value={reason}
            onChange={(e) => onSetReason(e.target.value)}
            className={`w-full px-2.5 py-1.5 rounded-xl border text-[11.5px] ${
              isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-100' : 'bg-white border-gray-300 text-gray-900'
            }`}
          />
          {delta.requiresReason && (
            <div className="text-[10px] font-semibold text-amber-500">
              Đơn đã Hoàn tất ở Legacy/POS: hủy thanh toán cũ hoặc giảm tổng đơn bắt buộc có lý do đối soát.
            </div>
          )}
        </div>

        <div
          className={`rounded-xl px-2.5 py-1.5 text-[10.5px] font-semibold flex items-center gap-1.5 ${
            delta.requiresCounterApproval
              ? isDark
                ? 'bg-amber-950/40 text-amber-300'
                : 'bg-amber-50 text-amber-900'
              : isDark
                ? 'bg-emerald-950/40 text-emerald-300'
                : 'bg-emerald-50 text-emerald-800'
          }`}
        >
          {delta.requiresCounterApproval ? (
            <Clock className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          )}
          <span>
            {delta.requiresCounterApproval
              ? 'Yêu cầu sẽ chuyển sang Chờ Quầy (CC/Admin) duyệt trước khi kết chuyển Legacy.'
              : 'Kết chuyển & đồng bộ hóa đơn ngay lập tức.'}
          </span>
        </div>
      </div>

      {showStaffRewards && (
        <div
          data-testid="post-checkout-rewards-preview"
          className={`rounded-2xl border p-3 text-[11.5px] space-y-1.5 tabular-nums ${
            isDark
              ? 'bg-indigo-950/30 border-indigo-700/60 text-indigo-100'
              : 'bg-indigo-50 border-indigo-200 text-indigo-950'
          }`}
        >
          <div className="font-black uppercase text-[10.5px] tracking-wider flex items-center gap-1.5">
            <span>Thưởng Checkout dự kiến · {selectedStaff?.name || originalCheckOutStaffName}</span>
            {selectedStaff?.tier === 'CVL' ? (
              <CvFeather1Badge />
            ) : selectedStaff?.tier === 'CVLL' ? (
              <CvFeather2Badge />
            ) : (
              <span>(CC)</span>
            )}
          </div>
          <div className="flex justify-between">
            <span>Thưởng Gói Combo:</span>
            <strong>{isCheckoutCc ? '0 đ (Tích điểm CC)' : `+${dualComboBonusTotal.toLocaleString('vi-VN')} đ`}</strong>
          </div>
          <div className="flex justify-between">
            <span>Thưởng Dưỡng Mi:</span>
            <strong>{isCheckoutCc ? '0 đ (Tích điểm CC)' : `+${serumBonusPreview.toLocaleString('vi-VN')} đ`}</strong>
          </div>
          <div className="flex justify-between">
            <span>Tip Checkout (10%):</span>
            <strong>+{Math.round(tipAmount * 0.1).toLocaleString('vi-VN')} đ</strong>
          </div>
          <div className="text-[10px] opacity-80">
            Chia Tip 70/10/10: Làm mi {tipBreakdown.techStaffName} · In {tipBreakdown.checkInStaffName} · Out{' '}
            {tipBreakdown.checkOutStaffName}
          </div>
        </div>
      )}

      {delta.amountToCollectNow > 0 && qrPortionAmount > 0 && onOpenQr && (
        <button
          type="button"
          data-testid="post-checkout-open-qr-btn"
          onClick={onOpenQr}
          className={`w-full py-2.5 px-3 rounded-2xl border font-extrabold text-[12.5px] flex items-center justify-center gap-2 cursor-pointer transition-all ${
            hasQrProofAttached
              ? isDark
                ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                : 'bg-emerald-50 border-emerald-500 text-emerald-800'
              : isDark
                ? 'bg-sky-950/40 border-sky-500/70 text-sky-300 hover:bg-sky-900/50'
                : 'bg-sky-50 border-sky-400 text-sky-900 hover:bg-sky-100'
          }`}
        >
          <QrCode className="w-4 h-4 shrink-0" />
          <span>
            {hasQrProofAttached
              ? `✓ Đã có bill QR (${qrPortionAmount.toLocaleString('vi-VN')}đ) · Xem lại QR`
              : isPureTipDelta
                ? `Mở Mã QR Tiền Tip (${qrPortionAmount.toLocaleString('vi-VN')}đ)`
                : `Mở Mã QR Thu Bổ Sung (${qrPortionAmount.toLocaleString('vi-VN')}đ)`}
          </span>
        </button>
      )}

      <button
        type="button"
        data-testid="post-checkout-submit-btn"
        disabled={isSubmitting}
        onClick={onSubmit}
        className="w-full py-3 rounded-2xl bg-[#FFB400] text-black font-black text-[13.5px] shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
      >
        {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        <span>{delta.requiresCounterApproval ? 'GỬI QUẦY DUYỆT ĐIỀU CHỈNH' : 'XÁC NHẬN CẬP NHẬT & KẾT CHUYỂN'}</span>
      </button>
    </>
  );
}
