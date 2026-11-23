/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { CampaignBookingStatusFilter, CampaignPoolStatus } from '@mos-lab/shared';
import type { Prisma } from '../../../../generated/crm-client/index.js';
import { AllocationLedgerService } from '../../../allocation/allocation-ledger.service.js';

export interface CampaignCustomerQueryParams {
  bookerId?: number;
  assignedStaffId?: number;
  currentStaffId?: number;
  restrictToAssignedStaffId?: number;
  search?: string;
  touchpointKey?: string;
  bookingStatus?: CampaignBookingStatusFilter;
  batchNumber?: number | 'ALL';
  poolStatus?: CampaignPoolStatus | 'ALL' | 'REMAINING' | 'RECYCLE';
  page?: number;
  pageSize?: number;
}

export interface CampaignCustomerPageResult {
  items: any[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export interface CampaignCustomerInsertDelegate {
  crmCampaignCustomer: {
    findFirst: (args: any) => Promise<{ batchNumber: number } | null>;
    count: (args: any) => Promise<number>;
  };
}

export function normalizeUniquePositiveIds(ids: number[]): number[] {
  return Array.from(new Set(ids.map((id) => Number(id)).filter((id) => !isNaN(id) && id > 0)));
}

export function parseSharedPoolBatchSize(sharedPoolConfig: unknown): number {
  let batchSize = 100;
  try {
    if (sharedPoolConfig) {
      const conf =
        typeof sharedPoolConfig === 'string' ? JSON.parse(sharedPoolConfig) : (sharedPoolConfig as Record<string, any>);
      if (conf?.batchSize && conf.batchSize > 0) batchSize = Number(conf.batchSize);
    }
  } catch {
    // Ignore malformed shared pool JSON and keep default batch size
  }
  return batchSize;
}

export async function buildCampaignCustomerInsertData(
  crmClient: CampaignCustomerInsertDelegate,
  campaignId: number,
  campaign: { operationMode: string; sharedPoolConfig: unknown },
  customerIds: number[],
  staffId: number,
  now: Date
): Promise<any[]> {
  if (campaign.operationMode !== 'SHARED_POOL') {
    return customerIds.map((cId) => ({
      campaignId,
      legacyUserId: cId,
      addedAt: now,
      addedBy: staffId,
    }));
  }

  const batchSize = parseSharedPoolBatchSize(campaign.sharedPoolConfig);
  let currentBatch = 1;
  let countInCurrentBatch = 0;

  const highestCust = await crmClient.crmCampaignCustomer.findFirst({
    where: { campaignId, removedAt: null },
    orderBy: { batchNumber: 'desc' },
    select: { batchNumber: true },
  });
  if (highestCust && highestCust.batchNumber > 0) {
    currentBatch = highestCust.batchNumber;
    countInCurrentBatch = await crmClient.crmCampaignCustomer.count({
      where: { campaignId, batchNumber: currentBatch, removedAt: null },
    });
  }

  return customerIds.map((cId) => {
    if (countInCurrentBatch >= batchSize) {
      currentBatch++;
      countInCurrentBatch = 0;
    }
    countInCurrentBatch++;
    return {
      campaignId,
      legacyUserId: cId,
      batchNumber: currentBatch,
      poolStatus: 'AVAILABLE',
      addedAt: now,
      addedBy: staffId,
    };
  });
}

export async function returnAssignedCustomersToPool(
  tx: Prisma.TransactionClient,
  assignments: Array<{ legacyUserId: number; staffId?: number | null }>,
  opts: {
    campaignId: number;
    actorStaffId: number;
    reason: string;
    actionContext: string;
    correlationId: string;
    occurredAt: Date;
  }
): Promise<void> {
  for (const assignment of assignments) {
    await AllocationLedgerService.setOwner(tx, {
      customerId: assignment.legacyUserId,
      eventType: 'CAMPAIGN_RETURNED_TO_POOL',
      previousStaffId: assignment.staffId,
      nextStaffId: null,
      actorStaffId: opts.actorStaffId,
      reason: opts.reason,
      sourceType: 'CAMPAIGN',
      actionContext: opts.actionContext,
      campaignId: opts.campaignId,
      correlationId: opts.correlationId,
      deleteWhenPool: true,
      occurredAt: opts.occurredAt,
    });
  }
}
