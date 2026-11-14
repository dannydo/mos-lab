import type {
  IosBookingItem,
  LashHistoryPhoto,
  LashHistoryStaffMember,
  LashHistoryItem,
  ComboPackageOption,
  SerumTierOption,
  CustomerBookingTab,
  ServicingSubStatus,
} from '@mos-lab/shared';
import {
  filterBookingsForCvlScope,
  resolveCustomerBookingTab,
  resolveServicingSubStatus,
  isDoneBookingPendingCheckout,
  sortDoneBookingsWithCheckoutFirst,
} from '@mos-lab/shared';

export type BookingItem = IosBookingItem;

export type {
  IosBookingItem,
  LashHistoryPhoto,
  LashHistoryStaffMember,
  LashHistoryItem,
  ComboPackageOption,
  SerumTierOption,
  CustomerBookingTab,
  ServicingSubStatus,
};

export {
  filterBookingsForCvlScope,
  resolveCustomerBookingTab,
  resolveServicingSubStatus,
  isDoneBookingPendingCheckout,
  sortDoneBookingsWithCheckoutFirst,
};

export {
  KNOWN_STAFF_AVATARS,
  resolveStaffAvatarUrl,
  COMBO_PACKAGES_CVL,
  SERUM_TIERS_CVL,
  STAFF_QUEUE,
  SALON_INFO,
} from './staffAvatarsAndCatalog';

export { INITIAL_BOOKINGS } from './demoBookingsData';
