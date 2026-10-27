/** Principal types that can receive a menu & API permission grant. */
export type MenuAccessScopeType = 'ROLE' | 'DEPARTMENT' | 'TEAM' | 'STAFF';

/** Canonical role groups for group-based security management. */
export interface MenuAccessRoleGroupOption {
  id: number;
  code: string;
  name: string;
  roles: string[];
  description: string;
}

export const MENU_ACCESS_ROLE_GROUPS: readonly MenuAccessRoleGroupOption[] = [
  {
    id: 1,
    code: 'CV',
    name: 'Chuyên Viên (CV / KTV / LT)',
    roles: ['cv', 'lt', 'technician', 'ktv'],
    description: 'Đội ngũ Chuyên Viên Kỹ Thuật & Nghệ Nhân Mi (Mặc định chỉ xem Báo Cáo CV, Career Path & mOS Chat)',
  },
  {
    id: 2,
    code: 'CC',
    name: 'Tư vấn viên (CC)',
    roles: ['cc', 'consultant'],
    description: 'Đội ngũ Client Consultant tại cửa hàng',
  },
  {
    id: 3,
    code: 'TELESALES',
    name: 'Booker & Telesales',
    roles: ['telesales', 'booker'],
    description: 'Đội ngũ Booker & Telesales đặt lịch hẹn',
  },
  {
    id: 4,
    code: 'CS',
    name: 'Chăm sóc khách hàng (CS / CoCa)',
    roles: ['cs', 'coca', 'control'],
    description: 'Đội ngũ CSKH, LoCa và Kiểm soát chất lượng dịch vụ',
  },
  {
    id: 5,
    code: 'OC_LS',
    name: 'Điều phối & Giám sát (OC / LS)',
    roles: ['oc', 'ls'],
    description: 'Điều phối vận hành và Trưởng nhóm Sales',
  },
  {
    id: 6,
    code: 'QA_QC',
    name: 'Kiểm soát chất lượng (QA / QC)',
    roles: ['qa', 'qc', 'qa_qc'],
    description: 'Đội ngũ QA/QC kiểm định chất lượng Shop, Chuyên Viên và CX',
  },
  {
    id: 7,
    code: 'HR',
    name: 'Nhân sự (HR)',
    roles: ['hr'],
    description: 'Bộ phận Hành chính Nhân sự',
  },
  {
    id: 8,
    code: 'MANAGER',
    name: 'Quản lý (Manager / FM / CHO / BOSS)',
    roles: ['manager', 'fm', 'cho', 'boss', 'accountant'],
    description: 'Cấp quản lý cửa hàng, Floor Manager, CHO, Đối tác chi nhánh & Kế toán',
  },
] as const;

export function getRoleGroupForRole(role?: string | null): MenuAccessRoleGroupOption | undefined {
  const normalized = String(role || '')
    .trim()
    .toLowerCase();
  if (!normalized) return undefined;
  return MENU_ACCESS_ROLE_GROUPS.find((group) => group.roles.includes(normalized));
}

export const CV_DEFAULT_ALLOWED_MENU_KEYS = ['cv', 'career-path'] as const;

/**
 * Strict allowlist of frontend paths accessible to CV accounts by default.
 * Only Báo Cáo CV (/dashboard/cv), Career Path (/dashboard/career-path), and mOS Chat (/dashboard/chat, /chat) are allowed.
 */
