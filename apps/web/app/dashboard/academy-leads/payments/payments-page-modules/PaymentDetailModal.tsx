'use client';

import { Button, Progress, Space } from 'antd';
import type { AcademyTalentPaymentManagementRow, AcademyTalentPaymentTrace } from '@mos-lab/shared';
import { AdaptiveModal, StatusTag } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import {
  dateLabel,
  paymentMethodLabel,
  paymentProgressPercent,
  paymentStatusMeta,
} from '../payment-management.helpers';
import { PaymentTraceSection } from './PaymentTraceSection';

export interface PaymentDetailModalProps {
  detail: AcademyTalentPaymentManagementRow | null;
  trace: AcademyTalentPaymentTrace | null;
  traceLoading: boolean;
  traceError: string | null;
  onClose: () => void;
  onCollect: (row: AcademyTalentPaymentManagementRow) => void;
}

export function PaymentDetailModal({
  detail,
  trace,
  traceLoading,
  traceError,
  onClose,
  onCollect,
}: PaymentDetailModalProps) {
  return (
    <AdaptiveModal
      open={Boolean(detail)}
      title={
        detail ? (
          <div className="min-w-0">
            <div className="truncate">Thu học phí · {detail.lead.name}</div>
            <div className="mt-0.5 truncate text-xs font-normal opacity-60">
              {detail.invoiceNumber} · {detail.courseLabel}
            </div>
          </div>
        ) : (
          'Chi tiết thu học phí'
        )
      }
      onCancel={onClose}
      footer={
        <Space wrap>
          <Button onClick={onClose}>Đóng</Button>
          {detail && detail.paymentStatus !== 'PAID' && (
            <Button type="primary" onClick={() => onCollect(detail)}>
              Thu thêm {formatVND(detail.remainingVnd)}
            </Button>
          )}
        </Space>
      }
      intent="detail"
    >
      {detail && (
        <div className="grid gap-5">
          <section className="grid gap-4 rounded-xl border border-inherit p-4" aria-label="Tình trạng thu học phí">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <strong>Tình trạng thu học phí</strong>
                  <StatusTag
                    status={paymentStatusMeta(detail.paymentStatus).tone}
                    label={paymentStatusMeta(detail.paymentStatus).label}
                  />
                </div>
                <p className="mt-1 text-sm opacity-70">
                  Đã xác nhận {formatVND(detail.totalPaidVnd)} trên tổng học phí {formatVND(detail.tuitionVnd)}.
                </p>
              </div>
              {detail.paymentStatus !== 'PAID' ? (
                <span className="rounded-lg border border-inherit px-3 py-2 text-right text-sm">
                  <span className="block text-xs opacity-60">Việc cần làm</span>
                  <strong className="mt-0.5 block tabular-nums">Thu thêm {formatVND(detail.remainingVnd)}</strong>
                </span>
              ) : (
                <span className="rounded-lg border border-inherit px-3 py-2 text-right text-sm">
                  <span className="block text-xs opacity-60">Trạng thái</span>
                  <strong className="mt-0.5 block">Đã hoàn tất</strong>
                </span>
              )}
            </div>

            <Progress
              percent={paymentProgressPercent(detail.totalPaidVnd, detail.tuitionVnd)}
              strokeColor="var(--ant-color-primary)"
              trailColor="var(--ant-color-fill-tertiary)"
              format={(percent) => `${percent || 0}% đã thu`}
            />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(152px,1fr))] gap-3">
              <div className="rounded-lg border border-inherit p-3">
                <span className="text-xs opacity-60">Tổng học phí</span>
                <strong className="mt-1 block tabular-nums">{formatVND(detail.tuitionVnd)}</strong>
              </div>
              <div className="rounded-lg border border-inherit p-3">
                <span className="text-xs opacity-60">Đã xác nhận</span>
                <strong className="mt-1 block tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatVND(detail.totalPaidVnd)}
                </strong>
              </div>
              <div className="rounded-lg border border-inherit p-3">
                <span className="text-xs opacity-60">Còn phải thu</span>
                <strong className="mt-1 block tabular-nums">{formatVND(detail.remainingVnd)}</strong>
              </div>
            </div>
          </section>

          <section aria-label="Lịch sử các khoản đã xác nhận">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <strong>Khoản thu đã xác nhận</strong>
                <p className="mt-0.5 text-xs opacity-70">
                  Chỉ các khoản đã đối soát mới được ghi nhận vào doanh thu Academy.
                </p>
              </div>
              <span className="tabular-nums text-xs opacity-60">{detail.payments.length} lần thu</span>
            </div>
            {detail.payments.length ? (
              <div className="grid gap-2">
                {detail.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-inherit p-3"
                  >
                    <div>
                      <strong className="tabular-nums">{formatVND(payment.amountVnd)}</strong>
                      <div className="mt-1 text-xs opacity-70">
                        {paymentMethodLabel(payment.method)} · {payment.reference || 'Chưa có mã giao dịch'}
                      </div>
                    </div>
                    <div className="text-right text-xs opacity-70">
                      <time dateTime={payment.receivedAt}>{dateLabel(payment.receivedAt)}</time>
                      <br />
                      {payment.confirmedBy?.displayName || 'Hệ thống'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-inherit p-3 text-sm opacity-70">
                Chưa có khoản tiền nào được xác nhận. Phiếu yêu cầu thanh toán hoặc QR chưa tạo doanh thu.
              </p>
            )}
          </section>

          <PaymentTraceSection trace={trace} traceLoading={traceLoading} traceError={traceError} />
        </div>
      )}
    </AdaptiveModal>
  );
}
