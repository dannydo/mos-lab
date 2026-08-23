import { FastifyInstance } from 'fastify';
import {
  Department,
  Team,
  TeamListResponse,
  TeamMember,
  TeamStaffOption,
  UpsertTeamRequest,
  SafeAny,
} from '@mos-lab/shared';

const TEAM_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,29}$/;

export class TeamConfigurationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = 'TeamConfigurationError';
  }
}

/** Team codes are stable integration keys; never silently rewrite an invalid code. */
export function normalizeTeamCode(value: string): string {
  const code = value.trim().toUpperCase();
  if (!TEAM_CODE_PATTERN.test(code)) {
    throw new TeamConfigurationError('Mã team dùng chữ in hoa, số và dấu gạch dưới; bắt đầu bằng chữ cái.');
  }
  return code;
}

/** Accept only browser-safe absolute avatar URLs from the legacy staff profile. */
export function normalizeStaffAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const avatarUrl = value.trim();
  if (!avatarUrl) return null;

  try {
    const parsed = new URL(avatarUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? avatarUrl : null;
  } catch {
    return null;
  }
}

function parseMetadata(metadata: string | null): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function formatDepartment(department: SafeAny): Department {
  return {
    id: department.id,
    code: department.code,
    name: department.name,
    description: department.description,
    color: department.color,
    icon: department.icon,
    sortOrder: department.sortOrder,
    isActive: Boolean(department.isActive),
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
  };
}

function formatTeam(team: SafeAny): Team {
  const members = Array.isArray(team.members) ? team.members : [];
  return {
    id: team.id,
    code: team.code,
    name: team.name,
    description: team.description,
    color: team.color,
    icon: team.icon,
    sortOrder: team.sortOrder,
    isActive: Boolean(team.isActive),
    departmentId: team.departmentId,
    department: team.department ? formatDepartment(team.department) : null,
    parentTeamId: team.parentTeamId,
    metadata: parseMetadata(team.metadata),
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
    memberCount: members.length,
    activeStaffIds: members.map((member: SafeAny) => member.legacyStaffId),
    children: [],
  };
}

