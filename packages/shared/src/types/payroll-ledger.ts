/**
 * Payroll periods are the company-wide boundary for every payroll surface.
 * A locked period is immutable: later corrections are calculated from a
 * snapshot and can only become a separately approved current-period entry.
 */
export const PAYROLL_PERIOD_STATUSES = ['OPEN', 'REVIEWING', 'LOCKED', 'ARCHIVED'] as const;
export type PayrollPeriodStatus = (typeof PAYROLL_PERIOD_STATUSES)[number];

export interface PayrollPeriod {
  id: number;
  periodKey: string;
  label: string;
  startDate: string;
  endDate: string;
  timezone: string;
  status: PayrollPeriodStatus;
  calculationVersion: string;
  lockedAt?: string | null;
  lockedByStaffId?: number | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * The calculator receives half-VND units, never floating point values.  It
 * allows the established 50/50 CC split and 150% cap to stay exact until one
 * final rounding operation at the settlement total.
 */
export interface ShadowSettlementLine {
  sourceKey: string;
  amountHalfDong: number;
}

export interface ShadowSettlementRequest {
  sourcePeriod: Pick<PayrollPeriod, 'periodKey' | 'status' | 'calculationVersion'>;
  subjectKey: string;
  lines: readonly ShadowSettlementLine[];
  /** Exact cap before final rounding; omit when the source has no cap. */
  capAmountHalfDong?: number | null;
}

export interface ShadowSettlementResult {
  mode: 'SHADOW_READ_ONLY';
  sourcePeriodKey: string;
  calculationVersion: string;
  subjectKey: string;
  lineCount: number;
  grossAmount: number;
  capAmount: number | null;
  receivedAmount: number;
  holdAmount: number;
}

/**
 * Native mOS evidence is captured before it is turned into immutable payroll
 * ledger events.  The source is always a completed mOS operation, never an
 * iOS or Legacy row.
 */
export const CC_NATIVE_EVIDENCE_KINDS = ['COMPLETED_SERVICE', 'DAILY_SALES_CLOSE', 'CASH_TIP'] as const;
export type CcNativeEvidenceKind = (typeof CC_NATIVE_EVIDENCE_KINDS)[number];

export type CcDailyBonusTier = {
  /** Inclusive lower bound, in whole VND of bonus-eligible daily sales. */
  minimumQualifyingSalesVnd: number;
  /** Percent expressed as basis points: 50 means 0.50%, 250 means 2.50%. */
  rateBasisPoints: number;
};

/** A frozen rule snapshot supplied by an mOS-owned policy record. */
export type CcDailyBonusPolicySnapshot = {
  policyVersion: string;
  tiers: readonly CcDailyBonusTier[];
};

export type CcCompletedServiceEvidenceInput = {
  kind: 'COMPLETED_SERVICE';
  previousPoints: number;
  shareCount: 1 | 2;
};

export type CcDailySalesCloseEvidenceInput = {
  kind: 'DAILY_SALES_CLOSE';
  qualifyingSalesVnd: number;
  policy: CcDailyBonusPolicySnapshot;
};

export type CcCashTipEvidenceInput = {
  kind: 'CASH_TIP';
  /** Total cash tip for one completed visit, before the CC share is applied. */
  cashTipPoolVnd: number;
  /** One end of the visit earns 10%; the same CC at both ends earns 20%. */
  ccVisitRole: 'ONE_END' | 'BOTH_ENDS';
};

export type CcNativeEvidencePayload =
  CcCompletedServiceEvidenceInput | CcDailySalesCloseEvidenceInput | CcCashTipEvidenceInput;

export type RecordCcNativeEvidenceRequest = {
  evidenceKey: string;
  payrollPeriodId: number;
  subjectKey: string;
  sourceReference: string;
  sourceOccurredAt: string;
  payload: CcNativeEvidencePayload;
};

export type RecordedCcNativeEvidence = {
  evidenceKey: string;
  payrollPeriodId: number;
  subjectKey: string;
  evidenceKind: CcNativeEvidenceKind;
  component: 'CC_XOAY_CASH' | 'CC_DAILY_BONUS' | 'CC_TIP_CASH';
  amountHalfDong: number;
  sourceReference: string;
  sourceHash: string;
  sourceOccurredAt: string;
  policyVersion: string | null;
  policyHash: string | null;
};

/**
 * The Safe Dev Phase 4 rehearsal is intentionally a complete local-only run:
 * mOS evidence -> frozen ledger -> review -> lock -> hashable export.  It is
 * not a payout instruction and cannot reach an external payroll system.
 */
export interface NativeCcPayrollLocalRunResponse {
  mode: 'LOCAL_ONLY';
  period: { periodKey: string; label: string; status: 'LOCKED'; version: number };
  evidence: Array<{
    kind: CcNativeEvidenceKind;
    component: string;
    amountHalfDong: number;
    sourceReference: string;
    policyVersion: string | null;
  }>;
  ledger: Array<{ component: string; amountHalfDong: number; sourceReference: string }>;
  settlement: {
    subjectKey: string;
    grossAmount: number;
    receivedAmount: number;
    holdAmount: number;
    exportVerified: true;
  };
  safeguards: readonly ['MOS_ONLY_EVIDENCE', 'HALF_DONG_EXACT', 'NO_PAYOUT'];
  normalExample: {
    subjectLabel: string;
    explanation: string;
  };
  capExample: {
    periodKey: string;
    subjectLabel: string;
    explanation: string;
    rawXoayExplanation: string;
    evidence: Array<{ component: string; amountHalfDong: number; sourceReference: string }>;
    ledger: Array<{ component: string; amountHalfDong: number; sourceReference: string }>;
    evidenceTotalHalfDong: number;
    ledgerTotalHalfDong: number;
    dailyBonusHalfDong: number;
    rawXoayHalfDong: number;
    xoayCapHalfDong: number;
    capHoldHalfDong: number;
    settlementReceivedAmount: number;
  };
}

/**
 * A read-only comparison of Legacy payroll components. It is intentionally
 * not a mOS settlement and must never be used to post payroll.
 */
export interface LegacyCcComparisonResponse {
  mode: 'LOCAL_READ_ONLY';
  source: 'WINGS_LEGACY';
  staff: { displayName: string; legacyStaffId: number };
  months: Array<{
    periodKey: string;
    status: 'COMPARISON_ONLY';
    rawXoayVnd: number;
    dailyBonusVnd: number;
    maxXoayAllowedVnd: number;
    heldXoayVnd: number;
    effectiveXoayVnd: number;
    cashTipVnd: number;
    /** The Legacy percentages present on the credited CC tip rows. */
    cashTipPercentages: number[];
    cashTipBreakdown: {
      handoff10Vnd: number;
      fullFlow20Vnd: number;
      ruleMismatchVnd: number;
      handoff10Rows: number;
      fullFlow20Rows: number;
      ruleMismatchRows: number;
    };
    componentTotalVnd: number;
    evidenceCounts: { xoayLedgerRows: number; dailyCloses: number; cashTipRows: number };
  }>;
}

/**
 * A local, append-only replay of a Legacy comparison. It is deliberately
 * labeled as a parity fixture: the source remains read-only Legacy data and
 * these records can never be used to post payroll.
 */
export interface LegacyCcParityReplayResponse {
  mode: 'LOCAL_LEGACY_PARITY_REPLAY';
  source: 'WINGS_LEGACY_READ_ONLY';
  staff: { displayName: string };
  months: Array<{
    sourcePeriodKey: string;
    localPeriodKey: string;
    status: 'LOCKED';
    legacy: {
      rawXoayVnd: number;
      dailyBonusVnd: number;
      cashTipVnd: number;
      heldXoayVnd: number;
      componentTotalVnd: number;
    };
    localLedger: {
      rawXoayVnd: number;
      dailyBonusVnd: number;
      cashTipVnd: number;
      heldXoayVnd: number;
      settlementReceivedVnd: number;
    };
    componentsMatchExactly: boolean;
    exportVerified: true;
  }>;
  safeguards: readonly ['LOCAL_ONLY', 'LEGACY_READ_ONLY', 'NO_PAYOUT'];
}

/** Read-only cohort gate before a local payroll pilot is considered for release. */
export interface LegacyCcCohortAuditResponse {
  mode: 'LOCAL_READ_ONLY';
  source: 'WINGS_LEGACY';
  months: readonly ['2026-08', '2026-09'];
  gate: 'PASS' | 'BLOCKED';
  summary: { activeCcCount: number; passedCcCount: number; blockedCcCount: number };
  cc: Array<{
    /** Stable legacy identity used only to bind the local audit to an mOS subject key. */
    legacyStaffId: number;
    displayName: string;
    status: 'PASS' | 'BLOCKED';
    reason?: 'MISSING_SOURCE' | 'TIP_RULE_MISMATCH';
    months: Array<{
      periodKey: string;
      componentTotalVnd: number;
      cashTipRows: number;
      ruleMismatchRows: number;
    }>;
  }>;
}

/** Production-safe, Super Admin-only operational view of the native CC pilot.
 * It reads mOS evidence and ledger rows only; Legacy parity stays local-only. */
export interface NativeCcPilotDashboardResponse {
  mode: 'PRODUCTION_PILOT_READ_ONLY';
  cohort: {
    version: string;
    enabled: true;
    subjects: Array<{ subjectKey: string; displayName: string }>;
  };
  periods: Array<{
    id: number;
    periodKey: string;
    label: string;
    status: PayrollPeriodStatus;
    lockedAt: string | null;
  }>;
  activePeriodKey: string | null;
  summary: {
    cohortSize: number;
    evidenceCount: number;
    finalizedSubjectCount: number;
    settlementStatus: string | null;
  };
  historicalSnapshot: NativeCcPilotHistorySnapshot | null;
  rows: Array<{
    subjectKey: string;
    displayName: string;
    evidence: Array<{
      evidenceKey: string;
      kind: CcNativeEvidenceKind;
      component: 'CC_XOAY_CASH' | 'CC_DAILY_BONUS' | 'CC_TIP_CASH';
      amountHalfDong: number;
      sourceReference: string;
      sourceOccurredAt: string;
      policyVersion: string | null;
    }>;
    ledger: Array<{
      eventKey: string;
      component: string;
      amountHalfDong: number;
      sourceReference: string;
      sourceOccurredAt: string;
    }>;
    finalized: boolean;
  }>;
}

/**
 * A Super Admin can open exactly the current monthly mOS pilot period.  This
 * creates an OPEN intake boundary only: it does not create evidence,
 * settlement, adjustment, or payout records.
 */
export interface OpenNativeCcPilotPeriodResponse {
  created: boolean;
  period: {
    id: number;
    periodKey: string;
    label: string;
    status: 'OPEN';
  };
}

/** A verified historical comparison is a read-only published snapshot.
 * It is never mOS evidence and cannot be used to finalize, settle, or pay. */
export interface NativeCcPilotHistorySnapshot {
  version: 'cc-native-pilot-history.v1';
  source: 'LOCAL_LEGACY_PARITY_REPLAY';
  verifiedAt: string;
  sourceHash: string;
  subjects: Array<{
    subjectKey: string;
    displayName: string;
    months: Array<{
      periodKey: string;
      rawXoayVnd: number;
      dailyBonusVnd: number;
      heldXoayVnd: number;
      effectiveXoayVnd: number;
      cashTipVnd: number;
      componentTotalVnd: number;
      sourceCounts: {
        xoayLedgerRows: number;
        dailyCloses: number;
        cashTipRows: number;
      };
    }>;
  }>;
}
