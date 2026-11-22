import type { Role } from '@mos-lab/shared';

export interface LegacyStaffOption {
  id: number;
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface RolePresetColorOption {
  value: string;
  label: string;
}

export const PRESET_COLORS: readonly RolePresetColorOption[] = [
  { value: 'red', label: 'Red (Admin)' },
  { value: 'purple', label: 'Purple (Manager)' },
  { value: 'blue', label: 'Blue (Operations)' },
  { value: 'cyan', label: 'Cyan (Customer Care)' },
  { value: 'gold', label: 'Gold (Leader)' },
  { value: 'orange', label: 'Orange (Sales)' },
  { value: 'green', label: 'Green' },
  { value: 'pink', label: 'Pink' },
  { value: 'geekblue', label: 'Geek Blue' },
  { value: 'magenta', label: 'Magenta' },
  { value: 'lime', label: 'Lime' },
];

export const STAFF_PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

export type RolePermissionFieldKey = keyof Pick<Role, 'viewKPI' | 'viewTeamKPI' | 'manageStaff' | 'omicallAutoInit'>;

export interface RolePermissionFieldConfig {
  name: RolePermissionFieldKey;
  title: string;
  description: string;
  disableForAdmin: boolean;
}

export const ROLE_PERMISSION_FIELDS: readonly RolePermissionFieldConfig[] = [
  {
    name: 'viewKPI',
    title: 'Xem báo cáo KPI cá nhân (`viewKPI`)',
    description: 'Cho phép xem hiệu suất kế hoạch cuộc gọi, lịch hẹn của riêng tài khoản này.',
    disableForAdmin: true,
  },
  {
    name: 'viewTeamKPI',
    title: 'Xem báo cáo KPI Nhóm (`viewTeamKPI`)',
    description: 'Cho phép xem bảng xếp hạng (leaderboard) và hiệu suất KPI của cả đội nhóm.',
    disableForAdmin: true,
  },
  {
    name: 'manageStaff',
    title: 'Quản lý Nhân sự & Vai trò (`manageStaff`)',
    description: 'Toàn quyền truy cập tab quản trị, thêm/sửa/xóa nhân viên, cấu hình nhóm quyền.',
    disableForAdmin: true,
  },
  {
    name: 'omicallAutoInit',
    title: 'Tự động nhận cuộc gọi OmiCall (`omicallAutoInit`)',
    description: 'Tự động khởi chạy OmiCall SDK và đăng ký SIP khi đăng nhập để sẵn sàng nhận cuộc gọi đến.',
    disableForAdmin: false,
  },
];
