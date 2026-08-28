import { describe, expect, it, vi } from 'vitest';
import { BOOKING_HISTORY_UPDATED_EVENT, notifyBookingMutation, toBookingCustomerId } from './booking-events';

describe('booking mutation events', () => {
  it('emits the affected customer and the legacy refresh events', () => {
    const historyHandler = vi.fn();
    const bookingHandler = vi.fn();
    const dataHandler = vi.fn();

    window.addEventListener(BOOKING_HISTORY_UPDATED_EVENT, historyHandler);
    window.addEventListener('mos-booking-updated', bookingHandler);
    window.addEventListener('mos-data-updated', dataHandler);

    notifyBookingMutation({ action: 'rescheduled', customerId: 123 });

    expect(historyHandler).toHaveBeenCalledOnce();
    expect((historyHandler.mock.calls[0][0] as CustomEvent).detail).toEqual({ action: 'rescheduled', customerId: 123 });
    expect(bookingHandler).toHaveBeenCalledOnce();
    expect((dataHandler.mock.calls[0][0] as CustomEvent).detail).toEqual({
      type: 'rescheduled',
      customerId: 123,
    });

    window.removeEventListener(BOOKING_HISTORY_UPDATED_EVENT, historyHandler);
    window.removeEventListener('mos-booking-updated', bookingHandler);
    window.removeEventListener('mos-data-updated', dataHandler);
  });

  it('only accepts positive integer customer IDs', () => {
    expect(toBookingCustomerId('123')).toBe(123);
    expect(toBookingCustomerId(0)).toBeNull();
    expect(toBookingCustomerId('not-an-id')).toBeNull();
  });
});
