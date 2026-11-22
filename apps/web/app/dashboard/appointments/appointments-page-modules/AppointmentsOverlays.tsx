'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import type { Appointment } from '@mos-lab/shared';
import MissedReasonModal from '../components/MissedReasonModal';

const CustomerDetailDrawer = dynamic(() => import('~/components/CustomerDetailDrawer'), { ssr: false });
const BookingWizardDrawer = dynamic(() => import('~/components/BookingWizardDrawer'), { ssr: false });
const RescheduleBookingModal = dynamic(
  () => import('~/components/RescheduleBookingModal').then((module) => module.RescheduleBookingModal),
  { ssr: false }
);

export interface AppointmentsOverlaysProps {
  detailModalVisible: boolean;
  selectedCustomerId: number | null;
  onCloseDetailModal: () => void;
  bookingWizardVisible: boolean;
  bookingInitialCustomer: SafeAny;
  onCloseBookingWizard: () => void;
  rescheduleModalVisible: boolean;
  selectedBookingForReschedule: SafeAny;
  onCloseRescheduleModal: () => void;
  missedReasonModalVisible: boolean;
  selectedMissedAppointment: Appointment | null;
  onCloseMissedReasonModal: () => void;
  onRefreshAppointments: () => void;
  onRefreshMissedSummary: () => void;
  onPrefillRescheduledBooking: (customer: { id: number; fullName: string; phoneNumber: string }) => void;
  onOpenRescheduleFromMissed: (appointment: Appointment) => void;
  makeCall: (phone: string, name: string, id: number, avatar?: string) => void;
}

export function AppointmentsOverlays({
  detailModalVisible,
  selectedCustomerId,
  onCloseDetailModal,
  bookingWizardVisible,
  bookingInitialCustomer,
  onCloseBookingWizard,
  rescheduleModalVisible,
  selectedBookingForReschedule,
  onCloseRescheduleModal,
  missedReasonModalVisible,
  selectedMissedAppointment,
  onCloseMissedReasonModal,
  onRefreshAppointments,
  onRefreshMissedSummary,
  onPrefillRescheduledBooking,
  onOpenRescheduleFromMissed,
  makeCall,
}: AppointmentsOverlaysProps) {
  return (
    <>
      {detailModalVisible && (
        <CustomerDetailDrawer
          open={detailModalVisible}
          customerId={selectedCustomerId}
          onClose={onCloseDetailModal}
          onUpdate={onRefreshAppointments}
        />
      )}

      {bookingWizardVisible && (
        <BookingWizardDrawer
          open={bookingWizardVisible}
          initialCustomer={bookingInitialCustomer}
          onClose={onCloseBookingWizard}
          onSuccess={onRefreshAppointments}
        />
      )}

      {rescheduleModalVisible && (
        <RescheduleBookingModal
          open={rescheduleModalVisible}
          booking={selectedBookingForReschedule}
          onClose={onCloseRescheduleModal}
          onSuccess={onRefreshAppointments}
        />
      )}

      {missedReasonModalVisible && (
        <MissedReasonModal
          visible={missedReasonModalVisible}
          appointment={selectedMissedAppointment}
          onCancel={onCloseMissedReasonModal}
          onSuccess={(status) => {
            onRefreshAppointments();
            onRefreshMissedSummary();
            if (status === 'RESCHEDULED' && selectedMissedAppointment) {
              onPrefillRescheduledBooking({
                id: selectedMissedAppointment.customerId,
                fullName: selectedMissedAppointment.customerName,
                phoneNumber: selectedMissedAppointment.customerPhone || '',
              });
            }
          }}
          makeCall={makeCall}
          onOpenReschedule={onOpenRescheduleFromMissed}
        />
      )}
    </>
  );
}
