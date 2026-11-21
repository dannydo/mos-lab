import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { getVietnamDateYmd, type IosCustomerComboWalletItem } from '@mos-lab/shared';
import { ComboWalletSelectorList } from '../../ui-kit/ComboWalletSelectorList';
import { Screen02CheckInProfile } from '../Screen02CheckInProfile';
import { Screen03ConsultationMatrix } from '../Screen03ConsultationMatrix';
import { Screen14ThermalReceiptDone } from '../Screen14ThermalReceiptDone';
import { mergeServerBookingsWithLocalState } from '../../../state/iosBookingMerge';
import type { BookingItem } from '../../../state/mockData';

const { mockListCheckoutEligibleStaff, mockExecuteBookingAction } = vi.hoisted(() => ({
  mockListCheckoutEligibleStaff: vi.fn(),
  mockExecuteBookingAction: vi.fn(),
}));

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

vi.mock('../../../../../lib/api-client', () => ({
  apiClient: {
    ios: {
      listCheckoutEligibleStaff: mockListCheckoutEligibleStaff,
      executeBookingAction: mockExecuteBookingAction,
    },
  },
}));

function makeWallet(overrides: Partial<IosCustomerComboWalletItem>): IosCustomerComboWalletItem {
  return {
    balanceId: 101,
    serviceId: 101,
    servicePriceId: 9101,
    serviceGroup: 'upper',
    comboName: 'Combo 4 tặng 1 · Classic 1D 550',
    serviceKey: 'classic-1d-550',
    normalRemaining: 2,
    retainRemaining: 1,
    remainingSessions: 3,
    dateExpired: '2026-12-01',
    isFrozen: false,
    isExpired: false,
    isExpiringSoon: false,
    daysRemaining: 12,
    avgDaysPerSession: 4,
    expiryState: 'ACTIVE',
    retainDaysLimit: 25,
    ...overrides,
  };
}

function makeMultiWalletBooking(overrides: Partial<BookingItem> = {}): BookingItem {
  const wallet1 = makeWallet({
    balanceId: 101,
    serviceId: 101,
    comboName: 'Combo 4 tặng 1 · Classic 1D 550',
    serviceKey: 'classic-1d-550',
    dateExpired: '2026-12-01',
    remainingSessions: 3,
    normalRemaining: 2,
    retainRemaining: 1,
  });
  const wallet2 = makeWallet({
    balanceId: 102,
    serviceId: 115,
    comboName: 'Combo 4 tặng 1 · HyperLight 4X 770',
    serviceKey: 'hyperlight-4x-770',
    dateExpired: '2026-12-20',
    remainingSessions: 4,
    normalRemaining: 2,
    retainRemaining: 2,
  });
  const under1 = makeWallet({
    balanceId: 201,
    serviceId: 210,
    serviceGroup: 'under',
    comboName: 'Combo Mi Dưới 390 #A',
    serviceKey: 'under-mink-390',
    dateExpired: '2026-12-05',
    remainingSessions: 2,
    normalRemaining: 1,
    retainRemaining: 1,
  });
  const under2 = makeWallet({
    balanceId: 202,
    serviceId: 210,
    serviceGroup: 'under',
    comboName: 'Combo Mi Dưới 390 #B',
    serviceKey: 'under-mink-390',
    dateExpired: '2026-12-28',
    remainingSessions: 3,
    normalRemaining: 2,
    retainRemaining: 1,
  });

  return {
    id: 777001,
    orderNumber: 'ORD-777001',
    storeId: 6,
    bookingDateYmd: getVietnamDateYmd(),
    customerName: 'Chị Thảo',
    customerPhone: '0909888777',
    customerId: 99001,
    customerVisits: 6,
    customerNote: '',
    serviceDuration: 75,
    serviceName: 'HyperLight 4X 770',
    serviceType: 'Normal',
    servicePrice: 770000,
    timeSlot: '10:00 - 11:15',
    time12h: '10:00 am',
    status: 'CHECKED_IN',
    assignedStaffId: 13783,
    assignedStaffName: 'Khanh Cao',
    assignedStaffTier: 'CVL',
    checkInStaffId: 13783,
    checkInStaffName: 'Khanh Cao',
    checkOutStaffId: 13783,
    checkOutStaffName: 'Khanh Cao',
    checkOutStaffTier: 'CVL',
    lashHistory: [{ id: 1, date: '01/11/2026', serviceName: 'HyperLight 4X 770', staffName: 'Khanh Cao' }],
    attributes: {
      material: 'HyperLight',
      style: 'Natural',
      volume: '4X',
      count: '70 fan',
      curl: 'C',
      length: '10-12 mm',
      thickness: '0.07 mm',
      hasUnderMink: true,
      underMinkServiceType: 'Retain',
      isNewClientDiagnosticDone: true,
      naturalLashLength: '9 - 10mm',
      naturalLashThickness: '0.10 - 0.12mm',
      naturalLashCount: '90 - 110 sợi',
      lashTrail: 'Thẳng (Straight)',
      eyeShape: 'Hai mí chuẩn (Almond)',
      lashHealth: 'Khỏe mạnh (Healthy)',
      medicalProblem: 'Bình thường (Good)',
    },
    comboLiveStatus: {
      balanceId: 101,
      isComboLive: true,
      comboName: wallet1.comboName,
      serviceKey: wallet1.serviceKey,
      remainingSessions: 3,
      normalRemaining: 2,
      retainRemaining: 1,
      dateExpired: wallet1.dateExpired,
      upsellOpportunity: false,
    },
    underMinkComboStatus: {
      balanceId: 201,
      hasUnderCombo: true,
      comboName: under1.comboName,
      remainingSessions: 2,
      normalRemaining: 1,
      retainRemaining: 1,
      dateExpired: under1.dateExpired,
    },
    comboWallets: [wallet1, wallet2, under1, under2],
    selectedUpperComboBalanceId: 101,
    selectedUnderComboBalanceId: 201,
    skipUpperCombo: false,
    skipUnderCombo: false,
    ...overrides,
  };
}

