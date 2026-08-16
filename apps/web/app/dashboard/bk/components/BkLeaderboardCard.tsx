'use client';

import React from 'react';
import { Card, Table, Tag, Typography, theme } from 'antd';
import { TrophyOutlined, FilterOutlined } from '@ant-design/icons';
import { useTheme } from '../../../../context/ThemeContext';
import BkAvatar from './BkAvatar';
import { MobileRecordList } from '~/components/ui';
import { useResponsiveTier } from '~/hooks/useResponsiveTier';

const { Text } = Typography;

export interface BkMobileMetric {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'accent';
}

interface BkLeaderboardCardProps {
  title: string;
  description?: React.ReactNode;
  leaderboard: any[];
  loading?: boolean;
  selectedBooker?: string;
  onSelectBooker?: (bookerId: string) => void;
  columns: any[];
  extraSummary?: React.ReactNode;
  mobileMetrics?: (record: any) => BkMobileMetric[];
}

export default function BkLeaderboardCard({
  title,
  description = 'Xếp hạng thành tích các Booker trong khoảng thời gian lọc',
  leaderboard,
  loading,
  selectedBooker,
  onSelectBooker,
  columns,
  extraSummary,
  mobileMetrics,
}: BkLeaderboardCardProps) {
  const { token } = theme.useToken();
  const { themeMode } = useTheme();
  const tier = useResponsiveTier();
  const isMobile = tier === 'mobile';

  const metricToneClass: Record<NonNullable<BkMobileMetric['tone']>, string> = {
    default: 'text-slate-100',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    danger: 'text-rose-400',
    accent: 'text-sky-400',
  };

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
              {description}
            </Text>
          </div>
        </div>
        {extraSummary}
      </div>

      {isMobile ? (
        <MobileRecordList
          records={leaderboard}
          loading={loading}
          getKey={(record, index) => String(record.bookerId ?? index)}
          emptyDescription="Chưa có dữ liệu Booker trong kỳ này"
          renderRecord={(record) => {
            const isSelected = selectedBooker === String(record.bookerId);
            const metrics = mobileMetrics?.(record) ?? [];

            return (
              <button
                type="button"
                className={`w-full min-w-0 text-left ${
                  isSelected ? 'rounded-lg bg-amber-500/10 ring-1 ring-amber-400/60' : ''
                }`}
                aria-pressed={isSelected}
                aria-label={`Lọc theo Booker ${record.displayName || 'không tên'}`}
                onClick={() => onSelectBooker?.(String(record.bookerId))}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 shrink-0 text-center text-sm font-bold tabular-nums text-amber-400">
                    {record.rank === 1
                      ? '🥇'
                      : record.rank === 2
                        ? '🥈'
                        : record.rank === 3
                          ? '🥉'
                          : `#${record.rank ?? '-'}`}
                  </span>
                  <BkAvatar name={record.displayName || ''} src={record.avatar} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold" style={{ color: token.colorText }}>
                      {record.displayName || 'Chưa có tên'}
                    </div>
                    <div className="text-xs text-slate-400">{record.store ? String(record.store) : '—'}</div>
                  </div>
                  <span className="shrink-0 text-xs text-amber-400">{isSelected ? 'Đang lọc' : 'Xem'}</span>
                </div>
                {metrics.length > 0 && (
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                    {metrics.slice(0, 3).map((metric) => (
                      <div key={metric.label} className="min-w-0">
                        <dt className="truncate text-[10px] font-medium text-slate-500">{metric.label}</dt>
                        <dd
                          className={`mt-0.5 truncate text-sm font-bold tabular-nums ${metricToneClass[metric.tone || 'default']}`}
                        >
                          {metric.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </button>
            );
          }}
        />
      ) : (
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
      )}
    </Card>
  );
}
