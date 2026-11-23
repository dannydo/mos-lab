import { FastifyInstance } from 'fastify';
import type { SafeAny } from '@mos-lab/shared';

/**
 * Get active legacy staff IDs for a team code from crm_teams + crm_team_members
 */
export async function getActiveStaffIds(fastify: FastifyInstance, teamCode: string): Promise<number[] | null> {
  try {
    if (teamCode === 'BK') {
      const teams = await fastify.prisma.crm.crmTeam.findMany({
        where: {
          OR: [
            { code: 'BK' },
            { code: { in: ['BK_TELESALES', 'BK_CS', 'BK_CONTROL'] } },
            { parent: { code: 'BK' }, code: { not: 'BK_OTHER' } },
          ],
        },
        include: {
          members: {
            where: { isActive: true },
          },
        },
      });

      const staffIds = new Set<number>();
      teams.forEach((t) => {
        t.members.forEach((m: SafeAny) => staffIds.add(m.legacyStaffId));
      });

      if (staffIds.size > 0) {
        return Array.from(staffIds);
      }
    } else {
      const team = await fastify.prisma.crm.crmTeam.findUnique({
        where: { code: teamCode },
        include: {
          members: {
            where: { isActive: true },
          },
        },
      });

      if (team && team.members.length > 0) {
        return team.members.map((m) => m.legacyStaffId);
      }
    }
  } catch (err) {
    fastify.log.error(err as SafeAny, `Error fetching active staff IDs for team ${teamCode}`);
  }
  return null;
}

/**
 * Read from crm_teams DB first, fallback to crmConfig key.
 * Automatically validates candidate staff IDs against user_profile to exclude disabled, leaved, or deleted staff.
 */
export async function getActiveStaffIdsWithFallback(
  fastify: FastifyInstance,
  teamCode: string,
  fallbackConfigKey: string,
  getActiveStaffIdsFn: typeof getActiveStaffIds = getActiveStaffIds
): Promise<number[]> {
  let candidateIds: number[] = [];

  // 1. Try new DB
  const activeIdsFromTeam = await getActiveStaffIdsFn(fastify, teamCode);
  if (activeIdsFromTeam && activeIdsFromTeam.length > 0) {
    candidateIds = activeIdsFromTeam;
  } else {
    // 2. Fallback to crmConfig
    try {
      const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: fallbackConfigKey },
      });
      if (configRecord && configRecord.value) {
        const parsed = JSON.parse(configRecord.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          candidateIds = parsed.map((id) => Number(id)).filter((id) => !isNaN(id));
        }
      }
    } catch (err) {
      fastify.log.error(err as SafeAny, `Error fetching ${fallbackConfigKey} from crmConfig`);
    }
  }

  if (candidateIds.length === 0) return [];

  // 3. Filter candidate IDs against legacy user_profile to ensure they are active and belong to the correct staff group
  try {
    let groupFilter = '';
    if (teamCode === 'CV') {
      groupFilter = ' AND user_group_id IN (4, 45)';
    } else if (teamCode === 'CC') {
      groupFilter = ' AND user_group_id IN (2, 5)';
    } else if (teamCode === 'BK') {
      groupFilter =
        ' AND (user_group_id IN (2, 3, 14, 31, 32, 45, 359) OR FIND_IN_SET("2", access_user_group_ids) OR FIND_IN_SET("31", access_user_group_ids) OR FIND_IN_SET("32", access_user_group_ids) OR FIND_IN_SET("45", access_user_group_ids))';
    }

    const activeRows = await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(
      `SELECT user_id FROM user_profile WHERE user_id IN (${candidateIds.join(',')}) AND is_disabled = 0 AND is_leaved = 0 AND is_deleted = 0${groupFilter}`
    );
    const activeSet = new Set<number>(activeRows.map((r) => Number(r.user_id)));

    // For CV salon roster, CRM login lock (isActive = false) must NOT wipe out salon booking slots.
    // Only exclude CV staff who have actually resigned/terminated in HR, while non-CV teams also respect isActive = false.
    const disabledCrmStaff = await fastify.prisma.crm.crmStaff.findMany({
      where:
        teamCode === 'CV'
          ? {
              employmentStatus: { in: ['RESIGNED', 'TERMINATED'] },
              legacyStaffId: { in: candidateIds },
            }
          : {
              OR: [{ isActive: false }, { employmentStatus: { in: ['RESIGNED', 'TERMINATED'] } }],
              legacyStaffId: { in: candidateIds },
            },
      select: { legacyStaffId: true },
    });
    const disabledCrmSet = new Set(
      disabledCrmStaff.map((s) => Number(s.legacyStaffId)).filter((id) => !isNaN(id) && id > 0)
    );

    return candidateIds.filter((id) => activeSet.has(id) && !disabledCrmSet.has(id));
  } catch {
    return candidateIds;
  }
}

