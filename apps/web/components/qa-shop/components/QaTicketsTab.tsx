'use client';

import React from 'react';
import { Table, Button, Typography, FormInstance } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { SafeAny } from '@mos-lab/shared';
import { renderSeverityDot, renderTicketStatusTag } from '../types/qa-shop.types';

const { Text } = Typography;

interface QaTicketsTabProps {
  tickets: SafeAny[];
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize?: number) => void;
  ticketForm: FormInstance;
  onSelectTicket: (ticket: SafeAny) => void;
  onOpenTicketModal: () => void;
}

export const QaTicketsTab: React.FC<QaTicketsTabProps> = ({
  tickets,
  loading,
  page,
  pageSize,
  onPageChange,
  ticketForm,
  onSelectTicket,
  onOpenTicketModal,
}) => {
  const columns = [
    {
      title: 'Mã Phiếu',
      dataIndex: 'id',
      key: 'id',
      render: (id: string) => <Text className="font-mono text-xs font-medium text-slate-500">{id}</Text>,
    },
    {
      title: 'Chi Nhánh',
      dataIndex: 'branchName',
      key: 'branchName',
      render: (text: string, record: SafeAny) => (
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{text || record.branchCode}</span>
      ),
    },
    {
      title: 'Nội Dung Vi Phạm',
      dataIndex: 'issueDescription',
      key: 'issueDescription',
      render: (text: string) => <Text className="text-xs text-slate-700 dark:text-slate-300">{text}</Text>,
    },
    {
      title: 'Mức Độ',
      dataIndex: 'severity',
      key: 'severity',
      render: (sev: string) => renderSeverityDot(sev),
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => renderTicketStatusTag(status),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      render: (_: SafeAny, record: SafeAny) => (
        <Button
          type="text"
          size="small"
          icon={<EditOutlined className="text-slate-400 hover:text-purple-500" />}
          onClick={() => {
            onSelectTicket(record);
            ticketForm.setFieldsValue({
              status: record.status,
              resolutionNotes: record.resolutionNotes,
            });
            onOpenTicketModal();
          }}
          aria-label="Cập nhật tiến độ xử lý"
          className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
        />
      ),
    },
  ];

  return (
    <Table
      dataSource={tickets}
      columns={columns}
      rowKey="id"
      loading={loading}
      scroll={{ x: 720 }}
      pagination={{
        current: page,
        pageSize: pageSize,
        showSizeChanger: true,
        pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (total, range) => (
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Hiển thị {range[0]}-{range[1]} / tổng {total} phiếu vi phạm
          </span>
        ),
        onChange: (p, s) => {
          onPageChange(p, s);
        },
      }}
      className="antd-custom-table"
    />
  );
};
