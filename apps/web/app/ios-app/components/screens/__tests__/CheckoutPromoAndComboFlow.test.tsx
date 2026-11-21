import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IosPromotionOption } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { Screen11ProductUpsell } from '../Screen11ProductUpsell';
import { Screen12CheckoutBilling } from '../Screen12CheckoutBilling';
import type { BookingItem } from '../../../state/mockData';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'dark' }),
}));

const CAMP_50_PROMO: IosPromotionOption = {
  promotionId: 991,
  promotionKey: 'CAMP_SALE_50',
  promotionType: 'campaign',
  promotionApply: 'all',
  serviceGroup: null,
  name: 'Chiến dịch Giảm 50% Toàn Hóa Đơn',
  shortName: 'Mã 50%',
  discountPercentage: 50,
  discountAmount: 0,
  exactlyAmount: 0,
  isOldUserDisabled: false,
  isApprovalRequired: false,
  isPublic: false,
  isSystem: true,
  isCreditAllowed: true,
  dateExpired: null,
  position: 1,
};

function makePrebookedPromoBooking(overrides: Partial<BookingItem> = {}): BookingItem {
  return {
    id: 551001,
    orderNumber: 'BK-551001',
    customerId: 771001,
    customerName: 'Chị Ngọc Hân',
    customerPhone: '0909551001',
    customerVisits: 4,
    customerNote: 'Khách đặt lịch gắn sẵn Mã 50%',
    diamondBalance: 100,
    timeSlot: '15:00 - 16:30',
    time12h: '03:00 pm',
    serviceDuration: 90,
    serviceName: 'HyperLight 4X 770',
    servicePrice: 770000,
    serviceType: 'Normal',
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    assignedStaffTier: 'CVL',
    checkInStaffId: 46272,
    checkInStaffName: 'Thảo Ly',
    checkOutStaffId: 46272,
    checkOutStaffName: 'Thảo Ly',
    status: 'SERVICING',
    promotionId: CAMP_50_PROMO.promotionId,
    appliedPromotion: CAMP_50_PROMO,
    lashHistory: [{ id: 1, date: '10/10/2026', serviceName: 'HyperLight 4X 770', staffName: 'Thảo Ly' }],
    attributes: {
      material: 'HyperLight',
      volume: '4X',
      count: '70 fan',
      style: 'Natural',
      curl: 'C',
      length: '10-12mm',
      thickness: '0.05 mm',
      isNewClientDiagnosticDone: true,
    },
    ...overrides,
  };
}

