import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { toggleReactionState, hasUserReacted } from '../utils/chat-helpers';
import { MosChatProvider, useMosChat } from '../context/MosChatContext';
import { MosChatMobileMessageItem } from '../mobile/MosChatMobileMessageItem';
import { MosChatMobileReactionSheet } from '../mobile/MosChatMobileReactionSheet';
import { MosChatMobileReactionUsersSheet } from '../mobile/MosChatMobileReactionUsersSheet';
import { apiClient } from '../../../lib/api-client';
import type { MosChatMessage } from '@mos-lab/shared';

// Mock apiClient.chat
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      bootstrap: vi.fn().mockResolvedValue({
        conversations: [],
        tasks: [],
      }),
      reactToMessage: vi.fn().mockResolvedValue({
        success: true,
        reactions: { '❤️': 1 },
        reactionUsers: { '❤️': ['1'] },
      }),
    },
  },
}));

describe('Reaction Toggle & Cancellation Logic (Huỷ React)', () => {
  it('adds a reaction if user has not reacted yet', () => {
    const msg: { reactions?: Record<string, number>; reactionUsers?: Record<string, Array<string | number>> } = {
      reactions: {},
      reactionUsers: {},
    };

    const next = toggleReactionState(msg, '❤️', '10');
    expect(next.reactions?.['❤️']).toBe(1);
    expect(next.reactionUsers?.['❤️']).toEqual(['10']);
    expect(hasUserReacted(next, '❤️', '10')).toBe(true);
    expect(hasUserReacted(next, '❤️', '20')).toBe(false);
  });

  it('cancels/removes reaction (huỷ react) when user clicks the same emoji again', () => {
    const msg = {
      reactions: { '❤️': 1 },
      reactionUsers: { '❤️': ['10'] },
    };

    const next = toggleReactionState(msg, '❤️', '10');
    expect(next.reactions?.['❤️']).toBeUndefined();
    expect(next.reactionUsers?.['❤️']).toBeUndefined();
    expect(hasUserReacted(next, '❤️', '10')).toBe(false);
  });

  it('decrements count when one of multiple users cancels reaction', () => {
    const msg = {
      reactions: { '❤️': 2, '🔥': 1 },
      reactionUsers: { '❤️': ['10', '20'], '🔥': ['10'] },
    };

    const next = toggleReactionState(msg, '❤️', '10');
    expect(next.reactions?.['❤️']).toBe(1);
    expect(next.reactionUsers?.['❤️']).toEqual(['20']);
    expect(hasUserReacted(next, '❤️', '10')).toBe(false);
    expect(hasUserReacted(next, '❤️', '20')).toBe(true);
    // Other emoji stays untouched
    expect(next.reactions?.['🔥']).toBe(1);
  });
});

