import { useCallback, useEffect, useState } from 'react';
import type { Dayjs } from 'dayjs';
import type { Appointment } from '@mos-lab/shared';
import { resolveOffDayRescheduleCheck } from './scheduleCalendarHelpers';

export function useScheduleRescheduleAndDrawers() {
  const [detailCustomerId, setDetailCustomerId] = useState<number | null>(null);
  const [customerDrawerOpen, setCustomerDrawerOpen] = useState<boolean>(false);

  const [bookingWizardOpen, setBookingWizardOpen] = useState<boolean>(false);
  const [bookingInitialCustomer, setBookingInitialCustomer] = useState<any>(null);

  const [rescheduleModalOpen, setRescheduleModalOpen] = useState<boolean>(false);
  const [selectedRescheduleAppt, setSelectedRescheduleAppt] = useState<Appointment | null>(null);

  const [preOffDayModalOpen, setPreOffDayModalOpen] = useState<boolean>(false);
  const [preOffDayAppt, setPreOffDayAppt] = useState<any | null>(null);
  const [preOffDayTargetDate, setPreOffDayTargetDate] = useState<string | null>(null);
  const [preOffDayTargetTime, setPreOffDayTargetTime] = useState<string | null>(null);
  const [preOffDayNextWorkingDate, setPreOffDayNextWorkingDate] = useState<Dayjs | null>(null);

  const handleRescheduleRequest = useCallback((appt: any, newDateTime?: string) => {
    if (!appt) return;

    const check = resolveOffDayRescheduleCheck(appt, newDateTime);
    if (check.isOff) {
      setPreOffDayAppt(appt);
      setPreOffDayTargetDate(check.targetDateStr);
      setPreOffDayTargetTime(check.targetTimeStr);
      setPreOffDayNextWorkingDate(check.nextWorkingDate);
      setPreOffDayModalOpen(true);
      return;
    }

    setSelectedRescheduleAppt({
      ...appt,
      targetBookingDate: check.targetDateStr ?? undefined,
      targetBookingTime: check.targetTimeStr ?? undefined,
    });
    setRescheduleModalOpen(true);
  }, []);

  // Keep the test hook out of render so React can safely replay renders.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const testWindow = window as typeof window & {
      __testHandleReschedule?: typeof handleRescheduleRequest;
    };
    testWindow.__testHandleReschedule = handleRescheduleRequest;

    return () => {
      if (testWindow.__testHandleReschedule === handleRescheduleRequest) {
        delete testWindow.__testHandleReschedule;
      }
    };
  }, [handleRescheduleRequest]);

  const openCustomerDetail = useCallback((customerId: number) => {
    setDetailCustomerId(customerId);
    setCustomerDrawerOpen(true);
  }, []);

  const closeCustomerDetail = useCallback(() => {
    setCustomerDrawerOpen(false);
    setDetailCustomerId(null);
  }, []);

  const openNewBooking = useCallback((initialCustomer: any = null) => {
    setBookingInitialCustomer(initialCustomer);
    setBookingWizardOpen(true);
  }, []);

  const closeBookingWizard = useCallback(() => {
    setBookingWizardOpen(false);
    setBookingInitialCustomer(null);
  }, []);

  const closeRescheduleModal = useCallback(() => {
    setRescheduleModalOpen(false);
    setSelectedRescheduleAppt(null);
  }, []);

  const cancelPreOffDayWarning = useCallback(() => {
    setPreOffDayModalOpen(false);
    setPreOffDayAppt(null);
  }, []);

  const continuePreOffDayWarning = useCallback(() => {
    const apptToPass = {
      ...preOffDayAppt,
      targetBookingDate: preOffDayTargetDate,
      targetBookingTime: preOffDayTargetTime,
      isOffDayDrop: true,
    };
    setPreOffDayModalOpen(false);
    setPreOffDayAppt(null);
    setTimeout(() => {
      setSelectedRescheduleAppt(apptToPass);
      setRescheduleModalOpen(true);
    }, 350);
  }, [preOffDayAppt, preOffDayTargetDate, preOffDayTargetTime]);

  return {
    detailCustomerId,
    customerDrawerOpen,
    openCustomerDetail,
    closeCustomerDetail,
    bookingWizardOpen,
    bookingInitialCustomer,
    openNewBooking,
    closeBookingWizard,
    rescheduleModalOpen,
    selectedRescheduleAppt,
    closeRescheduleModal,
    preOffDayModalOpen,
    preOffDayAppt,
    preOffDayTargetDate,
    preOffDayNextWorkingDate,
    handleRescheduleRequest,
    cancelPreOffDayWarning,
    continuePreOffDayWarning,
  };
}
