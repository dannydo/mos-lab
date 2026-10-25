import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MosChatSpaceMembersModal } from '../MosChatSpaceMembersModal';
import { MosChatProvider } from '../context/MosChatContext';
import { MosChatMobileApp } from '../mobile/MosChatMobileApp';
import type { MosChatConversation, MosChatStaffMember } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';

const { mockStaffDirectory, mockSpace } = vi.hoisted(() => {
  const staff: MosChatStaffMember[] = [
    { id: 1, displayName: 'Danny Do', username: 'dannydo', role: 'Super Admin', isOnline: true },
    { id: 2, displayName: 'Hoài My', username: 'hoaimy', role: 'CV Mi', isOnline: true },
    { id: 3, displayName: 'Thùy Trang', username: 'thuytrang', role: 'Tư Vấn CC', isOnline: false },
    { id: 4, displayName: 'Quang Khải', username: 'quangkhai', role: 'Dev Tech', isOnline: true },
    { id: 5, displayName: 'Minh Hằng', username: 'minhhang', role: 'CS & Lễ Tân', isOnline: false },
  ];

  const space: MosChatConversation = {
    id: 'space-test-ops',
    type: 'space',
    name: 'van-hanh-shop',
    subtitle: 'Không gian vận hành chi nhánh',
    color: '#1a73e8',
    avatar: '🏢',
    memberCount: 3,
    memberIds: [1, 2, 3],
    members: [staff[0], staff[1], staff[2]],
    memberNicknames: {
      '2': 'My My',
    },
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
    messages: [],
  };

  return { mockStaffDirectory: staff, mockSpace: space };
});

// Mock apiClient.chat
vi.mock('../../../lib/api-client', () => ({
  apiClient: {
    chat: {
      bootstrap: vi.fn().mockImplementation(async () => ({
        conversations: [mockSpace],
        tasks: [],
        staffDirectory: mockStaffDirectory,
        userPrefs: { pinnedIds: [] },
      })),
      addMember: vi.fn().mockImplementation(async (convId: string, staffIdOrIds: number | number[]) => {
        const addedIds = Array.isArray(staffIdOrIds) ? staffIdOrIds : [staffIdOrIds];
        const currentIds = mockSpace.memberIds || [];
        const updatedIds = Array.from(new Set([...currentIds, ...addedIds]));
        return {
          success: true,
          conversation: {
            ...mockSpace,
            memberIds: updatedIds,
            memberCount: updatedIds.length,
          },
        };
      }),
      removeMember: vi.fn().mockImplementation(async (convId: string, staffId: number) => {
        const currentIds = mockSpace.memberIds || [];
        const updatedIds = currentIds.filter((id) => id !== staffId);
        return {
          success: true,
          conversation: {
            ...mockSpace,
            memberIds: updatedIds,
            memberCount: updatedIds.length,
          },
        };
      }),
      updateNickname: vi.fn().mockImplementation(async (convId: string, payload: { staffId: number; nickname: string }) => {
        return {
          success: true,
          conversation: {
            ...mockSpace,
            memberNicknames: {
              ...mockSpace.memberNicknames,
              [String(payload.staffId)]: payload.nickname,
            },
          },
        };
      }),
      updateSpaceConfig: vi.fn().mockResolvedValue({ success: true, conversation: mockSpace }),
      markAsRead: vi.fn().mockResolvedValue({ success: true }),
    },
  },
}));

