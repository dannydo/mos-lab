import { FastifyInstance } from 'fastify';
import { BucketType, SafeAny } from '@mos-lab/shared';
import { ComboRecognitionService } from '../services/combo-recognition.service.js';
import { CustomerAccessService } from '../services/customer-access.service.js';

export const parseServiceFilterIds = (value: unknown): number[] => {
  if (typeof value !== 'string') return [];
  return Array.from(
    new Set(
      value
        .split(',')
        .map(Number)
        .filter((id) => Number.isSafeInteger(id) && id > 0)
    )
  );
};

export const buildCompletedServiceUsageJoin = (serviceIds: number[]): string => {
  const servicePredicate = serviceIds.length > 0 ? ` AND os.service_id IN (${serviceIds.join(',')})` : '';
  return ` LEFT JOIN (
    SELECT os.user_id, COUNT(DISTINCT os.order_id) as completedServiceVisitCount
    FROM order_service os
    INNER JOIN \`order\` o ON o.id = os.order_id
    WHERE o.order_state = 'Completed'${servicePredicate}
    GROUP BY os.user_id
  ) as service_usage ON u.id = service_usage.user_id`;
};

/**
 * Keeps customer-list and customer-stats access scopes identical. Customer
 * managers retain the selected scope (including the default all-customer
 * scope); telesales remains restricted to their own durable assignments.
 */
export const resolveEffectiveAssignedStaffId = (
  user: { id: number; role?: string | null },
  bucket: BucketType | 'ALL' | 'NEW_LOCA' | 'NOT_COMBO_LIVE' | undefined,
  assignedStaffId: string | undefined
): string | undefined => {
  return CustomerAccessService.resolveListAssignedStaffId(user, assignedStaffId, bucket);
};

export const createRouteHelpers = (fastify: FastifyInstance) => ({
  getNewLocaUserIds: (dFrom?: string, dTo?: string) =>
    ComboRecognitionService.getNewLoCaCustomerIds(fastify, dFrom, dTo),
  ensureTelesalesCustomerAccess: async (request: SafeAny, reply: SafeAny, customerId: number): Promise<boolean> => {
    const user = request.user as { id: number; role?: string };
    const isAllowed = await CustomerAccessService.canAccessCustomer(fastify, user, customerId);
    if (isAllowed) return true;

    reply.status(403).send({
      error: 'Forbidden',
      message: 'Telesales chỉ được xem khách hàng đã được phân bổ cho mình hoặc trong Active Shared Pool.',
    });
    return false;
  },
  ensureTelesalesCustomerMutateAccess: async (
    request: SafeAny,
    reply: SafeAny,
    customerId: number
  ): Promise<boolean> => {
    const user = request.user as { id: number; role?: string };
    const check = await CustomerAccessService.canMutateCustomer(fastify, user, customerId);
    if (check.allowed) return true;

    reply.status(403).send({
      error: 'Forbidden',
      message: check.reason || 'Telesales chỉ được thao tác trên khách hàng đã được phân bổ cho mình.',
    });
    return false;
  },
});

export interface OrderCountsFilterInput {
  totalSpentMin?: string;
  totalSpentMax?: string;
  totalVisitsMin?: string;
  totalVisitsMax?: string;
}

export interface OrderCountsFilterResolution {
  allowedUserIds: number[] | null;
  excludedUserIds: number[] | null;
  isEmpty: boolean;
}

interface OrderCountsCacheEntry {
  ids: number[];
  zeroMatches: boolean;
  expiresAt: number;
}

const ORDER_COUNTS_FILTER_CACHE_TTL_MS = 20_000;
const ORDER_COUNTS_CACHE_MAX_ENTRIES = 32;
const orderCountsCacheByFastify = new WeakMap<FastifyInstance, Map<string, OrderCountsCacheEntry>>();
const orderCountsInFlightByFastify = new WeakMap<
  FastifyInstance,
  Map<string, Promise<{ ids: number[]; zeroMatches: boolean }>>
>();

