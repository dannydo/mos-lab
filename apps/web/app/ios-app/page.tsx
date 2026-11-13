'use client';

import React, { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import {
  canAccessIosConsultationApp,
  hasCompleteNaturalLashSet,
  isCvRole,
  resolveLockedIosRoleForUser,
} from '@mos-lab/shared';
import { useIosAppState, IosUserRole } from './state/useIosAppState';
import { IosTabBar } from './components/ui-kit/IosTabBar';
import { IosProfileMenuSheet } from './components/ui-kit/IosProfileMenuSheet';
import { CvFeather1Badge } from './components/ui-kit/CvFeatherLabels';

import { Screen01IncomingBookings } from './components/screens/Screen01IncomingBookings';

const ScreenSkeleton = () => (
  <div
    className="w-full min-h-[450px] flex items-center justify-center backdrop-blur-sm animate-pulse"
    style={{ backgroundColor: 'var(--background)' }}
  >
    <div className="flex flex-col items-center gap-3">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: 'var(--mos-accent)', borderTopColor: 'transparent' }}
      />
      <span className="text-xs font-medium" style={{ color: 'var(--mos-text-muted)' }}>
        Đang tải màn hình...
      </span>
    </div>
  </div>
);

const Screen02CheckInProfile = dynamic(
  () => import('./components/screens/Screen02CheckInProfile').then((m) => m.Screen02CheckInProfile),
  { loading: () => <ScreenSkeleton /> }
);
const Screen03ConsultationMatrix = dynamic(
  () => import('./components/screens/Screen03ConsultationMatrix').then((m) => m.Screen03ConsultationMatrix),
  { loading: () => <ScreenSkeleton /> }
);
const Screen04StaffQueueAssign = dynamic(
  () => import('./components/screens/Screen04StaffQueueAssign').then((m) => m.Screen04StaffQueueAssign),
  { loading: () => <ScreenSkeleton /> }
);
const Screen05ServicingTransfer = dynamic(
  () => import('./components/screens/Screen05ServicingTransfer').then((m) => m.Screen05ServicingTransfer),
  { loading: () => <ScreenSkeleton /> }
);
const Screen06CvDashboardReceive = dynamic(
  () => import('./components/screens/Screen06CvDashboardReceive').then((m) => m.Screen06CvDashboardReceive),
  { loading: () => <ScreenSkeleton /> }
);
const Screen07LashProgressBefore = dynamic(
  () => import('./components/screens/Screen07LashProgressBefore').then((m) => m.Screen07LashProgressBefore),
  { loading: () => <ScreenSkeleton /> }
);
const Screen07bLashProgressCleaned = dynamic(
  () => import('./components/screens/Screen07bLashProgressCleaned').then((m) => m.Screen07bLashProgressCleaned),
  { loading: () => <ScreenSkeleton /> }
);
const Screen08LashProgressTimer = dynamic(
  () => import('./components/screens/Screen08LashProgressTimer').then((m) => m.Screen08LashProgressTimer),
  { loading: () => <ScreenSkeleton /> }
);
const Screen09LashProgressAfter = dynamic(
  () => import('./components/screens/Screen09LashProgressAfter').then((m) => m.Screen09LashProgressAfter),
  { loading: () => <ScreenSkeleton /> }
);
const Screen10CustomerSurvey = dynamic(
  () => import('./components/screens/Screen10CustomerSurvey').then((m) => m.Screen10CustomerSurvey),
  { loading: () => <ScreenSkeleton /> }
);
const Screen11ProductUpsell = dynamic(
  () => import('./components/screens/Screen11ProductUpsell').then((m) => m.Screen11ProductUpsell),
  { loading: () => <ScreenSkeleton /> }
);
const Screen12CheckoutBilling = dynamic(
  () => import('./components/screens/Screen12CheckoutBilling').then((m) => m.Screen12CheckoutBilling),
  { loading: () => <ScreenSkeleton /> }
);
const Screen13CheckoutTip = dynamic(
  () => import('./components/screens/Screen13CheckoutTip').then((m) => m.Screen13CheckoutTip),
  { loading: () => <ScreenSkeleton /> }
);
const Screen14ThermalReceiptDone = dynamic(
  () => import('./components/screens/Screen14ThermalReceiptDone').then((m) => m.Screen14ThermalReceiptDone),
  { loading: () => <ScreenSkeleton /> }
);
const ScreenStoreDashboard = dynamic(
  () => import('./components/screens/ScreenStoreDashboard').then((m) => m.ScreenStoreDashboard),
  { loading: () => <ScreenSkeleton /> }
);
const ScreenInventoryStock = dynamic(
  () => import('./components/screens/ScreenInventoryStock').then((m) => m.ScreenInventoryStock),
  { loading: () => <ScreenSkeleton /> }
);
const ScreenCvPaystub = dynamic(() => import('./components/screens/ScreenCvPaystub').then((m) => m.ScreenCvPaystub), {
  loading: () => <ScreenSkeleton />,
});
const ScreenSettingsRoleSwitch = dynamic(
  () => import('./components/screens/ScreenSettingsRoleSwitch').then((m) => m.ScreenSettingsRoleSwitch),
  { loading: () => <ScreenSkeleton /> }
);

