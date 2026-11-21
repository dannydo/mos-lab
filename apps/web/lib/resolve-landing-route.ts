import { isAdminOrSuperAdminRole, isCcRole, isCvRole, resolveLandingRoute } from '@mos-lab/shared';
import { apiClient } from './api-client';

const VISIBILITY_TIMEOUT_MS = 3000;

type LandingUser = { role?: string | null; teamCodes?: readonly string[] | null } | null | undefined;

/**
 * Role-based landing route (used only when there is no `?next=` redirect).
 * Admin / CV / CC always can open their preferred workspace, so no network call is needed.
 * Other roles load their sidebar visibility so a hidden landing page falls back to
 * the first allowed menu entry (and finally mOS Chat) instead of the Operations Center.
 */
export async function resolveRoleLandingRoute(user: LandingUser): Promise<string> {
  const role = user?.role;
  const teamCodes = user?.teamCodes;
  if (!role || isAdminOrSuperAdminRole(role) || isCvRole(role) || isCcRole(role)) {
    return resolveLandingRoute({ role, teamCodes });
  }
  let menuVisibility: Record<string, boolean> | null = null;
  try {
    const res = await Promise.race([
      apiClient.menuAccess.getSidebarVisibility(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), VISIBILITY_TIMEOUT_MS)),
    ]);
    menuVisibility = res?.data?.visibility || null;
  } catch {
    menuVisibility = null;
  }
  return resolveLandingRoute({ role, menuVisibility, teamCodes });
}
