import { isCanonicalSuperAdminIdentity, isSuperAdminRole, type SafeAny } from '@mos-lab/shared';
import { resolveRoleLandingRoute } from '~/lib/resolve-landing-route';

export const isLocalDevLoginEnabled =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_LOCAL_DEV_MOCK_LOGIN === '1';

export const GOOGLE_GIS_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '648958464510-tedkbs4n8dmrgfjhqegcien7r0u7ed9g.apps.googleusercontent.com';

export const AUTH_STORAGE_KEYS_TO_CLEAR = [
  'mos_token',
  'mos_user',
  'mos_omicall_auto_init',
  'mos_original_token',
  'mos_original_user',
  'mos_impersonation_audit_id',
] as const;

export interface DevStaff {
  id: number;
  username: string;
  displayName: string;
  role: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export type RoleCategoryKey =
  | 'super_admin'
  | 'admin'
  | 'manager'
  | 'telesales'
  | 'cvl'
  | 'cvll'
  | 'cv'
  | 'cc'
  | 'cs'
  | 'fm'
  | 'executive'
  | 'teacher'
  | 'other';

export interface RoleCategory {
  key: RoleCategoryKey;
  label: string;
  roles: string[];
}

export const ROLE_CATEGORIES: RoleCategory[] = [
  { key: 'super_admin', label: 'Super Admin', roles: ['super_admin'] },
  { key: 'admin', label: 'Admin', roles: ['admin'] },
  { key: 'manager', label: 'Quản Lý', roles: ['manager'] },
  { key: 'telesales', label: 'Telesales', roles: ['telesales', 'booker'] },
  { key: 'cvl', label: 'CVL (Tự Chủ)', roles: ['cvl', 'cv_plus'] },
  { key: 'cvll', label: 'CVLL (Cấp Cao)', roles: ['cvll', 'cv_plus_plus'] },
  { key: 'cv', label: 'CV Kỹ Thuật', roles: ['cv', 'lt', 'technician', 'ktv'] },
  { key: 'cc', label: 'CC Sảnh', roles: ['cc'] },
  { key: 'cs', label: 'CS Khách Hàng', roles: ['cs'] },
  { key: 'fm', label: 'Cơ Sở (FM)', roles: ['fm'] },
  { key: 'executive', label: 'Ban Điều Hành', roles: ['boss', 'cho', 'hr'] },
  { key: 'teacher', label: 'Đào Tạo', roles: ['teacher', 'ht'] },
  {
    key: 'other',
    label: 'Khác (QA/Staff)',
    roles: ['qa', 'qc', 'qa_qc', 'staff', 'office-cleaner', 'security-guard'],
  },
];

export function isSuperAdminDevStaff(staff: Pick<DevStaff, 'role' | 'username' | 'email'>): boolean {
  return (
    isSuperAdminRole(staff.role) || isCanonicalSuperAdminIdentity({ username: staff.username, email: staff.email })
  );
}

export function getUsersForRoleCategory(staffs: DevStaff[], category: RoleCategory): DevStaff[] {
  if (category.key === 'super_admin') {
    return staffs.filter((staff) => isSuperAdminDevStaff(staff));
  }
  return staffs.filter((staff) => {
    if (isCanonicalSuperAdminIdentity({ username: staff.username, email: staff.email })) {
      return false;
    }
    return category.roles.includes(String(staff.role || '').toLowerCase());
  });
}

export function filterDevStaffs(staffs: DevStaff[], searchText: string): DevStaff[] {
  const query = searchText.trim().toLowerCase();
  if (!query) return staffs;
  return staffs.filter(
    (staff) =>
      staff.displayName?.toLowerCase().includes(query) ||
      staff.username?.toLowerCase().includes(query) ||
      (staff.email && staff.email.toLowerCase().includes(query))
  );
}

export async function resolvePostLoginRoute(user?: SafeAny): Promise<string> {
  if (typeof window !== 'undefined') {
    const nextParam = new URLSearchParams(window.location.search).get('next');
    if (nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')) {
      return nextParam;
    }
  }
  return resolveRoleLandingRoute(user);
}

export function persistLoginSession(payload: {
  token: string;
  user: SafeAny;
  resolvedOmicallAutoInit?: boolean;
}): void {
  localStorage.setItem('mos_token', payload.token);
  localStorage.setItem('mos_user', JSON.stringify(payload.user));
  localStorage.setItem('mos_omicall_auto_init', String(!!payload.resolvedOmicallAutoInit));
}

export function clearAuthStorageKeys(): void {
  AUTH_STORAGE_KEYS_TO_CLEAR.forEach((key) => localStorage.removeItem(key));
}
