import type { FastifyInstance } from 'fastify';
import {
  isAdminOrSuperAdminRole,
  isSuperAdminRole,
  getMenuAccessCategoryPolicyKey,
  isManagedMenuAccessCategoryPolicyKey,
  isManagedMenuAccessKey,
  isManagedMenuAccessPolicyKey,
  MENU_ACCESS_CATEGORY_DEFINITIONS,
  MENU_ACCESS_DEFINITIONS,
  type MenuAccessAuditEntry,
  type MenuAccessConfigurationResponse,
  type MenuAccessPolicy,
  type MenuAccessScopeType,
  type MenuAccessSidebarResponse,
  type MenuAccessSubjectInput,
  type UpdateMenuAccessPolicyRequest,
} from '@mos-lab/shared';

const SCOPE_TYPES = new Set<MenuAccessScopeType>(['DEPARTMENT', 'TEAM', 'STAFF']);

export type MenuAccessActor = {
  id: number;
  role: string;
  username?: string;
  email?: string;
};

type PolicyRule = { subjectType: string; subjectId: number };
type PolicySnapshot = { menuKey: string; isRestricted: boolean; rules: PolicyRule[] };
type ActorScopes = { departmentIds: Set<number>; teamIds: Set<number>; staffIds: Set<number> };

export class MenuAccessError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400
  ) {
    super(message);
    this.name = 'MenuAccessError';
  }
}

export function isMenuAccessSuperAdmin(actor: MenuAccessActor): boolean {
  return isSuperAdminRole(actor.role);
}

function policyMatchesActorScopes(policy: PolicySnapshot, scopes: ActorScopes): boolean {
  return policy.rules.some((rule) => {
    if (rule.subjectType === 'DEPARTMENT') return scopes.departmentIds.has(rule.subjectId);
    if (rule.subjectType === 'TEAM') return scopes.teamIds.has(rule.subjectId);
    return rule.subjectType === 'STAFF' && scopes.staffIds.has(rule.subjectId);
  });
}

/** Pure matcher shared by the sidebar response and unit tests. */
export function resolveMenuVisibility(
  menuPolicies: PolicySnapshot[],
  categoryPolicies: PolicySnapshot[],
  scopes: ActorScopes,
  isAdmin: boolean
): Record<string, boolean> {
  const visibility = Object.fromEntries(MENU_ACCESS_DEFINITIONS.map((menu) => [menu.key, true])) as Record<
    string,
    boolean
  >;
  if (isAdmin) return visibility;

  // A category policy is a ceiling: an individual menu policy can further limit
  // access, but it must never widen a category that is already restricted.
  for (const policy of categoryPolicies) {
    if (!policy.isRestricted || !isManagedMenuAccessCategoryPolicyKey(policy.menuKey)) continue;
    if (policyMatchesActorScopes(policy, scopes)) continue;
    const categoryKey = policy.menuKey.slice('category:'.length);
    const category = MENU_ACCESS_CATEGORY_DEFINITIONS.find((item) => item.key === categoryKey);
    if (!category) continue;
    for (const menu of MENU_ACCESS_DEFINITIONS) {
      if (category.menuGroupKeys.includes(menu.groupKey)) visibility[menu.key] = false;
    }
  }

  for (const policy of menuPolicies) {
    if (!policy.isRestricted || !isManagedMenuAccessKey(policy.menuKey)) continue;
    if (!policyMatchesActorScopes(policy, scopes)) visibility[policy.menuKey] = false;
  }
  return visibility;
}

function normalizeSubjects(subjects: MenuAccessSubjectInput[]): MenuAccessSubjectInput[] {
  if (!Array.isArray(subjects)) throw new MenuAccessError('Danh sách đối tượng nhận quyền menu phải là mảng.');
  const unique = new Map<string, MenuAccessSubjectInput>();
  subjects.forEach((subject) => {
    if (
      !subject ||
      !SCOPE_TYPES.has(subject.type) ||
      !Number.isInteger(Number(subject.subjectId)) ||
      Number(subject.subjectId) <= 0
    ) {
      throw new MenuAccessError('Department, Team hoặc cá nhân được chọn không hợp lệ.');
    }
    const normalized = { type: subject.type, subjectId: Number(subject.subjectId) };
    unique.set(`${normalized.type}:${normalized.subjectId}`, normalized);
  });
  return [...unique.values()];
}

function policySnapshot(row: { menuKey: string; isRestricted: boolean; rules: PolicyRule[] }): PolicySnapshot {
  return { menuKey: row.menuKey, isRestricted: Boolean(row.isRestricted), rules: row.rules };
}

