'use client';

import { Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import type { Customer } from '@mos-lab/shared';
import { StatusTag, TableIndexHeader } from '~/components/ui';
import { LocaActionCell, LocaCustomerCell } from './LocaColumnCells';
import {
  getSortOrder,
  resolveAllocationDisplayInfo,
  resolveCallResultMeta,
  resolveLastVisitDisplay,
} from './locaColumnHelpers';
import { buildTouchpointGroupColumn } from './locaTouchpointColumns';
import type { LocaColumnsOptions } from './types';

const { Text } = Typography;

export const getLocaColumns = ({
  themeMode,
  handleOpenDetailModal,
  formatVND,
  formatDuration,
  dailyPlanList,
  handleAddToPlan,
  makeCall,
  handleOpenSmsModal,
  handleOpenBookingWizard,
  handleToggleTouchpoint,
  touchpointConfigs = [],
  addingIds = [],
  sortField = 'daysSinceLastVisit_asc',
  currentPage = 1,
  pageSize = 20,
}: LocaColumnsOptions): ColumnsType<Customer> => {
  const touchpointGroupColumn = buildTouchpointGroupColumn({
    themeMode,
    touchpointConfigs,
    handleToggleTouchpoint,
    handleOpenBookingWizard,
  });

  return [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 55,
      align: 'center' as const,
      fixed: 'left' as const,
      render: (_: SafeAny, __: Customer, index: number) => (
        <span className="font-medium tabular-nums">{(currentPage - 1) * pageSize + index + 1}</span>
      ),
    },
    {
      title: 'Mã KH',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      fixed: 'left' as const,
      sorter: true,
      sortOrder: getSortOrder(sortField, 'id_asc', 'id_desc'),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'name',
      key: 'name',
      width: 170,
      fixed: 'left' as const,
      sorter: true,
      sortOrder: getSortOrder(sortField, 'name_asc', 'name_desc'),
      render: (text: string, record: Customer) => (
        <LocaCustomerCell
          name={text}
          record={record}
          themeMode={themeMode}
          phoneTone="theme"
          onOpenDetail={handleOpenDetailModal}
          onMakeCall={makeCall}
        />
      ),
    },
    {
      title: 'Số Dư Combo',
      key: 'comboBalance',
      width: 130,
      fixed: 'left' as const,
      render: (_: SafeAny, record: Customer) => {
        if (!record.comboBalance) return <Text type="secondary">Không có</Text>;
        const totalRemaining = (record.comboBalance.normalCount || 0) + (record.comboBalance.retainCount || 0);
        return (
          <div>
            <StatusTag
              status={totalRemaining === 1 ? 'error' : 'success'}
              label={`Còn ${totalRemaining} lần`}
              className="font-bold"
            />
            <div className="mt-0.5 text-[11px] text-[var(--client-desc-color)] tabular-nums">
              ✦ {record.comboBalance.normalCount || 0} · ↻ {record.comboBalance.retainCount || 0}
            </div>
          </div>
        );
      },
    },
    {
      title: 'HSD',
      key: 'expiryDate',
      width: 130,
      render: (_: SafeAny, record: Customer) => {
        if (!record.comboBalance?.expiryDate) return <Text type="secondary">-</Text>;
        const expDate = dayjs(record.comboBalance.expiryDate);
        const daysLeft = expDate.diff(dayjs(), 'day');
        const isExpiringSoon = daysLeft <= 30;

        return (
          <div>
            <div
              className={`font-semibold tabular-nums ${
                isExpiringSoon ? 'text-rose-500 dark:text-rose-400' : 'text-[var(--client-name-color)]'
              }`}
            >
              {expDate.format('DD/MM/YYYY')}
            </div>
            <div
              className={`text-[11px] tabular-nums ${
                isExpiringSoon ? 'text-rose-500 dark:text-rose-400' : 'text-[var(--client-desc-color)]'
              }`}
            >
              {daysLeft > 0 ? `Còn ${daysLeft} ngày` : 'Đã hết hạn'}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Đã Ghé',
      dataIndex: 'daysSinceLastVisit',
      key: 'daysSinceLastVisit',
      width: 160,
      sorter: true,
      sortOrder: getSortOrder(sortField, 'daysSinceLastVisit_asc', 'daysSinceLastVisit_desc'),
      render: (days: number | null, record: Customer) => {
        const visit = resolveLastVisitDisplay(days, record);
        if (visit.kind === 'callback') {
          return (
            <span
              className={`font-bold tabular-nums ${
                themeMode === 'dark' ? 'text-amber-300' : 'text-amber-800'
              } dark:text-amber-300`}
            >
              🕒 Hẹn gọi lại: {visit.formattedDate}
            </span>
          );
        }
        if (visit.kind === 'booked') {
          return (
            <span
              className={`font-bold tabular-nums ${
                themeMode === 'dark' ? 'text-emerald-300' : 'text-emerald-700'
              } dark:text-emerald-300`}
            >
              📅 Booked: {visit.formattedDate}
            </span>
          );
        }
        if (visit.kind === 'days') {
          return <span className="tabular-nums">{visit.days} ngày</span>;
        }
        return <Text className="text-[var(--client-desc-color)]">Chưa từng đến</Text>;
      },
    },
    touchpointGroupColumn,
    {
      title: '∑ Chi Tiêu',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      width: 130,
      sorter: true,
      sortOrder: getSortOrder(sortField, 'totalSpent_asc', 'totalSpent_desc'),
      render: (val: number) => <span className="whitespace-nowrap font-semibold tabular-nums">{formatVND(val)}</span>,
    },
    {
      title: 'Đã phân bổ',
      key: 'allocatedDays',
      width: 120,
      render: (_: SafeAny, record: Customer) => {
        const info = resolveAllocationDisplayInfo(record);
        if (!info) {
          return <span className="whitespace-nowrap italic text-[var(--client-desc-color)]">Chưa từng phân bổ</span>;
        }
        return (
          <Tooltip title={info.tooltipTitle}>
            <span
              className={`whitespace-nowrap font-semibold tabular-nums ${
                info.isCurrentlyAssigned ? 'opacity-100' : 'opacity-70'
              }`}
            >
              {info.diffDays} ngày
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'BK Assigned',
      dataIndex: 'assignedStaff',
      key: 'assignedStaff',
      width: 140,
      render: (staff: SafeAny) =>
        staff ? (
          <StatusTag status="cyan" label={staff.displayName} className="whitespace-nowrap" />
        ) : (
          <span className="whitespace-nowrap italic text-[var(--client-desc-color)]">Chưa phân bổ</span>
        ),
    },
    {
      title: 'Last Called',
      key: 'lastCallDate',
      width: 140,
      render: (_: SafeAny, record: Customer) => {
        if (!record.lastCall?.createdAt) return '-';
        return (
          <span className="whitespace-nowrap tabular-nums">
            {dayjs(record.lastCall.createdAt).format('DD/MM/YYYY HH:mm')}
          </span>
        );
      },
    },
    {
      title: 'Duration',
      key: 'lastCallDuration',
      width: 95,
      render: (_: SafeAny, record: Customer) => {
        if (record.lastCall?.durationSec === undefined || record.lastCall?.durationSec === null) return '-';
        return <span className="whitespace-nowrap tabular-nums">{formatDuration(record.lastCall.durationSec)}</span>;
      },
    },
    {
      title: 'Call Status',
      key: 'lastCallResult',
      width: 130,
      render: (_: SafeAny, record: Customer) => {
        if (!record.lastCall?.callResult) return '-';
        const { rawLabel, displayLabel, status } = resolveCallResultMeta(record.lastCall.callResult);
        return (
          <Tooltip title={rawLabel}>
            <span className="inline-flex max-w-[120px]">
              <StatusTag
                status={status}
                label={<span className="block max-w-[104px] truncate">{displayLabel}</span>}
                className="mr-0 max-w-[120px] whitespace-nowrap"
              />
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Call Notes',
      key: 'lastCallNote',
      width: 150,
      render: (_: SafeAny, record: Customer) => {
        if (!record.lastCall?.note) return '-';
        const note = record.lastCall.note;
        const compactNote = note.length > 20 ? `${note.substring(0, 20)}...` : note;
        return (
          <Tooltip title={note}>
            <div className="max-w-[140px] cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap">
              {compactNote}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Action',
      key: 'actions',
      width: 104,
      align: 'center' as const,
      fixed: 'right' as const,
      render: (_: SafeAny, record: Customer) => (
        <LocaActionCell
          customer={record}
          isPlanned={dailyPlanList.includes(record.id)}
          isAdding={addingIds.includes(record.id)}
          onAddToPlan={handleAddToPlan}
          onOpenSms={handleOpenSmsModal}
        />
      ),
    },
  ];
};
