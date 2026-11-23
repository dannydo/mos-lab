'use client';

import React from 'react';
import { Badge, Button, Tabs, message as messageStatic, notification as notificationStatic } from 'antd';
import { Inbox, Lightbulb, ListChecks, MessageSquareWarning, Send } from 'lucide-react';
import { usePathname } from 'next/navigation';
import {
  BUG_REPORT_Z_INDEX,
  isAdminOrSuperAdminRole,
  isCvRole,
  type BugReportClientError,
  type BugReportContext,
  type BugReportExpertDetails,
  type BugReportRequestType,
  type CreateBugReportAttachmentRequest,
  type FeatureRequestAudience,
} from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import {
  captureBugReportContext,
  OPEN_BUG_REPORT_EVENT,
  recordClientError,
  setBugReportBadgeSummary,
} from '../../lib/bug-diagnostics';
import { compressImageForUpload, fileDataBase64 } from '../../lib/image-utils';
import { safeStorage } from '../../lib/safe-storage';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon, IconButton, IconText } from '../ui';
import { MyBugReportsPanel } from './MyBugReportsPanel';
import { BUG_REPORT_WORKFLOW_VISIBILITY_EVENT, BugReportWorkflowModal } from './BugReportWorkflowGuide';
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
import { useMyBugReports } from './useMyBugReports';
import { useRequestClassification } from './useRequestClassification';

