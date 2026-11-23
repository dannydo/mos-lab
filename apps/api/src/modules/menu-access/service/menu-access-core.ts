import type { FastifyInstance } from 'fastify';
import {
  CV_DEFAULT_ALLOWED_MENU_KEYS,
  DEFAULT_OPEN_MENU_KEYS,
  getRoleGroupForRole,
  isCvRole,
  isManagedMenuAccessCategoryPolicyKey,
  isManagedMenuAccessKey,
  isSuperAdminRole,
  MENU_ACCESS_CATEGORY_DEFINITIONS,
  MENU_ACCESS_DEFINITIONS,
  MENU_ACCESS_ROLE_GROUPS,
  type MenuAccessPolicy,
  type MenuAccessScopeType,
  type MenuAccessSubjectInput,
} from '@mos-lab/shared';

export const SCOPE_TYPES = new Set<MenuAccessScopeType>(['ROLE', 'DEPARTMENT', 'TEAM', 'STAFF']);
export const SECURITY_BLOCK_PREFIX = 'security:block:';
export const ROLE_GROUP_ID_SET = new Set<number>(MENU_ACCESS_ROLE_GROUPS.map((g) => g.id));
export const CV_DEFAULT_SET = new Set<string>(CV_DEFAULT_ALLOWED_MENU_KEYS);
export const DEFAULT_OPEN_SET = new Set<string>(DEFAULT_OPEN_MENU_KEYS);

export type MenuAccessActor = {
  id: number;
  role: string;
  username?: string;
  displayName?: string;
  email?: string;
};

export type PolicyRule = { subjectType: string; subjectId: number };
export type PolicySnapshot = { menuKey: string; isRestricted: boolean; rules: PolicyRule[]; updatedAt?: Date };
export type ActorScopes = {
  role?: string;
  roleGroupIds?: Set<number>;
  departmentIds: Set<number>;
  teamIds: Set<number>;
  staffIds: Set<number>;
};

// Short-lived in-memory caches for 0ms API-level enforcement
let cachedPolicies: { snapshots: PolicySnapshot[]; expiresAt: number } | null = null;
const cachedActorScopes = new Map<string, { scopes: ActorScopes; expiresAt: number }>();
export const securityBlockThrottle = new Map<string, number>();

export class MenuAccessError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = 'MenuAccessError';
  }
}

export function invalidateRuntimeCache(): void {
  cachedPolicies = null;
  cachedActorScopes.clear();
}

export function isMenuAccessSuperAdmin(actor: MenuAccessActor): boolean {
  return isSuperAdminRole(actor.role);
}

export function policyMatchesActorScopes(policy: PolicySnapshot, scopes: ActorScopes): boolean {
  return policy.rules.some((rule) => {
    if (rule.subjectType === 'ROLE') return scopes.roleGroupIds?.has(rule.subjectId) === true;
    if (rule.subjectType === 'DEPARTMENT') return scopes.departmentIds.has(rule.subjectId);
    if (rule.subjectType === 'TEAM') return scopes.teamIds.has(rule.subjectId);
    return rule.subjectType === 'STAFF' && scopes.staffIds.has(rule.subjectId);
  });
}

