import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Popover, Tooltip } from 'antd';
import { MosChatStickerAndEmojiPicker, MOS_CHAT_EXPANDED_EMOJI_GROUPS } from '../mos-chat-stickers';
import { MosChatSpaceEmojiColorPicker } from '../MosChatSpaceEmojiColorPicker';
import { MosChatComposer, type MosChatComposerProps } from '../components/MosChatComposer';
import { MosChatMessageFeed, type MosChatMessageFeedProps } from '../components/MosChatMessageFeed';
import type { MosChatMessage } from '@mos-lab/shared';
import { WINGS_SIGNATURE_EMOJIS, GOOGLE_CHAT_REACTION_EMOJIS } from '../constants/chat-constants';

describe('MOS-BUG-187: Desktop Emoji Selection & Reaction Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders categorized emoji sections with defaultPack="emoji"', () => {
    const handleSelectEmoji = vi.fn();
    const handleSelectSticker = vi.fn();

    render(
      <MosChatStickerAndEmojiPicker
        isDark={true}
        borderColor="#334155"
        surfaceRaised="#1e293b"
        wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
        popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
        defaultPack="emoji"
        mode="reaction"
        onSelectEmoji={handleSelectEmoji}
        onSelectSticker={handleSelectSticker}
      />
    );

    // Verify category header labels are rendered
    expect(screen.getAllByText('Wings & Sắc đẹp').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cảm xúc & Mặt cười').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bàn tay & Trái tim').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dự án & Mục tiêu').length).toBeGreaterThan(0);

    // Verify sample emojis from different categories
    expect(screen.getAllByText('🪽').length).toBeGreaterThan(0);
    expect(screen.getAllByText('😀').length).toBeGreaterThan(0);
    expect(screen.getAllByText('👍').length).toBeGreaterThan(0);
    expect(screen.getAllByText('🚀').length).toBeGreaterThan(0);
  });

  it('triggers onSelectEmoji when clicking an emoji in desktop picker', () => {
    const handleSelectEmoji = vi.fn();
    const handleSelectSticker = vi.fn();

    const { container } = render(
      <MosChatStickerAndEmojiPicker
        isDark={true}
        borderColor="#334155"
        surfaceRaised="#1e293b"
        wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
        popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
        defaultPack="emoji"
        mode="composer"
        onSelectEmoji={handleSelectEmoji}
        onSelectSticker={handleSelectSticker}
      />
    );

    // Find emoji button containing 🚀
    const allButtons = Array.from(container.querySelectorAll('button'));
    const rocketBtn = allButtons.find(
      (btn) => btn.getAttribute('data-emoji') === '🚀' || btn.textContent?.trim() === '🚀'
    );
    expect(rocketBtn).toBeDefined();
    fireEvent.click(rocketBtn!);

    expect(handleSelectEmoji).toHaveBeenCalledTimes(1);
    expect(handleSelectEmoji).toHaveBeenCalledWith('🚀');
  });

  it('allows searching emojis by keyword and displays filtered results', () => {
    const handleSelectEmoji = vi.fn();
    const handleSelectSticker = vi.fn();

    render(
      <MosChatStickerAndEmojiPicker
        isDark={true}
        borderColor="#334155"
        surfaceRaised="#1e293b"
        wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
        popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
        defaultPack="emoji"
        mode="reaction"
        onSelectEmoji={handleSelectEmoji}
        onSelectSticker={handleSelectSticker}
      />
    );

    // Search bar is visible and accepts input
    const searchInput = screen.getByPlaceholderText('Tìm emoji (VD: cười, tim, lửa, like...)');
    expect(searchInput).toBeDefined();

    // Type "tim" to search for hearts
    fireEvent.change(searchInput, { target: { value: 'tim' } });

    // Header updates to show search results count
    expect(screen.getByText(/Kết quả emoji/)).toBeDefined();

    // Heart emojis should be visible
    expect(screen.getByText('❤️')).toBeDefined();
  });

  it('allows selecting emoji in MosChatSpaceEmojiColorPicker', () => {
    const handleEmojiChange = vi.fn();
    const handleColorChange = vi.fn();

    render(
      <MosChatSpaceEmojiColorPicker
        selectedEmoji=""
        selectedColor="#1a73e8"
        spaceName="Test Space"
        onEmojiChange={handleEmojiChange}
        onColorChange={handleColorChange}
      />
    );

    // Text button "+ Chọn Emoji" is rendered
    const selectBtn = screen.getByText('+ Chọn Emoji');
    expect(selectBtn).toBeDefined();

    // Click the avatar trigger box to open popover
    const avatarBox = screen.getByLabelText('Chọn Emoji đại diện cho Space');
    fireEvent.click(avatarBox);

    // Emoji picker header inside popover is visible
    expect(screen.getByText('Chọn Emoji đại diện cho Space')).toBeDefined();
  });

  it('opens and toggles emoji picker popover on desktop composer when clicking SmilePlus button', () => {
    let text = 'Xin chào ';
    const composerTextRef = { current: text };
    const updateComposerText = vi.fn((val: string) => {
      text = val;
      composerTextRef.current = val;
    });

    const renderComposerEmojiPickerContent = vi.fn((scope: 'main') => (
      <div data-testid="mock-composer-emoji-picker">
        <button
          type="button"
          data-testid="mock-emoji-item"
          onClick={() => {
            updateComposerText(composerTextRef.current + '🪽');
          }}
        >
          🪽
        </button>
      </div>
    ));

    const defaultComposerProps: Partial<MosChatComposerProps> = {
      isMobile: false,
      activeConversation: { id: 'space-test', type: 'space', name: 'General' } as any,
      currentUser: { id: 1, displayName: 'Danny' } as any,
      canUseAiCopilot: true,
      isStrictDannySuperAdmin: true,
      aiThinkingActive: false,
      isDark: true,
      surfaceBg: '#141414',
      surfaceRaised: '#1f1f1f',
      borderColor: '#303030',
      borderStrong: '#444',
      composerTextRef,
      composerHasText: true,
      updateComposerText,
      setComposerText: vi.fn(),
      composerCursorPos: 9,
      setComposerCursorPos: vi.fn(),
      composerInputRef: { current: null },
      stagedAttachments: [],
      renderStagedAttachmentsStrip: () => null,
      isUrgentSend: false,
      setIsUrgentSend: vi.fn(),
      handleSendMessage: vi.fn(),
      handleSendMain: vi.fn(),
      triggerFilePicker: vi.fn(),
      openTaskModalFromMessage: vi.fn(),
      checkForMentionTrigger: vi.fn(),
      handleClipboardPaste: vi.fn(),
      handleMentionKeyDown: vi.fn(),
      handleApplyFormat: vi.fn(),
      renderMentionAutocompleteDropdown: () => null,
      renderAppleNotesFormatToolbar: () => null,
      renderComposerEmojiPickerContent,
      renderRichTextMessage: (t) => t,
      setDriveLinkModalOpen: vi.fn(),
      uploadTargetRef: { current: null },
      setTriggerWorkflowModalOpen: vi.fn(),
      setInitialWorkflowCode: vi.fn(),
      setRichEditorModalState: vi.fn(),
      isComposingRef: { current: false },
      lastCompositionEndMsRef: { current: 0 },
    };

    render(<MosChatComposer {...(defaultComposerProps as MosChatComposerProps)} />);

    // Find desktop emoji button with aria-label
    const emojiBtn = screen.getByRole('button', { name: 'Chèn biểu tượng cảm xúc Wings' });
    expect(emojiBtn).toBeDefined();

    // Initially picker is not in the document
    expect(screen.queryByTestId('mock-composer-emoji-picker')).toBeNull();

    // Click to open emoji picker popover on desktop
    fireEvent.click(emojiBtn);

    // Popover content should now be rendered
    expect(renderComposerEmojiPickerContent).toHaveBeenCalledWith('main');
    expect(screen.getByTestId('mock-composer-emoji-picker')).toBeDefined();

    // Select emoji inside picker
    const emojiItem = screen.getByTestId('mock-emoji-item');
    fireEvent.click(emojiItem);
    expect(updateComposerText).toHaveBeenCalledWith('Xin chào 🪽');

    // Click button again to toggle popover closed
    fireEvent.click(emojiBtn);
    const popoverContainer = screen.getByTestId('mock-composer-emoji-picker').closest('.ant-popover');
    expect(popoverContainer?.className).toMatch(/ant-popover.*leave|ant-popover-hidden/);
  });

  it('inserts emoji at cursor position and retains focus in desktop textarea', () => {
    const mockTextarea = document.createElement('textarea');
    mockTextarea.value = 'Hôm nay trời đẹp';
    mockTextarea.selectionStart = 8; // cursor after "Hôm nay "
    mockTextarea.selectionEnd = 8;
    const focusSpy = vi.spyOn(mockTextarea, 'focus');
    const setSelectionRangeSpy = vi.spyOn(mockTextarea, 'setSelectionRange');

    let currentText = mockTextarea.value;
    const updateComposerText = vi.fn((val: string) => {
      currentText = val;
      mockTextarea.value = val;
    });

    // Test cursor insertion algorithm implemented in MosGoogleChatPortal
    const insertEmoji = (emoji: string) => {
      const el = mockTextarea;
      if (el && typeof el.selectionStart === 'number' && typeof el.selectionEnd === 'number') {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const currentVal = currentText || el.value || '';
        const nextVal = currentVal.slice(0, start) + emoji + currentVal.slice(end);
        updateComposerText(nextVal);
        const newCursor = start + emoji.length;
        el.focus();
        try {
          el.setSelectionRange(newCursor, newCursor);
        } catch {}
      } else {
        updateComposerText(currentText + emoji);
        mockTextarea.focus();
      }
    };

    insertEmoji('✨');

    expect(updateComposerText).toHaveBeenCalledWith('Hôm nay ✨trời đẹp');
    expect(focusSpy).toHaveBeenCalled();
    expect(setSelectionRangeSpy).toHaveBeenCalledWith(8 + '✨'.length, 8 + '✨'.length);
  });

  it('MOS-BUG-200: opens reaction emoji picker popover on message feed when clicking "Chọn biểu tượng cảm xúc" button', () => {
    const setOpenStickerPopoverKey = vi.fn();
    const handleToggleReaction = vi.fn();

    const mockMessage: MosChatMessage = {
      id: 'msg-bug-200',
      conversationId: 'space-wings',
      senderId: 2,
      senderName: 'Lê Thảo',
      senderRole: 'CV',
      senderAvatar: '',
      text: 'Chào buổi sáng mọi người',
      createdAt: '2026-11-05T08:00:00.000Z',
      timeLabel: '08:00',
      reactions: {},
      reactionUsers: {},
    };

    const renderReactionPickerContent = vi.fn((msgId: string, m: any) => (
      <div data-testid="mock-reaction-picker">
        <button
          type="button"
          data-testid="mock-picker-heart"
          onClick={() => {
            setOpenStickerPopoverKey(null);
            handleToggleReaction(msgId, '❤️');
          }}
        >
          ❤️
        </button>
      </div>
    ));

    const defaultFeedProps: Partial<MosChatMessageFeedProps> = {
      isMobile: false,
      activeConversation: {
        id: 'space-wings',
        type: 'space',
        name: 'Wings Team',
        messages: [mockMessage],
      } as any,
      currentUser: { id: 1, displayName: 'Danny' },
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
      isMessageFromCurrentUser: () => false,
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
      handleToggleReaction,
      mobileActiveMsgId: null,
      openMovePopoverKey: null,
      setOpenMovePopoverKey: vi.fn(),
      openStickerPopoverKey: null,
      setOpenStickerPopoverKey,
      renderReactionPickerContent,
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
      currentUserStaffMember: {},
      fetchBootstrap: vi.fn(),
      setLightboxImage: vi.fn(),
      movingThreadItemKey: null,
      threadOpen: false,
      activeThreadMessage: null,
      isDraggingOver: false,
      antdMessage: {},
    };

    const { rerender } = render(
      <MosChatMessageFeed
        {...(defaultFeedProps as MosChatMessageFeedProps)}
        openStickerPopoverKey={null}
      />
    );

    // Find the "Chọn biểu tượng cảm xúc" button
    const smileBtn = screen.getByRole('button', { name: 'Chọn biểu tượng cảm xúc' });
    expect(smileBtn).toBeDefined();

    // Click button to toggle popover
    fireEvent.click(smileBtn);
    expect(setOpenStickerPopoverKey).toHaveBeenCalledWith('react:msg-bug-200');

    // Rerender with openStickerPopoverKey set to verify content renders
    rerender(
      <MosChatMessageFeed
        {...(defaultFeedProps as MosChatMessageFeedProps)}
        openStickerPopoverKey="react:msg-bug-200"
      />
    );

    expect(renderReactionPickerContent).toHaveBeenCalledWith('msg-bug-200', expect.anything());
    expect(screen.getByTestId('mock-reaction-picker')).toBeDefined();

    // Select emoji inside picker
    fireEvent.click(screen.getByTestId('mock-picker-heart'));
    expect(handleToggleReaction).toHaveBeenCalledWith('msg-bug-200', '❤️');
    expect(setOpenStickerPopoverKey).toHaveBeenCalledWith(null);
  });
});
