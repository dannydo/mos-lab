'use client';

import { Col } from 'antd';
import { DonutChart } from './DonutChart';
import type { DonutSegment, TodayStatsLegendItem, TodayStatsThemeMode } from './types';

export interface DonutStatSectionProps {
  title: string;
  total: number;
  segments: DonutSegment[];
  themeMode: TodayStatsThemeMode;
  centerLabel?: string;
  centerSubLabel?: string;
  legendItems: TodayStatsLegendItem[];
  hasRightBorder?: boolean;
  dense?: boolean;
}

export function DonutStatSection({
  title,
  total,
  segments,
  themeMode,
  centerLabel,
  centerSubLabel,
  legendItems,
  hasRightBorder = false,
  dense = false,
}: DonutStatSectionProps) {
  const columnClassName = hasRightBorder
    ? `flex flex-col pr-2 border-r ${
        themeMode === 'dark' ? 'border-neutral-800' : 'border-neutral-200'
      } dark:border-neutral-800`
    : 'flex flex-col pl-2';

  return (
    <Col span={12} className={columnClassName}>
      <div className="text-xs font-medium mb-2 text-[var(--mos-text-muted,rgb(140,140,140))] dark:text-neutral-400">
        {title}
      </div>
      <div className="flex items-center gap-2.5">
        <DonutChart
          total={total}
          centerLabel={centerLabel}
          centerSubLabel={centerSubLabel}
          themeMode={themeMode}
          segments={segments}
        />
        <div className={`flex flex-col flex-1 overflow-hidden ${dense ? 'gap-[3px]' : 'gap-[5px]'}`}>
          {legendItems.map((item) => (
            <div
              key={item.key}
              className={`whitespace-nowrap ${dense ? 'text-[11px]' : 'text-[11.5px]'}`}
              title={item.tooltipTitle}
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${item.dotClassName}`} aria-hidden="true" />
              {item.label}:{' '}
              <strong className={item.tabularValue !== false ? 'tabular-nums' : undefined}>{item.value}</strong>
              {item.subtext !== undefined && (
                <>
                  {' '}
                  <span
                    className={`text-[var(--mos-text-muted,rgb(140,140,140))] dark:text-neutral-400 ${
                      dense ? 'text-[9px]' : 'text-[9.5px]'
                    }`}
                  >
                    ({item.subtext})
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </Col>
  );
}
