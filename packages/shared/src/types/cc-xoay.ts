export interface CcXoayRecord {
  serviceId: number;
  checkin: string; // YYYY-MM-DD HH:mm:ss
  checkinTime: string; // HH:mm:ss
  clientName: string;
  store: string;
  serviceName: string;
  serviceType: 'Normal' | 'Retain' | string;
  consultantName: string;
  avatar?: string | null;
  consultantLevel: number;
  consultantBonus: number;
  pointsAccu: number;
  consultantPoints: number;
  ccInName: string;
  ccOutName: string;
  class: string;
  classPts: number;
  fan: string;
  fanPts: number;
  type: string;
  typePts: number;
  lashCount: number;
  lashPts: number;
  design: string;
  designPts: number;
  color: string;
  colorPts: number;
  falRule?: string;
}

export interface CcLeaderboardEntry {
  rank: number;
  consultantId: number | string;
  displayName: string;
  avatar?: string | null;
  store: string;
  level: number;
  totalCheckins: number;
  totalServices: number;
  comboRevenue?: number;
  comboCount?: number;
  totalPointsAccu: number;
  totalConsultantBonus: number;
  targetCompletionRate: number;
}

export interface CcXoayReportResponse {
  data: CcXoayRecord[];
  total: number;
  summary: {
    totalCheckins: number;
    totalBonus: number;
    totalPoints: number;
  };
}

export interface CcLeaderboardResponse {
  leaderboard: CcLeaderboardEntry[];
}

export interface CcQueryParams {
  viewMode?: 'month' | 'week' | 'day';
  dateFrom?: string;
  dateTo?: string;
  storeId?: string;
  consultantId?: string;
  page?: number;
  limit?: number;
}

export interface CcStaffOption {
  staffId: number;
  displayName: string;
  username?: string;
  isCc: boolean;
  store?: string;
}

export interface CcConfigResponse {
  activeCcIds: number[];
  allStaffOptions: CcStaffOption[];
}
