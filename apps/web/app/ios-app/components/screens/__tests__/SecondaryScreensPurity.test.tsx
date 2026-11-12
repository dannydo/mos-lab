import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Screen04StaffQueueAssign } from '../Screen04StaffQueueAssign';
import { ScreenCvPaystub } from '../ScreenCvPaystub';
import { Screen13CheckoutTip } from '../Screen13CheckoutTip';
import { ScreenStoreDashboard } from '../ScreenStoreDashboard';
import { BookingItem } from '../../../state/mockData';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

function makeTestBooking(overrides: Partial<BookingItem> = {}): BookingItem {
  return {
    id: 8801,
    orderNumber: 'BK-8801',
    customerName: 'Chị Minh Thư',
    customerPhone: '0908.888.999',
    customerId: 50001,
    customerVisits: 2,
    customerNote: '',
    timeSlot: '11:00 - 12:30',
    time12h: '11:00 am',
    serviceName: 'New Flawless 770',
    servicePrice: 770000,
    serviceDuration: 75,
    status: 'SERVICING',
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    assignedBed: 'Giường 03',
    ...overrides,
  };
}

describe('Secondary Screens — Live Data Purity, Interactive Correctness & Billing Accuracy', () => {
  it('Screen04StaffQueueAssign assigns the clicked specialist row instead of hardcoding 46272', () => {
    const onAssign = vi.fn();
    render(
      <Screen04StaffQueueAssign
        booking={makeTestBooking({ isUnassignedQueue: true, assignedStaffId: 0 })}
        onBack={vi.fn()}
        onAssign={onAssign}
      />
    );

    const phuongNhiRow = screen.getByTestId('assign-specialist-row-49076');
    fireEvent.click(phuongNhiRow);

    const confirmBtn = screen.getByTestId('confirm-assign-specialist');
    expect(confirmBtn).toHaveTextContent(/PHƯƠNG NHI/i);
    fireEvent.click(confirmBtn);

    expect(onAssign).toHaveBeenCalledWith(49076, 'Phương Nhi', 'Giường 02');
  });

  it('ScreenCvPaystub shows honest zero/live stats in Live Mode without injecting fake demo orders', () => {
    render(
      <ScreenCvPaystub
        actor={{ staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' }}
        staffStats={{ monthlyRevenue: 3200000, completedShiftsCount: 6, completedToday: 1, pointsToday: 20 }}
        bookings={[]}
        isDemoMode={false}
      />
    );

    expect(screen.queryByText(/Chị Quyên/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/8\.200\.000/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Chưa có ca nhận Tip trong ngày hôm nay/i)).toBeInTheDocument();
    expect(screen.getAllByText(/3\.200\.000đ/i).length).toBeGreaterThanOrEqual(1);
  });

  it('Screen13CheckoutTip deducts diamondDiscountAmount and applies calculateCvSerumTierBonus when cvBonus is omitted', () => {
    const booking = makeTestBooking({
      checkInStaffName: 'Thảo Ly',
      checkOutStaffName: 'Thảo Ly',
      cartProducts: [
        {
          productId: 901,
          productName: 'Dưỡng Mi 550K',
          price: 550000,
          quantity: 1,
        },
      ],
      billing: {
        subtotal: 1000000,
        vatRate: 0.08,
        vatAmount: 80000,
        serviceTotal: 450000,
        productTotal: 550000,
        paymentMethod: 'VIETQR',
        tipAmount: 50000,
        tipCvShare: 35000,
        tipCcShare: 10000,
        diamondUsed: 200,
        diamondDiscountAmount: 200000,
        grandTotal: 930000,
      },
    });

    render(
      <Screen13CheckoutTip
        booking={booking}
        actor={{ staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' }}
        onBack={vi.fn()}
        onRecordTip={vi.fn()}
      />
    );

    // 1,000,000 + 80,000 VAT + 50,000 tip - 200,000 diamond = 930,000 đ
    expect(screen.getByTestId('checkout-tip-grand-total')).toHaveTextContent('930.000 đ');
    // 550k serum tier bonus = 10,000đ -> +10 feathers (not +100 fallback!)
    expect(screen.getByText('+10')).toBeInTheDocument();
  });

  it('ScreenStoreDashboard computes live floor metrics from bookings and navigates to the real bookingId', () => {
    const onSelectBooking = vi.fn();
    const liveBookings: BookingItem[] = [
      makeTestBooking({ id: 9101, customerName: 'Chị Hương Giang', status: 'SERVICING' }),
      makeTestBooking({
        id: 9102,
        customerName: 'Chị Bảo Ngọc',
        status: 'DONE',
        billing: {
          subtotal: 770000,
          serviceTotal: 770000,
          productTotal: 0,
          paymentMethod: 'VIETQR',
          tipAmount: 50000,
          tipCvShare: 35000,
          tipCcShare: 10000,
          grandTotal: 881600,
          completedAt: '2026-11-12T08:30:00.000Z',
        },
      }),
    ];

    render(
      <ScreenStoreDashboard
        bookings={liveBookings}
        currentBranch={{
          id: 16,
          code: 'EP',
          name: 'Chi nhánh Estella Place',
          shortName: 'Estella Place',
          address: 'Tầng 3 Estella Place, 88 Song Hành, An Phú, TP. Thủ Đức',
          receiptName: 'CN ESTELLA PLACE',
        }}
        isDemoMode={false}
        onSelectBooking={onSelectBooking}
      />
    );

    expect(screen.getByText(/CN Estella Place/i)).toBeInTheDocument();
    expect(screen.queryByText(/123 Lê Thánh Tôn/i)).not.toBeInTheDocument();
    expect(screen.getByText('881.600đ')).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Chị Hương Giang/i));
    expect(onSelectBooking).toHaveBeenCalledWith(9101);
  });
});
