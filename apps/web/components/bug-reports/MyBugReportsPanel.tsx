'use client';

import React from 'react';
import { Alert, Button, message, theme } from 'antd';
import {
  type BugReportCommentCreateResult,
  type BugReportNotification,
  type CreateBugReportCommentRequest,
  type MyBugReportItem,
  type ReviewBugReportRequest,
} from '@mos-lab/shared';
import { StatePanel } from '../ui';
import { BugReportRejectionModal } from './BugReportRejectionModal';
import { BugReportCancelModal } from './BugReportCancelModal';
import { MyBugReportsListPane } from './MyBugReportsListPane';
import { MyBugReportsDetailPane } from './MyBugReportsDetailPane';
import { REPORTER_GROUPS, getReporterToneVisual, toneForState } from './my-bug-reports.helpers';

export { resolveFeatureUrl } from './my-bug-reports.helpers';

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
  onCancel?: (id: number, reason?: string) => Promise<unknown>;
  onComment: (id: number, request: CreateBugReportCommentRequest) => Promise<BugReportCommentCreateResult>;
  onClose?: () => void;
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
  onCancel,
  onComment,
  onClose,
}: MyBugReportsPanelProps) {
  const { token } = theme.useToken();
  const [messageApi, messageContext] = message.useMessage();
  const [saving, setSaving] = React.useState(false);
  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [cancelling, setCancelling] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [technicalHistoryOpen, setTechnicalHistoryOpen] = React.useState(false);
  // Mobile navigation: 'list' shows the ticket list, 'detail' shows the selected ticket detail
  const [mobileView, setMobileView] = React.useState<'list' | 'detail'>('list');
  const [rejectionModalOpen, setRejectionModalOpen] = React.useState(false);

  const handleMobileSelect = React.useCallback(
    (key: string) => {
      onSelect(key);
      setMobileView('detail');
    },
    [onSelect]
  );

  const submitReview = async (payload: ReviewBugReportRequest) => {
    if (saving) return;
    const selected = reports.find((item) => item.key === selectedKey) ?? reports[0];
    if (!selected || (payload.decision === 'APPROVE' && !selected.canReview)) return;
    setSaving(true);
    try {
      await onReview(selected.id, payload);
      messageApi.success(
        payload.decision === 'APPROVE'
          ? 'Cảm ơn bạn đã kiểm tra kết quả.'
          : 'Đã gửi phản hồi. mOS sẽ kiểm tra và sửa lại theo yêu cầu của bạn.'
      );
      setRejectionModalOpen(false);
      if (payload.decision === 'APPROVE' && onClose) {
        window.setTimeout(() => onClose(), 500);
      }
    } catch (caught) {
      const responseMessage =
        caught && typeof caught === 'object' && 'response' in caught
          ? (caught as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      const rawMessage = responseMessage || (caught instanceof Error ? caught.message : '');
      const isAlreadyResolved =
        rawMessage.includes('Chỉ bản sửa đang chờ xác nhận mới có thể duyệt') ||
        rawMessage.includes('BUG_NOT_AWAITING_REVIEW');

      if (isAlreadyResolved && onClose) {
        messageApi.info('Yêu cầu này đã được xác nhận hoàn tất trước đó.');
        window.setTimeout(() => onClose(), 500);
      } else {
        messageApi.error(rawMessage || 'Không thể gửi phản hồi.');
      }
    } finally {
      setSaving(false);
    }
  };

  const submitCancel = async (reason: string) => {
    if (cancelling || !onCancel) return;
    const selected = reports.find((item) => item.key === selectedKey) ?? reports[0];
    if (!selected) return;
    setCancelling(true);
    try {
      await onCancel(selected.id, reason);
      messageApi.success('Đã huỷ yêu cầu thành công.');
      setCancelModalOpen(false);
    } catch (caught) {
      const responseMessage =
        caught && typeof caught === 'object' && 'response' in caught
          ? (caught as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      messageApi.error(responseMessage || (caught instanceof Error ? caught.message : 'Không thể huỷ yêu cầu.'));
    } finally {
      setCancelling(false);
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
  const selectedVisual = getReporterToneVisual(
    token,
    selected ? toneForState(selected.reporterExperience.state) : 'quiet'
  );
  const groupedReports = REPORTER_GROUPS.map((group) => ({
    ...group,
    reports: matchingReports.filter((report) => group.states.includes(report.reporterExperience.state)),
  }));
  const canCancelSelected = Boolean(
    onCancel &&
    selected &&
    (selected.canCancel ??
      (!['COMPLETED', 'NOT_PROCEEDING'].includes(selected.reporterExperience.state) &&
        !['CLOSED', 'REJECTED', 'DUPLICATE', 'CANCELLED'].includes(selected.status)))
  );

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
        className="reporter-request-layout overflow-hidden rounded-2xl border"
        style={{ borderColor: token.colorBorderSecondary, background: token.colorBgContainer }}
      >
        <MyBugReportsListPane
          totalCount={reports.length}
          search={search}
          onSearchChange={setSearch}
          groupedReports={groupedReports}
          hasMatches={matchingReports.length > 0}
          selectedId={selected?.id ?? null}
          mobileView={mobileView}
          onSelectReport={handleMobileSelect}
        />

        {selected ? (
          <MyBugReportsDetailPane
            selected={selected}
            selectedVisual={selectedVisual}
            mobileView={mobileView}
            onBackToList={() => setMobileView('list')}
            saving={saving}
            cancelling={cancelling}
            canCancelSelected={canCancelSelected}
            canViewTechnicalHistory={canViewTechnicalHistory}
            technicalHistoryOpen={technicalHistoryOpen}
            onToggleTechnicalHistory={setTechnicalHistoryOpen}
            onOpenCancelModal={() => setCancelModalOpen(true)}
            onOpenRejectionModal={() => setRejectionModalOpen(true)}
            onApproveResult={() => void submitReview({ decision: 'APPROVE' })}
            onComment={onComment}
          />
        ) : null}
      </div>

      {selected ? (
        <BugReportRejectionModal
          open={rejectionModalOpen}
          reportKey={selected.key}
          reportTitle={selected.title}
          submitting={saving}
          onCancel={() => setRejectionModalOpen(false)}
          onSubmit={async (data) => {
            await submitReview({
              decision: 'REOPEN',
              note: data.note,
              reopenIntent: data.reopenIntent,
              attachments: data.attachments,
            });
          }}
        />
      ) : null}

      {selected ? (
        <BugReportCancelModal
          open={cancelModalOpen}
          reportKey={selected.key}
          reportTitle={selected.title}
          submitting={cancelling}
          onCancel={() => setCancelModalOpen(false)}
          onSubmit={submitCancel}
        />
      ) : null}
    </div>
  );
}

export default MyBugReportsPanel;
