import { FastifyInstance } from 'fastify';
import { Team, TeamMember, TeamStaffOption, UpsertTeamRequest, SafeAny } from '@mos-lab/shared';

export class TeamService {
  /**
   * Get active legacy staff IDs for a team code from crm_teams + crm_team_members
   */
  static async getActiveStaffIds(fastify: FastifyInstance, teamCode: string): Promise<number[] | null> {
    try {
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
    } catch (err) {
      fastify.log.error(err as SafeAny, `Error fetching active staff IDs for team ${teamCode}`);
    }
    return null;
  }

  /**
   * Read from crm_teams DB first, fallback to crmConfig key
   */
  static async getActiveStaffIdsWithFallback(
    fastify: FastifyInstance,
    teamCode: string,
    fallbackConfigKey: string
  ): Promise<number[]> {
    // 1. Try new DB
    const activeIdsFromTeam = await this.getActiveStaffIds(fastify, teamCode);
    if (activeIdsFromTeam && activeIdsFromTeam.length > 0) {
      return activeIdsFromTeam;
    }

    // 2. Fallback to crmConfig
    try {
      const configRecord = await fastify.prisma.crm.crmConfig.findUnique({
        where: { key: fallbackConfigKey },
      });
      if (configRecord && configRecord.value) {
        const parsed = JSON.parse(configRecord.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((id) => Number(id)).filter((id) => !isNaN(id));
        }
      }
    } catch (err) {
      fastify.log.error(err as SafeAny, `Error fetching ${fallbackConfigKey} from crmConfig`);
    }

    return [];
  }

