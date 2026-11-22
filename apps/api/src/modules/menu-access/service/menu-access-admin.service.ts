import type { FastifyInstance } from 'fastify';
import {
  getMenuAccessCategoryPolicyKey,
  isManagedMenuAccessKey,
  isManagedMenuAccessPolicyKey,
  MENU_ACCESS_CATEGORY_DEFINITIONS,
  MENU_ACCESS_DEFINITIONS,
  MENU_ACCESS_ROLE_GROUPS,
  type MenuAccessAuditEntry,
  type MenuAccessConfigurationResponse,
  type MenuAccessPolicy,
  type SecurityAccessBlockEntry,
  type UpdateMenuAccessPolicyRequest,
} from '@mos-lab/shared';
import {
  buildSubjectLabelMap,
  CV_DEFAULT_SET,
  formatPolicy,
  invalidateRuntimeCache,
  MenuAccessError,
  normalizeSubjects,
  parseAuditPolicy,
  parseBlockAudit,
  policySnapshot,
  SECURITY_BLOCK_PREFIX,
  validateSubjects,
  type MenuAccessActor,
} from './menu-access-core.js';

export async function getMenuAccessConfiguration(fastify: FastifyInstance): Promise<MenuAccessConfigurationResponse> {
  const [policies, departments, teams, staff, rawAudits] = await Promise.all([
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
      take: 60,
    }),
  ]);

  const labels = buildSubjectLabelMap(departments, teams, staff);
  const byMenuKey = new Map(policies.map((policy) => [policy.menuKey, policy]));
  const menuLabels = new Map([
    ...MENU_ACCESS_DEFINITIONS.map((menu) => [menu.key, menu.label] as const),
    ...MENU_ACCESS_CATEGORY_DEFINITIONS.map(
      (category) => [getMenuAccessCategoryPolicyKey(category.key), `Danh mục · ${category.label}`] as const
    ),
  ]);
  const staffLabels = new Map(staff.map((person) => [person.id, `${person.displayName} (@${person.username})`]));

  const policyAudits = rawAudits.filter((a) => !a.menuKey.startsWith(SECURITY_BLOCK_PREFIX)).slice(0, 25);
  const blockAudits = rawAudits.filter((a) => a.menuKey.startsWith(SECURITY_BLOCK_PREFIX)).slice(0, 25);

  const securityBlockLogs: SecurityAccessBlockEntry[] = blockAudits.map((audit) => {
    const parsed = parseBlockAudit(audit.afterJson);
    const moduleKey = audit.menuKey.slice(SECURITY_BLOCK_PREFIX.length);
    return {
      id: audit.id,
      menuKey: moduleKey,
      actorStaffId: audit.actorStaffId,
      actorLabel: audit.actorStaffId
        ? staffLabels.get(audit.actorStaffId) ||
          (parsed.actorDisplayName
            ? `${parsed.actorDisplayName} (@${parsed.actorUsername || ''})`
            : `Nhân sự #${audit.actorStaffId}`)
        : 'Hệ thống',
      actorRole: parsed.actorRole,
      method: parsed.method,
      path: parsed.path,
      reason: parsed.reason,
      createdAt: audit.createdAt.toISOString(),
    };
  });

  return {
    menus: MENU_ACCESS_DEFINITIONS.map((menu) => ({ ...menu })),
    categories: MENU_ACCESS_CATEGORY_DEFINITIONS.map((category) => ({
      ...category,
      menuGroupKeys: [...category.menuGroupKeys],
    })),
    categoryPolicies: MENU_ACCESS_CATEGORY_DEFINITIONS.map((category) => {
      const policyKey = getMenuAccessCategoryPolicyKey(category.key);
      return formatPolicy(policyKey, byMenuKey.get(policyKey), labels);
    }),
    policies: MENU_ACCESS_DEFINITIONS.map((menu) => {
      const policy = byMenuKey.get(menu.key);
      return formatPolicy(menu.key, policy, labels);
    }),
    roleGroups: MENU_ACCESS_ROLE_GROUPS.map((group) => ({ ...group, roles: [...group.roles] })),
    departments,
    teams,
    staff,
    recentAudits: policyAudits.map((audit): MenuAccessAuditEntry => {
      const before = parseAuditPolicy(audit.beforeJson);
      const after = parseAuditPolicy(audit.afterJson);
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
        beforeSubjects: before.rules.map(
          (r) => labels.get(`${r.subjectType}:${r.subjectId}`) || `${r.subjectType}:${r.subjectId}`
        ),
        afterSubjects: after.rules.map(
          (r) => labels.get(`${r.subjectType}:${r.subjectId}`) || `${r.subjectType}:${r.subjectId}`
        ),
        createdAt: audit.createdAt.toISOString(),
      };
    }),
    securityBlockLogs,
  };
}

export async function updateMenuAccessPolicy(
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
  await validateSubjects(fastify, subjects);

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

  invalidateRuntimeCache();
  const configuration = await getMenuAccessConfiguration(fastify);
  return [...configuration.categoryPolicies, ...configuration.policies].find((policy) => policy.menuKey === menuKey)!;
}

