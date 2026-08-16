import React from 'react';
import { Card } from 'antd';
import type { RevenueHourlyBreakdownItem } from '@mos-lab/shared';

interface RevenueHourlyChartProps {
  themeMode: 'light' | 'dark';
  token: any;
  hourlyBreakdown: RevenueHourlyBreakdownItem[];
  dailyTarget: number;
  onBarClick?: (hour: string) => void;
}

const formatCompact = (val: number) => {
  if (!val || !Number.isFinite(val)) return '0';
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `${Math.round(val / 1_000)}K`;
  return String(Math.round(val));
};

export const RevenueHourlyChart: React.FC<RevenueHourlyChartProps> = ({
  themeMode,
  token,
  hourlyBreakdown,
  dailyTarget,
  onBarClick,
}) => {
  const isDark = themeMode === 'dark';
  const hours = hourlyBreakdown || [];

  const safeTarget =
    typeof dailyTarget === 'number' && Number.isFinite(dailyTarget) && dailyTarget > 0 ? dailyTarget : 0;

  const hourTotals = hours.map(
    (h) =>
      (h.comboRevenue || (h as any).combo || 0) +
      (h.singleRevenue || (h as any).single || 0) +
      (h.productRevenue || (h as any).product || 0)
  );
  const maxBarRevenue = hourTotals.length > 0 ? Math.max(...hourTotals, 0) : 0;
  const maxRevenue = Math.max(maxBarRevenue, safeTarget, 1);
  const chartHeight = 250;

  const rawTop = chartHeight - (safeTarget / maxRevenue) * chartHeight;
  const targetTop = Number.isFinite(rawTop) ? Math.max(0, Math.min(chartHeight, rawTop)) : chartHeight;

  return (
    <Card
      title="📊 Doanh Thu Theo Khung Giờ (09:00 - 23:00)"
      style={{ width: '100%' }}
      styles={{ body: { padding: '24px 12px' } }}
    >
      <div
        className="tabular-nums"
        style={{
          position: 'relative',
          height: chartHeight,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: '8px',
        }}
      >
        {/* Target line */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            borderTop: '2px dashed #f87171',
            top: targetTop,
            left: 0,
            zIndex: 1,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: '-20px',
              right: 0,
              color: '#f87171',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            Mục tiêu ngày: {formatCompact(safeTarget)} đ
          </span>
        </div>

        {/* Bars */}
        {hours.map((hour) => {
          const combo = hour.comboRevenue || (hour as any).combo || 0;
          const single = hour.singleRevenue || (hour as any).single || 0;
          const product = hour.productRevenue || (hour as any).product || 0;
          const total = combo + single + product;
          const cumulative = hour.cumulativeRevenue || (hour as any).cumulative || 0;

          const totalHeight = maxRevenue > 0 ? (total / maxRevenue) * chartHeight : 0;
          const comboHeight = total > 0 ? (combo / total) * totalHeight : 0;
          const singleHeight = total > 0 ? (single / total) * totalHeight : 0;
          const productHeight = total > 0 ? (product / total) * totalHeight : 0;

          return (
            <div
              key={hour.hour}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                zIndex: 2,
              }}
              onClick={() => onBarClick && onBarClick(hour.hour)}
              title={`Giờ: ${hour.hour}\nTổng: ${formatCompact(total)}\nCombo: ${formatCompact(combo)}\nSingle: ${formatCompact(single)}\nProduct: ${formatCompact(product)}`}
            >
              <div style={{ fontSize: '10px', marginBottom: '4px', color: token.colorTextSecondary }}>
                {total > 0 ? formatCompact(cumulative) : ''}
              </div>
              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column-reverse',
                  height: totalHeight,
                  minHeight: '1px',
                  opacity: 0.9,
                }}
              >
                <div
                  style={{ height: comboHeight, backgroundColor: '#10b981', width: '100%', transition: 'all 0.3s' }}
                />
                <div
                  style={{ height: singleHeight, backgroundColor: '#06b6d4', width: '100%', transition: 'all 0.3s' }}
                />
                <div
                  style={{ height: productHeight, backgroundColor: '#f59e0b', width: '100%', transition: 'all 0.3s' }}
                />
              </div>
              <div style={{ marginTop: '8px', fontSize: '10px', color: token.colorText }}>{hour.hour}</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
