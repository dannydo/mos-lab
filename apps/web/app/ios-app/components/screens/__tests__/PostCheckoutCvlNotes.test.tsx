import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Screen14ThermalReceiptDone } from '../Screen14ThermalReceiptDone';
import { CustomerHistoryAndSpendingSheet } from '../../ui-kit/CustomerHistoryAndSpendingSheet';
import { CvlCustomerNotesBanner } from '../../ui-kit/CvlCustomerNotesBanner';
import type { BookingItem } from '../../../state/mockData';
import { apiClient } from '~/lib/api-client';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'light' }),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    ios: {
      getCustomerHistory: vi.fn(),
      createCustomerNote: vi.fn(),
    },
  },
}));

const BASE_BOOKING: BookingItem = {
  id: 336925,
  orderNumber: 'BK-336925',
  customerName: 'Chị Minh Anh',
  customerPhone: '0901.xxx.xxx',
  customerId: 33732,
  customerVisits: 4,
  customerNote: 'Khách book Thảo Ly',
  timeSlot: '13:10 - 14:30',
  serviceName: 'HyperLight 3X',
  servicePrice: 770000,
  serviceDuration: 80,
  status: 'DONE',
  orderState: 'Completed',
  assignedStaffId: 46272,
  assignedStaffName: 'Thảo Ly',
  billing: {
    subtotal: 770000,
    serviceTotal: 770000,
    productTotal: 0,
    vatRate: 0.08,
    vatAmount: 61600,
    tipAmount: 100000,
    tipCvShare: 70000,
    tipCcShare: 0,
    grandTotal: 931600,
    paymentMethod: 'VIETQR',
    settlementStatus: 'SETTLED_COMPLETED',
    completedAt: '2026-11-19T06:30:00.000Z',
  },
  cvlNotes: [
    {
      id: 101,
      customerId: 33732,
      note: 'Mắt trái nhạy băng keo giấy, lần sau dùng băng lụa.',
      noteFieldKey: 'cvl_note',
      source: 'CVL',
      isSticky: true,
      dateCreated: '2026-11-01T08:00:00.000Z',
      dateDisplay: '01/11/2026',
      timeDisplay: '15:00',
      daysAgoLabel: '18 ngày trước',
      staffId: 46272,
      staffName: 'Thảo Ly',
    },
  ],
};

describe('Post-checkout CVL Notes (/ios-app)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Screen14 hides existing CVL notes by default (customer-facing) while exposing private + Thêm trigger, and reveals notes when eye toggle is clicked', async () => {
    vi.mocked(apiClient.ios.createCustomerNote).mockResolvedValue({
      success: true,
      note: {
        id: 501,
        customerId: 33732,
        note: 'Nhạy cảm keo, quạt khô kỹ góc trong.',
        noteFieldKey: 'cvl_note',
        source: 'CVL',
        isSticky: true,
        dateCreated: '2026-11-19T07:00:00.000Z',
        dateDisplay: '19/11/2026',
        timeDisplay: '14:00',
        daysAgoLabel: 'Hôm Nay',
        staffId: 46272,
        staffName: 'Thảo Ly',
      },
    });

    render(<Screen14ThermalReceiptDone booking={BASE_BOOKING} onFinishOrder={vi.fn()} />);

    // Default: customer-facing mode hides note content
    expect(screen.getByTestId('open-post-checkout-note-btn')).toBeDefined();
    expect(screen.queryByTestId('post-checkout-cvl-notes-list')).toBeNull();
    expect(screen.queryByText(/Mắt trái nhạy băng keo giấy/)).toBeNull();

    // Open modal and add note even on SETTLED_COMPLETED booking
    fireEvent.click(screen.getByTestId('open-post-checkout-note-btn'));
    fireEvent.click(screen.getByRole('button', { name: 'Nhạy keo' }));
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() => {
      expect(apiClient.ios.createCustomerNote).toHaveBeenCalledWith(33732, {
        note: 'Nhạy cảm keo, quạt khô kỹ góc trong.',
        tags: ['glue'],
        isSticky: true,
        bookingId: 336925,
        simulationMode: false,
      });
    });

    // Toggle internal visibility eye on header -> both new and prior CVL notes appear
    fireEvent.click(screen.getByTestId('ios-staff-visibility-toggle'));
    expect(screen.getByTestId('post-checkout-cvl-notes-list')).toBeDefined();
    expect(screen.getByText(/Mắt trái nhạy băng keo giấy/)).toBeDefined();
    expect(screen.getByText(/Nhạy cảm keo, quạt khô kỹ góc trong\./)).toBeDefined();
  });

  it('CustomerHistoryAndSpendingSheet hides GHI CHÚ tab in customerFacingMode and shows it in internal mode', async () => {
    vi.mocked(apiClient.ios.getCustomerHistory).mockResolvedValue({
      success: true,
      customerId: 33732,
      customerName: 'Chị Minh Anh',
      customerPhone: '0901.xxx.xxx',
      summary: {
        totalSpent: 931600,
        completedVisits: 1,
        totalBookings: 1,
        canceledBookings: 0,
        fixCount: 0,
        avgSpendPerVisit: 931600,
        diamondBalance: 10,
        totalDiamondEarned: 10,
        totalDiamondUsed: 0,
        totalDebt: 0,
        lastVisitDate: '19/11/2026',
        firstVisitDate: '19/11/2026',
      },
      visits: [],
      payments: [],
      fixVisits: [],
      diamondTransactions: [],
      notes: BASE_BOOKING.cvlNotes,
    });

    const { rerender } = render(
      <CustomerHistoryAndSpendingSheet
        isOpen={true}
        onClose={vi.fn()}
        booking={BASE_BOOKING}
        initialTab="NOTES"
        customerFacingMode={true}
      />
    );

    expect(screen.queryByRole('tab', { name: /GHI CHÚ/i })).toBeNull();
    expect(screen.queryByTestId('customer-notes-tab')).toBeNull();

    rerender(
      <CustomerHistoryAndSpendingSheet
        isOpen={true}
        onClose={vi.fn()}
        booking={BASE_BOOKING}
        initialTab="NOTES"
        customerFacingMode={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /GHI CHÚ/i })).toBeDefined();
      expect(screen.getByTestId('customer-notes-tab')).toBeDefined();
      expect(screen.getByText(/Mắt trái nhạy băng keo giấy/)).toBeDefined();
    });
  });

  it('CvlCustomerNotesBanner renders sticky CVL notes first for next visit screens', () => {
    render(
      <CvlCustomerNotesBanner
        isDark={false}
        notes={[
          {
            id: 1,
            customerId: 33732,
            note: 'Note thường',
            noteFieldKey: 'cvl_note',
            source: 'CVL',
            isSticky: false,
            dateCreated: '2026-11-01T08:00:00.000Z',
            dateDisplay: '01/11/2026',
            timeDisplay: '15:00',
            daysAgoLabel: '18 ngày trước',
            staffName: 'Thảo Ly',
          },
          {
            id: 2,
            customerId: 33732,
            note: 'Note quan trọng',
            noteFieldKey: 'cvl_note',
            source: 'CVL',
            isSticky: true,
            dateCreated: '2026-10-20T08:00:00.000Z',
            dateDisplay: '20/10/2026',
            timeDisplay: '10:00',
            daysAgoLabel: '30 ngày trước',
            staffName: 'Khanh Cao',
          },
        ]}
      />
    );

    const banner = screen.getByTestId('cvl-customer-notes-banner');
    const text = banner.textContent || '';
    expect(text.indexOf('Note quan trọng')).toBeLessThan(text.indexOf('Note thường'));
  });
});
