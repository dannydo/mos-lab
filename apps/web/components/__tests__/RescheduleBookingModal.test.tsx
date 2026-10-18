import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RescheduleBookingModal from '../RescheduleBookingModal';
import dayjs from 'dayjs';

const apiMocks = vi.hoisted(() => ({
  updateBooking: vi.fn(),
  checkRescheduleEligibility: vi.fn(),
  getStaffOffDays: vi.fn(),
  getStaffShifts: vi.fn(),
  getBookingPromotionOptions: vi.fn(),
  getDetailed: vi.fn(),
  getStaff: vi.fn(),
  getServices: vi.fn(),
}));

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    customers: {
      updateBooking: apiMocks.updateBooking,
      checkRescheduleEligibility: apiMocks.checkRescheduleEligibility,
      getStaffOffDays: apiMocks.getStaffOffDays,
      getStaffShifts: apiMocks.getStaffShifts,
      getBookingPromotionOptions: apiMocks.getBookingPromotionOptions,
      getDetailed: apiMocks.getDetailed,
      getStaff: apiMocks.getStaff,
      getServices: apiMocks.getServices,
    },
  },
}));

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'dark',
  }),
}));

const mockBooking: any = {
  id: 12345,
  customerId: 999,
  customerName: 'Nguyễn Thị Hoa',
  bookingDate: '2026-10-25',
  bookingTime: '10:00',
  bookingNote: 'Khách muốn nối mi tự nhiên',
  storeId: 1,
  storeName: 'Wings Sư Vạn Hạnh',
  technicianId: 10,
  technicianName: 'Chuyên viên Ly Ly',
  serviceId: 201,
  serviceName: 'Nối Mi Thiết Kế',
};

const mockStores = [
  { id: 1, name: 'Sư Vạn Hạnh' },
  { id: 2, name: 'Lê Văn Sỹ' },
];

const mockStaffList = [
  { id: 10, displayName: 'Ly Ly', role: 'CV' },
  { id: 11, displayName: 'Mai Mai', role: 'CV' },
];

const mockServices = [
  { id: 201, name: 'Nối Mi Thiết Kế', durationMinutes: 60, price: 350000 },
  { id: 202, name: 'Uốn Mi Collagen', durationMinutes: 45, price: 250000 },
];

describe('RescheduleBookingModal (MOS-BUG-114 1-Step Consolidation)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.checkRescheduleEligibility.mockResolvedValue({ allowed: true });
    apiMocks.getStaffOffDays.mockResolvedValue({ offDays: [] });
    apiMocks.getStaffShifts.mockResolvedValue({ shifts: [] });
    apiMocks.getBookingPromotionOptions.mockResolvedValue({ promotions: [] });
    apiMocks.getDetailed.mockResolvedValue({ id: 999, comboBalances: [] });
    apiMocks.getStaff.mockResolvedValue(mockStaffList);
    apiMocks.getServices.mockResolvedValue(mockServices);
    apiMocks.updateBooking.mockResolvedValue({ success: true });
  });

  it('renders modal in a single 1-step view without wizard step tabs or next buttons', async () => {
    render(
      <RescheduleBookingModal
        open={true}
        booking={mockBooking}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Verify title indicates 1-step action
    expect(screen.getByText(/ĐỔI LỊCH & CẬP NHẬT LỊCH HẸN/i)).toBeInTheDocument();

    // Verify absence of wizard navigation buttons
    expect(screen.queryByRole('button', { name: /tiếp tục/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /quay lại/i })).not.toBeInTheDocument();

    // Verify single-step completion button is present
    expect(screen.getByRole('button', { name: /hoàn tất & lưu/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đóng/i })).toBeInTheDocument();

    // Verify essential sections exist in the same screen
    expect(screen.getByText(/CHI NHÁNH ĐẶT LỊCH/i)).toBeInTheDocument();
    expect(screen.getByText(/CHUYÊN VIÊN THỰC HIỆN/i)).toBeInTheDocument();
    expect(screen.getByText(/DỊCH VỤ \(SERVICE\)/i)).toBeInTheDocument();
    expect(screen.getByText(/GHI CHÚ ĐẶT LỊCH/i)).toBeInTheDocument();
  });

  it('submits update in 1 single step when "Hoàn tất & Lưu" is clicked', async () => {
    const handleSuccess = vi.fn();
    render(
      <RescheduleBookingModal
        open={true}
        booking={mockBooking}
        onClose={vi.fn()}
        onSuccess={handleSuccess}
      />
    );

    // Click "Hoàn tất & Lưu" directly
    const saveButton = screen.getByRole('button', { name: /hoàn tất & lưu/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(apiMocks.updateBooking).toHaveBeenCalledTimes(1);
    });

    expect(apiMocks.updateBooking).toHaveBeenCalledWith(
      12345,
      expect.objectContaining({
        technicianId: 10,
        bookingDate: '2026-10-25',
        bookingTime: '10:00',
        serviceId: 201,
        bookingNote: 'Khách muốn nối mi tự nhiên',
        reasonCategory: 'Đổi lịch & Cập nhật thông tin đơn hàng',
      })
    );

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
