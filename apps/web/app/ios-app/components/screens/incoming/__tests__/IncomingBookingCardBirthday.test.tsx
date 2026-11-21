import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { IncomingBookingCard } from '../IncomingBookingCard';
import { Screen02CheckInProfile } from '../../Screen02CheckInProfile';
import { CustomerHistoryAndSpendingSheet } from '../../../ui-kit/CustomerHistoryAndSpendingSheet';
import type { BookingItem } from '../../../../state/mockData';

vi.mock('../../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    ios: {
      getCustomerHistory: vi.fn().mockResolvedValue({ success: true, visits: [], payments: [], fixVisits: [], diamondTransactions: [], notes: [] }),
    },
  },
}));

function makeBooking(overrides: Partial<BookingItem> = {}): BookingItem {
  return {
    id: 607235,
    orderNumber: 'BK-607235',
    customerName: 'Hoàng Huyên',
    customerPhone: '607235',
    customerId: 607235,
    customerVisits: 1,
    customerNote: '21/12 đã inbox nhắc lịch',
    timeSlot: '20:00 - 21:20',
    time12h: '08:00 pm',
    serviceName: 'Flawless Mink 1D 880',
    serviceType: 'Normal',
    servicePrice: 880000,
    serviceDuration: 80,
    status: 'SERVICING',
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    ...overrides,
  };
}

describe('MOS-BUG-258: Customer birthday status badge on /ios-app', () => {
  const nov21Now = new Date('2026-11-21T13:30:00+07:00');

  it('renders avatar top-right day badge and birthday pill when customer birthday is this month (not today)', () => {
    render(
      <IncomingBookingCard
        booking={makeBooking({ id: 101, customerDateOfBirth: '1995-11-05' })}
        idx={0}
        bookingSegment="INCOMING"
        dateOffset={0}
        now={nov21Now}
        isCvll={false}
        isAdmin={true}
        onSelectBooking={vi.fn()}
        onOpenLockedModal={vi.fn()}
        onOpenCustomerDetail={vi.fn()}
        onOpenRevertModal={vi.fn()}
      />
    );

    expect(screen.getByTestId('card-birthday-badge-101')).toHaveTextContent('05');
    expect(screen.getByTestId('card-birthday-pill-101')).toHaveTextContent('SN 05/11');
  });

  it('highlights exact birthday today on Servicing and Done booking cards', () => {
    render(
      <IncomingBookingCard
        booking={makeBooking({ id: 102, customerDateOfBirth: '1992-11-21' })}
        idx={0}
        bookingSegment="SERVICING"
        dateOffset={0}
        now={nov21Now}
        isCvll={false}
        isAdmin={true}
        onSelectBooking={vi.fn()}
        onOpenLockedModal={vi.fn()}
        onOpenCustomerDetail={vi.fn()}
        onOpenRevertModal={vi.fn()}
      />
    );

    expect(screen.getByTestId('card-birthday-badge-102')).toHaveTextContent('21');
    expect(screen.getByTestId('card-birthday-pill-102')).toHaveTextContent('Hôm nay SN (21/11)');
  });

  it('hides birthday badge when birthday is in another month, null, or legacy placeholder 1970-01-01', () => {
    render(
      <>
        <IncomingBookingCard
          booking={makeBooking({ id: 201, customerDateOfBirth: '1995-12-05' })}
          idx={0}
          bookingSegment="INCOMING"
          dateOffset={0}
          now={nov21Now}
          isCvll={false}
          isAdmin={true}
          onSelectBooking={vi.fn()}
          onOpenLockedModal={vi.fn()}
          onOpenCustomerDetail={vi.fn()}
          onOpenRevertModal={vi.fn()}
        />
        <IncomingBookingCard
          booking={makeBooking({ id: 202, customerDateOfBirth: '1970-01-01' })}
          idx={1}
          bookingSegment="INCOMING"
          dateOffset={0}
          now={nov21Now}
          isCvll={false}
          isAdmin={true}
          onSelectBooking={vi.fn()}
          onOpenLockedModal={vi.fn()}
          onOpenCustomerDetail={vi.fn()}
          onOpenRevertModal={vi.fn()}
        />
        <IncomingBookingCard
          booking={makeBooking({ id: 203, customerDateOfBirth: null })}
          idx={2}
          bookingSegment="INCOMING"
          dateOffset={0}
          now={nov21Now}
          isCvll={false}
          isAdmin={true}
          onSelectBooking={vi.fn()}
          onOpenLockedModal={vi.fn()}
          onOpenCustomerDetail={vi.fn()}
          onOpenRevertModal={vi.fn()}
        />
      </>
    );

    expect(screen.queryByTestId('card-birthday-badge-201')).toBeNull();
    expect(screen.queryByTestId('card-birthday-pill-201')).toBeNull();
    expect(screen.queryByTestId('card-birthday-badge-202')).toBeNull();
    expect(screen.queryByTestId('card-birthday-badge-203')).toBeNull();
  });

  it('displays customer birthday on Screen02CheckInProfile and CustomerHistoryAndSpendingSheet header', async () => {
    render(
      <>
        <Screen02CheckInProfile
          booking={makeBooking({ id: 300, customerDateOfBirth: '1993-04-15' })}
          onBack={vi.fn()}
          onCheckIn={vi.fn()}
        />
        <CustomerHistoryAndSpendingSheet
          isOpen={true}
          onClose={vi.fn()}
          booking={makeBooking({ id: 301, customerDateOfBirth: '1993-11-21' })}
        />
      </>
    );

    expect(screen.getByTestId('checkin-header-birthday-badge')).toHaveTextContent('Sinh nhật 15/04/1993');
    await waitFor(() => {
      expect(screen.getByTestId('customer-history-birthday')).toHaveTextContent('21/11');
    });
  });
});