/**
 * Batch-updates menu access policies for a specific Role Group (`ROLE` subjectType).
 * Enables Danny to toggle which menus a Role Group can access in one click.
 */
export async function updateMenuRoleGroupMatrix(
  fastify: FastifyInstance,
  actor: MenuAccessActor,
  roleGroupId: number,
  allowedMenuKeys: string[]
): Promise<MenuAccessConfigurationResponse> {
  const roleGroup = MENU_ACCESS_ROLE_GROUPS.find((g) => g.id === Number(roleGroupId));
  if (!roleGroup) {
    throw new MenuAccessError('Nhóm vai trò không tồn tại.', 404);
  }
  const allowedSet = new Set(allowedMenuKeys.filter((k) => isManagedMenuAccessKey(k)));
  const existingPolicies = await fastify.prisma.crm.crmMenuAccessPolicy.findMany({
    include: { rules: true },
  });
  const policyMap = new Map(existingPolicies.map((p) => [p.menuKey, p]));

  await fastify.prisma.crm.$transaction(async (tx) => {
    for (const menu of MENU_ACCESS_DEFINITIONS) {
      const current = policyMap.get(menu.key);
      const shouldAllow = allowedSet.has(menu.key);
      const isCvDefault = roleGroup.code === 'CV' && CV_DEFAULT_SET.has(menu.key);

      const currentRules = current?.rules || [];
      const hasRoleRule = currentRules.some((r) => r.subjectType === 'ROLE' && r.subjectId === roleGroup.id);

      // If this menu is already restricted, add/remove ROLE:roleGroup.id
      // If not restricted, and we are configuring a non-default grant for CV (or restricting a menu for a role group):
      let nextIsRestricted = Boolean(current?.isRestricted);
      let nextRules = [...currentRules.map((r) => ({ subjectType: r.subjectType, subjectId: r.subjectId }))];

      if (shouldAllow && !hasRoleRule && (nextIsRestricted || (roleGroup.code === 'CV' && !isCvDefault))) {
        nextIsRestricted = true;
        // If transitioning from unrestricted to restricted because CV was granted an extra menu,
        // also preserve all non-CV role groups so other groups aren't accidentally locked out!
        if (!current?.isRestricted) {
          for (const otherGroup of MENU_ACCESS_ROLE_GROUPS) {
            if (otherGroup.id !== roleGroup.id && otherGroup.code !== 'CV') {
              nextRules.push({ subjectType: 'ROLE', subjectId: otherGroup.id });
            }
          }
        }
        nextRules.push({ subjectType: 'ROLE', subjectId: roleGroup.id });
      } else if (!shouldAllow && hasRoleRule) {
        nextRules = nextRules.filter((r) => !(r.subjectType === 'ROLE' && r.subjectId === roleGroup.id));
      } else if (!shouldAllow && !nextIsRestricted && roleGroup.code !== 'CV') {
        // Turning OFF a default-allowed menu for a non-CV role group transitions the menu to restricted
        // with all OTHER non-CV role groups enabled.
        nextIsRestricted = true;
        nextRules = MENU_ACCESS_ROLE_GROUPS.filter((g) => g.id !== roleGroup.id && g.code !== 'CV').map((g) => ({
          subjectType: 'ROLE',
          subjectId: g.id,
        }));
      } else if (!shouldAllow && roleGroup.code === 'CV' && isCvDefault && !nextIsRestricted) {
        // Turning OFF a default CV menu ('cv' or 'career-path') transitions it to restricted for non-CV groups
        nextIsRestricted = true;
        nextRules = MENU_ACCESS_ROLE_GROUPS.filter((g) => g.code !== 'CV').map((g) => ({
          subjectType: 'ROLE',
          subjectId: g.id,
        }));
      } else {
        continue;
      }

      const before = current ? policySnapshot(current) : { menuKey: menu.key, isRestricted: false, rules: [] };
      const after = { menuKey: menu.key, isRestricted: nextIsRestricted, rules: nextRules };

      const upserted = await tx.crmMenuAccessPolicy.upsert({
        where: { menuKey: menu.key },
        update: { isRestricted: nextIsRestricted },
        create: { menuKey: menu.key, isRestricted: nextIsRestricted },
      });
      await tx.crmMenuAccessRule.deleteMany({ where: { policyId: upserted.id } });
      if (nextRules.length > 0) {
        await tx.crmMenuAccessRule.createMany({
          data: nextRules.map((r) => ({
            policyId: upserted.id,
            subjectType: r.subjectType,
            subjectId: r.subjectId,
          })),
        });
      }
      await tx.crmMenuAccessAudit.create({
        data: {
          menuKey: menu.key,
          actorStaffId: actor.id,
          beforeJson: JSON.stringify(before),
          afterJson: JSON.stringify(after),
        },
      });
    }
  });

  invalidateRuntimeCache();
  return getMenuAccessConfiguration(fastify);
}
