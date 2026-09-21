'use client';

import { Button, Typography } from 'antd';
import type {
  BugReportLiveWorkerActivity,
  BugReportSummary,
  InboxWorkerStatusSummary,
  RequestClassifierWorkerHealth,
} from '@mos-lab/shared';
import type { LucideIcon } from 'lucide-react';
import { Bot, Clock3, Radio, RefreshCw, Sparkles } from 'lucide-react';
import { AppIcon, IconButton, StatusTag } from '../../../../components/ui';
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
  if (phase === 'COMMITTING') return 'Đang tạo commit';
  if (phase === 'DEPLOYING') return 'Đang deploy';
  return 'Đang code/test';
}

function WorkerBlock({
  worker,
  onOpen,
  reports,
  loading,
  icon,
}: {
  worker: InboxWorkerStatusSummary;
  onOpen: (id: number) => void;
  reports: BugReportSummary[];
  loading: boolean;
  icon: LucideIcon;
}) {
  const isOnline = worker.isOnline;
  const activeTask = worker.activeTask;
  const liveReport = activeTask ? reports.find((report) => report.id === activeTask.ticketId) : null;
  const liveActivity = liveReport ? bugReportWorkerActivity(liveReport) : null;
  const liveElapsed = activeTask?.startedAt ? `Đã chạy ${formatElapsed(activeTask.startedAt)}` : null;
  const liveEvidence = activeTask?.lastProgressAt ? formatProgressUpdated(activeTask.lastProgressAt) : null;

  return (
    <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 min-w-[260px]">
      <div className="flex items-center gap-2">
        <span
          className={worker.id === 'AG' ? 'text-indigo-600 dark:text-indigo-400' : 'text-sky-600 dark:text-sky-400'}
        >
          <AppIcon icon={icon} size="sm" />
        </span>
        <Text strong className="text-sm tracking-tight">
          {worker.name}
        </Text>
        <StatusTag
          status={isOnline ? 'success' : 'default'}
          label={loading && !worker.lastSeenAt ? 'Đang đọc' : isOnline ? 'Online' : 'Offline'}
        />
      </div>

      <span className="hidden h-4 border-l border-slate-200 dark:border-slate-800 md:block" />

      {activeTask ? (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <Button type="link" className="!h-auto !p-0 font-semibold" onClick={() => onOpen(activeTask.ticketId)}>
            {activeTask.ticketKey}
          </Button>
          <Text className="text-xs">{liveActivity?.headline || livePhaseLabel(activeTask.phase)}</Text>
          {liveElapsed && (
            <Text type="secondary" className="inline-flex items-center gap-1 tabular-nums text-xs">
              <AppIcon icon={Clock3} size="sm" />
              {liveElapsed}
            </Text>
          )}
          {liveEvidence && (
            <Text type="secondary" className="inline-flex items-center gap-1 text-xs">
              <AppIcon icon={Radio} size="sm" />
              {liveEvidence}
            </Text>
          )}
        </div>
      ) : (
        <Text type="secondary" className="text-xs">
          {isOnline ? 'Sẵn sàng nhận ticket' : 'Tạm dừng'}
        </Text>
      )}
    </div>
  );
}

/**
 * Dual worker live status bar for mOS Inbox (Antigravity & Codex IDE).
 * Displays real-time online/offline and active ticket progress for both workers independently.
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
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center md:divide-x md:divide-slate-200 dark:md:divide-slate-800">
        <div className="flex-1">
          <WorkerBlock worker={workers.ag} onOpen={onOpen} reports={reports} loading={loading} icon={Sparkles} />
        </div>
        <div className="flex-1 md:pl-4">
          <WorkerBlock worker={workers.codex} onOpen={onOpen} reports={reports} loading={loading} icon={Bot} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800 sm:border-t-0 sm:pt-0 sm:pl-3">
        {error && (
          <Text type="danger" className="text-xs">
            Không thể tải sức khỏe worker.
          </Text>
        )}
        <IconButton label="Tải lại trạng thái worker" icon={RefreshCw} loading={loading} onClick={onRefresh} />
      </div>
    </div>
  );
}
