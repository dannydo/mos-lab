import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDurableCustomerAssignmentData } from '../customers/services/customer-assignment-policy.service.js';
import { AllocationService } from './allocation.service.js';

test('accepted allocation data has no automatic expiration', () => {
  const assignedAt = new Date('2026-08-31T12:00:00.000Z');
  assert.deepEqual(buildDurableCustomerAssignmentData({ staffId: 7, assignedBy: 1, assignedAt }), {
    staffId: 7,
    assignedBy: 1,
    assignedAt,
    expiresAt: null,
    assignedDurationDays: null,
    isRetained: false,
  });
});

test('automatic allocation maintenance only expires unaccepted 24-hour batches', async () => {
  let capturedWhere: unknown;
  let transactionCalled = false;
  const fastify = {
    prisma: {
      crm: {
        crmAllocationBatch: {
          findMany: async ({ where }: { where: unknown }) => {
            capturedWhere = where;
            return [];
          },
        },
        $transaction: async () => {
          transactionCalled = true;
        },
      },
    },
  };

  await AllocationService.checkAndExpireBatches(fastify as never);

  const where = capturedWhere as { status: string; expiresAt: { lte: Date } };
  assert.equal(where.status, 'PENDING_ACCEPT');
  assert.ok(where.expiresAt.lte instanceof Date);
  assert.equal(transactionCalled, false);
});
