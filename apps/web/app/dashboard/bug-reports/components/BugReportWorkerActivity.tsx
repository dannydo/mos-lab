'use client';

import { Button, Tooltip, Typography } from 'antd';
import type {
  BugReportLiveWorkerActivity,
  BugReportSummary,
  InboxWorkerStatusSummary,
  RequestClassifierWorkerHealth,
} from '@mos-lab/shared';
import type { LucideIcon } from 'lucide-react';
import { Bot, RefreshCw, Sparkles } from 'lucide-react';
import { AppIcon } from '../../../../components/ui';
import { bugReportWorkerActivity, formatElapsed, formatProgressUpdated } from '../bug-report-presenters';

const { Text } = Typography;

export function BugReportWorkerActivityCell({ report }: { report: BugReportSummary }) {
  const activity = bugReportWorkerActivity(report);
  return (
    <div className="min-w-0 space-y-1 text-xs">
      <div className="flex items-start gap-1.5">
        <span className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400">
          <AppIcon icon={Bot} size="sm" />
        </span>
        <Text className="min-w-0" ellipsis={{ tooltip: activity.headline }}>
          {activity.headline}
        </Text>
      </div>
      {activity.elapsed && (
        <Text type="secondary" className="block tabular-nums">
          {activity.elapsed}
        </Text>
      )}
      {activity.evidence && (
        <Text type="secondary" className="block" ellipsis={{ tooltip: activity.evidence }}>
          {activity.evidence}
        </Text>
      )}
    </div>
  );
}

function livePhaseLabel(phase: string): string {
  if (phase === 'COMMITTING') return 'Tạo commit';
  if (phase === 'DEPLOYING') return 'Deploy';
  return 'Code/test';
}

