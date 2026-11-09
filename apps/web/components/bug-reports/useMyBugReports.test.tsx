import { act, renderHook, waitFor } from '@testing-library/react';
import type { MarkBugReportNotificationsReadResponse, MyBugReportItem, MyBugReportsResponse, ReviewBugReportResponse } from '@mos-lab/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  mine: vi.fn(),
  markNotificationsRead: vi.fn(),
  review: vi.fn(),
  cancel: vi.fn(),
  comment: vi.fn(),
}));

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    bugReports: {
      mine: apiMocks.mine,
      markNotificationsRead: apiMocks.markNotificationsRead,
      review: apiMocks.review,
      cancel: apiMocks.cancel,
      comment: apiMocks.comment,
    },
  },
}));

import { useMyBugReports } from './useMyBugReports';

function makeMockBugItem(overrides?: Record<string, unknown>): MyBugReportItem {
  return {
    id: 197,
    key: 'MOS-BUG-197',
    title: 'Test bug',
    requestType: 'BUG',
    status: 'FIXED',
    featureRequest: null,
    expertDetails: null,
    description: 'Test bug description',
    priority: null,
    sourcePath: '/dashboard',
    overlay: null,
    attachmentCount: 0,
    commentCount: 0,
    reopen: null,
    agentProgress: { stage: 'FIXING', note: null, updatedAt: '2026-11-05T00:00:00Z' },
    implementation: null,
    nextAction: { actor: 'REPORTER', label: 'Xác nhận', detail: '', type: 'VERIFY_FIX', waitingSince: '2026-11-05T00:00:00Z' },
    reporter: { id: 1, displayName: 'Tester', role: 'cv' },
    approvedAt: null,
    timeline: { submittedAt: '2026-11-05T00:00:00Z', clarifiedAt: null, approvedAt: null, fixedAt: null, closedAt: null },
    reporterExperience: {
      state: 'READY_FOR_REVIEW',
      summary: 'mOS đã chuẩn bị kết quả để bạn kiểm tra.',
      label: 'Kiểm tra kết quả',
      nextAction: { label: 'Xác nhận', detail: '' },
      updates: [],
    },
    resolution: null,
    reviewUrl: '',
    canReview: true,
    canReopenUnchanged: true,
    comments: [],
    evidenceAttachments: [],
    clarification: { status: 'READY', summary: null, clarifiedAt: '2026-11-05T00:00:00Z' },
    updatedAt: '2026-11-05T00:00:00Z',
    createdAt: '2026-11-05T00:00:00Z',
    ...overrides,
  } as unknown as MyBugReportItem;
}

