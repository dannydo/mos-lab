import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Screen03ConsultationMatrix } from '../Screen03ConsultationMatrix';
import { Screen11ProductUpsell } from '../Screen11ProductUpsell';
import { Screen12CheckoutBilling } from '../Screen12CheckoutBilling';
import { Screen14ThermalReceiptDone } from '../Screen14ThermalReceiptDone';
import type { BookingItem } from '../../../state/mockData';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'light' }),
}));

function makeCustomerBooking(overrides: Partial<BookingItem> = {}): BookingItem {
  return {
    id: 337765,
    orderNumber: 'BK-337765',
    customerName: 'Lệ',
    customerPhone: '150368',
    customerId: 9001,
    customerVisits: 29,
    customerNote: 'Làm kỹ',
    serviceDuration: 84,
    serviceName: 'Hyperlight 660',
    serviceType: 'Normal',
    servicePrice: 550000,
    timeSlot: '09:00 - 10:24',
    time12h: '09:00 am',
    status: 'DONE',
    assignedStaffId: 46272,
    assignedStaffName: 'Khanh Cao',
    assignedStaffTier: 'CVL',
    checkInStaffName: 'Thục Nghi',
    checkOutStaffName: 'Thục Nghi',
    checkOutStaffTier: 'CC',
    isTrainingCvlOrder: true,
    trainingMentorName: 'Thục Nghi',
    cvRotationPoints: 35,
    cvRotationBreakdown: 'Hyperlight 660 (35 pts)',
    diamondBalance: 5,
    attributes: {
      material: 'HyperLight',
      style: 'Wing',
      volume: '4X',
      count: '50 fan',
      curl: 'C',
      length: '10-12 mm',
      thickness: '0.07 mm',
      isNewClientDiagnosticDone: true,
      notes: 'Dáng Wing nhẹ nhàng',
    },
    billing: {
      subtotal: 550000,
      vatRate: 0.08,
      vatAmount: 44000,
      serviceTotal: 550000,
      productTotal: 0,
      paymentMethod: 'CASH',
      settlementStatus: 'PENDING_COUNTER_SETTLEMENT',
      tipAmount: 100000,
      tipCvShare: 70000,
      tipCcShare: 20000,
      diamondUsed: 0,
      diamondDiscountAmount: 0,
      grandTotal: 694000,
    },
    ...overrides,
  };
}

