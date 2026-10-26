import { FastifyInstance } from 'fastify';
/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import {
  CampaignPoolStatus,
  DEFAULT_SHARED_POOL_CONFIG,
  SharedPoolConfig,
  SharedPoolOverviewStats,
  CampaignStaffPerformance,
  CampaignStaffPerformanceResponse,
  UpdateSharedPoolStatusDto,
  CampaignSharedPoolDetailedLog,
  SharedPoolHistoryQueryParams,
  SharedPoolHistoryResponse,
  SharedPoolRecoveryDto,
  SharedPoolRecoveryResponse,
} from '@mos-lab/shared';
import { SharedPoolBroadcaster } from '../campaign-shared-pool-broadcaster.js';

export class CampaignSharedPoolService {
  private static inFlightSharedPoolOverviewPromises = new Map<string, Promise<SharedPoolOverviewStats>>();
  private static sharedPoolOverviewComputedAt = new Map<string, number>();
  private static lastMaintainedAtMap = new Map<number, number>();
  private static staffPerformanceCache = new Map<
    number,
    { data: CampaignStaffPerformanceResponse; computedAt: number }
  >();
  private static inFlightStaffPerformancePromises = new Map<number, Promise<CampaignStaffPerformanceResponse>>();
  private static cacheInvalidator?: (fastify: FastifyInstance, campaignId?: number) => void;

  static registerCacheInvalidator(fn: (fastify: FastifyInstance, campaignId?: number) => void): void {
    this.cacheInvalidator = fn;
  }

  static invalidateCache(fastify: FastifyInstance, campaignId?: number): void {
    if (campaignId) {
      fastify.cache?.invalidatePattern(`^campaign:shared-pool:overview:${campaignId}:`);
      this.staffPerformanceCache.delete(campaignId);
      this.inFlightStaffPerformancePromises.delete(campaignId);
      for (const key of this.inFlightSharedPoolOverviewPromises.keys()) {
        if (key.startsWith(`campaign:shared-pool:overview:${campaignId}:`)) {
          this.inFlightSharedPoolOverviewPromises.delete(key);
        }
      }
      for (const key of this.sharedPoolOverviewComputedAt.keys()) {
        if (key.startsWith(`campaign:shared-pool:overview:${campaignId}:`)) {
          this.sharedPoolOverviewComputedAt.delete(key);
        }
      }
    } else {
      fastify.cache?.invalidatePattern(`^campaign:shared-pool:overview:`);
      this.staffPerformanceCache.clear();
      this.inFlightStaffPerformancePromises.clear();
      this.inFlightSharedPoolOverviewPromises.clear();
      this.sharedPoolOverviewComputedAt.clear();
    }
  }

  static invalidateCampaignCache(fastify: FastifyInstance, campaignId?: number): void {
    this.invalidateCache(fastify, campaignId);
    if (this.cacheInvalidator) {
      this.cacheInvalidator(fastify, campaignId);
    }
  }

