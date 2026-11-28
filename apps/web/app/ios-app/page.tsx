'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { canSwitchIosBranch, hasCompleteNaturalLashSet, isDoneBookingPendingCheckout } from '@mos-lab/shared';
import { useIosAppState, IosUserRole } from './state/useIosAppState';
import { IOS_STEPS } from './state/iosStepRegistry';
import { useIosSessionAuth } from './state/useIosSessionAuth';
import { useIosFontScale } from './state/useIosFontScale';
import { IosTabBar } from './components/ui-kit/IosTabBar';
import { CvFeather1Badge } from './components/ui-kit/CvFeatherLabels';
import { SimulationReceiptReplayBar } from './components/screens/checkout/SimulationReceiptReplayBar';
import { IosAppGlobalOverlays } from './components/IosAppGlobalOverlays';
import {
  Screen02CheckInProfile,
  Screen03ConsultationMatrix,
  Screen04StaffQueueAssign,
  Screen05ServicingTransfer,
  Screen06CvDashboardReceive,
  Screen07LashProgressBefore,
  Screen07bLashProgressCleaned,
  Screen08LashProgressTimer,
  Screen09LashProgressAfter,
  Screen10CustomerSurvey,
  Screen11ProductUpsell,
  Screen12CheckoutBilling,
  Screen13CheckoutTip,
  Screen14ThermalReceiptDone,
  ScreenStoreDashboard,
  ScreenInventoryStock,
  ScreenCvPaystub,
  ScreenSettingsRoleSwitch,
} from './components/IosAppDynamicScreens';
import './ios-typography.css';

import { Screen01IncomingBookings } from './components/screens/Screen01IncomingBookings';

