export type PilotFollowUpStatus = 'PENDING' | 'DONE' | 'SKIPPED';

export interface PilotSession {
  id: number;
  pilotCode: string;
  branchCode: string;
  customerName: string;
  customerPhone: string;
  sessionDate: string; // YYYY-MM-DD
  technicianName: string | null;
  revenue: number;
  materialCost: number;
  technicianCost: number;
  commissionAmount: number;
  promoAmount: number;
  refundAmount: number;
  totalDirectCost: number;
  contributionMargin: number;
  followUp24hStatus: PilotFollowUpStatus;
  followUp72hStatus: PilotFollowUpStatus;
  csatScore: number | null; // 1 - 5
  issues: string | null;
  notes: string | null;
  source: string | null;
  createdByStaffId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePilotSessionRequest {
  pilotCode?: string;
  branchCode?: string;
  customerName: string;
  customerPhone: string;
  sessionDate: string;
  technicianName?: string | null;
  revenue?: number;
  materialCost?: number;
  technicianCost?: number;
  commissionAmount?: number;
  promoAmount?: number;
  refundAmount?: number;
  followUp24hStatus?: PilotFollowUpStatus;
  followUp72hStatus?: PilotFollowUpStatus;
  csatScore?: number | null;
  issues?: string | null;
  notes?: string | null;
  source?: string | null;
}

export interface UpdatePilotSessionRequest {
  customerName?: string;
  customerPhone?: string;
  sessionDate?: string;
  technicianName?: string | null;
  revenue?: number;
  materialCost?: number;
  technicianCost?: number;
  commissionAmount?: number;
  promoAmount?: number;
  refundAmount?: number;
  followUp24hStatus?: PilotFollowUpStatus;
  followUp72hStatus?: PilotFollowUpStatus;
  csatScore?: number | null;
  issues?: string | null;
  notes?: string | null;
  source?: string | null;
}

export interface PilotMetricsSummary {
  pilotCode: string;
  targetSessions: number;
  completedSessions: number;
  progressPercent: number;
  totalRevenue: number;
  totalDirectCost: number;
  totalContribution: number;
  avgContributionPerSession: number;
  avgContributionMarginPct: number;
  avgCsat: number;
  ratedSessionsCount: number;
  pendingFollowUp24hCount: number;
  pendingFollowUp72hCount: number;
  totalPendingFollowUpCount: number;
}

export interface PilotSessionsListResponse {
  sessions: PilotSession[];
  metrics: PilotMetricsSummary;
}

export interface PilotSessionsQuery {
  pilotCode?: string;
  branchCode?: string;
  dateFrom?: string;
  dateTo?: string;
}