/** Pure matcher shared by the sidebar response, API guard, and unit tests. */
export function resolveMenuVisibility(
  menuPolicies: PolicySnapshot[],
  categoryPolicies: PolicySnapshot[],
  scopes: ActorScopes,
  isAdmin: boolean
): Record<string, boolean> {
  const isCv = isCvRole(scopes.role);
  const visibility = Object.fromEntries(
    MENU_ACCESS_DEFINITIONS.map((menu) => [
      menu.key,
      isCv ? CV_DEFAULT_SET.has(menu.key) || DEFAULT_OPEN_SET.has(menu.key) : true,
    ])
  ) as Record<string, boolean>;
  if (isAdmin) {
    return Object.fromEntries(MENU_ACCESS_DEFINITIONS.map((menu) => [menu.key, true])) as Record<string, boolean>;
  }

  // For CV accounts, if a non-default menu has an explicit restricted policy that
  // specifically grants access to this CV's ROLE group, TEAM, DEPARTMENT, or STAFF ID,
  // allow it (unless blocked by its parent category policy below).
  if (isCv) {
    for (const policy of menuPolicies) {
      if (!policy.isRestricted || !isManagedMenuAccessKey(policy.menuKey)) continue;
      if (policyMatchesActorScopes(policy, scopes)) {
        visibility[policy.menuKey] = true;
      }
    }
  }

  const menuPolicyMap = new Map(menuPolicies.map((p) => [p.menuKey, p]));

  // A category policy is a ceiling: an individual menu policy can further limit
  // access, but it must never widen a category that has explicit subject rules.
  // However, if a legacy category policy was toggled with empty rules (`rules.length === 0`)
  // while a child menu has an explicit rule grant (`rules.length > 0`) matching the actor,
  // honor the explicit child menu grant so production team grants (e.g. telesale-target, qa-shop) work.
  for (const policy of categoryPolicies) {
    if (!policy.isRestricted || !isManagedMenuAccessCategoryPolicyKey(policy.menuKey)) continue;
    if (policyMatchesActorScopes(policy, scopes)) continue;
    const categoryKey = policy.menuKey.slice('category:'.length);
    const category = MENU_ACCESS_CATEGORY_DEFINITIONS.find((item) => item.key === categoryKey);
    if (!category) continue;
    for (const menu of MENU_ACCESS_DEFINITIONS) {
      if (!category.menuGroupKeys.includes(menu.groupKey)) continue;
      if (isCv && CV_DEFAULT_SET.has(menu.key)) continue;
      const childPolicy = menuPolicyMap.get(menu.key);
      if (
        policy.rules.length === 0 &&
        childPolicy?.isRestricted &&
        childPolicy.rules.length > 0 &&
        policyMatchesActorScopes(childPolicy, scopes)
      ) {
        visibility[menu.key] = true;
        continue;
      }
      visibility[menu.key] = false;
    }
  }

  for (const policy of menuPolicies) {
    if (!policy.isRestricted || !isManagedMenuAccessKey(policy.menuKey)) continue;
    // Preserve CV's mandatory access to 'cv' and 'career-path' unless the policy was explicitly emptied (rules.length === 0)
    if (isCv && CV_DEFAULT_SET.has(policy.menuKey) && policy.rules.length > 0) {
      visibility[policy.menuKey] = true;
      continue;
    }
    if (!policyMatchesActorScopes(policy, scopes)) visibility[policy.menuKey] = false;
  }
  return visibility;
}

export function normalizeSubjects(subjects: MenuAccessSubjectInput[]): MenuAccessSubjectInput[] {
  if (!Array.isArray(subjects)) throw new MenuAccessError('Danh sách đối tượng nhận quyền menu phải là mảng.');
  const unique = new Map<string, MenuAccessSubjectInput>();
  subjects.forEach((subject) => {
    if (
      !subject ||
      !SCOPE_TYPES.has(subject.type) ||
      !Number.isInteger(Number(subject.subjectId)) ||
      Number(subject.subjectId) <= 0
    ) {
      throw new MenuAccessError('Nhóm vai trò, Department, Team hoặc cá nhân được chọn không hợp lệ.');
    }
    const normalized = { type: subject.type, subjectId: Number(subject.subjectId) };
    unique.set(`${normalized.type}:${normalized.subjectId}`, normalized);
  });
  return [...unique.values()];
}

export function policySnapshot(row: {
  menuKey: string;
  isRestricted: boolean;
  rules: PolicyRule[];
  updatedAt?: Date;
}): PolicySnapshot {
  return {
    menuKey: row.menuKey,
    isRestricted: Boolean(row.isRestricted),
    rules: row.rules,
    updatedAt: row.updatedAt,
  };
}

