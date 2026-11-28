'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Button, notification as notificationStatic } from 'antd';
import { usePathname } from 'next/navigation';
import {
  BUG_REPORT_Z_INDEX,
  isAdminOrSuperAdminRole,
  isCvRole,
  type BugReportClientError,
  type BugReportContext,
} from '@mos-lab/shared';
import { apiClient } from '../../lib/api-client';
import {
  captureBugReportContext,
  OPEN_BUG_REPORT_EVENT,
  recordClientError,
  setBugReportBadgeSummary,
} from '../../lib/bug-diagnostics';
import { safeStorage } from '../../lib/safe-storage';
import type { BugReportActiveView } from './BugReportModalShell';
import { BUG_REPORT_WORKFLOW_VISIBILITY_EVENT, type ReleaseMarker } from './bug-report-surface.helpers';
import { useMyBugReports } from './useMyBugReports';

const BugReportModalShell = dynamic(() => import('./BugReportModalShell').then((m) => m.BugReportModalShell), {
  ssr: false,
});
const BugReportWorkflowModal = dynamic(() => import('./BugReportWorkflowGuide').then((m) => m.BugReportWorkflowModal), {
  ssr: false,
});

/**
 * Lightweight root portal listener for bug/feature reporting & notifications.
 * Heavy form, classification, and history panels load lazily only on first open.
 */
export function BugReportSurface() {
  const pathname = usePathname();
  const [notificationApi, notificationContextHolder] = notificationStatic.useNotification({
    maxCount: 3,
  });
  const [open, setOpen] = React.useState(false);
  const [hasOpenedModal, setHasOpenedModal] = React.useState(false);
  const [workflowOpen, setWorkflowOpen] = React.useState(false);
  const [_externalWorkflowOpen, setExternalWorkflowOpen] = React.useState(false);
  const [activeView, setActiveView] = React.useState<BugReportActiveView>('bug');
  const [selectedReportKey, setSelectedReportKey] = React.useState<string | null>(null);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [isCvAccount, setIsCvAccount] = React.useState(false);
  const [canViewInbox, setCanViewInbox] = React.useState(false);
  const [release, setRelease] = React.useState<ReleaseMarker | null>(null);
  const [context, setContext] = React.useState<BugReportContext | null>(null);
  const submittingRef = React.useRef(false);
  const previousFocusRef = React.useRef<HTMLElement | null>(null);
  const announcedNotificationsRef = React.useRef(new Set<number>());
  const handledReviewLinkRef = React.useRef<string | null>(null);

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
      setHasOpenedModal(true);
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
      setHasOpenedModal(true);
      setOpen(true);
      if (notificationId !== undefined) {
        notificationApi.destroy(`bug-report-${notificationId}`);
      } else {
        for (const item of myBugs.notifications) {
          if (!item.readAt) notificationApi.destroy(`bug-report-${item.id}`);
        }
      }
      const markReadPromise =
        notificationId !== undefined
          ? myBugs.markNotificationsRead([notificationId]).catch(() => {})
          : myBugs.unreadCount > 0
            ? myBugs.markNotificationsRead().catch(() => {})
            : Promise.resolve();
      void markReadPromise.finally(() => {
        void myBugs.refresh({ force: true });
      });
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
      const detail = (
        event as CustomEvent<{
          errorBoundary?: BugReportClientError;
          preferHistoryIfPending?: boolean;
          historyKey?: string;
        }>
      ).detail;
      if (detail?.historyKey) {
        showHistory(detail.historyKey.toUpperCase());
        return;
      }
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
    if (submittingRef.current) return;
    setOpen(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (url.searchParams.has('bugReview')) {
        url.searchParams.delete('bugReview');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    }
    window.setTimeout(() => previousFocusRef.current?.focus?.(), 0);
  }, []);

  if (!enabled) return null;

  return (
    <>
      {notificationContextHolder}
      {(hasOpenedModal || open) && (
        <BugReportModalShell
          open={open}
          activeView={activeView}
          selectedReportKey={selectedReportKey}
          context={context}
          release={release}
          pathname={normalizedPathname}
          canViewInbox={canViewInbox}
          myBugs={myBugs}
          onClose={closeReporter}
          onSelectReportKey={setSelectedReportKey}
          onSwitchView={setActiveView}
          onShowHistory={showHistory}
          onSubmittingChange={(nextSubmitting) => {
            submittingRef.current = nextSubmitting;
          }}
        />
      )}
      {workflowOpen && (
        <BugReportWorkflowModal
          open={workflowOpen}
          onClose={() => setWorkflowOpen(false)}
          zIndex={BUG_REPORT_Z_INDEX.WORKFLOW_MODAL}
        />
      )}
    </>
  );
}

export default BugReportSurface;
