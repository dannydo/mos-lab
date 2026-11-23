import type { CareerBranchFilter } from './career-requirements.types.js';

/**
 * Chuẩn hóa bộ lọc chi nhánh trên Career Path sang storeId tương ứng (ALL -> null, DE_THAM -> 6, ESTELLA -> 16)
 */
export function resolveCareerBranchFilterStoreId(branch?: string | null): number | null {
  const normalized = String(branch || '')
    .trim()
    .toUpperCase();
  if (!normalized || normalized === 'ALL') return null;
  if (
    normalized === 'DE_THAM' ||
    normalized === 'DT' ||
    normalized === '6' ||
    normalized.includes('DE THAM') ||
    normalized.includes('ĐỀ THÁM')
  ) {
    return 6;
  }
  if (normalized === 'ESTELLA' || normalized === 'EP' || normalized === '16' || normalized.includes('ESTELLA')) {
    return 16;
  }
  return null;
}

/**
 * Chuẩn hóa bộ lọc chi nhánh về mã CareerBranchFilter ('ALL' | 'DE_THAM' | 'ESTELLA')
 */
export function normalizeCareerBranchFilter(branch?: string | null): CareerBranchFilter {
  const storeId = resolveCareerBranchFilterStoreId(branch);
  if (storeId === 6) return 'DE_THAM';
  if (storeId === 16) return 'ESTELLA';
  return 'ALL';
}

/**
 * Kiểm tra một nhân sự có thuộc bộ lọc chi nhánh Career Path đang chọn hay không
 */
export function matchesCareerBranchFilter(
  staff: { storeId?: number | null; branchCode?: string | null; branchName?: string | null },
  branchFilter?: CareerBranchFilter | string | null
): boolean {
  const targetStoreId = resolveCareerBranchFilterStoreId(branchFilter);
  if (targetStoreId === null) return true;
  if (Number(staff.storeId) === targetStoreId) return true;
  const code = String(staff.branchCode || '')
    .trim()
    .toUpperCase();
  const name = String(staff.branchName || '')
    .trim()
    .toUpperCase();
  if (targetStoreId === 6) {
    return code === 'DT' || name.includes('ĐỀ THÁM') || name.includes('DE THAM');
  }
  if (targetStoreId === 16) {
    return code === 'EP' || name.includes('ESTELLA');
  }
  return false;
}
