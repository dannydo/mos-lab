import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SlotMatrixGrid from './SlotMatrixGrid';
import LashDetailModal from './LashDetailModal';
import type { SlotMatrixMap, SlotBookingInfo } from '@mos-lab/shared';

const mockBooking: SlotBookingInfo = {
  orderId: 12345,
  customerId: 888,
  customerName: 'Nguyễn Thu Hà',
  customerAvatar: 'https://cdn.wingslashes.com/avatars/ha.jpg',
  customerPhone: '0901234567',
  bookingTime: '09:30',
  duration: 90,
  orderState: 'Booked',
  serviceName: 'Nối Mi Thiết Kế Katun Sexy',
  cycleDays: 21,
  previousBooking: {
    orderId: 11111,
    date: '2026-09-27',
    serviceName: 'Nối Mi Classic Tự Nhiên',
    technicianName: 'Thùy Trang',
    storeName: 'Wings Quận 1',
    cycleDays: 21,
  },
  nextBooking: {
    orderId: 13333,
    date: '2026-11-08',
    serviceName: 'Dặm Mi Thiết Kế',
    technicianName: 'Thùy Trang',
    storeName: 'Wings Quận 1',
    inDays: 21,
  },
  recentLashSets: [
    {
      orderId: 11111,
      bookingDate: '2026-09-27',
      serviceName: 'Nối Mi Classic Tự Nhiên',
      technicianName: 'Thùy Trang',
      storeName: 'Wings Quận 1',
      orderState: 'Completed',
      totalPrice: 450000,
      beforePhotoUrl: 'https://cdn.wingslashes.com/uploads/order/service-progress/111/original/before.jpg',
      afterPhotoUrl: 'https://cdn.wingslashes.com/uploads/order/service-progress/111/original/after.jpg',
      beforeThumbnailUrl: 'https://cdn.wingslashes.com/uploads/order/service-progress/111/thumbnail/before.jpg',
      afterThumbnailUrl: 'https://cdn.wingslashes.com/uploads/order/service-progress/111/thumbnail/after.jpg',
    },
  ],
};

const mockSlotMatrix: SlotMatrixMap = {
  '09:30': {
    available: 0,
    roster: 1,
    booked: 1,
    bookings: [mockBooking],
  },
  '10:00': {
    available: 2,
    roster: 2,
    booked: 0,
    bookings: [],
  },
};

describe('SlotMatrixGrid Component with Customer Avatar and Tooltip', () => {
  it('renders time slot buttons and customer avatar when slot is booked for selected CV', () => {
    const handleSelectSlot = vi.fn();

    render(
      <SlotMatrixGrid
        slotMatrix={mockSlotMatrix}
        loadingSlots={false}
        selectedSlot={null}
        setSelectedSlot={handleSelectSlot}
        selectedCN="1"
        morning={['09:30', '10:00']}
        afternoon={[]}
        night={[]}
        themeMode="light"
        selectedCV={{ id: 101, displayName: 'Thùy Trang' }}
      />
    );

    // Slot 09:30 should be rendered
    expect(screen.getByText('09:30')).toBeDefined();
    expect(screen.getByText('10:00')).toBeDefined();

    // Customer Avatar should be present
    const avatarImg = document.querySelector('img[src="https://cdn.wingslashes.com/avatars/ha.jpg"]');
    expect(avatarImg).not.toBeNull();
  });

  it('renders LashDetailModal with Customer info, Before/After photos, and Lash history', () => {
    const handleClose = vi.fn();

    render(
      <LashDetailModal
        open={true}
        onClose={handleClose}
        booking={mockBooking}
        themeMode="light"
      />
    );

    // Header info
    expect(screen.getByText('Nguyễn Thu Hà')).toBeDefined();
    expect(screen.getByText(/0901234567/)).toBeDefined();
    expect(screen.getByText(/Chu kỳ:/)).toBeDefined();

    // Tab labels
    expect(screen.getByText(/Ảnh Before & After/i)).toBeDefined();
    expect(screen.getByText(/Lịch sử nối mi/i)).toBeDefined();

    // Before & After labels in the active tab
    expect(screen.getByText(/Trước khi nối/i)).toBeDefined();
    expect(screen.getByText(/Sau khi hoàn thiện/i)).toBeDefined();

    // Service name in card
    expect(screen.getByText('Nối Mi Classic Tự Nhiên')).toBeDefined();
  });
});
