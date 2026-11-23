import type { CallLog } from '../call.js';
import type { ComboBalance, Customer, CustomerNote } from './customer-core.types.js';
import type { Appointment } from './customer-booking-missed.types.js';

export interface DetailedCustomerResponse {
  customer: Customer;
  stats: {
    totalCalls: number;
    totalBookings: number;
    totalSpent: number;
    successRate: number;
  };
  comboBalances: ComboBalance[];
  bookings: Appointment[];
  notes: CustomerNote[];
  calls: CallLog[];
}

/** Detail of a completed lash service with before and after photo URLs. */
export interface LashSetDetail {
  orderId: number;
  orderServiceId?: number;
  bookingDate: string;
  serviceName: string;
  technicianName: string;
  storeName: string;
  orderState: string;
  totalPrice?: number;
  bookingNote?: string;
  beforePhotoUrl?: string | null;
  beforeThumbnailUrl?: string | null;
  afterPhotoUrl?: string | null;
  afterThumbnailUrl?: string | null;
}

/** Customer booking details mapped into a specific time slot for CV booking matrix. */
export interface SlotBookingInfo {
  orderId: number;
  customerId: number;
  customerName: string;
  customerPhone?: string | null;
  customerAvatar?: string | null;
  serviceName?: string;
  bookingTime: string;
  duration: number;
  orderState: string;
  cycleDays: number | null;
  previousBooking: {
    orderId: number;
    date: string;
    serviceName: string;
    technicianName: string;
    storeName?: string;
    cycleDays?: number;
  } | null;
  nextBooking: {
    orderId: number;
    date: string;
    serviceName: string;
    technicianName: string;
    storeName?: string;
    inDays?: number;
  } | null;
  recentLashSets: LashSetDetail[];
}

/** Single slot in the booking time matrix. */
export interface SlotMatrixCell {
  available: number;
  roster: number;
  booked: number;
  bookings?: SlotBookingInfo[];
}

/** Full booking time matrix map keyed by HH:mm. */
export type SlotMatrixMap = Record<string, SlotMatrixCell>;
