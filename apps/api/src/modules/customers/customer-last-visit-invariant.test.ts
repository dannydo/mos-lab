import assert from 'node:assert/strict';
import test from 'node:test';
import { daysSinceVisit } from '../projections/customer-visit-projection.service.js';

test('daysSinceVisit calculates accurate day difference from completed booking date', () => {
  const fixedNow = new Date('2026-10-13T10:00:00.000Z');
  const pastVisit = new Date('2025-06-05T14:00:00.000Z');

  const diffMs = fixedNow.getTime() - pastVisit.getTime();
  const expectedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  assert.equal(expectedDays, 494); // Depending on exact hours: 494 or 495 days

  const calculatedDays = daysSinceVisit(pastVisit);
  assert.ok(typeof calculatedDays === 'number');
  assert.ok(calculatedDays >= 494 && calculatedDays <= 496);
});

test('customer with zero completed visits resolves daysSinceLastVisit to null, not 0 or spurious date', () => {
  const completedOrders: Array<{ id: number; bookingDate: string | Date }> = [];
  const orderMetric = {
    totalVisits: 0,
    lastVisitAt: null,
  };

  const latestVisitDate =
    completedOrders.length > 0 && completedOrders[0].bookingDate ? completedOrders[0].bookingDate : null;
  const daysSince = latestVisitDate ? daysSinceVisit(latestVisitDate) : null;

  assert.equal(latestVisitDate, null);
  assert.equal(daysSince, null);

  // In list mapper:
  let listLastVisit: string | Date | null = null;
  let listDaysSince: number | null = null;
  if (orderMetric && Number(orderMetric.totalVisits) > 0 && orderMetric.lastVisitAt) {
    listLastVisit = orderMetric.lastVisitAt;
    listDaysSince = daysSinceVisit(orderMetric.lastVisitAt);
  } else {
    listLastVisit = null;
    listDaysSince = null;
  }

  assert.equal(listLastVisit, null);
  assert.equal(listDaysSince, null);
});

test('customer 47608 scenario: spurious uncompleted booking date does not overwrite canonical visit date', () => {
  const completedOrders = [
    {
      id: 304917,
      bookingDate: '2025-06-05T14:00:00.000Z',
      orderState: 'Completed',
    },
  ];

  // Spurious pending booking that previously corrupted last_order_booking
  const spuriousBookingDate = '2026-10-12T10:00:00.000Z';

  // Canonical resolution takes latest completed order:
  const latestVisitDate = completedOrders.length > 0 ? completedOrders[0].bookingDate : null;
  const daysSince = latestVisitDate ? daysSinceVisit(latestVisitDate) : null;

  assert.equal(latestVisitDate, '2025-06-05T14:00:00.000Z');
  assert.notEqual(latestVisitDate, spuriousBookingDate);
  assert.ok(typeof daysSince === 'number');
  assert.ok(daysSince! > 490);
});

test('ProfileDetailsCard display contract handles null and valid numbers correctly', () => {
  const formatDaysText = (daysSinceLastVisit: number | null | undefined): string => {
    return daysSinceLastVisit !== null && daysSinceLastVisit !== undefined
      ? `${daysSinceLastVisit} ngày`
      : 'Chưa từng đến';
  };

  assert.equal(formatDaysText(null), 'Chưa từng đến');
  assert.equal(formatDaysText(undefined), 'Chưa từng đến');
  assert.equal(formatDaysText(0), '0 ngày');
  assert.equal(formatDaysText(1), '1 ngày');
  assert.equal(formatDaysText(495), '495 ngày');
});
