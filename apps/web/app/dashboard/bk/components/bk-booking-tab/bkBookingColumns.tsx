'use client';

import { Button, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckCircle2, Eye, User } from 'lucide-react';
import { maskPhoneNumber, type BkBookingDetailsFilter, type BkBookingLeaderboardEntry } from '@mos-lab/shared';
import { CopyPhoneButton, StatusTag, TableIndexHeader } from '~/components/ui';
import BkAvatar from '../BkAvatar';
import { formatStoreCode, type BkBookingDetailRow } from './bkBookingUtils';

interface BuildBkBookingLeaderboardColumnsParams {
  selectedBookerId: string | null;
  onSelectBooker: (bookerId: string, bookerName?: string, detailStatus?: BkBookingDetailsFilter) => void;
}

export function buildBkBookingLeaderboardColumns({
  selectedBookerId,
  onSelectBooker,
}: BuildBkBookingLeaderboardColumnsParams): ColumnsType<BkBookingLeaderboardEntry> {
  return [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 60,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span className="text-lg">🥇</span>;
        if (rank === 2) return <span className="text-lg">🥈</span>;
        if (rank === 3) return <span className="text-lg">🥉</span>;
        return <span className="tabular-nums font-semibold text-slate-500 text-xs">#{rank}</span>;
      },
    },
    {
      title: 'Booker',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: BkBookingLeaderboardEntry) => {
        const isSelected = selectedBookerId === String(record.bookerId);
        return (
          <Space
            className="cursor-pointer group whitespace-nowrap"
            size={8}
            role="button"
            tabIndex={0}
            aria-label={`Chọn booker ${name}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelectBooker(String(record.bookerId), name);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                e.preventDefault();
                onSelectBooker(String(record.bookerId), name);
              }
            }}
          >
            <BkAvatar name={name} src={record.avatar} size={32} />
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`font-semibold text-xs transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'text-amber-400 underline underline-offset-2'
                      : 'text-slate-900 dark:text-slate-100 hover:text-amber-400'
                  }`}
                >
                  {name}
                </span>
                <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
                  · {formatStoreCode(record.store)}
                </span>
                {isSelected && (
                  <StatusTag
                    status="gold"
                    label="Đang lọc"
                    icon={<CheckCircle2 className="w-3 h-3" />}
                    className="py-0.5 px-1.5 text-[10px] whitespace-nowrap"
                  />
                )}
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Số Booking Đã Tạo',
      dataIndex: 'totalCreatedBookings',
      key: 'totalCreatedBookings',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-xs text-sky-400">{val}</span>,
    },
    {
      title: '# Cuộc gọi',
      dataIndex: 'callCount',
      key: 'callCount',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-xs text-violet-400">{val}</span>,
    },
    {
      title: '# Pickup',
      dataIndex: 'pickupCount',
      key: 'pickupCount',
      align: 'center' as const,
      render: (val: number, record: BkBookingLeaderboardEntry) => (
        <Tooltip title="Tỷ lệ pickup = số pickup / số cuộc gọi">
          <span className="tabular-nums font-bold text-xs text-emerald-400 whitespace-nowrap">
            {val} <span className="font-medium text-emerald-300/80">({record.pickupRate ?? 0}%)</span>
          </span>
        </Tooltip>
      ),
    },
    {
      title: (
        <Tooltip title="Booking được tạo trong kỳ đã chuyển sang trạng thái Done; cohort tính theo ngày tạo booking.">
          <span>Booking tạo trong kỳ đã Done</span>
        </Tooltip>
      ),
      dataIndex: 'doneBookings',
      key: 'doneBookings',
      align: 'center' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-xs text-emerald-400">{val}</span>,
    },
    {
      title: 'Booking Bị Hủy / Missed',
      dataIndex: 'missedBookings',
      key: 'missedBookings',
      align: 'center' as const,
      render: (val: number, record: BkBookingLeaderboardEntry) => (
        <Button
          type="text"
          size="small"
          className="tabular-nums h-6 px-1 font-semibold text-xs text-rose-500 hover:text-rose-400"
          onClick={(event) => {
            event.stopPropagation();
            onSelectBooker(String(record.bookerId), record.displayName, 'MISSED');
          }}
          aria-label={`Xem ${val} booking bị hủy hoặc Missed của ${record.displayName}`}
        >
          {val}
        </Button>
      ),
    },
    {
      title: 'Tỷ Lệ Chuyển Đổi (Done/Book)',
      dataIndex: 'conversionRate',
      key: 'conversionRate',
      align: 'center' as const,
      render: (val: number) => (
        <StatusTag
          status={val >= 70 ? 'success' : val >= 50 ? 'warning' : 'default'}
          label={`${val}%`}
          className="tabular-nums px-2 py-0.5 text-xs rounded-full"
        />
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      align: 'center' as const,
      render: (_: SafeAny, record: BkBookingLeaderboardEntry) => {
        const isSelected = selectedBookerId === String(record.bookerId);
        return (
          <Button
            type="default"
            size="small"
            icon={<Eye className="w-3.5 h-3.5 text-amber-400" />}
            className="text-[11px] font-medium border-slate-700 hover:border-amber-400 hover:text-amber-400 px-2"
            onClick={(e) => {
              e.stopPropagation();
              onSelectBooker(String(record.bookerId), record.displayName);
            }}
          >
            {isSelected ? 'Bỏ lọc' : 'Chi tiết'}
          </Button>
        );
      },
    },
  ];
}

interface BuildBkBookingDetailColumnsParams {
  isMaskedRole: boolean;
  onOpenCustomer: (customerId: number) => void;
}

export function buildBkBookingDetailColumns({
  isMaskedRole,
  onOpenCustomer,
}: BuildBkBookingDetailColumnsParams): ColumnsType<BkBookingDetailRow> {
  return [
    {
      title: <TableIndexHeader />,
      key: 'stt',
      width: 50,
      align: 'center' as const,
      render: (_: SafeAny, __: BkBookingDetailRow, index: number) => (
        <span className="tabular-nums text-xs text-slate-500 font-medium">{index + 1}</span>
      ),
    },
    {
      title: 'Khách Hàng',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (name: string, record: BkBookingDetailRow) => (
        <div
          className="cursor-pointer group whitespace-nowrap"
          role="button"
          tabIndex={0}
          aria-label={`Xem chi tiết khách hàng ${name || 'Khách hàng'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (record.customerId) {
              onOpenCustomer(record.customerId);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.stopPropagation();
              e.preventDefault();
              if (record.customerId) {
                onOpenCustomer(record.customerId);
              }
            }
          }}
        >
          <div className="flex items-center gap-2">
            <BkAvatar name={name || 'Khách hàng'} src={record.clientAvatar} size={28} />
            <div className="min-w-0">
              <div className="font-semibold text-xs text-sky-400 group-hover:text-amber-400 transition-colors flex items-center gap-1 whitespace-nowrap">
                <span>{name || 'Khách hàng'}</span>
                <User className="w-3 h-3 opacity-0 group-hover:opacity-100 text-amber-400 transition-opacity shrink-0" />
              </div>
              {record.clientPhone && (
                <div className="text-[10px] text-slate-400 tabular-nums whitespace-nowrap flex items-center gap-1">
                  <span>{isMaskedRole ? maskPhoneNumber(record.clientPhone) : record.clientPhone}</span>
                  {!isMaskedRole && <CopyPhoneButton phone={record.clientPhone} size="xs" />}
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Booker Tạo',
      dataIndex: 'bookerName',
      key: 'bookerName',
      render: (bName: string, record: BkBookingDetailRow) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <BkAvatar name={bName || 'Booker'} src={record.bookerAvatar} size={28} />
          <span className="font-medium text-xs text-slate-600 dark:text-slate-300">{bName || '-'}</span>
        </div>
      ),
    },
    {
      title: 'Thời Gian Tạo',
      dataIndex: 'createdDate',
      key: 'createdDate',
      render: (cDate: string) => (
        <span className="tabular-nums text-xs text-amber-400 font-semibold whitespace-nowrap">
          {cDate ? cDate.replace('T', ' ').substring(0, 16) : '-'}
        </span>
      ),
    },
    {
      title: 'Lịch Hẹn Khách',
      dataIndex: 'bookingDate',
      key: 'bookingDate',
      render: (dateStr: string) => (
        <span className="tabular-nums text-xs text-slate-400 font-medium whitespace-nowrap">
          {dateStr ? dateStr.replace('T', ' ').substring(0, 16) : '-'}
        </span>
      ),
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'store',
      key: 'store',
      align: 'center' as const,
      render: (val: string) => (
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">· {formatStoreCode(val)}</span>
      ),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      align: 'center' as const,
      render: (status: string) => {
        if (status === 'Completed' || status === 'Done' || status === 'Check-in thành công') {
          return (
            <StatusTag status="success" label="✓ Done" className="px-2 py-0.5 text-xs rounded-full whitespace-nowrap" />
          );
        }
        if (status === 'Cancelled' || status === 'Missed') {
          return (
            <StatusTag
              status="error"
              label="🔴 Đã hủy"
              className="px-2 py-0.5 text-xs rounded-full whitespace-nowrap"
            />
          );
        }
        return (
          <StatusTag
            status="default"
            label="⚪ Incoming"
            className="px-2 py-0.5 text-xs rounded-full whitespace-nowrap"
          />
        );
      },
    },
  ];
}
