export interface CcTipLeaderboardEntry {
  rank: number;
  consultantId: number;
  displayName: string;
  avatar?: string | null;
  store: string;
  totalVisits: number;
  tippedVisits: number;
  tipRatePercent: number;
  totalCustomerTipAmount: number;
  totalCcTipBonus: number;
  targetCompletionRate: number;
}

export interface CcTipRecord {
  orderId: number;
  serviceId: number;
  checkinTime: string; // YYYY-MM-DD HH:mm:ss
  clientName: string;
  store: string;
  serviceName: string;
  ccInName: string;
  ccOutName: string;
  consultantName: string;
  avatar?: string | null;
  totalCustomerTip: number;
  ccTipAmount: number;
  ccTipPercentage: number;
  tipStatus: 'Tipped' | 'No Tip';
}

export interface CcTipResponse {
  data: CcTipRecord[];
  total: number;
  summary: {
    totalVisits: number;
    tippedVisits: number;
    nonTippedVisits: number;
    tipRatePercent: number;
    totalCustomerTip: number;
    totalCcTipBonus: number;
  };
}

export interface CcTipLeaderboardResponse {
  leaderboard: CcTipLeaderboardEntry[];
  summary: {
    totalCcTipBonus: number;
    totalCustomerTip: number;
    avgTipRatePercent: number;
    totalTippedVisits: number;
    totalVisits: number;
  };
}

export interface CcTipQueryParams {
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  consultantId?: string;
  tipFilter?: 'ALL' | 'TIPPED' | 'NO_TIP';
  page?: number;
  limit?: number;
}
