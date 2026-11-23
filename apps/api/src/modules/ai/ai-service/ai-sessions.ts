import type { AiChatAction, AiChatMessage, AiChatSession, AiSessionAccessInfo } from '@mos-lab/shared';
import type { PrismaClient as CrmPrismaClient } from '../../../generated/crm-client/index.js';
import {
  buildAccessLogEntry,
  decideAiSessionAccess,
  normalizeAuditReason,
  parseSessionMetadata,
  readSessionPrivacyMeta,
  withAccessLogEntry,
  withMissionLink,
  withSharing,
  type AiSessionViewer,
} from '../ai-session-access.js';
import { extractThinkingAndAction } from './ai-prompt-and-parser.js';

interface SessionDetailRow {
  id: string;
  staffId: number;
  title: string;
  scope: string;
  metadataJson: string | null;
  createdAt: Date;
  updatedAt: Date;
  messages: Array<{
    id: string;
    sessionId: string;
    role: string;
    content: string | null;
    thinking: string | null;
    suggestedActionJson: string | null;
    createdAt: Date;
  }>;
}

function mapAiSessionDetail(
  session: SessionDetailRow,
  includeMetadata: boolean
): { session: AiChatSession; messages: AiChatMessage[] } {
  return {
    session: {
      id: session.id,
      staffId: session.staffId,
      title: session.title,
      scope: session.scope,
      metadata: includeMetadata && session.metadataJson ? JSON.parse(session.metadataJson) : null,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    },
    messages: session.messages.map((m) => {
      let suggestedAction = m.suggestedActionJson ? JSON.parse(m.suggestedActionJson) : null;
      let content = m.content || '';
      let suggestedActions: AiChatAction[] | null =
        suggestedAction?.actions || (suggestedAction ? [suggestedAction] : null);

      // Sanitize legacy content if it still contained unparsed <action> tags from past responses
      if (content && /<action/i.test(content)) {
        const parsed = extractThinkingAndAction(content);
        content = parsed.content;
        if (parsed.suggestedActions && parsed.suggestedActions.length > 0) {
          const combined = [...(suggestedActions || []), ...parsed.suggestedActions];
          const uniqueActions = combined.filter(
            (act, index, self) =>
              index ===
              self.findIndex((a) => a.label === act.label && JSON.stringify(a.payload) === JSON.stringify(act.payload))
          );
          suggestedActions = uniqueActions;
          suggestedAction = {
            ...(suggestedAction || uniqueActions[0]),
            actions: uniqueActions,
          };
        }
      }

      return {
        id: m.id,
        sessionId: m.sessionId,
        role: m.role as AiChatMessage['role'],
        content,
        thinking: m.thinking,
        suggestedAction,
        suggestedActions,
        createdAt: m.createdAt.toISOString(),
      };
    }),
  };
}

/**
 * List sessions for a staff member (strictly isolated by staffId)
 */
export async function listAiSessions(
  crm: CrmPrismaClient,
  staffId: number,
  scope: string = 'customers'
): Promise<AiChatSession[]> {
  const sessions = await crm.crmAiChatSession.findMany({
    where: {
      staffId,
      scope,
    },
    orderBy: {
      updatedAt: 'desc',
    },
    include: {
      messages: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
      _count: {
        select: { messages: true },
      },
    },
    take: 50,
  });

  return sessions.map((s) => ({
    id: s.id,
    staffId: s.staffId,
    title: s.title,
    scope: s.scope,
    metadata: s.metadataJson ? JSON.parse(s.metadataJson) : null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    lastMessage: s.messages[0]?.content?.slice(0, 100) || undefined,
    messageCount: s._count.messages,
  }));
}

/**
 * Get single session with its messages, strictly owner-scoped (Private Workspace isolation).
 * Permalink viewers other than the owner go through `getAiSessionForViewer`.
 */
