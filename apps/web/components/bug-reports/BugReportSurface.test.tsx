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
    RichTextEditor: ({
      id,
      value,
      onChange,
    }: {
      id?: string;
      value?: string;
      onChange?: (next: string) => void;
    }) => (
      <textarea
        id={id}
        value={value || ''}
        onChange={(event) => onChange?.(event.target.value)}
      />
    ),
  };
});

describe('BugReportSurface floating quick-open launcher (MOS-BUG-240)', () => {
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

  it('renders the floating launcher button on /dashboard/cc and opens reporter modal on click', async () => {
    render(<BugReportSurface />);

    const launcher = await screen.findByRole('button', { name: 'Phản hồi mOS' });
    expect(launcher).toHaveAttribute('data-bug-report-launcher');

    fireEvent.click(launcher);

    expect(await screen.findByText('Phản hồi mOS')).toBeInTheDocument();
    expect(screen.getByLabelText('Bạn đang gặp vấn đề gì?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Phản hồi mOS' })).toBeNull();
  });

  it('opens history tab directly when pending bug notifications exist', async () => {
    mockState.myBugs.actionRequiredCount = 1;
    mockState.myBugs.data = [
      {
        key: 'MOS-BUG-240',
        clarification: { status: 'WAITING_REPORTER' },
        canReview: false,
      },
    ];

    render(<BugReportSurface />);

    const launcher = await screen.findByRole('button', {
      name: 'Phản hồi mOS — 1 yêu cầu đang chờ bạn phản hồi hoặc xác nhận',
    });
    fireEvent.click(launcher);

    expect(await screen.findByTestId('mock-my-bug-reports-panel')).toHaveTextContent('history:MOS-BUG-240');
  });

  it('respects visibility toggle preference and workflow modal visibility events', async () => {
    render(<BugReportSurface />);

    expect(await screen.findByRole('button', { name: 'Phản hồi mOS' })).toBeInTheDocument();

    act(() => {
      updateBugReportLauncherPreferences({ visible: false });
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Phản hồi mOS' })).toBeNull();
    });

    act(() => {
      updateBugReportLauncherPreferences({ visible: true });
    });
    expect(await screen.findByRole('button', { name: 'Phản hồi mOS' })).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new CustomEvent(BUG_REPORT_WORKFLOW_VISIBILITY_EVENT, { detail: { open: true } }));
    });
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Phản hồi mOS' })).toBeNull();
    });

    act(() => {
      window.dispatchEvent(new CustomEvent(BUG_REPORT_WORKFLOW_VISIBILITY_EVENT, { detail: { open: false } }));
    });
    expect(await screen.findByRole('button', { name: 'Phản hồi mOS' })).toBeInTheDocument();
  });

  it('persists dragged position without firing click', async () => {
    render(<BugReportSurface />);

    const launcher = await screen.findByRole('button', { name: 'Phản hồi mOS' });
    vi.spyOn(launcher, 'getBoundingClientRect').mockReturnValue({
      left: 12,
      top: 700,
      right: 56,
      bottom: 744,
      width: 44,
      height: 44,
      x: 12,
      y: 700,
      toJSON: () => ({}),
    });

    fireEvent.pointerDown(launcher, { button: 0, pointerId: 1, clientX: 30, clientY: 720 });
    fireEvent.pointerMove(launcher, { pointerId: 1, clientX: 130, clientY: 520 });
    fireEvent.pointerUp(launcher, { pointerId: 1, clientX: 130, clientY: 520 });
    fireEvent.click(launcher);

    expect(screen.queryByLabelText('Bạn đang gặp vấn đề gì?')).toBeNull();
    const persisted = JSON.parse(window.localStorage.getItem(BUG_REPORT_LAUNCHER_STORAGE_KEY) || '{}');
    expect(persisted).toEqual({
      visible: true,
      position: { x: 112, y: 500 },
    });
  });

  it('hides floating launcher for CV roles and still allows modal on /chat and /ios-app', async () => {
    window.localStorage.setItem('mos_user', JSON.stringify({ id: 22, role: 'cvl', displayName: 'CVL User' }));
    const { rerender } = render(<BugReportSurface />);
    expect(screen.queryByRole('button', { name: 'Phản hồi mOS' })).toBeNull();

    window.localStorage.setItem('mos_user', JSON.stringify({ id: 10, role: 'cc', displayName: 'CC User' }));
    mockState.pathname = '/chat';
    rerender(<BugReportSurface />);

    expect(screen.queryByRole('button', { name: 'Phản hồi mOS' })).toBeNull();

    act(() => {
      openBugReport();
    });
    expect(await screen.findByText('Phản hồi mOS')).toBeInTheDocument();
  });
});
