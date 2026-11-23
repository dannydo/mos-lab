'use client';

import React from 'react';
import { Alert, Card, InputNumber, Progress } from 'antd';
import { Layers } from 'lucide-react';
import type { TelesalePillarsWeightConfig } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { PILLAR_WEIGHT_FIELDS, PillarWeightKey } from './telesaleConfigHelpers';

interface PillarsWeightCardProps {
  pillarsWeight: TelesalePillarsWeightConfig;
  pillarsSum: number;
  isDraft: boolean;
  onChangePillarWeight: (key: PillarWeightKey, value: number) => void;
}

export function PillarsWeightCard({
  pillarsWeight,
  pillarsSum,
  isDraft,
  onChangePillarWeight,
}: PillarsWeightCardProps) {
  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Trọng Số 4 Trụ Cột</span>
          </div>
          <StatusTag status={pillarsSum === 100 ? 'success' : 'error'} label={`Tổng: ${pillarsSum}%`} />
        </div>
      }
      className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900"
    >
      <div className="space-y-4">
        <Progress percent={pillarsSum} status={pillarsSum === 100 ? 'success' : 'exception'} />

        {pillarsSum !== 100 && (
          <Alert
            type="error"
            showIcon
            message="Tổng trọng số phải bằng đúng 100% để có thể ban hành."
            className="text-xs"
          />
        )}

        <div className="space-y-3">
          {PILLAR_WEIGHT_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-slate-800 dark:text-zinc-200">{field.title}</div>
                <div className="text-xs text-slate-500">{field.subtitle}</div>
              </div>
              <InputNumber
                min={field.min}
                max={field.max}
                value={pillarsWeight[field.key]}
                disabled={!isDraft}
                addonAfter="%"
                className="w-24"
                onChange={(val) => {
                  if (val) onChangePillarWeight(field.key, Number(val));
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
