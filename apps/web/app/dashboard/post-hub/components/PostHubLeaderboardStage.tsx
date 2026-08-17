'use client';

import React from 'react';
import { Button, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ChartNoAxesCombined, Send, Users, Video } from 'lucide-react';
import { type SocialPostLeaderboardEntry } from '@mos-lab/shared';
import { AppIcon, DataSection, DataTable, MetricGrid, StatusTag } from '~/components/ui';
import { PostHubStaffAvatar } from './PostHubPresentation';

const { Paragraph, Text } = Typography;

interface PostHubLeaderboardStageProps {
  leaderboard: SocialPostLeaderboardEntry[];
  leaderboardPeriod: string;
  rewardRule: string;
  loading: boolean;
  token: {
    colorWarning: string;
    colorWarningBorder: string;
    colorWarningBg: string;
    colorBorderSecondary: string;
    colorBgContainer: string;
  };
  onOpenPosterDaily: (poster: SocialPostLeaderboardEntry) => void;
}

export function PostHubLeaderboardStage({
  leaderboard,
  leaderboardPeriod,
  rewardRule,
  loading,
  token,
  onOpenPosterDaily,
}: PostHubLeaderboardStageProps) {
  const topMember = leaderboard[0];
  const columns: ColumnsType<SocialPostLeaderboardEntry> = [
    {
      title: 'Hạng',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      align: 'center',
      render: (rank: number) => (
        <span className="text-base font-bold tabular-nums">{rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : rank}</span>
      ),
    },
    {
      title: 'Tài khoản mOS',
      dataIndex: 'member',
      key: 'member',
      render: (member: string, record) => (
        <Button
          type="link"
          className="h-auto px-0 py-0 text-left"
          onClick={() => onOpenPosterDaily(record)}
          aria-label={`Xem điểm Daily của ${member}`}
        >
          <span className="inline-flex items-center gap-2">
            <PostHubStaffAvatar name={member} avatarUrl={record.avatarUrl} size={30} />
            <span className="font-medium">{member}</span>
          </span>
        </Button>
      ),
    },
    {
      title: 'Đã đăng',
      dataIndex: 'submittedCount',
      key: 'submittedCount',
      align: 'center',
      width: 100,
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: 'Video ✅',
      dataIndex: 'approvedVideoCount',
      key: 'approvedVideoCount',
      align: 'center',
      width: 100,
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: 'Khác ✅',
      dataIndex: 'approvedRecruitmentCount',
      key: 'approvedRecruitmentCount',
      align: 'center',
      width: 100,
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: 'Kiểm tra lại',
      dataIndex: 'needsReviewCount',
      key: 'needsReviewCount',
      align: 'center',
      width: 130,
      render: (value: number) => <span className="tabular-nums">{value}</span>,
    },
    {
      title: '🍌',
      dataIndex: 'bananaPoints',
      key: 'bananaPoints',
      align: 'right',
      width: 100,
      render: (value: number | null) =>
        value === null ? (
          <StatusTag status="orange" label="Cần cấu hình" />
        ) : (
          <span className="text-base font-bold tabular-nums" style={{ color: token.colorWarning }}>
            {value}
          </span>
        ),
    },
  ];

  return (
    <>
      <MetricGrid
        items={[
          {
            key: 'leaderboard-posters',
            title: 'Poster',
            value: leaderboard.length,
            format: 'number',
            icon: <AppIcon icon={Users} />,
            subValue: leaderboardPeriod,
          },
          {
            key: 'leaderboard-banana',
            title: 'Top 🍌',
            value: topMember?.bananaPoints ?? 0,
            format: 'number',
            icon: <AppIcon icon={ChartNoAxesCombined} />,
            subValue: `${topMember?.member || '—'}${topMember?.bananaPoints === null ? ' · cần cấu hình' : ''}`,
          },
          {
            key: 'leaderboard-video',
            title: 'Top Video ✅',
            value: topMember?.approvedVideoCount ?? 0,
            format: 'number',
            icon: <AppIcon icon={Video} />,
            subValue: topMember?.member || '—',
          },
          {
            key: 'leaderboard-other',
            title: 'Top Bài khác ✅',
            value: topMember?.approvedRecruitmentCount ?? 0,
            format: 'number',
            icon: <AppIcon icon={Send} />,
            subValue: topMember?.member || '—',
          },
        ]}
      />
      <DataSection
        title="LEADERBOARD — Chiến Thần 🍌"
        extra={<StatusTag status="gold" label={leaderboardPeriod} className="tabular-nums" />}
        state={!loading && leaderboard.length === 0 ? 'empty' : undefined}
        stateTitle="Chưa có poster trong campaign"
        stateDescription="Dữ liệu sẽ xuất hiện sau khi poster nộp bài đăng trong mOS."
      >
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          style={{ borderColor: token.colorWarningBorder, background: token.colorWarningBg }}
        >
          <div>
            <div className="font-semibold">
              {topMember?.rank === 1 ? '🥇' : '🍌'} {topMember?.member || 'Chưa có dữ liệu'}
            </div>
            <Text type="secondary">
              Dẫn đầu với{' '}
              {topMember?.bananaPoints === null ? 'mức thưởng cần cấu hình' : `${topMember?.bananaPoints ?? 0} 🍌`},
              cộng theo từng ngày đăng trong kỳ đã chọn.
            </Text>
          </div>
          <Paragraph className="mb-0 max-w-xl text-sm" type="secondary">
            Nhấn tên poster để xem ledger điểm 🍌 theo từng ngày. {rewardRule}
          </Paragraph>
        </div>
        {leaderboard.length > 0 && (
          <DataTable
            rowKey="staffId"
            columns={columns}
            dataSource={leaderboard}
            loading={loading}
            pagination={false}
            stickyPrimaryColumn
            columnPriority={{
              rank: 'primary',
              member: 'primary',
              submittedCount: 'secondary',
              needsReviewCount: 'tertiary',
              bananaPoints: 'primary',
            }}
            mobileRecordKey={(record) => record.staffId}
            mobileRenderer={(record) => (
              <button
                type="button"
                onClick={() => onOpenPosterDaily(record)}
                className="w-full rounded-xl border p-3 text-left"
                style={{ borderColor: token.colorBorderSecondary, background: token.colorBgContainer }}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="inline-flex min-w-0 items-center gap-2 font-semibold">
                    <span>{record.rank <= 3 ? ['🥇', '🥈', '🥉'][record.rank - 1] : `#${record.rank}`}</span>
                    <PostHubStaffAvatar name={record.member} avatarUrl={record.avatarUrl} size={30} />
                    <span className="truncate">{record.member}</span>
                  </span>
                  {record.bananaPoints === null ? (
                    <StatusTag status="orange" label="Cần cấu hình" />
                  ) : (
                    <span className="font-bold tabular-nums" style={{ color: token.colorWarning }}>
                      {record.bananaPoints} 🍌
                    </span>
                  )}
                </div>
                <Text type="secondary" className="mt-1 block text-xs">
                  {record.approvedVideoCount} video · {record.approvedRecruitmentCount} bài khác hợp lệ · chạm để xem
                  Daily
                </Text>
              </button>
            )}
          />
        )}
      </DataSection>
    </>
  );
}
