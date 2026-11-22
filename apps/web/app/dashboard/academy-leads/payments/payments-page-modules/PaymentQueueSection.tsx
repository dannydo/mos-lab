'use client';

import React from 'react';
import { Button } from 'antd';
import type { AcademyTalentPaymentManagementRow, AcademyTalentPaymentManagementStatus } from '@mos-lab/shared';
import { DataSection, DataTable } from '~/components/ui';
import { PAGE_SIZE_OPTIONS, mobilePaymentCard } from '../payment-management.helpers';
import { buildPaymentQueueColumns } from './paymentQueueColumns';

export interface PaymentQueueSectionProps {
  rows: AcademyTalentPaymentManagementRow[];
  total: number;
  page: number;
  pageSize: number;
  status: AcademyTalentPaymentManagementStatus;
  loading: boolean;
  error: string | null;
  canManageRestricted: boolean;
  onRetry: () => void;
  onPageChange: (nextPage: number, nextPageSize: number) => void;
  onCollect: (row: AcademyTalentPaymentManagementRow) => void;
  onViewDetail: (row: AcademyTalentPaymentManagementRow) => void;
}

export function PaymentQueueSection({
  rows,
  total,
  page,
  pageSize,
  status,
  loading,
  error,
  canManageRestricted,
  onRetry,
  onPageChange,
  onCollect,
  onViewDetail,
}: PaymentQueueSectionProps) {
  const columns = React.useMemo(
    () =>
      buildPaymentQueueColumns({
        page,
        pageSize,
        canManageRestricted,
        onCollect,
        onViewDetail,
      }),
    [canManageRestricted, onCollect, onViewDetail, page, pageSize]
  );

  return (
    <DataSection
      title="Hàng đợi thu học phí"
      extra={<span className="tabular-nums text-xs opacity-70">{total.toLocaleString('vi-VN')} phiếu</span>}
      state={loading ? 'loading' : error ? 'error' : rows.length === 0 ? 'empty' : undefined}
      stateTitle={error || (status === 'FOLLOW_UP' ? 'Không còn cọc cần follow-up' : 'Chưa có phiếu học phí phù hợp')}
      stateDescription={error ? 'Hãy thử làm mới dữ liệu.' : 'Chỉ phiếu đã in mới xuất hiện tại đây.'}
      stateExtra={error ? <Button onClick={onRetry}>Thử lại</Button> : undefined}
    >
      <DataTable
        rowKey="assessmentId"
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1480 }}
        stickyPrimaryColumn
        columnPriority={{
          stt: 'secondary',
          learner: 'primary',
          invoice: 'primary',
          status: 'primary',
          tuition: 'secondary',
          received: 'primary',
          remaining: 'primary',
          latest: 'secondary',
          actions: 'primary',
        }}
        mobileRenderer={(row) => mobilePaymentCard(row, onViewDetail)}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: onPageChange,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
          showTotal: (count, range) => `Hiển thị ${range[0]}-${range[1]} / ${count.toLocaleString('vi-VN')}`,
        }}
      />
    </DataSection>
  );
}
