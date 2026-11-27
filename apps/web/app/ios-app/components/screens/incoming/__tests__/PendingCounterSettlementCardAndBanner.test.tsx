import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { IncomingBookingCard } from '../IncomingBookingCard';
import { PendingCounterSettlementBanner } from '../PendingCounterSettlementBanner';
import { formatPendingCounterMethodShort, getDoneBookingSummary } from '../incomingBookingHelpers';
import { CheckoutStatusBanners } from '../../checkout/CheckoutStatusBanners';
import type { BookingItem } from '../../../../state/mockData';

vi.mock('../../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

function makeComboTipPendingBooking(overrides: Partial<BookingItem> = {}): BookingItem {
  return {
    id: 340295,
    orderNumber: 'BK-911433',
    customerName: 'Nguyễn Thị Thu Thảo',
    customerPhone: '090****123',
    customerId: 22286,
    customerVisits: 6,
    customerNote: '',
    timeSlot: '09:00 - 10:14',
    time12h: '09:00 am',
    serviceName: 'Flawless Mink 1D 880 70',
    serviceType: 'Normal',
    servicePrice: 0,
    serviceDuration: 74,
    status: 'DONE',
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    comboLiveStatus: {
      isComboLive: true,
      comboName: 'Flawless Mink 880 10+10',
      remainingSessions: 5,
      upsellOpportunity: false,
    },
    billing: {
      subtotal: 0,
      vatAmount: 0,
      serviceTotal: 0,
      comboTotal: 0,
      productTotal: 0,
      paymentMethod: 'CASH',
      tipAmount: 100000,
      tipCvShare: 90000,
      tipCcShare: 0,
      grandTotal: 100000,
      settlementStatus: 'PENDING_COUNTER_SETTLEMENT',
    },
    ...overrides,
  };
}

describe('MOS-BUG-266: Pending counter settlement display for 0d combo + 100K tip', () => {
  it('computes pendingCounterAmount and method short label for 0d combo + 100K cash tip', () => {
    const summary = getDoneBookingSummary(makeComboTipPendingBooking());

    expect(summary.isPendingCheckout).toBe(true);
    expect(summary.tipAmount).toBe(100000);
    expect(summary.grandTotal).toBe(100000);
    expect(summary.pendingCounterAmount).toBe(100000);
    expect(formatPendingCounterMethodShort('CASH')).toBe('TM');
    expect(formatPendingCounterMethodShort('POS')).toBe('POS');
    expect(formatPendingCounterMethodShort('VIETQR')).toBe('QR');
  });

  it('renders 100K counter amount and Tip indicator on Cho Quay chot card instead of 0d', () => {
    render(
      <IncomingBookingCard
        booking={makeComboTipPendingBooking()}
        idx={0}
        bookingSegment="DONE"
        dateOffset={0}
        now={new Date('2026-11-26T14:00:00+07:00')}
        isCvll={false}
        isAdmin={false}
        onSelectBooking={vi.fn()}
        onOpenLockedModal={vi.fn()}
        onOpenCustomerDetail={vi.fn()}
        onOpenRevertModal={vi.fn()}
      />
    );

    expect(screen.getByText('Chờ Quầy chốt')).toBeInTheDocument();
    expect(screen.getByTestId('card-done-amount-340295')).toHaveTextContent('100K');
    expect(screen.getByTestId('card-done-amount-340295')).not.toHaveTextContent('0đ');
    expect(screen.getByTestId('card-pending-meta-340295')).toHaveTextContent('TM');
    expect(screen.getByTestId('card-pending-meta-340295')).toHaveTextContent('100K');
  });

  it('shows actionable pending counter settlement banner on Incoming and Done tabs', () => {
    const onSelectDoneTab = vi.fn();
    const onSelectBooking = vi.fn();
    const bookings = [makeComboTipPendingBooking()];

    const { rerender } = render(
      <PendingCounterSettlementBanner
        bookings={bookings}
        bookingSegment="INCOMING"
        isDark={true}
        canDirectCounterSettle={false}
        onSelectDoneTab={onSelectDoneTab}
        onSelectBooking={onSelectBooking}
      />
    );

    const banner = screen.getByTestId('pending-counter-settlement-banner');
    expect(banner).toHaveTextContent('1 ca Chờ Quầy chốt (100K · Tip 100K)');
    expect(banner).toHaveTextContent('App cũ (WingsBeauty) giữ ở CheckOut');
    fireEvent.click(banner.querySelector('button')!);
    expect(onSelectDoneTab).toHaveBeenCalledTimes(1);

    rerender(
      <PendingCounterSettlementBanner
        bookings={bookings}
        bookingSegment="DONE"
        isDark={false}
        canDirectCounterSettle={true}
        onSelectDoneTab={onSelectDoneTab}
        onSelectBooking={onSelectBooking}
      />
    );

    expect(screen.getByTestId('pending-counter-settlement-banner')).toHaveTextContent('Chốt ngay');
    fireEvent.click(screen.getByTestId('pending-counter-settlement-banner').querySelector('button')!);
    expect(onSelectBooking).toHaveBeenCalledWith(340295);
  });

  it('renders CheckOut clarification banner on Screen12 even before toggling staff rewards', () => {
    const { rerender } = render(
      <CheckoutStatusBanners
        isDark={true}
        isSettled={false}
        showStaffRewards={false}
        assignedStaff="Thảo Ly"
        dualComboTotalBonus={0}
        isPendingCounterSettlement={true}
        canDirectCounterSettle={false}
        pendingGrandTotal={100000}
        pendingTipAmount={100000}
        pendingPaymentMethod="CASH"
      />
    );

    const statusBanner = screen.getByTestId('checkout-pending-counter-banner');
    expect(statusBanner).toHaveTextContent('ĐANG CHỜ QUẦY CHỐT (APP CŨ Ở CHECKOUT)');
    expect(statusBanner).toHaveTextContent('100.000đ (gồm Tip 100.000đ)');

    rerender(
      <CheckoutStatusBanners
        isDark={true}
        isSettled={true}
        showStaffRewards={false}
        assignedStaff="Thảo Ly"
        dualComboTotalBonus={0}
        isPendingCounterSettlement={true}
        canDirectCounterSettle={false}
        pendingGrandTotal={100000}
        pendingTipAmount={100000}
        pendingPaymentMethod="CASH"
      />
    );

    expect(screen.queryByTestId('checkout-pending-counter-banner')).toBeNull();
  });
});
