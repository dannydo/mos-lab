import dayjs, { type Dayjs } from 'dayjs';
import {
  removeVietnameseTones,
  type BkConfigResponse,
  type BkGame,
  type BkGameCreateInput,
  type BkGameDoneBonusRule,
  type BkGameMetricType,
  type BkGameTeamBookingDoneBonusConfig,
  type BkGameType,
  type Staff,
  type TeamListResponse,
} from '@mos-lab/shared';

export interface BkGameCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newGame: BkGame) => void;
}

export interface StaffProfileOption {
  staffId: number;
  crmStaffId?: number;
  displayName: string;
  avatarUrl?: string | null;
  roleKey?: string;
  roleName?: string;
  departmentCode?: string;
  departmentName?: string;
  teamCode?: string;
  teamName?: string;
  isDefaultBk?: boolean;
}

export interface BkGameCreateFormValues {
  title: string;
  description?: string;
  gameType: BkGameType;
  metricType: BkGameMetricType;
  allowedBookingChannels?: string[];
  dateRange: [Dayjs, Dayjs];
  targetScore?: number;
  teamKpiDailyTarget?: number;
  teamKpiTimeWindow?: [Dayjs, Dayjs];
  teamKpiRewardPerDay?: number;
  teamKpiPenaltyPerDay?: number;
  entryFee?: number;
  rewardPool?: number;
  rewardDescription?: string;
  penaltyDescription?: string;
  participantIds?: number[];
  team1Name?: string;
  team1Members?: number[];
  team2Name?: string;
  team2Members?: number[];
}

export type StaffSelectOptionItem = {
  value: number;
  label: string;
  staff: StaffProfileOption;
};

export type RoleFilterOptionEntry = {
  value?: string;
  label: string;
  options?: Array<{ value: string; label: string }>;
};

export type ParticipantFieldName = 'participantIds' | 'team1Members' | 'team2Members';

interface StaffTeamMeta {
  teamCode?: string;
  teamName?: string;
  departmentCode?: string;
  departmentName?: string;
}

/**
 * Returns default Antd Form values evaluated at mount/reset time so dateRange
 * reflects the current day.
 */
export function getInitialGameCreateValues(): Partial<BkGameCreateFormValues> {
  return {
    gameType: 'INDIVIDUAL',
    metricType: 'BOOKINGS',
    dateRange: [dayjs().startOf('day'), dayjs().endOf('day')],
    targetScore: 50,
    teamKpiDailyTarget: 30,
    teamKpiRewardPerDay: 50000,
    teamKpiPenaltyPerDay: 25000,
    teamKpiTimeWindow: [dayjs('08:00', 'HH:mm'), dayjs('17:00', 'HH:mm')],
    entryFee: 50000,
    rewardPool: 500000,
    rewardDescription: 'Nhất nhận toàn bộ quỹ cược + 500k thưởng công ty',
    penaltyDescription: 'Bao trà sữa Phúc Long cả team',
    team1Name: 'Team Sói Bạc',
    team2Name: 'Team Đại Bàng',
  };
}

/** Maps a role key to a human-readable Vietnamese label with fallback defaults. */
export function getRoleDisplayName(key: string | undefined, roleNameMap: Map<string, string>): string {
  if (!key) return 'Nhân viên';
  if (roleNameMap.has(key)) return roleNameMap.get(key)!;
  switch (key) {
    case 'telesales':
      return 'Telesales';
    case 'cc':
      return 'Tư vấn viên (CC)';
    case 'lt':
    case 'technician':
    case 'cv':
      return 'Chuyên Viên';
    case 'ht':
      return 'Head Teacher';
    case 'teacher':
      return 'Giáo viên';
    case 'coca':
      return 'Combo Care';
    case 'oc':
      return 'Điều phối (OC)';
    case 'qa_qc':
      return 'QA & QC';
    case 'manager':
      return 'Quản lý';
    case 'admin':
    case 'super_admin':
      return 'Admin';
    default:
      return key;
  }
}

function inferDepartmentMeta(role?: string): { code: string; name: string } {
  if (role === 'telesales') {
    return { code: 'GROWTH', name: 'Growth & Booking' };
  }
  if (['cc', 'lt', 'technician', 'coca'].includes(role || '')) {
    return { code: 'SHOP', name: 'Shop Operations' };
  }
  if (['teacher', 'ht'].includes(role || '')) {
    return { code: 'ACADEMY', name: 'Academy' };
  }
  return { code: 'BACK_OFFICE', name: 'Back Office' };
}

/**
 * Merges active CRM staff, team/department assignments, role labels, and BK config
 * staff options into a deduplicated, sorted participant option list.
 */
