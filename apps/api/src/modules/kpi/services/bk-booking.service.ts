/**
 * Canonical Booking cohort rules for Booker reporting.
 *
 * Booking performance is always grouped by `order.date_created`.  A booking
 * becomes a Missed booking only after its lifecycle has been finalised as
 * `Missed`; a manual cancellation remains a missed outcome for the KPI.
 */
export const BK_BOOKING_MISSED_STATES = ['Cancelled', 'Missed'] as const;

export type BkBookingDetailsFilter = 'ALL' | 'COMPLETED' | 'MISSED';

export function isBkBookingMissedState(orderState: string | null | undefined): boolean {
  return BK_BOOKING_MISSED_STATES.includes(orderState as (typeof BK_BOOKING_MISSED_STATES)[number]);
}

export function bookingMissedSqlCondition(orderAlias = 'o'): string {
  return `${orderAlias}.order_state IN ('Cancelled', 'Missed')`;
}

export function bookingDetailsStatusCondition(status: BkBookingDetailsFilter, orderAlias = 'o'): string {
  if (status === 'COMPLETED') return `${orderAlias}.order_state = 'Completed'`;
  if (status === 'MISSED') return bookingMissedSqlCondition(orderAlias);
  return '1=1';
}
