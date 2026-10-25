import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BookingUpdateValidationError,
  buildLegacyBookingWindow,
  resolveBookingUpdateFields,
  resolveFinalOrderState,
} from './booking-update.service.js';

const currentDeThamBooking = {
  storeId: 6,
  technicianId: 3832,
  bookingDateStart: new Date('2026-08-24T14:00:00.000Z'),
  bookingNote: 'Khách custom campaign',
};

test('service-only updates preserve the existing branch and locked schedule', () => {
  const result = resolveBookingUpdateFields(currentDeThamBooking, {
    serviceId: 12,
    technicianId: 3832,
    bookingNote: 'Đổi dòng mi',
  });

  assert.equal(result.storeId, 6);
  assert.equal(result.bookingDate, '2026-08-24');
  assert.equal(result.bookingTime, '14:00');
  assert.equal(result.technicianId, 3832);
  assert.equal(result.isLockedScheduleUpdateRequested, false);
});

test('explicit reschedule updates the branch and time', () => {
  const result = resolveBookingUpdateFields(currentDeThamBooking, {
    storeId: 16,
    bookingDate: '2026-08-25',
    bookingTime: '16:30',
    technicianId: null,
  });

  assert.equal(result.storeId, 16);
  assert.equal(result.bookingDate, '2026-08-25');
  assert.equal(result.bookingTime, '16:30');
  assert.equal(result.technicianId, null);
  assert.equal(result.isLockedScheduleUpdateRequested, true);
});

test('legacy booking window preserves the database wall clock while recalculating duration', () => {
  assert.deepEqual(buildLegacyBookingWindow('2026-08-24', '14:00', 90), {
    bookingDateStart: '2026-08-24 14:00:00',
    bookingDateEnd: '2026-08-24 15:30:00',
  });
});

test('rejects invalid explicit branch values instead of applying a fallback', () => {
  assert.throws(
    () => resolveBookingUpdateFields(currentDeThamBooking, { storeId: 0, serviceId: 12 }),
    BookingUpdateValidationError
  );
});

test('submitting identical branch, date, and time does not trigger locked schedule update (MOS-BUG-144 diff check)', () => {
  const result = resolveBookingUpdateFields(currentDeThamBooking, {
    storeId: 6,
    bookingDate: '2026-08-24',
    bookingTime: '14:00',
    serviceId: 12,
    technicianId: 3832,
    bookingNote: 'Bỏ mã khuyến mãi trên lịch hẹn đã completed',
  });

  assert.equal(result.storeId, 6);
  assert.equal(result.bookingDate, '2026-08-24');
  assert.equal(result.bookingTime, '14:00');
  assert.equal(result.isLockedScheduleUpdateRequested, false);
});

test('changing only the date triggers locked schedule update', () => {
  const result = resolveBookingUpdateFields(currentDeThamBooking, {
    storeId: 6,
    bookingDate: '2026-08-25',
    bookingTime: '14:00',
  });

  assert.equal(result.isLockedScheduleUpdateRequested, true);
});

test('changing only the time triggers locked schedule update', () => {
  const result = resolveBookingUpdateFields(currentDeThamBooking, {
    storeId: 6,
    bookingDate: '2026-08-24',
    bookingTime: '15:30',
  });

  assert.equal(result.isLockedScheduleUpdateRequested, true);
});

test('changing only the branch triggers locked schedule update', () => {
  const result = resolveBookingUpdateFields(currentDeThamBooking, {
    storeId: 16,
    bookingDate: '2026-08-24',
    bookingTime: '14:00',
  });

  assert.equal(result.isLockedScheduleUpdateRequested, true);
});

test('resolveFinalOrderState preserves CheckOut and Completed states regardless of schedule update request', () => {
  // When an order is at CheckOut, dropping promo or changing CV must NEVER reset to New
  assert.equal(resolveFinalOrderState('CheckOut', false), 'CheckOut');
  assert.equal(resolveFinalOrderState('CheckOut', true), 'CheckOut');

  // When an order is Completed, it must NEVER reset to New
  assert.equal(resolveFinalOrderState('Completed', false), 'Completed');
  assert.equal(resolveFinalOrderState('Completed', true), 'Completed');

  // When an order is ServiceCompleted, it must NEVER reset to New
  assert.equal(resolveFinalOrderState('ServiceCompleted', false), 'ServiceCompleted');
  assert.equal(resolveFinalOrderState('ServiceCompleted', true), 'ServiceCompleted');

  // When an order has reached CheckIn, it must NEVER reset to New
  assert.equal(resolveFinalOrderState('CheckIn', false), 'CheckIn');
  assert.equal(resolveFinalOrderState('CheckIn', true), 'CheckIn');
});

test('resolveFinalOrderState only resets pre-service appointments (New, Confirmed) to New when schedule changes', () => {
  // Confirmed without schedule change retains Confirmed
  assert.equal(resolveFinalOrderState('Confirmed', false), 'Confirmed');
  // Confirmed with schedule change transitions to New for re-confirmation
  assert.equal(resolveFinalOrderState('Confirmed', true), 'New');

  // New retains New
  assert.equal(resolveFinalOrderState('New', false), 'New');
  assert.equal(resolveFinalOrderState('New', true), 'New');
});
