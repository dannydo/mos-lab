'use client';

import React from 'react';
import { Rate } from 'antd';
import { StarFilled } from '@ant-design/icons';

interface StarRatingInputProps {
  label: string;
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
}

export default function StarRatingInput({ label, value = 0, onChange, disabled }: StarRatingInputProps) {
  const getColor = (val: number) => {
    if (val <= 2 && val > 0) return '#ef4444'; // red
    if (val === 3) return '#eab308'; // yellow
    if (val >= 4) return '#22c55e'; // green
    return '#cbd5e1'; // default gray
  };

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="font-medium text-slate-700 dark:text-slate-300">{label}</div>
      <div className="flex items-center gap-3">
        <Rate
          value={value}
          onChange={onChange}
          disabled={disabled}
          character={<StarFilled />}
          style={{ color: getColor(value) }}
        />
        <div className="w-8 text-right font-bold tabular-nums" style={{ color: getColor(value) }}>
          {value > 0 ? `${value}/5` : '-'}
        </div>
      </div>
    </div>
  );
}
