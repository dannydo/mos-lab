'use client';

import React from 'react';
import { Card, Table, Tag, Typography, Progress, theme, Space, Tooltip } from 'antd';
import { TrophyOutlined, FilterOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { CcLeaderboardEntry } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

const { Text } = Typography;

interface CcLeaderboardCardProps {
  leaderboard: CcLeaderboardEntry[];
  loading?: boolean;
  selectedConsultant?: string;
  onSelectConsultant?: (consultantName: string) => void;
}

export default function CcLeaderboardCard({
  leaderboard,
  loading,
  selectedConsultant,
  onSelectConsultant,
}: CcLeaderboardCardProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();

  const columns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span style={{ fontSize: '20px' }}>🥇</span>;
        if (rank === 2) return <span style={{ fontSize: '20px' }}>🥈</span>;
        if (rank === 3) return <span style={{ fontSize: '20px' }}>🥉</span>;
        return <span className="tabular-nums font-semibold text-gray-500">#{rank}</span>;
      },
    },
    {
      title: 'Tư vấn viên (CC)',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: CcLeaderboardEntry) => {
        const isSelected = selectedConsultant === name;
        return (
          <Space className="cursor-pointer group">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                isSelected
                  ? 'bg-amber-500 text-black shadow-md scale-105'
                  : 'bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/20'
              }`}
            >
              {name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-bold text-sm transition-colors ${
                    isSelected ? 'text-amber-500 underline underline-offset-4' : 'hover:text-amber-500'
                  }`}
                  style={{ color: isSelected ? undefined : token.colorText }}
                >
                  {name}
                </span>
                {isSelected && (
                  <Tag color="gold" icon={<CheckCircleOutlined />} className="font-semibold text-[10px]">
                    Đang lọc
                  </Tag>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <Tag color={record.store === 'PXL' ? 'blue' : 'purple'} className="text-[10px] m-0">
                  CN: {record.store}
                </Tag>
                <Text type="secondary" className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity">
                  (Click để lọc)
                </Text>
              </div>
            </div>
          </Space>
        );
      },
    },
    {
      title: 'Level CC',
      dataIndex: 'level',
      key: 'level',
      align: 'center' as const,
      width: 100,
      render: (level: number, record: CcLeaderboardEntry) => {
        const lvl = record.level || Math.floor((record.totalPointsAccu || 0) / 100) + 1;
        return (
          <Tag
            color="gold"
            className="font-bold tabular-nums text-xs px-2.5 py-0.5 rounded-full border-amber-400/50 shadow-xs"
          >
            Level {lvl}
          </Tag>
        );
      },
    },
    {
      title: 'Lượt Khách Phục Vụ',
      dataIndex: 'totalCheckins',
      key: 'totalCheckins',
      align: 'right' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-blue-500">{val} khách</span>,
    },
    {
      title: 'Lượt Dịch Vụ',
      dataIndex: 'totalServices',
      key: 'totalServices',
      align: 'right' as const,
      render: (val: number) => <span className="tabular-nums font-bold text-purple-500">{val || 0} dịch vụ</span>,
    },
    {
      title: 'Doanh Thu Combo',
      dataIndex: 'comboRevenue',
      key: 'comboRevenue',
      align: 'right' as const,
      render: (val: number, record: CcLeaderboardEntry) => (
        <div>
          <span className="tabular-nums font-bold text-sky-500">{Math.round(val || 0).toLocaleString('vi-VN')} đ</span>
          {Boolean(record.comboCount) && (
            <div className="text-[11px] text-gray-400 font-medium tabular-nums">({record.comboCount} combo)</div>
          )}
        </div>
      ),
    },
    {
      title: 'Điểm Tích Lũy (Points)',
      dataIndex: 'totalPointsAccu',
      key: 'totalPointsAccu',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-emerald-500">+{val.toLocaleString('vi-VN')} pts</span>
      ),
    },
    {
      title: 'Thưởng CC Bonus',
      dataIndex: 'totalConsultantBonus',
      key: 'totalConsultantBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-amber-500">{Math.round(val || 0).toLocaleString('vi-VN')} đ</span>
      ),
    },
    {
      title: 'Tiến Độ Chỉ Số',
      dataIndex: 'targetCompletionRate',
      key: 'targetCompletionRate',
      width: 180,
      render: (rate: number) => (
        <div className="w-full">
          <Progress percent={rate} size="small" strokeColor={rate >= 100 ? '#52c41a' : '#faad14'} />
        </div>
      ),
    },
  ];

  return (
    <Card
      title={
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <TrophyOutlined className="text-amber-500 text-lg" />
            <span style={{ color: token.colorText }} className="font-bold">
              Bảng Xếp Hạng Báo Cáo CC (CC Leaderboard)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <FilterOutlined className="text-amber-500" />
            <span>Mẹo: Click vào tên CC trên bảng để lọc tự động dữ liệu chi tiết bên dưới</span>
          </div>
        </div>
      }
      variant="outlined"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
      className="shadow-sm mb-6 rounded-xl"
    >
      <Table
        dataSource={leaderboard}
        columns={columns}
        rowKey="consultantId"
        size="small"
        pagination={false}
        loading={loading}

        scroll={{ x: 'max-content' }}
        className="antd-custom-table"
        locale={{ emptyText: 'Chưa có dữ liệu xếp hạng CC' }}
        onRow={(record) => ({
          onClick: () => onSelectConsultant?.(record.displayName),
          className: 'cursor-pointer hover:bg-amber-500/5 transition-colors',
          style: {
            background:
              selectedConsultant === record.displayName
                ? themeMode === 'dark'
                  ? 'rgba(212, 168, 75, 0.15)'
                  : 'rgba(212, 168, 75, 0.08)'
                : undefined,
          },
        })}
      />
    </Card>
  );
}
