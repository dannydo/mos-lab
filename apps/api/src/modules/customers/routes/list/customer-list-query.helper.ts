import { SafeAny } from '@mos-lab/shared';
import { getForeignSqlFilter } from '../../services/foreign-customer.service.js';
import {
  ACTIVE_ELSA_NOT_EXISTS_SQL,
  LIVE_COMBO_NOT_EXISTS_SQL,
  buildBirthdayAgeWhereClauses,
  buildCallLogWhereClauses,
  buildCompletedServiceUsageJoin,
  buildNotComboLiveWhereClauses,
  buildSearchCondition,
  buildUserScopeWhereClauses,
  subtractExcludedUserIds,
} from '../helpers.js';
import { CustomerListQuery, EmptyCustomerListResponse, emptyCustomerListResponse } from './customer-list.types.js';

interface BuildCustomerListSqlParams {
  query: CustomerListQuery;
  sortParam: string;
  needsAssignmentTimeSort: boolean;
  needServiceBalance: boolean;
  needServiceUsage: boolean;
  selectedServiceIds: number[];
  needPromo: boolean;
  needReferrals: boolean;
  allowedUserIds: number[] | null;
  excludedUserIds: number[] | null;
  notComboLiveExcludedInMemory: boolean;
  pageNum: number;
  limitNum: number;
  offsetNum: number;
  resolveNewLocaUserIds: () => Promise<number[]>;
}

export type CustomerListSqlBuildResult =
  | { emptyResponse: EmptyCustomerListResponse }
  | {
      emptyResponse: null;
      pageIdsSql: string;
      countSql: string;
      dataParams: SafeAny[];
      countParams: SafeAny[];
    };