const getOrderCountsCache = (fastify: FastifyInstance): Map<string, OrderCountsCacheEntry> => {
  let cache = orderCountsCacheByFastify.get(fastify);
  if (!cache) {
    cache = new Map();
    orderCountsCacheByFastify.set(fastify, cache);
  }
  return cache;
};

const getOrderCountsInFlight = (
  fastify: FastifyInstance
): Map<string, Promise<{ ids: number[]; zeroMatches: boolean }>> => {
  let inflight = orderCountsInFlightByFastify.get(fastify);
  if (!inflight) {
    inflight = new Map();
    orderCountsInFlightByFastify.set(fastify, inflight);
  }
  return inflight;
};

/**
 * Evaluates totalSpent / totalVisits predicates via a standalone query on
 * `order` rather than joining a derived table across MariaDB 10.3 multi-table
 * customer queries (which prevents key pushdown and causes full scans).
 * Unscoped queries share a short 20s TTL cache + single-flight deduplication
 * across concurrent `/customers` and `/customers/stats` calls.
 */
export const resolveOrderCountsFilter = async (
  fastify: FastifyInstance,
  filters: OrderCountsFilterInput,
  allowedUserIds: number[] | null,
  excludedUserIds: number[] | null
): Promise<OrderCountsFilterResolution> => {
  const spentMin =
    filters.totalSpentMin !== undefined && filters.totalSpentMin !== '' ? parseFloat(filters.totalSpentMin) : undefined;
  const spentMax =
    filters.totalSpentMax !== undefined && filters.totalSpentMax !== '' ? parseFloat(filters.totalSpentMax) : undefined;
  const visitsMin =
    filters.totalVisitsMin !== undefined && filters.totalVisitsMin !== ''
      ? parseInt(filters.totalVisitsMin, 10)
      : undefined;
  const visitsMax =
    filters.totalVisitsMax !== undefined && filters.totalVisitsMax !== ''
      ? parseInt(filters.totalVisitsMax, 10)
      : undefined;

  const havingClauses: string[] = [];
  const havingParams: number[] = [];

  if (spentMin !== undefined && Number.isFinite(spentMin)) {
    havingClauses.push('COALESCE(SUM(total_price), 0) >= ?');
    havingParams.push(spentMin);
  }
  if (spentMax !== undefined && Number.isFinite(spentMax)) {
    havingClauses.push('COALESCE(SUM(total_price), 0) <= ?');
    havingParams.push(spentMax);
  }
  if (visitsMin !== undefined && Number.isFinite(visitsMin)) {
    havingClauses.push('COUNT(*) >= ?');
    havingParams.push(visitsMin);
  }
  if (visitsMax !== undefined && Number.isFinite(visitsMax)) {
    havingClauses.push('COUNT(*) <= ?');
    havingParams.push(visitsMax);
  }

  if (havingClauses.length === 0) {
    return { allowedUserIds, excludedUserIds, isEmpty: false };
  }

  if (allowedUserIds !== null && allowedUserIds.length === 0) {
    return { allowedUserIds: [], excludedUserIds, isEmpty: true };
  }

  const zeroMatches =
    (spentMin === undefined || !Number.isFinite(spentMin) || 0 >= spentMin) &&
    (spentMax === undefined || !Number.isFinite(spentMax) || 0 <= spentMax) &&
    (visitsMin === undefined || !Number.isFinite(visitsMin) || 0 >= visitsMin) &&
    (visitsMax === undefined || !Number.isFinite(visitsMax) || 0 <= visitsMax);

  const isPureAtLeastOneVisit =
    visitsMin === 1 &&
    (spentMin === undefined || !Number.isFinite(spentMin)) &&
    (spentMax === undefined || !Number.isFinite(spentMax)) &&
    (visitsMax === undefined || !Number.isFinite(visitsMax));

  const scopePredicate =
    allowedUserIds !== null && allowedUserIds.length > 0 && allowedUserIds.length <= 5000
      ? ` AND user_id IN (${allowedUserIds.join(',')})`
      : '';

  const runDbLookup = async (): Promise<{ ids: number[]; zeroMatches: boolean }> => {
    if (!zeroMatches) {
      const matchedRows = isPureAtLeastOneVisit
        ? await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number | bigint }[]>(
            `SELECT DISTINCT user_id
             FROM \`order\`
             WHERE order_state = 'Completed'${scopePredicate}`
          )
        : await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number | bigint }[]>(
            `SELECT user_id
             FROM \`order\`
             WHERE order_state = 'Completed'${scopePredicate}
             GROUP BY user_id
             HAVING ${havingClauses.join(' AND ')}`,
            ...havingParams
          );
      return { ids: matchedRows.map((r) => Number(r.user_id)), zeroMatches: false };
    }

    const rejectedRows = await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number | bigint }[]>(
      `SELECT user_id
       FROM \`order\`
       WHERE order_state = 'Completed'${scopePredicate}
       GROUP BY user_id
       HAVING NOT (${havingClauses.join(' AND ')})`,
      ...havingParams
    );
    return { ids: rejectedRows.map((r) => Number(r.user_id)), zeroMatches: true };
  };

  let ids: number[];
  const cacheKey = `${spentMin ?? ''}|${spentMax ?? ''}|${visitsMin ?? ''}|${visitsMax ?? ''}|${zeroMatches ? 1 : 0}`;
  const cache = getOrderCountsCache(fastify);
  const inflight = getOrderCountsInFlight(fastify);
  const now = Date.now();
  const cached = cache.get(cacheKey);
  const unscopedInFlight = inflight.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    ids = cached.ids;
  } else if (unscopedInFlight) {
    ids = (await unscopedInFlight).ids;
  } else if (!scopePredicate) {
    const pending = runDbLookup().finally(() => {
      inflight.delete(cacheKey);
    });
    inflight.set(cacheKey, pending);
    const fetched = await pending;
    if (cache.size >= ORDER_COUNTS_CACHE_MAX_ENTRIES) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey !== undefined) cache.delete(oldestKey);
    }
    cache.set(cacheKey, {
      ids: fetched.ids,
      zeroMatches: fetched.zeroMatches,
      expiresAt: Date.now() + ORDER_COUNTS_FILTER_CACHE_TTL_MS,
    });
    ids = fetched.ids;
  } else {
    ids = (await runDbLookup()).ids;
  }

  if (!zeroMatches) {
    if (ids.length === 0) {
      return { allowedUserIds: [], excludedUserIds, isEmpty: true };
    }
    if (allowedUserIds !== null) {
      const matchedSet = new Set(ids);
      const nextAllowed = allowedUserIds.filter((id) => matchedSet.has(id));
      return {
        allowedUserIds: nextAllowed,
        excludedUserIds,
        isEmpty: nextAllowed.length === 0,
      };
    }
    return {
      allowedUserIds: ids.slice(),
      excludedUserIds,
      isEmpty: false,
    };
  }

  if (ids.length === 0) {
    return { allowedUserIds, excludedUserIds, isEmpty: false };
  }

  const rejectedSet = new Set(ids);
  if (allowedUserIds !== null) {
    const nextAllowed = allowedUserIds.filter((id) => !rejectedSet.has(id));
    return {
      allowedUserIds: nextAllowed,
      excludedUserIds,
      isEmpty: nextAllowed.length === 0,
    };
  }

  const nextExcluded =
    excludedUserIds !== null && excludedUserIds.length > 0
      ? Array.from(new Set([...excludedUserIds, ...ids]))
      : ids.slice();
  return {
    allowedUserIds,
    excludedUserIds: nextExcluded,
    isEmpty: false,
  };
};

