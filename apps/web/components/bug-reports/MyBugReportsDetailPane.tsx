'use client';

import React from 'react';
import { Button, Image, Tag, Typography, theme } from 'antd';
import {
  BUG_REPORT_Z_INDEX,
  type BugReportCommentCreateResult,
  type CreateBugReportCommentRequest,
  type MyBugReportItem,
} from '@mos-lab/shared';
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  ExternalLink,
  FileText,
  ImageIcon,
  ListTree,
  MessageSquare,
  RotateCcw,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { AppIcon, StatusTag } from '../ui';
import { RichTextViewer } from '../ui/rich-text';
import { BugReportConversation } from './BugReportConversation';
import { BugReportAttachmentPreview } from './BugReportAttachmentPreview';
import {
  REPORTER_STATE_ICONS,
  REPORTER_STATE_TONES,
  elapsedSince,
  requestTypeLabel,
  resolveFeatureUrl,
  type ReporterToneVisual,
} from './my-bug-reports.helpers';

const { Text } = Typography;

interface MyBugReportsDetailPaneProps {
  selected: MyBugReportItem;
  selectedVisual: ReporterToneVisual;
  mobileView: 'list' | 'detail';
  onBackToList: () => void;
  saving: boolean;
  cancelling: boolean;
  canCancelSelected: boolean;
  canViewTechnicalHistory: boolean;
  technicalHistoryOpen: boolean;
  onToggleTechnicalHistory: (open: boolean) => void;
  onOpenCancelModal: () => void;
  onOpenRejectionModal: () => void;
  onApproveResult: () => void;
  onComment: (id: number, request: CreateBugReportCommentRequest) => Promise<BugReportCommentCreateResult>;
}

