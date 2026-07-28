/** Team code identifiers */
export type TeamCode = 'CC' | 'CV' | 'BK' | 'BK_TELESALES' | 'BK_CS' | 'BK_CONTROL' | 'BK_OTHER' | string;

/** Team record from DB */
export interface Team {
  id: number;
  code: TeamCode;
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  parentTeamId?: number | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  // Populated relations
  children?: Team[];
  memberCount?: number;
  activeStaffIds?: number[];
}

/** Team member record from DB */
export interface TeamMember {
  id: number;
  teamId: number;
  legacyStaffId: number;
  crmStaffId?: number | null;
  displayName?: string | null;
  role?: string | null;
  isActive: boolean;
  sortOrder: number;
  joinedAt: string;
  leftAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Populated relations
  team?: Team;
}

/** Unified staff option (replaces CcStaffOption, CvStaffOption, BkStaffOption) */
export interface TeamStaffOption {
  staffId: number; // legacyStaffId
  crmStaffId?: number;
  displayName: string;
  username?: string;
  isActive: boolean; // is member active in this team
  store?: string;
  role?: string; // role within team
}

/** API response for team list */
export interface TeamListResponse {
  teams: Team[];
}

/** API response for single team with members */
export interface TeamDetailResponse {
  team: Team;
  members: TeamStaffOption[];
  allStaffOptions: TeamStaffOption[];
}

/** API request to update team members */
export interface UpdateTeamMembersRequest {
  activeStaffIds: number[];
}

/** API request to create/update team */
export interface UpsertTeamRequest {
  code: TeamCode;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  parentTeamId?: number | null;
  metadata?: Record<string, unknown>;
}
