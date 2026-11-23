'use client';

import React from 'react';
import { Badge, Button, Tabs, message } from 'antd';
import { Inbox, Lightbulb, ListChecks, MessageSquareWarning, Send } from 'lucide-react';
import {
  BUG_REPORT_Z_INDEX,
  type BugReportContext,
  type BugReportExpertDetails,
  type BugReportRequestType,
  type CreateBugReportAttachmentRequest,
  type FeatureRequestAudience,
} from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { captureBugReportContext } from '../../lib/bug-diagnostics';
import { compressImageForUpload, fileDataBase64 } from '../../lib/image-utils';
import { safeStorage } from '../../lib/safe-storage';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon, IconButton, IconText } from '../ui';
import { MyBugReportsPanel } from './MyBugReportsPanel';
import {
  carryRequestDraft,
  createRequestDrafts,
  emptyRequestDraft,
  updateRequestDraft,
  type RequestDraftView,
} from './bug-report-drafts';
import {
  EXPERT_DETAILS_PREFERENCE_KEY,
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_BYTES,
  buildOptimisticBugReportItem,
  type ReleaseMarker,
} from './bug-report-surface.helpers';
import { BugReportRequestForm } from './BugReportRequestForm';
import type { useMyBugReports } from './useMyBugReports';
import { useRequestClassification } from './useRequestClassification';

export type BugReportActiveView = 'bug' | 'feature' | 'history';

export interface BugReportModalShellProps {
  open: boolean;
  activeView: BugReportActiveView;
  selectedReportKey: string | null;
  context: BugReportContext | null;
  release: ReleaseMarker | null;
  pathname: string;
  canViewInbox: boolean;
  myBugs: ReturnType<typeof useMyBugReports>;
  onClose: () => void;
  onSelectReportKey: (key: string | null) => void;
  onSwitchView: (nextView: BugReportActiveView) => void;
  onShowHistory: (key?: string | null) => void;
  onSubmittingChange: (submitting: boolean) => void;
}

/**
 * Lazily loaded modal shell for creating bug/feature reports and reviewing ticket history.
 */