export function MyBugReportsDetailPane({
  selected,
  selectedVisual,
  mobileView,
  onBackToList,
  saving,
  cancelling,
  canCancelSelected,
  canViewTechnicalHistory,
  technicalHistoryOpen,
  onToggleTechnicalHistory,
  onOpenCancelModal,
  onOpenRejectionModal,
  onApproveResult,
  onComment,
}: MyBugReportsDetailPaneProps) {
  const { token } = theme.useToken();
  const recentUpdates = selected.reporterExperience.updates.slice(0, 2);
  const selectedEvidence = selected.evidenceAttachments ?? [];

  return (
    <section
      className={`min-w-0 ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}
      aria-label={`Chi tiết ${selected.key}`}
    >
      {/* Mobile back button — only shown on mobile when in detail view */}
      <div
        className="flex items-center border-b px-4 py-3 lg:hidden"
        style={{ borderColor: token.colorBorderSecondary }}
      >
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm font-medium"
          style={{ color: token.colorPrimary }}
          onClick={onBackToList}
        >
          <AppIcon icon={ChevronLeft} size="sm" />
          Danh sách yêu cầu
        </button>
      </div>
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
              <div className="flex items-center gap-2">
                <StatusTag
                  status={REPORTER_STATE_TONES[selected.reporterExperience.state]}
                  icon={<AppIcon icon={REPORTER_STATE_ICONS[selected.reporterExperience.state]} size="sm" />}
                  label={selected.reporterExperience.label}
                />
                {canCancelSelected ? (
                  <Button
                    size="small"
                    danger
                    type="text"
                    icon={<AppIcon icon={Ban} size="sm" />}
                    onClick={onOpenCancelModal}
                  >
                    Huỷ yêu cầu
                  </Button>
                ) : null}
              </div>
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
        <InfoBlock icon={FileText} title={selected.requestType === 'FEATURE' ? 'Điều bạn muốn' : 'Điều bạn đã báo'}>
          <RichTextViewer content={selected.description} />
        </InfoBlock>
        {selectedEvidence.length ? (
          <InfoBlock icon={ImageIcon} title="Ảnh bạn đã gửi">
            <Image.PreviewGroup
              preview={{
                zIndex: BUG_REPORT_Z_INDEX.PREVIEW,
                countRender: (current: number, total: number) => (
                  <span className="tabular-nums font-semibold tracking-wide">
                    {current} / {total}
                  </span>
                ),
              }}
            >
              <div className="flex flex-wrap items-center gap-2">
                {selectedEvidence.map((attachment) => (
                  <BugReportAttachmentPreview
                    key={attachment.id}
                    reportId={selected.id}
                    attachment={attachment}
                    thumbnail
                  />
                ))}
              </div>
            </Image.PreviewGroup>
            <Text type="secondary" className="mt-2 block text-xs">
              Bấm vào ảnh để xem và lướt qua các ảnh.
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
        {selected.resolution
          ? (() => {
              const featureUrl = resolveFeatureUrl(selected);
              const ticketUrl = `/dashboard/bug-reports?selected=${encodeURIComponent(selected.key)}`;
              return (
                <InfoBlock
                  icon={CheckCircle2}
                  title="Kết quả"
                  accent={token.colorSuccess}
                  background={token.colorSuccessBg}
                >
                  <div className="text-sm leading-relaxed">{selected.resolution.solutionSummary}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {featureUrl ? (
                      <Button
                        type="primary"
                        href={featureUrl}
                        target="_blank"
                        icon={<AppIcon icon={ExternalLink} size="sm" />}
                        style={{
                          backgroundColor: token.colorSuccess,
                          borderColor: token.colorSuccess,
                        }}
                      >
                        Mở kết quả
                      </Button>
                    ) : null}
                    <Button href={ticketUrl} target="_blank" icon={<AppIcon icon={FileText} size="sm" />}>
                      Mở ticket
                    </Button>
                  </div>
                </InfoBlock>
              );
            })()
          : null}

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
                {selected.canReview
                  ? 'Nếu vẫn chưa đúng ý, bạn có thể gửi phản hồi kèm hình ảnh để Agent sửa lại.'
                  : 'Nếu vẫn chưa đúng, mOS sẽ dùng lại thông tin bạn đã gửi trước đó.'}
              </Text>
              <div className="flex flex-wrap gap-2">
                <Button
                  danger
                  loading={saving}
                  disabled={saving}
                  icon={<AppIcon icon={RotateCcw} size="sm" />}
                  onClick={onOpenRejectionModal}
                >
                  Cần sửa lại
                </Button>
                {selected.canReview ? (
                  <Button
                    type="primary"
                    loading={saving}
                    disabled={saving}
                    icon={<AppIcon icon={CheckCircle2} size="sm" />}
                    onClick={onApproveResult}
                  >
                    Đã đúng
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          {canCancelSelected && !selected.canReview && (
            <div
              className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3"
              style={{ borderColor: selectedVisual.border }}
            >
              <Text type="secondary" className="text-xs">
                Nếu yêu cầu này bị báo nhầm hoặc không còn cần thiết, bạn có thể huỷ yêu cầu.
              </Text>
              <Button
                danger
                loading={cancelling}
                disabled={cancelling}
                icon={<AppIcon icon={Ban} size="sm" />}
                onClick={onOpenCancelModal}
              >
                Huỷ yêu cầu
              </Button>
            </div>
          )}
        </section>

        {/* Trao đổi & bình luận (luôn hiển thị để người dùng có thể theo dõi và comment thêm trong quá trình xử lý của agent) */}
        {selected.clarification.status !== 'WAITING_REPORTER' &&
          (!['CLOSED', 'REJECTED', 'DUPLICATE', 'CANCELLED'].includes(selected.status) ||
            selected.comments.length > 0) && (
            <section
              className="rounded-xl border p-4"
              style={{ borderColor: token.colorBorderSecondary, background: token.colorBgContainer }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AppIcon icon={MessageSquare} size="sm" />
                  <Text strong className="text-sm">
                    Trao đổi & Bình luận ({selected.comments.length})
                  </Text>
                </div>
                {['NEW', 'APPROVED', 'IN_PROGRESS'].includes(selected.status) ? (
                  <Tag color="processing" className="m-0">
                    {selected.agentProgress.stage === 'ANALYZING' ||
                    selected.agentProgress.stage === 'CHECKING_BUSINESS_LOGIC' ||
                    selected.clarification.status === 'PENDING_AGENT'
                      ? 'Agent đang phân tích'
                      : selected.agentProgress.stage === 'IMPLEMENTING' ||
                          selected.agentProgress.stage === 'COMMITTING' ||
                          selected.agentProgress.stage === 'DEPLOYING' ||
                          selected.agentProgress.stage === 'VERIFYING' ||
                          selected.status === 'APPROVED' ||
                          selected.status === 'IN_PROGRESS'
                        ? 'Agent đang xử lý'
                        : 'Đang xử lý'}
                  </Tag>
                ) : null}
              </div>
              <BugReportConversation
                reportId={selected.id}
                requestType={selected.requestType}
                status={selected.status}
                clarification={selected.clarification}
                comments={selected.comments}
                reporterMode
                onSubmit={(request) => onComment(selected.id, request)}
              />
            </section>
          )}

        {canViewTechnicalHistory ? (
          <details
            open={technicalHistoryOpen}
            onToggle={(event) => onToggleTechnicalHistory(event.currentTarget.open)}
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
                Lịch sử kỹ thuật, audit và workflow nội bộ được xem trong mOS Mission để không làm rối màn hình người
                báo.
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
