import { AllocationBatchStatus, CustomerAllocationBatch } from '@mos-lab/shared';

export const ACCEPT_ACTION_TYPES = ['ACCEPT', 'ACCEPT_ALLOCATION'];

export function isAcceptActionType(actionType?: string | null): boolean {
  if (!actionType) return false;
  return ACCEPT_ACTION_TYPES.includes(actionType);
}

export function getHistoryAcceptWhereCondition() {
  return { actionType: { in: ACCEPT_ACTION_TYPES } };
}

export function mapAllocationBatchToDto(batch: SafeAny): CustomerAllocationBatch {
  return {
    id: batch.id,
    batchCode: batch.batchCode,
    campaignId: batch.campaignId || null,
    campaign: batch.campaign ? { id: batch.campaign.id, name: batch.campaign.name, slug: batch.campaign.slug } : null,
    assignerId: batch.assignerId,
    assignerName: batch.assigner?.displayName || `Manager #${batch.assignerId}`,
    bookerId: batch.bookerId,
    bookerName: batch.booker?.displayName || `Booker #${batch.bookerId}`,
    totalCount: batch.totalCount,
    status: batch.status as AllocationBatchStatus,
    declineReason: batch.declineReason || null,
    declineCategory: batch.declineCategory || null,
    declineNote: batch.declineNote || null,
    expiresAt: batch.expiresAt ? new Date(batch.expiresAt).toISOString() : '',
    acceptedAt: batch.acceptedAt ? new Date(batch.acceptedAt).toISOString() : null,
    declinedAt: batch.declinedAt ? new Date(batch.declinedAt).toISOString() : null,
    recalledAt: batch.recalledAt ? new Date(batch.recalledAt).toISOString() : null,
    retentionExpiresAt: batch.retentionExpiresAt ? new Date(batch.retentionExpiresAt).toISOString() : null,
    sourceFilterSummary: batch.sourceFilterSummary || null,
    sourceFilterJson: batch.sourceFilterJson || null,
    createdAt: new Date(batch.createdAt).toISOString(),
    updatedAt: new Date(batch.updatedAt).toISOString(),
    items: (batch.items || []).map((i: SafeAny) => ({
      id: i.id,
      batchId: i.batchId,
      customerId: i.customerId,
      customerName: i.customerName,
      customerPhone: i.customerPhone,
      status: i.status as AllocationBatchStatus,
      createdAt: new Date(i.createdAt).toISOString(),
      bucket: i.bucket,
      daysSinceLastVisit: i.daysSinceLastVisit,
      totalSpent: i.totalSpent,
    })),
  };
}
