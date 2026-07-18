'use client';

import '../../suppress-warnings';
import React from 'react';
import { Typography, theme } from 'antd';
import DailyCallsTable from '../../../components/DailyCallsTable';

const { Title, Paragraph } = Typography;

export default function CallsPage() {
  const { token } = theme.useToken();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Title level={3} style={{ color: token.colorPrimary, margin: 0 }}>
          Lịch sử cuộc gọi toàn bộ
        </Title>
        <Paragraph style={{ color: token.colorTextDescription, fontSize: '13px', margin: '4px 0 0 0' }}>
          Xem danh sách và trạng thái chi tiết các cuộc gọi đã thực hiện theo ngày và theo bộ phân nhiệm vụ.
        </Paragraph>
      </div>

      <DailyCallsTable initialScope="all" isDrawerMode={false} />
    </div>
  );
}
