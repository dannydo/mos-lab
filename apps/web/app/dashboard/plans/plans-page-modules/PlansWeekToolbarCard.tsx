'use client';

import React from 'react';
import { Badge, Button, Space, Typography } from 'antd';
import { ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import { AppIcon, SectionCard } from '~/components/ui';

const { Text } = Typography;

export interface PlansWeekToolbarCardProps {
  weekRangeLabel: string;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
}

export function PlansWeekToolbarCard({
  weekRangeLabel,
  onPrevWeek,
  onNextWeek,
  onCurrentWeek,
}: PlansWeekToolbarCardProps) {
  return (
    <SectionCard className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Space>
          <Button icon={<AppIcon icon={ChevronLeft} size={14} />} onClick={onPrevWeek} aria-label="Tuần trước" />
          <Text strong className="text-base tabular-nums text-[var(--mos-text)]">
            {weekRangeLabel}
          </Text>
          <Button icon={<AppIcon icon={ChevronRight} size={14} />} onClick={onNextWeek} aria-label="Tuần sau" />
          <Button onClick={onCurrentWeek}>Tuần Này</Button>
        </Space>

        <Space size="large" wrap>
          <Space>
            <Badge status="success" />
            <Text className="text-[var(--mos-text-secondary)]">Checkin (CK)</Text>
          </Space>
          <Space>
            <AppIcon icon={Phone} size={14} className="text-emerald-600 dark:text-emerald-400" />
            <Text className="text-[var(--mos-text-secondary)]">Có bắt máy</Text>
          </Space>
          <Space>
            <AppIcon icon={Phone} size={14} className="text-rose-600 dark:text-rose-400" />
            <Text className="text-[var(--mos-text-secondary)]">Gọi nhỡ</Text>
          </Space>
        </Space>
      </div>
    </SectionCard>
  );
}
