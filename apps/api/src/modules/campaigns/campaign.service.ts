import { FastifyInstance } from 'fastify';
/* eslint-disable @typescript-eslint/no-explicit-any -- campaign payloads and legacy query rows have runtime-defined shapes. */
import {
  Campaign,
  CloneCampaignDto,
  CreateCampaignDto,
  ListCampaignsParams,
  ReopenCampaignDto,
  UpdateCampaignDto,
} from '@mos-lab/shared';
import { CampaignSharedPoolService } from './services/campaign-shared-pool.service.js';
import { CampaignCustomerService } from './services/campaign-customer.service.js';
import { CampaignPromotionStatsService } from './services/campaign-promotion-stats.service.js';
import type { CampaignReadOptions } from './campaign-service/campaign-helpers.js';
import { getCampaignById, getCampaignBySlug, listCampaigns } from './campaign-service/campaign-query.service.js';
import { createCampaign, updateCampaign } from './campaign-service/campaign-mutation.service.js';
import {
  archiveCampaign,
  checkAndUpdateCampaignStatuses,
  cloneCampaign,
  completeCampaign,
  deleteCampaign,
  endCampaign,
  pauseCampaign,
  reopenCampaign,
  restoreCampaign,
  resumeCampaign,
  unarchiveCampaign,
} from './campaign-service/campaign-lifecycle.service.js';

export { CampaignSharedPoolService } from './services/campaign-shared-pool.service.js';
export { CampaignCustomerService } from './services/campaign-customer.service.js';
export { CampaignPromotionStatsService } from './services/campaign-promotion-stats.service.js';
export type { CampaignReadOptions } from './campaign-service/campaign-helpers.js';

export class CampaignService {
  /**
   * Auto check and transition campaign statuses based on start/end dates.
   */
  static async checkAndUpdateCampaignStatuses(fastify: FastifyInstance, force = false): Promise<void> {
    return checkAndUpdateCampaignStatuses(fastify, force);
  }

  /**
   * List custom campaigns with stats summary.
   */
  static async listCampaigns(
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
    return listCampaigns(fastify, params, options);
  }

  /**
   * Get single campaign by ID.
   */
  static async getCampaignById(fastify: FastifyInstance, id: number, options: CampaignReadOptions = {}): Promise<any> {
    return getCampaignById(fastify, id, options);
  }

  /**
   * Get single campaign by Slug.
   */
  static async getCampaignBySlug(
    fastify: FastifyInstance,
    slug: string,
    options: CampaignReadOptions = {}
  ): Promise<any> {
    return getCampaignBySlug(fastify, slug, options);
  }

  /**
   * Create custom campaign.
   * If no touchpoints provided, creates default touchpoint pipeline ("Tất cả chạm", 24h, Dặm mi 17d, Dặm mi 25d).
   */
  static async createCampaign(fastify: FastifyInstance, dto: CreateCampaignDto, staffId: number): Promise<any> {
    return createCampaign(fastify, dto, staffId);
  }

  /**
   * Update campaign metadata, status, touchpoints, promotions.
   */
  static async updateCampaign(fastify: FastifyInstance, id: number, dto: UpdateCampaignDto): Promise<any> {
    return updateCampaign(fastify, id, dto);
  }

  /**
   * Soft deletion of custom campaign.
   * Preserves 100% of allocated customers, booker assignments, touchpoints, and call logs intact.
   * Marks customer global allocation status as unallocated for future new campaign filters.
   */
  static async deleteCampaign(fastify: FastifyInstance, id: number): Promise<{ success: boolean; message: string }> {
    return deleteCampaign(fastify, id);
  }

