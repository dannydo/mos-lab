import { Department, Team, type SafeAny } from '@mos-lab/shared';

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

export function parseMetadata(metadata: string | null): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function formatDepartment(department: SafeAny): Department {
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

export function formatTeam(team: SafeAny): Team {
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
