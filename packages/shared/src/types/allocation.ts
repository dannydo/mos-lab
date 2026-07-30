export type AllocationBatchStatus = 'PENDING_ACCEPT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'RECALLED';

export interface CustomerAllocationItem {
  id: number;
  batchId: number;
  customerId: number;
  customerName?: string | null;
  customerPhone?: string | null;
  status: AllocationBatchStatus;
  createdAt: string;
  bucket?: string | null;
  daysSinceLastVisit?: number | null;
  totalSpent?: number | null;
}

export interface CustomerAllocationBatch {
  id: number;
  batchCode: string;
  assignerId: number;
  assignerName?: string | null;
  bookerId: number;
  bookerName?: string | null;
  totalCount: number;
  status: AllocationBatchStatus;
  declineReason?: string | null;
  declineCategory?: string | null;
  declineNote?: string | null;
  expiresAt: string; // 24h verification expiry
  acceptedAt?: string | null;
  declinedAt?: string | null;
  recalledAt?: string | null;
  retentionExpiresAt?: string | null; // 30-day countdown expiry
  sourceFilterSummary?: string | null;
  sourceFilterJson?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: CustomerAllocationItem[];
}

export interface CreateAllocationBatchDto {
  bookerId: number;
  customerIds: number[];
  sourceType?: string;
  sourceFilterSummary?: string;
  sourceFilterJson?: string;
  parentBatchId?: string;
}

export interface DeclineAllocationBatchDto {
  reasonCategory: string;
  reasonNote?: string;
}

export interface RecallAllocationBatchDto {
  reason: string;
}

export interface AllocationHistoryQueryParams {
  page?: number;
  limit?: number;
  status?: AllocationBatchStatus | 'ALL';
  bookerId?: number;
  search?: string;
}

export interface AllocationAuditQueryParams {
  dateFrom?: string;
  dateTo?: string;
  bookerId?: number;
}

export interface AllocationAuditStatsResponse {
  summary: {
    totalBatches: number;
    totalCustomers: number;
    pendingCount: number;
    acceptedCount: number;
    acceptedRate: number;
    declinedCount: number;
    declinedRate: number;
    expiredCount: number;
    expiredRate: number;
    recalledCount: number;
  };
  bookerBreakdown: Array<{
    bookerId: number;
    bookerName: string;
    username?: string;
    totalBatches: number;
    totalCustomers: number;
    acceptedCount: number;
    declinedCount: number;
    expiredCount: number;
    pendingCount: number;
    acceptanceRate: number;
    avgResponseMinutes: number;
  }>;
  declineReasonBreakdown: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

export const PRESET_DECLINE_REASONS = [
  'Quá tải danh sách KH hiện tại',
  'Khách thuộc khu vực/chi nhánh không phù hợp',
  'Data không khớp tiêu chuẩn telesales',
  'Không liên hệ được / Data ảo',
  'Khác (Nhập lý do)',
] as const;

export interface BookerAllocationBatchSummary {
  id: number;
  batchCode: string;
  assignerId: number;
  assignerName?: string | null;
  bookerId: number;
  bookerName?: string | null;
  totalCount: number;
  calledCount: number;
  status: AllocationBatchStatus;
  createdAt: string;
  acceptedAt?: string | null;
  expiresAt: string;
  retentionExpiresAt?: string | null;
}