describe('Multi-Combo Wallet Selection across Check-in, Consultation, Polling & Post-Checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockListCheckoutEligibleStaff.mockResolvedValue({
      success: true,
      staff: [{ staffId: 13783, name: 'Khanh Cao', tier: 'CVL', storeId: 6, branchCode: 'DT' }],
    });
    mockExecuteBookingAction.mockResolvedValue({ success: true });
  });

  it('ComboWalletSelectorList renders 2 live wallets, locked expired wallet, and retail skip toggle', () => {
    const onSelectWallet = vi.fn();
    const onSelectSkipCombo = vi.fn();
    const wallets: IosCustomerComboWalletItem[] = [
      makeWallet({ balanceId: 101, comboName: 'Combo Classic 1D 550' }),
      makeWallet({ balanceId: 102, comboName: 'Combo HyperLight 4X 770', remainingSessions: 4 }),
      makeWallet({
        balanceId: 103,
        comboName: 'Combo Volume 3D 660',
        isExpired: true,
        expiryState: 'EXPIRED',
        daysRemaining: -10,
      }),
    ];

    render(
      <ComboWalletSelectorList
        wallets={wallets}
        selectedBalanceId={101}
        skipCombo={false}
        serviceGroup="upper"
        onSelectWallet={onSelectWallet}
        onSelectSkipCombo={onSelectSkipCombo}
      />
    );

    expect(screen.getByText(/Đang có 3 gói ❖ Mi Trên/i)).toBeInTheDocument();
    expect(screen.getByTestId('combo-wallet-option-101')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('combo-wallet-option-102')).toHaveAttribute('aria-pressed', 'false');

    const expiredCard = screen.getByTestId('combo-wallet-option-expired-103');
    expect(expiredCard.tagName).toBe('DIV');
    expect(expiredCard).toHaveTextContent(/Đã hết hạn · Khóa trừ 0đ/i);

    fireEvent.click(screen.getByTestId('combo-wallet-option-102'));
    expect(onSelectWallet).toHaveBeenCalledTimes(1);
    expect(onSelectWallet.mock.calls[0]?.[0]?.balanceId).toBe(102);

    fireEvent.click(screen.getByTestId('combo-wallet-skip-upper'));
    expect(onSelectSkipCombo).toHaveBeenCalledTimes(1);
  });

  it('Screen02CheckInProfile displays upper + under wallets and keeps selector visible when Đi lẻ is active', () => {
    const onSelectComboWallet = vi.fn();
    const booking = makeMultiWalletBooking({ status: 'INCOMING' });

    const { rerender } = render(
      <Screen02CheckInProfile
        booking={booking}
        onBack={vi.fn()}
        onCheckIn={vi.fn()}
        onQuickCheckIn={vi.fn()}
        onSelectComboWallet={onSelectComboWallet}
      />
    );

    const upperSelector = screen.getByTestId('combo-wallet-selector-upper');
    const underSelector = screen.getByTestId('combo-wallet-selector-under');
    expect(within(upperSelector).getByTestId('combo-wallet-option-101')).toBeInTheDocument();
    expect(within(upperSelector).getByTestId('combo-wallet-option-102')).toBeInTheDocument();
    expect(within(underSelector).getByTestId('combo-wallet-option-201')).toBeInTheDocument();
    expect(within(underSelector).getByTestId('combo-wallet-option-202')).toBeInTheDocument();

    fireEvent.click(within(upperSelector).getByTestId('combo-wallet-skip-upper'));
    expect(onSelectComboWallet).toHaveBeenCalledWith({
      targetBookingId: 777001,
      selectedUpperComboBalanceId: null,
      skipUpperCombo: true,
    });

    // Re-render with skipUpperCombo: true -> selector stays visible and label switches to Đi Lẻ Lần Này (Giữ Gói)
    rerender(
      <Screen02CheckInProfile
        booking={{ ...booking, skipUpperCombo: true, selectedUpperComboBalanceId: null }}
        onBack={vi.fn()}
        onCheckIn={vi.fn()}
        onQuickCheckIn={vi.fn()}
        onSelectComboWallet={onSelectComboWallet}
      />
    );

    expect(screen.getByText(/Đi Lẻ Lần Này \(Giữ Gói\)/i)).toBeInTheDocument();
    expect(screen.getByTestId('combo-wallet-selector-upper')).toBeInTheDocument();
    expect(screen.getByTestId('combo-wallet-option-102')).toBeInTheDocument();
  });

  it('Screen03ConsultationMatrix enforces one-way sync: switching wallet updates material before manual edit, and editing material never resets wallet', () => {
    const onSelectComboWallet = vi.fn();
    const onSave = vi.fn();
    const bookingWallet1 = makeMultiWalletBooking({
      selectedUpperComboBalanceId: 101, // Classic 1D
      serviceName: 'HyperLight 4X 770',
    });

    const { rerender } = render(
      <Screen03ConsultationMatrix
        booking={bookingWallet1}
        onBack={vi.fn()}
        onSave={onSave}
        onSelectComboWallet={onSelectComboWallet}
      />
    );

    // Clicking wallet #102 calls onSelectComboWallet
    fireEvent.click(screen.getByTestId('combo-wallet-option-102'));
    expect(onSelectComboWallet).toHaveBeenCalledWith({
      selectedUpperComboBalanceId: 102,
      skipUpperCombo: false,
    });
    onSelectComboWallet.mockClear();

    // Parent updates booking with selectedUpperComboBalanceId: 102 (HyperLight 4X) -> syncs material before manual edit
    rerender(
      <Screen03ConsultationMatrix
        booking={{ ...bookingWallet1, selectedUpperComboBalanceId: 102 }}
        onBack={vi.fn()}
        onSave={onSave}
        onSelectComboWallet={onSelectComboWallet}
      />
    );
    expect(screen.getByText(/HyperLight · 4X · 70 fan/i)).toBeInTheDocument();

    // Now manually edit material to Volume (outside HyperLight) and confirm the override dialog
    const volumeCard = screen.getByRole('button', { name: /^Volume\b/i });
    fireEvent.click(volumeCard);
    const confirmOverrideBtn = screen.queryByRole('button', { name: /XÁC NHẬN ĐỔI|XÁC NHẬN OVERRIDE/i });
    if (confirmOverrideBtn) {
      fireEvent.click(confirmOverrideBtn);
    }

    // Manual material edit NEVER alters or clears selectedUpperComboBalanceId
    expect(onSelectComboWallet).not.toHaveBeenCalled();

    // Subsequent poll re-render with Wallet #102 still selected preserves manual Volume selection (hasManualMaterialEdit guard)
    rerender(
      <Screen03ConsultationMatrix
        booking={{ ...bookingWallet1, selectedUpperComboBalanceId: 102 }}
        onBack={vi.fn()}
        onSave={onSave}
        onSelectComboWallet={onSelectComboWallet}
      />
    );
    expect(screen.getByText(/Volume · /i)).toBeInTheDocument();
  });

  it('mergeServerBookingsWithLocalState preserves fresh local wallet selection and skip flags across 5s polling', () => {
    const localBooking = makeMultiWalletBooking({
      selectedUpperComboBalanceId: 102,
      selectedUnderComboBalanceId: null,
      skipUpperCombo: false,
      skipUnderCombo: true,
      _localComboUpdatedAt: Date.now(),
    });
    const staleServerBooking = makeMultiWalletBooking({
      selectedUpperComboBalanceId: 101,
      selectedUnderComboBalanceId: 201,
      skipUpperCombo: false,
      skipUnderCombo: false,
    });

    const merged = mergeServerBookingsWithLocalState([localBooking], [staleServerBooking], 0, 6);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.selectedUpperComboBalanceId).toBe(102);
    expect(merged[0]?.skipUpperCombo).toBe(false);
    expect(merged[0]?.selectedUnderComboBalanceId).toBeNull();
    expect(merged[0]?.skipUnderCombo).toBe(true);
    expect(merged[0]?.comboLiveStatus?.balanceId).toBe(102);
  });

  it('PostCheckoutComboSheet supports swapping from Wallet #101 to Wallet #102 with 0đ delta', async () => {
    const doneBooking = makeMultiWalletBooking({
      status: 'DONE',
      selectedUpperComboBalanceId: 101,
      comboRedemption: {
        balanceId: 101,
        redeemSession: true,
        comboName: 'Combo 4 tặng 1 · Classic 1D 550',
        deductedBucket: 'PAID_NEW',
        typeConversionSurcharge: 0,
        upgradeVolumeSurcharge: 0,
        totalCustomerPayToday: 0,
        recognizedRevenueToday: 440000,
        remainingAfterToday: 2,
        explanation: 'Trừ 1 lượt gói Classic 1D 550',
        totalSessions: 3,
        paidRemaining: 1,
        bonusRemaining: 1,
      },
      billing: {
        subtotal: 0,
        vatRate: 0.08,
        vatAmount: 0,
        serviceTotal: 0,
        comboTotal: 0,
        productTotal: 0,
        paymentMethod: 'VIETQR',
        paymentBreakdown: { vietqrAmount: 0, posAmount: 0, cashAmount: 0 },
        settlementStatus: 'SETTLED_COMPLETED',
        tipAmount: 0,
        tipCvShare: 0,
        tipCcShare: 0,
        diamondUsed: 0,
        diamondDiscountAmount: 0,
        grandTotal: 0,
      },
    });

    const ownerCvl = { staffId: 13783, name: 'Khanh Cao', tier: 'CVL' as const, badgeLabel: 'CVL' };
    render(<Screen14ThermalReceiptDone booking={doneBooking} actor={ownerCvl} onFinishOrder={vi.fn()} />);

    fireEvent.click(screen.getByTestId('open-post-checkout-combo-btn'));
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /Điều chỉnh gói Combo sau checkout/i })).toBeInTheDocument();
    });

    const upperSelector = screen.getByTestId('combo-wallet-selector-upper');
    fireEvent.click(within(upperSelector).getByTestId('combo-wallet-option-102'));
    expect(screen.getByTestId('post-checkout-collect-now')).toHaveTextContent('0 đ');

    fireEvent.click(screen.getByTestId('post-checkout-submit-btn'));
    await waitFor(() => {
      expect(mockExecuteBookingAction).toHaveBeenCalledTimes(1);
    });

    const submitted = mockExecuteBookingAction.mock.calls[0]?.[0];
    expect(submitted.action).toBe('SUBMIT_POST_CHECKOUT_ADJUSTMENT');
    expect(submitted.selectedUpperComboBalanceId).toBe(102);
    expect(submitted.skipUpperCombo).toBe(false);
    expect(submitted.comboRedemption?.balanceId).toBe(102);
  });
});
