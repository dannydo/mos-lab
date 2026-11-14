import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  buildPercentageTipSuggestions,
  resolveCheckoutTipBaseAmount,
  resolveEffectiveServiceTotal,
} from '@mos-lab/shared';
import { Screen12CheckoutBilling } from '../Screen12CheckoutBilling';
import { BookingItem } from '../../../state/mockData';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

function makeCheckoutBooking(overrides: Partial<BookingItem> = {}): BookingItem {
  return {
    id: 370001,
    orderNumber: 'ORD-370001',
    customerName: 'Chị Thảo Vy',
    customerPhone: '0909.888.777',
    customerId: 77001,
    customerVisits: 4,
    customerNote: '',
    serviceDuration: 75,
    serviceName: 'HyperLight 770',
    serviceType: 'Normal',
    servicePrice: 770000,
    timeSlot: '10:00 - 11:15',
    time12h: '10:00 am',
    status: 'SERVICING',
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    assignedStaffTier: 'CVL',
    lashHistory: [],
    diamondBalance: 200,
    attributes: {
      material: 'HyperLight',
      style: 'Natural',
      volume: '4X',
      count: '70 fan',
      curl: 'C',
      length: '10-12 mm',
      thickness: '0.07 mm',
    },
    ...overrides,
  };
}