describe('Pre-booked 50% Promotion + Combo Selection Flow (Step 12 & Step 13)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient.ios, 'getPromotions').mockResolvedValue({
      success: true,
      canViewGlobalPromotions: false,
      count: 0,
      promotions: [],
    });
  });

  it('Screen11ProductUpsell auto-expands Combo section even when existing combo > 2 sessions and renders pre-attached 50% promo', () => {
    render(
      <Screen11ProductUpsell
        booking={makePrebookedPromoBooking({
          comboLiveStatus: {
            isComboLive: true,
            isExpired: false,
            remainingSessions: 5,
            normalRemaining: 2,
            retainRemaining: 3,
            comboName: 'Combo 4 tặng 1 · HyperLight 4X 770',
            dateExpired: '2027-03-20',
            upsellOpportunity: false,
          },
        })}
        actor={{ staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' }}
        onBack={vi.fn()}
        onGoToBilling={vi.fn()}
      />
    );

    expect(screen.getByTestId('upsell-preattached-promo-badge')).toHaveTextContent('Chiến dịch Giảm 50% Toàn Hóa Đơn');
    expect(screen.getAllByRole('button', { name: /4 \+ 1/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('button', { name: /Thu gọn/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('Screen12CheckoutBilling selects Combo directly on Step 13, defaults to RETAIL_OR_VOUCHER (-385.000đ once), toggles USE_NEW_COMBO without CAMP_* leak, and restores CAMP_* promo when toggled back', async () => {
    const onUpdateCombos = vi.fn();

    render(
      <Screen12CheckoutBilling
        booking={makePrebookedPromoBooking({
          cartProducts: [{ productId: 201, productName: 'Dưỡng Mi Yeppeum', price: 350000, quantity: 1 }],
        })}
        actor={{ staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' }}
        onBack={vi.fn()}
        onChoosePayment={vi.fn()}
        onUpdateCombos={onUpdateCombos}
      />
    );

    // 1. Pre-attached 50% applied ONCE on gross 770.000đ service -> -385.000đ (plus 50% on product since CAMP_* apply='all' in retail)
    // "+ Chọn / Mua gói Combo" button is visible right inside Checkout receipt
    const addComboBtn = await screen.findByTestId('checkout-add-combo-btn');
    expect(addComboBtn).toBeInTheDocument();
    expect(screen.getByTestId('promo-badge-service')).toHaveTextContent('-385.000đ');

    // 2. Click "+ Chọn / Mua gói Combo" to open ComboCatalogConsultModal and pick 4 + 1 (2.94M / 2.940.000đ)
    fireEvent.click(addComboBtn);
    const pkgBtn = await screen.findByRole('button', { name: /4 \+ 1/i });
    fireEvent.click(pkgBtn);
    fireEvent.click(screen.getByRole('button', { name: /Áp Dụng/i }));

    await waitFor(() => {
      expect(onUpdateCombos).toHaveBeenCalledTimes(1);
    });
    const firstPayload = onUpdateCombos.mock.calls[0][0];
    expect(firstPayload.selectedCombo?.todayUsageMode).toBe('RETAIL_OR_VOUCHER');
    expect(firstPayload.selectedCombo?.todaySingleServiceWaived).toBe(false);

    // 50% discount on single service stays active (-385.000đ) and mode toggle appears
    expect(await screen.findByTestId('checkout-upper-combo-usage-mode')).toBeInTheDocument();
    expect(screen.getByTestId('promo-badge-service')).toHaveTextContent('-385.000đ');

    // 3. Toggle to USE_NEW_COMBO ("Trừ Buổi 1 gói mới (0đ)") -> service becomes 0đ, CAMP_* suspended (NO 50% leak onto Yeppeum!)
    fireEvent.click(screen.getByTestId('checkout-combo-mode-use-new'));
    await waitFor(() => {
      expect(onUpdateCombos).toHaveBeenCalledTimes(2);
    });
    const secondPayload = onUpdateCombos.mock.calls[1][0];
    expect(secondPayload.selectedCombo?.todayUsageMode).toBe('USE_NEW_COMBO');
    expect(secondPayload.selectedCombo?.todaySingleServiceWaived).toBe(true);
    await waitFor(() => {
      expect(screen.queryByTestId('promo-badge-service')).toBeNull();
      expect(screen.queryByTestId('receipt-promotion-row')).toBeNull();
    });

    // 4. Toggle back to RETAIL_OR_VOUCHER -> CAMP_* 50% promo (even though isPublic=false, isSystem=true for CVL) is immediately restored!
    fireEvent.click(screen.getByTestId('checkout-combo-mode-retail'));
    await waitFor(() => {
      expect(onUpdateCombos).toHaveBeenCalledTimes(3);
    });
    const thirdPayload = onUpdateCombos.mock.calls[2][0];
    expect(thirdPayload.selectedCombo?.todayUsageMode).toBe('RETAIL_OR_VOUCHER');
    expect(thirdPayload.selectedCombo?.todaySingleServiceWaived).toBe(false);
    expect(await screen.findByTestId('promo-badge-service')).toHaveTextContent('-385.000đ');

    // 5. Verify CVL still sees remembered CAMP_* promo after clearing/re-opening CheckoutPromotionPickerModal even when getPromotions returned []
    fireEvent.click(screen.getByTestId('clear-promo-service'));
    fireEvent.click(await screen.findByTestId('add-promo-service'));
    const campOption = await screen.findByTestId(`promotion-option-${CAMP_50_PROMO.promotionId}`);
    expect(campOption).toBeInTheDocument();
    fireEvent.click(campOption);
    expect(await screen.findByTestId('promo-badge-service')).toHaveTextContent('-385.000đ');
  });
});
