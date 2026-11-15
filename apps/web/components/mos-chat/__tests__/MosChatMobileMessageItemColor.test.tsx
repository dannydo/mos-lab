import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MosChatMobileMessageItem } from '../mobile/MosChatMobileMessageItem';
import { ThemeProvider } from '../../../context/ThemeContext';
import { MosChatContext } from '../context/MosChatContext';
import type { MosChatMessage } from '@mos-lab/shared';

// Mock speech utils
vi.mock('../../voice-assistant/speech-utils', () => ({
  speakText: vi.fn(),
  stopSpeaking: vi.fn(),
}));

const mockCurrentUser = {
  id: 6,
  fullName: 'Nguyễn Quang Khải',
  name: 'Nguyễn Quang Khải',
  username: 'khai.nguyen@wingslashes.com',
  role: 'admin',
};

const mockMyMessage: MosChatMessage = {
  id: 'msg-me-1',
  conversationId: 'space-core',
  senderId: 6,
  senderName: 'Nguyễn Quang Khải',
  senderRole: 'ADMIN',
  text: 'Dự chi T11 Omicall cho 11...',
  createdAt: '2026-11-15T04:30:00.000Z',
  timeLabel: '11:30',
  isDeleted: false,
};

const mockOtherMessage: MosChatMessage = {
  id: 'msg-other-1',
  conversationId: 'space-core',
  senderId: 12,
  senderName: 'Tâm Nguyễn',
  senderRole: 'ADMIN',
  text: 'ĐỀ XUẤT TRANG BỊ THIẾT BỊ',
  createdAt: '2026-11-15T04:28:00.000Z',
  timeLabel: '11:28',
  isDeleted: false,
};

function renderWithProviders(ui: React.ReactElement) {
  const mockChatContextValue: any = {
    currentUser: mockCurrentUser,
    activeConversation: { id: 'space-core' },
    staffDirectory: [],
    reactToMessage: vi.fn(),
  };

  return render(
    <ThemeProvider>
      <MosChatContext.Provider value={mockChatContextValue}>
        {ui}
      </MosChatContext.Provider>
    </ThemeProvider>
  );
}

describe('MosChatMobileMessageItem Color Invariant (MOS-FEAT-223)', () => {
  it('renders outgoing (isMe) message bubble with soft accent background and primary text without solid glaring yellow', () => {
    const { container } = renderWithProviders(
      <MosChatMobileMessageItem message={mockMyMessage} />
    );

    const bubble = container.querySelector('[data-testid="mos-chat-message-bubble"]');
    expect(bubble).not.toBeNull();

    // Verify bubble uses soft accent background and theme text instead of solid accent with black contrast
    expect(bubble?.className).toContain('bg-[var(--mos-accent-soft)]');
    expect(bubble?.className).toContain('text-[var(--mos-text)]');
    expect(bubble?.className).toContain('border-[var(--mos-accent-border)]');
    expect(bubble?.className).not.toContain('bg-[var(--mos-accent)]');
    expect(bubble?.className).not.toContain('text-[var(--mos-accent-contrast)]');
    expect(bubble?.className).not.toContain('mos-accent-bubble-ink');
  });

  it('renders incoming (!isMe) message bubble with surface tokens', () => {
    const { container } = renderWithProviders(
      <MosChatMobileMessageItem message={mockOtherMessage} />
    );

    const bubble = container.querySelector('[data-testid="mos-chat-message-bubble"]');
    expect(bubble).not.toBeNull();

    expect(bubble?.className).toContain('bg-[var(--mos-surface)]');
    expect(bubble?.className).toContain('text-[var(--mos-text)]');
    expect(bubble?.className).toContain('border-[var(--mos-surface-border)]');
  });

  it('renders quoted messages in outgoing bubble with proper theme border and text colors', () => {
    const messageWithQuote: MosChatMessage = {
      ...mockMyMessage,
      id: 'msg-with-quote',
      text: 'tui dự chi Zalo OA tháng 11 luôn nhé',
      replyTo: {
        id: 'quoted-1',
        senderId: 6,
        senderName: 'Nguyễn Quang Khải',
        text: 'DNTT cho Zalo OA 6 tháng',
      },
    };

    const { container } = renderWithProviders(
      <MosChatMobileMessageItem message={messageWithQuote} />
    );

    const quoteEl = container.querySelector('[role="button"][aria-label*="Đi tới tin nhắn gốc"]');
    expect(quoteEl).not.toBeNull();
    expect(quoteEl?.className).toContain('text-[var(--mos-text)]');
    expect(quoteEl?.className).not.toContain('text-[var(--mos-accent-contrast)]');
  });
});
