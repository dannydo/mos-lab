import React, { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MosChatThreadDrawer } from '../components/MosChatThreadDrawer';
import type { MosChatMessage, MosChatThreadReply, SafeAny } from '@mos-lab/shared';

describe('MosChatDesktopThreadReply - Reply feature in desktop sub-thread (MOS-BUG-154)', () => {
  const mockCurrentUser = {
    id: 'user-1',
    username: 'dannydo',
    displayName: 'Danny Do',
    role: 'super_admin',
  };

  const mockActiveMessage: MosChatMessage = {
    id: 'msg-root-101',
    conversationId: 'conv-general',
    senderId: 'user-boss',
    senderName: 'Anh Danny',
    senderRole: 'Super Admin',
    text: 'Cần kiểm tra lại tính năng reply trong subthread trên desktop',
    timeLabel: '10:30',
    createdAt: '2026-10-26T10:30:00.000Z',
    thread: [
      {
        id: 'reply-1',
        senderId: 'user-tech-1',
        senderName: 'Bảo Hân',
        senderRole: 'Kỹ thuật viên',
        text: 'Em thấy trên mobile có nút vuốt và trích dẫn rất tiện ạ',
        timeLabel: '10:32',
        createdAt: '2026-10-26T10:32:00.000Z',
      },
      {
        id: 'reply-2',
        senderId: 'user-tech-2',
        senderName: 'Minh Thảo',
        senderRole: 'Chuyên Viên Mi',
        text: 'Trên desktop em bấm vào chưa thấy có nút reply tương tự',
        timeLabel: '10:35',
        createdAt: '2026-10-26T10:35:00.000Z',
      },
    ],
  };

  const defaultProps: SafeAny = {
    threadOpen: true,
    activeThreadMessage: mockActiveMessage,
    activeConversation: { id: 'conv-general', messages: [mockActiveMessage] },
    currentUser: mockCurrentUser,
    isMobile: false,
    mobileActiveView: 'conversation',
    setMobileActiveView: vi.fn(),
    threadWidth: 440,
    setThreadWidth: vi.fn(),
    persistPersonalLayout: vi.fn(),
    isResizingTarget: null,
    setIsResizingTarget: vi.fn(),
    hoverResizeHandle: null,
    setHoverResizeHandle: vi.fn(),
    surfaceBg: '#1f1f1f',
    surfaceRaised: '#2a2a2a',
    canvasBg: '#141414',
    borderColor: 'rgba(255,255,255,0.1)',
    borderStrong: 'rgba(255,255,255,0.2)',
    accentColor: '#d4a84b',
    accentSoftBg: 'rgba(212,168,75,0.15)',
    accentBorder: 'rgba(212,168,75,0.3)',
    isDark: true,
    token: { colorText: '#fff', colorTextSecondary: '#aaa', colorTextQuaternary: '#666' },
    draggingRootMsgId: null,
    setDraggingRootMsgId: vi.fn(),
    dragOverTargetMsgId: null,
    setDragOverTargetMsgId: vi.fn(),
    dragOverThreadPane: false,
    setDragOverThreadPane: vi.fn(),
    isDraggingOverThread: false,
    setIsDraggingOverThread: vi.fn(),
    isDraggingOver: false,
    setIsDraggingOver: vi.fn(),
    handleMoveThreadItem: vi.fn(),
    handleProcessImageFiles: vi.fn(),
    handleClipboardPaste: vi.fn(),
    formatMoveTargetSnippet: vi.fn(),
    setThreadOpen: vi.fn(),
    navigateToMessage: vi.fn(),
    highlightedMsgId: null,
    renderUserAvatarNode: ({ name }: SafeAny) => <div>Avatar-{name}</div>,
    renderRichTextMessage: (txt: string) => <div>{txt}</div>,
    speakingMsgId: null,
    ttsSpeed: 1,
    handleSpeakAiMessage: vi.fn(),
    handleSetTtsSpeed: vi.fn(),
    threadMessagesContainerRef: createRef(),
    threadMessagesEndRef: createRef(),
    isMessageFromCurrentUser: (msg: SafeAny) => msg.senderId === mockCurrentUser.id,
    canManageChatThreads: true,
    AI_COPILOT_CONV_ID: 'conv-mai',
    getMemberNickname: () => undefined,
    renderReadStatusCheckmark: () => null,
    renderMiniSeenAvatarStack: () => null,
    editingReplyId: null,
    editingText: '',
    setEditingText: vi.fn(),
    handleCancelEdit: vi.fn(),
    handleSaveEdit: vi.fn(),
    isSavingEdit: false,
    isComposingRef: { current: false },
    lastCompositionEndMsRef: { current: 0 },
    handleRestoreMessage: vi.fn(),
    isDannyAccount: true,
    handleToggleReaction: vi.fn(),
    hasUserReacted: vi.fn(() => false),
    renderReactionPickerContent: () => null,
    handleBuzzMessage: vi.fn(),
    handleStartEdit: vi.fn(),
    handleDeleteMessage: vi.fn(),
    threadInputRef: createRef(),
    threadInput: '',
    setThreadInput: vi.fn(),
    handleSendThreadReply: vi.fn(),
    threadAttachments: [],
    setThreadAttachments: vi.fn(),
    triggerFilePicker: vi.fn(),
    setRichEditorModalState: vi.fn(),
    renderComposerEmojiPickerContent: () => null,
    antdMessage: { success: vi.fn(), error: vi.fn() },
    getThreadReplyReadBreakdown: () => ({ seenBy: [], unseenBy: [] }),
    stoppedReadersByReplyId: {},
    aiThinkingActive: false,
    aiElapsedSec: 0,
    renderStagedAttachmentsStrip: () => null,
    renderMentionAutocompleteDropdown: () => null,
    renderAppleNotesFormatToolbar: () => null,
    checkForMentionTrigger: vi.fn(),
    handleMentionKeyDown: vi.fn(() => false),
    handleApplyFormat: vi.fn(),
    handleSmartListEnterKey: vi.fn(() => null),
    setThreadCursorPos: vi.fn(),
    canUseAiCopilot: true,
    isStrictDannySuperAdmin: true,
    openMissionModalFromChat: vi.fn(),
    uniqueTasks: [],
    setSaveThreadWorkflowModalOpen: vi.fn(),
    renderMessageAttachments: () => null,
    renderLiveMissionCard: () => null,
    setHistoryModalMessage: vi.fn(),
    setHistoryModalOpen: vi.fn(),
    movingThreadItemKey: null,
    openMovePopoverKey: null,
    setOpenMovePopoverKey: vi.fn(),
  };

  it('renders reply action button for root message and reply messages in subthread', () => {
    render(<MosChatThreadDrawer {...defaultProps} />);

    // Root message reply button
    const rootReplyBtn = screen.getByRole('button', { name: 'Trả lời tin nhắn gốc trong luồng' });
    expect(rootReplyBtn).toBeInTheDocument();

    // Reply items buttons
    const replyButtons = screen.getAllByRole('button', { name: 'Trả lời phản hồi này trong luồng' });
    expect(replyButtons.length).toBe(2);
  });

  it('activates quoting preview banner when clicking reply button on a thread reply', async () => {
    render(<MosChatThreadDrawer {...defaultProps} />);

    const replyButtons = screen.getAllByRole('button', { name: 'Trả lời phản hồi này trong luồng' });
    // Click reply on Bảo Hân's comment
    fireEvent.click(replyButtons[0]);

    // Quoting banner should appear
    expect(screen.getByText('Trả lời Bảo Hân:')).toBeInTheDocument();
    expect(
      screen.getAllByText('Em thấy trên mobile có nút vuốt và trích dẫn rất tiện ạ').length
    ).toBeGreaterThanOrEqual(2);

    // Cancel quote button should be rendered
    const cancelBtn = screen.getByRole('button', { name: 'Hủy trích dẫn' });
    expect(cancelBtn).toBeInTheDocument();

    // Clicking cancel should dismiss the quote banner
    fireEvent.click(cancelBtn);
    expect(screen.queryByText('Trả lời Bảo Hân:')).not.toBeInTheDocument();
  });

  it('activates quoting preview banner when clicking reply on root message', async () => {
    render(<MosChatThreadDrawer {...defaultProps} />);

    const rootReplyBtn = screen.getByRole('button', { name: 'Trả lời tin nhắn gốc trong luồng' });
    fireEvent.click(rootReplyBtn);

    expect(screen.getByText('Trả lời Anh Danny:')).toBeInTheDocument();
    expect(
      screen.getAllByText('Cần kiểm tra lại tính năng reply trong subthread trên desktop').length
    ).toBeGreaterThanOrEqual(2);
  });

  it('submits quote-formatted text when sending a reply while quoting banner is active', () => {
    const handleSendThreadReply = vi.fn();
    render(
      <MosChatThreadDrawer
        {...defaultProps}
        threadInput="Đúng rồi em đang bổ sung nhé"
        handleSendThreadReply={handleSendThreadReply}
      />
    );

    const replyButtons = screen.getAllByRole('button', { name: 'Trả lời phản hồi này trong luồng' });
    fireEvent.click(replyButtons[1]); // Minh Thảo

    expect(screen.getByText('Trả lời Minh Thảo:')).toBeInTheDocument();

    // Click send button
    const sendBtn = screen.getByRole('button', { name: 'Gửi vào luồng' });
    fireEvent.click(sendBtn);

    expect(handleSendThreadReply).toHaveBeenCalledTimes(1);
    const sentText = handleSendThreadReply.mock.calls[0][0];
    expect(sentText).toContain('> Trích dẫn @Minh Thảo: Trên desktop em bấm vào chưa thấy có nút reply tương tự');
    expect(sentText).toContain('Đúng rồi em đang bổ sung nhé');

    // Quote preview banner should be dismissed after submit
    expect(screen.queryByText('Trả lời Minh Thảo:')).not.toBeInTheDocument();
  });

  it('dismisses quoting banner when pressing Escape in textarea', () => {
    render(<MosChatThreadDrawer {...defaultProps} />);

    const replyButtons = screen.getAllByRole('button', { name: 'Trả lời phản hồi này trong luồng' });
    fireEvent.click(replyButtons[0]);

    expect(screen.getByText('Trả lời Bảo Hân:')).toBeInTheDocument();

    const textarea = screen.getByPlaceholderText(/Trả lời vào luồng/);
    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(screen.queryByText('Trả lời Bảo Hân:')).not.toBeInTheDocument();
  });

  it('supports Shift+Enter in subthread and handles smart list continuation (e.g. • or 1.)', () => {
    const setThreadInput = vi.fn();
    const handleSmartListEnterKey = vi.fn().mockReturnValue({
      handled: true,
      nextText: '• Ý 1\n• ',
      nextCursor: 7,
    });

    render(
      <MosChatThreadDrawer
        {...defaultProps}
        threadInput="• Ý 1"
        setThreadInput={setThreadInput}
        handleSmartListEnterKey={handleSmartListEnterKey}
      />
    );

    const textarea = screen.getByPlaceholderText(/Trả lời vào luồng/) as HTMLTextAreaElement;
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

    expect(handleSmartListEnterKey).toHaveBeenCalledWith('• Ý 1', 0, 0);
    expect(setThreadInput).toHaveBeenCalledWith('• Ý 1\n• ');
  });

  it('renders quick newline button (CornerDownLeft) and Enter/Shift+Enter hint in subthread', () => {
    const setThreadInput = vi.fn();
    render(<MosChatThreadDrawer {...defaultProps} threadInput="Đoạn văn" setThreadInput={setThreadInput} />);

    // Quick newline button
    const newlineBtn = screen.getByRole('button', { name: 'Xuống dòng trong luồng' });
    expect(newlineBtn).toBeInTheDocument();

    fireEvent.click(newlineBtn);
    expect(setThreadInput).toHaveBeenCalledWith('Đoạn văn\n');

    // Shortcut hint
    expect(screen.getByText('Enter gửi · Shift+Enter xuống dòng')).toBeInTheDocument();
  });

  it('keeps own thread reply bubble content left-aligned (text-left) while aligning bubble to the right via flex-row-reverse (MOS-BUG-155)', () => {
    const activeMsgWithMyReply: MosChatMessage = {
      ...mockActiveMessage,
      thread: [
        ...(mockActiveMessage.thread || []),
        {
          id: 'reply-mine-155',
          senderId: 'user-1',
          senderName: 'Nguyễn Quang Khải',
          senderRole: 'Admin',
          text: '**1. 💰 Doanh thu**\n- Duy trì doanh thu trung bình **20M/ngày**.',
          timeLabel: '19:51',
          createdAt: '2026-10-26T12:51:09.000Z',
        },
      ],
    };

    const { container } = render(
      <MosChatThreadDrawer
        {...defaultProps}
        activeThreadMessage={activeMsgWithMyReply}
        isMessageFromCurrentUser={(m: SafeAny) => m.senderId === 'user-1'}
      />
    );

    const myReplyRow = container.querySelector('#mos-chat-reply-reply-mine-155');
    expect(myReplyRow).not.toBeNull();
    const flexRow = myReplyRow?.firstElementChild as HTMLElement;
    expect(flexRow.className).toContain('flex-row-reverse');

    const bubble = flexRow.querySelector('.rounded-tr-sm') as HTMLElement;
    expect(bubble).not.toBeNull();
    expect(bubble.className).toContain('text-left');
    expect(bubble.className).not.toContain('text-right');
  });
});
