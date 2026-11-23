'use client';

import React from 'react';
import { Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Users, Tv, Volume2, Sparkles, CheckCircle2, XCircle } from 'lucide-react';
import type { TelesaleTvEventLog } from '@mos-lab/shared';
import { formatTvJournalTime } from './tvJournalUtils';

interface StepPillConfig {
  isDark: boolean;
  completed: boolean;
  isError: boolean;
  completedLabel: string;
  errorLabel: string;
  idleLabel: string;
  tooltipTitle?: string;
}

function getEventToneClasses(type: TelesaleTvEventLog['type'], isDark: boolean): string {
  if (type === 'BOOK') {
    return isDark ? 'bg-blue-950/80 text-blue-300 border-blue-500/40' : 'bg-blue-50 text-blue-700 border-blue-200';
  }
  if (type === 'DONE') {
    return isDark
      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
  return isDark ? 'bg-amber-950/80 text-amber-300 border-amber-500/40' : 'bg-amber-50 text-amber-800 border-amber-300';
}

function renderExecutionStepPill({
  isDark,
  completed,
  isError,
  completedLabel,
  errorLabel,
  idleLabel,
  tooltipTitle,
}: StepPillConfig): React.ReactNode {
  if (completed) {
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold border ${
          isDark
            ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
            : 'bg-emerald-50 text-emerald-800 border-emerald-300'
        }`}
      >
        {completedLabel}
      </span>
    );
  }

  const badgeTone = isError
    ? isDark
      ? 'bg-rose-950 text-rose-300 border-rose-500/40'
      : 'bg-rose-50 text-rose-800 border-rose-300'
    : isDark
      ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
      : 'bg-slate-100 text-slate-600 border-slate-300';

  const pill = (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold border cursor-help ${badgeTone}`}
    >
      {isError ? errorLabel : idleLabel}
    </span>
  );

  return tooltipTitle ? <Tooltip title={tooltipTitle}>{pill}</Tooltip> : pill;
}