  /**
   * Maintain Shared Pool integrity:
   * 1. Auto-release expired claims (TTL).
   * 2. Auto-return recycled customers whose wait period ended.
   * 3. Auto-advance to next batch if current active batch is fully processed.
   */
  static async maintainSharedPool(fastify: FastifyInstance, campaignId: number): Promise<void> {
    const now = new Date();

    // 1. Release expired claims
    const expiredCustomers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        campaignId,
        poolStatus: 'CLAIMED',
        claimExpiresAt: { lte: now },
        removedAt: null,
      },
      select: { id: true, legacyUserId: true, claimedByStaffId: true, claimedByStaffName: true },
    });

    if (expiredCustomers.length > 0) {
      await fastify.prisma.crm.crmCampaignCustomer.updateMany({
        where: { id: { in: expiredCustomers.map((c) => c.id) } },
        data: {
          poolStatus: 'AVAILABLE',
          claimedByStaffId: null,
          claimedByStaffName: null,
          claimedAt: null,
          claimExpiresAt: null,
        },
      });

      await fastify.prisma.crm.crmCampaignSharedPoolLog.createMany({
        data: expiredCustomers.map((c) => ({
          campaignId,
          campaignCustomerId: c.id,
          legacyUserId: c.legacyUserId,
          staffId: c.claimedByStaffId,
          staffName: c.claimedByStaffName,
          action: 'RELEASE_EXPIRED',
          note: 'Hết thời gian giữ khách (Claim Lock hết hạn), tự động nhả về Shared Pool.',
          metadata: JSON.stringify({
            previousPoolStatus: 'CLAIMED',
            nextPoolStatus: 'AVAILABLE',
            previousClaimedByStaffId: c.claimedByStaffId,
            previousClaimedByStaffName: c.claimedByStaffName,
            result: 'SUCCESS',
            reason: 'LOCK_EXPIRED',
            releasedAt: now.toISOString(),
          }),
          createdAt: now,
        })),
      });

      SharedPoolBroadcaster.broadcast(campaignId, {
        type: 'CUSTOMERS_RELEASED',
        customerIds: expiredCustomers.map((c) => c.id),
        reason: 'LOCK_EXPIRED',
      });
    }

    // 2. Return recycled customers whose wait period ended
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
      select: { currentBatchNumber: true, operationMode: true },
    });

    const readyRecycled = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        campaignId,
        poolStatus: { in: ['RECYCLING', 'RECYCLE'] },
        availableAt: { lte: now },
        removedAt: null,
      },
      select: { id: true, legacyUserId: true, batchNumber: true, poolStatus: true },
    });

    if (readyRecycled.length > 0) {
      const targetBatchNumber =
        campaign && campaign.operationMode === 'SHARED_POOL' && campaign.currentBatchNumber
          ? campaign.currentBatchNumber
          : undefined;

      const updateData: any = {
        poolStatus: 'AVAILABLE',
        availableAt: null,
        claimedByStaffId: null,
        claimedByStaffName: null,
        claimedAt: null,
        claimExpiresAt: null,
        cooldownUntil: null,
      };
      if (targetBatchNumber !== undefined) {
        updateData.batchNumber = targetBatchNumber;
      }

      await fastify.prisma.crm.crmCampaignCustomer.updateMany({
        where: { id: { in: readyRecycled.map((c) => c.id) } },
        data: updateData,
      });

      await fastify.prisma.crm.crmCampaignSharedPoolLog.createMany({
        data: readyRecycled.map((c) => ({
          campaignId,
          campaignCustomerId: c.id,
          legacyUserId: c.legacyUserId,
          action: 'RECYCLE_RETURN',
          note: 'Khách hàng hoàn tất chu kỳ chờ, tự động quay lại Shared Pool.',
          metadata: JSON.stringify({
            previousPoolStatus: c.poolStatus || 'RECYCLING',
            nextPoolStatus: 'AVAILABLE',
            result: 'SUCCESS',
            reason: 'RECYCLE_PERIOD_ENDED',
            returnedAt: now.toISOString(),
            batchNumber: targetBatchNumber ?? c.batchNumber,
          }),
          createdAt: now,
        })),
      });

      SharedPoolBroadcaster.broadcast(campaignId, {
        type: 'CUSTOMERS_RELEASED',
        customerIds: readyRecycled.map((c) => c.id),
        reason: 'RECYCLE_RETURN',
      });
    }

    // 3. Auto advance batch if active batch is completely processed
    if (campaign && campaign.operationMode === 'SHARED_POOL') {
      const remainingInActiveBatch = await fastify.prisma.crm.crmCampaignCustomer.count({
        where: {
          campaignId,
          batchNumber: campaign.currentBatchNumber,
          poolStatus: { in: ['AVAILABLE', 'CLAIMED'] },
          removedAt: null,
        },
      });

      if (remainingInActiveBatch === 0) {
        const nextBatchCustomer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
          where: {
            campaignId,
            batchNumber: { gt: campaign.currentBatchNumber },
            removedAt: null,
          },
          orderBy: { batchNumber: 'asc' },
          select: { id: true, legacyUserId: true, batchNumber: true },
        });

        if (nextBatchCustomer) {
          await fastify.prisma.crm.crmCustomCampaign.update({
            where: { id: campaignId },
            data: { currentBatchNumber: nextBatchCustomer.batchNumber },
          });

          await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
            data: {
              campaignId,
              campaignCustomerId: nextBatchCustomer.id,
              legacyUserId: nextBatchCustomer.legacyUserId,
              action: 'AUTO_ADVANCE_BATCH',
              note: `Toàn bộ khách hàng trong Batch ${campaign.currentBatchNumber} đã được xử lý. Hệ thống tự động mở Batch ${nextBatchCustomer.batchNumber}.`,
              metadata: JSON.stringify({
                previousBatchNumber: campaign.currentBatchNumber,
                nextBatchNumber: nextBatchCustomer.batchNumber,
                result: 'SUCCESS',
              }),
              createdAt: now,
            },
          });

          SharedPoolBroadcaster.broadcast(campaignId, {
            type: 'BATCH_ADVANCED',
            currentBatchNumber: nextBatchCustomer.batchNumber,
          });
        }
      }
    }
  }

  /**
   * Throttled Shared Pool maintenance:
   * Only triggers at most once every 60 seconds per campaign in the background.
   * Completely avoids blocking read/overview requests.
   */
  static maintainSharedPoolThrottled(fastify: FastifyInstance, campaignId: number): void {
    const now = Date.now();
    const lastRun = this.lastMaintainedAtMap.get(campaignId) || 0;
    if (now - lastRun < 60_000) {
      return;
    }
    this.lastMaintainedAtMap.set(campaignId, now);
    this.maintainSharedPool(fastify, campaignId).catch((err: unknown) => {
      const errMsg = err instanceof Error ? err.message : String(err);
      fastify.log?.warn?.(`[maintainSharedPoolThrottled] Error maintaining campaign ${campaignId}: ${errMsg}`);
    });
  }

  /**
   * Get Shared Pool Overview Stats: active batch metrics, campaign metrics, burn rate, and early warning levels.
   * Features Stale-While-Revalidate (SWR):
   * - Fresh (< 60s): Returns directly from RAM (< 5ms).
   * - Stale (60s - 300s): Returns instant cached data (0ms) and triggers background revalidation.
   * - Cache Miss: Single-Flight promise deduplication.
   */
  static async getSharedPoolOverview(
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
        const computedAt = this.sharedPoolOverviewComputedAt.get(cacheKey) || now;
        const age = now - computedAt;

        // 1. FRESH (< 180s / 3m): Return directly from RAM, no background revalidation needed
        if (age < 180_000) {
          return cached;
        }

        // 2. STALE-WHILE-REVALIDATE (3m - 30m): Return immediately (0ms) and revalidate in background
        if (!this.inFlightSharedPoolOverviewPromises.has(cacheKey)) {
          const revalidatePromise = (async () => {
            try {
              const freshOverview = await this.computeSharedPoolOverview(fastify, campaignId, batchNumberParam);
              this.sharedPoolOverviewComputedAt.set(cacheKey, Date.now());
              fastify.cache?.set(cacheKey, freshOverview, 1_800_000);
              return freshOverview;
            } catch (err: unknown) {
              const errMsg = err instanceof Error ? err.message : String(err);
              fastify.log?.warn?.(
                `[SharedPoolOverview] Background SWR revalidation failed for campaign ${campaignId}: ${errMsg}`
              );
              return cached;
            } finally {
              this.inFlightSharedPoolOverviewPromises.delete(cacheKey);
            }
          })();
          this.inFlightSharedPoolOverviewPromises.set(cacheKey, revalidatePromise);
        }

        return cached;
      }

      // 3. CACHE MISS: Single-flight deduplication
      const inFlight = this.inFlightSharedPoolOverviewPromises.get(cacheKey);
      if (inFlight) {
        return await inFlight;
      }
    }

    const computePromise = (async () => {
      try {
        const overview = await this.computeSharedPoolOverview(fastify, campaignId, batchNumberParam);
        this.sharedPoolOverviewComputedAt.set(cacheKey, Date.now());
        fastify.cache?.set(cacheKey, overview, 1_800_000);
        return overview;
      } finally {
        this.inFlightSharedPoolOverviewPromises.delete(cacheKey);
      }
    })();

    if (!options?.skipCache) {
      this.inFlightSharedPoolOverviewPromises.set(cacheKey, computePromise);
    }

    return await computePromise;
  }

  private static async computeSharedPoolOverview(
    fastify: FastifyInstance,
    campaignId: number,
    batchNumberParam?: number | string | 'ALL'
  ): Promise<SharedPoolOverviewStats> {
    this.maintainSharedPoolThrottled(fastify, campaignId);

    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);

    let config: SharedPoolConfig = { ...DEFAULT_SHARED_POOL_CONFIG };
    if (campaign.sharedPoolConfig) {
      try {
        const parsed =
          typeof campaign.sharedPoolConfig === 'string'
            ? JSON.parse(campaign.sharedPoolConfig)
            : campaign.sharedPoolConfig;
        config = { ...config, ...parsed };
      } catch {}
    }

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
      this.getCampaignStaffPerformance(fastify, campaignId),
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

  /**
   * Get Campaign Staff Performance (Kết quả khai thác theo nhân viên trong Campaign Teamwork) - MOS-BUG-81.
   * Features Stale-While-Revalidate (SWR): Fresh < 60s from RAM, background revalidation.
   * Scoped strictly to this campaign and within campaign startDate/endDate window.
   */
  static async getCampaignStaffPerformance(
    fastify: FastifyInstance,
    campaignId: number
  ): Promise<CampaignStaffPerformanceResponse> {
    const cacheKey = campaignId;
    const now = Date.now();
    const cached = this.staffPerformanceCache.get(cacheKey);

    if (cached) {
      const age = now - cached.computedAt;
      if (age < 60_000) {
        return cached.data;
      }
      if (!this.inFlightStaffPerformancePromises.has(cacheKey)) {
        const revalidatePromise = this.computeCampaignStaffPerformance(fastify, campaignId)
          .then((res) => {
            this.staffPerformanceCache.set(cacheKey, { data: res, computedAt: Date.now() });
            return res;
          })
          .catch((err: unknown) => {
            const errMsg = err instanceof Error ? err.message : String(err);
            fastify.log?.warn?.(`[getCampaignStaffPerformance] Background revalidation failed: ${errMsg}`);
            return cached.data;
          })
          .finally(() => {
            this.inFlightStaffPerformancePromises.delete(cacheKey);
          });
        this.inFlightStaffPerformancePromises.set(cacheKey, revalidatePromise);
      }
      return cached.data;
    }

    const inFlight = this.inFlightStaffPerformancePromises.get(cacheKey);
    if (inFlight) {
      return await inFlight;
    }

    const computePromise = this.computeCampaignStaffPerformance(fastify, campaignId)
      .then((res) => {
        this.staffPerformanceCache.set(cacheKey, { data: res, computedAt: Date.now() });
        return res;
      })
      .finally(() => {
        this.inFlightStaffPerformancePromises.delete(cacheKey);
      });

    this.inFlightStaffPerformancePromises.set(cacheKey, computePromise);
    return await computePromise;
  }

  private static async computeCampaignStaffPerformance(
    fastify: FastifyInstance,
    campaignId: number
  ): Promise<CampaignStaffPerformanceResponse> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        assignedStaffIds: true,
      },
    });
    if (!campaign) throw new Error(`Chiến dịch ID ${campaignId} không tồn tại`);

    let assignedStaffIds: number[] = [];
    try {
      if (campaign.assignedStaffIds) {
        assignedStaffIds = JSON.parse(campaign.assignedStaffIds);
      }
    } catch {}

    const startDate = campaign.startDate ? new Date(campaign.startDate) : null;
    const endDate = campaign.endDate ? new Date(campaign.endDate) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    // Date range filter for queries
    const logDateFilter: Record<string, any> = {};
    if (startDate) logDateFilter.gte = startDate;
    if (endDate) logDateFilter.lte = endDate;

    // Fetch shared pool logs strictly for this campaign
    const logs = await fastify.prisma.crm.crmCampaignSharedPoolLog.findMany({
      where: {
        campaignId,
        ...(Object.keys(logDateFilter).length > 0 ? { createdAt: logDateFilter } : {}),
      },
      select: {
        staffId: true,
        staffName: true,
        legacyUserId: true,
        action: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Fetch customers in this campaign (for booked and last call checks)
    const customers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        campaignId,
        removedAt: null,
      },
      select: {
        legacyUserId: true,
        lastCallStaffId: true,
        lastCallStaffName: true,
        lastCallAt: true,
        lastCallResult: true,
        bookedByStaffId: true,
        bookedByStaffName: true,
        bookedAt: true,
        poolStatus: true,
      },
    });

    // Collect all candidate staff IDs
    const staffIdSet = new Set<number>(assignedStaffIds);
    logs.forEach((l) => {
      if (l.staffId) staffIdSet.add(l.staffId);
    });
    customers.forEach((c) => {
      if (c.bookedByStaffId) staffIdSet.add(c.bookedByStaffId);
      if (c.lastCallStaffId) staffIdSet.add(c.lastCallStaffId);
    });

    const staffList =
      staffIdSet.size > 0
        ? await fastify.prisma.crm.crmStaff.findMany({
            where: { id: { in: Array.from(staffIdSet) } },
            select: { id: true, displayName: true, username: true, avatarUrl: true },
          })
        : [];
    const staffInfoMap = new Map(staffList.map((s) => [s.id, s]));

    const staffStats = new Map<
      number,
      {
        staffId: number;
        staffName: string;
        avatarUrl: string | null;
        exploitedCustomers: Set<number>;
        pickupCount: number;
        bookedCustomers: Set<number>;
        claimedCount: number;
      }
    >();

    const getStaffEntry = (id: number, fallbackName?: string | null) => {
      if (!staffStats.has(id)) {
        const info = staffInfoMap.get(id);
        staffStats.set(id, {
          staffId: id,
          staffName: info?.displayName || info?.username || fallbackName || `Nhân viên #${id}`,
          avatarUrl: info?.avatarUrl || null,
          exploitedCustomers: new Set<number>(),
          pickupCount: 0,
          bookedCustomers: new Set<number>(),
          claimedCount: 0,
        });
      }
      return staffStats.get(id)!;
    };

    // Initialize all assigned staff (ensuring 0s if they haven't worked yet)
    assignedStaffIds.forEach((id) => getStaffEntry(id));

    const PICKUP_CALL_RESULTS = new Set([
      'BOOKED',
      'THINKING',
      'CALLBACK',
      'NO_NEED',
      'REJECTED',
      'WRONG_NUMBER',
      'ANSWERED',
      'ANSWER',
      'CONNECTED',
    ]);
    const NON_PICKUP_RESULTS = new Set(['NO_ANSWER', 'BUSY', 'ERROR', 'FAILED', 'MISSED', 'UNANSWERED']);

    for (const log of logs) {
      if (!log.staffId) continue;
      const entry = getStaffEntry(log.staffId, log.staffName);

      if (log.action === 'CLAIM') {
        entry.claimedCount += 1;
      } else if (log.action === 'STATUS_UPDATE' || log.action === 'CALL') {
        if (log.legacyUserId) {
          entry.exploitedCustomers.add(log.legacyUserId);
        }
        let meta: Record<string, any> = {};
        try {
          meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata || {};
        } catch {}
        const callResult = String(meta.callResult || '').toUpperCase();
        const durationSec = Number(meta.durationSec) || 0;

        const isPickup =
          !NON_PICKUP_RESULTS.has(callResult) && (PICKUP_CALL_RESULTS.has(callResult) || durationSec > 0);

        if (isPickup) {
          entry.pickupCount += 1;
        }

        if (callResult === 'BOOKED' && log.legacyUserId) {
          entry.bookedCustomers.add(log.legacyUserId);
        }
      } else if (log.action === 'BOOKING') {
        if (log.legacyUserId) {
          entry.bookedCustomers.add(log.legacyUserId);
          entry.exploitedCustomers.add(log.legacyUserId);
        }
      }
    }

    for (const c of customers) {
      // Check bookings within campaign window
      if (c.bookedByStaffId && c.poolStatus === 'BOOKED') {
        const bookedAt = c.bookedAt ? new Date(c.bookedAt) : null;
        const inWindow =
          (!startDate || (bookedAt && bookedAt >= startDate)) && (!endDate || (bookedAt && bookedAt <= endDate));
        if (inWindow) {
          const entry = getStaffEntry(c.bookedByStaffId, c.bookedByStaffName);
          entry.bookedCustomers.add(c.legacyUserId);
          entry.exploitedCustomers.add(c.legacyUserId);
        }
      }
      // Check last call within campaign window
      if (c.lastCallStaffId && ['EXPLOITED', 'BOOKED', 'EXCLUDED', 'RECYCLING'].includes(c.poolStatus || '')) {
        const lastCallAt = c.lastCallAt ? new Date(c.lastCallAt) : null;
        const inWindow =
          (!startDate || (lastCallAt && lastCallAt >= startDate)) &&
          (!endDate || (lastCallAt && lastCallAt <= endDate));
        if (inWindow) {
          const entry = getStaffEntry(c.lastCallStaffId, c.lastCallStaffName);
          entry.exploitedCustomers.add(c.legacyUserId);
        }
      }
    }

    const items: CampaignStaffPerformance[] = Array.from(staffStats.values()).map((s) => {
      const exploitedCount = s.exploitedCustomers.size;
      const bookedCount = s.bookedCustomers.size;
      const conversionRate = exploitedCount > 0 ? Number(((bookedCount / exploitedCount) * 100).toFixed(1)) : 0;
      return {
        staffId: s.staffId,
        staffName: s.staffName,
        avatarUrl: s.avatarUrl,
        exploitedCount,
        pickupCount: s.pickupCount,
        bookedCount,
        conversionRate,
        claimedCount: s.claimedCount,
      };
    });

    // Sort by: bookedCount DESC, exploitedCount DESC, pickupCount DESC, staffName ASC
    items.sort((a, b) => {
      if (b.bookedCount !== a.bookedCount) return b.bookedCount - a.bookedCount;
      if (b.exploitedCount !== a.exploitedCount) return b.exploitedCount - a.exploitedCount;
      if (b.pickupCount !== a.pickupCount) return b.pickupCount - a.pickupCount;
      return a.staffName.localeCompare(b.staffName);
    });

    const totalExploited = items.reduce((sum, item) => sum + item.exploitedCount, 0);
    const totalPickup = items.reduce((sum, item) => sum + item.pickupCount, 0);
    const totalBooked = items.reduce((sum, item) => sum + item.bookedCount, 0);
    const avgConversionRate = totalExploited > 0 ? Number(((totalBooked / totalExploited) * 100).toFixed(1)) : 0;

    return {
      campaignId,
      campaignName: campaign.name,
      startDate: campaign.startDate ? campaign.startDate.toISOString() : null,
      endDate: campaign.endDate ? campaign.endDate.toISOString() : null,
      totalMembers: items.length,
      items,
      summary: {
        totalExploited,
        totalPickup,
        totalBooked,
        avgConversionRate,
      },
    };
  }

  /**
   * Claim / Lock customer in Shared Pool for a specific staff member.
   */
  static async claimCustomer(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    staffId: number
  ): Promise<{ success: boolean; message: string; customer: any }> {
    await this.maintainSharedPool(fastify, campaignId);

    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error('Chiến dịch không tồn tại.');

    let config: SharedPoolConfig = { ...DEFAULT_SHARED_POOL_CONFIG };
    if (campaign.sharedPoolConfig) {
      try {
        const parsed =
          typeof campaign.sharedPoolConfig === 'string'
            ? JSON.parse(campaign.sharedPoolConfig)
            : campaign.sharedPoolConfig;
        config = { ...config, ...parsed };
      } catch {}
    }

    if (config.isPaused) {
      throw new Error('Shared Pool đang tạm dừng khai thác bởi Quản lý.');
    }

    // Verify staff membership
    let allowedStaffIds: number[] = [];
    try {
      if (campaign.assignedStaffIds) {
        allowedStaffIds = JSON.parse(campaign.assignedStaffIds);
      }
    } catch {}

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { id: true, displayName: true, username: true, role: true },
    });
    if (!staff) throw new Error('Nhân viên không tồn tại.');

    const isAdmin = staff.role === 'admin' || staff.role === 'manager';
    if (
      !isAdmin &&
      Array.isArray(allowedStaffIds) &&
      allowedStaffIds.length > 0 &&
      !allowedStaffIds.includes(staffId)
    ) {
      throw new Error('Bạn không có quyền khai thác chiến dịch này.');
    }

    // Max claims enforcement
    const maxClaims = config.maxClaimsPerStaff || 1;
    const now = new Date();
    const currentClaimsCount = await fastify.prisma.crm.crmCampaignCustomer.count({
      where: {
        campaignId,
        claimedByStaffId: staffId,
        poolStatus: 'CLAIMED',
        claimExpiresAt: { gt: now },
        removedAt: null,
      },
    });

    if (currentClaimsCount >= maxClaims) {
      throw new Error(
        `Bạn đang giữ ${currentClaimsCount} khách chưa xử lý xong (giới hạn ${maxClaims} khách). Vui lòng xử lý hoặc nhả khách trước khi nhận thêm!`
      );
    }

    // Fetch customer
    const customer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ id: customerId }, { legacyUserId: customerId }],
        removedAt: null,
      },
    });
    if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch này.');

    const ttlMs = (config.claimTtlMinutes || 15) * 60 * 1000;
    const claimExpiresAt = new Date(now.getTime() + ttlMs);
    const staffDisplayName = staff.displayName || staff.username;

    const targetBatchNumber =
      campaign && campaign.operationMode === 'SHARED_POOL' && campaign.currentBatchNumber
        ? campaign.currentBatchNumber
        : customer.batchNumber;

    // If customer has completed RECYCLE period but wasn't transitioned yet (or race condition),
    // automatically reset all old claim/lock fields and return customer to AVAILABLE in active batch.
    if (
      (customer.poolStatus === 'RECYCLING' || customer.poolStatus === 'RECYCLE') &&
      (!customer.availableAt || customer.availableAt <= now)
    ) {
      await fastify.prisma.crm.crmCampaignCustomer.update({
        where: { id: customer.id },
        data: {
          poolStatus: 'AVAILABLE',
          availableAt: null,
          claimedByStaffId: null,
          claimedByStaffName: null,
          claimedAt: null,
          claimExpiresAt: null,
          cooldownUntil: null,
          batchNumber: targetBatchNumber,
        },
      });
      customer.poolStatus = 'AVAILABLE';
      customer.cooldownUntil = null;
      customer.availableAt = null;
      customer.batchNumber = targetBatchNumber;
    }

    // Atomic conditional update ensuring only 1 staff can claim an AVAILABLE customer
    const updateResult = await fastify.prisma.crm.crmCampaignCustomer.updateMany({
      where: {
        id: customer.id,
        campaignId,
        removedAt: null,
        poolStatus: 'AVAILABLE',
        OR: [{ cooldownUntil: null }, { cooldownUntil: { lte: now } }],
      },
      data: {
        poolStatus: 'CLAIMED',
        claimedByStaffId: staffId,
        claimedByStaffName: staffDisplayName,
        claimedAt: now,
        claimExpiresAt,
        batchNumber: targetBatchNumber,
      },
    });

    if (updateResult.count === 0) {
      const fresh = await fastify.prisma.crm.crmCampaignCustomer.findUnique({
        where: { id: customer.id },
        select: {
          id: true,
          poolStatus: true,
          claimedByStaffId: true,
          claimedByStaffName: true,
          claimExpiresAt: true,
          cooldownUntil: true,
          availableAt: true,
        },
      });
      if (!fresh) throw new Error('Khách hàng không tồn tại trong chiến dịch này.');
      if (fresh.poolStatus === 'CLAIMED') {
        if (fresh.claimedByStaffId === staffId && fresh.claimExpiresAt && fresh.claimExpiresAt > now) {
          return {
            success: true,
            message: `Bạn đang giữ khách hàng này. Bạn có thêm ${Math.round((fresh.claimExpiresAt.getTime() - now.getTime()) / 60000)} phút để xử lý.`,
            customer: {
              ...fresh,
              claimRemainingSeconds: Math.round((fresh.claimExpiresAt.getTime() - now.getTime()) / 1000),
            },
          };
        }
        throw new Error(`Khách hàng đang được xử lý bởi ${fresh.claimedByStaffName || 'nhân viên khác'}.`);
      }
      if (fresh.poolStatus === 'RECYCLING' || fresh.poolStatus === 'RECYCLE') {
        if (!fresh.availableAt || fresh.availableAt <= now) {
          // Recycle wait period has ended: self-heal and atomically claim
          const healResult = await fastify.prisma.crm.crmCampaignCustomer.updateMany({
            where: {
              id: customer.id,
              campaignId,
              removedAt: null,
              poolStatus: { in: ['RECYCLING', 'RECYCLE'] },
              OR: [{ availableAt: null }, { availableAt: { lte: now } }],
            },
            data: {
              poolStatus: 'CLAIMED',
              claimedByStaffId: staffId,
              claimedByStaffName: staffDisplayName,
              claimedAt: now,
              claimExpiresAt,
              availableAt: null,
              cooldownUntil: null,
              batchNumber: targetBatchNumber,
            },
          });
          if (healResult.count === 0) {
            throw new Error('Khách hàng vừa được nhận hoặc thay đổi trạng thái bởi nhân viên khác.');
          }
        } else {
          throw new Error('Khách hàng đang trong thời gian chờ tái sinh, chưa thể nhận lại.');
        }
      } else if (fresh.poolStatus === 'EXCLUDED') {
        throw new Error('Khách hàng đã bị loại khỏi Shared Pool (Chờ kiểm tra) và không được phép nhận lại.');
      } else if (fresh.poolStatus === 'BOOKED') {
        throw new Error('Khách hàng đã chốt Booking và rời khỏi Shared Pool.');
      } else if (fresh.cooldownUntil && fresh.cooldownUntil > now) {
        const remainingMin = Math.ceil((fresh.cooldownUntil.getTime() - now.getTime()) / (60 * 1000));
        throw new Error(`Khách hàng đang trong thời gian Cooldown chống spam (còn ${remainingMin} phút).`);
      } else {
        throw new Error(`Khách hàng hiện không ở trạng thái sẵn sàng để nhận (Pool Status: ${fresh.poolStatus}).`);
      }
    }

    const updated = await fastify.prisma.crm.crmCampaignCustomer.findUnique({
      where: { id: customer.id },
    });

    await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
      data: {
        campaignId,
        campaignCustomerId: customer.id,
        legacyUserId: customer.legacyUserId,
        staffId,
        staffName: staffDisplayName,
        action: 'CLAIM',
        note: `Nhân viên ${staffDisplayName} nhận khách vào xử lý (hạn giữ: ${config.claimTtlMinutes || 15} phút).`,
        metadata: JSON.stringify({
          previousPoolStatus: customer.poolStatus,
          nextPoolStatus: 'CLAIMED',
          claimedAt: now.toISOString(),
          claimExpiresAt: claimExpiresAt.toISOString(),
          ttlMinutes: config.claimTtlMinutes || 15,
          result: 'SUCCESS',
        }),
        createdAt: now,
      },
    });

    SharedPoolBroadcaster.broadcast(campaignId, {
      type: 'CUSTOMER_CLAIMED',
      customerId: customer.id,
      legacyUserId: customer.legacyUserId,
      claimedByStaffId: staffId,
      claimedByStaffName: staffDisplayName,
      claimExpiresAt: claimExpiresAt.toISOString(),
    });

    this.invalidateCampaignCache(fastify, campaignId);

    return {
      success: true,
      message: `Đã nhận thành công khách hàng. Bạn có ${config.claimTtlMinutes || 15} phút để xử lý.`,
      customer: {
        ...updated,
        claimRemainingSeconds: Math.round(ttlMs / 1000),
      },
    };
  }

  /**
   * Release Claim / Unlock customer back to Shared Pool.
   */
  static async releaseClaim(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    staffId: number,
    isManager: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    const customer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ id: customerId }, { legacyUserId: customerId }],
        removedAt: null,
      },
    });
    if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch.');

    if (customer.poolStatus !== 'CLAIMED') {
      return { success: true, message: 'Khách hàng không ở trạng thái bị giữ (Claimed).' };
    }

    if (!isManager && customer.claimedByStaffId !== staffId) {
      throw new Error('Bạn không có quyền nhả khách do người khác đang giữ.');
    }

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `NV #${staffId}`;
    const now = new Date();

    await fastify.prisma.crm.crmCampaignCustomer.update({
      where: { id: customer.id },
      data: {
        poolStatus: 'AVAILABLE',
        claimedByStaffId: null,
        claimedByStaffName: null,
        claimedAt: null,
        claimExpiresAt: null,
      },
    });

    await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
      data: {
        campaignId,
        campaignCustomerId: customer.id,
        legacyUserId: customer.legacyUserId,
        staffId,
        staffName: staffDisplayName,
        action: isManager ? 'RELEASE_MANAGER' : 'RELEASE_MANUAL',
        note: isManager
          ? `Quản lý giải phóng claim của ${customer.claimedByStaffName || 'nhân viên'}.`
          : 'Nhân viên chủ động nhả khách về Shared Pool.',
        metadata: JSON.stringify({
          previousPoolStatus: 'CLAIMED',
          nextPoolStatus: 'AVAILABLE',
          previousClaimedByStaffId: customer.claimedByStaffId,
          previousClaimedByStaffName: customer.claimedByStaffName,
          reason: isManager ? 'MANAGER_OVERRIDE' : 'STAFF_RELEASE',
          releasedAt: now.toISOString(),
          result: 'SUCCESS',
        }),
        createdAt: now,
      },
    });

    SharedPoolBroadcaster.broadcast(campaignId, {
      type: 'CUSTOMER_RELEASED',
      customerId: customer.id,
      legacyUserId: customer.legacyUserId,
      reason: isManager ? 'RELEASE_MANAGER' : 'RELEASE_MANUAL',
    });

    this.invalidateCampaignCache(fastify, campaignId);

    return {
      success: true,
      message: 'Đã giải phóng khách hàng về Shared Pool thành công.',
    };
  }

  /**
   * Helper to map standard mOS call log (callResult, outcome, duration) to Shared Pool status,
   * pickup classification, and recycling rules (Single Source of Truth - MOS-BUG-99).
   */
  static mapCallLogToSharedPool(
    callLog: {
      callResult?: string | null;
      outcome?: string | null;
      durationSec?: number | null;
      callbackDate?: Date | string | null;
      note?: string | null;
    },
    config?: SharedPoolConfig
  ): {
    mappedCallResult: string;
    isPickup: boolean;
    nextPoolStatus: CampaignPoolStatus;
    availableAt: Date | null;
    cooldownUntil: Date | null;
    isBooked: boolean;
    isExcluded: boolean;
  } {
    const rawResult = String(callLog.callResult || '')
      .toUpperCase()
      .trim();
    const rawOutcome = String(callLog.outcome || '')
      .toUpperCase()
      .trim();
    const durationSec = Number(callLog.durationSec) || 0;
    const now = new Date();

    let mappedCallResult = 'THINKING';
    if (
      rawOutcome === 'BOOKED' ||
      rawOutcome === 'RENEWED' ||
      rawOutcome.includes('ĐẶT LỊCH') ||
      rawOutcome.includes('ĐẶT CỌC') ||
      rawOutcome.includes('BOOKED') ||
      rawResult === 'BOOKED'
    ) {
      mappedCallResult = 'BOOKED';
    } else if (
      rawOutcome === 'CALL_BACK' ||
      rawOutcome === 'CALLBACK' ||
      rawOutcome.includes('HẸN GỌI LẠI') ||
      rawOutcome.includes('GỌI LẠI')
    ) {
      mappedCallResult = 'CALLBACK';
    } else if (
      rawOutcome === 'NO_NEED' ||
      rawOutcome.includes('KHÔNG CÓ NHU CẦU') ||
      rawOutcome.includes('KHÔNG NHU CẦU') ||
      rawResult === 'NO_NEED'
    ) {
      mappedCallResult = 'NO_NEED';
    } else if (
      rawOutcome === 'REFUSED' ||
      rawOutcome === 'REJECTED' ||
      rawOutcome.includes('TỪ CHỐI') ||
      rawOutcome.includes('KHÔNG GỌI') ||
      rawResult === 'REJECTED'
    ) {
      mappedCallResult = 'REJECTED';
    } else if (
      rawResult === 'WRONG_NUMBER' ||
      rawOutcome === 'WRONG_NUMBER' ||
      rawOutcome.includes('SAI SỐ') ||
      rawOutcome.includes('NHẦM SỐ')
    ) {
      mappedCallResult = 'WRONG_NUMBER';
    } else if (
      rawResult === 'NO_ANSWER' ||
      rawResult === 'MISSED' ||
      rawResult === 'UNANSWERED' ||
      rawOutcome.includes('GỌI NHỠ') ||
      rawOutcome.includes('KHÔNG TRẢ LỜI')
    ) {
      mappedCallResult = 'NO_ANSWER';
    } else if (rawResult === 'BUSY' || rawOutcome.includes('MÁY BẬN') || rawOutcome.includes('BẬN MÁY')) {
      mappedCallResult = 'BUSY';
    } else if (
      rawResult === 'FAILED' ||
      rawResult === 'ERROR' ||
      rawOutcome.includes('LỖI CUỘC GỌI') ||
      rawOutcome.includes('KHÔNG LIÊN LẠC') ||
      rawOutcome.includes('THUÊ BAO')
    ) {
      mappedCallResult = 'ERROR';
    } else if (
      rawResult === 'ANSWERED' ||
      durationSec > 0 ||
      rawOutcome === 'PENDING' ||
      rawOutcome.includes('SUY NGHĨ') ||
      rawOutcome.includes('CHƯA CHỐT')
    ) {
      mappedCallResult = 'THINKING';
    }

    const NON_PICKUP_RESULTS = new Set(['NO_ANSWER', 'BUSY', 'ERROR', 'FAILED', 'MISSED', 'UNANSWERED']);
    const PICKUP_CALL_RESULTS = new Set([
      'BOOKED',
      'THINKING',
      'CALLBACK',
      'NO_NEED',
      'REJECTED',
      'WRONG_NUMBER',
      'ANSWERED',
      'ANSWER',
      'CONNECTED',
    ]);
    const isPickup =
      !NON_PICKUP_RESULTS.has(rawResult) &&
      (PICKUP_CALL_RESULTS.has(mappedCallResult) || PICKUP_CALL_RESULTS.has(rawResult) || durationSec > 0);

    const isBooked = mappedCallResult === 'BOOKED';
    const isExcluded = ['NO_NEED', 'REJECTED', 'WRONG_NUMBER'].includes(mappedCallResult);

    let nextPoolStatus: CampaignPoolStatus = 'EXPLOITED';
    let availableAt: Date | null = null;
    let cooldownUntil: Date | null = null;

    if (isBooked) {
      nextPoolStatus = 'BOOKED';
      availableAt = null;
      cooldownUntil = new Date(now.getTime() + (config?.cooldownMinutes || 60) * 60 * 1000);
    } else if (isExcluded) {
      nextPoolStatus = 'EXCLUDED';
      availableAt = null;
      cooldownUntil = null;
    } else if (mappedCallResult === 'CALLBACK') {
      nextPoolStatus = 'RECYCLING';
      availableAt = callLog.callbackDate ? new Date(callLog.callbackDate) : new Date(now.getTime() + 24 * 3600 * 1000);
      cooldownUntil = new Date(now.getTime() + (config?.cooldownMinutes || 60) * 60 * 1000);
    } else if (['THINKING', 'NO_ANSWER', 'BUSY', 'ERROR'].includes(mappedCallResult)) {
      const defaultDays = mappedCallResult === 'THINKING' ? 7 : 3;
      const days = config?.recycleRules?.[mappedCallResult as keyof typeof config.recycleRules] ?? defaultDays;
      nextPoolStatus = 'RECYCLING';
      availableAt = new Date(now.getTime() + (Number(days) || defaultDays) * 24 * 3600 * 1000);
      cooldownUntil = new Date(now.getTime() + (config?.cooldownMinutes || 60) * 60 * 1000);
    } else {
      nextPoolStatus = 'EXPLOITED';
      cooldownUntil = new Date(now.getTime() + (config?.cooldownMinutes || 60) * 60 * 1000);
    }

    return {
      mappedCallResult,
      isPickup,
      nextPoolStatus,
      availableAt,
      cooldownUntil,
      isBooked,
      isExcluded,
    };
  }

  /**
   * Automatically synchronize Shared Pool claim when a standard mOS call log is recorded.
   * Matches the exact customer, staff, and active claim session (MOS-BUG-99).
   */
  static async syncCustomerClaimAfterCall(
    fastify: FastifyInstance,
    legacyUserId: number,
    staffId: number,
    callLog?: any
  ): Promise<{ syncedCount: number; results: Array<{ campaignId: number; customerId: number; poolStatus: string }> }> {
    let claimedCustomers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        legacyUserId,
        claimedByStaffId: staffId,
        poolStatus: 'CLAIMED',
        removedAt: null,
        campaign: {
          operationMode: 'SHARED_POOL',
          status: { in: ['ACTIVE', 'SCHEDULED'] },
        },
      },
      include: {
        campaign: {
          select: {
            id: true,
            sharedPoolConfig: true,
          },
        },
      },
    });

    if (!claimedCustomers || claimedCustomers.length === 0) {
      claimedCustomers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
        where: {
          legacyUserId,
          removedAt: null,
          campaign: {
            operationMode: 'SHARED_POOL',
            status: { in: ['ACTIVE', 'SCHEDULED'] },
          },
          OR: [{ claimedByStaffId: staffId }, { poolStatus: { in: ['CLAIMED', 'AVAILABLE', 'RECYCLING'] } }],
        },
        include: {
          campaign: {
            select: {
              id: true,
              sharedPoolConfig: true,
            },
          },
        },
      });
    }

    if (!claimedCustomers || claimedCustomers.length === 0) {
      return { syncedCount: 0, results: [] };
    }

    const resolvedCallLog =
      callLog ||
      (await fastify.prisma.crm.crmCallLog.findFirst({
        where: {
          legacyUserId,
          staffId,
        },
        orderBy: { createdAt: 'desc' },
      }));

    if (!resolvedCallLog) {
      return { syncedCount: 0, results: [] };
    }

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { id: true, displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `NV #${staffId}`;
    const now = new Date();

    const results: Array<{ campaignId: number; customerId: number; poolStatus: string }> = [];

    for (const customer of claimedCustomers) {
      let config: SharedPoolConfig = {
        ...DEFAULT_SHARED_POOL_CONFIG,
      };
      if (customer.campaign?.sharedPoolConfig) {
        try {
          const parsed =
            typeof customer.campaign.sharedPoolConfig === 'string'
              ? JSON.parse(customer.campaign.sharedPoolConfig)
              : customer.campaign.sharedPoolConfig;
          config = { ...config, ...parsed };
        } catch {}
      }

      const mapped = this.mapCallLogToSharedPool(resolvedCallLog, config);

      const bookedAt = mapped.isBooked ? resolvedCallLog.createdAt || now : customer.bookedAt;
      const bookedByStaffId = mapped.isBooked ? staffId : customer.bookedByStaffId;
      const bookedByStaffName = mapped.isBooked ? staffDisplayName : customer.bookedByStaffName;

      await fastify.prisma.crm.crmCampaignCustomer.update({
        where: { id: customer.id },
        data: {
          poolStatus: mapped.nextPoolStatus,
          claimedByStaffId: null,
          claimedByStaffName: null,
          claimedAt: null,
          claimExpiresAt: null,
          cooldownUntil: mapped.cooldownUntil,
          availableAt: mapped.availableAt,
          lastCallStaffId: staffId,
          lastCallStaffName: staffDisplayName,
          lastCallAt: resolvedCallLog.createdAt || now,
          lastCallResult: mapped.mappedCallResult,
          lastCallNote: resolvedCallLog.note || null,
          bookedByStaffId,
          bookedByStaffName,
          bookedAt,
          callCount: { increment: 1 },
        },
      });

      await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
        data: {
          campaignId: customer.campaignId,
          campaignCustomerId: customer.id,
          legacyUserId: customer.legacyUserId,
          staffId,
          staffName: staffDisplayName,
          action: mapped.isExcluded ? 'EXCLUDE' : mapped.isBooked ? 'BOOKING' : 'STATUS_UPDATE',
          note: mapped.isExcluded
            ? `Khách hàng bị loại khỏi Shared Pool (Chờ kiểm tra) từ cuộc gọi chuẩn mOS: ${mapped.mappedCallResult}. Ghi chú: ${resolvedCallLog.note || 'Không'}.`
            : mapped.isBooked
              ? `Khách hàng đã chốt Booking thành công từ cuộc gọi chuẩn mOS. Ghi chú: ${resolvedCallLog.note || 'Không'}.`
              : `Tự động cập nhật từ cuộc gọi chuẩn mOS: ${mapped.mappedCallResult} (${resolvedCallLog.durationSec || 0}s). Trạng thái pool: ${mapped.nextPoolStatus}. Ghi chú: ${resolvedCallLog.note || 'Không'}.`,
          metadata: JSON.stringify({
            callResult: mapped.mappedCallResult,
            rawCallResult: resolvedCallLog.callResult,
            outcome: resolvedCallLog.outcome,
            durationSec: resolvedCallLog.durationSec || 0,
            pickup: mapped.isPickup,
            callbackDate: resolvedCallLog.callbackDate,
            nextPoolStatus: mapped.nextPoolStatus,
            cooldownUntil: mapped.cooldownUntil ? mapped.cooldownUntil.toISOString() : null,
            availableAt: mapped.availableAt ? mapped.availableAt.toISOString() : null,
            callLogId: resolvedCallLog.id,
            source: 'STANDARD_MOS_CALL',
          }),
          createdAt: now,
        },
      });

      SharedPoolBroadcaster.broadcast(customer.campaignId, {
        type: 'CUSTOMER_STATUS_UPDATED',
        customerId: customer.id,
        legacyUserId: customer.legacyUserId,
        poolStatus: mapped.nextPoolStatus,
      });

      await this.maintainSharedPool(fastify, customer.campaignId);
      this.invalidateCampaignCache(fastify, customer.campaignId);

      results.push({
        campaignId: customer.campaignId,
        customerId: customer.id,
        poolStatus: mapped.nextPoolStatus,
      });
    }

    return {
      syncedCount: results.length,
      results,
    };
  }

  /**
   * Sync Shared Pool for a specific customer in a campaign from their latest standard call log (MOS-BUG-99).
   */
  static async syncSharedPoolFromLatestCall(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    staffId: number
  ): Promise<{ success: boolean; message: string; poolStatus: string }> {
    const customer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ id: customerId }, { legacyUserId: customerId }],
        removedAt: null,
      },
    });
    if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch.');

    if (customer.poolStatus === 'CLAIMED' && customer.claimedByStaffId && customer.claimedByStaffId !== staffId) {
      throw new Error(
        `Khách hàng đang được giữ bởi nhân viên khác (${customer.claimedByStaffName || customer.claimedByStaffId}).`
      );
    }

    const callLog = await fastify.prisma.crm.crmCallLog.findFirst({
      where: {
        legacyUserId: customer.legacyUserId,
        staffId,
        ...(customer.claimedAt ? { createdAt: { gte: new Date(customer.claimedAt.getTime() - 2 * 60 * 1000) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!callLog) {
      if (customer.poolStatus !== 'CLAIMED') {
        return {
          success: true,
          message: `Khách hàng hiện đang ở trạng thái "${customer.poolStatus}".`,
          poolStatus: customer.poolStatus,
        };
      }
      throw new Error(
        'Chưa tìm thấy nhật ký cuộc gọi chuẩn mOS của bạn cho khách hàng này. Vui lòng hoàn thành cuộc gọi trước.'
      );
    }

    const syncRes = await this.syncCustomerClaimAfterCall(fastify, customer.legacyUserId, staffId, callLog);
    const matching = syncRes.results.find((r) => r.customerId === customer.id || r.campaignId === campaignId);
    const nextStatus = matching?.poolStatus || customer.poolStatus || 'EXPLOITED';

    return {
      success: true,
      message: `Đã tự động cập nhật kết quả cuộc gọi chuẩn mOS. Trạng thái chuyển sang "${nextStatus}".`,
      poolStatus: nextStatus,
    };
  }

  /**
   * Record Call & Status in Shared Pool:
   * Sets Cooldown, applies Recycle Rules based on Call Result, and releases claim lock.
   */
  static async recordSharedPoolStatus(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    staffId: number,
    dto: UpdateSharedPoolStatusDto
  ): Promise<{ success: boolean; message: string; poolStatus: string }> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new Error('Chiến dịch không tồn tại.');

    let config: SharedPoolConfig = {
      ...DEFAULT_SHARED_POOL_CONFIG,
    };
    if (campaign.sharedPoolConfig) {
      try {
        const parsed =
          typeof campaign.sharedPoolConfig === 'string'
            ? JSON.parse(campaign.sharedPoolConfig)
            : campaign.sharedPoolConfig;
        config = {
          ...config,
          ...parsed,
          recycleRules: {
            ...config.recycleRules,
            ...(parsed?.recycleRules || {}),
          },
        };
      } catch {}
    }

    const customer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ id: customerId }, { legacyUserId: customerId }],
        removedAt: null,
      },
    });
    if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch.');

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { id: true, displayName: true, username: true, role: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `NV #${staffId}`;
    const now = new Date();

    // 1. Create call log in crm_call_logs
    await fastify.prisma.crm.crmCallLog.create({
      data: {
        legacyUserId: customer.legacyUserId,
        staffId,
        callType: 'OUTBOUND',
        callResult: dto.callResult,
        durationSec: dto.durationSec || 0,
        note: dto.note || null,
        callbackDate: dto.callbackDate ? new Date(dto.callbackDate) : null,
        createdAt: now,
      },
    });

    // 2. Map status using unified mapCallLogToSharedPool logic (MOS-BUG-101)
    const mapped = this.mapCallLogToSharedPool(
      {
        callResult: dto.callResult,
        outcome: dto.callResult,
        durationSec: dto.durationSec || 0,
        callbackDate: dto.callbackDate,
      },
      config
    );

    const isBooked = dto.isBooked || mapped.isBooked;
    const nextPoolStatus: CampaignPoolStatus = isBooked ? 'BOOKED' : mapped.nextPoolStatus;
    const isExcluded = nextPoolStatus === 'EXCLUDED';
    const cooldownUntil = isExcluded ? null : mapped.cooldownUntil;
    const availableAt = isExcluded ? null : isBooked ? null : mapped.availableAt;
    const bookedAt = isBooked ? now : customer.bookedAt;
    const bookedByStaffId = isBooked ? staffId : customer.bookedByStaffId;
    const bookedByStaffName = isBooked ? staffDisplayName : customer.bookedByStaffName;

    await fastify.prisma.crm.crmCampaignCustomer.update({
      where: { id: customer.id },
      data: {
        poolStatus: nextPoolStatus,
        claimedByStaffId: null,
        claimedByStaffName: null,
        claimedAt: null,
        claimExpiresAt: null,
        cooldownUntil,
        availableAt,
        lastCallStaffId: staffId,
        lastCallStaffName: staffDisplayName,
        lastCallAt: now,
        lastCallResult: dto.callResult,
        lastCallNote: dto.note || null,
        bookedByStaffId,
        bookedByStaffName,
        bookedAt,
        callCount: { increment: 1 },
      },
    });

    await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
      data: {
        campaignId,
        campaignCustomerId: customer.id,
        legacyUserId: customer.legacyUserId,
        staffId,
        staffName: staffDisplayName,
        action: isExcluded ? 'EXCLUDE' : 'STATUS_UPDATE',
        note: isExcluded
          ? `Khách hàng bị loại khỏi Shared Pool (Chờ kiểm tra): ${dto.callResult}. Ghi chú: ${dto.note || 'Không'}.`
          : `Cập nhật trạng thái: ${dto.callResult}. Ghi chú: ${dto.note || 'Không'}. Trạng thái pool: ${nextPoolStatus}.`,
        metadata: JSON.stringify({
          callResult: dto.callResult,
          durationSec: dto.durationSec,
          callbackDate: dto.callbackDate,
          nextPoolStatus,
          cooldownUntil: isExcluded ? null : cooldownUntil ? cooldownUntil.toISOString() : null,
          availableAt: availableAt ? availableAt.toISOString() : null,
        }),
        createdAt: now,
      },
    });

    SharedPoolBroadcaster.broadcast(campaignId, {
      type: 'CUSTOMER_STATUS_UPDATED',
      customerId: customer.id,
      legacyUserId: customer.legacyUserId,
      poolStatus: nextPoolStatus,
    });

    // Check if active batch has completed and auto-advance
    await this.maintainSharedPool(fastify, campaignId);
    this.invalidateCampaignCache(fastify, campaignId);

    return {
      success: true,
      message: `Đã ghi nhận kết quả thành công. Khách hàng chuyển sang trạng thái "${nextPoolStatus}".`,
      poolStatus: nextPoolStatus,
    };
  }

  /**
   * Advance Shared Pool to target or next batch manually.
   */
  static async advanceBatch(
    fastify: FastifyInstance,
    campaignId: number,
    staffId: number,
    targetBatchNumber?: number
  ): Promise<{ success: boolean; message: string; currentBatchNumber: number }> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
      select: { currentBatchNumber: true },
    });
    if (!campaign) throw new Error('Chiến dịch không tồn tại.');

    const nextBatch = targetBatchNumber || campaign.currentBatchNumber + 1;

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `NV #${staffId}`;
    const now = new Date();

    await fastify.prisma.crm.crmCustomCampaign.update({
      where: { id: campaignId },
      data: { currentBatchNumber: nextBatch },
    });

    await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
      data: {
        campaignId,
        campaignCustomerId: null,
        legacyUserId: null,
        staffId,
        staffName: staffDisplayName,
        action: 'MANUAL_ADVANCE_BATCH',
        note: `Quản lý chuyển mở Batch ${nextBatch}.`,
        metadata: JSON.stringify({
          previousBatchNumber: campaign.currentBatchNumber,
          nextBatchNumber: nextBatch,
          result: 'SUCCESS',
        }),
        createdAt: now,
      },
    });

    SharedPoolBroadcaster.broadcast(campaignId, {
      type: 'BATCH_ADVANCED',
      currentBatchNumber: nextBatch,
    });

    this.invalidateCampaignCache(fastify, campaignId);

    return {
      success: true,
      message: `Đã chuyển sang Batch ${nextBatch} thành công.`,
      currentBatchNumber: nextBatch,
    };
  }

  /**
   * Pause / Resume Shared Pool exploitation.
   */
  static async togglePause(
    fastify: FastifyInstance,
    campaignId: number,
    staffId: number,
    isPaused: boolean
  ): Promise<{ success: boolean; message: string; isPaused: boolean }> {
    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
      select: { sharedPoolConfig: true },
    });
    if (!campaign) throw new Error('Chiến dịch không tồn tại.');

    let config: SharedPoolConfig = {
      batchSize: 100,
      claimTtlMinutes: 15,
      maxClaimsPerStaff: 1,
      cooldownMinutes: 60,
      warningThreshold: 30,
      criticalThreshold: 10,
      isPaused: false,
    };
    if (campaign.sharedPoolConfig) {
      try {
        const parsed =
          typeof campaign.sharedPoolConfig === 'string'
            ? JSON.parse(campaign.sharedPoolConfig)
            : campaign.sharedPoolConfig;
        config = { ...config, ...parsed };
      } catch {}
    }

    config.isPaused = isPaused;

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `NV #${staffId}`;
    const now = new Date();

    await fastify.prisma.crm.crmCustomCampaign.update({
      where: { id: campaignId },
      data: { sharedPoolConfig: JSON.stringify(config) },
    });

    await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
      data: {
        campaignId,
        campaignCustomerId: null,
        legacyUserId: null,
        staffId,
        staffName: staffDisplayName,
        action: isPaused ? 'PAUSE_POOL' : 'RESUME_POOL',
        note: isPaused ? 'Quản lý tạm dừng khai thác Shared Pool.' : 'Quản lý tiếp tục khai thác Shared Pool.',
        metadata: JSON.stringify({
          isPaused,
          result: 'SUCCESS',
        }),
        createdAt: now,
      },
    });

    SharedPoolBroadcaster.broadcast(campaignId, {
      type: isPaused ? 'POOL_PAUSED' : 'POOL_RESUMED',
    });

    this.invalidateCampaignCache(fastify, campaignId);

    return {
      success: true,
      message: isPaused ? 'Đã tạm dừng Shared Pool.' : 'Đã tiếp tục hoạt động Shared Pool.',
      isPaused,
    };
  }

  /**
   * Manager action on a customer: Release claim, return to pool, or exclude.
   */
  static async managerPoolAction(
    fastify: FastifyInstance,
    campaignId: number,
    customerId: number,
    staffId: number,
    action: 'RELEASE_CLAIM' | 'RETURN_TO_POOL' | 'EXCLUDE' | 'KEEP_EXCLUDED',
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    const customer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ id: customerId }, { legacyUserId: customerId }],
        removedAt: null,
      },
    });
    if (!customer) throw new Error('Khách hàng không tồn tại trong chiến dịch.');

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `Quản lý #${staffId}`;
    const now = new Date();

    if (action === 'RELEASE_CLAIM') {
      return this.releaseClaim(fastify, campaignId, customer.id, staffId, true);
    }

    if (action === 'RETURN_TO_POOL') {
      await fastify.prisma.crm.crmCampaignCustomer.update({
        where: { id: customer.id },
        data: {
          poolStatus: 'AVAILABLE',
          claimedByStaffId: null,
          claimedByStaffName: null,
          claimedAt: null,
          claimExpiresAt: null,
          cooldownUntil: null,
          availableAt: null,
        },
      });

      await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
        data: {
          campaignId,
          campaignCustomerId: customer.id,
          legacyUserId: customer.legacyUserId,
          staffId,
          staffName: staffDisplayName,
          action: 'RETURN_TO_POOL',
          note: `Quản lý đưa khách hàng trở lại Pool. Lý do: ${reason || 'Không có'}`,
          metadata: JSON.stringify({
            previousPoolStatus: customer.poolStatus,
            nextPoolStatus: 'AVAILABLE',
            reason: reason || null,
            result: 'SUCCESS',
          }),
          createdAt: now,
        },
      });

      SharedPoolBroadcaster.broadcast(campaignId, {
        type: 'CUSTOMER_RELEASED',
        customerId: customer.id,
        legacyUserId: customer.legacyUserId,
        reason: 'MANAGER_RETURN_TO_POOL',
      });

      return { success: true, message: 'Đã đưa khách hàng trở lại Pool sẵn sàng.' };
    }

    if (action === 'EXCLUDE') {
      await fastify.prisma.crm.crmCampaignCustomer.update({
        where: { id: customer.id },
        data: {
          poolStatus: 'EXCLUDED',
          claimedByStaffId: null,
          claimedByStaffName: null,
          claimedAt: null,
          claimExpiresAt: null,
          cooldownUntil: null,
          availableAt: null,
        },
      });

      await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
        data: {
          campaignId,
          campaignCustomerId: customer.id,
          legacyUserId: customer.legacyUserId,
          staffId,
          staffName: staffDisplayName,
          action: 'EXCLUDE',
          note: `Quản lý loại khách khỏi Pool. Lý do: ${reason || 'Không có'}`,
          metadata: JSON.stringify({
            previousPoolStatus: customer.poolStatus,
            nextPoolStatus: 'EXCLUDED',
            reason: reason || null,
            result: 'SUCCESS',
          }),
          createdAt: now,
        },
      });

      SharedPoolBroadcaster.broadcast(campaignId, {
        type: 'CUSTOMER_STATUS_UPDATED',
        customerId: customer.id,
        legacyUserId: customer.legacyUserId,
        poolStatus: 'EXCLUDED',
      });

      return { success: true, message: 'Đã loại khách hàng khỏi Shared Pool.' };
    }

    if (action === 'KEEP_EXCLUDED') {
      await fastify.prisma.crm.crmCampaignCustomer.update({
        where: { id: customer.id },
        data: {
          poolStatus: 'EXCLUDED',
          claimedByStaffId: null,
          claimedByStaffName: null,
          claimedAt: null,
          claimExpiresAt: null,
          cooldownUntil: null,
          availableAt: null,
        },
      });

      await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
        data: {
          campaignId,
          campaignCustomerId: customer.id,
          legacyUserId: customer.legacyUserId,
          staffId,
          staffName: staffDisplayName,
          action: 'CONFIRM_EXCLUDE',
          note: `Quản lý kiểm tra và xác nhận giữ trạng thái loại trừ. Lý do: ${reason || 'Đã kiểm tra'}`,
          metadata: JSON.stringify({
            previousPoolStatus: customer.poolStatus,
            nextPoolStatus: 'EXCLUDED',
            reason: reason || null,
            result: 'SUCCESS',
          }),
          createdAt: now,
        },
      });

      SharedPoolBroadcaster.broadcast(campaignId, {
        type: 'CUSTOMER_STATUS_UPDATED',
        customerId: customer.id,
        legacyUserId: customer.legacyUserId,
        poolStatus: 'EXCLUDED',
      });

      return { success: true, message: 'Đã xác nhận giữ trạng thái loại trừ cho khách hàng.' };
    }

    throw new Error('Hành động quản lý không hợp lệ.');
  }

  /**
   * Batch Manager Action on multiple customers (RETURN_TO_POOL, EXCLUDE, KEEP_EXCLUDED)
   */
  static async batchManagerPoolAction(
    fastify: FastifyInstance,
    campaignId: number,
    staffId: number,
    action: 'RETURN_TO_POOL' | 'EXCLUDE' | 'KEEP_EXCLUDED',
    customerIds: number[],
    reason?: string
  ): Promise<{ success: boolean; affectedCount: number; message: string }> {
    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      throw new Error('Danh sách ID khách hàng không được để trống.');
    }

    const customers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
      where: {
        campaignId,
        OR: [{ id: { in: customerIds } }, { legacyUserId: { in: customerIds } }],
        removedAt: null,
      },
    });

    if (customers.length === 0) {
      return { success: true, affectedCount: 0, message: 'Không tìm thấy khách hàng hợp lệ.' };
    }

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `Quản lý #${staffId}`;
    const now = new Date();

    const targetPoolStatus = action === 'RETURN_TO_POOL' ? 'AVAILABLE' : 'EXCLUDED';
    const targetActionLog =
      action === 'RETURN_TO_POOL' ? 'RETURN_TO_POOL' : action === 'KEEP_EXCLUDED' ? 'CONFIRM_EXCLUDE' : 'EXCLUDE';
    const actionLabel =
      action === 'RETURN_TO_POOL'
        ? 'đưa trở lại Pool'
        : action === 'KEEP_EXCLUDED'
          ? 'xác nhận giữ loại trừ'
          : 'loại khỏi Pool';

    const ids = customers.map((c) => c.id);

    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmCampaignCustomer.updateMany({
        where: { id: { in: ids } },
        data: {
          poolStatus: targetPoolStatus,
          claimedByStaffId: null,
          claimedByStaffName: null,
          claimedAt: null,
          claimExpiresAt: null,
          cooldownUntil: null,
          availableAt: null,
        },
      });

      await tx.crmCampaignSharedPoolLog.createMany({
        data: customers.map((c) => ({
          campaignId,
          campaignCustomerId: c.id,
          legacyUserId: c.legacyUserId,
          staffId,
          staffName: staffDisplayName,
          action: targetActionLog,
          note: `Quản lý ${actionLabel} hàng loạt (${customers.length} KH). Lý do: ${reason || 'Không có'}`,
          metadata: JSON.stringify({
            previousPoolStatus: c.poolStatus,
            nextPoolStatus: targetPoolStatus,
            batchAction: action,
            reason: reason || null,
            result: 'SUCCESS',
          }),
          createdAt: now,
        })),
      });
    });

    return {
      success: true,
      affectedCount: customers.length,
      message: `Đã ${actionLabel} thành công cho ${customers.length} khách hàng.`,
    };
  }

  /**
   * Get immutable audit and action logs for a customer in Shared Pool (chống tranh công).
   */
  static async getSharedPoolLogs(fastify: FastifyInstance, campaignId: number, customerId: number): Promise<any[]> {
    const logs = await fastify.prisma.crm.crmCampaignSharedPoolLog.findMany({
      where: {
        campaignId,
        OR: [{ campaignCustomerId: customerId }, { legacyUserId: customerId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return logs.map((l) => ({
      id: l.id,
      campaignId: l.campaignId,
      campaignCustomerId: l.campaignCustomerId,
      legacyUserId: l.legacyUserId,
      staffId: l.staffId,
      staffName: l.staffName,
      action: l.action,
      note: l.note,
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  /**
   * Get detailed real-time history and audit trail for Campaign Shared Pool
   */
  static async getCampaignSharedPoolHistory(
    fastify: FastifyInstance,
    campaignId: number,
    params: SharedPoolHistoryQueryParams = {}
  ): Promise<SharedPoolHistoryResponse> {
    const pageNum = Math.max(1, Math.floor(Number(params.page) || 1));
    const limitNum = Math.min(200, Math.max(1, Math.floor(Number(params.pageSize) || 20)));
    const skip = (pageNum - 1) * limitNum;

    const campaign = await fastify.prisma.crm.crmCustomCampaign.findUnique({
      where: { id: campaignId },
      select: { id: true, operationMode: true },
    });
    if (!campaign) {
      throw new Error(`Chiến dịch ID ${campaignId} không tồn tại.`);
    }

    const where: any = {
      campaignId,
    };

    // Filter by action group
    if (params.action && params.action !== 'ALL') {
      const act = params.action.toUpperCase();
      if (act === 'CLAIM') {
        where.action = 'CLAIM';
      } else if (act === 'RELEASE') {
        where.action = { in: ['RELEASE_MANUAL', 'RELEASE_MANAGER', 'RELEASE_EXPIRED'] };
      } else if (act === 'CALL' || act === 'STATUS_UPDATE') {
        where.action = { in: ['CALL', 'STATUS_UPDATE'] };
      } else if (act === 'RECYCLE') {
        where.action = { in: ['RECYCLE', 'RECYCLE_RETURN'] };
      } else if (act === 'EXCLUDE') {
        where.action = 'EXCLUDE';
      } else if (act === 'BOOKING') {
        where.action = { in: ['BOOK', 'BOOKING'] };
      } else if (act === 'MANAGER') {
        where.action = {
          in: [
            'RELEASE_MANAGER',
            'RETURN_TO_POOL',
            'EXCLUDE',
            'RECOVERY_OVERRIDE',
            'PAUSE_POOL',
            'RESUME_POOL',
            'MANUAL_ADVANCE_BATCH',
          ],
        };
      } else if (act === 'RECOVERY') {
        where.action = 'RECOVERY_OVERRIDE';
      } else {
        where.action = params.action;
      }
    }

    // Filter by specific customer
    if (params.customerId) {
      const cid = Number(params.customerId);
      if (!isNaN(cid) && cid > 0) {
        where.OR = [{ campaignCustomerId: cid }, { legacyUserId: cid }];
      }
    }

    // Filter by staff
    if (params.staffId) {
      const sid = Number(params.staffId);
      if (!isNaN(sid) && sid > 0) {
        where.staffId = sid;
      }
    }

    // Filter by date range
    if (params.dateFrom || params.dateTo) {
      const dateFilter: any = {};
      if (params.dateFrom) dateFilter.gte = new Date(params.dateFrom);
      if (params.dateTo) dateFilter.lte = new Date(params.dateTo);
      where.createdAt = dateFilter;
    }

    // Search query: matching customer name / phone or staff name
    if (params.search && params.search.trim()) {
      const q = params.search.trim();
      const numMatch = parseInt(q, 10);
      const isNum = !isNaN(numMatch) && String(numMatch) === q;

      const [matchedUserProfiles, matchedUserContacts] = await Promise.all([
        fastify.prisma.legacy.user_profile.findMany({
          where: {
            OR: [{ full_name: { contains: q } }, ...(isNum ? [{ user_id: numMatch }] : [])],
          },
          select: { user_id: true },
          take: 100,
        }),
        fastify.prisma.legacy.user_contact.findMany({
          where: {
            phone_number: { contains: q },
          },
          select: { user_id: true },
          take: 100,
        }),
      ]);

      const matchedUserIds = Array.from(
        new Set([
          ...matchedUserProfiles.map((p) => p.user_id),
          ...matchedUserContacts.map((c) => c.user_id),
          ...(isNum ? [numMatch] : []),
        ])
      );

      where.AND = [
        {
          OR: [
            ...(matchedUserIds.length > 0 ? [{ legacyUserId: { in: matchedUserIds } }] : []),
            { staffName: { contains: q } },
            { note: { contains: q } },
          ],
        },
      ];
    }

    const [total, rawLogs] = await Promise.all([
      fastify.prisma.crm.crmCampaignSharedPoolLog.count({ where }),
      fastify.prisma.crm.crmCampaignSharedPoolLog.findMany({
        where,
        orderBy: { id: 'desc' },
        skip,
        take: limitNum,
      }),
    ]);

    const legacyUserIds = Array.from(
      new Set(rawLogs.map((l) => l.legacyUserId).filter((id): id is number => typeof id === 'number' && id > 0))
    );
    const campaignCustomerIds = Array.from(
      new Set(rawLogs.map((l) => l.campaignCustomerId).filter((id): id is number => typeof id === 'number' && id > 0))
    );

    const [profiles, contacts, currentCustomers] = await Promise.all([
      legacyUserIds.length > 0
        ? fastify.prisma.legacy.user_profile.findMany({
            where: { user_id: { in: legacyUserIds } },
            select: { user_id: true, full_name: true },
          })
        : [],
      legacyUserIds.length > 0
        ? fastify.prisma.legacy.user_contact.findMany({
            where: { user_id: { in: legacyUserIds }, is_disabled: false },
            select: { user_id: true, phone_number: true },
          })
        : [],
      campaignCustomerIds.length > 0
        ? fastify.prisma.crm.crmCampaignCustomer.findMany({
            where: { id: { in: campaignCustomerIds }, campaignId },
            select: {
              id: true,
              legacyUserId: true,
              poolStatus: true,
              claimedByStaffId: true,
              claimedByStaffName: true,
              removedAt: true,
            },
          })
        : [],
    ]);

    const profileMap = new Map<number, string>();
    profiles.forEach((p) => profileMap.set(p.user_id, p.full_name || ''));

    const contactMap = new Map<number, string>();
    contacts.forEach((c) => {
      if (!contactMap.has(c.user_id)) {
        contactMap.set(c.user_id, c.phone_number || '');
      }
    });

    const currentCustomerMap = new Map<number, any>();
    currentCustomers.forEach((cc) => currentCustomerMap.set(cc.id, cc));

    const items: CampaignSharedPoolDetailedLog[] = rawLogs.map((l) => {
      let parsedMeta: any = null;
      if (l.metadata) {
        try {
          parsedMeta = JSON.parse(l.metadata);
        } catch {
          parsedMeta = { raw: l.metadata };
        }
      }

      let actionLabel = l.action;
      switch (l.action) {
        case 'CLAIM':
          actionLabel = 'Lock / Giữ Data';
          break;
        case 'RELEASE_MANUAL':
          actionLabel = 'Nhả Claim';
          break;
        case 'RELEASE_MANAGER':
          actionLabel = 'Quản lý nhả Claim';
          break;
        case 'RELEASE_EXPIRED':
          actionLabel = 'Hết hạn Lock (TTL)';
          break;
        case 'CALL':
        case 'STATUS_UPDATE':
          actionLabel = 'Báo cáo gọi / Trạng thái';
          break;
        case 'RECYCLE':
        case 'RECYCLE_RETURN':
          actionLabel = 'Chờ quay lại (Recycle)';
          break;
        case 'EXCLUDE':
          actionLabel = 'Đã loại khỏi Pool';
          break;
        case 'RETURN_TO_POOL':
          actionLabel = 'Về lại Pool';
          break;
        case 'BOOK':
        case 'BOOKING':
          actionLabel = 'Chốt Booking';
          break;
        case 'RECOVERY_OVERRIDE':
          actionLabel = 'Quản lý Khôi phục';
          break;
        case 'PAUSE_POOL':
          actionLabel = 'Tạm dừng Pool';
          break;
        case 'RESUME_POOL':
          actionLabel = 'Tiếp tục Pool';
          break;
        case 'MANUAL_ADVANCE_BATCH':
        case 'AUTO_ADVANCE_BATCH':
          actionLabel = 'Mở Batch mới';
          break;
      }

      let previousPoolStatus: string | null =
        parsedMeta?.previousPoolStatus || parsedMeta?.previousState?.poolStatus || null;
      let nextPoolStatus: string | null = parsedMeta?.nextPoolStatus || parsedMeta?.nextState?.poolStatus || null;

      if (!previousPoolStatus || !nextPoolStatus) {
        if (l.action === 'CLAIM') {
          previousPoolStatus = previousPoolStatus || 'AVAILABLE';
          nextPoolStatus = nextPoolStatus || 'CLAIMED';
        } else if (l.action === 'RELEASE_MANUAL' || l.action === 'RELEASE_MANAGER' || l.action === 'RELEASE_EXPIRED') {
          previousPoolStatus = previousPoolStatus || 'CLAIMED';
          nextPoolStatus = nextPoolStatus || 'AVAILABLE';
        } else if (l.action === 'RETURN_TO_POOL') {
          nextPoolStatus = nextPoolStatus || 'AVAILABLE';
        } else if (l.action === 'EXCLUDE') {
          nextPoolStatus = nextPoolStatus || 'EXCLUDED';
        } else if (l.action === 'STATUS_UPDATE' || l.action === 'CALL') {
          nextPoolStatus = nextPoolStatus || parsedMeta?.nextPoolStatus || null;
        }
      }

      const currentCust = l.campaignCustomerId ? currentCustomerMap.get(l.campaignCustomerId) : null;
      const currentPoolStatus = currentCust?.poolStatus || null;
      const isDrifted = Boolean(currentCust && nextPoolStatus && currentPoolStatus !== nextPoolStatus);

      const canRestore = Boolean(
        currentCust &&
        !currentCust.removedAt &&
        typeof l.campaignCustomerId === 'number' &&
        l.campaignCustomerId > 0 &&
        [
          'CLAIM',
          'RELEASE_MANUAL',
          'RELEASE_MANAGER',
          'RELEASE_EXPIRED',
          'STATUS_UPDATE',
          'CALL',
          'EXCLUDE',
          'RETURN_TO_POOL',
          'RECOVERY_OVERRIDE',
        ].includes(l.action)
      );

      let resultText: string | null = parsedMeta?.result || null;
      if (!resultText) {
        if (parsedMeta?.callResult) {
          resultText = `Kết quả gọi: ${parsedMeta.callResult}`;
        } else if (l.action === 'RECOVERY_OVERRIDE') {
          resultText = 'Đã khôi phục thành công';
        } else {
          resultText = 'Thành công';
        }
      }

      return {
        id: l.id,
        campaignId: l.campaignId,
        campaignCustomerId: l.campaignCustomerId,
        legacyUserId: l.legacyUserId,
        customerName: (l.legacyUserId && profileMap.get(l.legacyUserId)) || null,
        customerPhone: (l.legacyUserId && contactMap.get(l.legacyUserId)) || null,
        currentPoolStatus,
        currentClaimedByStaffId: currentCust?.claimedByStaffId || null,
        currentClaimedByStaffName: currentCust?.claimedByStaffName || null,
        staffId: l.staffId,
        staffName: l.staffName,
        action: l.action,
        actionLabel,
        previousPoolStatus,
        nextPoolStatus,
        previousClaimedByStaffName: parsedMeta?.previousClaimedByStaffName || null,
        nextClaimedByStaffName: parsedMeta?.nextClaimedByStaffName || null,
        note: l.note,
        metadata: parsedMeta,
        result: resultText,
        isDrifted,
        canRestore,
        createdAt: l.createdAt.toISOString(),
      };
    });

    return {
      items,
      total,
      page: pageNum,
      pageSize: limitNum,
      pages: Math.ceil(total / limitNum) || 0,
    };
  }

  /**
   * Safely recover/rollback customer state in Campaign Shared Pool (Manager / Admin).
   * Invariants:
   * 1. Never delete old history (Append-only).
   * 2. Append a new audit log for every recovery.
   * 3. Mandatory reason input.
   * 4. Record acting staff and timestamp.
   * 5. Verify current customer state.
   * 6. Warn if data drifted since the target log entry.
   */
  static async recoverCustomerState(
    fastify: FastifyInstance,
    campaignId: number,
    staffId: number,
    dto: SharedPoolRecoveryDto
  ): Promise<SharedPoolRecoveryResponse> {
    const trimmedReason = (dto.reason || '').trim();
    if (!trimmedReason) {
      throw new Error('Bắt buộc nhập lý do khi thực hiện khôi phục.');
    }

    const customer = await fastify.prisma.crm.crmCampaignCustomer.findFirst({
      where: {
        campaignId,
        OR: [{ id: dto.customerId }, { legacyUserId: dto.customerId }],
        removedAt: null,
      },
    });
    if (!customer) {
      throw new Error('Khách hàng không tồn tại trong chiến dịch.');
    }

    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: staffId },
      select: { displayName: true, username: true },
    });
    const staffDisplayName = staff?.displayName || staff?.username || `Quản lý #${staffId}`;
    const now = new Date();

    const previousState = {
      poolStatus: customer.poolStatus,
      claimedByStaffId: customer.claimedByStaffId,
      claimedByStaffName: customer.claimedByStaffName,
      claimedAt: customer.claimedAt,
      claimExpiresAt: customer.claimExpiresAt,
      cooldownUntil: customer.cooldownUntil,
      availableAt: customer.availableAt,
      lastCallResult: customer.lastCallResult,
    };

    let targetNextStatus = 'AVAILABLE';
    const nextClaimedByStaffId: number | null = null;
    const nextClaimedByStaffName: string | null = null;
    const nextClaimedAt: Date | null = null;
    const nextClaimExpiresAt: Date | null = null;
    let nextCooldownUntil: Date | null = null;
    let nextAvailableAt: Date | null = null;
    let actionDesc = '';

    if (dto.action === 'ROLLBACK_TO_LOG') {
      if (!dto.logId) {
        throw new Error('Thiếu ID bản ghi lịch sử cần khôi phục.');
      }
      const targetLog = await fastify.prisma.crm.crmCampaignSharedPoolLog.findUnique({
        where: { id: dto.logId },
      });
      if (!targetLog || targetLog.campaignId !== campaignId || targetLog.campaignCustomerId !== customer.id) {
        throw new Error('Bản ghi lịch sử không hợp lệ hoặc không thuộc về khách hàng này.');
      }

      const subsequentLogsCount = await fastify.prisma.crm.crmCampaignSharedPoolLog.count({
        where: {
          campaignCustomerId: customer.id,
          id: { gt: targetLog.id },
        },
      });

      let targetMeta: any = null;
      if (targetLog.metadata) {
        try {
          targetMeta = JSON.parse(targetLog.metadata);
        } catch {}
      }

      let intendedPrevStatus = targetMeta?.previousPoolStatus || targetMeta?.previousState?.poolStatus || null;

      if (!intendedPrevStatus) {
        if (targetLog.action === 'CLAIM') {
          intendedPrevStatus = 'AVAILABLE';
        } else if (targetLog.action === 'EXCLUDE') {
          intendedPrevStatus = 'AVAILABLE';
        } else if (targetLog.action === 'STATUS_UPDATE' || targetLog.action === 'CALL') {
          intendedPrevStatus = 'AVAILABLE';
        } else {
          intendedPrevStatus = 'AVAILABLE';
        }
      }

      const isDrifted =
        subsequentLogsCount > 0 ||
        customer.poolStatus !==
          (targetMeta?.nextPoolStatus || (targetLog.action === 'CLAIM' ? 'CLAIMED' : customer.poolStatus));

      if (isDrifted && !dto.forceOverride) {
        return {
          success: false,
          requiresConfirmation: true,
          driftDetected: true,
          message: `Dữ liệu khách hàng đã phát sinh thêm ${subsequentLogsCount} thao tác sau bản ghi này. Trạng thái hiện tại: "${customer.poolStatus}". Bạn có chắc chắn muốn ghi đè khôi phục về trạng thái trước (${intendedPrevStatus}) không?`,
          currentStatus: customer.poolStatus,
          targetPreviousStatus: intendedPrevStatus,
        };
      }

      targetNextStatus = intendedPrevStatus;
      actionDesc = `Hoàn tác về trạng thái trước bản ghi #${targetLog.id} (${targetLog.action})`;
    } else if (dto.action === 'RELEASE_CLAIM' || dto.action === 'FORCE_UNLOCK') {
      targetNextStatus = 'AVAILABLE';
      actionDesc = 'Cưỡng chế giải phóng Lock/Claim (Force Unlock)';
    } else if (dto.action === 'RESTORE_EXCLUDED') {
      targetNextStatus = 'AVAILABLE';
      actionDesc = 'Khôi phục khách hàng từ ĐÃ LOẠI (EXCLUDED) sang SẴN SÀNG (AVAILABLE)';
    } else if (dto.action === 'RESET_RECYCLE') {
      targetNextStatus = 'AVAILABLE';
      nextCooldownUntil = null;
      nextAvailableAt = null;
      actionDesc = 'Reset trạng thái Recycle, đưa ngay về Pool sẵn sàng';
    } else if (dto.action === 'RESET_POOL_STATUS') {
      targetNextStatus = dto.targetPoolStatus || 'AVAILABLE';
      actionDesc = `Reset trạng thái Pool sang "${targetNextStatus}"`;
    } else {
      throw new Error(`Hành động khôi phục không hợp lệ: ${dto.action}`);
    }

    const updatedCustomer = await fastify.prisma.crm.crmCampaignCustomer.update({
      where: { id: customer.id },
      data: {
        poolStatus: targetNextStatus,
        claimedByStaffId: nextClaimedByStaffId,
        claimedByStaffName: nextClaimedByStaffName,
        claimedAt: nextClaimedAt,
        claimExpiresAt: nextClaimExpiresAt,
        cooldownUntil: nextCooldownUntil,
        availableAt: nextAvailableAt,
      },
    });

    const nextState = {
      poolStatus: targetNextStatus,
      claimedByStaffId: nextClaimedByStaffId,
      claimedByStaffName: nextClaimedByStaffName,
      cooldownUntil: nextCooldownUntil,
      availableAt: nextAvailableAt,
    };

    await fastify.prisma.crm.crmCampaignSharedPoolLog.create({
      data: {
        campaignId,
        campaignCustomerId: customer.id,
        legacyUserId: customer.legacyUserId,
        staffId,
        staffName: staffDisplayName,
        action: 'RECOVERY_OVERRIDE',
        note: `[KHÔI PHỤC] ${actionDesc}. Lý do: ${trimmedReason}`,
        metadata: JSON.stringify({
          recoveryAction: dto.action,
          reason: trimmedReason,
          rolledBackFromLogId: dto.logId || null,
          targetPoolStatus: dto.targetPoolStatus || null,
          forceOverride: Boolean(dto.forceOverride),
          previousState,
          nextState,
          previousPoolStatus: customer.poolStatus,
          nextPoolStatus: targetNextStatus,
          result: 'SUCCESS',
        }),
        createdAt: now,
      },
    });

    return {
      success: true,
      message: `Đã khôi phục thành công khách hàng sang trạng thái "${targetNextStatus}".`,
      customer: updatedCustomer,
    };
  }

  /**
   * Background maintenance worker: periodically releases expired claims across all active shared pool campaigns.
   */
  static startMaintenanceWorker(fastify: FastifyInstance): void {
    const runMaintenance = async () => {
      try {
        const campaigns = await fastify.prisma.crm.crmCustomCampaign.findMany({
          where: { operationMode: 'SHARED_POOL', deletedAt: null, status: 'ACTIVE' },
          select: { id: true },
        });
        for (const camp of campaigns) {
          await this.maintainSharedPool(fastify, camp.id);
        }
      } catch (err: any) {
        fastify.log.warn({ err }, 'Shared pool background maintenance error');
      }
    };
    const initialTimer = setTimeout(runMaintenance, 5_000);
    initialTimer.unref();
    const intervalTimer = setInterval(runMaintenance, 10_000);
    intervalTimer.unref();
  }
}
