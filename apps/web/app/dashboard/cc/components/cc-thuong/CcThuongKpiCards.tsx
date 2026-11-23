import React from 'react';
import { Card, Tooltip } from 'antd';
import { DollarSign, Gift, ShoppingCart, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import dayjs from 'dayjs';
import { formatCompactVND } from '~/lib/format-utils';
import { AppIcon } from '~/components/ui';
import type { CcThuongSummary } from './useCcThuongData';

type ComparisonMetric = 'totalComboSales' | 'totalProductSales' | 'totalSingleSales' | 'totalSales' | 'totalCcBonus';

interface CcThuongKpiCardsProps {
  isMobile: boolean;
  dailyBonusKpiColumns: number;
  includeVat: boolean;
  summary: CcThuongSummary | null;
  totalComboSales: number;
  totalProductSales: number;
  totalSingleSales: number;
  totalSales: number;
  totalCcBonus: number;
  projectedComboSales: number;
  projectedProductSales: number;
  projectedSingleSales: number;
  projectedTotalSales: number;
  projectedCcBonus: number;
  elapsedRatioPercent: number;
  isPastPeriod: boolean;
  periodNoun: string;
}

export const CcThuongKpiCards: React.FC<CcThuongKpiCardsProps> = ({
  isMobile,
  dailyBonusKpiColumns,
  includeVat,
  summary,
  totalComboSales,
  totalProductSales,
  totalSingleSales,
  totalSales,
  totalCcBonus,
  projectedComboSales,
  projectedProductSales,
  projectedSingleSales,
  projectedTotalSales,
  projectedCcBonus,
  elapsedRatioPercent,
  isPastPeriod,
  periodNoun,
}) => {
  const dailyBonusKpiCardStyles = isMobile ? { body: { padding: 12 } } : undefined;
  const subtextSizeClass = isMobile ? 'text-[10px] leading-[1.35]' : 'text-xs';
  const gridClass =
    dailyBonusKpiColumns === 2
      ? 'grid-cols-2 gap-2'
      : dailyBonusKpiColumns === 3
        ? 'grid-cols-3 gap-3'
        : 'grid-cols-5 gap-3';

  const renderComparisonSubtext = (currentValue: number, metric: ComparisonMetric) => {
    const comparison = summary?.comparison;
    if (!comparison) return null;

    // The visible revenue figures respect the VAT switch, while Daily Bonus
    // remains a net bonus amount. Prefer canonical actualGross/actualNet from
    // the backend when available so comparison matches /dashboard/today exactly.
    let previousValue: number;
    if (metric === 'totalCcBonus') {
      previousValue = Math.round(comparison.totalCcBonus);
    } else if (comparison.actualComboGross !== undefined) {
      const actualMap: Record<Exclude<ComparisonMetric, 'totalCcBonus'>, number> = {
        totalComboSales: includeVat ? comparison.actualComboGross || 0 : comparison.actualComboNet || 0,
        totalProductSales: includeVat ? comparison.actualProductGross || 0 : comparison.actualProductNet || 0,
        totalSingleSales: includeVat ? comparison.actualSingleGross || 0 : comparison.actualSingleNet || 0,
        totalSales: includeVat ? comparison.actualTotalGross || 0 : comparison.actualTotalNet || 0,
      };
      previousValue = Math.round(actualMap[metric]);
    } else {
      const rawPreviousValue =
        metric === 'totalSales'
          ? comparison.totalComboSales + comparison.totalProductSales + comparison.totalSingleSales
          : comparison[metric];
      previousValue = Math.round(rawPreviousValue * (includeVat ? 1.08 : 1));
    }
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
      trend === 'positive' ? 'text-emerald-400' : trend === 'negative' ? 'text-rose-400' : 'text-slate-400';

    return (
      <Tooltip
        title={`So với cùng kỳ ${modeLabel} (${dayjs(comparison.dateFrom).format('DD/MM')} – ${dayjs(comparison.dateTo).format('DD/MM/YYYY')}): ${Math.round(previousValue).toLocaleString('vi-VN')} đ`}
      >
        <div
          className={`${subtextSizeClass} mt-2 flex items-center justify-between gap-2 border-t border-slate-700/30 pt-1.5 cursor-help`}
        >
          <span className={`tabular-nums inline-flex items-center gap-1 font-semibold whitespace-nowrap ${trendClass}`}>
            {trend === 'positive' ? (
              <AppIcon icon={TrendingUp} size={12} aria-hidden />
            ) : trend === 'negative' ? (
              <AppIcon icon={TrendingDown} size={12} aria-hidden />
            ) : null}
            {percentage}
          </span>
          <span className="tabular-nums text-slate-600 dark:text-slate-400 whitespace-nowrap">
            Kỳ trước: {formatCompactVND(previousValue)}
          </span>
        </div>
      </Tooltip>
    );
  };

  const renderForecastSubtext = (projectedVal: number, hasComparison = false) => {
    if (isPastPeriod) {
      return (
        <Tooltip title={`Dữ liệu ${periodNoun} đã chốt (100% thời gian)`}>
          <div
            className={`${subtextSizeClass} font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between cursor-help opacity-70 ${
              hasComparison ? 'mt-1' : 'mt-2 border-t border-slate-700/20 pt-1.5'
            }`}
          >
            <span>Thực tế chốt {periodNoun}:</span>
            <span className="tabular-nums font-medium text-slate-700 dark:text-slate-400 whitespace-nowrap">
              {formatCompactVND(projectedVal)}
            </span>
          </div>
        </Tooltip>
      );
    }

    return (
      <Tooltip
        title={`Đã trôi qua ${elapsedRatioPercent.toFixed(1)}% thời gian ${periodNoun} (Ca 09:00 - 21:00 + 2h buffer checkout)`}
      >
        <div
          className={`${subtextSizeClass} font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between cursor-help ${
            hasComparison ? 'mt-1' : 'mt-2 border-t border-slate-700/30 pt-1.5'
          }`}
        >
          <span className="shrink-0 flex items-center gap-1">
            <span role="img" aria-label="Dự kiến cuối kỳ">
              🔮
            </span>
            <span>Dự kiến:</span>
          </span>
          <span className="tabular-nums font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
            ~{formatCompactVND(projectedVal)}
          </span>
        </div>
      </Tooltip>
    );
  };

  const cards: Array<{
    metric: ComparisonMetric;
    title: React.ReactNode;
    value: number;
    projected: number;
    valueColorClass: string;
    cardBorderClass?: string;
    icon: LucideIcon;
  }> = [
    {
      metric: 'totalComboSales',
      title: 'Doanh Thu Combo',
      value: totalComboSales,
      projected: projectedComboSales,
      valueColorClass: 'text-blue-500 dark:text-blue-400',
      icon: Gift,
    },
    {
      metric: 'totalProductSales',
      title: 'Doanh Thu Sản Phẩm',
      value: totalProductSales,
      projected: projectedProductSales,
      valueColorClass: 'text-purple-700 dark:text-purple-400',
      icon: ShoppingCart,
    },
    {
      metric: 'totalSingleSales',
      title: 'Doanh Thu Single',
      value: totalSingleSales,
      projected: projectedSingleSales,
      valueColorClass: 'text-orange-600 dark:text-orange-400',
      icon: Sparkles,
    },
    {
      metric: 'totalSales',
      title: (
        <Tooltip title="Tổng doanh thu toàn bộ dịch vụ (Combo + Sản phẩm + Single)">
          <span className="cursor-help">∑ Doanh Thu</span>
        </Tooltip>
      ),
      value: totalSales,
      projected: projectedTotalSales,
      valueColorClass: 'text-green-600 dark:text-green-400',
      icon: TrendingUp,
    },
    {
      metric: 'totalCcBonus',
      title: '∑ Thưởng CC Bonus',
      value: totalCcBonus,
      projected: projectedCcBonus,
      valueColorClass: 'text-amber-500',
      cardBorderClass: 'border-amber-500/70',
      icon: DollarSign,
    },
  ];

  return (
    <div className={`cc-daily-bonus-stat-grid mb-4 w-full grid ${gridClass}`}>
      {cards.map((card) => (
        <Card
          key={card.metric}
          variant="outlined"
          className={`shadow-sm rounded-xl flex flex-col justify-between min-w-0 ${card.cardBorderClass || ''}`}
          styles={dailyBonusKpiCardStyles}
        >
          <div>
            <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">{card.title}</div>
            <div
              className={`inline-flex items-center gap-1.5 font-bold tabular-nums whitespace-nowrap ${
                isMobile ? 'text-xl' : 'text-2xl'
              } ${card.valueColorClass}`}
            >
              <AppIcon icon={card.icon} size="md" aria-hidden />
              <span>{formatCompactVND(card.value)}</span>
            </div>
          </div>
          {renderComparisonSubtext(card.value, card.metric)}
          {renderForecastSubtext(card.projected, Boolean(summary?.comparison))}
        </Card>
      ))}
    </div>
  );
};
