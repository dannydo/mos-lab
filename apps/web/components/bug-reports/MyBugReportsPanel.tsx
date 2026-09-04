'use client';

import React from 'react';
import { Alert, Button, Input, Typography, message, theme } from 'antd';
import type {
  BugReportCommentCreateResult,
  BugReportNotification,
  BugReportReporterState,
  CreateBugReportCommentRequest,
  MyBugReportItem,
  ReviewBugReportRequest,
} from '@mos-lab/shared';
import dayjs from 'dayjs';
import {
  CheckCircle2,
  ChevronRight,
  CircleDotDashed,
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  ListTree,
  MessageCircleQuestion,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppIcon, StatePanel, StatusTag } from '../ui';
import { BugReportConversation } from './BugReportConversation';
import { BugReportAttachmentPreview } from './BugReportAttachmentPreview';

const { Text } = Typography;

type ReporterTone = 'attention' | 'working' | 'done' | 'quiet';

const REPORTER_STATE_TONES: Record<BugReportReporterState, Parameters<typeof StatusTag>[0]['status']> = {
  RECEIVED: 'processing',
  REVIEWING: 'processing',
  IN_PROGRESS: 'cyan',
  WAITING_REPORTER: 'warning',
  READY_FOR_REVIEW: 'success',
  COMPLETED: 'success',
  NOT_PROCEEDING: 'default',
};

const REPORTER_STATE_ICONS: Record<BugReportReporterState, LucideIcon> = {
  RECEIVED: CircleDotDashed,
  REVIEWING: CircleDotDashed,
  IN_PROGRESS: Sparkles,
  WAITING_REPORTER: MessageCircleQuestion,
  READY_FOR_REVIEW: CheckCircle2,
  COMPLETED: CheckCircle2,
  NOT_PROCEEDING: CircleDotDashed,
};

const REPORTER_GROUPS: Array<{
  id: string;
  label: string;
  helper: string;
  tone: ReporterTone;
  states: BugReportReporterState[];
}> = [
  {
    id: 'needs-attention',
    label: 'Cần bạn chú ý',
    helper: 'Có việc cần bạn quyết định hoặc trả lời',
    tone: 'attention',
    states: ['WAITING_REPORTER', 'READY_FOR_REVIEW'],
  },
  {
    id: 'in-progress',
    label: 'mOS đang xử lý',
    helper: 'Bạn chưa cần làm gì lúc này',
    tone: 'working',
    states: ['RECEIVED', 'REVIEWING', 'IN_PROGRESS'],
  },
  {
    id: 'completed',
    label: 'Đã hoàn tất',
    helper: 'Những yêu cầu đã có kết quả',
    tone: 'done',
    states: ['COMPLETED', 'NOT_PROCEEDING'],
  },
];

