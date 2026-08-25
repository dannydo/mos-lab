/** Principal types that can receive a menu-visibility grant. */
export type MenuAccessScopeType = 'DEPARTMENT' | 'TEAM' | 'STAFF';

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
    description: 'Toàn bộ submenu tuyển sinh, Chiến Thần, khóa học, học phí và giảng viên Academy.',
  },
  {
    key: 'operations',
    label: 'Vận hành cuộc gọi',
    menuGroupKeys: ['operations'],
    description: 'Kế hoạch gọi, OmiCall, QA/QC và FAL.',
  },
  { key: 'reports', label: 'Báo cáo & KPI', menuGroupKeys: ['reports'], description: 'KPI, Báo cáo CC, CV và BK.' },
  {
    key: 'system',
    label: 'Quản trị hệ thống',
    menuGroupKeys: ['system'],
    description: 'Nhân sự, Đội nhóm, Catalog, Kiến trúc và Hệ thống thiết kế.',
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
    path: '/dashboard/cs',
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
    key: 'omicall',
    label: 'Cuộc gọi OmiCall (AI)',
    groupKey: 'operations',
    groupLabel: 'Vận hành cuộc gọi',
    path: '/dashboard/omicall',
  },
  {
    key: 'qa-shop',
    label: 'QA & QC Shop',
    groupKey: 'operations',
    groupLabel: 'Vận hành cuộc gọi',
    path: '/dashboard/qa-shop',
  },
  {
    key: 'fal-control-tower',
    label: 'FAL Control Tower',
    groupKey: 'operations',
    groupLabel: 'Vận hành cuộc gọi',
    path: '/dashboard/fal',
  },

  { key: 'kpi', label: 'KPI hiệu suất', groupKey: 'reports', groupLabel: 'Báo cáo & KPI', path: '/dashboard/kpi' },
  { key: 'cc', label: 'Báo cáo CC', groupKey: 'reports', groupLabel: 'Báo cáo & KPI', path: '/dashboard/cc' },
  { key: 'cv', label: 'Báo cáo CV', groupKey: 'reports', groupLabel: 'Báo cáo & KPI', path: '/dashboard/cv' },
  { key: 'bk', label: 'Báo cáo BK', groupKey: 'reports', groupLabel: 'Báo cáo & KPI', path: '/dashboard/bk' },

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

export interface MenuAccessConfigurationResponse {
  menus: MenuAccessDefinition[];
  policies: MenuAccessPolicy[];
  categories: MenuAccessCategoryDefinition[];
  categoryPolicies: MenuAccessPolicy[];
  departments: MenuAccessDepartmentOption[];
  teams: MenuAccessTeamOption[];
  staff: MenuAccessStaffOption[];
  recentAudits: MenuAccessAuditEntry[];
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
  createdAt: string;
}

export interface UpdateMenuAccessPolicyRequest {
  isRestricted: boolean;
  subjects: MenuAccessSubjectInput[];
}

export interface MenuAccessSidebarResponse {
  data: {
    visibility: Record<string, boolean>;
    categoryVisibility: Record<string, boolean>;
    restrictedMenuKeys: string[];
    restrictedCategoryKeys: string[];
  };
}
