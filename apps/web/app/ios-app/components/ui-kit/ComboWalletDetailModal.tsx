'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  evaluateComboWalletStatus,
  formatExpiryDateDdMmYyyy,
  type IosAdminComboExpiryAction,
  type IosBookingItem,
  type IosCustomerComboWalletItem,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { ComboSessionBadge } from './ComboSessionBadge';
import { AlertTriangle, CalendarClock, CheckCircle2, Lock, ShieldCheck, Snowflake, Sparkles, X } from 'lucide-react';

export interface ComboWalletDetailModalProps {
  booking: IosBookingItem | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  theme?: 'dark' | 'light';
  onUpdated?: () => Promise<void> | void;
}

export function resolveBookingComboWallets(booking: IosBookingItem | null): IosCustomerComboWalletItem[] {
  if (!booking) return [];
  if (Array.isArray(booking.comboWallets) && booking.comboWallets.length > 0) {
    return booking.comboWallets.map((w) => {
      const combined = `${w.comboName || ''} ${w.serviceKey || ''}`.toLowerCase();
      const isUnder =
        w.serviceGroup === 'under' ||
        combined.includes('under') ||
        combined.includes('mi dưới') ||
        combined.includes('flawless.mink-390') ||
        combined.includes('flawless-mink-390');
      return isUnder && w.serviceGroup !== 'under' ? { ...w, serviceGroup: 'under' } : w;
    });
  }

  const wallets: IosCustomerComboWalletItem[] = [];
  const upper = booking.comboLiveStatus;
  if (upper && (upper.remainingSessions > 0 || upper.isExpired || upper.isComboLive)) {
    const evalUpper = evaluateComboWalletStatus({
      normalRemaining: upper.normalRemaining,
      retainRemaining: upper.retainRemaining,
      remainingSessions: upper.remainingSessions,
      dateExpired: upper.isFrozen ? null : upper.dateExpired,
    });
    wallets.push({
      balanceId: Number(upper.balanceId || booking.customerId || booking.id || 1),
      serviceGroup: 'upper',
      comboName: upper.comboName || 'Gói Combo Mi Trên',
      serviceKey: upper.serviceKey,
      packageKey: upper.packageKey,
      normalRemaining: Number(upper.normalRemaining ?? Math.floor(upper.remainingSessions / 2)),
      retainRemaining:
        upper.retainRemaining !== undefined
          ? Number(upper.retainRemaining)
          : Math.max(0, upper.remainingSessions - Math.floor(upper.remainingSessions / 2)),
      remainingSessions: Number(upper.remainingSessions || 0),
      dateExpired: upper.isFrozen ? null : (upper.dateExpired ?? evalUpper.dateExpired),
      isFrozen: Boolean(upper.isFrozen ?? evalUpper.isFrozen),
      isExpired: Boolean(upper.isExpired ?? evalUpper.isExpired),
      isExpiringSoon: Boolean(upper.isExpiringSoon ?? evalUpper.isExpiringSoon),
      daysRemaining: upper.daysRemaining !== undefined ? upper.daysRemaining : evalUpper.daysRemaining,
      avgDaysPerSession: upper.avgDaysPerSession !== undefined ? upper.avgDaysPerSession : evalUpper.avgDaysPerSession,
      expiryState: upper.expiryState || evalUpper.expiryState,
      retainDaysLimit: upper.retainDaysLimit ?? 25,
    });
  }

  const under = booking.underMinkComboStatus;
  if (under && (under.remainingSessions > 0 || under.isExpired || under.hasUnderCombo)) {
    const evalUnder = evaluateComboWalletStatus({
      normalRemaining: under.normalRemaining,
      retainRemaining: under.retainRemaining,
      remainingSessions: under.remainingSessions,
      dateExpired: under.isFrozen ? null : under.dateExpired,
    });
    wallets.push({
      balanceId: Number(under.balanceId || Number(booking.customerId || booking.id || 1) + 100000),
      serviceGroup: 'under',
      comboName: under.comboName || 'Gói Combo Mi Dưới',
      packageKey: under.packageKey,
      normalRemaining: Number(under.normalRemaining || 0),
      retainRemaining: Number(under.retainRemaining || 0),
      remainingSessions: Number(under.remainingSessions || 0),
      dateExpired: under.isFrozen ? null : (under.dateExpired ?? evalUnder.dateExpired),
      isFrozen: Boolean(under.isFrozen ?? evalUnder.isFrozen),
      isExpired: Boolean(under.isExpired ?? evalUnder.isExpired),
      isExpiringSoon: Boolean(under.isExpiringSoon ?? evalUnder.isExpiringSoon),
      daysRemaining: under.daysRemaining !== undefined ? under.daysRemaining : evalUnder.daysRemaining,
      avgDaysPerSession: under.avgDaysPerSession !== undefined ? under.avgDaysPerSession : evalUnder.avgDaysPerSession,
      expiryState: under.expiryState || evalUnder.expiryState,
    });
  }

  return wallets;
}

