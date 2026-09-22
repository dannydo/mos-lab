import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BkGameCreateModal from './BkGameCreateModal';

const apiMocks = vi.hoisted(() => ({
  getConfig: vi.fn(),
  createGame: vi.fn(),
  staffList: vi.fn(),
  teamsList: vi.fn(),
  rolesList: vi.fn(),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    bk: {
      getConfig: apiMocks.getConfig,
      createGame: apiMocks.createGame,
    },
    staff: {
      list: apiMocks.staffList,
    },
    teams: {
      list: apiMocks.teamsList,
    },
    roles: {
      list: apiMocks.rolesList,
    },
  },
}));

describe('BkGameCreateModal', () => {
  const mockStaff = [
    { id: 1, legacyStaffId: 50670, displayName: 'Thùy Dương (Telesales)', role: 'telesales', avatarUrl: null },
    { id: 2, legacyStaffId: 52316, displayName: 'Hồng Nhung (CC)', role: 'cc', avatarUrl: null },
    { id: 3, legacyStaffId: 52400, displayName: 'Lan Anh (KTV)', role: 'technician', avatarUrl: null },
    { id: 4, legacyStaffId: 52500, displayName: 'Tâm Nguyễn (Admin)', role: 'admin', avatarUrl: null },
  ];

  const mockTeams = {
    departments: [
      { id: 1, code: 'GROWTH', name: 'Growth & Booking' },
      { id: 2, code: 'SHOP', name: 'Shop Operations' },
      { id: 3, code: 'BACK_OFFICE', name: 'Back Office' },
    ],
    teams: [
      {
        id: 1,
        code: 'BK_TELESALES',
        name: 'Telesales',
        activeStaffIds: [50670],
        department: { code: 'GROWTH', name: 'Growth & Booking' },
      },
      {
        id: 2,
        code: 'CC',
        name: 'Client Consultant',
        activeStaffIds: [52316],
        department: { code: 'SHOP', name: 'Shop Operations' },
      },
      {
        id: 3,
        code: 'CV',
        name: 'Chuyên viên KTV',
        activeStaffIds: [52400],
        department: { code: 'SHOP', name: 'Shop Operations' },
      },
    ],
  };

  const mockRoles = [
    { key: 'telesales', name: 'Telesales' },
    { key: 'cc', name: 'Tư vấn viên (CC)' },
    { key: 'technician', name: 'Kỹ thuật viên' },
    { key: 'admin', name: 'Quản trị viên' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getConfig.mockResolvedValue({
      activeBkIds: [50670],
      allStaffOptions: [{ staffId: 50670, displayName: 'Thùy Dương (Telesales)' }],
    });
    apiMocks.staffList.mockResolvedValue(mockStaff);
    apiMocks.teamsList.mockResolvedValue(mockTeams);
    apiMocks.rolesList.mockResolvedValue(mockRoles);
  });

  it('renders modal and loads staff across all departments and roles', async () => {
    render(<BkGameCreateModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByText('Khởi Tạo Game BK Mới')).toBeInTheDocument();
    expect(screen.getByText('1. Bộ lọc Vai trò / Bộ phận')).toBeInTheDocument();
    expect(screen.getByText(/2. Danh sách nhân viên tham gia/)).toBeInTheDocument();

    await waitFor(() => {
      expect(apiMocks.staffList).toHaveBeenCalledWith({ isActive: true });
      expect(apiMocks.teamsList).toHaveBeenCalled();
      expect(apiMocks.rolesList).toHaveBeenCalled();
    });

    // Should indicate the full count of loaded staff
    await waitFor(() => {
      expect(screen.getByText(/Hiển thị 4 \/ 4 nhân sự/)).toBeInTheDocument();
    });
  });

  it('allows quick clearing and adding all filtered members', async () => {
    render(<BkGameCreateModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Hiển thị 4 \/ 4 nhân sự/)).toBeInTheDocument();
    });

    // Click "Xóa hết"
    const clearBtn = screen.getByRole('button', { name: /Xóa hết/i });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText(/Danh sách nhân viên tham gia \(0\)/)).toBeInTheDocument();
    });

    // Click "+ Thêm tất cả (4)"
    const addAllBtn = screen.getByRole('button', { name: /\+ Thêm tất cả \(4\)/i });
    fireEvent.click(addAllBtn);

    await waitFor(() => {
      expect(screen.getByText(/Danh sách nhân viên tham gia \(4\)/)).toBeInTheDocument();
    });
  });

  it('displays the scoring rule guide and updates formula when metric changes', async () => {
    render(<BkGameCreateModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />);

    // Default metric is BOOKINGS
    const guide = screen.getByTestId('bk-game-scoring-guide');
    expect(guide).toBeInTheDocument();
    expect(guide).toHaveTextContent(/Công thức tính điểm: 1 Booking tạo mới hợp lệ = 1 Điểm/);
    expect(guide).toHaveTextContent(/Nguồn trích xuất:/);
    expect(guide).toHaveTextContent(/Bảng order/);
    expect(guide).toHaveTextContent(/Điều răn #10/);

    // Switch metric to CALLS
    const callsRadio = screen.getByRole('radio', { name: /Cuộc gọi/i });
    fireEvent.click(callsRadio);

    await waitFor(() => {
      expect(screen.getByTestId('bk-game-scoring-guide')).toHaveTextContent(
        /Công thức tính điểm: 1 Cuộc gọi phát sinh = 1 Điểm/
      );
    });
  });
});