export const LIVE_COMBO_NOT_EXISTS_SQL = `NOT EXISTS (
  SELECT 1 FROM user_service_balance usb_live
  WHERE usb_live.user_id = u.id
    AND (usb_live.normal_count > 0 OR usb_live.retain_count > 0)
    AND (usb_live.service_group IS NULL OR usb_live.service_group != 'LashesUnder')
    AND (usb_live.date_expired IS NULL OR usb_live.date_expired > NOW())
)`;

export const ACTIVE_ELSA_NOT_EXISTS_SQL = `NOT EXISTS (
  SELECT 1 FROM mos_lab.crm_customer_elsa_reservations elsa_res
  WHERE elsa_res.legacy_user_id = u.id
    AND elsa_res.status = 'ACTIVE'
    AND (elsa_res.end_date IS NULL OR elsa_res.end_date >= NOW())
)`;

export function subtractExcludedUserIds(
  allowedUserIds: number[] | null,
  excludedUserIds: number[] | null
): number[] | null {
  if (allowedUserIds === null || excludedUserIds === null || excludedUserIds.length === 0) {
    return allowedUserIds;
  }
  const excludedSet = new Set(excludedUserIds);
  return allowedUserIds.filter((id) => !excludedSet.has(id));
}

export function buildUserScopeWhereClauses(
  allowedUserIds: number[] | null,
  excludedUserIds: number[] | null
): string[] {
  if (allowedUserIds !== null) {
    return allowedUserIds.length > 0 ? [`u.id IN (${allowedUserIds.join(',')})`] : ['1 = 0'];
  }
  if (excludedUserIds !== null && excludedUserIds.length > 0) {
    return [`u.id NOT IN (${excludedUserIds.join(',')})`];
  }
  return [];
}

