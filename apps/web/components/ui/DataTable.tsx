'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Table, theme } from 'antd';
import type { ColumnType, ColumnsType, TablePaginationConfig, TableProps } from 'antd/es/table';
import { useResponsiveTier } from '../../hooks/useResponsiveTier';
import { MobileRecordList } from './MobileRecordList';
import { normalizeStandardPagination, StandardPagination, TableIndexHeader } from './TableStandards';

export type DataColumnPriority = 'primary' | 'secondary' | 'tertiary';

export interface ResponsiveDataTableProps<RecordType extends object> extends TableProps<RecordType> {
  /** Priority map keyed by the Ant Design column key or dataIndex. */
  columnPriority?: Record<string, DataColumnPriority>;
  /** A compact record renderer can replace the table on phones only. */
  mobileRenderer?: (record: RecordType, index: number) => React.ReactNode;
  mobileRecordKey?: (record: RecordType, index: number) => React.Key;
  mobileEmptyDescription?: React.ReactNode;
  /** Pins the first primary column on desktop data views that scroll horizontally. */
  stickyPrimaryColumn?: boolean;
}

function getColumnIdentifier<RecordType>(column: ColumnType<RecordType>): string | undefined {
  if (typeof column.key === 'string') return column.key;
  if (typeof column.dataIndex === 'string') return column.dataIndex;
  if (Array.isArray(column.dataIndex)) return column.dataIndex.join('.');
  return undefined;
}

/**
 * Shared table shell. Pagination remains controlled by the owning feature;
 * this component standardizes only visual surface and density behavior.
 */
