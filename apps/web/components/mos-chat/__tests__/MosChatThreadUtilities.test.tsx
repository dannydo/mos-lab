import React, { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MosChatThreadDrawer } from '../components/MosChatThreadDrawer';
import type { MosChatMessage, SafeAny } from '@mos-lab/shared';

describe('MosChatThreadUtilities - Utilities parity between main chat and thread (MOS-BUG-181)', () => {
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
    text: 'Tin nhắn gốc cần bổ sung tiện ích trong luồng',
    timeLabel: '10:30',
    createdAt: '2026-10-26T10:30:00.000Z',
    thread: [
      {
        id: 'reply-1',
        senderId: 'user-tech-1',
        senderName: 'Bảo Hân',
        senderRole: 'Chuyên Viên Mi',
        text: 'Em cần đính kèm thẻ khách hàng và link Drive vào luồng ạ',
        timeLabel: '10:32',
        createdAt: '2026-10-26T10:32:00.000Z',
      },
    ],
  };

  const createDefaultProps = (overrides?: Partial<SafeAny>): SafeAny => ({
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
    setDriveLinkModalOpen: vi.fn(),
    uploadTargetRef: { current: { scope: 'main' } },
    handleOpenCustomerPicker: vi.fn(),
    stagedCustomerCard: null,
    setStagedCustomerCard: vi.fn(),
    openTaskModalFromMessage: vi.fn(),
    isUrgentSendThread: false,
    setIsUrgentSendThread: vi.fn(),
    setTriggerWorkflowModalOpen: vi.fn(),
    setInitialWorkflowCode: vi.fn(),
    ...overrides,
  });

  it('renders all utilities on desktop thread composer: Drive, Customer Card, Task, Urgent Buzz, Workflow', () => {
    const props = createDefaultProps();
    render(<MosChatThreadDrawer {...props} />);

    // Drive attachment button
    const driveBtn = screen.getByRole('button', { name: 'Đính kèm hình từ link Google Drive vào luồng' });
    expect(driveBtn).toBeInTheDocument();
    fireEvent.click(driveBtn);
    expect(props.setDriveLinkModalOpen).toHaveBeenCalledWith(true);
    expect(props.uploadTargetRef.current.scope).toBe('thread');

    // Customer Card picker button
    const customerCardBtn = screen.getByRole('button', { name: 'Đính kèm thẻ Khách hàng vào luồng' });
    expect(customerCardBtn).toBeInTheDocument();
    fireEvent.click(customerCardBtn);
    expect(props.handleOpenCustomerPicker).toHaveBeenCalledWith('thread');

    // Task creation button
    const taskBtn = screen.getByRole('button', { name: 'Giao Task & Cài nhắc hẹn mới từ tin nhắn luồng' });
    expect(taskBtn).toBeInTheDocument();
    fireEvent.click(taskBtn);
    expect(props.openTaskModalFromMessage).toHaveBeenCalledWith(mockActiveMessage);

    // Urgent mode toggle button
    const urgentBtn = screen.getByRole('button', { name: 'Chế độ khẩn cấp trong luồng' });
    expect(urgentBtn).toBeInTheDocument();
    fireEvent.click(urgentBtn);
    expect(props.setIsUrgentSendThread).toHaveBeenCalled();

    // Workflow trigger button for super admin
    const workflowBtn = screen.getByRole('button', { name: 'Khởi tạo Quy trình Sống trong luồng' });
    expect(workflowBtn).toBeInTheDocument();
    fireEvent.click(workflowBtn);
    expect(props.setInitialWorkflowCode).toHaveBeenCalledWith('WF_CASH_ADVANCE');
    expect(props.setTriggerWorkflowModalOpen).toHaveBeenCalledWith(true);
  });

  it('displays staged customer card in thread composer and clears when clicking dismiss', () => {
    const mockCard = {
      id: 888,
      name: 'Nguyễn Thị Thuý',
      phone: '0901234567',
      meta: 'VIP Gold · 12 buổi',
      cvName: 'Bảo Hân',
    };
    const setStagedCustomerCard = vi.fn();
    const props = createDefaultProps({
      stagedCustomerCard: mockCard,
      setStagedCustomerCard,
    });

    render(<MosChatThreadDrawer {...props} />);

    expect(screen.getByText('Nguyễn Thị Thuý')).toBeInTheDocument();
    expect(screen.getByText('(VIP Gold · 12 buổi)')).toBeInTheDocument();

    const dismissBtn = screen.getByRole('button', { name: 'Bỏ đính kèm thẻ khách hàng khỏi luồng' });
    expect(dismissBtn).toBeInTheDocument();
    fireEvent.click(dismissBtn);
    expect(setStagedCustomerCard).toHaveBeenCalledWith(null);
  });

  it('renders task creation button for individual thread replies', () => {
    const openTaskModalFromMessage = vi.fn();
    const props = createDefaultProps({ openTaskModalFromMessage });

    render(<MosChatThreadDrawer {...props} />);

    const replyTaskBtn = screen.getByRole('button', { name: 'Tạo Task & Hẹn giờ nhắc từ phản hồi này' });
    expect(replyTaskBtn).toBeInTheDocument();

    fireEvent.click(replyTaskBtn);
    expect(openTaskModalFromMessage).toHaveBeenCalledWith(mockActiveMessage, mockActiveMessage.thread![0]);
  });

  it('renders mobile [+] action expander button and opens quick utilities grid in thread', () => {
    const props = createDefaultProps({ isMobile: true, mobileActiveView: 'thread' });
    render(<MosChatThreadDrawer {...props} />);

    const expanderBtn = screen.getByRole('button', { name: 'Mở tiện ích đính kèm' });
    expect(expanderBtn).toBeInTheDocument();

    // Open mobile action drawer
    fireEvent.click(expanderBtn);

    // Utilities grid items should be displayed
    expect(screen.getByText('Gửi ảnh')).toBeInTheDocument();
    expect(screen.getByText('Drive')).toBeInTheDocument();
    expect(screen.getByText('Thẻ khách')).toBeInTheDocument();
    expect(screen.getByText('Giao việc')).toBeInTheDocument();
    expect(screen.getByText('Nhắc tên')).toBeInTheDocument();
    expect(screen.getByText('Gọi @MAI')).toBeInTheDocument();
    expect(screen.getByText('CKEditor')).toBeInTheDocument();

    // Clicking Drive in mobile grid
    const driveMobileBtn = screen.getByText('Drive').closest('button');
    expect(driveMobileBtn).toBeInTheDocument();
    fireEvent.click(driveMobileBtn!);
    expect(props.setDriveLinkModalOpen).toHaveBeenCalledWith(true);
    expect(props.uploadTargetRef.current.scope).toBe('thread');
  });
});
