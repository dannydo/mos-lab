import type { FalAdjustmentShadowResult, FalAdjustmentSnapshotInput } from './fal-adjustment.js';
import type { HrCustomAdjustmentInput } from './payroll-adjustment.js';

/**
 * The local-only lab accepts a hypothetical snapshot and returns the same
 * read-only result used by the payroll adjustment foundation. It has no
 * mutation or posting variant by design.
 */
export interface PayrollAdjustmentLabShadowRequest {
  input: FalAdjustmentSnapshotInput;
}

export interface PayrollAdjustmentLabShadowResponse {
  mode: 'LOCAL_ONLY';
  result: FalAdjustmentShadowResult;
}

export interface PayrollAdjustmentLabHrCustomRequest {
  input: HrCustomAdjustmentInput;
}

export interface PayrollAdjustmentLabHrCustomResponse {
  mode: 'LOCAL_ONLY';
  draft: {
    sourceType: 'HR';
    adjustmentType: 'HR_CUSTOM';
    amount: number;
    comment: string;
    sourcePeriodKey: string | null;
    targetPeriodKey: string;
  };
}

export interface PayrollAdjustmentLabApproverGroupResponse {
  mode: 'LOCAL_ONLY';
  group: {
    code: string;
    name: string;
    members: Array<{
      staffId: number;
      displayName: string;
      role: string | null;
    }>;
  };
}

/** Local-only separation-of-duties rehearsal. It cannot create a case or payout. */
export interface PayrollAdjustmentLabApprovalCheckRequest {
  requesterStaffId: number;
  approverStaffId: number;
}

export interface PayrollAdjustmentLabApprovalCheckResponse {
  mode: 'LOCAL_ONLY';
  allowed: boolean;
  reason: string;
}

export interface PayrollAdjustmentLabDraftRequest {
  requesterStaffId: number;
}

/** Local-only request to turn an already validated HR Custom input into a review draft. */
export interface PayrollAdjustmentLabHrCustomDraftRequest {
  requesterStaffId: number;
  input: HrCustomAdjustmentInput;
}

export interface PayrollAdjustmentLabDecisionRequest {
  approverStaffId: number;
  decision: 'APPROVE' | 'REJECT';
  reason?: string;
}

export interface PayrollAdjustmentLabCaseResponse {
  mode: 'LOCAL_ONLY';
  adjustmentCase: PayrollAdjustmentLabCase | null;
}

export interface PayrollAdjustmentLabCaseListResponse {
  mode: 'LOCAL_ONLY';
  adjustmentCases: PayrollAdjustmentLabCase[];
}

export interface PayrollAdjustmentLabCase {
  reference: string;
  sourceType: string;
  adjustmentType: string;
  status: string;
  reason: string | null;
  requestedBy: string | null;
  approvedBy: string | null;
  beforeAmount: number | null;
  afterAmount: number | null;
  deltaAmount: number | null;
  sourcePeriod: PayrollAdjustmentLabPeriod | null;
  targetPeriod: PayrollAdjustmentLabPeriod;
  lines: Array<{
    component: string;
    deltaAmount: number;
    postingState: string;
    recipient: {
      legacyStaffId: number;
      displayName: string;
      role: string;
      avatarUrl: string;
      branchKey: string;
      branchName: string;
      snapshotState: 'STORED' | 'LOCAL_FIXTURE' | 'MISSING';
    };
  }>;
  audit: Array<{ action: string; actorName: string; reason: string | null; occurredAt: string }>;
}

export interface PayrollAdjustmentLabPeriod {
  periodKey: string;
  label: string;
  status: string;
  startDate: string;
  endDate: string;
}

export interface PayrollAdjustmentLabSettlementReviewResponse {
  mode: 'LOCAL_ONLY';
  period: { periodKey: string; label: string; status: string; version: number };
  events: Array<{
    eventKey: string;
    subjectKey: string;
    component: string;
    amountHalfDong: number;
    sourceReference: string;
  }>;
  subjects: Array<{
    subjectKey: string;
    input: { policy: { policyVersion: string; policyReference: string }; events: unknown[] };
    result: { grossAmount: number; capAmount: number | null; receivedAmount: number; holdAmount: number };
  }>;
}

export interface PayrollAdjustmentLabSettlementLockRequest {
  actorStaffId: number;
  periodKey: string;
  version: number;
}

export interface PayrollAdjustmentLabSettlementLockResponse {
  mode: 'LOCAL_ONLY';
  lock: { period: { status: string }; settlement: { status: string }; idempotent: boolean };
}
