import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Screen02CheckInProfile } from '../Screen02CheckInProfile';
import { Screen11ProductUpsell } from '../Screen11ProductUpsell';
import { Screen12CheckoutBilling } from '../Screen12CheckoutBilling';
import { Screen14ThermalReceiptDone } from '../Screen14ThermalReceiptDone';
import { ComboWalletDetailModal } from '../../ui-kit/ComboWalletDetailModal';
import { BookingItem } from '../../../state/mockData';
import { apiClient } from '../../../../../lib/api-client';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

describe('Combo Expiry (COMBO-004): Lock, Revival, Early-Renewal Bonus & Admin Wallet Controls', () => {
  const baseAttributes: NonNullable<BookingItem['attributes']> = {
    material: 'HyperLight',
    style: 'Natural',
    volume: '4X',
    count: '70 fan',
    curl: 'C',
    length: '10-12 mm',
    thickness: '0.05 mm',
    isNewClientDiagnosticDone: true,
    naturalLashLength: '9 - 10mm',
    naturalLashThickness: '0.11 - 0.13mm',
    naturalLashCount: '90 - 110 sợi',
    lashTrail: 'Thẳng (Straight)',
    eyeShape: 'Hai mí chuẩn (Almond)',
    lashHealth: 'Khỏe mạnh (Healthy)',
    medicalProblem: 'Bình thường (Good)',
  };

  const expiredComboBooking: BookingItem = {
    id: 339086,
    orderNumber: 'ORD-339086',
    customerName: 'Chị Tuyết',
    customerPhone: '0909339086',
    customerId: 99086,
    customerVisits: 8,
    customerNote: 'Khách có gói cũ đã hết hạn còn 3 buổi tồn',
    serviceDuration: 75,
    serviceName: '❖ HyperLight 770K (70 fan)',
    serviceType: 'Normal',
    servicePrice: 770000,
    timeSlot: '11:00 - 12:15',
    time12h: '11:00 am',
    status: 'INCOMING',
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    assignedStaffTier: 'CVL',
    lashHistory: [
      {
        id: 1,
        date: '15/08/2026',
        serviceName: '❖ HyperLight 770K (70 fan)',
        staffName: 'Thảo Ly',
      },
    ],
    attributes: baseAttributes,
    comboLiveStatus: {
      isComboLive: false,
      isExpired: true,
      expiryState: 'EXPIRED',
      balanceId: 501,
      comboName: 'Combo 4 tặng 1 · HyperLight 4X 770',
      remainingSessions: 3,
      normalRemaining: 1,
      retainRemaining: 2,
      upsellOpportunity: true,
      dateExpired: '2026-10-01',
      daysRemaining: -43,
      avgDaysPerSession: -14.3,
    },
  };

  const activeComboBooking: BookingItem = {
    ...expiredComboBooking,
    id: 336695,
    orderNumber: 'ORD-336695',
    customerName: 'Chị Trúc',
    customerId: 96695,
    status: 'SERVICING',
    comboLiveStatus: {
      isComboLive: true,
      isExpired: false,
      expiryState: 'ACTIVE',
      balanceId: 602,
      comboName: 'Combo 4 tặng 1 · HyperLight 4X 770',
      remainingSessions: 2,
      normalRemaining: 1,
      retainRemaining: 1,
      upsellOpportunity: true,
      dateExpired: '2027-02-28',
      daysRemaining: 107,
      avgDaysPerSession: 53.5,
    },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('Screen02CheckInProfile locks 0đ quick check-in on expired combo and enforces Zero-Trust Admin guard in ComboWalletDetailModal', async () => {
    const updateExpirySpy = vi.spyOn(apiClient.ios, 'updateComboBalanceExpiry').mockResolvedValue({
      success: true,
      balanceId: 501,
      dateExpired: '2026-11-30',
      isFrozen: false,
      message: 'Đã gia hạn thêm +30 ngày thành công',
    });

    const { rerender } = render(
      <Screen02CheckInProfile
        booking={expiredComboBooking}
        actor={{ staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' }}
        isAdmin={false}
        onBack={vi.fn()}
        onCheckIn={vi.fn()}
        onQuickCheckIn={vi.fn()}
      />
    );

    // Quick Check-in 0đ button ("Nhận ca & Giữ form cũ") MUST NOT render for expired combos
    expect(screen.queryByRole('button', { name: /Nhận ca & Giữ form cũ/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Đã khóa trừ 0đ/i)).toBeInTheDocument();
    expect(screen.getByText(/HẾT HẠN 01\/10\/2026/i)).toBeInTheDocument();
    expect(screen.getByText(/cứu toàn bộ 3 buổi tồn/i)).toBeInTheDocument();

    // Non-admin opens ComboWalletDetailModal -> Admin Extend/Freeze controls are hidden
    fireEvent.click(screen.getByRole('button', { name: /Chi tiết Combo/i }));
    expect(screen.getByText('Gói Combo & Hạn Sử Dụng')).toBeInTheDocument();
    expect(screen.getByText('Combo Mi Trên')).toBeInTheDocument();
    expect(screen.getByText(/HSD: 01\/10\/2026 · ĐÃ HẾT HẠN/i)).toBeInTheDocument();
    expect(screen.queryByText(/Quyền Admin · Gia hạn & Bảo lưu/i)).not.toBeInTheDocument();

    // Re-render with isAdmin={true} -> Admin Extend (+30N) and Freeze controls work
    rerender(
      <Screen02CheckInProfile
        booking={expiredComboBooking}
        actor={{ staffId: 1, name: 'Danny Admin', tier: 'CC', badgeLabel: 'ADMIN' }}
        isAdmin={true}
        onBack={vi.fn()}
        onCheckIn={vi.fn()}
        onQuickCheckIn={vi.fn()}
      />
    );

    expect(screen.getByText(/Quyền Admin · Gia hạn & Bảo lưu/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+30N' }));
    await waitFor(() => {
      expect(updateExpirySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ADD_DAYS',
          balanceId: 501,
          extendDays: 30,
          serviceGroup: 'upper',
        })
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /Bảo lưu \(Đóng băng\)/i }));
    await waitFor(() => {
      expect(updateExpirySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FREEZE',
          balanceId: 501,
          serviceGroup: 'upper',
        })
      );
    });
  });

  it('Screen11 -> Screen12 -> Screen14 revives stranded expired sessions (1 Mới + 2 Dặm) when buying a new combo and prints HSD on both receipts', () => {
    const onGoToBilling = vi.fn();
    const servicingExpired: BookingItem = { ...expiredComboBooking, status: 'SERVICING' };

    const { unmount } = render(
      <Screen11ProductUpsell
        booking={servicingExpired}
        actor={{ staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' }}
        onBack={vi.fn()}
        onGoToBilling={onGoToBilling}
      />
    );

    // Select a new Combo package ("Mua gói Combo" picks default 4 tặng 1 = 5 sessions)
    fireEvent.click(screen.getByRole('button', { name: /Mua gói Combo/i }));

    // Verify 3 stranded sessions are rescued into the pooled wallet and HSD is displayed
    expect(screen.getAllByText(/Cứu 3 buổi/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/HSD mới:/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /CHỐT ĐƠN & THANH TOÁN/i }));
    expect(onGoToBilling).toHaveBeenCalledTimes(1);

    const payload = onGoToBilling.mock.calls[0][0];
    expect(payload.selectedCombo?.revivedExpiredSessions).toBe(3);
    expect(payload.selectedCombo?.dateExpired).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.selectedCombo?.dateExpiredDisplay).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    // 5 new sessions - 1 used today + 3 revived sessions = 7 remaining sessions in pooled wallet
    expect(payload.selectedCombo?.remainingAfterToday?.totalRemaining).toBe(7);
    unmount();

    const checkoutBooking: BookingItem = {
      ...servicingExpired,
      selectedCombo: payload.selectedCombo,
      cartProducts: payload.cartProducts,
    };

    const { unmount: unmountCheckout } = render(
      <Screen12CheckoutBilling booking={checkoutBooking} onBack={vi.fn()} onChoosePayment={vi.fn()} />
    );
    expect(screen.getByText(new RegExp(`HSD: ${payload.selectedCombo.dateExpiredDisplay}`))).toBeInTheDocument();
    expect(screen.getByText(/Đã cứu 3 buổi gói cũ/i)).toBeInTheDocument();
    unmountCheckout();

    render(<Screen14ThermalReceiptDone booking={checkoutBooking} onFinishOrder={vi.fn()} />);
    expect(screen.getByText(new RegExp(`HSD: ${payload.selectedCombo.dateExpiredDisplay}`))).toBeInTheDocument();
    expect(screen.getByText(/Đã cứu 3 buổi gói cũ/i)).toBeInTheDocument();
  });

  it('Screen11ProductUpsell switches 3-way early-renewal usage mode on active combo and updates HSD + retail charge', () => {
    const onGoToBilling = vi.fn();
    render(
      <Screen11ProductUpsell
        booking={activeComboBooking}
        actor={{ staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' }}
        onBack={vi.fn()}
        onGoToBilling={onGoToBilling}
      />
    );

    // Since remainingSessions === 2, renewal section auto-expands; click the upper 4 + 1 (2.18M) tier button
    fireEvent.click(screen.getByRole('button', { name: /4 \+ 1.*2\.18M/i }));

    // Default usage mode for active combo with >= 2 sessions is USE_OLD_COMBO ("Trừ gói cũ (+1T)")
    // 2027-02-28 + 5 months (4 + 1 validity) + 1 month early renewal bonus = 2027-08-28 (28/08/2027)
    expect(screen.getByRole('button', { name: 'Trừ gói cũ (+1T)' })).toBeInTheDocument();
    expect(screen.getAllByText(/28\/08\/2027/).length).toBeGreaterThanOrEqual(1);

    // Switch to USE_NEW_COMBO ("Trừ gói mới") -> 2027-02-28 + 5 months = 28/07/2027 (no +1T bonus)
    fireEvent.click(screen.getByRole('button', { name: 'Trừ gói mới' }));
    expect(screen.getAllByText(/28\/07\/2027/).length).toBeGreaterThanOrEqual(1);

    // Switch to RETAIL_OR_VOUCHER ("Đi lẻ (+1T+21N)") -> 2027-08-28 + 21 days = 18/09/2027 & todaySingleServiceWaived = false
    fireEvent.click(screen.getByRole('button', { name: 'Đi lẻ (+1T+21N)' }));
    expect(screen.getAllByText(/18\/09\/2027/).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole('button', { name: /CHỐT ĐƠN & THANH TOÁN/i }));
    expect(onGoToBilling).toHaveBeenCalledTimes(1);
    const payload = onGoToBilling.mock.calls[0][0];
    expect(payload.selectedCombo?.todayUsageMode).toBe('RETAIL_OR_VOUCHER');
    expect(payload.selectedCombo?.todaySingleServiceWaived).toBe(false);
    expect(payload.selectedCombo?.dateExpired).toBe('2027-09-18');
  });

  it('ComboWalletDetailModal renders Combo Mi Trên & Combo Mi Dưới labels instead of Ví', () => {
    const phucBooking: BookingItem = {
      ...activeComboBooking,
      id: 339317,
      customerName: 'Phúc',
      customerPhone: '**** 959572',
      comboWallets: [
        {
          balanceId: 83187,
          serviceGroup: 'upper',
          comboName: '❖ Hyperlight 660 10+6',
          serviceKey: 'new-hyperlight-660',
          normalRemaining: 1,
          retainRemaining: 9,
          remainingSessions: 10,
          dateExpired: '2027-09-14',
          isFrozen: false,
          isExpired: false,
          isExpiringSoon: false,
          daysRemaining: 305,
          avgDaysPerSession: 30.5,
          expiryState: 'ACTIVE',
        },
        {
          balanceId: 82652,
          serviceGroup: 'upper',
          comboName: '❖ Flawless Under Mink 390 4+2',
          serviceKey: 'new-flawless.mink-390',
          normalRemaining: 3,
          retainRemaining: 0,
          remainingSessions: 3,
          dateExpired: '2027-02-15',
          isFrozen: false,
          isExpired: false,
          isExpiringSoon: false,
          daysRemaining: 94,
          avgDaysPerSession: 31.3,
          expiryState: 'ACTIVE',
          note: 'CS cập nhật note Cc',
        },
      ],
    };

    render(<ComboWalletDetailModal booking={phucBooking} isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Gói Combo & Hạn Sử Dụng')).toBeInTheDocument();
    expect(screen.getByText('Combo Mi Trên')).toBeInTheDocument();
    expect(screen.getByText('Combo Mi Dưới')).toBeInTheDocument();
    expect(screen.getByText('Ghi chú: CS cập nhật note Cc')).toBeInTheDocument();
    expect(screen.queryByText(/Ví Mi Trên/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ví Mi Dưới/i)).not.toBeInTheDocument();
  });
});
