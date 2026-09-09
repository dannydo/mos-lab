import { Prisma } from '../../generated/crm-client/index.js';

type AllocationTransaction = Prisma.TransactionClient;

export type AllocationLedgerEventType =
  | 'OFFERED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED'
  | 'RETURNED_TO_POOL'
  | 'TRANSFERRED'
  | 'RECALLED'
  | 'UNDO_REVERSED'
  | 'RETENTION_CHANGED'
  | 'CAMPAIGN_RETURNED_TO_POOL'
  | 'STAFF_MERGED'
  | 'RANDOM_SELECTED'
  | 'SYSTEM_REPAIR';

export interface AllocationLedgerEventInput {
  customerId: number;
  eventType: AllocationLedgerEventType;
  previousStaffId?: number | null;
  nextStaffId?: number | null;
  actorStaffId?: number | null;
  actorKind?: 'USER' | 'SYSTEM';
  previousStaffLabel?: string | null;
  nextStaffLabel?: string | null;
  actorLabel?: string | null;
  reason?: string | null;
  sourceType?: string;
  actionContext?: string | null;
  batchId?: string | null;
  campaignId?: number | null;
  correlationId?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt?: Date;
}

export class AllocationLedgerService {
  /** The only writer for immutable allocation evidence. */
  static async append(tx: AllocationTransaction, input: AllocationLedgerEventInput): Promise<void> {
    this.assertTraceable(input);
    await tx.crmAllocationLedgerEvent.create({
      data: {
        legacyUserId: input.customerId,
        eventType: input.eventType,
        previousStaffId: input.previousStaffId ?? null,
        nextStaffId: input.nextStaffId ?? null,
        actorStaffId: input.actorStaffId ?? null,
        actorKind: input.actorKind ?? (input.actorStaffId ? 'USER' : 'SYSTEM'),
        previousStaffLabel: input.previousStaffLabel ?? null,
        nextStaffLabel: input.nextStaffLabel ?? null,
        actorLabel: input.actorLabel ?? null,
        reason: input.reason?.trim() || null,
        sourceType: input.sourceType || 'MANUAL',
        actionContext: input.actionContext ?? null,
        batchId: input.batchId ?? null,
        campaignId: input.campaignId ?? null,
        correlationId: input.correlationId ?? null,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
        occurredAt: input.occurredAt ?? new Date(),
      },
    });
  }

  static async setOwner(
    tx: AllocationTransaction,
    input: AllocationLedgerEventInput & { deleteWhenPool?: boolean; retained?: boolean | null }
  ): Promise<void> {
    const existing = await tx.crmCustomerAssignment.findUnique({ where: { legacyUserId: input.customerId } });
    const previousStaffId = input.previousStaffId ?? existing?.staffId ?? null;
    const nextStaffId = input.nextStaffId ?? null;
    if (nextStaffId === null && input.deleteWhenPool && !(existing?.isRetained || input.retained)) {
      await tx.crmCustomerAssignment.deleteMany({ where: { legacyUserId: input.customerId } });
    } else {
      await tx.crmCustomerAssignment.upsert({
        where: { legacyUserId: input.customerId },
        update: {
          staffId: nextStaffId,
          assignedBy: input.actorStaffId ?? null,
          assignedAt: input.occurredAt ?? new Date(),
          expiresAt: null,
          assignedDurationDays: null,
          ...(nextStaffId === null ? {} : { isRetained: input.retained ?? false, retainedAt: null }),
        },
        create: {
          legacyUserId: input.customerId,
          staffId: nextStaffId,
          assignedBy: input.actorStaffId ?? null,
          isRetained: input.retained ?? false,
        },
      });
    }
    await this.append(tx, { ...input, previousStaffId, nextStaffId });
  }

  static async changeRetention(
    tx: AllocationTransaction,
    input: Omit<AllocationLedgerEventInput, 'eventType'> & { isRetained: boolean }
  ): Promise<void> {
    const existing = await tx.crmCustomerAssignment.findUnique({ where: { legacyUserId: input.customerId } });
    if (!existing || existing.staffId === null) return;
    await tx.crmCustomerAssignment.update({
      where: { legacyUserId: input.customerId },
      data: { isRetained: input.isRetained, retainedAt: input.isRetained ? (input.occurredAt ?? new Date()) : null },
    });
    await this.append(tx, {
      ...input,
      eventType: 'RETENTION_CHANGED',
      previousStaffId: existing.staffId,
      nextStaffId: existing.staffId,
      metadata: { ...(input.metadata || {}), isRetained: input.isRetained },
    });
  }

  private static assertTraceable(input: AllocationLedgerEventInput): void {
    if (!Number.isSafeInteger(input.customerId) || input.customerId <= 0)
      throw new Error('Allocation ledger requires a valid customer ID');
    const changesOwner = (input.previousStaffId ?? null) !== (input.nextStaffId ?? null);
    const needsReason =
      changesOwner ||
      [
        'RETURNED_TO_POOL',
        'TRANSFERRED',
        'RECALLED',
        'UNDO_REVERSED',
        'CAMPAIGN_RETURNED_TO_POOL',
        'STAFF_MERGED',
      ].includes(input.eventType);
    if (needsReason && !input.reason?.trim())
      throw new Error(`Allocation ledger event ${input.eventType} requires a reason`);
  }
}
