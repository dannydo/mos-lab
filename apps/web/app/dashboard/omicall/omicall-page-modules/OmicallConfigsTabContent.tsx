'use client';

import React from 'react';
import { Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DataTable } from '~/components/ui';
import type { OmicallConfigRow } from './omicallPageTypes';

const { Paragraph } = Typography;

export interface OmicallConfigsTabContentProps {
  columns: ColumnsType<OmicallConfigRow>;
  configs: OmicallConfigRow[];
  loadingConfigs: boolean;
}

export function OmicallConfigsTabContent({ columns, configs, loadingConfigs }: OmicallConfigsTabContentProps) {
  return (
    <div>
      <Paragraph className="mb-5 text-[var(--mos-text-secondary)]">
        Mỗi Telesales / Booker cần được gán chính xác mã số máy lẻ (Extension) tương ứng trên hệ thống tổng đài OmiCall.
        Webhook OmiCall gửi dữ liệu cuộc gọi về hệ thống sẽ dựa trên mã máy lẻ này để gán KPI cuộc gọi và bản ghi AI
        phân tích chính xác cho từng nhân viên.
      </Paragraph>

      <DataTable<OmicallConfigRow>
        columns={columns}
        dataSource={configs}
        loading={loadingConfigs}
        rowKey="staffId"
        pagination={false}
      />
    </div>
  );
}
