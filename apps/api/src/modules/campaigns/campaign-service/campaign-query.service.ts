/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import type { Campaign, CampaignStatus, ListCampaignsParams } from '@mos-lab/shared';
import {
  CAMPAIGN_DETAIL_INCLUDE,
  type CampaignReadOptions,
  campaignVisibilityWhere,
  mapCampaignToDto,
  parseSharedPoolConfigJson,
  slugify,
} from './campaign-helpers.js';
import { checkAndUpdateCampaignStatuses } from './campaign-lifecycle.service.js';

/**
 * List custom campaigns with stats summary.
 */
export async function listCampaigns(
  fastify: FastifyInstance,
  params: ListCampaignsParams = {},
  options: CampaignReadOptions = {}
): Promise<{
  items: Campaign[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}> {
  await checkAndUpdateCampaignStatuses(fastify);

  const { status, search, page = 1, pageSize = 20 } = params;
  const pageNum = Number(page) || 1;
  const limitNum = Number(pageSize) || 20;
  const skip = (pageNum - 1) * limitNum;

  const baseWhere: any = {
    deletedAt: null,
  };
  if (status) {
    baseWhere.status = status;
  }
  if (search && search.trim() !== '') {
    const trimmed = search.trim();
    baseWhere.OR = [
      { name: { contains: trimmed } },
      { slug: { contains: trimmed } },
      { description: { contains: trimmed } },
    ];
  }
  const where = campaignVisibilityWhere(baseWhere, options);

  const [total, campaigns] = await Promise.all([
    fastify.prisma.crm.crmCustomCampaign.count({ where }),
    fastify.prisma.crm.crmCustomCampaign.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, displayName: true, username: true } },
      },
    }),
  ]);

  const campaignIds = campaigns.map((c) => c.id);
  const [customerCounts, touchpointCounts, promotionCounts] =
    campaignIds.length > 0
      ? await Promise.all([
          fastify.prisma.crm.crmCampaignCustomer.groupBy({
            by: ['campaignId'],
            where: { campaignId: { in: campaignIds }, removedAt: null },
            _count: { _all: true },
          }),
          fastify.prisma.crm.crmCampaignTouchpoint.groupBy({
            by: ['campaignId'],
            where: { campaignId: { in: campaignIds } },
            _count: { _all: true },
          }),
          fastify.prisma.crm.crmCampaignPromotion.groupBy({
            by: ['campaignId'],
            where: { campaignId: { in: campaignIds } },
            _count: { _all: true },
          }),
        ])
      : [[], [], []];

  const customerCountMap = new Map(customerCounts.map((item) => [item.campaignId, item._count._all]));
  const touchpointCountMap = new Map(touchpointCounts.map((item) => [item.campaignId, item._count._all]));
  const promotionCountMap = new Map(promotionCounts.map((item) => [item.campaignId, item._count._all]));

  const items: Campaign[] = campaigns.map((c) => {
    let assignedStaffIds: number[] = [];
    if ((c as any).assignedStaffIds) {
      try {
        assignedStaffIds = JSON.parse((c as any).assignedStaffIds);
      } catch {
        // Invalid legacy JSON intentionally falls back to no assigned staff.
      }
    }
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || null,
      startDate: c.startDate ? c.startDate.toISOString().split('T')[0] : null,
      endDate: c.endDate ? c.endDate.toISOString().split('T')[0] : null,
      status: c.status as CampaignStatus,
      operationMode: ((c as any).operationMode || 'PERSONAL') as any,
      sharedPoolConfig: parseSharedPoolConfigJson((c as any).sharedPoolConfig),
      currentBatchNumber: (c as any).currentBatchNumber || 1,
      createdBy: c.createdBy,
      assignedStaffIds,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      _count: {
        customers: customerCountMap.get(c.id) || 0,
        touchpoints: touchpointCountMap.get(c.id) || 0,
        promotions: promotionCountMap.get(c.id) || 0,
      },
    };
  });

  return {
    items,
    total,
    page: pageNum,
    pageSize: limitNum,
    pages: Math.ceil(total / limitNum) || 1,
  };
}

/**
 * Get single campaign by ID.
 */
export async function getCampaignById(
  fastify: FastifyInstance,
  id: number,
  options: CampaignReadOptions = {}
): Promise<any> {
  const campaign = await fastify.prisma.crm.crmCustomCampaign.findFirst({
    where: campaignVisibilityWhere({ id }, options),
    include: CAMPAIGN_DETAIL_INCLUDE,
  });

  if (!campaign) {
    throw new Error(`Chiến dịch ID ${id} không tồn tại`);
  }

  return mapCampaignToDto(campaign);
}

/**
 * Get single campaign by Slug.
 */
export async function getCampaignBySlug(
  fastify: FastifyInstance,
  slug: string,
  options: CampaignReadOptions = {}
): Promise<any> {
  const raw = (slug || '').trim();
  const clean = slugify(raw);
  const bare = raw.replace(/^-+|-+$/g, '');
  const numericId = !isNaN(Number(raw)) ? parseInt(raw, 10) : null;

  let campaign = await fastify.prisma.crm.crmCustomCampaign.findFirst({
    where: campaignVisibilityWhere(
      {
        OR: [
          { slug: raw },
          { slug: clean },
          { slug: bare },
          { slug: `-${clean}` },
          { slug: `-${bare}` },
          ...(numericId !== null ? [{ id: numericId }] : []),
        ],
      },
      options
    ),
    include: CAMPAIGN_DETAIL_INCLUDE,
  });

  if (!campaign && clean) {
    campaign = await fastify.prisma.crm.crmCustomCampaign.findFirst({
      where: campaignVisibilityWhere(
        {
          slug: { contains: clean },
        },
        options
      ),
      include: CAMPAIGN_DETAIL_INCLUDE,
    });
  }

  if (!campaign) {
    throw new Error(`Chiến dịch slug "${slug}" không tồn tại`);
  }

  return mapCampaignToDto(campaign);
}
