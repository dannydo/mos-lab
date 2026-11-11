import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MosChatReactionUsersModal } from '../components/MosChatReactionUsersModal';
import { formatReactionUsersTooltip } from '../utils/chat-helpers';
import type { MosChatReactionUsersTarget } from '../types/mos-chat-types';
import type { MosChatStaffMember } from '@mos-lab/shared';

describe('formatReactionUsersTooltip (Tooltip danh sách người react trên desktop)', () => {
  const staffDirectory: MosChatStaffMember[] = [
    { id: 1, username: 'danny', displayName: 'Danny Do', role: 'super_admin' },
    { id: 2, username: 'mai', displayName: 'Chuyên Viên Mai', role: 'cvl' },
    { id: 3, username: 'lan', displayName: 'Chuyên Viên Lan', role: 'cvll' },
    { id: 4, username: 'hoa', displayName: 'Chuyên Viên Hoa', role: 'cv' },
    { id: 5, username: 'cuc', displayName: 'Chuyên Viên Cúc', role: 'cv' },
  ];

  const currentUser = { id: 1, username: 'danny', name: 'Danny Do', displayName: 'Danny Do' };

  it('returns empty string if target has no reactions', () => {
    const res = formatReactionUsersTooltip(null, '❤️', staffDirectory, currentUser);
    expect(res).toBe('');
  });

  it('formats tooltip with user name when someone else reacted', () => {
    const target = {
      reactions: { '❤️': 1 },
      reactionUsers: { '❤️': ['2'] },
    };
    const res = formatReactionUsersTooltip(target, '❤️', staffDirectory, currentUser);
    expect(res).toContain('Chuyên Viên Mai đã thả ❤️');
    expect(res).toContain('Nhấn để thả cùng');
  });

  it('formats tooltip with "Bạn" when current user reacted', () => {
    const target = {
      reactions: { '❤️': 1 },
      reactionUsers: { '❤️': ['1'] },
    };
    const res = formatReactionUsersTooltip(target, '❤️', staffDirectory, currentUser);
    expect(res).toContain('Bạn đã thả ❤️');
    expect(res).toContain('Nhấn để gỡ');
  });

  it('aggregates multiple names and indicates remaining count when more than 3 users reacted', () => {
    const target = {
      reactions: { '❤️': 5 },
      reactionUsers: { '❤️': ['1', '2', '3', '4', '5'] },
    };
    const res = formatReactionUsersTooltip(target, '❤️', staffDirectory, currentUser);
    expect(res).toContain('Bạn, Chuyên Viên Mai, Chuyên Viên Lan và 2 người khác đã thả ❤️');
  });
});

describe('MosChatReactionUsersModal (Xem những ai react trên desktop)', () => {
  const staffDirectory: MosChatStaffMember[] = [
    { id: 1, username: 'danny', displayName: 'Danny Do', role: 'super_admin' },
    { id: 2, username: 'mai', displayName: 'Chuyên Viên Mai', role: 'cvl' },
  ];

  const currentUser = { id: 1, username: 'danny', name: 'Danny Do', displayName: 'Danny Do', role: 'super_admin' };

  const target: MosChatReactionUsersTarget = {
    messageId: 'msg-123',
    reactions: { '❤️': 2, '🔥': 1 },
    reactionUsers: {
      '❤️': ['1', '2'],
      '🔥': ['2'],
    },
  };

  it('renders modal with title, total count, and emoji filter tabs', () => {
    const handleClose = vi.fn();
    const handleToggleReaction = vi.fn();

    render(
      <MosChatReactionUsersModal
        open={true}
        target={target}
        onClose={handleClose}
        currentUser={currentUser}
        staffDirectory={staffDirectory}
        onToggleReaction={handleToggleReaction}
      />
    );

    // Modal title & count
    expect(screen.getByText('Người đã thả cảm xúc')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);

    // Tabs
    expect(screen.getByText('Tất cả')).toBeInTheDocument();
    expect(screen.getAllByText('❤️').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('🔥').length).toBeGreaterThanOrEqual(1);

    // Users listed (Mai reacted to both ❤️ and 🔥 so appears twice in 'Tất cả')
    expect(screen.getByText('Danny Do')).toBeInTheDocument();
    expect(screen.getAllByText('Chuyên Viên Mai').length).toBe(2);
    expect(screen.getByText('Bạn')).toBeInTheDocument();
    expect(screen.getByText('Huỷ react')).toBeInTheDocument();
  });

  it('calls onToggleReaction when clicking "Huỷ react"', () => {
    const handleClose = vi.fn();
    const handleToggleReaction = vi.fn();

    render(
      <MosChatReactionUsersModal
        open={true}
        target={target}
        onClose={handleClose}
        currentUser={currentUser}
        staffDirectory={staffDirectory}
        onToggleReaction={handleToggleReaction}
      />
    );

    const cancelBtn = screen.getByText('Huỷ react');
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);

    expect(handleToggleReaction).toHaveBeenCalledWith('msg-123', '❤️', undefined);
  });

  it('filters users by selected emoji tab', () => {
    const handleClose = vi.fn();
    const handleToggleReaction = vi.fn();

    render(
      <MosChatReactionUsersModal
        open={true}
        target={target}
        onClose={handleClose}
        currentUser={currentUser}
        staffDirectory={staffDirectory}
        onToggleReaction={handleToggleReaction}
      />
    );

    // Click on '🔥' filter tab
    const fireTab = screen.getAllByText('🔥')[0].closest('button');
    expect(fireTab).toBeTruthy();
    fireEvent.click(fireTab!);

    // In '🔥' filter, Danny Do did not react with 🔥, so Danny should not have "Huỷ react"
    expect(screen.queryByText('Huỷ react')).not.toBeInTheDocument();
    expect(screen.getByText('Chuyên Viên Mai')).toBeInTheDocument();
  });
});
