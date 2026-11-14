import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Screen11ProductUpsell } from '../Screen11ProductUpsell';
import { Screen12CheckoutBilling } from '../Screen12CheckoutBilling';
import type { BookingItem } from '../../../state/mockData';
import { SERUM_TIERS_CVL } from '../../../state/mockData';
import { apiClient } from '~/lib/api-client';

vi.mock('../../../../../context/ThemeContext', () => ({
  useTheme: () => ({ themeMode: 'light', setThemeMode: vi.fn(), toggleTheme: vi.fn() }),
}));

vi.mock('~/lib/api-client', () => ({
  apiClient: {
    ios: {
      getPromotions: vi.fn().mockResolvedValue({ success: true, promotions: [] }),
      scanProduct: vi.fn(),
    },
  },
}));

function makeBaseBooking(overrides?: Partial<BookingItem>): BookingItem {
  return {
    id: 339999,
    orderNumber: '#BK-339999',
    customerName: 'Chị Trang',
    customerPhone: '0909.888.777',
    customerVisits: 2,
    serviceName: '❖ Classic 1D 340K',
    servicePrice: 340000,
    serviceType: 'Normal',
    bookingTime: '14:00',
    branchCode: 'DT',
    status: 'SERVICING',
    orderState: 'Servicing',
    assignedStaffId: 46272,
    assignedStaffName: 'Thảo Ly',
    assignedStaffTier: 'CVL',
    checkInStaffId: 46272,
    checkInStaffName: 'Thảo Ly',
    checkOutStaffId: 46272,
    checkOutStaffName: 'Thảo Ly',
    attributes: {
      material: 'Classic',
      count: '1D',
      volume: '340K',
      style: 'Natural',
      curl: 'C',
      thickness: '0.15',
      length: '10',
    },
    cartProducts: [],
    selectedCombo: null,
    selectedUnderCombo: null,
    comboRedemption: null,
    diamondBalance: 0,
    ...overrides,
  } as BookingItem;
}