export function isCvAllowedPath(pathname?: string | null, menuVisibility?: Record<string, boolean>): boolean {
  if (!pathname) return false;
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  if (
    cleanPath === '/dashboard/cv' ||
    cleanPath.startsWith('/dashboard/cv/') ||
    cleanPath === '/dashboard/career-path' ||
    cleanPath.startsWith('/dashboard/career-path/') ||
    cleanPath === '/dashboard/chat' ||
    cleanPath.startsWith('/dashboard/chat/') ||
    cleanPath === '/chat' ||
    cleanPath.startsWith('/chat/')
  ) {
    return true;
  }
  if (menuVisibility) {
    for (const def of MENU_ACCESS_DEFINITIONS) {
      const defBasePath = def.path.split('?')[0].replace(/\/+$/, '');
      if (defBasePath && defBasePath !== '/dashboard' && cleanPath.startsWith(defBasePath)) {
        if (menuVisibility[def.key] === true) return true;
      }
      if (defBasePath === '/dashboard' && cleanPath === '/dashboard' && menuVisibility.dashboard === true) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Maps a normalized backend API path (without `/api` prefix and without query string)
 * to the canonical menu access keys that govern it.
 * - Returns `['__SESSION_ALLOWED__']` for core session/shell/chat endpoints allowed for all signed-in staff.
 * - Returns `['__BUG_REPORT_BLOCKED_FOR_CV__']` for bug report endpoints so CV is strictly blocked.
 * - Returns matching `menuKey`s for module endpoints.
 */
export function resolveMenuKeysForApiPath(apiPath: string): string[] {
  const clean =
    (
      '/' +
      apiPath
        .split('?')[0]
        .replace(/^\/+/, '')
        .replace(/^api\/+/, '')
    ).replace(/\/+$/, '') || '/';

  // 1. Core session, profile, chat, notifications, and shell bootstrap endpoints
  if (
    clean === '/health' ||
    clean.startsWith('/health/') ||
    clean === '/release' ||
    clean.startsWith('/auth/') ||
    clean === '/auth' ||
    clean === '/menu-access/sidebar' ||
    clean.startsWith('/chat/') ||
    clean === '/chat' ||
    clean.startsWith('/notifications') ||
    clean.startsWith('/ui-experiences/active') ||
    clean.startsWith('/user-preferences') ||
    clean.startsWith('/table-config') ||
    clean.startsWith('/bible')
  ) {
    return ['__SESSION_ALLOWED__'];
  }

  // 2. Bug Reports (mOS Mission) & Frontend Telemetry — explicitly blocked for CV
  if (
    clean.startsWith('/bug-reports') ||
    clean.startsWith('/telemetry') ||
    clean.startsWith('/frontend-telemetry') ||
    clean.startsWith('/experience-journal')
  ) {
    return ['__BUG_REPORT_BLOCKED_FOR_CV__'];
  }

  // 3. CV Report & Career Path (Allowed for CV)
  if (clean.startsWith('/kpi/cv') || clean.startsWith('/cv')) {
    return ['cv'];
  }
  if (clean.startsWith('/career')) {
    return ['career-path'];
  }

  // 4. Other KPI & Reports & Gamification
  if (
    clean.startsWith('/kpi/cc') ||
    clean.startsWith('/cc') ||
    clean.startsWith('/gamification') ||
    clean.startsWith('/kpi/export-diamond')
  ) {
    return ['cc', 'kpi', 'dashboard'];
  }
  if (clean.startsWith('/kpi/bk') || clean.startsWith('/kpi/export-booker-salary') || clean.startsWith('/bk')) {
    return ['bk', 'kpi', 'dashboard'];
  }
  if (clean.startsWith('/kpi/cs')) return ['cs', 'cs-hub', 'kpi', 'dashboard'];
  if (clean.startsWith('/kpi')) return ['kpi', 'dashboard', 'cc', 'bk', 'cs', 'telesale-target'];

  // 5. Home & Operations & CRM
  if (clean.startsWith('/dashboard/today') || clean.startsWith('/today')) {
    return ['today', 'dashboard'];
  }
  if (clean.startsWith('/schedule-calendar')) {
    return ['schedule-calendar', 'my-appointments', 'today', 'my-customers', 'customers-all'];
  }
  if (clean.startsWith('/branches')) return ['branches', 'dashboard'];
  if (clean.startsWith('/customers/today')) {
    return ['today', 'dashboard', 'my-customers', 'customers-all', 'cc', 'bk', 'cs'];
  }
  if (
    clean.startsWith('/customers/appointments') ||
    clean.startsWith('/customers/booking-slots') ||
    clean.startsWith('/customers/cv-status') ||
    clean.startsWith('/customers/cv-schedule-roster')
  ) {
    return [
      'my-appointments',
      'schedule-calendar',
      'today',
      'my-customers',
      'customers-all',
      'loca',
      'nyc-main',
      'cs-hub',
      'plans',
      'bk',
      'cs',
      'cc',
    ];
  }
  if (clean.startsWith('/customers')) {
    return [
      'customers-all',
      'my-customers',
      'referrals',
      'loca',
      'nyc-main',
      'nyc-campaigns-mgmt',
      'cs-hub',
      'bk',
      'cs',
      'telesale-target',
    ];
  }
  if (clean.startsWith('/campaigns')) {
    return ['nyc-main', 'nyc-campaigns-mgmt', 'loca', 'my-customers', 'customers-all'];
  }
  if (clean.startsWith('/allocation')) {
    return ['my-customers', 'customers-all', 'plans', 'nyc-main', 'loca', 'bk', 'cs'];
  }
  if (clean.startsWith('/cs')) return ['cs-hub', 'cs', 'my-customers', 'customers-all'];
  if (
    clean.startsWith('/plans') ||
    clean.startsWith('/calls') ||
    clean.startsWith('/omicall') ||
    clean.startsWith('/sms')
  ) {
    return [
      'calls',
      'plans',
      'omicall',
      'my-customers',
      'customers-all',
      'loca',
      'nyc-main',
      'cs-hub',
      'referrals',
      'bk',
      'cs',
      'telesale-target',
      'academy-customers',
      'academy-lead-manager',
      'academy-campaigns',
    ];
  }
  if (clean.startsWith('/telesale-competency') || clean.startsWith('/telesale-target')) {
    return ['telesale-target', 'bk', 'kpi'];
  }

  // 6. Quality, Schedule, Academy, Labs, System
  if (clean.startsWith('/qa-shop')) return ['qa-shop'];
  if (clean.startsWith('/fal')) return ['fal-control-tower'];
  if (clean.startsWith('/holiday-work')) return ['holiday-work'];
  if (clean.startsWith('/post-hub')) return ['post-hub'];
  if (clean.startsWith('/academy-workshops')) return ['academy-workshops'];
  if (clean.startsWith('/academy')) {
    return [
      'academy-customers',
      'academy-lead-manager',
      'academy-campaigns',
      'academy-workshops',
      'academy-courses',
      'academy-payment-management',
      'academy-instructors',
    ];
  }
  if (clean.startsWith('/pilot')) return ['pilot-dark-lashes', 'labs-hub'];
  if (clean.startsWith('/payroll-ledger')) return ['cc-payroll-pilot'];
  if (clean.startsWith('/cash-flow')) return ['dashboard'];
  if (clean.startsWith('/catalog')) return ['catalog'];
  if (clean.startsWith('/teams')) return ['teams'];
  if (clean.startsWith('/staff') || clean.startsWith('/roles')) return ['staff-directory', 'teams'];

  return ['dashboard'];
}

/** Static sidebar entries governed by the organizational visibility matrix. */
export interface MenuAccessDefinition {
  key: string;
  label: string;
  groupKey: string;
  groupLabel: string;
  path: string;
  description?: string;
}

/** A sidebar category can govern many individual menu entries in one policy. */
export interface MenuAccessCategoryDefinition {
  key: string;
  label: string;
  /** Menu definition group keys covered by this category. */
  menuGroupKeys: string[];
  description: string;
}

export const MENU_ACCESS_CATEGORY_PREFIX = 'category:';

export const MENU_ACCESS_CATEGORY_DEFINITIONS: readonly MenuAccessCategoryDefinition[] = [
  { key: 'home', label: 'Trang chủ', menuGroupKeys: ['home'], description: 'Tổng quan, Hôm nay và Lịch & Công suất.' },
  {
    key: 'crm',
    label: 'Khách hàng & chiến dịch',
    menuGroupKeys: ['crm'],
    description: 'Khách hàng, chiến dịch LoCa/NYC, Trung tâm CSKH và lịch hẹn.',
  },
  {
    key: 'academy',
    label: 'Academy',
    menuGroupKeys: ['academy'],
    description: 'Toàn bộ submenu tuyển sinh, Workshop OS, Chiến Thần, khóa học, học phí và giảng viên Academy.',
  },
  {
    key: 'operations',
    label: 'Vận hành cuộc gọi',
    menuGroupKeys: ['operations'],
    description: 'Kế hoạch gọi, lịch sử gọi và OmiCall.',
  },
  {
    key: 'quality',
    label: 'QA / QC',
    menuGroupKeys: ['quality'],
    description: 'Kiểm tra chất lượng shop, chuyên viên và trải nghiệm khách hàng.',
  },
  {
    key: 'schedule',
    label: 'Nhân sự & lịch làm việc',
    menuGroupKeys: ['schedule'],
    description: 'Lịch nghỉ lễ và các lịch vận hành nhân sự.',
  },
  { key: 'reports', label: 'Báo cáo & KPI', menuGroupKeys: ['reports'], description: 'KPI, Báo cáo CC, CV và BK.' },
  {
    key: 'system',
    label: 'Quản trị hệ thống',
    menuGroupKeys: ['system'],
    description: 'Nhân sự, Đội nhóm, Catalog, Kiến trúc và Hệ thống thiết kế.',
  },
  {
    key: 'labs',
    label: 'Sản phẩm phát triển (Labs)',
    menuGroupKeys: ['labs'],
    description: 'Vườn ươm sản phẩm, Career Path (CV -> BOSS) và các tính năng R&D đang thử nghiệm.',
  },
] as const;

export function getMenuAccessCategoryPolicyKey(categoryKey: string): string {
  return `${MENU_ACCESS_CATEGORY_PREFIX}${categoryKey}`;
}

export function isManagedMenuAccessCategoryPolicyKey(value: string): boolean {
  if (!value.startsWith(MENU_ACCESS_CATEGORY_PREFIX)) return false;
  const categoryKey = value.slice(MENU_ACCESS_CATEGORY_PREFIX.length);
  return MENU_ACCESS_CATEGORY_DEFINITIONS.some((category) => category.key === categoryKey);
}

/**
 * Dynamic campaign entries keep their own audience rules. The menu-access
 * workspace itself is deliberately omitted so Super Admin always has a recovery path.
 */
export const MENU_ACCESS_DEFINITIONS: readonly MenuAccessDefinition[] = [
  { key: 'dashboard', label: 'Tổng quan', groupKey: 'home', groupLabel: 'Trang chủ', path: '/dashboard' },
  { key: 'today', label: 'Hôm nay', groupKey: 'home', groupLabel: 'Trang chủ', path: '/dashboard/today' },
  {
    key: 'schedule-calendar',
    label: 'Lịch & Công suất',
    groupKey: 'home',
    groupLabel: 'Trang chủ',
    path: '/dashboard/schedule-calendar',
  },
  {
    key: 'branches',
    label: 'Chi nhánh',
    groupKey: 'home',
    groupLabel: 'Trang chủ',
    path: '/dashboard/branches',
  },

  {
    key: 'customers-all',
    label: 'Tất cả KH',
    groupKey: 'crm',
    groupLabel: 'Khách hàng & chiến dịch',
    path: '/dashboard/customers?assignedStaffId=all',
  },
  {
    key: 'my-customers',
    label: 'KH của tôi',
    groupKey: 'crm',
    groupLabel: 'Khách hàng & chiến dịch',
    path: '/dashboard/customers?assignedStaffId=me',
  },
  {
    key: 'referrals',
    label: 'KH giới thiệu',
    groupKey: 'crm',
    groupLabel: 'Khách hàng & chiến dịch',
    path: '/dashboard/referrals',
  },
  {
    key: 'loca',
    label: 'Chiến dịch LoCa',
    groupKey: 'crm',
    groupLabel: 'Khách hàng & chiến dịch',
    path: '/dashboard/loca',
  },
  {
    key: 'nyc-main',
    label: 'NYC Chính',
    groupKey: 'crm',
    groupLabel: 'Khách hàng & chiến dịch',
    path: '/dashboard/nyc',
  },
  {
    key: 'nyc-campaigns-mgmt',
    label: 'Quản lý Chiến dịch',
    groupKey: 'crm',
    groupLabel: 'Khách hàng & chiến dịch',
    path: '/dashboard/nyc/campaigns',
  },
  {
    key: 'cs-hub',
    label: 'Trung tâm CSKH',
    groupKey: 'crm',
    groupLabel: 'Khách hàng & chiến dịch',
    path: '/dashboard/cskh',
  },
  {
    key: 'my-appointments',
    label: 'Lịch hẹn của tôi',
    groupKey: 'crm',
    groupLabel: 'Khách hàng & chiến dịch',
    path: '/dashboard/appointments',
  },

  {
    key: 'academy-customers',
    label: 'Academy · Học viên',
    groupKey: 'academy',
    groupLabel: 'Academy',
    path: '/dashboard/academy-leads',
  },
  {
    key: 'academy-lead-manager',
    label: 'Academy · Lead Manager',
    groupKey: 'academy',
    groupLabel: 'Academy',
    path: '/dashboard/academy-leads/lead-manager',
  },
  {
    key: 'academy-campaigns',
    label: 'Academy · Chiến dịch',
    groupKey: 'academy',
    groupLabel: 'Academy',
    path: '/dashboard/academy-leads/campaigns',
  },
  {
    key: 'academy-workshops',
    label: 'Academy · Workshop OS',
    groupKey: 'academy',
    groupLabel: 'Academy',
    path: '/dashboard/academy-leads/workshops',
  },
  {
    key: 'post-hub',
    label: 'Academy · Chiến Thần',
    groupKey: 'academy',
    groupLabel: 'Academy',
    path: '/dashboard/post-hub',
  },
  {
    key: 'academy-courses',
    label: 'Academy · Khóa học',
    groupKey: 'academy',
    groupLabel: 'Academy',
    path: '/dashboard/academy-leads/courses',
  },
  {
    key: 'academy-payment-management',
    label: 'Academy · Thu học phí',
    groupKey: 'academy',
    groupLabel: 'Academy',
    path: '/dashboard/academy-leads/payments',
  },
  {
    key: 'academy-instructors',
    label: 'Academy · Giảng viên',
    groupKey: 'academy',
    groupLabel: 'Academy',
    path: '/dashboard/academy-leads/instructors',
  },

  {
    key: 'plans',
    label: 'Kế hoạch gọi',
    groupKey: 'operations',
    groupLabel: 'Vận hành cuộc gọi',
    path: '/dashboard/plans',
  },
  {
    key: 'calls',
    label: 'Lịch sử cuộc gọi',
    groupKey: 'operations',
    groupLabel: 'Vận hành cuộc gọi',
    path: '/dashboard/calls',
  },
  {
    key: 'telesale-target',
    label: 'Mục Tiêu Telesales T10',
    groupKey: 'operations',
    groupLabel: 'Vận hành cuộc gọi',
    path: '/dashboard/telesale-target',
  },
  {
    key: 'omicall',
    label: 'Cuộc gọi OmiCall (AI)',
    groupKey: 'operations',
    groupLabel: 'Vận hành cuộc gọi',
    path: '/dashboard/omicall',
  },
  {
    key: 'qa-shop',
    label: 'QA & QC Shop',
    groupKey: 'quality',
    groupLabel: 'QA / QC',
    path: '/dashboard/qa-shop',
  },
  {
    key: 'fal-control-tower',
    label: 'FAL Control Tower',
    groupKey: 'quality',
    groupLabel: 'QA / QC',
    path: '/dashboard/fal',
  },
  {
    key: 'holiday-work',
    label: 'Lịch nghỉ lễ',
    groupKey: 'schedule',
    groupLabel: 'Nhân sự & lịch làm việc',
    path: '/dashboard/holiday-work',
  },

  { key: 'kpi', label: 'KPI hiệu suất', groupKey: 'reports', groupLabel: 'Báo cáo & KPI', path: '/dashboard/kpi' },
  { key: 'cc', label: 'Báo cáo CC', groupKey: 'reports', groupLabel: 'Báo cáo & KPI', path: '/dashboard/cc' },
  { key: 'cv', label: 'Báo cáo CV', groupKey: 'reports', groupLabel: 'Báo cáo & KPI', path: '/dashboard/cv' },
  { key: 'bk', label: 'Báo cáo BK', groupKey: 'reports', groupLabel: 'Báo cáo & KPI', path: '/dashboard/bk' },
  { key: 'cs', label: 'Báo cáo CS', groupKey: 'reports', groupLabel: 'Báo cáo & KPI', path: '/dashboard/cs' },

  {
    key: 'staff-directory',
    label: 'Danh sách nhân sự',
    groupKey: 'system',
    groupLabel: 'Quản trị hệ thống',
    path: '/dashboard/staff',
  },
  {
    key: 'teams',
    label: 'Cấu trúc Phòng ban & Đội nhóm',
    groupKey: 'system',
    groupLabel: 'Quản trị hệ thống',
    path: '/dashboard/staff/teams',
  },
  {
    key: 'catalog',
    label: 'Quản lý Catalog',
    groupKey: 'system',
    groupLabel: 'Quản trị hệ thống',
    path: '/dashboard/catalog',
  },
  {
    key: 'architecture',
    label: 'Sơ đồ Kiến trúc AI',
    groupKey: 'system',
    groupLabel: 'Quản trị hệ thống',
    path: '/dashboard/architecture',
  },
  {
    key: 'design-system',
    label: 'Hệ thống thiết kế',
    groupKey: 'system',
    groupLabel: 'Quản trị hệ thống',
    path: '/dashboard/design-system',
  },
  {
    key: 'labs-hub',
    label: 'Vườn ươm Labs (Tổng quan)',
    groupKey: 'labs',
    groupLabel: 'Sản phẩm phát triển (Labs)',
    path: '/dashboard/labs',
  },
  {
    key: 'career-path',
    label: 'Career Path (CV → BOSS)',
    groupKey: 'labs',
    groupLabel: 'Sản phẩm phát triển (Labs)',
    path: '/dashboard/career-path',
  },
  {
    key: 'pilot-dark-lashes',
    label: 'Pilot Uốn Mi Đề Thám',
    groupKey: 'labs',
    groupLabel: 'Sản phẩm phát triển (Labs)',
    path: '/dashboard/pilot-dark-lashes',
  },
  {
    key: 'cc-payroll-pilot',
    label: 'Pilot Payroll CC',
    groupKey: 'labs',
    groupLabel: 'Sản phẩm phát triển (Labs)',
    path: '/dashboard/payroll-pilot',
  },
] as const;

export function isManagedMenuAccessKey(value: string): boolean {
  return MENU_ACCESS_DEFINITIONS.some((menu) => menu.key === value);
}

export function isManagedMenuAccessPolicyKey(value: string): boolean {
  return isManagedMenuAccessKey(value) || isManagedMenuAccessCategoryPolicyKey(value);
}

export interface MenuAccessSubjectInput {
  type: MenuAccessScopeType;
  subjectId: number;
}

export interface MenuAccessSubject extends MenuAccessSubjectInput {
  label: string;
}

export interface MenuAccessPolicy {
  menuKey: string;
  isRestricted: boolean;
  subjects: MenuAccessSubject[];
  updatedAt?: string | null;
}

export interface MenuAccessDepartmentOption {
  id: number;
  code: string;
  name: string;
}

export interface MenuAccessTeamOption {
  id: number;
  code: string;
  name: string;
  departmentId?: number | null;
}

export interface MenuAccessStaffOption {
  id: number;
  displayName: string;
  username: string;
  role: string;
}

export interface SecurityAccessBlockEntry {
  id: number;
  menuKey: string;
  actorStaffId?: number | null;
  actorLabel: string;
  actorRole?: string;
  method?: string;
  path?: string;
  reason?: string;
  createdAt: string;
}

export interface MenuAccessConfigurationResponse {
  menus: MenuAccessDefinition[];
  policies: MenuAccessPolicy[];
  categories: MenuAccessCategoryDefinition[];
  categoryPolicies: MenuAccessPolicy[];
  roleGroups?: MenuAccessRoleGroupOption[];
  departments: MenuAccessDepartmentOption[];
  teams: MenuAccessTeamOption[];
  staff: MenuAccessStaffOption[];
  recentAudits: MenuAccessAuditEntry[];
  securityBlockLogs?: SecurityAccessBlockEntry[];
}

export interface MenuAccessAuditEntry {
  id: number;
  menuKey: string;
  menuLabel: string;
  actorStaffId?: number | null;
  actorLabel: string;
  beforeIsRestricted: boolean;
  afterIsRestricted: boolean;
  beforeSubjectCount: number;
  afterSubjectCount: number;
  beforeSubjects?: string[];
  afterSubjects?: string[];
  createdAt: string;
}

export interface UpdateMenuAccessPolicyRequest {
  isRestricted: boolean;
  subjects: MenuAccessSubjectInput[];
}

export interface UpdateRoleGroupMatrixRequest {
  allowedMenuKeys: string[];
}

export interface MenuAccessInspectorAllowedItem {
  key: string;
  label: string;
  groupLabel: string;
  path: string;
  grantSource: string;
  grantedBy?: string | null;
  grantedAt?: string | null;
}

export interface MenuAccessTimelineEvent {
  id: string;
  timestamp: string;
  eventType: 'POLICY_CHANGE' | 'ROLE_CHANGE' | 'ACCOUNT_STATUS' | 'BLOCKED_403';
  summary: string;
  actorLabel: string;
  details?: string;
}

export interface MenuAccessInspectorResponse {
  targetType: 'STAFF' | 'ROLE';
  targetId: number;
  targetLabel: string;
  evaluatedAt: string;
  effectiveRole: string;
  effectiveRoleGroup?: MenuAccessRoleGroupOption | null;
  isAccountActive?: boolean;
  activeTeams: Array<{ id: number; code: string; name: string }>;
  activeDepartments: Array<{ id: number; code: string; name: string }>;
  allowedMenus: MenuAccessInspectorAllowedItem[];
  deniedMenusCount: number;
  auditTimeline: MenuAccessTimelineEvent[];
}

export interface MenuAccessSidebarResponse {
  data: {
    visibility: Record<string, boolean>;
    categoryVisibility: Record<string, boolean>;
    restrictedMenuKeys: string[];
    restrictedCategoryKeys: string[];
  };
}
