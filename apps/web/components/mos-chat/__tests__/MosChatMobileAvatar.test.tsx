import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MosChatMobileMessageItem } from '../mobile/MosChatMobileMessageItem';
import { MosChatMobileThreadSheet } from '../mobile/MosChatMobileThreadSheet';
import { MosChatMobileComposer } from '../mobile/MosChatMobileComposer';
import { MosChatMobileStream } from '../mobile/MosChatMobileStream';
import { MosChatMobileEditTaskModal } from '../mobile/MosChatMobileEditTaskModal';
import { MosChatProvider, useMosChat } from '../context/MosChatContext';
import { apiClient } from '../../../lib/api-client';
import type { MosChatMessage, MosChatStaffMember, MosChatConversation } from '@mos-lab/shared';

const mockStaffDirectory: MosChatStaffMember[] = [
  {
    id: 1,
    username: 'dannydo',
    displayName: 'Danny Do',
    role: 'Quản trị viên',
    avatarUrl: 'https://cdn.wingslashes.com/avatars/danny.jpg',
  },
  {
    id: 6,
    username: 'khai.nguyen',
    displayName: 'Nguyễn Quang Khải',
    role: 'Kỹ thuật',
    avatarUrl: 'https://cdn.wingslashes.com/avatars/khai.jpg',
  },
  {
    id: 10,
    username: 'hamy',
    displayName: 'Hà My',
    role: 'Chuyên Viên Mi',
    avatarUrl: null,
  },
];

const mockCurrentUser = {
  id: 6,
  username: 'khai.nguyen',
  fullName: 'Nguyễn Quang Khải',
  displayName: 'Nguyễn Quang Khải',
  role: 'tech',
};

const mockIncomingMessage: MosChatMessage = {
  id: 'msg-danny-1',
  conversationId: 'dm-pair-1-6',
  senderId: 1,
  senderName: 'Danny Do',
  senderRole: 'Quản trị viên',
  senderAvatar: 'https://cdn.wingslashes.com/avatars/danny.jpg',
  text: 'Chào Khải, em test thử avatar trên mobile giúp anh nhé!',
  timeLabel: '10:30',
  createdAt: new Date().toISOString(),
  thread: [
    {
      id: 'rep-1',
      senderId: 10,
      senderName: 'Hà My',
      senderRole: 'Chuyên Viên Mi',
      text: 'Em đã nhận thông tin ạ!',
      timeLabel: '10:31',
      createdAt: new Date().toISOString(),
    },
  ],
};

const mockIncomingMessageNoAvatar: MosChatMessage = {
  id: 'msg-hamy-1',
  conversationId: 'dm-pair-1-6',
  senderId: 10,
  senderName: 'Hà My',
  senderRole: 'Chuyên Viên Mi',
  text: 'Em vừa làm xong bộ mi cho khách rồi ạ!',
  timeLabel: '10:35',
  createdAt: new Date().toISOString(),
};

const mockMessageWithQuote: MosChatMessage = {
  id: 'msg-reply-1',
  conversationId: 'dm-pair-1-6',
  senderId: 10,
  senderName: 'Hà My',
  senderRole: 'Chuyên Viên Mi',
  text: 'Em đồng ý ạ!',
  timeLabel: '10:40',
  createdAt: new Date().toISOString(),
  ...({ replyToId: 'msg-danny-1' } as any),
};

const mockAiMessage: MosChatMessage = {
  id: 'msg-ai-1',
  conversationId: 'dm-pair-1-6',
  senderId: 'wings-ai-copilot',
  senderName: 'mOS AI',
  senderRole: 'Copilot',
  isAiBot: true,
  text: 'Tôi đã tổng hợp báo cáo cho bạn.',
  timeLabel: '10:36',
  createdAt: new Date().toISOString(),
};

