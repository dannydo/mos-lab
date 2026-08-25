import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BookingUpdateValidationError,
  buildLegacyBookingWindow,
  resolveBookingUpdateFields,
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
