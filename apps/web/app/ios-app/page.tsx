'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { canAccessIosConsultationApp, isCvRole, resolveLockedIosRoleForUser } from '@mos-lab/shared';
import { useIosAppState, IosUserRole } from './state/useIosAppState';
import { IosTabBar } from './components/ui-kit/IosTabBar';
import { IosProfileMenuSheet } from './components/ui-kit/IosProfileMenuSheet';
import HeaderRoleQuickSwitch from '../../components/layout/HeaderRoleQuickSwitch';

import { Screen01IncomingBookings } from './components/screens/Screen01IncomingBookings';
import { Screen02CheckInProfile } from './components/screens/Screen02CheckInProfile';
import { Screen03ConsultationMatrix } from './components/screens/Screen03ConsultationMatrix';
import { Screen04StaffQueueAssign } from './components/screens/Screen04StaffQueueAssign';
import { Screen05ServicingTransfer } from './components/screens/Screen05ServicingTransfer';
import { Screen06CvDashboardReceive } from './components/screens/Screen06CvDashboardReceive';
import { Screen07LashProgressBefore } from './components/screens/Screen07LashProgressBefore';
import { Screen08LashProgressTimer } from './components/screens/Screen08LashProgressTimer';
import { Screen09LashProgressAfter } from './components/screens/Screen09LashProgressAfter';
import { Screen10CustomerSurvey } from './components/screens/Screen10CustomerSurvey';
import { Screen11ProductUpsell } from './components/screens/Screen11ProductUpsell';
import { Screen12CheckoutBilling } from './components/screens/Screen12CheckoutBilling';
import { Screen13CheckoutTip } from './components/screens/Screen13CheckoutTip';
import { Screen14ThermalReceiptDone } from './components/screens/Screen14ThermalReceiptDone';

import { ScreenStoreDashboard } from './components/screens/ScreenStoreDashboard';
import { ScreenInventoryStock } from './components/screens/ScreenInventoryStock';
import { ScreenCvPaystub } from './components/screens/ScreenCvPaystub';
import { ScreenSettingsRoleSwitch } from './components/screens/ScreenSettingsRoleSwitch';

