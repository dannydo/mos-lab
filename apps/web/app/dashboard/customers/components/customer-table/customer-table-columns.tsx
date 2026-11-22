'use client';

import { Avatar, Button, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { CheckCircle2, MessageSquare, Phone, Plus, User } from 'lucide-react';
import { CALL_RESULT_LABELS, type Customer } from '@mos-lab/shared';
import { AppIcon, CopyPhoneButton, StatusTag, TableIndexHeader } from '~/components/ui';
import { formatVND } from '../../../../../lib/format-utils';
import { CustomerOperationalStatus } from './CustomerOperationalStatus';
import { formatDuration, getCallResult } from './customer-table-utils';

export function buildCustomerTableColumns(params: {
  currentPage: number;
  pageSize: number;
  canMakeCall: boolean;
  makeCall: (phone: string, name: string, id: number, avatar?: string) => void;
  openDetailModal: (customer: Customer) => void;
  dailyPlanList: number[];
  addingIds: number[];
  handleAddToPlan?: (customerId: number) => void;
  handleOpenSmsModal?: (customer: Customer) => void;
}): ColumnsType<Customer> {
  const {
    currentPage,
    pageSize,
    canMakeCall,
    makeCall,
    openDetailModal,
    dailyPlanList,
    addingIds,
    handleAddToPlan,
    handleOpenSmsModal,
  } = params;

  return [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 60,
      align: 'center' as const,
      render: (_: SafeAny, __: Customer, index: number) => (
        <span className="tabular-nums font-medium">{(currentPage - 1) * pageSize + index + 1}</span>
      ),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Customer, b: Customer) => (a.name || '').localeCompare(b.name || ''),
      render: (text: string, record: Customer) => (
        <Space className="flex items-center cursor-pointer" onClick={() => openDetailModal(record)}>
          <Avatar
            src={record.avatar || undefined}
            icon={<AppIcon icon={User} size={14} />}
            className="shrink-0 border border-neutral-300 bg-neutral-100 text-amber-800 dark:border-neutral-800 dark:bg-neutral-800 dark:text-amber-400"
          />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="font-semibold text-slate-900 dark:text-slate-100 hover:underline transition-all">
                {text}
              </div>
              {record.bucket === 'COMBO_ELSA' && (
                <Tooltip
                  title={
                    <div>
                      <div>
                        ❄️ <strong>Bảo lưu Combo Elsa</strong>
                      </div>
                      {record.elsaReservation?.reason && <div>Lý do: {record.elsaReservation.reason}</div>}
                      {record.elsaReservation?.endDate && (
                        <div>Hạn: {dayjs(record.elsaReservation.endDate).format('DD/MM/YYYY')}</div>
                      )}
                      {record.elsaReservation?.reminderDate && (
                        <div>Nhắc CS: {dayjs(record.elsaReservation.reminderDate).format('DD/MM/YYYY')}</div>
                      )}
                    </div>
                  }
                >
                  <StatusTag status="cyan" label="❄️ Elsa" />
                </Tooltip>
              )}
              {record.isForeign && <StatusTag status="purple" label="🌐 Nước ngoài" className="text-[10px] px-1" />}
            </div>
            {record.phone && (
              <div className="text-xs font-medium text-amber-800 dark:text-amber-400 flex items-center gap-1 mt-0.5 tabular-nums">
                {canMakeCall ? (
                  <span
                    className="hover:underline cursor-pointer flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      makeCall(record.phone, record.name, record.id, record.avatar || undefined);
                    }}
                  >
                    <AppIcon icon={Phone} size={10} />
                    <span>{record.phone}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 select-text">
                    <span>{record.phone}</span>
                  </span>
                )}
                <CopyPhoneButton phone={record.phone} size="xs" />
              </div>
            )}
            {record.dob && (
              <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 flex items-center gap-1 tabular-nums">
                <span>
                  🎂{' '}
                  {dayjs(record.dob).year() >= 2024
                    ? dayjs(record.dob).format('DD/MM')
                    : dayjs(record.dob).format('DD/MM/YYYY')}
                </span>
                {record.age !== undefined && record.age !== null && dayjs(record.dob).year() < 2024 && (
                  <span className="rounded border border-sky-200 bg-sky-100 px-1.5 text-[10px] font-semibold text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/15 dark:text-sky-400">
                    {record.age} tuổi
                  </span>
                )}
              </div>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Chưa tới tiệm (Ngày)',
      dataIndex: 'daysSinceLastVisit',
      key: 'daysSinceLastVisit',
      width: 180,
      sorter: (a: Customer, b: Customer) => (a.daysSinceLastVisit ?? 0) - (b.daysSinceLastVisit ?? 0),
      render: (_days: number | null, record: Customer) => <CustomerOperationalStatus record={record} />,
    },
    {
      title: 'Tổng Chi Tiêu',
      dataIndex: 'totalSpent',
      key: 'totalSpent',
      align: 'right' as const,
      sorter: (a: Customer, b: Customer) => (a.totalSpent || 0) - (b.totalSpent || 0),
      render: (val: number) => <span className="tabular-nums">{formatVND(val)}</span>,
    },
    {
      title: 'Booker phụ trách',
      dataIndex: 'assignedStaff',
      key: 'assignedStaff',
      render: (staff: SafeAny) => {
        if (staff) {
          const isPending = staff.status === 'PENDING_ACCEPT' || staff.displayName?.includes('(Chờ xác nhận)');
          return <StatusTag status={isPending ? 'gold' : 'cyan'} label={staff.displayName} />;
        }
        return <span className="italic text-slate-600 dark:text-slate-400">Chưa phân bổ</span>;
      },
    },
    {
      title: 'Ngày gọi gần nhất',
      key: 'lastCallDate',
      render: (_: SafeAny, record: Customer) => {
        if (!record.lastCall?.createdAt) return '-';
        return <span className="tabular-nums">{dayjs(record.lastCall.createdAt).format('DD/MM/YYYY HH:mm')}</span>;
      },
    },
    {
      title: 'Thời lượng',
      key: 'lastCallDuration',
      render: (_: SafeAny, record: Customer) => {
        if (record.lastCall?.durationSec === undefined || record.lastCall?.durationSec === null) return '-';
        return <span className="tabular-nums font-mono">{formatDuration(record.lastCall.durationSec)}</span>;
      },
    },
    {
      title: 'Trạng thái cuộc gọi',
      key: 'lastCallResult',
      render: (_: SafeAny, record: Customer) => {
        const result = getCallResult(record, CALL_RESULT_LABELS);
        return result ? <StatusTag status={result.status} label={result.label} /> : '-';
      },
    },
    {
      title: 'Ghi chú cuộc gọi',
      key: 'lastCallNote',
      render: (_: SafeAny, record: Customer) => {
        if (!record.lastCall?.note) return '-';
        const note = record.lastCall.note;
        const compactNote = note.length > 25 ? `${note.substring(0, 25)}...` : note;
        return (
          <Tooltip title={note}>
            <span className="cursor-pointer">{compactNote}</span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Đã phân bổ',
      key: 'allocatedDays',
      width: 120,
      render: (_: SafeAny, record: Customer) => {
        const assignedAt = record.assignedStaff?.assignedAt || record.assignedAt || record.lastAllocation?.assignedAt;

        if (!assignedAt) {
          return <span className="italic text-slate-600 dark:text-slate-400">Chưa từng phân bổ</span>;
        }

        const assignedDate = dayjs(assignedAt);
        const today = dayjs();
        const diffDays = Math.max(0, today.diff(assignedDate, 'day'));
        const formattedDate = assignedDate.format('DD/MM/YYYY HH:mm');

        const isCurrentlyAssigned = !!record.assignedStaff;
        const staffName = record.assignedStaff?.displayName || record.lastAllocation?.staffName;

        const tooltipTitle = isCurrentlyAssigned
          ? `Đang phân bổ cho: ${staffName || 'Booker'} (từ ${formattedDate})`
          : `Lần cuối phân bổ: ${formattedDate}${staffName ? ` (Booker trước: ${staffName})` : ''}`;

        return (
          <Tooltip title={tooltipTitle}>
            <span
              className={`tabular-nums font-semibold ${
                isCurrentlyAssigned ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {diffDays} ngày
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 110,
      align: 'center' as const,
      render: (_: SafeAny, record: Customer) => {
        const isPlanned = dailyPlanList.includes(record.id);
        const isAdding = addingIds.includes(record.id);
        return (
          <Space size="small">
            <Tooltip title={isPlanned ? 'Đã lên lịch gọi' : 'Lên lịch gọi'}>
              <Button
                type={isPlanned ? 'dashed' : 'primary'}
                size="small"
                aria-label={isPlanned ? 'Đã lên lịch gọi' : `Lên lịch gọi cho ${record.name}`}
                loading={isAdding}
                icon={
                  isPlanned ? (
                    <AppIcon icon={CheckCircle2} size={13} className="text-emerald-500" />
                  ) : (
                    <AppIcon icon={Plus} size={13} />
                  )
                }
                onClick={() => !isPlanned && !isAdding && handleAddToPlan?.(record.id)}
                className={
                  !isPlanned
                    ? 'border-amber-700 bg-amber-700 text-white font-bold hover:border-amber-600 hover:bg-amber-600 dark:border-amber-500 dark:bg-amber-500 dark:text-slate-950'
                    : undefined
                }
                disabled={isPlanned || isAdding}
              />
            </Tooltip>
            <Tooltip title="Gửi SMS">
              <Button
                type="default"
                size="small"
                icon={<AppIcon icon={MessageSquare} size={13} className="text-amber-500" />}
                onClick={() => handleOpenSmsModal?.(record)}
                className="border-amber-500 text-amber-500"
              />
            </Tooltip>
          </Space>
        );
      },
    },
  ];
}
