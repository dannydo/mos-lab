'use client';

import React from 'react';
import dayjs from 'dayjs';
import { Alert, Button, Descriptions, Typography, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type {
  SocialPostLeaderboardEntry,
  SocialPostPosterDailyReward,
  SocialPostPosterDailyRewardResponse,
} from '@mos-lab/shared';
import { DataSection, DataTable, EntityFormDrawer, StatusTag } from '~/components/ui';
import { rewardRuleDescription } from './PostHubPresentation';

const { Text } = Typography;

interface PostHubPosterDailyDrawerProps {
  open: boolean;
  poster: SocialPostLeaderboardEntry | null;
  response: SocialPostPosterDailyRewardResponse | null;
  loading: boolean;
  error: string | null;
  reportPeriodLabel: string;
  onClose: () => void;
}

export function PostHubPosterDailyDrawer({
  open,
  poster,
  response,
  loading,
  error,
  reportPeriodLabel,
  onClose,
}: PostHubPosterDailyDrawerProps) {
  const { token } = theme.useToken();
  const columns: ColumnsType<SocialPostPosterDailyReward> = [
    {
      title: 'Ngày đăng (ICT)',
      dataIndex: 'date',
      key: 'date',
      width: 150,
      render: (date: string) => <span className="font-medium tabular-nums">{dayjs(date).format('DD/MM/YYYY')}</span>,
    },
    {
      title: 'Đã đăng',
      dataIndex: 'submittedCount',
      key: 'submittedCount',
      width: 90,
      align: 'center',
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: 'Video ✅',
      dataIndex: 'approvedVideoCount',
      key: 'approvedVideoCount',
      width: 100,
      align: 'center',
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: 'Bài khác ✅',
      dataIndex: 'approvedRecruitmentCount',
      key: 'approvedRecruitmentCount',
      width: 115,
      align: 'center',
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: 'Cần xem lại',
      dataIndex: 'needsReviewCount',
      key: 'needsReviewCount',
      width: 120,
      align: 'center',
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: '🍌 ngày',
      dataIndex: 'bananaPoints',
      key: 'bananaPoints',
      width: 110,
      align: 'right',
      render: (value: number | null) =>
        value === null ? (
          <StatusTag status="orange" label="Cần cấu hình" />
        ) : (
          <span className="font-bold tabular-nums" style={{ color: token.colorWarning }}>
            {value}
          </span>
        ),
    },
  ];

  return (
    <EntityFormDrawer
      open={open}
      onClose={onClose}
      title={`Điểm Daily — ${poster?.member || 'Poster'}`}
      footer={<Button onClick={onClose}>Đóng</Button>}
    >
      <div className="flex flex-col gap-5">
        {loading && <Alert type="info" showIcon message="Đang tải ledger điểm Daily của poster…" />}
        {error && <Alert type="error" showIcon message="Không thể tải điểm Daily" description={error} />}
        {response && (
          <>
            <Descriptions
              bordered
              size="small"
              column={1}
              items={[
                {
                  key: 'total',
                  label: `Tổng 🍌 ${
                    response.dateFrom && response.dateTo
                      ? `${dayjs(response.dateFrom).format('DD/MM/YYYY')} – ${dayjs(response.dateTo).format('DD/MM/YYYY')}`
                      : reportPeriodLabel
                  }`,
                  children:
                    response.totalBananaPoints === null ? (
                      <StatusTag status="orange" label="Có ngày cần cấu hình" />
                    ) : (
                      <span className="font-bold tabular-nums" style={{ color: token.colorWarning }}>
                        {response.totalBananaPoints} 🍌
                      </span>
                    ),
                },
                {
                  key: 'days',
                  label: 'Ngày có bài đăng trong kỳ',
                  children: <span className="tabular-nums">{response.daily.length}</span>,
                },
                {
                  key: 'unresolved',
                  label: 'Ngày chờ cấu hình',
                  children: <span className="tabular-nums">{response.unresolvedDayCount}</span>,
                },
                {
                  key: 'rule',
                  label: 'Quy tắc',
                  children: <Text type="secondary">{rewardRuleDescription(response.rewardConfig)}</Text>,
                },
              ]}
            />
            <DataSection
              title="Ledger điểm theo ngày đăng (ICT)"
              extra={<StatusTag status="gold" label="Daily Bonus" />}
            >
              <DataTable
                rowKey="date"
                columns={columns}
                dataSource={response.daily}
                pagination={false}
                stickyPrimaryColumn
                columnPriority={{
                  date: 'primary',
                  submittedCount: 'secondary',
                  approvedVideoCount: 'secondary',
                  approvedRecruitmentCount: 'secondary',
                  needsReviewCount: 'tertiary',
                  bananaPoints: 'primary',
                }}
                mobileRecordKey={(record) => record.date}
                mobileRenderer={(record) => (
                  <div className="rounded-xl border p-3" style={{ borderColor: token.colorBorderSecondary }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold tabular-nums">{dayjs(record.date).format('DD/MM/YYYY')}</span>
                      {record.bananaPoints === null ? (
                        <StatusTag status="orange" label="Cần cấu hình" />
                      ) : (
                        <span className="font-bold tabular-nums" style={{ color: token.colorWarning }}>
                          {record.bananaPoints} 🍌
                        </span>
                      )}
                    </div>
                    <Text type="secondary" className="mt-1 block text-xs">
                      {record.submittedCount} bài đăng · {record.approvedVideoCount} video ✅ ·{' '}
                      {record.approvedRecruitmentCount} bài khác ✅ · {record.needsReviewCount} cần xem lại
                    </Text>
                  </div>
                )}
              />
            </DataSection>
          </>
        )}
      </div>
    </EntityFormDrawer>
  );
}
