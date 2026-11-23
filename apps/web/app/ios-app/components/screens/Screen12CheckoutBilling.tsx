'use client';

import React from 'react';
import {
  canDirectlySettleCounterPayment,
  type IosPaymentBreakdown,
  type IosPaymentMethod,
  type IosPromotionOption,
} from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { IosStaffVisibilityToggle } from '../ui-kit/IosStaffVisibilityToggle';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { CheckoutComboWalletCard, type SelectComboWalletHandler } from './checkout/CheckoutComboWalletCard';
import type { CvToCvPlusRequirements, SavePromotionTarget } from '../../state/useIosBillingCheckout';
import { CheckoutReceiptSection } from './checkout/CheckoutReceiptSection';
import { CheckoutTipAndDiamondSection } from './checkout/CheckoutTipAndDiamondSection';
import { CheckoutPaymentMethodSection } from './checkout/CheckoutPaymentMethodSection';
import { CheckoutBillingOverlays } from './checkout/CheckoutBillingOverlays';
import { CheckoutStatusBanners } from './checkout/CheckoutStatusBanners';
import { useCheckoutBillingState } from './checkout/useCheckoutBillingState';

interface Screen12CheckoutBillingProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  cvPlusRules?: Partial<CvToCvPlusRequirements>;
  pendingReferral?: { referrerUserId: number; referrerName: string; referrerPhone: string } | null;
  onBack: () => void;
  onChoosePayment: (
    method: IosPaymentMethod,
    tipAmount?: number,
    diamondUsed?: number,
    proofPhoto?: string,
    zaloConsent?: {
      agreed: boolean;
      phone: string;
      sentAt?: string;
      voucherCode?: string;
    },
    promotionSelection?: {
      promotionId?: number | null;
      appliedPromotion?: IosPromotionOption | null;
      servicePromotionId?: number | null;
      servicePromotion?: IosPromotionOption | null;
      comboPromotionId?: number | null;
      comboPromotion?: IosPromotionOption | null;
      underComboPromotionId?: number | null;
      underComboPromotion?: IosPromotionOption | null;
      cartProducts?: BookingItem['cartProducts'];
      paymentBreakdown?: IosPaymentBreakdown;
      tipTransferProofPhoto?: string;
      qrSplitTipSeparate?: boolean;
    }
  ) => void;
  onSavePromotion?: (promotion: IosPromotionOption | null, target?: SavePromotionTarget) => void;
  onUpdateCartProducts?: (cartProducts: NonNullable<BookingItem['cartProducts']>) => void;
  onSelectComboWallet?: SelectComboWalletHandler;
  onUpdateCombos?: (payload: {
    selectedCombo: BookingItem['selectedCombo'];
    selectedUnderCombo: BookingItem['selectedUnderCombo'];
    comboRedemption?: BookingItem['comboRedemption'];
  }) => void;
  onEditService?: () => void;
}

