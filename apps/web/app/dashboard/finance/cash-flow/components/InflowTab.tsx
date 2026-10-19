'use client';

import React from 'react';
import { Button, Popconfirm, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable, SectionCard } from '../../../../../components/ui';
import type { CashFlowEntry, CashFlowStatus } from '@mos-lab/shared';

interface InflowTabProps {
  inflowItems: CashFlowEntry[];
  entriesLoading: boolean;
  onUpdateStatus: (id: number, status: CashFlowStatus) => Promise<void>;
  onDeleteEntry: (id: number) => Promise<void>;
  categoryNames: Record<string, string>;
  statusMeta: Record<CashFlowStatus, { label: string; badgeClass: string }>;
}

export function InflowTab({
  inflowItems,
  entriesLoading,
  onUpdateStatus,
  onDeleteEntry,
  categoryNames,
  statusMeta,
}: InflowTabProps) {
  const columns: ColumnsType<CashFlowEntry> = [
    {
      title: 'Khoản thu & Nguồn tiền',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div>
          <div className="font-semibold text-sm">{title}</div>
          {record.description && <div className="text-xs text-neutral-400 mt-0.5">{record.description}</div>}
        </div>
      ),
    },
    {
      title: 'Danh mục thu',
      dataIndex: 'category',
      key: 'category',
      width: 160,
      render: (cat: string) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          {categoryNames[cat] || cat}
        </span>
      ),
    },
    {
      title: 'Số tiền thu',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 160,
      align: 'right',
      render: (val: number) => (
        <span className="font-bold text-sm text-emerald-500 tabular-nums">+{val.toLocaleString('vi-VN')}đ</span>
      ),
    },
    {
      title: 'Ngày dự kiến',
      dataIndex: 'expectedDate',
      key: 'expectedDate',
      width: 140,
      render: (date: string) => <span className="tabular-nums text-xs">{date}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (s: CashFlowStatus) => {
        const item = statusMeta[s] || { label: s, badgeClass: 'bg-neutral-100 text-neutral-600' };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${item.badgeClass}`}>
            {item.label}
          </span>
        );
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space size="small">
          {record.status !== 'COLLECTED' && (
            <Button
              size="small"
              type="primary"
              className="bg-emerald-600 hover:bg-emerald-500 border-none"
              onClick={() => onUpdateStatus(record.id, 'COLLECTED')}
            >
              Đã thu
            </Button>
          )}
          <Popconfirm
            title="Xác nhận hủy khoản thu này?"
            onConfirm={() => onDeleteEntry(record.id)}
            okText="Hủy"
            cancelText="Đóng"
          >
            <Button size="small" danger type="text">
              ✕
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <SectionCard title="Chi tiết Kế hoạch Thu tiền">
      <DataTable
        columns={columns}
        dataSource={inflowItems}
        rowKey="id"
        loading={entriesLoading}
        pagination={{ pageSize: 15 }}
      />
    </SectionCard>
  );
}