export function buildNotComboLiveWhereClauses(options: {
  liveExcludedInMemory: boolean;
  hasDaysSinceLastVisitFilter: boolean;
}): string[] {
  const clauses: string[] = [];
  if (!options.liveExcludedInMemory) {
    clauses.push(LIVE_COMBO_NOT_EXISTS_SQL, ACTIVE_ELSA_NOT_EXISTS_SQL);
  }
  clauses.push(`EXISTS (
    SELECT 1 FROM user_contact uc_v
    WHERE uc_v.user_id = u.id AND uc_v.is_disabled = 0 AND uc_v.phone_number IS NOT NULL AND TRIM(uc_v.phone_number) != ''
  )`);
  if (!options.hasDaysSinceLastVisitFilter) {
    clauses.push(`EXISTS (
      SELECT 1 FROM \`order\` o_v
      WHERE o_v.user_id = u.id
    )`);
  }
  return clauses;
}

export interface SearchConditionResult {
  sql: string;
  params: string[];
}

export function buildSearchCondition(search: string): SearchConditionResult {
  const rawSearch = search.trim();
  const cleanDigits = rawSearch.replace(/[\s.+()-]/g, '');
  const hasLetters = /[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]/.test(rawSearch);

  // If search consists of at least 4 digits and contains NO letters,
  // route to high-speed phone prefix & suffix search via index_merge (phone_number + phone_reverse).
  if (cleanDigits.length >= 4 && !hasLetters) {
    let phonePrefix = cleanDigits;
    if (cleanDigits.startsWith('84') && cleanDigits.length >= 9) {
      phonePrefix = '0' + cleanDigits.slice(2);
    }
    const phoneRev = cleanDigits.split('').reverse().join('');

    return {
      sql: `u.id IN (
        SELECT uc.user_id 
        FROM user_contact uc 
        WHERE uc.is_disabled = 0 
          AND (
            uc.phone_number LIKE ? 
            OR uc.phone_number LIKE ? 
            OR uc.phone_reverse LIKE ?
          )
      )`,
      params: [`${phonePrefix}%`, `${cleanDigits}%`, `${phoneRev}%`],
    };
  }

  // Text/Name search:
  const searchLike = `%${rawSearch}%`;
  return {
    sql: `(
      up.full_name LIKE ? OR u.id IN (
        SELECT uc.user_id 
        FROM user_contact uc 
        WHERE uc.is_disabled = 0 AND uc.phone_number LIKE ?
      )
    )`,
    params: [searchLike, searchLike],
  };
}

export interface BirthdayAgeFilterInput {
  dobMonth?: string;
  birthdayPreset?: string;
  ageMin?: string;
  ageMax?: string;
}

