'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useIosAppState, IosUserRole } from './state/useIosAppState';
import { IosTabBar } from './components/ui-kit/IosTabBar';

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
  const searchParams = useSearchParams();
  const stepStr = searchParams.get('step');
  const initialStep = stepStr ? parseInt(stepStr, 10) : undefined;
  const state = useIosAppState(initialStep);

  const renderActiveScreen = () => {
    // 1. Màn hình Cài đặt & Chuyển vai trò
    if (state.isSettingsOpen) {
      return (
        <ScreenSettingsRoleSwitch
          currentRole={state.role}
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
            state.setRole('CC');
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

    // 4. Vai trò Chuyên Viên (CV) - Tab Thu nhập tạm tính (More)
    if (state.role === 'CV' && state.activeTab === 'more') {
      return (
        <ScreenCvPaystub
          onBack={() => state.setActiveTab('task')}
          onOpenSettings={() => state.setIsSettingsOpen(true)}
        />
      );
    }

    // 5. Core Service Flow (14 màn hình chuẩn iOS)
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
            onSelectBooking={(id) => {
              state.setActiveBookingId(id);
              state.setCurrentStep(2);
            }}
          />
        );
      case 2:
        return (
          <Screen02CheckInProfile
            booking={state.activeBooking}
            onBack={() => state.setCurrentStep(1)}
            onCheckIn={state.handleCheckIn}
          />
        );
      case 3:
        return (
          <Screen03ConsultationMatrix onBack={() => state.setCurrentStep(2)} onSave={state.handleSaveConsultation} />
        );
      case 4:
        return <Screen04StaffQueueAssign onBack={() => state.setCurrentStep(3)} onAssign={state.handleAssignStaff} />;
      case 5:
        return <Screen05ServicingTransfer booking={state.activeBooking} onTransferToCv={state.handleTransferToCv} />;
      case 6:
        return <Screen06CvDashboardReceive booking={state.activeBooking} onStartTask={state.handleCvStartTask} />;
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
          <Screen11ProductUpsell onBack={() => state.setCurrentStep(10)} onGoToBilling={state.handleGoToBilling} />
        );
      case 12:
        return (
          <Screen12CheckoutBilling
            onBack={() => state.setCurrentStep(11)}
            onChoosePayment={state.handleChoosePaymentMethod}
          />
        );
      case 13:
        return <Screen13CheckoutTip onBack={() => state.setCurrentStep(12)} onRecordTip={state.handleRecordTip} />;
      case 14:
        return <Screen14ThermalReceiptDone booking={state.activeBooking} onFinishOrder={state.handleFinishOrder} />;
      default:
        return (
          <Screen01IncomingBookings
            bookings={state.bookings}
            bookingSegment={state.bookingSegment}
            setBookingSegment={state.setBookingSegment}
            onSelectBooking={(id) => {
              state.setActiveBookingId(id);
              state.setCurrentStep(2);
            }}
          />
        );
    }
  };

  const showTabBar = !state.isSettingsOpen && ![10, 13, 14].includes(state.currentStep);

  const handleTabChange = (tab: string) => {
    state.setActiveTab(tab);
    if (tab === 'more') {
      state.setIsSettingsOpen(true);
      return;
    }

    if (state.role === 'CC') {
      if (tab === 'booking') state.setCurrentStep(1);
    } else if (state.role === 'CV') {
      if (tab === 'task') state.setCurrentStep(6);
    }
  };

  return (
    <div className="w-full min-h-[100dvh] bg-black flex justify-center text-neutral-100 font-sans select-none overflow-x-hidden">
      <div className="w-full max-w-[430px] min-h-[100dvh] flex flex-col bg-black relative">
        {/* Screen Body */}
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden bg-black">{renderActiveScreen()}</div>

        {/* Real Native iOS Bottom TabBar */}
        {showTabBar && (
          <IosTabBar
            role={state.role}
            activeTab={state.activeTab}
            onTabChange={handleTabChange}
            onCenterPlusClick={() => {
              state.setRole('CC');
              state.setCurrentStep(1);
            }}
            badgeCounts={{
              booking: 0,
              task: 0,
              staff: 0,
              dispense: 0,
            }}
          />
        )}
      </div>
    </div>
  );
}

export default function IosAppClonePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-[100dvh] bg-black flex items-center justify-center text-amber-500 font-bold">
          Loading Wings App...
        </div>
      }
    >
      <IosAppInner />
    </Suspense>
  );
}