export class MenuAccessService {
  static async getSidebarVisibility(
    fastify: FastifyInstance,
    actor: MenuAccessActor
  ): Promise<MenuAccessSidebarResponse> {
    const policies = await fastify.prisma.crm.crmMenuAccessPolicy.findMany({
      where: { isRestricted: true },
      include: { rules: true },
    });
    const snapshots = policies.map(policySnapshot);
    const menuPolicies = snapshots.filter((policy) => isManagedMenuAccessKey(policy.menuKey));
    const categoryPolicies = snapshots.filter((policy) => isManagedMenuAccessCategoryPolicyKey(policy.menuKey));
    const isAdmin = isAdminOrSuperAdminRole(actor.role);
    const scopes = await this.getActorScopes(fastify, actor);
    const visibility = resolveMenuVisibility(menuPolicies, categoryPolicies, scopes, isAdmin);
    const categoryVisibility = Object.fromEntries(
      MENU_ACCESS_CATEGORY_DEFINITIONS.map((category) => {
        const policy = categoryPolicies.find((item) => item.menuKey === getMenuAccessCategoryPolicyKey(category.key));
        return [category.key, !policy?.isRestricted || isAdmin || policyMatchesActorScopes(policy, scopes)];
      })
    );
    return {
      data: {
        visibility,
        categoryVisibility,
        restrictedMenuKeys: menuPolicies.filter((policy) => policy.isRestricted).map((policy) => policy.menuKey),
        restrictedCategoryKeys: categoryPolicies
          .filter((policy) => policy.isRestricted)
          .map((policy) => policy.menuKey.slice('category:'.length)),
      },
    };
  }