export function ComboWalletDetailModal({
  booking,
  isOpen,
  onClose,
  isAdmin = false,
  theme = 'dark',
  onUpdated,
}: ComboWalletDetailModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const isDark = theme === 'dark';

  const wallets = useMemo(() => resolveBookingComboWallets(booking), [booking]);
  const [customDateByBalance, setCustomDateByBalance] = useState<Record<number, string>>({});
  const [reasonDraft, setReasonDraft] = useState<string>('Admin hỗ trợ gia hạn theo yêu cầu khách hàng');
  const [submittingBalanceId, setSubmittingBalanceId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setFeedbackMsg(null);
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (typeof dialog.showModal === 'function') {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          dialog.setAttribute('open', '');
        }
      }
    } else {
      dialog.setAttribute('open', '');
    }

    // Light-dismiss coordinate fallback when `closedBy` is unsupported (e.g. Safari)
    const supportsClosedBy = typeof HTMLDialogElement !== 'undefined' && 'closedBy' in HTMLDialogElement.prototype;
    const handleBackdropClick = (event: MouseEvent) => {
      if (supportsClosedBy) return;
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        onClose();
        return;
      }
      const clickedOutside =
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom;
      if (clickedOutside) {
        onClose();
      }
    };

    dialog.addEventListener('click', handleBackdropClick);
    return () => {
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !booking) return null;

  const handleAdminAction = async (
    wallet: IosCustomerComboWalletItem,
    action: IosAdminComboExpiryAction,
    opts?: { extendDays?: number; targetDateExpired?: string }
  ) => {
    const cleanReason = reasonDraft.trim();
    if (!cleanReason) {
      setFeedbackMsg({ type: 'err', text: 'Vui lòng nhập lý do điều chỉnh hạn sử dụng để lưu nhật ký.' });
      return;
    }
    setSubmittingBalanceId(wallet.balanceId);
    setFeedbackMsg(null);
    try {
      const res = await apiClient.ios.updateComboBalanceExpiry({
        action,
        balanceId: wallet.balanceId,
        customerId: booking.customerId,
        bookingId: booking.id,
        serviceGroup: wallet.serviceGroup,
        extendDays: opts?.extendDays,
        targetDateExpired: opts?.targetDateExpired,
        reason: cleanReason,
      });
      if (!res.success) {
        setFeedbackMsg({ type: 'err', text: res.error || 'Không thể cập nhật hạn sử dụng gói Combo.' });
        return;
      }
      const nextDisplay = res.isFrozen
        ? 'Đang bảo lưu (Chưa kích hoạt)'
        : formatExpiryDateDdMmYyyy(res.dateExpired) || 'Đã cập nhật';
      setFeedbackMsg({
        type: 'ok',
        text: res.message || `Đã cập nhật HSD thành công: ${nextDisplay}`,
      });
      await onUpdated?.();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'err',
        text: err?.response?.data?.error || err?.message || 'Lỗi kết nối máy chủ khi cập nhật HSD.',
      });
    } finally {
      setSubmittingBalanceId(null);
    }
  };

  const dialogSurface = isDark
    ? 'bg-[#1C1C1E] text-white border border-neutral-700/90'
    : 'bg-white text-neutral-900 border border-neutral-200';
  const cardSurface = isDark ? 'bg-[#252528] border border-neutral-800' : 'bg-neutral-50 border border-neutral-200';

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      {...({ closedby: 'any' } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      style={{ colorScheme: isDark ? 'dark' : 'light' }}
      className={`m-auto w-[calc(100%-24px)] max-w-[420px] max-h-[86vh] rounded-3xl p-0 shadow-2xl overflow-hidden overscroll-contain backdrop:bg-black/75 backdrop:backdrop-blur-xs open:flex open:flex-col ${dialogSurface}`}
    >
      {/* Header: Title left, Close [X] top-right (UI Invariant) */}
      <div
        className={`px-4 py-3.5 flex items-center justify-between gap-3 shrink-0 border-b ${
          isDark ? 'border-neutral-800 bg-[#252528]' : 'border-neutral-200 bg-neutral-50'
        }`}
      >
        <div className="min-w-0">
          <h3 id={titleId} className="text-[15px] font-black tracking-tight truncate flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Gói Combo & Hạn Sử Dụng</span>
          </h3>
          <p
            className={`text-[11.5px] mt-0.5 truncate tabular-nums ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}
          >
            {booking.customerName} · {(booking.customerPhone || '').replace(/\*+\s*/g, '').trim()}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng chi tiết gói combo"
          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-95 ${
            isDark
              ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
              : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-800'
          }`}
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3.5 text-left">
        {feedbackMsg && (
          <div
            className={`rounded-xl px-3 py-2 text-[11.5px] font-bold flex items-start gap-2 ${
              feedbackMsg.type === 'ok'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/15 border border-rose-500/40 text-rose-300'
            }`}
          >
            {feedbackMsg.type === 'ok' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {wallets.length === 0 ? (
          <div className={`rounded-2xl p-5 text-center text-[12.5px] ${cardSurface}`}>
            Khách hàng hiện chưa có gói Combo nào đang lưu trên hệ thống.
          </div>
        ) : (
          wallets.map((w) => {
            const expiryDisplay = formatExpiryDateDdMmYyyy(w.dateExpired);
            const customDateVal = customDateByBalance[w.balanceId] ?? (w.dateExpired || '');
            const isSubmitting = submittingBalanceId === w.balanceId;

            return (
              <div key={`${w.serviceGroup}-${w.balanceId}`} className={`rounded-2xl p-3.5 space-y-2.5 ${cardSurface}`}>
                {/* Row 1: Category + Sessions */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center justify-center leading-none py-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      w.serviceGroup === 'under'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    }`}
                  >
                    {w.serviceGroup === 'under' ? 'Combo Mi Dưới' : 'Combo Mi Trên'}
                  </span>
                  <ComboSessionBadge
                    normalRemaining={w.normalRemaining}
                    retainRemaining={w.retainRemaining}
                    remainingSessions={w.remainingSessions}
                    comboName={w.comboName}
                    variant="expanded"
                    size="xs"
                    theme={theme}
                  />
                </div>

                {/* Row 2: Combo Name */}
                <div className="text-[13.5px] font-extrabold leading-snug">{w.comboName}</div>

                {/* Row 3: HSD + Pace `(Avg: X.X ngày/buổi)` matching Legacy iOS App */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5 tabular-nums">
                  {w.isExpired ? (
                    <span className="inline-flex items-center justify-center gap-1.5 leading-none py-1.5 px-2.5 rounded-lg bg-rose-600 text-white font-black text-[11.5px] shadow-xs">
                      <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                      <span>HSD: {expiryDisplay || 'Quá hạn'} · ĐÃ HẾT HẠN</span>
                    </span>
                  ) : w.isFrozen ? (
                    <span className="inline-flex items-center justify-center gap-1.5 leading-none py-1.5 px-2.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 font-black text-[11.5px]">
                      <Snowflake className="w-3.5 h-3.5 shrink-0" />
                      <span>Đang bảo lưu (Chưa kích hoạt HSD)</span>
                    </span>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center justify-center gap-1.5 leading-none py-1.5 px-2.5 rounded-lg font-black text-[11.5px] border ${
                          w.isExpiringSoon
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                            : isDark
                              ? 'bg-[#1C1C1E] text-emerald-300 border-emerald-500/40'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        }`}
                      >
                        <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                        <span>HSD: {expiryDisplay || '—'}</span>
                      </span>
                      {typeof w.avgDaysPerSession === 'number' && (
                        <span className={`text-[11.5px] font-bold ${isDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                          (Avg: {w.avgDaysPerSession} ngày/buổi)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Expired Revival Rule Callout */}
                {w.isExpired && (
                  <div className="rounded-xl bg-rose-950/50 border border-rose-500/40 p-2.5 text-[11px] text-rose-200 space-y-1">
                    <div className="font-extrabold flex items-center gap-1 text-rose-300">
                      <Lock className="w-3 h-3 shrink-0" />
                      <span>Đã khóa trừ buổi 0đ (Khách đi lẻ hoặc dùng Voucher hôm nay)</span>
                    </div>
                    <p className="leading-relaxed text-rose-200/90">
                      Khi khách mua thêm gói Combo mới hôm nay: tự động{' '}
                      <strong>cứu toàn bộ {w.remainingSessions} buổi tồn</strong> và quy đổi cộng dồn từ hôm nay theo{' '}
                      <strong>Nối mới +1 tháng/buổi</strong> · <strong>Dặm +25 ngày/buổi</strong>.
                    </p>
                  </div>
                )}

                {w.note && (
                  <div
                    className={`text-[11px] rounded-lg p-2 ${isDark ? 'bg-[#1C1C1E] text-neutral-300' : 'bg-white text-neutral-700'}`}
                  >
                    Ghi chú: {w.note}
                  </div>
                )}

                {/* Admin-Only Controls (Zero-Trust: Ẩn tuyệt đối với CV / CVL / CVLL / CC) */}
                {isAdmin && (
                  <div className="pt-2.5 mt-1 border-t border-amber-500/25 space-y-2">
                    <div className="flex items-center justify-between text-[10.5px] font-black uppercase tracking-wider text-amber-400">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>Quyền Admin · Gia hạn & Bảo lưu</span>
                      </span>
                      <span className="text-[10px] font-semibold text-neutral-400 tabular-nums">ID #{w.balanceId}</span>
                    </div>

                    <input
                      type="text"
                      value={reasonDraft}
                      onChange={(e) => setReasonDraft(e.target.value)}
                      placeholder="Nhập lý do gia hạn / bảo lưu..."
                      style={{ colorScheme: isDark ? 'dark' : 'light' }}
                      className={`w-full rounded-xl px-2.5 py-1.5 text-[11.5px] border outline-none ${
                        isDark
                          ? 'bg-[#1C1C1E] border-neutral-700 text-white focus:border-amber-400'
                          : 'bg-white border-neutral-300 text-neutral-900 focus:border-amber-500'
                      }`}
                    />

                    {/* Quick Add Days + Freeze/Unfreeze */}
                    <div className="flex items-center gap-1.5 flex-wrap tabular-nums">
                      {[15, 30, 60].map((days) => (
                        <button
                          key={days}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleAdminAction(w, 'ADD_DAYS', { extendDays: days })}
                          className="py-1.5 px-2.5 rounded-lg bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 text-amber-300 text-[11px] font-extrabold cursor-pointer disabled:opacity-50"
                        >
                          +{days}N
                        </button>
                      ))}

                      {w.isFrozen ? (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleAdminAction(w, 'UNFREEZE', { extendDays: 90 })}
                          className="py-1.5 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-[11px] font-extrabold cursor-pointer disabled:opacity-50"
                        >
                          Kích hoạt lại (+90N)
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleAdminAction(w, 'FREEZE')}
                          className="py-1.5 px-2.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-[11px] font-extrabold cursor-pointer disabled:opacity-50"
                        >
                          Bảo lưu (Đóng băng)
                        </button>
                      )}
                    </div>

                    {/* Exact Date Picker */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        aria-label={`Chọn ngày hết hạn mới cho ${w.comboName}`}
                        value={customDateVal}
                        onChange={(e) =>
                          setCustomDateByBalance((prev) => ({
                            ...prev,
                            [w.balanceId]: e.target.value,
                          }))
                        }
                        style={{ colorScheme: isDark ? 'dark' : 'light' }}
                        className={`flex-1 rounded-xl px-2.5 py-1.5 text-[11.5px] tabular-nums border outline-none ${
                          isDark
                            ? 'bg-[#1C1C1E] border-neutral-700 text-white focus:border-amber-400'
                            : 'bg-white border-neutral-300 text-neutral-900 focus:border-amber-500'
                        }`}
                      />
                      <button
                        type="button"
                        disabled={isSubmitting || !customDateVal}
                        onClick={() => handleAdminAction(w, 'EXTEND_DATE', { targetDateExpired: customDateVal })}
                        className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-[11.5px] font-black cursor-pointer disabled:opacity-50 shrink-0"
                      >
                        {isSubmitting ? 'Đang lưu...' : 'Lưu HSD'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </dialog>
  );
}
