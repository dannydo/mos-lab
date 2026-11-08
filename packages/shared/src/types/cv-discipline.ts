export type CvDisciplineViolationType = 'LATE' | 'EARLY' | 'URGENT_OFF' | 'OTHER';

export interface CvDisciplineIncident {
  id: string;
  date: string; // YYYY-MM-DD
  type: CvDisciplineViolationType;
  title: string;
  description: string | null;
  scheduledTime: string | null; // e.g. '08:00 - 17:00'
  actualTime: string | null; // e.g. '08:12:45'
  diffMinutes: number | null; // e.g. 12 minutes late or 30 minutes early
  store: string;
  isFined: boolean;
  finedBananas: number; // Positive number representing the fine amount in bananas
  fineTransactionId?: string | number | null;
  fineDate?: string | null;
  isForgiven?: boolean;
  refundBananas?: number;
  refundDate?: string | null;
}

export interface CvDisciplineStaffRecord {
  staffId: number;
  legacyUserId: number;
  staffName: string;
  avatar: string | null;
  store: string;
  isCvPlus: boolean;
  lateCount: number;
  lateMinutes: number;
  earlyCount: number;
  earlyMinutes: number;
  urgentOffCount: number;
  otherPenaltyCount: number;
  finedBananaAmount: number; // Total bananas deducted (positive integer)
  totalViolations: number;
  violations: CvDisciplineIncident[];
}

export interface CvDisciplineSummary {
  totalLateRecords: number;
  totalLateMinutes: number;
  totalEarlyRecords: number;
  totalEarlyMinutes: number;
  totalUrgentOffs: number;
  totalOtherPenalties: number;
  totalFinedBananas: number;
  totalStaffWithViolations: number;
  totalStaffCount: number;
}

export interface CvDisciplineResponse {
  summary: CvDisciplineSummary;
  data: CvDisciplineStaffRecord[];
  dateFrom: string;
  dateTo: string;
}
