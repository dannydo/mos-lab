import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IosPromotionOption } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { Screen12CheckoutBilling } from '../Screen12CheckoutBilling';
import { Screen14ThermalReceiptDone } from '../Screen14ThermalReceiptDone';
import { thermalPrinterService } from '../../../services/thermalPrinterService';
import type { BookingItem } from '../../../state/mockData';

const PROMO_20_NO_CREDIT: IosPromotionOption = {
  promotionId: 19,
  promotionKey: 'PROMO-20',
  promotionType: 'normal',
  promotionApply: 'single',
  serviceGroup: null,
  name: 'Giảm 20% Dịch Vụ Mi',
  shortName: 'Giảm 20%',
  discountPercentage: 20,
  discountAmount: 0,
  exactlyAmount: 0,
  isOldUserDisabled: false,
  isApprovalRequired: false,
  isPublic: true,
  isSystem: false,
  isCreditAllowed: false,
  dateExpired: null,
  position: 1,
};

const PROMO_NEW_ONLY: IosPromotionOption = {
  promotionId: 42,
  promotionKey: 'NEW-GUEST-100K',
  promotionType: 'normal',
  promotionApply: 'all',
  serviceGroup: null,
  name: 'Ưu Đãi Khách Mới 108K',
  shortName: 'Khách Mới',
  discountPercentage: 0,
  discountAmount: 108000,
  exactlyAmount: 0,
  isOldUserDisabled: true,
  isApprovalRequired: false,
  isPublic: true,
  isSystem: false,
  isCreditAllowed: true,
  dateExpired: null,
  position: 2,
};

const PROMO_PRODUCT_10_CREDIT_OK: IosPromotionOption = {
  promotionId: 25,
  promotionKey: 'SERUM-10',
  promotionType: 'normal',
  promotionApply: 'all',
  serviceGroup: null,
  name: 'Giảm 10% Sản Phẩm',
  shortName: 'SP -10%',
  discountPercentage: 10,
  discountAmount: 0,
  exactlyAmount: 0,
  isOldUserDisabled: false,
  isApprovalRequired: false,
  isPublic: true,
  isSystem: false,
  isCreditAllowed: true,
  dateExpired: null,
  position: 3,
};

function makeBooking(overrides: Partial<BookingItem> = {}): BookingItem {
  const base: BookingItem = {
    id: 340555,
    orderNumber: 'BK-340555',
    customerId: 9100,
    customerName: 'Chị Lan Anh',
    customerPhone: '0909888777',
    customerVisits: 5,
    customerNote: '',
    diamondBalance: 200,
    timeSlot: '14:00',
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
  };
  return {
    ...base,
    ...overrides,
  };
}

