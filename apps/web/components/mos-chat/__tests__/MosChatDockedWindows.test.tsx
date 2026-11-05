import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MosChatDockedWindows } from '../components/MosChatDockedWindows';
import type { MosChatConversation, MosChatMessage, MosChatTaskItem } from '@mos-lab/shared';

describe('MosChatDockedWindows iPhone Refactor', () => {
  const sampleMessages: MosChatMessage[] = [
    {
      id: 'm-1',
      conversationId: 'core-team',
      senderId: 'user-1',
      senderName: 'Tường Đoan',
      senderRole: 'CV🪶',
      text: 'Hôm nay mi lỗi tại chi nhánh gửi về kho nhé',
      timeLabel: '10:55',
      createdAt: new Date().toISOString(),
      thread: [
        {
          id: 'th-1',
          senderId: 'user-2',
          senderName: 'Danny Do',
          senderRole: 'Admin',
          text: 'Đã nhận thông tin, bên kho đang rà soát lại lô hàng.',
          timeLabel: '10:56',
          createdAt: new Date().toISOString(),
        },
      ],
    },
    {
      id: 'm-2',
      conversationId: 'core-team',
      senderId: 'user-1',
      senderName: 'Tường Đoan',
      senderRole: 'CV🪶',
      text: 'C cần một bạn biết nối mi nhìn được tiếp thông số mi để làm việc nhé',
      timeLabel: '10:58',
      createdAt: new Date().toISOString(),
    },
  ];

  const sampleConversations: MosChatConversation[] = [
    {
      id: 'core-team',
      type: 'space',
      name: 'core-team',
      color: '#d4a84b',
      messages: sampleMessages,
      memberCount: 5,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    },
  ];

  const sampleTasks: MosChatTaskItem[] = [
    {
      id: 'task-1',
      conversationId: 'core-team',
      conversationName: 'core-team',
      title: 'Kiểm tra lô mi lỗi trả về kho',
      done: false,
      priority: 'NORMAL',
      creatorName: 'Tường Đoan',
      assigneeName: 'Danny Do',
      assigneeId: '1',
      remindAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'task-2',
      conversationId: 'core-team',
      conversationName: 'core-team',
      title: 'Soạn hướng dẫn thông số mi',
      done: true,
      priority: 'NORMAL',
      creatorName: 'Danny Do',
      assigneeName: 'Chuyên Viên',
      assigneeId: '2',
      remindAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    },
  ];

  const baseProps = {
    isMobile: false,
    dockedConvIds: ['core-team'],
    conversations: sampleConversations,
    collapsedDockIds: {},
    setCollapsedDockIds: vi.fn(),
    userPrefs: { pinnedIds: [] },
    getEffectiveUnreadCount: vi.fn().mockReturnValue(0),
    dockAttachments: {},
    setDockAttachments: vi.fn(),
    dockInputs: {},
    setDockInputs: vi.fn(),
    surfaceBg: '#1f1f1f',
    surfaceRaised: '#2a2a2a',
    canvasBg: '#141414',
    borderColor: '#333333',
    borderStrong: '#444444',
    accentColor: '#d4a84b',
    accentSoftBg: 'rgba(212, 168, 75, 0.1)',
    accentBorder: 'rgba(212, 168, 75, 0.3)',
    accentContrast: '#000000',
    token: { colorText: '#ffffff', colorTextSecondary: '#aaaaaa' },
    renderUserAvatarNode: ({ name }: { name: string }) => <div data-testid="avatar">{name}</div>,
    isConversationParticipantOnline: vi.fn().mockReturnValue(true),
    togglePinConversation: vi.fn(),
    toggleManualUnreadConversation: vi.fn(),
    selectConversation: vi.fn(),
    onToggle: vi.fn(),
    setDockedConvIds: vi.fn(),
    dockMessagesContainerRefs: { current: {} },
    isMessageFromCurrentUser: (m: any) => m.senderName === 'Danny Do',
    getMessageReadBreakdown: vi.fn().mockReturnValue({ seenBy: [], unseenBy: [] }),
    renderReadStatusCheckmark: vi.fn(),
    openTaskModalFromMessage: vi.fn(),
    renderRichTextMessage: (t: string) => <span>{t}</span>,
    renderMessageAttachments: vi.fn(),
    renderStagedAttachmentsStrip: vi.fn(),
    dockInputRefs: { current: {} },
    handleClipboardPaste: vi.fn(),
    isComposingRef: { current: false },
    lastCompositionEndMsRef: { current: 0 },
    handleSendMessage: vi.fn(),
    openStickerPopoverKey: null,
    setOpenStickerPopoverKey: vi.fn(),
    renderComposerEmojiPickerContent: vi.fn(),
    triggerFilePicker: vi.fn(),
    tasks: sampleTasks,
    onToggleTaskDone: vi.fn(),
    onQuickCreateTask: vi.fn(),
    onSendThreadReply: vi.fn(),
  };

  it('renders iPhone styled docked chat with channel name, messages, and iOS segmented control', () => {
    render(<MosChatDockedWindows {...baseProps} />);

    expect(screen.getByText('core-team')).toBeInTheDocument();
    expect(screen.getByText('Hôm nay mi lỗi tại chi nhánh gửi về kho nhé')).toBeInTheDocument();
    expect(screen.getByText('💬 Tin nhắn')).toBeInTheDocument();
    expect(screen.getByText('⏱️ Tác vụ')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhắn tin...')).toBeInTheDocument();
  });

  it('switches to Tasks view and displays pending tasks with completion checkboxes', () => {
    const handleToggleTask = vi.fn();
    render(<MosChatDockedWindows {...baseProps} onToggleTaskDone={handleToggleTask} />);

    // Click Tác vụ segment
    fireEvent.click(screen.getByText('⏱️ Tác vụ'));

    expect(screen.getByText('Kiểm tra lô mi lỗi trả về kho')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Thêm việc mới... (Nhấn Enter để tạo)')).toBeInTheDocument();

    // Toggle task
    const checkButtons = screen.getAllByRole('button');
    const taskCheckBtn = checkButtons.find((btn) => btn.className.includes('rounded-full border'));
    expect(taskCheckBtn).toBeDefined();
    if (taskCheckBtn) {
      fireEvent.click(taskCheckBtn);
      expect(handleToggleTask).toHaveBeenCalledWith('task-1');
    }
  });

  it('allows quick task creation from input bar', () => {
    const handleQuickCreate = vi.fn();
    render(<MosChatDockedWindows {...baseProps} onQuickCreateTask={handleQuickCreate} />);

    // Switch to tasks tab
    fireEvent.click(screen.getByText('⏱️ Tác vụ'));

    const taskInput = screen.getByPlaceholderText('Thêm việc mới... (Nhấn Enter để tạo)');
    fireEvent.change(taskInput, { target: { value: 'Soát lại checklist dụng cụ' } });
    fireEvent.keyDown(taskInput, { key: 'Enter', code: 'Enter' });

    expect(handleQuickCreate).toHaveBeenCalledWith({
      conversationId: 'core-team',
      title: 'Soát lại checklist dụng cụ',
    });
  });

  it('pushes into thread view with slide transition and back button', () => {
    render(<MosChatDockedWindows {...baseProps} />);

    // Click into thread
    const threadBtn = screen.getByText('1 phản hồi');
    expect(threadBtn).toBeInTheDocument();
    fireEvent.click(threadBtn);

    // Thread view displays parent message and replies
    expect(screen.getByText('Tin nhắn gốc')).toBeInTheDocument();
    expect(screen.getByText('Đã nhận thông tin, bên kho đang rà soát lại lô hàng.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Trả lời trong luồng... (Enter gửi)')).toBeInTheDocument();

    // Click back chevron button
    const backBtn = screen.getByRole('button', { name: /core-team/i });
    fireEvent.click(backBtn);

    // Returned to main chat
    expect(screen.getByText('💬 Tin nhắn')).toBeInTheDocument();
    expect(screen.getByText('⏱️ Tác vụ')).toBeInTheDocument();
  });

  it('displays floating scroll to bottom button when scrolled up and scrolls to bottom when clicked', () => {
    const scrollMock = vi.fn();
    const { container } = render(<MosChatDockedWindows {...baseProps} />);

    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeDefined();

    if (scrollContainer) {
      scrollContainer.scrollTo = scrollMock;
      Object.defineProperty(scrollContainer, 'scrollHeight', { value: 1200, configurable: true });
      Object.defineProperty(scrollContainer, 'scrollTop', { value: 200, configurable: true });
      Object.defineProperty(scrollContainer, 'clientHeight', { value: 400, configurable: true });

      fireEvent.scroll(scrollContainer);

      const scrollBottomBtn = screen.getByText('Tin nhắn mới');
      expect(scrollBottomBtn).toBeInTheDocument();

      fireEvent.click(scrollBottomBtn);
      expect(scrollMock).toHaveBeenCalledWith(
        expect.objectContaining({
          top: 1200,
          behavior: 'smooth',
        })
      );
    }
  });

  it('styles own message bubbles and other message bubbles with readable theme colors without harsh gradients', () => {
    const convWithMine: MosChatConversation[] = [
      {
        ...sampleConversations[0],
        messages: [
          ...sampleMessages,
          {
            id: 'm-mine',
            conversationId: 'core-team',
            senderId: 'user-2',
            senderName: 'Danny Do',
            senderRole: 'Admin',
            text: 'Tin nhắn của tôi trong mini chat',
            timeLabel: '11:00',
            createdAt: new Date().toISOString(),
          },
        ],
      },
    ];

    const { container } = render(
      <MosChatDockedWindows
        {...baseProps}
        conversations={convWithMine}
        accentSoftBg="rgba(212, 168, 75, 0.16)"
        accentBorder="rgba(212, 168, 75, 0.38)"
      />
    );

    const mineBubble = container.querySelector('[data-message-id="m-mine"] .group\\/bubble') as HTMLElement;
    expect(mineBubble).toBeInTheDocument();
    expect(mineBubble.className).not.toContain('bg-gradient-to-br');
    expect(mineBubble.className).not.toContain('text-neutral-950');
    expect(mineBubble.style.background).toBe('rgba(212, 168, 75, 0.16)');

    const otherBubble = container.querySelector('[data-message-id="m-1"] .group\\/bubble') as HTMLElement;
    expect(otherBubble).toBeInTheDocument();
    expect(otherBubble.style.background).toMatch(/(?:rgb\(42,\s*42,\s*42\)|#2a2a2a)/);
  });

  it('renders correct space avatar (emoji, custom image, or fallback hash) in mini chat header (MOS-BUG-202)', () => {
    const spaceWithEmoji: MosChatConversation = {
      ...sampleConversations[0],
      id: 'space-emoji',
      name: 'Chiến Binh Sale',
      avatar: '🚀',
      color: '#10b981',
    };

    const { rerender } = render(
      <MosChatDockedWindows
        {...baseProps}
        dockedConvIds={['space-emoji']}
        conversations={[spaceWithEmoji]}
      />
    );

    // Emoji avatar should be rendered in header
    expect(screen.getByText('🚀')).toBeInTheDocument();
    expect(screen.getByText('Chiến Binh Sale')).toBeInTheDocument();

    // Space with image URL avatar
    const spaceWithImg: MosChatConversation = {
      ...sampleConversations[0],
      id: 'space-img',
      name: 'Kho Vận',
      avatar: 'https://example.com/warehouse.png',
      color: '#3b82f6',
    };

    rerender(
      <MosChatDockedWindows
        {...baseProps}
        dockedConvIds={['space-img']}
        conversations={[spaceWithImg]}
      />
    );

    const img = screen.getByAltText('Kho Vận');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/warehouse.png');

    // Space without avatar should fall back to channel name
    const spaceWithoutAvatar: MosChatConversation = {
      ...sampleConversations[0],
      id: 'space-plain',
      name: 'Chung',
      avatar: undefined,
    };

    rerender(
      <MosChatDockedWindows
        {...baseProps}
        dockedConvIds={['space-plain']}
        conversations={[spaceWithoutAvatar]}
      />
    );

    expect(screen.getByText('Chung')).toBeInTheDocument();
  });
});
