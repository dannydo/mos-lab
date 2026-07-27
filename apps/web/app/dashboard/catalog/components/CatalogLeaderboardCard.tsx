'use client';

import React from 'react';
import { Card, Table, Tag, Typography, Progress, theme, Space } from 'antd';
import { TrophyOutlined, CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { CatalogLeaderboardEntry, CatalogItemType } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';

const { Text } = Typography;

interface CatalogLeaderboardCardProps {
  leaderboard: CatalogLeaderboardEntry[];
  loading?: boolean;
  selectedItem: { itemId: number; itemType: CatalogItemType } | null;
  onSelectItem: (item: { itemId: number; itemType: CatalogItemType; name: string }) => void;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number, pageSize: number) => void;
}

export default function CatalogLeaderboardCard({
  leaderboard,
  loading = false,
  selectedItem,
  onSelectItem,
  page = 1,
  pageSize = 20,
  onPageChange,
}: CatalogLeaderboardCardProps) {
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
      title: 'Loại',
      dataIndex: 'itemType',
      key: 'itemType',
      width: 95,
      render: (type: CatalogItemType) => {
        if (type === 'service')
          return (
            <Tag color="blue" className="font-semibold m-0 text-[11px]">
              Dịch vụ
            </Tag>
          );
        if (type === 'combo')
          return (
            <Tag color="purple" className="font-semibold m-0 text-[11px]">
              Combo
            </Tag>
          );
        return (
          <Tag color="emerald" className="font-semibold m-0 text-[11px]">
            Sản phẩm
          </Tag>
        );
      },
    },
    {
      title: 'Tên Mục Catalog',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: CatalogLeaderboardEntry) => {
        const isSelected = selectedItem?.itemId === record.itemId && selectedItem?.itemType === record.itemType;
        return (
          <Space
            className="cursor-pointer group py-0.5"
            size={6}
            role="button"
            tabIndex={0}
            onClick={() => onSelectItem({ itemId: record.itemId, itemType: record.itemType, name })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectItem({ itemId: record.itemId, itemType: record.itemType, name });
              }
            }}
          >
            <span
              className={`font-semibold text-xs transition-colors ${
                isSelected ? 'text-amber-500 underline underline-offset-2 font-bold' : 'hover:text-amber-500'
              }`}
              style={{ color: isSelected ? undefined : token.colorText }}
            >
              {name}
            </span>
            {record.isDisabled && (
              <Tag color="default" className="text-[10px] m-0 py-0 px-1">
                Đã ẩn
              </Tag>
            )}
            {isSelected && (
              <Tag color="gold" icon={<CheckCircleOutlined />} className="font-semibold text-[10px] m-0 py-0 px-1">
                Đang xem
              </Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Nhóm / SKU',
      dataIndex: 'groupOrKey',
      key: 'groupOrKey',
      render: (val: string) => (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{val || '-'}</span>
      ),
    },
    {
      title: 'Đơn Giá (VNĐ)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums text-xs font-medium text-slate-600 dark:text-slate-300">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Lượt Bán / Dùng',
      dataIndex: 'unitsSold',
      key: 'unitsSold',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-semibold text-xs text-blue-500">{val.toLocaleString('vi-VN')} lượt</span>
      ),
    },
    {
      title: 'Doanh Thu (VNĐ)',
      dataIndex: 'revenue',
      key: 'revenue',
      align: 'right' as const,
      render: (val: number) => (
        <span className="tabular-nums font-bold text-xs text-amber-500">
          {Math.round(val || 0).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: '% Đóng Góp',
      dataIndex: 'revenueSharePercent',
      key: 'revenueSharePercent',
      width: 140,
      render: (rate: number) => (
        <div className="w-full">
          <Progress
            percent={rate}
            size="small"
            strokeColor={rate >= 20 ? '#f59e0b' : rate >= 10 ? '#3b82f6' : '#94a3b8'}
            format={(pct) => `${pct}%`}
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
            <span style={{ color: token.colorText }} className="font-bold">
              Bảng Xếp Hạng Doanh Số Catalog (Catalog Leaderboard)
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
            <InfoCircleOutlined className="text-amber-500" />
            <span>Mẹo: Click vào bất kỳ dòng nào để mở Panel Chi Tiết & Lịch Sử Bán Hàng phía dưới</span>
          </div>
        </div>
      }
      variant="outlined"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
      styles={{ body: { padding: 0 } }}
      className="shadow-sm rounded-xl mb-6"
    >
      <Table
        dataSource={leaderboard}
        columns={columns}
        rowKey="id"
        size="small"
        pagination={{
          current: page,
          pageSize: pageSize,
          onChange: onPageChange,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => `${range[0]}-${range[1]} của ${total} mục catalog`,
        }}
        loading={loading}
        scroll={{ x: 'max-content' }}
        onRow={(record) => ({
          onClick: () => onSelectItem({ itemId: record.itemId, itemType: record.itemType, name: record.name }),
          className:
            selectedItem?.itemId === record.itemId && selectedItem?.itemType === record.itemType
              ? 'bg-amber-500/10 dark:bg-amber-500/20 font-medium cursor-pointer'
              : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50',
        })}
        className="antd-custom-table"
      />
    </Card>
  );
}
