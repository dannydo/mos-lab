'use client';

import React from 'react';
import type { IosPromotionOption, IosScannedProductCatalogMatch } from '@mos-lab/shared';
import type { BookingItem } from '../../../state/mockData';
import type { IosCloudSyncStatus } from '../../ui-kit/IosCloudSyncBadge';
import type { ReceiptPromotionOpenTarget } from './CheckoutReceiptSection';
import { CheckoutVietQrModal } from './CheckoutVietQrModal';
import { CheckoutZaloConsentModal } from './CheckoutZaloConsentModal';
import { CheckoutPromotionPickerModal } from './CheckoutPromotionPickerModal';
import { ProductQrScannerModal } from '../../modals/ProductQrScannerModal';

export interface CheckoutBillingOverlaysProps {
  isDark: boolean;
  booking?: BookingItem;
  customerName: string;
  customerPhone: string;
  branchCode: string;
  isQrModalOpen: boolean;
  onCloseQrModal: () => void;
  vietQrUrl: string;
  qrTransferContent: string;
  vietQrTransferAmount: number;
  totalBillGrandTotal?: number;
  copySuccess: string | null;
  onCopyToClipboard: (text: string, label: string) => void;
  transferProofPhoto: string | null;
  proofCloudSyncStatus: IosCloudSyncStatus;
  onTriggerFilePicker: () => void;
  onConfirmQrPaid: () => void;
  isZaloModalOpen: boolean;
  zaloPhone: string;
  onSetZaloPhone: (phone: string) => void;
  isSendingZalo: boolean;
  isZaloSentSuccess: boolean;
  onConfirmZaloSend: () => void;
  onSkipZalo: () => void;
  promoPickerTarget: ReceiptPromotionOpenTarget | null;
  onClosePromoPicker: () => void;
  promotions: IosPromotionOption[];
  isPromotionsLoading: boolean;
  promotionsError: string | null;
  effectiveServiceCharge: number;
  upgradePrice: number;
  comboTotal: number;
  productTotal: number;
  vatRate: number;
  onSelectPromotion: (promo: IosPromotionOption | null, target: ReceiptPromotionOpenTarget) => void;
  isProductQrScannerOpen: boolean;
  onCloseProductQrScanner: () => void;
  cartProducts: NonNullable<BookingItem['cartProducts']>;
  onScannedProduct: (scanned: IosScannedProductCatalogMatch) => void;
  onRemoveScannedUnit: (productIndex: number, inventoryWarehouseItemId?: number) => void;
}

export function CheckoutBillingOverlays({
  isDark,
  booking,
  customerName,
  customerPhone,
  branchCode,
  isQrModalOpen,
  onCloseQrModal,
  vietQrUrl,
  qrTransferContent,
  vietQrTransferAmount,
  totalBillGrandTotal,
  copySuccess,
  onCopyToClipboard,
  transferProofPhoto,
  proofCloudSyncStatus,
  onTriggerFilePicker,
  onConfirmQrPaid,
  isZaloModalOpen,
  zaloPhone,
  onSetZaloPhone,
  isSendingZalo,
  isZaloSentSuccess,
  onConfirmZaloSend,
  onSkipZalo,
  promoPickerTarget,
  onClosePromoPicker,
  promotions,
  isPromotionsLoading,
  promotionsError,
  effectiveServiceCharge,
  upgradePrice,
  comboTotal,
  productTotal,
  vatRate,
  onSelectPromotion,
  isProductQrScannerOpen,
  onCloseProductQrScanner,
  cartProducts,
  onScannedProduct,
  onRemoveScannedUnit,
}: CheckoutBillingOverlaysProps) {
  return (
    <>
      <CheckoutVietQrModal
        open={isQrModalOpen}
        isDark={isDark}
        branchCode={branchCode}
        vietQrUrl={vietQrUrl}
        qrTransferContent={qrTransferContent}
        finalGrandTotal={vietQrTransferAmount}
        totalBillGrandTotal={totalBillGrandTotal}
        copySuccess={copySuccess}
        onCopyToClipboard={onCopyToClipboard}
        transferProofPhoto={transferProofPhoto}
        proofCloudSyncStatus={proofCloudSyncStatus}
        onTriggerFilePicker={onTriggerFilePicker}
        onConfirmQrPaid={onConfirmQrPaid}
        onClose={onCloseQrModal}
      />

      <CheckoutZaloConsentModal
        open={isZaloModalOpen}
        isDark={isDark}
        customerName={customerName}
        customerPhone={customerPhone}
        zaloPhone={zaloPhone}
        onSetZaloPhone={onSetZaloPhone}
        isSendingZalo={isSendingZalo}
        isZaloSentSuccess={isZaloSentSuccess}
        onConfirmZaloSend={onConfirmZaloSend}
        onSkipZalo={onSkipZalo}
      />

      <CheckoutPromotionPickerModal
        open={promoPickerTarget !== null}
        isDark={isDark}
        promotions={promotions}
        isLoading={isPromotionsLoading}
        error={promotionsError}
        selectedPromotionId={promoPickerTarget?.currentPromo?.promotionId ?? null}
        targetScope={promoPickerTarget?.scope}
        targetLabel={promoPickerTarget?.label}
        targetAmount={promoPickerTarget?.amount}
        customerVisits={booking?.customerVisits ?? 1}
        serviceAmount={effectiveServiceCharge}
        upgradeAmount={upgradePrice}
        comboAmount={comboTotal}
        productAmount={productTotal}
        vatRate={vatRate}
        onSelectPromotion={(promo) => {
          if (promoPickerTarget) {
            onSelectPromotion(promo, promoPickerTarget);
          }
          onClosePromoPicker();
        }}
        onClose={onClosePromoPicker}
      />

      <ProductQrScannerModal
        open={isProductQrScannerOpen}
        isDark={isDark}
        bookingId={Number(booking?.id || 0)}
        cartProducts={cartProducts}
        onScannedProduct={onScannedProduct}
        onRemoveUnit={onRemoveScannedUnit}
        onClose={onCloseProductQrScanner}
      />
    </>
  );
}