function unlockConsultationSpecsTab() {
  fireEvent.change(screen.getByRole('slider', { name: 'Dài tối thiểu' }), { target: { value: '8' } });
  fireEvent.change(screen.getByRole('slider', { name: 'Dày tối thiểu' }), { target: { value: '0.07' } });
  fireEvent.change(screen.getByRole('slider', { name: 'Số sợi tối thiểu' }), { target: { value: '80' } });
  fireEvent.click(screen.getByTitle('Chúc xuống'));
  fireEvent.click(screen.getByRole('button', { name: /Mí lót \/ Sụp mí/i }));
  fireEvent.click(screen.getByRole('button', { name: 'Mới lần đầu' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bình thường' }));
  fireEvent.click(screen.getByRole('button', { name: /XÁC NHẬN ĐÃ KIỂM TRA MI THẬT & THIẾT KẾ MI →/i }));
}

describe('4 Customer-Facing Screens — Staff & Reward Info Gated Behind Unified Header Eye Toggle', () => {
  it('Screen03ConsultationMatrix hides In:, Vòng xoay pts, and CVLL tip dispatch by default, reveals on toggle, and resets on booking change', () => {
    const actor = { staffId: 46273, name: 'Thục Nghi', tier: 'CVLL' as const, badgeLabel: 'CVLL' };
    const booking1 = makeCustomerBooking({ id: 337765, status: 'CHECKED_IN' });
    const { rerender } = render(
      <Screen03ConsultationMatrix booking={booking1} actor={actor} onBack={vi.fn()} onSave={vi.fn()} />
    );

    unlockConsultationSpecsTab();

    const toggle = screen.getByTestId('ios-staff-visibility-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/Thục Nghi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Vòng xoay:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/CHẾ ĐỘ ĐIỀU PHỐI CA SAU TƯ VẤN/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hưởng 90% Tip/i)).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByTestId('ios-staff-visibility-toggle')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Thục Nghi/i)).toBeInTheDocument();
    expect(screen.getByText(/Vòng xoay:/i)).toBeInTheDocument();
    expect(screen.getByText(/CHẾ ĐỘ ĐIỀU PHỐI CA SAU TƯ VẤN/i)).toBeInTheDocument();

    const booking2 = makeCustomerBooking({ id: 337766, status: 'CHECKED_IN', customerName: 'Hiền' });
    rerender(<Screen03ConsultationMatrix booking={booking2} actor={actor} onBack={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByTestId('ios-staff-visibility-toggle')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/Thục Nghi/i)).not.toBeInTheDocument();
  });

  it('Screen11ProductUpsell hides assigned CV name & serum reward modal trigger by default, reveals on toggle, and resets on booking change', () => {
    const actor = { staffId: 46273, name: 'Thục Nghi', tier: 'CC' as const, badgeLabel: 'CC' };
    const booking1 = makeCustomerBooking({ id: 337765 });
    const { rerender } = render(
      <Screen11ProductUpsell booking={booking1} actor={actor} onBack={vi.fn()} onGoToBilling={vi.fn()} />
    );

    const toggle = screen.getByTestId('ios-staff-visibility-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/Khanh Cao/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle('Xem chi tiết thang thưởng')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByText(/Khanh Cao/i)).toBeInTheDocument();
    expect(screen.getByTitle('Xem chi tiết thang thưởng')).toBeInTheDocument();

    const booking2 = makeCustomerBooking({ id: 337766, assignedStaffName: 'Phương Nhi' });
    rerender(<Screen11ProductUpsell booking={booking2} actor={actor} onBack={vi.fn()} onGoToBilling={vi.fn()} />);
    expect(screen.getByTestId('ios-staff-visibility-toggle')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/Phương Nhi/i)).not.toBeInTheDocument();
  });

  it('Screen12CheckoutBilling hides Ca Đào Tạo, Mentor, Chuyên viên, In/Out, item staff name & settlement/tax banner by default, reveals on toggle, and resets on booking change', () => {
    const actor = { staffId: 46273, name: 'Thục Nghi', tier: 'CC' as const, badgeLabel: 'CC' };
    const booking1 = makeCustomerBooking({ id: 337765 });
    const { rerender } = render(
      <Screen12CheckoutBilling booking={booking1} actor={actor} onBack={vi.fn()} onChoosePayment={vi.fn()} />
    );

    const toggle = screen.getByTestId('ios-staff-visibility-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    // Hidden internal info
    expect(screen.queryByText(/Ca Đào Tạo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Mentor:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Khanh Cao/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Thục Nghi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Báo Cáo CV \/ Thuế/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Chia thưởng 70\/10\/10/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Vòng xoay CV/i)).not.toBeInTheDocument();

    // Pure customer info stays visible
    expect(screen.getByText(/Lệ/i)).toBeInTheDocument();
    expect(screen.getByText('Dáng Wing')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByText(/Ca Đào Tạo/i)).toBeInTheDocument();
    expect(screen.getByText(/Mentor: CC Thục Nghi/i)).toBeInTheDocument();
    expect(screen.getByText(/Khanh Cao · Dáng Wing/i)).toBeInTheDocument();
    expect(screen.getByText(/Báo Cáo CV \/ Thuế/i)).toBeInTheDocument();
    expect(screen.getByText(/Chia thưởng 70\/10\/10/i)).toBeInTheDocument();
    expect(screen.getByText(/Vòng xoay CV/i)).toBeInTheDocument();

    const booking2 = makeCustomerBooking({ id: 337766 });
    rerender(<Screen12CheckoutBilling booking={booking2} actor={actor} onBack={vi.fn()} onChoosePayment={vi.fn()} />);
    expect(screen.getByTestId('ios-staff-visibility-toggle')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/Ca Đào Tạo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Báo Cáo CV \/ Thuế/i)).not.toBeInTheDocument();

    // When CVL operates Cash checkout, the internal counter-lock banner stays gated behind the toggle
    const cvlActor = { staffId: 13783, name: 'Khanh Cao', tier: 'CVL' as const, badgeLabel: 'CVL' };
    rerender(
      <Screen12CheckoutBilling booking={booking2} actor={cvlActor} onBack={vi.fn()} onChoosePayment={vi.fn()} />
    );
    expect(screen.queryByText(/Khóa thưởng Checkout/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('ios-staff-visibility-toggle'));
    expect(screen.getByText(/Khóa thưởng Checkout/i)).toBeInTheDocument();
  });

  it('Screen14ThermalReceiptDone hides settlement lock banner, Chuyên Viên làm mi, Check-in/Check-out, and tip/reward box by default, reveals on toggle, and resets on booking change', () => {
    const actor = { staffId: 46273, name: 'Thục Nghi', tier: 'CC' as const, badgeLabel: 'CC' };
    const booking1 = makeCustomerBooking({ id: 337765 });
    const { rerender } = render(
      <Screen14ThermalReceiptDone booking={booking1} actor={actor} onFinishOrder={vi.fn()} onBack={vi.fn()} />
    );

    const toggle = screen.getByTestId('ios-staff-visibility-toggle');
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/Chờ Quầy thu Tiền mặt \/ POS · Đã khóa thưởng Checkout/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Chuyên Viên làm mi:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Check-in:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Check-out:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Khanh Cao/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/TỔNG THƯỞNG/i)).not.toBeInTheDocument();
    expect(screen.getByText(/HĐ: #BK-337765/)).toBeInTheDocument();
    expect(screen.getByText(/Lệ \(150368\)/)).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByText(/Chờ Quầy thu Tiền mặt \/ POS · Đã khóa thưởng Checkout/i)).toBeInTheDocument();
    expect(screen.getByText(/Chuyên Viên làm mi:/i)).toBeInTheDocument();
    expect(screen.getByText(/Check-in:/i)).toBeInTheDocument();
    expect(screen.getByText(/Check-out:/i)).toBeInTheDocument();
    expect(screen.getByText(/TỔNG THƯỞNG/i)).toBeInTheDocument();

    const booking2 = makeCustomerBooking({ id: 337766, orderNumber: 'BK-337766' });
    rerender(<Screen14ThermalReceiptDone booking={booking2} actor={actor} onFinishOrder={vi.fn()} onBack={vi.fn()} />);
    expect(screen.getByTestId('ios-staff-visibility-toggle')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(/Chuyên Viên làm mi:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/TỔNG THƯỞNG/i)).not.toBeInTheDocument();
  });
});
