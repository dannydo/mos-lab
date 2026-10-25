import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MosChatMobileMessageItem } from '../mobile/MosChatMobileMessageItem';
import { MosChatMobileMoveThreadModal } from '../mobile/MosChatMobileMoveThreadModal';
import { MosChatMobileReactionSheet } from '../mobile/MosChatMobileReactionSheet';
import { MosChatProvider, useMosChat } from '../context/MosChatContext';
import { apiClient } from '../../../lib/api-client';
import type { MosChatMessage } from '@mos-lab/shared';

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      bootstrap: vi.fn(),
      markThreadAsRead: vi.fn().mockResolvedValue({ success: true }),
      moveThreadItem: vi.fn().mockResolvedValue({
        success: true,
        conversation: { id: 'conv-1', messages: [] },
      }),
      deleteMessage: vi.fn().mockResolvedValue({ success: true }),
      markAsRead: vi.fn().mockResolvedValue({ success: true }),
      togglePinMessage: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('MOS-BUG-148: Mobile Chat Subthread Move, Unread Badge, and Delete Parity', () => {
  const mockCurrentUser = {
    id: 6,
    username: 'nguyenquangkhai',
    displayName: 'Nguyễn Quang Khải',
    role: 'manager',
  };

  const mockMsgWithThread: MosChatMessage = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: '6',
    senderName: 'Nguyễn Quang Khải',
    text: 'Tin nhắn gốc có luồng thảo luận',
    timeLabel: '14:15',
    createdAt: new Date().toISOString(),
    reactions: {},
    attachments: [],
    unreadThreadReplyCount: 2,
    thread: [
      {
        id: 'reply-1',
        senderId: '1',
        senderName: 'Danny Do',
        text: 'Phản hồi 1',
        timeLabel: '14:16',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'reply-2',
        senderId: '1',
        senderName: 'Danny Do',
        text: 'Phản hồi 2',
        timeLabel: '14:17',
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const mockMsg2: MosChatMessage = {
    id: 'msg-2',
    conversationId: 'conv-1',
    senderId: '6',
    senderName: 'Nguyễn Quang Khải',
    text: 'Tin nhắn thứ 2 cần chuyển vào luồng',
    timeLabel: '14:18',
    createdAt: new Date().toISOString(),
    reactions: {},
    attachments: [],
    thread: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders unread thread reply count (+2 mới) on mobile message item badge', () => {
    render(
      <MosChatProvider currentUser={mockCurrentUser}>
        <MosChatMobileMessageItem message={mockMsgWithThread} />
      </MosChatProvider>
    );

    // Verify thread counter button exists
    expect(screen.getByText('2 câu trả lời trong luồng')).toBeTruthy();
    // Verify unread badge (+2 mới) is rendered
    expect(screen.getByText('+2 mới')).toBeTruthy();
  });

  it('renders Move to Thread button in Reaction Sheet and allows deleting for message owner', () => {
    const onOpenMoveThreadMock = vi.fn();
    const onCloseMock = vi.fn();

    render(
      <MosChatProvider currentUser={mockCurrentUser}>
        <MosChatMobileReactionSheet
          message={mockMsg2}
          onClose={onCloseMock}
          onOpenThread={vi.fn()}
          onCreateTaskFromMsg={vi.fn()}
          onOpenMoveThread={onOpenMoveThreadMock}
        />
      </MosChatProvider>
    );

    // Check "Gộp tin nhắn vào luồng khác..." exists
    const moveBtn = screen.getByText('Gộp tin nhắn vào luồng khác...');
    expect(moveBtn).toBeTruthy();
    fireEvent.click(moveBtn);
    expect(onOpenMoveThreadMock).toHaveBeenCalledWith(mockMsg2);
    expect(onCloseMock).toHaveBeenCalled();

    // Check "Xóa tin nhắn" button exists for owner
    expect(screen.getByText('Xóa tin nhắn')).toBeTruthy();
  });

  it('allows moving/merging a message into thread above via MosChatMobileMoveThreadModal (1-Click)', async () => {
    const onCloseMock = vi.fn();

    const TestWrapper = () => {
      const { moveThreadItem } = useMosChat();
      return (
        <MosChatMobileMoveThreadModal
          open={true}
          sourceMessage={mockMsg2}
          prevMessage={mockMsgWithThread}
          onClose={onCloseMock}
        />
      );
    };

    render(
      <MosChatProvider currentUser={mockCurrentUser}>
        <TestWrapper />
      </MosChatProvider>
    );

    // Check header and 1-Click action
    expect(screen.getByText('Gộp tin nhắn vào luồng phụ')).toBeTruthy();
    const oneClickBtn = screen.getByText(/Gộp vào luồng ngay phía trên/i);
    expect(oneClickBtn).toBeTruthy();

    fireEvent.click(oneClickBtn);

    await waitFor(() => {
      expect(apiClient.chat.moveThreadItem).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'MERGE_ROOT_TO_THREAD',
          sourceMessageId: 'msg-2',
          targetMessageId: 'msg-1',
        })
      );
    });
  });

  it('invokes apiClient.chat.deleteMessage with parentMsgId and replyId when deleting thread reply', async () => {
    let capturedDeleteThreadReply: ((parentMsgId: string, replyId: string) => Promise<void>) | null = null;

    const TestHarness = () => {
      const { deleteThreadReply } = useMosChat();
      capturedDeleteThreadReply = deleteThreadReply;
      return <div>Test</div>;
    };

    render(
      <MosChatProvider currentUser={mockCurrentUser}>
        <TestHarness />
      </MosChatProvider>
    );

    expect(capturedDeleteThreadReply).toBeDefined();
    await capturedDeleteThreadReply!('msg-1', 'reply-1');

    expect(apiClient.chat.deleteMessage).toHaveBeenCalledWith(
      'msg-1',
      expect.objectContaining({
        replyId: 'reply-1',
      })
    );
  });
});
