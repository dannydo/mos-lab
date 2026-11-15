import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '~/lib/api-client';
import { Screen12CheckoutBilling } from '../Screen12CheckoutBilling';
import { formatThousandSeparatedInput } from '../checkout/CheckoutPaymentMethodSection';
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

    // Enter 1,000,000đ while focused -> immediately formatted with thousand separator and conflict-free right padding
    const qrInput = screen.getByTestId('payment-split-input-VIETQR') as HTMLInputElement;
    expect(qrInput.className).toContain('pl-2.5');
    expect(qrInput.className).toContain('pr-6');
    expect(qrInput.className).not.toContain('px-2.5');

    fireEvent.focus(qrInput);
    fireEvent.change(qrInput, { target: { value: '1000000' } });
    expect(qrInput.value).toBe('1.000.000');

    // Enter 400,000đ Bank QR and 300,000đ POS
    fireEvent.change(qrInput, { target: { value: '400000' } });
    expect(qrInput.value).toBe('400.000');
    fireEvent.blur(qrInput);

    const posInput = screen.getByTestId('payment-split-input-POS') as HTMLInputElement;
    fireEvent.focus(posInput);
    fireEvent.change(posInput, { target: { value: '300000' } });
    expect(posInput.value).toBe('300.000');
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

  it('formats thousand-separated amounts live, handles Backspace across dots, and formats 4-digit Diamond counts', () => {
    expect(formatThousandSeparatedInput('9388400')).toEqual({
      formatted: '9.388.400',
      numeric: 9388400,
      nextCaretDigits: 7,
    });
    expect(formatThousandSeparatedInput('1000.000', '1.000.000', 1)).toEqual({
      formatted: '0',
      numeric: 0,
      nextCaretDigits: 0,
    });
    expect(formatThousandSeparatedInput('1234.000', '1.234.000', 1)).toEqual({
      formatted: '234.000',
      numeric: 234000,
      nextCaretDigits: 0,
    });

    render(
      <Screen12CheckoutBilling
        booking={makeBooking({
          servicePrice: 3000000,
          diamondBalance: 2500,
          billing: {
            subtotal: 3000000,
            serviceTotal: 3000000,
            productTotal: 0,
            paymentMethod: 'VIETQR',
            tipAmount: 0,
            tipCvShare: 0,
            tipCcShare: 0,
            diamondUsed: 0,
            diamondDiscountAmount: 0,
            grandTotal: 3240000,
          },
        })}
        onBack={() => {}}
        onChoosePayment={vi.fn()}
      />
    );

    expect(screen.getByText(/Số dư: 2\.500 💎/)).toBeTruthy();
    const diamondInput = screen.getByTestId('diamond-custom-input') as HTMLInputElement;
    fireEvent.focus(diamondInput);
    fireEvent.change(diamondInput, { target: { value: '1250' } });
    expect(diamondInput.value).toBe('1.250');
    fireEvent.blur(diamondInput);
    expect((screen.getByTestId('diamond-custom-input') as HTMLInputElement).value).toBe('1.250');
  });

  it('displays Diamond balance calculation row in receipt summary and updates after deduction', () => {
    render(
      <Screen12CheckoutBilling
        booking={makeBooking({
          diamondBalance: 200,
          billing: {
            subtotal: 880000,
            serviceTotal: 880000,
            productTotal: 0,
            paymentMethod: 'VIETQR',
            tipAmount: 0,
            tipCvShare: 0,
            tipCcShare: 0,
            diamondUsed: 0,
            diamondDiscountAmount: 0,
            grandTotal: 950400,
          },
        })}
        onBack={() => {}}
        onChoosePayment={vi.fn()}
      />
    );

    // Initial state: diamondUsed = 0, should show customer has 200 Diamonds (200.000đ)
    expect(screen.getByText(/Ví Kim Cương khách có:/i)).toBeTruthy();
    expect(screen.getByText(/=\s*200\.000đ/i)).toBeTruthy();
    expect(screen.getByText(/Có thể dùng tối đa 200 💎/i)).toBeTruthy();

    // Now deduct 50 Diamonds using preset button
    fireEvent.click(screen.getByRole('button', { name: /50 💎/i }));
    expect(screen.getByText(/Cấn trừ Kim Cương:/i)).toBeTruthy();
    expect(screen.getAllByText(/-50\.000đ/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/còn 150 💎/i)).toBeTruthy();
  });

  it('strictly locks all editing controls and displays completed status when booking is already settled', () => {
    const onChoosePayment = vi.fn();
    render(
      <Screen12CheckoutBilling
        booking={makeBooking({
          status: 'DONE',
          orderState: 'Completed',
          diamondBalance: 200,
          billing: {
            subtotal: 880000,
            serviceTotal: 880000,
            productTotal: 0,
            paymentMethod: 'VIETQR',
            settlementStatus: 'SETTLED_COMPLETED',
            tipAmount: 50000,
            tipCvShare: 35000,
            tipCcShare: 10000,
            diamondUsed: 50,
            diamondDiscountAmount: 50000,
            grandTotal: 950400,
            completedAt: '2026-11-15T12:00:00.000Z',
          },
        })}
        onBack={() => {}}
        onChoosePayment={onChoosePayment}
      />
    );

    // 1. Navigation bar displays ✓ Đã chốt instead of Chốt đơn button
    expect(screen.getByText('✓ Đã chốt')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Chốt đơn' })).toBeNull();

    // 2. Settlement Lock Banner is prominently displayed
    expect(screen.getAllByText(/ĐƠN HÀNG ĐÃ CHỐT THANH TOÁN \(COMPLETED\)/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/không thể chỉnh sửa/i).length).toBeGreaterThan(0);

    // 3. Edit Service pencil is hidden
    expect(screen.queryByRole('button', { name: 'Đổi dịch vụ' })).toBeNull();

    // 4. Diamond input and stepper buttons are disabled
    const diamondInput = screen.getByTestId('diamond-custom-input') as HTMLInputElement;
    expect(diamondInput.disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Giảm 1 Kim Cương' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tăng 1 Kim Cương' })).toBeDisabled();

    // 5. Bottom action displays completed card instead of proceed button
    expect(screen.getAllByText(/ĐÃ CHỐT THANH TOÁN \(COMPLETED\)/i).length).toBeGreaterThan(0);
  });
});
