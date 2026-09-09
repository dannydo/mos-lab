import assert from 'node:assert/strict';
import test from 'node:test';
import { AllocationLedgerService, type AllocationLedgerEventInput } from './allocation-ledger.service.js';

type Assignment = { legacyUserId: number; staffId: number | null; isRetained: boolean };
type LoosePayload = {
  where: { legacyUserId: number };
  update?: { staffId?: number | null; isRetained?: boolean };
  create?: { staffId?: number | null; isRetained?: boolean };
  data?: Record<string, unknown>;
};

function createTransaction(initial: Assignment[], failLedger = false) {
  const assignments = new Map(initial.map((assignment) => [assignment.legacyUserId, { ...assignment }]));
  const events: AllocationLedgerEventInput[] = [];
  const tx = {
    crmCustomerAssignment: {
      findUnique: async ({ where }: { where: { legacyUserId: number } }) => assignments.get(where.legacyUserId) || null,
      deleteMany: async ({ where }: { where: { legacyUserId: number } }) => {
        assignments.delete(where.legacyUserId);
      },
      upsert: async ({ where, update, create }: LoosePayload) => {
        const prior = assignments.get(where.legacyUserId);
        assignments.set(where.legacyUserId, {
          legacyUserId: where.legacyUserId,
          staffId: prior ? (update?.staffId ?? null) : (create?.staffId ?? null),
          isRetained: prior ? (update?.isRetained ?? prior.isRetained) : (create?.isRetained ?? false),
        });
      },
      update: async ({ where, data }: LoosePayload) => {
        const prior = assignments.get(where.legacyUserId);
        if (prior) assignments.set(where.legacyUserId, { ...prior, ...data });
      },
    },
    crmAllocationLedgerEvent: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (failLedger) throw new Error('ledger write failed');
        events.push({
          customerId: data.legacyUserId as number,
          eventType: data.eventType as AllocationLedgerEventInput['eventType'],
          previousStaffId: data.previousStaffId as number | null,
          nextStaffId: data.nextStaffId as number | null,
          reason: data.reason as string | null,
          actionContext: data.actionContext as string | null,
        });
      },
    },
  };
  return { tx, assignments, events };
}

test('records each formerly uncovered ownership path as an immutable ledger event', async () => {
  const cases: Array<{
    eventType: AllocationLedgerEventInput['eventType'];
    actionContext: string;
    nextStaffId: number | null;
  }> = [
    { eventType: 'CAMPAIGN_RETURNED_TO_POOL', actionContext: 'CAMPAIGN_TRANSFER', nextStaffId: null },
    { eventType: 'CAMPAIGN_RETURNED_TO_POOL', actionContext: 'CAMPAIGN_REMOVE', nextStaffId: null },
    { eventType: 'CAMPAIGN_RETURNED_TO_POOL', actionContext: 'CAMPAIGN_BULK_REMOVE', nextStaffId: null },
    { eventType: 'TRANSFERRED', actionContext: 'ALLOCATION_BATCH_ACCEPTED', nextStaffId: 22 },
    { eventType: 'UNDO_REVERSED', actionContext: 'ASSIGNMENT_HISTORY_UNDO', nextStaffId: null },
    { eventType: 'STAFF_MERGED', actionContext: 'STAFF_MERGE', nextStaffId: 22 },
  ];
  for (const scenario of cases) {
    const { tx, assignments, events } = createTransaction([{ legacyUserId: 101, staffId: 11, isRetained: false }]);
    await AllocationLedgerService.setOwner(tx as never, {
      customerId: 101,
      eventType: scenario.eventType,
      previousStaffId: 11,
      nextStaffId: scenario.nextStaffId,
      actorStaffId: 1,
      reason: 'Manager-confirmed traceable change',
      actionContext: scenario.actionContext,
      deleteWhenPool: true,
    });
    assert.equal(events.length, 1, scenario.actionContext);
    assert.equal(events[0].eventType, scenario.eventType);
    assert.equal(events[0].actionContext, scenario.actionContext);
    assert.equal(assignments.get(101)?.staffId ?? null, scenario.nextStaffId);
  }
});

test('retention mutation appends its own ledger event', async () => {
  const { tx, assignments, events } = createTransaction([{ legacyUserId: 102, staffId: 11, isRetained: false }]);
  await AllocationLedgerService.changeRetention(tx as never, {
    customerId: 102,
    actorStaffId: 11,
    isRetained: true,
    reason: 'Booker đánh dấu giữ data',
    actionContext: 'CUSTOMER_RETENTION_TOGGLED',
  });
  assert.equal(assignments.get(102)?.isRetained, true);
  assert.equal(events[0].eventType, 'RETENTION_CHANGED');
});

test('a failed ledger write fails the combined ownership operation for transaction rollback', async () => {
  const { tx, assignments } = createTransaction([{ legacyUserId: 103, staffId: 11, isRetained: false }], true);
  const snapshot = new Map(Array.from(assignments, ([id, assignment]) => [id, { ...assignment }]));
  await assert.rejects(async () => {
    try {
      await AllocationLedgerService.setOwner(tx as never, {
        customerId: 103,
        eventType: 'TRANSFERRED',
        previousStaffId: 11,
        nextStaffId: 22,
        actorStaffId: 1,
        reason: 'Move requires immutable evidence',
      });
    } catch (error) {
      assignments.clear();
      for (const [id, assignment] of snapshot) assignments.set(id, assignment);
      throw error;
    }
  });
  assert.equal(assignments.get(103)?.staffId, 11);
});

test('owner-changing events reject missing reasons', async () => {
  const { tx } = createTransaction([{ legacyUserId: 104, staffId: 11, isRetained: false }]);
  await assert.rejects(
    AllocationLedgerService.setOwner(tx as never, {
      customerId: 104,
      eventType: 'RETURNED_TO_POOL',
      previousStaffId: 11,
      nextStaffId: null,
      actorStaffId: 1,
      deleteWhenPool: true,
    }),
    /requires a reason/
  );
});
