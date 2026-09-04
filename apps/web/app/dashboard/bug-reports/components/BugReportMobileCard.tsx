'use client';

import { Avatar, Badge, Tooltip, Typography } from 'antd';
import type { BugReportSummary } from '@mos-lab/shared';
import { Clock3 } from 'lucide-react';
import { AppIcon } from '../../../../components/ui';
import { BugReportWorkflowProgress } from '../../../../components/bug-reports/BugReportWorkflowProgress';
import { BugReportWorkerActivityCell } from './BugReportWorkerActivity';
import {
  BugStatusTag,
  ClarificationTag,
  effectiveBugReportAgentProgress,
  formatElapsed,
  initials,
  needsReporterAttention,
  NextActionTag,
  PriorityTag,
  RequestTypeTag,
  shortBugReportReporterName,
} from '../bug-report-presenters';

const { Paragraph, Text } = Typography;

interface BugReportMobileCardProps {
  report: BugReportSummary;
  onOpen: (id: number) => void;
}

export function BugReportMobileCard({ report, onOpen }: BugReportMobileCardProps) {
  const reporterAttention = needsReporterAttention(report);

  return (
    <button type="button" className="w-full text-left" onClick={() => onOpen(report.id)}>
      <div className="mb-3 flex items-start gap-3">
        <Avatar size={36} src={report.reporter.avatarUrl || undefined}>
          {initials(report.reporter.displayName)}
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <Text strong>{report.key}</Text>
            <div className="flex items-center gap-2">
              <RequestTypeTag requestType={report.requestType} />
              <PriorityTag priority={report.priority} />
              <BugStatusTag
                status={report.status}
                reporterName={report.reporter.displayName}
                agentProgress={effectiveBugReportAgentProgress(report).stage}
              />
            </div>
          </div>
          <ClarificationTag status={report.clarification.status} reporterName={report.reporter.displayName} />
          <div className="mt-2">
            <BugReportWorkflowProgress report={report} />
          </div>
          <div className="mt-3 rounded-lg border p-2.5">
            <Text type="secondary" className="mb-1 block text-xs">
              Worker đang làm gì
            </Text>
            <BugReportWorkerActivityCell report={report} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Tooltip
              title={
                reporterAttention
                  ? `Đang cần ${shortBugReportReporterName(report.reporter.displayName) || 'người báo'} phản hồi hoặc xác nhận`
                  : undefined
              }
            >
              <Badge dot={reporterAttention}>
                <span className="inline-flex">
                  <NextActionTag action={report.nextAction} reporterName={report.reporter.displayName} />
                </span>
              </Badge>
            </Tooltip>
            <Text type="secondary" className="tabular-nums text-xs">
              Chờ {formatElapsed(report.nextAction.waitingSince)}
            </Text>
          </div>
          <Text type="secondary">{report.reporter.displayName}</Text>
        </div>
      </div>
      <Paragraph ellipsis={{ rows: 2 }} className="mb-2">
        {report.description}
      </Paragraph>
      <div className="flex items-center justify-between gap-2">
        <Text type="secondary" ellipsis>
          {report.sourcePath}
        </Text>
        <Text type="secondary" className="shrink-0">
          <AppIcon icon={Clock3} size="sm" /> {formatElapsed(report.createdAt)}
        </Text>
      </div>
    </button>
  );
}
