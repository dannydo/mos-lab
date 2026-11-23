import { isAdminOrSuperAdminRole, type BranchType, type CreateBranchDto, type CrmBranch } from '@mos-lab/shared';

export type ViewMode = 'grid' | 'table';
export type StoreTypeFilter = 'ALL' | BranchType;
export type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
export type BranchDetailTab = 'info' | 'staff';
export type BranchFormMode = 'create' | 'edit';

export interface BranchFormValues {
  code: string;
  name: string;
  nameEn?: string | null;
  storeType: BranchType;
  addressWeb?: string | null;
  addressSms?: string | null;
  addressMap?: string | null;
  addressCity?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  notes?: string | null;
}

export const BRANCH_VIEW_MODE_STORAGE_KEY = 'mos_branches_view_mode';
export const BRANCH_DEFAULT_PAGE_SIZE = 50;
export const BRANCH_PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

export const STORE_TYPE_FILTER_OPTIONS: Array<{ value: StoreTypeFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả loại hình' },
  { value: 'SALON', label: 'Salon Làm Đẹp' },
  { value: 'ACADEMY', label: 'Học Viện Đào Tạo' },
  { value: 'OFFICE', label: 'Văn Phòng Vận Hành' },
];

export const STATUS_FILTER_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'INACTIVE', label: 'Tạm ẩn / Đã tắt' },
];

export function getStoredBranchesViewMode(): ViewMode {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(BRANCH_VIEW_MODE_STORAGE_KEY) as ViewMode | null;
    if (saved === 'grid' || saved === 'table') return saved;
  }
  return 'grid';
}

export function saveBranchesViewMode(mode: ViewMode): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(BRANCH_VIEW_MODE_STORAGE_KEY, mode);
  }
}

export function canUserManageBranches(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const stored = localStorage.getItem('mos_user');
    if (!stored) return false;
    const user = JSON.parse(stored) as { role?: string };
    const role = user?.role?.toLowerCase() || '';
    return isAdminOrSuperAdminRole(role) || role === 'manager';
  } catch {
    return false;
  }
}

export function getBranchDisplayAddress(branch: CrmBranch, fallback = 'Chưa có địa chỉ'): string {
  return branch.addressWeb || branch.addressSms || branch.addressCity || fallback;
}

export function getCreateBranchDefaultValues(branchCount: number): Partial<BranchFormValues> {
  return {
    storeType: 'SALON',
    isActive: true,
    sortOrder: (branchCount + 1) * 10,
  };
}

export function toBranchFormValues(branch: CrmBranch): BranchFormValues {
  return {
    code: branch.code,
    name: branch.name,
    nameEn: branch.nameEn,
    storeType: branch.storeType,
    addressWeb: branch.addressWeb,
    addressSms: branch.addressSms,
    addressMap: branch.addressMap,
    addressCity: branch.addressCity,
    sortOrder: branch.sortOrder,
    isActive: branch.isActive,
    notes: branch.notes,
  };
}

export function buildBranchMutationPayload(values: BranchFormValues): CreateBranchDto {
  return {
    code: values.code.trim().toUpperCase(),
    name: values.name.trim(),
    nameEn: values.nameEn?.trim() || null,
    storeType: values.storeType,
    addressWeb: values.addressWeb?.trim() || null,
    addressSms: values.addressSms?.trim() || null,
    addressMap: values.addressMap?.trim() || null,
    addressCity: values.addressCity?.trim() || null,
    sortOrder: values.sortOrder || 0,
    isActive: values.isActive !== false,
    notes: values.notes?.trim() || null,
  };
}
