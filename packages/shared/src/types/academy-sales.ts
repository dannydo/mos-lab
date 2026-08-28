import type { ActionResponse, PageQuery, PageResponse } from './api.js';

export const ACADEMY_LEAD_STATUSES = ['NEW', 'WARM', 'SCHEDULED', 'TESTED', 'WON', 'LOST'] as const;
export type AcademyLeadStatus = (typeof ACADEMY_LEAD_STATUSES)[number];

export const ACADEMY_ACTIVITY_TYPES = [
  'IMPORT',
  'NOTE',
  'CALL',
  'ZALO',
  /** A structured audit record created when an operator changes lead data in-place. */
  'FIELD_UPDATE',
  'STATUS_CHANGE',
  'SCHEDULED',
  'NO_SHOW',
  'ENROLLMENT',
  'TALENT_ASSESSMENT',
  'INVOICE_PRINTED',
  'PAYMENT_RECEIVED',
] as const;
export type AcademyActivityType = (typeof ACADEMY_ACTIVITY_TYPES)[number];

export type AcademyFollowUpStatus = 'PENDING' | 'DONE';

export interface AcademyStaffOption {
  id: number;
  displayName: string;
  email?: string | null;
  role: string;
}

/** Access is granted only to an Admin or an active member of the Academy Department. */
export interface AcademyWorkspaceAccess {
  canAccess: boolean;
  /** Admins, Managers, and Marketing & Sales can manage Academy records. */
  canManage: boolean;
  scope: 'ADMIN' | 'ACADEMY_TEAM' | null;
}

export interface AcademyWorkspaceAccessResponse {
  data: AcademyWorkspaceAccess;
}

export interface AcademyLeadOwner {
  id: number;
  displayName: string;
  email?: string | null;
}

/**
 * The next pending operational task shown directly in Lead Manager.  The
 * complete task list remains available from the lead drawer.
 */
export interface AcademyLeadNextFollowUp {
  id: number;
  content: string;
  dueAt: string | null;
  assignee: AcademyLeadOwner | null;
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
  /** Earliest pending task that the current actor is allowed to see. */
  nextFollowUp: AcademyLeadNextFollowUp | null;
  /** Total pending tasks on this lead, used for compact operational cues. */
  pendingFollowUpCount: number;
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
  wonRevenueVnd: number;
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

export interface AcademyLeadCalendarEvent {
  id: number;
  name: string;
  phone: string | null;
  avatarUrl: string | null;
  status: AcademyLeadStatus;
  course: string | null;
  scheduledAt: string | null;
  flightDate: string | null;
  owner: AcademyLeadOwner | null;
}

export interface ListAcademyLeadCalendarParams {
  /** Calendar month in Asia/Ho_Chi_Minh, formatted YYYY-MM. Defaults to the current ICT month. */
  month?: string;
  ownerStaffId?: number | 'ALL' | 'UNASSIGNED';
}

export interface ListAcademyLeadCalendarResponse {
  month: string;
  data: AcademyLeadCalendarEvent[];
}

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
  type: Exclude<
    AcademyActivityType,
    | 'IMPORT'
    | 'STATUS_CHANGE'
    | 'SCHEDULED'
    | 'ENROLLMENT'
    | 'TALENT_ASSESSMENT'
    | 'INVOICE_PRINTED'
    | 'PAYMENT_RECEIVED'
  >;
  content: string;
  occurredAt?: string;
}

export interface RecordAcademyNoShowRequest {
  content?: string;
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
  /** Optional English display name used in bilingual Academy materials. */
  nameEn: string | null;
  tag: string | null;
  description: string | null;
  /** Market segment used by the Tố Chất course picker. */
  market: 'DOMESTIC' | 'OVERSEAS';
  /** Optional visual cover; the native picker renders a themed fallback when omitted. */
  coverImageUrl: string | null;
  listPriceVnd: number;
  promoPriceVnd: number;
  /** Fixed VND reward earned by the participant's primary workshop instructor after full tuition payment. */
  teacherBonusVnd: number;
  kitName: string | null;
  kitUrl: string | null;
  /** Catalogue price for the optional lash-kit package, before workshop reward. */
  kitPriceVnd: number;
  /** Catalogue price for the optional model/sample package, before workshop reward. */
  samplePriceVnd: number;
  /** Number of scheduled teaching sessions in the course. */
  lessonCount: number;
  /** Number of live lash models required; zero means no model is required. */
  lashModelCount: number;
  /** Sanitized rich-text HTML. Legacy structured syllabus remains intact for compatibility. */
  syllabusHtml: string | null;
  syllabus: Array<{ num: number; title: string; description: string }>;
  sortOrder: number;
  isActive: boolean;
  updatedAt: string;
}

export interface UpsertAcademyCourseRequest {
  code: string;
  name: string;
  nameEn?: string | null;
  tag?: string | null;
  description?: string | null;
  market?: 'DOMESTIC' | 'OVERSEAS';
  coverImageUrl?: string | null;
  listPriceVnd: number;
  promoPriceVnd: number;
  teacherBonusVnd?: number;
  kitName?: string | null;
  kitUrl?: string | null;
  kitPriceVnd?: number;
  samplePriceVnd?: number;
  lessonCount?: number;
  lashModelCount?: number;
  syllabusHtml?: string | null;
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