  /**
   * List all teams with child teams (hierarchy) and member counts
   */
  static async listTeams(fastify: FastifyInstance): Promise<Team[]> {
    const teams = await fastify.prisma.crm.crmTeam.findMany({
      where: { parentTeamId: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        children: {
          orderBy: { sortOrder: 'asc' },
          include: {
            members: {
              where: { isActive: true },
            },
          },
        },
        members: {
          where: { isActive: true },
        },
      },
    });

    // Format output
    return teams.map((t) => ({
      id: t.id,
      code: t.code,
      name: t.name,
      description: t.description,
      color: t.color,
      icon: t.icon,
      sortOrder: t.sortOrder,
      isActive: Boolean(t.isActive),
      parentTeamId: t.parentTeamId,
      metadata: t.metadata ? (JSON.parse(t.metadata) as Record<string, unknown>) : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      memberCount: t.members.length,
      activeStaffIds: t.members.map((m) => m.legacyStaffId),
      children: t.children.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        description: c.description,
        color: c.color,
        icon: c.icon,
        sortOrder: c.sortOrder,
        isActive: Boolean(c.isActive),
        parentTeamId: c.parentTeamId,
        metadata: c.metadata ? (JSON.parse(c.metadata) as Record<string, unknown>) : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        memberCount: c.members.length,
        activeStaffIds: c.members.map((m) => m.legacyStaffId),
      })),
    }));
  }

  /**
   * Get team details by code, active members, and all potential staff options
   */
  static async getTeamDetailByCode(fastify: FastifyInstance, code: string) {
    const team = await fastify.prisma.crm.crmTeam.findUnique({
      where: { code },
      include: {
        members: true,
      },
    });

    if (!team) {
      return null;
    }

    const activeMemberLegacyIds = new Set(team.members.filter((m) => Boolean(m.isActive)).map((m) => m.legacyStaffId));

    // Query staff profiles from legacy DB based on team code heuristics
    const staffProfiles = await this.queryStaffProfilesForTeam(fastify, code);

    const activeMemberMap = new Map<number, TeamMember>();
    team.members.forEach((m) => {
      activeMemberMap.set(m.legacyStaffId, {
        id: m.id,
        teamId: m.teamId,
        legacyStaffId: m.legacyStaffId,
        crmStaffId: m.crmStaffId,
        displayName: m.displayName,
        role: m.role,
        isActive: Boolean(m.isActive),
        sortOrder: m.sortOrder,
        joinedAt: m.joinedAt.toISOString(),
        leftAt: m.leftAt ? m.leftAt.toISOString() : null,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
      });
    });

    const members: TeamStaffOption[] = Array.from(activeMemberLegacyIds).map((legacyId) => {
      const dbMember = activeMemberMap.get(legacyId);
      const profile = staffProfiles.find((sp) => Number(sp.staffId) === legacyId);
      return {
        staffId: legacyId,
        crmStaffId: dbMember?.crmStaffId ?? undefined,
        displayName: profile?.displayName || dbMember?.displayName || `Legacy Staff #${legacyId}`,
        username: profile?.username || undefined,
        isActive: true,
        role: dbMember?.role || undefined,
      };
    });

    const existingStaffIdsInProfiles = new Set(staffProfiles.map((s) => Number(s.staffId)));

    const allStaffOptions: TeamStaffOption[] = staffProfiles.map((s) => {
      const legacyId = Number(s.staffId);
      const dbMember = activeMemberMap.get(legacyId);
      return {
        staffId: legacyId,
        crmStaffId: dbMember?.crmStaffId ?? undefined,
        displayName: s.displayName,
        username: s.username,
        isActive: activeMemberLegacyIds.has(legacyId),
        role: dbMember?.role || undefined,
      };
    });

    // Merge any active DB members that weren't included in staffProfiles candidate search
    activeMemberLegacyIds.forEach((legacyId) => {
      if (!existingStaffIdsInProfiles.has(legacyId)) {
        const dbMember = activeMemberMap.get(legacyId);
        allStaffOptions.push({
          staffId: legacyId,
          crmStaffId: dbMember?.crmStaffId ?? undefined,
          displayName: dbMember?.displayName || `Legacy Staff #${legacyId}`,
          username: undefined,
          isActive: true,
          role: dbMember?.role || undefined,
        });
      }
    });

    const formattedTeam: Team = {
      id: team.id,
      code: team.code,
      name: team.name,
      description: team.description,
      color: team.color,
      icon: team.icon,
      sortOrder: team.sortOrder,
      isActive: Boolean(team.isActive),
      parentTeamId: team.parentTeamId,
      metadata: team.metadata ? (JSON.parse(team.metadata) as Record<string, unknown>) : null,
      createdAt: team.createdAt.toISOString(),
      updatedAt: team.updatedAt.toISOString(),
      memberCount: members.length,
    };

    return {
      team: formattedTeam,
      members,
      allStaffOptions,
    };
  }

  /**
   * Helper to query candidate staff profiles from legacy DB
   */
  private static async queryStaffProfilesForTeam(fastify: FastifyInstance, teamCode: string): Promise<SafeAny[]> {
    try {
      if (teamCode === 'CC') {
        return await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
          SELECT DISTINCT up.user_id as staffId, up.full_name as displayName, up.username
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
          SELECT DISTINCT up.user_id as staffId, up.full_name as displayName, up.username
          FROM \`user_profile\` up
          JOIN \`staff_profile\` sp ON sp.user_id = up.user_id
          LEFT JOIN \`user_group_language\` ugl ON up.user_group_id = ugl.user_group_id
          WHERE up.provider = 'Staff' AND up.is_disabled = 0
            AND (
              ugl.user_group_name LIKE '%Kỹ thuật viên%'
              OR ugl.user_group_name LIKE '%Technician%'
              OR up.full_name LIKE '%KTV%'
              OR up.user_id IN (SELECT DISTINCT assigned_staff_id FROM \`order_service\` WHERE assigned_staff_id > 0)
            )
          ORDER BY up.full_name ASC
        `);
      }

      // Default/BK/Subteams query: all active staff profiles
      return await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT DISTINCT up.user_id as staffId, up.full_name as displayName, up.username
        FROM \`user_profile\` up
        JOIN \`staff_profile\` sp ON sp.user_id = up.user_id
        WHERE up.provider = 'Staff' AND up.is_disabled = 0
        ORDER BY up.full_name ASC
      `);
    } catch (err) {
      fastify.log.error(err as SafeAny, `Error querying staff profiles for team ${teamCode}`);
      return [];
    }
  }

  /**
   * Update team members by legacy staff IDs
   */
  static async updateTeamMembers(fastify: FastifyInstance, teamId: number, activeStaffIds: number[]): Promise<void> {
    const activeSet = new Set(activeStaffIds.map((id) => Number(id)));

    // Fetch CRM staff records to link crmStaffId if available
    const crmStaffRecords = await fastify.prisma.crm.crmStaff.findMany({
      where: {
        legacyStaffId: { in: Array.from(activeSet) },
      },
    });
    const crmStaffMap = new Map<number, number>();
    crmStaffRecords.forEach((cs) => {
      if (cs.legacyStaffId) {
        crmStaffMap.set(cs.legacyStaffId, cs.id);
      }
    });

    // 1. Set isActive = false for members not in activeSet
    await fastify.prisma.crm.crmTeamMember.updateMany({
      where: {
        teamId,
        legacyStaffId: { notIn: Array.from(activeSet) },
      },
      data: {
        isActive: false,
      },
    });

    // 2. Upsert active members
    for (const legacyStaffId of activeSet) {
      const crmStaffId = crmStaffMap.get(legacyStaffId) ?? null;
      await fastify.prisma.crm.crmTeamMember.upsert({
        where: {
          teamId_legacyStaffId: {
            teamId,
            legacyStaffId,
          },
        },
        update: {
          isActive: true,
          crmStaffId,
        },
        create: {
          teamId,
          legacyStaffId,
          crmStaffId,
          isActive: true,
        },
      });
    }
  }

  /**
   * Upsert Team definition
   */
  static async upsertTeam(fastify: FastifyInstance, data: UpsertTeamRequest, id?: number) {
    const metadataStr = data.metadata ? JSON.stringify(data.metadata) : undefined;

    if (id) {
      return await fastify.prisma.crm.crmTeam.update({
        where: { id },
        data: {
          code: data.code,
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
          parentTeamId: data.parentTeamId,
          metadata: metadataStr,
        },
      });
    }

    return await fastify.prisma.crm.crmTeam.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        sortOrder: data.sortOrder ?? 0,
        isActive: data.isActive ?? true,
        parentTeamId: data.parentTeamId,
        metadata: metadataStr,
      },
    });
  }
}
