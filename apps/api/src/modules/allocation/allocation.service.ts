import { FastifyInstance } from 'fastify';
import {
  AllocationAuditQueryParams,
  AllocationAuditStatsResponse,
  AllocationHistoryQueryParams,
  BookerAllocationBatchSummary,
  CreateAllocationBatchDto,
  CustomerAllocationBatch,
  CustomerAllocationItem,
  DeclineAllocationBatchDto,
  RecallAllocationBatchDto,
} from '@mos-lab/shared';
import {
  acceptAllocationBatch,
  checkAndExpireBatches as runCheckAndExpireBatches,
  createAllocationBatch,
  declineAllocationBatch,
  recallAllocationBatch,
} from './service/allocation-batch-lifecycle.service.js';
import {
  ACCEPT_ACTION_TYPES,
  getHistoryAcceptWhereCondition,
  isAcceptActionType,
  mapAllocationBatchToDto,
} from './service/allocation-helpers.js';
import {
  get30DayHistory as fetch30DayHistory,
  getAuditStats as fetchAuditStats,
  getBatchDetails as fetchBatchDetails,
  getMyBatchesForBooker as fetchMyBatchesForBooker,
  getPendingBatchesForBooker as fetchPendingBatchesForBooker,
} from './service/allocation-queries.service.js';

export { ACCEPT_ACTION_TYPES, isAcceptActionType, getHistoryAcceptWhereCondition };

export class AllocationService {
  /**
   * Expire only unaccepted batches after their 24-hour verification window.
   * Accepted customer ownership is durable until an explicit manager recall.
   */
  static async checkAndExpireBatches(fastify: FastifyInstance): Promise<void> {
    return runCheckAndExpireBatches(fastify);
  }

  /**
   * Admin/Manager creates a new customer allocation batch targeting a Booker.
   * Batch is created in PENDING_ACCEPT status with 24h expiration countdown timer.
   */
  static async createBatch(
    fastify: FastifyInstance,
    assignerId: number,
    dto: CreateAllocationBatchDto
  ): Promise<CustomerAllocationBatch> {
    return createAllocationBatch(fastify, assignerId, dto, (f) => this.checkAndExpireBatches(f));
  }

  /**
   * Retrieves pending allocation batches for a specific Booker.
   */
  static async getPendingBatchesForBooker(
    fastify: FastifyInstance,
    bookerId: number
  ): Promise<CustomerAllocationBatch[]> {
    return fetchPendingBatchesForBooker(fastify, bookerId, (f) => this.checkAndExpireBatches(f));
  }

  /**
   * Retrieves all accepted or active allocation batches for a specific Booker,
   * enriched with real-time called count.
   */
  static async getMyBatchesForBooker(
    fastify: FastifyInstance,
    bookerId: number,
    userRole?: string
  ): Promise<BookerAllocationBatchSummary[]> {
    return fetchMyBatchesForBooker(fastify, bookerId, userRole, (f) => this.checkAndExpireBatches(f));
  }

  /**
   * Fetch single allocation batch details.
   */
  static async getBatchDetails(
    fastify: FastifyInstance,
    batchId: number,
    user?: { id: number; role: string }
  ): Promise<{ batch: CustomerAllocationBatch; items: CustomerAllocationItem[] }> {
    return fetchBatchDetails(fastify, batchId, user, (f) => this.checkAndExpireBatches(f));
  }

  /**
   * Booker accepts an allocation batch ("Chấp nhận toàn bộ").
   * Updates batch & items to ACCEPTED and creates durable assignments,
   * and atomically assigns exact +N customers to Booker via Prisma $transaction.
   */
  static async acceptBatch(
    fastify: FastifyInstance,
    batchId: number,
    bookerId: number
  ): Promise<{ success: boolean; message: string; count: number }> {
    return acceptAllocationBatch(fastify, batchId, bookerId);
  }

  /**
   * Booker declines an allocation batch ("Từ chối toàn bộ").
   * Requires mandatory decline reason category & optional note.
   * Customers remain unassigned / returned to pool.
   */
  static async declineBatch(
    fastify: FastifyInstance,
    batchId: number,
    bookerId: number,
    dto: DeclineAllocationBatchDto
  ): Promise<{ success: boolean; message: string }> {
    return declineAllocationBatch(fastify, batchId, bookerId, dto);
  }

  /**
   * Admin/Manager recalls an allocation batch ("Recall Batch").
   * Recalls PENDING_ACCEPT or ACCEPTED batches, revoking assignments back to pool.
   */
  static async recallBatch(
    fastify: FastifyInstance,
    batchId: number,
    adminId: number,
    dto: RecallAllocationBatchDto
  ): Promise<{ success: boolean; message: string; count: number }> {
    return recallAllocationBatch(fastify, batchId, adminId, dto);
  }

  /** Retrieves allocation history for Booker and Admin/Manager. */
  static async get30DayHistory(
    fastify: FastifyInstance,
    params: AllocationHistoryQueryParams,
    user: { id: number; role: string }
  ): Promise<{ items: CustomerAllocationBatch[]; total: number }> {
    return fetch30DayHistory(fastify, params, user, (f) => this.checkAndExpireBatches(f));
  }

  /**
   * Generates Allocation Audit Dashboard stats for Admin/Manager.
   */
  static async getAuditStats(
    fastify: FastifyInstance,
    params: AllocationAuditQueryParams
  ): Promise<AllocationAuditStatsResponse> {
    return fetchAuditStats(fastify, params, (f) => this.checkAndExpireBatches(f));
  }

  private static mapBatchToDto(batch: SafeAny): CustomerAllocationBatch {
    return mapAllocationBatchToDto(batch);
  }
}
