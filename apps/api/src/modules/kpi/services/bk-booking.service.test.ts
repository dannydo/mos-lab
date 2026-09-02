import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bookingDetailsStatusCondition,
  bookingMissedSqlCondition,
  isBkBookingMissedState,
} from './bk-booking.service.js';

test('Booking Missed KPI only recognises finalized Cancelled or Missed states', () => {
  assert.equal(isBkBookingMissedState('Missed'), true);
  assert.equal(isBkBookingMissedState('Cancelled'), true);
  assert.equal(isBkBookingMissedState('New'), false);
  assert.equal(isBkBookingMissedState('Confirmed'), false);
  assert.equal(isBkBookingMissedState(null), false);
});

test('Booking detail filters share the same finalized Missed condition as the leaderboard', () => {
  assert.equal(bookingMissedSqlCondition(), "o.order_state IN ('Cancelled', 'Missed')");
  assert.equal(bookingDetailsStatusCondition('MISSED'), bookingMissedSqlCondition());
  assert.equal(bookingDetailsStatusCondition('COMPLETED'), "o.order_state = 'Completed'");
  assert.equal(bookingDetailsStatusCondition('ALL'), '1=1');
});