function WorkerDebugTooltip({ worker, reports }: { worker: InboxWorkerStatusSummary; reports: BugReportSummary[] }) {
  const activeTask = worker.activeTask;
  const liveReport = activeTask ? reports.find((report) => report.id === activeTask.ticketId) : null;
  const liveActivity = liveReport ? bugReportWorkerActivity(liveReport) : null;
  const liveElapsed = activeTask?.startedAt ? `Đã chạy ${formatElapsed(activeTask.startedAt)}` : null;
  const liveEvidence = activeTask?.lastProgressAt ? formatProgressUpdated(activeTask.lastProgressAt) : null;

  return (
    <div className="max-w-xs space-y-1.5 p-1 text-xs">
      <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-1 font-medium text-white">
        <span>{worker.name}</span>
        <span className={worker.isOnline ? 'text-emerald-400' : 'text-slate-400'}>
          {worker.isOnline ? '● Online' : '○ Offline'}
        </span>
      </div>

      <div className="space-y-1 text-[11px] text-slate-300">
        <div>
          <span className="text-slate-400">Heartbeat: </span>
          <span className="tabular-nums">
            {worker.lastSeenAt ? new Date(worker.lastSeenAt).toLocaleTimeString('vi-VN') : 'Chưa có'}
          </span>
        </div>

        {activeTask ? (
          <>
            <div>
              <span className="text-slate-400">Nhiệm vụ: </span>
              <span className="font-semibold text-white">{activeTask.ticketKey}</span>
              {activeTask.title && <div className="truncate text-slate-300 italic">{activeTask.title}</div>}
            </div>
            <div>
              <span className="text-slate-400">Giai đoạn: </span>
              <span>{liveActivity?.headline || livePhaseLabel(activeTask.phase)}</span>
            </div>
            {liveElapsed && (
              <div>
                <span className="text-slate-400">Thời gian: </span>
                <span className="tabular-nums">{liveElapsed}</span>
              </div>
            )}
            {liveEvidence && (
              <div>
                <span className="text-slate-400">Bằng chứng: </span>
                <span>{liveEvidence}</span>
              </div>
            )}
          </>
        ) : (
          <div>
            <span className="text-slate-400">Trạng thái: </span>
            <span>{worker.isOnline ? 'Sẵn sàng nhận ticket (Idle)' : 'Tạm dừng (Offline)'}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MinimalWorkerPill({
  worker,
  onOpen,
  reports,
  icon,
}: {
  worker: InboxWorkerStatusSummary;
  onOpen: (id: number) => void;
  reports: BugReportSummary[];
  icon: LucideIcon;
}) {
  const isOnline = worker.isOnline;
  const activeTask = worker.activeTask;
  const shortName = worker.id === 'AG' ? 'AG' : 'Codex';

  return (
    <Tooltip title={<WorkerDebugTooltip worker={worker} reports={reports} />} placement="bottom">
      <div className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-0.5 text-xs transition-colors hover:bg-slate-200/50 dark:hover:bg-slate-800/60">
        <AppIcon
          icon={icon}
          size="sm"
          className={worker.id === 'AG' ? 'text-indigo-600 dark:text-indigo-400' : 'text-sky-600 dark:text-sky-400'}
        />
        <span className="font-semibold tracking-tight text-slate-800 dark:text-slate-200">{shortName}</span>
        <span
          className={`size-2 shrink-0 rounded-full transition-shadow ${
            isOnline ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-slate-400 dark:bg-slate-600'
          }`}
        />
        <span className="text-[11px] text-slate-500 dark:text-slate-400">{isOnline ? 'Online' : 'Offline'}</span>

        {activeTask && (
          <span className="ml-1 inline-flex items-center gap-1 border-l border-slate-300/60 pl-1.5 dark:border-slate-700/60">
            <Button
              type="link"
              size="small"
              className="!h-auto !p-0 !text-xs font-semibold text-sky-600 hover:underline dark:text-sky-400"
              onClick={(e) => {
                e.stopPropagation();
                onOpen(activeTask.ticketId);
              }}
            >
              {activeTask.ticketKey}
            </Button>
            <span className="font-normal text-[10px] text-slate-500 dark:text-slate-400">
              ({livePhaseLabel(activeTask.phase)})
            </span>
          </span>
        )}
      </div>
    </Tooltip>
  );
}

/**
 * Minimalist live worker status bar for mOS Inbox (Antigravity & Codex IDE).
 * Designed for low-profile inspection and debugging with rich hover tooltips.
 */
export function InboxWorkerLiveBar({
  reports,
  onOpen,
  liveWorker,
  health,
  loading,
  error,
  onRefresh,
}: {
  reports: BugReportSummary[];
  onOpen: (id: number) => void;
  liveWorker: BugReportLiveWorkerActivity | null;
  health: RequestClassifierWorkerHealth | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const workers = health?.workers ?? {
    ag: {
      id: 'AG' as const,
      name: 'Antigravity (AG)',
      isOnline: Boolean(health?.state === 'ONLINE' && (!liveWorker || liveWorker.workerId?.startsWith('ag-'))),
      lastSeenAt: health?.lastHeartbeatAt ?? null,
      activeTask:
        liveWorker && (!liveWorker.workerId || liveWorker.workerId.startsWith('ag-'))
          ? {
              ticketId: liveWorker.ticketId,
              ticketKey: liveWorker.ticketKey,
              phase: liveWorker.phase,
              startedAt: liveWorker.startedAt,
              lastProgressAt: liveWorker.lastProgressAt,
            }
          : null,
    },
    codex: {
      id: 'IDE' as const,
      name: 'Codex IDE',
      isOnline: health?.state === 'ONLINE' && Boolean(liveWorker?.workerId?.startsWith('ide-')),
      lastSeenAt: null,
      activeTask:
        liveWorker && liveWorker.workerId?.startsWith('ide-')
          ? {
              ticketId: liveWorker.ticketId,
              ticketKey: liveWorker.ticketKey,
              phase: liveWorker.phase,
              startedAt: liveWorker.startedAt,
              lastProgressAt: liveWorker.lastProgressAt,
            }
          : null,
    },
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 py-1 text-xs shadow-xs dark:border-slate-800/80 dark:bg-slate-900/40">
      <div className="flex flex-wrap items-center gap-2">
        <MinimalWorkerPill worker={workers.ag} onOpen={onOpen} reports={reports} icon={Sparkles} />
        <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-800" />
        <MinimalWorkerPill worker={workers.codex} onOpen={onOpen} reports={reports} icon={Bot} />
      </div>

      <div className="flex items-center gap-1.5">
        {error && (
          <Tooltip title={error}>
            <span className="size-2 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
          </Tooltip>
        )}
        <Tooltip title="Tải lại trạng thái worker (Debug)">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex size-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