describe('MosChatMobileReactionUsersSheet (Xem những ai react trên mobile)', () => {
  const mockMessageWithReactions: MosChatMessage = {
    id: 'msg-test-1',
    conversationId: 'space-test',
    senderId: '10',
    senderName: 'Chuyên Viên Mai',
    senderRole: 'CV',
    text: 'Tin nhắn kiểm thử reaction',
    timeLabel: '10:00',
    createdAt: new Date().toISOString(),
    reactions: { '❤️': 2, '🔥': 1 },
    reactionUsers: {
      '❤️': ['1', '2'], // '1' is Danny (currentUser), '2' is colleague
      '🔥': ['2'],
    },
  };

  const TestWrapper: React.FC<{ initialTarget?: boolean }> = ({ initialTarget = true }) => {
    const { openReactionUsersSheet } = useMosChat();

    React.useEffect(() => {
      if (initialTarget) {
        openReactionUsersSheet(mockMessageWithReactions);
      }
    }, [openReactionUsersSheet, initialTarget]);

    return <MosChatMobileReactionUsersSheet />;
  };

  it('renders bottom sheet with user list and reaction tabs', () => {
    render(
      <MosChatProvider currentUser={{ id: 1, name: 'Danny Do', role: 'super_admin' }}>
        <TestWrapper />
      </MosChatProvider>
    );

    // Sheet title and total count
    expect(screen.getByText('Người đã thả cảm xúc')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);

    // Filter pills
    expect(screen.getByText('Tất cả')).toBeInTheDocument();
    expect(screen.getAllByText('❤️').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('🔥').length).toBeGreaterThanOrEqual(1);

    // User rows: Danny Do has "Bạn" tag and "Huỷ react" button
    expect(screen.getByText('Danny Do')).toBeInTheDocument();
    expect(screen.getByText('Bạn')).toBeInTheDocument();
    expect(screen.getByText('Huỷ react')).toBeInTheDocument();
  });

  it('allows clicking "Huỷ react" to cancel current user reaction directly from sheet', async () => {
    render(
      <MosChatProvider currentUser={{ id: 1, name: 'Danny Do', role: 'super_admin' }}>
        <TestWrapper />
      </MosChatProvider>
    );

    const cancelBtn = screen.getByText('Huỷ react');
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);

    const { apiClient } = await import('../../../lib/api-client');
    expect(apiClient.chat.reactToMessage).toHaveBeenCalledWith('msg-test-1', expect.any(String), '❤️', undefined);
  });

  it('filters users when clicking specific emoji tab', () => {
    render(
      <MosChatProvider currentUser={{ id: 1, name: 'Danny Do', role: 'super_admin' }}>
        <TestWrapper />
      </MosChatProvider>
    );

    // Click on '🔥' filter tab
    const fireTab = screen.getAllByText('🔥')[0].closest('button');
    expect(fireTab).toBeTruthy();
    fireEvent.click(fireTab!);

    // In '🔥' filter, Danny Do did not react with 🔥, so Danny should not be listed
    expect(screen.queryByText('Huỷ react')).not.toBeInTheDocument();
  });
});

describe('Mobile Message Reaction Bar & Action Sheet Integration', () => {
  const mockMessage: MosChatMessage = {
    id: 'msg-test-2',
    conversationId: 'space-test',
    senderId: '10',
    senderName: 'Chuyên Viên Mai',
    senderRole: 'CV',
    text: 'Tin nhắn có reaction',
    timeLabel: '10:05',
    createdAt: new Date().toISOString(),
    reactions: { '❤️': 1 },
    reactionUsers: { '❤️': ['1'] }, // current user reacted
  };

  it('highlights reacted emoji with amber active styling in MosChatMobileMessageItem', () => {
    render(
      <MosChatProvider currentUser={{ id: 1, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileMessageItem message={mockMessage} />
      </MosChatProvider>
    );

    // Reaction pill ❤️ should have amber styling
    const heartBtn = screen.getByText('❤️').closest('button');
    expect(heartBtn).toBeTruthy();
    expect(heartBtn?.className).toContain('bg-amber-500/20');
    expect(heartBtn?.className).toContain('text-amber-300');

    // Button to view who reacted should exist
    const viewUsersBtn = screen.getByLabelText('Xem người thả cảm xúc');
    expect(viewUsersBtn).toBeInTheDocument();
  });

  it('renders "Xem người đã thả cảm xúc" button in MosChatMobileReactionSheet when message has reactions', () => {
    const handleClose = vi.fn();
    const handleOpenThread = vi.fn();
    const handleCreateTask = vi.fn();

    render(
      <MosChatProvider currentUser={{ id: 1, name: 'Danny Do', role: 'super_admin' }}>
        <MosChatMobileReactionSheet
          message={mockMessage}
          onClose={handleClose}
          onOpenThread={handleOpenThread}
          onCreateTaskFromMsg={handleCreateTask}
        />
      </MosChatProvider>
    );

    // Should render "Xem người đã thả cảm xúc"
    expect(screen.getByText('Xem người đã thả cảm xúc')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