describe('CheckoutTipAndDiamondSection & Screen12CheckoutBilling — % Bill Tip Suggestions', () => {
  it('computes 5% / 10% / 15% / 20% tip amounts rounded to nearest 10.000đ for a single 770K service', () => {
    const baseInfo = resolveCheckoutTipBaseAmount({
      servicePrice: 770000,
      effectiveServiceCharge: 770000,
      serviceName: 'HyperLight 770',
      cartProducts: [],
    });
    expect(baseInfo.tipBaseAmount).toBe(770000);
    expect(baseInfo.isVirtualServiceBase).toBe(false);

    const suggestions = buildPercentageTipSuggestions(baseInfo.tipBaseAmount);
    expect(suggestions.map((s) => ({ percent: s.percent, tipAmount: s.tipAmount }))).toEqual([
      { percent: 5, tipAmount: 40000 },
      { percent: 10, tipAmount: 80000 },
      { percent: 15, tipAmount: 120000 },
      { percent: 20, tipAmount: 150000 },
    ]);
  });

  it('uses retail value of the service + products on 0đ Combo Live redemptions and new Dual Combo purchases', () => {
    // 1. Ca trừ gói Combo Live 0đ (vẫn phải hiện gợi ý % dựa trên giá trị bộ mi 770K)
    const comboLiveBase = resolveCheckoutTipBaseAmount({
      servicePrice: 770000,
      effectiveServiceCharge: 0,
      serviceName: 'HyperLight 770',
      cartProducts: [],
    });
    expect(comboLiveBase.tipBaseAmount).toBe(770000);
    expect(comboLiveBase.isVirtualServiceBase).toBe(true);

    // 2. Ca mua gói Dual Combo (4.190K + 1.560K) với giá lẻ dịch vụ thực làm 1.160K -> không nhân lên 5.750K
    const dualComboBase = resolveCheckoutTipBaseAmount({
      servicePrice: 1160000,
      effectiveServiceCharge: 0,
      serviceName: '❖ HyperLight 770K (70 fan) + Mi Dưới',
      hasUnderMink: true,
      underMinkServiceType: 'Normal',
      hasUnderMinkCombo: false,
      cartProducts: [],
    });
    expect(dualComboBase.tipBaseAmount).toBe(1160000);
    expect(buildPercentageTipSuggestions(dualComboBase.tipBaseAmount).map((s) => s.tipAmount)).toEqual([
      60000, 120000, 170000, 230000,
    ]);

    // 3. Ca lẻ 770K + serum 390K = 1.160K (không bị ảnh hưởng bởi VAT 8% hay Diamond)
    const withSerumBase = resolveCheckoutTipBaseAmount({
      servicePrice: 770000,
      effectiveServiceCharge: 770000,
      serviceName: 'HyperLight 770',
      cartProducts: [{ price: 390000, quantity: 1 }],
    });
    expect(withSerumBase.tipBaseAmount).toBe(1160000);
    expect(withSerumBase.productsTotal).toBe(390000);
  });

  it('renders 5% · 10% · 15% · 20% row instead of round-up suggestions for a 770K bill and selects +40K/+80K/+120K/+150K cleanly', () => {
    render(<Screen12CheckoutBilling booking={makeCheckoutBooking()} onBack={vi.fn()} onChoosePayment={vi.fn()} />);

    expect(screen.queryByText(/HOẶC LÀM TRÒN CHẴN TỔNG ĐƠN/i)).not.toBeInTheDocument();
    expect(screen.getByText(/HOẶC THEO % GIÁ TRỊ CA PHỤC VỤ/i)).toBeInTheDocument();
    expect(screen.getByText(/Tính trên 770K/i)).toBeInTheDocument();

    const percentRow = screen.getByTestId('checkout-tip-percent-row');
    expect(within(percentRow).getByText('5%')).toBeInTheDocument();
    expect(within(percentRow).getByText('+40K')).toBeInTheDocument();
    expect(within(percentRow).getByText('10%')).toBeInTheDocument();
    expect(within(percentRow).getByText('+80K')).toBeInTheDocument();
    expect(within(percentRow).getByText('15%')).toBeInTheDocument();
    expect(within(percentRow).getByText('+120K')).toBeInTheDocument();
    expect(within(percentRow).getByText('20%')).toBeInTheDocument();
    expect(within(percentRow).getByText('+150K')).toBeInTheDocument();

    const btn15 = within(percentRow).getByRole('button', { name: /15%/i });
    fireEvent.click(btn15);
    expect(btn15).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Đã ghi nhận tip 15% \(\+120\.000đ\)/i)).toBeInTheDocument();
  });

  it('distinguishes 15% (+50K) from fixed 50K preset on a 340K bill and handles 0đ Combo Live redemptions + Bỏ tip', () => {
    // Case A: Bill 340K -> 15% = 51.000đ -> làm tròn 50.000đ (+50K) trùng mệnh giá nút cố định 50K ở Hàng 1
    const booking340 = makeCheckoutBooking({
      serviceName: 'Dặm HyperLight 340K',
      serviceType: 'Retain',
      servicePrice: 340000,
    });
    const { unmount } = render(
      <Screen12CheckoutBilling booking={booking340} onBack={vi.fn()} onChoosePayment={vi.fn()} />
    );

    const percentRow = screen.getByTestId('checkout-tip-percent-row');
    const btn15 = within(percentRow).getByRole('button', { name: /15%/i });
    const fixed50kBtn = screen.getByRole('button', { name: '50K' });

    fireEvent.click(btn15);
    expect(btn15).toHaveAttribute('aria-pressed', 'true');
    expect(fixed50kBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText(/Đã ghi nhận tip 15% \(\+50\.000đ\)/i)).toBeInTheDocument();

    // Chọn nút cố định 50K -> bỏ highlight 15% và highlight nút 50K
    fireEvent.click(fixed50kBtn);
    expect(btn15).toHaveAttribute('aria-pressed', 'false');
    expect(fixed50kBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Đã ghi nhận tip 50\.000đ/i)).toBeInTheDocument();

    // Bấm Bỏ tip -> reset về 0đ
    fireEvent.click(screen.getByRole('button', { name: /Bỏ tip/i }));
    expect(screen.getByText(/Khách không gửi tip trong ca này/i)).toBeInTheDocument();
    unmount();

    // Case B: Ca trừ suất Combo 0đ vẫn hiển thị đủ 4 mốc % theo giá trị lẻ của dịch vụ
    const comboBooking = makeCheckoutBooking({
      servicePrice: 770000,
      comboLiveStatus: {
        isComboLive: true,
        comboName: 'Gói HyperLight 770K',
        remainingSessions: 4,
        upsellOpportunity: false,
      },
    });
    expect(
      resolveEffectiveServiceTotal({
        servicePrice: comboBooking.servicePrice,
        serviceName: comboBooking.serviceName,
        isComboLive: true,
      })
    ).toBe(0);

    render(<Screen12CheckoutBilling booking={comboBooking} onBack={vi.fn()} onChoosePayment={vi.fn()} />);
    const comboPercentRow = screen.getByTestId('checkout-tip-percent-row');
    expect(within(comboPercentRow).getByText('+40K')).toBeInTheDocument();
    expect(within(comboPercentRow).getByText('+80K')).toBeInTheDocument();
    expect(within(comboPercentRow).getByText('+120K')).toBeInTheDocument();
    expect(within(comboPercentRow).getByText('+150K')).toBeInTheDocument();
  });
});
