export const FAL_RULES = ['Fix', 'Adjust', 'Log', 'Replace'] as const;
export type FalRule = (typeof FAL_RULES)[number];

export type FalDecisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type FalLedgerStatus = 'NOT_APPLIED' | 'APPLIED' | 'FAILED';
export type FalCompensationMode = 'BANANA_HEAD' | 'NORMAL_FINAL' | 'BLOCKED' | 'ORIGIN_ONLY';
export type FalCaseRole = 'ORIGIN' | 'REMEDIATION' | 'STANDALONE';
/** Operational CV routing; deliberately independent from financial approval. */
export type FalRotationMode = 'HEAD' | 'FINAL' | 'UNDETERMINED';
/** Whether the remediation service may create its financial ledger. */
export type FalFinancialEligibility = 'READY' | 'PENDING_LOG_APPROVAL' | 'REJECTED' | 'INVALID_DURATION';
export type FalRotationPriorityStatus = 'READY' | 'CONSUMED' | 'EXPIRED';

export interface FalRotationPriority {
  status: FalRotationPriorityStatus;
  technicianStaffId: number;
  clientStoreId: number;
  completedAt: string;
  totalMinutes: number;
  queueId?: number | null;
  consumedOrderId?: number | null;
  consumedAt?: string | null;
  expiredAt?: string | null;
}

/**
 * The FAL presentation is deliberately separate from the legacy bonus ledger.
 * `staff_bonus` remains the financial source of truth; this object explains why
 * the ledger has its final value.
 */
export interface FalReadModel {
  rule: FalRule;
  caseRole: FalCaseRole;
  originOrderServiceId?: number | null;
  remediationOrderServiceId?: number | null;
  servicingMinutes?: number | null;
  cleaningMinutes?: number | null;
  totalMinutes?: number | null;
  /** Legacy financial presentation only; do not use this to infer rotation. */
  compensationMode: FalCompensationMode;
  rotationMode: FalRotationMode;
  financialEligibility: FalFinancialEligibility;
  rotationPriority?: FalRotationPriority | null;
  decisionStatus?: FalDecisionStatus | null;
  ledgerStatus?: FalLedgerStatus | null;
  originResponsibility?: 'CV' | 'CC' | null;
  requiresApproval: boolean;
}

export interface FalLogExplanationInput {
  /** Existing legacy order_service_id whose effective FAL type is Log. */
  orderServiceId: number;
  explanation?: string;
  explanationChannel?: string;
}

export interface FalLogExplanationRecord {
  id: number;
  explanation?: string | null;
  explanationChannel?: string | null;
  orderServiceId: number;
  explainedByStaffId?: number | null;
  decisionStatus: FalDecisionStatus;
  ledgerStatus: FalLedgerStatus;
  approvedByStaffId?: number | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}
