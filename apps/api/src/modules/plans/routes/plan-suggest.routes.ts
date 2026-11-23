import type { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '../../../middlewares/auth.js';
import { CustomerAccessService } from '../../customers/services/customer-access.service.js';

export function registerPlanSuggestRoutes(fastify: FastifyInstance): void {
  // GET /api/plans/suggest
  // Auto-suggest customers matching touchpoint buckets and campaigns
  fastify.get('/plans/suggest', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number; role?: string };
    try {
      const telesalesAssignments = CustomerAccessService.isTelesales(user)
        ? await fastify.prisma.crm.crmCustomerAssignment.findMany({
            where: {
              staffId: user.id,
            },
            select: { legacyUserId: true },
          })
        : [];
      const telesalesCustomerIds = new Set(telesalesAssignments.map((assignment) => assignment.legacyUserId));
      const restrictToTelesalesAssignments = (customers: SafeAny[]) =>
        CustomerAccessService.isTelesales(user)
          ? customers.filter((customer) => telesalesCustomerIds.has(Number(customer.id)))
          : customers;

      // 1. Read cached campaign IDs from JSON
      let comboT7Ids: number[] = [];
      let promoIds: number[] = [];

      try {
        const cachePath = path.join(__dirname, '../../../data/campaign-clients.json');
        if (fs.existsSync(cachePath)) {
          const cacheData = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
          comboT7Ids = cacheData.combo_t7 || [];
          promoIds = cacheData.nlc_promo_2 || [];
        }
      } catch (err) {
        fastify.log.warn('Could not read campaign cache: ' + err);
      }

      // Helper function to build lists
      const queryList = async (sql: string, params: SafeAny[] = []) => {
        const data = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(sql, ...params);
        return data.map((row) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          lastVisit: row.lastVisit ? new Date(row.lastVisit).toISOString() : null,
          daysSinceLastVisit: row.daysSinceLastVisit !== null ? Number(row.daysSinceLastVisit) : null,
          bucket: row.bucket,
          comboBalance:
            row.bucket !== 'SINGLE'
              ? {
                  normalCount: Number(row.normalCount || 0),
                  retainCount: Number(row.retainCount || 0),
                  expiryDate: row.expiryDate ? new Date(row.expiryDate).toISOString() : null,
                }
              : null,
        }));
      };

      // Query builders
      const happyCallSql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          COALESCE(uc.phone_number, '') as phone, 
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          CASE
            WHEN usb.id IS NULL THEN 'SINGLE'
            WHEN (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) THEN 'COMBO_LIVE'
            ELSE 'COMBO_DEAD'
          END as bucket,
          usb.normal_count as normalCount,
          usb.retain_count as retainCount,
          usb.date_expired as expiryDate
        FROM user u
        JOIN user_profile up ON u.id = up.user_id
        JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
        LEFT JOIN user_service_balance usb ON u.id = usb.user_id
        WHERE up.last_order_booking >= CURDATE() - INTERVAL 1 DAY AND up.last_order_booking < CURDATE()
        LIMIT 10
      `;

      const single21dSql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          COALESCE(uc.phone_number, '') as phone, 
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          'SINGLE' as bucket,
          null as normalCount,
          null as retainCount,
          null as expiryDate
        FROM user u
        JOIN user_profile up ON u.id = up.user_id
        JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
        LEFT JOIN user_service_balance usb ON u.id = usb.user_id
        WHERE usb.id IS NULL AND up.last_order_booking >= CURDATE() - INTERVAL 21 DAY AND up.last_order_booking <= CURDATE() - INTERVAL 19 DAY
        LIMIT 10
      `;

      const combo25dSql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          COALESCE(uc.phone_number, '') as phone, 
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          'COMBO_LIVE' as bucket,
          usb.normal_count as normalCount,
          usb.retain_count as retainCount,
          usb.date_expired as expiryDate
        FROM user u
        JOIN user_profile up ON u.id = up.user_id
        JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
        JOIN user_service_balance usb ON u.id = usb.user_id
        WHERE (usb.normal_count + usb.retain_count) > 0 
          AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) 
          AND up.last_order_booking >= CURDATE() - INTERVAL 25 DAY AND up.last_order_booking <= CURDATE() - INTERVAL 23 DAY
        LIMIT 10
      `;

      const singleLostSql = `
        SELECT 
          u.id, 
          COALESCE(up.full_name, 'No Name') as name, 
          COALESCE(uc.phone_number, '') as phone, 
          up.last_order_booking as lastVisit,
          DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
          'SINGLE' as bucket,
          null as normalCount,
          null as retainCount,
          null as expiryDate
        FROM user u
        JOIN user_profile up ON u.id = up.user_id
        JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
        LEFT JOIN user_service_balance usb ON u.id = usb.user_id
        WHERE usb.id IS NULL AND up.last_order_booking <= CURDATE() - INTERVAL 22 DAY
        ORDER BY up.last_order_booking DESC
        LIMIT 10
      `;

      const [happyCall, single21d, combo25d, singleLost] = await Promise.all([
        queryList(happyCallSql),
        queryList(single21dSql),
        queryList(combo25dSql),
        queryList(singleLostSql),
      ]);

      // Fetch active campaigns
      let campaignComboT7: SafeAny[] = [];
      let campaignPromo2: SafeAny[] = [];

      if (comboT7Ids.length > 0) {
        const sliceIds = comboT7Ids.slice(0, 50); // Fetch smaller list
        const place = sliceIds.map(() => '?').join(',');
        campaignComboT7 = await queryList(
          `
          SELECT 
            u.id, 
            COALESCE(up.full_name, 'No Name') as name, 
            COALESCE(uc.phone_number, '') as phone, 
            up.last_order_booking as lastVisit,
            DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
            CASE
              WHEN usb.id IS NULL THEN 'SINGLE'
              WHEN (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) THEN 'COMBO_LIVE'
              ELSE 'COMBO_DEAD'
            END as bucket,
            usb.normal_count as normalCount,
            usb.retain_count as retainCount,
            usb.date_expired as expiryDate
          FROM user u
          JOIN user_profile up ON u.id = up.user_id
          JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
          LEFT JOIN user_service_balance usb ON u.id = usb.user_id
          WHERE u.id IN (${place})
          LIMIT 10
        `,
          sliceIds
        );
      }

      if (promoIds.length > 0) {
        const sliceIds = promoIds.slice(0, 50);
        const place = sliceIds.map(() => '?').join(',');
        campaignPromo2 = await queryList(
          `
          SELECT 
            u.id, 
            COALESCE(up.full_name, 'No Name') as name, 
            COALESCE(uc.phone_number, '') as phone, 
            up.last_order_booking as lastVisit,
            DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
            CASE
              WHEN usb.id IS NULL THEN 'SINGLE'
              WHEN (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) THEN 'COMBO_LIVE'
              ELSE 'COMBO_DEAD'
            END as bucket,
            usb.normal_count as normalCount,
            usb.retain_count as retainCount,
            usb.date_expired as expiryDate
          FROM user u
          JOIN user_profile up ON u.id = up.user_id
          JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
          LEFT JOIN user_service_balance usb ON u.id = usb.user_id
          WHERE u.id IN (${place})
          LIMIT 10
        `,
          sliceIds
        );
      }

      // Fetch planned user IDs this week to exclude them
      const currentMonday = new Date();
      const day = currentMonday.getDay();
      const diff = currentMonday.getDate() - day + (day === 0 ? -6 : 1);
      currentMonday.setDate(diff);
      currentMonday.setHours(0, 0, 0, 0);

      const currentSunday = new Date(currentMonday);
      currentSunday.setDate(currentMonday.getDate() + 6);
      currentSunday.setHours(23, 59, 59, 999);

      const plannedThisWeek = await fastify.prisma.crm.crmDailyPlan.findMany({
        where: {
          plannedDate: {
            gte: currentMonday,
            lte: currentSunday,
          },
        },
        select: { legacyUserId: true },
      });
      const plannedUserIds = plannedThisWeek.map((p) => p.legacyUserId);

      const myAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: {
          staffId: user.id,
          NOT: {
            legacyUserId: { in: plannedUserIds },
          },
        },
        take: 30,
        select: { legacyUserId: true },
      });
      const mySuggestedUserIds = myAssignments.map((a) => a.legacyUserId);

      let myCustomers: SafeAny[] = [];
      if (mySuggestedUserIds.length > 0) {
        const placeholder = mySuggestedUserIds.map(() => '?').join(',');
        const myCustomersSql = `
          SELECT 
            u.id, 
            COALESCE(up.full_name, 'No Name') as name, 
            COALESCE(uc.phone_number, '') as phone, 
            up.last_order_booking as lastVisit,
            DATEDIFF(NOW(), up.last_order_booking) as daysSinceLastVisit,
            CASE
              WHEN usb.id IS NULL THEN 'SINGLE'
              WHEN (usb.normal_count + usb.retain_count) > 0 AND (usb.date_expired IS NULL OR usb.date_expired > NOW()) THEN 'COMBO_LIVE'
              ELSE 'COMBO_DEAD'
            END as bucket,
            usb.normal_count as normalCount,
            usb.retain_count as retainCount,
            usb.date_expired as expiryDate
          FROM user u
          JOIN user_profile up ON u.id = up.user_id
          JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
          LEFT JOIN user_service_balance usb ON u.id = usb.user_id
          WHERE u.id IN (${placeholder})
        `;
        myCustomers = await queryList(myCustomersSql, mySuggestedUserIds);
      }

      return {
        happyCall: restrictToTelesalesAssignments(happyCall),
        single21d: restrictToTelesalesAssignments(single21d),
        combo25d: restrictToTelesalesAssignments(combo25d),
        singleLost: restrictToTelesalesAssignments(singleLost),
        campaignComboT7: restrictToTelesalesAssignments(campaignComboT7),
        campaignPromo2: restrictToTelesalesAssignments(campaignPromo2),
        myCustomers: restrictToTelesalesAssignments(myCustomers),
      };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get suggests error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve suggestions',
      });
    }
  });
}
