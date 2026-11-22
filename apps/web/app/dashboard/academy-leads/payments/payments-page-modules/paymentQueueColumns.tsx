'use client';

import { Button, Space } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AcademyTalentPaymentManagementRow } from '@mos-lab/shared';
import { StatusTag, TableIndexHeader } from '~/components/ui';
import { formatVND } from '~/lib/format-utils';
import { dateLabel, paymentMethodLabel, paymentStatusMeta } from '../payment-management.helpers';

export interface BuildPaymentQueueColumnsParams {
  page: number;
  pageSize: number;
  canManageRestricted: boolean;
  onCollect: (row: AcademyTalentPaymentManagementRow) => void;
  onViewDetail: (row: AcademyTalentPaymentManagementRow) => void;
}

export function buildPaymentQueueColumns({
  page,
  pageSize,
  canManageRestricted,
  onCollect,
  onViewDetail,
}: BuildPaymentQueueColumnsParams): ColumnsType<AcademyTalentPaymentManagementRow> {
  return [
    {
      key: 'stt',
      title: <TableIndexHeader />,
      width: 54,
      align: 'center',
      render: (_value, _row, index) => (
        <span className="tabular-nums font-medium">{(page - 1) * pageSize + index + 1}</span>
      ),
    },
    {
      key: 'learner',
      title: 'Học viên',
      width: 210,
      render: (_value, row) => (
        <div>
          <strong>{row.lead.name}</strong>
          <div className="text-xs opacity-60">{row.lead.phone || 'Chưa có SĐT'}</div>
        </div>
      ),
    },
    {
      key: 'invoice',
      title: 'Phiếu / khóa học',
      width: 300,
      render: (_value, row) => (
        <div>
          <strong className="text-xs">{row.invoiceNumber}</strong>
          <div className="mt-1 text-xs opacity-70">{row.courseLabel}</div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái thu',
      width: 166,
      render: (_value, row) => {
        const value = paymentStatusMeta(row.paymentStatus);
        return <StatusTag status={value.tone} label={value.label} />;
      },
    },
    {
      key: 'tuition',
      title: 'Học phí',
      width: 132,
      align: 'right',
      render: (_value, row) => <span className="tabular-nums">{formatVND(row.tuitionVnd)}</span>,
    },
    {
      key: 'received',
      title: 'Đã nhận',
      width: 132,
      align: 'right',
      render: (_value, row) => (
        <strong className="tabular-nums text-emerald-600 dark:text-emerald-400">{formatVND(row.totalPaidVnd)}</strong>
      ),
    },
    {
      key: 'remaining',
      title: 'Còn follow-up',
      width: 142,
      align: 'right',
      render: (_value, row) => (
        <strong className="tabular-nums">{row.paymentStatus === 'PAID' ? '—' : formatVND(row.remainingVnd)}</strong>
      ),
    },
    {
      key: 'latest',
      title: 'Thu gần nhất',
      width: 180,
      render: (_value, row) =>
        row.latestPayment ? (
          <div>
            <div className="text-xs">
              {paymentMethodLabel(row.latestPayment.method)} · {dateLabel(row.latestPayment.receivedAt)}
            </div>
            <div className="mt-1 text-xs opacity-60">{row.latestPayment.reference || 'Chưa có mã giao dịch'}</div>
          </div>
        ) : (
          <span className="text-xs opacity-60">Chưa xác nhận tiền</span>
        ),
    },
    {
      key: 'actions',
      title: canManageRestricted ? 'Thu tiền' : 'Chi tiết',
      width: 164,
      render: (_value, row) => (
        <Space size={2}>
          {canManageRestricted && row.paymentStatus !== 'PAID' && (
            <Button type="primary" size="small" onClick={() => onCollect(row)}>
              Thu tiền
            </Button>
          )}
          <Button type="link" size="small" onClick={() => onViewDetail(row)}>
            Chi tiết
          </Button>
        </Space>
      ),
    },
  ];
}