  static async getConfiguration(fastify: FastifyInstance): Promise<MenuAccessConfigurationResponse> {
    const [policies, departments, teams, staff, audits] = await Promise.all([
      fastify.prisma.crm.crmMenuAccessPolicy.findMany({ include: { rules: true } }),
      fastify.prisma.crm.crmDepartment.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      fastify.prisma.crm.crmTeam.findMany({
        where: { isActive: true },
        select: { id: true, code: true, name: true, departmentId: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      }),
      fastify.prisma.crm.crmStaff.findMany({
        where: { isActive: true },
        select: { id: true, displayName: true, username: true, role: true },
        orderBy: [{ displayName: 'asc' }, { username: 'asc' }],
      }),
      fastify.prisma.crm.crmMenuAccessAudit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const labels = new Map<string, string>();
    departments.forEach((department) => labels.set(`DEPARTMENT:${department.id}`, `Department · ${department.name}`));
    teams.forEach((team) => labels.set(`TEAM:${team.id}`, `Team · ${team.name} (${team.code})`));
    staff.forEach((person) =>
      labels.set(`STAFF:${person.id}`, `Cá nhân · ${person.displayName} (@${person.username})`)
    );
    const byMenuKey = new Map(policies.map((policy) => [policy.menuKey, policy]));
    const menuLabels = new Map([
      ...MENU_ACCESS_DEFINITIONS.map((menu) => [menu.key, menu.label] as const),
      ...MENU_ACCESS_CATEGORY_DEFINITIONS.map(
        (category) => [getMenuAccessCategoryPolicyKey(category.key), `Danh mục · ${category.label}`] as const
      ),
    ]);
    const staffLabels = new Map(staff.map((person) => [person.id, `${person.displayName} (@${person.username})`]));

    return {
      menus: MENU_ACCESS_DEFINITIONS.map((menu) => ({ ...menu })),
      categories: MENU_ACCESS_CATEGORY_DEFINITIONS.map((category) => ({
        ...category,
        menuGroupKeys: [...category.menuGroupKeys],
      })),
      categoryPolicies: MENU_ACCESS_CATEGORY_DEFINITIONS.map((category) => {
        const policyKey = getMenuAccessCategoryPolicyKey(category.key);
        return this.formatPolicy(policyKey, byMenuKey.get(policyKey), labels);
      }),
      policies: MENU_ACCESS_DEFINITIONS.map((menu) => {
        const policy = byMenuKey.get(menu.key);
        return this.formatPolicy(menu.key, policy, labels);
      }),
      departments,
      teams,
      staff,
      recentAudits: audits.map((audit): MenuAccessAuditEntry => {
        const before = this.parseAuditPolicy(audit.beforeJson);
        const after = this.parseAuditPolicy(audit.afterJson);
        return {
          id: audit.id,
          menuKey: audit.menuKey,
          menuLabel: menuLabels.get(audit.menuKey) || audit.menuKey,
          actorStaffId: audit.actorStaffId,
          actorLabel: audit.actorStaffId
            ? staffLabels.get(audit.actorStaffId) || `Nhân sự #${audit.actorStaffId}`
            : 'Hệ thống',
          beforeIsRestricted: before.isRestricted,
          afterIsRestricted: after.isRestricted,
          beforeSubjectCount: before.rules.length,
          afterSubjectCount: after.rules.length,
          createdAt: audit.createdAt.toISOString(),
        };
      }),
    };
  }

  static async updatePolicy(
    fastify: FastifyInstance,
    actor: MenuAccessActor,
    menuKey: string,
    payload: UpdateMenuAccessPolicyRequest
  ): Promise<MenuAccessPolicy> {
    if (!isManagedMenuAccessPolicyKey(menuKey)) {
      throw new MenuAccessError('Mục hoặc danh mục menu không thuộc phạm vi cấu hình.', 404);
    }
    if (typeof payload?.isRestricted !== 'boolean') {
      throw new MenuAccessError('Trạng thái giới hạn menu không hợp lệ.');
    }
    const subjects = normalizeSubjects(payload.subjects);
    await this.validateSubjects(fastify, subjects);

    const existing = await fastify.prisma.crm.crmMenuAccessPolicy.findUnique({
      where: { menuKey },
      include: { rules: true },
    });
    const before = existing ? policySnapshot(existing) : { menuKey, isRestricted: false, rules: [] };
    const after = {
      menuKey,
      isRestricted: payload.isRestricted,
      rules: subjects.map((subject) => ({ subjectType: subject.type, subjectId: subject.subjectId })),
    };

    await fastify.prisma.crm.$transaction(async (tx) => {
      const policy = await tx.crmMenuAccessPolicy.upsert({
        where: { menuKey },
        update: { isRestricted: payload.isRestricted },
        create: { menuKey, isRestricted: payload.isRestricted },
      });
      await tx.crmMenuAccessRule.deleteMany({ where: { policyId: policy.id } });
      if (subjects.length > 0) {
        await tx.crmMenuAccessRule.createMany({
          data: subjects.map((subject) => ({
            policyId: policy.id,
            subjectType: subject.type,
            subjectId: subject.subjectId,
          })),
        });
      }
      await tx.crmMenuAccessAudit.create({
        data: {
          menuKey,
          actorStaffId: actor.id,
          beforeJson: JSON.stringify(before),
          afterJson: JSON.stringify(after),
        },
      });
    });

    const configuration = await this.getConfiguration(fastify);
    return [...configuration.categoryPolicies, ...configuration.policies].find((policy) => policy.menuKey === menuKey)!;
  }

  private static async getActorScopes(fastify: FastifyInstance, actor: MenuAccessActor): Promise<ActorScopes> {
    const staff = await fastify.prisma.crm.crmStaff.findUnique({
      where: { id: actor.id },
      select: { legacyStaffId: true },
    });
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
    return { departmentIds, teamIds, staffIds: new Set([actor.id]) };
  }

  private static async validateSubjects(fastify: FastifyInstance, subjects: MenuAccessSubjectInput[]): Promise<void> {
    const byType = {
      DEPARTMENT: subjects.filter((subject) => subject.type === 'DEPARTMENT').map((subject) => subject.subjectId),
      TEAM: subjects.filter((subject) => subject.type === 'TEAM').map((subject) => subject.subjectId),
      STAFF: subjects.filter((subject) => subject.type === 'STAFF').map((subject) => subject.subjectId),
    };
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
      throw new MenuAccessError(
        'Có Department, Team hoặc cá nhân không còn hoạt động. Hãy tải lại dữ liệu và chọn lại.'
      );
    }
  }

  private static formatPolicy(
    menuKey: string,
    policy: { menuKey: string; isRestricted: boolean; updatedAt: Date; rules: PolicyRule[] } | undefined,
    labels: Map<string, string>
  ): MenuAccessPolicy {
    if (!policy) return { menuKey, isRestricted: false, subjects: [] };
    return {
      menuKey: policy.menuKey,
      isRestricted: Boolean(policy.isRestricted),
      subjects: policy.rules.map((rule) => ({
        type: rule.subjectType as MenuAccessScopeType,
        subjectId: rule.subjectId,
        label:
          labels.get(`${rule.subjectType}:${rule.subjectId}`) || `Đối tượng đã ngừng hoạt động (#${rule.subjectId})`,
      })),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }

  private static parseAuditPolicy(value: string | null): { isRestricted: boolean; rules: PolicyRule[] } {
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
}
