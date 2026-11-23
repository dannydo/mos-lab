import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  getMessageReadBreakdown,
  getThreadReplyReadBreakdown,
  calculateStoppedReadersByMsgId,
  calculateStoppedReadersByReplyId,
  formatReadAtLabel,
} from '../utils/chat-helpers';
import { MosChatMobileSeenUsersSheet } from '../mobile/MosChatMobileSeenUsersSheet';
import { MosChatMobileReactionSheet } from '../mobile/MosChatMobileReactionSheet';
import { MosChatContext } from '../context/MosChatContext';
import type { MosChatConversation, MosChatMessage, MosChatThreadReply, MosChatStaffMember } from '@mos-lab/shared';
import type { MosChatContextValue } from '../types/mos-chat-types';

describe('MOS-BUG-229: Mobile Read Receipts & Seen Users Breakdown', () => {
  const staffAlice: MosChatStaffMember = {
    id: 101,
    username: 'alice',
    displayName: 'Alice Nguyen',
    role: 'CV',
    avatarUrl: 'https://example.com/alice.jpg',
  };

  const staffBob: MosChatStaffMember = {
    id: 102,
    username: 'bob',
    displayName: 'Bob Tran',
    role: 'CVL',
    avatarUrl: 'https://example.com/bob.jpg',
  };

  const staffCharlie: MosChatStaffMember = {
    id: 103,
    username: 'charlie',
    displayName: 'Charlie Le',
    role: 'admin',
    avatarUrl: 'https://example.com/charlie.jpg',
  };

  const sampleReply: MosChatThreadReply = {
    id: 'reply-1',
    senderId: 101,
    senderName: 'Alice Nguyen',
    senderRole: 'CV',
    text: 'Subthread update',
    timeLabel: '10:15',
    createdAt: '2026-11-15T10:15:00.000Z',
  };

  const sampleMessage: MosChatMessage = {
    id: 'msg-1',
    conversationId: 'conv-space-1',
    senderId: 101,
    senderName: 'Alice Nguyen',
    senderRole: 'CV',
    text: 'Hello team, check this task!',
    timeLabel: '10:00',
    createdAt: '2026-11-15T10:00:00.000Z',
    thread: [sampleReply],
    threadReadReceipts: [
      {
        staffId: 102,
        displayName: 'Bob Tran',
        role: 'CVL',
        avatarUrl: 'https://example.com/bob.jpg',
        readReplyCount: 1, // Read reply 1
        readAt: '2026-11-15T11:00:00.000Z',
      },
      {
        staffId: 103,
        displayName: 'Charlie Le',
        role: 'admin',
        avatarUrl: 'https://example.com/charlie.jpg',
        readReplyCount: 0, // Unread reply 1
        readAt: '2026-11-15T09:30:00.000Z',
      },
    ],
  };

  const sampleConversation: MosChatConversation = {
    id: 'conv-space-1',
    name: 'Core Team',
    type: 'space',
    color: '#10b981',
    unreadCount: 0,
    updatedAt: '2026-11-15T10:30:00.000Z',
    members: [staffAlice, staffBob, staffCharlie],
    messages: [sampleMessage],
    readReceipts: [
      {
        staffId: 102,
        displayName: 'Bob Tran',
        role: 'CVL',
        avatarUrl: 'https://example.com/bob.jpg',
        readCount: 1, // Bob read msg-1
        readAt: '2026-11-15T10:30:00.000Z',
      },
      {
        staffId: 103,
        displayName: 'Charlie Le',
        role: 'admin',
        avatarUrl: 'https://example.com/charlie.jpg',
        readCount: 0, // Charlie unread msg-1
        readAt: '2026-11-15T09:00:00.000Z',
      },
    ],
  };

  describe('Pure Helpers (chat-helpers)', () => {
    it('calculates getMessageReadBreakdown excluding author', () => {
      const breakdown = getMessageReadBreakdown(sampleConversation, sampleMessage);
      // Bob read msg-1 -> seen
      expect(breakdown.seenBy.map((s) => s.displayName)).toContain('Bob Tran');
      // Charlie has readCount 0 -> unseen
      expect(breakdown.unseenBy.map((s) => s.displayName)).toContain('Charlie Le');
      // Alice is sender -> excluded from seenBy and unseenBy
      expect(breakdown.seenBy.some((s) => s.staffId === 101)).toBe(false);
      expect(breakdown.unseenBy.some((s) => s.staffId === 101)).toBe(false);
    });

    it('calculates getThreadReplyReadBreakdown correctly', () => {
      const breakdown = getThreadReplyReadBreakdown(sampleConversation, sampleMessage, sampleReply);
      // Bob read thread at reply 1 -> seen
      expect(breakdown.seenBy.some((s) => s.staffId === 102)).toBe(true);
      // Charlie has readReplyCount 0 -> unseen
      expect(breakdown.unseenBy.some((s) => s.staffId === 103)).toBe(true);
    });

    it('calculates stopped readers per message and subthread reply', () => {
      const msg2: MosChatMessage = {
        id: 'msg-2',
        conversationId: 'conv-space-1',
        senderId: 101,
        senderName: 'Alice',
        senderRole: 'CV',
        text: 'Second message',
        timeLabel: '10:20',
        createdAt: '2026-11-15T10:20:00.000Z',
      };
      const convWithTwoMsgs: MosChatConversation = {
        ...sampleConversation,
        messages: [sampleMessage, msg2],
        readReceipts: [
          {
            staffId: 102,
            displayName: 'Bob Tran',
            role: 'CVL',
            readCount: 2, // Bob read up to msg-2
            readAt: '2026-11-15T10:30:00.000Z',
          },
        ],
      };

      const stoppedMap = calculateStoppedReadersByMsgId(convWithTwoMsgs, 101);
      // Bob read up to message 2, so his latest read message is msg-2
      expect(stoppedMap['msg-2']?.some((r) => r.staffId === 102)).toBe(true);
      // He should not be counted as stopped at msg-1
      expect(stoppedMap['msg-1']?.some((r) => r.staffId === 102)).toBeFalsy();
    });

    it('aligns getMessageReadBreakdown and stopped readers accurately on windowed conversations with totalMessageCount > messages.length', () => {
      const windowedMsgs: MosChatMessage[] = Array.from({ length: 5 }, (_, idx) => ({
        id: `msg-${41 + idx}`,
        conversationId: 'conv-window',
        senderId: 101,
        senderName: 'Alice',
        senderRole: 'CV',
        text: `Windowed #${41 + idx}`,
        timeLabel: '10:30',
        createdAt: `2026-11-15T10:3${idx}:00.000Z`,
      }));
      const windowedConv: MosChatConversation = {
        ...sampleConversation,
        id: 'conv-window',
        totalMessageCount: 45,
        hasMoreMessages: true,
        oldestLoadedMessageId: 'msg-41',
        messages: windowedMsgs,
        readReceipts: [
          {
            staffId: 102,
            displayName: 'Bob Tran',
            role: 'CVL',
            readCount: 43, // read through msg-43 (index 2 in visible window)
            readAt: '2026-11-15T10:35:00.000Z',
          },
          {
            staffId: 103,
            displayName: 'Charlie Le',
            role: 'admin',
            readCount: 15, // stopped in hidden older history before window starts at 41
            readAt: '2026-11-15T10:15:00.000Z',
          },
        ],
      };

      const msg43Breakdown = getMessageReadBreakdown(windowedConv, windowedMsgs[2], 101);
      expect(msg43Breakdown.seenBy.some((r) => r.staffId === 102)).toBe(true);
      expect(msg43Breakdown.seenBy.some((r) => r.staffId === 103)).toBe(false);

      const msg44Breakdown = getMessageReadBreakdown(windowedConv, windowedMsgs[3], 101);
      expect(msg44Breakdown.seenBy.some((r) => r.staffId === 102)).toBe(false);
      expect(msg44Breakdown.unseenBy.some((r) => r.staffId === 102)).toBe(true);

      const stopped = calculateStoppedReadersByMsgId(windowedConv, 101);
      expect(stopped['msg-43']?.some((r) => r.staffId === 102)).toBe(true);
      expect(stopped['msg-45']).toBeUndefined();
      // Charlie stopped at count 15 (< hiddenOlderCount=40), so he should not appear on visible messages
      expect(
        Object.values(stopped)
          .flat()
          .some((r) => r.staffId === 103)
      ).toBe(false);
    });

    it('formats read timestamps nicely with formatReadAtLabel', () => {
      expect(formatReadAtLabel(null)).toBe('Đã xem');
      expect(formatReadAtLabel(undefined)).toBe('Đã xem');
      const formatted = formatReadAtLabel('2026-11-15T10:30:00.000Z');
      expect(formatted).toMatch(/\d{2}:\d{2}/);
    });
  });

  describe('MosChatMobileSeenUsersSheet Component', () => {
    it('renders seen users sheet with list of readers and unread members', () => {
      const closeMock = vi.fn();
      const mockContext = {
        seenUsersTarget: {
          scopeLabel: 'Người đã xem tin nhắn',
          targetType: 'message' as const,
          itemTitle: 'Hello team, check this task!',
          seenBy: [
            {
              staffId: 102,
              displayName: 'Bob Tran',
              avatarUrl: 'https://example.com/bob.jpg',
              role: 'CV🪶',
              readAt: '2026-11-15T10:30:00.000Z',
            },
          ],
          unseenBy: [
            {
              staffId: 103,
              displayName: 'Charlie Le',
              avatarUrl: 'https://example.com/charlie.jpg',
              role: 'admin',
            },
          ],
        },
        closeSeenUsersSheet: closeMock,
        staffDirectory: [staffAlice, staffBob, staffCharlie],
      } as unknown as MosChatContextValue;

      render(
        <MosChatContext.Provider value={mockContext}>
          <MosChatMobileSeenUsersSheet />
        </MosChatContext.Provider>
      );

      // Verify title & count
      expect(screen.getByText('Người đã xem tin nhắn')).toBeInTheDocument();
      expect(screen.getByText('1/2 đã xem')).toBeInTheDocument();

      // Verify Seen list contains Bob Tran
      expect(screen.getByText('Bob Tran')).toBeInTheDocument();
      expect(screen.getByText(/Đã xem \(1\)/i)).toBeInTheDocument();

      // Verify Unread list contains Charlie Le
      expect(screen.getByText('Charlie Le')).toBeInTheDocument();
      expect(screen.getByText(/Chưa xem \(1\)/i)).toBeInTheDocument();

      // Verify close on backdrop or button
      const closeBtn = screen.getByRole('button', { name: 'Đóng' });
      fireEvent.click(closeBtn);
      expect(closeMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('MosChatMobileReactionSheet "Xem người đã đọc"', () => {
    it('renders "Xem người đã đọc" button and calls openSeenUsersSheetForMessage', () => {
      const openSeenSheetMock = vi.fn();
      const closeMock = vi.fn();

      const mockContext = {
        currentUser: staffAlice,
        activeConversation: sampleConversation,
        getMessageReadBreakdown: vi.fn().mockReturnValue({
          seenBy: [{ staffId: 102, displayName: 'Bob Tran' }],
          unseenBy: [{ staffId: 103, displayName: 'Charlie Le' }],
        }),
        openSeenUsersSheetForMessage: openSeenSheetMock,
        reactToMessage: vi.fn(),
        hasUserReacted: vi.fn().mockReturnValue(false),
        openReactionUsersSheet: vi.fn(),
        togglePinMessage: vi.fn(),
        deleteMessage: vi.fn(),
        setReplyingToMessage: vi.fn(),
      } as unknown as MosChatContextValue;

      render(
        <MosChatContext.Provider value={mockContext}>
          <MosChatMobileReactionSheet
            message={sampleMessage}
            onClose={closeMock}
            onOpenThread={vi.fn()}
            onCreateTaskFromMsg={vi.fn()}
          />
        </MosChatContext.Provider>
      );

      // Look for the "Xem người đã đọc" button
      const viewReadersBtn = screen.getByText('Xem người đã đọc');
      expect(viewReadersBtn).toBeInTheDocument();
      expect(screen.getByText('1 đã xem')).toBeInTheDocument();

      // Clicking it triggers sheet opening
      fireEvent.click(viewReadersBtn);
      expect(openSeenSheetMock).toHaveBeenCalledWith(sampleMessage);
      expect(closeMock).toHaveBeenCalled();
    });
  });
});
