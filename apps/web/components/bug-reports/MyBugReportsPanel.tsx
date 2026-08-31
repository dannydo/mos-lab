'use client';

import React from 'react';
import { Alert, Button, Input, List, Timeline, Typography, message, theme } from 'antd';
import type {
  BugReportCommentCreateResult,
  BugReportNotification,
  BugReportStatus,
  CreateBugReportCommentRequest,
  MyBugReportItem,
  ReviewBugReportRequest,
} from '@mos-lab/shared';
import dayjs from 'dayjs';
import { CheckCircle2, ExternalLink, RotateCcw } from 'lucide-react';
import { AppIcon, SectionCard, StatePanel, StatusTag } from '../ui';
import { BugReportConversation } from './BugReportConversation';

const { Text, Paragraph } = Typography;

const STATUS_LABELS: Record<BugReportStatus, string> = {
  NEW: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  IN_PROGRESS: 'Đang sửa',
  FIXED: 'Chờ bạn duyệt',
  CLOSED: 'Đã đóng',
  REJECTED: 'Từ chối',
  DUPLICATE: 'Trùng lặp',
};

const STATUS_TONES: Record<BugReportStatus, Parameters<typeof StatusTag>[0]['status']> = {
  NEW: 'warning',
  APPROVED: 'processing',
  IN_PROGRESS: 'cyan',
  FIXED: 'success',
  CLOSED: 'default',
  REJECTED: 'error',
  DUPLICATE: 'purple',
};

function exactTime(value: string | null): string {
  return value ? dayjs(value).format('DD/MM/YYYY HH:mm') : 'Chưa có';
}

