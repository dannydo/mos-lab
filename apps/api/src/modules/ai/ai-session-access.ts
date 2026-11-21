import { isAdminOrSuperAdminRole, isSuperAdminRole } from '@mos-lab/shared';
import type { AiSessionAccessLogEntry, AiSessionAccessMode } from '@mos-lab/shared';

/**
 * Privacy rules for AI Copilot (MAI) session permalinks (Kinh Thánh mOS UI-012):
 *  - owner: always
 *  - shared: the owner switched sharing on -> any signed-in staff may view (read-only)
 *  - mission: Super Admin, only when the session is linked to a mOS Mission (read-only, logged)
 *  - audit: Admin / Super Admin with a written security-audit reason (read-only, logged)
 * Everything else is forbidden.
 */

export const AI_SESSION_AUDIT_PURPOSE = 'security_audit';
export const AI_SESSION_AUDIT_REASON_MIN = 10;
export const AI_SESSION_AUDIT_REASON_MAX = 500;
export const AI_SESSION_ACCESS_LOG_LIMIT = 100;

export interface AiSessionViewer {
  id: number;
  role?: string | null;
  displayName?: string | null;
  username?: string | null;
}

export interface AiSessionPrivacyMeta {
  sharingEnabled: boolean;
  missionReportIds: number[];
  accessLog: AiSessionAccessLogEntry[];
}

export type AiSessionAccessDecision =
  | { allowed: true; mode: AiSessionAccessMode; logAccess: boolean }
  | { allowed: false; auditAvailable: boolean; invalidAuditReason?: boolean };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function parseSessionMetadata(metadataJson: string | null | undefined): Record<string, unknown> {
  if (!metadataJson) return {};
  try {
    return asRecord(JSON.parse(metadataJson));
  } catch {
    return {};
  }
}

export function readSessionPrivacyMeta(metadata: Record<string, unknown> | null | undefined): AiSessionPrivacyMeta {
  const meta = asRecord(metadata);
  const sharing = asRecord(meta.sharing);
  const missionReportIds = Array.isArray(meta.missionReportIds)
    ? meta.missionReportIds.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const accessLog = Array.isArray(meta.accessLog)
    ? (meta.accessLog.filter((e) => e && typeof e === 'object') as AiSessionAccessLogEntry[])
    : [];
  return { sharingEnabled: sharing.enabled === true, missionReportIds, accessLog };
}

export function normalizeAuditReason(reason: unknown): string | null {
  if (typeof reason !== 'string') return null;
  const trimmed = reason.trim();
  if (trimmed.length < AI_SESSION_AUDIT_REASON_MIN) return null;
  return trimmed.slice(0, AI_SESSION_AUDIT_REASON_MAX);
}

export function decideAiSessionAccess(params: {
  ownerStaffId: number;
  viewer: AiSessionViewer;
  metadata: Record<string, unknown> | null | undefined;
  auditRequested?: boolean;
  auditReason?: unknown;
}): AiSessionAccessDecision {
  const { ownerStaffId, viewer, metadata } = params;
  if (Number(viewer.id) === Number(ownerStaffId)) {
    return { allowed: true, mode: 'owner', logAccess: false };
  }

  const privacy = readSessionPrivacyMeta(metadata);
  if (privacy.sharingEnabled) {
    return { allowed: true, mode: 'shared', logAccess: false };
  }

  if (isSuperAdminRole(viewer.role) && privacy.missionReportIds.length > 0) {
    return { allowed: true, mode: 'mission', logAccess: true };
  }

  const canAudit = isAdminOrSuperAdminRole(viewer.role);
  if (canAudit && params.auditRequested) {
    if (normalizeAuditReason(params.auditReason)) {
      return { allowed: true, mode: 'audit', logAccess: true };
    }
    return { allowed: false, auditAvailable: true, invalidAuditReason: true };
  }

  return { allowed: false, auditAvailable: canAudit };
}

export function withSharing(
  metadata: Record<string, unknown>,
  enabled: boolean,
  byStaffId: number,
  now = new Date()
): Record<string, unknown> {
  return {
    ...metadata,
    sharing: { enabled, changedAt: now.toISOString(), changedByStaffId: byStaffId },
  };
}

export function withMissionLink(metadata: Record<string, unknown>, reportId: number): Record<string, unknown> {
  const current = readSessionPrivacyMeta(metadata).missionReportIds;
  if (current.includes(reportId)) return metadata;
  return { ...metadata, missionReportIds: [...current, reportId] };
}

export function withAccessLogEntry(
  metadata: Record<string, unknown>,
  entry: AiSessionAccessLogEntry
): Record<string, unknown> {
  const log = readSessionPrivacyMeta(metadata).accessLog;
  return { ...metadata, accessLog: [...log, entry].slice(-AI_SESSION_ACCESS_LOG_LIMIT) };
}

export function buildAccessLogEntry(
  viewer: AiSessionViewer,
  mode: AiSessionAccessMode,
  reason: string | null,
  missionReportIds: number[],
  now = new Date()
): AiSessionAccessLogEntry {
  return {
    at: now.toISOString(),
    viewerStaffId: Number(viewer.id),
    viewerName: String(viewer.displayName || viewer.username || `Staff ${viewer.id}`),
    viewerRole: String(viewer.role || ''),
    mode,
    ...(reason ? { reason } : {}),
    ...(mode === 'mission' && missionReportIds.length > 0 ? { missionReportIds } : {}),
  };
}