export function DataTable<RecordType extends object>({
  className = '',
  style,
  columnPriority,
  mobileRenderer,
  mobileRecordKey,
  mobileEmptyDescription,
  stickyPrimaryColumn = false,
  columns,
  dataSource,
  loading,
  rowKey,
  scroll,
  pagination: paginationProp,
  ...props
}: ResponsiveDataTableProps<RecordType>) {
  const { token } = theme.useToken();
  const tier = useResponsiveTier();
  const isPhone = tier === 'mobile';
  const tableRegionRef = useRef<HTMLDivElement>(null);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);

  const visibleColumns = useMemo<ColumnsType<RecordType> | undefined>(() => {
    if (!columns) return columns;

    const tabletColumns =
      columnPriority && tier === 'tablet'
        ? columns.filter((column) => {
            const identifier = getColumnIdentifier(column as ColumnType<RecordType>);
            return !identifier || columnPriority[identifier] !== 'tertiary';
          })
        : columns;

    const canStickPrimary = stickyPrimaryColumn && ['desktop', 'fhd', 'wide', 'uhd'].includes(tier);
    const standardizedColumns = tabletColumns.map((column) => {
      const typedColumn = column as ColumnType<RecordType>;
      const identifier = getColumnIdentifier(typedColumn);
      if (identifier !== 'stt' || typedColumn.title !== 'STT') return column;
      return { ...typedColumn, title: <TableIndexHeader /> };
    });

    if (!canStickPrimary) return standardizedColumns;

    let primaryColumnPinned = false;
    return standardizedColumns.map((column) => {
      if (!('dataIndex' in column)) return column;
      const typedColumn = column as ColumnType<RecordType>;
      const identifier = getColumnIdentifier(typedColumn);
      const isActionColumn = identifier === 'action' || identifier === 'actions';
      if (isActionColumn) return { ...typedColumn, fixed: typedColumn.fixed ?? 'right' };
      if (primaryColumnPinned) return column;
      const isPrimary = !columnPriority || !identifier || columnPriority[identifier] === 'primary';
      if (!isPrimary) return column;

      primaryColumnPinned = true;
      return { ...typedColumn, fixed: typedColumn.fixed ?? 'left' };
    });
  }, [columnPriority, columns, stickyPrimaryColumn, tier]);

  const records = Array.isArray(dataSource) ? dataSource : [];
  const tablePagination = paginationProp as TablePaginationConfig | false | undefined;
  const standardPagination = useMemo(() => normalizeStandardPagination(tablePagination), [tablePagination]);
  const mobilePagination = standardPagination || null;
  const mobilePageSize = Math.max(1, Number(mobilePagination?.pageSize) || 10);
  const mobileCurrent = Math.max(1, Number(mobilePagination?.current) || 1);
  const mobileTotal = Number(mobilePagination?.total) || records.length;
  const hasClientSideMobilePagination =
    Boolean(mobilePagination) && records.length > mobilePageSize && records.length === mobileTotal;
  const mobileRecords = hasClientSideMobilePagination
    ? records.slice((mobileCurrent - 1) * mobilePageSize, mobileCurrent * mobilePageSize)
    : records;
  const resolveMobileKey = (record: RecordType, index: number): React.Key => {
    if (mobileRecordKey) return mobileRecordKey(record, index);
    if (typeof rowKey === 'function') return rowKey(record);
    if (typeof rowKey === 'string') {
      const key = record[rowKey as keyof RecordType];
      if (typeof key === 'string' || typeof key === 'number') return key;
    }
    return index;
  };

  useEffect(() => {
    const region = tableRegionRef.current;
    if (!region) return undefined;

    // Ant Design uses an aria-hidden measurement row to calculate column widths.
    // It can clone interactive controls into that row, which leaves a tabbable
    // descendant inside aria-hidden content. `inert` preserves the layout
    // measurement while ensuring the duplicate controls are not discoverable.
    const makeMeasurementRowsInert = () => {
      region.querySelectorAll('.ant-table-measure-row[aria-hidden="true"]').forEach((row) => {
        row.setAttribute('inert', '');
      });
    };

    const updateHorizontalOverflow = () => {
      const scrollSurface = region.querySelector<HTMLElement>('.ant-table-content, .ant-table-body');
      const nextHasOverflow = Boolean(scrollSurface && scrollSurface.scrollWidth > scrollSurface.clientWidth + 1);
      setHasHorizontalOverflow(nextHasOverflow);
      region.toggleAttribute('data-horizontal-overflow', nextHasOverflow);
      if (nextHasOverflow) {
        region.setAttribute('tabindex', '0');
        region.setAttribute('aria-label', 'Bảng dữ liệu có thể cuộn ngang bằng phím mũi tên trái hoặc phải');
        scrollSurface?.setAttribute('tabindex', '0');
        scrollSurface?.setAttribute('aria-label', 'Bảng dữ liệu có thể cuộn ngang');
      } else {
        region.removeAttribute('tabindex');
        region.removeAttribute('aria-label');
        scrollSurface?.removeAttribute('tabindex');
        scrollSurface?.removeAttribute('aria-label');
      }
    };

    const handleKeyboardScroll = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const scrollSurface = region.querySelector<HTMLElement>('.ant-table-content, .ant-table-body');
      if (!scrollSurface || scrollSurface.scrollWidth <= scrollSurface.clientWidth + 1) return;
      event.preventDefault();
      scrollSurface.scrollBy({ left: event.key === 'ArrowRight' ? 160 : -160, behavior: 'smooth' });
    };

    makeMeasurementRowsInert();
    updateHorizontalOverflow();
    const observer = new MutationObserver(() => {
      makeMeasurementRowsInert();
      updateHorizontalOverflow();
    });
    observer.observe(region, { childList: true, subtree: true });
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateHorizontalOverflow);
    resizeObserver?.observe(region);
    region.addEventListener('keydown', handleKeyboardScroll);
    return () => {
      observer.disconnect();
      resizeObserver?.disconnect();
      region.removeEventListener('keydown', handleKeyboardScroll);
    };
  }, []);

  if (isPhone && mobileRenderer) {
    return (
      <div data-ui="data-table" className={`responsive-data-region ${className}`} style={style}>
        <MobileRecordList
          records={mobileRecords}
          getKey={resolveMobileKey}
          renderRecord={mobileRenderer}
          loading={Boolean(loading)}
          emptyDescription={mobileEmptyDescription}
        />
        {mobilePagination && mobileTotal > mobilePageSize && (
          <div className="responsive-mobile-pagination">
            <StandardPagination
              current={mobileCurrent}
              pageSize={mobilePageSize}
              total={mobileTotal}
              showSizeChanger={mobilePagination.showSizeChanger}
              pageSizeOptions={mobilePagination.pageSizeOptions}
              showTotal={mobilePagination.showTotal}
              onChange={mobilePagination.onChange}
              onShowSizeChange={mobilePagination.onShowSizeChange}
              responsive
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={tableRegionRef}
      data-ui="data-table"
      className={`responsive-data-region ${hasHorizontalOverflow ? 'has-horizontal-overflow' : ''} ${className}`}
    >
      <Table<RecordType>
        {...props}
        pagination={standardPagination}
        columns={visibleColumns}
        dataSource={dataSource}
        loading={loading}
        rowKey={rowKey}
        scroll={scroll ?? (tier === 'mobile' || tier === 'tablet' ? { x: 'max-content' } : undefined)}
        className={`antd-custom-table ${className}`}
        style={{
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: 'var(--mos-radius)',
          marginBottom: 16,
          overflow: 'hidden',
          ...style,
        }}
      />
      {hasHorizontalOverflow && (
        <span className="responsive-data-scroll-hint" aria-hidden="true">
          ↔ Cuộn ngang
        </span>
      )}
    </div>
  );
}
