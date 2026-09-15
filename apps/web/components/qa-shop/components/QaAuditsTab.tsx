'use client';

import React from 'react';
import { Table, Button, Typography } from 'antd';
import { EyeOutlined, UserOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { SafeAny } from '@mos-lab/shared';
import { getAuditComplianceRate, renderAuditStatusTag } from '../types/qa-shop.types';

const { Text } = Typography;

interface QaAuditsTabProps {
  audits: SafeAny[];
  loading: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number, pageSize?: number) => void;
  onSelectAudit: (audit: SafeAny) => void;
  onOpenReviewModal: () => void;
}

export const QaAuditsTab: React.FC<QaAuditsTabProps> = ({
  audits,
  loading,
  page,
  pageSize,
  onPageChange,
  onSelectAudit,
  onOpenReviewModal,
}) => {
  const columns = [
    {
      title: 'Mã Biên Bản',
      dataIndex: 'id',
      key: 'id',
      render: (id: string, record: SafeAny) => (
        <div>
          <Text
            className="font-medium text-slate-800 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
            onClick={() => {
              onSelectAudit(record);
              onOpenReviewModal();
            }}
          >
            {id || `AUD-${record.auditDate}`}
          </Text>
          <div className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
            {dayjs(record.auditDate).format('DD/MM/YYYY')}
          </div>
        </div>
      ),
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
      title: 'Nhân Sự QA/QC',
      dataIndex: 'auditorName',
      key: 'auditorName',
      render: (text: string) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
          <UserOutlined className="text-purple-400" />
          {text || 'Nguyễn Thị Minh QA'}
        </span>
      ),
    },
    {
      title: 'Điểm Đánh Giá',
      dataIndex: 'complianceRate',
      key: 'complianceRate',
      render: (_: any, record: SafeAny) => {
        const val = getAuditComplianceRate(record);
        const color = val >= 90 ? '#10b981' : val >= 80 ? '#f59e0b' : '#ef4444';
        return (
          <span className="text-base font-bold tabular-nums" style={{ color }}>
            {val.toFixed(1)} <span className="text-xs font-normal text-slate-500">/ 100</span>
          </span>
        );
      },
    },
    {
      title: 'Kết Luận QA',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: SafeAny) => renderAuditStatusTag(status, record),
    },
    {
      title: 'Thao Tác',
      key: 'actions',
      render: (_: SafeAny, record: SafeAny) => (
        <Button
          type="text"
          icon={<EyeOutlined className="text-slate-400 hover:text-purple-500" />}
          size="small"
          onClick={() => {
            onSelectAudit(record);
            onOpenReviewModal();
          }}
          aria-label="Xem chi tiết biên bản"
          className="focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none"
        />
      ),
    },
  ];

  return (
    <Table
      dataSource={audits}
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
            Hiển thị {range[0]}-{range[1]} / tổng {total} biên bản
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
