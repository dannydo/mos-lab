'use client';

import type { ReactNode } from 'react';
import { Card, Tabs, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import type {
  HolidayCandidateScore,
  HolidayPayrollLedgerEntry,
  HolidayRosterEntry,
  StaffPerformanceEvent,
} from '@mos-lab/shared';
import { DataTable, StatusTag } from '~/components/ui';
import {
  formatHolidayMoney,
  HOLIDAY_ROSTER_STATUS_META,
  type HolidayBranchCoverageRow,
  type HolidayWorkTabKey,
} from './holidayWorkPresentation';

const { Text, Paragraph } = Typography;

function CompactRecord({
  title,
  meta,
  tag,
  detail,
}: {
  title: string;
  meta: string;
  tag?: ReactNode;
  detail?: string;
}) {
  return (
    <Card size="small" className="w-full">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{title}</div>
          <Text type="secondary" className="text-xs tabular-nums">
            {meta}
          </Text>
        </div>
        {tag}
      </div>
      {detail ? (
        <Paragraph className="mb-0 mt-2 text-xs" ellipsis={{ rows: 2 }}>
          {detail}
        </Paragraph>
      ) : null}
    </Card>
  );
}

interface HolidayWorkspaceTabsProps {
  activeTab: HolidayWorkTabKey;
  canManage: boolean;
  coverageRows: HolidayBranchCoverageRow[];
  candidateRows: HolidayCandidateScore[];
  rosterRows: HolidayRosterEntry[];
  ledgerRows: HolidayPayrollLedgerEntry[];
  eventRows: StaffPerformanceEvent[];
  coverageColumns: ColumnsType<HolidayBranchCoverageRow>;
  candidateColumns: ColumnsType<HolidayCandidateScore>;
  rosterColumns: ColumnsType<HolidayRosterEntry>;
  ledgerColumns: ColumnsType<HolidayPayrollLedgerEntry>;
  eventColumns: ColumnsType<StaffPerformanceEvent>;
  pagination: (key: HolidayWorkTabKey, total: number) => TablePaginationConfig;
  onTabChange: (key: HolidayWorkTabKey) => void;
}

export function HolidayWorkspaceTabs({
  activeTab,
  canManage,
  coverageRows,
  candidateRows,
  rosterRows,
  ledgerRows,
  eventRows,
  coverageColumns,
  candidateColumns,
  rosterColumns,
  ledgerColumns,
  eventColumns,
  pagination,
  onTabChange,
}: HolidayWorkspaceTabsProps) {
  return (
    <Tabs
      activeKey={activeTab}
      onChange={(key) => onTabChange(key as HolidayWorkTabKey)}
      items={[
        {
          key: 'coverage',
          label: `Nhu cầu (${coverageRows.length})`,
          children: (
            <DataTable
              rowKey="key"
              columns={coverageColumns}
              dataSource={coverageRows}
              pagination={pagination('coverage', coverageRows.length)}
              mobileRenderer={(row) => (
                <CompactRecord
                  title={row.storeKey}
                  meta={`${dayjs(row.workDate).format('DD/MM')} · ${row.shiftStart}–${row.shiftEnd}`}
                  tag={<StatusTag status="default" label={`CC ${row.ccRequiredCount} · CV ${row.cvRequiredCount}`} />}
                  detail={row.notes || undefined}
                />
              )}
            />
          ),
        },
        {
          key: 'candidates',
          label: `Đề cử (${candidateRows.length})`,
          children: (
            <DataTable
              rowKey="id"
              columns={candidateColumns}
              dataSource={candidateRows}
              pagination={pagination('candidates', candidateRows.length)}
              mobileRenderer={(row) => (
                <CompactRecord
                  title={row.displayName}
                  meta={`${row.teamCode} · ${row.storeKey} · ${dayjs(row.workDate).format('DD/MM')}`}
                  tag={
                    row.dataSufficient ? (
                      <StatusTag status="processing" label={row.totalScore?.toFixed(2)} />
                    ) : (
                      <StatusTag status="warning" label="Chưa đủ mẫu" />
                    )
                  }
                  detail={row.explanation.join(' ')}
                />
              )}
            />
          ),
        },
        {
          key: 'roster',
          label: `Roster (${rosterRows.length})`,
          children: (
            <DataTable
              rowKey="id"
              columns={rosterColumns}
              dataSource={rosterRows}
              pagination={pagination('roster', rosterRows.length)}
              mobileRenderer={(row) => (
                <CompactRecord
                  title={row.displayName}
                  meta={`${row.teamCode} · ${row.storeKey} · ${dayjs(row.workDate).format('DD/MM')}`}
                  tag={
                    <StatusTag
                      status={HOLIDAY_ROSTER_STATUS_META[row.status]?.status}
                      label={HOLIDAY_ROSTER_STATUS_META[row.status]?.label || row.status}
                    />
                  }
                  detail={row.decisionReason || row.nominationReason || undefined}
                />
              )}
            />
          ),
        },
        ...(canManage
          ? [
              {
                key: 'ledger',
                label: `Ledger (${ledgerRows.length})`,
                children: (
                  <DataTable
                    rowKey="id"
                    columns={ledgerColumns}
                    dataSource={ledgerRows}
                    pagination={pagination('ledger', ledgerRows.length)}
                    scroll={{ x: 1100 }}
                    mobileRenderer={(row: HolidayPayrollLedgerEntry) => (
                      <CompactRecord
                        title={row.displayName}
                        meta={`${dayjs(row.workDate).format('DD/MM')} · ${row.actualHours.toFixed(2)}h`}
                        tag={
                          <StatusTag
                            status={row.ledgerStatus === 'EXCEPTION' ? 'error' : 'success'}
                            label={row.ledgerStatus}
                          />
                        }
                        detail={`1x ${formatHolidayMoney(row.baseHolidayAmount)} · x3 ${formatHolidayMoney(row.holidayPremiumAmount)} · Cộng ${formatHolidayMoney(row.payrollAdditionAmount)}`}
                      />
                    )}
                  />
                ),
              },
            ]
          : []),
        {
          key: 'feedback',
          label: `Hiệu suất (${eventRows.length})`,
          children: (
            <DataTable
              rowKey="id"
              columns={eventColumns}
              dataSource={eventRows}
              pagination={pagination('feedback', eventRows.length)}
              mobileRenderer={(row) => (
                <CompactRecord
                  title={row.displayName}
                  meta={`${dayjs(row.occurredAt).format('DD/MM/YYYY')} · ${row.source}`}
                  tag={<StatusTag status={row.status === 'VERIFIED' ? 'success' : 'warning'} label={row.status} />}
                  detail={row.note}
                />
              )}
            />
          ),
        },
      ]}
    />
  );
}
