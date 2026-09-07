'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Segmented, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { RefreshCw, Trophy } from 'lucide-react';
import type { BkBookingLeaderboardEntry } from '@mos-lab/shared';
import { AppIcon, DataSection, DataTable, MetricGrid, StatePanel } from '~/components/ui';
import { apiClient } from '~/lib/api-client';

type GameMetric = 'calls' | 'pickups' | 'bookings' | 'done';

interface BkGameTabProps {
  dateRange: [Dayjs, Dayjs];
  comparisonMode: 'month' | 'week' | 'day';
}

const METRIC_OPTIONS: { label: string; value: GameMetric }[] = [
  { label: 'Cuộc gọi', value: 'calls' },
  { label: 'Khách nghe máy', value: 'pickups' },
  { label: 'Booking', value: 'bookings' },
  { label: 'Done', value: 'done' },
];

const METRIC_LABEL: Record<GameMetric, string> = {
  calls: 'Cuộc gọi',
  pickups: 'Khách nghe máy',
  bookings: 'Booking tạo mới',
  done: 'Done',
};

function metricValue(entry: BkBookingLeaderboardEntry, metric: GameMetric): number {
  if (metric === 'calls') return entry.callCount;
  if (metric === 'pickups') return entry.pickupCount;
  if (metric === 'bookings') return entry.totalCreatedBookings;
  return entry.doneBookings;
}

export default function BkGameTab({ dateRange, comparisonMode }: BkGameTabProps) {
  const [metric, setMetric] = useState<GameMetric>('bookings');
  const [leaderboard, setLeaderboard] = useState<BkBookingLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.bk.getBookingLeaderboard({
        dateFrom: dateRange[0].format('YYYY-MM-DD'),
        dateTo: dateRange[1].format('YYYY-MM-DD'),
        storeId: 'ALL',
      });
      setLeaderboard(response.leaderboard || []);
    } catch {
      setError('Không thể tải bảng xếp hạng Game BK. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void loadLeaderboard();
    const refreshTimer = window.setInterval(() => void loadLeaderboard(), 30_000);
    return () => window.clearInterval(refreshTimer);
  }, [loadLeaderboard]);

  const rankedEntries = useMemo(
    () =>
      [...leaderboard]
        .sort(
          (left, right) =>
            metricValue(right, metric) - metricValue(left, metric) || left.displayName.localeCompare(right.displayName)
        )
        .map((entry, index) => ({ ...entry, gameRank: index + 1, gameScore: metricValue(entry, metric) })),
    [leaderboard, metric]
  );

  const totalScore = rankedEntries.reduce((total, entry) => total + entry.gameScore, 0);
  const leaderScore = rankedEntries[0]?.gameScore || 0;

  return (
    <div className="space-y-4">
      <Alert
        showIcon
        type="info"
        message="Game BK · bảng thi đua trực tiếp"
        description="Điểm được lấy từ BK Leaderboard chuẩn trong kỳ đang chọn. Manager sẽ cấu hình mục tiêu, đội và thưởng/phạt ở bước tiếp theo; màn hình này chưa tạo hoặc chốt bất kỳ khoản thưởng nào."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Typography.Title level={4} className="!mb-0">
            <AppIcon icon={Trophy} size="md" className="mr-2 text-amber-500" /> Game BK
          </Typography.Title>
          <Typography.Text type="secondary">
            Thi đua theo {comparisonMode === 'day' ? 'ngày' : comparisonMode === 'week' ? 'tuần' : 'tháng'} · tự làm mới
            mỗi 30 giây
          </Typography.Text>
        </div>
        <Button
          icon={<AppIcon icon={RefreshCw} size="action" />}
          onClick={() => void loadLeaderboard()}
          loading={loading}
        >
          Làm mới
        </Button>
      </div>

      <Segmented<GameMetric>
        aria-label="Chỉ số xếp hạng Game BK"
        options={METRIC_OPTIONS}
        value={metric}
        onChange={setMetric}
      />

      <MetricGrid
        items={[
          { key: 'participants', title: 'Người tham gia', value: rankedEntries.length, format: 'number' },
          { key: 'total', title: `Tổng ${METRIC_LABEL[metric]}`, value: totalScore, format: 'number' },
          { key: 'leader', title: `Dẫn đầu ${METRIC_LABEL[metric]}`, value: leaderScore, format: 'number' },
        ]}
      />

      <DataSection title={`Bảng xếp hạng · ${METRIC_LABEL[metric]}`}>
        {error ? (
          <StatePanel
            kind="error"
            title="Không tải được Game BK"
            description={error}
            extra={<Button onClick={() => void loadLeaderboard()}>Thử lại</Button>}
          />
        ) : !loading && rankedEntries.length === 0 ? (
          <StatePanel
            kind="empty"
            title="Chưa có dữ liệu thi đua"
            description="Không có hoạt động BK trong khoảng thời gian đang chọn."
          />
        ) : (
          <DataTable
            rowKey="bookerId"
            loading={loading}
            dataSource={rankedEntries}
            pagination={false}
            columnPriority={{
              rank: 'secondary',
              staff: 'primary',
              score: 'primary',
              calls: 'secondary',
              pickups: 'secondary',
              bookings: 'secondary',
              done: 'secondary',
            }}
            columns={[
              {
                title: '#',
                dataIndex: 'gameRank',
                key: 'rank',
                width: 64,
                render: (value) => <span className="tabular-nums font-semibold">{value}</span>,
              },
              { title: 'Telesales', dataIndex: 'displayName', key: 'staff' },
              {
                title: METRIC_LABEL[metric],
                dataIndex: 'gameScore',
                key: 'score',
                align: 'right',
                render: (value) => <span className="tabular-nums font-semibold">{value}</span>,
              },
              {
                title: 'Gọi',
                dataIndex: 'callCount',
                key: 'calls',
                align: 'right',
                render: (value) => <span className="tabular-nums">{value}</span>,
              },
              {
                title: 'Nghe máy',
                dataIndex: 'pickupCount',
                key: 'pickups',
                align: 'right',
                render: (value) => <span className="tabular-nums">{value}</span>,
              },
              {
                title: 'Booking',
                dataIndex: 'totalCreatedBookings',
                key: 'bookings',
                align: 'right',
                render: (value) => <span className="tabular-nums">{value}</span>,
              },
              {
                title: 'Done',
                dataIndex: 'doneBookings',
                key: 'done',
                align: 'right',
                render: (value) => <span className="tabular-nums">{value}</span>,
              },
            ]}
          />
        )}
      </DataSection>
    </div>
  );
}
