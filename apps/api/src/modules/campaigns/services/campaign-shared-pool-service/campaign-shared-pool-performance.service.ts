/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import type { FastifyInstance } from 'fastify';
import type { CampaignStaffPerformance, CampaignStaffPerformanceResponse } from '@mos-lab/shared';
import { inFlightStaffPerformancePromises, staffPerformanceCache } from './campaign-shared-pool-cache.js';
import { parseAssignedStaffIds } from './campaign-shared-pool-helpers.js';

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

/**
 * Get Campaign Staff Performance (Kết quả khai thác theo nhân viên trong Campaign Teamwork) - MOS-BUG-81.
 * Features Stale-While-Revalidate (SWR): Fresh < 60s from RAM, background revalidation.
 * Scoped strictly to this campaign and within campaign startDate/endDate window.
 */
export async function getCampaignStaffPerformance(
  fastify: FastifyInstance,
  campaignId: number
): Promise<CampaignStaffPerformanceResponse> {
  const cacheKey = campaignId;
  const now = Date.now();
  const cached = staffPerformanceCache.get(cacheKey);

  if (cached) {
    const age = now - cached.computedAt;
    if (age < 60_000) {
      return cached.data;
    }
    if (!inFlightStaffPerformancePromises.has(cacheKey)) {
      const revalidatePromise = computeCampaignStaffPerformance(fastify, campaignId)
        .then((res) => {
          staffPerformanceCache.set(cacheKey, { data: res, computedAt: Date.now() });
          return res;
        })
        .catch((err: unknown) => {
          const errMsg = err instanceof Error ? err.message : String(err);
          fastify.log?.warn?.(`[getCampaignStaffPerformance] Background revalidation failed: ${errMsg}`);
          return cached.data;
        })
        .finally(() => {
          inFlightStaffPerformancePromises.delete(cacheKey);
        });
      inFlightStaffPerformancePromises.set(cacheKey, revalidatePromise);
    }
    return cached.data;
  }

  const inFlight = inFlightStaffPerformancePromises.get(cacheKey);
  if (inFlight) {
    return await inFlight;
  }

  const computePromise = computeCampaignStaffPerformance(fastify, campaignId)
    .then((res) => {
      staffPerformanceCache.set(cacheKey, { data: res, computedAt: Date.now() });
      return res;
    })
    .finally(() => {
      inFlightStaffPerformancePromises.delete(cacheKey);
    });

  inFlightStaffPerformancePromises.set(cacheKey, computePromise);
  return await computePromise;
}

async function computeCampaignStaffPerformance(
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

  const assignedStaffIds = parseAssignedStaffIds(campaign.assignedStaffIds);

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
      } catch {
        // Ignore malformed metadata JSON
      }
      const callResult = String(meta.callResult || '').toUpperCase();
      const durationSec = Number(meta.durationSec) || 0;

      const isPickup = !NON_PICKUP_RESULTS.has(callResult) && (PICKUP_CALL_RESULTS.has(callResult) || durationSec > 0);

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
        (!startDate || (lastCallAt && lastCallAt >= startDate)) && (!endDate || (lastCallAt && lastCallAt <= endDate));
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
