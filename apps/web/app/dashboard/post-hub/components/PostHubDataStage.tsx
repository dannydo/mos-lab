'use client';

import React from 'react';
import { Button, Select, Space, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CircleCheck, CircleX, Clock3, Link, Pencil, Send } from 'lucide-react';
import {
  removeVietnameseTones,
  type SocialPostAuthorOption,
  type SocialPostListResponse,
  type SocialPostPlatformFilter,
  type SocialPostSubmission,
  type SocialPostSummary,
} from '@mos-lab/shared';
import { AppIcon, DataSection, DataTable, MetricGrid } from '~/components/ui';
import {
  displaySheetDate,
  PostHubReviewStatusTag,
  PostHubSourceContext,
  PostHubStaffAvatar,
} from './PostHubPresentation';

const { Text } = Typography;

interface PostHubDataStageProps {
  summary: SocialPostSummary;
  reportPeriodLabel: string;
  response: SocialPostListResponse | null;
  data: SocialPostSubmission[];
  authorOptions: SocialPostAuthorOption[];
  selectedAuthorStaffId?: number;
  selectedSourcePlatform: 'ALL' | SocialPostPlatformFilter;
  page: number;
  pageSize: number;
  loading: boolean;
  token: {
    colorBorderSecondary: string;
    colorBgContainer: string;
  };
  onAuthorChange: (staffId: number | undefined) => void;
  onSourcePlatformChange: (platform: 'ALL' | SocialPostPlatformFilter) => void;
  onPaginationChange: (page: number, pageSize: number) => void;
  onOpenReview: (submission: SocialPostSubmission) => void;
}