function elapsedSince(value: string): string {
  const minutes = Math.max(0, dayjs().diff(dayjs(value), 'minute'));
  if (minutes < 1) return 'vừa cập nhật';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function toneForState(state: BugReportReporterState): ReporterTone {
  if (['WAITING_REPORTER', 'READY_FOR_REVIEW'].includes(state)) return 'attention';
  if (['COMPLETED', 'NOT_PROCEEDING'].includes(state)) return 'done';
  return 'working';
}

function requestTypeLabel(report: MyBugReportItem): string {
  return report.requestType === 'FEATURE' ? 'Cải thiện' : 'Báo lỗi';
}

interface MyBugReportsPanelProps {
  reports: MyBugReportItem[];
  notifications: BugReportNotification[];
  selectedKey: string | null;
  loading: boolean;
  error: string | null;
  canViewTechnicalHistory?: boolean;
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
  canViewTechnicalHistory = false,
  onSelect,
  onRefresh,
  onReview,
  onComment,
}: MyBugReportsPanelProps) {
  const { token } = theme.useToken();
  const [messageApi, messageContext] = message.useMessage();
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [technicalHistoryOpen, setTechnicalHistoryOpen] = React.useState(false);

  const visualForTone = React.useCallback(
    (tone: ReporterTone) => {
      if (tone === 'attention')
        return { accent: token.colorWarning, border: token.colorWarningBorder, background: token.colorWarningBg };
      if (tone === 'done')
        return { accent: token.colorSuccess, border: token.colorSuccessBorder, background: token.colorSuccessBg };
      if (tone === 'quiet')
        return {
          accent: token.colorTextTertiary,
          border: token.colorBorderSecondary,
          background: token.colorFillQuaternary,
        };
      return { accent: token.colorInfo, border: token.colorInfoBorder, background: token.colorInfoBg };
    },
    [token]
  );

  const submitReview = async (decision: ReviewBugReportRequest['decision'], reopenIntent?: 'UNCHANGED') => {
    const selected = reports.find((item) => item.key === selectedKey) ?? reports[0];
    if (!selected) return;
    setSaving(true);
    try {
      await onReview(selected.id, reopenIntent ? { decision, reopenIntent } : { decision });
      messageApi.success(
        decision === 'APPROVE' ? 'Cảm ơn bạn đã kiểm tra kết quả.' : 'mOS sẽ kiểm tra lại từ thông tin đã có.'
      );
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
  if (error && !reports.length)
    return (
      <StatePanel
        kind="error"
        title="Không thể tải yêu cầu"
        description={error}
        extra={<Button onClick={() => void onRefresh()}>Thử lại</Button>}
      />
    );
  if (!reports.length)
    return (
      <StatePanel
        kind="empty"
        title="Bạn chưa gửi yêu cầu nào"
        description="Yêu cầu bạn gửi sẽ xuất hiện ở đây cùng tình trạng và việc cần làm tiếp theo."
      />
    );

  const needsReply = notifications.some((item) => !item.readAt && item.type.endsWith('CLARIFICATION_NEEDED'));
  const hasResult = notifications.some(
    (item) => !item.readAt && ['BUG_FIXED_REVIEW', 'FEATURE_IMPLEMENTED_REVIEW'].includes(item.type)
  );
  const normalizedSearch = search.trim().toLocaleLowerCase('vi');
  const matchingReports = normalizedSearch
    ? reports.filter((report) =>
        `${report.key} ${report.title} ${report.description}`.toLocaleLowerCase('vi').includes(normalizedSearch)
      )
    : reports;
  const selected =
    matchingReports.find((report) => report.key === selectedKey) ?? matchingReports[0] ?? reports[0] ?? null;
  const selectedVisual = visualForTone(selected ? toneForState(selected.reporterExperience.state) : 'quiet');
  const groupedReports = REPORTER_GROUPS.map((group) => ({
    ...group,
    reports: matchingReports.filter((report) => group.states.includes(report.reporterExperience.state)),
  }));
  const recentUpdates = selected?.reporterExperience.updates.slice(0, 2) ?? [];
  const selectedEvidence = selected?.evidenceAttachments ?? [];

  return (
    <div className="space-y-3">
      {messageContext}
      {needsReply ? (
        <Alert
          type="warning"
          showIcon
          message="Có yêu cầu đang cần bạn trả lời"
          description="mOS chỉ hỏi một điều cần thiết để tiếp tục xử lý."
        />
      ) : null}
      {!needsReply && hasResult ? (
        <Alert
          type="success"
          showIcon
          message="Có kết quả đang chờ bạn kiểm tra"
          description="Mở yêu cầu để kiểm tra và cho mOS biết kết quả có đúng không."
        />
      ) : null}

      <div
        className="reporter-request-layout grid grid-cols-1 overflow-hidden rounded-2xl border"
        style={{ borderColor: token.colorBorderSecondary, background: token.colorBgContainer }}
      >
        <section
          className="reporter-request-list border-b"
          style={{ borderColor: token.colorBorderSecondary }}
          aria-label="Danh sách yêu cầu của tôi"
        >
          <div className="px-5 pb-3 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Text strong className="text-lg">
                  Yêu cầu của tôi
                </Text>
                <Text type="secondary" className="mt-0.5 block text-sm">
                  Chỉ cần nói mOS cần giúp gì
                </Text>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-xs"
                style={{ background: token.colorFillQuaternary, color: token.colorTextSecondary }}
              >
                {reports.length}
              </span>
            </div>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              allowClear
              prefix={<AppIcon icon={Search} size="sm" />}
              placeholder="Tìm yêu cầu"
              aria-label="Tìm yêu cầu"
              className="mt-4"
            />
          </div>

          <div className="max-h-[612px] space-y-5 overflow-y-auto px-3 pb-5" aria-label="Các nhóm yêu cầu">
            {groupedReports
              .filter((group) => group.reports.length > 0)
              .map((group) => {
                const groupVisual = visualForTone(group.tone);
                return (
                  <div key={group.id}>
                    <div className="mb-2 flex items-start justify-between gap-2 px-2">
                      <div>
                        <Text strong className="text-sm" style={{ color: groupVisual.accent }}>
                          {group.label}
                        </Text>
                        <Text type="secondary" className="mt-0.5 block text-xs">
                          {group.helper}
                        </Text>
                      </div>
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[11px]"
                        style={{ background: groupVisual.background, color: groupVisual.accent }}
                      >
                        {group.reports.length}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {group.reports.map((report) => {
                        const active = selected?.id === report.id;
                        const visual = visualForTone(toneForState(report.reporterExperience.state));
                        return (
                          <button
                            key={report.id}
                            type="button"
                            aria-current={active ? 'true' : undefined}
                            className="group w-full rounded-xl border px-3 py-2.5 text-left transition-all hover:-translate-y-px"
                            style={{
                              borderColor: active ? visual.border : 'transparent',
                              background: active ? visual.background : token.colorFillQuaternary,
                              boxShadow: active ? `inset 3px 0 0 ${visual.accent}` : undefined,
                            }}
                            onClick={() => onSelect(report.key)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex min-w-0 items-center gap-1.5">
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ background: visual.accent }}
                                />
                                <Text strong className="truncate text-xs">
                                  {report.key}
                                </Text>
                              </span>
                              <Text type="secondary" className="shrink-0 text-[11px]">
                                {elapsedSince(report.updatedAt)}
                              </Text>
                            </div>
                            <Text ellipsis={{ tooltip: report.title }} className="mt-1 block text-sm font-medium">
                              {report.title}
                            </Text>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <Text
                                type="secondary"
                                ellipsis={{ tooltip: report.reporterExperience.summary }}
                                className="min-w-0 text-xs"
                              >
                                {report.reporterExperience.summary}
                              </Text>
                              <span className="flex shrink-0 items-center gap-1">
                                {report.evidenceAttachments.length ? (
                                  <span
                                    className="inline-flex items-center gap-0.5 text-[11px]"
                                    style={{ color: token.colorTextTertiary }}
                                    title={`${report.evidenceAttachments.length} ảnh bạn đã gửi`}
                                  >
                                    <AppIcon icon={ImageIcon} size={12} />
                                    {report.evidenceAttachments.length}
                                  </span>
                                ) : null}
                                <AppIcon icon={ChevronRight} size="sm" style={{ color: token.colorTextTertiary }} />
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            {!matchingReports.length ? (
              <Text type="secondary" className="block px-2 py-8 text-center text-sm">
                Không tìm thấy yêu cầu phù hợp.
              </Text>
            ) : null}
          </div>
        </section>

        {selected ? (
          <section className="min-w-0" aria-label={`Chi tiết ${selected.key}`}>
            <header
              className="border-b px-5 py-5 sm:px-7"
              style={{ borderColor: selectedVisual.border, background: selectedVisual.background }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: token.colorBgContainer, color: selectedVisual.accent }}
                >
                  <AppIcon icon={REPORTER_STATE_ICONS[selected.reporterExperience.state]} size="md" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-2">
                      <Text strong>{selected.key}</Text>
                      <Text type="secondary" className="text-xs">
                        {requestTypeLabel(selected)}
                      </Text>
                    </span>
                    <StatusTag
                      status={REPORTER_STATE_TONES[selected.reporterExperience.state]}
                      icon={<AppIcon icon={REPORTER_STATE_ICONS[selected.reporterExperience.state]} size="sm" />}
                      label={selected.reporterExperience.label}
                    />
                  </div>
                  <Text strong className="mt-1.5 block text-lg leading-snug">
                    {selected.title}
                  </Text>
                  <Text type="secondary" className="mt-1 block text-sm">
                    Cập nhật {elapsedSince(selected.updatedAt)}
                  </Text>
                </div>
              </div>
            </header>

            <div className="space-y-3 px-5 py-5 sm:px-7">
              <InfoBlock
                icon={FileText}
                title={selected.requestType === 'FEATURE' ? 'Điều bạn muốn' : 'Điều bạn đã báo'}
              >
                {selected.description}
              </InfoBlock>
              {selectedEvidence.length ? (
                <InfoBlock icon={ImageIcon} title="Ảnh bạn đã gửi">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedEvidence.slice(0, 3).map((attachment) => (
                      <BugReportAttachmentPreview
                        key={attachment.id}
                        reportId={selected.id}
                        attachment={attachment}
                        thumbnail
                      />
                    ))}
                    {selectedEvidence.length > 3 ? (
                      <span
                        className="inline-flex h-[72px] min-w-[72px] items-center justify-center rounded-lg px-2 text-sm font-semibold"
                        style={{ background: token.colorFillQuaternary, color: token.colorTextSecondary }}
                      >
                        +{selectedEvidence.length - 3}
                      </span>
                    ) : null}
                  </div>
                  <Text type="secondary" className="mt-2 block text-xs">
                    Bấm vào ảnh để xem rõ hơn.
                  </Text>
                </InfoBlock>
              ) : null}
              <InfoBlock
                icon={Sparkles}
                title={
                  ['COMPLETED', 'NOT_PROCEEDING'].includes(selected.reporterExperience.state)
                    ? 'mOS đã làm'
                    : 'mOS đang làm gì'
                }
                accent={selectedVisual.accent}
                background={selectedVisual.background}
              >
                {selected.reporterExperience.summary}
                {recentUpdates.length ? (
                  <div className="mt-3 space-y-1.5 border-t pt-3" style={{ borderColor: selectedVisual.border }}>
                    {recentUpdates.map((update) => (
                      <div
                        key={`${update.label}-${update.occurredAt}`}
                        className="flex items-start justify-between gap-3 text-xs"
                      >
                        <span>{update.label}</span>
                        <span className="shrink-0" style={{ color: token.colorTextTertiary }}>
                          {elapsedSince(update.occurredAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </InfoBlock>
              {selected.resolution ? (
                <InfoBlock
                  icon={CheckCircle2}
                  title="Kết quả"
                  accent={token.colorSuccess}
                  background={token.colorSuccessBg}
                >
                  {selected.resolution.solutionSummary}
                  {selected.resolution.releaseUrl ? (
                    <Button
                      className="mt-3"
                      href={selected.resolution.releaseUrl}
                      target="_blank"
                      icon={<AppIcon icon={ExternalLink} size="sm" />}
                    >
                      Mở kết quả
                    </Button>
                  ) : null}
                </InfoBlock>
              ) : null}

              <section
                className="rounded-xl border p-4"
                style={{ borderColor: selectedVisual.border, background: selectedVisual.background }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5" style={{ color: selectedVisual.accent }}>
                    <AppIcon icon={Clock3} size="sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Text type="secondary" className="text-xs font-semibold uppercase tracking-wide">
                      Việc tiếp theo
                    </Text>
                    <Text strong className="mt-0.5 block">
                      {selected.reporterExperience.nextAction.label}
                    </Text>
                    <Text type="secondary" className="mt-0.5 block text-sm">
                      {selected.reporterExperience.nextAction.detail}
                    </Text>
                  </div>
                </div>
                {selected.clarification.status === 'WAITING_REPORTER' ? (
                  <div className="mt-4 border-t pt-4" style={{ borderColor: selectedVisual.border }}>
                    <BugReportConversation
                      reportId={selected.id}
                      requestType={selected.requestType}
                      status={selected.status}
                      clarification={selected.clarification}
                      comments={selected.comments}
                      reporterMode
                      onSubmit={(request) => onComment(selected.id, request)}
                    />
                  </div>
                ) : null}
                {selected.canReview || selected.canReopenUnchanged ? (
                  <div
                    className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"
                    style={{ borderColor: selectedVisual.border }}
                  >
                    <Text type="secondary" className="max-w-md text-xs">
                      Nếu vẫn chưa đúng, mOS sẽ dùng lại thông tin bạn đã gửi trước đó.
                    </Text>
                    <div className="flex flex-wrap gap-2">
                      {selected.canReopenUnchanged ? (
                        <Button
                          loading={saving}
                          icon={<AppIcon icon={RotateCcw} size="sm" />}
                          onClick={() => void submitReview('REOPEN', 'UNCHANGED')}
                        >
                          Vẫn như cũ
                        </Button>
                      ) : null}
                      {selected.canReview ? (
                        <Button
                          type="primary"
                          loading={saving}
                          icon={<AppIcon icon={CheckCircle2} size="sm" />}
                          onClick={() => void submitReview('APPROVE')}
                        >
                          Đã đúng
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </section>

              {canViewTechnicalHistory ? (
                <details
                  open={technicalHistoryOpen}
                  onToggle={(event) => setTechnicalHistoryOpen(event.currentTarget.open)}
                  className="rounded-xl border"
                  style={{ borderColor: token.colorBorderSecondary }}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <AppIcon icon={ListTree} size="sm" />
                      <Text strong className="text-sm">
                        Xem lịch sử xử lý
                      </Text>
                    </span>
                    <Text type="secondary" className="text-xs">
                      Dành cho dev / AI Agent
                    </Text>
                  </summary>
                  <div className="border-t px-4 py-3" style={{ borderColor: token.colorBorderSecondary }}>
                    <Text type="secondary" className="block text-sm">
                      Lịch sử kỹ thuật, audit và workflow nội bộ được xem trong mOS Inbox để không làm rối màn hình
                      người báo.
                    </Text>
                    <Button
                      className="mt-3"
                      size="small"
                      href={`/dashboard/bug-reports?selected=${encodeURIComponent(selected.key)}`}
                      icon={<AppIcon icon={ExternalLink} size="sm" />}
                    >
                      Mở chi tiết xử lý
                    </Button>
                  </div>
                </details>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function InfoBlock({
  icon,
  title,
  accent,
  background,
  children,
}: {
  icon: LucideIcon;
  title: string;
  accent?: string;
  background?: string;
  children: React.ReactNode;
}) {
  const { token } = theme.useToken();
  return (
    <section
      className="rounded-xl border p-4"
      style={{ borderColor: accent ? undefined : token.colorBorderSecondary, background }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5" style={{ color: accent ?? token.colorTextTertiary }}>
          <AppIcon icon={icon} size="sm" />
        </div>
        <div className="min-w-0 flex-1">
          <Text type="secondary" className="text-xs font-semibold uppercase tracking-wide">
            {title}
          </Text>
          <div className="mt-1 whitespace-pre-wrap text-sm leading-6">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default MyBugReportsPanel;
