'use client';

import React from 'react';
import { FeaturePage } from './FeaturePage';
import type { FeaturePageProps } from './FeaturePage';
import { MetricGrid } from './MetricGrid';
import type { MetricGridProps } from './MetricGrid';
import { ReportPeriodNavigator } from './ReportPeriodNavigator';
import type { ReportPeriodNavigatorProps } from './ReportPeriodNavigator';
import type { FeatureToolbarProps } from './FeatureToolbar';

export interface ReportPageProps extends Omit<FeaturePageProps, 'children' | 'toolbar'> {
  period: ReportPeriodNavigatorProps;
  filters?: FeatureToolbarProps['filters'];
  toolbarActions?: FeatureToolbarProps['actions'];
  toolbarSecondary?: FeatureToolbarProps['secondary'];
  /** Feature-specific layout hook for a legacy report toolbar during migration. */
  toolbarClassName?: string;
  filterTitle?: string;
  filterTriggerLabel?: string;
  activeFilterCount?: number;
  metrics?: MetricGridProps;
  children: React.ReactNode;
}

/**
 * Default operational report frame. It binds a canonical reporting-period
 * navigator to the shared responsive toolbar, so a report only supplies its
 * period state, filters, metrics, and body.
 */
export function ReportPage({
  period,
  filters,
  toolbarActions,
  toolbarSecondary,
  toolbarClassName,
  filterTitle,
  filterTriggerLabel,
  activeFilterCount,
  metrics,
  children,
  ...pageProps
}: ReportPageProps) {
  return (
    <FeaturePage
      {...pageProps}
      toolbar={{
        className: toolbarClassName,
        primary: <ReportPeriodNavigator {...period} />,
        filters,
        actions: toolbarActions,
        secondary: toolbarSecondary,
        filterTitle,
        filterTriggerLabel,
        activeFilterCount,
      }}
    >
      {metrics && <MetricGrid {...metrics} />}
      {children}
    </FeaturePage>
  );
}

export default React.memo(ReportPage);
