import { FastifyInstance } from 'fastify';

/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma raw-query boundaries expose legacy rows with dynamic column sets. */
type SafeAny = any;

function stripEmojis(text: string): string {
  if (!text) return '';
  return text
    .replace(/\p{Extended_Pictographic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class CampaignPromotionSyncService {
  private static async upsertPromotionLanguage(
    fastify: FastifyInstance,
    legacyId: number,
    rawPromoName: string,
    rawShortName: string
  ): Promise<void> {
    const promoName = stripEmojis(rawPromoName) || rawPromoName;
    const shortName = stripEmojis(rawShortName) || rawShortName;

    for (const langId of [1, 2]) {
      const existing = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT id FROM promotion_language WHERE promotion_id = ? AND language_id = ? LIMIT 1`,
        legacyId,
        langId
      );
      if (existing.length > 0) {
        await fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE promotion_language SET promotion_name = ?, promotion_short_name = ? WHERE promotion_id = ? AND language_id = ?`,
          promoName,
          shortName,
          legacyId,
          langId
        );
      } else {
        await fastify.prisma.legacy.$executeRawUnsafe(
          `INSERT INTO promotion_language (
            language_id, promotion_id, promotion_name, promotion_short_name, promotion_description, promotion_condition, promotion_qrcode
          ) VALUES (
            ?, ?, ?, ?, NULL, NULL, NULL
          )`,
          langId,
          legacyId,
          promoName,
          shortName
        );
      }
    }
  }

  /**
   * Sync a CRM campaign promotion (crmCampaignPromotion) to legacy MySQL `promotion` and `promotion_language` tables.
   */
  static async syncPromotionToLegacy(fastify: FastifyInstance, crmPromoId: number): Promise<number | null> {
    try {
      const crmPromo = await fastify.prisma.crm.crmCampaignPromotion.findUnique({
        where: { id: crmPromoId },
        include: { campaign: true },
      });

      if (!crmPromo || !crmPromo.campaign) {
        return null;
      }

      const campaign = crmPromo.campaign;
      const isCampaignActive = campaign.status === 'ACTIVE' && !campaign.deletedAt;
      const isDisabled = !crmPromo.isActive || !isCampaignActive ? 1 : 0;

      const promoKey = `CAMP_${campaign.id}_P${crmPromo.id}`;
      const promoName = (crmPromo.name || '').trim();
      const shortName = `[CD] ${(campaign.name || '').trim()}`.slice(0, 255);

      let pct = 0;
      let amt = 0;
      if (crmPromo.type === 'PERCENT_DISCOUNT') {
        pct = Math.round(Number(crmPromo.value) || 0);
      } else if (crmPromo.type === 'FIXED_DISCOUNT') {
        amt = Math.round(Number(crmPromo.value) || 0);
      }

      const expiredDateStr = campaign.endDate
        ? new Date(campaign.endDate).toISOString().slice(0, 19).replace('T', ' ')
        : null;

      let legacyId: number | null = crmPromo.legacyPromotionId || null;

      if (legacyId) {
        // Update existing legacy promotion
        await fastify.prisma.legacy.$executeRawUnsafe(
          `UPDATE promotion 
           SET discount_percentage = ?,
               discount_amount = ?,
               is_disabled = ?,
               date_expired = ?,
               date_updated = NOW()
           WHERE id = ?`,
          pct,
          amt,
          isDisabled,
          expiredDateStr,
          legacyId
        );

        await this.upsertPromotionLanguage(fastify, legacyId, promoName, shortName);
      } else {
        // Check if legacy promotion with promo_key already exists
        const existingRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
          `SELECT id FROM promotion WHERE promotion_key = ? LIMIT 1`,
          promoKey
        );

        if (existingRows.length > 0) {
          legacyId = Number(existingRows[0].id);

          await fastify.prisma.legacy.$executeRawUnsafe(
            `UPDATE promotion 
             SET discount_percentage = ?,
                 discount_amount = ?,
                 is_disabled = ?,
                 date_expired = ?,
                 date_updated = NOW()
             WHERE id = ?`,
            pct,
            amt,
            isDisabled,
            expiredDateStr,
            legacyId
          );

          await this.upsertPromotionLanguage(fastify, legacyId, promoName, shortName);
        } else {
          // INSERT new legacy promotion record with exact legacy columns
          await fastify.prisma.legacy.$executeRawUnsafe(
            `INSERT INTO promotion (
              client_id, client_business_id, campaign_id, advertise_id,
              promotion_key, promotion_type, promotion_apply,
              discount_percentage, discount_amount, exactly_amount,
              reward_credit, reward_credit_referrer_new_user, reward_credit_referrer_old_user,
              use_count, limit_use_count, extend_service_balance_expiry_day,
              position, is_old_user_disabled, is_approval_required,
              is_change_date_disabled, is_assigned_staff_disabled, is_public, is_system,
              is_credit_allowed, is_disabled, date_expired, date_updated, date_created
            ) VALUES (
              11, 1, NULL, NULL,
              ?, 'normal', 'all',
              ?, ?, 0,
              0, 0, 0,
              0, 0, 0,
              999, 0, 0,
              0, 0, 0, 1,
              1, ?, ?, NOW(), NOW()
            )`,
            promoKey,
            pct,
            amt,
            isDisabled,
            expiredDateStr
          );

          const inserted = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
            `SELECT id FROM promotion WHERE promotion_key = ? LIMIT 1`,
            promoKey
          );

          if (inserted.length > 0) {
            legacyId = Number(inserted[0].id);
            await this.upsertPromotionLanguage(fastify, legacyId, promoName, shortName);
          }
        }

        // Save legacyPromotionId back to CRM
        if (legacyId) {
          await fastify.prisma.crm.crmCampaignPromotion.update({
            where: { id: crmPromoId },
            data: { legacyPromotionId: legacyId },
          });
        }
      }

      return legacyId;
    } catch (err: any) {
      fastify.log.warn(`Failed to sync CRM promo ${crmPromoId} to legacy DB: ${err?.message || err}`);
      return null;
    }
  }

  /**
   * Update legacy promotion disabled state for all promotions in a campaign.
   */
  static async updatePromotionsStatusForCampaign(
    fastify: FastifyInstance,
    campaignId: number,
    isDisabled: boolean
  ): Promise<void> {
    try {
      const promotions = await fastify.prisma.crm.crmCampaignPromotion.findMany({
        where: { campaignId },
      });

      for (const p of promotions) {
        await this.syncPromotionToLegacy(fastify, p.id);
        if (p.legacyPromotionId) {
          await fastify.prisma.legacy.$executeRawUnsafe(
            `UPDATE promotion SET is_disabled = ?, date_updated = NOW() WHERE id = ?`,
            isDisabled ? 1 : 0,
            p.legacyPromotionId
          );
        }
      }
    } catch (err: any) {
      fastify.log.warn(`Failed to update legacy promotion statuses for campaign ${campaignId}: ${err?.message || err}`);
    }
  }

  /**
   * One-time backfill migration to sync all existing CRM promotions to legacy DB on server start.
   */
  static async backfillExistingPromotions(fastify: FastifyInstance): Promise<{ synced: number; total: number }> {
    try {
      const promotions = await fastify.prisma.crm.crmCampaignPromotion.findMany({
        select: { id: true, legacyPromotionId: true },
      });

      let syncedCount = 0;
      for (const p of promotions) {
        const legacyId = await this.syncPromotionToLegacy(fastify, p.id);
        if (legacyId) {
          syncedCount++;
        }
      }

      fastify.log.info(
        `[CampaignPromotionSync] Backfill completed: ${syncedCount}/${promotions.length} promotions synced.`
      );
      return { synced: syncedCount, total: promotions.length };
    } catch (err: any) {
      fastify.log.warn(`[CampaignPromotionSync] Backfill error: ${err?.message || err}`);
      return { synced: 0, total: 0 };
    }
  }
}
