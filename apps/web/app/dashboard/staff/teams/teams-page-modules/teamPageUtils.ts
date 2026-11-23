import {
  removeVietnameseTones,
  type Department,
  type Team,
  type TeamStaffOption,
  type UpsertTeamRequest,
} from '@mos-lab/shared';
import { teamDescendantIds, type RoleFilter, type TeamFormValues } from '../teams-page.helpers';

export type TeamEditorState = {
  team?: Team;
  parent?: Team;
} | null;

export type TeamSelectOption = {
  value: number;
  label: string;
};

export function isAutoGroupTeam(team: Team | null): boolean {
  return Boolean(team && (team.code === 'BK_OTHER' || team.code.endsWith('_OTHER')));
}

export function collectDefinedTeamStaffIds(allTeams: Team[], currentTeamCode?: string): Set<number> {
  const staffIds = new Set<number>();
  allTeams.forEach((team) => {
    if (team.activeStaffIds && !team.code.endsWith('_OTHER') && team.code !== currentTeamCode) {
      team.activeStaffIds.forEach((staffId) => staffIds.add(staffId));
    }
  });
  return staffIds;
}

function matchesStaffQuery(staff: TeamStaffOption, query: string): boolean {
  return (
    removeVietnameseTones(staff.displayName).includes(query) ||
    Boolean(staff.username && removeVietnameseTones(staff.username).includes(query)) ||
    String(staff.staffId).includes(query)
  );
}

function matchesRoleFilter(staff: TeamStaffOption, roleFilter: RoleFilter): boolean {
  if (roleFilter === 'ALL') return true;
  const role = (staff.role || '').toUpperCase();
  if (roleFilter === 'CC') return role.includes('CC');
  if (roleFilter === 'CV') return role.includes('CV') || role.includes('KTV');
  if (roleFilter === 'BK') return role.includes('BK') || role.includes('BOOKER');
  return !role.includes('CC') && !role.includes('CV') && !role.includes('KTV') && !role.includes('BK');
}

export function filterAvailablePoolOptions(params: {
  staffOptions: TeamStaffOption[];
  autoGroupStaffOptions: TeamStaffOption[];
  isAutoGroup: boolean;
  roleFilter: RoleFilter;
  poolSearchText: string;
}): TeamStaffOption[] {
  const { staffOptions, autoGroupStaffOptions, isAutoGroup, roleFilter, poolSearchText } = params;
  let options = isAutoGroup ? autoGroupStaffOptions : staffOptions;

  if (!isAutoGroup && roleFilter !== 'ALL') {
    options = options.filter((staff) => matchesRoleFilter(staff, roleFilter));
  }

  if (!poolSearchText.trim()) return options;
  const query = removeVietnameseTones(poolSearchText);
  return options.filter((staff) => matchesStaffQuery(staff, query));
}

export function filterActiveMembers(params: {
  staffOptions: TeamStaffOption[];
  selectedStaffIds: Set<number>;
  activeSearchText: string;
}): TeamStaffOption[] {
  const { staffOptions, selectedStaffIds, activeSearchText } = params;
  const members = staffOptions.filter((staff) => selectedStaffIds.has(staff.staffId));
  if (!activeSearchText.trim()) return members;
  const query = removeVietnameseTones(activeSearchText);
  return members.filter((staff) => matchesStaffQuery(staff, query));
}

export function buildParentTeamOptions(allTeams: Team[], editingTeam?: Team): TeamSelectOption[] {
  const exclusionIds = editingTeam ? new Set([editingTeam.id, ...teamDescendantIds(editingTeam)]) : new Set<number>();

  return allTeams
    .filter((team) => team.isActive && !exclusionIds.has(team.id) && Boolean(team.departmentId))
    .map((team) => ({
      value: team.id,
      label: `${team.department?.name || 'Department'} · ${team.name} (${team.code})`,
    }));
}

export function buildDepartmentOptions(departments: Department[]): TeamSelectOption[] {
  return departments
    .filter((department) => department.isActive)
    .map((department) => ({
      value: department.id,
      label: `${department.name} (${department.code})`,
    }));
}

export function buildUpsertTeamPayload(
  values: TeamFormValues,
  allTeams: Team[],
  editingTeam?: Team
): UpsertTeamRequest {
  const parent = values.parentTeamId ? allTeams.find((team) => team.id === values.parentTeamId) : undefined;
  return {
    code: editingTeam?.code || values.code.trim().toUpperCase(),
    name: values.name.trim(),
    description: values.description?.trim() || undefined,
    departmentId: parent?.departmentId || values.departmentId,
    parentTeamId: values.parentTeamId || null,
    sortOrder: values.sortOrder ?? 0,
    isActive: values.isActive ?? true,
  };
}
