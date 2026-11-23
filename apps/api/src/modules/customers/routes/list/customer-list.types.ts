import { BucketType, SafeAny } from '@mos-lab/shared';

export interface CustomerListQuery {
  bucket?: BucketType | 'ALL' | 'NOT_COMBO_LIVE' | 'NEW_LOCA';
  search?: string;
  page?: string;
  limit?: string;
  sort?: string;
  sortField?: string;
  daysSinceLastVisitMin?: string;
  daysSinceLastVisitMax?: string;
  totalSpentMin?: string;
  totalSpentMax?: string;
  totalVisitsMin?: string;
  totalVisitsMax?: string;
  serviceIds?: string;
  serviceVisitCountMin?: string;
  serviceVisitCountMax?: string;
  promoUsed?: 'yes' | 'no' | 'all';
  promoCountMin?: string;
  promoCountMax?: string;
  referralUsed?: 'yes' | 'no' | 'all';
  referralCountMin?: string;
  referralCountMax?: string;
  assignedStaffId?: string;
  assignedDaysMin?: string;
  assignedDaysMax?: string;
  trash?: string;
  ids?: string;
  hsd30?: string;
  lsd1?: string;
  hasProduct?: string;
  contacted?: string;
  contactType?: string;
  hasCallback?: string;
  hasFutureBooking?: string;
  dateFrom?: string;
  dateTo?: string;
  retainedOnly?: string;
  allocationBatchId?: string;
  dobMonth?: string;
  birthdayPreset?: 'today' | 'this_month' | 'next_month';
  ageMin?: string;
  ageMax?: string;
  callStatuses?: string;
  lastCallDaysMin?: string;
  lastCallDaysMax?: string;
  isForeign?: 'all' | 'foreign' | 'local' | string | boolean;
  campaignId?: string;
  campaignFilterMode?: 'ALL' | 'IN' | 'NOT_IN' | 'all' | 'in' | 'not_in' | string;
}

export interface EmptyCustomerListResponse {
  data: SafeAny[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export function emptyCustomerListResponse(pageNum: number, limitNum: number): EmptyCustomerListResponse {
  return {
    data: [],
    pagination: {
      total: 0,
      page: pageNum,
      limit: limitNum,
      pages: 0,
    },
  };
}
