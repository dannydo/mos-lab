'use client';

import React from 'react';
import { Tooltip } from 'antd';
import {
  AlertTriangle,
  Bot,
  Clock3,
  Crown,
  Loader2,
  Lock,
  ShieldCheck,
  Smile,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react';
import { AppIcon, StatusTag } from '~/components/ui';
import type { OmicallLogRow } from './omicallPageTypes';

export function isAnsweredOrRecordedCall(record: Pick<OmicallLogRow, 'status' | 'recordingUrl'>): boolean {
  return record.status === 'ANSWER' || Boolean(record.recordingUrl);
}

export function OmicallHappyCallCell({ record, compact = false }: { record: OmicallLogRow; compact?: boolean }) {
  if (record.aiLockedUntilSelfRated) {
    return (
      <Tooltip title="Tự đánh giá mức hài lòng để mở khóa Happy Call & AI Coaching">
        <span className="inline-flex">
          <StatusTag status="warning" icon={<AppIcon icon={Lock} size={11} />} label="Tự chấm" />
        </span>
      </Tooltip>
    );
  }

  const aiStatus = String(record.analysisStatus || '').toUpperCase();
  if (aiStatus === 'PROCESSING' || aiStatus === 'PENDING' || aiStatus === 'WAITING_RECORDING') {
    const label = aiStatus === 'WAITING_RECORDING' ? 'Chờ âm' : aiStatus === 'PROCESSING' ? 'AI chạy' : 'Chờ AI';
    return (
      <Tooltip title={`Trạng thái AI: ${aiStatus}`}>
        <span className="inline-flex">
          <StatusTag
            status={aiStatus === 'PROCESSING' ? 'processing' : 'default'}
            icon={
              aiStatus === 'PROCESSING' ? (
                <AppIcon icon={Loader2} size={11} className="animate-spin" />
              ) : (
                <AppIcon icon={Clock3} size={11} />
              )
            }
            label={label}
          />
        </span>
      </Tooltip>
    );
  }

  const hc = String(record.happyCallStatus || 'NONE').toUpperCase();
  const reasonLabel =
    record.happyCallReason === 'auto_laughter_30s'
      ? '≥30s + Tiếng cười'
      : record.happyCallReason === 'auto_180s'
        ? '≥180s'
        : record.happyCallReason === 'manual_approved'
          ? 'Duyệt thủ công'
          : null;

  const tooltipText = [reasonLabel ? `Tiêu chuẩn: ${reasonLabel}` : null, record.satisfactionAnalysis || null]
    .filter(Boolean)
    .join(' — ');

  if (hc === 'APPROVED') {
    return (
      <Tooltip title={tooltipText || 'Đạt Happy Call'}>
        <div className="inline-flex flex-wrap items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/45 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-500">
            <AppIcon icon={Sparkles} size={11} />
            <span>Happy Call</span>
          </span>
          {record.laughCount > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-purple-500/35 bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-purple-400">
              <AppIcon icon={Smile} size={10} />
              <span>{record.laughCount}</span>
            </span>
          )}
          {record.hasComplaint && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-[var(--color-error)]/45 bg-[var(--color-error)]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-error)]">
              <AppIcon icon={AlertTriangle} size={10} />
              {!compact && <span>KN</span>}
            </span>
          )}
          {!compact && record.callType && (
            <span className="text-[10px] font-medium text-[var(--mos-text-secondary)]">{record.callType}</span>
          )}
        </div>
      </Tooltip>
    );
  }

  if (hc === 'PENDING_APPROVAL') {
    return (
      <Tooltip title={tooltipText || 'Chờ QA duyệt Happy Call'}>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-warning)]">
          <AppIcon icon={Clock3} size={11} />
          <span>Chờ duyệt</span>
          {record.hasComplaint && <AppIcon icon={AlertTriangle} size={11} className="text-[var(--color-error)]" />}
        </span>
      </Tooltip>
    );
  }

  if (hc === 'REJECTED') {
    return (
      <Tooltip title={tooltipText || 'Từ chối Happy Call'}>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-error)]/35 bg-[var(--color-error)]/10 px-2 py-0.5 text-[11px] font-medium text-[var(--color-error)]">
          <AppIcon icon={XCircle} size={11} />
          <span>Từ chối</span>
          {record.hasComplaint && <AppIcon icon={AlertTriangle} size={11} />}
        </span>
      </Tooltip>
    );
  }

  if (record.hasComplaint) {
    return (
      <Tooltip title={tooltipText || 'Phát hiện khiếu nại'}>
        <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-error)]/40 bg-[var(--color-error)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-error)]">
          <AppIcon icon={AlertTriangle} size={11} />
          <span>Khiếu nại</span>
        </span>
      </Tooltip>
    );
  }

  if (aiStatus === 'DONE') {
    return (
      <Tooltip title={tooltipText || 'Đã phân tích AI (chưa đạt Happy Call)'}>
        <span className="text-xs text-[var(--mos-text-secondary)]">{record.callType ? record.callType : '—'}</span>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={aiStatus === 'FAILED' ? 'Phân tích AI gặp lỗi' : 'Chưa phân tích AI'}>
      <span className="text-xs text-[var(--mos-text-secondary)]">—</span>
    </Tooltip>
  );
}

