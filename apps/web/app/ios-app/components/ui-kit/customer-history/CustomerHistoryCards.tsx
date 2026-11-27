'use client';

import React from 'react';
import { Gem, MapPin, User, Wrench } from 'lucide-react';
import type { IosCustomerDiamondTxnItem, IosCustomerHistoryVisitItem } from '@mos-lab/shared';

const formatVnd = (val: number) => `${Math.round(val || 0).toLocaleString('vi-VN')} đ`;

const getStatusStripeClass = (tone: IosCustomerHistoryVisitItem['statusTone']) => {
  if (tone === 'completed') return 'bg-emerald-500';
  if (tone === 'servicing') return 'bg-cyan-500';
  if (tone === 'canceled') return 'bg-rose-400';
  return 'bg-amber-400';
};

const getStatusBadgeClass = (tone: IosCustomerHistoryVisitItem['statusTone'], isDark: boolean) => {
  if (tone === 'completed') {
    return isDark
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  if (tone === 'servicing') {
    return isDark ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-cyan-50 text-cyan-700 border-cyan-200';
  }
  if (tone === 'canceled') {
    return isDark ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' : 'bg-rose-50 text-rose-700 border-rose-200';
  }
  return isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-700 border-amber-200';
};

export function CustomerHistoryVisitCard({
  item,
  index,
  mode,
  isDark,
  showTip = false,
}: {
  item: IosCustomerHistoryVisitItem;
  index: number;
  mode: 'ALL' | 'PAYMENTS' | 'FIX';
  isDark: boolean;
  showTip?: boolean;
}) {
  const isPaymentMode = mode === 'PAYMENTS';
  return (
    <div
      data-testid={`history-row-${mode}-${item.orderId}`}
      className={`relative overflow-hidden rounded-2xl border p-3.5 pl-4 transition-colors ${
        isDark ? 'border-slate-800 bg-slate-900/75' : 'border-slate-200 bg-white shadow-xs'
      }`}
    >
      <div className={`absolute bottom-0 left-0 top-0 w-1 ${getStatusStripeClass(item.statusTone)}`} />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums leading-none ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {index + 1}
            </span>
            {isPaymentMode ? (
              <span
                className={`text-base font-extrabold tabular-nums ${
                  item.debtAmount > 0
                    ? 'text-rose-500'
                    : item.paidAmount > 0
                      ? isDark
                        ? 'text-emerald-400'
                        : 'text-emerald-600'
                      : isDark
                        ? 'text-slate-300'
                        : 'text-slate-700'
                }`}
              >
                {formatVnd(item.paidAmount)}
              </span>
            ) : (
              <span className={`text-[13px] font-bold leading-snug ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {item.serviceName}
              </span>
            )}
            <span
              className={`inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${getStatusBadgeClass(
                item.statusTone,
                isDark
              )}`}
            >
              {item.statusLabel}
            </span>
            {item.isFixOrder && (
              <span
                className={`inline-flex items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-none ${
                  isDark
                    ? 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                    : 'border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                <Wrench className="h-2.5 w-2.5" />
                FIX
              </span>
            )}
          </div>

          {isPaymentMode && (
            <div className={`mt-1 text-[12px] font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
              {item.serviceName}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {isPaymentMode ? (
            <span
              className={`inline-flex items-center justify-center rounded-lg px-2 py-1 text-[10px] font-semibold leading-none ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {item.paymentMethodLabel}
            </span>
          ) : (
            <>
              {item.diamondEarned > 0 && (
                <span
                  className={`inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums leading-none ${
                    isDark ? 'bg-amber-500/15 text-amber-300' : 'bg-amber-50 text-amber-700'
                  }`}
                >
                  <Gem className="h-2.5 w-2.5" />+{item.diamondEarned}
                </span>
              )}
              {item.diamondUsed > 0 && (
                <span
                  className={`inline-flex items-center justify-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums leading-none ${
                    isDark ? 'bg-rose-500/15 text-rose-300' : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  <Gem className="h-2.5 w-2.5" />-{item.diamondUsed}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {isPaymentMode && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums">
          {item.totalPrice > 0 && (
            <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
              Giá trị đơn:{' '}
              <strong className={isDark ? 'text-slate-200' : 'text-slate-800'}>{formatVnd(item.totalPrice)}</strong>
            </span>
          )}
          {item.discountAmount > 0 && (
            <span className="text-amber-500">Combo/Giảm: -{formatVnd(item.discountAmount)}</span>
          )}
          {item.diamondUsed > 0 && <span className="text-sky-400">Dùng {item.diamondUsed} KC</span>}
          {showTip && item.tipAmount > 0 && <span className="text-emerald-400">Tip: +{formatVnd(item.tipAmount)}</span>}
          {item.debtAmount > 0 && (
            <span className="font-bold text-rose-500">Công nợ: {formatVnd(item.debtAmount)}</span>
          )}
        </div>
      )}

      {item.bookingNote && (
        <div
          data-testid={`history-booking-note-${item.orderId}`}
          className={`mt-1.5 rounded-lg px-2.5 py-1.5 text-[11px] leading-snug whitespace-pre-line break-words ${
            isDark ? 'bg-slate-800/70 text-slate-300' : 'bg-slate-50 text-slate-600'
          }`}
        >
          {item.bookingNote}
        </div>
      )}

      {item.statusTone === 'completed' && item.ccNote && item.ccNote.trim() !== '' && (
        <div
          data-testid={`history-cc-note-${item.orderId}`}
          className={`mt-1.5 rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed ${
            isDark
              ? 'border-indigo-500/30 bg-indigo-950/35 text-slate-200'
              : 'border-indigo-200/80 bg-indigo-50/75 text-slate-700'
          }`}
        >
          <div className="mb-1 flex flex-wrap items-center justify-between gap-1.5">
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                isDark ? 'bg-indigo-500/25 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
              }`}
            >
              Ghi chú CC / Tư vấn viên
            </span>
            {item.ccNoteStaffName && (
              <span className={`text-[10px] font-medium ${isDark ? 'text-indigo-300/80' : 'text-indigo-700/80'}`}>
                {item.ccNoteStaffName}
              </span>
            )}
          </div>
          <div className="whitespace-pre-line break-words touch-pan-y select-text">{item.ccNote}</div>
        </div>
      )}

      <div
        className={`mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] tabular-nums ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-semibold ${item.daysAgoLabel === 'Hôm Nay' ? 'text-emerald-500' : ''}`}>
            {item.daysAgoLabel || item.dateDisplay}
          </span>
          <span>·</span>
          <span>
            {item.timeDisplay} {item.dateDisplay}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none ${
              isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
            }`}
          >
            <MapPin className="h-2.5 w-2.5" />
            {item.branchName}
          </span>
        </div>

        {(item.staffAvatars?.length || item.staffNames.length > 0) && (
          <div className="flex items-center gap-1.5 text-[11px] font-medium min-w-0">
            {item.staffAvatars && item.staffAvatars.length > 0 ? (
              <div className="flex -space-x-1.5 shrink-0">
                {item.staffAvatars.slice(0, 3).map((st) => (
                  <div
                    key={st.id}
                    title={st.name}
                    className={`h-4 w-4 rounded-full overflow-hidden border flex items-center justify-center text-[8px] font-bold ${
                      isDark
                        ? 'border-slate-700 bg-slate-800 text-slate-200'
                        : 'border-white bg-slate-200 text-slate-700'
                    }`}
                  >
                    {st.avatar ? (
                      <img
                        src={st.avatar}
                        alt={st.name}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{st.name.trim().slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <User className="h-3 w-3 opacity-70 shrink-0" />
            )}
            <span className="truncate max-w-[160px]">{item.staffNames.join(', ')}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CustomerHistoryDiamondCard({ tx, isDark }: { tx: IosCustomerDiamondTxnItem; isDark: boolean }) {
  const isEarn = tx.amount > 0;
  return (
    <div
      data-testid={`history-row-REWARDS-${tx.id}`}
      className={`flex items-start justify-between gap-3 rounded-2xl border p-3.5 ${
        isDark ? 'border-slate-800 bg-slate-900/75' : 'border-slate-200 bg-white shadow-xs'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Gem className={`h-4 w-4 shrink-0 ${isEarn ? 'text-emerald-400' : 'text-amber-400'}`} />
          <span
            className={`text-sm font-extrabold tabular-nums ${
              isEarn ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : 'text-rose-500'
            }`}
          >
            {isEarn ? `+${tx.amount}` : tx.amount} Kim Cương
          </span>
          {tx.orderId && (
            <span
              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
            >
              #{tx.orderId}
            </span>
          )}
        </div>
        {tx.note && (
          <p className={`mt-1 text-xs leading-snug ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{tx.note}</p>
        )}
        <div
          className={`mt-1.5 flex items-center gap-2 text-[11px] tabular-nums ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
        >
          <span>{tx.daysAgoLabel || tx.dateDisplay}</span>
          <span>·</span>
          <span>
            {tx.timeDisplay} {tx.dateDisplay}
          </span>
          {tx.branchName && (
            <>
              <span>·</span>
              <span>{tx.branchName}</span>
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right tabular-nums">
        <div className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Số dư sau GD</div>
        <div className={`text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>{tx.balanceAfter} KC</div>
      </div>
    </div>
  );
}
