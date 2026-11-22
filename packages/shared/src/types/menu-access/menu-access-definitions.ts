import type {
  MenuAccessCategoryDefinition,
  MenuAccessDefinition,
  MenuAccessRoleGroupOption,
} from './menu-access.types.js';

export const MENU_ACCESS_ROLE_GROUPS: readonly MenuAccessRoleGroupOption[] = [
  {
    id: 1,
    code: 'CV',
    name: 'Chuyên Viên (CV / CV🪶 / KTV / LT)',
    roles: ['cv', 'lt', 'technician', 'ktv', 'cvl', 'cvll', 'cv_plus', 'cv_plus_plus'],
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

/** Menu keys open by default to all authenticated staff unless explicitly restricted by Super Admin. */
export const DEFAULT_OPEN_MENU_KEYS = ['mos-bible'] as const;

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
  {
    key: 'bible',
    label: 'Kinh Thánh mOS',
    menuGroupKeys: ['bible'],
    description: 'Hiến chương, quy tắc nghiệp vụ và Đấu trường Speed Quiz toàn hệ thống.',
  },
  {
    key: 'finance',
    label: 'Tài chính',
    menuGroupKeys: ['finance'],
    description: 'Quản lý quỹ tiền và dòng tiền mặt.',
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
  { key: 'cb', label: 'Dashboard $CB (Live)', groupKey: 'reports', groupLabel: 'Báo cáo & KPI', path: '/dashboard/cb' },
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
  {
    key: 'financial-goals',
    label: 'Mục Tiêu Tài Chính',
    groupKey: 'reports',
    groupLabel: 'Báo cáo & KPI',
    path: '/dashboard/financial-goals',
  },
  {
    key: 'telesale-competency',
    label: 'Khung Năng Lực Telesales',
    groupKey: 'operations',
    groupLabel: 'Vận hành cuộc gọi',
    path: '/dashboard/telesale-competency',
  },
  {
    key: 'bug-reports',
    label: 'mOS Mission (Nhiệm vụ & Báo lỗi)',
    groupKey: 'reports',
    groupLabel: 'Báo cáo & KPI',
    path: '/dashboard/bug-reports',
  },
  {
    key: 'mos-bible',
    label: 'mOS Bible (Kinh Thánh mOS)',
    groupKey: 'bible',
    groupLabel: 'Kinh Thánh mOS',
    path: '#mos-bible',
  },
  {
    key: 'finance-funds-manage',
    label: 'Quản lý Quỹ',
    groupKey: 'finance',
    groupLabel: 'Tài chính',
    path: '/dashboard/funds',
  },
  {
    key: 'finance-cash-flow',
    label: 'Dự báo dòng tiền',
    groupKey: 'finance',
    groupLabel: 'Tài chính',
    path: '/dashboard/finance/cash-flow',
  },
] as const;

export function isManagedMenuAccessKey(value: string): boolean {
  return MENU_ACCESS_DEFINITIONS.some((menu) => menu.key === value);
}

export function isManagedMenuAccessPolicyKey(value: string): boolean {
  return isManagedMenuAccessKey(value) || isManagedMenuAccessCategoryPolicyKey(value);
}
