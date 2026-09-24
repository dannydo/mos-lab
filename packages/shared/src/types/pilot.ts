export type PilotFollowUpStatus = 'PENDING' | 'DONE' | 'SKIPPED';

export interface PilotMaterial {
  id: number;
  pilotCode: string;
  name: string;
  purchasePrice: number;
  volume: number;
  unit: string;
  costPerUnit: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePilotMaterialRequest {
  pilotCode?: string;
  name: string;
  purchasePrice: number;
  volume: number;
  unit: string;
  costPerUnit?: number;
  isActive?: boolean;
}

export interface UpdatePilotMaterialRequest {
  name?: string;
  purchasePrice?: number;
  volume?: number;
  unit?: string;
  costPerUnit?: number;
  isActive?: boolean;
}

export interface PilotSessionMaterialItem {
  id?: number;
  sessionId?: number;
  materialId: number;
  materialName?: string;
  unit?: string;
  usageAmount: number;
  costPerUnit?: number;
  calculatedCost?: number;
}

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
  materials?: PilotSessionMaterialItem[];
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
  materials?: Array<{ materialId: number; usageAmount: number }>;
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
  materials?: Array<{ materialId: number; usageAmount: number }>;
}

export interface PilotMetricsSummary {
  pilotCode: string;
  targetSessions: number;
  completedSessions: number;
  progressPercent: number;
  totalRevenue: number;
  totalDirectCost: number;
  totalConsumablesCost: number;
  avgConsumablesCostPerSession: number;
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
