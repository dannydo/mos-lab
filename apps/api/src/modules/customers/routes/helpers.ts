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

/**
 * Evaluates totalSpent / totalVisits predicates via a standalone GROUP BY on
 * `order` rather than joining a derived table across MariaDB 10.3 multi-table
 * customer queries (which prevents key pushdown and causes full scans).
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

  const scopePredicate =
    allowedUserIds !== null && allowedUserIds.length > 0 && allowedUserIds.length <= 5000
      ? ` AND user_id IN (${allowedUserIds.join(',')})`
      : '';

  if (!zeroMatches) {
    const matchedRows = await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number | bigint }[]>(
      `SELECT user_id
       FROM \`order\`
       WHERE order_state = 'Completed'${scopePredicate}
       GROUP BY user_id
       HAVING ${havingClauses.join(' AND ')}`,
      ...havingParams
    );
    const matchedIds = matchedRows.map((r) => Number(r.user_id));
    if (matchedIds.length === 0) {
      return { allowedUserIds: [], excludedUserIds, isEmpty: true };
    }
    if (allowedUserIds !== null) {
      const matchedSet = new Set(matchedIds);
      const nextAllowed = allowedUserIds.filter((id) => matchedSet.has(id));
      return {
        allowedUserIds: nextAllowed,
        excludedUserIds,
        isEmpty: nextAllowed.length === 0,
      };
    }
    return {
      allowedUserIds: matchedIds,
      excludedUserIds,
      isEmpty: false,
    };
  }

  const rejectedRows = await fastify.prisma.legacy.$queryRawUnsafe<{ user_id: number | bigint }[]>(
    `SELECT user_id
     FROM \`order\`
     WHERE order_state = 'Completed'${scopePredicate}
     GROUP BY user_id
     HAVING NOT (${havingClauses.join(' AND ')})`,
    ...havingParams
  );
  const rejectedIds = rejectedRows.map((r) => Number(r.user_id));
  if (rejectedIds.length === 0) {
    return { allowedUserIds, excludedUserIds, isEmpty: false };
  }

  const rejectedSet = new Set(rejectedIds);
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
      ? Array.from(new Set([...excludedUserIds, ...rejectedIds]))
      : rejectedIds;
  return {
    allowedUserIds,
    excludedUserIds: nextExcluded,
    isEmpty: false,
  };
};

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