/**
 * Check whether a signed-in CRM staff member belongs to an active team.
 *
 * Team membership is normally linked by crmStaffId. The legacyStaffId check
 * keeps existing production memberships valid while the team roster is being
 * synchronized from legacy staff records. If the team has not been seeded
 * yet, use its existing crmConfig roster as a transitional fallback.
 */
export async function isActiveCrmStaffMember(
  fastify: FastifyInstance,
  teamCode: string,
  crmStaffId: number,
  fallbackConfigKey: string,
  getActiveStaffIdsWithFallbackFn: typeof getActiveStaffIdsWithFallback = getActiveStaffIdsWithFallback
): Promise<boolean> {
  try {
    const [directMembership, staff] = await Promise.all([
      fastify.prisma.crm.crmTeamMember.findFirst({
        where: {
          crmStaffId,
          isActive: true,
          team: { code: teamCode, isActive: true },
        },
        select: { id: true },
      }),
      fastify.prisma.crm.crmStaff.findUnique({
        where: { id: crmStaffId },
        select: { legacyStaffId: true },
      }),
    ]);

    if (directMembership) return true;

    const legacyStaffId = Number(staff?.legacyStaffId);
    if (!legacyStaffId) return false;

    const legacyMembership = await fastify.prisma.crm.crmTeamMember.findFirst({
      where: {
        legacyStaffId,
        isActive: true,
        team: { code: teamCode, isActive: true },
      },
      select: { id: true },
    });

    if (legacyMembership) return true;

    const activeLegacyStaffIds = await getActiveStaffIdsWithFallbackFn(fastify, teamCode, fallbackConfigKey);
    return activeLegacyStaffIds.includes(legacyStaffId);
  } catch (err) {
    fastify.log.error(err as SafeAny, `Error checking CRM staff membership for team ${teamCode}`);
    return false;
  }
}

/**
 * Check active membership in any team belonging to a Department. Team
 * membership is the source of truth, while the legacy ID branch keeps
 * production rosters valid during CRM-staff synchronization.
 */
export async function isActiveCrmStaffMemberInDepartment(
  fastify: FastifyInstance,
  departmentCode: string,
  crmStaffId: number
): Promise<boolean> {
  try {
    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: crmStaffId },
      select: { legacyStaffId: true },
    });
    const legacyStaffId = Number(staff?.legacyStaffId);
    const member = await fastify.prisma.crm.crmTeamMember.findFirst({
      where: {
        isActive: true,
        team: {
          isActive: true,
          department: { code: departmentCode, isActive: true },
        },
        OR: [{ crmStaffId }, ...(legacyStaffId ? [{ legacyStaffId }] : [])],
      },
      select: { id: true },
    });
    return Boolean(member);
  } catch (err) {
    fastify.log.error(err as SafeAny, `Error checking CRM staff membership for department ${departmentCode}`);
    return false;
  }
}

/**
 * Returns active CRM team codes (uppercase) for a staff member across crmStaffId and legacyStaffId.
 */
export async function getActiveTeamCodesForStaff(
  fastify: FastifyInstance,
  crmStaffId: number,
  legacyStaffId?: number | null
): Promise<string[]> {
  try {
    const crm = fastify.prisma?.crm as SafeAny;
    if (!crm?.crmTeamMember?.findMany) return [];

    let resolvedLegacyId = Number(legacyStaffId || 0);
    if (!resolvedLegacyId && crm?.crmStaff?.findUnique && crmStaffId > 0) {
      const staffRow = await crm.crmStaff.findUnique({
        where: { id: crmStaffId },
        select: { legacyStaffId: true },
      });
      resolvedLegacyId = Number(staffRow?.legacyStaffId || 0);
    }

    const orFilters: SafeAny[] = [];
    if (crmStaffId > 0) orFilters.push({ crmStaffId });
    if (resolvedLegacyId > 0) orFilters.push({ legacyStaffId: resolvedLegacyId });
    if (orFilters.length === 0) return [];

    const rows = await crm.crmTeamMember.findMany({
      where: {
        isActive: true,
        team: { isActive: true },
        OR: orFilters,
      },
      select: { team: { select: { code: true } } },
    });

    const codes = new Set<string>();
    for (const row of rows || []) {
      const code = String(row?.team?.code || '')
        .trim()
        .toUpperCase();
      if (code) codes.add(code);
    }
    return Array.from(codes);
  } catch (err) {
    fastify.log.error(err as SafeAny, `Error resolving active team codes for staff #${crmStaffId}`);
    return [];
  }
}