function IosAppInner() {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const stepStr = searchParams.get('step');
  const roleParam = searchParams.get('role')?.toUpperCase() as IosUserRole | undefined;
  const bookingIdStr = searchParams.get('bookingId');
  const isDemoMode = searchParams.get('demo') === '1' || searchParams.get('demo') === 'true';
  const initialStep = stepStr ? parseInt(stepStr, 10) : 1;
  const initialBookingId = bookingIdStr ? parseInt(bookingIdStr, 10) : undefined;
  const initialRole: IosUserRole =
    roleParam && ['CVL', 'CVLL', 'CC', 'CV', 'STORE', 'INVENTORY'].includes(roleParam) ? roleParam : 'CVL';

  const state = useIosAppState(initialStep, authorized, initialRole, initialBookingId, isDemoMode);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const token = window.localStorage.getItem('mos_token');
      const rawUser = window.localStorage.getItem('mos_user');
      if (!token || !rawUser) {
        window.location.replace('/login');
        return;
      }
      const parsed = JSON.parse(rawUser);
      const userRole = String(parsed?.role || '').trim();
      const isAllowed = canAccessIosConsultationApp(userRole);

      if (!isAllowed) {
        window.location.replace(isCvRole(userRole) ? '/dashboard/cv' : '/dashboard');
        return;
      }

      const lockedRole = resolveLockedIosRoleForUser(userRole, roleParam);
      state.setRole(lockedRole);
      setAuthorized(true);
    } catch {
      window.location.replace('/login');
    }
  }, [roleParam]);

  useEffect(() => {
    if (!authorized || state.currentStep !== 6) return;
    const candidate =
      state.bookings.find((b) => Number(b.id) === Number(state.activeBookingId)) ||
      (state.activeServicingBooking
        ? state.bookings.find((b) => Number(b.id) === Number(state.activeServicingBooking?.id))
        : null);
    if (!candidate || candidate.id <= 0) return;
    if (!hasCompleteNaturalLashSet(candidate) && !candidate.progress?.startedAt) {
      state.handleOpenConsultation(6);
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
        className="w-full min-h-[100dvh] flex items-center justify-center font-bold gap-1.5"
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
    if (target?.status === 'DONE' || Boolean(target?.billing?.completedAt)) {
      state.setCurrentStep(15);
    } else if (target?.status === 'SERVICING') {
      const needsNaturalLashCheck = !hasCompleteNaturalLashSet(target) && !target.progress?.startedAt;
      const step = target.progress?.currentStep;
      if (needsNaturalLashCheck) {
        state.handleOpenConsultation(6);
      } else if (step && step >= 3 && step <= 14) {
        state.setCurrentStep(step);
      } else {
        state.setCurrentStep(6);
      }
    } else if (target?.status === 'CHECKED_IN') {
      state.setCurrentStep(3);
    } else {
      // Khách INCOMING / Chờ đón: Bắt buộc vào Step 2 (Check-in hồ sơ đón khách)
      state.setCurrentStep(2);
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
          onSelectBranch={state.isAdmin ? state.setSelectedStoreId : undefined}
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
      return <ScreenInventoryStock onOpenSettings={() => state.setIsSettingsOpen(true)} />;
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
            state.setCurrentStep(1);
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
      case 1:
        return renderIncomingBookingsScreen();
      case 2:
        return (
          <Screen02CheckInProfile
            booking={currentBooking}
            actor={state.actor}
            isAdmin={state.isAdmin}
            onRefreshDb={() => state.refreshDb()}
            isCheckInLocked={Boolean(
              !state.isAdmin && state.activeServicingBooking && currentBooking.id !== state.activeServicingBooking.id
            )}
            activeServicingCustomerName={state.activeServicingBooking?.customerName}
            onResumeServicing={() => state.handleResumeServicing()}
            onBack={() => state.setCurrentStep(1)}
            onCheckIn={state.handleCheckIn}
            onQuickCheckIn={state.handleSaveConsultation}
            onUpdateAvatar={state.handleUpdateCustomerAvatar}
          />
        );
      case 3:
        return (
          <Screen03ConsultationMatrix
            booking={currentBooking}
            actor={state.actor}
            isAdmin={state.isAdmin}
            onRefreshDb={() => state.refreshDb()}
            onBack={() => state.setCurrentStep(2)}
            onSave={state.handleSaveConsultation}
            onUpdateAvatar={state.handleUpdateCustomerAvatar}
            onAutoSaveDraft={state.handleAutoSaveConsultationDraft}
          />
        );
      case 4:
        return (
          <Screen04StaffQueueAssign
            booking={currentBooking}
            currentBranch={state.currentBranch}
            onBack={() => state.setCurrentStep(3)}
            onAssign={state.handleAssignStaff}
          />
        );
      case 5:
        return (
          <Screen05ServicingTransfer
            booking={currentBooking}
            servicingBookings={state.bookings.filter((b) => b.status === 'SERVICING')}
            currentBranch={state.currentBranch}
            onBack={() => state.setCurrentStep(4)}
            onTransferToCv={state.handleTransferToCv}
          />
        );
      case 6:
        return (
          <Screen06CvDashboardReceive
            booking={currentBooking}
            onStartTask={state.handleCvStartTask}
            onEditService={() => state.handleOpenConsultation(6)}
            onBack={() => {
              state.setActiveTab('booking');
              state.setCurrentStep(1);
            }}
            staffStats={state.staffStats}
          />
        );
      case 7:
        return (
          <Screen07LashProgressBefore
            booking={currentBooking}
            onBack={() => state.setCurrentStep(6)}
            onSavePhoto={state.handleSaveBeforePhoto}
            onAutoSavePhoto={(url) => state.handleAutoSavePhoto('before', url)}
          />
        );
      case 8:
        return (
          <Screen07bLashProgressCleaned
            booking={currentBooking}
            onBack={() => state.setCurrentStep(7)}
            onSavePhoto={(photoUrl, retainLashes) => state.handleSaveCleanedPhoto(photoUrl, retainLashes)}
            onAutoSavePhoto={(url, retainLashes) =>
              state.handleAutoSavePhoto('cleaned', url, retainLashes ? { retainLashes } : undefined)
            }
          />
        );
      case 9:
        return (
          <Screen08LashProgressTimer
            booking={currentBooking}
            onBack={() => state.setCurrentStep(8)}
            onFinishTimer={state.handleFinishTimer}
            onEditService={() => state.handleOpenConsultation(9)}
            isAdmin={state.isAdmin}
            onRevertToIncoming={state.handleRevertToIncoming}
          />
        );
      case 10:
        return (
          <Screen09LashProgressAfter
            booking={currentBooking}
            onBack={() => state.setCurrentStep(9)}
            onSavePhoto={state.handleSaveAfterPhoto}
            onAutoSavePhoto={(url) => state.handleAutoSavePhoto('after', url)}
          />
        );
      case 11:
        return (
          <Screen10CustomerSurvey
            booking={currentBooking}
            customerName={currentBooking.customerName}
            staffName={currentBooking.assignedStaffName}
            onBack={state.handleBackToAfterPhoto}
            onComplete={state.handleCompleteSurvey}
          />
        );
      case 12:
        return (
          <Screen11ProductUpsell
            booking={currentBooking}
            actor={state.actor}
            isAdmin={state.isAdmin}
            onRefreshDb={() => state.refreshDb()}
            onBack={state.handleBackToAfterPhoto}
            onGoToBilling={state.handleGoToBilling}
          />
        );
      case 13:
        return (
          <Screen12CheckoutBilling
            booking={currentBooking}
            actor={state.actor}
            cvPlusRules={state.staffStats?.cvPlusRules}
            onBack={() => state.setCurrentStep(12)}
            onChoosePayment={state.handleChoosePaymentMethod}
            onEditService={() => state.handleOpenConsultation(13)}
          />
        );
      case 14:
        return (
          <Screen13CheckoutTip
            booking={currentBooking}
            actor={state.actor}
            cvPlusRules={state.staffStats?.cvPlusRules}
            onBack={() => state.setCurrentStep(13)}
            onRecordTip={state.handleRecordTip}
          />
        );
      case 15:
        return (
          <Screen14ThermalReceiptDone
            booking={currentBooking}
            actor={state.actor}
            cvPlusRules={state.staffStats?.cvPlusRules}
            onFinishOrder={state.handleFinishOrder}
            onBack={() => {
              state.setActiveServicingBookingId(null);
              state.setBookingSegment('DONE');
              state.setCurrentStep(1);
            }}
          />
        );
      default:
        return renderIncomingBookingsScreen();
    }
  };

  const showTabBar =
    !state.isSettingsOpen && (state.activeTab === 'paystub' || state.currentStep === 1 || state.currentStep === 6);

  const handleTabChange = (tab: string) => {
    state.setActiveTab(tab);
    if (tab === 'more') {
      setIsProfileSheetOpen(true);
      return;
    }

    if (tab === 'booking') {
      state.setCurrentStep(1);
    } else if (tab === 'task') {
      if (state.activeServicingBooking) {
        state.handleResumeServicing(state.activeServicingBooking.id);
      } else {
        state.setCurrentStep(6);
      }
    } else if (tab === 'paystub') {
      state.setActiveTab('paystub');
    }
  };

  return (
    <div
      className="w-full h-[100dvh] max-h-[100dvh] flex justify-center font-sans select-none overflow-hidden transition-colors"
      style={{ backgroundColor: 'var(--background)', color: 'var(--mos-text)' }}
    >
      <div
        className="w-full max-w-[430px] h-[100dvh] max-h-[100dvh] flex flex-col relative overflow-hidden transition-colors"
        style={{ backgroundColor: 'var(--background)' }}
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
              if (state.activeServicingBooking) {
                state.handleResumeServicing(state.activeServicingBooking.id);
              } else {
                state.setActiveTab('booking');
                state.setCurrentStep(3);
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

        {/* iOS Native Profile & Admin Switch Action Sheet */}
        <IosProfileMenuSheet
          isOpen={isProfileSheetOpen}
          onClose={() => setIsProfileSheetOpen(false)}
          actor={state.actor}
          role={state.role}
          canSwitchRole={state.canSwitchRole}
          currentBranch={state.currentBranch}
          selectedStoreId={state.selectedStoreId}
          onSelectBranch={state.isAdmin ? state.setSelectedStoreId : undefined}
          availableBranches={state.availableBranches}
          isAdmin={state.isAdmin}
          onRoleChange={(r) => {
            state.setRole(r);
            setIsProfileSheetOpen(false);
          }}
          onOpenPaystub={() => {
            state.setActiveTab('paystub');
            setIsProfileSheetOpen(false);
          }}
          onOpenChat={() => {
            setIsProfileSheetOpen(false);
            const chatUrl = '/chat';
            const win = window.open(chatUrl, '_blank');
            if (!win || win.closed || typeof win.closed === 'undefined') {
              window.location.href = chatUrl;
            }
          }}
          onOpenCareer={() => {
            setIsProfileSheetOpen(false);
            const staffIdParam = state.actor?.staffId ? `?staffId=${state.actor.staffId}` : '';
            const careerUrl = `/dashboard/career-path${staffIdParam}`;
            const win = window.open(careerUrl, '_blank');
            if (!win || win.closed || typeof win.closed === 'undefined') {
              window.location.href = careerUrl;
            }
          }}
          onLogout={() => {
            setIsProfileSheetOpen(false);
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('mos_token');
              window.localStorage.removeItem('mos_user');
              window.localStorage.removeItem('mos_omicall_auto_init');
              window.localStorage.removeItem('mos_original_token');
              window.localStorage.removeItem('mos_original_user');
              window.localStorage.removeItem('mos_original_omicall_auto_init');
              window.localStorage.removeItem('mos_impersonation_audit_id');
              window.location.replace('/login');
            }
          }}
        />
      </div>
    </div>
  );
}

export default function IosAppPage() {
  return (
    <Suspense
      fallback={
        <div
          className="w-full min-h-[100dvh] flex items-center justify-center font-bold gap-1.5"
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
