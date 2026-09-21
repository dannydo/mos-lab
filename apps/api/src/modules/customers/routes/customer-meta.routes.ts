import { FastifyInstance } from 'fastify';
import { requireAuth } from '../../../middlewares/auth.js';
import { CreateCustomerInput, isAdminOrSuperAdminRole, SafeAny } from '@mos-lab/shared';
import { CustomerServiceFilterCatalogService } from '../services/customer-service-filter-catalog.service.js';
import { CustomerCreationError, CustomerCreationService } from '../services/customer-creation.service.js';
import { StaffOffDayService } from '../../staff/services/staff-off-day.service.js';
import { TeamService } from '../../teams/team.service.js';
import { BookingPromotionService } from '../services/booking-promotion.service.js';
import { CustomerAccessService } from '../services/customer-access.service.js';
import { AllocationLedgerService } from '../../allocation/allocation-ledger.service.js';

export async function registerCustomerMetaRoutes(fastify: FastifyInstance) {
  // GET /api/saved-filters
  // Retrieve saved customer filters
  fastify.get('/saved-filters', { preHandler: [requireAuth] }, async (_request, _reply) => {
    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
      });
      if (!config) {
        return [];
      }
      return JSON.parse(config.value);
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get saved filters error:');
      return [];
    }
  });

  // POST /api/saved-filters
  // Save or update a filter
  fastify.post('/saved-filters', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id, name, criteria } = request.body as {
      id?: string;
      name: string;
      criteria: SafeAny;
    };

    if (!name || !criteria) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Name and criteria are required' });
    }

    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
      });

      let filters: SafeAny[] = [];
      if (config) {
        filters = JSON.parse(config.value);
      }

      const filterId = id || Math.random().toString(36).substring(2, 9);
      const newFilter = {
        id: filterId,
        name,
        criteria,
        createdAt: new Date().toISOString(),
      };

      if (id) {
        const idx = filters.findIndex((f) => f.id === id);
        if (idx > -1) {
          filters[idx] = newFilter;
        } else {
          filters.push(newFilter);
        }
      } else {
        filters.push(newFilter);
      }

      await fastify.prisma.crm.crmConfig.upsert({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
        update: { value: JSON.stringify(filters) },
        create: { key: 'CUSTOMER_SAVED_FILTERS', value: JSON.stringify(filters) },
      });

      return newFilter;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Save filter error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to save filter' });
    }
  });

  // DELETE /api/saved-filters/:id
  // Delete a saved filter
  fastify.delete('/saved-filters/:id', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    try {
      const config = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
      });

      if (!config) {
        return reply.status(404).send({ error: 'Not Found', message: 'Filters not found' });
      }

      let filters: SafeAny[] = JSON.parse(config.value);
      filters = filters.filter((f) => f.id !== id);

      await fastify.prisma.crm.crmConfig.update({
        where: { key: 'CUSTOMER_SAVED_FILTERS' },
        data: { value: JSON.stringify(filters) },
      });

      return { success: true };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Delete filter error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to delete filter' });
    }
  });

  // GET /api/customers/services
  // Get list of active services from legacy core database
  fastify.get('/customers/services', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const query = `
        SELECT 
          s.id,
          sl.service_name as name,
          sp.service_price as price,
          s.duration_minute_standard as duration
        FROM service s
        JOIN service_language sl ON s.id = sl.service_id
        LEFT JOIN service_price sp ON s.id = sp.service_id AND sp.service_price_package_key = 'single' AND sp.is_disabled = 0
        WHERE s.is_disabled = 0 
          AND s.is_temporary = 0
          AND sl.language_id = 1
          AND s.service_key NOT LIKE 'classic-%'
          AND s.service_key NOT LIKE 'volume-%'
          AND s.service_key NOT LIKE 'ultralight-%'
          AND s.service_key NOT LIKE 'mink-%'
          AND s.service_key NOT LIKE 'under-mink-%'
          AND s.service_key NOT LIKE 'infrared-sauna-%'
        ORDER BY s.position ASC, s.id ASC
      `;

      const dbServices = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(query);

      const mappedServices = dbServices.map((s) => ({
        id: Number(s.id),
        name: s.name,
        price: s.price !== null && s.price !== undefined ? Number(s.price) : 0,
        duration: s.duration !== null && s.duration !== undefined ? Number(s.duration) : 90,
      }));

      const finalServices = [{ id: 0, name: 'Any Lashes / Any Services', price: 0, duration: 90 }, ...mappedServices];

      return finalServices;
    } catch (err) {
      request.log.error(err, 'Failed to fetch services list');
      return reply
        .status(500)
        .send({ error: 'Internal Server Error', message: 'Không thể tải danh sách dịch vụ từ hệ thống.' });
    }
  });

  // GET /api/customers/service-filter-options
  // Resolve active catalog services and their lash families to their real service IDs.
  fastify.get('/customers/service-filter-options', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      return CustomerServiceFilterCatalogService.getOptions(fastify);
    } catch (error: SafeAny) {
      request.log.error(error as Error, 'Get customer service filter options error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Không thể tải danh sách dịch vụ để lọc khách hàng.',
      });
    }
  });

  // GET /api/customers/staff
  // Get list of active staff members
  fastify.get('/customers/staff', { preHandler: [requireAuth] }, async (request, reply) => {
    const { role } = request.query as { date?: string; role?: string };
    try {
      // 1. Fetch CRM Staff
      const crmStaffList = await fastify.prisma.crm.crmStaff.findMany({
        where: { isActive: true },
        select: {
          id: true,
          username: true,
          displayName: true,
          role: true,
          legacyStaffId: true,
        },
        orderBy: { displayName: 'asc' },
      });

      // 2. Fetch KTVs from legacy core tables
      let mappedKTVs: SafeAny[] = [];

      // Query staff off days from unified StaffOffDayService (Single Source of Truth)
      const staffOffDayBatchMap = await StaffOffDayService.getBatchStaffOffDays(fastify);

      // Always fetch all active KTVs so technician metadata (offDays, approvedOffDates) is complete for all dates
      const activeKTVs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT DISTINCT user_id, full_name, client_store_id, avatar 
         FROM user_profile 
         WHERE provider = 'Staff' AND user_group_id = 4 AND is_disabled = 0 AND is_leaved = 0 AND is_deleted = 0`
      );

      mappedKTVs = activeKTVs.map((ktv) => {
        const storeId = Number(ktv.client_store_id);
        let storeNotes = 'Estella Place';
        if (storeId === 6) storeNotes = 'De Tham';
        if (storeId === 2) storeNotes = 'Phan Xích Long';

        const uid = Number(ktv.user_id);
        const offDayInfo = staffOffDayBatchMap.get(uid);
        const offDays = offDayInfo ? offDayInfo.weeklyOffDays.map(String) : [];
        const baseApprovedOffDates = offDayInfo ? offDayInfo.approvedOffDates : [];

        return {
          id: uid,
          username: `ktv_${ktv.full_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          displayName: ktv.full_name,
          role: 'technician',
          notes: storeNotes,
          avatar: ktv.avatar,
          offDays,
          approvedOffDates: Array.from(
            new Set([
              ...baseApprovedOffDates,
              ...(ktv.full_name.toLowerCase().includes('cẩm tiên') || ktv.full_name.toLowerCase().includes('cam tien')
                ? ['2026-07-26', '2026-07-27']
                : []),
            ])
          ),
          pendingOffDates: offDayInfo?.pendingOffDates || [],
          rejectedOffDates: offDayInfo?.rejectedOffDates || [],
        };
      });

      // Deduplicate CRM staff and legacy mappedKTVs by displayName (trimmed & case-insensitive)
      const uniqueStaffMap = new Map<string, SafeAny>();

      // 1. Add mappedKTVs first so technician attributes (offDays, approvedOffDates, role) are prioritized
      mappedKTVs.forEach((ktv) => {
        const key = (ktv.displayName || '').trim().toLowerCase();
        if (key && !uniqueStaffMap.has(key)) {
          uniqueStaffMap.set(key, ktv);
        }
      });

      // 2. Add CRM staff for non-technicians or merge properties
      crmStaffList.forEach((s) => {
        const key = (s.displayName || '').trim().toLowerCase();
        if (key && !uniqueStaffMap.has(key)) {
          uniqueStaffMap.set(key, s);
        } else if (key && uniqueStaffMap.has(key)) {
          const existing = uniqueStaffMap.get(key);
          uniqueStaffMap.set(key, { ...s, ...existing });
        }
      });

      const result = Array.from(uniqueStaffMap.values());

      if (role === 'cs' || role === 'coca' || role === 'loca') {
        const csConfigIds = await TeamService.getActiveStaffIdsWithFallback(
          fastify,
          'BK_CS',
          'ACTIVE_BK_CS_STAFF_CONFIG'
        );
        const locaConfigIds = await TeamService.getActiveStaffIdsWithFallback(
          fastify,
          'LOCA',
          'ACTIVE_LOCA_STAFF_CONFIG'
        );
        const allCsConfigIds = Array.from(new Set([...(csConfigIds || []), ...(locaConfigIds || [])]));

        const strictCsRoles = ['cs', 'coca', 'loca', 'cskh', 'customer-support', 'customer-service'];

        return result.filter((s) => {
          const r = (s.role || '').toLowerCase();
          const legId = Number(s.legacyStaffId);
          const sysId = Number(s.id);

          if (allCsConfigIds.includes(legId) || allCsConfigIds.includes(sysId)) {
            if (r === 'admin' && (s.displayName || '').toLowerCase().includes('han huynh')) {
              return false;
            }
            return true;
          }

          return strictCsRoles.includes(r);
        });
      }

      if (role === 'booker' || role === 'telesales') {
        const bkIds = await TeamService.getActiveStaffIdsWithFallback(fastify, 'BK', 'ACTIVE_BK_STAFF_CONFIG');
        const teleIds = await TeamService.getActiveStaffIdsWithFallback(
          fastify,
          'BK_TELESALES',
          'ACTIVE_BK_TELESALES_STAFF_CONFIG'
        );
        const allBkIds = Array.from(new Set([...(bkIds || []), ...(teleIds || [])]));

        if (allBkIds.length > 0) {
          const filtered = result.filter((s) => {
            const legId = Number(s.legacyStaffId);
            const sysId = Number(s.id);
            return allBkIds.includes(legId) || allBkIds.includes(sysId);
          });
          if (filtered.length > 0) return filtered;
        }
        return result.filter((s) => ['telesales', 'booker'].includes(s.role?.toLowerCase() || ''));
      }
      return result;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get staff list error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve staff list' });
    }
  });

  // GET /api/customers/promotions
  // Fetch active promotions for selection during booking
  fastify.get('/customers/promotions', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      const promotions = await BookingPromotionService.getStandardOptions(fastify);
      return promotions.map((promotion) => ({
        id: promotion.id,
        name: promotion.name,
        code: promotion.code || undefined,
        promotionKey: promotion.code || null,
        discountPercentage: promotion.discountPercentage || 0,
        discountAmount: promotion.discountAmount || 0,
      }));
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get promotions error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve promotions list' });
    }
  });

  // GET /api/customers/referrals
  // Get list of all customers who referred someone and their details (Optimized)
  fastify.get('/customers/referrals', { preHandler: [requireAuth] }, async (request, reply) => {
    try {
      if (CustomerAccessService.isTelesales(request.user)) {
        return [];
      }

      const { page, pageSize, search, timeFilter } = request.query as {
        page?: string;
        pageSize?: string;
        search?: string;
        timeFilter?: string;
      };

      const hasPagination = page !== undefined || pageSize !== undefined;
      const pageNum = Math.max(1, Number(page) || 1);
      const limit = Math.min(100, Math.max(1, Number(pageSize) || 20));
      const offset = (pageNum - 1) * limit;

      let timeWhere = '';
      if (timeFilter === 'this_month') {
        timeWhere = 'AND up.date_created >= DATE_FORMAT(NOW(), "%Y-%m-01")';
      } else if (timeFilter === 'last_month') {
        timeWhere =
          'AND up.date_created >= DATE_FORMAT(NOW() - INTERVAL 1 MONTH, "%Y-%m-01") AND up.date_created < DATE_FORMAT(NOW(), "%Y-%m-01")';
      } else if (timeFilter === 'this_year') {
        timeWhere = 'AND up.date_created >= DATE_FORMAT(NOW(), "%Y-01-01")';
      } else if (timeFilter === 'last_year') {
        timeWhere =
          'AND up.date_created >= DATE_FORMAT(NOW() - INTERVAL 1 YEAR, "%Y-01-01") AND up.date_created < DATE_FORMAT(NOW(), "%Y-01-01")';
      }

      let searchWhere = '';
      if (search && search.trim()) {
        const cleanSearch = search.trim().replace(/'/g, "''");
        searchWhere = `AND (r_up.full_name LIKE '%${cleanSearch}%' OR r_uc.phone_number LIKE '%${cleanSearch}%')`;
      }

      // 1. Fetch referrers summary (with pagination LIMIT offset if enabled)
      const referrers = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT 
           up.referrer_user_id as referrerId,
           r_up.full_name as referrerName,
           COALESCE(r_uc.phone_number, '') as referrerPhone,
           COUNT(*) as totalReferred
         FROM user_profile up
         INNER JOIN user r_u ON up.referrer_user_id = r_u.id
         INNER JOIN user_profile r_up ON r_u.id = r_up.user_id
         LEFT JOIN user_contact r_uc ON r_u.id = r_uc.user_id AND r_uc.is_disabled = 0
         WHERE up.referrer_user_id IS NOT NULL AND up.is_deleted = 0 ${timeWhere} ${searchWhere}
         GROUP BY up.referrer_user_id
         ORDER BY totalReferred DESC
         ${hasPagination ? `LIMIT ${limit} OFFSET ${offset}` : ''}`
      );

      const referrerIds = referrers.map((r) => Number(r.referrerId)).filter(Boolean);
      if (referrerIds.length === 0) {
        return [];
      }
      const refIdListStr = referrerIds.join(',');

      // 2. Fetch referred friends for active page referrers only
      const referredFriends = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT 
           u.id as referredId,
           up.full_name as referredName,
           COALESCE(uc.phone_number, '') as referredPhone,
           u.date_created as dateCreated,
           up.referrer_user_id as referrerId
         FROM user u
         INNER JOIN user_profile up ON u.id = up.user_id
         LEFT JOIN user_contact uc ON u.id = uc.user_id AND uc.is_disabled = 0
         WHERE up.referrer_user_id IN (${refIdListStr}) AND up.is_deleted = 0
         ORDER BY u.id DESC`
      );

      // 3. Fetch referral transactions for active page referrers only
      const referralTxs = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
        `SELECT user_id as referrerId, amount, tracking_key FROM user_balance_transaction 
         WHERE template_id = 7 AND currency_id = 3 AND user_id IN (${refIdListStr})`
      );

      // Map of referrerId -> Map of referredId -> rewardAmount
      const referrerRewardMaps = new Map<number, Map<number, number>>();
      // Map of referrerId -> totalRewardDiamonds
      const referrerTotalRewards = new Map<number, number>();

      for (const tx of referralTxs) {
        const refId = Number(tx.referrerId);
        try {
          if (tx.tracking_key) {
            const keyObj = JSON.parse(tx.tracking_key);
            const referredId = Number(keyObj.user_id);
            if (referredId && refId) {
              const amt = Number(tx.amount);

              if (!referrerRewardMaps.has(refId)) {
                referrerRewardMaps.set(refId, new Map<number, number>());
              }
              referrerRewardMaps.get(refId)!.set(referredId, amt);

              referrerTotalRewards.set(refId, (referrerTotalRewards.get(refId) || 0) + amt);
            }
          }
        } catch {
          // ignore parsing error
        }
      }

      // Map of referrerId -> Map of referredId -> friend_info (to collapse duplicate contacts)
      const friendsGrouped = new Map<number, Map<number, SafeAny>>();

      for (const rf of referredFriends) {
        const refId = Number(rf.referrerId);
        const friendId = Number(rf.referredId);
        if (!refId || !friendId) continue;

        if (!friendsGrouped.has(refId)) {
          friendsGrouped.set(refId, new Map<number, SafeAny>());
        }

        const refMap = friendsGrouped.get(refId)!;
        if (refMap.has(friendId)) {
          const existing = refMap.get(friendId);
          if (rf.referredPhone && !existing.phone.includes(rf.referredPhone)) {
            existing.phone = existing.phone ? `${existing.phone}, ${rf.referredPhone}` : rf.referredPhone;
          }
        } else {
          const refRewardMap = referrerRewardMaps.get(refId);
          const rewardDiamonds = refRewardMap ? refRewardMap.get(friendId) || 0 : 0;

          refMap.set(friendId, {
            id: friendId,
            name: rf.referredName || 'Khách hàng',
            phone: rf.referredPhone || '',
            dateCreated: rf.dateCreated ? new Date(rf.dateCreated).toISOString() : null,
            rewardDiamonds,
          });
        }
      }

      const friendsMap = new Map<number, SafeAny[]>();
      for (const [refId, refMap] of friendsGrouped.entries()) {
        friendsMap.set(refId, Array.from(refMap.values()));
      }

      const result = referrers.map((r) => {
        const refId = Number(r.referrerId);
        return {
          referrerId: refId,
          referrerName: r.referrerName || 'Khách hàng',
          referrerPhone: r.referrerPhone || '',
          totalReferred: Number(r.totalReferred),
          totalRewardDiamonds: referrerTotalRewards.get(refId) || 0,
          referredUsers: friendsMap.get(refId) || [],
        };
      });

      return result;
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get referrals list error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to retrieve referrals list' });
    }
  });

  // GET /api/customers/create-options
  // Source selections used by the legacy-compatible standalone customer form.
  fastify.get('/customers/create-options', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { role: string };
    const allowedRoles = ['admin', 'manager', 'control', 'oc', 'cc', 'ls', 'telesales', 'booker'];
    if (!isAdminOrSuperAdminRole(user.role) && !allowedRoles.includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền thực hiện chức năng này.' });
    }

    try {
      const [campaigns, advertises] = await Promise.all([
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT c.id, COALESCE(MAX(CASE WHEN cl.language_id = 1 THEN cl.campaign_name END), MAX(cl.campaign_name)) AS name
          FROM campaign c
          LEFT JOIN campaign_language cl ON cl.campaign_id = c.id
          WHERE c.is_disabled = 0
          GROUP BY c.id
          HAVING name IS NOT NULL
          ORDER BY name ASC
        `),
        fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT a.id, a.campaign_id AS campaignId,
                 COALESCE(MAX(CASE WHEN al.language_id = 1 THEN al.advertise_name END), MAX(al.advertise_name)) AS name
          FROM advertise a
          LEFT JOIN advertise_language al ON al.advertise_id = a.id
          WHERE a.is_disabled = 0
          GROUP BY a.id, a.campaign_id
          HAVING name IS NOT NULL
          ORDER BY name ASC
        `),
      ]);

      return reply.send({
        campaigns: campaigns.map((campaign) => ({ id: Number(campaign.id), name: String(campaign.name) })),
        advertises: advertises.map((advertise) => ({
          id: Number(advertise.id),
          campaignId: Number(advertise.campaignId),
          name: String(advertise.name),
        })),
      });
    } catch (error) {
      fastify.log.error(error as Error, 'Get customer creation options error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể tải nguồn khách hàng.' });
    }
  });

  // POST /api/customers/create
  // Create a customer without creating an appointment, preserving the fields
  // and referral relationship supported by Wings Lashes legacy.
  fastify.post('/customers/create', { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as { id: number; role: string; displayName?: string };
    const allowedRoles = ['admin', 'manager', 'control', 'oc', 'cc', 'ls', 'telesales', 'booker'];
    if (!isAdminOrSuperAdminRole(user.role) && !allowedRoles.includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Bạn không có quyền thực hiện chức năng này.' });
    }

    try {
      const created = await CustomerCreationService.create(fastify, user, request.body as CreateCustomerInput);
      const crmStaff = await fastify.prisma.crm.crmStaff.findUnique({ where: { id: user.id }, select: { id: true } });

      // A customer created by a Booker must remain accessible to that Booker
      // even though no booking exists yet to trigger the usual auto-assignment.
      if (crmStaff) {
        const existingAssignment = await fastify.prisma.crm.crmCustomerAssignment.findUnique({
          where: { legacyUserId: created.customer.id },
          select: { id: true },
        });
        if (!existingAssignment) {
          const batchId = `alloc_customer_create_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          await fastify.prisma.crm.$transaction(async (tx) => {
            await AllocationLedgerService.setOwner(tx, {
              customerId: created.customer.id,
              nextStaffId: user.id,
              actorStaffId: user.id,
              eventType: 'ACCEPTED',
              previousStaffId: null,
              reason: 'Booker tạo khách hàng mới',
              sourceType: 'CUSTOMER_CREATE',
              actionContext: 'CUSTOMER_CREATE_AUTO_ASSIGN',
              batchId,
            });
            await tx.crmAssignmentHistory.create({
              data: {
                batchId,
                legacyUserId: created.customer.id,
                prevStaffId: null,
                newStaffId: user.id,
                assignedBy: user.id,
              },
            });
          });
        }
      }

      return reply.status(201).send({
        success: true,
        customer: created.customer,
        message: `Đã thêm khách hàng ${created.customer.name}. Chưa tạo lịch hẹn.`,
      });
    } catch (error) {
      if (error instanceof CustomerCreationError) {
        return reply.status(error.statusCode).send({ error: 'Bad Request', message: error.message });
      }
      fastify.log.error(error as Error, 'Create standalone customer error:');
      return reply.status(500).send({ error: 'Internal Server Error', message: 'Không thể thêm khách hàng.' });
    }
  });
}
