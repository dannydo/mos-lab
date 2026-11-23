/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import type { SharedPoolOverviewStats } from '@mos-lab/shared';
import { inFlightSharedPoolOverviewPromises, sharedPoolOverviewComputedAt } from './campaign-shared-pool-cache.js';
import { parseSharedPoolConfig } from './campaign-shared-pool-helpers.js';
import { maintainSharedPoolThrottled } from './campaign-shared-pool-maintenance.service.js';
import { getCampaignStaffPerformance } from './campaign-shared-pool-performance.service.js';

/**
 * Get Shared Pool Overview Stats: active batch metrics, campaign metrics, burn rate, and early warning levels.
 * Features Stale-While-Revalidate (SWR):
 * - Fresh (< 60s): Returns directly from RAM (< 5ms).
 * - Stale (60s - 300s): Returns instant cached data (0ms) and triggers background revalidation.
 * - Cache Miss: Single-Flight promise deduplication.
 */
export async function getSharedPoolOverview(
  fastify: FastifyInstance,
  campaignId: number,
  batchNumberParam?: number | string | 'ALL',
  options?: { skipCache?: boolean }
): Promise<SharedPoolOverviewStats> {
  const batchKeyPart = batchNumberParam !== undefined ? String(batchNumberParam) : 'DEFAULT';
  const cacheKey = `campaign:shared-pool:overview:${campaignId}:${batchKeyPart}`;
  const now = Date.now();

  if (!options?.skipCache) {
    const cached = fastify.cache?.get<SharedPoolOverviewStats>(cacheKey);
    if (cached) {
      const computedAt = sharedPoolOverviewComputedAt.get(cacheKey) || now;
      const age = now - computedAt;

      // 1. FRESH (< 180s / 3m): Return directly from RAM, no background revalidation needed
      if (age < 180_000) {
        return cached;
      }

      // 2. STALE-WHILE-REVALIDATE (3m - 30m): Return immediately (0ms) and revalidate in background
      if (!inFlightSharedPoolOverviewPromises.has(cacheKey)) {
        const revalidatePromise = (async () => {
          try {
            const freshOverview = await computeSharedPoolOverview(fastify, campaignId, batchNumberParam);
            sharedPoolOverviewComputedAt.set(cacheKey, Date.now());
            fastify.cache?.set(cacheKey, freshOverview, 1_800_000);
            return freshOverview;
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : String(err);
            fastify.log?.warn?.(
              `[SharedPoolOverview] Background SWR revalidation failed for campaign ${campaignId}: ${errMsg}`
            );
            return cached;
          } finally {
            inFlightSharedPoolOverviewPromises.delete(cacheKey);
          }
        })();
        inFlightSharedPoolOverviewPromises.set(cacheKey, revalidatePromise);
      }

      return cached;
    }

    // 3. CACHE MISS: Single-flight deduplication
    const inFlight = inFlightSharedPoolOverviewPromises.get(cacheKey);
    if (inFlight) {
      return await inFlight;
    }
  }

  const computePromise = (async () => {
    try {
      const overview = await computeSharedPoolOverview(fastify, campaignId, batchNumberParam);
      sharedPoolOverviewComputedAt.set(cacheKey, Date.now());
      fastify.cache?.set(cacheKey, overview, 1_800_000);
      return overview;
    } finally {
      inFlightSharedPoolOverviewPromises.delete(cacheKey);
    }
  })();

  if (!options?.skipCache) {
    inFlightSharedPoolOverviewPromises.set(cacheKey, computePromise);
  }

  return await computePromise;
}