export function PostHubDataStage({
  summary,
  reportPeriodLabel,
  response,
  data,
  authorOptions,
  selectedAuthorStaffId,
  selectedSourcePlatform,
  page,
  pageSize,
  loading,
  token,
  onAuthorChange,
  onSourcePlatformChange,
  onPaginationChange,
  onOpenReview,
}: PostHubDataStageProps) {
  const columns: ColumnsType<SocialPostSubmission> = [
    {
      title: '#',
      dataIndex: 'sourceRecordId',
      key: 'sourceRecordId',
      width: 80,
      render: (id: number) => <span className="tabular-nums font-medium">{id}</span>,
    },
    {
      title: 'Người đăng',
      dataIndex: 'author',
      key: 'author',
      width: 205,
      render: (author: string, record) => (
        <Space size={8}>
          <PostHubStaffAvatar name={author} avatarUrl={record.avatarUrl} />
          <div className="font-medium">{author}</div>
        </Space>
      ),
    },
    {
      title: 'Kênh / nơi đăng',
      dataIndex: 'channel',
      key: 'channel',
      width: 320,
      render: (channel: string, record) => (
        <PostHubSourceContext source={record.source} channel={channel} origin={record.origin} />
      ),
    },
    {
      title: 'Ngày đăng gốc (ICT)',
      dataIndex: 'postedAt',
      key: 'postedAt',
      width: 180,
      render: (postedAt: string) => <span className="tabular-nums">{displaySheetDate(postedAt)}</span>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      width: 156,
      render: (status) => <PostHubReviewStatusTag status={status} />,
    },
    {
      title: 'Link gốc',
      key: 'link',
      width: 88,
      align: 'center',
      render: (_, record) =>
        record.sourceUrl ? (
          <Tooltip title="Mở bài đăng nguồn">
            <Button
              type="text"
              size="small"
              aria-label={`Mở link bài đăng ${record.sourceRecordId}`}
              icon={<AppIcon icon={Link} />}
              href={record.sourceUrl}
              target="_blank"
              rel="noreferrer"
            />
          </Tooltip>
        ) : (
          <Text type="secondary" className="text-xs">
            Thiếu link
          </Text>
        ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 118,
      fixed: 'right',
      render: (_, record) => (
        <Button type="link" size="small" icon={<AppIcon icon={Pencil} />} onClick={() => onOpenReview(record)}>
          Duyệt
        </Button>
      ),
    },
  ];

  return (
    <>
      <MetricGrid
        items={[
          {
            key: 'submitted',
            title: 'Đã ghi nhận',
            value: summary.submitted,
            format: 'number',
            icon: <AppIcon icon={Send} />,
            subValue: reportPeriodLabel,
          },
          {
            key: 'pending',
            title: 'Cần xem xét',
            value: summary.needsReview,
            format: 'number',
            icon: <AppIcon icon={Clock3} />,
            subValue: 'Chờ duyệt + kiểm tra lại',
          },
          {
            key: 'approved',
            title: 'Hợp lệ',
            value: summary.approved,
            format: 'number',
            icon: <AppIcon icon={CircleCheck} />,
            subValue: 'Từ 2.APPROVE',
          },
          {
            key: 'invalid',
            title: 'Chưa hợp lệ',
            value: summary.rejected,
            format: 'number',
            icon: <AppIcon icon={CircleX} />,
            subValue: 'Từ 2.APPROVE',
          },
        ]}
      />
      <DataSection
        title="1. DATA — Sổ tiếp nhận bài đăng mOS"
        extra={
          <Space size={8} wrap>
            <Select
              aria-label="Lọc nền tảng bài đăng trong 1.DATA"
              value={selectedSourcePlatform}
              onChange={onSourcePlatformChange}
              options={[
                { value: 'ALL', label: 'Tất cả nền tảng' },
                { value: 'FACEBOOK', label: 'Facebook' },
                { value: 'TIKTOK', label: 'TikTok' },
              ]}
              style={{ minWidth: 166 }}
            />
            <Select
              aria-label="Lọc theo người đăng trong 1.DATA"
              value={selectedAuthorStaffId}
              onChange={onAuthorChange}
              options={authorOptions.map((author) => ({
                value: author.staffId,
                label: author.displayName,
              }))}
              allowClear
              showSearch
              filterOption={(input, option) =>
                removeVietnameseTones(String(option?.label || '')).includes(removeVietnameseTones(input))
              }
              placeholder="Chọn người đăng"
              notFoundContent="Không có người đăng trong kỳ này"
              style={{ minWidth: 236 }}
            />
            <Text type="secondary">{response?.total.toLocaleString('vi-VN') || 0} bài</Text>
          </Space>
        }
      >
        <DataTable
          rowKey="id"
          columns={columns}
          dataSource={data}
          loading={loading}
          columnPriority={{ sourceRecordId: 'tertiary', postedAt: 'secondary', link: 'tertiary', action: 'primary' }}
          stickyPrimaryColumn
          mobileRecordKey={(record) => record.id}
          mobileRenderer={(record) => (
            <button
              type="button"
              onClick={() => onOpenReview(record)}
              className="w-full rounded-xl border p-3 text-left"
              style={{ borderColor: token.colorBorderSecondary, background: token.colorBgContainer }}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="inline-flex min-w-0 items-center gap-2 font-semibold">
                  <PostHubStaffAvatar name={record.author} avatarUrl={record.avatarUrl} />
                  <span className="truncate">{record.author}</span>
                </span>
                <PostHubReviewStatusTag status={record.reviewStatus} />
              </div>
              <div className="mt-1">
                <PostHubSourceContext source={record.source} channel={record.channel} origin={record.origin} compact />
              </div>
              <Text type="secondary" className="mt-1 block text-xs tabular-nums">
                {displaySheetDate(record.postedAt)}
              </Text>
            </button>
          )}
          pagination={{
            current: page,
            pageSize,
            total: response?.total || 0,
            onChange: onPaginationChange,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total} bài`,
          }}
          onRow={(record) => ({ onDoubleClick: () => onOpenReview(record) })}
        />
      </DataSection>
    </>
  );
}
