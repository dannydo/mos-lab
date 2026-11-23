'use client';

import { Space, Typography } from 'antd';
import type { PayrollAdjustmentLabCase } from '@mos-lab/shared';
import { StatCard, StatusTag } from '~/components/ui';
import { formatDong, getCaseStatusTagType } from './payrollAdjustmentLabUtils';

const { Text } = Typography;

interface AdjustmentCaseMetricsSummaryProps {
  adjustmentCase: PayrollAdjustmentLabCase;
}

export function AdjustmentCaseMetricsSummary({ adjustmentCase }: AdjustmentCaseMetricsSummaryProps) {
  return (
    <Space direction="vertical" size={8} className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <StatusTag status={getCaseStatusTagType(adjustmentCase.status)} label={adjustmentCase.status} />
        <Text>
          Người tạo: {adjustmentCase.requestedBy || '—'} · Người duyệt: {adjustmentCase.approvedBy || '—'}
        </Text>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard title="Trước" value={formatDong(adjustmentCase.beforeAmount)} />
        <StatCard title="Sau" value={formatDong(adjustmentCase.afterAmount)} />
        <StatCard title="Delta" value={formatDong(adjustmentCase.deltaAmount)} />
      </div>
      <Text type="secondary">
        Audit: {adjustmentCase.audit.map((entry) => `${entry.action} · ${entry.actorName}`).join(' → ')}
      </Text>
      <Text type="secondary">Posting: {adjustmentCase.lines.map((line) => line.postingState).join(', ')}</Text>
    </Space>
  );
}