export async function getCachedRestrictedPolicies(fastify: FastifyInstance): Promise<PolicySnapshot[]> {
  const now = Date.now();
  if (cachedPolicies && cachedPolicies.expiresAt > now) {
    return cachedPolicies.snapshots;
  }
  const crm = (fastify.prisma as { crm?: { crmMenuAccessPolicy?: { findMany?: unknown } } })?.crm;
  if (typeof crm?.crmMenuAccessPolicy?.findMany !== 'function') {
    return [];
  }
  const [policies, allPolicies] = await Promise.all([
    fastify.prisma.crm.crmMenuAccessPolicy.findMany({
      where: { isRestricted: true },
      include: { rules: true },
    }),
    fastify.prisma.crm.crmMenuAccessPolicy.findMany({
      select: { menuKey: true },
    }),
  ]);
  const snapshots = policies.map(policySnapshot);
  const configuredKeys = new Set(allPolicies.map((p) => p.menuKey));
  // Default Invariant: Any menu in MENU_ACCESS_DEFINITIONS without an explicit DB policy
  // defaults to restricted with empty rules (hidden from non-admins), except DEFAULT_OPEN_MENU_KEYS.
  for (const def of MENU_ACCESS_DEFINITIONS) {
    if (!configuredKeys.has(def.key) && !DEFAULT_OPEN_SET.has(def.key)) {
      snapshots.push({
        menuKey: def.key,
        isRestricted: true,
        rules: [],
      });
    }
  }
  cachedPolicies = { snapshots, expiresAt: now + 10_000 };
  return snapshots;
}

export async function getActorScopes(fastify: FastifyInstance, actor: MenuAccessActor): Promise<ActorScopes> {
  const crm = (
    fastify.prisma as {
      crm?: {
        crmStaff?: { findUnique?: unknown };
        crmTeamMember?: { findMany?: unknown };
        crmTeam?: { findMany?: unknown };
      };
    }
  )?.crm;
  const roleGroup = getRoleGroupForRole(actor.role);
  const roleGroupIds = new Set<number>(roleGroup ? [roleGroup.id] : []);

  if (typeof crm?.crmTeamMember?.findMany !== 'function' || typeof crm?.crmTeam?.findMany !== 'function') {
    return {
      role: actor.role,
      roleGroupIds,
      departmentIds: new Set<number>(),
      teamIds: new Set<number>(),
      staffIds: new Set([actor.id]),
    };
  }

  const staff =
    typeof crm.crmStaff?.findUnique === 'function'
      ? await fastify.prisma.crm.crmStaff.findUnique({
          where: { id: actor.id },
          select: { legacyStaffId: true, role: true },
        })
      : null;

  const effectiveRole = staff?.role || actor.role;
  const effectiveRoleGroup = getRoleGroupForRole(effectiveRole);
  if (effectiveRoleGroup) {
    roleGroupIds.add(effectiveRoleGroup.id);
  }

  const memberWhere = staff?.legacyStaffId
    ? { OR: [{ crmStaffId: actor.id }, { legacyStaffId: staff.legacyStaffId }], isActive: true }
    : { crmStaffId: actor.id, isActive: true };
  const [memberships, teams] = await Promise.all([
    fastify.prisma.crm.crmTeamMember.findMany({ where: memberWhere, select: { teamId: true } }),
    fastify.prisma.crm.crmTeam.findMany({
      where: { isActive: true },
      select: { id: true, parentTeamId: true, departmentId: true },
    }),
  ]);

  const teamById = new Map(teams.map((team) => [team.id, team]));
  const teamIds = new Set<number>();
  const departmentIds = new Set<number>();
  memberships.forEach((membership) => {
    let currentId: number | null = membership.teamId;
    while (currentId && !teamIds.has(currentId)) {
      const team = teamById.get(currentId);
      if (!team) break;
      teamIds.add(team.id);
      if (team.departmentId) departmentIds.add(team.departmentId);
      currentId = team.parentTeamId;
    }
  });
  return {
    role: effectiveRole,
    roleGroupIds,
    departmentIds,
    teamIds,
    staffIds: new Set([actor.id]),
  };
}

export async function getCachedActorScopes(fastify: FastifyInstance, actor: MenuAccessActor): Promise<ActorScopes> {
  const cacheKey = `${actor.id}:${actor.role || ''}`;
  const now = Date.now();
  const hit = cachedActorScopes.get(cacheKey);
  if (hit && hit.expiresAt > now) {
    return hit.scopes;
  }
  const scopes = await getActorScopes(fastify, actor);
  cachedActorScopes.set(cacheKey, { scopes, expiresAt: now + 15_000 });
  return scopes;
}

