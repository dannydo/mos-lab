import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { MosChatMessage } from '@mos-lab/shared';
import { MosChatMessageFeed, type MosChatMessageFeedProps } from '../components/MosChatMessageFeed';
import { MosChatComposer, type MosChatComposerProps } from '../components/MosChatComposer';

describe('mOS Chat Desktop Reply to Message (MOS-BUG-214)', () => {
  const mockMessage: MosChatMessage = {
    id: 'msg-test-101',
    conversationId: 'space-core-team',
    senderId: 'user-danny',
    senderName: 'Nguyễn Quang Khải',
    senderRole: 'Super Admin',
    text: 'DNTT cho Zalo OA 6 tháng 15 member @Bùi Sinh Nguyên',
    timeLabel: '01:16',
    createdAt: '2026-11-11T01:16:00.000Z',
    reactions: {},
    thread: [],
  };

  const defaultFeedProps: Partial<MosChatMessageFeedProps> = {
    isMobile: false,
    activeConversation: {
      id: 'space-core-team',
      type: 'space',
      name: 'core-team',
      messages: [mockMessage],
    } as any,
    currentUser: { id: 'user-danny', displayName: 'Nguyễn Quang Khải', role: 'super_admin' },
    isDark: true,
    token: { colorTextSecondary: '#94a3b8', colorText: '#f8fafc' },
    surfaceRaised: '#1e293b',
    borderColor: '#334155',
    borderStrong: '#475569',
    accentSoftBg: 'rgba(212, 168, 75, 0.1)',
    accentBorder: '#d4a84b',
    pinnedMessages: [],
    pinnedBannerIndex: 0,
    setPinnedBannerIndex: vi.fn(),
    navigateToMessage: vi.fn(),
    setActiveSubtab: vi.fn(),
    handleTogglePin: vi.fn(),
    formatMoveTargetSnippet: () => '',
    mainMessagesContainerRef: { current: null },
    messagesEndRef: { current: null },
    uniqueTasks: [],
    isMessageFromCurrentUser: () => true,
    getMessageReadBreakdown: () => ({ seenBy: [], unseenBy: [] }),
    stoppedReadersByMsgId: {},
    canManageChatThreads: true,
    AI_COPILOT_CONV_ID: 'ai-copilot',
    draggingRootMsgId: null,
    setDraggingRootMsgId: vi.fn(),
    dragOverTargetMsgId: null,
    setDragOverTargetMsgId: vi.fn(),
    setDragOverThreadPane: vi.fn(),
    handleMoveThreadItem: vi.fn(),
    highlightedMsgId: null,
    getMemberNickname: () => undefined,
    renderReadStatusCheckmark: () => null,
    renderUserAvatarNode: () => null,
    expandedThinkingIds: {},
    setExpandedThinkingIds: vi.fn(),
    editingMessageId: null,
    editingReplyId: null,
    editingText: '',
    handleCancelEdit: vi.fn(),
    handleSaveEdit: vi.fn(),
    isSavingEdit: false,
    isComposingRef: { current: false },
    lastCompositionEndMsRef: { current: 0 },
    setHistoryModalMessage: vi.fn(),
    setHistoryModalOpen: vi.fn(),
    isDannyAccount: true,
    handleRestoreMessage: vi.fn(),
    handleMessageTap: vi.fn(),
    heartFlyMsgId: null,
    renderRichTextMessage: (t) => t,
    appliedActionIds: {},
    handleExecuteAiAction: vi.fn(),
    speakingMsgId: null,
    ttsSpeed: 1,
    handleSpeakAiMessage: vi.fn(),
    handleSetTtsSpeed: vi.fn(),
    hasUserReacted: () => false,
    handleToggleReaction: vi.fn(),
    mobileActiveMsgId: null,
    openMovePopoverKey: null,
    setOpenMovePopoverKey: vi.fn(),
    openStickerPopoverKey: null,
    setOpenStickerPopoverKey: vi.fn(),
    renderReactionPickerContent: () => null,
    handleOpenThread: vi.fn(),
    openTaskModalFromMessage: vi.fn(),
    isStrictDannySuperAdmin: true,
    openMissionModalFromChat: vi.fn(),
    handleBuzzMessage: vi.fn(),
    handleStartEdit: vi.fn(),
    handleDeleteMessage: vi.fn(),
    renderMiniSeenAvatarStack: () => null,
    aiThinkingActive: false,
    aiElapsedSec: 0,
    getThreadReplyReadBreakdown: () => ({ seenBy: [], unseenBy: [] }),
    renderTaskCard: () => null,
    renderLiveMissionCard: () => null,
    workflowInstances: [],
    setWorkflowInstances: vi.fn(),
    currentUserStaffMember: null,
    fetchBootstrap: vi.fn() as any,
    setLightboxImage: vi.fn(),
    movingThreadItemKey: null,
    threadOpen: false,
    activeThreadMessage: null,
    isDraggingOver: false,
    antdMessage: { success: vi.fn(), error: vi.fn() },
    renderMessageAttachments: () => null,
    openCustomerDetail: vi.fn(),
  };

  const defaultComposerProps: Partial<MosChatComposerProps> = {
    isMobile: false,
    activeConversation: {
      id: 'space-core-team',
      type: 'space',
      name: 'core-team',
      messages: [mockMessage],
    } as any,
    currentUser: { id: 'user-danny', displayName: 'Nguyễn Quang Khải', role: 'super_admin' },
    canUseAiCopilot: true,
    isStrictDannySuperAdmin: true,
    aiThinkingActive: false,
    isDark: true,
    surfaceBg: '#0f172a',
    surfaceRaised: '#1e293b',
    borderColor: '#334155',
    borderStrong: '#475569',
    composerTextRef: { current: '' },
    composerHasText: false,
    updateComposerText: vi.fn(),
    setComposerText: vi.fn(),
    setComposerCursorPos: vi.fn(),
    composerInputRef: { current: null },
    stagedAttachments: [],
    renderStagedAttachmentsStrip: () => null,
    stagedCustomerCard: null,
    setStagedCustomerCard: vi.fn(),
    isUrgentSend: false,
    setIsUrgentSend: vi.fn(),
    handleSendMessage: vi.fn() as any,
    handleSendMain: vi.fn(),
    triggerFilePicker: vi.fn(),
    openTaskModalFromMessage: vi.fn(),
    checkForMentionTrigger: vi.fn(),
    handleClipboardPaste: vi.fn(),
    handleMentionKeyDown: () => false,
    handleApplyFormat: vi.fn(),
    renderMentionAutocompleteDropdown: () => null,
    renderAppleNotesFormatToolbar: () => null,
    renderComposerEmojiPickerContent: () => null,
    renderRichTextMessage: (t) => t,
    setDriveLinkModalOpen: vi.fn(),
    uploadTargetRef: { current: null },
    setTriggerWorkflowModalOpen: vi.fn(),
    setInitialWorkflowCode: vi.fn(),
    setRichEditorModalState: vi.fn(),
    isComposingRef: { current: false },
    lastCompositionEndMsRef: { current: 0 },
  };

  it('renders reply action button "Trả lời tin nhắn này" on message hover bar in MosChatMessageFeed', () => {
    const handleReplyToMessage = vi.fn();
    render(
      <MosChatMessageFeed
        {...(defaultFeedProps as MosChatMessageFeedProps)}
        handleReplyToMessage={handleReplyToMessage}
      />
    );

    const replyBtn = screen.getByRole('button', { name: 'Trả lời tin nhắn này' });
    expect(replyBtn).toBeInTheDocument();

    fireEvent.click(replyBtn);
    expect(handleReplyToMessage).toHaveBeenCalledTimes(1);
    expect(handleReplyToMessage).toHaveBeenCalledWith(mockMessage);
  });

  it('triggers handleReplyToMessage when double clicking message bubble in MosChatMessageFeed', () => {
    const handleReplyToMessage = vi.fn();
    render(
      <MosChatMessageFeed
        {...(defaultFeedProps as MosChatMessageFeedProps)}
        handleReplyToMessage={handleReplyToMessage}
      />
    );

    const msgBubble = screen.getByText('DNTT cho Zalo OA 6 tháng 15 member @Bùi Sinh Nguyên').closest('div');
    expect(msgBubble).toBeInTheDocument();

    fireEvent.doubleClick(msgBubble!);
    expect(handleReplyToMessage).toHaveBeenCalledWith(mockMessage);
  });

  it('renders quoting preview banner in MosChatComposer when replyingToMessage is set', () => {
    const setReplyingToMessage = vi.fn();
    render(
      <MosChatComposer
        {...(defaultComposerProps as MosChatComposerProps)}
        replyingToMessage={mockMessage}
        setReplyingToMessage={setReplyingToMessage}
      />
    );

    expect(screen.getByText('Trả lời Nguyễn Quang Khải:')).toBeInTheDocument();
    expect(screen.getByText('DNTT cho Zalo OA 6 tháng 15 member @Bùi Sinh Nguyên')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Hủy trích dẫn' });
    expect(cancelBtn).toBeInTheDocument();

    fireEvent.click(cancelBtn);
    expect(setReplyingToMessage).toHaveBeenCalledWith(null);
  });

  it('dismisses quoting banner when pressing Escape key in MosChatComposer textarea', () => {
    const setReplyingToMessage = vi.fn();
    render(
      <MosChatComposer
        {...(defaultComposerProps as MosChatComposerProps)}
        replyingToMessage={mockMessage}
        setReplyingToMessage={setReplyingToMessage}
      />
    );

    const textarea = screen.getByPlaceholderText(/Nhắn tin, gõ @MAI/);
    fireEvent.keyDown(textarea, { key: 'Escape' });

    expect(setReplyingToMessage).toHaveBeenCalledWith(null);
  });

  it('renders quoted message in MosChatMessageFeed when message contains replyTo metadata', () => {
    const replyMessageWithQuote: MosChatMessage = {
      id: 'msg-reply-102',
      conversationId: 'space-core-team',
      senderId: 'user-bui-sinh-nguyen',
      senderName: 'Bùi Sinh Nguyên',
      senderRole: 'Kỹ thuật viên',
      text: 'Dạ em đã nhận thông tin và đang xử lý.',
      timeLabel: '01:20',
      createdAt: '2026-11-11T01:20:00.000Z',
      replyToId: 'msg-test-101',
      replyTo: {
        id: 'msg-test-101',
        senderId: 'user-danny',
        senderName: 'Nguyễn Quang Khải',
        text: 'DNTT cho Zalo OA 6 tháng 15 member @Bùi Sinh Nguyên',
      },
    };

    render(
      <MosChatMessageFeed
        {...(defaultFeedProps as MosChatMessageFeedProps)}
        activeConversation={
          {
            id: 'space-core-team',
            type: 'space',
            name: 'core-team',
            messages: [mockMessage, replyMessageWithQuote],
          } as any
        }
      />
    );

    expect(screen.getByText('Dạ em đã nhận thông tin và đang xử lý.')).toBeInTheDocument();
    // The quote box inside the reply
    const quoteAuthor = screen.getByText('Nguyễn Quang Khải', { selector: 'p' });
    expect(quoteAuthor).toBeInTheDocument();
  });
});
