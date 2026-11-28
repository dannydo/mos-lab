import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MosChatStickerAndEmojiPicker } from '../mos-chat-stickers';
import { MosChatMessageActionBar, type MosChatMessageActionBarProps } from '../components/MosChatMessageActionBar';
import { WINGS_SIGNATURE_EMOJIS, GOOGLE_CHAT_REACTION_EMOJIS } from '../constants/chat-constants';
import type { MosChatMessage } from '@mos-lab/shared';

describe('Smart Frequent Emoji Picker & Quick Reaction Bar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides the "Hay dùng" group and pill during cold start when frequentEmojis is empty', () => {
    render(
      <MosChatStickerAndEmojiPicker
        isDark={true}
        borderColor="#334155"
        surfaceRaised="#1e293b"
        wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
        popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
        frequentEmojis={[]}
        defaultPack="emoji"
        mode="composer"
        onSelectEmoji={vi.fn()}
        onSelectSticker={vi.fn()}
      />
    );

    expect(screen.queryByText('Hay dùng')).toBeNull();
    expect(screen.queryByTestId('frequent-emoji-item')).toBeNull();
  });

  it('renders up to 18 frequent emojis above Wings & Sắc đẹp when populated', () => {
    const sample20 = [
      '🔥',
      '❤️',
      '🎉',
      '👏',
      '🙏',
      '✨',
      '🥰',
      '😂',
      '🚀',
      '💎',
      '🪽',
      '👍',
      '✅',
      '😎',
      '🤩',
      '🤝',
      '💪',
      '🌸',
      '👑',
      '🫡',
    ];

    render(
      <MosChatStickerAndEmojiPicker
        isDark={true}
        borderColor="#334155"
        surfaceRaised="#1e293b"
        wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
        popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
        frequentEmojis={sample20}
        onResetFrequentEmojis={vi.fn()}
        defaultPack="emoji"
        mode="composer"
        onSelectEmoji={vi.fn()}
        onSelectSticker={vi.fn()}
      />
    );

    expect(screen.getAllByText('Hay dùng').length).toBeGreaterThanOrEqual(2); // jump pill + header
    const items = screen.getAllByTestId('frequent-emoji-item');
    expect(items).toHaveLength(18);
    expect(items[0]?.getAttribute('data-emoji')).toBe('🔥');
    expect(items[17]?.getAttribute('data-emoji')).toBe('🌸');
  });

  it('keeps frequent emoji positions stable while picker remains open, and refreshes on remount', () => {
    const handleSelectEmoji = vi.fn();
    const { rerender, unmount } = render(
      <MosChatStickerAndEmojiPicker
        isDark={true}
        borderColor="#334155"
        surfaceRaised="#1e293b"
        wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
        popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
        frequentEmojis={['🔥', '❤️', '👍']}
        defaultPack="emoji"
        mode="composer"
        onSelectEmoji={handleSelectEmoji}
        onSelectSticker={vi.fn()}
      />
    );

    const initialOrder = screen.getAllByTestId('frequent-emoji-item').map((el) => el.getAttribute('data-emoji'));
    expect(initialOrder).toEqual(['🔥', '❤️', '👍']);

    // Simulate parent updating frequentEmojis after a click while popup stays open
    rerender(
      <MosChatStickerAndEmojiPicker
        isDark={true}
        borderColor="#334155"
        surfaceRaised="#1e293b"
        wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
        popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
        frequentEmojis={['👍', '🔥', '❤️']}
        defaultPack="emoji"
        mode="composer"
        onSelectEmoji={handleSelectEmoji}
        onSelectSticker={vi.fn()}
      />
    );

    const frozenOrder = screen.getAllByTestId('frequent-emoji-item').map((el) => el.getAttribute('data-emoji'));
    expect(frozenOrder).toEqual(['🔥', '❤️', '👍']);

    // Reopening (unmount + remount) shows the updated ranking
    unmount();
    render(
      <MosChatStickerAndEmojiPicker
        isDark={true}
        borderColor="#334155"
        surfaceRaised="#1e293b"
        wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
        popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
        frequentEmojis={['👍', '🔥', '❤️']}
        defaultPack="emoji"
        mode="composer"
        onSelectEmoji={handleSelectEmoji}
        onSelectSticker={vi.fn()}
      />
    );

    const refreshedOrder = screen.getAllByTestId('frequent-emoji-item').map((el) => el.getAttribute('data-emoji'));
    expect(refreshedOrder).toEqual(['👍', '🔥', '❤️']);
  });

  it('resets and hides "Hay dùng" immediately when clicking "Làm mới"', () => {
    const handleReset = vi.fn();
    render(
      <MosChatStickerAndEmojiPicker
        isDark={true}
        borderColor="#334155"
        surfaceRaised="#1e293b"
        wingsSignatureEmojis={WINGS_SIGNATURE_EMOJIS}
        popularEmojis={GOOGLE_CHAT_REACTION_EMOJIS}
        frequentEmojis={['🔥', '❤️']}
        onResetFrequentEmojis={handleReset}
        defaultPack="emoji"
        mode="composer"
        onSelectEmoji={vi.fn()}
        onSelectSticker={vi.fn()}
      />
    );

    const resetBtn = screen.getByRole('button', { name: 'Làm mới emoji hay dùng' });
    fireEvent.click(resetBtn);

    expect(handleReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('frequent-emoji-item')).toBeNull();
    expect(screen.queryByText('Hay dùng')).toBeNull();
  });

  it('renders custom top 3 quickReactionEmojis in MosChatMessageActionBar and falls back to defaults', () => {
    const mockMsg: MosChatMessage = {
      id: 'm-quick',
      conversationId: 'space-1',
      senderId: 2,
      senderName: 'Mai',
      senderRole: 'CVL',
      text: 'Hello',
      timeLabel: '10:00',
      createdAt: new Date().toISOString(),
    };

    const baseProps: MosChatMessageActionBarProps = {
      m: mockMsg,
      prevMsg: null,
      allVisibleMessages: [mockMsg],
      activeConversation: {
        id: 'space-1',
        type: 'space',
        name: 'General',
        color: '#10b981',
        unreadCount: 0,
        updatedAt: '',
        messages: [mockMsg],
      },
      isMine: false,
      isDannyAccount: false,
      isStrictDannySuperAdmin: false,
      canMoveThisMsg: false,
      AI_COPILOT_CONV_ID: 'ai-copilot',
      isDark: true,
      token: { colorTextSecondary: '#94a3b8' },
      surfaceRaised: '#1e293b',
      borderColor: '#334155',
      borderStrong: '#475569',
      mobileActiveMsgId: null,
      openMovePopoverKey: null,
      openMoreMenuMsgId: null,
      setOpenMoreMenuMsgId: vi.fn(),
      openStickerPopoverKey: null,
      setOpenStickerPopoverKey: vi.fn(),
      hasUserReacted: () => false,
      handleToggleReaction: vi.fn(),
      renderReactionPickerContent: () => null,
      handleOpenThread: vi.fn(),
      openTaskModalFromMessage: vi.fn(),
      handleTogglePin: vi.fn(),
      handleBuzzMessage: vi.fn(),
      openMissionModalFromChat: vi.fn(),
      handleStartEdit: vi.fn(),
      setHistoryModalMessage: vi.fn(),
      setHistoryModalOpen: vi.fn(),
      handleDeleteMessage: vi.fn(),
      taskByMsgOrTaskId: new Map(),
      getMemberNickname: () => undefined,
      formatMoveTargetSnippet: () => '',
      movingThreadItemKey: null,
      threadOpen: false,
      activeThreadMessage: null,
      handleMoveThreadItem: vi.fn(),
    };

    const { rerender } = render(<MosChatMessageActionBar {...baseProps} quickReactionEmojis={['🔥', '🎉', '😂']} />);
    expect(screen.getByRole('button', { name: 'Thả nhanh 🔥' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Thả nhanh 🎉' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Thả nhanh 😂' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Thả nhanh 🪽' })).toBeNull();

    rerender(<MosChatMessageActionBar {...baseProps} quickReactionEmojis={undefined} />);
    expect(screen.getByRole('button', { name: 'Thả nhanh 🪽' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Thả nhanh 💎' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Thả nhanh ❤️' })).toBeDefined();
  });
});