export function buildSubjectLabelMap(
  departments: Array<{ id: number; code: string; name: string }>,
  teams: Array<{ id: number; code: string; name: string }>,
  staff: Array<{ id: number; displayName: string; username: string }>
): Map<string, string> {
  const labels = new Map<string, string>();
  MENU_ACCESS_ROLE_GROUPS.forEach((group) => labels.set(`ROLE:${group.id}`, `Nhóm Vai trò · ${group.name}`));
  departments.forEach((department) => labels.set(`DEPARTMENT:${department.id}`, `Department · ${department.name}`));
  teams.forEach((team) => labels.set(`TEAM:${team.id}`, `Team · ${team.name} (${team.code})`));
  staff.forEach((person) => labels.set(`STAFF:${person.id}`, `Cá nhân · ${person.displayName} (@${person.username})`));
  return labels;
}

export async function validateSubjects(fastify: FastifyInstance, subjects: MenuAccessSubjectInput[]): Promise<void> {
  const byType = {
    ROLE: subjects.filter((subject) => subject.type === 'ROLE').map((subject) => subject.subjectId),
    DEPARTMENT: subjects.filter((subject) => subject.type === 'DEPARTMENT').map((subject) => subject.subjectId),
    TEAM: subjects.filter((subject) => subject.type === 'TEAM').map((subject) => subject.subjectId),
    STAFF: subjects.filter((subject) => subject.type === 'STAFF').map((subject) => subject.subjectId),
  };
  if (byType.ROLE.some((id) => !ROLE_GROUP_ID_SET.has(id))) {
    throw new MenuAccessError('Nhóm vai trò được chọn không hợp lệ.');
  }
  const [departmentCount, teamCount, staffCount] = await Promise.all([
    byType.DEPARTMENT.length
      ? fastify.prisma.crm.crmDepartment.count({ where: { id: { in: byType.DEPARTMENT }, isActive: true } })
      : 0,
    byType.TEAM.length ? fastify.prisma.crm.crmTeam.count({ where: { id: { in: byType.TEAM }, isActive: true } }) : 0,
    byType.STAFF.length
      ? fastify.prisma.crm.crmStaff.count({ where: { id: { in: byType.STAFF }, isActive: true } })
      : 0,
  ]);
  if (
    departmentCount !== byType.DEPARTMENT.length ||
    teamCount !== byType.TEAM.length ||
    staffCount !== byType.STAFF.length
  ) {
    throw new MenuAccessError('Có Department, Team hoặc cá nhân không còn hoạt động. Hãy tải lại dữ liệu và chọn lại.');
  }
}

export function formatPolicy(
  menuKey: string,
  policy: { menuKey: string; isRestricted: boolean; updatedAt: Date; rules: PolicyRule[] } | undefined,
  labels: Map<string, string>
): MenuAccessPolicy {
  if (!policy) return { menuKey, isRestricted: true, subjects: [] };
  return {
    menuKey: policy.menuKey,
    isRestricted: Boolean(policy.isRestricted),
    subjects: policy.rules.map((rule) => ({
      type: rule.subjectType as MenuAccessScopeType,
      subjectId: rule.subjectId,
      label: labels.get(`${rule.subjectType}:${rule.subjectId}`) || `Đối tượng đã ngừng hoạt động (#${rule.subjectId})`,
    })),
    updatedAt: policy.updatedAt.toISOString(),
  };
}

export function parseAuditPolicy(value: string | null): { isRestricted: boolean; rules: PolicyRule[] } {
  if (!value) return { isRestricted: false, rules: [] };
  try {
    const parsed = JSON.parse(value) as { isRestricted?: unknown; rules?: unknown };
    return {
      isRestricted: parsed.isRestricted === true,
      rules: Array.isArray(parsed.rules) ? (parsed.rules as PolicyRule[]) : [],
    };
  } catch {
    return { isRestricted: false, rules: [] };
  }
}

export function parseBlockAudit(value: string | null): {
  method?: string;
  path?: string;
  reason?: string;
  actorRole?: string;
  actorUsername?: string;
  actorDisplayName?: string;
} {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
