import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MosChatProvider } from '../context/MosChatContext';
import { MosChatMobileStream } from '../mobile/MosChatMobileStream';
import { MosChatMobileApp } from '../mobile/MosChatMobileApp';
import { apiClient } from '../../../lib/api-client';

// Mock apiClient.chat
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      bootstrap: vi.fn().mockResolvedValue({
        conversations: [
          {
            id: 'space-operations',
            type: 'space',
            name: 'Kênh Vận Hành',
            subtitle: 'Kênh vận hành salon và điều phối',
            color: '#d4a72c',
            memberCount: 12,
            memberIds: [10, 20, 99],
            unreadCount: 0,
            updatedAt: new Date().toISOString(),
            messages: [
              {
                id: 'm1',
                conversationId: 'space-operations',
                senderId: '10',
                senderName: 'Chuyên Viên Mai',
                senderRole: 'CV',
                text: 'Tin nhắn cũ ngày hôm qua lúc 09:00',
                timeLabel: '09:00',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
              },
              {
                id: 'm2',
                conversationId: 'space-operations',
                senderId: '20',
                senderName: 'Hương CC',
                senderRole: 'CC',
                text: 'Tin nhắn giữa ca lúc 14:00',
                timeLabel: '14:00',
                createdAt: new Date(Date.now() - 3600000).toISOString(),
              },
              {
                id: 'm3-latest',
                conversationId: 'space-operations',
                senderId: '99',
                senderName: 'Danny Do',
                senderRole: 'admin',
                text: 'Tin nhắn mới nhất vừa gửi lúc này!',
                timeLabel: 'Vừa xong',
                createdAt: new Date().toISOString(),
              },
            ],
          },
          {
            id: 'space-training',
            type: 'space',
            name: 'Kênh Đào Tạo',
            subtitle: 'Đào tạo kỹ thuật Chuyên Viên',
            color: '#10b981',
            memberCount: 8,
            memberIds: [10, 99],
            unreadCount: 0,
            updatedAt: new Date().toISOString(),
            messages: [
              {
                id: 't-latest',
                conversationId: 'space-training',
                senderId: '10',
                senderName: 'Chuyên Viên Mai',
                senderRole: 'CV',
                text: 'Bài học kỹ thuật mi mới nhất',
                timeLabel: '11:00',
                createdAt: new Date().toISOString(),
              },
            ],
          },
        ],
        tasks: [],
        staffDirectory: [
          { id: 10, username: 'mai_cv', role: 'CV', displayName: 'Chuyên Viên Mai' },
          { id: 20, username: 'huong_cc', role: 'CC', displayName: 'Hương CC' },
        ],
        userPrefs: { pinnedIds: [] },
      }),
      markAsRead: vi.fn().mockResolvedValue({ success: true }),
      sendMessage: vi.fn().mockResolvedValue({
        success: true,
        message: {
          id: 'm-new-incoming',
          conversationId: 'space-operations',
          senderId: '20',
          senderName: 'Hương CC',
          senderRole: 'CC',
          text: 'Tin nhắn mới toanh vừa đến!',
          createdAt: new Date().toISOString(),
        },
      }),
    },
  },
}));

describe('MOS-BUG-152: Auto scroll to latest messages when tapping space', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Stub Element scroll methods
    Element.prototype.scrollTo = vi.fn();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('automatically scrolls container to bottom when MosChatMobileStream mounts inside a space', async () => {
    const { container } = render(
      <MosChatProvider initialConvId="space-operations">
        <MosChatMobileStream onOpenThread={vi.fn()} />
      </MosChatProvider>
    );

    // Wait for messages to render
    await waitFor(() => {
      expect(screen.getByText('Tin nhắn mới nhất vừa gửi lúc này!')).toBeInTheDocument();
    });

    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeDefined();

    // Verify scrollIntoView was called to bring latest message to viewport
    await waitFor(() => {
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  it('navigates from Inbox to Space and automatically triggers bottom scroll to show latest message', async () => {
    const { container } = render(
      <MosChatProvider>
        <MosChatMobileApp />
      </MosChatProvider>
    );

    // Initial view should be Inbox
    await waitFor(() => {
      expect(screen.getByText('Kênh Vận Hành')).toBeInTheDocument();
    });

    // Tap on Space item to navigate into the space
    const spaceCard = screen.getByText('Kênh Vận Hành').closest('div[role="button"]');
    expect(spaceCard).toBeDefined();
    if (spaceCard) {
      act(() => {
        fireEvent.click(spaceCard);
      });
    }

    // Now in Room stream view, verify latest message is visible and bottom scroll was invoked
    await waitFor(() => {
      expect(screen.getByText('Tin nhắn mới nhất vừa gửi lúc này!')).toBeInTheDocument();
      expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });

  it('shows floating unread button when user scrolled up and follows new messages when clicked', async () => {
    const { container } = render(
      <MosChatProvider initialConvId="space-operations">
        <MosChatMobileStream onOpenThread={vi.fn()} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Tin nhắn mới nhất vừa gửi lúc này!')).toBeInTheDocument();
    });

    const scrollContainer = container.querySelector('.overflow-y-auto') as HTMLDivElement;
    expect(scrollContainer).toBeDefined();

    // Mock container dimensions as scrolled up (reading old messages)
    Object.defineProperty(scrollContainer, 'scrollHeight', { value: 2000, writable: true, configurable: true });
    Object.defineProperty(scrollContainer, 'scrollTop', { value: 100, writable: true, configurable: true });
    Object.defineProperty(scrollContainer, 'clientHeight', { value: 600, writable: true, configurable: true });

    // User scrolled up: distanceFromBottom = 2000 - 100 - 600 = 1300 > 120
    act(() => {
      fireEvent.scroll(scrollContainer);
    });

    // Floating button should appear
    await waitFor(() => {
      expect(screen.getByText('Tin mới')).toBeInTheDocument();
    });

    const scrollBtn = screen.getByRole('button', { name: /cuộn xuống tin nhắn mới/i });
    expect(scrollBtn).toBeInTheDocument();

    // Clicking scroll button scrolls to bottom
    act(() => {
      fireEvent.click(scrollBtn);
    });

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });
});
