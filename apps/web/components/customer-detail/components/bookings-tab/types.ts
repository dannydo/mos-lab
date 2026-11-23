export interface BookingsTabProps {
  bookings: SafeAny[];
  notes?: SafeAny[];
  themeMode: 'light' | 'dark';
  customer: SafeAny;
  handleCancelBooking: (id: number) => void;
  onRequestReschedule: (booking: SafeAny) => void | Promise<void>;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRefreshDetails?: () => void;
}

export interface BookingPromoInfo {
  promoTitle: string | null;
  fullPromoText: string | null;
  cleanBookingNote: string;
}

export interface BookingCycleInfo {
  cycleDays: number | null;
  isFirstOrder: boolean;
  isWarranty: boolean;
  prevCompletedDateStr: string | null;
}

export interface SelectedBookingForCancel {
  id: number;
  orderKey?: string;
  dateCreated?: string;
  bookingDate?: string;
  createdStaffId?: number | null;
  createdStaffName?: string | null;
  customerName?: string;
}

export interface SelectedOrderForAudit {
  id: number;
  key?: string;
}
