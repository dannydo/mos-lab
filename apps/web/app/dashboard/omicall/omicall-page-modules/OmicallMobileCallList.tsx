'use client';

import React from 'react';
import { Button } from 'antd';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight, PhoneIncoming, PhoneOutgoing, Play, Square } from 'lucide-react';
import { AppIcon } from '~/components/ui';
import { isAnsweredOrRecordedCall, OmicallFourSourceBadges, OmicallHappyCallCell } from './OmicallRatingChips';
import {
  formatOmicallDuration,
  resolveDisplayCallTime,
  type OmicallDateMode,
  type OmicallLogRow,
} from './omicallPageTypes';

export interface OmicallMobileCallListProps {
  logs: OmicallLogRow[];
  loading: boolean;
  dateMode: OmicallDateMode;
  playingLogId: number | null;
  currentPage: number;
  pageSize: number;
  totalLogs: number;
  onTogglePlay: (logId: number) => void;
  onOpenQaDrawer: (logId: number) => void;
  onPageChange: (page: number, size: number) => void;
}

export function OmicallMobileCallList({
  logs,
  loading,
  dateMode,
  playingLogId,
  currentPage,
  pageSize,
  totalLogs,
  onTogglePlay,
  onOpenQaDrawer,
  onPageChange,
}: OmicallMobileCallListProps) {
  const totalPages = Math.max(1, Math.ceil(totalLogs / pageSize));

  if (loading && logs.length === 0) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2, 3].map((idx) => (
          <div
            key={idx}
            className="h-14 animate-pulse rounded-xl border border-[var(--mos-surface-border)] bg-[var(--mos-surface-muted)]"
          />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--mos-surface-border)] bg-[var(--mos-surface-muted)] py-10 text-center text-xs text-[var(--mos-text-secondary)]">
        Không có cuộc gọi nào khớp bộ lọc.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {logs.map((record) => {
        const dt = dayjs(resolveDisplayCallTime(record));
        const timeLabel = dateMode === 'day' ? dt.format('HH:mm') : dt.format('DD/MM HH:mm');
        const isInbound = String(record.direction || '').toLowerCase() === 'inbound';
        const phone = isInbound ? record.sourceNumber || record.destinationNumber : record.destinationNumber;
        const primaryTarget = record.customerName || phone || 'Không rõ SĐT';
        const staffBranch = [record.staffName || record.staff?.displayName, record.storeName]
          .filter(Boolean)
          .join(' · ');
        const talkSec = record.billSec && record.billSec > 0 ? record.billSec : record.duration;
        const durationLabel = formatOmicallDuration(talkSec);
        const answered = isAnsweredOrRecordedCall(record);
        const isHappyApproved = !record.aiLockedUntilSelfRated && record.happyCallStatus === 'APPROVED';
        const isPlaying = playingLogId === record.id;

        if (!answered) {
          return (
            <div
              key={record.id}
              role="button"
              tabIndex={0}
              onClick={() => onOpenQaDrawer(record.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onOpenQaDrawer(record.id);
                }
              }}
              className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)] px-3 py-2 opacity-60 transition hover:opacity-100"
            >
              <div className="flex min-w-0 items-center gap-2">
                <AppIcon
                  icon={isInbound ? PhoneIncoming : PhoneOutgoing}
                  size={13}
                  className="shrink-0 text-[var(--mos-text-secondary)]"
                />
                <span className="truncate text-xs font-medium text-[var(--mos-text-primary)]">{primaryTarget}</span>
                {record.storeName && (
                  <span className="shrink-0 text-[11px] text-[var(--mos-text-secondary)]">· {record.storeName}</span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1.5 text-[11px] tabular-nums text-[var(--mos-text-secondary)]">
                <span>{timeLabel}</span>
                <span className="font-mono">{durationLabel}</span>
                <AppIcon icon={ChevronRight} size={13} />
              </div>
            </div>
          );
        }

        return (
          <div
            key={record.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpenQaDrawer(record.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenQaDrawer(record.id);
              }
            }}
            className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition ${
              isHappyApproved
                ? 'border-emerald-500/45 bg-emerald-500/[0.06]'
                : 'border-[var(--mos-surface-border)] bg-[var(--mos-surface-card)]'
            }`}
          >
            {/* Row 1: Customer + Time + Duration + Play button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <AppIcon
                  icon={isInbound ? PhoneIncoming : PhoneOutgoing}
                  size={14}
                  className="shrink-0 text-emerald-500"
                />
                <div className="min-w-0 flex flex-col">
                  <span className="truncate text-[13px] font-bold text-[var(--mos-text-primary)]">{primaryTarget}</span>
                  {record.customerName && phone && (
                    <span className="text-[11px] tabular-nums text-[var(--mos-text-secondary)]">{phone}</span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <div className="text-right text-[11px] tabular-nums text-[var(--mos-text-secondary)]">
                  <div>{timeLabel}</div>
                  <div className="font-mono font-semibold text-[var(--mos-text-primary)]">{durationLabel}</div>
                </div>
                {record.recordingUrl && (
                  <Button
                    size="small"
                    shape="circle"
                    type={isPlaying ? 'primary' : 'default'}
                    icon={<AppIcon icon={isPlaying ? Square : Play} size={12} />}
                    aria-label={isPlaying ? 'Dừng phát ghi âm' : 'Nghe ghi âm'}
                    onClick={() => onTogglePlay(record.id)}
                  />
                )}
              </div>
            </div>

            {/* Inline Audio player when toggled */}
            {isPlaying && record.recordingUrl && (
              <div onClick={(e) => e.stopPropagation()}>
                <audio controls autoPlay src={record.recordingUrl} className="h-8 w-full outline-none" />
              </div>
            )}

            {/* Row 2: Happy Call Hero + Staff/Branch + 4-source Badges */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 border-t border-[var(--mos-surface-border)] pt-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <OmicallHappyCallCell record={record} compact />
                {staffBranch && <span className="text-[11px] text-[var(--mos-text-secondary)]">{staffBranch}</span>}
              </div>
              <OmicallFourSourceBadges record={record} />
            </div>
          </div>
        );
      })}

      {/* Compact Mobile Pagination */}
      {totalLogs > pageSize && (
        <div className="mt-1 flex items-center justify-between rounded-lg border border-[var(--mos-surface-border)] bg-[var(--mos-surface-muted)] px-3 py-1.5 text-xs tabular-nums">
          <span className="text-[var(--mos-text-secondary)]">
            Trang {currentPage} / {totalPages} ({totalLogs} cuộc)
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="small"
              icon={<AppIcon icon={ChevronLeft} size={14} />}
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1, pageSize)}
            />
            <Button
              size="small"
              icon={<AppIcon icon={ChevronRight} size={14} />}
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1, pageSize)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
