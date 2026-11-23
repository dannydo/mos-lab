'use client';

import { BookOpen, CheckCircle2, Flame } from 'lucide-react';
import type { AcademyLeadSummary } from '@mos-lab/shared';
import { AppIcon, MetricGrid } from '~/components/ui';

export interface AcademyLeadsMetricsProps {
  summary: AcademyLeadSummary;
}

export function AcademyLeadsMetrics({ summary }: AcademyLeadsMetricsProps) {
  return (
    <MetricGrid
      columns={4}
      items={[
        {
          key: 'all',
          title: 'Khách hàng Academy',
          value: summary.total,
          format: 'number',
          icon: <AppIcon icon={BookOpen} />,
        },
        {
          key: 'warm',
          title: 'Đang tư vấn',
          value: summary.warmCount,
          format: 'number',
          icon: <AppIcon icon={BookOpen} />,
        },
        {
          key: 'hot',
          title: 'Hot dưới 72 giờ',
          value: summary.hotCount,
          format: 'number',
          icon: <AppIcon icon={Flame} />,
        },
        {
          key: 'tasks',
          title: 'Follow-up quá hạn',
          value: summary.overdueFollowUps,
          format: 'number',
          icon: <AppIcon icon={CheckCircle2} />,
        },
      ]}
    />
  );
}
