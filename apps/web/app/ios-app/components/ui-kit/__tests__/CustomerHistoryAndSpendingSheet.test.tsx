import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { IosCustomerHistoryResponse } from '@mos-lab/shared';
import { CustomerHistoryAndSpendingSheet } from '../CustomerHistoryAndSpendingSheet';
import { Screen03ConsultationMatrix } from '../../screens/Screen03ConsultationMatrix';
import { Screen02CheckInProfile } from '../../screens/Screen02CheckInProfile';
import type { BookingItem } from '../../../state/mockData';
import { apiClient } from '~/lib/api-client';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    ios: {
      getCustomerHistory: vi.fn(),
    },
  },
}));

const MOCK_HISTORY_RESPONSE: IosCustomerHistoryResponse = {
  success: true,
  customerId: 33732,
  customerName: 'Thanh',
  customerPhone: '******6746',
  customerCode: 'W936746',
  summary: {
    totalSpent: 1425600,
    completedVisits: 2,
    totalBookings: 3,
    canceledBookings: 0,
    fixCount: 1,
    avgSpendPerVisit: 712800,
    diamondBalance: 150,
    totalDiamondEarned: 20,
    totalDiamondUsed: 100,
    totalDebt: 0,
    lastVisitDate: '16/11/2026',
    firstVisitDate: '07/10/2026',
  },
  visits: [
    {
      orderId: 9001,
      orderNumber: '#9001',
      bookingDateStart: '2026-11-16T06:00:00.000Z',
      dateDisplay: '16/11/2026',
      timeDisplay: '13:00',
      daysAgoLabel: 'Hôm Nay',
      orderState: 'New',
      statusLabel: 'Lịch mới',
      statusTone: 'upcoming',
      serviceName: 'Combo 10 tặng 6 - Hyperlight 770',
      services: [{ name: 'Combo 10 tặng 6 - Hyperlight 770', price: 770000 }],
      isFixOrder: false,
      bookingNote: 'Tư vấn gói combo mới',
      branchId: 16,
      branchName: 'Estella Place',
      staffNames: ['Minh Anh'],
      staffAvatars: [],
      diamondEarned: 0,
      diamondUsed: 0,
      totalPrice: 770000,
      paidAmount: 0,
      discountAmount: 0,
      prepaidAmount: 0,
      debtAmount: 0,
      tipAmount: 0,
      paymentMethodLabel: '0 đ',
    },
    {
      orderId: 8002,
      orderNumber: '#8002',
      bookingDateStart: '2026-10-07T07:00:00.000Z',
      dateDisplay: '07/10/2026',
      timeDisplay: '14:00',
      daysAgoLabel: '40 ngày trước',
      orderState: 'Completed',
      statusLabel: 'Hoàn thành',
      statusTone: 'completed',
      serviceName: 'Hyperlight 770 (Combo)',
      services: [{ name: 'Hyperlight 770 (Combo)', price: 770000, isComboUsed: true }],
      isFixOrder: false,
      bookingNote: null,
      branchId: 6,
      branchName: 'De Tham',
      staffNames: ['Minh Anh'],
      staffAvatars: [],
      diamondEarned: 10,
      diamondUsed: 100,
      totalPrice: 770000,
      paidAmount: 712800,
      discountAmount: 0,
      prepaidAmount: 0,
      debtAmount: 0,
      tipAmount: 50000,
      paymentMethodLabel: 'Thẻ POS',
    },
    {
      orderId: 8001,
      orderNumber: '#8001',
      bookingDateStart: '2026-09-10T04:00:00.000Z',
      dateDisplay: '10/09/2026',
      timeDisplay: '11:00',
      daysAgoLabel: '67 ngày trước',
      orderState: 'Completed',
      statusLabel: 'Hoàn thành',
      statusTone: 'completed',
      serviceName: 'Fix dặm mi',
      services: [{ name: 'Fix dặm mi', price: 712800, isFix: true }],
      isFixOrder: true,
      bookingNote: 'Fix góc ngoài',
      branchId: 16,
      branchName: 'Estella Place',
      staffNames: ['Thảo Vy'],
      staffAvatars: [],
      diamondEarned: 10,
      diamondUsed: 0,
      totalPrice: 712800,
      paidAmount: 712800,
      discountAmount: 0,
      prepaidAmount: 0,
      debtAmount: 0,
      tipAmount: 0,
      paymentMethodLabel: 'Chuyển khoản',
    },
  ],
  payments: [
    {
      orderId: 8002,
      orderNumber: '#8002',
      bookingDateStart: '2026-10-07T07:00:00.000Z',
      dateDisplay: '07/10/2026',
      timeDisplay: '14:00',
      daysAgoLabel: '40 ngày trước',
      orderState: 'Completed',
      statusLabel: 'Hoàn thành',
      statusTone: 'completed',
      serviceName: 'Hyperlight 770 (Combo)',
      services: [],
      isFixOrder: false,
      bookingNote: null,
      branchId: 6,
      branchName: 'De Tham',
      staffNames: ['Minh Anh'],
      staffAvatars: [],
      diamondEarned: 10,
      diamondUsed: 100,
      totalPrice: 770000,
      paidAmount: 712800,
      discountAmount: 0,
      prepaidAmount: 0,
      debtAmount: 0,
      tipAmount: 50000,
      paymentMethodLabel: 'Thẻ POS',
    },
  ],
  fixVisits: [
    {
      orderId: 8001,
      orderNumber: '#8001',
      bookingDateStart: '2026-09-10T04:00:00.000Z',
      dateDisplay: '10/09/2026',
      timeDisplay: '11:00',
      daysAgoLabel: '67 ngày trước',
      orderState: 'Completed',
      statusLabel: 'Hoàn thành',
      statusTone: 'completed',
      serviceName: 'Fix dặm mi',
      services: [],
      isFixOrder: true,
      bookingNote: 'Fix góc ngoài',
      branchId: 16,
      branchName: 'Estella Place',
      staffNames: ['Thảo Vy'],
      staffAvatars: [],
      diamondEarned: 10,
      diamondUsed: 0,
      totalPrice: 712800,
      paidAmount: 712800,
      discountAmount: 0,
      prepaidAmount: 0,
      debtAmount: 0,
      tipAmount: 0,
      paymentMethodLabel: 'Chuyển khoản',
    },
  ],
  diamondTransactions: [
    {
      id: 7002,
      orderId: 8002,
      amount: -100,
      balanceAfter: 150,
      dateCreated: '2026-10-07T08:00:00.000Z',
      dateDisplay: '07/10/2026',
      timeDisplay: '15:00',
      daysAgoLabel: '40 ngày trước',
      note: 'Đổi 100 KC trừ hóa đơn',
      branchName: 'De Tham',
      type: 'SPEND',
    },
  ],
};

