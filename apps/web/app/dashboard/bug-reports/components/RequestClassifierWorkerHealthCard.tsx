'use client';

import { Alert, Button, Descriptions, Typography } from 'antd';
import type { RequestClassifierWorkerHealth, RequestClassifierWorkerHealthState } from '@mos-lab/shared';
import { Activity, RefreshCw, ServerCog } from 'lucide-react';
import { AppIcon, SectionCard, StatePanel, StatusTag, type StatusType } from '../../../../components/ui';

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
  const state = health?.state ?? 'OFFLINE';
  const alertType = state === 'ONLINE' ? 'success' : state === 'DEGRADED' ? 'warning' : 'error';
  const circuitBreaker = health?.circuitBreaker ?? null;

  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          <AppIcon icon={ServerCog} size="md" />
          Sức khỏe Inbox Worker
        </span>
      }
      extra={
        <Button
          size="small"
          aria-label="Tải lại sức khỏe Inbox Worker"
          icon={<AppIcon icon={RefreshCw} size="sm" />}
          loading={loading}
          onClick={onRefresh}
        >
          Tải lại
        </Button>
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
        <div className="space-y-4">
          <Alert
            type={alertType}
            showIcon
            icon={<AppIcon icon={Activity} size="sm" />}
            message={
              <span className="flex flex-wrap items-center gap-2">
                <Text strong>{STATE_LABELS[state]}</Text>
                <StatusTag status={STATE_COLORS[state]} label={health.stateReason} />
                <Text type="secondary" className="tabular-nums">
                  Heartbeat {elapsed(health.secondsSinceHeartbeat)}
                </Text>
              </span>
            }
            description={transitionMessage(health)}
          />
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
          <Descriptions column={{ xs: 1, sm: 2, md: 3 }} size="small" bordered>
            <Descriptions.Item label="Worker">{health.workerId || 'Chưa ghi nhận'}</Descriptions.Item>
            <Descriptions.Item label="Phiên bản">{health.workerVersion || '—'}</Descriptions.Item>
            <Descriptions.Item label="Kết nối">{CONNECTION_LABELS[health.connectionState]}</Descriptions.Item>
            <Descriptions.Item label="Heartbeat gần nhất">
              <span className="tabular-nums">{formatDate(health.lastHeartbeatAt)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Giờ máy chủ">
              <span className="tabular-nums">{formatDate(health.serverTime)}</span>
            </Descriptions.Item>
            <Descriptions.Item label="Công việc đang chạy">
              {health.activeJob ? (
                <span className="tabular-nums">
                  {health.activeJob.kind} · {formatDate(health.activeJob.startedAt)}
                </span>
              ) : (
                'Không có'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Guardrail job">
              {circuitBreaker ? (
                <span className="tabular-nums">
                  {CIRCUIT_BREAKER_LABELS[circuitBreaker.state]} · {duration(circuitBreaker.activeForSeconds)}
                </span>
              ) : (
                'Chờ server cập nhật'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Kết quả gần nhất" span={{ xs: 1, sm: 2, md: 2 }}>
              {health.latestOutcome ? (
                <span className="tabular-nums">
                  {health.latestOutcome.kind} · {health.latestOutcome.status} · {health.latestOutcome.code} ·{' '}
                  {formatDate(health.latestOutcome.occurredAt)}
                </span>
              ) : (
                'Chưa có'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Lỗi liên tiếp">
              <span className="tabular-nums">{health.consecutiveFailureCount}</span>
            </Descriptions.Item>
          </Descriptions>
          <Text type="secondary" className="block text-xs tabular-nums">
            Ngưỡng server: Online ≤ {health.thresholds.onlineWithinSeconds}s · Degraded &lt;{' '}
            {health.thresholds.offlineAfterSeconds}s · Offline ≥ {health.thresholds.offlineAfterSeconds}s · Lỗi liên
            tiếp ≥ {health.thresholds.sustainedFailureCount}
          </Text>
        </div>
      ) : null}
    </SectionCard>
  );
}