async function computeSharedPoolOverview(
  fastify: FastifyInstance,
  campaignId: number,
  batchNumberParam?: number | string | 'ALL'
): Promise<SharedPoolOverviewStats> {
  maintainSharedPoolThrottled(fastify, campaignId);

  const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);

  const config = parseSharedPoolConfig(campaign.sharedPoolConfig);

  const activeBatchNumber = campaign.currentBatchNumber || 1;
  const isAllBatches = batchNumberParam === 'ALL';
  const selectedBatch = isAllBatches
    ? 'ALL'
    : batchNumberParam !== undefined
      ? Number(batchNumberParam)
      : activeBatchNumber;

  const batchWhere: any = {
    campaignId,
    removedAt: null,
  };
  if (selectedBatch !== 'ALL') {
    batchWhere.batchNumber = selectedBatch;
  }

  // Run single pass campaign-wide SQL aggregation, batch groupBy, burn rate query, and cached staff performance concurrently
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [campaignAggRows, activeBatchCustomers, recentActivityCount, staffPerformance] = await Promise.all([
    fastify.prisma.crm.$queryRaw<
      Array<{
        totalCustomers: number | bigint;
        totalExploited: number | bigint;
        totalRemaining: number | bigint;
        totalExcluded: number | bigint;
        maxBatchNumber: number | null;
      }>
    >`
      SELECT 
        COUNT(*) as totalCustomers,
        COALESCE(SUM(CASE WHEN pool_status IN ('EXPLOITED', 'BOOKED', 'EXCLUDED') THEN 1 ELSE 0 END), 0) as totalExploited,
        COALESCE(SUM(CASE WHEN pool_status IN ('AVAILABLE', 'CLAIMED', 'RECYCLING', 'RECYCLE') THEN 1 ELSE 0 END), 0) as totalRemaining,
        COALESCE(SUM(CASE WHEN pool_status = 'EXCLUDED' THEN 1 ELSE 0 END), 0) as totalExcluded,
        COALESCE(MAX(batch_number), 1) as maxBatchNumber
      FROM crm_campaign_customers
      WHERE campaign_id = ${campaignId} AND removed_at IS NULL
    `,
    fastify.prisma.crm.crmCampaignCustomer.groupBy({
      by: ['poolStatus'],
      where: batchWhere,
      _count: { id: true },
    }),
    fastify.prisma.crm.crmCampaignSharedPoolLog.count({
      where: {
        campaignId,
        action: { in: ['STATUS_UPDATE', 'CALL'] },
        createdAt: { gte: oneDayAgo },
      },
    }),
    getCampaignStaffPerformance(fastify, campaignId),
  ]);

  const statusMap = new Map(activeBatchCustomers.map((g) => [g.poolStatus, g._count.id]));
  const batchAvailable = statusMap.get('AVAILABLE') || 0;
  const batchClaimed = statusMap.get('CLAIMED') || 0;
  const batchExploited = statusMap.get('EXPLOITED') || 0;
  const batchRecycling = (statusMap.get('RECYCLING') || 0) + (statusMap.get('RECYCLE') || 0);
  const batchExcluded = statusMap.get('EXCLUDED') || 0;
  const batchBooked = statusMap.get('BOOKED') || 0;
  const batchTotal = batchAvailable + batchClaimed + batchExploited + batchRecycling + batchExcluded + batchBooked;

  const agg = campaignAggRows[0] || {
    totalCustomers: 0,
    totalExploited: 0,
    totalRemaining: 0,
    totalExcluded: 0,
    maxBatchNumber: 1,
  };

  const totalCustomers = Number(agg.totalCustomers || 0);
  const totalExploited = Number(agg.totalExploited || 0);
  const totalRemaining = Number(agg.totalRemaining || 0);
  const totalExcluded = Number(agg.totalExcluded || 0);
  const totalBatches = Math.max(activeBatchNumber, Number(agg.maxBatchNumber || 1));

  const percentRemaining = totalCustomers > 0 ? Math.round((totalRemaining / totalCustomers) * 100) : 0;
  const burnRatePerHour = Number(Math.max(0.1, recentActivityCount / 24).toFixed(1));
  const estimatedHoursRemaining =
    totalRemaining > 0 && burnRatePerHour > 0 ? Number((totalRemaining / burnRatePerHour).toFixed(1)) : null;

  // Warning level determination
  let warningLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EXHAUSTED' = 'NORMAL';
  let warningMessage = 'Data dồi dào — Vận hành ổn định';

  if (totalRemaining === 0 && totalCustomers > 0) {
    warningLevel = 'EXHAUSTED';
    warningMessage = 'Không còn Data dự phòng: Cần bổ sung Data ngay!';
  } else if (percentRemaining <= (config.criticalThreshold || 10)) {
    warningLevel = 'CRITICAL';
    warningMessage = `Nguy cấp: Data sắp cạn kiệt (còn ${percentRemaining}%)`;
  } else if (percentRemaining <= (config.warningThreshold || 30)) {
    warningLevel = 'WARNING';
    warningMessage = `Sắp hết Data (còn ${percentRemaining}%)`;
  }

  return {
    activeBatchNumber,
    totalBatches,
    batchSize: config.batchSize || 100,
    isPaused: Boolean(config.isPaused),
    batchTotal,
    batchAvailable,
    batchClaimed,
    batchExploited,
    batchRecycling,
    batchExcluded,
    batchBooked,
    totalCustomers,
    totalExploited,
    totalRemaining,
    totalExcluded,
    percentRemaining,
    warningLevel,
    warningMessage,
    burnRatePerHour,
    estimatedHoursRemaining,
    staffPerformance,
  };
}
