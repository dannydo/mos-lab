'use client';

import { Button, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { CheckCircle2, Pencil } from 'lucide-react';
import type {
  HolidayLedgerStatus,
  HolidayPayrollLedgerEntry,
  HolidayRosterEntry,
  StaffPerformanceEvent,
  StaffPerformanceEventStatus,
} from '@mos-lab/shared';
import { AppIcon, StatusTag } from '~/components/ui';
import {
  formatHolidayMoney,
  HOLIDAY_ROSTER_STATUS_META,
  type HolidayBranchCoverageRow,
} from '../components/holidayWorkPresentation';
import { ATTENDANCE_SOURCE_LABELS, EVENT_STATUS_TYPE_MAP, LEDGER_STATUS_TYPE_MAP } from './holidayWorkPageHelpers';

const { Text } = Typography;

export function buildCoverageColumns({
  canManage,
  onEdit,
}: {
  canManage: boolean;
  onEdit: (row: HolidayBranchCoverageRow) => void;
}): ColumnsType<HolidayBranchCoverageRow> {
  return [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      key: 'workDate',
      render: (value) => <span className="tabular-nums">{dayjs(value).format('DD/MM/YYYY')}</span>,
    },
    { title: 'Chi nhánh', dataIndex: 'storeKey', key: 'storeKey' },
    {
      title: 'Khung giờ',
      key: 'shift',
      render: (_, row) => (
        <span className="tabular-nums">
          {row.shiftStart}–{row.shiftEnd}
        </span>
      ),
    },
    {
      title: 'CC cần',
      dataIndex: 'ccRequiredCount',
      key: 'ccRequiredCount',
      align: 'right',
      render: (value) => <b className="tabular-nums">{value}</b>,
    },
    {
      title: 'CV cần',
      dataIndex: 'cvRequiredCount',
      key: 'cvRequiredCount',
      align: 'right',
      render: (value) => <b className="tabular-nums">{value}</b>,
    },
    {
      title: 'Tổng',
      dataIndex: 'requiredCount',
      key: 'requiredCount',
      align: 'right',
      render: (value) => <b className="tabular-nums">{value}</b>,
    },
    ...(canManage
      ? [
          {
            title: '',
            key: 'action',
            width: 48,
            render: (_: unknown, row: HolidayBranchCoverageRow) => (
              <Button
                aria-label="Sửa nhu cầu chi nhánh"
                type="text"
                icon={<AppIcon icon={Pencil} size="sm" />}
                onClick={() => onEdit(row)}
              />
            ),
          },
        ]
      : []),
  ];
}

