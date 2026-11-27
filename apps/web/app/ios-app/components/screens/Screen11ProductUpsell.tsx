'use client';

import React, { useState } from 'react';
import { isPureUnderLashServiceName } from '@mos-lab/shared';
import { Sparkles } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';
import { IosNavigationBar } from '../ui-kit/IosNavigationBar';
import { IosStaffVisibilityToggle } from '../ui-kit/IosStaffVisibilityToggle';
import { BookingItem } from '../../state/mockData';
import { ActiveActorProfile } from '../../state/useIosAppState';
import { UpsellHeaderAndSerumSection } from './upsell/UpsellHeaderAndSerumSection';
import { UpsellMainComboSelector } from './upsell/UpsellMainComboSelector';
import { UpsellUnderComboAndSummary } from './upsell/UpsellUnderComboAndSummary';
import { UpsellOverlays } from './upsell/UpsellOverlays';
import { type UpsellGoToBillingPayload, useUpsellScreenState } from './upsell/useUpsellScreenState';

interface Screen11ProductUpsellProps {
  booking?: BookingItem;
  actor?: ActiveActorProfile;
  isAdmin?: boolean;
  onRefreshDb?: () => Promise<any> | void;
  onBack: () => void;
  onUpdateCartProducts?: (cartProducts: NonNullable<BookingItem['cartProducts']>) => void;
  onSelectComboWallet?: (params: {
    targetBookingId?: number;
    selectedUpperComboBalanceId?: number | null;
    selectedUnderComboBalanceId?: number | null;
    skipUpperCombo?: boolean;
    skipUnderCombo?: boolean;
    comboRedemption?: BookingItem['comboRedemption'] | null;
  }) => void;
  onGoToBilling: (payload?: UpsellGoToBillingPayload) => void;
  onOpenAddUnderMink?: () => void;
}

