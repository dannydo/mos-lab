import { FastifyInstance } from 'fastify';
import { CustomerAccessService } from '../../services/customer-access.service.js';
import {
  AppointmentAuthUser,
  AppointmentsListQuery,
  AppointmentsScopeResult,
  LegacyQueryRows,
} from './appointments.types.js';

export function parseRequestedStoreIds(storeId?: string): number[] {
  if (!storeId || storeId === 'all') return [];
  return String(storeId)
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !isNaN(n));
}

async function resolveMissedFilterSql(
  fastify: FastifyInstance,
  type: AppointmentsListQuery['type'],
  missedStatusFilter: AppointmentsListQuery['missedStatusFilter']
): Promise<string> {
  if (type !== 'missed' || !missedStatusFilter || missedStatusFilter === 'ALL') {
    return '';
  }

  // Query crm_missed_logs IDs via Prisma CRM Client to avoid raw SQL cross-database issues
  if (missedStatusFilter === 'UNTAGGED') {
    const logs = await fastify.prisma.crm.crmMissedLog.findMany({ select: { orderId: true } });
    if (logs.length > 0) {
      const ids = logs.map((l) => l.orderId).join(',');
      return ` AND o.id NOT IN (${ids})`;
    }
    return '';
  }

  if (missedStatusFilter === 'FOLLOWUP') {
    const logs = await fastify.prisma.crm.crmMissedLog.findMany({
      where: { followUpStatus: { in: ['PENDING', 'CONTACTED'] } },
      select: { orderId: true },
    });
    if (logs.length > 0) {
      const ids = logs.map((l) => l.orderId).join(',');
      return ` AND o.id IN (${ids})`;
    }
    return ` AND 1=0`;
  }

  if (missedStatusFilter === 'RESOLVED') {
    const logs = await fastify.prisma.crm.crmMissedLog.findMany({
      where: { followUpStatus: { in: ['RESCHEDULED', 'CANCELLED', 'UNREACHABLE'] } },
      select: { orderId: true },
    });
    if (logs.length > 0) {
      const ids = logs.map((l) => l.orderId).join(',');
      return ` AND o.id IN (${ids})`;
    }
    return ` AND 1=0`;
  }

  return '';
}

export async function resolveAppointmentsScope(
  fastify: FastifyInstance,
  user: AppointmentAuthUser,
  query: AppointmentsListQuery
): Promise<AppointmentsScopeResult> {
  const { type, staffId, missedStatusFilter } = query;

  // 1. Determine the target staff assignments or appointment filters
  let filterByStaff = false;
  let targetStaffId = user.id;

  if (user.role === 'admin') {
    if (staffId && staffId !== 'all') {
      targetStaffId = parseInt(staffId, 10);
      filterByStaff = !isNaN(targetStaffId);
    }
  } else {
    filterByStaff = true;
  }

  let staffLegacyId: number | null = null;
  let staffRole = 'telesales';

  if (filterByStaff) {
    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: targetStaffId },
    });

    if (staff) {
      staffRole = staff.role;
      // Strip " CC" suffix from name if it exists to match legacy user full_name
      const cleanName = staff.displayName.replace(/\s+CC$/i, '').trim();

      const profiles = await fastify.prisma.legacy.$queryRawUnsafe<LegacyQueryRows>(
        `
        SELECT up.user_id as userId
        FROM \`staff_profile\` sp
        JOIN \`user_profile\` up ON sp.user_id = up.user_id
        WHERE up.provider = 'Staff' AND up.is_disabled = 0
          AND (up.full_name = ? OR up.full_name = ?)
        ORDER BY up.user_id DESC
        LIMIT 1
      `,
        cleanName,
        cleanName + ' '
      );

      if (profiles.length > 0) {
        staffLegacyId = Number(profiles[0].userId);
      }
    }
  }

  // If staff selected but no corresponding legacy user found, return empty list
  if (filterByStaff && !staffLegacyId) {
    return { empty: true };
  }

  const telesalesAssignmentIds = CustomerAccessService.isTelesales(user)
    ? await fastify.prisma.crm.crmCustomerAssignment.findMany({
        where: { staffId: user.id },
        select: { legacyUserId: true },
      })
    : [];
  if (CustomerAccessService.isTelesales(user) && telesalesAssignmentIds.length === 0) {
    return { empty: true };
  }

  const telesalesCustomerIdSql = telesalesAssignmentIds.map((assignment) => assignment.legacyUserId).join(',');
  const missedFilterCond = await resolveMissedFilterSql(fastify, type, missedStatusFilter);

  return {
    empty: false,
    filterByStaff,
    staffLegacyId,
    staffRole,
    telesalesCustomerIdSql,
    missedFilterCond,
  };
}