export function BugReportSurface() {
  const pathname = usePathname();
  const [messageApi, messageContextHolder] = messageStatic.useMessage();
  const [notificationApi, notificationContextHolder] = notificationStatic.useNotification({
    maxCount: 3,
  });
  const [open, setOpen] = React.useState(false);
  const [workflowOpen, setWorkflowOpen] = React.useState(false);
  const [_externalWorkflowOpen, setExternalWorkflowOpen] = React.useState(false);
  const [activeView, setActiveView] = React.useState<'bug' | 'feature' | 'history'>('bug');
  const [selectedReportKey, setSelectedReportKey] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState(createRequestDrafts);
  const [featureReason, setFeatureReason] = React.useState('');
  const [featureAudience, setFeatureAudience] = React.useState<FeatureRequestAudience>('TEAM');
  const [featureDesiredOutcome, setFeatureDesiredOutcome] = React.useState('');
  const [expertDetailsExpanded, setExpertDetailsExpanded] = React.useState(false);
  const [rememberExpertDetails, setRememberExpertDetails] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const submittingRef = React.useRef(false);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [isCvAccount, setIsCvAccount] = React.useState(false);
  const [canViewInbox, setCanViewInbox] = React.useState(false);
  const [release, setRelease] = React.useState<ReleaseMarker | null>(null);
  const [context, setContext] = React.useState<BugReportContext | null>(null);
  const [conversationSessionId, setConversationSessionId] = React.useState<string | null>(null);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const announcedNotificationsRef = React.useRef(new Set<number>());
  const handledReviewLinkRef = React.useRef<string | null>(null);
  const activeRequestView: RequestDraftView = activeView === 'feature' ? 'feature' : 'bug';
  const activeDraft = drafts[activeRequestView];
  const descriptionFieldId = activeRequestView === 'feature' ? 'mos-feature-description' : 'mos-bug-description';

  React.useEffect(() => {
    const saved = safeStorage.getItem(EXPERT_DETAILS_PREFERENCE_KEY) === 'true';
    setRememberExpertDetails(saved);
    setExpertDetailsExpanded(saved);
  }, []);

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
      setActiveView(nextView);
    },
    [activeRequestView, activeView]
  );

  const normalizedPathname = pathname || '';
  const isDashboardRoute = normalizedPathname.startsWith('/dashboard');
  const isAppRoute =
    isDashboardRoute || normalizedPathname.startsWith('/chat') || normalizedPathname.startsWith('/ios-app');
  const enabled = authenticated && !isCvAccount && isAppRoute;
  const myBugs = useMyBugReports(enabled, open);

  React.useEffect(() => {
    setAuthenticated(Boolean(safeStorage.getItem('mos_token')));
    try {
      const user = JSON.parse(safeStorage.getItem('mos_user') || '{}') as { role?: string };
      setIsCvAccount(isCvRole(user.role));
      setCanViewInbox(isAdminOrSuperAdminRole(user.role));
    } catch {
      setIsCvAccount(false);
      setCanViewInbox(false);
    }
  }, [pathname]);

  React.useEffect(() => {
    const handleWorkflowVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      setExternalWorkflowOpen(Boolean(customEvent.detail?.open));
    };

    window.addEventListener(BUG_REPORT_WORKFLOW_VISIBILITY_EVENT, handleWorkflowVisibility);
    return () => window.removeEventListener(BUG_REPORT_WORKFLOW_VISIBILITY_EVENT, handleWorkflowVisibility);
  }, []);

  React.useEffect(() => {
    if (!enabled || !open || release) return;
    apiClient.release
      .get()
      .then(setRelease)
      .catch(() => setRelease(null));
  }, [enabled, open, release]);

  React.useEffect(() => {
    if (!enabled) return;
    const onError = (event: ErrorEvent) => recordClientError(event.error || event.message);
    const onUnhandledRejection = (event: PromiseRejectionEvent) => recordClientError(event.reason);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, [enabled]);

  const showReporter = React.useCallback(
    (errorBoundary?: BugReportClientError | null) => {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setContext(captureBugReportContext(release, errorBoundary));
      setActiveView('bug');
      setOpen(true);
    },
    [release]
  );

  React.useEffect(() => {
    setBugReportBadgeSummary({
      actionRequiredCount: enabled ? myBugs.actionRequiredCount : 0,
      unreadCount: enabled ? myBugs.unreadCount : 0,
    });
  }, [enabled, myBugs.actionRequiredCount, myBugs.unreadCount]);

  React.useEffect(
    () => () => {
      setBugReportBadgeSummary({ actionRequiredCount: 0, unreadCount: 0 });
    },
    []
  );

  const classification = useRequestClassification({
    open,
    activeView,
    description: activeDraft.description,
    files: activeDraft.files,
    contextPath: context?.path,
    contextPageTitle: context?.pageTitle,
    pathname: normalizedPathname,
  });

  const showHistory = React.useCallback(
    (key?: string | null, notificationId?: number) => {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setSelectedReportKey(
        key ||
          myBugs.data.find((item) => item.clarification.status === 'WAITING_REPORTER' || item.canReview)?.key ||
          myBugs.data[0]?.key ||
          null
      );
      setActiveView('history');
      setOpen(true);
      if (notificationId !== undefined) {
        notificationApi.destroy(`bug-report-${notificationId}`);
      } else {
        for (const item of myBugs.notifications) {
          if (!item.readAt) notificationApi.destroy(`bug-report-${item.id}`);
        }
      }
      void myBugs.refresh({ force: true });
      if (notificationId !== undefined) {
        void myBugs.markNotificationsRead([notificationId]).catch(() => {});
      } else if (myBugs.unreadCount) {
        void myBugs.markNotificationsRead().catch(() => {});
      }
    },
    [
      myBugs.data,
      myBugs.markNotificationsRead,
      myBugs.notifications,
      myBugs.refresh,
      myBugs.unreadCount,
      notificationApi,
    ]
  );

  const showHistoryRef = React.useRef(showHistory);
  showHistoryRef.current = showHistory;

  React.useEffect(() => {
    if (!enabled) return;
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ errorBoundary?: BugReportClientError; preferHistoryIfPending?: boolean }>)
        .detail;
      if (detail?.preferHistoryIfPending && (myBugs.actionRequiredCount || myBugs.unreadCount)) {
        showHistory(
          myBugs.data.find((item) => item.clarification.status === 'WAITING_REPORTER' || item.canReview)?.key ||
            myBugs.notifications.find((item) => !item.readAt)?.reportKey
        );
        return;
      }
      showReporter(detail?.errorBoundary || null);
    };
    window.addEventListener(OPEN_BUG_REPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_BUG_REPORT_EVENT, onOpen);
  }, [
    enabled,
    myBugs.actionRequiredCount,
    myBugs.data,
    myBugs.notifications,
    myBugs.unreadCount,
    showHistory,
    showReporter,
  ]);

  React.useEffect(() => {
    if (!enabled) return;
    const key = new URLSearchParams(window.location.search).get('bugReview');
    if (key && handledReviewLinkRef.current !== key) {
      handledReviewLinkRef.current = key;
      showHistory(key.toUpperCase());
    }
  }, [enabled, showHistory]);

  React.useEffect(() => {
    if (!enabled) return;
    const pending = myBugs.notifications.filter(
      (item) => !item.readAt && !announcedNotificationsRef.current.has(item.id)
    );
    if (!pending.length) return;
    for (const next of pending.slice(0, 3)) {
      announcedNotificationsRef.current.add(next.id);
      const noticeKey = `bug-report-${next.id}`;
      const isClarification = next.type.endsWith('CLARIFICATION_NEEDED');
      const handleOpenFromNotification = () => {
        notificationApi.destroy(noticeKey);
        showHistoryRef.current(next.reportKey, next.id);
      };
      notificationApi[isClarification ? 'warning' : 'success']({
        key: noticeKey,
        message: next.title,
        description: next.message,
        duration: 0,
        onClick: handleOpenFromNotification,
        actions: (
          <Button
            type="primary"
            size="small"
            onClick={(event) => {
              event.stopPropagation();
              handleOpenFromNotification();
            }}
          >
            {isClarification ? 'Trả lời Agent' : 'Xem & duyệt'}
          </Button>
        ),
      });
    }
  }, [enabled, myBugs.notifications, notificationApi]);

  const closeReporter = React.useCallback(() => {
    if (submitting) return;
    setOpen(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('bugReview')) {
        url.searchParams.delete('bugReview');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    }
    window.setTimeout(() => previousFocusRef.current?.focus?.(), 0);
  }, [submitting]);

  const addFiles = async (selected: File[], draftView: RequestDraftView) => {
    const available = Math.max(0, MAX_ATTACHMENTS - drafts[draftView].files.length);
    if (!available) {
      messageApi.warning(`Mỗi yêu cầu nhận tối đa ${MAX_ATTACHMENTS} ảnh.`);
      return;
    }
    setDrafts((current) => updateRequestDraft(current, draftView, { processingImages: true }));
    const next: File[] = [];
    try {
      for (const file of selected.slice(0, available)) {
        try {
          next.push(await compressImageForUpload(file, { maxBytes: MAX_ATTACHMENT_BYTES }));
        } catch (error) {
          messageApi.error(error instanceof Error ? error.message : 'Không thể xử lý ảnh.');
        }
      }
      if (next.length) {
        setDrafts((current) =>
          updateRequestDraft(current, draftView, (draft) => ({
            files: [...draft.files, ...next].slice(0, MAX_ATTACHMENTS),
          }))
        );
      }
      if (selected.length > available) messageApi.warning(`Chỉ ${available} ảnh đầu tiên được giữ lại.`);
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
      messageApi.warning('Hãy mô tả yêu cầu bằng ít nhất 3 ký tự.');
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
      messageApi.success(
        requestType === 'FEATURE'
          ? `Đã gửi ${result.key}. AI Agent sẽ làm rõ trước khi Danny duyệt.`
          : `Đã ghi nhận ${result.key}. Cảm ơn bạn!`
      );
      result.attachmentWarnings.forEach((warning) => messageApi.warning(warning));
      setDrafts((current) => updateRequestDraft(current, draftView, emptyRequestDraft()));
      if (draftView === 'feature') {
        setFeatureReason('');
        setFeatureAudience('TEAM');
        setFeatureDesiredOutcome('');
      }

      // Optimistically switch to history view and add new report to eliminate any UI lag or double clicks
      setSelectedReportKey(result.key);
      setActiveView('history');

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
      messageApi.error(responseMessage || (error instanceof Error ? error.message : 'Không thể gửi yêu cầu.'));
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (!enabled) return null;

  return (
    <>
      {messageContextHolder}
      {notificationContextHolder}
      <AdaptiveModal
        intent={activeView === 'history' ? 'data' : 'form'}
        width={activeView === 'history' ? 'min(1200px, calc(100vw - 48px))' : undefined}
        title="Phản hồi mOS"
        className="mos-bug-report-modal"
        open={open}
        onCancel={closeReporter}
        maskClosable={!submitting}
        keyboard={!submitting}
        zIndex={BUG_REPORT_Z_INDEX.SURFACE_MODAL}
        destroyOnHidden
        footer={
          <AdaptiveOverlayFooter className="!static !m-0 !border-t-0 !p-0">
            <div className="ml-auto flex flex-wrap justify-end gap-2">
              <Button onClick={closeReporter} disabled={submitting}>
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
            if (key === 'history') showHistory(selectedReportKey);
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
            onSelect={setSelectedReportKey}
            onRefresh={myBugs.refresh}
            onReview={myBugs.review}
            onCancel={myBugs.cancel}
            onComment={myBugs.comment}
            onClose={closeReporter}
          />
        ) : (
          <BugReportRequestForm
            activeView={activeView}
            activeRequestView={activeRequestView}
            activeDraft={activeDraft}
            descriptionFieldId={descriptionFieldId}
            pathname={normalizedPathname}
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
      <BugReportWorkflowModal
        open={workflowOpen}
        onClose={() => setWorkflowOpen(false)}
        zIndex={BUG_REPORT_Z_INDEX.WORKFLOW_MODAL}
      />
    </>
  );
}

export default BugReportSurface;
