/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type SafeAny = any;

export type UserRole =
  'telesales' | 'manager' | 'admin' | 'super_admin' | 'oc' | 'cc' | 'ls' | 'technician' | 'qa' | 'qc' | 'qa_qc';

/**
 * Super Admin is an explicit role, not an email-based bypass. The identities
 * below are used only when provisioning Danny Do's canonical account.
 */
export const SUPER_ADMIN_IDENTITIES = ['admin', 'danhdo@gmail.com', 'danny.do@wingslashes.com'] as const;

export function isSuperAdminRole(role?: string | null): boolean {
  return (
    String(role || '')
      .trim()
      .toLowerCase() === 'super_admin'
  );
}

/** Super Admin inherits every ordinary Admin capability. */
export function isAdminOrSuperAdminRole(role?: string | null): boolean {
  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase();
  return normalizedRole === 'admin' || normalizedRole === 'super_admin';
}

/**
 * Booker is retained as a legacy alias while staff accounts are migrated to
 * the canonical `telesales` role.
 */
export function isTelesalesRole(role?: string | null): boolean {
  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase();
  return normalizedRole === 'telesales' || normalizedRole === 'booker';
}

/**
 * LoCa is an operational customer-care workspace. Telesales can work only
 * with the customer scope enforced by the API; configuration remains guarded
 * by its own write authorization.
 */
export function canAccessLoca(role?: string | null): boolean {
  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase();
  return (
    isAdminOrSuperAdminRole(normalizedRole) ||
    ['manager', 'oc', 'cc', 'cs', 'control'].includes(normalizedRole) ||
    isTelesalesRole(normalizedRole)
  );
}

export function isCanonicalSuperAdminIdentity(identity: { username?: string | null; email?: string | null }): boolean {
  const username = String(identity.username || '')
    .trim()
    .toLowerCase();
  const email = String(identity.email || '')
    .trim()
    .toLowerCase();
  return SUPER_ADMIN_IDENTITIES.some((value) => value === username || value === email);
}

export interface Staff {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  // HR System Extensions
  email?: string | null;
  phone?: string | null;
  joinedAt?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  legacyStaffId?: number | null;
  lastLoginAt?: string | null;
  lastActiveAt?: string | null;
  omicallAutoInit?: boolean | null;
  baseSalary?: number | null;
  hourlyWage?: number | null;
  seniorityOffset?: number | null;
  offDays?: string[] | null;
  off_days?: string[] | null;
  offDaysList?: string[] | null;
}

export interface LoginRequest {
  username?: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: Staff;
  resolvedOmicallAutoInit?: boolean;
}

export interface AuthState {
  token: string | null;
  user: Staff | null;
}

export interface Role {
  key: string;
  name: string;
  color: string;
  viewKPI: boolean;
  viewTeamKPI: boolean;
  manageStaff: boolean;
  omicallAutoInit: boolean;
  isSystem: boolean;
  description?: string;
  createdAt: string;
}
