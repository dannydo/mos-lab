'use client';

import '../../suppress-warnings';
import React from 'react';
import { Typography, Card, theme } from 'antd';

const { Title, Paragraph } = Typography;

export default function CallsPage() {
  const { token } = theme.useToken();

  return (
    <div>
      <Title level={2} style={{ color: token.colorPrimary }}>
        Lịch sử cuộc gọi
      </Title>
      <Card
        style={{
          background: token.colorBgContainer,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        <Paragraph style={{ color: token.colorTextSecondary, fontSize: '16px', margin: 0 }}>
          Lịch sử chi tiết toàn bộ các cuộc gọi đã thực hiện của bạn sẽ được hiển thị tại đây. Hiện tại, bạn có thể xem
          lịch sử cuộc gọi chi tiết của từng khách hàng bằng cách nhấn nút <strong>Chi tiết</strong> trong danh sách
          Khách hàng hoặc di chuột vào các biểu tượng điện thoại trên bảng Kế hoạch tuần.
        </Paragraph>
      </Card>
    </div>
  );
}
