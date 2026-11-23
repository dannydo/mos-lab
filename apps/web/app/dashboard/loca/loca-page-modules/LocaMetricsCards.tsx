'use client';

import React from 'react';
import { Card, Col, Row, Typography } from 'antd';
import type { LocaOverallStats } from '../hooks/use-loca-data/types';

const { Text } = Typography;

export interface LocaMetricsCardsProps {
  themeMode: 'light' | 'dark';
  overallStats: LocaOverallStats;
  tabCounts: Record<string, number>;
}

export function LocaMetricsCards({ themeMode, overallStats, tabCounts }: LocaMetricsCardsProps) {
  const isDark = themeMode === 'dark';
  const cardClassName = `rounded-lg border transition-colors ${
    isDark ? 'border-amber-500/20 bg-amber-500/5' : 'border-slate-200 bg-white'
  }`;

  const metrics = [
    {
      key: 'totalComboLive',
      label: '∑ KH LoCa (Combo Live)',
      value: overallStats.totalComboLive,
      unit: 'khách',
      valueClass: 'text-[var(--mos-text)]',
    },
    {
      key: 'hsd30',
      label: 'HSD 30 (Sắp hết hạn)',
      value: tabCounts['HSD_30'] || 0,
      unit: 'khách',
      valueClass: isDark ? 'text-rose-400' : 'text-rose-700',
    },
    {
      key: 'lsd1',
      label: 'LSD 1 (Còn 1 lần dùng)',
      value: tabCounts['LSD_1'] || 0,
      unit: 'khách',
      valueClass: isDark ? 'text-amber-400' : 'text-amber-700',
    },
    {
      key: 'calledToday',
      label: 'Đã gọi hôm nay',
      value: overallStats.totalCalledToday,
      unit: 'cuộc gọi',
      valueClass: isDark ? 'text-[var(--color-primary)]' : 'text-amber-800',
    },
  ];

  return (
    <Row gutter={[16, 16]} className="mb-6">
      {metrics.map((metric) => (
        <Col key={metric.key} xs={24} sm={12} md={6}>
          <Card variant="borderless" className={cardClassName}>
            <Text type="secondary" className="text-[13px]">
              {metric.label}
            </Text>
            <div className={`mt-1 text-[26px] font-bold leading-tight tabular-nums ${metric.valueClass}`}>
              {metric.value}{' '}
              <span className="text-[13px] font-normal text-[var(--mos-text-secondary)]">{metric.unit}</span>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
