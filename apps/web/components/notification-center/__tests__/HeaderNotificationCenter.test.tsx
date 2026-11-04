import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HeaderNotificationCenter } from '../HeaderNotificationCenter';
import type { MosNotificationFeedResponse } from '@mos-lab/shared';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockFeed: MosNotificationFeedResponse = {
  items: [
    {
      id: 'inbox-194-awaiting_danny_commit_review',
      title: '[Duyệt Commit] Ticket #194',
      summary: 'Bổ sung tính năng hiện thông báo đã đọc và thông báo mới đề xuất giao diện như Insta',
      category: 'inbox_approval',
      priority: 'urgent',
      action: {
        type: 'navigate_bug_report',
        payload: { reportId: 194, status: 'AWAITING_DANNY_COMMIT_REVIEW' },
      },
      badgeText: 'Duyệt commit',
      isActionable: true,
      actor: {
        name: 'Danny Do',
        role: 'Reporter',
      },
      createdAt: '2026-11-04T05:00:00.000Z',
      readAt: null, // Unread
    },
    {
      id: 'chat-mention-space-core-msg-1',
      title: '[Nhắc tên @] Nguyễn Quang Khải trong #space-core-team',
      summary: 'Nhờ anh Danny kiểm tra giúp em luồng thông báo này',
      category: 'chat_mention',
      priority: 'high',
      action: {
        type: 'open_chat',
        payload: { conversationId: 'space-core', messageId: 'msg-1' },
      },
      badgeText: '@Mention',
      isActionable: true,
      actor: {
        name: 'Nguyễn Quang Khải',
      },
      createdAt: '2026-11-04T04:30:00.000Z',
      readAt: null, // Unread
    },
    {
      id: 'inbox-completed-192',
      title: '[Đã xong] Ticket #192',
      summary: 'mOS FUND MASTER hoàn thiện nền tảng vận hành',
      category: 'inbox_approval',
      priority: 'low',
      action: {
        type: 'navigate_bug_report',
        payload: { reportId: 192, status: 'FIXED' },
      },
      badgeText: 'Đã đóng',
      isActionable: false,
      actor: {
        name: 'Danny Do',
        role: 'Reporter',
      },
      createdAt: '2026-11-03T10:00:00.000Z',
      readAt: '2026-11-03T12:00:00.000Z', // Read
    },
    {
      id: 'chat-task-task-99',
      title: '[Đã xong] Chuẩn bị báo cáo tài chính',
      summary: 'Nhiệm vụ đã hoàn tất',
      category: 'task_reminder',
      priority: 'low',
      action: {
        type: 'open_chat',
        payload: { openTab: 'tasks', taskId: 'task-99', conversationId: 'space-core' },
      },
      badgeText: 'Đã xong',
      isActionable: false,
      createdAt: '2026-11-02T08:00:00.000Z',
      readAt: '2026-11-02T10:00:00.000Z', // Read
    },
  ],
  unreadCount: 2,
  urgentCount: 1,
  updatedAt: '2026-11-04T05:05:00.000Z',
};

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    notifications: {
      getFeed: vi.fn(),
      markAsRead: vi.fn(),
      markAsUnread: vi.fn(),
      markAllAsRead: vi.fn(),
    },
  },
}));

import { apiClient } from '../../../lib/api-client';

describe('HeaderNotificationCenter Instagram-Style UI (MOS-FEAT-194)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.notifications.getFeed as ReturnType<typeof vi.fn>).mockResolvedValue(mockFeed);
    (apiClient.notifications.markAsRead as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    (apiClient.notifications.markAsUnread as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
    (apiClient.notifications.markAllAsRead as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });
  });

  it('renders trigger button with unread count and opens popover on click', async () => {
    render(<HeaderNotificationCenter themeMode="dark" />);

    // Click bell icon
    const bellBtn = screen.getByRole('button', { name: /Thông báo & Việc cần làm/i });
    expect(bellBtn).toBeDefined();
    fireEvent.click(bellBtn);

    // Header title and Instagram-style status filters
    await waitFor(() => {
      expect(screen.getByText('Thông báo')).toBeDefined();
      expect(screen.getByText('2 mới')).toBeDefined();
      expect(screen.getByRole('button', { name: /^Tất cả$/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /^Chưa đọc/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /^Đã đọc/i })).toBeDefined();
    });

    // In 'all' view, both 'MỚI' and 'TRƯỚC ĐÓ' sections must be present
    expect(screen.getByText('Mới', { selector: 'span.uppercase' })).toBeDefined();
    expect(screen.getByText('Trước đó', { selector: 'span.uppercase' })).toBeDefined();

    // Verify unread items are present
    expect(screen.getByText(/Ticket #194/i)).toBeDefined();
    expect(screen.getAllByText(/Nguyễn Quang Khải/i).length).toBeGreaterThan(0);

    // Verify read items are present
    expect(screen.getByText(/Ticket #192/i)).toBeDefined();
    expect(screen.getByText(/Chuẩn bị báo cáo tài chính/i)).toBeDefined();
  });

  it('filters to unread items only when clicking Chưa đọc filter', async () => {
    render(<HeaderNotificationCenter themeMode="dark" />);
    fireEvent.click(screen.getByRole('button', { name: /Thông báo & Việc cần làm/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Chưa đọc/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Chưa đọc/i }));

    // Unread items should be shown
    expect(screen.getByText(/Ticket #194/i)).toBeDefined();
    expect(screen.getAllByText(/Nguyễn Quang Khải/i).length).toBeGreaterThan(0);

    // Read items should NOT be shown
    expect(screen.queryByText(/Ticket #192/i)).toBeNull();
  });

  it('filters to read items only when clicking Đã đọc filter', async () => {
    render(<HeaderNotificationCenter themeMode="dark" />);
    fireEvent.click(screen.getByRole('button', { name: /Thông báo & Việc cần làm/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Đã đọc/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /^Đã đọc/i }));

    // Read items should be shown
    expect(screen.getByText(/Ticket #192/i)).toBeDefined();
    expect(screen.getByText(/Chuẩn bị báo cáo tài chính/i)).toBeDefined();

    // Unread items should NOT be shown
    expect(screen.queryByText(/Ticket #194/i)).toBeNull();
  });

  it('allows marking all notifications as read via Đã xem tất cả button', async () => {
    render(<HeaderNotificationCenter themeMode="dark" />);
    fireEvent.click(screen.getByRole('button', { name: /Thông báo & Việc cần làm/i }));

    await waitFor(() => {
      expect(screen.getByText(/Đã xem tất cả/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Đã xem tất cả/i));

    expect(apiClient.notifications.markAllAsRead).toHaveBeenCalled();
  });

  it('allows toggling individual notification read/unread state', async () => {
    render(<HeaderNotificationCenter themeMode="dark" />);
    fireEvent.click(screen.getByRole('button', { name: /Thông báo & Việc cần làm/i }));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /^Đánh dấu đã đọc$/i }).length).toBeGreaterThan(0);
    });

    // Click toggle read button on unread item
    const markReadBtn = screen.getAllByRole('button', { name: /^Đánh dấu đã đọc$/i })[0];
    fireEvent.click(markReadBtn);

    expect(apiClient.notifications.markAsRead).toHaveBeenCalledWith('inbox-194-awaiting_danny_commit_review');
  });
});
