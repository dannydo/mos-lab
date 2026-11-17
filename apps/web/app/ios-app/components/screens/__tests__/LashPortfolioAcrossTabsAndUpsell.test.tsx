import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import type { IosCustomerHistoryResponse } from '@mos-lab/shared';
import { Screen01IncomingBookings } from '../Screen01IncomingBookings';
import { Screen11ProductUpsell } from '../Screen11ProductUpsell';
import type { BookingItem } from '../../../state/mockData';
import type { ActiveActorProfile } from '../../../state/useIosAppState';
import { apiClient } from '~/lib/api-client';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({
    themeId: 'luxury-gold',
    coreThemeId: 'luxury-gold',
    themeMode: 'dark',
    toggleTheme: vi.fn(),
    setCoreThemeId: vi.fn(),
    availableCoreThemes: [{ id: 'luxury-gold', label: 'Wings Luxury Gold', colors: { primary: '#FFB400' } }],
  }),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    ios: {
      getCustomerHistory: vi.fn(),
      getPromotions: vi.fn().mockResolvedValue({ success: true, promotions: [] }),
      scanProduct: vi.fn(),
    },
  },
}));

const MOCK_HISTORY: IosCustomerHistoryResponse = {
  success: true,
  customerId: 44100,
  customerName: 'Minh Thư',
  customerPhone: '******3456',
  customerCode: 'W44100',
  summary: {
    totalSpent: 1650000,
    completedVisits: 2,
    totalBookings: 3,
    canceledBookings: 0,
    fixCount: 1,
    avgSpendPerVisit: 825000,
    diamondBalance: 200,
    totalDiamondEarned: 40,
    totalDiamondUsed: 0,
    totalDebt: 0,
    lastVisitDate: '15/10/2026',
    firstVisitDate: '01/09/2026',
  },
  visits: [
    {
      orderId: 9100,
      orderNumber: '#9100',
      bookingDateStart: '2026-10-15T03:00:00.000Z',
      dateDisplay: '15/10/2026',
      timeDisplay: '10:00',
      daysAgoLabel: '33 ngày trước',
      orderState: 'Completed',
      branchId: 6,
      branchName: 'Điện Biên Phủ',
      serviceName: 'Hyperlight 770',
      services: [{ name: 'Hyperlight 770', price: 890000 }],
      statusLabel: 'Hoàn thành',
      statusTone: 'completed',
      totalPrice: 890000,
      paidAmount: 890000,
      discountAmount: 0,
      prepaidAmount: 0,
      debtAmount: 0,
      tipAmount: 0,
      paymentMethodLabel: 'Tiền mặt',
      staffNames: ['Thảo Ly'],
      staffAvatars: [],
      diamondEarned: 20,
      diamondUsed: 0,
      isFixOrder: false,
      bookingNote: null,
      photos: [
        { type: 'before', label: '1. Before · Mắt mộc', url: 'https://cdn.wings.test/9100-before.jpg' },
        { type: 'cleaned', label: '2. Cleaning · Vệ sinh', url: 'https://cdn.wings.test/9100-clean.jpg' },
        { type: 'after', label: '3. After · Hoàn thiện', url: 'https://cdn.wings.test/9100-after.jpg' },
      ],
      underPhotos: [],
      lashSpecs: [
        {
          serviceName: 'Hyperlight 770',
          isUnder: false,
          style: 'Katun',
          curl: 'Cong CC',
          thickness: '0.07mm',
          length: '9-11mm',
          retainLeft: 25,
          retainRight: 28,
        },
      ],
    },
  ],
  payments: [
    {
      orderId: 9100,
      orderNumber: '#9100',
      bookingDateStart: '2026-10-15T03:00:00.000Z',
      dateDisplay: '15/10/2026',
      timeDisplay: '10:00',
      daysAgoLabel: '33 ngày trước',
      orderState: 'Completed',
      branchId: 6,
      branchName: 'Điện Biên Phủ',
      serviceName: 'Hyperlight 770',
      services: [{ name: 'Hyperlight 770', price: 890000 }],
      statusLabel: 'Hoàn thành',
      statusTone: 'completed',
      totalPrice: 890000,
      paidAmount: 890000,
      discountAmount: 0,
      prepaidAmount: 0,
      debtAmount: 0,
      tipAmount: 0,
      paymentMethodLabel: 'Tiền mặt',
      staffNames: ['Thảo Ly'],
      staffAvatars: [],
      diamondEarned: 20,
      diamondUsed: 0,
      isFixOrder: false,
      bookingNote: null,
    },
  ],
  fixVisits: [],
  diamondTransactions: [],
};

