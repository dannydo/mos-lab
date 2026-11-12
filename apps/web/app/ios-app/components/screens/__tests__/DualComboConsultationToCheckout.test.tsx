import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Screen03ConsultationMatrix } from '../Screen03ConsultationMatrix';
import { Screen11ProductUpsell } from '../Screen11ProductUpsell';
import { Screen12CheckoutBilling } from '../Screen12CheckoutBilling';
import { Screen14ThermalReceiptDone } from '../Screen14ThermalReceiptDone';
import { BookingItem } from '../../../state/mockData';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

describe('Dual Combo Persistence & Hydration (Consultation -> Upsell -> Checkout)', () => {
  const doanDualComboBooking: BookingItem = {
    id: 140282,
    orderNumber: 'ORD-140282',
    customerName: 'Đoan',
    customerPhone: '140282',
    customerId: 140282,
    customerVisits: 1,
    customerNote: 'Khách mới làm mi trên + mi dưới',
    serviceDuration: 90,
    serviceName: '❖ HyperLight 770K (70 fan) + Mi Dưới',
    serviceType: 'Normal',
    servicePrice: 1160000,
    timeSlot: '10:00 - 11:30',
    time12h: '10:00 am',
    status: 'SERVICING',
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    assignedStaffTier: 'CVL',
    lashHistory: [],
    attributes: {
      material: 'HyperLight',
      style: 'Natural',
      volume: '4X',
      count: '70 fan',
      curl: 'C',
      length: '10-12 mm',
      thickness: '0.05 mm',
      hasUnderMink: true,
      underMinkServiceType: 'Normal',
      isNewClientDiagnosticDone: true,
      naturalLashLength: '9 - 10mm',
      naturalLashThickness: '0.11 - 0.13mm',
      naturalLashCount: '90 - 110 sợi',
      lashTrail: 'Thẳng (Straight)',
      eyeShape: 'Hai mí chuẩn (Almond)',
      lashHealth: 'Khách mới lần đầu nối mi (Virgin Lashes)',
      medicalProblem: 'Bình thường (Good)',
    },
    selectedCombo: {
      id: 'HyperLight_4X:7_tặng_3:770',
      name: 'Combo 7 tặng 3 · HyperLight 4X 770 (10 lần)',
      price: 4190000,
      sessions: 10,
      bonus: 250000,
      todaySingleServiceWaived: true,
      remainingAfterToday: {
        paidNew: 2,
        paidRefill: 4,
        bonusNew: 1,
        bonusRefill: 2,
        totalPaidRemaining: 6,
        totalBonusRemaining: 3,
        totalRemaining: 9,
      },
    },
    selectedUnderCombo: {
      id: 'FlawlessMink:4_tặng_1:under_390',
      name: 'Combo 4 tặng 1 · Flawless Mink · Mi Dưới 390 (5 lần)',
      price: 1560000,
      sessions: 5,
      bonus: 0,
      todaySingleServiceWaived: true,
      remainingAfterToday: {
        paidNew: 3,
        paidRefill: 0,
        bonusNew: 1,
        bonusRefill: 0,
        totalPaidRemaining: 3,
        totalBonusRemaining: 1,
        totalRemaining: 4,
      },
    },
  };

  it('Screen03ConsultationMatrix hydrates both saved combos on re-open and preserves them on save', () => {
    const onSave = vi.fn();
    render(<Screen03ConsultationMatrix booking={doanDualComboBooking} onBack={vi.fn()} onSave={onSave} />);

    expect(screen.getByText(/COMBO ĐÃ CHỌN/i)).toBeInTheDocument();
    expect(screen.getByText('+5.750.000đ')).toBeInTheDocument();
    expect(screen.getByText(/Combo 7 tặng 3/i)).toBeInTheDocument();
    expect(screen.getByText('4.190.000đ')).toBeInTheDocument();
    expect(screen.getByText(/Combo 4 tặng 1 · Mi Dưới/i)).toBeInTheDocument();
    expect(screen.getByText('1.560.000đ')).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Nhận Ca & Mua Combo \(\+5\.750\.000 đ\)/i });
    fireEvent.click(saveBtn);

    expect(onSave).toHaveBeenCalledTimes(1);
    const [, savedCombo, , , savedUnderCombo] = onSave.mock.calls[0];
    expect(savedCombo?.id).toBe('HyperLight_4X:7_tặng_3:770');
    expect(savedCombo?.price).toBe(4190000);
    expect(savedUnderCombo?.id).toBe('FlawlessMink:4_tặng_1:under_390');
    expect(savedUnderCombo?.price).toBe(1560000);
  });

  it('Screen11ProductUpsell -> Screen12CheckoutBilling -> Screen14ThermalReceiptDone hydrates both combos and waives full 1.160.000đ service charge', () => {
    const onGoToBilling = vi.fn();
    const { unmount } = render(
      <Screen11ProductUpsell
        booking={doanDualComboBooking}
        actor={{ staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' }}
        onBack={vi.fn()}
        onGoToBilling={onGoToBilling}
      />
    );

    // Upper combo hydrated to 4.190.000đ (7 + 3) and Under combo hydrated to 1.560.000đ (4 + 1)
    expect(screen.getByText('Đã chọn gói mi dưới')).toBeInTheDocument();
    expect(screen.getAllByText('4.190.000đ').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('1.560.000đ').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('(Trừ vào gói)')).toBeInTheDocument();
    expect(screen.getByText('5.750.000đ')).toBeInTheDocument();

    // Confirm checkout from Screen11ProductUpsell
    fireEvent.click(screen.getByRole('button', { name: /CHỐT ĐƠN & THANH TOÁN/i }));
    expect(onGoToBilling).toHaveBeenCalledTimes(1);

    const payload = onGoToBilling.mock.calls[0][0];
    expect(payload.selectedCombo?.id).toBe('HyperLight_4X:7_tặng_3:770');
    expect(payload.selectedCombo?.price).toBe(4190000);
    expect(payload.selectedCombo?.todaySingleServiceWaived).toBe(true);
    expect(payload.selectedUnderCombo?.id).toBe('FlawlessMink:4_tặng_1:under_390');
    expect(payload.selectedUnderCombo?.price).toBe(1560000);
    expect(payload.selectedUnderCombo?.todaySingleServiceWaived).toBe(true);
    unmount();

    // Render Screen12CheckoutBilling with emitted payload
    const checkoutBooking: BookingItem = {
      ...doanDualComboBooking,
      selectedCombo: payload.selectedCombo,
      selectedUnderCombo: payload.selectedUnderCombo,
      cartProducts: payload.cartProducts,
    };

    const { unmount: unmountCheckout } = render(
      <Screen12CheckoutBilling booking={checkoutBooking} onBack={vi.fn()} onChoosePayment={vi.fn()} />
    );

    expect(screen.getByText(/Combo 7 tặng 3 · HyperLight 4X 770/i)).toBeInTheDocument();
    expect(screen.getByText(/Combo 4 tặng 1 · Mi Dưới/i)).toBeInTheDocument();
    expect(screen.getByText('Trừ Buổi 1 (Miễn phí ca này)')).toBeInTheDocument();
    // Subtotal 5.750.000đ + 8% VAT (460.000đ) = 6.210.000đ
    expect(screen.getAllByText('5.750.000đ').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('6.210.000đ').length).toBeGreaterThanOrEqual(1);
    unmountCheckout();

    // Render Screen14ThermalReceiptDone
    render(<Screen14ThermalReceiptDone booking={checkoutBooking} onFinishOrder={vi.fn()} />);
    expect(screen.getByText(/Combo 7 tặng 3 · HyperLight 4X 770/i)).toBeInTheDocument();
    expect(screen.getByText(/Combo 4 tặng 1 · Mi Dưới/i)).toBeInTheDocument();
    expect(screen.getByText(/Còn 4 buổi sau ca hôm nay/i)).toBeInTheDocument();
  });

  it('Screen11ProductUpsell partially waives 390.000đ when customer drops upper combo and keeps only Mi Dưới combo', () => {
    render(
      <Screen11ProductUpsell
        booking={doanDualComboBooking}
        actor={{ staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' }}
        onBack={vi.fn()}
        onGoToBilling={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Chỉ làm lẻ ca này/i }));

    // Upper lash stays single (770.000đ) + Under lash combo (1.560.000đ) = 2.330.000đ
    expect(screen.getByText('(Đã trừ gói 1 phần)')).toBeInTheDocument();
    expect(screen.getByText('2.330.000đ')).toBeInTheDocument();
  });
});