export function buildStaffProfileList(params: {
  configRes: BkConfigResponse | null;
  staffRes: Staff[];
  teamsRes: TeamListResponse | null;
  rolesRes: unknown[];
}): StaffProfileOption[] {
  const { configRes, staffRes, teamsRes, rolesRes } = params;
  const activeBkIds = configRes?.activeBkIds || [];

  const roleNameMap = new Map<string, string>();
  ((rolesRes as Array<{ key?: string; name?: string }>) || []).forEach((r) => {
    if (r && r.key && r.name) {
      roleNameMap.set(r.key, r.name);
    }
  });

  const staffTeamMetaMap = new Map<number, StaffTeamMeta>();
  if (teamsRes && Array.isArray(teamsRes.teams)) {
    teamsRes.teams.forEach((t) => {
      const dep = t.department;
      const meta: StaffTeamMeta = {
        teamCode: t.code,
        teamName: t.name,
        departmentCode: dep?.code,
        departmentName: dep?.name,
      };
      if (Array.isArray(t.activeStaffIds)) {
        t.activeStaffIds.forEach((sid) => {
          if (sid && !staffTeamMetaMap.has(sid)) {
            staffTeamMetaMap.set(sid, meta);
          }
        });
      }
    });
  }

  const staffMap = new Map<number, StaffProfileOption>();

  (staffRes || []).forEach((s) => {
    const sid = s.legacyStaffId || s.id;
    const meta = staffTeamMetaMap.get(sid) || (s.legacyStaffId ? staffTeamMetaMap.get(s.legacyStaffId) : undefined);
    const inferredDep = inferDepartmentMeta(s.role);
    const depCode = meta?.departmentCode || inferredDep.code;
    const depName = meta?.departmentName || inferredDep.name;
    const roleLabel = getRoleDisplayName(s.role, roleNameMap);

    staffMap.set(sid, {
      staffId: sid,
      crmStaffId: s.id,
      displayName: s.displayName,
      avatarUrl: s.avatarUrl,
      roleKey: s.role,
      roleName: roleLabel,
      departmentCode: depCode,
      departmentName: depName,
      teamCode: meta?.teamCode,
      teamName: meta?.teamName || roleLabel,
      isDefaultBk: activeBkIds.includes(sid),
    });
  });

  if (configRes && Array.isArray(configRes.allStaffOptions)) {
    configRes.allStaffOptions.forEach((bs) => {
      if (!staffMap.has(bs.staffId)) {
        staffMap.set(bs.staffId, {
          staffId: bs.staffId,
          displayName: bs.displayName || `BK #${bs.staffId}`,
          roleKey: 'telesales',
          roleName: 'Telesales',
          departmentCode: 'GROWTH',
          departmentName: 'Growth & Booking',
          teamCode: 'BK_TELESALES',
          teamName: 'Telesales',
          isDefaultBk: activeBkIds.includes(bs.staffId),
        });
      }
    });
  }

  return Array.from(staffMap.values()).sort((a, b) => {
    if (a.isDefaultBk && !b.isDefaultBk) return -1;
    if (!a.isDefaultBk && b.isDefaultBk) return 1;
    return a.displayName.localeCompare(b.displayName, 'vi');
  });
}

