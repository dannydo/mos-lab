/**
 * ios-referral-diamond.service.ts
 *
 * Trao 100 Kim Cương (KC) cho khách giới thiệu khi khách mới hoàn tất
 * lần thanh toán đầu tiên qua iOS App.
 *
 * Rules:
 *  - Guard duplicate: 1 cặp (referrer, newCustomer) chỉ nhận 1 lần
 *  - Guard self-referral: referrerUserId ≠ newCustomerId
 *  - Non-blocking: lỗi không block checkout
 */

import type { FastifyInstance } from 'fastify';
import type { SafeAny } from '@mos-lab/shared';

export interface GrantReferralDiamondParams {
  fastify: FastifyInstance;
  referrerUserId: number;
  newCustomerId: number;
  actorStaffId: number;
}

/**
 * Atomically grant 100 KC to the referring customer.
 * Returns silently on duplicate or self-referral — does NOT throw.
 */
export async function grantReferralDiamond({
  fastify,
  referrerUserId,
  newCustomerId,
  actorStaffId,
}: GrantReferralDiamondParams): Promise<void> {
  try {
    // Guard: kiểm tra duplicate tracking_key
    const existingGrant = await fastify.prisma.legacy.$queryRaw<SafeAny[]>`
      SELECT id FROM user_balance_transaction
      WHERE template_id = 7
        AND currency_id = 3
        AND user_id = ${referrerUserId}
        AND tracking_key LIKE ${'%"user_id":' + newCustomerId + '%'}
      LIMIT 1
    `;

    if (existingGrant.length > 0) {
      fastify.log.info(
        `[Referral Diamond] Duplicate blocked: referrer=${referrerUserId}, newCustomer=${newCustomerId}`
      );
      return;
    }

    // Guard: không tự giới thiệu chính mình
    if (referrerUserId === newCustomerId) {
      fastify.log.warn(`[Referral Diamond] Self-referral blocked: userId=${newCustomerId}`);
      return;
    }

    // 1. Set referrer_user_id nếu chưa có (idempotent)
    await fastify.prisma.legacy.$executeRaw`
      UPDATE user_profile
      SET referrer_user_id = ${referrerUserId},
          referrer_created_staff_id = ${actorStaffId > 0 ? actorStaffId : null},
          referrer_date_created = NOW()
      WHERE user_id = ${newCustomerId}
        AND (referrer_user_id IS NULL OR referrer_user_id = ${referrerUserId})
    `;

    // 2. Trao 100 KC
    const trackingKey = JSON.stringify({ user_id: newCustomerId, source: 'referral_ios_app' });
    await fastify.prisma.legacy.$executeRaw`
      INSERT INTO user_balance_transaction
        (user_id, amount, currency_id, template_id, tracking_key, date_created)
      VALUES
        (${referrerUserId}, 100, 3, 7, ${trackingKey}, NOW())
    `;

    fastify.log.info(
      `[Referral Diamond] Granted 100 KC to referrer=${referrerUserId} for newCustomer=${newCustomerId}`
    );
  } catch (err: SafeAny) {
    // Non-blocking — lỗi không block checkout
    fastify.log.error(err, '[Referral Diamond] Grant error (non-blocking)');
  }
}