export function buildRosterColumns({
  canNominate,
  onEdit,
}: {
  canNominate: boolean;
  onEdit: (row: HolidayRosterEntry) => void;
}): ColumnsType<HolidayRosterEntry> {
  return [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      key: 'workDate',
      render: (value) => <span className="tabular-nums">{dayjs(value).format('DD/MM')}</span>,
    },
    {
      title: 'Nhân sự',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (value, row) => (
        <div>
          <b>{value}</b>
          {row.importedName && row.importedName !== value ? (
            <div>
              <Text type="secondary" className="text-xs">
                Ảnh: {row.importedName}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    { title: 'Đội / Chi nhánh', key: 'team', render: (_, row) => `${row.teamCode} · ${row.storeKey}` },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: string) => (
        <StatusTag
          status={HOLIDAY_ROSTER_STATUS_META[value]?.status}
          label={HOLIDAY_ROSTER_STATUS_META[value]?.label || value}
        />
      ),
    },
    {
      title: 'Lý do / ghi chú',
      key: 'reason',
      ellipsis: true,
      render: (_, row) => row.decisionReason || row.nominationReason || '-',
    },
    ...(canNominate
      ? [
          {
            title: '',
            key: 'action',
            width: 48,
            render: (_: unknown, row: HolidayRosterEntry) => (
              <Button
                aria-label="Sửa roster"
                type="text"
                icon={<AppIcon icon={Pencil} size="sm" />}
                onClick={() => onEdit(row)}
              />
            ),
          },
        ]
      : []),
  ];
}

export function buildLedgerColumns({
  canAdjust,
  adjustmentByLedger,
  onAdjust,
}: {
  canAdjust: boolean;
  adjustmentByLedger: Map<number, number>;
  onAdjust: (row: HolidayPayrollLedgerEntry) => void;
}): ColumnsType<HolidayPayrollLedgerEntry> {
  return [
    {
      title: 'Ngày',
      dataIndex: 'workDate',
      key: 'workDate',
      render: (value) => <span className="tabular-nums">{dayjs(value).format('DD/MM')}</span>,
    },
    {
      title: 'Nhân sự',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (value, row) => (
        <div>
          <b>{value}</b>
          <div>
            <Text type="secondary" className="text-xs">
              {row.payBasis || 'Thiếu pay basis'}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Nguồn',
      dataIndex: 'attendanceSource',
      key: 'attendanceSource',
      render: (value: HolidayPayrollLedgerEntry['attendanceSource']) => (
        <Text type="secondary" className="text-xs">
          {ATTENDANCE_SOURCE_LABELS[value]}
        </Text>
      ),
    },
    {
      title: 'Giờ thực tế',
      dataIndex: 'actualHours',
      key: 'actualHours',
      align: 'right',
      render: (value) => <span className="tabular-nums">{Number(value).toFixed(2)}h</span>,
    },
    { title: 'Đơn giá', dataIndex: 'hourlyRate', key: 'hourlyRate', align: 'right', render: formatHolidayMoney },
    {
      title: 'Lễ 1x',
      dataIndex: 'baseHolidayAmount',
      key: 'baseHolidayAmount',
      align: 'right',
      render: formatHolidayMoney,
    },
    {
      title: 'Phụ cấp x3',
      dataIndex: 'holidayPremiumAmount',
      key: 'holidayPremiumAmount',
      align: 'right',
      render: formatHolidayMoney,
    },
    {
      title: 'Cộng payroll',
      dataIndex: 'payrollAdditionAmount',
      key: 'payrollAdditionAmount',
      align: 'right',
      render: (value) => <b className="tabular-nums">{formatHolidayMoney(value)}</b>,
    },
    {
      title: 'Adjustment',
      key: 'adjustment',
      align: 'right',
      render: (_, row) => (
        <span className="tabular-nums">{formatHolidayMoney(adjustmentByLedger.get(row.id) || 0)}</span>
      ),
    },
    {
      title: 'Ledger',
      dataIndex: 'ledgerStatus',
      key: 'ledgerStatus',
      render: (value: HolidayLedgerStatus, row) => (
        <Tooltip title={row.exceptionMessage}>
          <span>
            <StatusTag status={LEDGER_STATUS_TYPE_MAP[value] || 'processing'} label={value} />
          </span>
        </Tooltip>
      ),
    },
    ...(canAdjust
      ? [
          {
            title: '',
            key: 'action',
            width: 48,
            render: (_: unknown, row: HolidayPayrollLedgerEntry) => (
              <Button
                aria-label="Tạo adjustment"
                type="text"
                icon={<AppIcon icon={Pencil} size="sm" />}
                onClick={() => onAdjust(row)}
              />
            ),
          },
        ]
      : []),
  ];
}

export function buildEventColumns({
  canManage,
  onVerify,
}: {
  canManage: boolean;
  onVerify: (eventId: number) => void;
}): ColumnsType<StaffPerformanceEvent> {
  return [
    {
      title: 'Ngày',
      dataIndex: 'occurredAt',
      key: 'occurredAt',
      render: (value) => <span className="tabular-nums">{dayjs(value).format('DD/MM/YYYY')}</span>,
    },
    { title: 'Nhân sự', dataIndex: 'displayName', key: 'displayName', render: (value) => <b>{value}</b> },
    {
      title: 'Loại / nguồn',
      key: 'type',
      render: (_, row) => (
        <div>
          {row.eventType}
          <div>
            <Text type="secondary" className="text-xs">
              {row.source} · {row.severity}
            </Text>
          </div>
        </div>
      ),
    },
    { title: 'Nội dung', dataIndex: 'note', key: 'note', ellipsis: true },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (value: StaffPerformanceEventStatus) => (
        <StatusTag status={EVENT_STATUS_TYPE_MAP[value] || 'gold'} label={value} />
      ),
    },
    ...(canManage
      ? [
          {
            title: '',
            key: 'action',
            width: 92,
            render: (_: unknown, row: StaffPerformanceEvent) =>
              row.status === 'PENDING' ? (
                <Button size="small" icon={<AppIcon icon={CheckCircle2} size="sm" />} onClick={() => onVerify(row.id)}>
                  Duyệt
                </Button>
              ) : null,
          },
        ]
      : []),
  ];
}