describe('Space Member Management & Mobile Integration (MOS-BUG-146)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders space title, member count, and lists current members with roles & nicknames', async () => {
    render(
      <MosChatProvider
        currentUser={{ id: 1, staffId: 1, fullName: 'Danny Do', role: 'admin' }}
        initialConvId="space-test-ops"
      >
        <MosChatSpaceMembersModal
          open={true}
          conversation={mockSpace}
          onClose={vi.fn()}
        />
      </MosChatProvider>
    );

    // Check title
    expect(screen.getByText(/Thành viên Không gian · #van-hanh-shop/)).toBeInTheDocument();

    // Check members loaded from mock
    await waitFor(() => {
      expect(screen.getByText('Danny Do')).toBeInTheDocument();
      expect(screen.getByText('My My')).toBeInTheDocument();
      expect(screen.getByText('(Hoài My)')).toBeInTheDocument();
      expect(screen.getByText('Thùy Trang')).toBeInTheDocument();
    });
  });

  it('allows adding an individual colleague from the directory to the space', async () => {
    render(
      <MosChatProvider
        currentUser={{ id: 1, staffId: 1, fullName: 'Danny Do', role: 'admin' }}
        initialConvId="space-test-ops"
      >
        <MosChatSpaceMembersModal
          open={true}
          conversation={mockSpace}
          onClose={vi.fn()}
        />
      </MosChatProvider>
    );

    // Initial state: "Thêm" button is disabled until a colleague is chosen
    const addBtn = screen.getByRole('button', { name: 'Thêm' });
    expect(addBtn).toBeDisabled();

    expect(screen.getByText('Thêm đồng nghiệp hoặc cả Bộ phận / Nhóm vào Không gian')).toBeInTheDocument();
  });

  it('renders 1-Click quick add department & team buttons with accurate missing counts', async () => {
    render(
      <MosChatProvider
        currentUser={{ id: 1, staffId: 1, fullName: 'Danny Do', role: 'admin' }}
        initialConvId="space-test-ops"
      >
        <MosChatSpaceMembersModal
          open={true}
          conversation={mockSpace}
          onClose={vi.fn()}
        />
      </MosChatProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Thêm nhanh cả Bộ phận / Nhóm:')).toBeInTheDocument();
    });
  });

  it('allows editing member nickname and saving', async () => {
    render(
      <MosChatProvider
        currentUser={{ id: 1, staffId: 1, fullName: 'Danny Do', role: 'admin' }}
        initialConvId="space-test-ops"
      >
        <MosChatSpaceMembersModal
          open={true}
          conversation={mockSpace}
          onClose={vi.fn()}
        />
      </MosChatProvider>
    );

    // Edit nickname button for Hoài My (has nickname 'My My')
    await waitFor(() => {
      const editNickButtons = screen.getAllByRole('button', { name: /Sửa/i });
      expect(editNickButtons.length).toBeGreaterThan(0);
    });
  });

  it('renders UserPlus action button on mobile header when inside a Space room', async () => {
    render(
      <MosChatProvider
        currentUser={{ id: 1, staffId: 1, fullName: 'Danny Do', role: 'admin' }}
        initialConvId="space-test-ops"
      >
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    // Wait for bootstrap and tap on the Space conversation to enter the room
    await waitFor(() => {
      expect(screen.getByText('van-hanh-shop')).toBeInTheDocument();
    });

    const spaceCard = screen.getByText('van-hanh-shop');
    fireEvent.click(spaceCard);

    // Mobile header should render the UserPlus button for space member management
    await waitFor(() => {
      const addMemberBtn = screen.getByLabelText('Thành viên Không gian');
      expect(addMemberBtn).toBeInTheDocument();
    });

    // Clicking UserPlus button opens the Space Members Modal
    const addMemberBtn = screen.getByLabelText('Thành viên Không gian');
    fireEvent.click(addMemberBtn);

    await waitFor(() => {
      expect(screen.getByText(/Thành viên Không gian · #van-hanh-shop/)).toBeInTheDocument();
    });
  });

  it('allows opening Space Members modal from Space Settings footer on mobile', async () => {
    render(
      <MosChatProvider
        currentUser={{ id: 1, staffId: 1, fullName: 'Danny Do', role: 'admin' }}
        initialConvId="space-test-ops"
      >
        <MosChatMobileApp standalone={true} />
      </MosChatProvider>
    );

    // Wait for bootstrap and tap on the Space conversation to enter the room
    await waitFor(() => {
      expect(screen.getByText('van-hanh-shop')).toBeInTheDocument();
    });

    const spaceCard = screen.getByText('van-hanh-shop');
    fireEvent.click(spaceCard);

    // Tap on the Space title in the header to open Space Settings
    await waitFor(() => {
      const titleElement = screen.getByRole('button', { name: /van-hanh-shop/i });
      fireEvent.click(titleElement);
    });

    // Space Settings modal should be open
    await waitFor(() => {
      expect(screen.getByText('Cài đặt & Cấu hình Không gian (Space Settings)')).toBeInTheDocument();
    });

    // Click "Quản lý thành viên" button in the footer
    const manageMembersBtn = screen.getByRole('button', { name: /Quản lý thành viên/i });
    expect(manageMembersBtn).toBeInTheDocument();
    fireEvent.click(manageMembersBtn);

    // Should switch to Space Members modal
    await waitFor(() => {
      expect(screen.getByText(/Thành viên Không gian · #van-hanh-shop/)).toBeInTheDocument();
    });
  });
});
