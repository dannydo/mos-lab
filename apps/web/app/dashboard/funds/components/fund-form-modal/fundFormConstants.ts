import type { CreateFundRoleInput, FundApprovalStepConfig } from '@mos-lab/shared';
import type { PermissionOption } from './types';

export const AVAILABLE_PERMISSIONS: PermissionOption[] = [
  { value: 'VIEW', label: 'Xem sổ quỹ & giao dịch' },
  { value: 'PROPOSE', label: 'Lập phiếu đề xuất cấp vốn / chi' },
  { value: 'APPROVE', label: 'Phê duyệt chủ trương đề xuất' },
  { value: 'DISBURSE', label: 'Kế toán giải ngân thanh toán' },
  { value: 'RECONCILE', label: 'Đối soát & chốt kỳ sổ quỹ' },
  { value: 'CONFIG', label: 'Cấu hình thông tin & hạn mức' },
];

export const DEFAULT_STANDARD_ROLES: CreateFundRoleInput[] = [
  {
    roleKey: 'HOLDER',
    roleName: 'Thủ Quỹ (Quản lý số dư)',
    permissions: ['VIEW', 'PROPOSE', 'RECONCILE'],
    assignedStaffIds: [],
  },
  {
    roleKey: 'DISBURSER',
    roleName: 'Kế Toán Giải Ngân',
    permissions: ['VIEW', 'DISBURSE'],
    assignedStaffIds: [],
  },
  {
    roleKey: 'APPROVER',
    roleName: 'Quản Lý Phê Duyệt',
    permissions: ['VIEW', 'APPROVE', 'CONFIG'],
    assignedStaffIds: [],
  },
];

export function createDefaultStandardRoles(): CreateFundRoleInput[] {
  return DEFAULT_STANDARD_ROLES.map((role) => ({
    ...role,
    permissions: [...role.permissions],
    assignedStaffIds: [...(role.assignedStaffIds ?? [])],
  }));
}

export function createDefaultApprovalSteps(): FundApprovalStepConfig[] {
  return [
    {
      level: 1,
      name: 'Cấp 1 – Quản lý quỹ phê duyệt',
      approverRoleKey: 'APPROVER',
      approverStaffIds: [],
      requiredAmountAbove: 0,
      note: 'Duyệt chủ trương mọi đề xuất chi và bổ sung vốn',
    },
  ];
}