/** Builds Antd/DataTable column definitions for the Telesale TV monitor journal table. */
export function createTvJournalColumns({ isDark }: { isDark: boolean }): ColumnsType<TelesaleTvEventLog> {
  return [
    {
      title: 'Thời gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 110,
      render: (val: string, record: TelesaleTvEventLog) => {
        const time = formatTvJournalTime(val, record.timeFormatted);
        return (
          <span
            className={`font-mono text-xs font-semibold tabular-nums ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}
          >
            {time || '--:--:--'}
          </span>
        );
      },
    },
    {
      title: 'Nhân viên',
      dataIndex: 'staffName',
      key: 'staffName',
      width: 150,
      render: (name: string, record: TelesaleTvEventLog) => {
        if (record.type === 'MILESTONE') {
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold border ${
                isDark
                  ? 'bg-amber-950/70 text-amber-300 border-amber-600/40'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}
            >
              <Users className={`w-3 h-3 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              Toàn team
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            {record.avatarUrl ? (
              <img
                src={record.avatarUrl}
                alt={name || 'Telesales'}
                className={`w-6 h-6 rounded-full object-cover border shrink-0 ${
                  isDark ? 'border-zinc-700' : 'border-slate-200'
                }`}
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-[10px] font-bold text-black shrink-0">
                {name ? name.charAt(0).toUpperCase() : 'T'}
              </div>
            )}
            <span className={`text-xs font-medium truncate ${isDark ? 'text-zinc-100' : 'text-slate-800'}`}>
              {name || 'Telesales'}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Loại Event',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (type: TelesaleTvEventLog['type']) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${getEventToneClasses(
            type,
            isDark
          )}`}
        >
          {type}
        </span>
      ),
    },
    {
      title: 'Kết quả thay đổi',
      dataIndex: 'changeResult',
      key: 'changeResult',
      width: 150,
      render: (result: string, record: TelesaleTvEventLog) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold border tabular-nums ${getEventToneClasses(
            record.type,
            isDark
          )}`}
        >
          {result || (record.type === 'BOOK' ? '+1 Book' : record.type === 'DONE' ? '+1 Done' : 'Cán mốc')}
        </span>
      ),
    },
    {
      title: (
        <span className="flex items-center gap-1 text-[11px]">
          <Tv className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-400' : 'text-slate-400'}`} />
          TV Nhận
        </span>
      ),
      dataIndex: 'eventReceived',
      key: 'eventReceived',
      width: 100,
      render: (received: boolean) =>
        renderExecutionStepPill({
          isDark,
          completed: received,
          isError: false,
          completedLabel: '✅ Đã nhận',
          errorLabel: '⏸️ Chưa nhận',
          idleLabel: '⏸️ Chưa nhận',
          tooltipTitle: 'Sự kiện phát sinh trước khi mở TV Monitor (Lịch sử) hoặc chưa tiếp nhận',
        }),
    },
    {
      title: (
        <span className="flex items-center gap-1 text-[11px]">
          <Volume2 className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          Voice
        </span>
      ),
      dataIndex: 'voiceTriggered',
      key: 'voiceTriggered',
      width: 110,
      render: (triggered: boolean, record: TelesaleTvEventLog) =>
        renderExecutionStepPill({
          isDark,
          completed: triggered,
          isError: record.eventReceived,
          completedLabel: '✅ Đã phát',
          errorLabel: '❌ Lỗi phát',
          idleLabel: '⏸️ Không phát',
          tooltipTitle:
            record.voiceErrorReason ||
            (record.eventReceived ? 'Âm thanh không được phát' : 'Sự kiện trước khi mở TV Monitor (Lịch sử)'),
        }),
    },
    {
      title: (
        <span className="flex items-center gap-1 text-[11px]">
          <Sparkles className={`w-3.5 h-3.5 ${isDark ? 'text-amber-400' : 'text-amber-500'}`} />
          Overlay
        </span>
      ),
      dataIndex: 'overlayTriggered',
      key: 'overlayTriggered',
      width: 110,
      render: (triggered: boolean, record: TelesaleTvEventLog) =>
        renderExecutionStepPill({
          isDark,
          completed: triggered,
          isError: record.eventReceived,
          completedLabel: '✅ Đã hiện',
          errorLabel: '❌ Không hiện',
          idleLabel: '⏸️ Không hiện',
          tooltipTitle:
            record.overlayErrorReason ||
            (record.eventReceived ? 'Banner không hiển thị' : 'Sự kiện trước khi mở TV Monitor (Lịch sử)'),
        }),
    },
    {
      title: 'Trạng thái cuối & Lý do',
      dataIndex: 'status',
      key: 'status',
      render: (status: TelesaleTvEventLog['status'], record: TelesaleTvEventLog) => {
        const isSuccess = status === 'SUCCESS';
        const errorDetail = record.errorMessage || record.voiceErrorReason || record.overlayErrorReason;

        return (
          <div className="flex flex-col gap-0.5">
            <div>
              {isSuccess ? (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                    isDark
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-600/50'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  }`}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                  {record.eventReceived ? 'Thành công' : 'Ghi nhận'}
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${
                    isDark
                      ? 'bg-rose-950/80 text-rose-400 border-rose-600/50'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}
                >
                  <XCircle className={`w-3.5 h-3.5 ${isDark ? 'text-rose-400' : 'text-rose-600'}`} />
                  Lỗi
                </span>
              )}
            </div>
            {!isSuccess && errorDetail && (
              <span
                className={`text-[11px] font-mono line-clamp-1 ${isDark ? 'text-rose-300/90' : 'text-rose-600'}`}
                title={errorDetail}
              >
                {errorDetail}
              </span>
            )}
            {isSuccess && !record.eventReceived && (
              <span
                className={`text-[10px] font-mono line-clamp-1 ${isDark ? 'text-zinc-400' : 'text-slate-500'}`}
                title="Sự kiện lịch sử (phát sinh trước khi mở TV Monitor)"
              >
                Lịch sử ca làm
              </span>
            )}
          </div>
        );
      },
    },
  ];
}
