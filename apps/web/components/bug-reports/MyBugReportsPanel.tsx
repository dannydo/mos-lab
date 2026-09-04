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
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDotDashed,
  ExternalLink,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { AppIcon, StatePanel, StatusTag } from '../ui';
import { BugReportConversation } from './BugReportConversation';

const { Text, Paragraph } = Typography;

const REPORTER_STATE_TONES: Record<BugReportReporterState, Parameters<typeof StatusTag>[0]['status']> = {
  RECEIVED: 'processing',
  REVIEWING: 'processing',
  IN_PROGRESS: 'cyan',
  WAITING_REPORTER: 'warning',
  READY_FOR_REVIEW: 'success',
  COMPLETED: 'default',
  NOT_PROCEEDING: 'default',
};

const REPORTER_STATE_ICONS: Record<BugReportReporterState, LucideIcon> = {
  RECEIVED: CircleDotDashed,
  REVIEWING: CircleDotDashed,
  IN_PROGRESS: Sparkles,
  WAITING_REPORTER: CircleDotDashed,
  READY_FOR_REVIEW: CheckCircle2,
  COMPLETED: CheckCircle2,
  NOT_PROCEEDING: CircleDotDashed,
};

const PROGRESS_LABELS = ['Đã nhận', 'Đang xử lý', 'Mời bạn kiểm tra'];

const REPORTER_GROUPS: Array<{ id: string; label: string; states: BugReportReporterState[] }> = [
  { id: 'needs-reply', label: 'Cần bạn trả lời', states: ['WAITING_REPORTER'] },
  { id: 'ready-for-review', label: 'Mời bạn kiểm tra', states: ['READY_FOR_REVIEW'] },
  { id: 'in-flight', label: 'Đang xử lý', states: ['RECEIVED', 'REVIEWING', 'IN_PROGRESS'] },
  { id: 'completed', label: 'Đã hoàn tất', states: ['COMPLETED', 'NOT_PROCEEDING'] },
];