function IosAppInner() {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const stepStr = searchParams.get('step');
  const roleParam = searchParams.get('role')?.toUpperCase() as IosUserRole | undefined;
  const bookingIdStr = searchParams.get('bookingId');
  const isDemoMode = searchParams.get('demo') === '1' || searchParams.get('demo') === 'true';
  const isSimModeParam = searchParams.get('sim') === '1' || searchParams.get('sim') === 'true';
  const initialStep = stepStr ? parseInt(stepStr, 10) : IOS_STEPS.INCOMING;
  const initialBookingId = bookingIdStr ? parseInt(bookingIdStr, 10) : undefined;
  const initialRole: IosUserRole =
    roleParam && ['CVL', 'CVLL', 'CC', 'CV', 'STORE', 'INVENTORY'].includes(roleParam) ? roleParam : 'CVL';

  const state = useIosAppState(initialStep, authorized, initialRole, initialBookingId, isDemoMode, isSimModeParam);
  useIosFontScale(state.actor?.staffId);
  useIosSessionAuth(roleParam, state.setRole, setAuthorized);

  useEffect(() => {
    if (!authorized || state.currentStep !== IOS_STEPS.CV_RECEIVE) return;
    const candidate =
      state.bookings.find((b) => Number(b.id) === Number(state.activeBookingId)) ||
      (state.activeServicingBooking
        ? state.bookings.find((b) => Number(b.id) === Number(state.activeServicingBooking?.id))
        : null);
    if (!candidate || candidate.id <= 0) return;
    if (!hasCompleteNaturalLashSet(candidate) && !candidate.progress?.startedAt) {
      state.handleOpenConsultation(IOS_STEPS.CV_RECEIVE);
    }
  }, [
    authorized,
    state.currentStep,
    state.bookings,
    state.activeBookingId,
    state.activeServicingBooking,
    state.handleOpenConsultation,
  ]);

  if (!authorized) {
    return (
      <div
        className="ios-app-font-scope w-full min-h-[100dvh] flex items-center justify-center font-bold gap-1.5"
        style={{ backgroundColor: 'var(--background)', color: 'var(--mos-accent)' }}
      >
        <span>Đang mở ứng dụng Tư vấn & Checkout</span>
        <CvFeather1Badge />
      </div>
    );
  }

  const handleSelectBookingFromList = (id: number) => {
    const idNum = Number(id);
    state.setActiveBookingId(idNum);
    const target = state.bookings.find((b) => Number(b.id) === idNum);
    if (target && isDoneBookingPendingCheckout(target)) {
      state.setCurrentStep(IOS_STEPS.CHECKOUT);
    } else if (target?.status === 'DONE' || Boolean(target?.billing?.completedAt)) {
      state.setCurrentStep(IOS_STEPS.RECEIPT_DONE);
    } else if (target?.status === 'SERVICING') {
      const needsNaturalLashCheck = !hasCompleteNaturalLashSet(target) && !target.progress?.startedAt;
      const step = target.progress?.currentStep;
      if (needsNaturalLashCheck) {
        state.handleOpenConsultation(IOS_STEPS.CV_RECEIVE);
      } else if (step && step >= IOS_STEPS.CONSULTATION && step <= IOS_STEPS.CHECKOUT_TIP) {
        state.setCurrentStep(step);
      } else {
        state.setCurrentStep(IOS_STEPS.CV_RECEIVE);
      }
    } else if (target?.status === 'CHECKED_IN') {
      state.setCurrentStep(IOS_STEPS.CONSULTATION);
    } else {
      // Khách INCOMING / Chờ đón: Bắt buộc vào Step 2 (Check-in hồ sơ đón khách)
      state.setCurrentStep(IOS_STEPS.CHECK_IN);
    }
  };

  const renderIncomingBookingsScreen = () => (
    <Screen01IncomingBookings
      bookings={state.bookings}
      bookingSegment={state.bookingSegment}
      setBookingSegment={state.setBookingSegment}
      counts={state.counts}
      isRefreshing={state.isRefreshing}
      lastRefreshedAt={state.lastRefreshedAt}
      isLiveDb={state.isLiveDb}
      onRefreshDb={() => state.refreshDb()}
      dateOffset={state.selectedDateOffset}
      onDateOffsetChange={state.handleDateOffsetChange}
      role={state.role}
      canSwitchRole={state.canSwitchRole}
      onRoleChange={state.setRole}
      actor={state.actor}
      scopeMode={state.scopeMode}
      onScopeModeChange={state.setScopeMode}
      activeServicingBooking={state.activeServicingBooking}
      onResumeServicing={state.handleResumeServicing}
      onSelectBooking={handleSelectBookingFromList}
      onOpenProfileMenu={() => setIsProfileSheetOpen(true)}
      isAdmin={state.isAdmin}
      onRevertToIncoming={state.handleRevertToIncoming}
      selectedStoreId={state.selectedStoreId}
      onSelectStoreId={state.setSelectedStoreId}
      currentBranch={state.currentBranch}
      availableBranches={state.availableBranches}
      totalStoreBookingsCount={state.totalStoreBookingsCount}
      isSimulationMode={state.isSimulationMode}
      userRole={state.loggedInUser?.role}
      teamCodes={state.loggedInUser?.teamCodes}
      onOpenCreateBooking={!state.isReadOnlyMentorView ? () => state.setIsCreateBookingOpen(true) : undefined}
    />
  );

  const renderActiveScreen = () => {
    // 1. Màn hình Cài đặt & Chuyển vai trò
    if (state.isSettingsOpen) {
      return (
        <ScreenSettingsRoleSwitch
          currentRole={state.role}
          canSwitchRole={state.canSwitchRole}
          currentBranch={state.currentBranch}
          selectedStoreId={state.selectedStoreId}
          onSelectBranch={
            canSwitchIosBranch({ isAdmin: state.isAdmin, iosRole: state.role }) ? state.setSelectedStoreId : undefined
          }
          availableBranches={state.availableBranches}
          isAdmin={state.isAdmin}
          onRoleChange={(r) => {
            state.setRole(r);
            state.setIsSettingsOpen(false);
          }}
          onBack={() => state.setIsSettingsOpen(false)}
        />
      );
    }

    // 2. Vai trò Quản Lý Cửa Hàng (STORE)
    if (state.role === 'STORE') {
      return (
        <ScreenStoreDashboard
          bookings={state.bookings}
          currentBranch={state.currentBranch}
          isDemoMode={isDemoMode}
          onSelectBooking={(id) => {
            state.setRole('CVL');
            handleSelectBookingFromList(id);
          }}
          onOpenSettings={() => state.setIsSettingsOpen(true)}
        />
      );
    }

    // 3. Vai trò Quản Lý Kho (INVENTORY)
    if (state.role === 'INVENTORY') {
      return (
        <ScreenInventoryStock
          isAdmin={state.isAdmin}
          defaultStoreId={state.selectedStoreId}
          onOpenSettings={() => state.setIsSettingsOpen(true)}
        />
      );
    }

    // 4. Tab Thu nhập tạm tính (Paystub) cho CVL / CVLL / CV
    if (['CV', 'CVL', 'CVLL'].includes(state.role) && state.activeTab === 'paystub') {
      return (
        <ScreenCvPaystub
          actor={state.actor}
          staffStats={state.staffStats}
          bookings={state.bookings}
          isDemoMode={isDemoMode}
          onBack={() => {
            state.setActiveTab('booking');
            state.setCurrentStep(IOS_STEPS.INCOMING);
          }}
          onOpenSettings={() => state.setIsSettingsOpen(true)}
        />
      );
    }

    // 5. Core Service Flow (14 màn hình chuẩn iOS kết nối DB thực tế cho CVL & CVLL)
    const currentBooking =
      state.bookings.find((b) => Number(b.id) === Number(state.activeBookingId)) ||
      (state.activeServicingBooking
        ? state.bookings.find((b) => Number(b.id) === Number(state.activeServicingBooking?.id))
        : null) ||
      state.activeBooking;

    switch (state.currentStep) {
      case IOS_STEPS.INCOMING:
        return renderIncomingBookingsScreen();
      case IOS_STEPS.CHECK_IN:
        return (
          <Screen02CheckInProfile
            booking={currentBooking}
            actor={state.actor}
            isAdmin={state.isAdmin}
            isSimulationMode={state.isSimulationMode}
            onRefreshDb={() => state.refreshDb()}
            isCheckInLocked={Boolean(
              !state.isAdmin &&
              (state.role === 'CVL' || state.role === 'CV') &&
              state.activeServicingBooking &&
              currentBooking.id !== state.activeServicingBooking.id
            )}
            activeServicingCustomerName={state.activeServicingBooking?.customerName}
            onResumeServicing={() => state.handleResumeServicing()}
            onBack={() => state.setCurrentStep(IOS_STEPS.INCOMING)}
            onCheckIn={state.handleCheckIn}
            onQuickCheckIn={state.handleSaveConsultation}
            onSelectComboWallet={state.handleSelectComboWallet}
            onUpdateAvatar={state.handleUpdateCustomerAvatar}
            onReferralConfirmed={state.setPendingReferral}
          />
        );
      case IOS_STEPS.CONSULTATION:
        return (
          <Screen03ConsultationMatrix
            booking={currentBooking}
            actor={state.actor}
            isAdmin={state.isAdmin}
            onRefreshDb={() => state.refreshDb()}
            onBack={() => state.setCurrentStep(IOS_STEPS.CHECK_IN)}
            onSave={state.handleSaveConsultation}
            onUpdateAvatar={state.handleUpdateCustomerAvatar}
            onAutoSaveDraft={state.handleAutoSaveConsultationDraft}
            isSimulationMode={state.isSimulationMode}
            isReadOnlyMentorView={state.isReadOnlyMentorView}
            simPresetMode={state.simPresetMode}
            onSimJumpToStep={state.handleSimJumpToStep}
            onSimFastForwardToUpsell={state.handleSimFastForwardToUpsell}
            onSelectComboWallet={state.handleSelectComboWallet}
            onSavePreCheckoutPayment={state.handleSavePreCheckoutPayment}
          />
        );
      case IOS_STEPS.STAFF_ASSIGN:
        return (
          <Screen04StaffQueueAssign
            booking={currentBooking}
            currentBranch={state.currentBranch}
            onBack={() => state.setCurrentStep(IOS_STEPS.CONSULTATION)}
            onAssign={state.handleAssignStaff}
          />
        );
      case IOS_STEPS.TRANSFER:
        return (
          <Screen05ServicingTransfer
            booking={currentBooking}
            servicingBookings={state.bookings.filter((b) => b.status === 'SERVICING')}
            currentBranch={state.currentBranch}
            onBack={() => state.setCurrentStep(IOS_STEPS.STAFF_ASSIGN)}
            onTransferToCv={state.handleTransferToCv}
          />
        );
      case IOS_STEPS.CV_RECEIVE:
        return (
          <Screen06CvDashboardReceive
            booking={currentBooking}
            onStartTask={state.handleCvStartTask}
            onEditService={() => state.handleOpenConsultation(IOS_STEPS.CV_RECEIVE)}
            onBack={() => {
              state.setActiveTab('booking');
              state.setCurrentStep(IOS_STEPS.INCOMING);
            }}
            staffStats={state.staffStats}
            isReadOnlyMentorView={state.isReadOnlyMentorView}
            onSavePreCheckoutPayment={state.handleSavePreCheckoutPayment}
          />
        );
      case IOS_STEPS.LASH_BEFORE:
        return (
          <Screen07LashProgressBefore
            booking={currentBooking}
            onBack={state.handleBackFromBeforePhoto}
            onSavePhoto={state.handleSaveBeforePhoto}
            onAutoSavePhoto={(url) => state.handleAutoSavePhoto('before', url)}
            isSimulationMode={state.isSimulationMode}
          />
        );
      case IOS_STEPS.LASH_CLEANED:
        return (
          <Screen07bLashProgressCleaned
            booking={currentBooking}
            onBack={() => state.setCurrentStep(IOS_STEPS.LASH_BEFORE)}
            onSavePhoto={(photoUrl, retainLashes) => state.handleSaveCleanedPhoto(photoUrl, retainLashes)}
            onAutoSavePhoto={(url, retainLashes) =>
              state.handleAutoSavePhoto('cleaned', url, retainLashes ? { retainLashes } : undefined)
            }
            isSimulationMode={state.isSimulationMode}
          />
        );
      case IOS_STEPS.LASH_TIMER:
        return (
          <Screen08LashProgressTimer
            booking={currentBooking}
            onBack={() => state.setCurrentStep(IOS_STEPS.LASH_CLEANED)}
            onFinishTimer={state.handleFinishTimer}
            onEditService={() => state.handleOpenConsultation(IOS_STEPS.LASH_TIMER)}
            isAdmin={state.isAdmin}
            isSimulationMode={state.isSimulationMode}
            onRevertToIncoming={state.handleRevertToIncoming}
          />
        );
      case IOS_STEPS.LASH_AFTER:
        return (
          <Screen09LashProgressAfter
            booking={currentBooking}
            onBack={() => state.setCurrentStep(IOS_STEPS.LASH_TIMER)}
            onSavePhoto={state.handleSaveAfterPhoto}
            onAutoSavePhoto={(url) => state.handleAutoSavePhoto('after', url)}
            onOpenAddUnderMink={(afterPhotoUrl) =>
              state.openAddUnderMinkModal({ mode: 'ADD_TO_CURRENT_ORDER', pendingAfterPhotoUrl: afterPhotoUrl })
            }
            isSimulationMode={state.isSimulationMode}
          />
        );
      case IOS_STEPS.CUSTOMER_SURVEY:
        return (
          <Screen10CustomerSurvey
            booking={currentBooking}
            customerName={currentBooking.customerName}
            staffName={currentBooking.assignedStaffName}
            onBack={state.handleBackToAfterPhoto}
            onComplete={state.handleCompleteSurvey}
            onOpenAddUnderMink={() => state.openAddUnderMinkModal({ mode: 'ADD_TO_CURRENT_ORDER' })}
          />
        );
      case IOS_STEPS.PRODUCT_UPSELL:
        return (
          <Screen11ProductUpsell
            booking={currentBooking}
            actor={state.actor}
            isAdmin={state.isAdmin}
            onRefreshDb={() => state.refreshDb()}
            onBack={state.handleBackToAfterPhoto}
            onUpdateCartProducts={state.handleUpdateCartProducts}
            onSelectComboWallet={state.handleSelectComboWallet}
            onGoToBilling={state.handleGoToBilling}
            onOpenAddUnderMink={() => state.openAddUnderMinkModal({ mode: 'ADD_TO_CURRENT_ORDER' })}
          />
        );
      case IOS_STEPS.CHECKOUT:
        return (
          <Screen12CheckoutBilling
            booking={currentBooking}
            actor={state.actor}
            cvPlusRules={state.staffStats?.cvPlusRules}
            onBack={() => {
              if (isDoneBookingPendingCheckout(currentBooking)) {
                state.setBookingSegment('DONE');
                state.setCurrentStep(IOS_STEPS.INCOMING);
              } else {
                state.setCurrentStep(IOS_STEPS.PRODUCT_UPSELL);
              }
            }}
            onChoosePayment={state.handleChoosePaymentMethod}
            onSavePromotion={state.handleSavePromotion}
            onUpdateCartProducts={state.handleUpdateCartProducts}
            onSelectComboWallet={state.handleSelectComboWallet}
            onUpdateCombos={state.handleUpdateCombos}
            onEditService={() => state.handleOpenConsultation(IOS_STEPS.CHECKOUT)}
            onOpenAddUnderMink={() => state.openAddUnderMinkModal()}
            pendingReferral={state.pendingReferral}
          />
        );
      case IOS_STEPS.CHECKOUT_TIP:
        return (
          <Screen13CheckoutTip
            booking={currentBooking}
            actor={state.actor}
            cvPlusRules={state.staffStats?.cvPlusRules}
            onBack={() => state.setCurrentStep(IOS_STEPS.CHECKOUT)}
            onRecordTip={state.handleRecordTip}
          />
        );
      case IOS_STEPS.RECEIPT_DONE:
        return (
          <Screen14ThermalReceiptDone
            booking={currentBooking}
            actor={state.actor}
            cvPlusRules={state.staffStats?.cvPlusRules}
            isAdmin={state.isAdmin}
            isSimulationMode={state.isSimulationMode}
            isReadOnlyMentorView={state.isReadOnlyMentorView}
            onRefreshDb={() => state.refreshDb()}
            onFinishOrder={state.handleFinishOrder}
            onOpenAddUnderMink={
              !state.isReadOnlyMentorView
                ? () => state.openAddUnderMinkModal({ mode: 'CREATE_NEW_BOOKING' })
                : undefined
            }
            simulationReplaySlot={
              state.isSimulationMode ? (
                <SimulationReceiptReplayBar
                  bookingId={currentBooking.id}
                  attemptCount={currentBooking.simulationAttemptCount}
                  isReadOnlyMentorView={state.isReadOnlyMentorView}
                  isBusy={state.isSimActionBusy}
                  onRevertConsultation={state.handleSimRevertConsultation}
                  onOpenHistory={state.openHistoryForBooking}
                  onResetToIncoming={state.handleSimResetToIncoming}
                />
              ) : undefined
            }
            onBack={() => {
              state.setActiveServicingBookingId(null);
              state.setBookingSegment('DONE');
              state.setCurrentStep(IOS_STEPS.INCOMING);
            }}
          />
        );
      default:
        return renderIncomingBookingsScreen();
    }
  };

  const showTabBar =
    !state.isSettingsOpen &&
    state.role !== 'INVENTORY' &&
    (state.activeTab === 'paystub' ||
      state.currentStep === IOS_STEPS.INCOMING ||
      state.currentStep === IOS_STEPS.CV_RECEIVE);

  const handleTabChange = (tab: string) => {
    state.setActiveTab(tab);
    if (tab === 'more') {
      setIsProfileSheetOpen(true);
      return;
    }

    if (tab === 'booking') {
      state.setCurrentStep(IOS_STEPS.INCOMING);
    } else if (tab === 'task') {
      if (state.activeServicingBooking) {
        state.handleResumeServicing(state.activeServicingBooking.id);
      } else {
        state.setCurrentStep(IOS_STEPS.CV_RECEIVE);
      }
    } else if (tab === 'paystub') {
      state.setActiveTab('paystub');
    }
  };

  return (
    <div
      className="ios-app-font-scope w-full h-[100dvh] max-h-[100dvh] flex justify-center font-sans select-none overflow-hidden transition-colors"
      style={{ backgroundColor: 'var(--background)', color: 'var(--mos-text)' }}
    >
      <div
        className="w-full max-w-[430px] h-[100dvh] max-h-[100dvh] flex flex-col relative overflow-hidden transition-colors"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <IosAppGlobalOverlays
          state={state}
          isProfileSheetOpen={isProfileSheetOpen}
          setIsProfileSheetOpen={setIsProfileSheetOpen}
        >
          {/* Screen Body */}
          <div
            className="flex-1 flex flex-col min-h-0 relative overflow-hidden transition-colors"
            style={{ backgroundColor: 'var(--background)' }}
          >
            {renderActiveScreen()}
          </div>

          {/* Real Native iOS Bottom TabBar */}
          {showTabBar && (
            <IosTabBar
              role={state.role}
              activeTab={state.activeTab}
              onTabChange={handleTabChange}
              onCenterPlusClick={() => {
                if (state.isSimulationMode && !state.activeServicingBooking) {
                  state.setIsCreateBookingOpen(true);
                } else if (state.activeServicingBooking) {
                  state.handleResumeServicing(state.activeServicingBooking.id);
                } else {
                  state.setActiveTab('booking');
                  state.setCurrentStep(IOS_STEPS.CONSULTATION);
                }
              }}
              badgeCounts={{
                booking: state.counts.incoming,
                task: state.counts.servicing || 1,
                staff: 0,
                dispense: 0,
              }}
            />
          )}
        </IosAppGlobalOverlays>
      </div>
    </div>
  );
}

export default function IosAppPage() {
  return (
    <Suspense
      fallback={
        <div
          className="ios-app-font-scope w-full min-h-[100dvh] flex items-center justify-center font-bold gap-1.5"
          style={{ backgroundColor: 'var(--background)', color: 'var(--mos-accent)' }}
        >
          <span>Đang tải ứng dụng Tư vấn & Checkout</span>
          <CvFeather1Badge />
        </div>
      }
    >
      <IosAppInner />
    </Suspense>
  );
}
