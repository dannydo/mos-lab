import type { FastifyInstance } from 'fastify';
import type { CampaignStaffPerformanceResponse, SharedPoolOverviewStats } from '@mos-lab/shared';

export const inFlightSharedPoolOverviewPromises = new Map<string, Promise<SharedPoolOverviewStats>>();
export const sharedPoolOverviewComputedAt = new Map<string, number>();
export const lastMaintainedAtMap = new Map<number, number>();
export const staffPerformanceCache = new Map<number, { data: CampaignStaffPerformanceResponse; computedAt: number }>();
export const inFlightStaffPerformancePromises = new Map<number, Promise<CampaignStaffPerformanceResponse>>();

let cacheInvalidator: ((fastify: FastifyInstance, campaignId?: number) => void) | undefined;

export function registerCacheInvalidator(fn: (fastify: FastifyInstance, campaignId?: number) => void): void {
  cacheInvalidator = fn;
}

export function invalidateCache(fastify: FastifyInstance, campaignId?: number): void {
  if (campaignId) {
    fastify.cache?.invalidatePattern(`^campaign:shared-pool:overview:${campaignId}:`);
    staffPerformanceCache.delete(campaignId);
    inFlightStaffPerformancePromises.delete(campaignId);
    for (const key of inFlightSharedPoolOverviewPromises.keys()) {
      if (key.startsWith(`campaign:shared-pool:overview:${campaignId}:`)) {
        inFlightSharedPoolOverviewPromises.delete(key);
      }
    }
    for (const key of sharedPoolOverviewComputedAt.keys()) {
      if (key.startsWith(`campaign:shared-pool:overview:${campaignId}:`)) {
        sharedPoolOverviewComputedAt.delete(key);
      }
    }
  } else {
    fastify.cache?.invalidatePattern(`^campaign:shared-pool:overview:`);
    staffPerformanceCache.clear();
    inFlightStaffPerformancePromises.clear();
    inFlightSharedPoolOverviewPromises.clear();
    sharedPoolOverviewComputedAt.clear();
  }
}

export function invalidateCampaignCache(fastify: FastifyInstance, campaignId?: number): void {
  invalidateCache(fastify, campaignId);
  if (cacheInvalidator) {
    cacheInvalidator(fastify, campaignId);
  }
}
