import type { BranchType, CreateBranchDto, CrmBranch, UpdateBranchDto } from '@mos-lab/shared';
import type { StatusType } from '~/components/ui';

export type BranchDrawerMode = 'create' | 'edit' | 'view';

export type BranchDrawerTabKey = 'info' | 'staff';

export interface BranchFormValues {
  code: string;
  name: string;
  nameEn?: string;
  storeType: BranchType;
  addressMap?: string;
  addressSms?: string;
  addressWeb?: string;
  addressCity?: string;
  sortOrder?: number;
  isActive: boolean;
  notes?: string;
}

export const BRANCH_PAGE_STORAGE_KEY = 'catalog_branch_page';
export const BRANCH_PAGE_SIZE_STORAGE_KEY = 'catalog_branch_pagesize';
export const DEFAULT_BRANCH_PAGE_SIZE = 20;

export const BRANCH_TYPE_BADGE_MAP: Record<BranchType, { status: StatusType; label: string }> = {
  ACADEMY: { status: 'processing', label: '🎓 Học viện Đào tạo' },
  OFFICE: { status: 'gold', label: '🏢 Trụ sở / HQ' },
  SALON: { status: 'error', label: '🪷 Tiệm Nối Mi' },
};

export const BRANCH_TYPE_SELECT_OPTIONS: Array<{ value: BranchType; label: string }> = [
  { value: 'SALON', label: '🪷 Tiệm Nối Mi (Dịch vụ khách)' },
  { value: 'ACADEMY', label: '🎓 Học viện Đào tạo' },
  { value: 'OFFICE', label: '🏢 Trụ sở / Văn phòng HQ' },
];

export function readStoredBranchPaginationNumber(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const saved = localStorage.getItem(key);
  if (!saved) return fallback;
  const parsed = Number(saved);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function persistBranchPagination(page: number, pageSize: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BRANCH_PAGE_STORAGE_KEY, String(page));
  localStorage.setItem(BRANCH_PAGE_SIZE_STORAGE_KEY, String(pageSize));
}

export function getDefaultBranchFormValues(): Partial<BranchFormValues> {
  return {
    isActive: true,
    storeType: 'SALON',
    sortOrder: 0,
  };
}

export function mapBranchToFormValues(branch: CrmBranch): BranchFormValues {
  return {
    code: branch.code,
    name: branch.name,
    nameEn: branch.nameEn || '',
    storeType: branch.storeType || 'SALON',
    addressMap: branch.addressMap || '',
    addressSms: branch.addressSms || '',
    addressWeb: branch.addressWeb || '',
    addressCity: branch.addressCity || '',
    sortOrder: branch.sortOrder,
    isActive: branch.isActive,
    notes: branch.notes || '',
  };
}

export function buildCreateBranchDto(values: BranchFormValues): CreateBranchDto {
  return {
    code: values.code,
    name: values.name,
    nameEn: values.nameEn || undefined,
    storeType: values.storeType || 'SALON',
    addressMap: values.addressMap || undefined,
    addressSms: values.addressSms || undefined,
    addressWeb: values.addressWeb || undefined,
    addressCity: values.addressCity || undefined,
    sortOrder: values.sortOrder || 0,
    isActive: values.isActive,
    notes: values.notes || undefined,
  };
}

export function buildUpdateBranchDto(values: BranchFormValues): UpdateBranchDto {
  return {
    code: values.code,
    name: values.name,
    nameEn: values.nameEn || undefined,
    storeType: values.storeType || 'SALON',
    addressMap: values.addressMap || undefined,
    addressSms: values.addressSms || undefined,
    addressWeb: values.addressWeb || undefined,
    addressCity: values.addressCity || undefined,
    sortOrder: values.sortOrder,
    isActive: values.isActive,
    notes: values.notes || undefined,
  };
}

export function isFormValidationError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'errorFields' in err;
}

export function getBranchErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim().length > 0) return msg;
  }
  return fallback;
}
