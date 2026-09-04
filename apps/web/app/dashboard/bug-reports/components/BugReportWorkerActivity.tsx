'use client';

import { Button, Typography } from 'antd';
import type { BugReportLiveWorkerActivity, BugReportSummary, RequestClassifierWorkerHealth } from '@mos-lab/shared';
import { Bot, Clock3, Radio, RefreshCw } from 'lucide-react';
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

/**
 * One compact truth source for the live Mac worker.  The ticket is supplied
 * by the server summary rather than inferred from currently visible rows, so
 * filtering or pagination can never create a second, conflicting worker.
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
  const liveReport = liveWorker ? reports.find((report) => report.id === liveWorker.ticketId) : null;
  const liveActivity = liveReport ? bugReportWorkerActivity(liveReport) : null;
  const isOnline = health?.state === 'ONLINE';
  const stateStatus = isOnline ? 'success' : health?.state === 'DEGRADED' ? 'warning' : 'error';
  const liveElapsed = liveWorker?.startedAt ? `Đã chạy ${formatElapsed(liveWorker.startedAt)}` : null;
  const liveEvidence = liveWorker?.lastProgressAt ? formatProgressUpdated(liveWorker.lastProgressAt) : null;
  const activeTask = liveWorker
    ? { ticketId: liveWorker.ticketId, ticketKey: liveWorker.ticketKey, phase: livePhaseLabel(liveWorker.phase) }
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border bg-white px-4 py-3 shadow-sm dark:bg-slate-950">
      <div className="flex items-center gap-2">
        <AppIcon icon={Bot} size="sm" />
        <Text strong>Worker Mac</Text>
        <StatusTag
          status={stateStatus}
          label={health ? (isOnline ? 'Online' : health.state) : loading ? 'Đang đọc' : 'Không rõ'}
        />
      </div>
      <span className="hidden h-7 border-l sm:block" />
      {activeTask ? (
        <>
          <Button type="link" className="!h-auto !p-0" onClick={() => onOpen(activeTask.ticketId)}>
            {activeTask.ticketKey}
          </Button>
          <Text>{liveActivity?.headline || activeTask.phase}</Text>
          {liveElapsed && (
            <Text type="secondary" className="inline-flex items-center gap-1 tabular-nums">
              <AppIcon icon={Clock3} size="sm" />
              {liveElapsed}
            </Text>
          )}
          {liveEvidence && (
            <Text type="secondary" className="inline-flex items-center gap-1">
              <AppIcon icon={Radio} size="sm" />
              {liveEvidence}
            </Text>
          )}
        </>
      ) : (
        <Text type="secondary">
          {health?.activeJob ? 'Worker đang xử lý một tác vụ Inbox khác.' : 'Không có ticket đang chạy.'}
        </Text>
      )}
      <span className="ml-auto">
        <IconButton label="Tải lại trạng thái worker" icon={RefreshCw} loading={loading} onClick={onRefresh} />
      </span>
      {error && <Text type="danger">Không thể tải sức khỏe worker.</Text>}
    </div>
  );
}