export class TeamService {
  /**
   * Get active legacy staff IDs for a team code from crm_teams + crm_team_members
   */
  static async getActiveStaffIds(fastify: FastifyInstance, teamCode: string): Promise<number[] | null> {
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
  static async getActiveStaffIdsWithFallback(
    fastify: FastifyInstance,
    teamCode: string,
    fallbackConfigKey: string
  ): Promise<number[]> {
    let candidateIds: number[] = [];

    // 1. Try new DB
    const activeIdsFromTeam = await this.getActiveStaffIds(fastify, teamCode);
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

      // Also filter out any staff whose crmStaff record is explicitly set to isActive = false
      const disabledCrmStaff = await fastify.prisma.crm.crmStaff.findMany({
        where: {
          isActive: false,
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
  static async isActiveCrmStaffMember(
    fastify: FastifyInstance,
    teamCode: string,
    crmStaffId: number,
    fallbackConfigKey: string
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

      const activeLegacyStaffIds = await this.getActiveStaffIdsWithFallback(fastify, teamCode, fallbackConfigKey);
      return activeLegacyStaffIds.includes(legacyStaffId);
    } catch (err) {
      fastify.log.error(err as SafeAny, `Error checking CRM staff membership for team ${teamCode}`);
      return false;
    }
  }

  /**
   * List all teams with child teams (hierarchy) and member counts
   */
  static async listTeams(fastify: FastifyInstance): Promise<TeamListResponse> {
    const [departments, teamRows] = await Promise.all([
      fastify.prisma.crm.crmDepartment.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      fastify.prisma.crm.crmTeam.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          department: true,
          members: { where: { isActive: true } },
        },
      }),
    ]);

    const teamById = new Map<number, Team>();
    teamRows.forEach((row) => teamById.set(row.id, formatTeam(row)));

    const roots: Team[] = [];
    teamRows.forEach((row) => {
      const formatted = teamById.get(row.id)!;
      const parent = row.parentTeamId ? teamById.get(row.parentTeamId) : undefined;
      if (parent) {
        parent.children = [...(parent.children || []), formatted];
      } else {
        roots.push(formatted);
      }
    });

    return {
      departments: departments.map(formatDepartment),
      teams: roots,
    };
  }

  /**
   * Get team details by code, active members, and all potential staff options
   */
  static async getTeamDetailByCode(fastify: FastifyInstance, code: string) {
    const team = await fastify.prisma.crm.crmTeam.findUnique({
      where: { code },
      include: {
        members: true,
        department: true,
      },
    });

    if (!team) {
      return null;
    }

    const activeMemberLegacyIds = new Set(team.members.filter((m) => Boolean(m.isActive)).map((m) => m.legacyStaffId));

    // Query staff profiles from legacy DB based on team code heuristics
    const staffProfiles = await this.queryStaffProfilesForTeam(fastify, code);
    const candidateStaffIds = new Set(staffProfiles.map((profile) => Number(profile.staffId)));
    const missingMemberIds = Array.from(activeMemberLegacyIds).filter((staffId) => !candidateStaffIds.has(staffId));
    if (missingMemberIds.length > 0) {
      staffProfiles.push(...(await this.queryStaffProfilesByLegacyIds(fastify, missingMemberIds)));
    }

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
        avatarUrl: normalizeStaffAvatarUrl(profile?.avatarUrl),
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
        avatarUrl: normalizeStaffAvatarUrl(s.avatarUrl),
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
          avatarUrl: null,
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
      departmentId: team.departmentId,
      department: team.department ? formatDepartment(team.department) : null,
      parentTeamId: team.parentTeamId,
      metadata: parseMetadata(team.metadata),
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

      // Default/BK/Subteams query: all active staff profiles
      return await fastify.prisma.legacy.$queryRawUnsafe<SafeAny[]>(`
        SELECT DISTINCT up.user_id as staffId, up.full_name as displayName, up.username,
          COALESCE(NULLIF(up.avatar, ''), NULLIF(up.avatar_internal, '')) as avatarUrl
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

  /** Preserve identity data for selected members who no longer match a team's candidate-role heuristics. */
  private static async queryStaffProfilesByLegacyIds(
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
         WHERE up.provider = 'Staff' AND up.user_id IN (${placeholders})
         ORDER BY up.full_name ASC`,
        ...legacyStaffIds
      );
    } catch (err) {
      fastify.log.error(err as SafeAny, 'Error querying selected staff profiles by legacy ID');
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
    const name = data.name?.trim();
    if (!name) {
      throw new TeamConfigurationError('Tên team là bắt buộc.');
    }

    const existing = id
      ? await fastify.prisma.crm.crmTeam.findUnique({
          where: { id },
          include: { _count: { select: { children: true } } },
        })
      : null;

    if (id && !existing) {
      throw new TeamConfigurationError('Không tìm thấy team cần cập nhật.', 404);
    }

    const code = existing ? existing.code : normalizeTeamCode(data.code || '');
    if (existing && data.code && data.code !== existing.code) {
      throw new TeamConfigurationError('Mã team là khóa ổn định và không thể đổi sau khi tạo.');
    }

    const parentTeamId = data.parentTeamId ? Number(data.parentTeamId) : null;
    const departmentId = await this.resolveDepartmentId(fastify, {
      parentTeamId,
      departmentId: data.departmentId,
      teamId: id,
      currentDepartmentId: existing?.departmentId ?? null,
    });

    if (existing && existing._count.children > 0 && departmentId !== existing.departmentId) {
      throw new TeamConfigurationError(
        'Không thể đổi Department của team đang có team con. Hãy chuyển các team con trước.'
      );
    }

    const metadataStr = data.metadata ? JSON.stringify(data.metadata) : undefined;
    const payload = {
      name,
      description: data.description?.trim() || null,
      color: data.color?.trim() || null,
      icon: data.icon?.trim() || null,
      sortOrder: Number.isFinite(data.sortOrder) ? Math.max(0, Math.round(data.sortOrder!)) : 0,
      isActive: data.isActive ?? true,
      departmentId,
      parentTeamId,
      ...(metadataStr !== undefined ? { metadata: metadataStr } : {}),
    };

    if (existing) {
      return fastify.prisma.crm.crmTeam.update({
        where: { id: existing.id },
        data: payload,
        include: { department: true, members: { where: { isActive: true } } },
      });
    }

    return fastify.prisma.crm.crmTeam.create({
      data: { code, ...payload },
      include: { department: true, members: { where: { isActive: true } } },
    });
  }

  /** Delete only a true leaf to preserve team membership and historical audit. */
  static async deleteTeam(fastify: FastifyInstance, id: number): Promise<{ code: string }> {
    const team = await fastify.prisma.crm.crmTeam.findUnique({
      where: { id },
      include: { _count: { select: { children: true, members: true } } },
    });
    if (!team) throw new TeamConfigurationError('Không tìm thấy team cần xóa.', 404);
    if (team._count.children > 0 || team._count.members > 0) {
      throw new TeamConfigurationError('Chỉ có thể xóa team trống, không có thành viên và không có team trực thuộc.');
    }

    await fastify.prisma.crm.$transaction(async (tx) => {
      await tx.crmTeam.delete({ where: { id } });
      await tx.crmConfig.deleteMany({ where: { key: `ACTIVE_${team.code}_STAFF_CONFIG` } });
    });
    return { code: team.code };
  }

  private static async resolveDepartmentId(
    fastify: FastifyInstance,
    input: {
      parentTeamId: number | null;
      departmentId?: number | null;
      teamId?: number;
      currentDepartmentId: number | null;
    }
  ): Promise<number> {
    if (input.parentTeamId) {
      if (input.teamId && input.parentTeamId === input.teamId) {
        throw new TeamConfigurationError('Một team không thể là team cha của chính nó.');
      }

      const parent = await fastify.prisma.crm.crmTeam.findUnique({
        where: { id: input.parentTeamId },
        select: { id: true, parentTeamId: true, departmentId: true, isActive: true },
      });
      if (!parent || !parent.isActive) {
        throw new TeamConfigurationError('Team cha không tồn tại hoặc đã ngừng hoạt động.');
      }
      if (!parent.departmentId) {
        throw new TeamConfigurationError('Team cha chưa được gán Department. Hãy gán Department cho team cha trước.');
      }

      let ancestorId: number | null = parent.id;
      while (ancestorId) {
        if (ancestorId === input.teamId) {
          throw new TeamConfigurationError('Không thể đặt team vào một team con của chính nó.');
        }
        const ancestor: { parentTeamId: number | null } | null = await fastify.prisma.crm.crmTeam.findUnique({
          where: { id: ancestorId },
          select: { parentTeamId: true },
        });
        ancestorId = ancestor?.parentTeamId ?? null;
      }

      if (input.departmentId && Number(input.departmentId) !== parent.departmentId) {
        throw new TeamConfigurationError('Team trực thuộc phải dùng cùng Department với team cha.');
      }
      return parent.departmentId;
    }

    const resolvedDepartmentId = input.departmentId ?? input.currentDepartmentId;
    if (!resolvedDepartmentId) {
      throw new TeamConfigurationError('Hãy chọn Department cho team.');
    }

    const department = await fastify.prisma.crm.crmDepartment.findUnique({
      where: { id: Number(resolvedDepartmentId) },
      select: { id: true, isActive: true },
    });
    if (!department || !department.isActive) {
      throw new TeamConfigurationError('Department không tồn tại hoặc đã ngừng hoạt động.');
    }
    return department.id;
  }
}