function IosAppInner() {
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState<boolean>(false);
  const searchParams = useSearchParams();
  const stepStr = searchParams.get('step');
  const roleParam = searchParams.get('role')?.toUpperCase() as IosUserRole | undefined;
  const initialStep = stepStr ? parseInt(stepStr, 10) : 1;
  const initialRole: IosUserRole =
    roleParam && ['CVL', 'CVLL', 'CC', 'CV', 'STORE', 'INVENTORY'].includes(roleParam) ? roleParam : 'CVL';

  const state = useIosAppState(initialStep, authorized, initialRole);

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

  if (!authorized) {
    return (
      <div className="w-full min-h-[100dvh] bg-black flex items-center justify-center text-amber-500 font-bold">
        Đang mở ứng dụng Tư vấn & Checkout (CV🪶)...
      </div>
    );
  }

  const renderActiveScreen = () => {
    // 1. Màn hình Cài đặt & Chuyển vai trò
    if (state.isSettingsOpen) {
      return (
        <ScreenSettingsRoleSwitch
          currentRole={state.role}
          canSwitchRole={state.canSwitchRole}
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
          onSelectBooking={(id) => {
            state.setActiveBookingId(id);
            state.setRole('CVL');
            state.setCurrentStep(2);
          }}
          onOpenSettings={() => state.setIsSettingsOpen(true)}
        />
      );
    }

    // 3. Vai trò Quản Lý Kho (INVENTORY)
    if (state.role === 'INVENTORY') {
      return <ScreenInventoryStock onOpenSettings={() => state.setIsSettingsOpen(true)} />;
    }

    // 4. Tab Thu nhập tạm tính (Paystub) cho CV🪶 / 🪶CV🪶 / CV
    if (['CV', 'CVL', 'CVLL'].includes(state.role) && state.activeTab === 'paystub') {
      return (
        <ScreenCvPaystub
          onBack={() => {
            state.setActiveTab('booking');
            state.setCurrentStep(1);
          }}
          onOpenSettings={() => state.setIsSettingsOpen(true)}
        />
      );
    }

    // 5. Core Service Flow (14 màn hình chuẩn iOS kết nối DB thực tế cho CV🪶 & 🪶CV🪶)
    switch (state.currentStep) {
      case 1:
        return (
          <Screen01IncomingBookings
            bookings={state.bookings}
            bookingSegment={state.bookingSegment}
            setBookingSegment={state.setBookingSegment}
            counts={state.counts}
            isRefreshing={state.isRefreshing}
            lastRefreshedAt={state.lastRefreshedAt}
            isLiveDb={state.isLiveDb}
            onRefreshDb={() => state.refreshDb()}
            role={state.role}
            canSwitchRole={state.canSwitchRole}
            onRoleChange={state.setRole}
            actor={state.actor}
            scopeMode={state.scopeMode}
            onScopeModeChange={state.setScopeMode}
            onSelectBooking={(id) => {
              state.setActiveBookingId(id);
              state.setCurrentStep(2);
            }}
            onOpenProfileMenu={() => setIsProfileSheetOpen(true)}
          />
        );
      case 2:
        return (
          <Screen02CheckInProfile
            booking={state.activeBooking}
            actor={state.actor}
            onBack={() => state.setCurrentStep(1)}
            onCheckIn={state.handleCheckIn}
            onQuickCheckIn={state.handleSaveConsultation}
          />
        );
      case 3:
        return (
          <Screen03ConsultationMatrix
            booking={state.activeBooking}
            actor={state.actor}
            onBack={() => state.setCurrentStep(2)}
            onSave={state.handleSaveConsultation}
          />
        );
      case 4:
        return <Screen04StaffQueueAssign onBack={() => state.setCurrentStep(3)} onAssign={state.handleAssignStaff} />;
      case 5:
        return <Screen05ServicingTransfer booking={state.activeBooking} onTransferToCv={state.handleTransferToCv} />;
      case 6:
        return (
          <Screen06CvDashboardReceive
            booking={state.activeBooking}
            onStartTask={state.handleCvStartTask}
            onEditService={() => state.handleOpenConsultation(6)}
            staffStats={state.staffStats}
          />
        );
      case 7:
        return (
          <Screen07LashProgressBefore
            onBack={() => state.setCurrentStep(6)}
            onSavePhoto={state.handleSaveBeforePhoto}
          />
        );
      case 8:
        return (
          <Screen08LashProgressTimer
            booking={state.activeBooking}
            onBack={() => state.setCurrentStep(7)}
            onFinishTimer={state.handleFinishTimer}
            onEditService={() => state.handleOpenConsultation(8)}
          />
        );
      case 9:
        return (
          <Screen09LashProgressAfter
            booking={state.activeBooking}
            onBack={() => state.setCurrentStep(8)}
            onSavePhoto={state.handleSaveAfterPhoto}
          />
        );
      case 10:
        return (
          <Screen10CustomerSurvey
            customerName={state.activeBooking.customerName}
            staffName={state.activeBooking.assignedStaffName}
            onBack={() => state.setCurrentStep(9)}
            onComplete={state.handleCompleteSurvey}
          />
        );
      case 11:
        return (
          <Screen11ProductUpsell
            booking={state.activeBooking}
            actor={state.actor}
            onBack={() => state.setCurrentStep(10)}
            onGoToBilling={state.handleGoToBilling}
          />
        );
      case 12:
        return (
          <Screen12CheckoutBilling
            booking={state.activeBooking}
            actor={state.actor}
            onBack={() => state.setCurrentStep(11)}
            onChoosePayment={state.handleChoosePaymentMethod}
            onEditService={() => state.handleOpenConsultation(12)}
          />
        );
      case 13:
        return (
          <Screen13CheckoutTip
            booking={state.activeBooking}
            actor={state.actor}
            onBack={() => state.setCurrentStep(12)}
            onRecordTip={state.handleRecordTip}
          />
        );
      case 14:
        return <Screen14ThermalReceiptDone booking={state.activeBooking} onFinishOrder={state.handleFinishOrder} />;
      default:
        return (
          <Screen01IncomingBookings
            bookings={state.bookings}
            bookingSegment={state.bookingSegment}
            setBookingSegment={state.setBookingSegment}
            role={state.role}
            canSwitchRole={state.canSwitchRole}
            onRoleChange={state.setRole}
            actor={state.actor}
            scopeMode={state.scopeMode}
            onScopeModeChange={state.setScopeMode}
            onSelectBooking={(id) => {
              state.setActiveBookingId(id);
              state.setCurrentStep(2);
            }}
            onOpenProfileMenu={() => setIsProfileSheetOpen(true)}
          />
        );
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
      state.setCurrentStep(6);
    } else if (tab === 'paystub') {
      state.setActiveTab('paystub');
    }
  };

  return (
    <div className="w-full h-[100dvh] max-h-[100dvh] bg-black flex justify-center text-neutral-100 font-sans select-none overflow-hidden">
      <div className="w-full max-w-[430px] h-[100dvh] max-h-[100dvh] flex flex-col bg-black relative overflow-hidden">
        {/* Screen Body */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-black">{renderActiveScreen()}</div>

        {/* Real Native iOS Bottom TabBar */}
        {showTabBar && (
          <IosTabBar
            role={state.role}
            activeTab={state.activeTab}
            onTabChange={handleTabChange}
            onCenterPlusClick={() => {
              state.setActiveTab('booking');
              state.setCurrentStep(3);
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
          }}
          onOpenCareer={() => {
            setIsProfileSheetOpen(false);
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
        <div className="w-full min-h-[100dvh] bg-black flex items-center justify-center text-amber-500 font-bold">
          Đang tải ứng dụng Tư vấn & Checkout (CV🪶)...
        </div>
      }
    >
      <IosAppInner />
    </Suspense>
  );
}
