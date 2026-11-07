import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { copyMessageToClipboard } from '../utils/chat-helpers';
import { MosChatMessageFeed, type MosChatMessageFeedProps } from '../components/MosChatMessageFeed';
import { MosChatThreadDrawer, type MosChatThreadDrawerProps } from '../components/MosChatThreadDrawer';
import type { MosChatMessage, SafeAny } from '@mos-lab/shared';
import { message as antdMessage } from 'antd';

describe('MOS-FEAT-205: Message Copying in Thread and Main Feed', () => {
  const originalClipboard = navigator.clipboard;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.assign(navigator, { clipboard: originalClipboard });
  });

  describe('copyMessageToClipboard helper', () => {
    it('copies text content to clipboard successfully', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });
      const successSpy = vi.spyOn(antdMessage, 'success').mockImplementation(() => ({} as SafeAny));

      const res = await copyMessageToClipboard('Nội dung tin nhắn thử nghiệm');
      expect(res).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('Nội dung tin nhắn thử nghiệm');
      expect(successSpy).toHaveBeenCalledWith('Đã sao chép nội dung tin nhắn');
    });

    it('copies attachment url when text is empty', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });
      const successSpy = vi.spyOn(antdMessage, 'success').mockImplementation(() => ({} as SafeAny));

      const res = await copyMessageToClipboard('', [{ url: 'https://cdn.example.com/photo.png' }]);
      expect(res).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('https://cdn.example.com/photo.png');
      expect(successSpy).toHaveBeenCalledWith('Đã sao chép nội dung tin nhắn');
    });

    it('warns when both text and attachments are absent', async () => {
      const warnSpy = vi.spyOn(antdMessage, 'warning').mockImplementation(() => ({} as SafeAny));
      const res = await copyMessageToClipboard('   ', []);
      expect(res).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith('Tin nhắn không có nội dung để sao chép');
    });

    it('supports custom success toast message', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });
      const successSpy = vi.spyOn(antdMessage, 'success').mockImplementation(() => ({} as SafeAny));

      const res = await copyMessageToClipboard('Nội dung phản hồi', null, {
        customSuccessMsg: 'Đã sao chép phản hồi',
      });
      expect(res).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith('Nội dung phản hồi');
      expect(successSpy).toHaveBeenCalledWith('Đã sao chép phản hồi');
    });
  });

  describe('MosChatMessageFeed - Copy button on main messages', () => {
    const mockCurrentUser = {
      id: 'user-danny',
      username: 'dannydo',
      displayName: 'Danny Do',
      role: 'super_admin',
    };

    const mockMessage: MosChatMessage = {
      id: 'msg-main-1',
      conversationId: 'conv-general',
      senderId: 'user-tech-1',
      senderName: 'Bảo Hân',
      senderRole: 'Kỹ thuật viên',
      text: 'Tin nhắn ở luồng chính cần sao chép',
      timeLabel: '14:20',
      createdAt: '2026-11-07T14:20:00.000Z',
    };

    const feedProps: SafeAny = {
      isMobile: false,
      activeConversation: {
        id: 'conv-general',
        type: 'space',
        name: 'Chung',
        messages: [mockMessage],
      },
      currentUser: mockCurrentUser,
      isDark: true,
      token: {
        colorText: '#ffffff',
        colorTextSecondary: '#94a3b8',
        colorBorder: '#334155',
      },
      surfaceRaised: '#1e293b',
      borderColor: '#334155',
      borderStrong: '#475569',
      accentSoftBg: 'rgba(212, 168, 75, 0.1)',
      accentBorder: 'rgba(212, 168, 75, 0.4)',
      pinnedMessages: [],
      pinnedBannerIndex: 0,
      setPinnedBannerIndex: vi.fn(),
      navigateToMessage: vi.fn(),
      setActiveSubtab: vi.fn(),
      handleTogglePin: vi.fn(),
      formatMoveTargetSnippet: vi.fn(),
      mainMessagesContainerRef: { current: null },
      messagesEndRef: { current: null },
      uniqueTasks: [],
      isMessageFromCurrentUser: vi.fn(() => false),
      getMessageReadBreakdown: vi.fn(() => ({ seenBy: [], unseenBy: [] })),
      stoppedReadersByMsgId: {},
      getThreadReplyReadBreakdown: () => ({ seenBy: [], unseenBy: [] }),
      stoppedReadersByReplyId: {},
      canManageChatThreads: true,
      AI_COPILOT_CONV_ID: 'conv-ai',
      draggingRootMsgId: null,
      setDraggingRootMsgId: vi.fn(),
      dragOverTargetMsgId: null,
      setDragOverTargetMsgId: vi.fn(),
      setDragOverThreadPane: vi.fn(),
      handleMoveThreadItem: vi.fn(),
      highlightedMsgId: null,
      getMemberNickname: vi.fn(),
      renderReadStatusCheckmark: vi.fn(),
      renderUserAvatarNode: vi.fn(),
      expandedThinkingIds: new Set(),
      setExpandedThinkingIds: vi.fn(),
      editingMessageId: null,
      editingReplyId: null,
      editingText: '',
      setEditingText: vi.fn(),
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
      renderRichTextMessage: (text: string) => <span>{text}</span>,
      appliedActionIds: {},
      handleExecuteAiAction: vi.fn(),
      speakingMsgId: null,
      ttsSpeed: 1,
      handleSpeakAiMessage: vi.fn(),
      handleSetTtsSpeed: vi.fn(),
      hasUserReacted: vi.fn(() => false),
      handleToggleReaction: vi.fn(),
      mobileActiveMsgId: null,
      openMovePopoverKey: null,
      setOpenMovePopoverKey: vi.fn(),
      setMoveThreadSearchQuery: vi.fn(),
      renderMoveRootToThreadPopover: vi.fn(),
      renderMoveReplyPopover: vi.fn(),
      renderReactionPickerContent: vi.fn(),
      handleOpenThread: vi.fn(),
      openTaskModalFromMessage: vi.fn(),
      isStrictDannySuperAdmin: true,
      openMissionModalFromChat: vi.fn(),
      handleBuzzMessage: vi.fn(),
      handleStartEdit: vi.fn(),
      handleDeleteMessage: vi.fn(),
      renderMessageAttachments: vi.fn(),
      openCustomerDetail: vi.fn(),
    };

    it('renders Copy button and copies main message text on click', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<MosChatMessageFeed {...(feedProps as MosChatMessageFeedProps)} />);

      const copyBtn = screen.getByLabelText('Sao chép tin nhắn');
      expect(copyBtn).toBeDefined();

      fireEvent.click(copyBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith('Tin nhắn ở luồng chính cần sao chép');
      });
    });
  });

  describe('MosChatThreadDrawer - Copy button in subthread', () => {
    const mockCurrentUser = {
      id: 'user-danny',
      username: 'dannydo',
      displayName: 'Danny Do',
      role: 'super_admin',
    };

    const mockActiveThreadMessage: MosChatMessage = {
      id: 'msg-root-100',
      conversationId: 'conv-general',
      senderId: 'user-boss',
      senderName: 'Anh Danny',
      senderRole: 'Super Admin',
      text: 'Tin nhắn gốc của luồng cần sao chép',
      timeLabel: '14:00',
      createdAt: '2026-11-07T14:00:00.000Z',
      thread: [
        {
          id: 'reply-1',
          senderId: 'user-tech-1',
          senderName: 'Bảo Hân',
          senderRole: 'Kỹ thuật viên',
          text: 'Phản hồi trong luồng cần sao chép',
          timeLabel: '14:05',
          createdAt: '2026-11-07T14:05:00.000Z',
        },
      ],
    };

    const threadProps: SafeAny = {
      threadOpen: true,
      activeThreadMessage: mockActiveThreadMessage,
      activeConversation: { id: 'conv-general', messages: [mockActiveThreadMessage] },
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
      onClose: vi.fn(),
      threadInput: '',
      setThreadInput: vi.fn(),
      handleSendThreadReply: vi.fn(),
      threadAttachments: [],
      setThreadAttachments: vi.fn(),
      triggerFilePicker: vi.fn(),
      setRichEditorModalState: vi.fn(),
      renderComposerEmojiPickerContent: () => null,
      threadStagedCustomerCard: null,
      setThreadStagedCustomerCard: vi.fn(),
      isSendingThread: false,
      isUrgentSendThread: false,
      setIsUrgentSendThread: vi.fn(),
      speakingMsgId: null,
      ttsSpeed: 1,
      handleSpeakAiMessage: vi.fn(),
      handleSetTtsSpeed: vi.fn(),
      openStickerPopoverKey: null,
      setOpenStickerPopoverKey: vi.fn(),
      renderReactionPickerContent: () => null,
      replyingToReply: null,
      setReplyingToReply: vi.fn(),
      threadInputRef: { current: null },
      cleanQuotedText: (t: string) => t,
      renderUserAvatarNode: ({ name }: SafeAny) => <div>Avatar-{name}</div>,
      renderRichTextMessage: (t: string) => <span>{t}</span>,
      renderMessageAttachments: () => null,
      openCustomerDetail: vi.fn(),
      hasUserReacted: vi.fn(() => false),
      handleToggleReaction: vi.fn(),
      handleRemoveAttachment: vi.fn(),
      handlePasteImages: vi.fn(),
      handleProcessImageFiles: vi.fn(),
      threadFileInputRef: { current: null },
      threadFeedRefs: { current: {} },
      threadMessagesContainerRef: { current: null },
      uniqueTasks: [],
      handleUpdateTask: vi.fn(),
      openTaskModalFromMessage: vi.fn(),
      handleBuzzMessage: vi.fn(),
      isMessageFromCurrentUser: vi.fn(() => false),
      canManageChatThreads: true,
      openMovePopoverKey: null,
      setOpenMovePopoverKey: vi.fn(),
      setMoveThreadSearchQuery: vi.fn(),
      renderMoveReplyPopover: vi.fn(),
      handleStartEdit: vi.fn(),
      editingReplyId: null,
      editingText: '',
      setEditingText: vi.fn(),
      handleCancelEdit: vi.fn(),
      handleSaveEdit: vi.fn(),
      isSavingEdit: false,
      isComposingRef: { current: false },
      lastCompositionEndMsRef: { current: 0 },
      isDannyAccount: true,
      handleDeleteMessage: vi.fn(),
      setHistoryModalMessage: vi.fn(),
      setHistoryModalOpen: vi.fn(),
      stoppedReadersByMsgId: {},
      getThreadReplyReadBreakdown: () => ({ seenBy: [], unseenBy: [] }),
      stoppedReadersByReplyId: {},
      renderReadStatusCheckmark: () => null,
      renderMiniSeenAvatarStack: () => null,
      AI_COPILOT_CONV_ID: 'conv-ai',
      isStrictDannySuperAdmin: true,
      handleRestoreMessage: vi.fn(),
      openMissionModalFromChat: vi.fn(),
      getMemberNickname: vi.fn(),
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
      setSaveThreadWorkflowModalOpen: vi.fn(),
      renderLiveMissionCard: () => null,
      movingThreadItemKey: null,
    };

    it('renders Copy button for thread root message and copies text', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<MosChatThreadDrawer {...(threadProps as MosChatThreadDrawerProps)} />);

      const rootCopyBtn = screen.getByLabelText('Sao chép tin nhắn gốc trong luồng');
      expect(rootCopyBtn).toBeDefined();

      fireEvent.click(rootCopyBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith('Tin nhắn gốc của luồng cần sao chép');
      });
    });

    it('renders Copy button for thread replies and copies reply text', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        clipboard: {
          writeText: writeTextMock,
        },
      });

      render(<MosChatThreadDrawer {...(threadProps as MosChatThreadDrawerProps)} />);

      const replyCopyBtn = screen.getByLabelText('Sao chép phản hồi trong luồng');
      expect(replyCopyBtn).toBeDefined();

      fireEvent.click(replyCopyBtn);

      await waitFor(() => {
        expect(writeTextMock).toHaveBeenCalledWith('Phản hồi trong luồng cần sao chép');
      });
    });
  });
});