describe('CheckoutPromotionFlow — Screen12 & Screen14 Promotion Integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches promotions, opens picker, applies promo, locks Diamond wallet when isCreditAllowed=false, and disables old-user-disabled promo', async () => {
    vi.spyOn(apiClient.ios, 'getPromotions').mockResolvedValue({
      success: true,
      canViewGlobalPromotions: true,
      count: 2,
      promotions: [PROMO_20_NO_CREDIT, PROMO_NEW_ONLY],
    });

    const onSavePromotion = vi.fn();
    render(
      <Screen12CheckoutBilling
        booking={makeBooking({
          customerVisits: 5,
          billing: {
            paymentMethod: 'VIETQR',
            subtotal: 880000,
            serviceTotal: 880000,
            productTotal: 0,
            tipAmount: 0,
            tipCvShare: 0,
            tipCcShare: 0,
            diamondUsed: 50,
            diamondDiscountAmount: 50000,
            grandTotal: 900400,
          },
        })}
        actor={{ staffId: 37790, name: 'Diễm Hương', tier: 'CC', badgeLabel: 'CC' }}
        onBack={vi.fn()}
        onChoosePayment={vi.fn()}
        onSavePromotion={onSavePromotion}
      />
    );

    const openBtn = await screen.findByTestId('add-promo-service');
    fireEvent.click(openBtn);

    const newOnlyBtn = await screen.findByTestId('promotion-option-42');
    expect(newOnlyBtn).toBeDisabled();
    expect(newOnlyBtn).toHaveTextContent('Chỉ khách mới');

    const promo20Btn = screen.getByTestId('promotion-option-19');
    expect(promo20Btn).not.toBeDisabled();
    fireEvent.click(promo20Btn);

    await waitFor(() => {
      expect(onSavePromotion).toHaveBeenCalledWith(PROMO_20_NO_CREDIT, {
        scope: 'service',
        productIndex: undefined,
        productId: undefined,
      });
    });

    const serviceBadge = await screen.findByTestId('promo-badge-service');
    expect(serviceBadge).toHaveTextContent('-176.000đ');

    const receiptPromoRow = await screen.findByTestId('receipt-promotion-row');
    expect(receiptPromoRow).toHaveTextContent('Giảm 20% Dịch Vụ Mi');
    expect(receiptPromoRow).toHaveTextContent('-176.000đ');

    const lockedBanner = screen.getByTestId('diamond-locked-by-promo-banner');
    expect(lockedBanner).toHaveTextContent('không áp dụng chung với Ví Kim Cương');
  });

  it('supports independent per-item promotions on service, combo & product with partial Diamond credit lock and hides 0đ service promo button', async () => {
    vi.spyOn(apiClient.ios, 'getPromotions').mockResolvedValue({
      success: true,
      canViewGlobalPromotions: true,
      count: 3,
      promotions: [PROMO_20_NO_CREDIT, PROMO_NEW_ONLY, PROMO_PRODUCT_10_CREDIT_OK],
    });

    const onSavePromotion = vi.fn();
    render(
      <Screen12CheckoutBilling
        booking={makeBooking({
          customerVisits: 5,
          diamondBalance: 500,
          selectedCombo: {
            id: '7+3',
            name: 'Combo 7 tặng 3 - Classic 1D 550',
            price: 3010000,
            bonus: 150000,
            sessions: 10,
            todaySingleServiceWaived: false,
          },
          cartProducts: [{ productId: 901, productName: 'Serum Dưỡng Mi', price: 500000, quantity: 1 }],
          billing: {
            paymentMethod: 'VIETQR',
            subtotal: 4390000,
            serviceTotal: 880000,
            comboTotal: 3010000,
            productTotal: 500000,
            tipAmount: 0,
            tipCvShare: 0,
            tipCcShare: 0,
            grandTotal: 4741200,
          },
        })}
        actor={{ staffId: 37790, name: 'Diễm Hương', tier: 'CC', badgeLabel: 'CC' }}
        onBack={vi.fn()}
        onChoosePayment={vi.fn()}
        onSavePromotion={onSavePromotion}
      />
    );

    expect(await screen.findByTestId('add-promo-service')).toBeInTheDocument();
    expect(screen.queryByTestId('add-promo-combo')).toBeNull();
    expect(screen.queryByTestId('add-promo-under-combo')).toBeNull();

    // 1. Apply credit-restricted promo to Service -> partial restriction banner (Combo & Product stay credit-eligible)
    fireEvent.click(screen.getByTestId('add-promo-service'));
    fireEvent.click(await screen.findByTestId('promotion-option-19'));

    expect(await screen.findByTestId('promo-badge-service')).toHaveTextContent('-176.000đ');
    expect(screen.queryByTestId('diamond-locked-by-promo-banner')).toBeNull();
    expect(screen.getByTestId('diamond-partial-restriction-note')).toBeInTheDocument();

    // 2. Apply independent 10% promo to Product[0] -> total discount = 176k + 50k = 226k
    fireEvent.click(screen.getByTestId('add-promo-product-0'));
    fireEvent.click(await screen.findByTestId('promotion-option-25'));

    expect(await screen.findByTestId('promo-badge-product-0')).toHaveTextContent('-50.000đ');
    expect(screen.getByTestId('receipt-promotion-row')).toHaveTextContent('-226.000đ');
    expect(screen.getByTestId('receipt-promotion-row')).toHaveTextContent('2 ưu đãi');

    // 3. Clearing service promo preserves product promo
    fireEvent.click(screen.getByTestId('clear-promo-service'));
    await waitFor(() => {
      expect(screen.queryByTestId('promo-badge-service')).toBeNull();
    });
    expect(screen.getByTestId('promo-badge-product-0')).toHaveTextContent('-50.000đ');
    expect(screen.getByTestId('receipt-promotion-row')).toHaveTextContent('-50.000đ');
  });

  it('hides + Khuyến mãi button on 0đ redeemed combo service while showing it on chargeable upsell product', async () => {
    vi.spyOn(apiClient.ios, 'getPromotions').mockResolvedValue({
      success: true,
      canViewGlobalPromotions: true,
      count: 1,
      promotions: [PROMO_PRODUCT_10_CREDIT_OK],
    });

    render(
      <Screen12CheckoutBilling
        booking={makeBooking({
          comboLiveStatus: {
            isComboLive: true,
            comboName: 'HyperLight 4X 880',
            remainingSessions: 5,
            upsellOpportunity: false,
          },
          comboRedemption: {
            comboName: 'HyperLight 4X 880',
            deductedBucket: 'paidNew',
            typeConversionSurcharge: 0,
            upgradeVolumeSurcharge: 0,
            totalCustomerPayToday: 0,
            recognizedRevenueToday: 770000,
            remainingAfterToday: 4,
            explanation: 'Trừ 1 lượt gói Combo',
            totalSessions: 10,
            paidRemaining: 4,
            bonusRemaining: 0,
          },
          cartProducts: [{ productId: 901, productName: 'Serum Dưỡng Mi', price: 500000, quantity: 1 }],
        })}
        actor={{ staffId: 37790, name: 'Diễm Hương', tier: 'CC', badgeLabel: 'CC' }}
        onBack={vi.fn()}
        onChoosePayment={vi.fn()}
      />
    );

    expect(await screen.findByTestId('add-promo-product-0')).toBeInTheDocument();
    expect(screen.queryByTestId('add-promo-service')).toBeNull();
  });

  it('preloads attached booking promotion & renders discount on Screen14ThermalReceiptDone and ESC/POS receipt', async () => {
    vi.spyOn(apiClient.ios, 'getPromotions').mockResolvedValue({
      success: true,
      promotions: [PROMO_20_NO_CREDIT],
    });

    const bookingWithPromo = makeBooking({
      promotionId: PROMO_20_NO_CREDIT.promotionId,
      appliedPromotion: PROMO_20_NO_CREDIT,
      billing: {
        paymentMethod: 'VIETQR',
        subtotal: 880000,
        serviceTotal: 880000,
        productTotal: 0,
        promotionId: PROMO_20_NO_CREDIT.promotionId,
        promotionName: PROMO_20_NO_CREDIT.name,
        promotionDiscountAmount: 176000,
        vatRate: 0.08,
        vatAmount: 56320,
        tipAmount: 0,
        tipCvShare: 0,
        tipCcShare: 0,
        grandTotal: 760320,
      },
    });

    render(<Screen12CheckoutBilling booking={bookingWithPromo} onBack={vi.fn()} onChoosePayment={vi.fn()} />);

    const receiptPromo = await screen.findByTestId('receipt-promotion-row');
    expect(receiptPromo).toHaveTextContent('-176.000đ');

    render(<Screen14ThermalReceiptDone booking={bookingWithPromo} onFinishOrder={vi.fn()} />);
    const thermalRow = screen.getByTestId('thermal-receipt-promotion-row');
    expect(thermalRow).toHaveTextContent('Giảm 20% Dịch Vụ Mi');
    expect(thermalRow).toHaveTextContent('-176.000 đ');

    const bytes = thermalPrinterService.generateEscPosCommands({
      orderId: 340555,
      customerName: 'Chi Lan Anh',
      staffName: 'Diem Huong',
      storeName: 'CN De Tham',
      storeAddress: '159A De Tham',
      storePhone: '0909',
      dateStr: '14/11/2026',
      services: [{ name: 'HyperLight 4X 880', price: 880000 }],
      subtotal: 880000,
      discount: 176000,
      promotionName: 'Giam 20% Dich Vu Mi',
      tipAmount: 0,
      total: 760320,
      paymentMethod: 'VIETQR',
    });
    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toContain('Khuyen mai (Giam 20% Dich Vu Mi): -176.000d');
  });
});