const SAMPLE_BOOKING: BookingItem = {
  id: 9001,
  orderNumber: 'ORD-9001',
  customerName: 'Thanh',
  customerPhone: '******6746',
  customerId: 33732,
  customerVisits: 32,
  customerNote: '',
  serviceDuration: 60,
  serviceName: 'Hyperlight 770',
  serviceType: 'Normal',
  servicePrice: 770000,
  timeSlot: '13:00 - 14:00',
  time12h: '01:00 pm',
  status: 'CHECKED_IN',
  lashHistory: [],
  attributes: {
    material: 'HyperLight',
    style: 'Natural',
    volume: '2X',
    count: '70 fan',
    curl: 'C',
    length: '9-11mm',
    thickness: '0.07',
  },
};

describe('CustomerHistoryAndSpendingSheet (MOS-FEAT-235)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.ios.getCustomerHistory).mockResolvedValue(MOCK_HISTORY_RESPONSE);
  });

  it('loads and displays summary KPIs and switches across ALL, PAYMENTS, FIX, and REWARDS tabs', async () => {
    const handleClose = vi.fn();
    render(
      <CustomerHistoryAndSpendingSheet isOpen={true} onClose={handleClose} booking={SAMPLE_BOOKING} />
    );

    await waitFor(() => {
      expect(screen.getByText(/1\.425\.600 đ/)).toBeDefined();
    });

    expect(screen.getByText('2 hoàn thành')).toBeDefined();
    expect(screen.getByText('Combo 10 tặng 6 - Hyperlight 770')).toBeDefined();

    // Switch to THANH TOÁN
    fireEvent.click(screen.getByRole('tab', { name: /THANH TOÁN/i }));
    expect(screen.getByTestId('history-row-PAYMENTS-8002')).toBeDefined();
    expect(screen.getByText('Thẻ POS')).toBeDefined();

    // Switch to FIX
    fireEvent.click(screen.getByRole('tab', { name: /^FIX/i }));
    expect(screen.getByTestId('history-row-FIX-8001')).toBeDefined();

    // Switch to THƯỞNG
    fireEvent.click(screen.getByRole('tab', { name: /THƯỞNG/i }));
    expect(screen.getByText('Đổi 100 KC trừ hóa đơn')).toBeDefined();

    // Right-aligned [✕] close button works
    fireEvent.click(screen.getByRole('button', { name: 'Đóng lịch sử khách hàng' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('opens customer history & spending sheet directly on ALL tab from Screen03ConsultationMatrix header button and visit badge', async () => {
    render(
      <Screen03ConsultationMatrix
        booking={SAMPLE_BOOKING}
        onBack={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const openBtn = screen.getByTestId('open-customer-history-btn');
    fireEvent.click(openBtn);

    await waitFor(() => {
      expect(apiClient.ios.getCustomerHistory).toHaveBeenCalledWith(
        33732,
        expect.objectContaining({ bookingId: 9001 }),
        expect.any(Object)
      );
      expect(screen.getByText(/1\.425\.600 đ/)).toBeDefined();
    });

    const allTab = screen.getByRole('tab', { name: /TẤT CẢ/i });
    expect(allTab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('history-row-ALL-8002')).toBeDefined();

    // Switch to THANH TOÁN tab and verify spending row
    fireEvent.click(screen.getByRole('tab', { name: /THANH TOÁN/i }));
    expect(screen.getByTestId('history-row-PAYMENTS-8002')).toBeDefined();

    // Close and re-open via LẦN 32 badge in header
    fireEvent.click(screen.getByRole('button', { name: 'Đóng lịch sử khách hàng' }));
    fireEvent.click(screen.getByRole('button', { name: /LẦN 32/i }));
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /TẤT CẢ/i }).getAttribute('aria-selected')).toBe('true');
    });
  });

  it('opens customer history & spending sheet on ALL tab from Screen02CheckInProfile and forwards isSimulationMode', async () => {
    render(
      <Screen02CheckInProfile
        booking={SAMPLE_BOOKING}
        isSimulationMode={true}
        onBack={vi.fn()}
        onCheckIn={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('checkin-header-history-btn'));

    await waitFor(() => {
      expect(apiClient.ios.getCustomerHistory).toHaveBeenCalledWith(
        33732,
        expect.objectContaining({ bookingId: 9001, sim: true }),
        expect.any(Object)
      );
      expect(screen.getByText(/1\.425\.600 đ/)).toBeDefined();
      expect(screen.getByRole('tab', { name: /TẤT CẢ/i }).getAttribute('aria-selected')).toBe('true');
    });
  });

  it('shows clear message when customerId is missing', () => {
    render(
      <CustomerHistoryAndSpendingSheet
        isOpen={true}
        initialTab="ALL"
        onClose={vi.fn()}
        booking={{ ...SAMPLE_BOOKING, customerId: 0 }}
      />
    );
    expect(screen.getByTestId('history-missing-customer-id')).toBeDefined();
  });
});