  /**
   * End campaign: mark status as 'COMPLETED'.
   * Preserves 100% of customer allocations and touchpoint logs so bookers can track conversion metrics.
   */
  static async endCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    return endCampaign(fastify, id);
  }

  /**
   * Pause campaign: mark status as 'PAUSED'. Booker UI disables actions.
   */
  static async pauseCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    return pauseCampaign(fastify, id);
  }

  /**
   * Resume campaign: mark status as 'ACTIVE'.
   */
  static async resumeCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    return resumeCampaign(fastify, id);
  }

  /**
   * Complete campaign alias for endCampaign.
   */
  static async completeCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    return completeCampaign(fastify, id);
  }

  /**
   * Archive campaign: mark status as 'ARCHIVED'.
   */
  static async archiveCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    return archiveCampaign(fastify, id);
  }

  /**
   * Unarchive campaign: mark status as 'COMPLETED'.
   */
  static async unarchiveCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    return unarchiveCampaign(fastify, id);
  }

  /**
   * Reopen campaign: set status to 'ACTIVE' and update end date.
   */
  static async reopenCampaign(fastify: FastifyInstance, id: number, dto?: ReopenCampaignDto): Promise<any> {
    return reopenCampaign(fastify, id, dto);
  }

  /**
   * Restore a deleted campaign: set status back to 'ACTIVE', clear deletedAt timestamp.
   */
  static async restoreCampaign(fastify: FastifyInstance, id: number): Promise<any> {
    return restoreCampaign(fastify, id);
  }

  /**
   * Clone campaign: duplicate touchpoints and promotions into a new DRAFT campaign.
   */
  static async cloneCampaign(
    fastify: FastifyInstance,
    id: number,
    dto: CloneCampaignDto = {},
    createdBy: number
  ): Promise<any> {
    return cloneCampaign(fastify, id, dto, createdBy);
  }

  // ═══════════════════════════════════════════════════════════════════
  // CACHE & FACADE DELEGATIONS
  // ═══════════════════════════════════════════════════════════════════

  static invalidateCampaignCache(fastify: FastifyInstance, campaignId?: number): void {
    CampaignPromotionStatsService.invalidateCache(fastify, campaignId);
    CampaignSharedPoolService.invalidateCache(fastify, campaignId);
  }

  // --- Campaign Customer Delegations ---

  static async getCampaignCustomers(...args: Parameters<typeof CampaignCustomerService.getCampaignCustomers>) {
    return CampaignCustomerService.getCampaignCustomers(...args);
  }

  static async addCustomersToCampaign(...args: Parameters<typeof CampaignCustomerService.addCustomersToCampaign>) {
    return CampaignCustomerService.addCustomersToCampaign(...args);
  }

  static async transferCustomersToCampaign(
    ...args: Parameters<typeof CampaignCustomerService.transferCustomersToCampaign>
  ) {
    return CampaignCustomerService.transferCustomersToCampaign(...args);
  }

  static async removeCustomerFromCampaign(
    ...args: Parameters<typeof CampaignCustomerService.removeCustomerFromCampaign>
  ) {
    return CampaignCustomerService.removeCustomerFromCampaign(...args);
  }

  static async removeCustomersFromCampaignBatch(
    ...args: Parameters<typeof CampaignCustomerService.removeCustomersFromCampaignBatch>
  ) {
    return CampaignCustomerService.removeCustomersFromCampaignBatch(...args);
  }

  static async toggleTouchpointLog(...args: Parameters<typeof CampaignCustomerService.toggleTouchpointLog>) {
    return CampaignCustomerService.toggleTouchpointLog(...args);
  }

  // --- Campaign Promotion & Stats Delegations ---

  static async getCampaignPromotions(...args: Parameters<typeof CampaignPromotionStatsService.getCampaignPromotions>) {
    return CampaignPromotionStatsService.getCampaignPromotions(...args);
  }

  static async createPromotion(...args: Parameters<typeof CampaignPromotionStatsService.createPromotion>) {
    return CampaignPromotionStatsService.createPromotion(...args);
  }

  static async deletePromotion(...args: Parameters<typeof CampaignPromotionStatsService.deletePromotion>) {
    return CampaignPromotionStatsService.deletePromotion(...args);
  }

  static async getCampaignStats(...args: Parameters<typeof CampaignPromotionStatsService.getCampaignStats>) {
    return CampaignPromotionStatsService.getCampaignStats(...args);
  }

  static async getCustomerActivePromotions(
    ...args: Parameters<typeof CampaignPromotionStatsService.getCustomerActivePromotions>
  ) {
    return CampaignPromotionStatsService.getCustomerActivePromotions(...args);
  }

  // --- Campaign Shared Pool Delegations ---

  static async maintainSharedPool(...args: Parameters<typeof CampaignSharedPoolService.maintainSharedPool>) {
    return CampaignSharedPoolService.maintainSharedPool(...args);
  }

  static maintainSharedPoolThrottled(
    ...args: Parameters<typeof CampaignSharedPoolService.maintainSharedPoolThrottled>
  ) {
    return CampaignSharedPoolService.maintainSharedPoolThrottled(...args);
  }

  static async getSharedPoolOverview(...args: Parameters<typeof CampaignSharedPoolService.getSharedPoolOverview>) {
    return CampaignSharedPoolService.getSharedPoolOverview(...args);
  }

  static async getCampaignStaffPerformance(
    ...args: Parameters<typeof CampaignSharedPoolService.getCampaignStaffPerformance>
  ) {
    return CampaignSharedPoolService.getCampaignStaffPerformance(...args);
  }

  static async claimCustomer(...args: Parameters<typeof CampaignSharedPoolService.claimCustomer>) {
    return CampaignSharedPoolService.claimCustomer(...args);
  }

  static async releaseClaim(...args: Parameters<typeof CampaignSharedPoolService.releaseClaim>) {
    return CampaignSharedPoolService.releaseClaim(...args);
  }

  static mapCallLogToSharedPool(...args: Parameters<typeof CampaignSharedPoolService.mapCallLogToSharedPool>) {
    return CampaignSharedPoolService.mapCallLogToSharedPool(...args);
  }

  static async syncCustomerClaimAfterCall(
    ...args: Parameters<typeof CampaignSharedPoolService.syncCustomerClaimAfterCall>
  ) {
    return CampaignSharedPoolService.syncCustomerClaimAfterCall(...args);
  }

  static async syncSharedPoolFromLatestCall(
    ...args: Parameters<typeof CampaignSharedPoolService.syncSharedPoolFromLatestCall>
  ) {
    return CampaignSharedPoolService.syncSharedPoolFromLatestCall(...args);
  }

  static async recordSharedPoolStatus(...args: Parameters<typeof CampaignSharedPoolService.recordSharedPoolStatus>) {
    return CampaignSharedPoolService.recordSharedPoolStatus(...args);
  }

  static async advanceBatch(...args: Parameters<typeof CampaignSharedPoolService.advanceBatch>) {
    return CampaignSharedPoolService.advanceBatch(...args);
  }

  static async togglePause(...args: Parameters<typeof CampaignSharedPoolService.togglePause>) {
    return CampaignSharedPoolService.togglePause(...args);
  }

  static async managerPoolAction(...args: Parameters<typeof CampaignSharedPoolService.managerPoolAction>) {
    return CampaignSharedPoolService.managerPoolAction(...args);
  }

  static async batchManagerPoolAction(...args: Parameters<typeof CampaignSharedPoolService.batchManagerPoolAction>) {
    return CampaignSharedPoolService.batchManagerPoolAction(...args);
  }

  static async getSharedPoolLogs(...args: Parameters<typeof CampaignSharedPoolService.getSharedPoolLogs>) {
    return CampaignSharedPoolService.getSharedPoolLogs(...args);
  }

  static async getCampaignSharedPoolHistory(
    ...args: Parameters<typeof CampaignSharedPoolService.getCampaignSharedPoolHistory>
  ) {
    return CampaignSharedPoolService.getCampaignSharedPoolHistory(...args);
  }

  static async recoverCustomerState(...args: Parameters<typeof CampaignSharedPoolService.recoverCustomerState>) {
    return CampaignSharedPoolService.recoverCustomerState(...args);
  }

  static startMaintenanceWorker(...args: Parameters<typeof CampaignSharedPoolService.startMaintenanceWorker>) {
    return CampaignSharedPoolService.startMaintenanceWorker(...args);
  }
}

// Inter-service hooks
CampaignSharedPoolService.registerCacheInvalidator((fastify, campaignId) => {
  CampaignPromotionStatsService.invalidateCache(fastify, campaignId);
});

CampaignPromotionStatsService.registerStatusChecker((fastify) => {
  return CampaignService.checkAndUpdateCampaignStatuses(fastify);
});
