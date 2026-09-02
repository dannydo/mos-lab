'use client';

import React from 'react';
import { Alert, Button, Descriptions, Input, List, Timeline, Typography, message, theme } from 'antd';
import type {
  BugReportCommentCreateResult,
  BugReportNotification,
  BugReportRequestType,
  BugReportStatus,
  CreateBugReportCommentRequest,
  MyBugReportItem,
  ReviewBugReportRequest,
} from '@mos-lab/shared';
import dayjs from 'dayjs';
import { CheckCircle2, ExternalLink, RotateCcw } from 'lucide-react';
import { AppIcon, SectionCard, StatePanel, StatusTag } from '../ui';
import { BugReportConversation } from './BugReportConversation';
import { BugReportWorkflowProgress } from './BugReportWorkflowProgress';

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

const FEATURE_STATUS_LABELS: Record<BugReportStatus, string> = {
  NEW: 'Chờ Danny duyệt',
  APPROVED: 'Đã duyệt triển khai',
  IN_PROGRESS: 'Đang triển khai',
  FIXED: 'Chờ nghiệm thu',
  CLOSED: 'Đã hoàn tất',
  REJECTED: 'Không duyệt',
  DUPLICATE: 'Trùng yêu cầu',
};

const FEATURE_AUDIENCE_LABELS = {
  SELF: 'Cá nhân người yêu cầu',
  TEAM: 'Đội / bộ phận',
  ALL_STAFF: 'Tất cả nhân viên',
  CUSTOMER: 'Khách hàng',
} as const;

function requestTypeLabel(requestType: BugReportRequestType): string {
  return requestType === 'FEATURE' ? 'Chức năng' : 'Báo lỗi';
}

