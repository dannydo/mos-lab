'use client';

import React from 'react';
import { Row, Col, Typography, Progress } from 'antd';
import { STORE_BRANCHES } from '../types/qa-shop.types';

const { Title, Text } = Typography;

interface QaAnalyticsTabProps {
  isDark: boolean;
}

export const QaAnalyticsTab: React.FC<QaAnalyticsTabProps> = ({ isDark }) => {
  return (
    <div className="space-y-4 py-2">
      <Title level={5}>Xếp Hạng Chất Lượng Cửa Hàng (Store Ranking)</Title>
      <Row gutter={[12, 12]}>
        {STORE_BRANCHES.map((b, idx) => {
          const score = 96.5 - idx * 1.2;
          return (
            <Col xs={24} md={12} lg={8} key={b.code}>
              <div
                className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80"
                style={{ background: isDark ? '#141414' : '#ffffff' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">TOP #{idx + 1}</span>
                  <span className="text-lg font-bold tabular-nums text-emerald-500">{score.toFixed(1)}đ</span>
                </div>
                <Text className="font-semibold block mb-2 text-slate-800 dark:text-slate-200">{b.name}</Text>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Cơ sở vật chất</span>
                    <span className="font-medium tabular-nums">95%</span>
                  </div>
                  <Progress percent={95} strokeColor="#a855f7" size="small" showInfo={false} />
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Tác phong nhân viên</span>
                    <span className="font-medium tabular-nums">96%</span>
                  </div>
                  <Progress percent={96} strokeColor="#3b82f6" size="small" showInfo={false} />
                </div>
              </div>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};