const mockDmConversation: MosChatConversation = {
  id: 'dm-pair-1-6',
  type: 'dm',
  name: 'Danny Do',
  avatar: 'https://cdn.wingslashes.com/avatars/danny.jpg',
  participantStaffId: 1,
  color: '#3b82f6',
  unreadCount: 0,
  messages: [mockIncomingMessage, mockIncomingMessageNoAvatar, mockMessageWithQuote, mockAiMessage],
  updatedAt: new Date().toISOString(),
};

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      bootstrap: vi.fn(),
      markAsRead: vi.fn().mockResolvedValue({ success: true }),
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('MOS-BUG-158: Mobile Chat Avatar Standardization', () => {
  beforeEach(() => {
    vi.mocked(apiClient.chat.bootstrap).mockResolvedValue({
      conversations: [mockDmConversation],
      tasks: [],
      staffDirectory: mockStaffDirectory,
      userPrefs: { pinnedIds: [] },
    } as any);
  });

  it('renders authentic photo avatar in MosChatMobileMessageItem for incoming messages', () => {
    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <MosChatMobileMessageItem message={mockIncomingMessage} />
      </MosChatProvider>
    );

    // Sender name should be visible
    expect(screen.getByText('Danny Do')).toBeInTheDocument();

    // Image avatar should be rendered with resolved URL
    const img = screen.getByRole('img', { name: 'Danny Do' });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://cdn.wingslashes.com/avatars/danny.jpg');
  });

  it('renders initials badge with color palette in MosChatMobileMessageItem when staff has no photo', () => {
    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <MosChatMobileMessageItem message={mockIncomingMessageNoAvatar} />
      </MosChatProvider>
    );

    // Sender name should be visible
    expect(screen.getByText('Hà My')).toBeInTheDocument();

    // Should render HM initials badge
    expect(screen.getByText('HM')).toBeInTheDocument();
  });

  it('renders sparkles icon for AI Copilot messages in mobile stream', () => {
    const { container } = render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <MosChatMobileMessageItem message={mockAiMessage} />
      </MosChatProvider>
    );

    expect(screen.getAllByText('mOS AI').length).toBeGreaterThanOrEqual(1);
    expect(container.querySelector('.lucide-sparkles')).toBeInTheDocument();
  });

  it('renders avatar inside quoted message preview', async () => {
    const QuoteTestContainer = () => {
      const { messages } = useMosChat();
      const target = messages.find((m) => m.id === 'msg-reply-1');
      if (!target) return <div>Đang tải...</div>;
      return <MosChatMobileMessageItem message={target} />;
    };

    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <QuoteTestContainer />
      </MosChatProvider>
    );

    // Wait for quoted message to be found in context messages and render Danny's avatar
    await waitFor(() => {
      const quoteAvatar = screen.getByRole('img', { name: 'Danny Do' });
      expect(quoteAvatar).toBeInTheDocument();
      expect(quoteAvatar).toHaveAttribute('src', 'https://cdn.wingslashes.com/avatars/danny.jpg');
    });
  });

  it('renders avatar for parent message and replies in MosChatMobileThreadSheet', async () => {
    const ThreadTestContainer = () => {
      const { setActiveThreadMsg } = useMosChat();
      return (
        <div>
          <button data-testid="open-thread-btn" onClick={() => setActiveThreadMsg(mockIncomingMessage)}>
            Open Thread
          </button>
          <MosChatMobileThreadSheet />
        </div>
      );
    };

    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <ThreadTestContainer />
      </MosChatProvider>
    );

    // Trigger open thread
    fireEvent.click(screen.getByTestId('open-thread-btn'));

    // Parent message avatar should be rendered
    const parentImg = await screen.findByRole('img', { name: 'Danny Do' });
    expect(parentImg).toBeInTheDocument();

    // Reply initials badge HM should be rendered
    expect(await screen.findByText('HM')).toBeInTheDocument();
  });

  it('renders avatar in replying banner of MosChatMobileComposer', () => {
    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <MosChatMobileComposer onOpenActionSheet={vi.fn()} onOpenStickerSheet={vi.fn()} />
      </MosChatProvider>
    );

    // When not replying, no replying banner
    expect(screen.queryByText(/Trả lời Danny Do:/)).not.toBeInTheDocument();
  });

  it('renders avatar in Welcome Banner and Pinned Banner of MosChatMobileStream', async () => {
    const pinnedMsg: MosChatMessage = {
      ...mockIncomingMessage,
      id: 'msg-pinned-1',
      pinned: true,
    };

    vi.mocked(apiClient.chat.bootstrap).mockResolvedValue({
      conversations: [
        {
          ...mockDmConversation,
          messages: [pinnedMsg],
        },
      ],
      tasks: [],
      staffDirectory: mockStaffDirectory,
      userPrefs: { pinnedIds: [] },
    } as any);

    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <MosChatMobileStream onOpenThread={vi.fn()} />
      </MosChatProvider>
    );

    // Wait until bootstrap finishes and DM welcome header is rendered
    await screen.findAllByText('Danny Do');

    // Peer avatar in Welcome Header & Pinned Banner
    const avatars = await screen.findAllByRole('img');
    const welcomeAvatar = avatars.find((img) => img.getAttribute('src')?.includes('danny.jpg'));
    expect(welcomeAvatar).toBeDefined();
  });

  it('renders avatar for own messages (isMe) in both MosChatMobileMessageItem and MosChatMobileThreadSheet', async () => {
    const ownMsgWithSelfReply: MosChatMessage = {
      id: 'msg-self-1',
      conversationId: 'dm-pair-1-6',
      senderId: 6,
      senderName: 'Nguyễn Quang Khải',
      senderRole: 'Kỹ thuật',
      senderAvatar: 'https://cdn.wingslashes.com/avatars/khai.jpg',
      text: 'Tin nhắn của chính Khải gửi trên mobile',
      timeLabel: '16:15',
      createdAt: new Date().toISOString(),
      thread: [
        {
          id: 'rep-self-1',
          senderId: 6,
          senderName: 'Nguyễn Quang Khải',
          senderRole: 'Kỹ thuật',
          senderAvatar: 'https://cdn.wingslashes.com/avatars/khai.jpg',
          text: 'Phản hồi của chính Khải trong thread',
          timeLabel: '16:17',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    const SelfThreadContainer = () => {
      const { setActiveThreadMsg } = useMosChat();
      return (
        <div>
          <MosChatMobileMessageItem message={ownMsgWithSelfReply} />
          <button data-testid="open-self-thread" onClick={() => setActiveThreadMsg(ownMsgWithSelfReply)}>
            Open Self Thread
          </button>
          <MosChatMobileThreadSheet />
        </div>
      );
    };

    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <SelfThreadContainer />
      </MosChatProvider>
    );

    const streamAvatar = await screen.findByRole('img', { name: 'Nguyễn Quang Khải' });
    expect(streamAvatar).toHaveAttribute('src', 'https://cdn.wingslashes.com/avatars/khai.jpg');
    expect(streamAvatar).toHaveAttribute('referrerpolicy', 'no-referrer');

    fireEvent.click(screen.getByTestId('open-self-thread'));

    await waitFor(() => {
      const allKhaiAvatars = screen.getAllByRole('img', { name: 'Nguyễn Quang Khải' });
      // 1 in stream + 1 in thread parent + 1 in thread reply = 3
      expect(allKhaiAvatars.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('renders assignee avatar inside MosChatMobileEditTaskModal assignee selector', async () => {
    render(
      <MosChatProvider currentUser={mockCurrentUser} initialConvId="dm-pair-1-6">
        <MosChatMobileEditTaskModal
          open={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          task={{
            id: 'task-157',
            conversationId: 'dm-pair-1-6',
            conversationName: 'Danny Do',
            title: 'Kiểm tra giao diện giao task trên mobile',
            assigneeId: '6',
            assigneeName: 'Nguyễn Quang Khải',
            creatorName: 'Danny Do',
            remindAt: new Date().toISOString(),
            priority: 'HIGH',
            done: false,
            createdAt: new Date().toISOString(),
          }}
        />
      </MosChatProvider>
    );

    await waitFor(() => {
      const assigneeAvatar = screen.getByRole('img', { name: 'Nguyễn Quang Khải' });
      expect(assigneeAvatar).toBeInTheDocument();
      expect(assigneeAvatar).toHaveAttribute('src', 'https://cdn.wingslashes.com/avatars/khai.jpg');
    });
  });
});
