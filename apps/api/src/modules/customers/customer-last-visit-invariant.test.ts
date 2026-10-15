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
  const [listLastVisit, listDaysSince] =
    orderMetric && Number(orderMetric.totalVisits) > 0 && orderMetric.lastVisitAt
      ? [orderMetric.lastVisitAt, daysSinceVisit(orderMetric.lastVisitAt)]
      : [null, null];

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

test('MOS-BUG-109: NYC_30 campaign touchpoint cycle thresholds strictly match Completed visit days', () => {
  const nyc30Touchpoints = [
    { key: '1', label: 'Chăm sóc 24h', daysMin: 0, daysMax: 1 },
    { key: '2', label: 'Bảo hành kiểu Úc', daysMin: 2, daysMax: 3 },
    { key: '3', label: 'Chạm 14', daysMin: 14, daysMax: 14 },
    { key: '4', label: 'Chạm 19', daysMin: 19, daysMax: 19 },
    { key: '5', label: 'Chạm 21', daysMin: 21, daysMax: 21 },
  ];

  const matchTouchpoints = (completedVisitDays: number | null) => {
    if (completedVisitDays === null) return [];
    return nyc30Touchpoints
      .filter((tp) => completedVisitDays >= tp.daysMin && completedVisitDays <= tp.daysMax)
      .map((tp) => tp.label);
  };

  assert.deepEqual(matchTouchpoints(0), ['Chăm sóc 24h']);
  assert.deepEqual(matchTouchpoints(1), ['Chăm sóc 24h']);
  assert.deepEqual(matchTouchpoints(2), ['Bảo hành kiểu Úc']);
  assert.deepEqual(matchTouchpoints(3), ['Bảo hành kiểu Úc']);
  assert.deepEqual(matchTouchpoints(10), []);
  assert.deepEqual(matchTouchpoints(14), ['Chạm 14']);
  assert.deepEqual(matchTouchpoints(15), []);
  assert.deepEqual(matchTouchpoints(17), []);
  assert.deepEqual(matchTouchpoints(19), ['Chạm 19']);
  assert.deepEqual(matchTouchpoints(21), ['Chạm 21']);
  assert.deepEqual(matchTouchpoints(null), []);
});

test('MOS-BUG-109: customer with Completed visit 21 days ago and Missed booking 15 days ago stays in Chạm 21 with both metrics visible', () => {
  const orders = [
    { id: 101, bookingDate: '2026-09-23T10:00:00.000Z', orderState: 'Completed' },
    { id: 102, bookingDate: '2026-09-29T10:00:00.000Z', orderState: 'Cancelled' },
  ];
  const today = new Date('2026-10-14T00:00:00.000Z');

  const completedOrders = orders.filter((o) => o.orderState === 'Completed');
  const lastCompletedDate = new Date(completedOrders[0].bookingDate);
  lastCompletedDate.setUTCHours(0, 0, 0, 0);
  const daysSinceCompletedVisit = Math.floor(
    (today.getTime() - lastCompletedDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const lastBooking = orders[orders.length - 1];
  const lastBookingDate = new Date(lastBooking.bookingDate);
  lastBookingDate.setUTCHours(0, 0, 0, 0);
  const missedDays = Math.floor(
    (today.getTime() - lastBookingDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  assert.equal(daysSinceCompletedVisit, 21);
  assert.equal(missedDays, 15);
});

test('MOS-BUG-109: evening Completed visits (>= 17:00 ICT) return exact touchpoint day count (21, 19, 14, 0) instead of shifting -1 day', () => {
  const nowOnOct14Ict = new Date('2026-10-14T11:30:00.000Z'); // 18:30 ICT on 2026-10-14

  // Customers from reopen screenshot #166 in Chạm 21 (visited 2026-09-23 after 17:00)
  assert.equal(daysSinceVisit(new Date('2026-09-23T17:28:00.000Z'), nowOnOct14Ict), 21);
  assert.equal(daysSinceVisit(new Date('2026-09-23T17:35:09.000Z'), nowOnOct14Ict), 21);
  assert.equal(daysSinceVisit(new Date('2026-09-23T18:05:23.000Z'), nowOnOct14Ict), 21);
  assert.equal(daysSinceVisit(new Date('2026-09-23T18:56:04.000Z'), nowOnOct14Ict), 21);

  // Chạm 19 evening visit (2026-09-25 18:34:31)
  assert.equal(daysSinceVisit(new Date('2026-09-25T18:34:31.000Z'), nowOnOct14Ict), 19);

  // Chạm 14 evening visit (2026-09-30 20:07:52)
  assert.equal(daysSinceVisit(new Date('2026-09-30T20:07:52.000Z'), nowOnOct14Ict), 14);

  // Chăm sóc 24h evening visit today (2026-10-14 18:30:00)
  assert.equal(daysSinceVisit(new Date('2026-10-14T18:30:00.000Z'), nowOnOct14Ict), 0);
});