function elapsedSince(value: string): string {
  const minutes = Math.max(0, dayjs().diff(dayjs(value), 'minute'));
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function durationBetween(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const minutes = Math.max(0, dayjs(end).diff(dayjs(start), 'minute'));
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ ${minutes % 60} phút`;
  return `${Math.floor(hours / 24)} ngày ${hours % 24} giờ`;
}

function trackingItems(report: MyBugReportItem) {
  const timeline = report.timeline;
  return [
    {
      color: 'blue',
      children: (
        <div>
          <Text strong>Báo lỗi</Text>
          <div>
            <Text type="secondary">
              {exactTime(timeline.reportedAt)} · {elapsedSince(timeline.reportedAt)}
            </Text>
          </div>
        </div>
      ),
    },
    {
      color: timeline.approvedAt ? 'blue' : 'gray',
      children: (
        <div>
          <Text strong>Danny duyệt</Text>
          <div>
            <Text type="secondary">
              {exactTime(timeline.approvedAt)}
              {durationBetween(timeline.reportedAt, timeline.approvedAt)
                ? ` · chờ ${durationBetween(timeline.reportedAt, timeline.approvedAt)}`
                : ''}
            </Text>
          </div>
        </div>
      ),
    },
    {
      color: timeline.startedAt ? 'blue' : 'gray',
      children: (
        <div>
          <Text strong>Bắt đầu xử lý</Text>
          <div>
            <Text type="secondary">{exactTime(timeline.startedAt)}</Text>
          </div>
        </div>
      ),
    },
    {
      color: timeline.fixedAt ? 'green' : 'gray',
      children: (
        <div>
          <Text strong>Gửi bản sửa để duyệt</Text>
          <div>
            <Text type="secondary">
              {exactTime(timeline.fixedAt)}
              {durationBetween(timeline.startedAt, timeline.fixedAt)
                ? ` · xử lý ${durationBetween(timeline.startedAt, timeline.fixedAt)}`
                : ''}
            </Text>
          </div>
        </div>
      ),
    },
    {
      color: timeline.closedAt ? 'green' : 'gray',
      children: (
        <div>
          <Text strong>Đóng ticket</Text>
          <div>
            <Text type="secondary">{exactTime(timeline.closedAt)}</Text>
          </div>
        </div>
      ),
    },
  ];
}

interface MyBugReportsPanelProps {
  reports: MyBugReportItem[];
  notifications: BugReportNotification[];
  selectedKey: string | null;
  loading: boolean;
  error: string | null;
  onSelect: (key: string) => void;
  onRefresh: () => Promise<void>;
  onReview: (id: number, request: ReviewBugReportRequest) => Promise<unknown>;
  onComment: (id: number, request: CreateBugReportCommentRequest) => Promise<BugReportCommentCreateResult>;
}

export function MyBugReportsPanel({
  reports,
  notifications,
  selectedKey,
  loading,
  error,
  onSelect,
  onRefresh,
  onReview,
  onComment,
}: MyBugReportsPanelProps) {
  const { token } = theme.useToken();
  const [messageApi, messageContext] = message.useMessage();
  const [reviewNote, setReviewNote] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const selected = reports.find((item) => item.key === selectedKey) ?? reports[0] ?? null;

  React.useEffect(() => setReviewNote(''), [selected?.id]);

  const submitReview = async (decision: ReviewBugReportRequest['decision']) => {
    if (!selected) return;
    if (decision === 'REOPEN' && !reviewNote.trim()) {
      messageApi.error('Hãy mô tả điểm chưa đúng để Agent biết cần sửa gì.');
      return;
    }
    setSaving(true);
    try {
      await onReview(selected.id, { decision, note: reviewNote.trim() || null });
      messageApi.success(
        decision === 'APPROVE' ? 'Cảm ơn bạn đã duyệt. Ticket đã đóng.' : 'Đã gửi lại cho Agent xử lý.'
      );
      setReviewNote('');
    } catch (caught) {
      const responseMessage =
        caught && typeof caught === 'object' && 'response' in caught
          ? (caught as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (caught instanceof Error ? caught.message : 'Không thể gửi phản hồi.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !reports.length) return <StatePanel kind="loading" title="Đang tải lỗi của bạn…" />;
  if (error && !reports.length) {
    return (
      <StatePanel
        kind="error"
        title="Không thể tải trạng thái"
        description={error}
        extra={<Button onClick={() => void onRefresh()}>Thử lại</Button>}
      />
    );
  }
  if (!reports.length)
    return (
      <StatePanel
        kind="empty"
        title="Bạn chưa báo lỗi nào"
        description="Các lỗi đã gửi sẽ xuất hiện ở đây cùng tiến độ xử lý."
      />
    );

  return (
    <div className="space-y-4">
      {messageContext}
      {notifications.some((item) => !item.readAt && item.type === 'BUG_CLARIFICATION_NEEDED') ? (
        <Alert
          type="warning"
          showIcon
          message="AI Agent cần bạn làm rõ một ticket"
          description="Mở ticket bên dưới, trả lời câu hỏi và có thể đính kèm thêm ảnh ngay trong bình luận."
        />
      ) : notifications.some((item) => !item.readAt && item.type === 'BUG_FIXED_REVIEW') ? (
        <Alert
          type="success"
          showIcon
          message="Có bản sửa đang chờ bạn duyệt"
          description="Mở ticket bên dưới để xem tóm tắt, link bản sửa và xác nhận kết quả."
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.4fr)]">
        <SectionCard title={`Lỗi của tôi (${reports.length})`}>
          <List
            size="small"
            dataSource={reports}
            renderItem={(report) => (
              <List.Item style={{ padding: 0 }}>
                <button
                  type="button"
                  aria-current={selected?.id === report.id ? 'true' : undefined}
                  className="relative w-full px-3 py-3 text-left transition-colors"
                  style={{
                    border: 0,
                    borderRadius: token.borderRadiusSM,
                    background: selected?.id === report.id ? token.colorFillTertiary : 'transparent',
                    boxShadow: selected?.id === report.id ? `inset 2px 0 0 ${token.colorPrimary}` : undefined,
                  }}
                  onClick={() => onSelect(report.key)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Text strong>{report.key}</Text>
                      <Text type="secondary" className="shrink-0 text-xs tabular-nums">
                        · {elapsedSince(report.createdAt)}
                      </Text>
                    </div>
                    <StatusTag status={STATUS_TONES[report.status]} label={STATUS_LABELS[report.status]} />
                  </div>
                  <Text ellipsis={{ tooltip: report.description }} type="secondary" className="mt-1 block min-w-0">
                    {report.description.replace(/\s+/g, ' ').trim()}
                  </Text>
                </button>
              </List.Item>
            )}
          />
        </SectionCard>

        {selected ? (
          <div className="space-y-4">
            <SectionCard title={`${selected.key} · Tracking`}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <StatusTag status={STATUS_TONES[selected.status]} label={STATUS_LABELS[selected.status]} />
                <Text type="secondary">{selected.sourcePath}</Text>
              </div>
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{selected.description}</Paragraph>
              <Timeline items={trackingItems(selected)} />
            </SectionCard>

            <SectionCard title={`Trao đổi với AI Agent (${selected.comments.length})`}>
              <BugReportConversation
                reportId={selected.id}
                status={selected.status}
                clarification={selected.clarification}
                comments={selected.comments}
                onSubmit={(request) => onComment(selected.id, request)}
              />
            </SectionCard>

            {selected.resolution ? (
              <SectionCard title="AI đã sửa gì?">
                <div className="space-y-3">
                  <div>
                    <Text strong>Tóm tắt vấn đề</Text>
                    <Paragraph>{selected.resolution.problemSummary}</Paragraph>
                  </div>
                  <div>
                    <Text strong>Nguyên nhân</Text>
                    <Paragraph>{selected.resolution.rootCause}</Paragraph>
                  </div>
                  <div>
                    <Text strong>Cách sửa</Text>
                    <Paragraph>{selected.resolution.solutionSummary}</Paragraph>
                  </div>
                  <div>
                    <Text strong>Đã kiểm thử</Text>
                    <Paragraph>{selected.resolution.verificationSummary}</Paragraph>
                  </div>
                  {selected.resolution.releaseUrl ? (
                    <Button
                      href={selected.resolution.releaseUrl}
                      target="_blank"
                      icon={<AppIcon icon={ExternalLink} size="sm" />}
                    >
                      Mở bản đã sửa
                    </Button>
                  ) : null}
                </div>
              </SectionCard>
            ) : null}

            {selected.canReview ? (
              <SectionCard title="Bạn xác nhận giúp mOS">
                <Input.TextArea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Nếu chưa đúng, hãy ghi ngắn gọn điểm còn lỗi…"
                  maxLength={2000}
                  autoSize={{ minRows: 2, maxRows: 6 }}
                  showCount
                />
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    loading={saving}
                    icon={<AppIcon icon={RotateCcw} size="sm" />}
                    onClick={() => void submitReview('REOPEN')}
                  >
                    Chưa đúng, sửa tiếp
                  </Button>
                  <Button
                    type="primary"
                    loading={saving}
                    icon={<AppIcon icon={CheckCircle2} size="sm" />}
                    onClick={() => void submitReview('APPROVE')}
                  >
                    Đã đúng, đóng ticket
                  </Button>
                </div>
              </SectionCard>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default MyBugReportsPanel;
