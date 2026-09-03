'use client';

import { Alert, Button, Typography, theme } from 'antd';
import type { RequestClassifierWorkerHealth, RequestClassifierWorkerHealthState } from '@mos-lab/shared';
import {
  Activity,
  BriefcaseBusiness,
  CheckCircle2,
  CircleAlert,
  CircleX,
  Clock3,
  History,
  Radio,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Wifi,
} from 'lucide-react';
import { AppIcon, IconButton, SectionCard, StatePanel, StatusTag, type StatusType } from '../../../../components/ui';

const { Text } = Typography;

const STATE_LABELS: Record<RequestClassifierWorkerHealthState, string> = {
  ONLINE: 'Online',
  DEGRADED: 'Degraded',
  OFFLINE: 'Offline',
};

const STATE_COLORS: Record<RequestClassifierWorkerHealthState, StatusType> = {
  ONLINE: 'success',
  DEGRADED: 'warning',
  OFFLINE: 'error',
};

const STATE_ICONS = {
  ONLINE: CheckCircle2,
  DEGRADED: CircleAlert,
  OFFLINE: CircleX,
} as const;

const CONNECTION_LABELS = {
  CONNECTED: 'Đã kết nối WebSocket',
  POLLING: 'Polling dự phòng',
  RECONNECTING: 'Đang kết nối lại',
  UNAVAILABLE: 'Không khả dụng',
} as const;

const CIRCUIT_BREAKER_LABELS = {
  NORMAL: 'Trong ngưỡng',
  WARNING: 'Cần theo dõi',
  PAUSE_RECOMMENDED: 'Nên tạm dừng để kiểm tra',
} as const;

interface WorkerDetailItem {
  label: string;
  value: string;
  meta?: string;
  icon: typeof Activity;
  numeric?: boolean;
}

function formatDate(value: string | null): string {
  if (!value) return 'Chưa có';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Không hợp lệ';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'medium' }).format(date);
}

