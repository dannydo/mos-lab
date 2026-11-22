export interface AssignmentHistoryBatch {
  batchId: string;
  assignedAt: string;
  assignedBy: string;
  newStaffName: string | null;
  newStaffId: number | null;
  prevStaffName?: string | null;
  customerCount: number;
  isUndone: boolean;
  undoneAt?: string | null;
  durationDays?: number | null;
  expiresAt?: string | null;
  sourceType?: string;
  sourceFilterJson?: string | null;
  sourceFilterSummary?: string | null;
  actionType?: 'ASSIGN' | 'REVOKE' | 'TRANSFER' | 'UNASSIGN' | 'RANDOM_SELECT' | string;
  reason?: string | null;
  parentBatchId?: string | null;
}

export interface RevokePreviewResponse {
  totalCount: number;
  unassignedCount: number;
  assignedCount: number;
  staffBreakdown: Array<{
    staffId: number;
    staffName: string;
    count: number;
  }>;
}

export interface RandomIdsResponse {
  ids: number[];
  batchId?: string;
  count?: number;
  filterSummary?: string;
}

export interface CustomerAssignmentTimelineItem {
  id: number;
  batchId: string;
  assignedAt: string;
  actionType:
    | 'OFFERED'
    | 'ACCEPTED'
    | 'DECLINED'
    | 'EXPIRED'
    | 'RETURNED_TO_POOL'
    | 'TRANSFERRED'
    | 'RECALLED'
    | 'UNDO_REVERSED'
    | 'RETENTION_CHANGED'
    | 'CAMPAIGN_RETURNED_TO_POOL'
    | 'STAFF_MERGED'
    | 'RANDOM_SELECTED'
    | 'SYSTEM_REPAIR'
    | string;
  staffId: number | null;
  staffName: string | null;
  prevStaffId: number | null;
  prevStaffName: string | null;
  assignedBy: string;
  expiresAt: string | null;
  durationDays: number | null;
  isRetained: boolean;
  sourceType: string;
  sourceFilterSummary: string | null;
  reason: string | null;
  isUndone?: boolean;
  actionContext?: string | null;
  campaignId?: number | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface AssignmentHistoryResponse {
  data: AssignmentHistoryBatch[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface AssignmentHistoryDetail {
  id: number;
  batchId: string;
  customerId: number;
  customerName: string;
  customerPhone: string;
  previousStaffName: string | null;
  newStaffName: string;
  createdAt: string;
}

export interface AssignmentHistoryDetailsResponse {
  data: AssignmentHistoryDetail[];
}

export interface LocaStaffActivityStats {
  totalCalls: number;
  answeredCalls: number;
  answerRate: number; // percentage (0-100)
  totalTouchpointsChecked: number;
  totalBooked: number;
  totalDurationSec: number;
  formattedDuration: string;
  touchpointBreakdown: Record<string, number>;
  conversionRates: {
    callToAnswer: number;
    answerToTouchpoint: number;
    touchpointToBooked: number;
    overallConversion: number;
  };
}

export interface LocaStaffActivityLogItem {
  id: string;
  timestamp: string; // ISO string
  staffId: number;
  staffName: string;
  legacyUserId: number;
  customerName: string;
  customerPhone: string;
  customerAvatar?: string | null;
  actionType: 'CALL' | 'TOUCHPOINT' | 'BOOKED' | 'NOTE_CALLBACK' | 'TAB_STATUS_CHANGE';
  actionTitle: string;
  actionDetail: string;
  badgeColor?: string;
  callResult?: string;
  durationSec?: number;
  recordingUrl?: string | null;
  touchpointKey?: string;
  bookingDate?: string;
  orderId?: number;
}

/** Paginated LoCa staff activity feed returned by the customer activity API. */
export interface LocaStaffActivityResponse {
  stats: LocaStaffActivityStats;
  logs: LocaStaffActivityLogItem[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
