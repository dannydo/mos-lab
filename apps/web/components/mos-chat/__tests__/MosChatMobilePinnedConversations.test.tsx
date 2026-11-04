import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MosChatProvider } from '../context/MosChatContext';
import { MosChatMobileApp } from '../mobile/MosChatMobileApp';
import { apiClient } from '../../../lib/api-client';

vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      bootstrap: vi.fn(),
      togglePinConversation: vi.fn().mockResolvedValue({ success: true, pinned: true }),
      togglePinMessage: vi.fn().mockResolvedValue({ success: true, pinned: true }),
      markAsRead: vi.fn().mockResolvedValue({ success: true }),
      startDirectMessage: vi.fn().mockResolvedValue({ success: true, conversationId: 'dm-staff-20' }),
      createTask: vi.fn().mockResolvedValue({ success: true }),
      updateTask: vi.fn().mockResolvedValue({ success: true }),
      sendMessage: vi.fn().mockResolvedValue({ success: true }),
      getMessages: vi.fn().mockResolvedValue({ messages: [] }),
    },
  },
}));

describe('MOS-BUG-196: Mobile Pinned Spaces and DMs Experience', () => {
  const mockBootstrapData = {
    conversations: [
      {
        id: 'space-general',
        type: 'space',
        name: 'General Discussion',
        subtitle: 'Kênh thảo luận chung',
        color: '#3b82f6',
        memberCount: 20,
        memberIds: [1, 2],
        unreadCount: 0,
        updatedAt: '2026-11-04T08:00:00.000Z',
        messages: [],
      },
      {
        id: 'space-core-team',
        type: 'space',
        name: 'Core Team',
        subtitle: 'Kênh vận hành lõi',
        color: '#f59e0b',
        memberCount: 5,
        memberIds: [1, 2],
        unreadCount: 3,
        updatedAt: '2026-11-04T09:00:00.000Z',
        messages: [],
      },
      {
        id: 'dm-danny-do',
        type: 'dm',
        name: 'Danny Do',
        subtitle: 'Super Admin',
        participantStaffId: 1,
        memberIds: [1, 2],
        unreadCount: 1,
        updatedAt: '2026-11-04T07:00:00.000Z',
        messages: [],
      },
      {
        id: 'dm-bui-sinh-nguyen',
        type: 'dm',
        name: 'Bùi Sinh Nguyên',
        subtitle: 'Quản lý salon',
        participantStaffId: 6,
        memberIds: [6, 2],
        unreadCount: 0,
        updatedAt: '2026-11-04T06:00:00.000Z',
        messages: [],
      },
    ],
    tasks: [],
    staffDirectory: [
      { id: 1, username: 'dannydo', role: 'admin', displayName: 'Danny Do' },
      { id: 6, username: 'nguyen_bs', role: 'manager', displayName: 'Bùi Sinh Nguyên' },
    ],
    // Core Team space and Danny Do DM are pinned in user prefs!
    userPrefs: {
      pinnedIds: ['space-core-team', 'dm-danny-do'],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.chat.bootstrap as any).mockResolvedValue(mockBootstrapData);
  });

  it('bubbles pinned spaces and pinned DMs to the top of mobile inbox list', async () => {
    render(
      <MosChatProvider currentUser={{ id: 2, name: 'Quang Khải', role: 'CV' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    // Wait for bootstrap data to load
    await waitFor(() => {
      expect(screen.getByText('Core Team')).toBeInTheDocument();
    });

    // Pinned section subheader should be displayed
    expect(screen.getByText('Đã ghim', { selector: 'span' })).toBeInTheDocument();

    // Both Core Team and Danny Do should have the pinned indicator
    const pinnedBadges = screen.getAllByLabelText('Đã ghim');
    expect(pinnedBadges.length).toBeGreaterThanOrEqual(2);

    // Verify ordering: Core Team and Danny Do appear before General Discussion and Bùi Sinh Nguyên
    const convTitles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    const coreTeamIdx = convTitles.indexOf('Core Team');
    const dannyIdx = convTitles.indexOf('Danny Do');
    const generalIdx = convTitles.indexOf('General Discussion');
    const buiIdx = convTitles.indexOf('Bùi Sinh Nguyên');

    expect(coreTeamIdx).toBeGreaterThanOrEqual(0);
    expect(dannyIdx).toBeGreaterThanOrEqual(0);
    expect(coreTeamIdx).toBeLessThan(generalIdx);
    expect(dannyIdx).toBeLessThan(buiIdx);
  });

  it('filters to only pinned conversations when tapping the "Đã ghim" chip', async () => {
    render(
      <MosChatProvider currentUser={{ id: 2, name: 'Quang Khải', role: 'CV' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Core Team')).toBeInTheDocument();
    });

    // Tap "Đã ghim" filter chip
    const pinnedChip = screen.getByRole('button', { name: /^Đã ghim/i });
    fireEvent.click(pinnedChip);

    // Core Team (Space) and Danny Do (DM) should be visible
    expect(screen.getByText('Core Team')).toBeInTheDocument();
    expect(screen.getByText('Danny Do')).toBeInTheDocument();

    // Unpinned General Discussion and Bùi Sinh Nguyên should be filtered out
    expect(screen.queryByText('General Discussion')).not.toBeInTheDocument();
    expect(screen.queryByText('Bùi Sinh Nguyên')).not.toBeInTheDocument();
  });

  it('allows pinning/unpinning a conversation from the conversation action bottom sheet', async () => {
    render(
      <MosChatProvider currentUser={{ id: 2, name: 'Quang Khải', role: 'CV' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Core Team')).toBeInTheDocument();
    });

    // Tap action button on Core Team (which is currently pinned)
    const moreBtns = screen.getAllByLabelText('Tác vụ cuộc trò chuyện');
    expect(moreBtns.length).toBeGreaterThan(0);
    fireEvent.click(moreBtns[0]); // Core Team is at index 0

    // Bottom sheet should open with option to unpin
    await waitFor(() => {
      expect(screen.getByText(/Bỏ ghim Không gian này/i)).toBeInTheDocument();
    });

    // Click unpin option
    const unpinOption = screen.getByText(/Bỏ ghim Không gian này/i);
    fireEvent.click(unpinOption);

    // API should be invoked with space-core-team
    expect(apiClient.chat.togglePinConversation).toHaveBeenCalledWith('space-core-team');
  });

  it('displays pin toggle in mobile room header and allows pinning active room', async () => {
    render(
      <MosChatProvider currentUser={{ id: 2, name: 'Quang Khải', role: 'CV' }}>
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    // Wait for inbox to load
    await waitFor(() => {
      expect(screen.getByText('General Discussion')).toBeInTheDocument();
    });

    // Tap General Discussion to enter the room
    fireEvent.click(screen.getByText('General Discussion'));

    // Wait for room to render
    await waitFor(() => {
      expect(screen.getByLabelText(/Ghim Không gian này lên đầu/i)).toBeInTheDocument();
    });

    // Check for pin button in header
    const pinHeaderBtn = screen.getByLabelText(/Ghim Không gian này lên đầu/i);
    expect(pinHeaderBtn).toBeInTheDocument();

    // Click pin button
    fireEvent.click(pinHeaderBtn);
    expect(apiClient.chat.togglePinConversation).toHaveBeenCalledWith('space-general');
  });
});
