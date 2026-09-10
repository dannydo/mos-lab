import type { ShadowSettlementResult } from './payroll-ledger.js';

/**
 * A read-only handoff from the payroll source system into local Safe Dev.
 * It deliberately contains only opaque subject references and settlement
 * totals; names, avatars, branches and raw ledger rows never cross this
 * boundary. Those details are captured separately on an Adjustment Line.
 */
export interface LockedPayrollSettlementExport {
  sourceSystem: 'WINGS_SETTLEMENT_EXPORT';
  exportId: string;
  exportedAt: string;
  exportHash: string;
  period: {
    periodKey: string;
    label: string;
    startDate: string;
    endDate: string;
    timezone: string;
    status: 'LOCKED';
    calculationVersion: string;
    lockedAt: string;
  };
  settlement: {
    version: number;
    status: 'LOCKED';
    calculatorVersion: string;
    sourceCutoffAt: string;
    inputHash: string;
  };
  subjects: Array<{
    /** Stable, opaque key supplied by the source export; never a display name. */
    subjectKey: string;
    result: ShadowSettlementResult;
    sourceHash: string;
  }>;
}

/** The only value persisted locally as evidence of a successful read-only import. */
export interface SanitizedLockedSettlementImport {
  periodKey: string;
  settlementVersion: number;
  exportId: string;
  exportHash: string;
  subjectCount: number;
}
