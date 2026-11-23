'use client';

import React from 'react';
import { InputNumber } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { TelesaleLevelKpiConfig, TelesaleTier } from '@mos-lab/shared';
import { StatusTag } from '~/components/ui';
import { getTierStatus, LevelTargetNumericField } from './telesaleConfigHelpers';

interface BuildLevelTargetsColumnsParams {
  isDraft: boolean;
  onUpdateLevelTarget: (index: number, field: LevelTargetNumericField, value: number) => void;
}

interface NumericColumnOptions {
  title: string;
  field: LevelTargetNumericField;
  min: number;
  step?: number;
  widthClass: string;
  formatReadOnly: (val: number) => React.ReactNode;
}

export function buildLevelTargetsColumns({
  isDraft,
  onUpdateLevelTarget,
}: BuildLevelTargetsColumnsParams): ColumnsType<TelesaleLevelKpiConfig> {
  const makeNumericColumn = ({
    title,
    field,
    min,
    step,
    widthClass,
    formatReadOnly,
  }: NumericColumnOptions): ColumnsType<TelesaleLevelKpiConfig>[number] => ({
    title,
    dataIndex: field,
    key: field,
    render: (val: number, _record: TelesaleLevelKpiConfig, idx: number) =>
      isDraft ? (
        <InputNumber
          min={min}
          step={step}
          value={val}
          className={`${widthClass} tabular-nums`}
          onChange={(v) => {
            if (!v) return;
            onUpdateLevelTarget(idx, field, Number(v));
          }}
        />
      ) : (
        formatReadOnly(val)
      ),
  });

  return [
    {
      title: 'Level',
      dataIndex: 'level',
      key: 'level',
      width: 75,
      render: (level: number) => <span className="font-bold text-indigo-600 dark:text-indigo-400">L{level}</span>,
    },
    {
      title: 'Chức danh',
      dataIndex: 'tier',
      key: 'tier',
      width: 120,
      render: (tier: TelesaleTier) => <StatusTag status={getTierStatus(tier)} label={tier} />,
    },
    makeNumericColumn({
      title: 'KPI Done (đơn)',
      field: 'doneTarget',
      min: 1,
      widthClass: 'w-24',
      formatReadOnly: (val) => (
        <span className="font-semibold tabular-nums text-slate-900 dark:text-zinc-100">
          {val.toLocaleString('vi-VN')}
        </span>
      ),
    }),
    makeNumericColumn({
      title: 'Khách mới',
      field: 'newCustomersTarget',
      min: 0,
      widthClass: 'w-20',
      formatReadOnly: (val) => <span className="tabular-nums">{val}</span>,
    }),
    makeNumericColumn({
      title: 'Doanh thu (đ)',
      field: 'revenueTarget',
      min: 0,
      step: 5000000,
      widthClass: 'w-28',
      formatReadOnly: (val) => <span className="tabular-nums">{(val / 1000000).toFixed(1)} tr</span>,
    }),
    makeNumericColumn({
      title: 'Cuộc gọi',
      field: 'callsTarget',
      min: 0,
      widthClass: 'w-24',
      formatReadOnly: (val) => <span className="tabular-nums">{val}</span>,
    }),
  ];
}
