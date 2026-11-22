'use client';

import React from 'react';
import { Card, Col, Progress, Row, Space, Typography } from 'antd';
import { DollarSign } from 'lucide-react';
import type { KPISummary } from '@mos-lab/shared';
import { AppIcon } from '~/components/ui';
import { buildKpiOverviewCards, type KpiOverviewTone } from './kpi-page.utils';

const { Text } = Typography;

export interface KpiStatsOverviewGridProps {
  summary: KPISummary | null;
}

const VALUE_COLOR_CLASS: Record<KpiOverviewTone, string> = {
  neutral: 'text-[var(--mos-text)]',
  blue: 'text-sky-600 dark:text-sky-400',
  green: 'text-emerald-600 dark:text-emerald-400',
  primary: 'text-[var(--mos-accent)]',
  purple: 'text-purple-600 dark:text-purple-400',
};

const PROGRESS_STROKE_COLOR: Record<KpiOverviewTone, string> = {
  neutral: 'var(--mos-text-muted)',
  blue: 'rgb(24, 144, 255)',
  green: 'rgb(82, 196, 26)',
  primary: 'var(--mos-accent)',
  purple: 'rgb(114, 46, 209)',
};

export function KpiStatsOverviewGrid({ summary }: KpiStatsOverviewGridProps) {
  const cards = buildKpiOverviewCards(summary);

  return (
    <Row gutter={[16, 16]} className="mb-6">
      {cards.map((card) => (
        <Col key={card.key} xs={24} sm={12} md={8} lg={4} xl={4}>
          <Card variant="outlined" className={card.highlighted ? 'h-full !border-[var(--mos-accent)]' : 'h-full'}>
            {card.showDollarIcon ? (
              <Space>
                <AppIcon icon={DollarSign} size={15} className="text-[var(--mos-accent)]" />
                <Text type="secondary" className="text-xs">
                  {card.label}
                </Text>
              </Space>
            ) : (
              <Text type="secondary" className="text-xs">
                {card.label}
              </Text>
            )}
            <div
              className={`text-[26px] font-bold my-2 leading-tight ${VALUE_COLOR_CLASS[card.tone]} ${
                card.tabularNums ? 'tabular-nums' : ''
              }`.trim()}
            >
              {card.value}
            </div>
            <Progress
              percent={card.percent}
              showInfo={false}
              strokeColor={PROGRESS_STROKE_COLOR[card.tone]}
              size="small"
            />
            <Text type="secondary" className="text-[11px]">
              {card.subtitle}
            </Text>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
