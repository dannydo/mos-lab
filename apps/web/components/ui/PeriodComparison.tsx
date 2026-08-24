import { FallOutlined, RiseOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import dayjs from 'dayjs';
import type { ReportPeriodComparison } from '@mos-lab/shared';

interface PeriodComparisonProps {
  comparison?: ReportPeriodComparison | null;
  currentValue: number;
  previousValue: number;
  formatter: (value: number) => string;
  className?: string;
  compact?: boolean;
}

/** Consistent period-over-period signal for report KPI cards. */
export default function PeriodComparison({
  comparison,
  currentValue,
  previousValue,
  formatter,
  className = '',
  compact = false,
}: PeriodComparisonProps) {
  if (!comparison) return null;

  const difference = Math.round(currentValue - previousValue);
  const trend = difference > 0 ? 'positive' : difference < 0 ? 'negative' : 'neutral';
  const percentage =
    previousValue === 0
      ? currentValue === 0
        ? '0%'
        : 'Mới'
      : `${difference > 0 ? '+' : ''}${((difference / previousValue) * 100).toFixed(1)}%`;
  const modeLabel =
    comparison.mode === 'month' ? 'tháng trước' : comparison.mode === 'week' ? 'tuần trước' : 'ngày trước';
  const trendClass =
    trend === 'positive'
      ? 'text-emerald-500 dark:text-emerald-400'
      : trend === 'negative'
        ? 'text-rose-500 dark:text-rose-400'
        : 'text-slate-500 dark:text-slate-400';

  return (
    <Tooltip
      title={`So với cùng kỳ ${modeLabel} (${dayjs(comparison.dateFrom).format('DD/MM')} – ${dayjs(comparison.dateTo).format('DD/MM/YYYY')}): ${formatter(previousValue)}`}
    >
      <div
        className={`mt-2 flex border-t border-slate-300/60 pt-1.5 text-xs cursor-help dark:border-slate-700/50 ${
          compact ? 'flex-col items-start gap-0.5' : 'items-center justify-between gap-2'
        } ${className}`}
      >
        <span className={`tabular-nums inline-flex items-center gap-1 font-semibold whitespace-nowrap ${trendClass}`}>
          {trend === 'positive' ? <RiseOutlined /> : trend === 'negative' ? <FallOutlined /> : null}
          {percentage}
        </span>
        <span className="tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
          Kỳ trước: {formatter(previousValue)}
        </span>
      </div>
    </Tooltip>
  );
}
