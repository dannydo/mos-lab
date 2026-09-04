'use client';

import { Button, Typography } from 'antd';
import type { BugReportSummary } from '@mos-lab/shared';
import { Bot, Clock3, Radio } from 'lucide-react';
import { AppIcon, SectionCard, StatusTag } from '../../../../components/ui';
import { bugReportWorkerActivity } from '../bug-report-presenters';

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

/** A compact, server-derived view of active jobs in the currently displayed Inbox list. */
export function ActiveBugReportWorkCard({
  reports,
  onOpen,
}: {
  reports: BugReportSummary[];
  onOpen: (id: number) => void;
}) {
  const activeReports = reports
    .map((report) => ({ report, activity: bugReportWorkerActivity(report) }))
    .filter(({ activity }) => activity.active);
  if (!activeReports.length) return null;

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <AppIcon icon={Bot} size="md" />
          Đang xử lý
        </span>
      }
      extra={<StatusTag status="processing" label={`${activeReports.length} job đang theo dõi`} />}
    >
      <div className="divide-y rounded-xl border">
        {activeReports.slice(0, 3).map(({ report, activity }) => (
          <Button
            key={report.id}
            type="text"
            block
            className="!h-auto !p-3 text-left"
            onClick={() => onOpen(report.id)}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-400">
                <AppIcon icon={Bot} size="sm" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Text strong>{report.key}</Text>
                  <Text>{activity.headline}</Text>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {activity.elapsed && (
                    <Text type="secondary" className="inline-flex items-center gap-1 tabular-nums">
                      <AppIcon icon={Clock3} size="sm" />
                      {activity.elapsed}
                    </Text>
                  )}
                  {activity.evidence && (
                    <Text type="secondary" className="inline-flex items-center gap-1">
                      <AppIcon icon={Radio} size="sm" />
                      {activity.evidence}
                    </Text>
                  )}
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </SectionCard>
  );
}
