import { FastifyInstance } from 'fastify';
import type { SafeAny } from '@mos-lab/shared';

/**
 * Helper to query candidate staff profiles from legacy DB
 */
export async function queryStaffProfilesForTeam(fastify: FastifyInstance, teamCode: string): Promise<SafeAny[]> {
  try {
    if (teamCode === 'CC') {
      return await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT DISTINCT up.user_id as staffId, up.full_name as displayName, up.username,
            COALESCE(NULLIF(up.avatar, ''), NULLIF(up.avatar_internal, '')) as avatarUrl
          FROM \`user_profile\` up
          JOIN \`staff_profile\` sp ON sp.user_id = up.user_id
          LEFT JOIN \`user_group_language\` ugl ON up.user_group_id = ugl.user_group_id
          WHERE up.provider = 'Staff' AND up.is_disabled = 0
            AND (
              ugl.user_group_name LIKE '%Client Consultant%'
              OR up.user_id IN (SELECT DISTINCT user_id FROM \`staff_payroll_client_consultant\`)
              OR up.full_name LIKE '%CC%'
            )
          ORDER BY up.full_name ASC
        `);
    }

    if (teamCode === 'CV') {
      return await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT DISTINCT up.user_id as staffId, up.full_name as displayName, up.username,
            COALESCE(NULLIF(up.avatar, ''), NULLIF(up.avatar_internal, '')) as avatarUrl
          FROM \`user_profile\` up
          JOIN \`staff_profile\` sp ON sp.user_id = up.user_id
          LEFT JOIN \`user_group_language\` ugl ON up.user_group_id = ugl.user_group_id
          WHERE up.provider = 'Staff' AND up.is_disabled = 0
            AND (
              ugl.user_group_name LIKE '%Chuyên viên%'
              OR ugl.user_group_name LIKE '%Kỹ thuật viên%'
              OR ugl.user_group_name LIKE '%Technician%'
              OR up.full_name LIKE '%CV%'
              OR up.full_name LIKE '%KTV%'
              OR up.user_id IN (SELECT DISTINCT assigned_staff_id FROM \`order_service\` WHERE assigned_staff_id > 0)
            )
          ORDER BY up.full_name ASC
        `);
    }

    // Approved CRM staff candidate resolution for BK_TELESALES (PEOPLE-003):
    // Automatically include all active CRM staff with role 'telesales' and a valid legacyStaffId.
    let activeCrmLegacyIds: number[] = [];
    if (teamCode === 'BK_TELESALES') {
      try {
        const staffList = await fastify.prisma.crm.crmStaff.findMany({
          where: {
            isActive: true,
            role: 'telesales',
            legacyStaffId: { not: null },
          },
          select: { id: true, legacyStaffId: true, isActive: true, role: true },
        });
        activeCrmLegacyIds = staffList.map((s) => Number(s.legacyStaffId)).filter((id) => !isNaN(id) && id > 0);
      } catch (err) {
        // A failed exception lookup must not remove the normal eligible candidates.
        fastify.log.error(err as SafeAny, 'Could not validate approved BK staff exception');
      }
    }

    // UNION keeps the original INNER-JOIN candidate set and includes active CRM telesales identities.
    const hasCrmException = activeCrmLegacyIds.length > 0;
    const crmPlaceholders = activeCrmLegacyIds.map(() => '?').join(', ');

    return await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `
        SELECT DISTINCT up.user_id as staffId, up.full_name as displayName, up.username,
          COALESCE(NULLIF(up.avatar, ''), NULLIF(up.avatar_internal, '')) as avatarUrl
        FROM \`user_profile\` up
        JOIN \`staff_profile\` sp ON sp.user_id = up.user_id
        WHERE up.provider IN ('Staff', 'Google') AND up.is_disabled = 0
        ${
          hasCrmException
            ? `
        UNION
        SELECT DISTINCT up.user_id as staffId, up.full_name as displayName, up.username,
          COALESCE(NULLIF(up.avatar, ''), NULLIF(up.avatar_internal, '')) as avatarUrl
        FROM \`user_profile\` up
        WHERE up.provider IN ('Staff', 'Google') AND up.is_disabled = 0 AND up.user_id IN (${crmPlaceholders})
        `
            : ''
        }
        ORDER BY displayName ASC
      `,
      ...(hasCrmException ? activeCrmLegacyIds : [])
    );
  } catch (err) {
    fastify.log.error(err as SafeAny, `Error querying staff profiles for team ${teamCode}`);
    return [];
  }
}

/**
 * Auto-provisions a default staff_profile row in legacy DB if one is missing for an active staff member.
 * Ensures that newly onboarded employees have full operational records across both systems.
 */
export async function ensureLegacyStaffProfile(fastify: FastifyInstance, legacyStaffId: number): Promise<boolean> {
  if (!legacyStaffId || legacyStaffId <= 0) return false;

  try {
    // 1. Check if staff_profile already exists
    const existing = await fastify.prisma.legacy.$queryRawUnsafe<{ id: number }[]>(
      'SELECT id FROM `staff_profile` WHERE user_id = ? LIMIT 1',
      legacyStaffId
    );
    if (existing.length > 0) return false;

    // 2. Query basic info from user_profile
    const userProfiles = await fastify.prisma.legacy.$queryRawUnsafe<
      { client_id: number; client_business_id: number; full_name: string | null }[]
    >('SELECT client_id, client_business_id, full_name FROM `user_profile` WHERE user_id = ? LIMIT 1', legacyStaffId);
    if (userProfiles.length === 0) return false;

    const up = userProfiles[0];
    const clientId = up.client_id || 11;
    const clientBusinessId = up.client_business_id || 1;
    const fullName = up.full_name || null;

    // 3. Provision default staff_profile
    await fastify.prisma.legacy.$executeRawUnsafe(
      `INSERT INTO \`staff_profile\` (
          client_id, client_business_id, user_id, full_name,
          day_off_available, day_off_reserve, working_date_start, payroll_date_start
        ) VALUES (?, ?, ?, ?, 0, 0, NOW(), NOW())`,
      clientId,
      clientBusinessId,
      legacyStaffId,
      fullName
    );
    fastify.log.info({ legacyStaffId, fullName }, 'Auto-provisioned staff_profile in legacy database');
    return true;
  } catch (err) {
    fastify.log.warn({ err, legacyStaffId }, 'Could not auto-provision staff_profile for legacy staff');
    return false;
  }
}

/** Preserve identity data for selected members who no longer match a team's candidate-role heuristics. */
export async function queryStaffProfilesByLegacyIds(
  fastify: FastifyInstance,
  legacyStaffIds: number[]
): Promise<SafeAny[]> {
  if (legacyStaffIds.length === 0) return [];

  const placeholders = legacyStaffIds.map(() => '?').join(', ');
  try {
    return await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT DISTINCT up.user_id as staffId, up.full_name as displayName, up.username,
          COALESCE(NULLIF(up.avatar, ''), NULLIF(up.avatar_internal, '')) as avatarUrl
         FROM \`user_profile\` up
         WHERE up.user_id IN (${placeholders})
         ORDER BY up.full_name ASC`,
      ...legacyStaffIds
    );
  } catch (err) {
    fastify.log.error(err as SafeAny, 'Error querying selected staff profiles by legacy ID');
    return [];
  }
}
