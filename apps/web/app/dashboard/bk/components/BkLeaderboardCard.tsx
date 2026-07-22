'use client';

import React from 'react';
import { Card, Table, Tag, Typography, theme, Space, Tooltip } from 'antd';
import { TrophyOutlined, FilterOutlined } from '@ant-design/icons';
import { useTheme } from '../../../../context/ThemeContext';
import BkAvatar from './BkAvatar';

const { Text } = Typography;

interface BkLeaderboardCardProps {
  title: string;
  leaderboard: any[];
  loading?: boolean;
  selectedBooker?: string;
  onSelectBooker?: (bookerId: string) => void;
  columns: any[];
  extraSummary?: React.ReactNode;
}

export default function BkLeaderboardCard({
  title,
  leaderboard,
  loading,
  selectedBooker,
  onSelectBooker,
  columns,
  extraSummary,
}: BkLeaderboardCardProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

  return (
    <Card
      className="shadow-sm border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden mb-6"
      style={{ background: token.colorBgContainer, marginBottom: '24px' }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
            <TrophyOutlined className="text-xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold m-0" style={{ color: token.colorText }}>
              {title}
            </h3>
            <Text type="secondary" className="text-xs">
              Xếp hạng thành tích các Booker trong khoảng thời gian lọc
            </Text>
          </div>
        </div>
        {extraSummary}
      </div>

      <Table
        dataSource={leaderboard}
        columns={columns}
        rowKey="bookerId"
        loading={loading}
        pagination={false}
        size="middle"
        className="tabular-nums"
        onRow={(record) => ({
          onClick: () => {
            if (onSelectBooker) {
              onSelectBooker(String(record.bookerId));
            }
          },
          className: 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
        })}
      />
    </Card>
  );
}
