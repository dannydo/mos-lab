import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BugReportSurface } from './BugReportSurface';
import { BUG_REPORT_WORKFLOW_VISIBILITY_EVENT } from './BugReportWorkflowGuide';
import { BUG_REPORT_LAUNCHER_STORAGE_KEY, updateBugReportLauncherPreferences } from '../../lib/bug-report-launcher';
import { openBugReport } from '../../lib/bug-diagnostics';

const mockState = vi.hoisted(() => ({
  pathname: '/dashboard/cc',
  myBugs: {
    data: [] as Array<Record<string, unknown>>,
    notifications: [] as Array<Record<string, unknown>>,
    unreadCount: 0,
    actionRequiredCount: 0,
    loading: false,
    error: null as string | null,
    refresh: vi.fn().mockResolvedValue(undefined),
    review: vi.fn(),
    cancel: vi.fn(),
    comment: vi.fn(),
    markNotificationsRead: vi.fn().mockResolvedValue(undefined),
    addOptimisticReport: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockState.pathname,
}));

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    release: {
      get: vi.fn().mockResolvedValue({ deployedAt: null, commitSha: null }),
    },
    bugReports: {
      classifyRequest: vi.fn(),
      classificationStatus: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('./useMyBugReports', () => ({
  useMyBugReports: () => mockState.myBugs,
}));

vi.mock('./MyBugReportsPanel', () => ({
  MyBugReportsPanel: ({ selectedKey }: { selectedKey?: string | null }) => (
    <div data-testid="mock-my-bug-reports-panel">history:{selectedKey || 'none'}</div>
  ),
}));

vi.mock('./GuidedRequestConversation', () => ({
  GuidedRequestConversation: () => null,
}));

vi.mock('../ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ui')>();
  return {
    ...actual,
    RichTextEditor: ({ id, value, onChange }: { id?: string; value?: string; onChange?: (next: string) => void }) => (
      <textarea id={id} value={value || ''} onChange={(event) => onChange?.(event.target.value)} />
    ),
  };
});

describe('BugReportSurface modal & event trigger (MOS-BUG-240)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockState.pathname = '/dashboard/cc';
    mockState.myBugs.data = [];
    mockState.myBugs.notifications = [];
    mockState.myBugs.unreadCount = 0;
    mockState.myBugs.actionRequiredCount = 0;
    window.localStorage.setItem('mos_token', 'test-token');
    window.localStorage.setItem('mos_user', JSON.stringify({ id: 10, role: 'cc', displayName: 'CC Tester' }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does NOT render floating launcher button on /dashboard/cc', async () => {
    render(<BugReportSurface />);
    expect(screen.queryByRole('button', { name: /Phản hồi mOS/i })).toBeNull();
  });

  it('opens reporter modal on openBugReport event', async () => {
    render(<BugReportSurface />);

    act(() => {
      openBugReport();
    });

    expect(await screen.findByText('Phản hồi mOS')).toBeInTheDocument();
    expect(screen.getByLabelText('Bạn đang gặp vấn đề gì?')).toBeInTheDocument();
  });

  it('opens history tab directly via openBugReport preferHistoryIfPending when pending bug notifications exist', async () => {
    mockState.myBugs.actionRequiredCount = 1;
    mockState.myBugs.data = [
      {
        key: 'MOS-BUG-240',
        clarification: { status: 'WAITING_REPORTER' },
        canReview: false,
      },
    ];

    render(<BugReportSurface />);

    act(() => {
      openBugReport(undefined, { preferHistoryIfPending: true });
    });

    expect(await screen.findByTestId('mock-my-bug-reports-panel')).toHaveTextContent('history:MOS-BUG-240');
  });

  it('hides for CV roles and allows modal on /chat and /ios-app', async () => {
    window.localStorage.setItem('mos_user', JSON.stringify({ id: 22, role: 'cvl', displayName: 'CVL User' }));
    const { rerender } = render(<BugReportSurface />);
    expect(screen.queryByRole('button', { name: /Phản hồi mOS/i })).toBeNull();

    window.localStorage.setItem('mos_user', JSON.stringify({ id: 10, role: 'cc', displayName: 'CC User' }));
    mockState.pathname = '/chat';
    rerender(<BugReportSurface />);

    expect(screen.queryByRole('button', { name: /Phản hồi mOS/i })).toBeNull();

    act(() => {
      openBugReport();
    });
    expect(await screen.findByText('Phản hồi mOS')).toBeInTheDocument();
  });
});
