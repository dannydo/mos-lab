import type { FastifyInstance } from 'fastify';
import {
  CV_DEFAULT_ALLOWED_MENU_KEYS,
  getMenuAccessCategoryPolicyKey,
  getRoleGroupForRole,
  isAdminOrSuperAdminRole,
  isCvRole,
  isManagedMenuAccessCategoryPolicyKey,
  isManagedMenuAccessKey,
  isManagedMenuAccessPolicyKey,
  isSuperAdminRole,
  MENU_ACCESS_CATEGORY_DEFINITIONS,
  MENU_ACCESS_DEFINITIONS,
  MENU_ACCESS_ROLE_GROUPS,
  resolveMenuKeysForApiPath,
  type MenuAccessAuditEntry,
  type MenuAccessConfigurationResponse,
  type MenuAccessInspectorAllowedItem,
  type MenuAccessInspectorResponse,
  type MenuAccessPolicy,
  type MenuAccessScopeType,
  type MenuAccessSidebarResponse,
  type MenuAccessSubjectInput,
  type MenuAccessTimelineEvent,
  type SecurityAccessBlockEntry,
  type UpdateMenuAccessPolicyRequest,
} from '@mos-lab/shared';

const SCOPE_TYPES = new Set<MenuAccessScopeType>(['ROLE', 'DEPARTMENT', 'TEAM', 'STAFF']);
const SECURITY_BLOCK_PREFIX = 'security:block:';
const ROLE_GROUP_ID_SET = new Set<number>(MENU_ACCESS_ROLE_GROUPS.map((g) => g.id));
const CV_DEFAULT_SET = new Set<string>(CV_DEFAULT_ALLOWED_MENU_KEYS);

export type MenuAccessActor = {
  id: number;
  role: string;
  username?: string;
  displayName?: string;
  email?: string;
};

type PolicyRule = { subjectType: string; subjectId: number };
type PolicySnapshot = { menuKey: string; isRestricted: boolean; rules: PolicyRule[]; updatedAt?: Date };
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
const securityBlockThrottle = new Map<string, number>();

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
    MENU_ACCESS_DEFINITIONS.map((menu) => [menu.key, isCv ? CV_DEFAULT_SET.has(menu.key) : true])
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
      throw new MenuAccessError('Nhóm vai trò, Department, Team hoặc cá nhân được chọn không hợp lệ.');
    }
    const normalized = { type: subject.type, subjectId: Number(subject.subjectId) };
    unique.set(`${normalized.type}:${normalized.subjectId}`, normalized);
  });
  return [...unique.values()];
}

