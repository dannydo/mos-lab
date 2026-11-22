'use client';

import React from 'react';
import { Card, Divider, Space, Tooltip, Typography } from 'antd';
import { PieChart } from 'lucide-react';
import type { OutcomeBreakdown } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { getPercent } from '~/lib/format-utils';
import { buildCallOutcomeBreakdown } from './kpi-page.utils';

const { Text } = Typography;

export interface KpiCallBreakdownCardProps {
  breakdown: OutcomeBreakdown | null;
}

export function KpiCallBreakdownCard({ breakdown }: KpiCallBreakdownCardProps) {
  const { totalLogs, items, segments } = buildCallOutcomeBreakdown(breakdown);

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2 text-[var(--mos-text)]">
          <AppIcon icon={PieChart} size="sm" />
          Phân bổ kết quả cuộc gọi
        </span>
      }
      variant="outlined"
      className="h-[400px]"
    >
      {totalLogs === 0 ? (
        <div className="flex justify-center items-center h-64">
          <Text type="secondary">Chưa có cuộc gọi được thực hiện</Text>
        </div>
      ) : (
        <div className="flex flex-col gap-4 mt-2">
          <svg
            viewBox="0 0 1000 20"
            preserveAspectRatio="none"
            role="img"
            aria-label="Biểu đồ phân bổ kết quả cuộc gọi"
            className="block w-full h-5 rounded-full overflow-hidden mb-4"
          >
            {segments.map((segment) => (
              <Tooltip key={segment.key} title={`${segment.label}: ${segment.value} (${segment.percent}%)`}>
                <rect
                  x={segment.x}
                  y={0}
                  width={segment.width}
                  height={20}
                  aria-label={`${segment.label}: ${segment.value} (${segment.percent}%)`}
                  className={`${segment.fillClass} cursor-pointer hover:opacity-80 transition-opacity`}
                />
              </Tooltip>
            ))}
          </svg>

          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.key} className="flex justify-between items-center">
                <Space>
                  <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${item.dotClass}`} aria-hidden="true" />
                  <span className="text-[13px] text-[var(--mos-text)]">{item.label}</span>
                </Space>
                <span className="text-[13px] font-semibold tabular-nums text-[var(--mos-text)]">
                  {item.value} cuộc{' '}
                  <Text type="secondary" className="text-[11px]">
                    ({getPercent(item.value, totalLogs)}%)
                  </Text>
                </span>
              </div>
            ))}
          </div>

          <Divider className="!my-2.5" />
          <div className="text-center text-xs text-[var(--mos-text-muted)]">
            Tổng số cuộc gọi đã kết nối: <strong className="tabular-nums">{totalLogs}</strong>
          </div>
        </div>
      )}
    </Card>
  );
}
