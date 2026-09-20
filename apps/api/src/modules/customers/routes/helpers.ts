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
      message: 'Telesales chỉ được xem và thao tác trên khách hàng đã được phân bổ cho mình.',
    });
    return false;
  },
});

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