export async function getAiSession(
  crm: CrmPrismaClient,
  sessionId: string,
  staffId: number
): Promise<{
  session: AiChatSession;
  messages: AiChatMessage[];
} | null> {
  const session = await crm.crmAiChatSession.findFirst({
    where: { id: sessionId, staffId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) return null;
  return mapAiSessionDetail(session, true);
}

/**
 * Permalink access (Kinh Thánh mOS UI-012): owner, shared link, Super Admin for mission-linked sessions,
 * or Admin/Super Admin with a written security-audit reason. Non-owner views are read-only; mission/audit
 * views are recorded in the session's access log so the owner can see them. Metadata of someone else's
 * session is never returned.
 */
export async function getAiSessionForViewer(
  crm: CrmPrismaClient,
  sessionId: string,
  viewer: AiSessionViewer,
  options: { auditRequested?: boolean; auditReason?: unknown } = {}
): Promise<
  | { status: 'not_found' }
  | { status: 'forbidden'; auditAvailable: boolean; invalidAuditReason?: boolean }
  | { status: 'ok'; result: { session: AiChatSession; messages: AiChatMessage[]; access: AiSessionAccessInfo } }
> {
  const session = await crm.crmAiChatSession.findFirst({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) return { status: 'not_found' };

  const metadata = parseSessionMetadata(session.metadataJson);
  const decision = decideAiSessionAccess({
    ownerStaffId: session.staffId,
    viewer,
    metadata,
    auditRequested: options.auditRequested,
    auditReason: options.auditReason,
  });
  if (!decision.allowed) {
    return {
      status: 'forbidden',
      auditAvailable: decision.auditAvailable,
      ...(decision.invalidAuditReason ? { invalidAuditReason: true } : {}),
    };
  }

  const privacy = readSessionPrivacyMeta(metadata);
  if (decision.logAccess) {
    const reason = decision.mode === 'audit' ? normalizeAuditReason(options.auditReason) : null;
    const entry = buildAccessLogEntry(viewer, decision.mode, reason, privacy.missionReportIds);
    // Recording the view is part of the access: if it cannot be stored, the view is refused.
    await crm.crmAiChatSession.update({
      where: { id: session.id },
      data: { metadataJson: JSON.stringify(withAccessLogEntry(metadata, entry)) },
    });
    privacy.accessLog = [...privacy.accessLog, entry];
  }

  const isOwner = decision.mode === 'owner';
  const detail = mapAiSessionDetail(session, isOwner);
  const access: AiSessionAccessInfo = {
    mode: decision.mode,
    readOnly: !isOwner,
    missionLinked: privacy.missionReportIds.length > 0,
    ...(isOwner ? { sharingEnabled: privacy.sharingEnabled, accessLog: privacy.accessLog } : {}),
  };
  return { status: 'ok', result: { ...detail, access } };
}

/** Owner-only: switch link sharing on/off for one session. Returns null when the staff member does not own it. */
export async function setAiSessionSharing(
  crm: CrmPrismaClient,
  sessionId: string,
  staffId: number,
  enabled: boolean
): Promise<{ sharingEnabled: boolean } | null> {
  const session = await crm.crmAiChatSession.findFirst({ where: { id: sessionId, staffId } });
  if (!session) return null;
  const metadata = withSharing(parseSessionMetadata(session.metadataJson), enabled, staffId);
  await crm.crmAiChatSession.update({
    where: { id: session.id },
    data: { metadataJson: JSON.stringify(metadata) },
  });
  return { sharingEnabled: enabled };
}

/** Remember that a session produced a mOS Mission, so the Super Admin can reopen it from the ticket. */
export async function linkAiSessionToMission(
  crm: CrmPrismaClient,
  sessionId: string,
  reportId: number
): Promise<boolean> {
  const session = await crm.crmAiChatSession.findFirst({ where: { id: sessionId } });
  if (!session) return false;
  const metadata = withMissionLink(parseSessionMetadata(session.metadataJson), reportId);
  await crm.crmAiChatSession.update({
    where: { id: session.id },
    data: { metadataJson: JSON.stringify(metadata) },
  });
  return true;
}

/**
 * Create a new session for a staff member
 */
export async function createAiSession(
  crm: CrmPrismaClient,
  staffId: number,
  data: { title?: string; scope?: string; metadata?: Record<string, unknown> }
): Promise<AiChatSession> {
  const title = data.title?.trim() || 'Hội thoại mới';
  const scope = data.scope || 'customers';
  const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null;

  const created = await crm.crmAiChatSession.create({
    data: {
      staffId,
      title,
      scope,
      metadataJson,
    },
  });

  return {
    id: created.id,
    staffId: created.staffId,
    title: created.title,
    scope: created.scope,
    metadata: data.metadata || null,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    messages: [],
  };
}

/**
 * Delete session (strictly verifies staffId)
 */
export async function deleteAiSession(crm: CrmPrismaClient, sessionId: string, staffId: number): Promise<boolean> {
  const deleteResult = await crm.crmAiChatSession.deleteMany({
    where: {
      id: sessionId,
      staffId,
    },
  });
  return deleteResult.count > 0;
}
