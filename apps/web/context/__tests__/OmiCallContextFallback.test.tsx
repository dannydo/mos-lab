import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, renderHook } from '@testing-library/react';
import { useOmiCall } from '../OmiCallContext';
import CustomerDetailDrawer from '../../components/CustomerDetailDrawer';

vi.mock('../../components/customer-detail/hooks/useCustomerDetail', () => ({
  useCustomerDetail: () => ({
    customer: {
      id: 45103,
      name: 'Khách Hàng Test',
      phone: '0909123456',
      phones: [{ id: 1, phone_number: '0909123456', is_disabled: false }],
      avatar: null,
      isForeign: false,
      dob: '1995-01-01',
      age: 30,
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
    handleTabChange: vi.fn(),
    fetchTabData: vi.fn(),
    counts: { bookings: 0, notes: 0, calls: 0, timeline: 0, assignment: 0 },
    getFavoriteBranch: () => 'Đề Thám',
    getFavoriteTechnicians: () => 'Chuyên Viên Mi',
    getRecentTechnician: () => 'Chuyên Viên Mi',
    getMostFrequentDay: () => 'Thứ 7',
    getFavoriteTimeSlot: () => '14:00',
    getRecentVisitTime: () => '14:00',
    getComboDisplayInfo: () => [],
  }),
}));

vi.mock('../../hooks/useResponsiveTier', () => ({
  useResponsiveTier: () => 'desktop',
  useIsCompactViewport: () => false,
  useViewportSize: () => ({ width: 1440, height: 900 }),
  getViewportSize: () => ({ width: 1440, height: 900 }),
}));

describe('OmiCallContext Fallback & Standalone Chat Support [MOS-BUG-193]', () => {
  it('useOmiCall returns safe default fallback and does not throw when outside OmiCallProvider', () => {
    const { result } = renderHook(() => useOmiCall());

    expect(result.current).toBeDefined();
    expect(result.current.canAccessOmiCall).toBe(false);
    expect(result.current.isRegistered).toBe(false);
    expect(result.current.callState).toBe('idle');
    expect(typeof result.current.makeCall).toBe('function');
  });

  it('renders CustomerDetailDrawer safely without OmiCallProvider (standalone /chat scenario)', () => {
    // Before this fix, CustomerDetailDrawer threw "useOmiCall must be used within an OmiCallProvider"
    // when clicked from /chat link
    const { container } = render(
      <CustomerDetailDrawer
        open={true}
        customerId={45103}
        onClose={vi.fn()}
      />
    );

    expect(container).toBeInTheDocument();
    expect(screen.getByText('Khách Hàng Test')).toBeInTheDocument();
  });
});
