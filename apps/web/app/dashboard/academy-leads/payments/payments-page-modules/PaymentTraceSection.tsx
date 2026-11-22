'use client';

import { Alert, Collapse } from 'antd';
import type { AcademyTalentPaymentTrace } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import { dateLabel, traceActorName } from '../payment-management.helpers';

export interface PaymentTraceSectionProps {
  trace: AcademyTalentPaymentTrace | null;
  traceLoading: boolean;
  traceError: string | null;
}

export function PaymentTraceSection({ trace, traceLoading, traceError }: PaymentTraceSectionProps) {
  return (
    <section className="rounded-xl border border-inherit p-3" aria-label="Dấu vết đối soát">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong>Dấu vết đối soát</strong>
          <p className="mt-0.5 text-xs opacity-70">Mở khi cần kiểm tra ưu đãi, người tham gia và lịch sử bất biến.</p>
        </div>
        {trace && (
          <StatusTag
            status={trace.reviewFlags.length ? 'warning' : 'success'}
            label={trace.reviewFlags.length ? `${trace.reviewFlags.length} tín hiệu cần kiểm tra` : 'Đủ dấu vết'}
          />
        )}
      </div>
      {traceLoading && <p className="text-sm opacity-70">Đang tải dấu vết phiếu học phí…</p>}
      {traceError && <Alert type="error" showIcon message="Không tải được dấu vết" description={traceError} />}
      {trace && (
        <Collapse
          bordered={false}
          size="small"
          items={[
            {
              key: 'profile-and-promotion',
              label: 'Hồ sơ học viên, phiếu & ưu đãi',
              children: (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 text-sm">
                  <div className="rounded-lg border border-inherit p-3">
                    <span className="text-xs opacity-60">Học viên / nguồn</span>
                    <strong className="mt-1 block">{trace.learner.name}</strong>
                    <span className="block text-xs opacity-70">
                      {[trace.learner.phone, trace.learner.email, trace.learner.source].filter(Boolean).join(' · ') ||
                        'Chưa có thông tin nguồn'}
                    </span>
                  </div>
                  <div className="rounded-lg border border-inherit p-3">
                    <span className="text-xs opacity-60">Ưu đãi đã chốt</span>
                    <strong className="mt-1 block tabular-nums">
                      {trace.promotion.scholarshipPercent}% · {formatVND(trace.promotion.scholarshipVnd)}
                    </strong>
                    <span className="block text-xs opacity-70">
                      {trace.promotion.tierLabel || 'Không có học bổng'} · Giá cuối{' '}
                      {formatVND(trace.promotion.finalPriceVnd)}
                    </span>
                  </div>
                  <div className="rounded-lg border border-inherit p-3">
                    <span className="text-xs opacity-60">Phiếu học phí</span>
                    <strong className="mt-1 block">{trace.invoice.documentNumber}</strong>
                    <span className="block text-xs opacity-70">
                      Phiên bản {trace.invoice.revision || 1} · {dateLabel(trace.invoice.issuedAt)}
                    </span>
                  </div>
                  {trace.promotion.policyAudit && (
                    <div className="rounded-lg border border-inherit p-3">
                      <span className="text-xs opacity-60">Chính sách ưu đãi</span>
                      <strong className="mt-1 block">Phiên bản #{trace.promotion.policyAudit.id}</strong>
                      <span className="block text-xs opacity-70">
                        {trace.promotion.policyAudit.changedBy?.displayName || 'Hệ thống'} ·{' '}
                        {dateLabel(trace.promotion.policyAudit.changedAt)}
                      </span>
                    </div>
                  )}
                  {trace.reviewFlags.length > 0 && (
                    <Alert
                      className="col-span-full"
                      type="warning"
                      showIcon
                      message="Tín hiệu nghiệp vụ cần kiểm tra"
                      description={
                        <ul className="m-0 pl-4">
                          {trace.reviewFlags.map((flag) => (
                            <li key={flag.code}>{flag.message}</li>
                          ))}
                        </ul>
                      }
                    />
                  )}
                </div>
              ),
            },
            {
              key: 'people',
              label: `Người liên quan (${trace.actors.length})`,
              children: (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-2">
                  {trace.actors.map((actor) => (
                    <div
                      key={`${actor.role}-${actor.staff?.id || actor.recordedName}`}
                      className="flex items-center justify-between gap-3 rounded-md border border-inherit px-3 py-2 text-xs"
                    >
                      <span className="opacity-70">{actor.label}</span>
                      <strong className="text-right">{traceActorName(actor)}</strong>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: 'timeline',
              label: `Nhật ký bất biến (${trace.events.length})`,
              children: trace.events.length ? (
                <div className="grid gap-2">
                  {trace.events.map((event) => (
                    <div
                      key={event.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-inherit px-3 py-2 text-xs"
                    >
                      <span>
                        <strong>{event.summary}</strong>
                        <span className="mt-0.5 block opacity-70">{event.actor?.displayName || 'Hệ thống'}</span>
                      </span>
                      <time className="tabular-nums text-right opacity-70" dateTime={event.occurredAt}>
                        {dateLabel(event.occurredAt)}
                      </time>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs opacity-70">
                  Chưa có timeline lịch sử cho phiếu này; các lần thao tác tiếp theo sẽ được ghi nhận.
                </p>
              ),
            },
          ]}
        />
      )}
    </section>
  );
}