export function OmicallFourSourceBadges({ record }: { record: OmicallLogRow }) {
  if (record.aiLockedUntilSelfRated) {
    return (
      <Tooltip title="Tự đánh giá để mở khóa điểm AI">
        <span className="inline-flex items-center gap-1 text-xs text-[var(--color-warning)]">
          <AppIcon icon={Lock} size={12} />
        </span>
      </Tooltip>
    );
  }

  const ai = record.customerSatisfactionScore ?? null;
  const nv = record.staffSelfSatisfactionScore ?? null;
  const ql = record.managerSatisfactionScore ?? null;
  const ad = record.adminSatisfactionScore ?? null;
  const mismatch = ai !== null && nv !== null && Math.abs(ai - nv) >= 2;

  if (ai === null && nv === null && ql === null && ad === null) {
    return <span className="text-xs text-[var(--mos-text-secondary)]">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold tabular-nums">
      {ai !== null && (
        <Tooltip title={`AI (Gemini): ${ai}/5 ★${record.customerSentiment ? ` · ${record.customerSentiment}` : ''}`}>
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 border ${
              ai >= 4
                ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-500'
                : ai === 3
                  ? 'border-[var(--mos-surface-border)] bg-[var(--mos-surface-muted)] text-[var(--mos-text-secondary)]'
                  : 'border-[var(--color-error)]/40 bg-[var(--color-error)]/10 text-[var(--color-error)]'
            }`}
          >
            <AppIcon icon={Bot} size={11} />
            <span>{ai}★</span>
          </span>
        </Tooltip>
      )}

      {nv !== null && (
        <Tooltip
          title={`Nhân viên tự chấm: ${nv}/5 ★${record.staffSelfNote ? ` — "${record.staffSelfNote}"` : ''}${
            mismatch ? ` (Lệch ${Math.abs((ai ?? 0) - nv)}★ với AI)` : ''
          }`}
        >
          <span
            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 border ${
              mismatch
                ? 'border-[var(--color-warning)]/50 bg-[var(--color-warning)]/15 text-[var(--color-warning)]'
                : 'border-[var(--color-info)]/35 bg-[var(--color-info)]/10 text-[var(--color-info)]'
            }`}
          >
            <AppIcon icon={User} size={11} />
            <span>{nv}★</span>
          </span>
        </Tooltip>
      )}

      {ql !== null && (
        <Tooltip
          title={`Quản lý/QA${record.managerReviewedByName ? ` (${record.managerReviewedByName})` : ''}: ${ql}/5 ★`}
        >
          <span className="inline-flex items-center gap-0.5 rounded border border-purple-500/35 bg-purple-500/10 px-1.5 py-0.5 text-purple-400">
            <AppIcon icon={ShieldCheck} size={11} />
            <span>{ql}★</span>
          </span>
        </Tooltip>
      )}

      {ad !== null && (
        <Tooltip title={`Admin${record.adminReviewedByName ? ` (${record.adminReviewedByName})` : ''}: ${ad}/5 ★`}>
          <span className="inline-flex items-center gap-0.5 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-amber-400">
            <AppIcon icon={Crown} size={11} />
            <span>{ad}★</span>
          </span>
        </Tooltip>
      )}
    </div>
  );
}
