import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getVietnamDateYmd } from '@mos-lab/shared';
import { apiClient } from '~/lib/api-client';
import { Screen12CheckoutBilling } from '../Screen12CheckoutBilling';
import { Screen14ThermalReceiptDone } from '../Screen14ThermalReceiptDone';
import { PreCheckoutStatusCard } from '../consultation/PreCheckoutStatusCard';
import type { BookingItem } from '../../../state/mockData';

function makeBooking(overrides: Partial<BookingItem> = {}): BookingItem {
  const today = getVietnamDateYmd();
  return {
    id: 341255,
    orderNumber: 'BK-341255',
    storeId: 6,
    branchCode: 'DT',
    bookingDateYmd: today,
    customerId: 9255,
    customerName: 'Chị Linh',
    customerPhone: '0909555666',
    customerVisits: 3,
    customerNote: '',
    diamondBalance: 0,
    timeSlot: '14:00 - 15:30',
    serviceName: 'HyperLight 4X 880',
    servicePrice: 880000,
    serviceDuration: 90,
    serviceType: 'Normal',
    assignedStaffId: 13783,
    assignedStaffName: 'Thục Nghi',
    checkInStaffId: 13783,
    checkInStaffName: 'Thục Nghi',
    checkOutStaffId: 13783,
    checkOutStaffName: 'Thục Nghi',
    status: 'SERVICING',
    attributes: {
      material: 'HyperLight',
      volume: '4X',
      count: '70 fan',
      style: 'Natural',
      curl: 'C',
      length: '10-12mm',
      thickness: '0.05',
    },
    cartProducts: [],
    ...overrides,
  };
}

