import { FastifyInstance } from 'fastify';
import { Team, TeamListResponse, TeamMember, TeamStaffOption, UpsertTeamRequest } from '@mos-lab/shared';
import {
  TeamConfigurationError,
  formatDepartment,
  formatTeam,
  normalizeStaffAvatarUrl,
  normalizeTeamCode,
  parseMetadata,
} from './team-formatters.js';
import {
  ensureLegacyStaffProfile,
  queryStaffProfilesByLegacyIds,
  queryStaffProfilesForTeam,
} from './team-legacy-profiles.js';

/**
 * List all teams with child teams (hierarchy) and member counts
 */
export async function listTeams(fastify: FastifyInstance): Promise<TeamListResponse> {
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
export async function getTeamDetailByCode(fastify: FastifyInstance, code: string) {
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
  const staffProfiles = await queryStaffProfilesForTeam(fastify, code);
  const candidateStaffIds = new Set(staffProfiles.map((profile) => Number(profile.staffId)));
  const missingMemberIds = Array.from(activeMemberLegacyIds).filter((staffId) => !candidateStaffIds.has(staffId));
  if (missingMemberIds.length > 0) {
    staffProfiles.push(...(await queryStaffProfilesByLegacyIds(fastify, missingMemberIds)));
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
 * Update team members by legacy staff IDs
 */
export async function updateTeamMembers(
  fastify: FastifyInstance,
  teamId: number,
  activeStaffIds: number[],
  ensureLegacyStaffProfileFn: typeof ensureLegacyStaffProfile = ensureLegacyStaffProfile
): Promise<void> {
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

    // Auto-provision legacy staff_profile if missing
    await ensureLegacyStaffProfileFn(fastify, legacyStaffId);
  }
}

async function resolveDepartmentId(
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

/**
 * Upsert Team definition
 */
export async function upsertTeam(fastify: FastifyInstance, data: UpsertTeamRequest, id?: number) {
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
  const departmentId = await resolveDepartmentId(fastify, {
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
export async function deleteTeam(fastify: FastifyInstance, id: number): Promise<{ code: string }> {
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
