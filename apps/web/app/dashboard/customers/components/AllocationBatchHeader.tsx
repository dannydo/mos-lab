'use client';

import React from 'react';
import { Card, Select, Progress, Typography, Space, Tag, Button, Tooltip } from 'antd';
import {
  AppstoreOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  ReloadOutlined,
  UserOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { BookerAllocationBatchSummary } from '@mos-lab/shared';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface AllocationBatchHeaderProps {
  themeMode: string;
  token: SafeAny;
  batches: BookerAllocationBatchSummary[];
  loading: boolean;
  selectedBatchId?: number;
  onSelectBatch: (batchId: number) => void;
  onRefresh: () => void;
}

export const AllocationBatchHeader: React.FC<AllocationBatchHeaderProps> = ({
  themeMode,
  token,
  batches,
  loading,
  selectedBatchId,
  onSelectBatch,
  onRefresh,
}) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const currentBatch = batches.find((b) => b.id === selectedBatchId) || batches[0];

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  if (!batches || batches.length === 0) {
    return (
      <Card
        style={{
          borderRadius: '12px',
          marginBottom: '16px',
          background: themeMode === 'dark' ? '#141414' : '#fafafa',
          borderColor: token.colorBorderSecondary,
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <AppstoreOutlined style={{ fontSize: '20px', color: token.colorTextDescription }} />
            <Text type="secondary">Chưa có đợt phân bổ data nào được bàn giao cho bạn.</Text>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading || refreshing} size="small">
            Làm mới
          </Button>
        </Space>
      </Card>
    );
  }

  const total = currentBatch?.totalCount || 0;
  const called = currentBatch?.calledCount || 0;
  const remaining = Math.max(0, total - called);
  const percent = total > 0 ? Math.round((called / total) * 100) : 0;

  const isToday = currentBatch?.createdAt ? dayjs(currentBatch.createdAt).isSame(dayjs(), 'day') : false;

  return (
    <div
      className="mb-4 transition-all duration-300"
      style={{
        background: themeMode === 'dark' ? '#1f1f1f' : '#ffffff',
        border: `1px solid ${themeMode === 'dark' ? '#303030' : '#e8e8e8'}`,
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: themeMode === 'dark' ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 2px 10px rgba(0, 0, 0, 0.04)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* LEFT: SELECTOR & BATCH INFO */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1 min-w-[280px]">
          <div className="flex items-center gap-2">
            <FireOutlined style={{ fontSize: '20px', color: '#FA8C16' }} />
            <Text strong style={{ fontSize: '15px', color: token.colorText }}>
              Đợt phân bổ:
            </Text>
          </div>

          <Select
            value={selectedBatchId || currentBatch?.id}
            onChange={(val) => onSelectBatch(val)}
            style={{ width: '100%', maxWidth: '340px' }}
            loading={loading}
            options={batches.map((b) => {
              const bToday = dayjs(b.createdAt).isSame(dayjs(), 'day');
              const bDateStr = dayjs(b.createdAt).format('DD/MM/YYYY HH:mm');
              return {
                value: b.id,
                label: (
                  <div className="flex items-center justify-between w-full pr-1">
                    <span className="font-medium truncate">
                      {bToday ? '⚡ Hôm nay' : bDateStr} ({b.totalCount} KH)
                    </span>
                    <Tag
                      color={b.calledCount >= b.totalCount ? 'success' : 'processing'}
                      style={{ fontSize: '11px', margin: 0, padding: '0 4px' }}
                    >
                      {b.calledCount}/{b.totalCount}
                    </Tag>
                  </div>
                ),
              };
            })}
          />

          {currentBatch && (
            <Space wrap size={4}>
              {isToday && <Tag color="orange">Đợt hôm nay</Tag>}
              <Tag icon={<UserOutlined />} color="blue">
                Giao bởi: {currentBatch.assignerName || 'Admin'}
              </Tag>
              <Tooltip title={`Thời gian giao: ${dayjs(currentBatch.createdAt).format('DD/MM/YYYY HH:mm')}`}>
                <Tag icon={<ClockCircleOutlined />}>{dayjs(currentBatch.createdAt).format('DD/MM HH:mm')}</Tag>
              </Tooltip>
            </Space>
          )}
        </div>

        {/* RIGHT: REFRESH BUTTON */}
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={loading || refreshing}
          size="middle"
          style={{ borderRadius: '6px' }}
        >
          Làm mới
        </Button>
      </div>

      {/* BOTTOM: PROGRESS BAR & COUNTERS */}
      {currentBatch && (
        <div className="mt-4 pt-3 border-t" style={{ borderColor: token.colorBorderSecondary }}>
          <div className="flex items-center justify-between mb-1.5 text-xs">
            <Space size={12}>
              <span className="font-semibold" style={{ color: token.colorText }}>
                <PhoneOutlined className="mr-1 text-blue-500" />
                Tiến độ làm việc:
              </span>
              <Tag color="green" className="font-bold tabular-nums">
                <CheckCircleOutlined className="mr-1" />
                Đã gọi: {called} KH
              </Tag>
              <Tag color="volcano" className="font-bold tabular-nums">
                Còn lại: {remaining} KH
              </Tag>
              <Text type="secondary" className="tabular-nums">
                (Tổng {total} KH)
              </Text>
            </Space>

            <Text strong style={{ color: percent === 100 ? '#52C41A' : token.colorPrimary }} className="tabular-nums">
              {percent}% hoàn thành
            </Text>
          </div>

          <Progress
            percent={percent}
            status={percent === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#3B82F6',
              '100%': '#10B981',
            }}
            showInfo={false}
            size={{ height: 10 }}
            style={{ margin: 0 }}
          />
        </div>
      )}
    </div>
  );
};

export default AllocationBatchHeader;
