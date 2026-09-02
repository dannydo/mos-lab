'use client';

import { useMemo } from 'react';
import { Avatar, Badge, Button, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { BugReportSummary } from '@mos-lab/shared';
import { ExternalLink } from 'lucide-react';
import { AppIcon } from '../../../../components/ui';
import { BugReportWorkflowProgress } from '../../../../components/bug-reports/BugReportWorkflowProgress';
import {
  ClarificationTag,
  formatElapsed,
  initials,
  needsReporterAttention,
  NextActionTag,
  PriorityTag,
  RequestTypeTag,
} from '../bug-report-presenters';

const { Text } = Typography;

export function useBugReportInboxColumns(onOpen: (id: number) => void) {
  return useMemo<ColumnsType<BugReportSummary>>(
    () => [
      {
        title: 'Ticket',
        key: 'ticket',
        width: 320,
        render: (_, row) => (
          <div className="flex min-w-0 items-start gap-3">
            <Avatar size={36} src={row.reporter.avatarUrl || undefined}>
              {initials(row.reporter.displayName)}
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Text strong>{row.key}</Text>
                <RequestTypeTag requestType={row.requestType} />
                <PriorityTag priority={row.priority} />
                <ClarificationTag status={row.clarification.status} />
              </div>
              <Text ellipsis={{ tooltip: row.description }}>{row.description}</Text>
              <div className="mt-1">
                <Text type="secondary">{row.reporter.displayName}</Text>
              </div>
            </div>
          </div>
        ),
      },
      {
        title: 'Vị trí',
        dataIndex: 'sourcePath',
        key: 'sourcePath',
        width: 230,
        render: (value: string, row) => (
          <div>
            <Text code>{value}</Text>
            {row.overlay && (
              <div className="mt-1">
                <Text type="secondary">{row.overlay}</Text>
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Tiến độ',
        key: 'workflow',
        width: 175,
        render: (_, row) => <BugReportWorkflowProgress report={row} />,
      },
      {
        title: 'Ảnh',
        dataIndex: 'attachmentCount',
        key: 'attachmentCount',
        width: 72,
        align: 'center',
        render: (value: number) => <span className="tabular-nums">{value}</span>,
      },
      {
        title: 'Bước tiếp theo',
        key: 'agentProgress',
        width: 290,
        render: (_, row) => {
          const reporterAttention = needsReporterAttention(row);
          return (
            <div className="min-w-0 space-y-1.5 text-xs">
              <Tooltip title={reporterAttention ? 'Đang cần người báo phản hồi hoặc xác nhận' : undefined}>
                <Badge dot={reporterAttention}>
                  <span className="inline-flex">
                    <NextActionTag action={row.nextAction} />
                  </span>
                </Badge>
              </Tooltip>
              <div>
                <Text type="secondary" className="tabular-nums">
                  Chờ {formatElapsed(row.nextAction.waitingSince)}
                </Text>
              </div>
              <Text type="secondary" ellipsis={{ tooltip: row.nextAction.detail }}>
                {row.nextAction.detail}
              </Text>
            </div>
          );
        },
      },
      {
        title: '',
        key: 'action',
        width: 70,
        fixed: 'right',
        render: (_, row) => (
          <Button
            type="text"
            aria-label={`Mở ${row.key}`}
            icon={<AppIcon icon={ExternalLink} size="sm" />}
            onClick={(event) => {
              event.stopPropagation();
              onOpen(row.id);
            }}
          />
        ),
      },
    ],
    [onOpen]
  );
}
