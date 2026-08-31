'use client';

import React from 'react';
import { StatCard } from './StatCard';
import type { StatCardProps } from './StatCard';

export type MetricGridColumns = 1 | 2 | 3 | 4 | 5 | 6;
export type MetricValueFormat = 'number' | 'vnd' | 'percent';

export interface MetricGridItem extends StatCardProps {
  key: React.Key;
  /** Formats raw numeric values without duplicating currency/number presentation in each page. */
  format?: MetricValueFormat;
}

export interface MetricGridProps {
  items: readonly MetricGridItem[];
  columns?: MetricGridColumns;
  className?: string;
}

/** A data-driven KPI strip that retains one responsive grid contract across features. */
function formatMetricValue(value: React.ReactNode, format?: MetricValueFormat): React.ReactNode {
  if (typeof value !== 'number' || !format) return value;

  if (format === 'vnd') return `${Math.round(value).toLocaleString('vi-VN')} đ`;
  if (format === 'percent') return `${value.toLocaleString('vi-VN')}%`;
  return Math.round(value).toLocaleString('vi-VN');
}

export function MetricGrid({ items, columns = 4, className = '' }: MetricGridProps) {
  return (
    <section
      aria-label="Chỉ số tổng quan"
      className={`responsive-stat-grid metric-grid ${className}`.trim()}
      data-columns={columns}
    >
      {items.map(({ key, format, value, ...item }) => (
        <StatCard key={key} {...item} value={formatMetricValue(value, format)} />
      ))}
    </section>
  );
}

export default React.memo(MetricGrid);
