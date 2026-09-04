/** Internal-only reliability and UX incident journal. Reporter-facing Inbox never renders these records. */
export const EXPERIENCE_JOURNAL_CATEGORIES = ['UX', 'INFRA'] as const;
export const EXPERIENCE_JOURNAL_SEVERITIES = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'] as const;
export const EXPERIENCE_JOURNAL_TRIAGE_STATUSES = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'] as const;

export type ExperienceJournalCategory = (typeof EXPERIENCE_JOURNAL_CATEGORIES)[number];
export type ExperienceJournalSeverity = (typeof EXPERIENCE_JOURNAL_SEVERITIES)[number];
export type ExperienceJournalTriageStatus = (typeof EXPERIENCE_JOURNAL_TRIAGE_STATUSES)[number];

export interface RecordExperienceJournalEventRequest {
  category: ExperienceJournalCategory;
  severity: ExperienceJournalSeverity;
  component: string;
  code: string;
  summary: string;
  reportId?: number | null;
  jobId?: string | null;
  releaseCommit?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ExperienceJournalEvent {
  id: number;
  fingerprint: string;
  category: ExperienceJournalCategory;
  severity: ExperienceJournalSeverity;
  component: string;
  code: string;
  summary: string;
  reportId: number | null;
  jobId: string | null;
  releaseCommit: string | null;
  metadata: Record<string, string | number | boolean | null>;
  retentionExpiresAt: string;
  occurredAt: string;
}

export interface ExperienceJournalFingerprint {
  fingerprint: string;
  category: ExperienceJournalCategory;
  severity: ExperienceJournalSeverity;
  component: string;
  code: string;
  summary: string;
  occurrenceCount: number;
  firstOccurredAt: string;
  lastOccurredAt: string;
  triageStatus: ExperienceJournalTriageStatus;
  triageNote: string | null;
  triagedByStaffId: number | null;
  triagedAt: string | null;
}

export interface ExperienceJournalListQuery {
  category?: ExperienceJournalCategory;
  severity?: ExperienceJournalSeverity;
  component?: string;
  triageStatus?: ExperienceJournalTriageStatus;
  page?: number;
  limit?: number;
}

export interface ExperienceJournalListResponse {
  data: ExperienceJournalFingerprint[];
  recentEvents: ExperienceJournalEvent[];
  total: number;
  page: number;
  limit: number;
}

export interface TriageExperienceJournalFingerprintRequest {
  triageStatus: ExperienceJournalTriageStatus;
  note?: string | null;
}
