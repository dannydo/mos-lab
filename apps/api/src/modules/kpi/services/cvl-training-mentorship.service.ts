import { FastifyInstance } from 'fastify';
import type mysql from 'mysql2/promise';
import {
  CvlTrainingMentorshipConfig,
  CvlTrainingMentorshipConfigResponse,
  CvlTrainingMentorshipPair,
  isDateRangeOverlapping,
} from '@mos-lab/shared';
import {
  clearMentorshipCaches,
  normalizeCvlTrainingMentorshipConfig,
  sanitizeCvlTrainingMentorshipPair,
} from './cvl-training-mentorship/cvl-training-mentorship.helpers.js';
import {
  buildCvTipStaffMatchSql,
  buildExcludeOtherMenteeTrainingOrderSql,
  buildExcludeTrainingCvlOrderSql,
  buildIsMenteeTrainingWindowSql,
  findMatchingTrainingPairForOrderImpl,
  queryTransferredCcTipsByMenteeImpl,
} from './cvl-training-mentorship/cvl-training-mentorship.sql.js';
import {
  getActivePairsFromCrmPoolImpl,
  getConfigWithStaffOptionsImpl,
  getMentorshipConfig,
  saveMentorshipConfig,
} from './cvl-training-mentorship/cvl-training-mentorship.config.js';
import {
  type LegacyTipSqlExecutor,
  createFastifyLegacyTipExecutor,
  createMysqlPoolTipExecutor,
  reconcileTrainingCvlStaffTipsImpl,
} from './cvl-training-mentorship/cvl-training-mentorship.reconcile.js';

export type { LegacyTipSqlExecutor };
export {
  buildCvTipStaffMatchSql,
  buildExcludeOtherMenteeTrainingOrderSql,
  buildExcludeTrainingCvlOrderSql,
  buildIsMenteeTrainingWindowSql,
  createFastifyLegacyTipExecutor,
  createMysqlPoolTipExecutor,
  normalizeCvlTrainingMentorshipConfig,
  sanitizeCvlTrainingMentorshipPair,
};

export class CvlTrainingMentorshipService {
  static clearCache(): void {
    clearMentorshipCaches();
  }

  static getConfig(fastify: FastifyInstance): Promise<CvlTrainingMentorshipConfig> {
    return getMentorshipConfig(fastify);
  }

  static saveConfig(
    fastify: FastifyInstance,
    payload: Partial<CvlTrainingMentorshipConfig>,
    updatedBy?: string
  ): Promise<CvlTrainingMentorshipConfig> {
    return saveMentorshipConfig(fastify, payload, updatedBy);
  }

  static getActivePairsFromCrmPool(crmPool: mysql.Pool, targetDate?: string): Promise<CvlTrainingMentorshipPair[]> {
    return getActivePairsFromCrmPoolImpl(crmPool, targetDate);
  }

  /**
   * Hợp nhất các dòng staff_tip phân mảnh (70%+20% hoặc 80%+10%) trên đơn của Mentee CVL trong kỳ Training
   * thành 1 dòng thống nhất 90% cho Mentee CVL (và 0đ cho Mentor/CC), bảo đảm App Wings lẫn mOS hiển thị
   * đồng nhất 90% từ đầu kỳ tới hiện tại (idempotent, có cooldown 60s khi quét diện rộng).
   */
  static reconcileTrainingCvlStaffTips(
    executor: LegacyTipSqlExecutor,
    pairs: CvlTrainingMentorshipPair[],
    options?: { orderIds?: number[]; force?: boolean }
  ): Promise<{ updatedOrders: number; consolidatedRows: number }> {
    return reconcileTrainingCvlStaffTipsImpl(executor, pairs, options);
  }

  /**
   * Non-blocking helper for Legacy checkout / post-checkout bridges: resolves active mentorship
   * pairs from CRM pool and consolidates the settled order's staff_tip rows to 90% if eligible.
   */
  static async reconcileOrderTipsFromPools(
    legacyPool: mysql.Pool,
    resolveCrmPool: () => mysql.Pool,
    orderId: number
  ): Promise<void> {
    if (!Number.isFinite(orderId) || orderId <= 0) return;
    try {
      const activePairs = await this.getActivePairsFromCrmPool(resolveCrmPool());
      await this.reconcileTrainingCvlStaffTips(createMysqlPoolTipExecutor(legacyPool), activePairs, {
        orderIds: [orderId],
        force: true,
      });
    } catch {
      // Non-blocking safeguard when CRM pool is unavailable in isolated environments
    }
  }

  static async getActivePairsForRange(
    fastify: FastifyInstance,
    dateFrom: string,
    dateTo: string
  ): Promise<CvlTrainingMentorshipPair[]> {
    const config = await this.getConfig(fastify);
    const s = dateFrom.slice(0, 10);
    const e = dateTo.slice(0, 10);
    return config.pairs.filter((p) => p.isActive && isDateRangeOverlapping(p.startDate, p.endDate, s, e));
  }

  static async getActivePairsForMentee(
    fastify: FastifyInstance,
    menteeLegacyStaffId: number,
    dateFrom: string,
    dateTo: string
  ): Promise<CvlTrainingMentorshipPair[]> {
    const pairs = await this.getActivePairsForRange(fastify, dateFrom, dateTo);
    return pairs.filter((p) => p.menteeLegacyStaffId === menteeLegacyStaffId);
  }

  static findMatchingTrainingPairForOrder(
    pairs: CvlTrainingMentorshipPair[],
    assignedStaffId: number | undefined | null,
    orderDate: string
  ): CvlTrainingMentorshipPair | null {
    return findMatchingTrainingPairForOrderImpl(pairs, assignedStaffId, orderDate);
  }

  /**
   * Tính phần Tip tư vấn/checkout (+10% / +20%) mà CC đứng tên bấm giùm trên đơn của Mentee CVL
   * trong kỳ Training để cộng hoàn trả vào consultDeltaTip của Mentee CVL (không ghi đè bảng staff_tip gốc).
   */
  static queryTransferredCcTipsByMentee(
    fastify: FastifyInstance,
    pairs: CvlTrainingMentorshipPair[],
    rangeStartDate: string,
    rangeEndDate: string
  ): Promise<Map<number, number>> {
    return queryTransferredCcTipsByMenteeImpl(fastify, pairs, rangeStartDate, rangeEndDate);
  }

  /**
   * Trả về danh sách ứng viên CC Mentor & CVL Mentee đang hoạt động để Admin chọn trong Modal cấu hình.
   */
  static getConfigWithStaffOptions(fastify: FastifyInstance): Promise<CvlTrainingMentorshipConfigResponse> {
    return getConfigWithStaffOptionsImpl(fastify, () => this.getConfig(fastify));
  }
}