function elapsed(seconds: number | null): string {
  if (seconds === null) return 'Chưa có heartbeat';
  if (seconds < 60) return `${seconds}s trước`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s trước`;
}

function duration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function transitionMessage(health: RequestClassifierWorkerHealth): string {
  const transition = health.latestTransition;
  if (!transition)
    return health.workerId ? 'Đang chờ transition đầu tiên từ server.' : 'Server chưa nhận heartbeat nào từ worker.';
  if (transition.toState === 'ONLINE' && transition.fromState && transition.fromState !== 'ONLINE') {
    return `Worker đã phục hồi từ ${STATE_LABELS[transition.fromState]}.`;
  }
  return `Server chuyển trạng thái sang ${STATE_LABELS[transition.toState]} · ${transition.reason}.`;
}

export function RequestClassifierWorkerHealthCard({
  health,
  loading,
  error,
  onRefresh,
}: {
  health: RequestClassifierWorkerHealth | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const { token } = theme.useToken();
  const state = health?.state ?? 'OFFLINE';
  const StateIcon = STATE_ICONS[state];
  const circuitBreaker = health?.circuitBreaker ?? null;
  const stateColor = state === 'ONLINE' ? token.colorSuccess : state === 'DEGRADED' ? token.colorWarning : token.colorError;
  const stateBackground =
    state === 'ONLINE' ? token.colorSuccessBg : state === 'DEGRADED' ? token.colorWarningBg : token.colorErrorBg;

  const detailItems: WorkerDetailItem[] = health
    ? [
        { label: 'Kết nối', value: CONNECTION_LABELS[health.connectionState], icon: Wifi },
        { label: 'Heartbeat gần nhất', value: formatDate(health.lastHeartbeatAt), icon: Radio, numeric: true },
        { label: 'Worker', value: health.workerId || 'Chưa ghi nhận', icon: ServerCog },
        { label: 'Phiên bản', value: health.workerVersion || '—', icon: Activity },
        {
          label: 'Công việc đang chạy',
          value: health.activeJob ? `${health.activeJob.kind} · ${formatDate(health.activeJob.startedAt)}` : 'Không có',
          icon: BriefcaseBusiness,
          numeric: true,
        },
        {
          label: 'Guardrail job',
          value: circuitBreaker
            ? `${CIRCUIT_BREAKER_LABELS[circuitBreaker.state]} · ${duration(circuitBreaker.activeForSeconds)}`
            : 'Chờ server cập nhật',
          icon: ShieldCheck,
          numeric: true,
        },
        {
          label: 'Kết quả gần nhất',
          value: health.latestOutcome
            ? `${health.latestOutcome.kind} · ${health.latestOutcome.status} · ${health.latestOutcome.code}`
            : 'Chưa có',
          meta: health.latestOutcome ? formatDate(health.latestOutcome.occurredAt) : undefined,
          icon: History,
          numeric: true,
        },
        { label: 'Giờ máy chủ', value: formatDate(health.serverTime), icon: Clock3, numeric: true },
      ]
    : [];

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <AppIcon icon={ServerCog} size="md" />
          Sức khỏe Inbox Worker
        </span>
      }
      extra={
        <IconButton
          label="Tải lại sức khỏe Inbox Worker"
          icon={RefreshCw}
          loading={loading}
          onClick={onRefresh}
        />
      }
    >
      {loading && !health ? (
        <StatePanel kind="loading" title="Đang đọc sức khỏe worker" minHeight={96} surface={false} />
      ) : error ? (
        <Alert
          type="error"
          showIcon
          message="Không thể đọc sức khỏe worker"
          description={error}
          action={<Button onClick={onRefresh}>Thử lại</Button>}
        />
      ) : health ? (
        <div className="space-y-3">
          <div
            className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
            style={{ background: stateBackground, borderColor: stateColor }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ color: stateColor, background: token.colorBgContainer }}
            >
              <AppIcon icon={StateIcon} size="lg" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Text strong style={{ color: stateColor, fontSize: token.fontSizeLG }}>
                  {STATE_LABELS[state]}
                </Text>
                <StatusTag status={STATE_COLORS[state]} label={health.stateReason} />
              </div>
              <Text type="secondary">{transitionMessage(health)}</Text>
            </div>
            <div className="shrink-0 sm:text-right">
              <Text type="secondary" className="block text-xs">
                Heartbeat
              </Text>
              <Text strong className="tabular-nums">
                {elapsed(health.secondsSinceHeartbeat)}
              </Text>
            </div>
          </div>
          {circuitBreaker && circuitBreaker.state !== 'NORMAL' ? (
            <Alert
              type={circuitBreaker.state === 'PAUSE_RECOMMENDED' ? 'warning' : 'info'}
              showIcon
              message={CIRCUIT_BREAKER_LABELS[circuitBreaker.state]}
              description={
                circuitBreaker.state === 'PAUSE_RECOMMENDED'
                  ? `Job ${circuitBreaker.activeJobKind} đã chạy ${duration(circuitBreaker.activeForSeconds)}. Đây là đề nghị kiểm tra/tạm dừng thủ công; hệ thống không tự dừng tiến trình hay đổi ticket.`
                  : `Job ${circuitBreaker.activeJobKind} đã chạy ${duration(circuitBreaker.activeForSeconds)} và qua ngưỡng theo dõi. Hệ thống chỉ cảnh báo, không tự dừng.`
              }
            />
          ) : null}
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border sm:grid-cols-2 lg:grid-cols-4" style={{ background: token.colorBorderSecondary, borderColor: token.colorBorderSecondary }}>
            {detailItems.map((item) => (
              <div key={item.label} className="flex min-w-0 gap-3 p-3" style={{ background: token.colorBgContainer }}>
                <span className="mt-0.5 shrink-0" style={{ color: token.colorTextSecondary }}>
                  <AppIcon icon={item.icon} size="sm" />
                </span>
                <div className="min-w-0">
                  <Text type="secondary" className="block text-xs">
                    {item.label}
                  </Text>
                  <Text className={`block break-words${item.numeric ? ' tabular-nums' : ''}`}>{item.value}</Text>
                  {item.meta ? (
                    <Text type="secondary" className="block text-xs tabular-nums">
                      {item.meta}
                    </Text>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Text type="secondary" className="text-xs tabular-nums">
              Ngưỡng: Online ≤ {health.thresholds.onlineWithinSeconds}s · Offline ≥{' '}
              {health.thresholds.offlineAfterSeconds}s
            </Text>
            <Text type={health.consecutiveFailureCount > 0 ? 'danger' : 'secondary'} className="text-xs tabular-nums">
              Lỗi liên tiếp: {health.consecutiveFailureCount}/{health.thresholds.sustainedFailureCount}
            </Text>
          </div>
        </div>
      ) : null}
    </SectionCard>
  );
}
