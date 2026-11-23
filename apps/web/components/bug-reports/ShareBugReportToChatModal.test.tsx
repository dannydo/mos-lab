import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockBootstrap = vi.fn();
const mockShareMission = vi.fn();
const mockGetSharedMissionPreview = vi.fn();

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    chat: {
      bootstrap: (...args: unknown[]) => mockBootstrap(...args),
      shareMission: (...args: unknown[]) => mockShareMission(...args),
      getSharedMissionPreview: (...args: unknown[]) => mockGetSharedMissionPreview(...args),
    },
  },
}));

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

import { ShareBugReportToChatModal } from './ShareBugReportToChatModal';
import { MosChatSharedMissionDetailModal } from '../mos-chat/components/MosChatSharedMissionDetailModal';

describe('MOS-FEAT-263: ShareBugReportToChatModal & MosChatSharedMissionDetailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.setItem(
      'mos_user',
      JSON.stringify({ id: 42, username: 'khai', displayName: 'Nguyễn Quang Khải', role: 'manager' })
    );
  });

  it('loads mOS Chat spaces/DMs and shares a ticket with optional note', async () => {
    mockBootstrap.mockResolvedValue({
      conversations: [
        {
          id: 'space-lab',
          type: 'space',
          name: 'Lab Thảo Luận',
          color: '#8b5cf6',
          memberIds: [1, 42],
          memberCount: 2,
          unreadCount: 0,
          messages: [],
          updatedAt: '2026-11-22T07:00:00Z',
        },
      ],
      staffDirectory: [
        { id: 1, username: 'danny', displayName: 'Danny Do', role: 'super_admin' },
        { id: 42, username: 'khai', displayName: 'Nguyễn Quang Khải', role: 'manager' },
      ],
      userPrefs: { pinnedIds: [] },
    });

    mockShareMission.mockResolvedValue({
      success: true,
      mission: { reportId: 253, key: 'MOS-BUG-253', missionCode: 'MSN-253' },
      results: [
        {
          conversationId: 'space-lab',
          conversationName: 'Lab Thảo Luận',
          conversationType: 'space',
          message: { id: 'msg-share-1' },
        },
      ],
      updatedConversations: [],
    });

    const onClose = vi.fn();

    render(
      <ShareBugReportToChatModal
        open={true}
        ticket={{
          id: 253,
          key: 'MOS-BUG-253',
          title: 'Lỗi hiển thị doanh số',
          requestType: 'BUG',
          statusLabel: 'Đang xử lý',
          summary: 'Chi tiết lỗi khi lọc theo tháng',
        }}
        onClose={onClose}
      />
    );

    expect(screen.getByText(/mOS MISSION · #MOS-BUG-253/i)).toBeTruthy();
    expect(screen.getByText('Lỗi hiển thị doanh số')).toBeTruthy();

    await waitFor(() => {
      expect(mockBootstrap).toHaveBeenCalledWith({ messageLimit: 0 });
    });

    const spaceOption = await screen.findByRole('button', { name: /#Lab Thảo Luận/i });
    fireEvent.click(spaceOption);

    const noteInput = screen.getByPlaceholderText(/Thêm lời nhắn đi kèm/i);
    fireEvent.change(noteInput, { target: { value: 'Anh xem giúp em ticket này nhé' } });

    const sendButton = screen.getByRole('button', { name: /Gửi \(1\)/i });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockShareMission).toHaveBeenCalledWith({
        reportId: 253,
        targetConversationIds: ['space-lab'],
        targetStaffIds: [],
        note: 'Anh xem giúp em ticket này nhé',
      });
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('loads and displays full ticket preview in MosChatSharedMissionDetailModal for chat participants', async () => {
    mockGetSharedMissionPreview.mockResolvedValue({
      success: true,
      data: {
        reportId: 253,
        key: 'MOS-BUG-253',
        missionCode: 'MSN-253',
        requestType: 'BUG',
        title: 'Lỗi hiển thị doanh số',
        description: 'Khi lọc tháng 11 thì cột tổng bị lệch',
        status: 'IN_PROGRESS',
        sourcePath: '/dashboard/cc',
        reporterStaffId: 42,
        reporterName: 'Nguyễn Quang Khải',
        createdAt: '2026-11-22T07:00:00Z',
        updatedAt: '2026-11-22T08:00:00Z',
        resolutionSummary: null,
        releaseUrl: null,
        mission: {
          reportId: 253,
          key: 'MOS-BUG-253',
          missionKey: 'MOS-BUG-253',
          missionCode: 'MSN-253',
          requestType: 'BUG',
          title: 'Lỗi hiển thị doanh số',
          status: 'IN_PROGRESS',
          clarificationStatus: 'READY',
          stage: 'BUILDING',
          stepIndex: 2,
          humanBadge: '⚡ Đang xây dựng',
          stageLabel: '⚡ Đang xây dựng',
          humanSummary: 'Đang lập trình',
          humanStatusSummary: 'Đang lập trình',
          updatedAt: '2026-11-22T08:00:00Z',
        },
      },
    });

    render(
      <MosChatSharedMissionDetailModal
        open={true}
        reportId={253}
        isDark={true}
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(mockGetSharedMissionPreview).toHaveBeenCalledWith(253);
    });

    expect(await screen.findByText('Khi lọc tháng 11 thì cột tổng bị lệch')).toBeTruthy();
    expect(screen.getByText(/\/dashboard\/cc/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Mở trong Yêu cầu của tôi/i })).toBeTruthy();
  });
});
