import {
  FRONTEND_ISSUE_CLUSTER_KEYS,
  type FrontendIssueMetrics,
  type FrontendIssuePayload,
  type FrontendIssueRecord,
  type FrontendIssueStatus,
  type FrontendIssueSummary,
  type FrontendIssueType,
} from '@mos-lab/shared';

const MAX_STORED_ISSUES = 200;
const inMemoryIssuesList: FrontendIssuePayload[] = [];
const inMemoryIssuesByFingerprint = new Map<string, FrontendIssueSummary>();

export interface TelemetryDbIssueRow {
  id: number;
  fingerprint: string;
  issueType: string;
  path: string;
  target: string | null;
  message: string;
  occurrenceCount: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  lastUserId: number | null;
  lastUserName: string | null;
  status: string;
  resolvedAt: Date | null;
  resolvedByStaffId: number | null;
  resolutionNotes: string | null;
  latestPayloadJson: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedByStaff?: { displayName: string } | null;
}

export function mapDbRowToRecord(row: TelemetryDbIssueRow): FrontendIssueRecord {
  let latestPayload: FrontendIssuePayload | null = null;
  if (row.latestPayloadJson) {
    try {
      latestPayload = JSON.parse(row.latestPayloadJson);
    } catch {
      latestPayload = null;
    }
  }

  return {
    id: row.id,
    fingerprint: row.fingerprint,
    issueType: row.issueType as FrontendIssueType,
    path: row.path,
    target: row.target,
    message: row.message,
    occurrenceCount: row.occurrenceCount,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
    lastUserId: row.lastUserId,
    lastUserName: row.lastUserName,
    status: row.status as FrontendIssueStatus,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    resolvedByStaffId: row.resolvedByStaffId,
    resolvedByName: row.resolvedByStaff?.displayName || null,
    resolutionNotes: row.resolutionNotes,
    latestPayload,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function recordIssueInMemory(payload: FrontendIssuePayload): { message: string } {
  inMemoryIssuesList.unshift(payload);
  if (inMemoryIssuesList.length > MAX_STORED_ISSUES) {
    inMemoryIssuesList.pop();
  }

  const message = payload.error?.message || payload.error?.name || payload.issueType;
  const existingMemory = inMemoryIssuesByFingerprint.get(payload.fingerprint);

  if (existingMemory) {
    existingMemory.occurrenceCount += 1;
    existingMemory.lastSeenAt = payload.occurredAt;
    existingMemory.lastUserId = payload.userId ?? existingMemory.lastUserId;
    existingMemory.lastUserName = payload.userName ?? existingMemory.lastUserName;
    existingMemory.latestIssue = payload;
  } else {
    inMemoryIssuesByFingerprint.set(payload.fingerprint, {
      fingerprint: payload.fingerprint,
      issueType: payload.issueType,
      path: payload.path,
      message,
      occurrenceCount: 1,
      firstSeenAt: payload.occurredAt,
      lastSeenAt: payload.occurredAt,
      lastUserId: payload.userId ?? null,
      lastUserName: payload.userName ?? null,
      latestIssue: payload,
    });
  }

  if (inMemoryIssuesByFingerprint.size > 500) {
    const oldestKey = inMemoryIssuesByFingerprint.keys().next().value;
    if (oldestKey) inMemoryIssuesByFingerprint.delete(oldestKey);
  }

  return { message };
}

export function getMemoryIssueRecords(): FrontendIssueRecord[] {
  return Array.from(inMemoryIssuesByFingerprint.values()).map((item, idx) => ({
    id: idx + 1,
    fingerprint: item.fingerprint,
    issueType: item.issueType,
    path: item.path,
    target: null,
    message: item.message,
    occurrenceCount: item.occurrenceCount,
    firstSeenAt: item.firstSeenAt,
    lastSeenAt: item.lastSeenAt,
    lastUserId: item.lastUserId ?? null,
    lastUserName: item.lastUserName ?? null,
    status: 'NEW' as FrontendIssueStatus,
    resolvedAt: null,
    resolvedByStaffId: null,
    resolvedByName: null,
    resolutionNotes: null,
    latestPayload: item.latestIssue,
    createdAt: item.firstSeenAt,
    updatedAt: item.lastSeenAt,
  }));
}

export function getMemoryClusterIssues(): Array<{
  id: number;
  issueType: string;
  path: string;
  target: string | null;
  message: string;
  occurrenceCount: number;
  status: string;
}> {
  return Array.from(inMemoryIssuesByFingerprint.values()).map((item, idx) => ({
    id: idx + 1,
    issueType: item.issueType,
    path: item.path,
    target: null,
    message: item.message,
    occurrenceCount: item.occurrenceCount,
    status: 'NEW',
  }));
}

export function buildMemoryFallbackMetrics(): FrontendIssueMetrics {
  return {
    totalCount: inMemoryIssuesByFingerprint.size,
    newCount: inMemoryIssuesByFingerprint.size,
    investigatingCount: 0,
    resolvedCount: 0,
    reopenedCount: 0,
    ignoredCount: 0,
    resolutionRate: 0,
    totalClusters: FRONTEND_ISSUE_CLUSTER_KEYS.length,
    resolvedClusters: 0,
    dispatchedClusters: 0,
    openClusters: FRONTEND_ISSUE_CLUSTER_KEYS.length,
    clusterResolutionRate: 0,
    totalOccurrences: 0,
    extinguishedOccurrences: 0,
    trafficExtinguishmentRate: 0,
    userStats: [],
  };
}

export function getMemorySummaries(limit = 50): FrontendIssueSummary[] {
  const items = Array.from(inMemoryIssuesByFingerprint.values());
  items.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
  return items.slice(0, limit);
}

export function getMemoryRawIssues(limit = 50): FrontendIssuePayload[] {
  return inMemoryIssuesList.slice(0, limit);
}

export function clearMemoryIssues(): void {
  inMemoryIssuesList.length = 0;
  inMemoryIssuesByFingerprint.clear();
}
