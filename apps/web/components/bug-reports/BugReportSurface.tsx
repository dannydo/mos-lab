'use client';

import React from 'react';
import { Alert, Badge, Button, Image, Input, Select, Tabs, Tooltip, Upload, message, notification, theme } from 'antd';
import { CircleHelp, ImagePlus, Inbox, Lightbulb, ListChecks, MessageSquareWarning, Send, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type {
  BugReportClientError,
  BugReportContext,
  BugReportRequestType,
  CreateBugReportAttachmentRequest,
  FeatureRequestAudience,
} from '@mos-lab/shared';
import { isAdminOrSuperAdminRole } from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import { clampBugReportLauncherPosition, type BugReportLauncherPosition } from '../../lib/bug-report-launcher';
import { captureBugReportContext, OPEN_BUG_REPORT_EVENT, recordClientError } from '../../lib/bug-diagnostics';
import { compressImageForUpload, fileDataBase64 } from '../../lib/image-utils';
import { safeStorage } from '../../lib/safe-storage';
import { AdaptiveModal, AdaptiveOverlayFooter, AppIcon, HeaderActionIndicator, IconText } from '../ui';
import { MyBugReportsPanel } from './MyBugReportsPanel';
import { BUG_REPORT_WORKFLOW_VISIBILITY_EVENT, BugReportWorkflowModal } from './BugReportWorkflowGuide';
import { createRequestDrafts, emptyRequestDraft, updateRequestDraft, type RequestDraftView } from './bug-report-drafts';
import { useBugReportLauncherPreferences } from './useBugReportLauncherPreferences';
import { useMyBugReports } from './useMyBugReports';

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024;
const LAUNCHER_SIZE = 44;
const LAUNCHER_MARGIN = 12;
const DRAG_THRESHOLD = 4;

const FEATURE_AUDIENCE_OPTIONS: Array<{ value: FeatureRequestAudience; label: string }> = [
  { value: 'SELF', label: 'Cá nhân tôi' },
  { value: 'TEAM', label: 'Đội / bộ phận của tôi' },
  { value: 'ALL_STAFF', label: 'Tất cả nhân viên' },
  { value: 'CUSTOMER', label: 'Khách hàng' },
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
  const [submitting, setSubmitting] = React.useState(false);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [canViewInbox, setCanViewInbox] = React.useState(false);
  const [release, setRelease] = React.useState<ReleaseMarker | null>(null);
  const [context, setContext] = React.useState<BugReportContext | null>(null);
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
    if (
      normalizedDescription.length < 3 ||
      !context ||
      (requestType === 'FEATURE' && normalizedFeatureReason.length < 3)
    )
      return;
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
        featureRequest:
          requestType === 'FEATURE'
            ? {
                reason: normalizedFeatureReason,
                audience: featureAudience,
                desiredOutcome: featureDesiredOutcome.trim() || null,
              }
            : null,
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
                  disabled={
                    activeDraft.description.trim().length < 3 ||
                    activeDraft.processingImages ||
                    (activeView === 'feature' && featureReason.trim().length < 3)
                  }
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
            else setActiveView(key === 'feature' ? 'feature' : 'bug');
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
                  Yêu cầu chức năng
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
                <Tooltip title="Mở mOS Inbox">
                  <Link
                    href="/dashboard/bug-reports"
                    aria-label="Mở mOS Inbox"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg transition-opacity hover:opacity-80"
                    style={{ color: token.colorText }}
                  >
                    <AppIcon icon={Inbox} size="sm" />
                  </Link>
                </Tooltip>
              ) : null}
              <Tooltip title="Xem workflow xử lý yêu cầu">
                <Button
                  type="text"
                  aria-label="Xem workflow xử lý yêu cầu"
                  icon={<AppIcon icon={CircleHelp} size="sm" />}
                  onClick={() => setWorkflowOpen(true)}
                />
              </Tooltip>
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
                description="Sau khi yêu cầu đủ rõ, Danny là người quyết định cuối cùng có đưa chức năng vào hàng triển khai hay không."
              />
            ) : null}
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

            {activeView === 'feature' ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="mos-feature-reason" className="mb-2 block text-sm font-semibold">
                    Vì sao chức năng này cần thiết?
                  </label>
                  <Input.TextArea
                    id="mos-feature-reason"
                    value={featureReason}
                    onChange={(event) => setFeatureReason(event.target.value)}
                    maxLength={2000}
                    showCount
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
                    Kết quả mong muốn <span style={{ color: token.colorTextSecondary }}>(không bắt buộc)</span>
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
