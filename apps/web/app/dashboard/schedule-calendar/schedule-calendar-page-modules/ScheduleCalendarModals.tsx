'use client';

import React from 'react';
import nextDynamic from 'next/dynamic';
import type { Dayjs } from 'dayjs';
import type { Appointment } from '@mos-lab/shared';
import { OffDayRescheduleWarningModal } from '../components/OffDayRescheduleWarningModal';

const CustomerDetailDrawer = nextDynamic(() => import('~/components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = nextDynamic(() => import('~/components/BookingWizardDrawer'), { ssr: false });
const RescheduleBookingModal = nextDynamic(
  () => import('~/components/RescheduleBookingModal').then((m) => m.RescheduleBookingModal),
  { ssr: false }
);

interface ScheduleCalendarModalsProps {
  themeMode: 'dark' | 'light';
  preOffDayModalOpen: boolean;
  preOffDayAppt: any | null;
  preOffDayTargetDate: string | null;
  preOffDayNextWorkingDate: Dayjs | null;
  onCancelPreOffDay: () => void;
  onContinuePreOffDay: () => void;
  customerDrawerOpen: boolean;
  detailCustomerId: number | null;
  onCloseCustomerDrawer: () => void;
  bookingWizardOpen: boolean;
  bookingInitialCustomer: any;
  onCloseBookingWizard: () => void;
  rescheduleModalOpen: boolean;
  selectedRescheduleAppt: Appointment | null;
  onCloseRescheduleModal: () => void;
  onRefreshAppointments: () => void;
}

export function ScheduleCalendarModals({
  themeMode,
  preOffDayModalOpen,
  preOffDayAppt,
  preOffDayTargetDate,
  preOffDayNextWorkingDate,
  onCancelPreOffDay,
  onContinuePreOffDay,
  customerDrawerOpen,
  detailCustomerId,
  onCloseCustomerDrawer,
  bookingWizardOpen,
  bookingInitialCustomer,
  onCloseBookingWizard,
  rescheduleModalOpen,
  selectedRescheduleAppt,
  onCloseRescheduleModal,
  onRefreshAppointments,
}: ScheduleCalendarModalsProps) {
  return (
    <>
      <OffDayRescheduleWarningModal
        open={preOffDayModalOpen}
        appointment={preOffDayAppt}
        targetDate={preOffDayTargetDate}
        nextWorkingDate={preOffDayNextWorkingDate}
        themeMode={themeMode}
        onCancel={onCancelPreOffDay}
        onContinue={onContinuePreOffDay}
      />

      {customerDrawerOpen && (
        <CustomerDetailDrawer
          open={customerDrawerOpen}
          customerId={detailCustomerId}
          onClose={onCloseCustomerDrawer}
          onUpdate={onRefreshAppointments}
        />
      )}

      {bookingWizardOpen && (
        <BookingWizardDrawer
          open={bookingWizardOpen}
          initialCustomer={bookingInitialCustomer}
          onClose={onCloseBookingWizard}
          onSuccess={onRefreshAppointments}
        />
      )}

      {rescheduleModalOpen && (
        <RescheduleBookingModal
          open={rescheduleModalOpen}
          booking={selectedRescheduleAppt}
          onClose={onCloseRescheduleModal}
          onSuccess={onRefreshAppointments}
        />
      )}
    </>
  );
}
