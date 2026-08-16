'use client';

import React from 'react';
import { DataSection } from './DataSection';
import type { DataSectionProps } from './DataSection';
import { DataTable } from './DataTable';
import type { ResponsiveDataTableProps } from './DataTable';
import { FeaturePage } from './FeaturePage';
import type { FeaturePageProps } from './FeaturePage';
import { MetricGrid } from './MetricGrid';
import type { MetricGridProps } from './MetricGrid';

export interface ResourceListPageProps<RecordType extends object> extends Omit<FeaturePageProps, 'children'> {
  metrics?: MetricGridProps;
  table?: ResponsiveDataTableProps<RecordType>;
  tableSection?: Omit<DataSectionProps, 'children'>;
  /** Optional sections placed after KPIs and before the standard data table. */
  children?: React.ReactNode;
}

/**
 * The default CRUD/list page assembly. Supply the data, callbacks, and table
 * columns; the page frame, KPI grid, async state, and responsive table shell
 * stay consistent with every other feature.
 */
export function ResourceListPage<RecordType extends object>({
  metrics,
  table,
  tableSection,
  children,
  ...pageProps
}: ResourceListPageProps<RecordType>) {
  return (
    <FeaturePage {...pageProps}>
      {metrics && <MetricGrid {...metrics} />}
      {children}
      {table && (
        <DataSection title="Danh sách" bodyPadding={0} {...tableSection}>
          <DataTable<RecordType> {...table} />
        </DataSection>
      )}
    </FeaturePage>
  );
}

export default ResourceListPage;
