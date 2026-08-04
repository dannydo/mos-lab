'use client';

import React from 'react';
import { Card, Table, Tag, Typography, Progress, theme, Space, Tooltip } from 'antd';
import { TrophyOutlined, FilterOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { CcLeaderboardEntry } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import CcAvatar from './CcAvatar';

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
      width: 65,
      align: 'center' as const,
      render: (rank: number) => {
        if (rank === 1) return <span style={{ fontSize: '18px' }}>🥇</span>;
        if (rank === 2) return <span style={{ fontSize: '18px' }}>🥈</span>;
        if (rank === 3) return <span style={{ fontSize: '18px' }}>🥉</span>;
        return <span className="tabular-nums font-medium text-slate-500 text-xs">#{rank}</span>;
      },
    },
    {
      title: 'Tư vấn viên (CC)',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (name: string, record: CcLeaderboardEntry) => {
        const isSelected = selectedConsultant === name;
        return (
          <Space className="cursor-pointer group whitespace-nowrap" size={8}>
            <CcAvatar name={name} src={record.avatar} isSelected={isSelected} size={32} />
            <div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span
                  className={`font-semibold text-xs transition-colors whitespace-nowrap ${
                    isSelected ? 'text-amber-400 underline underline-offset-2' : 'hover:text-amber-400'
                  }`}
                  style={{ color: isSelected ? undefined : token.colorText }}
                >
                  {name}
                </span>
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                  ·{' '}
                  {record.store === 'ESTELLA-PLACE' || record.store === 'ESTELLA'
                    ? 'EP'
                    : record.store === 'DE-THAM' || record.store === 'Đề Thám'
                      ? 'DT'
                      : record.store}
                </span>
                {isSelected && (
                  <Tag
                    color="gold"
                    icon={<CheckCircleOutlined />}
                    className="font-semibold text-[10px] m-0 py-0 px-1 whitespace-nowrap"
                  >
                    Đang lọc
                  </Tag>
                )}
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
      width: 90,
      render: (level: number, record: CcLeaderboardEntry) => {
        const lvl = record.level || Math.floor((record.totalPointsAccu || 0) / 100) + 1;
        return (
          <span className="tabular-nums font-semibold text-xs text-amber-800 dark:text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full">
            Lv.{lvl}
          </span>
        );
      },
    },
    {
      title: 'Lượt Khách Phục Vụ',
      dataIndex: 'totalCheckins',
      key: 'totalCheckins',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-blue-600 dark:text-blue-400">{val} khách</span>
      ),
    },
    {
      title: 'Lượt Dịch Vụ',
      dataIndex: 'totalServices',
      key: 'totalServices',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-purple-600 dark:text-purple-400">{val || 0} dv</span>
      ),
    },
    {
      title: 'Doanh Thu Combo',
      dataIndex: 'comboRevenue',
      key: 'comboRevenue',
      align: 'right' as const,
      render: (val: number, record: CcLeaderboardEntry) => (
        <div>
          <span className="tabular-nums font-bold text-xs text-sky-600 dark:text-sky-400">
            {Math.round(val || 0).toLocaleString('vi-VN')} đ
          </span>
          {Boolean(record.comboCount) && (
            <div className="text-[10px] text-slate-600 dark:text-slate-400 tabular-nums">
              ({record.comboCount} combo)
            </div>
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
        <span className="tabular-nums font-semibold text-xs text-emerald-600 dark:text-emerald-400">
          +{val.toLocaleString('vi-VN')} pts
        </span>
      ),
    },
    {
      title: 'CC Xoay Bonus',
      dataIndex: 'totalConsultantBonus',
      key: 'totalConsultantBonus',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-xs text-amber-800 dark:text-amber-400">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Tiến Độ Chỉ Số',
      dataIndex: 'targetCompletionRate',
      key: 'targetCompletionRate',
      width: 160,
      render: (rate: number) => (
        <div className="w-full">
          <Progress
            percent={rate}
            size="small"
            strokeColor={rate >= 100 ? '#52c41a' : '#faad14'}
            aria-label={`Tiến độ chỉ số: ${rate}%`}
          />
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
            <h3 style={{ color: token.colorText }} className="font-bold text-base m-0">
              Bảng Xếp Hạng Báo Cáo CC (CC Leaderboard)
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <FilterOutlined className="text-amber-500" />
            <span>Mẹo: Click vào tên CC trên bảng để lọc tự động dữ liệu chi tiết bên dưới</span>
          </div>
        </div>
      }
      variant="outlined"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
      styles={{ body: { padding: 0 } }}
      className="full-bleed-card shadow-sm rounded-xl"
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