function elapsedSince(value: string): string {
  const minutes = Math.max(0, dayjs().diff(dayjs(value), 'minute'));
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

function progressStep(report: MyBugReportItem, index: number): 'finish' | 'process' | 'wait' {
  const state = report.reporterExperience.state;
  if (index === 0) return 'finish';
  if (index === 1) {
    if (['IN_PROGRESS', 'READY_FOR_REVIEW', 'COMPLETED'].includes(state)) return 'finish';
    if (['REVIEWING', 'WAITING_REPORTER'].includes(state)) return 'process';
    return 'wait';
  }
  if (['READY_FOR_REVIEW', 'COMPLETED'].includes(state)) return 'finish';
  return state === 'WAITING_REPORTER' ? 'process' : 'wait';
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
  const [saving, setSaving] = React.useState(false);
  const [search, setSearch] = React.useState('');
  let selected = reports.find((item) => item.key === selectedKey) ?? reports[0] ?? null;

  const submitReview = async (decision: ReviewBugReportRequest['decision'], reopenIntent?: 'UNCHANGED') => {
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
        description="Yêu cầu bạn gửi sẽ xuất hiện ở đây cùng tình trạng dễ theo dõi."
      />
    );

  const needsReply = notifications.some((item) => !item.readAt && item.type.endsWith('CLARIFICATION_NEEDED'));
  const hasResult = notifications.some(
    (item) => !item.readAt && ['BUG_FIXED_REVIEW', 'FEATURE_IMPLEMENTED_REVIEW'].includes(item.type)
  );
  const panelStyle = { borderColor: token.colorBorderSecondary, background: token.colorBgContainer };
  const stateVisual = (state: BugReportReporterState) => {
    if (state === 'WAITING_REPORTER')
      return { accent: token.colorWarning, border: token.colorWarningBorder, background: token.colorWarningBg };
    if (state === 'READY_FOR_REVIEW' || state === 'COMPLETED')
      return { accent: token.colorSuccess, border: token.colorSuccessBorder, background: token.colorSuccessBg };
    if (state === 'IN_PROGRESS')
      return { accent: token.colorInfo, border: token.colorInfoBorder, background: token.colorInfoBg };
    if (state === 'NOT_PROCEEDING')
      return {
        accent: token.colorTextTertiary,
        border: token.colorBorderSecondary,
        background: token.colorFillQuaternary,
      };
    return { accent: token.colorPrimary, border: token.colorPrimaryBorder, background: token.colorPrimaryBg };
  };
  const normalizedSearch = search.trim().toLocaleLowerCase('vi');
  const matchingReports = normalizedSearch
    ? reports.filter((report) =>
        `${report.key} ${report.title} ${report.description}`.toLocaleLowerCase('vi').includes(normalizedSearch)
      )
    : reports;
  const groupedReports = REPORTER_GROUPS.map((group) => ({
    ...group,
    reports: matchingReports.filter((report) => group.states.includes(report.reporterExperience.state)),
  }));
  selected = matchingReports.find((report) => report.key === selectedKey) ?? matchingReports[0] ?? selected;

  return (
    <div className="space-y-4">
      {messageContext}
      {needsReply ? (
        <Alert
          type="warning"
          showIcon
          message="Có một yêu cầu cần bạn trả lời"
          description="Mở yêu cầu để xem câu hỏi ngắn mà mOS đang cần."
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

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(238px,0.7fr)_minmax(0,1.3fr)]">
        <section
          className="overflow-hidden rounded-2xl border"
          style={panelStyle}
          aria-label="Danh sách yêu cầu của tôi"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <Text strong className="text-base">
                Yêu cầu của tôi
              </Text>
              <Text type="secondary" className="ml-2 text-xs">
                {reports.length} yêu cầu
              </Text>
            </div>
          </div>
          <div className="px-3 pb-2">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              allowClear
              prefix={<AppIcon icon={Search} size="sm" />}
              placeholder="Tìm yêu cầu"
              aria-label="Tìm yêu cầu"
            />
          </div>
          <div className="max-h-[430px] space-y-3 overflow-y-auto px-2 pb-3 pr-2" aria-label="Các nhóm yêu cầu">
            {groupedReports
              .filter((group) => group.reports.length > 0)
              .map((group) => (
                <div key={group.id}>
                  <div className="flex items-center justify-between px-2 pb-1.5">
                    <Text strong className="text-xs">
                      {group.label}
                    </Text>
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[11px]"
                      style={{ background: token.colorFillQuaternary, color: token.colorTextSecondary }}
                    >
                      {group.reports.length}
                    </span>
                  </div>
                  {group.reports.length ? (
                    <div className="space-y-1">
                      {group.reports.map((report) => {
                        const active = selected?.id === report.id;
                        const visual = stateVisual(report.reporterExperience.state);
                        return (
                          <button
                            key={report.id}
                            type="button"
                            aria-current={active ? 'true' : undefined}
                            className="group relative w-full rounded-xl px-3 py-2.5 text-left transition-all"
                            style={{
                              background: active ? visual.background : 'transparent',
                              boxShadow: active ? `inset 3px 0 0 ${visual.accent}` : undefined,
                            }}
                            onClick={() => onSelect(report.key)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Text strong className="truncate">
                                {report.key}
                              </Text>
                              <StatusTag
                                status={REPORTER_STATE_TONES[report.reporterExperience.state]}
                                icon={
                                  <AppIcon icon={REPORTER_STATE_ICONS[report.reporterExperience.state]} size="sm" />
                                }
                                label={report.reporterExperience.label}
                                className="shrink-0"
                              />
                            </div>
                            <Text
                              ellipsis={{ tooltip: report.description }}
                              type="secondary"
                              className="mt-1 block min-w-0 text-xs"
                            >
                              {report.description.replace(/\s+/g, ' ').trim()}
                            </Text>
                            <div
                              className="mt-1.5 flex items-center justify-between text-xs"
                              style={{ color: token.colorTextTertiary }}
                            >
                              <span>{elapsedSince(report.updatedAt)}</span>
                              <AppIcon icon={ChevronRight} size="sm" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
            {!matchingReports.length ? (
              <Text type="secondary" className="block px-2 py-4 text-center text-sm">
                Không tìm thấy yêu cầu phù hợp.
              </Text>
            ) : null}
          </div>
        </section>

        {selected ? (
          <section
            className="overflow-hidden rounded-2xl border"
            style={{
              ...panelStyle,
              borderColor: stateVisual(selected.reporterExperience.state).border,
              boxShadow: `0 14px 36px ${token.colorFillQuaternary}`,
            }}
            aria-label={`Chi tiết ${selected.key}`}
          >
            <div
              className="border-b px-4 py-4 sm:px-5"
              style={{
                borderColor: stateVisual(selected.reporterExperience.state).border,
                background: stateVisual(selected.reporterExperience.state).background,
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: token.colorBgContainer,
                    color: stateVisual(selected.reporterExperience.state).accent,
                  }}
                >
                  <AppIcon icon={REPORTER_STATE_ICONS[selected.reporterExperience.state]} size="md" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text strong className="text-base">
                      {selected.key}
                    </Text>
                    <StatusTag
                      status={REPORTER_STATE_TONES[selected.reporterExperience.state]}
                      icon={<AppIcon icon={REPORTER_STATE_ICONS[selected.reporterExperience.state]} size="sm" />}
                      label={selected.reporterExperience.label}
                    />
                  </div>
                  <Text type="secondary" className="mt-1 block">
                    {selected.description}
                  </Text>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(230px,0.75fr)]">
                <div>
                  <Text type="secondary" className="text-xs font-medium uppercase tracking-wide">
                    mOS đang làm gì
                  </Text>
                  <Paragraph className="mb-0 mt-1">{selected.reporterExperience.summary}</Paragraph>
                </div>
                <div
                  className="rounded-xl border px-3 py-2.5"
                  style={{
                    borderColor: stateVisual(selected.reporterExperience.state).border,
                    background: stateVisual(selected.reporterExperience.state).background,
                  }}
                >
                  <Text type="secondary" className="text-xs font-medium uppercase tracking-wide">
                    Việc tiếp theo
                  </Text>
                  <Text strong className="mt-0.5 block">
                    {selected.reporterExperience.nextAction.label}
                  </Text>
                  <Text type="secondary" className="mt-0.5 block text-xs">
                    {selected.reporterExperience.nextAction.detail}
                  </Text>
                </div>
              </div>

              <div className="flex items-start" aria-label="Tiến trình yêu cầu">
                {PROGRESS_LABELS.map((label, index) => {
                  const step = progressStep(selected, index);
                  return (
                    <React.Fragment key={label}>
                      <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                        <span
                          className="flex h-7 w-7 items-center justify-center rounded-full border"
                          style={{
                            borderColor:
                              step === 'wait'
                                ? token.colorBorder
                                : step === 'process'
                                  ? stateVisual(selected.reporterExperience.state).border
                                  : token.colorSuccessBorder,
                            background:
                              step === 'process'
                                ? stateVisual(selected.reporterExperience.state).background
                                : step === 'finish'
                                  ? token.colorSuccessBg
                                  : token.colorFillQuaternary,
                            color:
                              step === 'process'
                                ? stateVisual(selected.reporterExperience.state).accent
                                : step === 'finish'
                                  ? token.colorSuccess
                                  : token.colorTextTertiary,
                          }}
                        >
                          {step === 'finish' ? (
                            <AppIcon icon={Check} size="sm" />
                          ) : (
                            <AppIcon icon={CircleDotDashed} size="sm" />
                          )}
                        </span>
                        <Text
                          className="mt-1.5 text-xs"
                          style={{ color: step === 'wait' ? token.colorTextTertiary : token.colorText }}
                        >
                          {label}
                        </Text>
                      </div>
                      {index < PROGRESS_LABELS.length - 1 ? (
                        <div
                          className="mt-3 h-px flex-1"
                          style={{
                            background:
                              progressStep(selected, index + 1) === 'wait'
                                ? token.colorBorderSecondary
                                : stateVisual(selected.reporterExperience.state).border,
                          }}
                        />
                      ) : null}
                    </React.Fragment>
                  );
                })}
              </div>

              <div className="flex items-start gap-3 border-t pt-3" style={{ borderColor: token.colorBorderSecondary }}>
                <Text strong className="shrink-0">
                  Cập nhật mới
                </Text>
                <div className="min-w-0 flex-1 space-y-1.5">
                  {selected.reporterExperience.updates.map((update) => (
                    <div
                      key={`${update.label}-${update.occurredAt}`}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <Text>{update.label}</Text>
                      <Text type="secondary" className="shrink-0 text-xs">
                        {elapsedSince(update.occurredAt)}
                      </Text>
                    </div>
                  ))}
                </div>
              </div>

              {selected.clarification.status === 'WAITING_REPORTER' ? (
                <div className="border-t pt-5" style={{ borderColor: token.colorBorderSecondary }}>
                  <Text strong>mOS cần bạn trả lời</Text>
                  <div className="mt-3">
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
                </div>
              ) : null}

              {selected.resolution ? (
                <div className="border-t pt-5" style={{ borderColor: token.colorBorderSecondary }}>
                  <Text strong>Kết quả để bạn kiểm tra</Text>
                  <Paragraph className="mb-3 mt-2">{selected.resolution.solutionSummary}</Paragraph>
                  {selected.resolution.releaseUrl ? (
                    <Button
                      href={selected.resolution.releaseUrl}
                      target="_blank"
                      icon={<AppIcon icon={ExternalLink} size="sm" />}
                    >
                      Mở kết quả
                    </Button>
                  ) : null}
                </div>
              ) : null}

              {selected.canReview || selected.canReopenUnchanged ? (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 border-t pt-5"
                  style={{ borderColor: token.colorBorderSecondary }}
                >
                  <Text type="secondary" className="max-w-md">
                    Nếu vẫn chưa đúng, mOS sẽ dùng lại thông tin bạn đã gửi trước đó. Bạn không cần kể lại vấn đề.
                  </Text>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      loading={saving}
                      icon={<AppIcon icon={RotateCcw} size="sm" />}
                      onClick={() => void submitReview('REOPEN', 'UNCHANGED')}
                    >
                      Vẫn như cũ
                    </Button>
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
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default MyBugReportsPanel;
