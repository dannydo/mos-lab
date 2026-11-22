'use client';

import React, { useMemo } from 'react';
import { Card } from 'antd';
import { TrendingUp } from 'lucide-react';
import type { TelesaleLevelKpiConfig } from '@mos-lab/shared';
import { DataTable } from '~/components/ui';
import { buildLevelTargetsColumns } from './levelTargetsColumns';
import type { LevelTargetNumericField } from './telesaleConfigHelpers';

interface LevelTargetsCardProps {
  levelTargets: TelesaleLevelKpiConfig[];
  isDraft: boolean;
  onUpdateLevelTarget: (index: number, field: LevelTargetNumericField, value: number) => void;
}

export function LevelTargetsCard({ levelTargets, isDraft, onUpdateLevelTarget }: LevelTargetsCardProps) {
  const columns = useMemo(
    () => buildLevelTargetsColumns({ isDraft, onUpdateLevelTarget }),
    [isDraft, onUpdateLevelTarget]
  );

  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <span>Mục Tiêu KPI Theo Level 1 – 9 (Mặc Định: 100, 150, ..., 500 Done)</span>
          </div>
          <span className="text-xs text-slate-500">Tự động đồng bộ với BK Leaderboard</span>
        </div>
      }
      className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900"
    >
      <DataTable dataSource={levelTargets} rowKey="level" pagination={false} size="small" columns={columns} />
    </Card>
  );
}