function makeBooking(
  id: number,
  status: 'INCOMING' | 'SERVICING' | 'DONE',
  overrides?: Partial<BookingItem>
): BookingItem {
  return {
    id,
    orderNumber: `BK-${id}`,
    customerId: 44100,
    customerName: 'Minh Thư',
    customerPhone: '******3456',
    customerVisits: 3,
    customerNote: 'Nội bộ: khách hơi nhạy cảm keo',
    timeSlot: '10:00 - 11:30',
    time12h: '10:00 am',
    serviceName: '❖ Hyperlight 770',
    serviceDuration: 75,
    serviceType: 'Normal',
    servicePrice: 770000,
    branchCode: 'DBP',
    branchName: 'Điện Biên Phủ',
    status,
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    assignedStaffTier: 'CVL',
    checkInStaffId: 46272,
    checkInStaffName: 'Thảo Ly',
    checkOutStaffId: status === 'DONE' ? 46272 : undefined,
    checkOutStaffName: status === 'DONE' ? 'Thảo Ly' : undefined,
    attributes: {
      style: 'Katun',
      curl: 'CC',
      thickness: '0.07',
      length: '9-11',
    },
    progress: {
      elapsedSeconds: 0,
      timerRunning: false,
      beforePhotoUrl: 'https://cdn.wings.test/today-before.jpg',
      cleanedPhotoUrl: 'https://cdn.wings.test/today-clean.jpg',
      afterPhotoUrl: 'https://cdn.wings.test/today-after.jpg',
    },
    ...overrides,
  } as BookingItem;
}

const ccActor: ActiveActorProfile = {
  staffId: 46273,
  name: 'Thục Nghi',
  tier: 'CC',
  badgeLabel: 'CC · Chuyên Viên Tư Vấn',
  storeId: 6,
};

