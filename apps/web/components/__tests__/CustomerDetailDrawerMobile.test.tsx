import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CustomerDetailDrawer from '../CustomerDetailDrawer';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeMode: 'dark',
  }),
}));

vi.mock('../../context/OmiCallContext', () => ({
  useOmiCall: () => ({
    makeCall: vi.fn(),
    canAccessOmiCall: true,
    isAdmin: false,
    adminOmiCallEnabled: false,
  }),
}));

vi.mock('../../hooks/useResponsiveTier', () => ({
  useResponsiveTier: () => 'mobile',
  useIsCompactViewport: () => true,
  useViewportSize: () => ({ width: 390, height: 844 }),
  getViewportSize: () => ({ width: 390, height: 844 }),
}));

vi.mock('../customer-detail/hooks/useCustomerDetail', () => ({
  useCustomerDetail: () => ({
    customer: {
      id: 45103,
      name: 'Nadhira Ulya',
      phone: '61493198238',
      phones: [{ id: 1, phone_number: '61493198238', is_disabled: false }],
      avatar: null,
      isForeign: true,
      dob: '1990-06-13',
      age: 34,
      isDeleted: false,
    },
    loading: false,
    tabDataMap: {},
    bookings: [],
    comboBalances: [],
    notes: [],
    calls: [],
    restoreLoading: false,
    deleteLoading: false,
    forbiddenError: false,
    handleRestoreCustomer: vi.fn(),
    handleDeleteCustomer: vi.fn(),
    handleOpenEditModal: vi.fn(),
    getFavoriteBranch: () => 'De Tham',
    getFavoriteTechnicians: () => 'Nâu',
    getRecentTechnician: () => 'Nâu',
    getMostFrequentDay: () => 'Thứ 7',
    getFavoriteTimeSlot: () => '14:00',
    getRecentVisitTime: () => '14:00',
    getComboDisplayInfo: () => [],
  }),
}));

describe('CustomerDetailDrawer Mobile Safe Area & Navigation [MOS-BUG-179]', () => {
  it('renders mobile navigation topbar with Quay lại button and triggers onClose', () => {
    const handleClose = vi.fn();
    render(
      <CustomerDetailDrawer
        open={true}
        customerId={45103}
        onClose={handleClose}
      />
    );

    // Verify Quay lai button is present on mobile
    const backBtn = screen.getByRole('button', { name: /Quay lại/i });
    expect(backBtn).toBeInTheDocument();

    // Verify "Hồ sơ khách hàng" title in mobile topbar
    expect(screen.getByText('Hồ sơ khách hàng')).toBeInTheDocument();

    // Verify customer name
    expect(screen.getByText('Nadhira Ulya')).toBeInTheDocument();

    // Click Quay lai
    fireEvent.click(backBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