function statusLabel(status: BugReportStatus, requestType: BugReportRequestType): string {
  return requestType === 'FEATURE' ? FEATURE_STATUS_LABELS[status] : STATUS_LABELS[status];
}

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
  const isFeature = report.requestType === 'FEATURE';
  return [
    {
      color: 'blue',
      children: (
        <div>
          <Text strong>{isFeature ? 'Gửi yêu cầu chức năng' : 'Báo lỗi'}</Text>
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
          <Text strong>{isFeature ? 'Danny quyết định đưa vào triển khai' : 'Danny duyệt'}</Text>
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
          <Text strong>{isFeature ? 'Bắt đầu triển khai' : 'Bắt đầu xử lý'}</Text>
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
          <Text strong>{isFeature ? 'Gửi bản triển khai để nghiệm thu' : 'Gửi bản sửa để duyệt'}</Text>
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
          <Text strong>{isFeature ? 'Hoàn tất yêu cầu' : 'Đóng ticket'}</Text>
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
        decision === 'APPROVE'
          ? selected.requestType === 'FEATURE'
            ? 'Cảm ơn bạn đã nghiệm thu. Yêu cầu đã hoàn tất.'
            : 'Cảm ơn bạn đã duyệt. Ticket đã đóng.'
          : 'Đã gửi lại cho Agent xử lý.'
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

  if (loading && !reports.length) return <StatePanel kind="loading" title="Đang tải yêu cầu của bạn…" />;
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
        title="Bạn chưa gửi yêu cầu nào"
        description="Báo lỗi và yêu cầu chức năng sẽ xuất hiện ở đây cùng tiến độ xử lý."
      />
    );

  return (
    <div className="space-y-4">
      {messageContext}
      {notifications.some((item) => !item.readAt && item.type.endsWith('CLARIFICATION_NEEDED')) ? (
        <Alert
          type="warning"
          showIcon
          message="AI Agent cần bạn làm rõ một yêu cầu"
          description="Mở yêu cầu bên dưới, trả lời câu hỏi và có thể đính kèm thêm ảnh ngay trong bình luận."
        />
      ) : notifications.some(
          (item) => !item.readAt && ['BUG_FIXED_REVIEW', 'FEATURE_IMPLEMENTED_REVIEW'].includes(item.type)
        ) ? (
        <Alert
          type="success"
          showIcon
          message="Có kết quả đang chờ bạn nghiệm thu"
          description="Mở yêu cầu bên dưới để xem tóm tắt, link kết quả và xác nhận."
        />
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.4fr)]">
        <SectionCard title={`Yêu cầu của tôi (${reports.length})`}>
          <List
            size="small"
            dataSource={reports}
            renderItem={(report) => (
              <List.Item style={{ padding: 0 }}>
                <button
                  type="button"
                  aria-current={selected?.id === report.id ? 'true' : undefined}
                  className="relative w-full px-3 py-2.5 text-left transition-colors"
                  style={{
                    border: 0,
                    borderRadius: token.borderRadiusSM,
                    background: selected?.id === report.id ? token.colorFillTertiary : 'transparent',
                    boxShadow: selected?.id === report.id ? `inset 2px 0 0 ${token.colorPrimary}` : undefined,
                  }}
                  onClick={() => onSelect(report.key)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Text strong ellipsis={{ tooltip: report.key }} className="min-w-0 truncate">
                        {report.key}
                      </Text>
                      <Text type="secondary" className="shrink-0 text-xs tabular-nums">
                        · {elapsedSince(report.createdAt)}
                      </Text>
                    </div>
                    <StatusTag
                      status={STATUS_TONES[report.status]}
                      label={statusLabel(report.status, report.requestType)}
                      className="shrink-0"
                    />
                  </div>
                  <div className="mt-1.5">
                    <BugReportWorkflowProgress report={report} compact />
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
                <StatusTag
                  status={selected.requestType === 'FEATURE' ? 'purple' : 'orange'}
                  label={requestTypeLabel(selected.requestType)}
                />
                <StatusTag
                  status={STATUS_TONES[selected.status]}
                  label={statusLabel(selected.status, selected.requestType)}
                />
                <Text type="secondary">{selected.sourcePath}</Text>
              </div>
              <div className="mb-4">
                <BugReportWorkflowProgress report={selected} />
              </div>
              <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{selected.description}</Paragraph>
              {selected.featureRequest ? (
                <Descriptions size="small" column={1} bordered className="mb-4">
                  <Descriptions.Item label="Vì sao cần">{selected.featureRequest.reason}</Descriptions.Item>
                  <Descriptions.Item label="Người sử dụng">
                    {FEATURE_AUDIENCE_LABELS[selected.featureRequest.audience]}
                  </Descriptions.Item>
                  <Descriptions.Item label="Kết quả mong muốn">
                    {selected.featureRequest.desiredOutcome || 'AI Agent sẽ hỏi thêm nếu cần.'}
                  </Descriptions.Item>
                </Descriptions>
              ) : null}
              <Timeline items={trackingItems(selected)} />
            </SectionCard>

            <SectionCard title={`Trao đổi với AI Agent (${selected.comments.length})`}>
              <BugReportConversation
                reportId={selected.id}
                requestType={selected.requestType}
                status={selected.status}
                clarification={selected.clarification}
                comments={selected.comments}
                onSubmit={(request) => onComment(selected.id, request)}
              />
            </SectionCard>

            {selected.resolution ? (
              <SectionCard title={selected.requestType === 'FEATURE' ? 'AI đã triển khai gì?' : 'AI đã sửa gì?'}>
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
              <SectionCard
                title={selected.requestType === 'FEATURE' ? 'Bạn nghiệm thu giúp mOS' : 'Bạn xác nhận giúp mOS'}
              >
                <Input.TextArea
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder={
                    selected.requestType === 'FEATURE'
                      ? 'Nếu chưa đúng nhu cầu, hãy ghi ngắn gọn điểm cần điều chỉnh…'
                      : 'Nếu chưa đúng, hãy ghi ngắn gọn điểm còn lỗi…'
                  }
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
                    {selected.requestType === 'FEATURE' ? 'Chưa đúng, điều chỉnh tiếp' : 'Chưa đúng, sửa tiếp'}
                  </Button>
                  <Button
                    type="primary"
                    loading={saving}
                    icon={<AppIcon icon={CheckCircle2} size="sm" />}
                    onClick={() => void submitReview('APPROVE')}
                  >
                    {selected.requestType === 'FEATURE' ? 'Đạt yêu cầu, hoàn tất' : 'Đã đúng, đóng ticket'}
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