describe('Lash Portfolio Across Chờ đón / Đang làm / Đã xong & Upsell Consultation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.ios.getCustomerHistory).mockResolvedValue(MOCK_HISTORY);
  });

  it.each([
    { segment: 'INCOMING' as const, id: 9101, noteLabel: /Nội bộ: khách hơi nhạy cảm keo/i },
    { segment: 'SERVICING' as const, id: 9102, noteLabel: /Nội bộ: khách hơi nhạy cảm keo/i },
    { segment: 'DONE' as const, id: 9103, noteLabel: /Nội bộ: khách hơi nhạy cảm keo/i },
  ])(
    'Screen01 %s tab opens Hồ Sơ Bộ Mi & Ảnh (3 photos + specs) via card detail trigger without stealing card body tap',
    async ({ segment, id }) => {
      const onSelectBooking = vi.fn();
      const booking = makeBooking(id, segment);

      render(
        <Screen01IncomingBookings
          bookings={[booking]}
          bookingSegment={segment}
          setBookingSegment={vi.fn()}
          counts={{ incoming: 1, servicing: 1, done: 1, cancel: 0 }}
          onSelectBooking={onSelectBooking}
          role="CC"
          actor={ccActor}
        />
      );

      const portfolioTrigger = screen.getByTestId(`card-open-portfolio-${id}`);
      fireEvent.click(portfolioTrigger);

      // Must open CustomerHistoryAndSpendingSheet on LASH_PHOTOS tab without triggering main card action
      expect(onSelectBooking).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(screen.getByText(/Bộ Mi & 3 Ảnh Các Lần Ghé Trước/i)).toBeInTheDocument();
      });
      expect(screen.getAllByText('Katun').length).toBeGreaterThan(0);
      expect(screen.getAllByAltText('1. Before').length).toBeGreaterThan(0);
      expect(screen.getAllByAltText('2. Cleaning').length).toBeGreaterThan(0);
      expect(screen.getAllByAltText('3. After').length).toBeGreaterThan(0);

      // Close Sheet, then click card body => must still route normally via onSelectBooking
      fireEvent.click(screen.getByRole('button', { name: 'Đóng lịch sử khách hàng' }));
      fireEvent.click(screen.getByText('Minh Thư'));
      expect(onSelectBooking).toHaveBeenCalledWith(id);
    }
  );

  it('Screen11ProductUpsell shows today Before/After showcase, enforces customerFacingMode privacy on Sheet, and opens Lightbox compare', async () => {
    const booking = makeBooking(9104, 'SERVICING');

    render(<Screen11ProductUpsell booking={booking} actor={ccActor} onBack={vi.fn()} onGoToBilling={vi.fn()} />);

    // Inline Today Before & After Showcase rendered on top of Screen11
    const showcase = screen.getByTestId('upsell-before-after-showcase');
    expect(showcase).toHaveTextContent('Đối Chiếu Before & After Hôm Nay');
    expect(screen.getByAltText('1. BEFORE · Mắt mộc')).toHaveAttribute(
      'src',
      'https://cdn.wings.test/today-before.jpg'
    );
    expect(screen.getByAltText('3. AFTER · Thành phẩm')).toHaveAttribute(
      'src',
      'https://cdn.wings.test/today-after.jpg'
    );

    // Open Portfolio Sheet in default customer-facing mode (eye toggle off)
    fireEvent.click(screen.getByTestId('upsell-open-lash-portfolio-btn'));

    await waitFor(() => {
      expect(screen.getByText(/Bộ Mi & 3 Ảnh Các Lần Ghé Trước/i)).toBeInTheDocument();
    });

    // Privacy check: spending summary, internal notes, and financial tabs are hidden in customer-facing mode
    expect(screen.queryByText(/Tổng chi tiêu/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nội bộ: khách hơi nhạy cảm keo/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /THANH TOÁN/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /THƯỞNG/i })).not.toBeInTheDocument();

    // Open Before/After comparison Lightbox from Sheet
    const compareButtons = screen.getAllByRole('button', { name: /So sánh Before \/ After/i });
    fireEvent.click(compareButtons[0]);

    const lightbox = screen.getByRole('dialog', { name: /So sánh và phóng to ảnh bộ mi/i });
    expect(lightbox).toBeInTheDocument();
    expect(within(lightbox).getByText('1. BEFORE · MẮT MỘC')).toBeInTheDocument();
    expect(within(lightbox).getByText('3. AFTER · HOÀN THIỆN')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đóng xem ảnh' }));
    expect(screen.queryByRole('dialog', { name: /So sánh và phóng to ảnh bộ mi/i })).not.toBeInTheDocument();

    // Close Sheet, reveal staff mode via eye toggle, reopen Sheet => financial tabs appear
    fireEvent.click(screen.getByRole('button', { name: 'Đóng lịch sử khách hàng' }));
    fireEvent.click(screen.getByTestId('ios-staff-visibility-toggle'));
    fireEvent.click(screen.getByTestId('upsell-open-lash-portfolio-btn'));

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /THANH TOÁN/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('tab', { name: /THƯỞNG/i })).toBeInTheDocument();
    expect(screen.getByText(/Tổng chi tiêu/i)).toBeInTheDocument();
    expect(screen.getByText(/Nội bộ: khách hơi nhạy cảm keo/i)).toBeInTheDocument();
  });
});
