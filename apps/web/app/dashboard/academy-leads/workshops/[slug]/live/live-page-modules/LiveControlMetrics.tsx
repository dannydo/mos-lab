'use client';

import { Trophy, Users } from 'lucide-react';
import type { AcademyWorkshopLiveState } from '@mos-lab/shared';
import { AppIcon, MetricGrid } from '~/components/ui';

export interface LiveControlMetricsProps {
  state: AcademyWorkshopLiveState;
}

export function LiveControlMetrics({ state }: LiveControlMetricsProps) {
  return (
    <MetricGrid
      items={[
        {
          key: 'participants',
          title: 'Roster',
          value: state.participantCount,
          format: 'number',
          icon: <AppIcon icon={Users} />,
        },
        { key: 'online', title: 'Đang online', value: state.connectedParticipantCount, format: 'number' },
        {
          key: 'answers',
          title: 'Đã vào BXH game',
          value: state.gameLeaderboard.filter((item) => item.score > 0).length,
          format: 'number',
        },
        {
          key: 'talent',
          title: 'Đã có kết quả Tố Chất',
          value: state.talentLeaderboard.length,
          format: 'number',
          icon: <AppIcon icon={Trophy} />,
        },
      ]}
    />
  );
}
