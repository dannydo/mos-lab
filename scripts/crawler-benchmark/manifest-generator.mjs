/**
 * manifest-generator.mjs
 * Tự động tạo danh mục kiểm tra (Interaction Manifest) cho mos-lab.
 * Bao gồm các Route chính, phân nhóm theo Sidebar và các tương tác an toàn (Tabs, Drawers, Modals).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../..');
const outputDir = path.resolve(workspaceRoot, 'output', 'benchmark');
const manifestPath = path.join(outputDir, 'interaction-manifest.json');

export const SYSTEM_ROUTES = [
  // 1. TRANG CHỦ
  {
    key: 'dashboard',
    title: 'Tổng quan Dashboard',
    path: '/dashboard',
    group: 'TRANG CHỦ',
    isCore: true,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'today',
    title: 'Hôm nay',
    path: '/dashboard/today',
    group: 'TRANG CHỦ',
    isCore: true,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'schedule-calendar',
    title: 'Lịch & Công suất',
    path: '/dashboard/schedule-calendar',
    group: 'TRANG CHỦ',
    isCore: true,
    expectedSelector: '.ant-layout-content',
  },

  // 2. KHÁCH HÀNG & CHIẾN DỊCH
  {
    key: 'customers-all',
    title: 'Tất cả Khách hàng',
    path: '/dashboard/customers?assignedStaffId=all',
    group: 'KHÁCH HÀNG & CHIẾN DỊCH',
    isCore: true,
    expectedSelector: '.customer-data-table, .ant-table',
  },
  {
    key: 'customers-me',
    title: 'Khách hàng của tôi',
    path: '/dashboard/customers?assignedStaffId=me&tab=ALL',
    group: 'KHÁCH HÀNG & CHIẾN DỊCH',
    isCore: true,
    expectedSelector: '.customer-data-table, .ant-table',
  },
  {
    key: 'referrals',
    title: 'Khách hàng giới thiệu',
    path: '/dashboard/referrals',
    group: 'KHÁCH HÀNG & CHIẾN DỊCH',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'nyc-main',
    title: 'Chiến dịch NYC',
    path: '/dashboard/nyc',
    group: 'KHÁCH HÀNG & CHIẾN DỊCH',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'nyc-campaigns',
    title: 'Quản lý Chiến dịch NYC',
    path: '/dashboard/nyc/campaigns',
    group: 'KHÁCH HÀNG & CHIẾN DỊCH',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'loca',
    title: 'Chiến dịch LoCa',
    path: '/dashboard/loca',
    group: 'KHÁCH HÀNG & CHIẾN DỊCH',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'cs-hub',
    title: 'Trung tâm CSKH',
    path: '/dashboard/cs',
    group: 'KHÁCH HÀNG & CHIẾN DỊCH',
    isCore: true,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'appointments',
    title: 'Lịch hẹn của tôi',
    path: '/dashboard/appointments',
    group: 'KHÁCH HÀNG & CHIẾN DỊCH',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },

  // 3. VẬN HÀNH CUỘC GỌI
  {
    key: 'plans',
    title: 'Kế hoạch gọi Telesales',
    path: '/dashboard/plans',
    group: 'VẬN HÀNH CUỘC GỌI',
    isCore: true,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'calls',
    title: 'Lịch sử cuộc gọi',
    path: '/dashboard/calls',
    group: 'VẬN HÀNH CUỘC GỌI',
    isCore: true,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'omicall',
    title: 'Cuộc gọi OmiCall AI',
    path: '/dashboard/omicall',
    group: 'VẬN HÀNH CUỘC GỌI',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },

  // 4. BÁO CÁO & KPI
  {
    key: 'kpi-summary',
    title: 'KPI Tổng hợp',
    path: '/dashboard/kpi',
    group: 'BÁO CÁO & KPI',
    isCore: true,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'bk-leaderboard',
    title: 'Booker Leaderboard',
    path: '/dashboard/bk',
    group: 'BÁO CÁO & KPI',
    isCore: true,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'cc-gamification',
    title: 'CC Gamification & Xoay ca',
    path: '/dashboard/cc',
    group: 'BÁO CÁO & KPI',
    isCore: true,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'cv-speed',
    title: 'CV KTV Tốc độ & Xoay ca',
    path: '/dashboard/cv',
    group: 'BÁO CÁO & KPI',
    isCore: true,
    expectedSelector: '.ant-layout-content',
  },

  // 5. QA & QC
  {
    key: 'qa-shop',
    title: 'QA & QC Shop',
    path: '/dashboard/qa-shop',
    group: 'QA / QC',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'fal-control-tower',
    title: 'FAL Control Tower',
    path: '/dashboard/fal',
    group: 'QA / QC',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },

  // 6. NHÂN SỰ & LỊCH LÀM VIỆC
  {
    key: 'holiday-work',
    title: 'Đăng ký đi làm ngày lễ',
    path: '/dashboard/holiday-work',
    group: 'NHÂN SỰ & LỊCH LÀM VIỆC',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'staff-management',
    title: 'Danh sách nhân sự',
    path: '/dashboard/staff',
    group: 'NHÂN SỰ & LỊCH LÀM VIỆC',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'staff-teams',
    title: 'Đội nhóm nhân sự',
    path: '/dashboard/staff/teams',
    group: 'NHÂN SỰ & LỊCH LÀM VIỆC',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'menu-access',
    title: 'Phân quyền Menu Access',
    path: '/dashboard/staff/menu-access',
    group: 'NHÂN SỰ & LỊCH LÀM VIỆC',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },

  // 7. ACADEMY
  {
    key: 'academy-leads',
    title: 'Academy Học viên',
    path: '/dashboard/academy-leads',
    group: 'ACADEMY',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'academy-lead-manager',
    title: 'Academy Lead Manager',
    path: '/dashboard/academy-leads/lead-manager',
    group: 'ACADEMY',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'academy-campaigns',
    title: 'Academy Chiến dịch',
    path: '/dashboard/academy-leads/campaigns',
    group: 'ACADEMY',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'academy-workshops',
    title: 'Academy Workshop OS',
    path: '/dashboard/academy-leads/workshops',
    group: 'ACADEMY',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'academy-courses',
    title: 'Academy Khóa học',
    path: '/dashboard/academy-leads/courses',
    group: 'ACADEMY',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'academy-payments',
    title: 'Academy Thu học phí',
    path: '/dashboard/academy-leads/payments',
    group: 'ACADEMY',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'academy-instructors',
    title: 'Academy Giảng viên',
    path: '/dashboard/academy-leads/instructors',
    group: 'ACADEMY',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'post-hub',
    title: 'Chiến Thần Post-Hub',
    path: '/dashboard/post-hub',
    group: 'ACADEMY',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },

  // 8. HỆ THỐNG & TIỆN ÍCH
  {
    key: 'catalog',
    title: 'Quản lý Dịch vụ & Bảng giá',
    path: '/dashboard/catalog',
    group: 'HỆ THỐNG',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'bug-reports',
    title: 'Hộp thư Báo lỗi',
    path: '/dashboard/bug-reports',
    group: 'HỆ THỐNG',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'payroll-pilot',
    title: 'Payroll Pilot',
    path: '/dashboard/payroll-pilot',
    group: 'HỆ THỐNG',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'payroll-adjustment-lab',
    title: 'Payroll Adjustment Lab',
    path: '/payroll-adjustment-lab',
    group: 'HỆ THỐNG',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'payroll-native-cc-run',
    title: 'Payroll Native CC Run',
    path: '/payroll-native-cc-run',
    group: 'HỆ THỐNG',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'architecture',
    title: 'Kiến trúc Monorepo & Services',
    path: '/dashboard/architecture',
    group: 'HỆ THỐNG',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'diagrams',
    title: 'Sơ đồ nghiệp vụ & Dataflow',
    path: '/dashboard/diagrams',
    group: 'HỆ THỐNG',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
  {
    key: 'design-system',
    title: 'Design System & Tokens',
    path: '/dashboard/design-system',
    group: 'HỆ THỐNG',
    isCore: false,
    expectedSelector: '.ant-layout-content',
  },
];

export function generateManifest() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    totalRoutes: SYSTEM_ROUTES.length,
    coreRoutesCount: SYSTEM_ROUTES.filter((r) => r.isCore).length,
    routes: SYSTEM_ROUTES,
    interactionRules: {
      safeMode: true,
      prohibitedButtonTexts: ['Lưu', 'Tạo', 'Xóa', 'Cập nhật', 'Xác nhận', 'Đồng ý', 'Thanh toán', 'Nộp đơn', 'Submit'],
      safeCloseSelectors: [
        '.ant-modal-close',
        '.ant-drawer-close',
        'button:has-text("Hủy")',
        'button:has-text("Đóng")',
        'button:has-text("Close")',
        'button:has-text("Cancel")',
      ],
      tabSelector: '.ant-tabs-tab',
      popupTriggerSelectors: [
        'button:has-text("Bộ lọc")',
        'button:has-text("Lọc")',
        'button:has-text("Chi tiết")',
        'button:has-text("Xem")',
        'button:has-text("Thêm")',
        'button:has-text("Tạo mới")',
        '.ant-btn-primary',
      ],
    },
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[Manifest] Successfully generated ${SYSTEM_ROUTES.length} routes to ${manifestPath}`);
  return manifest;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateManifest();
}
