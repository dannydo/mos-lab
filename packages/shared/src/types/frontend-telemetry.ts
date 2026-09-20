export const FRONTEND_ISSUE_TYPES = [
  'RAGE_CLICK',
  'API_FAILURE',
  'REACT_CRASH',
  'UNCAUGHT_EXCEPTION',
  'SLOW_INTERACTION',
  'BLOCKED_SUBMIT',
] as const;

export type FrontendIssueType = (typeof FRONTEND_ISSUE_TYPES)[number];

export interface UserBreadcrumb {
  timestamp: string;
  category: 'ui' | 'navigation' | 'network' | 'console';
  action: 'click' | 'route_change' | 'api_request' | 'api_response' | 'error';
  target?: string;
  path: string;
  metadata?: Record<string, unknown>;
}

export interface FrontendIssueError {
  name: string;
  message: string;
  stack?: string | null;
}

export interface FrontendIssueClientContext {
  viewport: { width: number; height: number; devicePixelRatio: number };
  userAgent: string;
  online: boolean;
  themeMode?: string;
  timeZone: string;
}

export interface FrontendIssuePayload {
  issueId: string;
  fingerprint: string;
  issueType: FrontendIssueType;
  occurredAt: string;
  userId?: number | null;
  userName?: string | null;
  userRole?: string | null;
  path: string;
  pageTitle?: string;
  breadcrumbs: UserBreadcrumb[];
  error?: FrontendIssueError | null;
  clientContext: FrontendIssueClientContext;
  metadata?: Record<string, unknown>;
}

export interface FrontendIssueSummary {
  fingerprint: string;
  issueType: FrontendIssueType;
  path: string;
  message: string;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastUserId?: number | null;
  lastUserName?: string | null;
  latestIssue: FrontendIssuePayload;
}

export const FRONTEND_ISSUE_STATUSES = ['NEW', 'INVESTIGATING', 'RESOLVED', 'IGNORED', 'REOPENED'] as const;

export type FrontendIssueStatus = (typeof FRONTEND_ISSUE_STATUSES)[number];

export interface FrontendIssueRecord {
  id: number;
  fingerprint: string;
  issueType: FrontendIssueType;
  path: string;
  target?: string | null;
  message: string;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  lastUserId?: number | null;
  lastUserName?: string | null;
  status: FrontendIssueStatus;
  resolvedAt?: string | null;
  resolvedByStaffId?: number | null;
  resolvedByName?: string | null;
  resolutionNotes?: string | null;
  latestPayload?: FrontendIssuePayload | null;
  createdAt: string;
  updatedAt: string;
}

export interface FrontendIssueMetrics {
  totalCount: number;
  newCount: number;
  investigatingCount: number;
  resolvedCount: number;
  reopenedCount: number;
  ignoredCount: number;
  resolutionRate: number; // 0 - 100 percentage
}

export interface UpdateFrontendIssueStatusRequest {
  status: FrontendIssueStatus;
  resolutionNotes?: string;
}

export interface FrontendIssueListQuery {
  status?: FrontendIssueStatus | 'ALL';
  issueType?: FrontendIssueType | 'ALL';
  search?: string;
  page?: number;
  limit?: number;
}

export interface FrontendIssueListResponse {
  data: FrontendIssueRecord[];
  metrics: FrontendIssueMetrics;
  total: number;
  page: number;
  limit: number;
}

export interface ConvertFrontendIssueToBugReportResponse {
  bugReportId: number;
  key: string;
}
