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
  totalClusters?: number;
  resolvedClusters?: number;
  dispatchedClusters?: number;
  openClusters?: number;
  clusterResolutionRate?: number; // 0 - 100 percentage
  totalOccurrences?: number;
  extinguishedOccurrences?: number;
  trafficExtinguishmentRate?: number; // 0 - 100 percentage
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

export interface FrontendIssueAgAnalysis {
  issueId: number;
  title: string;
  severity: 'P0' | 'P1' | 'P2';
  category: string;
  rootCause: string;
  affectedComponents: string[];
  affectedFiles: string[];
  proposedFix: string[];
  riskAssessment: string;
  estimatedEffort: string;
  confidenceScore: number;
}

export interface FrontendIssueAgDispatchResponse {
  bugReportId: number;
  key: string;
  status: string;
  progressStage: string;
  handoffReference?: string | null;
  message: string;
}

export const FRONTEND_ISSUE_CLUSTER_KEYS = [
  'POLLING_SLOW_API',
  'RAGE_CLICK_CALL_LOG',
  'WEBRTC_SDK_CRASH',
  'OTHER_SLOW_INTERACTION',
  'OTHER_UI_RAGE_CLICK',
] as const;

export type FrontendIssueClusterKey = (typeof FRONTEND_ISSUE_CLUSTER_KEYS)[number];

export interface FrontendIssueClusterSampleIssue {
  id: number;
  message: string;
  path: string;
  target?: string | null;
  occurrenceCount: number;
}

export interface FrontendIssueCluster {
  clusterKey: FrontendIssueClusterKey;
  title: string;
  severity: 'P0' | 'P1' | 'P2';
  description: string;
  rootCause: string;
  affectedFiles: string[];
  proposedFixSteps: string[];
  issueCount: number;
  totalOccurrences: number;
  issueIds: number[];
  sampleIssues: FrontendIssueClusterSampleIssue[];
  dispatchedBugReport?: {
    id: number;
    key: string;
    status: string;
  } | null;
  isResolved?: boolean;
  resolvedIssueCount?: number;
  resolvedOccurrences?: number;
}

export interface FrontendIssueClusterListResponse {
  clusters: FrontendIssueCluster[];
  summary: {
    totalClusters: number;
    totalIssuesClustered: number;
    totalOccurrences: number;
    dispatchedClusters: number;
    resolvedClusters?: number;
    extinguishedOccurrences?: number;
    extinguishmentRate?: number;
  };
}

export interface FrontendIssueClusterDispatchResponse {
  clusterKey: FrontendIssueClusterKey;
  bugReportId: number;
  key: string;
  status: string;
  progressStage: string;
  dispatchedIssueCount: number;
  message: string;
}

export interface FrontendIssueSyncResponse {
  syncedIssuesCount: number;
  resolvedClustersCount: number;
  message: string;
  metrics: FrontendIssueMetrics;
}
