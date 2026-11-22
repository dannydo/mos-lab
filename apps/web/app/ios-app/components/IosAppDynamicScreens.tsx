'use client';

import React from 'react';
import dynamic from 'next/dynamic';

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

export const Screen02CheckInProfile = dynamic(
  () => import('./screens/Screen02CheckInProfile').then((m) => m.Screen02CheckInProfile),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen03ConsultationMatrix = dynamic(
  () => import('./screens/Screen03ConsultationMatrix').then((m) => m.Screen03ConsultationMatrix),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen04StaffQueueAssign = dynamic(
  () => import('./screens/Screen04StaffQueueAssign').then((m) => m.Screen04StaffQueueAssign),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen05ServicingTransfer = dynamic(
  () => import('./screens/Screen05ServicingTransfer').then((m) => m.Screen05ServicingTransfer),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen06CvDashboardReceive = dynamic(
  () => import('./screens/Screen06CvDashboardReceive').then((m) => m.Screen06CvDashboardReceive),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen07LashProgressBefore = dynamic(
  () => import('./screens/Screen07LashProgressBefore').then((m) => m.Screen07LashProgressBefore),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen07bLashProgressCleaned = dynamic(
  () => import('./screens/Screen07bLashProgressCleaned').then((m) => m.Screen07bLashProgressCleaned),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen08LashProgressTimer = dynamic(
  () => import('./screens/Screen08LashProgressTimer').then((m) => m.Screen08LashProgressTimer),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen09LashProgressAfter = dynamic(
  () => import('./screens/Screen09LashProgressAfter').then((m) => m.Screen09LashProgressAfter),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen10CustomerSurvey = dynamic(
  () => import('./screens/Screen10CustomerSurvey').then((m) => m.Screen10CustomerSurvey),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen11ProductUpsell = dynamic(
  () => import('./screens/Screen11ProductUpsell').then((m) => m.Screen11ProductUpsell),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen12CheckoutBilling = dynamic(
  () => import('./screens/Screen12CheckoutBilling').then((m) => m.Screen12CheckoutBilling),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen13CheckoutTip = dynamic(
  () => import('./screens/Screen13CheckoutTip').then((m) => m.Screen13CheckoutTip),
  { loading: () => <ScreenSkeleton /> }
);
export const Screen14ThermalReceiptDone = dynamic(
  () => import('./screens/Screen14ThermalReceiptDone').then((m) => m.Screen14ThermalReceiptDone),
  { loading: () => <ScreenSkeleton /> }
);
export const ScreenStoreDashboard = dynamic(
  () => import('./screens/ScreenStoreDashboard').then((m) => m.ScreenStoreDashboard),
  { loading: () => <ScreenSkeleton /> }
);
export const ScreenInventoryStock = dynamic(
  () => import('./screens/ScreenInventoryStock').then((m) => m.ScreenInventoryStock),
  { loading: () => <ScreenSkeleton /> }
);
export const ScreenCvPaystub = dynamic(() => import('./screens/ScreenCvPaystub').then((m) => m.ScreenCvPaystub), {
  loading: () => <ScreenSkeleton />,
});
export const ScreenSettingsRoleSwitch = dynamic(
  () => import('./screens/ScreenSettingsRoleSwitch').then((m) => m.ScreenSettingsRoleSwitch),
  { loading: () => <ScreenSkeleton /> }
);
