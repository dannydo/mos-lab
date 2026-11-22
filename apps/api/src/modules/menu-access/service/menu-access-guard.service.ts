import type { FastifyInstance } from 'fastify';
import {
  getMenuAccessCategoryPolicyKey,
  isAdminOrSuperAdminRole,
  isCvRole,
  isManagedMenuAccessCategoryPolicyKey,
  isManagedMenuAccessKey,
  MENU_ACCESS_CATEGORY_DEFINITIONS,
  MENU_ACCESS_DEFINITIONS,
  resolveMenuKeysForApiPath,
  type MenuAccessSidebarResponse,
} from '@mos-lab/shared';
import {
  DEFAULT_OPEN_SET,
  getActorScopes,
  getCachedActorScopes,
  getCachedRestrictedPolicies,
  policyMatchesActorScopes,
  policySnapshot,
  resolveMenuVisibility,
  SECURITY_BLOCK_PREFIX,
  securityBlockThrottle,
  type MenuAccessActor,
} from './menu-access-core.js';

async function hasExplicitOverrideForKeys(
  fastify: FastifyInstance,
  actor: MenuAccessActor,
  keys: string[]
): Promise<boolean> {
  const snapshots = await getCachedRestrictedPolicies(fastify);
  if (snapshots.length === 0) return false;
  const matchingPolicies = snapshots.filter((p) => p.isRestricted && keys.includes(p.menuKey));
  if (matchingPolicies.length === 0) return false;
  const scopes = await getCachedActorScopes(fastify, actor);
  return matchingPolicies.some((policy) => policyMatchesActorScopes(policy, scopes));
}

/**
 * API-level permission check used by `requireAuth` middleware.
 * Ensures backend API routes are locked in sync with the Unified Permission Matrix.
 */
export async function checkMenuApiAccess(
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
  if (requiredKeys.includes('__ADMIN_ONLY_DEFAULT__')) {
    return {
      allowed: false,
      moduleKey: 'admin-only-default',
      message: 'Chức năng mới mặc định chỉ dành cho Admin. Các vai trò khác không có quyền truy cập.',
    };
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
      const hasOverride = await hasExplicitOverrideForKeys(fastify, actor, ['customers-all', 'my-customers']);
      if (!hasOverride) {
        return {
          allowed: false,
          moduleKey: 'customers',
          message: 'Tài khoản Chuyên Viên không có quyền truy cập danh sách khách hàng CRM.',
        };
      }
    }
    if (cleanPath === '/customers/stats') {
      const hasOverride = await hasExplicitOverrideForKeys(fastify, actor, ['customers-all', 'my-customers']);
      if (!hasOverride) {
        return {
          allowed: false,
          moduleKey: 'customers',
          message: 'Tài khoản Chuyên Viên không có quyền truy cập thống kê khách hàng CRM.',
        };
      }
    }
    if (cleanPath.startsWith('/dashboard/today/revenue-')) {
      const hasOverride = await hasExplicitOverrideForKeys(fastify, actor, ['today', 'dashboard']);
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
      cleanPath.startsWith('/ui-experiences') ||
      cleanPath === '/nyc/config' ||
      cleanPath === '/saved-filters')
  ) {
    return { allowed: true, moduleKey: 'shared-lookup' };
  }

  const snapshots = await getCachedRestrictedPolicies(fastify);
  // Fast path for non-CV users when no policies are restricted in DB
  if (!isCv && snapshots.length === 0) {
    return { allowed: true, moduleKey: requiredKeys[0] || 'dashboard' };
  }

  const scopes = await getCachedActorScopes(fastify, actor);
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

/**
 * Records a throttled 403 unauthorized access attempt in `crm_menu_access_audits`
 * so Super Admin can audit who attempted to access locked resources and when.
 */
export async function recordMenuSecurityBlock(
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

export async function getMenuSidebarVisibility(
  fastify: FastifyInstance,
  actor: MenuAccessActor
): Promise<MenuAccessSidebarResponse> {
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
  const menuPolicies = snapshots.filter((policy) => isManagedMenuAccessKey(policy.menuKey));
  const categoryPolicies = snapshots.filter((policy) => isManagedMenuAccessCategoryPolicyKey(policy.menuKey));
  const isAdmin = isAdminOrSuperAdminRole(actor.role);
  const scopes = await getActorScopes(fastify, actor);
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
