'use client';

import React, { useMemo } from 'react';
import type { ColumnsType } from 'antd/es/table';
import type { Appointment, MissedSummaryStats } from '@mos-lab/shared';
import { ContentSurface, DataTable } from '~/components/ui';
import { ResizableHeaderCell } from '~/components/ResizableHeaderCell';
import DoneSummaryStrip from '../components/DoneSummaryStrip';
import { AppointmentsMissedSection } from './AppointmentsMissedSection';
import {
  APPOINTMENT_COLUMN_PRIORITY,
  APPOINTMENT_PAGE_SIZE_OPTIONS,
  getAppointmentRowClassName,
  type AppointmentSummaryStats,
  type AppointmentTabKey,
  type MissedStatusFilter,
} from './appointmentsPageConstants';

export interface AppointmentsTablePanelProps {
  activeTab: AppointmentTabKey;
  missedSummary: MissedSummaryStats | null;
  missedSummaryLoading: boolean;
  missedStatusFilter: MissedStatusFilter;
  onMissedStatusFilterChange: (filter: MissedStatusFilter) => void;
  summary: AppointmentSummaryStats | null;
  appointments: Appointment[];
  columns: ColumnsType<Appointment>;
  loading: boolean;
  currentPage: number;
  pageSize: number;
  total: number;
  totalWidth: number;
  onPageChange: (page: number, size?: number) => void;
}

export function AppointmentsTablePanel({
  activeTab,
  missedSummary,
  missedSummaryLoading,
  missedStatusFilter,
  onMissedStatusFilterChange,
  summary,
  appointments,
  columns,
  loading,
  currentPage,
  pageSize,
  total,
  totalWidth,
  onPageChange,
}: AppointmentsTablePanelProps) {
  const tableComponents = useMemo(
    () => ({
      header: {
        cell: ResizableHeaderCell,
      },
    }),
    []
  );

  return (
    <div id="panel-appointments" role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
      <ContentSurface className="rounded-lg">
        {activeTab === 'missed' && (
          <AppointmentsMissedSection
            missedSummary={missedSummary}
            missedSummaryLoading={missedSummaryLoading}
            missedStatusFilter={missedStatusFilter}
            onMissedStatusFilterChange={onMissedStatusFilterChange}
          />
        )}

        {activeTab === 'completed' && summary && <DoneSummaryStrip summary={summary} />}

        <DataTable
          components={tableComponents}
          dataSource={appointments}
          columns={columns}
          rowKey="id"
          size="small"
          loading={loading && appointments.length === 0}
          pagination={{
            current: currentPage,
            pageSize,
            total,
            showSizeChanger: true,
            pageSizeOptions: APPOINTMENT_PAGE_SIZE_OPTIONS,
            showTotal: (totalCount, range) => (
              <span className="text-[13px] text-slate-500 dark:text-slate-400 tabular-nums">
                Hiển thị {range[0]}-{range[1]} / Tổng số {totalCount} ca
              </span>
            ),
            onChange: (page, size) => {
              onPageChange(page, size);
            },
          }}
          scroll={{ x: totalWidth }}
          tableLayout="fixed"
          className="appointments-data-table mt-4"
          columnPriority={APPOINTMENT_COLUMN_PRIORITY}
          stickyPrimaryColumn
          rowClassName={getAppointmentRowClassName}
        />
      </ContentSurface>
    </div>
  );
}