export function Screen11ProductUpsell({
  booking,
  actor,
  isAdmin = false,
  onRefreshDb,
  onBack,
  onUpdateCartProducts,
  onSelectComboWallet,
  onGoToBilling,
  onOpenAddUnderMink,
}: Screen11ProductUpsellProps) {
  const { themeMode } = useTheme();
  const isDark = themeMode === 'dark';

  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [isConsultModalOpen, setIsConsultModalOpen] = useState<boolean>(false);
  const [isSerumInfoModalOpen, setIsSerumInfoModalOpen] = useState<boolean>(false);
  const [isLockedWelcomeModalOpen, setIsLockedWelcomeModalOpen] = useState<boolean>(false);

  const {
    isSettled,
    selectedSerumTierId,
    localCartProducts,
    yeppeumCount,
    resolvedWallets,
    autoMatched,
    activeCategoryId,
    activeVolume,
    setActiveCategoryAndVolume,
    familyInfo,
    isUpTierPackage,
    handleSelectFamilyCategory,
    welcomeEligibility,
    matchedPackages,
    isExistingComboLive,
    remainingSessions,
    activeBookingPromotion,
    showNewComboSection,
    setShowNewComboSection,
    selectedNewComboId,
    setSelectedNewComboId,
    showStaffRewards,
    setShowStaffRewards,
    currentCategory,
    selectedSerumTier,
    selectedNewComboPkg,
    servicePrice,
    serviceName,
    effectiveUpperSinglePrice,
    customerName,
    customerPhone,
    customerVisits,
    isNewClient,
    assignedStaffName,
    assignedStaffTier,
    actorName,
    purchaseAccounting,
    underLashPackages,
    selectedUnderComboId,
    setSelectedUnderComboId,
    selectedUnderComboPkg,
    comboExpiryState,
    simulateOnlyRefillLeft,
    setSimulateOnlyRefillLeft,
    redemptionAccounting,
    handleScannedProduct,
    handleRemoveScannedUnit,
    applySerumTierSelection,
    totals,
    handleCollapseNewComboSection,
    handleConfirmCheckout,
  } = useUpsellScreenState({
    booking,
    actor,
    onUpdateCartProducts,
    onGoToBilling,
  });

  const {
    isWalletModalOpen,
    setIsWalletModalOpen,
    existingUpperExpirySnapshot,
    existingUnderExpirySnapshot,
    upperTodayUsageMode,
    setUpperTodayUsageMode,
    underTodayUsageMode,
    todayServiceType,
    underServiceType,
    deductTodayIntoCombo,
    setDeductTodayIntoCombo,
    upperExpiryPreviewMap,
    underExpiryPreviewMap,
    selectedUpperExpiry,
    selectedUnderExpiry,
  } = comboExpiryState;

  const {
    serumTotal,
    serumBonus,
    newComboTotal,
    underComboTotal,
    totalComboPrice,
    totalComboBonus,
    hasBothCombos,
    upperComboStandaloneBonus,
    underComboStandaloneBonus,
    effectiveServiceChargeToday,
    subtotal,
  } = totals;

  return (
    <div className={`flex-1 flex flex-col bg-[var(--background)] text-[var(--mos-text)] overflow-y-auto select-none`}>
      <IosNavigationBar
        title="Dưỡng Mi & Combo"
        onBack={onBack}
        backTitle="Ảnh After"
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
                onClick={handleConfirmCheckout}
                className="text-[#FFB400] font-semibold text-base py-1 px-1 active:opacity-60 cursor-pointer"
              >
                Checkout
              </button>
            )}
          </div>
        }
      />

      <div className="flex-1 px-4 py-3 space-y-3 overflow-y-auto pb-6">
        {isSettled && (
          <div className="rounded-2xl border p-3 text-xs flex items-center gap-2.5 shadow-2xs bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-600/50 dark:text-emerald-200">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[14px]">🔒</span>
            <div className="leading-relaxed">
              <strong className="block text-[12px] font-bold">ĐƠN HÀNG ĐÃ CHỐT THANH TOÁN (COMPLETED)</strong>
              <span className="text-[11px] opacity-90">
                Mọi thông tin dịch vụ, combo và sản phẩm đã khóa sổ, không thể chỉnh sửa.
              </span>
            </div>
          </div>
        )}
        <UpsellHeaderAndSerumSection
          isDark={isDark}
          booking={booking}
          customerName={customerName}
          customerPhone={customerPhone}
          customerVisits={customerVisits}
          isNewClient={isNewClient}
          serviceName={serviceName}
          assignedStaffName={assignedStaffName}
          assignedStaffTier={assignedStaffTier}
          isExistingComboLive={isExistingComboLive}
          redemptionAccounting={redemptionAccounting}
          simulateOnlyRefillLeft={simulateOnlyRefillLeft}
          onToggleSimulateOnlyRefillLeft={() => setSimulateOnlyRefillLeft((v) => !v)}
          yeppeumCount={yeppeumCount}
          cartProducts={localCartProducts}
          onOpenQrScanner={() => setIsQrScannerOpen(true)}
          onRemoveScannedUnit={handleRemoveScannedUnit}
          selectedSerumTier={selectedSerumTier}
          showStaffRewards={showStaffRewards}
          onOpenSerumInfoModal={() => setIsSerumInfoModalOpen(true)}
          onOpenWalletModal={() => setIsWalletModalOpen(true)}
          resolvedWallets={resolvedWallets}
          onSelectComboWallet={onSelectComboWallet}
        />

        <UpsellMainComboSelector
          isDark={isDark}
          booking={booking}
          customerName={customerName}
          isExistingComboLive={isExistingComboLive}
          remainingSessions={remainingSessions}
          showNewComboSection={showNewComboSection}
          onExpandNewComboSection={() => setShowNewComboSection(true)}
          onCollapseNewComboSection={handleCollapseNewComboSection}
          isUpTierPackage={isUpTierPackage}
          currentCategory={currentCategory}
          activeCategoryId={activeCategoryId}
          activeVolume={activeVolume}
          autoMatchedCategoryId={autoMatched.categoryId}
          autoMatchedVolume={autoMatched.volume}
          familyInfo={familyInfo}
          onSelectFamilyCategory={handleSelectFamilyCategory}
          onSelectVolume={(vol) => setActiveCategoryAndVolume(activeCategoryId, vol)}
          onOpenConsultModal={() => setIsConsultModalOpen(true)}
          servicePrice={effectiveUpperSinglePrice}
          matchedPackages={matchedPackages}
          selectedNewComboId={selectedNewComboId}
          onSetSelectedNewComboId={setSelectedNewComboId}
          selectedNewComboPkg={selectedNewComboPkg}
          purchaseAccounting={purchaseAccounting}
          deductTodayIntoCombo={deductTodayIntoCombo}
          onSetDeductTodayIntoCombo={setDeductTodayIntoCombo}
          upperExpiryPreviewMap={upperExpiryPreviewMap}
          upperTodayUsageMode={upperTodayUsageMode}
          onSetUpperTodayUsageMode={setUpperTodayUsageMode}
          selectedUpperExpiry={selectedUpperExpiry}
          showStaffRewards={showStaffRewards}
          actorName={actorName}
          activeBookingPromotion={activeBookingPromotion}
          onOpenLockedWelcomeModal={() => setIsLockedWelcomeModalOpen(true)}
        />

        {onOpenAddUnderMink &&
          !isSettled &&
          !booking?.attributes?.hasUnderMink &&
          !isPureUnderLashServiceName(booking?.serviceName) && (
            <button
              type="button"
              data-testid="add-under-mink-cta-upsell"
              onClick={onOpenAddUnderMink}
              className={`w-full py-3 px-4 rounded-2xl border font-bold text-[13px] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                isDark
                  ? 'bg-purple-950/35 border-purple-700/70 text-purple-200 hover:bg-purple-950/55'
                  : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
              }`}
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>+ Book thêm dịch vụ Mi Dưới (Vòng 2) · Sau khi xong Mi Trên</span>
            </button>
          )}

        <UpsellUnderComboAndSummary
          isDark={isDark}
          booking={booking}
          customerName={customerName}
          isExistingComboLive={isExistingComboLive}
          showNewComboSection={showNewComboSection}
          underLashPackages={underLashPackages}
          selectedUnderComboId={selectedUnderComboId}
          onSetSelectedUnderComboId={setSelectedUnderComboId}
          selectedUnderComboPkg={selectedUnderComboPkg}
          selectedNewComboPkg={selectedNewComboPkg}
          deductTodayIntoCombo={deductTodayIntoCombo}
          upperTodayUsageMode={upperTodayUsageMode}
          activeBookingPromotion={activeBookingPromotion}
          underExpiryPreviewMap={underExpiryPreviewMap}
          selectedUpperExpiry={selectedUpperExpiry}
          selectedUnderExpiry={selectedUnderExpiry}
          servicePrice={servicePrice}
          effectiveServiceChargeToday={effectiveServiceChargeToday}
          redemptionAccounting={redemptionAccounting}
          newComboTotal={newComboTotal}
          underComboTotal={underComboTotal}
          totalComboPrice={totalComboPrice}
          totalComboBonus={totalComboBonus}
          hasBothCombos={hasBothCombos}
          upperComboStandaloneBonus={upperComboStandaloneBonus}
          underComboStandaloneBonus={underComboStandaloneBonus}
          yeppeumCount={yeppeumCount}
          selectedSerumTier={selectedSerumTier}
          serumTotal={serumTotal}
          serumBonus={serumBonus}
          subtotal={subtotal}
          showStaffRewards={showStaffRewards}
          isSettled={isSettled}
          customerDiamondBalance={booking?.diamondBalance ?? 0}
          onOpenLockedWelcomeModal={() => setIsLockedWelcomeModalOpen(true)}
          onConfirmCheckout={handleConfirmCheckout}
        />
      </div>

      <UpsellOverlays
        isDark={isDark}
        booking={booking}
        customerName={customerName}
        isAdmin={isAdmin}
        onRefreshDb={onRefreshDb}
        isConsultModalOpen={isConsultModalOpen}
        onCloseConsultModal={() => setIsConsultModalOpen(false)}
        activeCategoryId={activeCategoryId}
        activeVolume={activeVolume}
        welcomeEligibility={welcomeEligibility}
        selectedNewComboPkg={selectedNewComboPkg}
        selectedUnderComboPkg={selectedUnderComboPkg}
        todaySingleServicePrice={effectiveUpperSinglePrice}
        existingUpperExpirySnapshot={existingUpperExpirySnapshot}
        existingUnderExpirySnapshot={existingUnderExpirySnapshot}
        upperTodayUsageMode={upperTodayUsageMode}
        underTodayUsageMode={underTodayUsageMode}
        todayServiceType={todayServiceType}
        underServiceType={underServiceType}
        onSelectComboPackage={(pkg) => {
          setActiveCategoryAndVolume(pkg.categoryId, pkg.volume);
          setSelectedNewComboId(pkg.id);
        }}
        onApplyComboPackages={({ upperPkg, underPkg }) => {
          if (upperPkg) {
            setActiveCategoryAndVolume(upperPkg.categoryId, upperPkg.volume);
            setSelectedNewComboId(upperPkg.id);
          } else {
            setSelectedNewComboId('NONE');
          }
          if (underPkg) {
            setSelectedUnderComboId(underPkg.id);
          } else {
            setSelectedUnderComboId('NONE');
          }
        }}
        isSerumInfoModalOpen={isSerumInfoModalOpen}
        onCloseSerumInfoModal={() => setIsSerumInfoModalOpen(false)}
        selectedSerumTierId={selectedSerumTierId}
        yeppeumCount={yeppeumCount}
        onSelectSerumTier={(tierId) => {
          applySerumTierSelection(tierId);
          setIsSerumInfoModalOpen(false);
          if (yeppeumCount === 0) {
            setIsQrScannerOpen(true);
          }
        }}
        isLockedWelcomeModalOpen={isLockedWelcomeModalOpen}
        onCloseLockedWelcomeModal={() => setIsLockedWelcomeModalOpen(false)}
        isQrScannerOpen={isQrScannerOpen}
        onCloseQrScanner={() => setIsQrScannerOpen(false)}
        localCartProducts={localCartProducts}
        onScannedProduct={handleScannedProduct}
        onRemoveScannedUnit={handleRemoveScannedUnit}
        isWalletModalOpen={isWalletModalOpen}
        onCloseWalletModal={() => setIsWalletModalOpen(false)}
        resolvedWallets={resolvedWallets}
        onSelectWalletFromModal={(wallet) =>
          onSelectComboWallet?.(
            wallet.serviceGroup === 'under'
              ? { selectedUnderComboBalanceId: wallet.balanceId, skipUnderCombo: false }
              : { selectedUpperComboBalanceId: wallet.balanceId, skipUpperCombo: false }
          )
        }
      />
    </div>
  );
}
