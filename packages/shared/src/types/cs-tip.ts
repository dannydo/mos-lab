export interface CsTipGroupMetrics {
  totalCustomerTip: number;
  csTipBonus: number;
  totalVisits: number;
  tippedVisits: number;
  tipRatePercent: number;
  avgTipPerVisit: number;
  avgTipPerTippedVisit: number;
  sharePercent: number;
}

export interface CsTipSummary {
  csBonusRatePercent: number; // 3%
  total: CsTipGroupMetrics;
  loca: CsTipGroupMetrics;
  single: CsTipGroupMetrics;
}

export interface CsTipStoreBreakdown {
  storeKey: string;
  storeName: string;
  totalVisits: number;
  totalTippedVisits: number;
  totalCustomerTip: number;
  totalCsTipBonus: number;
  locaCustomerTip: number;
  locaCsTipBonus: number;
  singleCustomerTip: number;
  singleCsTipBonus: number;
  locaVisits: number;
  singleVisits: number;
}

export interface CsTipRecord {
  orderId: number;
  checkinTime: string;
  customerName: string;
  customerPhone?: string | null;
  store: string;
  isLoCa: boolean;
  customerType: 'LoCa' | 'Khách Lẻ';
  technicianName?: string | null;
  ccName?: string | null;
  totalCustomerTip: number;
  csTipBonus: number;
  hasTip: boolean;
}

export interface CsTipResponse {
  summary: CsTipSummary;
  storeBreakdown: CsTipStoreBreakdown[];
  records: CsTipRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CsTipQueryParams {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  customerType?: 'ALL' | 'LOCA' | 'SINGLE';
  tipFilter?: 'ALL' | 'TIPPED' | 'NO_TIP';
  search?: string;
  page?: number;
  limit?: number;
}
