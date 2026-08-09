'use client';

import React from 'react';
import { Card, Table, Tag, Select, Space, Typography, Avatar, theme as antTheme } from 'antd';
import { TrophyOutlined, ArrowUpOutlined, ArrowDownOutlined, MinusOutlined, UserOutlined } from '@ant-design/icons';
import { useTheme } from '../../../../../context/ThemeContext';
import CcAvatar from '../../../cc/components/CcAvatar';
import { CvSpeedRanking, SpeedRating, ConfidenceLevel, LashServiceMode } from '@mos-lab/shared';

const { Text } = Typography;

const LASH_STYLES = [
  'Classic',
  'Mink',
  'Volume 3D',
  'Volume 4D',
  'Volume 5D',
  'Ultralight',
  'Hyperlight',
  'Flawless',
  'Ivylight',
  'Under Mink',
];

const LASH_COUNTS = [30, 60, 70, 80, 90, 100, 120, 140];

export interface CvSpeedRankingSectionProps {
  rankingData: CvSpeedRanking[];
  loading: boolean;
  rankingStyle: string;
  rankingCount: number;
  rankingMode: LashServiceMode;
  rankingPage: number;
  rankingPageSize: number;
  onStyleChange: (style: string) => void;
  onCountChange: (count: number) => void;
  onModeChange: (mode: LashServiceMode) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onOpenDetail: (staffId: number) => void;
}

export function CvSpeedRankingSection({
  rankingData,
  loading,
  rankingStyle,
  rankingCount,
  rankingMode,
  rankingPage,
  rankingPageSize,
  onStyleChange,
  onCountChange,
  onModeChange,
  onPageChange,
  onPageSizeChange,
  onOpenDetail,
}: CvSpeedRankingSectionProps) {
  const { themeMode } = useTheme();
  const { token } = antTheme.useToken();

  const getRatingBadgeLabel = (rating: SpeedRating) => {
    if (rating === 'fast') return 'Nhanh (-10%)';
    if (rating === 'slow') return 'Chậm (+10%)';
    return 'Chuẩn';
  };

  const rankingColumns = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 70,
      align: 'center' as const,
      render: (rank: number) => (
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold tabular-nums text-xs ${
            rank === 1
              ? 'bg-amber-400 text-black'
              : rank === 2
                ? 'bg-slate-300 text-black'
                : rank === 3
                  ? 'bg-amber-700 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
          }`}
        >
          #{rank}
        </span>
      ),
    },
    {
      title: 'Chuyên Viên',
      dataIndex: 'staffName',
      key: 'staffName',
      render: (text: string, record: CvSpeedRanking) => (
        <a
          onClick={() => onOpenDetail(record.staffId)}
          className="font-semibold hover:underline cursor-pointer flex items-center gap-2"
          style={{ color: token.colorPrimary }}
        >
          <CcAvatar name={text} src={record.avatarUrl} size={24} />
          <span>{text}</span>
        </a>
      ),
    },
    {
      title: 'Dự Đoán Thời Gian',
      dataIndex: 'predictedTime',
      key: 'predictedTime',
      align: 'center' as const,
      render: (val: number) => (
        <span className="font-bold text-sm tabular-nums" style={{ color: token.colorText }}>
          {val} phút
        </span>
      ),
    },
    {
      title: 'Đánh Giá Tốc Độ',
      dataIndex: 'speedRating',
      key: 'speedRating',
      align: 'center' as const,
      render: (rating: SpeedRating) => (
        <Tag
          color={rating === 'fast' ? 'success' : rating === 'slow' ? 'error' : 'warning'}
          className="tabular-nums font-medium"
        >
          {getRatingBadgeLabel(rating)}
        </Tag>
      ),
    },
    {
      title: 'Độ Tin Cậy',
      dataIndex: 'confidence',
      key: 'confidence',
      align: 'center' as const,
      render: (level: ConfidenceLevel, record: CvSpeedRanking) => (
        <span>
          <Tag color={level === 'high' ? 'green' : level === 'medium' ? 'gold' : 'volcano'}>{level.toUpperCase()}</Tag>
          <Text type="secondary" className="text-xs tabular-nums block mt-0.5">
            ({record.sampleSize} mẫu)
          </Text>
        </span>
      ),
    },
    {
      title: 'Xu Hướng (3 Tháng)',
      dataIndex: 'trend',
      key: 'trend',
      align: 'center' as const,
      render: (trend: string) => {
        if (trend === 'improving') {
          return (
            <Tag color="green" icon={<ArrowUpOutlined />} className="tabular-nums">
              Cải thiện ↑
            </Tag>
          );
        }
        if (trend === 'declining') {
          return (
            <Tag color="red" icon={<ArrowDownOutlined />} className="tabular-nums">
              Giảm sút ↓
            </Tag>
          );
        }
        return (
          <Tag color="default" icon={<MinusOutlined />} className="tabular-nums">
            Ổn định →
          </Tag>
        );
      },
    },
  ];

  return (
    <Card
      title={
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span style={{ color: token.colorText }} className="flex items-center gap-2 font-bold">
            <TrophyOutlined style={{ color: '#D4A84B' }} /> Bảng Xếp Hạng Tốc Độ CV
          </span>
          <Space wrap size={6}>
            <Select
              id="ranking-lash-style-select"
              value={rankingStyle}
              onChange={onStyleChange}
              style={{ width: 120 }}
              options={LASH_STYLES.map((s) => ({ value: s, label: s }))}
            />
            <Select
              id="ranking-lash-count-select"
              value={rankingCount}
              onChange={onCountChange}
              style={{ width: 90 }}
              options={LASH_COUNTS.map((c) => ({ value: c, label: `${c} sợi` }))}
            />
            <Select
              id="ranking-service-mode-select"
              value={rankingMode}
              onChange={onModeChange}
              style={{ width: 130 }}
              options={[
                { value: 'normal_clean', label: 'Mi Sạch' },
                { value: 'normal_removal', label: 'Tháo Mi' },
                { value: 'retain', label: 'Dặm Mi' },
              ]}
            />
          </Space>
        </div>
      }
      variant="outlined"
      style={{ background: token.colorBgContainer, borderColor: token.colorBorderSecondary }}
    >
      <Table
        dataSource={rankingData}
        columns={rankingColumns}
        rowKey={(record, idx) => `ranking_row_${record.staffId}_${idx}`}
        loading={loading}
        bordered
        size="small"
        className="antd-custom-table"
        pagination={{
          current: rankingPage,
          pageSize: rankingPageSize,
          total: rankingData.length,
          onChange: (page, pSize) => {
            onPageChange(page);
            if (pSize && pSize !== rankingPageSize) {
              onPageSizeChange(pSize);
            }
          },
          onShowSizeChange: (current, size) => {
            onPageSizeChange(size);
            onPageChange(1);
          },
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (total, range) => (
            <span className="tabular-nums text-xs text-gray-500">
              {range[0]}-{range[1]} / {total}
            </span>
          ),
        }}
      />
    </Card>
  );
}
