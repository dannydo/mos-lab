import { FastifyInstance } from 'fastify';
import { SafeAny } from '@mos-lab/shared';
import { TouchpointConfigItem } from './customer-stats.types.js';

export interface SimpleStaffScopeResolution {
  isEmpty: boolean;
  allowedUserIds: number[] | null;
  excludedUserIds: number[] | null;
}

/**
 * Creates a per-registration DB version resolver cached for 30 seconds so
 * `/customers/stats` cache keys stay aligned with recent legacy order/combo writes.
 */
export function createStatsDbVersionGetter(): (fastify: FastifyInstance) => Promise<string> {
  let lastStatsDbVersion = '';
  let lastStatsDbVersionCheckedAt = 0;

  return async function getStatsDbVersion(fastify: FastifyInstance): Promise<string> {
    const now = Date.now();
    if (lastStatsDbVersion && now - lastStatsDbVersionCheckedAt < 30_000) {
      return lastStatsDbVersion;
    }
    try {
      const rows = await fastify.prisma.legacy.$queryRawUnsafe<{ max_order_id: number; max_usb_id: number }[]>(`
      SELECT 
        (SELECT MAX(id) FROM \`order\`) as max_order_id,
        (SELECT MAX(id) FROM user_service_balance) as max_usb_id
    `);
      const r = rows && rows[0] ? rows[0] : { max_order_id: 0, max_usb_id: 0 };
      lastStatsDbVersion = `${r.max_order_id || 0}:${r.max_usb_id || 0}`;
      lastStatsDbVersionCheckedAt = now;
      return lastStatsDbVersion;
    } catch {
      return `${Date.now()}`;
    }
  };
}

/**
 * Resolves staff assignment filtering (`all` / `unassigned` / `me` / staffId)
 * for LoCa and NYC batch stats endpoints.
 */
export async function resolveSimpleStaffScope(
  fastify: FastifyInstance,
  adminUser: { id: number },
  effectiveAssignedStaffId: string | undefined
): Promise<SimpleStaffScopeResolution> {
  if (effectiveAssignedStaffId && effectiveAssignedStaffId !== 'all' && effectiveAssignedStaffId !== 'ALL') {
    if (effectiveAssignedStaffId === 'unassigned') {
      const allAssignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        select: { legacyUserId: true },
      });
      return {
        isEmpty: false,
        allowedUserIds: null,
        excludedUserIds: allAssignments.map((a) => a.legacyUserId),
      };
    }

    let targetStaffId = adminUser.id;
    if (effectiveAssignedStaffId !== 'me') {
      targetStaffId = parseInt(effectiveAssignedStaffId, 10);
    }
    if (!isNaN(targetStaffId)) {
      const assignments = await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { staffId: targetStaffId },
        select: { legacyUserId: true },
      });
      const allowedUserIds = assignments.map((a) => a.legacyUserId);
      return {
        isEmpty: allowedUserIds.length === 0,
        allowedUserIds,
        excludedUserIds: null,
      };
    }
  }

  return {
    isEmpty: false,
    allowedUserIds: null,
    excludedUserIds: null,
  };
}

/**
 * Builds dynamic SUM(CASE ...) SELECT expressions for LoCa / NYC touchpoints.
 */
export function buildTouchpointSelects(
  touchpoints: readonly TouchpointConfigItem[] | SafeAny[],
  prefixPredicate = ''
): string {
  return touchpoints
    .map((tp: SafeAny) => {
      const min = tp.daysMin !== undefined ? Number(tp.daysMin) : 0;
      const max = tp.daysMax !== undefined ? Number(tp.daysMax) : min;
      if (min === max) {
        return `SUM(CASE WHEN ${prefixPredicate}daysSinceLastVisit = ${min} THEN 1 ELSE 0 END) as tp_${tp.key}`;
      }
      return `SUM(CASE WHEN ${prefixPredicate}daysSinceLastVisit BETWEEN ${min} AND ${max} THEN 1 ELSE 0 END) as tp_${tp.key}`;
    })
    .join(',\n          ');
}
