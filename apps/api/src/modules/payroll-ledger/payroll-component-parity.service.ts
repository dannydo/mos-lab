export type PayrollComponentParityLine = {
  /** Stable business reference shared by mOS and the comparison export. */
  sourceKey: string;
  subjectKey: string;
  component: string;
  amountHalfDong: number;
};

export type PayrollComponentParityMismatch = {
  sourceKey: string;
  subjectKey: string;
  component: string;
  kind: 'MISSING_MOS' | 'MISSING_REFERENCE' | 'AMOUNT_MISMATCH';
  mosAmountHalfDong: number | null;
  referenceAmountHalfDong: number | null;
  deltaHalfDong: number | null;
};

function keyOf(line: PayrollComponentParityLine): string {
  return `${line.subjectKey}\u0000${line.component}\u0000${line.sourceKey}`;
}

function index(lines: readonly PayrollComponentParityLine[], label: string): Map<string, PayrollComponentParityLine> {
  const result = new Map<string, PayrollComponentParityLine>();
  for (const line of lines) {
    if (
      !line.sourceKey.trim() ||
      !line.subjectKey.trim() ||
      !line.component.trim() ||
      !Number.isSafeInteger(line.amountHalfDong)
    ) {
      throw new Error(`${label} payroll comparison lines require canonical source evidence and exact half-VND amounts`);
    }
    const key = keyOf(line);
    if (result.has(key)) throw new Error(`${label} payroll comparison has duplicate component evidence`);
    result.set(key, line);
  }
  return result;
}

/**
 * Exact, fail-closed reconciliation for every payroll role. No small-delta
 * tolerance exists: a difference of one half-VND is evidence to investigate,
 * never a value to round away. The caller supplies a read-only comparison
 * export; this function never calls or mutates iOS/Legacy.
 */
export function reconcilePayrollComponentParity(input: {
  mos: readonly PayrollComponentParityLine[];
  reference: readonly PayrollComponentParityLine[];
}): { matchedCount: number; mismatches: PayrollComponentParityMismatch[] } {
  const mos = index(input.mos, 'mOS');
  const reference = index(input.reference, 'Reference');
  const keys = [...new Set([...mos.keys(), ...reference.keys()])].sort();
  const mismatches: PayrollComponentParityMismatch[] = [];
  let matchedCount = 0;

  for (const key of keys) {
    const mosLine = mos.get(key) ?? null;
    const referenceLine = reference.get(key) ?? null;
    const identity = mosLine ?? referenceLine!;
    if (!mosLine) {
      mismatches.push({
        sourceKey: identity.sourceKey,
        subjectKey: identity.subjectKey,
        component: identity.component,
        kind: 'MISSING_MOS',
        mosAmountHalfDong: null,
        referenceAmountHalfDong: referenceLine!.amountHalfDong,
        deltaHalfDong: null,
      });
      continue;
    }
    if (!referenceLine) {
      mismatches.push({
        sourceKey: identity.sourceKey,
        subjectKey: identity.subjectKey,
        component: identity.component,
        kind: 'MISSING_REFERENCE',
        mosAmountHalfDong: mosLine.amountHalfDong,
        referenceAmountHalfDong: null,
        deltaHalfDong: null,
      });
      continue;
    }
    const deltaHalfDong = mosLine.amountHalfDong - referenceLine.amountHalfDong;
    if (deltaHalfDong !== 0) {
      mismatches.push({
        sourceKey: identity.sourceKey,
        subjectKey: identity.subjectKey,
        component: identity.component,
        kind: 'AMOUNT_MISMATCH',
        mosAmountHalfDong: mosLine.amountHalfDong,
        referenceAmountHalfDong: referenceLine.amountHalfDong,
        deltaHalfDong,
      });
      continue;
    }
    matchedCount += 1;
  }
  return { matchedCount, mismatches };
}
