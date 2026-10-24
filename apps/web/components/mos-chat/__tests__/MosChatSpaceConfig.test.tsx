import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MosChatSpaceEmojiColorPicker } from '../MosChatSpaceEmojiColorPicker';
import { MosChatSpaceConfigModal } from '../MosChatSpaceConfigModal';
import { isSpaceEmoji, GOOGLE_CHAT_SPACE_PALETTE } from '../constants/chat-constants';
import { chatApi } from '../../../lib/api/chat.api';
import type { MosChatConversation } from '@mos-lab/shared';

// Mock chatApi
vi.mock('../../../lib/api/chat.api', () => ({
  chatApi: {
    chat: {
      updateSpaceConfig: vi.fn(),
    },
  },
}));

describe('Space Configuration & Emoji Selection (MOS-BUG-140)', () => {
  describe('isSpaceEmoji helper', () => {
    it('correctly identifies valid emoji strings', () => {
      expect(isSpaceEmoji('🚀')).toBe(true);
      expect(isSpaceEmoji('💎')).toBe(true);
      expect(isSpaceEmoji('🌸')).toBe(true);
      expect(isSpaceEmoji('💬')).toBe(true);
      expect(isSpaceEmoji('🔥')).toBe(true);
      expect(isSpaceEmoji('🪽')).toBe(true);
    });

    it('rejects image URLs, data URLs, and plain alpha initials', () => {
      expect(isSpaceEmoji('https://example.com/avatar.jpg')).toBe(false);
      expect(isSpaceEmoji('http://example.com/icon.png')).toBe(false);
      expect(isSpaceEmoji('data:image/png;base64,...')).toBe(false);
      expect(isSpaceEmoji('VH')).toBe(false);
      expect(isSpaceEmoji('KD')).toBe(false);
      expect(isSpaceEmoji('')).toBe(false);
      expect(isSpaceEmoji(null)).toBe(false);
      expect(isSpaceEmoji(undefined)).toBe(false);
    });
  });

  describe('MosChatSpaceEmojiColorPicker', () => {
    it('renders current emoji and palette colors correctly', () => {
      const handleEmojiChange = vi.fn();
      const handleColorChange = vi.fn();

      render(
        <MosChatSpaceEmojiColorPicker
          selectedEmoji="🚀"
          selectedColor="#1a73e8"
          spaceName="chien-dich-tet"
          onEmojiChange={handleEmojiChange}
          onColorChange={handleColorChange}
        />
      );

      // Emoji should be rendered
      expect(screen.getByText('🚀')).toBeInTheDocument();
      // Should show label
      expect(screen.getByText('Biểu tượng & Màu chủ đạo Space')).toBeInTheDocument();

      // Click on a palette color
      const secondColor = GOOGLE_CHAT_SPACE_PALETTE[1];
      const colorBtn = screen.getByLabelText(`Chọn màu ${secondColor.name}`);
      fireEvent.click(colorBtn);
      expect(handleColorChange).toHaveBeenCalledWith(secondColor.color);
    });

    it('opens emoji picker popover on click and selects a new emoji', async () => {
      const handleEmojiChange = vi.fn();
      const handleColorChange = vi.fn();

      render(
        <MosChatSpaceEmojiColorPicker
          selectedEmoji="🚀"
          selectedColor="#1a73e8"
          spaceName="chien-dich-tet"
          onEmojiChange={handleEmojiChange}
          onColorChange={handleColorChange}
        />
      );

      // Click on the avatar box to open popover
      const avatarBox = screen.getByLabelText('Chọn Emoji đại diện cho Space');
      fireEvent.click(avatarBox);

      // Popover content should appear
      await waitFor(() => {
        expect(screen.getByText('Chọn Emoji đại diện cho Space')).toBeInTheDocument();
      });

      // Click on an emoji button inside the popover (e.g. 🎯)
      const targetEmojiBtn = screen.getByRole('button', { name: '🎯' });
      fireEvent.click(targetEmojiBtn);

      expect(handleEmojiChange).toHaveBeenCalledWith('🎯');
    });
  });

  describe('MosChatSpaceConfigModal', () => {
    const mockSpace: MosChatConversation = {
      id: 'space-test-1',
      type: 'space',
      name: 'van-hanh-chung',
      subtitle: 'Không gian phối hợp vận hành',
      color: '#1a73e8',
      avatar: '🚀',
      memberCount: 5,
      memberIds: [1, 2, 3],
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
      messages: [],
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('displays space details and calls updateSpaceConfig on save', async () => {
      const handleClose = vi.fn();
      const handleUpdated = vi.fn();

      const mockResponse = {
        success: true,
        conversation: {
          ...mockSpace,
          name: 'van-hanh-moi',
          subtitle: 'Mục tiêu tuần mới',
          avatar: '💎',
          color: '#10b981',
        },
      };

      vi.mocked(chatApi.chat.updateSpaceConfig).mockResolvedValue(mockResponse);

      render(
        <MosChatSpaceConfigModal
          open={true}
          conversation={mockSpace}
          onClose={handleClose}
          onUpdated={handleUpdated}
        />
      );

      // Title should be visible
      expect(screen.getByText('Cài đặt & Cấu hình Không gian (Space Settings)')).toBeInTheDocument();

      // Inputs should have initial values
      const nameInput = screen.getByPlaceholderText('VD: ke-hoach-tuan-moi, chien-dich-tet');
      expect(nameInput).toHaveValue('van-hanh-chung');

      // Change name and subtitle
      fireEvent.change(nameInput, { target: { value: 'van-hanh-moi' } });
      const subtitleInput = screen.getByPlaceholderText(/Không gian trao đổi chiến dịch/);
      fireEvent.change(subtitleInput, { target: { value: 'Mục tiêu tuần mới' } });

      // Click Save
      const saveBtn = screen.getByRole('button', { name: 'Lưu cấu hình' });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(chatApi.chat.updateSpaceConfig).toHaveBeenCalledWith('space-test-1', {
          name: 'van-hanh-moi',
          subtitle: 'Mục tiêu tuần mới',
          avatar: '🚀',
          color: '#1a73e8',
        });
        expect(handleUpdated).toHaveBeenCalledWith(mockResponse.conversation);
        expect(handleClose).toHaveBeenCalled();
      });
    });
  });
});
