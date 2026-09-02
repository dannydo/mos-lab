'use client';

import { Button, Space, Typography } from 'antd';
import type { BugReportRequestType } from '@mos-lab/shared';
import { StatusTag } from '../../../../components/ui';
import { CLARIFICATION_FILTER_LABELS, NEXT_ACTOR_LABELS, STATUS_LABELS } from '../bug-report-presenters';
import type { BugInboxFilters } from '../hooks/useBugReports';

const { Text } = Typography;

const REQUEST_TYPE_FILTER_LABELS: Record<BugReportRequestType, string> = {
  BUG: 'Báo lỗi',
  FEATURE: 'Yêu cầu chức năng',
};

export function getActiveBugInboxFilterLabels(filters: BugInboxFilters): string[] {
  const labels: string[] = [];
  const search = filters.search.trim();
  if (search) labels.push(`Tìm: ${search}`);
  if (filters.requestType !== 'ALL') labels.push(`Loại: ${REQUEST_TYPE_FILTER_LABELS[filters.requestType]}`);
  if (filters.nextActor !== 'ALL') labels.push(`Người xử lý tiếp: ${NEXT_ACTOR_LABELS[filters.nextActor]}`);
  if (filters.status !== 'ALL') labels.push(`Trạng thái: ${STATUS_LABELS[filters.status]}`);
  if (filters.priority !== 'ALL') labels.push(`Priority: ${filters.priority}`);
  if (filters.clarification !== 'ALL') labels.push(`Mức độ rõ: ${CLARIFICATION_FILTER_LABELS[filters.clarification]}`);
  return labels;
}

export function bugReportFilterControlClassName(active: boolean, className?: string) {
  return ['mos-inbox-filter-control', active && 'is-active', className].filter(Boolean).join(' ');
}

export function BugReportFilterEmptyState({ labels, onClear }: { labels: string[]; onClear: () => void }) {
  return (
    <Space direction="vertical" size={8} align="center">
      <Text strong>Không có yêu cầu khớp bộ lọc đang chọn.</Text>
      <Space wrap size={[4, 4]} className="justify-center">
        {labels.map((label) => (
          <StatusTag bordered={false} key={label} label={label} status="processing" />
        ))}
      </Space>
      <Button size="small" onClick={onClear}>
        Xóa toàn bộ lọc
      </Button>
    </Space>
  );
}