/** Builds grouped department and team/role filter options for the staff selector. */
export function buildRoleFilterOptions(allStaffList: StaffProfileOption[]): RoleFilterOptionEntry[] {
  if (allStaffList.length === 0) return [];

  const depCounts: Record<string, number> = {};
  const teamCounts: Record<string, number> = {};

  allStaffList.forEach((s) => {
    if (s.departmentCode) {
      depCounts[s.departmentCode] = (depCounts[s.departmentCode] || 0) + 1;
    }
    const tKey = s.teamCode || s.roleKey || 'OTHER';
    teamCounts[tKey] = (teamCounts[tKey] || 0) + 1;
  });

  const telesalesCount = (teamCounts['BK_TELESALES'] || 0) + (teamCounts['telesales'] || 0);
  const ccCount = (teamCounts['CC'] || 0) + (teamCounts['cc'] || 0);
  const cvCount = (teamCounts['CV'] || 0) + (teamCounts['technician'] || 0) + (teamCounts['lt'] || 0);
  const csCount = teamCounts['BK_CS'] || 0;
  const controlCount = teamCounts['BK_CONTROL'] || 0;
  const academyCount = (teamCounts['ACADEMY'] || 0) + (teamCounts['teacher'] || 0) + (teamCounts['ht'] || 0);
  const marketingCount = teamCounts['MARKETING_SALES'] || 0;
  const qaCount =
    (teamCounts['QA_QC'] || 0) +
    (teamCounts['QA_QC_SHOP'] || 0) +
    (teamCounts['QA_QC_TECHNICIAN'] || 0) +
    (teamCounts['QA_QC_CX'] || 0) +
    (teamCounts['qa_qc'] || 0);
  const mgmtCount = (teamCounts['admin'] || 0) + (teamCounts['manager'] || 0) + (teamCounts['super_admin'] || 0);

  return [
    {
      value: 'ALL',
      label: `Tất cả vai trò & bộ phận (${allStaffList.length})`,
    },
    {
      label: 'Theo Bộ Phận',
      options: [
        { value: 'DEP:GROWTH', label: `Growth & Booking (${depCounts['GROWTH'] || 0})` },
        { value: 'DEP:SHOP', label: `Shop Operations (${depCounts['SHOP'] || 0})` },
        { value: 'DEP:ACADEMY', label: `Academy / Đào tạo (${depCounts['ACADEMY'] || 0})` },
        { value: 'DEP:BACK_OFFICE', label: `Back Office / Quản trị (${depCounts['BACK_OFFICE'] || 0})` },
      ].filter((o) => (depCounts[o.value.replace('DEP:', '')] || 0) > 0),
    },
    {
      label: 'Theo Vai trò / Đội nhóm',
      options: [
        { value: 'TEAM:BK_TELESALES', label: `Telesales (${telesalesCount})`, count: telesalesCount },
        { value: 'TEAM:CC', label: `Client Consultant - CC (${ccCount})`, count: ccCount },
        { value: 'TEAM:CV', label: `Chuyên viên - CV (${cvCount})`, count: cvCount },
        { value: 'TEAM:BK_CS', label: `Customer Service - CS (${csCount})`, count: csCount },
        { value: 'TEAM:BK_CONTROL', label: `Control (${controlCount})`, count: controlCount },
        { value: 'TEAM:ACADEMY', label: `Đào tạo / Giảng viên (${academyCount})`, count: academyCount },
        { value: 'TEAM:MARKETING_SALES', label: `Marketing & Sales (${marketingCount})`, count: marketingCount },
        { value: 'TEAM:QA_QC', label: `QA / QC (${qaCount})`, count: qaCount },
        { value: 'ROLE:MANAGEMENT', label: `Quản lý / Admin (${mgmtCount})`, count: mgmtCount },
      ]
        .filter((o) => o.count > 0)
        .map((o) => ({ value: o.value, label: o.label })),
    },
  ];
}

/** Filters staff profiles according to the selected department, team, or role key. */
export function filterStaffByRole(
  allStaffList: StaffProfileOption[],
  selectedRoleFilter: string
): StaffProfileOption[] {
  if (selectedRoleFilter === 'ALL') return allStaffList;

  if (selectedRoleFilter.startsWith('DEP:')) {
    const depCode = selectedRoleFilter.replace('DEP:', '');
    return allStaffList.filter((s) => s.departmentCode === depCode);
  }

  if (selectedRoleFilter.startsWith('TEAM:')) {
    const teamCode = selectedRoleFilter.replace('TEAM:', '');
    if (teamCode === 'BK_TELESALES') {
      return allStaffList.filter((s) => s.teamCode === 'BK_TELESALES' || s.roleKey === 'telesales' || s.isDefaultBk);
    }
    if (teamCode === 'CC') {
      return allStaffList.filter((s) => s.teamCode === 'CC' || s.roleKey === 'cc');
    }
    if (teamCode === 'CV') {
      return allStaffList.filter((s) => s.teamCode === 'CV' || ['technician', 'lt'].includes(s.roleKey || ''));
    }
    if (teamCode === 'BK_CS') {
      return allStaffList.filter((s) => s.teamCode === 'BK_CS');
    }
    if (teamCode === 'BK_CONTROL') {
      return allStaffList.filter((s) => s.teamCode === 'BK_CONTROL');
    }
    if (teamCode === 'ACADEMY') {
      return allStaffList.filter((s) => s.teamCode === 'ACADEMY' || ['teacher', 'ht'].includes(s.roleKey || ''));
    }
    if (teamCode === 'MARKETING_SALES') {
      return allStaffList.filter((s) => s.teamCode === 'MARKETING_SALES');
    }
    if (teamCode === 'QA_QC') {
      return allStaffList.filter((s) => s.teamCode?.startsWith('QA_QC') || s.roleKey === 'qa_qc');
    }
    return allStaffList.filter((s) => s.teamCode === teamCode);
  }

  if (selectedRoleFilter === 'ROLE:MANAGEMENT') {
    return allStaffList.filter((s) => ['admin', 'super_admin', 'manager'].includes(s.roleKey || ''));
  }

  return allStaffList;
}

