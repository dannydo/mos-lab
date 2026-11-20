import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { getVietnamDateYmd } from '@mos-lab/shared';
import { Screen14ThermalReceiptDone } from '../Screen14ThermalReceiptDone';
import type { BookingItem } from '../../../state/mockData';

const { mockListCheckoutEligibleStaff, mockExecuteBookingAction } = vi.hoisted(() => ({
  mockListCheckoutEligibleStaff: vi.fn(),
  mockExecuteBookingAction: vi.fn(),
}));

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'light' }),
}));

vi.mock('../../../../../lib/api-client', () => ({
  apiClient: {
    ios: {
      listCheckoutEligibleStaff: mockListCheckoutEligibleStaff,
      executeBookingAction: mockExecuteBookingAction,
    },
  },
}));

function makeDoneBooking(overrides: Partial<BookingItem> = {}): BookingItem {
  const today = getVietnamDateYmd();
  return {
    id: 888001,
    orderNumber: 'BK-888001',
    storeId: 6,
    bookingDateYmd: today,
    customerName: 'Chị Ngọc',
    customerPhone: '0909123456',
    customerId: 9001,
    customerVisits: 2,
    customerNote: '',
    serviceDuration: 75,
    serviceName: 'HyperLight 4X 550',
    serviceType: 'Normal',
    servicePrice: 550000,
    timeSlot: '09:00 - 10:15',
    time12h: '09:00 am',
    status: 'DONE',
    assignedStaffId: 13783,
    assignedStaffName: 'Khanh Cao',
    assignedStaffTier: 'CVL',
    checkInStaffId: 13783,
    checkInStaffName: 'Khanh Cao',
    checkOutStaffId: 13783,
    checkOutStaffName: 'Khanh Cao',
    checkOutStaffTier: 'CVL',
    cvRotationPoints: 35,
    diamondBalance: 10,
    attributes: {
      material: 'HyperLight',
      style: 'Natural',
      volume: '4X',
      count: '50 fan',
      curl: 'C',
      length: '10-12 mm',
      thickness: '0.07 mm',
    },
    billing: {
      subtotal: 550000,
      vatRate: 0.08,
      vatAmount: 44000,
      serviceTotal: 550000,
      productTotal: 0,
      paymentMethod: 'CASH',
      paymentBreakdown: { cashAmount: 594000, posAmount: 0, vietqrAmount: 0 },
      settlementStatus: 'SETTLED_COMPLETED',
      tipAmount: 0,
      tipCvShare: 0,
      tipCcShare: 0,
      diamondUsed: 0,
      diamondDiscountAmount: 0,
      grandTotal: 594000,
    },
    ...overrides,
  };
}

