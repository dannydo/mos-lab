'use client';

import { useCallback, useMemo, useState } from 'react';
import { buildBookingCycleMap, buildNotesByBookingMap } from './bookingsTabHelpers';
import type { SelectedBookingForCancel, SelectedOrderForAudit } from './types';

interface UseBookingsTabStateParams {
  bookings: SafeAny[];
  notes?: SafeAny[];
  customer: SafeAny;
  onRefreshDetails?: () => void;
}

export function useBookingsTabState({ bookings, notes, customer, onRefreshDetails }: UseBookingsTabStateParams) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBookingForCancel, setSelectedBookingForCancel] = useState<SelectedBookingForCancel | null>(null);
  const [auditDrawerOpen, setAuditDrawerOpen] = useState(false);
  const [selectedOrderIdForAudit, setSelectedOrderIdForAudit] = useState<SelectedOrderForAudit | null>(null);

  const notesByBookingMap = useMemo(() => buildNotesByBookingMap(notes, bookings), [notes, bookings]);
  const bookingCycleMap = useMemo(() => buildBookingCycleMap(bookings), [bookings]);

  const handleOpenAudit = useCallback((booking: SafeAny) => {
    setSelectedOrderIdForAudit({ id: booking.id, key: booking.orderKey });
    setAuditDrawerOpen(true);
  }, []);

  const handleCloseAudit = useCallback(() => {
    setAuditDrawerOpen(false);
    setSelectedOrderIdForAudit(null);
  }, []);

  const handleOpenCancel = useCallback(
    (booking: SafeAny) => {
      setSelectedBookingForCancel({
        id: booking.id,
        orderKey: booking.orderKey,
        dateCreated: booking.dateCreated,
        bookingDate: booking.bookingDate,
        createdStaffId: booking.createdStaffId,
        createdStaffName: booking.createdStaffName || booking.bookerName,
        customerName: customer?.name || 'Khách Hàng',
      });
      setCancelModalOpen(true);
    },
    [customer?.name]
  );

  const handleCloseCancel = useCallback(() => {
    setCancelModalOpen(false);
    setSelectedBookingForCancel(null);
  }, []);

  const handleCancelSuccess = useCallback(() => {
    const cancelledId = selectedBookingForCancel?.id;
    setCancelModalOpen(false);
    setSelectedBookingForCancel(null);
    if (onRefreshDetails) {
      onRefreshDetails();
    } else if (cancelledId) {
      window.location.reload();
    }
  }, [onRefreshDetails, selectedBookingForCancel?.id]);

  return {
    cancelModalOpen,
    selectedBookingForCancel,
    auditDrawerOpen,
    selectedOrderIdForAudit,
    notesByBookingMap,
    bookingCycleMap,
    handleOpenAudit,
    handleCloseAudit,
    handleOpenCancel,
    handleCloseCancel,
    handleCancelSuccess,
  };
}
