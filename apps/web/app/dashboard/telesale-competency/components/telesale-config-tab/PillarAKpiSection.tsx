'use client';

import React from 'react';
import { Card, InputNumber, Switch } from 'antd';
import { Target } from 'lucide-react';
import type { TelesalePillarAKpiConfig } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';

type SimplePillarAKpiKey = 'newCustomersKpi' | 'revenueKpi' | 'conversionKpi' | 'callProductivityKpi';

interface SimpleKpiCardMeta {
  key: SimplePillarAKpiKey;
  title: string;
  max: number;
  description: string;
  colSpanClass?: string;
}

const SIMPLE_KPI_CARDS: readonly SimpleKpiCardMeta[] = [
  {
    key: 'newCustomersKpi',
    title: '2. Done Khách Mới',
    max: 20,
    description: 'Số lượng khách hàng mới hoàn thành dịch vụ trong tháng theo Level.',
  },
  {
    key: 'revenueKpi',
    title: '3. Doanh Thu Thực Tế',
    max: 20,
    description: 'Doanh số phát sinh từ các đơn hoàn tất của khách Book theo Level.',
  },
  {
    key: 'conversionKpi',
    title: '4. Tỷ Lệ Chuyển Đổi',
    max: 15,
    description: 'Chuẩn: Done/Book $\\ge$ 70%, Book/Connected Calls $\\ge$ 15%.',
  },
  {
    key: 'callProductivityKpi',
    title: '5. Năng Suất Cuộc Gọi',
    max: 15,
    description: 'Đánh giá sản lượng cuộc gọi gọi ra và cuộc gọi kết nối thành công qua tổng đài OmiCall.',
    colSpanClass: 'md:col-span-2',
  },
];

interface PillarAKpiSectionProps {
  pillarAConfig: TelesalePillarAKpiConfig;
  pillarAWeight: number;
  isDraft: boolean;
  onUpdatePillarAConfig: (updater: (prev: TelesalePillarAKpiConfig) => TelesalePillarAKpiConfig) => void;
}

export function PillarAKpiSection({
  pillarAConfig,
  pillarAWeight,
  isDraft,
  onUpdatePillarAConfig,
}: PillarAKpiSectionProps) {
  return (
    <Card
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 dark:text-zinc-100">
            <Target className="w-4 h-4 text-emerald-500" />
            <span>5 Chỉ Số Trụ Cột A & Điểm Tối Đa</span>
          </div>
          <StatusTag status="cyan" label={`Trọng số Trụ cột A: ${pillarAWeight}đ`} />
        </div>
      }
      className="rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-xs bg-white dark:bg-zinc-900"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
              1. KPI Done (Mục tiêu hàng tháng)
            </span>
            <InputNumber
              min={1}
              max={25}
              value={pillarAConfig.doneKpi.maxScore}
              disabled={!isDraft}
              addonAfter="đ"
              className="w-20"
              onChange={(val) =>
                val &&
                onUpdatePillarAConfig((prev) => ({
                  ...prev,
                  doneKpi: { ...prev.doneKpi, maxScore: Number(val) },
                }))
              }
            />
          </div>
          <p className="text-xs text-slate-600 dark:text-zinc-400">
            Công thức:{' '}
            <code className="bg-emerald-100 dark:bg-emerald-950/60 px-1 py-0.5 rounded text-emerald-700 dark:text-emerald-300">
              MIN(Done thực tế / KPI Level, 1) × Điểm tối đa
            </code>
          </p>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500">Thưởng vượt KPI (trần tối đa 120%)</span>
            <Switch
              checked={pillarAConfig.doneKpi.allowOverflowBonus}
              disabled={!isDraft}
              onChange={(checked) =>
                onUpdatePillarAConfig((prev) => ({
                  ...prev,
                  doneKpi: { ...prev.doneKpi, allowOverflowBonus: checked },
                }))
              }
            />
          </div>
        </div>

        {SIMPLE_KPI_CARDS.map((item) => (
          <div
            key={item.key}
            className={`p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-2 ${item.colSpanClass || ''}`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-slate-800 dark:text-zinc-200">{item.title}</span>
              <InputNumber
                min={1}
                max={item.max}
                value={pillarAConfig[item.key].maxScore}
                disabled={!isDraft}
                addonAfter="đ"
                className="w-20"
                onChange={(val) =>
                  val &&
                  onUpdatePillarAConfig((prev) => ({
                    ...prev,
                    [item.key]: {
                      ...prev[item.key],
                      maxScore: Number(val),
                    },
                  }))
                }
              />
            </div>
            <p className="text-xs text-slate-500">{item.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
