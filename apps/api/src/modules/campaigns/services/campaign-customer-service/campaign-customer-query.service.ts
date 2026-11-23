/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import { CampaignSharedPoolService } from '../campaign-shared-pool.service.js';
import {
  type CampaignCustomerPageResult,
  type CampaignCustomerQueryParams,
  normalizeUniquePositiveIds,
} from './campaign-customer-helpers.js';
import {
  enrichCampaignCustomerItem,
  filterEnrichedCampaignCustomers,
  loadCampaignCustomerEnrichmentData,
} from './campaign-customer-enrichment.js';

/**
 * Fetch campaign customers with Booker filtering, search, pagination,
 * and touchpoint classification based on DATEDIFF(NOW(), cc.added_at).
 */
export async function getCampaignCustomers(
  fastify: FastifyInstance,
  campaignId: number,
  params: CampaignCustomerQueryParams = {}
): Promise<CampaignCustomerPageResult> {
  const {
    bookerId,
    assignedStaffId,
    currentStaffId,
    restrictToAssignedStaffId,
    search,
    touchpointKey,
    bookingStatus = 'ALL',
    batchNumber,
    poolStatus,
    page = 1,
    pageSize = 20,
  } = params;
  const pageNum = Math.max(1, Math.floor(Number(page) || 1));
  const limitNum = Math.min(1000, Math.max(1, Math.floor(Number(pageSize) || 20)));
  const skip = (pageNum - 1) * limitNum;

  // Verify campaign exists
  const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id: campaignId },
    include: { touchpoints: { orderBy: { sortOrder: 'asc' } } },
  });
  if (!campaign) {
    throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);
  }

  const where: any = {
    campaignId,
    removedAt: null,
  };

  if (campaign.operationMode === 'SHARED_POOL') {
    await CampaignSharedPoolService.maintainSharedPool(fastify, campaign.id);

    // Telesales membership check
    if (restrictToAssignedStaffId) {
      let allowedStaffIds: number[] = [];
      try {
        if (campaign.assignedStaffIds) {
          allowedStaffIds = JSON.parse(campaign.assignedStaffIds);
        }
      } catch {
        // Ignore malformed assignedStaffIds JSON
      }
      if (
        Array.isArray(allowedStaffIds) &&
        allowedStaffIds.length > 0 &&
        !allowedStaffIds.includes(restrictToAssignedStaffId)
      ) {
        return { items: [], total: 0, page: pageNum, pageSize: limitNum, pages: 0 };
      }
    }

    if (batchNumber !== undefined && batchNumber !== 'ALL') {
      where.batchNumber = Number(batchNumber);
    } else if (batchNumber === undefined && poolStatus !== 'REMAINING') {
      where.batchNumber = campaign.currentBatchNumber || 1;
    }

    if (poolStatus === 'REMAINING') {
      where.poolStatus = { in: ['AVAILABLE', 'CLAIMED', 'RECYCLING', 'RECYCLE'] };
    } else if (poolStatus === 'RECYCLE') {
      where.poolStatus = { in: ['RECYCLING', 'RECYCLE'] };
    } else if (poolStatus && poolStatus !== 'ALL') {
      where.poolStatus = poolStatus;
    }
  }

  // Booker, text and touchpoint filters depend on data from other sources, so
  // they still require enrichment before filtering. The common unfiltered
  // table path can page at the database boundary, avoiding every legacy query
  // and response field for records outside the visible page.
  const hasPostEnrichmentFilters = Boolean(
    bookerId ||
    assignedStaffId ||
    (restrictToAssignedStaffId && campaign.operationMode !== 'SHARED_POOL') ||
    search?.trim() ||
    touchpointKey?.trim() ||
    bookingStatus !== 'ALL'
  );
  const customerQuery = {
    where,
    include: {
      touchpointLogs: {
        include: { touchpoint: true as const },
      },
    },
    orderBy: { addedAt: 'desc' as const },
  };
  const campaignCustomersPromise = hasPostEnrichmentFilters
    ? fastify.prisma.crm.crmCampaignCustomer.findMany(customerQuery)
    : fastify.prisma.crm.crmCampaignCustomer.findMany({ ...customerQuery, skip, take: limitNum });
  const totalPromise: Promise<number | undefined> = hasPostEnrichmentFilters
    ? Promise.resolve(undefined)
    : fastify.prisma.crm.crmCampaignCustomer.count({ where });
  const [campaignCustomers, unfilteredTotal] = await Promise.all([campaignCustomersPromise, totalPromise]);

  if (campaignCustomers.length === 0) {
    const total = unfilteredTotal ?? 0;
    return { items: [], total, page: pageNum, pageSize: limitNum, pages: Math.ceil(total / limitNum) || 0 };
  }

  const legacyUserIds = normalizeUniquePositiveIds(campaignCustomers.map((cc) => cc.legacyUserId));

  if (legacyUserIds.length === 0) {
    const total = unfilteredTotal ?? 0;
    return { items: [], total, page: pageNum, pageSize: limitNum, pages: Math.ceil(total / limitNum) || 0 };
  }

  const enrichment = await loadCampaignCustomerEnrichmentData(fastify, campaign, legacyUserIds, bookingStatus);
  const now = new Date();

  const enrichedItems = campaignCustomers.map((cc) =>
    enrichCampaignCustomerItem(cc, {
      campaign,
      enrichment,
      now,
      currentStaffId,
      restrictToAssignedStaffId,
    })
  );

  const enriched = await filterEnrichedCampaignCustomers(fastify, enrichedItems, {
    campaign,
    campaignDoneUserIds: enrichment.campaignDoneUserIds,
    now,
    bookerId,
    assignedStaffId,
    restrictToAssignedStaffId,
    search,
    touchpointKey,
    bookingStatus,
  });

  const total = unfilteredTotal ?? enriched.length;
  const paginated = hasPostEnrichmentFilters ? enriched.slice(skip, skip + limitNum) : enriched;

  return {
    items: paginated,
    total,
    page: pageNum,
    pageSize: limitNum,
    pages: Math.ceil(total / limitNum) || 1,
  };
}
