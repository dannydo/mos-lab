import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MosChatStickerAndEmojiPicker, MOS_CHAT_EXPANDED_EMOJI_GROUPS } from '../mos-chat-stickers';
import { MosChatSpaceEmojiColorPicker } from '../MosChatSpaceEmojiColorPicker';
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
});
