'use client';

import { Button, Input, Select, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Activity, PlayCircle, RefreshCw, Search, User } from 'lucide-react';
import {
  FRONTEND_ISSUE_STATUSES,
  FRONTEND_ISSUE_TYPES,
  type FrontendIssueMetrics,
  type FrontendIssueRecord,
  type FrontendIssueStatus,
  type FrontendIssueType,
} from '@mos-lab/shared';
import { AppIcon, DataTable } from '../../../../components/ui';
import { BadgeTag, ISSUE_TYPE_CONFIG, STATUS_CONFIG } from './frontend-telemetry.shared';

const { Text, Paragraph } = Typography;

export function FrontendTelemetryIssuesTab({
  loading,
  data,
  metrics,
  total,
  page,
  pageSize,
  statusFilter,
  typeFilter,
  userFilter,
  sortBy,
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onStatusFilterChange,
  onTypeFilterChange,
  onUserFilterChange,
  onSortByChange,
  onPageChange,
  onRefresh,
  onOpenDetail,
}: {
  loading: boolean;
  data: FrontendIssueRecord[];
  metrics: FrontendIssueMetrics | null;
  total: number;
  page: number;
  pageSize: number;
  statusFilter: FrontendIssueStatus | 'ALL';
  typeFilter: FrontendIssueType | 'ALL';
  userFilter: string | 'ALL';
  sortBy: 'occurrences' | 'lastSeen';
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: () => void;
  onStatusFilterChange: (value: FrontendIssueStatus | 'ALL') => void;
  onTypeFilterChange: (value: FrontendIssueType | 'ALL') => void;
  onUserFilterChange: (value: string | 'ALL') => void;
  onSortByChange: (value: 'occurrences' | 'lastSeen') => void;
  onPageChange: (nextPage: number, nextPageSize: number) => void;
  onRefresh: () => void;
  onOpenDetail: (issue: FrontendIssueRecord) => void;
}) {
  const columns: ColumnsType<FrontendIssueRecord> = [
    {
      title: 'Loại sự cố',
      key: 'issueType',
      width: 170,
      render: (_, record) => {
        const conf = ISSUE_TYPE_CONFIG[record.issueType] || {
          label: record.issueType,
          color: 'default',
          icon: Activity,
        };
        const IconComponent = conf.icon;
        return (
          <Space direction="vertical" size={2}>
            <BadgeTag color={conf.color}>
              <AppIcon icon={IconComponent} size="sm" />
              {conf.label}
            </BadgeTag>
            <Text type="secondary" className="text-xs">
              Lặp lại:{' '}
              <strong className="text-slate-800 dark:text-slate-200 tabular-nums">{record.occurrenceCount} lần</strong>
            </Text>
          </Space>
        );
      },
    },
    {
      title: 'Vị trí & Thông điệp',
      key: 'location',
      render: (_, record) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 font-mono">
              {record.path}
            </code>
            {record.target ? (
              <span
                className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-[200px]"
                title={record.target}
              >
                ↳ {record.target}
              </span>
            ) : null}
          </div>
          <Paragraph className="!mb-0 text-sm font-medium" ellipsis={{ rows: 2, expandable: false }}>
            {record.message}
          </Paragraph>
          {record.lastUserName ? (
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <AppIcon icon={User} size="sm" className="text-purple-500" />
              <span>Gặp bởi:</span>
              <span className="font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/40">
                {record.lastUserName}
              </span>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 140,
      render: (_, record) => {
        const conf = STATUS_CONFIG[record.status] || STATUS_CONFIG.NEW;
        return (
          <div className="space-y-1">
            <BadgeTag color={conf.color}>{conf.label}</BadgeTag>
            {record.resolvedByName ? (
              <div className="text-xs text-emerald-600 dark:text-emerald-400">Bởi: {record.resolvedByName}</div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: 'Thời gian',
      key: 'timing',
      width: 150,
      render: (_, record) => (
        <div className="text-xs space-y-0.5 tabular-nums text-slate-500 dark:text-slate-400">
          <div>Gần nhất: {new Date(record.lastSeenAt).toLocaleTimeString('vi-VN')}</div>
          <div>Ngày: {new Date(record.lastSeenAt).toLocaleDateString('vi-VN')}</div>
        </div>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 110,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          icon={<AppIcon icon={PlayCircle} size="sm" />}
          onClick={() => onOpenDetail(record)}
          className="p-0 font-medium"
        >
          Hộp đen
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4 pt-1">
      {/* Top Frustrated Users Quick Filter Bar */}
      {(metrics?.userStats || []).length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 border border-amber-200/80 dark:border-amber-800/40 rounded-lg text-xs">
          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 mr-1">
            <AppIcon icon={User} size="sm" className="text-amber-500" />
            <span>Top gặp sự cố:</span>
          </span>
          <button
            type="button"
            onClick={() => onUserFilterChange('ALL')}
            className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
              userFilter === 'ALL'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Tất cả ({metrics?.totalOccurrences?.toLocaleString('vi-VN') ?? 0} lượt)
          </button>
          {metrics?.userStats?.slice(0, 6).map((u, idx) => {
            const isSelected = userFilter === u.userName;
            const rankBadge = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
            return (
              <button
                key={u.userName}
                type="button"
                onClick={() => onUserFilterChange(isSelected ? 'ALL' : u.userName)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
                  isSelected
                    ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <span>{rankBadge}</span>
                <span className="font-semibold">{u.userName}</span>
                <span
                  className={`text-[11px] tabular-nums ${
                    isSelected ? 'text-white/90' : 'text-rose-600 dark:text-rose-400 font-bold'
                  }`}
                >
                  {u.occurrenceCount.toLocaleString('vi-VN')} lượt
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
          <Input
            prefix={<AppIcon icon={Search} size="sm" />}
            placeholder="Tìm URL, nút bấm, thông điệp..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            onPressEnter={onSearchSubmit}
            allowClear
            className="max-w-[200px]"
          />
          <Select
            value={statusFilter}
            onChange={onStatusFilterChange}
            className="min-w-[130px]"
            options={[
              { value: 'ALL', label: 'Mọi trạng thái' },
              ...FRONTEND_ISSUE_STATUSES.map((s) => ({ value: s, label: STATUS_CONFIG[s].label })),
            ]}
          />
          <Select
            value={typeFilter}
            onChange={onTypeFilterChange}
            className="min-w-[145px]"
            options={[
              { value: 'ALL', label: 'Mọi loại sự cố' },
              ...FRONTEND_ISSUE_TYPES.map((t) => ({ value: t, label: ISSUE_TYPE_CONFIG[t].label })),
            ]}
          />
          <Select
            value={userFilter}
            onChange={onUserFilterChange}
            className="min-w-[210px]"
            showSearch
            filterOption={(input, option) =>
              ((option?.label as string) ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={[
              { value: 'ALL', label: '👤 Mọi nhân sự (Tất cả)' },
              ...(metrics?.userStats || []).map((u) => ({
                value: u.userName,
                label: `👤 ${u.userName} (${u.occurrenceCount.toLocaleString('vi-VN')} lượt · ${u.issueCount} lỗi)`,
              })),
            ]}
          />
          <Select
            value={sortBy}
            onChange={onSortByChange}
            className="min-w-[160px]"
            options={[
              { value: 'occurrences', label: '🔥 Nhiều lượt gặp nhất' },
              { value: 'lastSeen', label: '🕒 Thời gian gần nhất' },
            ]}
          />
        </div>
        <Button icon={<AppIcon icon={RefreshCw} size="sm" />} loading={loading} onClick={onRefresh}>
          Làm mới
        </Button>
      </div>

      {/* Data Table */}
      <DataTable<FrontendIssueRecord>
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={columns}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '25', '50'],
          onChange: onPageChange,
        }}
      />
    </div>
  );
}
