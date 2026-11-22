import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { getForeignSqlFilter } from '../../services/foreign-customer.service.js';
import { buildCompletedServiceUsageJoin, buildSearchCondition } from '../helpers.js';
import {
  CustomerStatsLiveUsbInfo,
  CustomerStatsQuery,
  CustomerStatsResult,
  createEmptyCustomerStats,
} from './customer-stats.types.js';

export interface QueryMatchingCustomerIdsParams {
  fastify: FastifyInstance;
  query: CustomerStatsQuery;
  allowedUserIds: number[] | null;
  excludedUserIds: number[] | null;
  selectedServiceIds: number[];
  needServiceUsage: boolean;
  needPromo: boolean;
  needReferrals: boolean;
  getNewLocaUserIds: (dateFrom?: string, dateTo?: string) => Promise<number[]>;
}

/**
 * Queries matching legacy user IDs for filtered `/customers/stats` requests.
 */
export async function queryMatchingCustomerIds({
  fastify,
  query,
  allowedUserIds,
  excludedUserIds,
  selectedServiceIds,
  needServiceUsage,
  needPromo,
  needReferrals,
  getNewLocaUserIds,
}: QueryMatchingCustomerIdsParams): Promise<{ id: number | bigint }[]> {
  const {
    bucket,
    search,
    daysSinceLastVisitMin,
    daysSinceLastVisitMax,
    serviceVisitCountMin,
    serviceVisitCountMax,
    promoUsed,
    promoCountMin,
    promoCountMax,
    referralUsed,
    referralCountMin,
    referralCountMax,
    trash,
    hasProduct,
    contacted,
    contactType,
    hasCallback,
    hasFutureBooking,
    dateFrom,
    dateTo,
    dobMonth,
    birthdayPreset,
    ageMin,
    ageMax,
    callStatuses,
    lastCallDaysMin,
    lastCallDaysMax,
    isForeign,
  } = query;

  const bStrStats = bucket as string;

  let statsInnerJoins = 'LEFT JOIN user_profile up ON u.id = up.user_id';
  if (needServiceUsage) {
    statsInnerJoins += buildCompletedServiceUsageJoin(selectedServiceIds);
  }
  if (needPromo) {
    statsInnerJoins += ` LEFT JOIN (
          SELECT user_id, COUNT(*) as totalPromotionsUsed
          FROM \`order\`
          WHERE order_state = 'Completed' AND (promotion_id IS NOT NULL OR selected_promotion_id IS NOT NULL) ${allowedUserIds !== null && allowedUserIds.length > 0 ? `AND user_id IN (${allowedUserIds.join(',')})` : ''}
          GROUP BY user_id
        ) as promo_counts ON u.id = promo_counts.user_id`;
  }
  if (needReferrals) {
    statsInnerJoins += ` LEFT JOIN (
          SELECT referrer_user_id, COUNT(*) as totalReferrals
          FROM user_profile
          WHERE referrer_user_id IS NOT NULL ${allowedUserIds !== null && allowedUserIds.length > 0 ? `AND referrer_user_id IN (${allowedUserIds.join(',')})` : ''}
          GROUP BY referrer_user_id
        ) as ref_counts ON u.id = ref_counts.referrer_user_id`;
  }

  const innerWhereClauses: string[] = [];
  const innerParams: SafeAny[] = [];

  // Filter out or in deleted users based on trash flag
  if (trash === 'true') {
    innerWhereClauses.push('up.is_deleted = 1');
  } else {
    innerWhereClauses.push('COALESCE(up.is_deleted, 0) = 0');
  }

  if (allowedUserIds !== null) {
    innerWhereClauses.push(`u.id IN (${allowedUserIds.join(',')})`);
  }
  if (excludedUserIds !== null && excludedUserIds.length > 0) {
    innerWhereClauses.push(`u.id NOT IN (${excludedUserIds.join(',')})`);
  }

  const foreignFilterSqlStats = getForeignSqlFilter(isForeign);
  if (foreignFilterSqlStats) {
    innerWhereClauses.push(foreignFilterSqlStats);
  }

  // 1. Filter by Search (Name or Phone using Phone Fast-Path)
  if (search && search.trim() !== '') {
    const { sql, params } = buildSearchCondition(search);
    innerWhereClauses.push(sql);
    innerParams.push(...params);
  }

  // 2. Filter by Bucket (NEW_LOCA and NOT_COMBO_LIVE phone/order predicates stay in SQL; bucket membership classified in Node)
  if (bStrStats === 'NOT_COMBO_LIVE') {
    innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM user_contact uc_v
          WHERE uc_v.user_id = u.id AND uc_v.is_disabled = 0 AND uc_v.phone_number IS NOT NULL AND TRIM(uc_v.phone_number) != ''
        )`);
    innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM \`order\` o_v
          WHERE o_v.user_id = u.id
        )`);
  } else if (bStrStats === 'NEW_LOCA') {
    const newLocaUserIds = await getNewLocaUserIds(dateFrom, dateTo);
    if (newLocaUserIds.length === 0) {
      innerWhereClauses.push('1 = 0');
    } else {
      innerWhereClauses.push(`u.id IN (${newLocaUserIds.join(',')})`);
    }
  }

  // 3. daysSinceLastVisit Filters
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
          SELECT 1 FROM \`order\` o_visit_stats
          WHERE o_visit_stats.user_id = u.id AND o_visit_stats.order_state = 'Completed'
        )`);
  }

  // 4. Service usage filters (totalSpent & totalVisits already resolved via standalone query)
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

  // 5. Promotions and Referrals Filters (using pre-aggregated joins)
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

  // Birthday & Age Filters
  if (dobMonth !== undefined && dobMonth !== '' && dobMonth !== 'ALL') {
    innerWhereClauses.push('u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = ?');
    innerParams.push(parseInt(String(dobMonth), 10));
  }

  if (birthdayPreset === 'today') {
    innerWhereClauses.push(
      'u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = MONTH(CURDATE()) AND DAY(u.date_of_birth) = DAY(CURDATE())'
    );
  } else if (birthdayPreset === 'this_month') {
    innerWhereClauses.push('u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = MONTH(CURDATE())');
  } else if (birthdayPreset === 'next_month') {
    innerWhereClauses.push(
      'u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = MONTH(ADDDATE(CURDATE(), INTERVAL 1 MONTH))'
    );
  }

  if (ageMin !== undefined && ageMin !== '') {
    innerWhereClauses.push(
      'u.date_of_birth IS NOT NULL AND YEAR(u.date_of_birth) <= YEAR(CURDATE()) - 10 AND TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) >= ?'
    );
    innerParams.push(parseInt(String(ageMin), 10));
  }
  if (ageMax !== undefined && ageMax !== '') {
    innerWhereClauses.push(
      'u.date_of_birth IS NOT NULL AND YEAR(u.date_of_birth) <= YEAR(CURDATE()) - 10 AND TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) <= ?'
    );
    innerParams.push(parseInt(String(ageMax), 10));
  }

  // LoCa Campaign Filters (hsd30 / lsd1 resolved via standalone liveUsbMap)
  if (hasProduct === 'true') {
    innerWhereClauses.push(`u.id IN (
          SELECT DISTINCT user_id FROM order_service 
          WHERE service_group = 'product' OR user_service_type = 'product'
        )`);
  }
  if (hasCallback === 'true') {
    innerWhereClauses.push(`(
          EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl 
            WHERE ccl.legacy_user_id = u.id AND ccl.callback_date >= CURDATE()
          ) OR EXISTS (
            SELECT 1 FROM mos_lab.crm_daily_plans cdp 
            WHERE cdp.legacy_user_id = u.id AND cdp.planned_date >= CURDATE()
          ) OR EXISTS (
            SELECT 1 FROM mos_lab.crm_loca_touchpoints clt 
            WHERE clt.legacy_user_id = u.id AND clt.status = 'CALLBACK'
          )
        )`);
  }
  if (hasFutureBooking === 'true') {
    innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM \`order\` o_bk 
          WHERE o_bk.user_id = u.id AND o_bk.booking_date_start > NOW() AND o_bk.order_state IN ('New', 'Confirmed')
        )`);
  } else if (hasFutureBooking === 'false') {
    innerWhereClauses.push(`NOT EXISTS (
          SELECT 1 FROM \`order\` o_bk 
          WHERE o_bk.user_id = u.id AND o_bk.booking_date_start > NOW() AND o_bk.order_state IN ('New', 'Confirmed')
        )`);
  }
  if (contacted === 'true') {
    if (contactType === 'TEXT') {
      innerWhereClauses.push(`EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl 
            WHERE ccl.legacy_user_id = u.id AND ccl.call_type IN ('TEXT', 'ZALO', 'MESSENGER', 'SMS')
          )`);
    } else if (contactType === 'CALL') {
      innerWhereClauses.push(`EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl 
            WHERE ccl.legacy_user_id = u.id AND ccl.call_type IN ('CALL', 'OUTBOUND', 'INBOUND')
          )`);
    } else {
      innerWhereClauses.push(`EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl 
            WHERE ccl.legacy_user_id = u.id
          )`);
    }
  }

  // Call Status Multi-Select Filter & Last Call Days Filter
  if (callStatuses && callStatuses.trim() !== '') {
    const statusList = callStatuses
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const hasNotCalled = statusList.includes('NOT_CALLED');
    const realStatuses = statusList.filter((s) => s !== 'NOT_CALLED');

    const callConds: string[] = [];
    if (realStatuses.length > 0) {
      const placeholders = realStatuses.map(() => '?').join(',');
      callConds.push(`EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl_latest
            WHERE ccl_latest.legacy_user_id = u.id 
              AND ccl_latest.id = (SELECT MAX(id) FROM mos_lab.crm_call_logs WHERE legacy_user_id = u.id)
              AND ccl_latest.call_result IN (${placeholders})
          )`);
      innerParams.push(...realStatuses);
    }
    if (hasNotCalled) {
      callConds.push(`NOT EXISTS (
            SELECT 1 FROM mos_lab.crm_call_logs ccl_all WHERE ccl_all.legacy_user_id = u.id
          )`);
    }

    if (callConds.length > 0) {
      innerWhereClauses.push(`(${callConds.join(' OR ')})`);
    }
  }

  if (lastCallDaysMin !== undefined && lastCallDaysMin !== '') {
    innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM mos_lab.crm_call_logs ccl_latest
          WHERE ccl_latest.legacy_user_id = u.id
            AND ccl_latest.id = (SELECT MAX(id) FROM mos_lab.crm_call_logs WHERE legacy_user_id = u.id)
            AND DATEDIFF(NOW(), ccl_latest.created_at) >= ?
        )`);
    innerParams.push(parseInt(lastCallDaysMin, 10));
  }

  if (lastCallDaysMax !== undefined && lastCallDaysMax !== '') {
    innerWhereClauses.push(`EXISTS (
          SELECT 1 FROM mos_lab.crm_call_logs ccl_latest
          WHERE ccl_latest.legacy_user_id = u.id
            AND ccl_latest.id = (SELECT MAX(id) FROM mos_lab.crm_call_logs WHERE legacy_user_id = u.id)
            AND DATEDIFF(NOW(), ccl_latest.created_at) <= ?
        )`);
    innerParams.push(parseInt(lastCallDaysMax, 10));
  }

  const innerWhereString = innerWhereClauses.length > 0 ? `WHERE ${innerWhereClauses.join(' AND ')}` : '';

  const matchingUsersSql = `
        SELECT u.id
        FROM user u
        ${statsInnerJoins}
        ${innerWhereString}
      `;

  return fastify.prisma.legacy.$queryRawUnsafe<{ id: number | bigint }[]>(matchingUsersSql, ...innerParams);
}

export interface AggregateCustomerBucketStatsParams {
  matchingRows: { id: number | bigint }[];
  elsaSet: Set<number>;
  liveUsbMap: Map<number, CustomerStatsLiveUsbInfo>;
  anyUsbSet: Set<number>;
  bucket?: CustomerStatsQuery['bucket'];
  hsd30?: string;
  lsd1?: string;
}

/**
 * Classifies matched customer IDs into bucket counts (`COMBO_LIVE`, `COMBO_DEAD`, `SINGLE`, `COMBO_ELSA`)
 * plus LoCa sub-counters (`hsd30`, `lsd1`, `notComboLive`).
 */
export function aggregateCustomerBucketStats({
  matchingRows,
  elsaSet,
  liveUsbMap,
  anyUsbSet,
  bucket,
  hsd30,
  lsd1,
}: AggregateCustomerBucketStatsParams): CustomerStatsResult {
  const bStrStats = bucket as string;
  const stats = createEmptyCustomerStats();

  for (const row of matchingRows) {
    const id = Number(row.id);
    const isElsa = elsaSet.has(id);
    const live = liveUsbMap.get(id);
    const isAnyUsb = anyUsbSet.has(id);

    if (bStrStats === 'COMBO_ELSA' && !isElsa) continue;
    if (bStrStats === 'SINGLE' && (isElsa || isAnyUsb)) continue;
    if (bStrStats === 'COMBO_LIVE' && (isElsa || !live)) continue;
    if (bStrStats === 'COMBO_DEAD' && (isElsa || !isAnyUsb || Boolean(live))) continue;
    if (bStrStats === 'NOT_COMBO_LIVE' && (isElsa || Boolean(live))) continue;

    if (
      hsd30 === 'true' &&
      (!live || live.expiryDaysDiff === null || live.expiryDaysDiff < 0 || live.expiryDaysDiff > 30)
    ) {
      continue;
    }
    if (lsd1 === 'true' && (!live || live.normalTotal !== 1)) {
      continue;
    }

    stats.total += 1;
    if (isElsa) {
      stats.comboElsa += 1;
    } else if (live) {
      stats.comboLive += 1;
      if (live.expiryDaysDiff !== null && live.expiryDaysDiff >= 0 && live.expiryDaysDiff <= 30) {
        stats.hsd30 += 1;
      }
      if (live.normalTotal === 1) {
        stats.lsd1 += 1;
      }
    } else if (isAnyUsb) {
      stats.comboDead += 1;
    } else {
      stats.single += 1;
    }
  }

  stats.notComboLive = stats.total - stats.comboLive - stats.comboElsa;
  return stats;
}