describe('MOS-BUG-255: Separate Service/Tip VietQR, Pre-Checkout Payment & Post-Checkout Tip QR', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(apiClient.ios, 'getPromotions').mockResolvedValue({
      success: true,
      canViewGlobalPromotions: true,
      count: 0,
      promotions: [],
    });
    vi.spyOn(apiClient.ios, 'listCheckoutEligibleStaff').mockResolvedValue({
      success: true,
      staff: [{ staffId: 13783, name: 'Thục Nghi', tier: 'CVL', storeId: 6, branchCode: 'DT' }],
    });
  });

  it('splits Checkout VietQR into separate Service QR and Tip QR codes and preserves both proofs', () => {
    const onChoosePayment = vi.fn();
    // 880,000 + 8% VAT = 950,400đ; add 100,000đ tip -> 1,050,400đ total
    render(
      <Screen12CheckoutBilling
        booking={makeBooking({
          billing: {
            subtotal: 880000,
            serviceTotal: 880000,
            productTotal: 0,
            paymentMethod: 'VIETQR',
            tipAmount: 100000,
            tipCvShare: 70000,
            tipCcShare: 20000,
            transferProofPhoto: 'data:image/jpeg;base64,svc-proof',
            tipTransferProofPhoto: 'data:image/jpeg;base64,tip-proof',
            grandTotal: 1050400,
          },
        })}
        onBack={() => {}}
        onChoosePayment={onChoosePayment}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Mở Mã QR Thanh Toán/i }));
    // Switch to Split 2 QR mode
    fireEvent.click(screen.getByTestId('qr-mode-separate-btn'));

    expect(screen.getByTestId('vietqr-split-cards')).toBeInTheDocument();
    expect(screen.getByText('950.400 VNĐ')).toBeInTheDocument();
    expect(screen.getByText('100.000 VNĐ')).toBeInTheDocument();
    expect(screen.getByText('DT 341255 DV')).toBeInTheDocument();
    expect(screen.getByText('DT 341255 TIP 100K')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /✓ ĐÃ NHẬN TIỀN THÀNH CÔNG/i }));
    fireEvent.click(screen.getByRole('button', { name: /Khách không dùng Zalo \/ Bỏ qua/i }));

    expect(onChoosePayment).toHaveBeenCalledTimes(1);
    const [method, tipAmt, , proofPhoto, , extra] = onChoosePayment.mock.calls[0];
    expect(method).toBe('VIETQR');
    expect(tipAmt).toBe(100000);
    expect(proofPhoto).toBe('data:image/jpeg;base64,svc-proof');
    expect(extra.tipTransferProofPhoto).toBe('data:image/jpeg;base64,tip-proof');
    expect(extra.qrSplitTipSeparate).toBe(true);
  });

  it('allows entering pre-checkout service + tip with split 2 QRs right after consultation', async () => {
    const onSavePreCheckout = vi.fn().mockResolvedValue(undefined);
    render(
      <PreCheckoutStatusCard
        isDark={false}
        booking={makeBooking({ status: 'CHECKED_IN' })}
        quotedServiceTotalWithVat={950400}
        onSavePreCheckoutPayment={onSavePreCheckout}
      />
    );

    fireEvent.click(screen.getByTestId('open-pre-checkout-payment-btn'));
    fireEvent.click(screen.getByTestId('precheckout-tip-100000'));
    fireEvent.click(screen.getByTestId('precheckout-qr-separate-btn'));

    expect(screen.getByTestId('precheckout-split-qr-grid')).toBeInTheDocument();
    expect(screen.getByText('DT 341255 DV')).toBeInTheDocument();
    expect(screen.getByText('DT 341255 TIP 100K')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('save-pre-checkout-payment-btn'));
    await waitFor(() => expect(onSavePreCheckout).toHaveBeenCalledTimes(1));

    expect(onSavePreCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        preCheckoutServicePaidAmount: 950400,
        preCheckoutTipAmount: 100000,
        preCheckoutPaymentMethod: 'VIETQR',
        preCheckoutQrSplitMode: 'SEPARATE',
        preCheckoutPaymentBreakdown: { vietqrAmount: 1050400, posAmount: 0, cashAmount: 0 },
      })
    );
  });

  it('deducts pre-checkout paid service + tip at Screen12CheckoutBilling so fully prepaid customers pay 0đ at checkout', () => {
    const onChoosePayment = vi.fn();
    render(
      <Screen12CheckoutBilling
        booking={makeBooking({
          billing: {
            subtotal: 880000,
            serviceTotal: 880000,
            productTotal: 0,
            paymentMethod: 'VIETQR',
            tipAmount: 100000,
            tipCvShare: 70000,
            tipCcShare: 20000,
            preCheckoutServicePaidAmount: 950400,
            preCheckoutTipAmount: 100000,
            preCheckoutPaymentMethod: 'VIETQR',
            preCheckoutPaymentBreakdown: { vietqrAmount: 1050400, posAmount: 0, cashAmount: 0 },
            grandTotal: 1050400,
          },
        })}
        onBack={() => {}}
        onChoosePayment={onChoosePayment}
      />
    );

    const summary = screen.getByTestId('receipt-precheckout-summary');
    expect(summary).toHaveTextContent('-1.050.400đ');
    expect(summary).toHaveTextContent('CÒN PHẢI THU TẠI CHECKOUT:');
    expect(summary).toHaveTextContent('0đ');

    fireEvent.click(screen.getByRole('button', { name: /Xác Nhận Hoàn Tất & Xuất Hóa Đơn/i }));
    fireEvent.click(screen.getByRole('button', { name: /Khách không dùng Zalo \/ Bỏ qua/i }));

    expect(onChoosePayment).toHaveBeenCalledTimes(1);
    expect(onChoosePayment.mock.calls[0][5].paymentBreakdown).toEqual({
      vietqrAmount: 1050400,
      posAmount: 0,
      cashAmount: 0,
    });
  });

  it('generates pure Tip QR code when customer already prepaid service and adds Tip at Checkout', () => {
    render(
      <Screen12CheckoutBilling
        booking={makeBooking({
          billing: {
            subtotal: 880000,
            serviceTotal: 880000,
            productTotal: 0,
            paymentMethod: 'VIETQR',
            tipAmount: 0,
            tipCvShare: 0,
            tipCcShare: 0,
            preCheckoutServicePaidAmount: 950400,
            preCheckoutTipAmount: 0,
            preCheckoutPaymentMethod: 'VIETQR',
            preCheckoutPaymentBreakdown: { vietqrAmount: 950400, posAmount: 0, cashAmount: 0 },
            grandTotal: 950400,
          },
        })}
        onBack={() => {}}
        onChoosePayment={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '100K' }));
    expect(screen.getByTestId('receipt-precheckout-summary')).toHaveTextContent('100.000đ');

    fireEvent.click(screen.getByRole('button', { name: /Mở Mã QR Thanh Toán/i }));
    expect(screen.getByText('♥ QR TIỀN TIP CHUYÊN VIÊN')).toBeInTheDocument();
    expect(screen.getByText('DT 341255 TIP 100K')).toBeInTheDocument();
    expect(screen.getByText('100.000 VNĐ')).toBeInTheDocument();
  });

  it('supports adding post-checkout tip with dedicated Tip QR on DONE booking', async () => {
    const execSpy = vi.spyOn(apiClient.ios, 'executeBookingAction').mockResolvedValue({ success: true });
    const ownerCvl = { staffId: 13783, name: 'Thục Nghi', tier: 'CVL' as const, badgeLabel: 'CVL' };

    render(
      <Screen14ThermalReceiptDone
        booking={makeBooking({
          status: 'DONE',
          billing: {
            subtotal: 880000,
            vatRate: 0.08,
            vatAmount: 70400,
            serviceTotal: 880000,
            productTotal: 0,
            paymentMethod: 'VIETQR',
            paymentBreakdown: { vietqrAmount: 950400, posAmount: 0, cashAmount: 0 },
            settlementStatus: 'SETTLED_COMPLETED',
            tipAmount: 0,
            tipCvShare: 0,
            tipCcShare: 0,
            diamondUsed: 0,
            diamondDiscountAmount: 0,
            grandTotal: 950400,
          },
        })}
        actor={ownerCvl}
        onFinishOrder={vi.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('open-post-checkout-tip-qr-btn'));
    const customTipInput = await screen.findByTestId('post-checkout-tip-custom-input');
    fireEvent.change(customTipInput, { target: { value: '300000' } });

    const qrBtn = screen.getByTestId('post-checkout-open-qr-btn');
    expect(qrBtn).toHaveTextContent('Mở Mã QR Tiền Tip (300.000đ)');
    fireEvent.click(qrBtn);

    expect(screen.getByText('♥ QR TIỀN TIP CHUYÊN VIÊN')).toBeInTheDocument();
    expect(screen.getByText('DT 341255 TIP 300K')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /‹ Đóng \/ Đổi hình thức thanh toán khác/i }));
    fireEvent.click(screen.getByTestId('post-checkout-submit-btn'));

    await waitFor(() => expect(execSpy).toHaveBeenCalledTimes(1));
    expect(execSpy.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        bookingId: 341255,
        action: 'SUBMIT_POST_CHECKOUT_ADJUSTMENT',
        tipAmount: 300000,
        deltaPaymentMethod: 'VIETQR',
      })
    );
  });
});