export function Screen12CheckoutBilling({
  booking,
  actor,
  cvPlusRules,
  onBack,
  onChoosePayment,
  onSavePromotion,
  onUpdateCartProducts,
  onSelectComboWallet,
  onUpdateCombos,
  onEditService,
}: Screen12CheckoutBillingProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const {
    selectedMethod,
    setSelectedMethod,
    isSplitPaymentMode,
    setIsSplitPaymentMode,
    setCustomPaymentSplit,
    tipAmount,
    setTipAmount,
    activeTipPercent,
    setActiveTipPercent,
    isCustomTipOpen,
    setIsCustomTipOpen,
    customTipInput,
    setCustomTipInput,
    setDiamondUsed,
    showStaffRewards,
    setShowStaffRewards,
    isProductQrScannerOpen,
    setIsProductQrScannerOpen,
    isQrModalOpen,
    setIsQrModalOpen,
    isZaloModalOpen,
    zaloPhone,
    setZaloPhone,
    isSendingZalo,
    isZaloSentSuccess,
    copySuccess,
    transferProofPhoto,
    proofCloudSyncStatus,
    tipTransferProofPhoto,
    tipProofCloudSyncStatus,
    fileInputRef,
    tipFileInputRef,
    handleCaptureProof,
    handleCaptureTipProof,
    qrSplitMode,
    setQrSplitMode,
    customerName,
    customerPhone,
    assignedStaff,
    checkInStaff,
    checkOutStaff,
    serviceName,
    servicePrice,
    upgradePrice,
    resolvedWallets,
    comboSelection,
    selectedCombo,
    selectedUnderCombo,
    comboRedemption,
    bookingWithLocalSelections,
    isComboLive,
    effectiveServiceCharge,
    actorTipBreakdown,
    comboTotal,
    vatRate,
    servicePromo,
    rememberedServicePromo,
    cartProducts,
    promotions,
    isPromotionsLoading,
    promotionsError,
    promoPickerTarget,
    setPromoPickerTarget,
    applyPromoChange,
    handleOpenItemPromotionPicker,
    handleClearItemPromotion,
    promoBreakdown,
    appliedPromotionDisplayName,
    handleScannedProduct,
    handleRemoveScannedUnit,
    productTotal,
    subtotal,
    promotionDiscountAmount,
    vatAmount,
    isCheckoutStaffCc,
    comboTotalRevenue,
    dualComboBonus,
    totalComboBonus,
    hasBothCombos,
    customerDiamondBalance,
    isSettled,
    isCreditLockedByPromotion,
    hasPartialCreditRestriction,
    maxDiamondCanUse,
    effectiveDiamondUsed,
    diamondDiscountAmount,
    diamondRate,
    finalGrandTotal,
    preCheckoutSummary,
    amountDueAtCheckout,
    tipBaseAmount,
    percentTipSuggestions,
    effectivePaymentSplit,
    normalizedRemainingPayment,
    vietQrTransferAmount,
    qrInfo,
    branchCode,
    qrTransferContent,
    vietQrUrl,
    copyToClipboard,
    handleToggleSplitMode,
    handleProceed,
    handleConfirmQrPaid,
    handleConfirmZaloSend,
    handleSkipZalo,
  } = useCheckoutBillingState({
    booking,
    actor,
    cvPlusRules,
    onChoosePayment,
    onSavePromotion,
    onUpdateCartProducts,
    onUpdateCombos,
  });

  return (
    <div className={`flex-1 flex flex-col bg-[var(--background)] text-[var(--mos-text)] overflow-y-auto select-none`}>
      <IosNavigationBar
        title="Thanh Toán"
        onBack={onBack}
        backTitle={booking?.orderNumber || 'Order'}
        rightAction={
          <div className="flex items-center gap-1.5">
            <IosStaffVisibilityToggle
              showStaffRewards={showStaffRewards}
              onToggle={() => setShowStaffRewards((prev) => !prev)}
              isDark={isDark}
            />
            {isSettled ? (
              <span className="text-emerald-500 font-bold text-xs py-1 px-2.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                ✓ Đã chốt
              </span>
            ) : (
              <button
                onClick={handleProceed}
                className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60 cursor-pointer"
              >
                Chốt đơn
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 px-4 py-3 space-y-3.5 overflow-y-auto pb-6">
        <CheckoutStatusBanners
          isDark={isDark}
          isSettled={isSettled}
          showStaffRewards={showStaffRewards}
          isTrainingCvlOrder={booking?.isTrainingCvlOrder}
          actorTier={actor?.tier}
          assignedStaff={assignedStaff}
          trainingMentorName={booking?.trainingMentorName}
          dualComboTotalBonus={dualComboBonus.totalBonus}
        />

        <CheckoutComboWalletCard
          isDark={isDark}
          isSettled={isSettled}
          booking={booking}
          resolvedWallets={resolvedWallets}
          onSelectComboWallet={onSelectComboWallet}
        />

        <CheckoutReceiptSection
          isDark={isDark}
          booking={bookingWithLocalSelections}
          customerName={customerName}
          customerPhone={customerPhone}
          assignedStaff={assignedStaff}
          checkInStaff={checkInStaff}
          checkOutStaff={checkOutStaff}
          serviceName={serviceName}
          servicePrice={servicePrice}
          effectiveServiceCharge={effectiveServiceCharge}
          upgradePrice={upgradePrice}
          isComboLive={isComboLive}
          selectedCombo={selectedCombo}
          selectedUnderCombo={selectedUnderCombo}
          comboRedemption={comboRedemption}
          cartProducts={cartProducts}
          hasBothCombos={hasBothCombos}
          comboTotalRevenue={comboTotalRevenue}
          totalComboBonus={totalComboBonus}
          upperComboBonus={isCheckoutStaffCc ? 0 : dualComboBonus.upperBonus}
          underComboBonus={isCheckoutStaffCc ? 0 : dualComboBonus.underBonus}
          isCheckoutStaffCc={isCheckoutStaffCc}
          subtotal={subtotal}
          vatAmount={vatAmount}
          appliedPromotionName={appliedPromotionDisplayName}
          promotionDiscountAmount={promotionDiscountAmount}
          servicePromotion={servicePromo}
          serviceDiscountAmount={promoBreakdown.serviceDiscount}
          productDiscounts={promoBreakdown.productDiscounts}
          onOpenItemPromotionPicker={handleOpenItemPromotionPicker}
          onClearItemPromotion={handleClearItemPromotion}
          onRemoveScannedUnit={handleRemoveScannedUnit}
          onOpenProductQrScanner={() => setIsProductQrScannerOpen(true)}
          tipAmount={tipAmount}
          effectiveDiamondUsed={effectiveDiamondUsed}
          diamondDiscountAmount={diamondDiscountAmount}
          customerDiamondBalance={customerDiamondBalance}
          maxDiamondCanUse={maxDiamondCanUse}
          isSettled={isSettled}
          finalGrandTotal={finalGrandTotal}
          showStaffRewards={showStaffRewards}
          onToggleShowStaffRewards={() => setShowStaffRewards((prev) => !prev)}
          onEditService={isSettled ? undefined : onEditService}
          comboSelection={comboSelection}
          rememberedServicePromo={rememberedServicePromo}
        />

        <CheckoutTipAndDiamondSection
          isDark={isDark}
          tipAmount={tipAmount}
          onSetTipAmount={setTipAmount}
          activeTipPercent={activeTipPercent}
          onSetActiveTipPercent={setActiveTipPercent}
          isCustomTipOpen={isCustomTipOpen}
          onSetIsCustomTipOpen={setIsCustomTipOpen}
          customTipInput={customTipInput}
          onSetCustomTipInput={setCustomTipInput}
          percentTipSuggestions={percentTipSuggestions}
          tipBaseAmount={tipBaseAmount}
          showStaffRewards={showStaffRewards}
          actorTipBreakdown={actorTipBreakdown}
          customerDiamondBalance={customerDiamondBalance}
          maxDiamondCanUse={maxDiamondCanUse}
          effectiveDiamondUsed={effectiveDiamondUsed}
          diamondDiscountAmount={diamondDiscountAmount}
          diamondRate={diamondRate}
          onSetDiamondUsed={setDiamondUsed}
          isCreditLockedByPromotion={isCreditLockedByPromotion}
          hasPartialCreditRestriction={hasPartialCreditRestriction}
          isSettled={isSettled}
        />

        <CheckoutPaymentMethodSection
          isDark={isDark}
          showStaffRewards={showStaffRewards}
          canDirectCounterSettle={canDirectlySettleCounterPayment(actor?.tier)}
          selectedMethod={selectedMethod}
          onSelectMethod={(method) => {
            setSelectedMethod(method);
            setIsSplitPaymentMode(false);
          }}
          isSplitMode={isSplitPaymentMode}
          onToggleSplitMode={handleToggleSplitMode}
          paymentBreakdown={effectivePaymentSplit}
          onChangeSplitAmount={(channel, amount) => {
            const key = channel === 'VIETQR' ? 'vietqrAmount' : channel === 'POS' ? 'posAmount' : 'cashAmount';
            setCustomPaymentSplit((prev) => ({ ...prev, [key]: amount }));
          }}
          finalGrandTotal={amountDueAtCheckout}
          preCheckoutTotalPaid={preCheckoutSummary.preCheckoutTotalPaid}
          effectiveDiamondUsed={effectiveDiamondUsed}
          diamondDiscountAmount={diamondDiscountAmount}
          transferProofPhoto={transferProofPhoto}
          proofCloudSyncStatus={proofCloudSyncStatus}
          fileInputRef={fileInputRef}
          onCaptureProof={handleCaptureProof}
          onProceed={handleProceed}
          isSettled={isSettled}
        />
      </div>

      <CheckoutBillingOverlays
        isDark={isDark}
        booking={booking}
        customerName={customerName}
        customerPhone={customerPhone}
        branchCode={branchCode}
        isQrModalOpen={isQrModalOpen}
        onCloseQrModal={() => setIsQrModalOpen(false)}
        vietQrUrl={vietQrUrl}
        qrTransferContent={qrTransferContent}
        vietQrTransferAmount={vietQrTransferAmount}
        totalBillGrandTotal={normalizedRemainingPayment.isMixed ? amountDueAtCheckout : undefined}
        copySuccess={copySuccess}
        onCopyToClipboard={copyToClipboard}
        transferProofPhoto={transferProofPhoto}
        proofCloudSyncStatus={proofCloudSyncStatus}
        onTriggerFilePicker={() => fileInputRef.current?.click()}
        serviceQrAmount={qrInfo.serviceQrAmount}
        serviceQrUrl={qrInfo.serviceQrUrl}
        serviceQrContent={qrInfo.serviceQrContent}
        tipQrAmount={qrInfo.tipQrAmount}
        tipQrUrl={qrInfo.tipQrUrl}
        tipQrContent={qrInfo.tipQrContent}
        qrSplitMode={qrSplitMode}
        onChangeQrSplitMode={setQrSplitMode}
        tipTransferProofPhoto={tipTransferProofPhoto}
        tipProofCloudSyncStatus={tipProofCloudSyncStatus}
        onTriggerTipFilePicker={() => tipFileInputRef.current?.click()}
        onConfirmQrPaid={handleConfirmQrPaid}
        isZaloModalOpen={isZaloModalOpen}
        zaloPhone={zaloPhone}
        onSetZaloPhone={setZaloPhone}
        isSendingZalo={isSendingZalo}
        isZaloSentSuccess={isZaloSentSuccess}
        onConfirmZaloSend={handleConfirmZaloSend}
        onSkipZalo={handleSkipZalo}
        promoPickerTarget={promoPickerTarget}
        onClosePromoPicker={() => setPromoPickerTarget(null)}
        promotions={promotions}
        isPromotionsLoading={isPromotionsLoading}
        promotionsError={promotionsError}
        effectiveServiceCharge={effectiveServiceCharge}
        upgradePrice={upgradePrice}
        comboTotal={comboTotal}
        productTotal={productTotal}
        vatRate={vatRate}
        onSelectPromotion={(promo, target) => applyPromoChange(promo, target)}
        isProductQrScannerOpen={isProductQrScannerOpen}
        onCloseProductQrScanner={() => setIsProductQrScannerOpen(false)}
        cartProducts={cartProducts}
        onScannedProduct={handleScannedProduct}
        onRemoveScannedUnit={handleRemoveScannedUnit}
        comboSelection={comboSelection}
      />
      <input
        ref={tipFileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCaptureTipProof}
      />
    </div>
  );
}
