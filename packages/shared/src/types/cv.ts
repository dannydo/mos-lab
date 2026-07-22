export interface CvXoayRecord {
  orderServiceId: number;
  checkin: string; // YYYY-MM-DD HH:mm:ss
  checkinTime: string; // HH:mm:ss
  clientName: string;
  store: string;
  serviceName: string;
  serviceType: string;
  techName: string;
  techLevel: number;
  techBonus: number;
  pointsAccu: number;
  techPoints: number;
  ccInName: string;
  ccOutName: string;
  classPts: number;
  fanPts: number;
  typePts: number;
  lashPts: number;
  designPts: number;
  colorPts: number;
  falRule?: string;
}

export interface CvXoayReportResponse {
  data: CvXoayRecord[];
  total: number;
  summary: {
    totalServices: number;
    totalBonus: number;
    totalPoints: number;
  };
}

export interface CvTipLeaderboardEntry {
  rank: number;
  technicianId: number;
  displayName: string;
  store: string;
  totalVisits: number;
  tippedVisits: number;
  tipRatePercent: number;
  totalCustomerTipAmount: number;
  totalCvTipBonus: number; // 70% of customer tip
  targetCompletionRate: number;
}

export interface CvTipLeaderboardResponse {
  leaderboard: CvTipLeaderboardEntry[];
  summary: {
    totalCvTipBonus: number;
    totalCustomerTip: number;
    avgTipRatePercent: number;
    totalTippedVisits: number;
    totalVisits: number;
  };
}

export interface CvTipRecord {
  orderId: number;
  serviceId: number;
  checkinTime: string;
  clientName: string;
  store: string;
  serviceName: string;
  techName: string;
  totalCustomerTip: number;
  cvTipAmount: number; // 70% share
  cvTipPercentage: number; // 70%
  tipStatus: 'Tipped' | 'No Tip';
}

export interface CvTipResponse {
  data: CvTipRecord[];
  total: number;
  summary: {
    totalVisits: number;
    tippedVisits: number;
    nonTippedVisits: number;
    tipRatePercent: number;
    totalCustomerTip: number;
    totalCvTipBonus: number;
  };
}

export interface CvPaystubRecord {
  staffId: number;
  staffName: string;
  store: string;
  totalWorkHours: number;
  hourlyRate: number;
  hourlyWage: number;
  cvXoayBonus: number;
  cvTipBonus: number;
  totalIncome: number;
  serviceCount: number;
  seniorityMonths?: number;
  seniorityBonus?: number;
  seniorityBonusPercent?: number;
  activeDays?: number;
  regularHours?: number;
  regularHourlyWage?: number;
  offDaysWorked?: number;
  offDaysWorkHours?: number;
  offDaysWorkWage?: number;
}

export interface CvPaystubResponse {
  data: CvPaystubRecord[];
  total: number;
  summary: {
    totalHourlyWage: number;
    totalCvXoayBonus: number;
    totalCvTipBonus: number;
    totalSeniorityBonus?: number;
    grandTotalIncome: number;
  };
}

export interface CvWorkLogDetailRecord {
  date: string;
  checkInTime: string;
  checkOutTime: string;
  workHours: number;
  hourlyRate: number;
  dailyWage: number;
  store: string;
  notes?: string;
}

export interface CvWorkLogDetailResponse {
  data: CvWorkLogDetailRecord[];
  summary: {
    totalWorkDays: number;
    totalWorkHours: number;
    hourlyRate: number;
    totalWage: number;
  };
}

export interface CvStaffOption {
  staffId: number;
  displayName: string;
  username?: string;
  isCv: boolean;
  store?: string;
}

export interface CvConfigResponse {
  activeCvIds: number[];
  allStaffOptions: CvStaffOption[];
}