describe('Post-Checkout Combo Adjustment Flow & Receipt Reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListCheckoutEligibleStaff.mockResolvedValue({
      success: true,
      staff: [
        { staffId: 13783, name: 'Khanh Cao', tier: 'CVL', storeId: 6, branchCode: 'DT' },
        { staffId: 46272, name: 'Thảo Ly', tier: 'CVL', storeId: 6, branchCode: 'DT' },
        { staffId: 37790, name: 'Diễm Hương', tier: 'CC', storeId: 6, branchCode: 'DT' },
      ],
    });
    mockExecuteBookingAction.mockResolvedValue({ success: true });
  });

  it('shows post-checkout CTA on same-day DONE booking for owner/CC and hides for past dates or unauthorized CVL', () => {
    const ownerCvl = { staffId: 13783, name: 'Khanh Cao', tier: 'CVL' as const, badgeLabel: 'CVL' };
    const otherCvl = { staffId: 99999, name: 'Nhân viên khác', tier: 'CVL' as const, badgeLabel: 'CVL' };
    const ccActor = { staffId: 37790, name: 'Diễm Hương', tier: 'CC' as const, badgeLabel: 'CC' };

    const { rerender } = render(
      <Screen14ThermalReceiptDone booking={makeDoneBooking()} actor={ownerCvl} onFinishOrder={vi.fn()} />
    );
    expect(screen.getByTestId('open-post-checkout-combo-btn')).toBeInTheDocument();

    rerender(<Screen14ThermalReceiptDone booking={makeDoneBooking()} actor={ccActor} onFinishOrder={vi.fn()} />);
    expect(screen.getByTestId('open-post-checkout-combo-btn')).toBeInTheDocument();

    rerender(<Screen14ThermalReceiptDone booking={makeDoneBooking()} actor={otherCvl} onFinishOrder={vi.fn()} />);
    expect(screen.queryByTestId('open-post-checkout-combo-btn')).not.toBeInTheDocument();

    rerender(
      <Screen14ThermalReceiptDone
        booking={makeDoneBooking({ bookingDateYmd: '2026-01-01' })}
        actor={ccActor}
        onFinishOrder={vi.fn()}
      />
    );
    expect(screen.queryByTestId('open-post-checkout-combo-btn')).not.toBeInTheDocument();
  });

  it('selects a Combo package, transfers Checkout staff, calculates top-up delta, and submits SUBMIT_POST_CHECKOUT_ADJUSTMENT', async () => {
    const onRefreshDb = vi.fn().mockResolvedValue(undefined);
    const ownerCvl = { staffId: 13783, name: 'Khanh Cao', tier: 'CVL' as const, badgeLabel: 'CVL' };

    render(
      <Screen14ThermalReceiptDone
        booking={makeDoneBooking()}
        actor={ownerCvl}
        onRefreshDb={onRefreshDb}
        onFinishOrder={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('open-post-checkout-combo-btn'));

    const targetStaffBtn = await screen.findByTestId('post-checkout-staff-46272');
    fireEvent.click(targetStaffBtn);

    expect(screen.getByTestId('post-checkout-staff-transfer-banner')).toBeInTheDocument();
    expect(screen.getByTestId('post-checkout-staff-transfer-banner')).toHaveTextContent('Khanh Cao');
    expect(screen.getByTestId('post-checkout-staff-transfer-banner')).toHaveTextContent('Thảo Ly');

    const comboButtons = screen.getAllByTestId(/^post-checkout-combo-/);
    expect(comboButtons.length).toBeGreaterThan(0);
    fireEvent.click(comboButtons[0]);

    const collectNowEl = screen.getByTestId('post-checkout-collect-now');
    expect(collectNowEl.textContent).not.toBe('0 đ');

    fireEvent.click(screen.getByTestId('post-checkout-submit-btn'));

    await waitFor(() => {
      expect(mockExecuteBookingAction).toHaveBeenCalledTimes(1);
    });

    const callArg = mockExecuteBookingAction.mock.calls[0][0];
    expect(callArg.bookingId).toBe(888001);
    expect(callArg.action).toBe('SUBMIT_POST_CHECKOUT_ADJUSTMENT');
    expect(callArg.targetCheckOutStaffId).toBe(46272);
    expect(callArg.targetCheckOutStaffName).toBe('Thảo Ly');
    expect(callArg.paymentMode).toBe('TOP_UP');
    expect(callArg.selectedCombo).toEqual(expect.objectContaining({ price: expect.any(Number) }));
    expect(onRefreshDb).toHaveBeenCalledTimes(1);
  });

  it('renders customer-safe reconciliation box immediately and reveals audit timeline on Eye toggle', () => {
    const ownerCvl = { staffId: 13783, name: 'Khanh Cao', tier: 'CVL' as const, badgeLabel: 'CVL' };
    const snapBefore = {
      checkOutStaffId: 13783,
      checkOutStaffName: 'Khanh Cao',
      checkOutStaffTier: 'CVL',
      selectedComboName: null,
      selectedComboPrice: 0,
      selectedUnderComboName: null,
      selectedUnderComboPrice: 0,
      cartProductsSummary: 'Không có sản phẩm',
      productTotal: 0,
      serviceTotal: 550000,
      subtotal: 550000,
      vatAmount: 44000,
      tipAmount: 0,
      diamondUsed: 0,
      grandTotal: 594000,
      paymentMethod: 'CASH' as const,
      paymentBreakdown: { cashAmount: 594000, posAmount: 0, vietqrAmount: 0 },
      comboBonusAmount: 0,
      serumBonusAmount: 0,
      checkOutTipShareAmount: 0,
    };
    const snapAfter = {
      ...snapBefore,
      checkOutStaffId: 46272,
      checkOutStaffName: 'Thảo Ly',
      selectedComboName: 'Combo 4 tặng 1 · HyperLight 4X 550',
      selectedComboPrice: 2200000,
      serviceTotal: 0,
      subtotal: 2200000,
      vatAmount: 176000,
      grandTotal: 2376000,
      paymentMethod: 'MIXED' as const,
      paymentBreakdown: { cashAmount: 594000, posAmount: 0, vietqrAmount: 1782000 },
      comboBonusAmount: 100000,
    };

    const adjustedBooking = makeDoneBooking({
      checkOutStaffId: 46272,
      checkOutStaffName: 'Thảo Ly',
      selectedCombo: {
        id: 'HyperLight_4X:4_tặng_1:550',
        name: 'Combo 4 tặng 1 · HyperLight 4X 550',
        price: 2200000,
        bonus: 100000,
        sessions: 5,
        todaySingleServiceWaived: true,
      },
      billing: {
        subtotal: 2200000,
        vatRate: 0.08,
        vatAmount: 176000,
        serviceTotal: 0,
        productTotal: 0,
        paymentMethod: 'MIXED',
        paymentBreakdown: { cashAmount: 594000, posAmount: 0, vietqrAmount: 1782000 },
        settlementStatus: 'SETTLED_COMPLETED',
        tipAmount: 0,
        tipCvShare: 0,
        tipCcShare: 0,
        diamondUsed: 0,
        diamondDiscountAmount: 0,
        grandTotal: 2376000,
        previousPaidGrandTotal: 594000,
        previousPaymentMethod: 'CASH',
        previousPaymentBreakdown: { cashAmount: 594000, posAmount: 0, vietqrAmount: 0 },
        lastAdjustmentMode: 'TOP_UP',
        lastAdjustmentDeltaAmount: 1782000,
      },
      postCheckoutAdjustments: [
        {
          adjustmentId: 'adj-1',
          createdAt: '2026-11-19T09:30:00.000Z',
          resolvedAt: '2026-11-19T09:30:05.000Z',
          status: 'APPLIED',
          paymentMode: 'TOP_UP',
          requestedByStaffId: 13783,
          requestedByStaffName: 'Khanh Cao',
          requestedByStaffTier: 'CVL',
          previousCheckOutStaffId: 13783,
          previousCheckOutStaffName: 'Khanh Cao',
          newCheckOutStaffId: 46272,
          newCheckOutStaffName: 'Thảo Ly',
          newCheckOutStaffTier: 'CVL',
          checkOutStaffReplaced: true,
          previousPaidTotal: 594000,
          newGrandTotal: 2376000,
          deltaAmount: 1782000,
          collectedAmount: 1782000,
          deltaPaymentMethod: 'VIETQR',
          deltaPaymentBreakdown: { cashAmount: 0, posAmount: 0, vietqrAmount: 1782000 },
          beforeSnapshot: snapBefore,
          afterSnapshot: snapAfter,
        },
      ],
    });

    render(<Screen14ThermalReceiptDone booking={adjustedBooking} actor={ownerCvl} onFinishOrder={vi.fn()} />);

    const recBox = screen.getByTestId('post-checkout-reconciliation-box');
    expect(recBox).toBeInTheDocument();
    expect(recBox).toHaveTextContent('594.000 đ');
    expect(recBox).toHaveTextContent('2.376.000 đ');

    expect(screen.queryByTestId('post-checkout-audit-timeline')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('ios-staff-visibility-toggle'));

    const timeline = screen.getByTestId('post-checkout-audit-timeline');
    expect(timeline).toBeInTheDocument();
    expect(timeline).toHaveTextContent('Chuyển Checkout: Khanh Cao → Thảo Ly');
  });
});
