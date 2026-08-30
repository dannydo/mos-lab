import type { ActionResponse, PageQuery, PageResponse } from './api.js';

export const BUG_REPORT_STATUSES = [
  'NEW',
  'APPROVED',
  'IN_PROGRESS',
  'FIXED',
  'CLOSED',
  'REJECTED',
  'DUPLICATE',
] as const;

export type BugReportStatus = (typeof BUG_REPORT_STATUSES)[number];

export const BUG_REPORT_PRIORITIES = ['P0', 'P1', 'P2', 'P3'] as const;
export type BugPriority = (typeof BUG_REPORT_PRIORITIES)[number];

export interface BugReportApiFailure {
  occurredAt: string;
  method: string;
  url: string;
  status: number | null;
  code: string | null;
  message: string;
}

export interface BugReportClientError {
  occurredAt: string;
  name: string;
  message: string;
  stack: string | null;
}

export interface BugReportContext {
  capturedAt: string;
  path: string;
  query: Record<string, string>;
  pageTitle: string;
  overlays: string[];
  themeMode: 'light' | 'dark' | 'unknown';
  viewport: { width: number; height: number; devicePixelRatio: number };
  userAgent: string;
  online: boolean;
  timeZone: string;
  webCommit: string | null;
  apiCommit: string | null;
  apiDeployedAt: string | null;
  recentApiFailures: BugReportApiFailure[];
  recentClientErrors: BugReportClientError[];
  errorBoundary?: BugReportClientError | null;
}

export interface CreateBugReportAttachmentRequest {
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  sizeBytes: number;
  dataBase64: string;
}

export interface CreateBugReportRequest {
  description: string;
  context: BugReportContext;
  attachments?: CreateBugReportAttachmentRequest[];
}

export interface BugReportReporter {
  id: number;
  displayName: string;
  role: string;
}

export interface BugReportAttachment {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  deletedAt: string | null;
}

export interface BugReportAuditEntry {
  id: number;
  action: string;
  actor: BugReportReporter | null;
  note: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

export interface BugReportSummary {
  id: number;
  key: string;
  title: string;
  description: string;
  status: BugReportStatus;
  priority: BugPriority | null;
  sourcePath: string;
  overlay: string | null;
  attachmentCount: number;
  reporter: BugReportReporter;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BugReportDetail extends BugReportSummary {
  businessContext: string | null;
  triageNote: string | null;
  duplicateOfId: number | null;
  duplicateOfKey: string | null;
  approvedBy: BugReportReporter | null;
  resolvedAt: string | null;
  closedAt: string | null;
  context: BugReportContext;
  attachments: BugReportAttachment[];
  audits: BugReportAuditEntry[];
}

export interface BugReportListQuery extends PageQuery {
  status?: BugReportStatus | 'ALL';
  priority?: BugPriority | 'ALL';
  search?: string;
}

export interface BugReportListSummary {
  newCount: number;
  approvedCount: number;
  inProgressCount: number;
  fixedCount: number;
}

export interface TriageBugReportRequest {
  status: BugReportStatus;
  priority?: BugPriority | null;
  businessContext?: string | null;
  note?: string | null;
  duplicateOfId?: number | null;
}

export interface ConfirmCloseBugReportRequest {
  businessContext?: string | null;
  note?: string | null;
}

export interface BugReportCreateResult {
  id: number;
  key: string;
  attachmentWarnings: string[];
}

export type CreateBugReportResponse = ActionResponse<BugReportCreateResult>;
export type TriageBugReportResponse = ActionResponse<BugReportDetail>;
export type ConfirmCloseBugReportResponse = ActionResponse<BugReportDetail>;
export type BugReportListResponse = PageResponse<BugReportSummary, BugReportListSummary>;

export interface AgentBugQueueItem {
  id: number;
  key: string;
  title: string;
  status: Extract<BugReportStatus, 'APPROVED' | 'IN_PROGRESS' | 'FIXED'>;
  priority: BugPriority;
  sourcePath: string;
  updatedAt: string;
}

export interface AgentBugAttachment {
  id: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface AgentBugBundle {
  report: BugReportDetail;
  markdown: string;
  attachments: AgentBugAttachment[];
}

export function formatBugReportKey(id: number): string {
  return `MOS-BUG-${Math.max(0, Math.trunc(id))}`;
}
