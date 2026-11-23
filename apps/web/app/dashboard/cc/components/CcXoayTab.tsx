'use client';

import React, { useMemo } from 'react';
import type { CcXoayRecord } from '@mos-lab/shared';
import { DataTable, SectionCard } from '~/components/ui';
import { TableConfigDrawer } from '~/components/TableConfigDrawer';
import { useTableConfig } from '~/hooks/useTableConfig';
import { CcXoayCapBanner } from './cc-xoay-tab/CcXoayCapBanner';
import { CcXoaySummaryCards } from './cc-xoay-tab/CcXoaySummaryCards';
import { CcXoayTableHeader } from './cc-xoay-tab/CcXoayTableHeader';
import { type CcXoayTabProps, getCcXoayRowKey } from './cc-xoay-tab/cc-xoay-utils';
import { buildCcXoayColumns } from './cc-xoay-tab/ccXoayColumns';
import { useCcXoayState } from './cc-xoay-tab/useCcXoayState';

export type { CcXoayTabProps };

function CcXoayTabComponent({
  data,
  loading,
  onRefresh,
  summary,
  dateRange,
  comparisonMode = 'month',
}: CcXoayTabProps) {
  const {
    searchText,
    setSearchText,
    isCompact,
    toggleCompact,
    isMonthMode,
    isDayMode,
    periodNoun,
    elapsedRatioPercent,
    isPastPeriod,
    projectedCheckins,
    projectedPoints,
    projectedBonus,
    staffCapMap,
    capSummary,
    filteredData,
  } = useCcXoayState({
    data,
    summary,
    dateRange,
    comparisonMode,
  });

  const staticColumns = useMemo(() => buildCcXoayColumns(staffCapMap), [staffCapMap]);

  const {
    loading: configLoading,
    columns: configuredColumns,
    rawConfig,
    configVisible,
    openConfig,
    closeConfig,
    saveConfig,
    resetConfig,
  } = useTableConfig<CcXoayRecord>('cc_xoay_table', staticColumns);

  return (
    <div className="flex flex-col gap-4">
      <CcXoaySummaryCards
        summary={summary}
        projectedCheckins={projectedCheckins}
        projectedPoints={projectedPoints}
        projectedBonus={projectedBonus}
        isMonthMode={isMonthMode}
        isDayMode={isDayMode}
        isPastPeriod={isPastPeriod}
        periodNoun={periodNoun}
        elapsedRatioPercent={elapsedRatioPercent}
      />

      <SectionCard
        title={
          <CcXoayTableHeader
            searchText={searchText}
            onSearchChange={setSearchText}
            isCompact={isCompact}
            onToggleCompact={toggleCompact}
            onRefresh={onRefresh}
            onOpenConfig={openConfig}
          />
        }
        bodyPadding={0}
        className="full-bleed-card shadow-sm rounded-xl"
      >
        <CcXoayCapBanner capSummary={capSummary} />

        <DataTable<CcXoayRecord>
          dataSource={filteredData}
          columns={configuredColumns}
          rowKey={getCcXoayRowKey}
          loading={loading || configLoading}
          size="small"
          bordered
          scroll={{ x: 2300 }}
          pagination={{
            defaultPageSize: 50,
            pageSizeOptions: ['20', '50', '100', '200'],
            showSizeChanger: true,
            showTotal: (totalCount) => `Tổng cộng ${totalCount} bản ghi lượt dịch vụ`,
          }}
          className={isCompact ? 'compact-table' : ''}
          locale={{ emptyText: 'Không có dữ liệu CC Xoay trong khoảng thời gian này' }}
        />

        <TableConfigDrawer
          visible={configVisible}
          onClose={closeConfig}
          title="Cấu hình cột Báo Cáo CC Xoay"
          columns={rawConfig}
          onSave={saveConfig}
          onReset={resetConfig}
        />
      </SectionCard>
    </div>
  );
}

export default React.memo(CcXoayTabComponent);