export function BugReportModalShell({
  open,
  activeView,
  selectedReportKey,
  context,
  release,
  pathname,
  canViewInbox,
  myBugs,
  onClose,
  onSelectReportKey,
  onSwitchView,
  onShowHistory,
  onSubmittingChange,
}: BugReportModalShellProps) {
  const [drafts, setDrafts] = React.useState(createRequestDrafts);
  const [featureReason, setFeatureReason] = React.useState('');
  const [featureAudience, setFeatureAudience] = React.useState<FeatureRequestAudience>('TEAM');
  const [featureDesiredOutcome, setFeatureDesiredOutcome] = React.useState('');
  const [expertDetailsExpanded, setExpertDetailsExpanded] = React.useState(false);
  const [rememberExpertDetails, setRememberExpertDetails] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const submittingRef = React.useRef(false);
  const [conversationSessionId, setConversationSessionId] = React.useState<string | null>(null);

  const activeRequestView: RequestDraftView = activeView === 'feature' ? 'feature' : 'bug';
  const activeDraft = drafts[activeRequestView];
  const descriptionFieldId = activeRequestView === 'feature' ? 'mos-feature-description' : 'mos-bug-description';

  React.useEffect(() => {
    const saved = safeStorage.getItem(EXPERT_DETAILS_PREFERENCE_KEY) === 'true';
    setRememberExpertDetails(saved);
    setExpertDetailsExpanded(saved);
  }, []);

  React.useEffect(() => {
    onSubmittingChange(submitting);
  }, [onSubmittingChange, submitting]);

  const updateExpertDetails = React.useCallback(
    (update: Partial<BugReportExpertDetails>) => {
      setDrafts((current) =>
        updateRequestDraft(current, activeRequestView, (draft) => ({
          expertDetails: { ...draft.expertDetails, ...update },
        }))
      );
    },
    [activeRequestView]
  );

  const setExpertDetailsPreference = React.useCallback((checked: boolean) => {
    setRememberExpertDetails(checked);
    safeStorage.setItem(EXPERT_DETAILS_PREFERENCE_KEY, String(checked));
  }, []);

  const switchRequestView = React.useCallback(
    (nextView: RequestDraftView) => {
      if (nextView === activeView) return;
      setDrafts((current) => carryRequestDraft(current, activeRequestView, nextView));
      setConversationSessionId(null);
      onSwitchView(nextView);
    },
    [activeRequestView, activeView, onSwitchView]
  );

  const classification = useRequestClassification({
    open,
    activeView,
    description: activeDraft.description,
    files: activeDraft.files,
    contextPath: context?.path,
    contextPageTitle: context?.pageTitle,
    pathname,
  });

  const addFiles = async (selected: File[], draftView: RequestDraftView) => {
    const available = Math.max(0, MAX_ATTACHMENTS - drafts[draftView].files.length);
    if (!available) {
      message.warning(`Mỗi yêu cầu nhận tối đa ${MAX_ATTACHMENTS} ảnh.`);
      return;
    }
    setDrafts((current) => updateRequestDraft(current, draftView, { processingImages: true }));
    const next: File[] = [];
    try {
      for (const file of selected.slice(0, available)) {
        try {
          next.push(await compressImageForUpload(file, { maxBytes: MAX_ATTACHMENT_BYTES }));
        } catch (error) {
          message.error(error instanceof Error ? error.message : 'Không thể xử lý ảnh.');
        }
      }
      if (next.length) {
        setDrafts((current) =>
          updateRequestDraft(current, draftView, (draft) => ({
            files: [...draft.files, ...next].slice(0, MAX_ATTACHMENTS),
          }))
        );
      }
      if (selected.length > available) message.warning(`Chỉ ${available} ảnh đầu tiên được giữ lại.`);
    } finally {
      setDrafts((current) => updateRequestDraft(current, draftView, { processingImages: false }));
    }
  };

  const submit = async () => {
    if (submitting || submittingRef.current) return;
    const draftView: RequestDraftView = activeView === 'feature' ? 'feature' : 'bug';
    const draft = drafts[draftView];
    const normalizedDescription = draft.description.trim();
    const requestType: BugReportRequestType = draftView === 'feature' ? 'FEATURE' : 'BUG';
    const normalizedFeatureReason = featureReason.trim();
    if (normalizedDescription.length < 3) {
      message.warning('Hãy mô tả yêu cầu bằng ít nhất 3 ký tự.');
      return;
    }
    // Context normally arrives when the sheet opens. A slow release-marker
    // request must never leave the reporter with an enabled button that does
    // nothing; capture a fresh safe context at the submit boundary instead.
    const submissionContext = context ?? captureBugReportContext(release, null);
    setSubmitting(true);
    submittingRef.current = true;
    try {
      const attachments: CreateBugReportAttachmentRequest[] = await Promise.all(
        draft.files.map(async (file) => ({
          fileName: file.name,
          mimeType: file.type as CreateBugReportAttachmentRequest['mimeType'],
          sizeBytes: file.size,
          dataBase64: await fileDataBase64(file),
        }))
      );
      const response = await apiClient.bugReports.create({
        requestType,
        description: normalizedDescription,
        context: submissionContext,
        classificationJobId: classification?.status === 'COMPLETED' ? classification.id : null,
        conversationSessionId,
        featureRequest:
          requestType === 'FEATURE'
            ? {
                reason: normalizedFeatureReason || normalizedDescription,
                audience: featureAudience,
                desiredOutcome: featureDesiredOutcome.trim() || null,
              }
            : null,
        expertDetails: draft.expertDetails,
        attachments,
      });
      const result = response.data;
      if (!result) throw new Error('Server không trả mã ticket.');
      message.success(
        requestType === 'FEATURE'
          ? `Đã gửi ${result.key}. AI Agent sẽ làm rõ trước khi Danny duyệt.`
          : `Đã ghi nhận ${result.key}. Cảm ơn bạn!`
      );
      result.attachmentWarnings.forEach((warning) => message.warning(warning));
      setDrafts((current) => updateRequestDraft(current, draftView, emptyRequestDraft()));
      if (draftView === 'feature') {
        setFeatureReason('');
        setFeatureAudience('TEAM');
        setFeatureDesiredOutcome('');
      }

      // Optimistically switch to history view and add new report to eliminate any UI lag or double clicks
      onSelectReportKey(result.key);
      onSwitchView('history');

      const optimisticItem = buildOptimisticBugReportItem({
        id: result.id,
        key: result.key,
        requestType,
        description: normalizedDescription,
        submissionContext,
        attachments,
        featureReason: normalizedFeatureReason,
        featureAudience,
        featureDesiredOutcome,
        expertDetails: draft.expertDetails,
      });
      myBugs.addOptimisticReport(optimisticItem);
      void myBugs.refresh({ force: true });
    } catch (error: unknown) {
      const responseMessage =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : null;
      message.error(responseMessage || (error instanceof Error ? error.message : 'Không thể gửi yêu cầu.'));
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <AdaptiveModal
      intent={activeView === 'history' ? 'data' : 'form'}
      width={activeView === 'history' ? 'min(1200px, calc(100vw - 48px))' : undefined}
      title="Phản hồi mOS"
      className="mos-bug-report-modal"
      open={open}
      onCancel={onClose}
      maskClosable={!submitting}
      keyboard={!submitting}
      zIndex={BUG_REPORT_Z_INDEX.SURFACE_MODAL}
      destroyOnHidden
      footer={
        <AdaptiveOverlayFooter className="!static !m-0 !border-t-0 !p-0">
          <div className="ml-auto flex flex-wrap justify-end gap-2">
            <Button onClick={onClose} disabled={submitting}>
              {activeView === 'history' ? 'Đóng' : 'Hủy'}
            </Button>
            {activeView !== 'history' ? (
              <Button
                type="primary"
                loading={submitting}
                disabled={submitting || activeDraft.description.trim().length < 3 || activeDraft.processingImages}
                onClick={() => void submit()}
              >
                <IconText icon={<AppIcon icon={Send} size="sm" />}>
                  {activeView === 'feature' ? 'Gửi yêu cầu' : 'Gửi báo lỗi'}
                </IconText>
              </Button>
            ) : null}
          </div>
        </AdaptiveOverlayFooter>
      }
    >
      <Tabs
        className="mb-4"
        activeKey={activeView}
        onChange={(key) => {
          if (key === 'history') onShowHistory(selectedReportKey);
          else switchRequestView(key === 'feature' ? 'feature' : 'bug');
        }}
        items={[
          {
            key: 'bug',
            label: (
              <span className="inline-flex items-center gap-2">
                <AppIcon icon={MessageSquareWarning} size="sm" />
                Báo lỗi
              </span>
            ),
          },
          {
            key: 'feature',
            label: (
              <span className="inline-flex items-center gap-2">
                <AppIcon icon={Lightbulb} size="sm" />
                <span className="hidden sm:inline">Thêm chức năng mới</span>
                <span className="inline sm:hidden">Tính năng mới</span>
              </span>
            ),
          },
          {
            key: 'history',
            label: (
              <span className="inline-flex items-center gap-2">
                <AppIcon icon={ListChecks} size="sm" />
                Yêu cầu của tôi
                <Badge count={myBugs.unreadCount} size="small" overflowCount={99} />
              </span>
            ),
          },
        ]}
        tabBarExtraContent={
          <div className="flex items-center gap-1">
            {canViewInbox ? (
              <IconButton label="Mở mOS Mission" icon={Inbox} tone="text" href="/dashboard/bug-reports" />
            ) : null}
          </div>
        }
      />

      {activeView === 'history' ? (
        <MyBugReportsPanel
          reports={myBugs.data}
          notifications={myBugs.notifications}
          selectedKey={selectedReportKey}
          loading={myBugs.loading}
          error={myBugs.error}
          canViewTechnicalHistory={canViewInbox}
          onSelect={onSelectReportKey}
          onRefresh={myBugs.refresh}
          onReview={myBugs.review}
          onCancel={myBugs.cancel}
          onComment={myBugs.comment}
          onClose={onClose}
        />
      ) : (
        <BugReportRequestForm
          activeView={activeView}
          activeRequestView={activeRequestView}
          activeDraft={activeDraft}
          descriptionFieldId={descriptionFieldId}
          pathname={pathname}
          context={context}
          classification={classification}
          expertDetailsExpanded={expertDetailsExpanded}
          onExpertDetailsExpandedChange={setExpertDetailsExpanded}
          rememberExpertDetails={rememberExpertDetails}
          onRememberExpertDetailsChange={setExpertDetailsPreference}
          featureReason={featureReason}
          onFeatureReasonChange={setFeatureReason}
          featureAudience={featureAudience}
          onFeatureAudienceChange={setFeatureAudience}
          featureDesiredOutcome={featureDesiredOutcome}
          onFeatureDesiredOutcomeChange={setFeatureDesiredOutcome}
          onConversationSession={setConversationSessionId}
          onSwitchRequestView={switchRequestView}
          onDescriptionChange={(nextDescription) => {
            setDrafts((current) => updateRequestDraft(current, activeRequestView, { description: nextDescription }));
            setConversationSessionId(null);
          }}
          onApplyGuidedDescription={(value) => {
            setDrafts((current) => updateRequestDraft(current, activeRequestView, { description: value }));
          }}
          onUpdateExpertDetails={updateExpertDetails}
          onAddFiles={(files, draftView) => void addFiles(files, draftView)}
          onRemoveFile={(index) =>
            setDrafts((current) =>
              updateRequestDraft(current, activeRequestView, (draft) => ({
                files: draft.files.filter((_, itemIndex) => itemIndex !== index),
              }))
            )
          }
        />
      )}
    </AdaptiveModal>
  );
}
