'use client';

import React from 'react';
import { Button, Descriptions } from 'antd';
import { CalendarDays, CircleCheck, Rocket, UsersRound } from 'lucide-react';
import type { AcademyCampaign, AcademyCampaignStats } from '@mos-lab/shared';
import { AppIcon, DataSection, MetricGrid } from '~/components/ui';
import { formatCampaignDateRange } from '../../components/academy-campaign-utils';
import styles from '../AcademyCampaignDetailPage.module.css';

export interface CampaignDetailSummarySectionProps {
  campaign: AcademyCampaign;
  stats: AcademyCampaignStats;
  assignmentNames: string;
  canConfigure: boolean;
  onOpenConfig: () => void;
}

export function CampaignDetailSummarySection({
  campaign,
  stats,
  assignmentNames,
  canConfigure,
  onOpenConfig,
}: CampaignDetailSummarySectionProps) {
  return (
    <>
      <MetricGrid
        className={styles.metricGrid}
        columns={4}
        items={[
          {
            key: 'leads',
            title: 'Tệp lead',
            value: stats.totalLeads,
            format: 'number',
            icon: <AppIcon icon={UsersRound} />,
            subValue: `${campaign._count?.leads || 0} lead cố định`,
          },
          {
            key: 'touched',
            title: 'Đã chạm',
            value: stats.touchedLeadCount,
            format: 'number',
            icon: <AppIcon icon={CircleCheck} />,
            subValue: `${stats.touchpointLogCount.toLocaleString('vi-VN')} lượt ghi nhận`,
          },
          {
            key: 'test',
            title: 'Hẹn / đã test',
            value: stats.scheduledCount,
            format: 'number',
            icon: <AppIcon icon={CalendarDays} />,
            subValue: `${stats.testedCount.toLocaleString('vi-VN')} đã test`,
          },
          {
            key: 'won',
            title: 'Đã chốt',
            value: stats.wonCount,
            format: 'number',
            icon: <AppIcon icon={Rocket} />,
            subValue: `${Math.round(stats.revenueVnd).toLocaleString('vi-VN')} đ · ${stats.wonRate.toLocaleString('vi-VN')}%`,
          },
        ]}
      />

      <DataSection
        title="Thiết lập chiến dịch"
        extra={
          canConfigure ? (
            <Button type="link" onClick={onOpenConfig}>
              Chỉnh cấu hình
            </Button>
          ) : undefined
        }
      >
        <Descriptions
          size="small"
          column={{ xs: 1, sm: 2, lg: 4 }}
          items={[
            {
              key: 'period',
              label: 'Thời gian',
              children: formatCampaignDateRange(campaign.startDate, campaign.endDate),
            },
            { key: 'team', label: 'Đội thực thi', children: assignmentNames || 'Chưa giao — chỉ quản lý nhìn thấy' },
            {
              key: 'snapshot',
              label: 'Tệp snapshot',
              children: `${(campaign._count?.leads || 0).toLocaleString('vi-VN')} lead cố định`,
            },
            {
              key: 'touchpoints',
              label: 'Nhịp chạm',
              children: `${(campaign._count?.touchpoints || 0).toLocaleString('vi-VN')} điểm chạm`,
            },
          ]}
        />
        {campaign.audienceSummary && <p className="mb-0 mt-3 text-sm opacity-70">{campaign.audienceSummary}</p>}
      </DataSection>
    </>
  );
}
