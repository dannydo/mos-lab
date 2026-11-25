import {
  type CareerProgressionConfig,
  type CareerRole,
  type CareerStaffSummary,
  isCanonicalSuperAdminIdentity,
  isSuperAdminRole,
} from '@mos-lab/shared';
import { FALLBACK_CAREER_PROGRESSION_CONFIG, matchesCareerBranchFilter } from '../career-path.constants';
import type { CareerSelectorMode } from '../components/StaffCareerSelector';

export interface CareerCurrentUser {
  id?: number;
  role?: string;
  username?: string;
  email?: string;
  name?: string;
}

export type CareerIslandId = 'ktv' | 'cv' | 'cv_plus' | 'cv_plus_plus' | 'fm' | 'cho' | 'boss' | 'cc';

export type SimulationTargetRole = 'CV_PLUS' | 'CV_PLUS_PLUS';

export interface CareerConfigSavePayload {
  cvToCc: CareerProgressionConfig['cvToCc'];
  cvToCvPlus: CareerProgressionConfig['cvToCvPlus'];
  cvPlusToCvPlusPlus: CareerProgressionConfig['cvPlusToCvPlusPlus'];
  maintenanceRules?: CareerProgressionConfig['maintenanceRules'];
}

export function readStoredCareerUser(): CareerCurrentUser | null {
  try {
    const stored = localStorage.getItem('mos_user');
    if (stored) {
      return JSON.parse(stored) as CareerCurrentUser;
    }
  } catch {
    // Ignore localStorage parse/access errors
  }
  return null;
}

export function readStoredSelectorMode(): CareerSelectorMode {
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('mos_career_selector_mode') as CareerSelectorMode | null;
      if (saved === 'ultra_compact' || saved === 'cards' || saved === 'table') {
        return saved;
      }
    } catch {
      // Ignore localStorage read errors
    }
  }
  return 'cards';
}

export function isSuperAdminCareerUser(user: CareerCurrentUser | null): boolean {
  if (!user) return false;
  return (
    isSuperAdminRole(user.role) ||
    isCanonicalSuperAdminIdentity({
      username: user.username,
      email: user.email,
    })
  );
}

export function canOpenCareerConfig(user: CareerCurrentUser | null): boolean {
  return ['admin', 'super_admin'].includes(user?.role?.toLowerCase() || '');
}

export function normalizeCareerProgressionConfig(config: CareerProgressionConfig): CareerProgressionConfig {
  const base = FALLBACK_CAREER_PROGRESSION_CONFIG;
  if (!config || !config.cvToCc) return base;
  return {
    ...base,
    ...config,
    cvToCvPlus: { ...base.cvToCvPlus, ...(config.cvToCvPlus || {}) },
    cvPlusToCvPlusPlus: { ...base.cvPlusToCvPlusPlus, ...(config.cvPlusToCvPlusPlus || {}) },
    cvPlusPlusToFm: { ...base.cvPlusPlusToFm, ...(config.cvPlusPlusToFm || {}) },
    cvToCc: { ...base.cvToCc, ...(config.cvToCc || {}) },
    ccToFm: { ...base.ccToFm, ...(config.ccToFm || {}) },
    fmToCho: { ...base.fmToCho, ...(config.fmToCho || {}) },
    choToBoss: { ...base.choToBoss, ...(config.choToBoss || {}) },
    rewardRates: { ...base.rewardRates, ...(config.rewardRates || {}) },
  };
}

export function sortCareerStaffList(list: CareerStaffSummary[]): CareerStaffSummary[] {
  return [...list].sort((a, b) => {
    const diff = (b.ordersCount || 0) - (a.ordersCount || 0);
    if (diff !== 0) return diff;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });
}

export function findCareerStaffByIdOrLegacy(
  staffList: CareerStaffSummary[],
  targetId: number
): CareerStaffSummary | undefined {
  return staffList.find((s) => s.id === targetId || (s.legacyStaffId && s.legacyStaffId === targetId));
}

export function resolveDefaultCareerStaff(params: {
  sortedList: CareerStaffSummary[];
  queryStaffId: string | null;
  selectedStaffId: number | null;
  currentUserId?: number;
  activeBranchFilter?: string;
}): CareerStaffSummary | undefined {
  const { sortedList, queryStaffId, selectedStaffId, currentUserId, activeBranchFilter = 'ALL' } = params;
  const targetParamId = queryStaffId ? Number(queryStaffId) : null;
  const queryStaff = targetParamId ? findCareerStaffByIdOrLegacy(sortedList, targetParamId) : undefined;
  const ownStaff = currentUserId ? findCareerStaffByIdOrLegacy(sortedList, currentUserId) : undefined;

  const branchPool = sortedList.filter((s) => matchesCareerBranchFilter(s, activeBranchFilter));
  const effectivePool = branchPool.length > 0 ? branchPool : sortedList;
  const cvPool = effectivePool.filter((s) => ['CV', 'CV_PLUS', 'CV_PLUS_PLUS'].includes(s.careerRole));
  const targetPool = cvPool.length > 0 ? cvPool : effectivePool;
  const highestOrdersStaff = targetPool[0];

  const selectedInBranch = selectedStaffId ? effectivePool.find((s) => s.id === selectedStaffId) : undefined;
  const ownInBranch = ownStaff && matchesCareerBranchFilter(ownStaff, activeBranchFilter) ? ownStaff : undefined;

  return queryStaff || selectedInBranch || ownInBranch || highestOrdersStaff;
}

export function getDefaultSimulationTarget(role?: CareerRole | string | null): SimulationTargetRole {
  return role === 'CV_PLUS' ? 'CV_PLUS_PLUS' : 'CV_PLUS';
}

export function computeExpProgressPercent(ordersCount: number, minOrders: number): number {
  if (!minOrders || minOrders <= 0) return 0;
  return Math.min(100, Math.round((ordersCount / minOrders) * 100));
}
