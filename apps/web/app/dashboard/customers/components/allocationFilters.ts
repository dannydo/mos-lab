import type { Staff, Team } from '@mos-lab/shared';

/** Sentinel group value meaning "staff who belong to no active team". */
export const NO_TEAM_VALUE = -1;

export interface AllocationTeam {
  id: number;
  name: string;
  departmentName: string;
  /** Legacy staff IDs of this team plus every descendant team. */
  legacyStaffIds: Set<number>;
  /** Legacy staff IDs that are direct members of this team only. */
  directLegacyStaffIds: Set<number>;
}

export function normalizeRole(role: string | null | undefined): string {
  return String(role || '')
    .trim()
    .toLowerCase();
}

/**
 * Flattens the nested team tree. A parent team aggregates the members of all of
 * its child teams so choosing a parent group includes every sub-group.
 */
export function flattenTeams(teams: Team[]): AllocationTeam[] {
  const result: AllocationTeam[] = [];

  const visit = (team: Team): Set<number> => {
    const direct = new Set((team.activeStaffIds || []).map((id) => Number(id)));
    const aggregated = new Set(direct);
    const entryIndex = result.length;
    result.push({
      id: team.id,
      name: team.name,
      departmentName: team.department?.name || 'Khác',
      legacyStaffIds: aggregated,
      directLegacyStaffIds: direct,
    });
    (team.children || []).forEach((child) => {
      visit(child).forEach((id) => aggregated.add(id));
    });
    result[entryIndex].legacyStaffIds = aggregated;
    return aggregated;
  };

  teams.filter((team) => team.isActive !== false).forEach(visit);
  return result;
}

export function isStaffInTeam(staff: Staff, team: AllocationTeam | undefined): boolean {
  return Boolean(team && staff.legacyStaffId != null && team.legacyStaffIds.has(Number(staff.legacyStaffId)));
}

export function hasNoTeam(staff: Staff, teams: AllocationTeam[]): boolean {
  if (staff.legacyStaffId == null) return true;
  const legacyId = Number(staff.legacyStaffId);
  return !teams.some((team) => team.legacyStaffIds.has(legacyId));
}

/** Filters active staff by an optional role and an optional group (AND). */
export function filterStaff(
  staff: Staff[],
  teams: AllocationTeam[],
  role: string | undefined,
  groupId: number | undefined
): Staff[] {
  const team = groupId != null && groupId !== NO_TEAM_VALUE ? teams.find((item) => item.id === groupId) : undefined;
  return staff.filter((member) => {
    if (role && normalizeRole(member.role) !== role) return false;
    if (groupId === NO_TEAM_VALUE) return hasNoTeam(member, teams);
    if (groupId != null) return isStaffInTeam(member, team);
    return true;
  });
}
