'use client';

import React from 'react';
import { Card, Row, Col, Progress, Tag, Button, Typography, theme, Space } from 'antd';
import { RocketOutlined, FireOutlined, ThunderboltOutlined, CrownOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

export default function CcGameTab() {
  const { token } = theme.useToken();

  const games = [
    {
      id: 1,
      title: '🔥 Thách Thức Bứt Phá Doanh Số Tuần 37',
      period: 'Tuần này',
      target: '50 lượt khách',
      current: 42,
      reward: 'Thưởng Nóng 1.500.000 đ',
      color: '#ff4d4f',
    },
    {
      id: 2,
      title: '⚡ Thợ Nối Siêu Tốc & Tư Vấn Thần Tốc',
      period: 'Tháng 07/2026',
      target: '200 bộ mi Flawless',
      current: 168,
      reward: 'Cúp Vàng CC & 3.000.000 đ',
      color: '#faad14',
    },
    {
      id: 3,
      title: '🎯 Thách Thức Khách Hàng Thân Thiết (Retain Master)',
      period: 'Tùy hứng',
      target: '30 lượt Refill/tháng',
      current: 28,
      reward: 'Voucher 500k + 1.000 Pts',
      color: '#1890ff',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <Title level={4} style={{ color: token.colorText, margin: 0 }}>
          <RocketOutlined className="text-amber-500 mr-2" /> Thử Thách Gamification & Minigame Dành Cho CC
        </Title>
        <Text type="secondary">
          Vượt mốc thử thách theo ngày, tuần, tháng để rinh giải thưởng nóng & tích lũy huy hiệu
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {games.map((g) => {
          const percent = Math.min(100, Math.round((g.current / parseInt(g.target)) * 100)) || 84;
          return (
            <Col xs={24} md={8} key={g.id}>
              <Card
                variant="outlined"
                style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
                className="shadow-sm rounded-xl hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-center mb-3">
                  <Tag color={g.color} className="font-semibold">
                    {g.period}
                  </Tag>
                  <CrownOutlined className="text-amber-500 text-lg" />
                </div>
                <div className="font-bold text-base mb-2" style={{ color: token.colorText }}>
                  {g.title}
                </div>
                <div className="text-xs text-gray-500 mb-4">
                  Phần thưởng: <span className="font-bold text-emerald-500">{g.reward}</span>
                </div>

                <div className="mb-2 flex justify-between text-xs">
                  <span>
                    Tiến độ: <strong className="tabular-nums">{g.current}</strong> / {g.target}
                  </span>
                  <span className="tabular-nums font-bold" style={{ color: g.color }}>
                    {percent}%
                  </span>
                </div>
                <Progress percent={percent} showInfo={false} strokeColor={g.color} className="mb-4" />

                <Button type="primary" block style={{ background: g.color, borderColor: g.color }}>
                  Tham Gia & Nhận Thưởng
                </Button>
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
}