describe('useMyBugReports', () => {
  beforeEach(() => {
    apiMocks.mine.mockReset();
    apiMocks.markNotificationsRead.mockReset();
    apiMocks.review.mockReset();
    apiMocks.comment.mockReset();
  });

  it('keeps the action-required count after new notifications are marked read', async () => {
    const response: MyBugReportsResponse = {
      data: [],
      notifications: [],
      unreadCount: 1,
      actionRequiredCount: 1,
    };
    const markRead: MarkBugReportNotificationsReadResponse = {
      success: true,
      data: { updatedCount: 1 },
    };
    apiMocks.mine.mockResolvedValue(response);
    apiMocks.markNotificationsRead.mockResolvedValue(markRead);

    const { result } = renderHook(() => useMyBugReports(true));
    await waitFor(() => expect(result.current.actionRequiredCount).toBe(1));

    await act(async () => {
      await result.current.markNotificationsRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.actionRequiredCount).toBe(1);
  });

  it('optimistically updates ticket state and decrements actionRequiredCount on APPROVE review', async () => {
    const mockItem = makeMockBugItem();
    const initialResponse: MyBugReportsResponse = {
      data: [mockItem],
      notifications: [],
      unreadCount: 0,
      actionRequiredCount: 1,
    };

    const reviewResponse: ReviewBugReportResponse = {
      success: true,
      data: {
        ...mockItem,
        status: 'CLOSED',
      } as any,
    };

    const updatedResponse: MyBugReportsResponse = {
      data: [
        makeMockBugItem({
          status: 'CLOSED',
          canReview: false,
          canReopenUnchanged: false,
          reporterExperience: {
            ...mockItem.reporterExperience,
            state: 'COMPLETED',
            summary: 'Bạn đã xác nhận bản sửa hoạt động đúng.',
          },
        }),
      ],
      notifications: [],
      unreadCount: 0,
      actionRequiredCount: 0,
    };

    apiMocks.mine.mockResolvedValueOnce(initialResponse).mockResolvedValueOnce(updatedResponse);
    apiMocks.review.mockResolvedValue(reviewResponse);

    const { result } = renderHook(() => useMyBugReports(true));
    await waitFor(() => expect(result.current.data.length).toBe(1));
    expect(result.current.data[0].canReview).toBe(true);
    expect(result.current.actionRequiredCount).toBe(1);

    await act(async () => {
      await result.current.review(197, { decision: 'APPROVE' });
    });

    // Check optimistic state update
    expect(result.current.data[0].canReview).toBe(false);
    expect(result.current.data[0].canReopenUnchanged).toBe(false);
    expect(result.current.data[0].status).toBe('CLOSED');
    expect(result.current.data[0].reporterExperience.state).toBe('COMPLETED');
    expect(result.current.actionRequiredCount).toBe(0);
    expect(apiMocks.review).toHaveBeenCalledWith(197, { decision: 'APPROVE' });
  });

  it('optimistically updates ticket state to IN_PROGRESS on REOPEN review', async () => {
    const mockItem = makeMockBugItem();
    const initialResponse: MyBugReportsResponse = {
      data: [mockItem],
      notifications: [],
      unreadCount: 0,
      actionRequiredCount: 1,
    };

    const reviewResponse: ReviewBugReportResponse = {
      success: true,
      data: {
        ...mockItem,
        status: 'NEW',
      } as any,
    };

    const updatedResponse: MyBugReportsResponse = {
      data: [
        makeMockBugItem({
          status: 'NEW',
          canReview: false,
          canReopenUnchanged: false,
          reporterExperience: {
            ...mockItem.reporterExperience,
            state: 'IN_PROGRESS',
            label: 'Đang xử lý',
            summary: 'Đã nhận phản hồi của bạn; mOS đang kiểm tra và sửa lại.',
          },
        }),
      ],
      notifications: [],
      unreadCount: 0,
      actionRequiredCount: 0,
    };

    apiMocks.mine.mockResolvedValueOnce(initialResponse).mockResolvedValueOnce(updatedResponse);
    apiMocks.review.mockResolvedValue(reviewResponse);

    const { result } = renderHook(() => useMyBugReports(true));
    await waitFor(() => expect(result.current.data.length).toBe(1));

    await act(async () => {
      await result.current.review(197, { decision: 'REOPEN', note: 'Vẫn còn lỗi', reopenIntent: 'DETAILS', attachments: [] });
    });

    expect(result.current.data[0].canReview).toBe(false);
    expect(result.current.data[0].status).toBe('NEW');
    expect(result.current.data[0].reporterExperience.state).toBe('IN_PROGRESS');
    expect(result.current.data[0].reporterExperience.label).toBe('Đang xử lý');
    expect(result.current.actionRequiredCount).toBe(0);
  });

  it('prepends an optimistic report immediately via addOptimisticReport', async () => {
    const initialResponse: MyBugReportsResponse = {
      data: [makeMockBugItem({ id: 100, key: 'MOS-BUG-100' })],
      notifications: [],
      unreadCount: 0,
      actionRequiredCount: 0,
    };
    apiMocks.mine.mockResolvedValue(initialResponse);

    const { result } = renderHook(() => useMyBugReports(true));
    await waitFor(() => expect(result.current.data.length).toBe(1));

    const newReport = makeMockBugItem({ id: 205, key: 'MOS-BUG-205', title: 'New bug' });
    act(() => {
      result.current.addOptimisticReport(newReport);
    });

    expect(result.current.data.length).toBe(2);
    expect(result.current.data[0].key).toBe('MOS-BUG-205');
  });

  it('prevents concurrent duplicate review calls for the same ticket', async () => {
    const mockItem = makeMockBugItem();
    const initialResponse: MyBugReportsResponse = {
      data: [mockItem],
      notifications: [],
      unreadCount: 0,
      actionRequiredCount: 1,
    };
    apiMocks.mine.mockResolvedValue(initialResponse);
    let resolveReview: (val: any) => void;
    apiMocks.review.mockImplementation(() => new Promise((resolve) => { resolveReview = resolve; }));

    const { result } = renderHook(() => useMyBugReports(true));
    await waitFor(() => expect(result.current.data.length).toBe(1));

    // Call review twice concurrently
    let p1: Promise<any>;
    let p2: Promise<any>;
    act(() => {
      p1 = result.current.review(197, { decision: 'APPROVE' });
      p2 = result.current.review(197, { decision: 'APPROVE' });
    });

    // Only 1 review API call should be fired
    expect(apiMocks.review).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveReview!({ success: true, data: { ...mockItem, status: 'CLOSED' } });
      await p1!;
      await p2!;
    });
  });

  it('optimistically updates ticket state to CANCELLED on cancel call', async () => {
    const item = makeMockBugItem({ id: 197, status: 'NEW' });
    const initialResponse: MyBugReportsResponse = {
      data: [item],
      notifications: [],
      unreadCount: 0,
      actionRequiredCount: 0,
    };
    const updatedResponse: MyBugReportsResponse = {
      data: [
        makeMockBugItem({
          id: 197,
          status: 'CANCELLED',
          canReview: false,
          canReopenUnchanged: false,
          canCancel: false,
          reporterExperience: {
            state: 'NOT_PROCEEDING',
            label: 'Đã huỷ',
            summary: 'Bạn đã huỷ yêu cầu: Báo nhầm không phải lỗi',
            nextAction: { label: 'Yêu cầu đã huỷ', detail: '' },
            updates: [],
          },
        }),
      ],
      notifications: [],
      unreadCount: 0,
      actionRequiredCount: 0,
    };
    apiMocks.mine.mockResolvedValueOnce(initialResponse).mockResolvedValueOnce(updatedResponse);
    apiMocks.cancel.mockResolvedValue({ success: true });

    const { result } = renderHook(() => useMyBugReports(true));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.cancel(197, 'Báo nhầm không phải lỗi');
    });

    expect(apiMocks.cancel).toHaveBeenCalledWith(197, { reason: 'Báo nhầm không phải lỗi' });
    expect(result.current.data[0]?.status).toBe('CANCELLED');
    expect(result.current.data[0]?.reporterExperience.state).toBe('NOT_PROCEEDING');
    expect(result.current.data[0]?.reporterExperience.label).toBe('Đã huỷ');
    expect(result.current.data[0]?.reporterExperience.summary).toContain('Báo nhầm không phải lỗi');
  });
});
