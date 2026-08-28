'use client';

/**
 * A booking mutation has to refresh both operational lists and the customer
 * dossier. Keep the browser events in one place so every mutation carries the
 * affected customer when it is known.
 */
export const BOOKING_HISTORY_UPDATED_EVENT = 'mos-booking-history-updated';

export type BookingMutationAction = 'created' | 'updated' | 'rescheduled' | 'cancelled';

export interface BookingMutationEventDetail {
  action: BookingMutationAction;
  customerId: number | null;
}

interface NotifyBookingMutationOptions {
  refreshCallLog?: boolean;
}

export const toBookingCustomerId = (value: unknown): number | null => {
  const customerId = Number(value);
  return Number.isInteger(customerId) && customerId > 0 ? customerId : null;
};

export const notifyBookingMutation = (
  detail: BookingMutationEventDetail,
  options: NotifyBookingMutationOptions = {}
) => {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(BOOKING_HISTORY_UPDATED_EVENT, { detail }));
  window.dispatchEvent(new CustomEvent('mos-booking-updated', { detail }));
  window.dispatchEvent(new CustomEvent('mos-customer-updated', { detail }));
  window.dispatchEvent(
    new CustomEvent('mos-data-updated', { detail: { type: detail.action, customerId: detail.customerId } })
  );

  if (options.refreshCallLog) {
    window.dispatchEvent(new CustomEvent('mos-call-log-saved'));
  }
};