describe('iPhone Per-Bottle QR Scan & Checkout Serial Chips Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Screen11ProductUpsell adds sticks via 1-step continuous QR scan (no manual +/-) + deletes exact #serial + hydrates on Back', async () => {
    const mockedScan = vi.mocked(apiClient.ios.scanProduct);
    mockedScan
      .mockResolvedValueOnce({
        success: true,
        product: {
          productId: 36,
          productSku: 'YEPPEUM-01',
          productName: 'Dưỡng Mi Yeppeum Korea (Giá gốc 1.100.000đ)',
          unitPrice: 1100000,
          cvBonus: 100000,
          inventoryItemId: 501,
          inventoryWarehouseId: 12,
          clientStoreId: 6,
          storeName: 'Wings Điện Biên Phủ',
          scannedUnit: {
            inventoryWarehouseItemId: 8001,
            firstInventoryWarehouseOrderItemId: 1045,
            scanCode: 'QR-YEP-8001',
          },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        product: {
          productId: 36,
          productSku: 'YEPPEUM-01',
          productName: 'Dưỡng Mi Yeppeum Korea',
          unitPrice: 1100000,
          cvBonus: 100000,
          inventoryItemId: 501,
          inventoryWarehouseId: 12,
          clientStoreId: 6,
          storeName: 'Wings Điện Biên Phủ',
          scannedUnit: {
            inventoryWarehouseItemId: 8002,
            firstInventoryWarehouseOrderItemId: 1046,
            scanCode: 'QR-YEP-8002',
          },
        },
      });

    const onGoToBilling = vi.fn();
    const onUpdateCartProducts = vi.fn();
    const booking = makeBaseBooking();

    const { rerender } = render(
      <Screen11ProductUpsell
        booking={booking}
        actor={{ staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' }}
        onBack={vi.fn()}
        onUpdateCartProducts={onUpdateCartProducts}
        onGoToBilling={onGoToBilling}
      />
    );

    const scanBtn = screen.getByTestId('upsell-serum-scan-qr-btn');
    expect(scanBtn.className).toContain('min-h-[46px]');
    fireEvent.click(scanBtn);

    // Scanner modal stays open across continuous scans
    const input = screen.getByTestId('qr-manual-code-input');
    fireEvent.change(input, { target: { value: 'QR-YEP-8001' } });
    fireEvent.click(screen.getByTestId('qr-manual-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('qr-scan-success-banner')).toHaveTextContent('Đã thêm Dưỡng Mi Yeppeum Korea · #1045');
    });
    expect(screen.getByTestId('product-qr-scanner-modal')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('qr-manual-code-input'), { target: { value: '1046' } });
    fireEvent.click(screen.getByTestId('qr-manual-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('qr-scan-success-banner')).toHaveTextContent('Đã thêm Dưỡng Mi Yeppeum Korea · #1046');
    });

    fireEvent.click(screen.getByTestId('qr-scanner-done-btn'));
    expect(screen.queryByTestId('product-qr-scanner-modal')).not.toBeInTheDocument();

    expect(screen.getByText('Đã chọn ×2')).toBeInTheDocument();
    expect(screen.getByText('2 cây đã gắn tem kho')).toBeInTheDocument();
    expect(screen.getByTestId('upsell-serial-chip-8001')).toHaveTextContent('#1045');
    expect(screen.getByTestId('upsell-serial-chip-8002')).toHaveTextContent('#1046');
    expect(screen.queryByText(/Giá gốc 1\.100\.000đ/i)).not.toBeInTheDocument();

    // Remove first scanned unit (#1045) -> leaves #1046 (1 stick)
    fireEvent.click(screen.getByTestId('upsell-serial-chip-8001'));
    expect(screen.queryByTestId('upsell-serial-chip-8001')).not.toBeInTheDocument();
    expect(screen.getByTestId('upsell-serial-chip-8002')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /CHỐT ĐƠN & THANH TOÁN/i }));
    expect(onGoToBilling).toHaveBeenCalledTimes(1);
    const payload = onGoToBilling.mock.calls[0][0];
    expect(payload.cartProducts).toHaveLength(1);
    expect(payload.cartProducts[0]).toMatchObject({
      productId: 36,
      productName: 'Dưỡng Mi Yeppeum Korea',
      price: 1100000,
      quantity: 1,
      scannedUnits: [
        {
          inventoryWarehouseItemId: 8002,
          firstInventoryWarehouseOrderItemId: 1046,
          scanCode: 'QR-YEP-8002',
        },
      ],
    });

    // Hydrates scanned units & tier when navigating Back from Checkout
    const lightTier = SERUM_TIERS_CVL[1];
    const revisitedBooking = makeBaseBooking({
      cartProducts: [
        {
          productId: 36,
          productName: `Dưỡng Mi Yeppeum Korea (${lightTier.label})`,
          price: lightTier.price,
          quantity: 1,
          cvBonus: lightTier.cvBonus,
          scannedUnits: [
            {
              inventoryWarehouseItemId: 8002,
              firstInventoryWarehouseOrderItemId: 1046,
              scanCode: 'QR-YEP-8002',
            },
          ],
        },
      ],
    });
    rerender(
      <Screen11ProductUpsell
        booking={revisitedBooking}
        actor={{ staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' }}
        onBack={vi.fn()}
        onGoToBilling={onGoToBilling}
      />
    );
    expect(screen.getByText('1 cây đã gắn tem kho')).toBeInTheDocument();
    expect(screen.getByTestId('upsell-serial-chip-8002')).toHaveTextContent('#1046');
  });

  it('Screen12CheckoutBilling scans retail/serum QR inline, rejects invalid QR errors cleanly, and deletes exact #serial chips', async () => {
    const mockedScan = vi.mocked(apiClient.ios.scanProduct);
    mockedScan
      .mockResolvedValueOnce({
        success: false,
        error: 'Tem #999 thuộc kho Wings Quận 3, không thuộc kho chi nhánh của đơn hiện tại.',
      })
      .mockResolvedValueOnce({
        success: true,
        product: {
          productId: 36,
          productSku: 'YEPPEUM-01',
          productName: 'Dưỡng Mi Yeppeum Korea',
          unitPrice: 1100000,
          cvBonus: 100000,
          inventoryItemId: 501,
          inventoryWarehouseId: 12,
          clientStoreId: 6,
          storeName: 'Wings Điện Biên Phủ',
          scannedUnit: {
            inventoryWarehouseItemId: 8101,
            firstInventoryWarehouseOrderItemId: 2001,
            scanCode: 'QR-YEP-8101',
          },
        },
      });

    const onUpdateCartProducts = vi.fn();
    const booking = makeBaseBooking();

    render(
      <Screen12CheckoutBilling
        booking={booking}
        actor={{ staffId: 46272, name: 'Thảo Ly', tier: 'CVL', badgeLabel: 'CVL' }}
        onBack={vi.fn()}
        onChoosePayment={vi.fn()}
        onUpdateCartProducts={onUpdateCartProducts}
      />
    );

    await Promise.resolve();

    const quickScanBtn = screen.getByTestId('checkout-quick-scan-qr-btn');
    expect(quickScanBtn.className).toContain('min-h-[44px]');
    fireEvent.click(quickScanBtn);

    // Invalid branch QR shows clear error banner inside scanner without closing
    fireEvent.change(screen.getByTestId('qr-manual-code-input'), { target: { value: '999' } });
    fireEvent.click(screen.getByTestId('qr-manual-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('qr-scan-error-banner')).toHaveTextContent('thuộc kho Wings Quận 3');
    });

    // Valid QR succeeds and adds to cart
    fireEvent.change(screen.getByTestId('qr-manual-code-input'), { target: { value: 'QR-YEP-8101' } });
    fireEvent.click(screen.getByTestId('qr-manual-submit-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('qr-scan-success-banner')).toHaveTextContent('#2001');
    });

    fireEvent.click(screen.getByTestId('qr-scanner-done-btn'));

    expect(onUpdateCartProducts).toHaveBeenLastCalledWith([
      expect.objectContaining({
        productId: 36,
        productName: 'Dưỡng Mi Yeppeum Korea',
        price: 1100000,
        quantity: 1,
        scannedUnits: [
          {
            inventoryWarehouseItemId: 8101,
            firstInventoryWarehouseOrderItemId: 2001,
            scanCode: 'QR-YEP-8101',
          },
        ],
      }),
    ]);

    expect(screen.getByText('Dưỡng Mi Yeppeum Korea')).toBeInTheDocument();
    expect(screen.getByText('1.440.000đ')).toBeInTheDocument();
    expect(screen.getAllByText('1.555.200đ').length).toBeGreaterThanOrEqual(1);

    // Clicking the #2001 serial chip removes that exact stick
    fireEvent.click(screen.getByTestId('checkout-serial-chip-8101'));
    expect(onUpdateCartProducts).toHaveBeenLastCalledWith([]);
  });
});
