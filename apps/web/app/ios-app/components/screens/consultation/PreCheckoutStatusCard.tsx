'use client';

import React, { useState } from 'react';
import { computePreCheckoutPaymentSummary } from '@mos-lab/shared';
import { CheckCircle2, QrCode } from 'lucide-react';
import type { BookingItem } from '../../../state/mockData';
import { PreCheckoutPaymentModal, type SavePreCheckoutPaymentPayload } from '../../modals/PreCheckoutPaymentModal';

export interface PreCheckoutStatusCardProps {
  isDark: boolean;
  booking?: BookingItem;
  quotedServiceTotalWithVat: number;
  isReadOnly?: boolean;
  onSavePreCheckoutPayment?: (payload: SavePreCheckoutPaymentPayload) => Promise<void> | void;
}

export function PreCheckoutStatusCard({
  isDark,
  booking,
  quotedServiceTotalWithVat,
  isReadOnly = false,
  onSavePreCheckoutPayment,
}: PreCheckoutStatusCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!onSavePreCheckoutPayment || isReadOnly) {
    return null;
  }

  const summary = computePreCheckoutPaymentSummary({
    grandTotal:
      quotedServiceTotalWithVat + (booking?.billing?.preCheckoutTipAmount ?? booking?.billing?.tipAmount ?? 0),
    billing: booking?.billing,
  });

  return (
    <>
      {summary.hasPreCheckoutPayment ? (
        <div
          data-testid="precheckout-recorded-card"
          className={`rounded-2xl p-3 border flex items-center justify-between gap-2.5 ${
            isDark
              ? 'bg-emerald-950/35 border-emerald-600/50 text-emerald-200'
              : 'bg-emerald-50 border-emerald-300 text-emerald-950'
          }`}
        >
          <div className="min-w-0 space-y-0.5">
            <div className="text-[11.5px] font-black flex items-center gap-1.5 text-emerald-500">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Đã thu trước khi vào phòng: {summary.preCheckoutTotalPaid.toLocaleString('vi-VN')}đ</span>
            </div>
            <div className="text-[10.5px] font-semibold opacity-85 tabular-nums truncate">
              {summary.preCheckoutServicePaidAmount > 0
                ? `Dịch vụ: ${summary.preCheckoutServicePaidAmount.toLocaleString('vi-VN')}đ`
                : 'Dịch vụ: Chưa thu'}
              {' · '}
              {summary.preCheckoutTipAmount > 0
                ? `♥ Tip: ${summary.preCheckoutTipAmount.toLocaleString('vi-VN')}đ`
                : 'Tip: 0đ'}
            </div>
          </div>
          <button
            type="button"
            data-testid="open-pre-checkout-payment-btn"
            onClick={() => setIsModalOpen(true)}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-extrabold shrink-0 cursor-pointer ${
              isDark
                ? 'bg-neutral-900 border-emerald-700 text-emerald-300'
                : 'bg-white border-emerald-300 text-emerald-800'
            }`}
          >
            Sửa / QR
          </button>
        </div>
      ) : (
        <div
          className={`rounded-2xl p-3 border flex items-center justify-between gap-2.5 ${
            isDark ? 'bg-neutral-900/90 border-neutral-800 text-neutral-200' : 'bg-white border-gray-200 text-gray-800'
          }`}
        >
          <div className="min-w-0">
            <div className="text-[11.5px] font-extrabold flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-[#FFB400] shrink-0" />
              <span>Khách muốn trả tiền / Tip trước?</span>
            </div>
            <div className="text-[10px] text-[var(--mos-text-muted)] font-medium">
              Tạo QR dịch vụ riêng, tip riêng trước khi vào phòng mi
            </div>
          </div>
          <button
            type="button"
            data-testid="open-pre-checkout-payment-btn"
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-[#FFB400]/15 border border-[#FFB400]/50 text-[#FFB400] text-[11px] font-black shrink-0 cursor-pointer active:scale-95"
          >
            Thu trước / Tip →
          </button>
        </div>
      )}

      <PreCheckoutPaymentModal
        open={isModalOpen}
        isDark={isDark}
        booking={booking}
        quotedServiceTotalWithVat={quotedServiceTotalWithVat}
        onClose={() => setIsModalOpen(false)}
        onSave={onSavePreCheckoutPayment}
      />
    </>
  );
}
