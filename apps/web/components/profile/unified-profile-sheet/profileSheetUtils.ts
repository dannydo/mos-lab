import {
  hasCcTeamMembership,
  isAdminOrSuperAdminRole,
  isCvRole,
  normalizeCvFeatherRole,
  type SafeAny,
} from '@mos-lab/shared';
import type { IosUserRole } from '../../../app/ios-app/state/useIosAppState';
import { resolveMediaUrl } from '../../../lib/api-client';
import type { DesktopDensityOption, ResolvedProfileIdentity, UnifiedProfileAppContext } from './types';

export const DESKTOP_DENSITY_OPTIONS: readonly { id: DesktopDensityOption; label: string }[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'standard', label: 'Standard' },
  { id: 'comfortable', label: 'Thoải mái' },
];

export const IOS_SWITCHABLE_ROLES: readonly ('CVL' | 'CVLL' | 'CC')[] = ['CVL', 'CVLL', 'CC'];

export function readStoredUser(): SafeAny {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('mos_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistStoredUserAvatar(newAvatarUrl: string): void {
  if (typeof window === 'undefined') return;
  try {
    const stored = readStoredUser();
    if (stored) {
      window.localStorage.setItem('mos_user', JSON.stringify({ ...stored, avatarUrl: newAvatarUrl }));
    }
  } catch {}
}

export function clearStoredAuthSession(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('mos_token');
  window.localStorage.removeItem('mos_user');
  window.localStorage.removeItem('mos_omicall_auto_init');
  window.localStorage.removeItem('mos_original_token');
  window.localStorage.removeItem('mos_original_user');
  window.localStorage.removeItem('mos_original_omicall_auto_init');
  window.localStorage.removeItem('mos_impersonation_audit_id');
  window.location.replace('/login');
}

export function resolveProfileAvatarUrl(rawAvatar: unknown): string | undefined {
  if (!rawAvatar) return undefined;
  const normalized = String(rawAvatar).replace(
    /^https?:\/\/(s|api|www)?\.?wingslashes\.com/,
    'https://cdn.wingslashes.com'
  );
  return typeof resolveMediaUrl === 'function' ? resolveMediaUrl(normalized) : normalized;
}

export function resolveProfileIdentity({
  appContext,
  effectiveUser,
  iosRole,
  isAdminProp,
}: {
  appContext: UnifiedProfileAppContext;
  effectiveUser: SafeAny;
  iosRole?: IosUserRole;
  isAdminProp?: boolean;
}): ResolvedProfileIdentity {
  const effectiveRoleStr = String(effectiveUser?.role || '').trim();
  const teamCodes: string[] | undefined = Array.isArray(effectiveUser?.teamCodes) ? effectiveUser.teamCodes : undefined;

  const isAdmin = isAdminProp ?? isAdminOrSuperAdminRole(effectiveRoleStr);
  const isCv = isCvRole(effectiveRoleStr);
  const isCcTeamMember = hasCcTeamMembership(teamCodes);
  const featherTier = normalizeCvFeatherRole(effectiveRoleStr);

  const effectiveIosRole: IosUserRole | undefined =
    iosRole ?? (isCcTeamMember ? 'CC' : featherTier === 'CVLL' ? 'CVLL' : featherTier === 'CVL' ? 'CVL' : undefined);
  const isCvl = appContext === 'ios' ? effectiveIosRole === 'CVL' : featherTier === 'CVL';
  const isCvll = appContext === 'ios' ? effectiveIosRole === 'CVLL' : featherTier === 'CVLL';

  return {
    effectiveUser,
    effectiveRoleStr,
    teamCodes,
    isAdmin,
    isCv,
    isCcTeamMember,
    featherTier,
    effectiveIosRole,
    isCvl,
    isCvll,
  };
}

export function computeOperationalScopeText({
  appContext,
  effectiveIosRole,
  isAdmin,
  isCcTeamMember,
  effectiveRoleStr,
  featherTier,
  isCv,
}: {
  appContext: UnifiedProfileAppContext;
  effectiveIosRole?: IosUserRole;
  isAdmin: boolean;
  isCcTeamMember: boolean;
  effectiveRoleStr: string;
  featherTier: 'CVL' | 'CVLL' | null;
  isCv: boolean;
}): string {
  if (appContext === 'ios') {
    if (effectiveIosRole === 'CVL') return '1 khách đầu tua + khách book đích danh';
    if (effectiveIosRole === 'CVLL') return 'Khách của mình & hỗ trợ toàn chi nhánh';
    if (effectiveIosRole === 'CC') return 'Toàn bộ khách hàng tại chi nhánh';
    return 'Toàn bộ dữ liệu vận hành chi nhánh';
  }
  if (isAdmin) return 'Toàn quyền quản trị hệ thống mOS';
  if (isCcTeamMember && effectiveRoleStr.toLowerCase() !== 'cc') {
    return 'Quản lý vận hành & Tư vấn chi nhánh (CC)';
  }
  if (featherTier === 'CVL' || featherTier === 'CVLL' || isCv) {
    return 'Thu nhập cá nhân & Lộ trình thăng tiến';
  }
  if (effectiveRoleStr.toLowerCase() === 'cc') {
    return 'Toàn bộ khách hàng tại chi nhánh';
  }
  return 'Vận hành & Theo dõi KPI theo phân quyền';
}