export async function buildCustomerListSql({
  query,
  sortParam,
  needsAssignmentTimeSort,
  needServiceBalance,
  needServiceUsage,
  selectedServiceIds,
  needPromo,
  needReferrals,
  allowedUserIds: initialAllowedUserIds,
  excludedUserIds,
  notComboLiveExcludedInMemory,
  pageNum,
  limitNum,
  offsetNum,
  resolveNewLocaUserIds,
}: BuildCustomerListSqlParams): Promise<CustomerListSqlBuildResult> {
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
    hsd30,
    lsd1,
    hasProduct,
    contacted,
    contactType,
    hasCallback,
    hasFutureBooking,
    dobMonth,
    birthdayPreset,
    ageMin,
    ageMax,
    callStatuses,
    lastCallDaysMin,
    lastCallDaysMax,
    isForeign,
  } = query;

  let allowedUserIds = initialAllowedUserIds;

  const usbUserFilter =
    allowedUserIds !== null && allowedUserIds.length > 0 ? `WHERE user_id IN (${allowedUserIds.join(',')})` : '';
  const comboUserFilter =
    allowedUserIds !== null && allowedUserIds.length > 0 ? `WHERE o.user_id IN (${allowedUserIds.join(',')})` : '';

  let innerJoins = 'LEFT JOIN user_profile up ON u.id = up.user_id';
  let countJoins = 'LEFT JOIN user_profile up ON u.id = up.user_id';
  if (needsAssignmentTimeSort) {
    // This is the same current-owner record used to scope a telesales queue.
    // It deliberately does not read allocation history, so recalled or
    // transferred customers cannot float back into the queue.
    innerJoins +=
      ' LEFT JOIN mos_lab.crm_customer_assignments assignment_sort ON assignment_sort.legacy_user_id = u.id';
  }
  if (needServiceBalance) {
    const isComboLive = (bucket as string) === 'COMBO_LIVE';
    const liveCondition =
      "(normal_count + retain_count) > 0 AND (service_group IS NULL OR service_group != 'LashesUnder') AND (date_expired IS NULL OR date_expired > NOW())";
    const usbFilterClauses: string[] = [];
    if (usbUserFilter) {
      usbFilterClauses.push(usbUserFilter.replace(/^WHERE\s+/i, ''));
    }
    if (isComboLive) {
      usbFilterClauses.push(liveCondition);
    }
    const finalUsbWhere = usbFilterClauses.length > 0 ? `WHERE ${usbFilterClauses.join(' AND ')}` : '';

    const usbJoinSql = ` LEFT JOIN (
      SELECT 
        user_id,
        SUM(
          CASE 
            WHEN (normal_count + retain_count) > 0 AND (service_group IS NULL OR service_group != 'LashesUnder') AND (date_expired IS NULL OR date_expired > NOW()) THEN 1 
            ELSE 0 
          END
        ) as live_count,
        SUM(normal_count) as normalCount,
        SUM(retain_count) as retainCount,
        MAX(date_expired) as expiryDate,
        MAX(date_created) as max_date_created
      FROM user_service_balance
      ${finalUsbWhere}
      GROUP BY user_id
    ) as usb_agg ON u.id = usb_agg.user_id`;

    innerJoins += usbJoinSql;
    countJoins += usbJoinSql;
  }
  if (sortParam === 'totalSpent_desc' || sortParam === 'totalSpent_asc') {
    const orderCountsJoinSql = ` LEFT JOIN (
      SELECT 
        user_id, 
        COALESCE(SUM(total_price), 0) as totalSpent, 
        COUNT(*) as totalVisits
      FROM \`order\`
      WHERE order_state = 'Completed' ${allowedUserIds !== null && allowedUserIds.length > 0 ? `AND user_id IN (${allowedUserIds.join(',')})` : ''}
      GROUP BY user_id
    ) as order_counts ON u.id = order_counts.user_id`;

    innerJoins += orderCountsJoinSql;
  }
  if (needServiceUsage) {
    const serviceUsageJoinSql = buildCompletedServiceUsageJoin(selectedServiceIds);
    innerJoins += serviceUsageJoinSql;
    countJoins += serviceUsageJoinSql;
  }
  if (needPromo) {
    const promoJoinSql = ` LEFT JOIN (
      SELECT user_id, COUNT(*) as totalPromotionsUsed
      FROM \`order\`
      WHERE order_state = 'Completed' AND (promotion_id IS NOT NULL OR selected_promotion_id IS NOT NULL) ${allowedUserIds !== null && allowedUserIds.length > 0 ? `AND user_id IN (${allowedUserIds.join(',')})` : ''}
      GROUP BY user_id
    ) as promo_counts ON u.id = promo_counts.user_id`;
    innerJoins += promoJoinSql;
    countJoins += promoJoinSql;
  }
  if (needReferrals) {
    const refJoinSql = ` LEFT JOIN (
      SELECT referrer_user_id, COUNT(*) as totalReferrals
      FROM user_profile
      WHERE referrer_user_id IS NOT NULL ${allowedUserIds !== null && allowedUserIds.length > 0 ? `AND referrer_user_id IN (${allowedUserIds.join(',')})` : ''}
      GROUP BY referrer_user_id
    ) as ref_counts ON u.id = ref_counts.referrer_user_id`;
    innerJoins += refJoinSql;
    countJoins += refJoinSql;
  }
  if (hasFutureBooking === 'true') {
    innerJoins += ` LEFT JOIN (
      SELECT user_id, MIN(booking_date_start) as nextBookingDate
      FROM \`order\`
      WHERE booking_date_start > NOW() AND order_state IN ('New', 'Confirmed') ${allowedUserIds !== null && allowedUserIds.length > 0 ? `AND user_id IN (${allowedUserIds.join(',')})` : ''}
      GROUP BY user_id
    ) as fb_agg ON u.id = fb_agg.user_id`;
  }

  const needComboPurchaseDate =
    sortParam === 'purchaseDate_desc' ||
    sortParam === 'purchaseDate_asc' ||
    sortParam === 'comboPurchaseDate_desc' ||
    sortParam === 'comboPurchaseDate_asc' ||
    (bucket === 'NEW_LOCA' &&
      (sortParam === 'daysSinceLastVisit_desc' || sortParam === 'daysSinceLastVisit' || !sortParam));

  if (needComboPurchaseDate) {
    innerJoins += ` LEFT JOIN (
      SELECT user_id, MAX(max_created) as latest_combo_date
      FROM (
        SELECT o.user_id, MAX(o.date_created) as max_created
        FROM \`order\` o
        JOIN order_service_combo osc ON osc.order_id = o.id
        ${comboUserFilter ? `${comboUserFilter} AND osc.total_price > 0` : 'WHERE osc.total_price > 0'}
        GROUP BY o.user_id
        UNION ALL
        SELECT user_id, MAX(date_created) as max_created
        FROM user_service_balance
        ${usbUserFilter ? `${usbUserFilter} AND (total_normal_balance_amount + total_retain_balance_amount) > 0` : 'WHERE (total_normal_balance_amount + total_retain_balance_amount) > 0'}
        GROUP BY user_id
        UNION ALL
        SELECT o.user_id, MAX(o.date_created) as max_created
        FROM \`order\` o
        JOIN order_service os ON os.order_id = o.id
        ${comboUserFilter ? `${comboUserFilter} AND (os.user_service_type = 'combo' OR os.service_group = 'combo') AND os.total_price > 0` : `WHERE (os.user_service_type = 'combo' OR os.service_group = 'combo') AND os.total_price > 0`}
        GROUP BY o.user_id
      ) t
      GROUP BY user_id
    ) as combo_dates ON u.id = combo_dates.user_id`;
  }

  const innerWhereClauses: string[] = [];
  const innerParams: SafeAny[] = [];

  if (trash === 'true') {
    innerWhereClauses.push('up.is_deleted = 1');
  } else {
    innerWhereClauses.push('(up.is_deleted IS NULL OR up.is_deleted = 0)');
  }

  allowedUserIds = subtractExcludedUserIds(allowedUserIds, excludedUserIds);
  if (allowedUserIds !== null && allowedUserIds.length === 0) {
    return { emptyResponse: emptyCustomerListResponse(pageNum, limitNum) };
  }

  innerWhereClauses.push(...buildUserScopeWhereClauses(allowedUserIds, excludedUserIds));

  const foreignFilterSql = getForeignSqlFilter(isForeign);
  if (foreignFilterSql) {
    innerWhereClauses.push(foreignFilterSql);
  }

  if (search && search.trim() !== '') {
    const { sql, params } = buildSearchCondition(search);
    innerWhereClauses.push(sql);
    innerParams.push(...params);
  }

  const bStr = bucket as string;
  const hasDaysSinceLastVisitFilter =
    (daysSinceLastVisitMin !== undefined && daysSinceLastVisitMin !== '') ||
    (daysSinceLastVisitMax !== undefined && daysSinceLastVisitMax !== '');
  if (bStr && bStr !== 'ALL') {
    if (bStr === 'SINGLE') {
      innerWhereClauses.push(
        'NOT EXISTS (SELECT 1 FROM user_service_balance usb WHERE usb.user_id = u.id)',
        ACTIVE_ELSA_NOT_EXISTS_SQL
      );
    } else if (bStr === 'COMBO_LIVE') {
      if (needServiceBalance) {
        innerWhereClauses.push('usb_agg.live_count > 0', ACTIVE_ELSA_NOT_EXISTS_SQL);
      }
    } else if (bStr === 'COMBO_DEAD') {
      innerWhereClauses.push(
        'EXISTS (SELECT 1 FROM user_service_balance usb WHERE usb.user_id = u.id)',
        LIVE_COMBO_NOT_EXISTS_SQL,
        ACTIVE_ELSA_NOT_EXISTS_SQL
      );
    } else if (bStr === 'NOT_COMBO_LIVE') {
      innerWhereClauses.push(
        ...buildNotComboLiveWhereClauses({
          liveExcludedInMemory: notComboLiveExcludedInMemory,
          hasDaysSinceLastVisitFilter,
        })
      );
    } else if (bStr === 'COMBO_ELSA') {
      innerWhereClauses.push(`u.id IN (
        SELECT legacy_user_id FROM mos_lab.crm_customer_elsa_reservations
        WHERE status = 'ACTIVE' AND (end_date IS NULL OR end_date >= NOW())
      )`);
    } else if (bStr === 'NEW_LOCA') {
      const newLocaUserIds = await resolveNewLocaUserIds();
      if (newLocaUserIds.length === 0) {
        innerWhereClauses.push('1 = 0');
      } else {
        innerWhereClauses.push(`u.id IN (${newLocaUserIds.join(',')})`);
      }
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
  if (hasDaysSinceLastVisitFilter) {
    innerWhereClauses.push(`EXISTS (
      SELECT 1 FROM \`order\` o_visit
      WHERE o_visit.user_id = u.id AND o_visit.order_state = 'Completed'
    )`);
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

  const birthdayAgeSql = buildBirthdayAgeWhereClauses({ dobMonth, birthdayPreset, ageMin, ageMax });
  innerWhereClauses.push(...birthdayAgeSql.clauses);
  innerParams.push(...birthdayAgeSql.params);

  if (hsd30 === 'true' && needServiceBalance) {
    innerWhereClauses.push('usb_agg.expiryDate IS NOT NULL AND DATEDIFF(usb_agg.expiryDate, NOW()) BETWEEN 0 AND 30');
  }
  if (lsd1 === 'true' && needServiceBalance) {
    innerWhereClauses.push('(COALESCE(usb_agg.normalCount, 0) + COALESCE(usb_agg.retainCount, 0)) = 1');
  }
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

  const callLogSql = buildCallLogWhereClauses({ callStatuses, lastCallDaysMin, lastCallDaysMax });
  innerWhereClauses.push(...callLogSql.clauses);
  innerParams.push(...callLogSql.params);

  const innerWhereString = innerWhereClauses.length > 0 ? `WHERE ${innerWhereClauses.join(' AND ')}` : '';

  let innerOrderBy = 'ORDER BY u.id DESC';
  if (sortParam === 'assignedAt_desc') {
    innerOrderBy = 'ORDER BY assignment_sort.assigned_at DESC, u.id DESC';
  } else if (sortParam === 'assignedAt_asc') {
    innerOrderBy = 'ORDER BY assignment_sort.assigned_at ASC, u.id ASC';
  } else if (
    sortParam === 'purchaseDate_desc' ||
    sortParam === 'comboPurchaseDate_desc' ||
    (bucket === 'NEW_LOCA' &&
      (sortParam === 'daysSinceLastVisit_desc' || sortParam === 'daysSinceLastVisit' || !sortParam))
  ) {
    innerOrderBy = 'ORDER BY COALESCE(combo_dates.latest_combo_date, u.date_created) DESC';
  } else if (sortParam === 'purchaseDate_asc' || sortParam === 'comboPurchaseDate_asc') {
    innerOrderBy = 'ORDER BY COALESCE(combo_dates.latest_combo_date, u.date_created) ASC';
  } else if (
    hasFutureBooking === 'true' &&
    (sortParam === 'daysSinceLastVisit_asc' || sortParam === 'daysSinceLastVisit_desc')
  ) {
    innerOrderBy =
      sortParam === 'daysSinceLastVisit_desc'
        ? 'ORDER BY fb_agg.nextBookingDate DESC'
        : 'ORDER BY fb_agg.nextBookingDate ASC';
  } else if (sortParam === 'daysSinceLastVisit_desc') {
    innerOrderBy = 'ORDER BY up.last_order_booking ASC';
  } else if (sortParam === 'daysSinceLastVisit_asc') {
    innerOrderBy = 'ORDER BY up.last_order_booking DESC';
  } else if (sortParam === 'id_asc') {
    innerOrderBy = 'ORDER BY u.id ASC';
  } else if (sortParam === 'id_desc') {
    innerOrderBy = 'ORDER BY u.id DESC';
  } else if (sortParam === 'totalSpent_desc') {
    innerOrderBy = 'ORDER BY COALESCE(order_counts.totalSpent, 0) DESC, u.id DESC';
  } else if (sortParam === 'totalSpent_asc') {
    innerOrderBy = 'ORDER BY COALESCE(order_counts.totalSpent, 0) ASC, u.id ASC';
  } else if (sortParam === 'name_asc') {
    innerOrderBy = 'ORDER BY up.full_name ASC';
  } else if (sortParam === 'name_desc') {
    innerOrderBy = 'ORDER BY up.full_name DESC';
  }

  const innerQuerySql = `
        SELECT u.id
        FROM user u
        ${innerJoins}
        ${innerWhereString}
        ${innerOrderBy}
      `;

  const pageIdsSql = `${innerQuerySql}\n        LIMIT ? OFFSET ?`;

  const countSql = `
        SELECT COUNT(*) as total FROM (
          SELECT u.id
          FROM user u
          ${countJoins}
          ${innerWhereString}
        ) as p
      `;

  return {
    emptyResponse: null,
    pageIdsSql,
    countSql,
    dataParams: [...innerParams, limitNum, offsetNum],
    countParams: [...innerParams],
  };
}
