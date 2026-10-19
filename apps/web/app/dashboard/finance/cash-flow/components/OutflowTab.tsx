'use client';

import React from 'react';
import { Button, Popconfirm, Select, Space, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable, SectionCard } from '../../../../../components/ui';
import type { CashFlowEntry, CashFlowPriority, CashFlowStatus } from '@mos-lab/shared';

interface OutflowTabProps {
  outflowItems: CashFlowEntry[];
  entriesLoading: boolean;
  outflowPriorityFilter: string;
  setOutflowPriorityFilter: (val: string) => void;
  outflowVatFilter: string;
  setOutflowVatFilter: (val: string) => void;
  outflowStatusFilter: string;
  setOutflowStatusFilter: (val: string) => void;
  onUpdateStatus: (id: number, status: CashFlowStatus) => Promise<void>;
  onDeleteEntry: (id: number) => Promise<void>;
  categoryNames: Record<string, string>;
  priorityMeta: Record<CashFlowPriority, { label: string; badgeClass: string; desc: string }>;
  statusMeta: Record<CashFlowStatus, { label: string; badgeClass: string }>;
}

export function OutflowTab({
  outflowItems,
  entriesLoading,
  outflowPriorityFilter,
  setOutflowPriorityFilter,
  outflowVatFilter,
  setOutflowVatFilter,
  outflowStatusFilter,
  setOutflowStatusFilter,
  onUpdateStatus,
  onDeleteEntry,
  categoryNames,
  priorityMeta,
  statusMeta,
}: OutflowTabProps) {
  const columns: ColumnsType<CashFlowEntry> = [
    {
      title: 'Khoản chi & Mô tả',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div>
          <div className="font-semibold text-sm">{title}</div>
          {record.description && <div className="text-xs text-neutral-400 mt-0.5">{record.description}</div>}
          {record.isRecurring && (
            <span className="inline-flex items-center px-1.5 py-0.5 mt-1 rounded text-[11px] font-medium bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              Định kỳ: {record.recurringInterval}
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Danh mục',
      dataIndex: 'category',
      key: 'category',
      width: 150,
      render: (cat: string) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
          {categoryNames[cat] || cat}
        </span>
      ),
    },
    {
      title: 'VAT & Thuế suất',
      key: 'vat',
      width: 140,
      render: (_, record) => {
        if (!record.hasVat) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-neutral-500 bg-neutral-100 dark:bg-neutral-800">
              Không VAT
            </span>
          );
        }
        return (
          <div className="space-y-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              VAT {record.vatRate}%
            </span>
            <div className="text-xs text-neutral-400 tabular-nums">+{record.vatAmount.toLocaleString('vi-VN')}đ</div>
          </div>
        );
      },
    },
    {
      title: 'Tổng thanh toán',
      key: 'totalAmount',
      width: 160,
      align: 'right',
      render: (_, record) => (
        <div className="tabular-nums text-right">
          <div className="font-bold text-sm text-rose-500">{record.totalAmount.toLocaleString('vi-VN')}đ</div>
          {record.hasVat && (
            <div className="text-xs text-neutral-400">Gốc: {record.amount.toLocaleString('vi-VN')}đ</div>
          )}
        </div>
      ),
    },
    {
      title: 'Ưu tiên',
      dataIndex: 'priority',
      key: 'priority',
      width: 160,
      render: (p: CashFlowPriority) => {
        const conf = priorityMeta[p] || priorityMeta.MEDIUM;
        return (
          <Tooltip title={conf.desc}>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold cursor-pointer ${conf.badgeClass}`}
            >
              {conf.label}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: 'Ngày dự kiến / Hạn',
      key: 'dates',
      width: 150,
      render: (_, record) => (
        <div className="text-xs tabular-nums space-y-0.5">
          <div>
            <span className="text-neutral-400">Dự kiến:</span> {record.expectedDate}
          </div>
          {record.dueDate && (
            <div className="text-amber-500 font-medium">
              <span className="text-neutral-400">Đến hạn:</span> {record.dueDate}
            </div>
          )}
        </div>
      ),
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
      width: 160,
      render: (_, record) => (
        <Space size="small">
          {record.status === 'PENDING' && (
            <Button size="small" type="primary" ghost onClick={() => onUpdateStatus(record.id, 'APPROVED')}>
              Duyệt
            </Button>
          )}
          {record.status === 'APPROVED' && (
            <Button
              size="small"
              type="primary"
              className="bg-emerald-600 hover:bg-emerald-500 border-none"
              onClick={() => onUpdateStatus(record.id, 'PAID')}
            >
              Đã chi
            </Button>
          )}
          {record.status !== 'PAID' && record.status !== 'DEFERRED' && (
            <Button size="small" onClick={() => onUpdateStatus(record.id, 'DEFERRED')}>
              Hoãn
            </Button>
          )}
          <Popconfirm
            title="Xác nhận hủy khoản chi này?"
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
    <SectionCard
      title="Chi tiết Kế hoạch Chi (Bao gồm VAT & Mức độ ưu tiên)"
      extra={
        <Space>
          <Select
            value={outflowPriorityFilter}
            onChange={setOutflowPriorityFilter}
            className="w-44"
            options={[
              { value: 'all', label: 'Tất cả mức ưu tiên' },
              { value: 'CRITICAL', label: 'Bắt buộc / Khẩn cấp' },
              { value: 'HIGH', label: 'Thiết yếu' },
              { value: 'MEDIUM', label: 'Bình thường' },
              { value: 'LOW', label: 'Có thể hoãn' },
            ]}
          />
          <Select
            value={outflowVatFilter}
            onChange={setOutflowVatFilter}
            className="w-36"
            options={[
              { value: 'all', label: 'Tất cả hóa đơn' },
              { value: 'vat', label: 'Có thuế VAT' },
              { value: 'no_vat', label: 'Không có VAT' },
            ]}
          />
          <Select
            value={outflowStatusFilter}
            onChange={setOutflowStatusFilter}
            className="w-36"
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'PENDING', label: 'Chờ duyệt' },
              { value: 'APPROVED', label: 'Đã duyệt' },
              { value: 'PAID', label: 'Đã thanh toán' },
              { value: 'DEFERRED', label: 'Tạm hoãn' },
            ]}
          />
        </Space>
      }
    >
      <DataTable
        columns={columns}
        dataSource={outflowItems}
        rowKey="id"
        loading={entriesLoading}
        pagination={{ pageSize: 15 }}
      />
    </SectionCard>
  );
}
