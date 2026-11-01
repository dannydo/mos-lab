import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MosChatMobileReactionSheet } from '../mobile/MosChatMobileReactionSheet';
import { MosChatMobileMessageItem } from '../mobile/MosChatMobileMessageItem';
import { MosChatProvider } from '../context/MosChatContext';
import type { MosChatMessage } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      bootstrap: vi.fn().mockResolvedValue({
        conversations: [],
        tasks: [],
      }),
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
      toggleReaction: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('MOS-BUG-184: Mobile Message Reaction Emoji & Icon/Sticker Library', () => {
  const mockCurrentUser = {
    id: 1,
    username: 'dannydo',
    displayName: 'Danny Do',
    role: 'super_admin',
  };

  const mockMessage: MosChatMessage = {
    id: 'm-184',
    conversationId: 'space-test',
    senderId: '2',
    senderName: 'Chuyên Viên Trang',
    senderRole: 'CV',
    text: 'Em vừa xong bộ mi volume cho khách nha!',
    timeLabel: '14:30',
    createdAt: new Date().toISOString(),
    reactions: {
      '❤️': 2,
      '[sticker:wings-chot-don]': 1,
    },
    reactionUsers: {
      '❤️': [1, 2],
      '[sticker:wings-chot-don]': [2],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quick reactions AND the SmilePlus library button inside MosChatMobileReactionSheet', () => {
    const handleClose = vi.fn();
    const handleOpenThread = vi.fn();
    const handleCreateTask = vi.fn();

    render(
      <MosChatProvider currentUser={mockCurrentUser}>
        <MosChatMobileReactionSheet
          message={mockMessage}
          onClose={handleClose}
          onOpenThread={handleOpenThread}
          onCreateTaskFromMsg={handleCreateTask}
        />
      </MosChatProvider>
    );

    // Verify quick reaction pills
    expect(screen.getByText('👍')).toBeDefined();
    expect(screen.getByText('❤️')).toBeDefined();

    // Verify SmilePlus trigger button in quick reaction bar
    const fullPickerBtn = screen.getByLabelText('Mở kho biểu cảm và nhãn dán');
    expect(fullPickerBtn).toBeDefined();

    // Verify action item in list
    expect(screen.getByText('Thả biểu cảm khác (Emoji & Nhãn dán)...')).toBeDefined();
  });

  it('switches to full emoji & sticker picker with 6 category tabs when clicking SmilePlus button', () => {
    const handleClose = vi.fn();
    const handleOpenThread = vi.fn();
    const handleCreateTask = vi.fn();

    render(
      <MosChatProvider currentUser={mockCurrentUser}>
        <MosChatMobileReactionSheet
          message={mockMessage}
          onClose={handleClose}
          onOpenThread={handleOpenThread}
          onCreateTaskFromMsg={handleCreateTask}
        />
      </MosChatProvider>
    );

    // Tap SmilePlus button
    const fullPickerBtn = screen.getByLabelText('Mở kho biểu cảm và nhãn dán');
    fireEvent.click(fullPickerBtn);

    // Verify title and Back button
    expect(screen.getByText('Kho biểu cảm & nhãn dán')).toBeDefined();
    expect(screen.getByText('Quay lại')).toBeDefined();

    // Verify category pack tabs are visible
    expect(screen.getByText('Wings')).toBeDefined();
    expect(screen.getByText('Mèo Bựa')).toBeDefined();
    expect(screen.getByText('Quby')).toBeDefined();
    expect(screen.getByText('Pepe')).toBeDefined();
    expect(screen.getByText('3D Động')).toBeDefined();
    expect(screen.getByText('Emoji')).toBeDefined();

    // Clicking "Quay lại" returns to normal actions view
    fireEvent.click(screen.getByText('Quay lại'));
    expect(screen.getByText('Trả lời tin nhắn')).toBeDefined();
  });

  it('renders sticker reactions visually with MosChatStickerVisual and active highlight on mobile message', () => {
    render(
      <MosChatProvider currentUser={mockCurrentUser}>
        <MosChatMobileMessageItem message={mockMessage} />
      </MosChatProvider>
    );

    // The heart reaction was reacted by user (1), so it should be highlighted
    const heartBtn = screen.getByLabelText('Gỡ cảm xúc ❤️');
    expect(heartBtn).toBeDefined();

    // The sticker reaction [sticker:wings-chot-don] must NOT render raw text "[sticker:wings-chot-don]"
    expect(screen.queryByText('[sticker:wings-chot-don]')).toBeNull();

    // It should render sticker visual with alt "Chốt đơn liền tay"
    expect(screen.getByAltText('Chốt đơn liền tay')).toBeDefined();

    // And it has the '+' button in reactions bar to open reactions easily
    expect(screen.getByLabelText('Thêm biểu cảm')).toBeDefined();
  });
});
