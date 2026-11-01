import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MosChatMessage } from '@mos-lab/shared';
import { MosChatMobileMessageItem } from '../mobile/MosChatMobileMessageItem';
import { MosChatMobileComposer } from '../mobile/MosChatMobileComposer';

const { mockSendMessage, mockSetReplyingToMessage, mockContextValue } = vi.hoisted(() => {
  const mockSendMessage = vi.fn().mockResolvedValue(true);
  const mockSetReplyingToMessage = vi.fn();
  const mockContextValue = {
    currentUser: { id: 1, fullName: 'Danny Do', role: 'admin' },
    reactToMessage: vi.fn(),
    setSelectedMsgForAction: vi.fn(),
    replyingToMessage: null as MosChatMessage | null,
    setReplyingToMessage: mockSetReplyingToMessage,
    messages: [] as MosChatMessage[],
    staffDirectory: [
      { id: 1, displayName: 'Danny Do', username: 'danny' },
      { id: 10, displayName: 'Hà My', username: 'hamy' },
    ],
    sendMessage: mockSendMessage,
    activeConversation: { id: 'conv-test', name: 'wings-cs', type: 'space' },
  };
  return { mockSendMessage, mockSetReplyingToMessage, mockContextValue };
});

vi.mock('../context/MosChatContext', () => ({
  MosChatContext: React.createContext(mockContextValue),
  useMosChat: () => mockContextValue,
}));

vi.mock('../../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'dark',
  }),
}));

describe('mOS Chat Mobile Reply to Message in Conversation (MOS-BUG-185)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContextValue.replyingToMessage = null;
  });

  const parentMessage: MosChatMessage = {
    id: 'msg-parent-123',
    conversationId: 'conv-test',
    senderId: 1,
    senderName: 'Danny Do',
    senderRole: 'Super Admin',
    text: 'Sáng nay mọi người kiểm tra lịch hẹn chưa?',
    timeLabel: '09:00',
    createdAt: new Date().toISOString(),
  };

  const replyMessageWithObject: MosChatMessage = {
    id: 'msg-reply-456',
    conversationId: 'conv-test',
    senderId: 10,
    senderName: 'Hà My',
    senderRole: 'Chuyên Viên Mi',
    text: 'Dạ em đã kiểm tra xong hết rồi ạ!',
    timeLabel: '09:05',
    createdAt: new Date().toISOString(),
    replyToId: 'msg-parent-123',
    replyTo: {
      id: 'msg-parent-123',
      senderId: 1,
      senderName: 'Danny Do',
      text: 'Sáng nay mọi người kiểm tra lịch hẹn chưa?',
    },
  };

  it('renders quoted message preview box with sender name and text in MosChatMobileMessageItem', () => {
    render(<MosChatMobileMessageItem message={replyMessageWithObject} />);

    expect(screen.getByText('Danny Do')).toBeInTheDocument();
    expect(screen.getByText('Sáng nay mọi người kiểm tra lịch hẹn chưa?')).toBeInTheDocument();
    expect(screen.getByText('Dạ em đã kiểm tra xong hết rồi ạ!')).toBeInTheDocument();
  });

  it('renders quoted message preview via replyToId lookup when replyTo object is omitted', () => {
    mockContextValue.messages = [parentMessage];

    const replyMsgWithoutSnapshot: MosChatMessage = {
      id: 'msg-reply-789',
      conversationId: 'conv-test',
      senderId: 10,
      senderName: 'Hà My',
      senderRole: 'Chuyên Viên Mi',
      text: 'Dạ em đang rà soát lại ạ.',
      timeLabel: '09:06',
      createdAt: new Date().toISOString(),
      replyToId: 'msg-parent-123',
    };

    render(<MosChatMobileMessageItem message={replyMsgWithoutSnapshot} />);

    expect(screen.getByText('Danny Do')).toBeInTheDocument();
    expect(screen.getByText('Sáng nay mọi người kiểm tra lịch hẹn chưa?')).toBeInTheDocument();
    expect(screen.getByText('Dạ em đang rà soát lại ạ.')).toBeInTheDocument();
  });

  it('allows tapping on quoted message preview to scroll to original message', () => {
    const scrollIntoViewMock = vi.fn();
    const mockEl = document.createElement('div');
    mockEl.id = 'mos-chat-msg-msg-parent-123';
    mockEl.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(mockEl);

    render(<MosChatMobileMessageItem message={replyMessageWithObject} />);

    const quoteBox = screen.getByRole('button', {
      name: /Đi tới tin nhắn gốc của Danny Do/i,
    });
    fireEvent.click(quoteBox);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
    document.body.removeChild(mockEl);
  });

  it('renders replying banner and passes replyToId and replyTo when sending from MosChatMobileComposer', async () => {
    mockContextValue.replyingToMessage = parentMessage;

    render(
      <MosChatMobileComposer
        onOpenActionSheet={vi.fn()}
        onOpenStickerSheet={vi.fn()}
      />
    );

    // Replying banner should be visible
    expect(screen.getByText(/Trả lời Danny Do:/)).toBeInTheDocument();
    expect(screen.getByText(/Sáng nay mọi người kiểm tra lịch hẹn chưa\?/)).toBeInTheDocument();

    // Type text and submit
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Dạ em vừa kiểm tra xong ạ!' } });

    const sendBtn = screen.getByRole('button', { name: /Gửi/i });
    fireEvent.click(sendBtn);

    expect(mockSendMessage).toHaveBeenCalledWith(
      'Dạ em vừa kiểm tra xong ạ!',
      expect.objectContaining({
        replyToId: 'msg-parent-123',
        replyTo: expect.objectContaining({
          id: 'msg-parent-123',
          senderName: 'Danny Do',
          text: 'Sáng nay mọi người kiểm tra lịch hẹn chưa?',
        }),
      })
    );
  });
});
