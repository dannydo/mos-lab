import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { requireAuth } from '../../../../middlewares/auth.js';
import { CustomerAccessService } from '../../services/customer-access.service.js';
import { getForeignSqlFilter } from '../../services/foreign-customer.service.js';
import { AllocationLedgerService } from '../../../allocation/allocation-ledger.service.js';
import {
  buildBirthdayAgeWhereClauses,
  buildCallLogWhereClauses,
  buildCompletedServiceUsageJoin,
  buildSearchCondition,
  parseServiceFilterIds,
} from '../helpers.js';

export async function registerCustomerRandomIdsRoutes(fastify: FastifyInstance) {
  // GET /api/customers/random-ids
  // Retrieve random customer IDs matching the current filters (only unassigned by default)
  fastify.get('/customers/random-ids', { preHandler: [requireAuth] }, async (request, reply) => {
    const {
      bucket,
      search,
      limit = '20',
      daysSinceLastVisitMin,
      daysSinceLastVisitMax,
      totalSpentMin,
      totalSpentMax,
      totalVisitsMin,
      totalVisitsMax,
      serviceIds,
      serviceVisitCountMin,
      serviceVisitCountMax,
      promoUsed,
      promoCountMin,
      promoCountMax,
      referralUsed,
      referralCountMin,
      referralCountMax,
      assignedStaffId,
      assignedDaysMin,
      assignedDaysMax,
      retainedOnly,
      campaignId,
      campaignFilterMode,
      isForeign,
      dobMonth,
      birthdayPreset,
      ageMin,
      ageMax,
      callStatuses,
      lastCallDaysMin,
      lastCallDaysMax,
      excludeAssigned = 'true',
      excludeFutureBooking = 'true',
      excludeUnconfirmedAllocation = 'true',
      hasFutureBooking,
    } = request.query as SafeAny;

    const limitNum = parseInt(limit, 10) || 20;

    try {
      const needServiceBalance = bucket === 'COMBO_LIVE';
      const needSpent =
        (totalSpentMin !== undefined && totalSpentMin !== '') || (totalSpentMax !== undefined && totalSpentMax !== '');
      const needVisits =
        (totalVisitsMin !== undefined && totalVisitsMin !== '') ||
        (totalVisitsMax !== undefined && totalVisitsMax !== '');
      const selectedServiceIds = parseServiceFilterIds(serviceIds);
      const needServiceUsage =
        selectedServiceIds.length > 0 ||
        (serviceVisitCountMin !== undefined && serviceVisitCountMin !== '') ||
        (serviceVisitCountMax !== undefined && serviceVisitCountMax !== '');
      const needPromo =
        (promoUsed !== undefined && promoUsed !== 'all') ||
        (promoCountMin !== undefined && promoCountMin !== '') ||
        (promoCountMax !== undefined && promoCountMax !== '');
      const needReferrals =
        (referralUsed !== undefined && referralUsed !== 'all') ||
        (referralCountMin !== undefined && referralCountMin !== '') ||
        (referralCountMax !== undefined && referralCountMax !== '');

      const needOrderCounts = needSpent || needVisits;

      let innerJoins = 'LEFT JOIN user_profile up ON u.id = up.user_id';
      if (needServiceBalance) {
        const isComboLive = (bucket as string) === 'COMBO_LIVE';
        const liveFilter = isComboLive
          ? "WHERE (normal_count + retain_count) > 0 AND (service_group IS NULL OR service_group != 'LashesUnder') AND (date_expired IS NULL OR date_expired > NOW())"
          : '';

        innerJoins += ` LEFT JOIN (
          SELECT 
            user_id,
            SUM(
              CASE 
                WHEN (normal_count + retain_count) > 0 AND (service_group IS NULL OR service_group != 'LashesUnder') AND (date_expired IS NULL OR date_expired > NOW()) THEN 1 
                ELSE 0 
              END
            ) as live_count
          FROM user_service_balance
          ${liveFilter}
          GROUP BY user_id
        ) as usb_agg ON u.id = usb_agg.user_id`;
      }
      if (needOrderCounts) {
        innerJoins += ` LEFT JOIN (
          SELECT 
            user_id, 
            COALESCE(SUM(total_price), 0) as totalSpent, 
            COUNT(*) as totalVisits
          FROM \`order\`
          WHERE order_state = 'Completed'
          GROUP BY user_id
        ) as order_counts ON u.id = order_counts.user_id`;
      }
      if (needServiceUsage) {
        innerJoins += buildCompletedServiceUsageJoin(selectedServiceIds);
      }
      if (needPromo) {
        innerJoins += ` LEFT JOIN (
          SELECT user_id, COUNT(*) as totalPromotionsUsed
          FROM \`order\`
          WHERE order_state = 'Completed' AND (promotion_id IS NOT NULL OR selected_promotion_id IS NOT NULL)
          GROUP BY user_id
        ) as promo_counts ON u.id = promo_counts.user_id`;
      }
      if (needReferrals) {
        innerJoins += ` LEFT JOIN (
          SELECT referrer_user_id, COUNT(*) as totalReferrals
          FROM user_profile
          WHERE referrer_user_id IS NOT NULL
          GROUP BY referrer_user_id
        ) as ref_counts ON u.id = ref_counts.referrer_user_id`;
      }

      const innerWhereClauses: string[] = [
        'COALESCE(up.is_deleted, 0) = 0',
        'COALESCE(up.is_disabled, 0) = 0',
        `EXISTS (
          SELECT 1 FROM user_contact uc_rand
          WHERE uc_rand.user_id = u.id AND uc_rand.is_disabled = 0 AND uc_rand.phone_number IS NOT NULL AND TRIM(uc_rand.phone_number) != ''
        )`,
      ];
      const innerParams: SafeAny[] = [];

      const currentUser = (request as SafeAny).user;
      const adminUser = await fastify.prisma.crm.crmStaff.findFirst({
        where: {
          OR: [{ username: currentUser?.username }, { email: currentUser?.email }],
        },
      });

      const effectiveAssignedStaffId = CustomerAccessService.isTelesales(currentUser) ? 'me' : assignedStaffId;

      if (
        (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') ||
        (assignedDaysMin !== undefined && assignedDaysMin !== '') ||
        (assignedDaysMax !== undefined && assignedDaysMax !== '')
      ) {
        if (effectiveAssignedStaffId === 'unassigned') {
          const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            select: { legacyUserId: true },
          });
          const excludedUserIds = allAssignments.map((a) => a.legacyUserId);
          if (excludedUserIds.length > 0) {
            innerWhereClauses.push(`u.id NOT IN (${excludedUserIds.join(',')})`);
          }
        } else {
          const assignedWhere: SafeAny = {};
          if (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all') {
            let targetStaffId =
              effectiveAssignedStaffId === 'me' ? Number(currentUser?.id) : adminUser ? adminUser.id : 0;
            if (effectiveAssignedStaffId !== 'me') {
              targetStaffId = parseInt(effectiveAssignedStaffId, 10);
            }
            if (!isNaN(targetStaffId)) {
              assignedWhere.staffId = targetStaffId;
            }
          } else {
            assignedWhere.staffId = { not: null };
          }
          if (assignedDaysMin !== undefined && assignedDaysMin !== '') {
            const minDays = parseInt(assignedDaysMin, 10);
            if (!isNaN(minDays)) {
              const maxDate = new Date();
              maxDate.setDate(maxDate.getDate() - minDays);
              maxDate.setHours(23, 59, 59, 999);
              if (!assignedWhere.assignedAt) assignedWhere.assignedAt = {};
              assignedWhere.assignedAt.lte = maxDate;
            }
          }
          if (assignedDaysMax !== undefined && assignedDaysMax !== '') {
            const maxDays = parseInt(assignedDaysMax, 10);
            if (!isNaN(maxDays)) {
              const minDate = new Date();
              minDate.setDate(minDate.getDate() - maxDays);
              minDate.setHours(0, 0, 0, 0);
              if (!assignedWhere.assignedAt) assignedWhere.assignedAt = {};
              assignedWhere.assignedAt.gte = minDate;
            }
          }

          const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
            where: assignedWhere,
            select: { legacyUserId: true },
          });
          const filterUserIds = assignments.map((a) => a.legacyUserId);
          if (filterUserIds.length === 0) {
            return { ids: [], batchId: `rand_${Date.now()}` };
          }
          innerWhereClauses.push(`u.id IN (${filterUserIds.join(',')})`);
        }
      } else if (excludeAssigned === 'true') {
        const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
          where: { staffId: { not: null } },
          select: { legacyUserId: true },
        });
        const excludedUserIds = allAssignments.map((a) => a.legacyUserId);
        if (excludedUserIds.length > 0) {
          innerWhereClauses.push(`u.id NOT IN (${excludedUserIds.join(',')})`);
        }
      }

      if (excludeUnconfirmedAllocation === 'true') {
        const pendingBatchItems = await fastify.prisma.crm.crmAllocationBatchItem.findMany({
          where: {
            status: 'PENDING_ACCEPT',
            batch: {
              status: 'PENDING_ACCEPT',
            },
          },
          select: { customerId: true },
        });
        const pendingCustomerIds = Array.from(new Set(pendingBatchItems.map((i) => i.customerId)));
        if (pendingCustomerIds.length > 0) {
          innerWhereClauses.push(`u.id NOT IN (${pendingCustomerIds.join(',')})`);
        }
      }

      if (retainedOnly === 'true') {
        const retainedAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
          where: { isRetained: true },
          select: { legacyUserId: true },
        });
        const retainedUserIds = retainedAssignments.map((a) => a.legacyUserId);
        if (retainedUserIds.length === 0) {
          return { ids: [], batchId: `rand_${Date.now()}` };
        }
        innerWhereClauses.push(`u.id IN (${retainedUserIds.join(',')})`);
      }

      if (campaignId && campaignId.trim() !== '') {
        const cId = parseInt(campaignId, 10);
        const mode = (campaignFilterMode || 'IN').toUpperCase();
        if (!isNaN(cId) && cId > 0 && mode !== 'ALL') {
          const campaignCustomers = await fastify.prisma.crm.crmCampaignCustomer.findMany({
            where: { campaignId: cId },
            select: { legacyUserId: true },
          });
          const campUserIds = Array.from(
            new Set(campaignCustomers.map((c) => Number(c.legacyUserId)).filter((id) => Number.isInteger(id) && id > 0))
          );

          if (mode === 'IN') {
            if (campUserIds.length === 0) {
              return { ids: [], batchId: `rand_${Date.now()}` };
            }
            innerWhereClauses.push(`u.id IN (${campUserIds.join(',')})`);
          } else if (mode === 'NOT_IN') {
            if (campUserIds.length > 0) {
              innerWhereClauses.push(`u.id NOT IN (${campUserIds.join(',')})`);
            }
          }
        }
      }

      if (excludeFutureBooking === 'true' || hasFutureBooking === 'false') {
        innerWhereClauses.push(`NOT EXISTS (
          SELECT 1 FROM \`order\` o_bk 
          WHERE o_bk.user_id = u.id AND o_bk.booking_date_start > NOW() AND o_bk.order_state IN ('New', 'Confirmed')
        )`);
      } else if (hasFutureBooking === 'true') {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM \`order\` o_bk 
          WHERE o_bk.user_id = u.id AND o_bk.booking_date_start > NOW() AND o_bk.order_state IN ('New', 'Confirmed')
        )`);
      }

      if (search && search.trim() !== '') {
        const { sql, params } = buildSearchCondition(search);
        innerWhereClauses.push(sql);
        innerParams.push(...params);
      }

      if (bucket && bucket !== 'ALL') {
        if (bucket === 'SINGLE') {
          innerWhereClauses.push('NOT EXISTS (SELECT 1 FROM user_service_balance usb WHERE usb.user_id = u.id)');
          innerWhereClauses.push(`u.id NOT IN (
            SELECT legacy_user_id FROM mos_lab.crm_customer_elsa_reservations
            WHERE status = 'ACTIVE' AND (end_date IS NULL OR end_date >= NOW())
          )`);
        } else if (bucket === 'COMBO_LIVE') {
          innerWhereClauses.push('usb_agg.live_count > 0');
          innerWhereClauses.push(`u.id NOT IN (
            SELECT legacy_user_id FROM mos_lab.crm_customer_elsa_reservations
            WHERE status = 'ACTIVE' AND (end_date IS NULL OR end_date >= NOW())
          )`);
        } else if (bucket === 'COMBO_DEAD') {
          innerWhereClauses.push('EXISTS (SELECT 1 FROM user_service_balance usb WHERE usb.user_id = u.id)');
          innerWhereClauses.push(`u.id NOT IN (
            SELECT DISTINCT user_id FROM user_service_balance
            WHERE (normal_count > 0 OR retain_count > 0)
              AND (service_group IS NULL OR service_group != 'LashesUnder')
              AND (date_expired IS NULL OR date_expired > NOW())
          )`);
          innerWhereClauses.push(`u.id NOT IN (
            SELECT legacy_user_id FROM mos_lab.crm_customer_elsa_reservations
            WHERE status = 'ACTIVE' AND (end_date IS NULL OR end_date >= NOW())
          )`);
        } else if (bucket === 'NOT_COMBO_LIVE') {
          innerWhereClauses.push(`u.id NOT IN (
            SELECT DISTINCT user_id FROM user_service_balance
            WHERE (normal_count > 0 OR retain_count > 0)
              AND (service_group IS NULL OR service_group != 'LashesUnder')
              AND (date_expired IS NULL OR date_expired > NOW())
          )`);
          innerWhereClauses.push(`u.id NOT IN (
            SELECT legacy_user_id FROM mos_lab.crm_customer_elsa_reservations
            WHERE status = 'ACTIVE' AND (end_date IS NULL OR end_date >= NOW())
          )`);
          innerWhereClauses.push(`EXISTS (
            SELECT 1 FROM \`order\` o_rand
            WHERE o_rand.user_id = u.id
          )`);
        } else if (bucket === 'COMBO_ELSA') {
          innerWhereClauses.push(`u.id IN (
            SELECT legacy_user_id FROM mos_lab.crm_customer_elsa_reservations
            WHERE status = 'ACTIVE' AND (end_date IS NULL OR end_date >= NOW())
          )`);
        }
      }

      if (daysSinceLastVisitMin !== undefined && daysSinceLastVisitMin !== '') {
        innerWhereClauses.push(
          "up.last_order_booking IS NOT NULL AND up.last_order_booking <= CONCAT(DATE_SUB(CURDATE(), INTERVAL ? DAY), ' 23:59:59')"
        );
        innerParams.push(parseInt(daysSinceLastVisitMin, 10));
      }
      if (daysSinceLastVisitMax !== undefined && daysSinceLastVisitMax !== '') {
        innerWhereClauses.push(
          "up.last_order_booking IS NOT NULL AND up.last_order_booking >= CONCAT(DATE_SUB(CURDATE(), INTERVAL ? DAY), ' 00:00:00')"
        );
        innerParams.push(parseInt(daysSinceLastVisitMax, 10));
      }
      if (
        (daysSinceLastVisitMin !== undefined && daysSinceLastVisitMin !== '') ||
        (daysSinceLastVisitMax !== undefined && daysSinceLastVisitMax !== '')
      ) {
        innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM \`order\` o_visit_rand
          WHERE o_visit_rand.user_id = u.id AND o_visit_rand.order_state = 'Completed'
        )`);
      }
      if (totalSpentMin !== undefined && totalSpentMin !== '') {
        innerWhereClauses.push('COALESCE(order_counts.totalSpent, 0) >= ?');
        innerParams.push(parseFloat(totalSpentMin));
      }
      if (totalSpentMax !== undefined && totalSpentMax !== '') {
        innerWhereClauses.push('COALESCE(order_counts.totalSpent, 0) <= ?');
        innerParams.push(parseFloat(totalSpentMax));
      }
      if (totalVisitsMin !== undefined && totalVisitsMin !== '') {
        innerWhereClauses.push('COALESCE(order_counts.totalVisits, 0) >= ?');
        innerParams.push(parseInt(totalVisitsMin, 10));
      }
      if (totalVisitsMax !== undefined && totalVisitsMax !== '') {
        innerWhereClauses.push('COALESCE(order_counts.totalVisits, 0) <= ?');
        innerParams.push(parseInt(totalVisitsMax, 10));
      }
      if (selectedServiceIds.length > 0) {
        innerWhereClauses.push('COALESCE(service_usage.completedServiceVisitCount, 0) >= 1');
      }
      if (serviceVisitCountMin !== undefined && serviceVisitCountMin !== '') {
        innerWhereClauses.push('COALESCE(service_usage.completedServiceVisitCount, 0) >= ?');
        innerParams.push(parseInt(serviceVisitCountMin, 10));
      }
      if (serviceVisitCountMax !== undefined && serviceVisitCountMax !== '') {
        innerWhereClauses.push('COALESCE(service_usage.completedServiceVisitCount, 0) <= ?');
        innerParams.push(parseInt(serviceVisitCountMax, 10));
      }
      if (promoUsed === 'yes') {
        innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) >= 1');
      } else if (promoUsed === 'no') {
        innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) = 0');
      }
      if (promoCountMin !== undefined && promoCountMin !== '') {
        innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) >= ?');
        innerParams.push(parseInt(promoCountMin, 10));
      }
      if (promoCountMax !== undefined && promoCountMax !== '') {
        innerWhereClauses.push('COALESCE(promo_counts.totalPromotionsUsed, 0) <= ?');
        innerParams.push(parseInt(promoCountMax, 10));
      }
      if (referralUsed === 'yes') {
        innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) >= 1');
      } else if (referralUsed === 'no') {
        innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) = 0');
      }
      if (referralCountMin !== undefined && referralCountMin !== '') {
        innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) >= ?');
        innerParams.push(parseInt(referralCountMin, 10));
      }
      if (referralCountMax !== undefined && referralCountMax !== '') {
        innerWhereClauses.push('COALESCE(ref_counts.totalReferrals, 0) <= ?');
        innerParams.push(parseInt(referralCountMax, 10));
      }

      const foreignFilterSql = getForeignSqlFilter(isForeign);
      if (foreignFilterSql) {
        innerWhereClauses.push(foreignFilterSql);
      }

      const birthdayAgeSql = buildBirthdayAgeWhereClauses({ dobMonth, birthdayPreset, ageMin, ageMax });
      innerWhereClauses.push(...birthdayAgeSql.clauses);
      innerParams.push(...birthdayAgeSql.params);

      const callLogSql = buildCallLogWhereClauses({ callStatuses, lastCallDaysMin, lastCallDaysMax });
      innerWhereClauses.push(...callLogSql.clauses);
      innerParams.push(...callLogSql.params);

      const innerWhereString = innerWhereClauses.length > 0 ? `WHERE ${innerWhereClauses.join(' AND ')}` : '';

      const query = `
        SELECT u.id
        FROM user u
        ${innerJoins}
        ${innerWhereString}
        ORDER BY RAND()
        LIMIT ?
      `;
      innerParams.push(limitNum);

      const rows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(query, ...innerParams);
      const ids = rows.map((r) => Number(r.id));

      const actingUser = request.user as { id: number; role: string };
      const batchId = `rand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const filterSummaryParts: string[] = [`${ids.length} KH`];
      if (excludeAssigned === 'true') filterSummaryParts.push('Chưa phân bổ');
      if (bucket && bucket !== 'ALL') filterSummaryParts.push(`Nhóm: ${bucket}`);
      if (search && search.trim() !== '') filterSummaryParts.push(`Từ khóa: ${search.trim()}`);
      const sourceFilterSummary = `Chọn ngẫu nhiên ${filterSummaryParts.join(' | ')}`;

      if (ids.length > 0 && actingUser?.id) {
        const selectedAt = new Date();
        await fastify.prisma.crm.$transaction(async (tx) => {
          for (const customerId of ids) {
            await AllocationLedgerService.append(tx, {
              customerId,
              eventType: 'RANDOM_SELECTED',
              actorStaffId: actingUser.id,
              reason: 'Khách được chọn trong bộ lọc ngẫu nhiên để phân bổ',
              sourceType: 'RANDOM',
              actionContext: 'RANDOM_CUSTOMER_SELECTION',
              batchId,
              metadata: { filters: request.query },
              occurredAt: selectedAt,
            });
          }
          await tx.crmAssignmentHistory.createMany({
            data: ids.map((cid) => ({
              batchId,
              legacyUserId: cid,
              prevStaffId: null,
              newStaffId: null,
              assignedBy: actingUser.id,
              assignedAt: selectedAt,
              sourceType: 'RANDOM',
              sourceFilterJson: JSON.stringify(request.query),
              sourceFilterSummary,
              actionType: 'RANDOM_SELECT',
            })),
          });
        });
      }

      return { ids, batchId, count: ids.length, filterSummary: sourceFilterSummary };
    } catch (error: SafeAny) {
      fastify.log.error(error as Error, 'Get random customer ids error:');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to retrieve random customer IDs',
      });
    }
  });
}
