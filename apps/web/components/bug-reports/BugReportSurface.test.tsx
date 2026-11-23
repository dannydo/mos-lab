import React from 'react';
import { ConfigProvider } from 'antd';
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

vi.mock('../ui/rich-text', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ui/rich-text')>();
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
    mockState.myBugs.refresh.mockClear();
    mockState.myBugs.markNotificationsRead.mockClear();
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

  it('opens target ticket history and dismisses notification when clicking "Trả lời Agent" (MOS-BUG-250)', async () => {
    mockState.myBugs.notifications = [
      {
        id: 901,
        reportId: 250,
        reportKey: 'MOS-BUG-250',
        type: 'BUG_CLARIFICATION_NEEDED',
        title: 'Cần bạn trả lời thêm — MOS-BUG-250',
        message: 'Agent cần bạn xác nhận thêm thông tin.',
        actionUrl: '/dashboard/today?bugReview=MOS-BUG-250',
        readAt: null,
        createdAt: '2026-11-19T14:00:00.000Z',
      },
    ];

    render(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <BugReportSurface />
      </ConfigProvider>
    );

    const replyBtn = await screen.findByRole('button', { name: 'Trả lời Agent' });
    fireEvent.click(replyBtn);

    expect(await screen.findByTestId('mock-my-bug-reports-panel')).toHaveTextContent('history:MOS-BUG-250');
    expect(mockState.myBugs.refresh).toHaveBeenCalledWith({ force: true });
    expect(mockState.myBugs.markNotificationsRead).toHaveBeenCalledWith([901]);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Trả lời Agent' })).toBeNull();
    });
  });

  it('opens target ticket history and dismisses notification when clicking "Xem & duyệt"', async () => {
    mockState.myBugs.notifications = [
      {
        id: 902,
        reportId: 251,
        reportKey: 'MOS-BUG-251',
        type: 'BUG_FIXED_REVIEW',
        title: 'Đã xử lý xong — MOS-BUG-251',
        message: 'Vui lòng kiểm tra kết quả.',
        actionUrl: '/dashboard/today?bugReview=MOS-BUG-251',
        readAt: null,
        createdAt: '2026-11-19T14:00:00.000Z',
      },
    ];

    render(
      <ConfigProvider theme={{ token: { motion: false } }}>
        <BugReportSurface />
      </ConfigProvider>
    );

    const reviewBtn = await screen.findByRole('button', { name: 'Xem & duyệt' });
    fireEvent.click(reviewBtn);

    expect(await screen.findByTestId('mock-my-bug-reports-panel')).toHaveTextContent('history:MOS-BUG-251');
    expect(mockState.myBugs.refresh).toHaveBeenCalledWith({ force: true });
    expect(mockState.myBugs.markNotificationsRead).toHaveBeenCalledWith([902]);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Xem & duyệt' })).toBeNull();
    });
  });
});
