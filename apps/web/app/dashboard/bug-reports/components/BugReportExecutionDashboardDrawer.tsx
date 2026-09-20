'use client';

import { useEffect, useState } from 'react';
import type {
  BugReportRequestType,
  InboxExecutionDashboardQuery,
  InboxExecutionDashboardSummary,
  InboxExecutionPhaseMetric,
  InboxExecutionTopTicket,
} from '@mos-lab/shared';
import { Alert, Button, Radio, Select, Skeleton, Space, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { Bot, Clock, ExternalLink, Flame, Hourglass, Layers, RefreshCw, Server, UserCheck } from 'lucide-react';
import { AdaptiveDrawer, AppIcon, DataTable, SectionCard, StatePanel, StatusTag } from '../../../../components/ui';
import { apiClient } from '../../../../lib/api-client';
import { formatDurationSeconds, INBOX_TIMING_BUCKET_TONES } from '../bug-report-presenters';

const { Text } = Typography;

interface BugReportExecutionDashboardDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelectTicket?: (reportId: number) => void;
}

export function BugReportExecutionDashboardDrawer({
  open,
  onClose,
  onSelectTicket,
}: BugReportExecutionDashboardDrawerProps) {
  const [period, setPeriod] = useState<'WEEK' | 'MONTH' | 'ALL'>('WEEK');
  const [requestType, setRequestType] = useState<BugReportRequestType | 'ALL'>('ALL');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InboxExecutionDashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const query: InboxExecutionDashboardQuery = {
        period,
        requestType,
      };
      const result = await apiClient.bugReports.timingDashboard(query);
      setData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải báo cáo thời gian Agent.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void fetchDashboardData();
    }
  }, [open, period, requestType]);

  const phaseColumns: ColumnsType<InboxExecutionPhaseMetric> = [
    {
      title: 'Giai đoạn (Phase)',
      dataIndex: 'label',
      key: 'label',
      render: (label: string, record) => (
        <Space direction="vertical" size={2}>
          <span className="font-semibold text-slate-800 dark:text-slate-200">{label}</span>
          <StatusTag
            status={INBOX_TIMING_BUCKET_TONES[record.bucket]}
            label={
              record.bucket === 'AI_ACTIVE'
                ? 'Agent active'
                : record.bucket === 'USER_DANNY_WAIT'
                  ? 'Chờ con người'
                  : 'Hàng đợi'
            }
          />
        </Space>
      ),
    },
    {
      title: 'Số lần',
      dataIndex: 'count',
      key: 'count',
      align: 'right',
      render: (count: number) => <span className="tabular-nums">{count}</span>,
    },
    {
      title: 'Tổng thời gian',
      dataIndex: 'totalSeconds',
      key: 'totalSeconds',
      align: 'right',
      render: (sec: number) => (
        <span className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">
          {formatDurationSeconds(sec)}
        </span>
      ),
    },
    {
      title: 'Median (Trung vị)',
      dataIndex: 'medianSeconds',
      key: 'medianSeconds',
      align: 'right',
      render: (sec: number) => <span className="tabular-nums">{formatDurationSeconds(sec)}</span>,
    },
    {
      title: 'P95 (Phân vị 95)',
      dataIndex: 'p95Seconds',
      key: 'p95Seconds',
      align: 'right',
      render: (sec: number) => (
        <span className="tabular-nums font-medium text-amber-600 dark:text-amber-400">
          {formatDurationSeconds(sec)}
        </span>
      ),
    },
  ];

  const topTicketColumns: ColumnsType<InboxExecutionTopTicket> = [
    {
      title: '#',
      key: 'index',
      width: 50,
      align: 'center',
      render: (_, __, index) => <span className="tabular-nums text-slate-400 font-bold text-xs">{index + 1}</span>,
    },
    {
      title: 'Ticket',
      key: 'ticket',
      render: (_, record) => (
        <div className="flex flex-col gap-1 max-w-[320px]">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">{record.reportKey}</span>
            <span
              className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium ${
                record.requestType === 'FEATURE'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}
            >
              {record.requestType === 'FEATURE' ? 'Chức năng' : 'Báo lỗi'}
            </span>
          </div>
          <Text ellipsis={{ tooltip: record.title }} className="text-xs text-slate-700 dark:text-slate-300">
            {record.title}
          </Text>
        </div>
      ),
    },
    {
      title: 'Agent Active',
      dataIndex: 'aiActiveSeconds',
      key: 'aiActiveSeconds',
      align: 'right',
      render: (sec: number) => (
        <div className="flex flex-col items-end">
          <span className="font-bold tabular-nums text-blue-600 dark:text-blue-400 text-sm">
            {formatDurationSeconds(sec)}
          </span>
          <span className="text-[10px] text-slate-400 tabular-nums">Thời gian AI</span>
        </div>
      ),
    },
    {
      title: 'Chờ duyệt / User',
      dataIndex: 'userDannyWaitSeconds',
      key: 'userDannyWaitSeconds',
      align: 'right',
      render: (sec: number) => (
        <span className="tabular-nums text-amber-600 dark:text-amber-400 text-xs">{formatDurationSeconds(sec)}</span>
      ),
    },
    {
      title: 'Hàng đợi',
      dataIndex: 'systemWaitSeconds',
      key: 'systemWaitSeconds',
      align: 'right',
      render: (sec: number) => (
        <span className="tabular-nums text-slate-500 dark:text-slate-400 text-xs">{formatDurationSeconds(sec)}</span>
      ),
    },
    {
      title: 'End-to-End',
      dataIndex: 'endToEndSeconds',
      key: 'endToEndSeconds',
      align: 'right',
      render: (sec: number) => (
        <span className="tabular-nums font-semibold text-slate-800 dark:text-slate-200 text-xs">
          {formatDurationSeconds(sec)}
        </span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      align: 'center',
      width: 90,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          className="text-xs p-0"
          onClick={() => {
            onSelectTicket?.(record.reportId);
          }}
          icon={<AppIcon icon={ExternalLink} size="sm" />}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <AdaptiveDrawer
      open={open}
      onClose={onClose}
      intent="data"
      destroyOnHidden
      width={900}
      title={
        <div className="flex items-center gap-2">
          <AppIcon icon={Clock} size="md" className="text-blue-500" />
          <div className="flex flex-col">
            <span className="font-bold text-base leading-tight">Báo cáo Thời gian Agent (Kinh Thánh UI-008)</span>
            <span className="text-xs text-slate-500 font-normal">
              Đo lường thời gian thực hiện của AI độc lập với thời gian chờ của Danny và người báo
            </span>
          </div>
        </div>
      }
      extra={
        <Button
          icon={<AppIcon icon={RefreshCw} size="sm" className={loading ? 'animate-spin' : ''} />}
          onClick={fetchDashboardData}
          disabled={loading}
        >
          Làm mới
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Khoảng thời gian:</span>
            <Radio.Group
              size="small"
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'WEEK' | 'MONTH' | 'ALL')}
            >
              <Radio.Button value="WEEK">Tuần này (7 ngày)</Radio.Button>
              <Radio.Button value="MONTH">Tháng này (30 ngày)</Radio.Button>
              <Radio.Button value="ALL">Tất cả lịch sử</Radio.Button>
            </Radio.Group>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Loại yêu cầu:</span>
            <Select
              size="small"
              value={requestType}
              onChange={(val) => setRequestType(val)}
              className="w-[140px]"
              options={[
                { value: 'ALL', label: 'Tất cả loại' },
                { value: 'BUG', label: 'Báo lỗi (BUG)' },
                { value: 'FEATURE', label: 'Tính năng (FEATURE)' },
              ]}
            />
          </div>
        </div>

        {error && <Alert type="error" message={error} showIcon />}

        {loading && !data && <Skeleton active paragraph={{ rows: 8 }} />}

        {data && (
          <>
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center justify-between text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <AppIcon icon={Bot} size="sm" />
                    Tổng thời gian Agent
                  </span>
                  <span className="inline-flex items-center px-1 rounded text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                    {data.totalTickets} tickets
                  </span>
                </div>
                <div className="text-2xl font-bold tabular-nums text-blue-700 dark:text-blue-300">
                  {formatDurationSeconds(data.totalAiActiveSeconds)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-blue-500/10">
                  <span>
                    Median:{' '}
                    <strong className="tabular-nums">{formatDurationSeconds(data.medianAiActiveSeconds)}</strong>
                  </span>
                  <span>
                    P95: <strong className="tabular-nums">{formatDurationSeconds(data.p95AiActiveSeconds)}</strong>
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
                  <AppIcon icon={UserCheck} size="sm" />
                  Chờ duyệt / Con người
                </div>
                <div className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
                  {formatDurationSeconds(data.totalUserDannyWaitSeconds)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-amber-500/10">
                  Danny triage & người báo nghiệm thu
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-500/20 bg-slate-500/5 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <AppIcon icon={Server} size="sm" />
                  Hàng đợi hệ thống
                </div>
                <div className="text-2xl font-bold tabular-nums text-slate-700 dark:text-slate-300">
                  {formatDurationSeconds(data.totalSystemWaitSeconds)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-500/10">
                  Thời gian chờ worker nhận lease
                </div>
              </div>

              <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col gap-1.5 shadow-sm">
                <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-medium">
                  <AppIcon icon={Hourglass} size="sm" />
                  Tổng End-to-End
                </div>
                <div className="text-2xl font-bold tabular-nums text-purple-700 dark:text-purple-300">
                  {formatDurationSeconds(data.totalEndToEndSeconds)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-purple-500/10">
                  Vòng đời toàn bộ ticket
                </div>
              </div>
            </div>

            {/* Breakdown by Request Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      BÁO LỖI (BUG)
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      ({data.byRequestType.BUG.ticketCount} tickets)
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-red-600 dark:text-red-400">
                    {formatDurationSeconds(data.byRequestType.BUG.totalAiSeconds)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <span>
                    Median:{' '}
                    <strong className="tabular-nums text-slate-700 dark:text-slate-300">
                      {formatDurationSeconds(data.byRequestType.BUG.medianAiSeconds)}
                    </strong>
                  </span>
                  <span>
                    P95:{' '}
                    <strong className="tabular-nums text-slate-700 dark:text-slate-300">
                      {formatDurationSeconds(data.byRequestType.BUG.p95AiSeconds)}
                    </strong>
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                      CHỨC NĂNG (FEATURE)
                    </span>
                    <span className="text-xs text-slate-500 tabular-nums">
                      ({data.byRequestType.FEATURE.ticketCount} tickets)
                    </span>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-purple-600 dark:text-purple-400">
                    {formatDurationSeconds(data.byRequestType.FEATURE.totalAiSeconds)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg">
                  <span>
                    Median:{' '}
                    <strong className="tabular-nums text-slate-700 dark:text-slate-300">
                      {formatDurationSeconds(data.byRequestType.FEATURE.medianAiSeconds)}
                    </strong>
                  </span>
                  <span>
                    P95:{' '}
                    <strong className="tabular-nums text-slate-700 dark:text-slate-300">
                      {formatDurationSeconds(data.byRequestType.FEATURE.p95AiSeconds)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Leaderboard: Top Time-Consuming Tickets */}
            <SectionCard
              title={
                <div className="flex items-center gap-2">
                  <AppIcon icon={Flame} size="sm" className="text-orange-500" />
                  <span>Xếp hạng Ticket tốn nhiều thời gian Agent nhất ({data.topTimeConsumingTickets.length})</span>
                </div>
              }
            >
              {data.topTimeConsumingTickets.length === 0 ? (
                <StatePanel
                  kind="empty"
                  description="Không có ticket nào trong khoảng thời gian này."
                  surface={false}
                />
              ) : (
                <DataTable
                  dataSource={data.topTimeConsumingTickets}
                  columns={topTicketColumns}
                  rowKey="reportId"
                  pagination={false}
                  size="small"
                  className="inbox-timing-table"
                />
              )}
            </SectionCard>

            {/* Detailed Phase Breakdown */}
            <SectionCard
              title={
                <div className="flex items-center gap-2">
                  <AppIcon icon={Layers} size="sm" className="text-blue-500" />
                  <span>Phân tích chi tiết theo giai đoạn (Phase Breakdown)</span>
                </div>
              }
            >
              <DataTable
                dataSource={data.byPhase.filter((p) => p.count > 0)}
                columns={phaseColumns}
                rowKey="phase"
                pagination={false}
                size="small"
                className="inbox-timing-table"
              />
            </SectionCard>
          </>
        )}
      </div>
    </AdaptiveDrawer>
  );
}
