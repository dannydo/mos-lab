'use client';

import React from 'react';
import { Button, Select, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CircleCheck, CircleX, Send, TriangleAlert, View } from 'lucide-react';
import {
  removeVietnameseTones,
  type SocialPostAuthorOption,
  type SocialPostListResponse,
  type SocialPostSubmission,
  type SocialPostSummary,
} from '@mos-lab/shared';
import { AppIcon, DataSection, DataTable, MetricGrid, StatusTag } from '~/components/ui';
import {
  displaySheetDate,
  PostHubReviewStatusTag,
  PostHubSourceContext,
  PostHubStaffAvatar,
} from './PostHubPresentation';

const { Text } = Typography;

interface PostHubApprovalStageProps {
  summary: SocialPostSummary;
  reportPeriodLabel: string;
  response: SocialPostListResponse | null;
  ledger: SocialPostSubmission[];
  authorOptions: SocialPostAuthorOption[];
  selectedAuthorStaffId?: number;
  page: number;
  pageSize: number;
  loading: boolean;
  token: {
    colorBorderSecondary: string;
    colorBgContainer: string;
  };
  onAuthorChange: (staffId: number | undefined) => void;
  onPaginationChange: (page: number, pageSize: number) => void;
  onOpenReview: (submission: SocialPostSubmission) => void;
}

export function PostHubApprovalStage({
  summary,
  reportPeriodLabel,
  response,
  ledger,
  authorOptions,
  selectedAuthorStaffId,
  page,
  pageSize,
  loading,
  token,
  onAuthorChange,
  onPaginationChange,
  onOpenReview,
}: PostHubApprovalStageProps) {
  const columns: ColumnsType<SocialPostSubmission> = [
    {
      title: '#',
      dataIndex: 'sourceRecordId',
      key: 'sourceRecordId',
      width: 70,
      render: (id: number) => <span className="tabular-nums font-medium">{id}</span>,
    },
    {
      title: 'Người đăng',
      dataIndex: 'author',
      key: 'author',
      width: 190,
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
      title: 'Tình trạng',
      dataIndex: 'reviewStatus',
      key: 'reviewStatus',
      width: 150,
      render: (status) => <PostHubReviewStatusTag status={status} />,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 118,
      fixed: 'right',
      render: (_, record) => (
        <Button type="primary" size="small" icon={<AppIcon icon={View} />} onClick={() => onOpenReview(record)}>
          Xem xét
        </Button>
      ),
    },
  ];

  return (
    <>
      <MetricGrid
        items={[
          {
            key: 'approve-ledger',
            title: 'Ledger kết quả duyệt',
            value: response?.total || 0,
            format: 'number',
            icon: <AppIcon icon={Send} />,
            subValue: `2.APPROVE · ${reportPeriodLabel}`,
          },
          {
            key: 'approved-review',
            title: 'Hợp lệ',
            value: summary.approved,
            format: 'number',
            icon: <AppIcon icon={CircleCheck} />,
            subValue: 'Kết quả ✅ trong ledger',
          },
          {
            key: 'needs-review',
            title: 'Kiểm tra lại',
            value: summary.needsReview,
            format: 'number',
            icon: <AppIcon icon={TriangleAlert} />,
            subValue: 'Kết quả 🔁 trong ledger',
          },
          {
            key: 'rejected-review',
            title: 'Chưa hợp lệ',
            value: summary.rejected,
            format: 'number',
            icon: <AppIcon icon={CircleX} />,
            subValue: 'Kết quả ❌ trong ledger',
          },
        ]}
      />
      <DataSection
        title="2. APPROVE — Ledger kết quả duyệt"
        extra={
          <Space size={8} wrap>
            <Select
              aria-label="Lọc theo người đăng trong 2.APPROVE"
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
            <StatusTag status="processing" label={`${response?.total || 0} kết quả duyệt`} />
          </Space>
        }
        state={!loading && ledger.length === 0 ? 'empty' : undefined}
        stateTitle="Chưa có dữ liệu từ 2.APPROVE"
        stateDescription={
          selectedAuthorStaffId
            ? 'Người đăng này chưa có kết quả duyệt trong kỳ báo cáo đang chọn.'
            : 'Không có kết quả duyệt nào có ngày đăng gốc trong kỳ báo cáo đang chọn.'
        }
      >
        {ledger.length > 0 && (
          <DataTable
            rowKey="id"
            columns={columns}
            dataSource={ledger}
            loading={loading}
            stickyPrimaryColumn
            columnPriority={{
              sourceRecordId: 'tertiary',
              author: 'secondary',
              channel: 'primary',
              postedAt: 'secondary',
              reviewStatus: 'primary',
              action: 'primary',
            }}
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
                  <PostHubSourceContext
                    source={record.source}
                    channel={record.channel}
                    origin={record.origin}
                    compact
                  />
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
              showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} / ${total} dòng 2.APPROVE`,
            }}
            onRow={(record) => ({ onClick: () => onOpenReview(record), style: { cursor: 'pointer' } })}
          />
        )}
      </DataSection>
    </>
  );
}
