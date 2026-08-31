import { act, renderHook, waitFor } from '@testing-library/react';
import type { MarkBugReportNotificationsReadResponse, MyBugReportsResponse } from '@mos-lab/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiMocks = vi.hoisted(() => ({
  mine: vi.fn(),
  markNotificationsRead: vi.fn(),
}));

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    bugReports: {
      mine: apiMocks.mine,
      markNotificationsRead: apiMocks.markNotificationsRead,
    },
  },
}));

import { useMyBugReports } from './useMyBugReports';

describe('useMyBugReports', () => {
  beforeEach(() => {
    apiMocks.mine.mockReset();
    apiMocks.markNotificationsRead.mockReset();
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
});
