'use client';

import React from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Collapse,
  Image,
  Input,
  Select,
  Tabs,
  Upload,
  message,
  notification,
  theme,
} from 'antd';
import { ImagePlus, Inbox, Lightbulb, ListChecks, MessageSquareWarning, Send, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import type {
  BugReportClientError,
  BugReportContext,
  BugReportExpertDetails,
  BugReportExpertImpact,
  BugReportRequestType,
  CreateBugReportAttachmentRequest,
  FeatureRequestAudience,
  RequestClassificationJob,
} from '@mos-lab/shared';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { clampBugReportLauncherPosition, type BugReportLauncherPosition } from '../../lib/bug-report-launcher';
import { captureBugReportContext, OPEN_BUG_REPORT_EVENT, recordClientError } from '../../lib/bug-diagnostics';
import { compressImageForUpload, fileDataBase64 } from '../../lib/image-utils';
import { safeStorage } from '../../lib/safe-storage';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon, HeaderActionIndicator, IconButton, IconText } from '../ui';
import { MyBugReportsPanel } from './MyBugReportsPanel';
import { GuidedRequestConversation } from './GuidedRequestConversation';
import { BUG_REPORT_WORKFLOW_VISIBILITY_EVENT, BugReportWorkflowModal } from './BugReportWorkflowGuide';
import {
  carryRequestDraft,
  createRequestDrafts,
  emptyRequestDraft,
  updateRequestDraft,
  type RequestDraftView,
} from './bug-report-drafts';
import { useBugReportLauncherPreferences } from './useBugReportLauncherPreferences';
import { useMyBugReports } from './useMyBugReports';

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const LAUNCHER_SIZE = 44;
const LAUNCHER_MARGIN = 12;
const DRAG_THRESHOLD = 4;
const EXPERT_DETAILS_PREFERENCE_KEY = 'mos_bug_report_expert_details_v1';

const FEATURE_AUDIENCE_OPTIONS: Array<{ value: FeatureRequestAudience; label: string }> = [
  { value: 'SELF', label: 'Cá nhân tôi' },
  { value: 'TEAM', label: 'Đội / bộ phận của tôi' },
  { value: 'ALL_STAFF', label: 'Tất cả nhân viên' },
  { value: 'CUSTOMER', label: 'Khách hàng' },
];
const EXPERT_IMPACT_OPTIONS: Array<{ value: BugReportExpertImpact; label: string }> = [
  { value: 'LOW', label: 'Thấp · có thể tiếp tục làm việc' },
  { value: 'MEDIUM', label: 'Trung bình · gây bất tiện' },
  { value: 'HIGH', label: 'Cao · chặn công việc' },
];

type ReleaseMarker = { deployedAt: string | null; commitSha: string | null };

