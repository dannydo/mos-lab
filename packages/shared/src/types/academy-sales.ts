import type { ActionResponse, PageQuery, PageResponse } from './api.js';

export const ACADEMY_LEAD_STATUSES = ['NEW', 'WARM', 'SCHEDULED', 'TESTED', 'WON', 'LOST'] as const;
export type AcademyLeadStatus = (typeof ACADEMY_LEAD_STATUSES)[number];

export const ACADEMY_ACTIVITY_TYPES = [
  'IMPORT',
  'NOTE',
  'CALL',
  'ZALO',
  'STATUS_CHANGE',
  'SCHEDULED',
  'NO_SHOW',
  'ENROLLMENT',
] as const;
export type AcademyActivityType = (typeof ACADEMY_ACTIVITY_TYPES)[number];

export type AcademyFollowUpStatus = 'PENDING' | 'DONE';

export interface AcademyStaffOption {
  id: number;
  displayName: string;
  email?: string | null;
  role: string;
}

export interface AcademyLeadOwner {
  id: number;
  displayName: string;
  email?: string | null;
}

export interface AcademyLead {
  id: number;
  name: string;
  phone: string | null;
  phoneNormalized: string | null;
  email: string | null;
  source: string;
  sourceSystem: string;
  pancakeId: string | null;
  facebookPsid: string | null;
  pageId: string | null;
  facebookChatLink: string | null;
  avatarUrl: string | null;
  status: AcademyLeadStatus;
  course: string | null;
  goal: string | null;
  flightDate: string | null;
  scheduledAt: string | null;
  revenueVnd: number;
  isHot: boolean;
  hotMarkedAt: string | null;
  lastContactAt: string | null;
  owner: AcademyLeadOwner | null;
  legacyOwnerEmail: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyLeadActivity {
  id: number;
  leadId: number;
  type: AcademyActivityType;
  content: string | null;
  metadata: Record<string, unknown> | null;
  actor: AcademyLeadOwner | null;
  occurredAt: string;
  createdAt: string;
}

export interface AcademyFollowUpTask {
  id: number;
  leadId: number;
  leadName?: string;
  content: string;
  dueAt: string | null;
  status: AcademyFollowUpStatus;
  pancakeLink: string | null;
  assignee: AcademyLeadOwner | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AcademyLeadDetail extends AcademyLead {
  activities: AcademyLeadActivity[];
  followUpTasks: AcademyFollowUpTask[];
}

export interface AcademyLeadSummary {
  total: number;
  newCount: number;
  warmCount: number;
  scheduledCount: number;
  testedCount: number;
  wonCount: number;
  lostCount: number;
  hotCount: number;
  warmHotCount: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  wonToday: number;
}

export interface ListAcademyLeadsParams extends PageQuery {
  search?: string;
  status?: AcademyLeadStatus | 'ALL';
  ownerStaffId?: number | 'ALL' | 'UNASSIGNED';
  hotView?: 'ALL' | 'PRIORITY' | 'HOT' | 'WARM' | 'WON_TODAY';
  sortBy?: 'createdAt' | 'updatedAt' | 'hotMarkedAt' | 'scheduledAt';
  sortOrder?: 'asc' | 'desc';
}

export type ListAcademyLeadsResponse = PageResponse<AcademyLead, AcademyLeadSummary>;

export interface CreateAcademyLeadRequest {
  name: string;
  phone?: string | null;
  email?: string | null;
  source?: string;
  course?: string | null;
  goal?: string | null;
  flightDate?: string | null;
  scheduledAt?: string | null;
  ownerStaffId?: number | null;
  note?: string | null;
}

export interface UpdateAcademyLeadRequest extends Partial<CreateAcademyLeadRequest> {
  status?: AcademyLeadStatus;
  revenueVnd?: number;
  isHot?: boolean;
}

export interface CreateAcademyActivityRequest {
  type: Exclude<AcademyActivityType, 'IMPORT' | 'STATUS_CHANGE' | 'SCHEDULED' | 'ENROLLMENT'>;
  content: string;
  occurredAt?: string;
}

export interface CreateAcademyFollowUpRequest {
  leadId: number;
  content: string;
  dueAt?: string | null;
  pancakeLink?: string | null;
  assigneeStaffId?: number | null;
}

export interface UpdateAcademyFollowUpRequest {
  content?: string;
  dueAt?: string | null;
  pancakeLink?: string | null;
  assigneeStaffId?: number | null;
  status?: AcademyFollowUpStatus;
}

export interface ListAcademyFollowUpsParams extends PageQuery {
  status?: AcademyFollowUpStatus | 'ALL';
  bucket?: 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'UNDATED' | 'ALL';
  search?: string;
}

export type ListAcademyFollowUpsResponse = PageResponse<AcademyFollowUpTask>;

export interface AcademyPlaybook {
  id: number;
  title: string;
  category: string;
  description: string | null;
  content: string;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
}

export interface UpsertAcademyPlaybookRequest {
  title: string;
  category: string;
  description?: string | null;
  content: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface AcademyCourse {
  id: number;
  code: string;
  name: string;
  tag: string | null;
  description: string | null;
  listPriceVnd: number;
  promoPriceVnd: number;
  kitName: string | null;
  kitUrl: string | null;
  syllabus: Array<{ num: number; title: string; description: string }>;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
}

export interface UpsertAcademyCourseRequest {
  code: string;
  name: string;
  tag?: string | null;
  description?: string | null;
  listPriceVnd: number;
  promoPriceVnd: number;
  kitName?: string | null;
  kitUrl?: string | null;
  syllabus?: Array<{ num: number; title: string; description: string }>;
  sortOrder?: number;
  isActive?: boolean;
}

export interface AcademyImportReport {
  dryRun: boolean;
  leads: { created: number; updated: number; skipped: number; ambiguous: number };
  activities: { created: number; skipped: number };
  followUps: { created: number; skipped: number };
  playbooks: { created: number; updated: number };
  courses: { created: number; updated: number };
  ownerEmailsUnmatched: string[];
  excludedLeadIds: string[];
}

export type AcademyLeadActionResponse = ActionResponse<AcademyLead>;
