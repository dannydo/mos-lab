/** Principal types that can receive a menu & API permission grant. */
export type MenuAccessScopeType = 'ROLE' | 'DEPARTMENT' | 'TEAM' | 'STAFF';

/** Canonical role groups for group-based security management. */
export interface MenuAccessRoleGroupOption {
  id: number;
  code: string;
  name: string;
  roles: string[];
  description: string;
}

/** Static sidebar entries governed by the organizational visibility matrix. */
export interface MenuAccessDefinition {
  key: string;
  label: string;
  groupKey: string;
  groupLabel: string;
  path: string;
  description?: string;
}

/** A sidebar category can govern many individual menu entries in one policy. */
export interface MenuAccessCategoryDefinition {
  key: string;
  label: string;
  /** Menu definition group keys covered by this category. */
  menuGroupKeys: string[];
  description: string;
}

export interface MenuAccessSubjectInput {
  type: MenuAccessScopeType;
  subjectId: number;
}

export interface MenuAccessSubject extends MenuAccessSubjectInput {
  label: string;
}

export interface MenuAccessPolicy {
  menuKey: string;
  isRestricted: boolean;
  subjects: MenuAccessSubject[];
  updatedAt?: string | null;
}

export interface MenuAccessDepartmentOption {
  id: number;
  code: string;
  name: string;
}

export interface MenuAccessTeamOption {
  id: number;
  code: string;
  name: string;
  departmentId?: number | null;
}

export interface MenuAccessStaffOption {
  id: number;
  displayName: string;
  username: string;
  role: string;
}

export interface SecurityAccessBlockEntry {
  id: number;
  menuKey: string;
  actorStaffId?: number | null;
  actorLabel: string;
  actorRole?: string;
  method?: string;
  path?: string;
  reason?: string;
  createdAt: string;
}

export interface MenuAccessConfigurationResponse {
  menus: MenuAccessDefinition[];
  policies: MenuAccessPolicy[];
  categories: MenuAccessCategoryDefinition[];
  categoryPolicies: MenuAccessPolicy[];
  roleGroups?: MenuAccessRoleGroupOption[];
  departments: MenuAccessDepartmentOption[];
  teams: MenuAccessTeamOption[];
  staff: MenuAccessStaffOption[];
  recentAudits: MenuAccessAuditEntry[];
  securityBlockLogs?: SecurityAccessBlockEntry[];
}

export interface MenuAccessAuditEntry {
  id: number;
  menuKey: string;
  menuLabel: string;
  actorStaffId?: number | null;
  actorLabel: string;
  beforeIsRestricted: boolean;
  afterIsRestricted: boolean;
  beforeSubjectCount: number;
  afterSubjectCount: number;
  beforeSubjects?: string[];
  afterSubjects?: string[];
  createdAt: string;
}

export interface UpdateMenuAccessPolicyRequest {
  isRestricted: boolean;
  subjects: MenuAccessSubjectInput[];
}

export interface UpdateRoleGroupMatrixRequest {
  allowedMenuKeys: string[];
}

export interface MenuAccessInspectorAllowedItem {
  key: string;
  label: string;
  groupLabel: string;
  path: string;
  grantSource: string;
  grantedBy?: string | null;
  grantedAt?: string | null;
}

export interface MenuAccessTimelineEvent {
  id: string;
  timestamp: string;
  eventType: 'POLICY_CHANGE' | 'ROLE_CHANGE' | 'ACCOUNT_STATUS' | 'BLOCKED_403';
  summary: string;
  actorLabel: string;
  details?: string;
}

export interface MenuAccessInspectorResponse {
  targetType: 'STAFF' | 'ROLE';
  targetId: number;
  targetLabel: string;
  evaluatedAt: string;
  effectiveRole: string;
  effectiveRoleGroup?: MenuAccessRoleGroupOption | null;
  isAccountActive?: boolean;
  activeTeams: Array<{ id: number; code: string; name: string }>;
  activeDepartments: Array<{ id: number; code: string; name: string }>;
  allowedMenus: MenuAccessInspectorAllowedItem[];
  deniedMenusCount: number;
  auditTimeline: MenuAccessTimelineEvent[];
}

export interface MenuAccessSidebarResponse {
  data: {
    visibility: Record<string, boolean>;
    categoryVisibility: Record<string, boolean>;
    restrictedMenuKeys: string[];
    restrictedCategoryKeys: string[];
  };
}
