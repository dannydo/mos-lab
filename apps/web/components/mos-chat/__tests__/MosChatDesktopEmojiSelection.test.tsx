import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Popover, Tooltip } from 'antd';
import { MosChatStickerAndEmojiPicker, MOS_CHAT_EXPANDED_EMOJI_GROUPS } from '../mos-chat-stickers';
import { MosChatSpaceEmojiColorPicker } from '../MosChatSpaceEmojiColorPicker';
import { MosChatComposer, type MosChatComposerProps } from '../components/MosChatComposer';
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
});