function policySnapshot(row: {
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

export class MenuAccessService {
  static invalidateRuntimeCache(): void {
    cachedPolicies = null;
    cachedActorScopes.clear();
  }

  private static async getCachedRestrictedPolicies(fastify: FastifyInstance): Promise<PolicySnapshot[]> {
    const now = Date.now();
    if (cachedPolicies && cachedPolicies.expiresAt > now) {
      return cachedPolicies.snapshots;
    }
    const crm = (fastify.prisma as { crm?: { crmMenuAccessPolicy?: { findMany?: unknown } } })?.crm;
    if (typeof crm?.crmMenuAccessPolicy?.findMany !== 'function') {
      return [];
    }
    const policies = await fastify.prisma.crm.crmMenuAccessPolicy.findMany({
      where: { isRestricted: true },
      include: { rules: true },
    });
    const snapshots = policies.map(policySnapshot);
    cachedPolicies = { snapshots, expiresAt: now + 10_000 };
    return snapshots;
  }

  private static async getCachedActorScopes(fastify: FastifyInstance, actor: MenuAccessActor): Promise<ActorScopes> {
    const cacheKey = `${actor.id}:${actor.role || ''}`;
    const now = Date.now();
    const hit = cachedActorScopes.get(cacheKey);
    if (hit && hit.expiresAt > now) {
      return hit.scopes;
    }
    const scopes = await this.getActorScopes(fastify, actor);
    cachedActorScopes.set(cacheKey, { scopes, expiresAt: now + 15_000 });
    return scopes;
  }

  /**
   * API-level permission check used by `requireAuth` middleware.
   * Ensures backend API routes are locked in sync with the Unified Permission Matrix.
   */
  static async checkApiAccess(
    fastify: FastifyInstance,
    actor: MenuAccessActor,
    apiPath: string,
    method = 'GET'
  ): Promise<{ allowed: boolean; moduleKey: string; message?: string }> {
    const cleanPath =
      (
        '/' +
        apiPath
          .split('?')[0]
          .replace(/^\/+/, '')
          .replace(/^api\/+/, '')
      ).replace(/\/+$/, '') || '/';
    const isAdmin = isAdminOrSuperAdminRole(actor.role);
    if (isAdmin) {
      return { allowed: true, moduleKey: 'admin' };
    }

    const requiredKeys = resolveMenuKeysForApiPath(cleanPath);
    if (requiredKeys.includes('__SESSION_ALLOWED__')) {
      return { allowed: true, moduleKey: 'session' };
    }

    const isCv = isCvRole(actor.role);

    // Explicitly block Bug Reports (mOS Mission) for CV accounts
    if (requiredKeys.includes('__BUG_REPORT_BLOCKED_FOR_CV__')) {
      if (isCv) {
        return {
          allowed: false,
          moduleKey: 'bug-reports',
          message: 'Tài khoản Chuyên Viên không có quyền sử dụng chức năng Báo lỗi (mOS Mission).',
        };
      }
      return { allowed: true, moduleKey: 'bug-reports' };
    }

    // Preserve exact error messages expected by existing CV guard tests
    if (isCv) {
      if (cleanPath === '/customers') {
        const hasOverride = await this.hasExplicitOverrideForKeys(fastify, actor, ['customers-all', 'my-customers']);
        if (!hasOverride) {
          return {
            allowed: false,
            moduleKey: 'customers',
            message: 'Tài khoản Chuyên Viên không có quyền truy cập danh sách khách hàng CRM.',
          };
        }
      }
      if (cleanPath === '/customers/stats') {
        const hasOverride = await this.hasExplicitOverrideForKeys(fastify, actor, ['customers-all', 'my-customers']);
        if (!hasOverride) {
          return {
            allowed: false,
            moduleKey: 'customers',
            message: 'Tài khoản Chuyên Viên không có quyền truy cập thống kê khách hàng CRM.',
          };
        }
      }
      if (cleanPath.startsWith('/dashboard/today/revenue-')) {
        const hasOverride = await this.hasExplicitOverrideForKeys(fastify, actor, ['today', 'dashboard']);
        if (!hasOverride) {
          return {
            allowed: false,
            moduleKey: 'today',
            message: 'Tài khoản Chuyên Viên không có quyền truy cập dữ liệu doanh thu tổng quan.',
          };
        }
      }
      // Block CV from mutating CV KPI configurations (only GET is allowed on /kpi/cv* for CV)
      if (cleanPath.startsWith('/kpi/cv') && method.toUpperCase() !== 'GET') {
        return {
          allowed: false,
          moduleKey: 'cv',
          message: 'Tài khoản Chuyên Viên chỉ có quyền xem Báo Cáo CV, không có quyền thay đổi cấu hình.',
        };
      }
    }

    // Shared read-only directory/catalog lookup endpoints used across non-CV workspaces
    // (blocked for CV accounts and blocked for non-GET mutations unless the system menu is granted)
    if (
      !isCv &&
      method.toUpperCase() === 'GET' &&
      (cleanPath === '/staff' ||
        cleanPath.startsWith('/staff/') ||
        cleanPath === '/teams' ||
        cleanPath.startsWith('/teams/') ||
        cleanPath === '/roles' ||
        cleanPath.startsWith('/roles/') ||
        cleanPath === '/catalog' ||
        cleanPath.startsWith('/catalog/') ||
        cleanPath.startsWith('/pinned-links') ||
        cleanPath.startsWith('/ui-experiences'))
    ) {
      return { allowed: true, moduleKey: 'shared-lookup' };
    }

    const snapshots = await this.getCachedRestrictedPolicies(fastify);
    // Fast path for non-CV users when no policies are restricted in DB
    if (!isCv && snapshots.length === 0) {
      return { allowed: true, moduleKey: requiredKeys[0] || 'dashboard' };
    }

    const scopes = await this.getCachedActorScopes(fastify, actor);
    const menuPolicies = snapshots.filter((policy) => isManagedMenuAccessKey(policy.menuKey));
    const categoryPolicies = snapshots.filter((policy) => isManagedMenuAccessCategoryPolicyKey(policy.menuKey));
    const visibility = resolveMenuVisibility(menuPolicies, categoryPolicies, scopes, false);

    const anyAllowed = requiredKeys.some((key) => visibility[key] === true);
    if (!anyAllowed) {
      const primaryKey = requiredKeys[0] || 'dashboard';
      const menuDef = MENU_ACCESS_DEFINITIONS.find((m) => m.key === primaryKey);
      return {
        allowed: false,
        moduleKey: primaryKey,
        message: isCv
          ? 'Tài khoản Chuyên Viên chỉ được phép truy cập Báo Cáo CV, Career Path và mOS Chat.'
          : `Nhóm của bạn không có quyền truy cập phân hệ "${menuDef?.label || primaryKey}".`,
      };
    }

    return { allowed: true, moduleKey: requiredKeys[0] || 'dashboard' };
  }

  private static async hasExplicitOverrideForKeys(
    fastify: FastifyInstance,
    actor: MenuAccessActor,
    keys: string[]
  ): Promise<boolean> {
    const snapshots = await this.getCachedRestrictedPolicies(fastify);
    if (snapshots.length === 0) return false;
    const matchingPolicies = snapshots.filter((p) => p.isRestricted && keys.includes(p.menuKey));
    if (matchingPolicies.length === 0) return false;
    const scopes = await this.getCachedActorScopes(fastify, actor);
    return matchingPolicies.some((policy) => policyMatchesActorScopes(policy, scopes));
  }

  /**
   * Records a throttled 403 unauthorized access attempt in `crm_menu_access_audits`
   * so Super Admin can audit who attempted to access locked resources and when.
   */
  static async recordSecurityBlock(
    fastify: FastifyInstance,
    actor: MenuAccessActor,
    details: { moduleKey: string; method: string; path: string; reason: string; ip?: string }
  ): Promise<void> {
    try {
      const crm = (fastify.prisma as { crm?: { crmMenuAccessAudit?: { create?: unknown } } })?.crm;
      if (typeof crm?.crmMenuAccessAudit?.create !== 'function') return;

      const throttleKey = `${actor.id}:${details.moduleKey}:${details.method}:${details.path.split('?')[0]}`;
      const now = Date.now();
      const lastLogged = securityBlockThrottle.get(throttleKey) || 0;
      if (now - lastLogged < 30_000) return;
      securityBlockThrottle.set(throttleKey, now);

      await fastify.prisma.crm.crmMenuAccessAudit.create({
        data: {
          menuKey: `${SECURITY_BLOCK_PREFIX}${details.moduleKey}`.slice(0, 80),
          actorStaffId: actor.id,
          beforeJson: null,
          afterJson: JSON.stringify({
            event: 'BLOCKED_403',
            moduleKey: details.moduleKey,
            method: details.method,
            path: details.path,
            reason: details.reason,
            actorRole: actor.role,
            actorUsername: actor.username,
            actorDisplayName: actor.displayName,
            ip: details.ip,
          }),
        },
      });
    } catch (err) {
      fastify.log?.warn?.({ err }, 'Failed to record security block audit');
    }
  }

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

    const labels = this.buildSubjectLabelMap(departments, teams, staff);
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
      const parsed = this.parseBlockAudit(audit.afterJson);
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
        return this.formatPolicy(policyKey, byMenuKey.get(policyKey), labels);
      }),
      policies: MENU_ACCESS_DEFINITIONS.map((menu) => {
        const policy = byMenuKey.get(menu.key);
        return this.formatPolicy(menu.key, policy, labels);
      }),
      roleGroups: MENU_ACCESS_ROLE_GROUPS.map((group) => ({ ...group, roles: [...group.roles] })),
      departments,
      teams,
      staff,
      recentAudits: policyAudits.map((audit): MenuAccessAuditEntry => {
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

    this.invalidateRuntimeCache();
    const configuration = await this.getConfiguration(fastify);
    return [...configuration.categoryPolicies, ...configuration.policies].find((policy) => policy.menuKey === menuKey)!;
  }

  /**
   * Batch-updates menu access policies for a specific Role Group (`ROLE` subjectType).
   * Enables Danny to toggle which menus a Role Group can access in one click.
   */
  static async updateRoleGroupMatrix(
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

    this.invalidateRuntimeCache();
    return this.getConfiguration(fastify);
  }

  /**
   * Point-in-Time Permission & Audit Inspector ("Tra cứu Ai có quyền gì & Vào khi nào").
   * Reconstructs exact effective permissions and full audit timeline for a Staff member or Role Group.
   */
  static async inspectPermissions(
    fastify: FastifyInstance,
    query: { staffId?: number; roleGroupId?: number; at?: string }
  ): Promise<MenuAccessInspectorResponse> {
    const evalDate = query.at ? new Date(query.at) : new Date();
    const validEvalDate = isNaN(evalDate.getTime()) ? new Date() : evalDate;

    const [departments, teams, allStaff, allPolicies, allMenuAudits] = await Promise.all([
      fastify.prisma.crm.crmDepartment.findMany({ select: { id: true, code: true, name: true } }),
      fastify.prisma.crm.crmTeam.findMany({
        select: { id: true, code: true, name: true, parentTeamId: true, departmentId: true },
      }),
      fastify.prisma.crm.crmStaff.findMany({
        select: {
          id: true,
          displayName: true,
          username: true,
          role: true,
          isActive: true,
          legacyStaffId: true,
          createdAt: true,
        },
      }),
      fastify.prisma.crm.crmMenuAccessPolicy.findMany({ include: { rules: true } }),
      fastify.prisma.crm.crmMenuAccessAudit.findMany({
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    const staffById = new Map(allStaff.map((s) => [s.id, s]));
    const labels = this.buildSubjectLabelMap(departments, teams, allStaff);
    const menuLabels = new Map([
      ...MENU_ACCESS_DEFINITIONS.map((menu) => [menu.key, menu.label] as const),
      ...MENU_ACCESS_CATEGORY_DEFINITIONS.map(
        (category) => [getMenuAccessCategoryPolicyKey(category.key), `Danh mục · ${category.label}`] as const
      ),
    ]);

    let targetType: 'STAFF' | 'ROLE' = 'STAFF';
    let targetId = Number(query.staffId || 0);
    let targetLabel: string;
    let effectiveRole: string;
    let isAccountActive = true;
    const activeTeamIds = new Set<number>();
    const activeDepartmentIds = new Set<number>();
    const staffIds = new Set<number>();
    const timeline: MenuAccessTimelineEvent[] = [];

    if (query.roleGroupId && !query.staffId) {
      targetType = 'ROLE';
      const rg = MENU_ACCESS_ROLE_GROUPS.find((g) => g.id === Number(query.roleGroupId)) || MENU_ACCESS_ROLE_GROUPS[0];
      targetId = rg.id;
      targetLabel = `Nhóm Vai trò · ${rg.name}`;
      effectiveRole = rg.roles[0];
    } else {
      const targetStaff = staffById.get(targetId) || allStaff[0];
      if (!targetStaff) {
        throw new MenuAccessError('Không tìm thấy nhân sự cần tra cứu.', 404);
      }
      targetId = targetStaff.id;
      targetLabel = `${targetStaff.displayName} (@${targetStaff.username})`;
      effectiveRole = targetStaff.role;
      isAccountActive = targetStaff.isActive;
      staffIds.add(targetStaff.id);

      // Fetch staff audit history to reconstruct historical role & isActive at `validEvalDate`
      const staffAudits = await fastify.prisma.crm.crmStaffAudit.findMany({
        where: { staffId: targetStaff.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      // Reconstruct role and isActive at validEvalDate by walking backwards from current state
      for (const sa of staffAudits) {
        const actorPerson = sa.actorStaffId ? staffById.get(sa.actorStaffId) : null;
        const actorName = actorPerson ? `${actorPerson.displayName} (@${actorPerson.username})` : 'Hệ thống / Admin';

        if (sa.fieldName === 'role') {
          timeline.push({
            id: `staff-audit-${sa.id}`,
            timestamp: sa.createdAt.toISOString(),
            eventType: 'ROLE_CHANGE',
            summary: `Đổi vai trò: ${sa.oldValue || '—'} → ${sa.newValue || '—'}`,
            actorLabel: actorName,
            details: `Hành động: ${sa.action}`,
          });
          if (sa.createdAt > validEvalDate && sa.oldValue) {
            effectiveRole = sa.oldValue;
          }
        } else if (sa.fieldName === 'isActive') {
          timeline.push({
            id: `staff-audit-${sa.id}`,
            timestamp: sa.createdAt.toISOString(),
            eventType: 'ACCOUNT_STATUS',
            summary: `Trạng thái đăng nhập CRM: ${sa.oldValue} → ${sa.newValue}`,
            actorLabel: actorName,
            details: sa.newValue === 'false' ? 'Khóa đăng nhập CRM' : 'Mở khóa đăng nhập CRM',
          });
          if (sa.createdAt > validEvalDate && sa.oldValue !== null) {
            isAccountActive = sa.oldValue === 'true' || sa.oldValue === '1';
          }
        }
      }

      // Active team memberships at `validEvalDate`
      const memberWhere = targetStaff.legacyStaffId
        ? { OR: [{ crmStaffId: targetStaff.id }, { legacyStaffId: targetStaff.legacyStaffId }] }
        : { crmStaffId: targetStaff.id };
      const memberships = await fastify.prisma.crm.crmTeamMember.findMany({
        where: memberWhere,
      });
      const teamById = new Map(teams.map((t) => [t.id, t]));
      for (const m of memberships) {
        const joinedOk = !m.joinedAt || m.joinedAt <= validEvalDate;
        const leftOk = !m.leftAt || m.leftAt > validEvalDate;
        if (m.isActive && joinedOk && leftOk) {
          let curr: number | null = m.teamId;
          while (curr && !activeTeamIds.has(curr)) {
            const t = teamById.get(curr);
            if (!t) break;
            activeTeamIds.add(t.id);
            if (t.departmentId) activeDepartmentIds.add(t.departmentId);
            curr = t.parentTeamId;
          }
        }
      }
    }

    const effectiveRoleGroup = getRoleGroupForRole(effectiveRole) || null;
    const roleGroupIds = new Set<number>(effectiveRoleGroup ? [effectiveRoleGroup.id] : []);
    const scopes: ActorScopes = {
      role: effectiveRole,
      roleGroupIds,
      departmentIds: activeDepartmentIds,
      teamIds: activeTeamIds,
      staffIds,
    };

    // Reconstruct policies at `validEvalDate`
    const policyAudits = allMenuAudits.filter((a) => !a.menuKey.startsWith(SECURITY_BLOCK_PREFIX));
    const reconstructedPolicies = new Map<
      string,
      { snapshot: PolicySnapshot; grantedBy?: string; grantedAt?: string }
    >();

    for (const p of allPolicies) {
      reconstructedPolicies.set(p.menuKey, {
        snapshot: policySnapshot(p),
        grantedAt: p.updatedAt?.toISOString(),
      });
    }

    // Walk backwards through policy audits that happened AFTER `validEvalDate`
    for (const audit of policyAudits) {
      const actorPerson = audit.actorStaffId ? staffById.get(audit.actorStaffId) : null;
      const actorName = actorPerson ? `${actorPerson.displayName} (@${actorPerson.username})` : 'Hệ thống';
      const before = this.parseAuditPolicy(audit.beforeJson);
      const after = this.parseAuditPolicy(audit.afterJson);

      if (audit.createdAt > validEvalDate) {
        reconstructedPolicies.set(audit.menuKey, {
          snapshot: { menuKey: audit.menuKey, isRestricted: before.isRestricted, rules: before.rules },
        });
      } else {
        const existing = reconstructedPolicies.get(audit.menuKey);
        if (existing && !existing.grantedBy) {
          existing.grantedBy = actorName;
          existing.grantedAt = audit.createdAt.toISOString();
        }
      }

      // Add to timeline if relevant to this target or global policy change
      const touchesTarget =
        [...before.rules, ...after.rules].some(
          (r) =>
            (r.subjectType === 'STAFF' && staffIds.has(r.subjectId)) ||
            (r.subjectType === 'TEAM' && activeTeamIds.has(r.subjectId)) ||
            (r.subjectType === 'DEPARTMENT' && activeDepartmentIds.has(r.subjectId)) ||
            (r.subjectType === 'ROLE' && roleGroupIds.has(r.subjectId))
        ) || !isCvRole(effectiveRole);

      if (touchesTarget) {
        const afterLabels = after.rules.map(
          (r) => labels.get(`${r.subjectType}:${r.subjectId}`) || `${r.subjectType}:${r.subjectId}`
        );
        timeline.push({
          id: `policy-audit-${audit.id}`,
          timestamp: audit.createdAt.toISOString(),
          eventType: 'POLICY_CHANGE',
          summary: `Cập nhật quyền "${menuLabels.get(audit.menuKey) || audit.menuKey}": ${
            after.isRestricted ? `Giới hạn (${after.rules.length} đối tượng)` : 'Mặc định theo vai trò'
          }`,
          actorLabel: actorName,
          details: afterLabels.length > 0 ? `Đối tượng được cấp: ${afterLabels.join(', ')}` : undefined,
        });
      }
    }

    // Include blocked 403 attempts for this staff member (or role group)
    const blockAudits = allMenuAudits.filter((a) => a.menuKey.startsWith(SECURITY_BLOCK_PREFIX));
    for (const block of blockAudits) {
      const parsed = this.parseBlockAudit(block.afterJson);
      const matchesTarget =
        targetType === 'STAFF'
          ? block.actorStaffId === targetId
          : getRoleGroupForRole(parsed.actorRole)?.id === targetId;
      if (matchesTarget) {
        const actorPerson = block.actorStaffId ? staffById.get(block.actorStaffId) : null;
        const actorName = actorPerson
          ? `${actorPerson.displayName} (@${actorPerson.username})`
          : `Nhân sự #${block.actorStaffId}`;
        timeline.push({
          id: `block-audit-${block.id}`,
          timestamp: block.createdAt.toISOString(),
          eventType: 'BLOCKED_403',
          summary: `Chặn truy cập 403: ${parsed.method || 'GET'} ${parsed.path || block.menuKey}`,
          actorLabel: actorName,
          details: parsed.reason,
        });
      }
    }

    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const activeSnapshots = [...reconstructedPolicies.values()].map((v) => v.snapshot);
    const menuPolicies = activeSnapshots.filter((p) => isManagedMenuAccessKey(p.menuKey));
    const categoryPolicies = activeSnapshots.filter((p) => isManagedMenuAccessCategoryPolicyKey(p.menuKey));
    const isAdmin = isAdminOrSuperAdminRole(effectiveRole);
    const visibility = resolveMenuVisibility(menuPolicies, categoryPolicies, scopes, isAdmin);

    const allowedMenus: MenuAccessInspectorAllowedItem[] = [];
    let deniedMenusCount = 0;

    for (const menu of MENU_ACCESS_DEFINITIONS) {
      if (visibility[menu.key]) {
        const polInfo = reconstructedPolicies.get(menu.key);
        const pol = polInfo?.snapshot;
        let grantSource = isAdmin
          ? 'Toàn quyền Admin / Super Admin'
          : isCvRole(effectiveRole) && CV_DEFAULT_SET.has(menu.key)
            ? 'Quyền mặc định nhóm Chuyên Viên (CV)'
            : `Quyền mặc định theo vai trò (${effectiveRoleGroup?.name || effectiveRole})`;

        if (pol?.isRestricted && !isAdmin) {
          const matchedRule = pol.rules.find((r) => {
            if (r.subjectType === 'STAFF') return staffIds.has(r.subjectId);
            if (r.subjectType === 'TEAM') return activeTeamIds.has(r.subjectId);
            if (r.subjectType === 'DEPARTMENT') return activeDepartmentIds.has(r.subjectId);
            if (r.subjectType === 'ROLE') return roleGroupIds.has(r.subjectId);
            return false;
          });
          if (matchedRule) {
            grantSource = `Cấp theo ${labels.get(`${matchedRule.subjectType}:${matchedRule.subjectId}`) || matchedRule.subjectType}`;
          }
        }

        allowedMenus.push({
          key: menu.key,
          label: menu.label,
          groupLabel: menu.groupLabel,
          path: menu.path,
          grantSource,
          grantedBy: polInfo?.grantedBy || null,
          grantedAt: polInfo?.grantedAt || null,
        });
      } else {
        deniedMenusCount++;
      }
    }

    return {
      targetType,
      targetId,
      targetLabel,
      evaluatedAt: validEvalDate.toISOString(),
      effectiveRole,
      effectiveRoleGroup,
      isAccountActive,
      activeTeams: teams.filter((t) => activeTeamIds.has(t.id)).map((t) => ({ id: t.id, code: t.code, name: t.name })),
      activeDepartments: departments
        .filter((d) => activeDepartmentIds.has(d.id))
        .map((d) => ({ id: d.id, code: d.code, name: d.name })),
      allowedMenus,
      deniedMenusCount,
      auditTimeline: timeline.slice(0, 50),
    };
  }

  private static buildSubjectLabelMap(
    departments: Array<{ id: number; code: string; name: string }>,
    teams: Array<{ id: number; code: string; name: string }>,
    staff: Array<{ id: number; displayName: string; username: string }>
  ): Map<string, string> {
    const labels = new Map<string, string>();
    MENU_ACCESS_ROLE_GROUPS.forEach((group) => labels.set(`ROLE:${group.id}`, `Nhóm Vai trò · ${group.name}`));
    departments.forEach((department) => labels.set(`DEPARTMENT:${department.id}`, `Department · ${department.name}`));
    teams.forEach((team) => labels.set(`TEAM:${team.id}`, `Team · ${team.name} (${team.code})`));
    staff.forEach((person) =>
      labels.set(`STAFF:${person.id}`, `Cá nhân · ${person.displayName} (@${person.username})`)
    );
    return labels;
  }

  private static async getActorScopes(fastify: FastifyInstance, actor: MenuAccessActor): Promise<ActorScopes> {
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

  private static async validateSubjects(fastify: FastifyInstance, subjects: MenuAccessSubjectInput[]): Promise<void> {
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

  private static parseBlockAudit(value: string | null): {
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
}