/** Builds Select options while retaining already-selected staff outside the active filter. */
export function buildSelectableStaffOptions(
  allStaffList: StaffProfileOption[],
  filteredStaffList: StaffProfileOption[],
  currentlySelected: number[]
): StaffSelectOptionItem[] {
  const selectedIdsSet = new Set<number>(currentlySelected);
  const inFilterIdsSet = new Set<number>(filteredStaffList.map((s) => s.staffId));

  const combined = [...filteredStaffList];
  allStaffList.forEach((s) => {
    if (selectedIdsSet.has(s.staffId) && !inFilterIdsSet.has(s.staffId)) {
      combined.push(s);
    }
  });

  return combined.map((s) => ({
    value: s.staffId,
    label: s.displayName,
    staff: s,
  }));
}

/** Tone-insensitive and role/team-aware search matcher for staff Select dropdowns. */
export function matchesStaffFilterOption(
  input: string,
  option?: { label?: unknown; staff?: StaffProfileOption }
): boolean {
  if (!input || !option) return true;
  const rawInput = removeVietnameseTones(input.toLowerCase().trim());
  const labelStr = typeof option.label === 'string' ? option.label : '';
  const rawLabel = removeVietnameseTones(labelStr.toLowerCase());
  const rawRole = removeVietnameseTones((option.staff?.roleName || '').toLowerCase());
  const rawTeam = removeVietnameseTones((option.staff?.teamName || '').toLowerCase());
  const staffIdStr = String(option.staff?.staffId || '');
  return (
    rawLabel.includes(rawInput) ||
    rawRole.includes(rawInput) ||
    rawTeam.includes(rawInput) ||
    staffIdStr.includes(rawInput)
  );
}

/** Returns Tailwind badge styling classes with light/dark parity for a department code. */
export function getStaffDepartmentTagClass(departmentCode?: string): string {
  if (departmentCode === 'GROWTH') {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
  }
  if (departmentCode === 'SHOP') {
    return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
  }
  if (departmentCode === 'ACADEMY') {
    return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800';
  }
  return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
}

/** Transforms validated form values and bonus rules into the API createGame payload. */
export function buildCreateGamePayload(
  values: BkGameCreateFormValues,
  doneBonusRules: BkGameDoneBonusRule[],
  teamBookingDoneBonusConfig: BkGameTeamBookingDoneBonusConfig | null
): BkGameCreateInput {
  const [start, end] = values.dateRange;
  const payload: BkGameCreateInput = {
    title: values.title,
    description: values.description,
    gameType: values.gameType,
    metricType: values.metricType,
    allowedBookingChannels: values.allowedBookingChannels,
    targetScore: values.targetScore,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    entryFee: values.entryFee || 0,
    rewardPool: values.rewardPool || 0,
    rewardDescription: values.rewardDescription,
    penaltyDescription: values.penaltyDescription,
    doneBonusConfig: doneBonusRules.length > 0 ? doneBonusRules : null,
    teamBookingDoneBonusConfig:
      teamBookingDoneBonusConfig && teamBookingDoneBonusConfig.tiers.length > 0 ? teamBookingDoneBonusConfig : null,
    winnerCriteria: 'TOP_1',
  };

  if (values.gameType === 'TEAM') {
    payload.teams = [
      {
        teamName: values.team1Name || 'Team Sói Bạc',
        color: 'blue',
        staffIds: values.team1Members || [],
      },
      {
        teamName: values.team2Name || 'Team Đại Bàng',
        color: 'red',
        staffIds: values.team2Members || [],
      },
    ];
  } else if (values.gameType === 'TEAM_KPI') {
    payload.participantIds = values.participantIds;
    const timeWindow = values.teamKpiTimeWindow;
    const dailyTarget = values.teamKpiDailyTarget || 30;
    const rewardPerDay = values.teamKpiRewardPerDay ?? 50000;
    const penaltyPerDay = values.teamKpiPenaltyPerDay ?? 25000;
    const timeWindowStart = timeWindow && timeWindow[0] ? timeWindow[0].format('HH:mm') : '08:00';
    const timeWindowEnd = timeWindow && timeWindow[1] ? timeWindow[1].format('HH:mm') : '17:00';

    payload.teamKpiConfig = {
      dailyTarget,
      rewardPerDay,
      penaltyPerDay,
      timeWindowStart,
      timeWindowEnd,
    };
    payload.targetScore = dailyTarget;
    payload.rewardDescription =
      values.rewardDescription ||
      `Đạt KPI: Team thưởng +${rewardPerDay.toLocaleString('vi-VN')}đ/ngày (Khung giờ: ${timeWindowStart}–${timeWindowEnd})`;
    payload.penaltyDescription =
      values.penaltyDescription || `Không đạt: Team phạt -${penaltyPerDay.toLocaleString('vi-VN')}đ/ngày`;
  } else {
    payload.participantIds = values.participantIds;
  }

  return payload;
}