function BugReportFileThumbnail({ file }: { file: File }) {
  const [previewUrl, setPreviewUrl] = React.useState('');

  React.useEffect(() => {
    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  if (!previewUrl) {
    return (
      <span aria-label={`Đang tạo ảnh xem trước ${file.name}`} className="h-[52px] w-[52px] shrink-0 rounded-md" />
    );
  }

  return (
    <Image
      alt={`Ảnh xem trước ${file.name}`}
      src={previewUrl}
      width={52}
      height={52}
      style={{ borderRadius: 6, objectFit: 'cover' }}
      preview={{ zIndex: 12030 }}
    />
  );
}

export function BugReportSurface() {
  const pathname = usePathname();
  const { token } = theme.useToken();
  const [open, setOpen] = React.useState(false);
  const [workflowOpen, setWorkflowOpen] = React.useState(false);
  const [externalWorkflowOpen, setExternalWorkflowOpen] = React.useState(false);
  const [activeView, setActiveView] = React.useState<'bug' | 'feature' | 'history'>('bug');
  const [selectedReportKey, setSelectedReportKey] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState(createRequestDrafts);
  const [featureReason, setFeatureReason] = React.useState('');
  const [featureAudience, setFeatureAudience] = React.useState<FeatureRequestAudience>('TEAM');
  const [featureDesiredOutcome, setFeatureDesiredOutcome] = React.useState('');
  const [expertDetailsExpanded, setExpertDetailsExpanded] = React.useState(false);
  const [rememberExpertDetails, setRememberExpertDetails] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [canViewInbox, setCanViewInbox] = React.useState(false);
  const [release, setRelease] = React.useState<ReleaseMarker | null>(null);
  const [context, setContext] = React.useState<BugReportContext | null>(null);
  const [classification, setClassification] = React.useState<RequestClassificationJob | null>(null);
  const [conversationSessionId, setConversationSessionId] = React.useState<string | null>(null);
  const [launcherPosition, setLauncherPosition] = React.useState<BugReportLauncherPosition | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const dragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
    latest: BugReportLauncherPosition;
  } | null>(null);
  const suppressClickUntilRef = React.useRef(0);
  const announcedNotificationsRef = React.useRef(new Set<number>());
  const handledReviewLinkRef = React.useRef<string | null>(null);
  const classificationVersionRef = React.useRef(0);
  const {
    preferences,
    ready: launcherPreferencesReady,
    setPosition: persistLauncherPosition,
  } = useBugReportLauncherPreferences();
  const savedLauncherX = preferences.position?.x ?? null;
  const savedLauncherY = preferences.position?.y ?? null;
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

  const enabled = authenticated && pathname.startsWith('/dashboard');
  const myBugs = useMyBugReports(enabled);

  React.useEffect(() => {
    setAuthenticated(Boolean(safeStorage.getItem('mos_token')));
    try {
      const user = JSON.parse(safeStorage.getItem('mos_user') || '{}') as { role?: string };
      setCanViewInbox(isAdminOrSuperAdminRole(user.role));
    } catch {
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
    if (!enabled) return;
    apiClient.release
      .get()
      .then(setRelease)
      .catch(() => setRelease(null));
  }, [enabled]);

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
    if (!enabled) return;
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ errorBoundary?: BugReportClientError }>).detail;
      showReporter(detail?.errorBoundary || null);
    };
    window.addEventListener(OPEN_BUG_REPORT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_BUG_REPORT_EVENT, onOpen);
  }, [enabled, showReporter]);

  React.useEffect(() => {
    if (!open || activeView === 'history') return;
    const description = activeDraft.description.trim();
    const version = ++classificationVersionRef.current;
    setClassification(null);
    if (description.length < 3) return;
    if (!navigator.onLine) {
      setClassification({
        id: `offline-${version}`,
        status: 'FAILED',
        recommendation: null,
        fallbackReason: 'Bạn đang offline; vẫn có thể tự chọn Báo lỗi hoặc Yêu cầu chức năng.',
        expiresAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    let cancelled = false;
    let pollTimer: number | null = null;
    const poll = async (jobId: string) => {
      try {
        const next = await apiClient.bugReports.classificationStatus(jobId);
        if (cancelled || version !== classificationVersionRef.current) return;
        setClassification(next);
        if (next.status === 'PENDING' || next.status === 'LEASED') {
          pollTimer = window.setTimeout(() => void poll(jobId), 1500);
        }
      } catch {
        if (cancelled || version !== classificationVersionRef.current) return;
        setClassification({
          id: jobId,
          status: 'FAILED',
          recommendation: null,
          fallbackReason: 'AI tạm thời không phản hồi; bạn vẫn có thể tự chọn loại yêu cầu.',
          expiresAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    };
    const debounce = window.setTimeout(() => {
      void (async () => {
        try {
          const attachments: CreateBugReportAttachmentRequest[] = await Promise.all(
            activeDraft.files.map(async (file) => ({
              fileName: file.name,
              mimeType: file.type as CreateBugReportAttachmentRequest['mimeType'],
              sizeBytes: file.size,
              dataBase64: await fileDataBase64(file),
            }))
          );
          const response = await apiClient.bugReports.classifyRequest({
            description,
            context: {
              path: context?.path || pathname,
              pageTitle: context?.pageTitle || document.title,
              online: true,
            },
            attachments,
          });
          const job = response.data;
          if (!job || cancelled || version !== classificationVersionRef.current) return;
          setClassification(job);
          void poll(job.id);
        } catch {
          if (cancelled || version !== classificationVersionRef.current) return;
          setClassification({
            id: `unavailable-${version}`,
            status: 'FAILED',
            recommendation: null,
            fallbackReason: 'Không thể hỏi AI lúc này; bạn vẫn có thể tự chọn loại yêu cầu.',
            expiresAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      })();
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(debounce);
      if (pollTimer !== null) window.clearTimeout(pollTimer);
    };
  }, [activeDraft.description, activeDraft.files, activeView, context?.pageTitle, context?.path, open, pathname]);

  const showHistory = React.useCallback(
    (key?: string | null) => {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setSelectedReportKey(
        key ||
          myBugs.data.find((item) => item.clarification.status === 'WAITING_REPORTER' || item.canReview)?.key ||
          myBugs.data[0]?.key ||
          null
      );
      setActiveView('history');
      setOpen(true);
      void myBugs.refresh();
      if (myBugs.unreadCount) void myBugs.markNotificationsRead();
    },
    [myBugs.data, myBugs.markNotificationsRead, myBugs.refresh, myBugs.unreadCount]
  );

  React.useEffect(() => {
    if (!enabled) return;
    const key = new URLSearchParams(window.location.search).get('bugReview');
    if (key && handledReviewLinkRef.current !== key) {
      handledReviewLinkRef.current = key;
      showHistory(key.toUpperCase());
    }
  }, [enabled, showHistory]);

  React.useEffect(() => {
    const next = myBugs.notifications.find((item) => !item.readAt && !announcedNotificationsRef.current.has(item.id));
    if (!next) return;
    announcedNotificationsRef.current.add(next.id);
    const isClarification = next.type.endsWith('CLARIFICATION_NEEDED');
    notification[isClarification ? 'warning' : 'success']({
      key: `bug-report-${next.id}`,
      message: next.title,
      description: next.message,
      duration: 0,
      btn: (
        <Button type="primary" size="small" onClick={() => showHistory(next.reportKey)}>
          {isClarification ? 'Trả lời Agent' : 'Xem & duyệt'}
        </Button>
      ),
    });
  }, [myBugs.notifications, showHistory]);

  React.useEffect(() => {
    if (!launcherPreferencesReady || dragging) return;
    if (savedLauncherX === null || savedLauncherY === null) {
      setLauncherPosition(null);
      return;
    }
    const next = clampBugReportLauncherPosition(
      { x: savedLauncherX, y: savedLauncherY },
      { width: window.innerWidth, height: window.innerHeight },
      LAUNCHER_SIZE,
      LAUNCHER_MARGIN
    );
    setLauncherPosition(next);
    if (next.x !== savedLauncherX || next.y !== savedLauncherY) {
      persistLauncherPosition(next);
    }
  }, [dragging, launcherPreferencesReady, persistLauncherPosition, savedLauncherX, savedLauncherY]);

  React.useEffect(() => {
    if (!enabled) return;
    const onResize = () => {
      setLauncherPosition((current) => {
        if (!current) return current;
        const next = clampBugReportLauncherPosition(
          current,
          { width: window.innerWidth, height: window.innerHeight },
          LAUNCHER_SIZE,
          LAUNCHER_MARGIN
        );
        if (next.x !== current.x || next.y !== current.y) persistLauncherPosition(next);
        return next;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [enabled, persistLauncherPosition]);

  const closeReporter = React.useCallback(() => {
    if (submitting) return;
    setOpen(false);
    window.setTimeout(() => previousFocusRef.current?.focus?.(), 0);
  }, [submitting]);

  const beginLauncherDrag = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const origin = { x: bounds.left, y: bounds.top };
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: origin.x,
      originY: origin.y,
      moved: false,
      latest: origin,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const moveLauncher = React.useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;
    drag.moved = true;
    setDragging(true);
    drag.latest = clampBugReportLauncherPosition(
      { x: drag.originX + deltaX, y: drag.originY + deltaY },
      { width: window.innerWidth, height: window.innerHeight },
      LAUNCHER_SIZE,
      LAUNCHER_MARGIN
    );
    setLauncherPosition(drag.latest);
  }, []);

  const finishLauncherDrag = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (drag.moved) {
        suppressClickUntilRef.current = Date.now() + 300;
        persistLauncherPosition(drag.latest);
      }
      dragRef.current = null;
      setDragging(false);
    },
    [persistLauncherPosition]
  );

  const addFiles = async (selected: File[], draftView: RequestDraftView) => {
    const available = Math.max(0, MAX_ATTACHMENTS - drafts[draftView].files.length);
    if (!available) {
      message.warning('Mỗi yêu cầu nhận tối đa 3 ảnh.');
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
      if (selected.length > available) message.warning('Chỉ 3 ảnh đầu tiên được giữ lại.');
    } finally {
      setDrafts((current) => updateRequestDraft(current, draftView, { processingImages: false }));
    }
  };

  const submit = async () => {
    const draftView: RequestDraftView = activeView === 'feature' ? 'feature' : 'bug';
    const draft = drafts[draftView];
    const normalizedDescription = draft.description.trim();
    const requestType: BugReportRequestType = draftView === 'feature' ? 'FEATURE' : 'BUG';
    const normalizedFeatureReason = featureReason.trim();
    if (normalizedDescription.length < 3 || !context) return;
    setSubmitting(true);
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
        context,
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
      setSelectedReportKey(result.key);
      await myBugs.refresh();
      setActiveView('history');
    } catch (error: any) {
      message.error(error?.response?.data?.message || error?.message || 'Không thể gửi yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!enabled) return null;

  return (
    <>
      {launcherPreferencesReady && preferences.visible && !open && !workflowOpen && !externalWorkflowOpen ? (
        <HeaderActionIndicator
          variant="count"
          count={myBugs.actionRequiredCount || myBugs.unreadCount}
          surface="accent"
          style={{
            position: 'fixed',
            left: launcherPosition ? launcherPosition.x : 'max(12px, env(safe-area-inset-left))',
            top: launcherPosition ? launcherPosition.y : undefined,
            bottom: launcherPosition ? undefined : 'max(14px, env(safe-area-inset-bottom))',
            zIndex: 12000,
            width: LAUNCHER_SIZE,
            height: LAUNCHER_SIZE,
            transition: dragging ? 'none' : undefined,
          }}
        >
          <Button
            type="primary"
            shape="circle"
            aria-label={
              myBugs.actionRequiredCount
                ? `Phản hồi mOS — ${myBugs.actionRequiredCount} yêu cầu đang chờ bạn phản hồi hoặc xác nhận`
                : myBugs.unreadCount
                  ? `Phản hồi mOS — ${myBugs.unreadCount} cập nhật mới đang chờ bạn xem`
                  : 'Phản hồi mOS'
            }
            title={
              myBugs.actionRequiredCount
                ? `${myBugs.actionRequiredCount} yêu cầu đang chờ bạn phản hồi hoặc xác nhận — bấm để mở Yêu cầu của tôi, kéo để di chuyển`
                : myBugs.unreadCount
                  ? `${myBugs.unreadCount} cập nhật mới đang chờ bạn xem — bấm để mở Yêu cầu của tôi, kéo để di chuyển`
                  : 'Báo lỗi hoặc yêu cầu chức năng — kéo để di chuyển'
            }
            data-bug-report-launcher
            onPointerDown={beginLauncherDrag}
            onPointerMove={moveLauncher}
            onPointerUp={finishLauncherDrag}
            onPointerCancel={finishLauncherDrag}
            onClick={(event) => {
              if (Date.now() < suppressClickUntilRef.current) {
                event.preventDefault();
                return;
              }
              if (myBugs.actionRequiredCount || myBugs.unreadCount) {
                showHistory(
                  myBugs.data.find((item) => item.clarification.status === 'WAITING_REPORTER' || item.canReview)?.key ||
                    myBugs.notifications.find((item) => !item.readAt)?.reportKey
                );
                return;
              }
              showReporter(null);
            }}
            icon={<AppIcon icon={MessageSquareWarning} size="sm" />}
            style={{
              width: LAUNCHER_SIZE,
              minWidth: LAUNCHER_SIZE,
              height: LAUNCHER_SIZE,
              cursor: dragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              boxShadow: token.boxShadowSecondary,
            }}
          />
        </HeaderActionIndicator>
      ) : null}

      <AdaptiveModal
        intent={activeView === 'history' ? 'data' : 'form'}
        title="Phản hồi mOS"
        open={open}
        onCancel={closeReporter}
        maskClosable={false}
        keyboard={!submitting}
        zIndex={12010}
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
                  disabled={activeDraft.description.trim().length < 3 || activeDraft.processingImages}
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
                  Có gì đó không hoạt động
                </span>
              ),
            },
            {
              key: 'feature',
              label: (
                <span className="inline-flex items-center gap-2">
                  <AppIcon icon={Lightbulb} size="sm" />
                  Tôi muốn làm việc này tốt hơn
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
                <IconButton label="Mở mOS Inbox" icon={Inbox} tone="text" href="/dashboard/bug-reports" />
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
            onSelect={setSelectedReportKey}
            onRefresh={myBugs.refresh}
            onReview={myBugs.review}
            onComment={myBugs.comment}
          />
        ) : (
          <div
            className="space-y-5"
            onPaste={(event) => {
              const pasted = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'));
              if (pasted.length) {
                event.preventDefault();
                void addFiles(pasted, activeRequestView);
              }
            }}
          >
            {activeView === 'feature' ? (
              <Alert
                type="info"
                showIcon
                message="Bạn chỉ cần mô tả nhu cầu — AI Agent sẽ hỏi tiếp nếu còn thiếu"
                description="Bạn không cần viết đặc tả kỹ thuật. mOS chỉ hỏi thêm khi thật sự cần để hiểu nhu cầu."
              />
            ) : null}
            {classification && ['FAILED', 'EXPIRED'].includes(classification.status) ? (
              <Alert
                type={
                  classification.status === 'COMPLETED'
                    ? 'success'
                    : classification.status === 'FAILED' || classification.status === 'EXPIRED'
                      ? 'warning'
                      : 'info'
                }
                showIcon
                message="Bạn vẫn có thể gửi yêu cầu ngay"
                description={classification.fallbackReason || 'mOS sẽ xem lại loại yêu cầu sau khi bạn gửi.'}
              />
            ) : null}
            <GuidedRequestConversation
              key={`${activeRequestView}:${activeDraft.description}`}
              description={activeDraft.description}
              requestType={activeView === 'feature' ? 'FEATURE' : 'BUG'}
              path={context?.path || pathname}
              pageTitle={context?.pageTitle || document.title}
              attachmentCount={activeDraft.files.length}
              onSession={setConversationSessionId}
              onTypeRecommendation={(type) => switchRequestView(type === 'FEATURE' ? 'feature' : 'bug')}
              onApply={(value) => {
                setDrafts((current) => updateRequestDraft(current, activeRequestView, { description: value }));
              }}
            />
            <div>
              <label htmlFor={descriptionFieldId} className="mb-2 block text-sm font-semibold">
                {activeView === 'feature' ? 'Bạn muốn mOS giúp làm việc gì?' : 'Bạn đang gặp vấn đề gì?'}
              </label>
              <Input.TextArea
                key={activeRequestView}
                id={descriptionFieldId}
                autoFocus
                value={activeDraft.description}
                onChange={(event) => {
                  const nextDescription = event.target.value;
                  setDrafts((current) =>
                    updateRequestDraft(current, activeRequestView, { description: nextDescription })
                  );
                  setConversationSessionId(null);
                }}
                maxLength={2000}
                showCount
                rows={5}
                placeholder={
                  activeView === 'feature'
                    ? 'Ví dụ: Tôi muốn xem lịch sử khách đã đổi lịch ngay trong hồ sơ…'
                    : 'Ví dụ: Tôi bấm Lưu nhưng popup vẫn đứng yên…'
                }
              />
              <p className="mb-0 mt-6 text-xs" style={{ color: token.colorTextSecondary }}>
                {activeView === 'feature'
                  ? 'Không cần viết đặc tả kỹ thuật. Hãy mô tả công việc theo cách bạn đang làm hằng ngày.'
                  : 'mOS tự đính kèm trang, popup, phiên bản và lỗi kỹ thuật gần nhất. Bạn không cần biết thuật ngữ kỹ thuật.'}
              </p>
            </div>

            <Collapse
              activeKey={expertDetailsExpanded ? ['expert'] : []}
              onChange={(keys) => setExpertDetailsExpanded(keys.includes('expert'))}
              items={[
                {
                  key: 'expert',
                  label: 'Thêm chi tiết cho người quen kỹ thuật',
                  children: (
                    <div className="space-y-4">
                      <p className="m-0 text-sm" style={{ color: token.colorTextSecondary }}>
                        Không bắt buộc. Chi tiết này giúp mOS hiểu và xử lý nhanh hơn, nhưng bạn vẫn gửi được ngay.
                      </p>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <label htmlFor="mos-expert-reproduction" className="mb-2 block text-sm font-semibold">
                            Bước tái hiện
                          </label>
                          <Input.TextArea
                            id="mos-expert-reproduction"
                            value={activeDraft.expertDetails.reproductionSteps || ''}
                            onChange={(event) => updateExpertDetails({ reproductionSteps: event.target.value || null })}
                            maxLength={1200}
                            rows={3}
                            placeholder="Ví dụ: Mở Danh sách lỗi → zoom browser 150% → cuộn xuống cuối trang"
                          />
                        </div>
                        <div>
                          <label htmlFor="mos-expert-expected" className="mb-2 block text-sm font-semibold">
                            Kết quả mong đợi
                          </label>
                          <Input.TextArea
                            id="mos-expert-expected"
                            value={activeDraft.expertDetails.expectedResult || ''}
                            onChange={(event) => updateExpertDetails({ expectedResult: event.target.value || null })}
                            maxLength={1200}
                            rows={2}
                          />
                        </div>
                        <div>
                          <label htmlFor="mos-expert-actual" className="mb-2 block text-sm font-semibold">
                            Kết quả thực tế
                          </label>
                          <Input.TextArea
                            id="mos-expert-actual"
                            value={activeDraft.expertDetails.actualResult || ''}
                            onChange={(event) => updateExpertDetails({ actualResult: event.target.value || null })}
                            maxLength={1200}
                            rows={2}
                          />
                        </div>
                        <div>
                          <label htmlFor="mos-expert-impact" className="mb-2 block text-sm font-semibold">
                            Mức ảnh hưởng
                          </label>
                          <Select
                            id="mos-expert-impact"
                            aria-label="Mức ảnh hưởng"
                            value={activeDraft.expertDetails.impact || undefined}
                            onChange={(impact) =>
                              updateExpertDetails({ impact: (impact as BugReportExpertImpact | undefined) ?? null })
                            }
                            options={EXPERT_IMPACT_OPTIONS}
                            placeholder="Chọn nếu bạn biết"
                            allowClear
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label htmlFor="mos-expert-environment" className="mb-2 block text-sm font-semibold">
                            Môi trường
                          </label>
                          <Input
                            id="mos-expert-environment"
                            value={activeDraft.expertDetails.environment || ''}
                            onChange={(event) => updateExpertDetails({ environment: event.target.value || null })}
                            maxLength={500}
                            placeholder="Ví dụ: Chrome 124 · 4K · zoom 150%"
                          />
                        </div>
                        <div>
                          <label htmlFor="mos-expert-workaround" className="mb-2 block text-sm font-semibold">
                            Cách làm tạm thời
                          </label>
                          <Input
                            id="mos-expert-workaround"
                            value={activeDraft.expertDetails.workaround || ''}
                            onChange={(event) => updateExpertDetails({ workaround: event.target.value || null })}
                            maxLength={1200}
                            placeholder="Nếu có"
                          />
                        </div>
                        <div>
                          <label htmlFor="mos-expert-related" className="mb-2 block text-sm font-semibold">
                            Ticket liên quan
                          </label>
                          <Input
                            id="mos-expert-related"
                            value={activeDraft.expertDetails.relatedTicket || ''}
                            onChange={(event) => updateExpertDetails({ relatedTicket: event.target.value || null })}
                            maxLength={120}
                            placeholder="Ví dụ: MOS-BUG-17"
                          />
                        </div>
                      </div>
                      {activeView === 'feature' ? (
                        <div className="grid grid-cols-1 gap-4 border-t pt-4 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <label htmlFor="mos-feature-reason" className="mb-2 block text-sm font-semibold">
                              Vì sao cải tiến này cần thiết?
                            </label>
                            <Input.TextArea
                              id="mos-feature-reason"
                              value={featureReason}
                              onChange={(event) => setFeatureReason(event.target.value)}
                              maxLength={2000}
                              rows={3}
                              placeholder="Hiện tại bạn phải làm thủ công, mất thời gian hoặc dễ sai ở bước nào?"
                            />
                          </div>
                          <div>
                            <label htmlFor="mos-feature-audience" className="mb-2 block text-sm font-semibold">
                              Ai sẽ sử dụng?
                            </label>
                            <Select
                              id="mos-feature-audience"
                              aria-label="Ai sẽ sử dụng chức năng"
                              value={featureAudience}
                              onChange={setFeatureAudience}
                              options={FEATURE_AUDIENCE_OPTIONS}
                              className="w-full"
                            />
                          </div>
                          <div>
                            <label htmlFor="mos-feature-outcome" className="mb-2 block text-sm font-semibold">
                              Kết quả mong muốn
                            </label>
                            <Input
                              id="mos-feature-outcome"
                              value={featureDesiredOutcome}
                              onChange={(event) => setFeatureDesiredOutcome(event.target.value)}
                              maxLength={2000}
                              placeholder="Ví dụ: Giảm còn 1 lần bấm"
                            />
                          </div>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                        <span className="text-sm" style={{ color: token.colorTextSecondary }}>
                          Độ đủ thông tin · {activeDraft.files.length ? 'đã có ảnh' : 'ảnh là tùy chọn'} · mOS tự lưu
                          môi trường.
                        </span>
                        <Checkbox
                          checked={rememberExpertDetails}
                          onChange={(event) => setExpertDetailsPreference(event.target.checked)}
                        >
                          Lưu cách nhập chi tiết này cho lần sau
                        </Checkbox>
                      </div>
                    </div>
                  ),
                },
              ]}
            />

            <Upload.Dragger
              key={`${activeRequestView}-upload`}
              accept="image/jpeg,image/png,image/webp"
              multiple
              showUploadList={false}
              disabled={activeDraft.processingImages || activeDraft.files.length >= MAX_ATTACHMENTS}
              beforeUpload={(file, selected) => {
                if (file.uid === selected[0]?.uid) void addFiles(selected as File[], activeRequestView);
                return Upload.LIST_IGNORE;
              }}
            >
              <div className="flex flex-col items-center gap-2 py-2">
                <AppIcon icon={ImagePlus} size="lg" style={{ color: token.colorTextSecondary }} />
                <span className="text-sm font-medium">
                  {activeView === 'feature' ? 'Thêm ảnh minh họa nhu cầu' : 'Thêm ảnh chụp lỗi nếu cần'}
                </span>
                <span className="text-xs" style={{ color: token.colorTextSecondary }}>
                  Không bắt buộc · tối đa 3 ảnh · mỗi ảnh 3 MB
                </span>
              </div>
            </Upload.Dragger>

            {activeDraft.files.length > 0 && (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {activeDraft.files.map((file, index) => (
                  <div
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex min-w-0 items-center gap-3 rounded-lg border p-2"
                    style={{ borderColor: token.colorBorderSecondary, background: token.colorFillQuaternary }}
                  >
                    <BugReportFileThumbnail file={file} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium" title={file.name}>
                        {file.name}
                      </div>
                      <div className="mt-1 text-xs" style={{ color: token.colorTextSecondary }}>
                        {(file.size / 1024).toFixed(0)} KB · bấm ảnh để xem
                      </div>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      aria-label={`Xóa ảnh ${file.name}`}
                      icon={<AppIcon icon={X} size="sm" />}
                      onClick={() =>
                        setDrafts((current) =>
                          updateRequestDraft(current, activeRequestView, (draft) => ({
                            files: draft.files.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </AdaptiveModal>
      <BugReportWorkflowModal open={workflowOpen} onClose={() => setWorkflowOpen(false)} zIndex={12040} />
    </>
  );
}

export default BugReportSurface;