/** Builds parameterized SQL predicates for birthday month, preset, and age-range customer filters. */
export function buildBirthdayAgeWhereClauses(input: BirthdayAgeFilterInput): {
  clauses: string[];
  params: number[];
} {
  const clauses: string[] = [];
  const params: number[] = [];
  const { dobMonth, birthdayPreset, ageMin, ageMax } = input;

  if (dobMonth !== undefined && dobMonth !== '' && dobMonth !== 'ALL') {
    const month = parseInt(String(dobMonth), 10);
    if (!isNaN(month)) {
      clauses.push('u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = ?');
      params.push(month);
    }
  }

  if (birthdayPreset === 'today') {
    clauses.push(
      'u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = MONTH(CURDATE()) AND DAY(u.date_of_birth) = DAY(CURDATE())'
    );
  } else if (birthdayPreset === 'this_month') {
    clauses.push('u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = MONTH(CURDATE())');
  } else if (birthdayPreset === 'next_month') {
    clauses.push(
      'u.date_of_birth IS NOT NULL AND MONTH(u.date_of_birth) = MONTH(ADDDATE(CURDATE(), INTERVAL 1 MONTH))'
    );
  }

  if (ageMin !== undefined && ageMin !== '') {
    const parsedMin = parseInt(String(ageMin), 10);
    if (!isNaN(parsedMin)) {
      clauses.push(
        'u.date_of_birth IS NOT NULL AND YEAR(u.date_of_birth) <= YEAR(CURDATE()) - 10 AND TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) >= ?'
      );
      params.push(parsedMin);
    }
  }
  if (ageMax !== undefined && ageMax !== '') {
    const parsedMax = parseInt(String(ageMax), 10);
    if (!isNaN(parsedMax)) {
      clauses.push(
        'u.date_of_birth IS NOT NULL AND YEAR(u.date_of_birth) <= YEAR(CURDATE()) - 10 AND TIMESTAMPDIFF(YEAR, u.date_of_birth, CURDATE()) <= ?'
      );
      params.push(parsedMax);
    }
  }

  return { clauses, params };
}

export interface CallLogFilterInput {
  callStatuses?: string;
  lastCallDaysMin?: string;
  lastCallDaysMax?: string;
}

/** Builds parameterized SQL predicates for latest call status and days-since-last-call filters. */
export function buildCallLogWhereClauses(input: CallLogFilterInput): {
  clauses: string[];
  params: (string | number)[];
} {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  const { callStatuses, lastCallDaysMin, lastCallDaysMax } = input;

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
      params.push(...realStatuses);
    }
    if (hasNotCalled) {
      callConds.push(`NOT EXISTS (
        SELECT 1 FROM mos_lab.crm_call_logs ccl_all WHERE ccl_all.legacy_user_id = u.id
      )`);
    }
    if (callConds.length > 0) {
      clauses.push(`(${callConds.join(' OR ')})`);
    }
  }

  if (lastCallDaysMin !== undefined && lastCallDaysMin !== '') {
    const minDays = parseInt(String(lastCallDaysMin), 10);
    if (!isNaN(minDays)) {
      clauses.push(`EXISTS (
        SELECT 1 FROM mos_lab.crm_call_logs ccl_latest
        WHERE ccl_latest.legacy_user_id = u.id
          AND ccl_latest.id = (SELECT MAX(id) FROM mos_lab.crm_call_logs WHERE legacy_user_id = u.id)
          AND DATEDIFF(NOW(), ccl_latest.created_at) >= ?
      )`);
      params.push(minDays);
    }
  }

  if (lastCallDaysMax !== undefined && lastCallDaysMax !== '') {
    const maxDays = parseInt(String(lastCallDaysMax), 10);
    if (!isNaN(maxDays)) {
      clauses.push(`EXISTS (
        SELECT 1 FROM mos_lab.crm_call_logs ccl_latest
        WHERE ccl_latest.legacy_user_id = u.id
          AND ccl_latest.id = (SELECT MAX(id) FROM mos_lab.crm_call_logs WHERE legacy_user_id = u.id)
          AND DATEDIFF(NOW(), ccl_latest.created_at) <= ?
      )`);
      params.push(maxDays);
    }
  }

  return { clauses, params };
}
