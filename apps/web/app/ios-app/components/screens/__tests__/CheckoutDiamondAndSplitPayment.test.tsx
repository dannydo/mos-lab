import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '~/lib/api-client';
import { Screen12CheckoutBilling } from '../Screen12CheckoutBilling';
import type { BookingItem } from '../../../state/mockData';

function makeBooking(overrides: Partial<BookingItem> = {}): BookingItem {
  return {
    id: 340999,
    orderNumber: 'BK-340999',
    customerId: 9101,
    customerName: 'Chị Thảo',
    customerPhone: '0909111222',
    customerVisits: 4,
    customerNote: '',
    diamondBalance: 185,
    timeSlot: '15:00',
    serviceName: 'HyperLight 4X 880',
    servicePrice: 880000,
    serviceDuration: 90,
    serviceType: 'Normal',
    assignedStaffId: 37790,
    assignedStaffName: 'Diễm Hương',
    checkInStaffId: 37790,
    checkInStaffName: 'Diễm Hương',
    checkOutStaffId: 37790,
    checkOutStaffName: 'Diễm Hương',
    status: 'SERVICING',
    attributes: {
      material: 'HyperLight',
      volume: '4X',
      count: '70 fan',
      style: 'Tự nhiên',
      curl: 'C',
      length: '10-12mm',
      thickness: '0.05',
    },
    cartProducts: [],
    ...overrides,
  };
}

describe('Screen12CheckoutBilling custom Diamond input & 3-way split payment', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient.ios, 'getPromotions').mockResolvedValue({
      success: true,
      canViewGlobalPromotions: true,
      count: 0,
      promotions: [],
    });
  });

  it('allows typing an arbitrary Diamond amount, +/- stepping, and clamping to customer balance', () => {
    render(<Screen12CheckoutBilling booking={makeBooking()} onBack={() => {}} onChoosePayment={vi.fn()} />);

    const input = screen.getByTestId('diamond-custom-input') as HTMLInputElement;
    expect(input.value).toBe('0');

    // Type arbitrary custom amount (37)
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '37' } });
    fireEvent.blur(input);
    expect((screen.getByTestId('diamond-custom-input') as HTMLInputElement).value).toBe('37');
    expect(screen.getByText(/Đã trừ 37 💎 \(-37\.000đ\)/i)).toBeTruthy();

    // Stepper +1 -> 38
    fireEvent.click(screen.getByRole('button', { name: 'Tăng 1 Kim Cương' }));
    expect((screen.getByTestId('diamond-custom-input') as HTMLInputElement).value).toBe('38');

    // Clamp values above max balance (185)
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.blur(input);
    expect((screen.getByTestId('diamond-custom-input') as HTMLInputElement).value).toBe('185');
  });

  it('supports splitting bill simultaneously across Bank QR, POS, and Cash and opens VietQR for only the QR portion', () => {
    const onChoosePayment = vi.fn();
    // 880,000 + 8% VAT (70,400) = 950,400đ; minus 50 diamonds (-50,000đ) = 900,400đ
    const booking = makeBooking({
      billing: {
        subtotal: 880000,
        serviceTotal: 880000,
        productTotal: 0,
        paymentMethod: 'VIETQR',
        tipAmount: 0,
        tipCvShare: 0,
        tipCcShare: 0,
        diamondUsed: 50,
        diamondDiscountAmount: 50000,
        transferProofPhoto: 'data:image/jpeg;base64,fake-pos-proof',
        grandTotal: 900400,
      },
    });

    render(<Screen12CheckoutBilling booking={booking} onBack={() => {}} onChoosePayment={onChoosePayment} />);

    // Enter Split Payment mode
    fireEvent.click(screen.getByTestId('toggle-split-payment-btn'));

    // Enter 400,000đ Bank QR and 300,000đ POS
    const qrInput = screen.getByTestId('payment-split-input-VIETQR');
    fireEvent.focus(qrInput);
    fireEvent.change(qrInput, { target: { value: '400000' } });
    fireEvent.blur(qrInput);

    const posInput = screen.getByTestId('payment-split-input-POS');
    fireEvent.focus(posInput);
    fireEvent.change(posInput, { target: { value: '300000' } });
    fireEvent.blur(posInput);

    // Remaining 200,400đ should be flagged until Cash fills the remainder
    expect(screen.getByTestId('payment-split-status-bar').textContent).toContain('Thiếu 200.400đ');

    fireEvent.click(screen.getByTestId('payment-fill-remaining-CASH'));
    expect(screen.getByTestId('payment-split-status-bar').textContent).toContain('✓ Đủ 100%');

    // Click primary action -> opens VietQR modal ONLY for the 400,000đ portion (with 900,400đ bill note)
    fireEvent.click(screen.getByRole('button', { name: /Mở Mã QR \(400\.000đ\)/i }));
    expect(screen.getByText(/400\.000 VNĐ/)).toBeTruthy();
    expect(screen.getByText(/900\.400 VNĐ/)).toBeTruthy();

    // Confirm QR -> Skip Zalo -> verifies MIXED method + exact 3-way breakdown dispatched
    fireEvent.click(screen.getByRole('button', { name: /✓ ĐÃ NHẬN TIỀN THÀNH CÔNG/i }));
    fireEvent.click(screen.getByRole('button', { name: /Khách không dùng Zalo \/ Bỏ qua/i }));

    expect(onChoosePayment).toHaveBeenCalledTimes(1);
    const [method, , diamondUsed, , , extra] = onChoosePayment.mock.calls[0];
    expect(method).toBe('MIXED');
    expect(diamondUsed).toBe(50);
    expect(extra.paymentBreakdown).toEqual({
      vietqrAmount: 400000,
      posAmount: 300000,
      cashAmount: 200400,
    });
  });
});
