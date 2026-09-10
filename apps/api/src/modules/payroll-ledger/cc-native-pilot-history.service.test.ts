import assert from 'node:assert/strict';
import test from 'node:test';
import { createVerifiedHistorySnapshot, __test__ } from './cc-native-pilot-history.service.js';

const snapshot = createVerifiedHistorySnapshot({
  version: 'cc-native-pilot-history.v1',
  source: 'LOCAL_LEGACY_PARITY_REPLAY',
  verifiedAt: '2026-09-10T12:00:00.000Z',
  subjects: [
    {
      subjectKey: 'staff:legacy:37790',
      displayName: 'Diễm Hương',
      months: [
        {
          periodKey: '2026-08',
          rawXoayVnd: 260,
          dailyBonusVnd: 100,
          heldXoayVnd: 110,
          effectiveXoayVnd: 150,
          cashTipVnd: 65,
          componentTotalVnd: 315,
          sourceCounts: { xoayLedgerRows: 1, dailyCloses: 1, cashTipRows: 1 },
        },
      ],
    },
  ],
});

test('verified CC pilot history rejects a changed amount even when its shape is valid', () => {
  assert.equal(__test__.parseHistorySnapshot(JSON.stringify(snapshot))?.sourceHash, snapshot.sourceHash);
  const changed = structuredClone(snapshot);
  changed.subjects[0]!.months[0]!.cashTipVnd = 66;
  changed.subjects[0]!.months[0]!.componentTotalVnd = 316;
  assert.throws(() => __test__.parseHistorySnapshot(JSON.stringify(changed)), /hash does not match/);
});
