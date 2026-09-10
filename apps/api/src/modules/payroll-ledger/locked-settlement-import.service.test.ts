import assert from 'node:assert/strict';
import test from 'node:test';
import type { LockedPayrollSettlementExport } from '@mos-lab/shared';
import { hashLockedSettlementExport, validateLockedSettlementExport } from './locked-settlement-import.service.js';

function exportFixture(): LockedPayrollSettlementExport {
  const payload = {
    sourceSystem: 'WINGS_SETTLEMENT_EXPORT' as const,
    exportId: 'locked-export-2026-08-v1',
    exportedAt: '2026-09-10T09:00:00.000Z',
    period: {
      periodKey: '2026-08',
      label: 'Tháng 8 đã khóa',
      startDate: '2026-08-01',
      endDate: '2026-08-31',
      timezone: 'Asia/Ho_Chi_Minh',
      status: 'LOCKED' as const,
      calculationVersion: 'cc-cash-ledger.v1',
      lockedAt: '2026-09-01T05:00:00.000Z',
    },
    settlement: {
      version: 1,
      status: 'LOCKED' as const,
      calculatorVersion: 'cc-cash-ledger.v1',
      sourceCutoffAt: '2026-09-01T05:00:00.000Z',
      inputHash: 'source-ledger-cutoff-v1',
    },
    subjects: [
      {
        subjectKey: 'subject:8c2a1f',
        sourceHash: 'subject-ledger-v1',
        result: {
          mode: 'SHADOW_READ_ONLY' as const,
          sourcePeriodKey: '2026-08',
          calculationVersion: 'cc-cash-ledger.v1',
          subjectKey: 'subject:8c2a1f',
          lineCount: 2,
          grossAmount: 2_925,
          capAmount: null,
          receivedAmount: 2_925,
          holdAmount: 0,
        },
      },
    ],
  };
  return { ...payload, exportHash: hashLockedSettlementExport(payload) };
}

test('accepts a hash-verified, locked and sanitized settlement export', () => {
  assert.deepEqual(validateLockedSettlementExport(exportFixture()), {
    periodKey: '2026-08',
    settlementVersion: 1,
    exportId: 'locked-export-2026-08-v1',
    exportHash: exportFixture().exportHash,
    subjectCount: 1,
  });
});

test('fails closed for a reviewing period, source drift or duplicate subject evidence', () => {
  const reviewing = exportFixture();
  (reviewing.period as { status: string }).status = 'REVIEWING';
  assert.throws(() => validateLockedSettlementExport(reviewing), /locked payroll period/);

  const drifted = exportFixture();
  drifted.subjects[0]!.result.receivedAmount = 2_990;
  assert.throws(() => validateLockedSettlementExport(drifted), /hash does not match/);

  const duplicate = exportFixture();
  duplicate.subjects.push({ ...duplicate.subjects[0]! });
  const { exportHash: _exportHash, ...payload } = duplicate;
  duplicate.exportHash = hashLockedSettlementExport(payload);
  assert.throws(() => validateLockedSettlementExport(duplicate), /unique opaque keys/);
});
