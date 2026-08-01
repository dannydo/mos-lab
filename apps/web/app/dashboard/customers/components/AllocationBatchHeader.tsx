'use client';

import React from 'react';
import { Select, Typography, Button, Tooltip } from 'antd';
import {
  ReloadOutlined,
  ThunderboltOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { BookerAllocationBatchSummary, SafeAny } from '@mos-lab/shared';
import dayjs from 'dayjs';

const { Text } = Typography;

interface AllocationBatchHeaderProps {
  themeMode: string;
  token: SafeAny;
  batches: BookerAllocationBatchSummary[];
  loading: boolean;
  selectedBatchId?: number;
  onSelectBatch: (batchId: number) => void;
  onRefresh: () => void;
  onExitBatch?: () => void;
}

export const AllocationBatchHeader: React.FC<AllocationBatchHeaderProps> = ({
  themeMode,
  token,
  batches,
  loading,
  selectedBatchId,
  onSelectBatch,
  onRefresh,
  onExitBatch,
}) => {
  const [refreshing, setRefreshing] = React.useState(false);
  const currentBatch = batches?.find((b) => b.id === selectedBatchId) || batches?.[0];
  const isDark = themeMode === 'dark';

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
      <div
        className="mb-4 px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200"
        style={{
          background: isDark ? 'rgba(255, 255, 255, 0.02)' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.07)' : '#e2e8f0'}`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <ThunderboltOutlined style={{ fontSize: '16px', color: isDark ? '#D4A84B' : '#d97706' }} />
          <Text style={{ fontSize: '13px', color: isDark ? '#94a3b8' : '#64748b' }}>
            Chưa có đợt phân bổ data nào được bàn giao cho bạn.
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={loading || refreshing}
          size="small"
          type="text"
          className="text-xs text-slate-400 hover:text-amber-400"
        >
          Làm mới
        </Button>
      </div>
    );
  }

  const total = currentBatch?.totalCount || 0;
  const called = currentBatch?.calledCount || 0;
  const remaining = Math.max(0, total - called);
  const percent = total > 0 ? Math.round((called / total) * 100) : 0;
  const assigner = currentBatch?.assignerName || 'Admin';
  const createdAtStr = currentBatch?.createdAt ? dayjs(currentBatch.createdAt).format('DD/MM/YYYY HH:mm') : '';

  return (
    <div
      className="mb-4 px-4 py-2.5 rounded-xl transition-all duration-200"
      style={{
        background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#ffffff',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'}`,
        boxShadow: isDark ? '0 2px 10px rgba(0, 0, 0, 0.2)' : '0 1px 4px rgba(0, 0, 0, 0.03)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        {/* LEFT SECTION: ICON, BATCH SELECTOR & SUBTLE METADATA */}
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-[260px]">
          <div className="flex items-center gap-1.5 shrink-0">
            <ThunderboltOutlined style={{ fontSize: '15px', color: isDark ? '#D4A84B' : '#d97706' }} />
            <span
              className="text-xs font-medium tracking-wide uppercase"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            >
              Đợt phân bổ
            </span>
          </div>

          <Select
            value={selectedBatchId || currentBatch?.id}
            onChange={(val) => onSelectBatch(val)}
            size="small"
            style={{ width: '220px' }}
            loading={loading}
            variant="borderless"
            className="minimalist-batch-select font-medium text-xs"
            options={batches.map((b) => {
              const bToday = dayjs(b.createdAt).isSame(dayjs(), 'day');
              const bDateStr = dayjs(b.createdAt).format('DD/MM HH:mm');
              return {
                value: b.id,
                label: (
                  <div className="flex items-center justify-between w-full text-xs">
                    <span className="truncate">
                      {bToday ? '⚡ Hôm nay' : bDateStr} ({b.totalCount} KH)
                    </span>
                    <span className="tabular-nums opacity-70 ml-2 font-mono text-[11px]">
                      {b.calledCount}/{b.totalCount}
                    </span>
                  </div>
                ),
              };
            })}
          />

          {/* META INFO IN SUBTLE TEXT WITH TOOLTIP */}
          {currentBatch && (
            <Tooltip title={`Người giao: ${assigner} • Thời gian: ${createdAtStr}`}>
              <div className="hidden sm:flex items-center gap-2 text-xs opacity-60 hover:opacity-100 transition-opacity cursor-help">
                <span className="w-1 h-1 rounded-full bg-slate-500" />
                <span className="truncate max-w-[120px]">
                  <UserOutlined className="mr-1 text-[10px]" />
                  {assigner}
                </span>
                <span className="tabular-nums">
                  <ClockCircleOutlined className="mr-1 text-[10px]" />
                  {dayjs(currentBatch.createdAt).format('DD/MM HH:mm')}
                </span>
              </div>
            </Tooltip>
          )}
        </div>

        {/* RIGHT SECTION: PROGRESS & METRICS IN SINGLE STREAMLINED BAR */}
        {currentBatch && (
          <div className="flex items-center gap-3.5 shrink-0">
            {/* PROGRESS NUMBERS */}
            <div className="flex items-center gap-2 text-xs tabular-nums">
              <span style={{ color: isDark ? '#e2e8f0' : '#1e293b' }}>
                <span className="font-semibold text-emerald-400">{called}</span>
                <span className="opacity-40"> / </span>
                <span className="font-medium opacity-80">{total} KH</span>
              </span>
              <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {percent}%
              </span>
            </div>

            {/* ULTRA-THIN 6PX GLASSMORPHIC PROGRESS BAR */}
            <div className="w-24 sm:w-32 h-1.5 rounded-full overflow-hidden bg-slate-700/30 border border-slate-700/20">
              <div
                className="h-full transition-all duration-500 ease-out rounded-full"
                style={{
                  width: `${percent}%`,
                  background: percent === 100 ? '#10B981' : 'linear-gradient(90deg, #D4A84B 0%, #F59E0B 100%)',
                  boxShadow: percent > 0 ? '0 0 8px rgba(212, 168, 75, 0.4)' : 'none',
                }}
              />
            </div>

            {/* MINIMALIST REFRESH & EXIT BUTTONS */}
            <Button
              icon={<ReloadOutlined className={refreshing ? 'animate-spin' : ''} />}
              onClick={handleRefresh}
              loading={loading || refreshing}
              size="small"
              type="text"
              className="text-xs text-slate-400 hover:text-amber-400 px-1.5"
              title="Làm mới đợt phân bổ"
            />
            {onExitBatch && (
              <Tooltip title="Thoát đợt phân bổ (Xem tất cả KH)">
                <Button
                  icon={<CloseOutlined />}
                  onClick={onExitBatch}
                  size="small"
                  type="text"
                  danger
                  className="text-xs px-1.5 font-medium hover:bg-rose-500/10"
                >
                  <span className="hidden sm:inline">Thoát</span>
                </Button>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllocationBatchHeader;
