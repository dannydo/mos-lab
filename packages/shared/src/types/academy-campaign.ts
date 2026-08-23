import type { ActionResponse, PageQuery, PageResponse } from './api.js';
import type { AcademyLeadStatus } from './academy-sales.js';

/**
 * Academy campaigns are intentionally separate from the NYC/Wings Lashes
 * campaign domain. They operate on CRM-native Academy leads only.
 */
export const ACADEMY_CAMPAIGN_STATUSES = [
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'ARCHIVED',
  'DELETED',
] as const;

export type AcademyCampaignStatus = (typeof ACADEMY_CAMPAIGN_STATUSES)[number];

/** Outcomes a salesperson can explicitly record for an Academy touchpoint. */
export const ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOMES = ['SUCCESS', 'MESSAGED', 'FAILED', 'LOST', 'CALLBACK'] as const;

export type AcademyCampaignTouchpointOutcome = (typeof ACADEMY_CAMPAIGN_TOUCHPOINT_OUTCOMES)[number];

export interface AcademyCampaignStaffRef {
  id: number;
  displayName: string;
  email?: string | null;
}

/**
 * The saved filter is audit metadata only. Membership is always a fixed
 * snapshot and is never auto-mutated when new leads subsequently match it.
 */
export interface AcademyCampaignAudienceFilter {
  statuses?: AcademyLeadStatus[];
  ownerStaffIds?: number[];
  courses?: string[];
  sources?: string[];
  sourceSystems?: string[];
  isHot?: boolean;
  scheduledFrom?: string;
  scheduledTo?: string;
  flightFrom?: string;
  flightTo?: string;
}

export interface AcademyCampaignTouchpoint {
  id: number;
  campaignId: number;
  key: string;
  label: string;
  icon: string | null;
  /** Minimum number of calendar days after enrollment before the touchpoint is due. */
  daysMin: number;
  /** Inclusive maximum; null means the touchpoint remains due after daysMin. */
  daysMax: number | null;
  color: string | null;
  sortOrder: number;
}

export interface AcademyCampaign {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  status: AcademyCampaignStatus;
  /** When enabled, this campaign is listed under Academy in the sidebar. */
  showInSidebar: boolean;
  /**
   * Staff who may run this campaign. An empty list is management-only (aside
   * from its creator), never a broadcast to every telesales account.
   */
  assignedStaffIds: number[];
  audienceFilter: AcademyCampaignAudienceFilter | null;
  audienceSummary: string | null;
  createdBy: AcademyCampaignStaffRef | null;
  createdAt: string;
  updatedAt: string;
  touchpoints?: AcademyCampaignTouchpoint[];
  _count?: {
    leads: number;
    touchpoints: number;
  };
}

export interface AcademyCampaignTouchpointLog {
  id: number;
  campaignLeadId: number;
  touchpointId: number;
  isChecked: boolean;
  status: AcademyCampaignTouchpointOutcome | null;
  completedAt: string | null;
  completedBy: AcademyCampaignStaffRef | null;
  note: string | null;
  callbackDueAt: string | null;
  followUpTaskId: number | null;
}

export interface AcademyCampaignLead {
  id: number;
  campaignId: number;
  leadId: number;
  addedAt: string;
  addedBy: AcademyCampaignStaffRef | null;
  removedAt: string | null;
  removedReason: string | null;
  removedBy: AcademyCampaignStaffRef | null;
  lead: {
    id: number;
    name: string;
    phone: string | null;
    avatarUrl: string | null;
    status: AcademyLeadStatus;
    course: string | null;
    source: string;
    scheduledAt: string | null;
    revenueVnd: number;
    isHot: boolean;
    owner: AcademyCampaignStaffRef | null;
  };
  touchpointLogs: AcademyCampaignTouchpointLog[];
}

export interface AcademyCampaignStats {
  totalLeads: number;
  touchedLeadCount: number;
  touchpointLogCount: number;
  scheduledCount: number;
  testedCount: number;
  wonCount: number;
  wonRate: number;
  revenueVnd: number;
}

export interface CreateAcademyCampaignTouchpointRequest {
  key: string;
  label: string;
  icon?: string | null;
  daysMin: number;
  daysMax?: number | null;
  color?: string | null;
  sortOrder?: number;
}

export interface CreateAcademyCampaignRequest {
  name: string;
  slug?: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: AcademyCampaignStatus;
  /** Admins always see a pinned campaign; other staff must be on its assigned team. */
  showInSidebar?: boolean;
  assignedStaffIds?: number[] | null;
  /** Fixed membership captured at creation. */
  leadIds?: number[];
  audienceFilter?: AcademyCampaignAudienceFilter | null;
  audienceSummary?: string | null;
  touchpoints?: CreateAcademyCampaignTouchpointRequest[];
}

export interface UpdateAcademyCampaignRequest {
  name?: string;
  slug?: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: AcademyCampaignStatus;
  /** Admins always see a pinned campaign; other staff must be on its assigned team. */
  showInSidebar?: boolean;
  assignedStaffIds?: number[] | null;
  audienceFilter?: AcademyCampaignAudienceFilter | null;
  audienceSummary?: string | null;
  touchpoints?: CreateAcademyCampaignTouchpointRequest[];
}

export interface AddAcademyCampaignLeadsRequest {
  leadIds: number[];
}

export interface RemoveAcademyCampaignLeadRequest {
  reason?: string | null;
}

export interface ToggleAcademyCampaignTouchpointLogRequest {
  /** null clears an operational result for this campaign touchpoint. */
  status: AcademyCampaignTouchpointOutcome | null;
  note?: string | null;
  /** Required when `status` is CALLBACK; stored and mirrored to one Academy follow-up task. */
  callbackDueAt?: string | null;
}

export interface ListAcademyCampaignsParams extends PageQuery {
  status?: AcademyCampaignStatus | 'ALL';
  search?: string;
}

export interface ListAcademyCampaignLeadsParams extends PageQuery {
  search?: string;
  status?: AcademyLeadStatus | 'ALL';
  ownerStaffId?: number | 'ALL' | 'UNASSIGNED';
}

export type ListAcademyCampaignsResponse = PageResponse<AcademyCampaign>;
export type ListAcademyCampaignLeadsResponse = PageResponse<AcademyCampaignLead>;
export type AcademyCampaignActionResponse = ActionResponse<AcademyCampaign>;
export type AcademyCampaignLeadActionResponse = ActionResponse<AcademyCampaignLead>;
export type AcademyCampaignTouchpointLogActionResponse = ActionResponse<AcademyCampaignTouchpointLog>;
