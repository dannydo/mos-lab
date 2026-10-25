/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type SafeAny = any;

export type UserRole =
  | 'telesales'
  | 'manager'
  | 'admin'
  | 'super_admin'
  | 'oc'
  | 'cc'
  | 'ls'
  | 'technician'
  | 'qa'
  | 'qc'
  | 'qa_qc'
  | 'hr'
  | 'fm'
  | 'cho'
  | 'boss';

export type EmploymentStatus = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED';
export type ContractStatus = 'PROBATION' | 'OFFICIAL' | 'TERMINATED';

export interface StaffAuditLog {
  id: number;
  staffId: number;
  actorStaffId?: number | null;
  actorStaffName?: string | null;
  action: string;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

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

export function isHrRole(role?: string | null): boolean {
  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase();
  return normalizedRole === 'hr';
}

/** Admin, Super Admin, and HR can manage and view sensitive HR personnel information. */
export function isHrOrAdminRole(role?: string | null): boolean {
  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase();
  return isAdminOrSuperAdminRole(normalizedRole) || normalizedRole === 'hr';
}

/** Roles allowed to allocate, recall, and audit Booker customer assignments. */
export function canManageCustomerAllocation(role?: string | null): boolean {
  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase();
  return isAdminOrSuperAdminRole(normalizedRole) || normalizedRole === 'manager';
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

export function isCanonicalSuperAdminIdentity(
  identity?: { username?: string | null; email?: string | null } | null
): boolean {
  if (!identity) return false;
  const username = String(identity.username || '')
    .trim()
    .toLowerCase();
  const email = String(identity.email || '')
    .trim()
    .toLowerCase();
  return SUPER_ADMIN_IDENTITIES.some((value) => value === username || value === email);
}

/**
 * Chuyên Viên (CV) and Lash Technician roles.
 * Invariant: CV accounts must be restricted from management dashboard and default to CV reports.
 */
export function isCvRole(role?: string | null): boolean {
  const normalizedRole = String(role || '')
    .trim()
    .toLowerCase();
  return ['cv', 'lt', 'technician', 'ktv'].includes(normalizedRole);
}

/**
 * Returns the default landing route based on staff role.
 * - CV roles land directly on the CV report (/dashboard/cv).
 * - Other roles land on the main operations dashboard (/dashboard).
 */
export function getDefaultRouteForRole(role?: string | null): string {
  if (isCvRole(role)) {
    return '/dashboard/cv';
  }
  return '/dashboard';
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
  lastOnboardingEmailSentAt?: string | null;
  omicallAutoInit?: boolean | null;
  baseSalary?: number | null;
  hourlyWage?: number | null;
  payBasis?: import('./holiday-work.js').HolidayPayBasis | null;
  seniorityOffset?: number | null;
  // Employment & Legal Info (HR Extensions - MOS-FEAT-26)
  staffCode?: string | null;
  employmentStatus?: EmploymentStatus;
  contractStatus?: ContractStatus;
  contractStartDate?: string | null;
  contractEndDate?: string | null;
  nationalId?: string | null;
  socialInsuranceNo?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  offDays?: string[] | null;
  off_days?: string[] | null;
  offDaysList?: string[] | null;
  // Department & OmiCall Access Controls
  isGrowthMember?: boolean;
  canAccessOmiCall?: boolean;
}

export interface SendOnboardingEmailRequest {
  emailOverride?: string;
}

export interface BulkSendOnboardingEmailRequest {
  staffIds: number[];
}

export interface SendOnboardingEmailResponse {
  success: boolean;
  message: string;
  sentTo: string;
  isMock?: boolean;
  lastOnboardingEmailSentAt?: string;
}

export interface BulkSendOnboardingEmailResponse {
  success: boolean;
  message: string;
  totalRequested: number;
  sentCount: number;
  failedCount: number;
  details: {
    staffId: number;
    displayName: string;
    email: string;
    success: boolean;
    error?: string;
  }[];
}

export interface LoginRequest {
  username?: string;
  password?: string;
}

export interface LoginResponse {
  token: string;
  user: Staff;
  resolvedOmicallAutoInit?: boolean;
  impersonation?: {
    auditId: number;
    expiresAt: string;
  };
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
