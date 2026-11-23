import { extractGoogleWorkspaceLinksFromText, type AiChatContext } from '@mos-lab/shared';
import type { FastifyInstance } from 'fastify';
import type { PrismaClient as CrmPrismaClient } from '../../../generated/crm-client/index.js';
import type { PrismaClient as LegacyPrismaClient } from '../../../generated/legacy-client/index.js';
import { ChatGoogleWorkspaceService } from '../../chat/chat-google-workspace.service.js';
import { LiveCustomerContextService } from '../live-customer-context.service.js';
import { StaffCareerContextService } from '../staff-career-context.service.js';

export interface ResolvedChatSession {
  session: {
    id: string;
    staffId: number;
    title: string;
    scope: string;
    metadataJson: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  sessionMetadata: Record<string, unknown>;
  agConversationId?: string;
}

export interface TargetChatScope {
  targetChatConvId?: string;
  targetChatThreadId?: string;
}

export interface LiveMessageContexts {
  liveCustomerText: string;
  liveStaffCareerText: string;
  liveGoogleWorkspaceText: string;
}

export function resolveTargetChatScope(scope?: string): TargetChatScope {
  if (scope?.startsWith('mos-chat-space:')) {
    return { targetChatConvId: scope.slice('mos-chat-space:'.length) };
  }
  if (scope?.startsWith('mos-chat-conv:')) {
    return { targetChatConvId: scope.slice('mos-chat-conv:'.length) };
  }
  if (scope?.startsWith('mos-chat-thread:')) {
    const parts = scope.slice('mos-chat-thread:'.length).split(':');
    return { targetChatConvId: parts[0], targetChatThreadId: parts[1] };
  }
  return {};
}

export async function resolveOrCreateChatSession(
  crm: CrmPrismaClient,
  staffId: number,
  params: {
    sessionId?: string;
    trimmedMessage: string;
    scope: string;
    context?: AiChatContext;
  }
): Promise<ResolvedChatSession> {
  const { sessionId, trimmedMessage, scope, context } = params;
  let session = sessionId
    ? await crm.crmAiChatSession.findFirst({
        where: { id: sessionId, staffId },
      })
    : null;

  if (!session && scope === 'mos-chat-private') {
    session = await crm.crmAiChatSession.findFirst({
      where: { staffId, scope: 'mos-chat-private' },
      orderBy: { updatedAt: 'desc' },
    });
  }

  if (!session) {
    // Derive session title from first prompt (up to 40 chars)
    const sessionTitle = trimmedMessage.slice(0, 40) + (trimmedMessage.length > 40 ? '...' : '');
    session = await crm.crmAiChatSession.create({
      data: {
        staffId,
        title: sessionTitle,
        scope,
        metadataJson: context ? JSON.stringify(context) : null,
      },
    });
  } else {
    await crm.crmAiChatSession.update({
      where: { id: session.id },
      data: { updatedAt: new Date() },
    });
  }

  const sessionMetadata: Record<string, unknown> = session.metadataJson
    ? (() => {
        try {
          return JSON.parse(session.metadataJson);
        } catch {
          return {};
        }
      })()
    : {};
  const agConversationId =
    typeof sessionMetadata.agConversationId === 'string' ? sessionMetadata.agConversationId : undefined;

  return { session, sessionMetadata, agConversationId };
}

export async function saveUserMessageAndLoadHistory(
  crm: CrmPrismaClient,
  sessionId: string,
  trimmedMessage: string
): Promise<Array<{ role: string; content: string }>> {
  await crm.crmAiChatMessage.create({
    data: {
      sessionId,
      role: 'user',
      content: trimmedMessage,
    },
  });

  const recentMessagesDesc = await crm.crmAiChatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  return recentMessagesDesc.reverse();
}

export async function loadLiveContextsForMessage(params: {
  crm: CrmPrismaClient;
  staffId: number;
  trimmedMessage: string;
  recentMessages: Array<{ content: string }>;
  context?: AiChatContext;
  targetChatConvId?: string;
  legacyPrisma?: LegacyPrismaClient;
  fastify?: FastifyInstance;
}): Promise<LiveMessageContexts> {
  const { crm, staffId, trimmedMessage, recentMessages, context, targetChatConvId, legacyPrisma, fastify } = params;

  // Fetch live customer context from database for 100% data accuracy
  const liveCustomerText = await LiveCustomerContextService.getLiveCustomerSummary(legacyPrisma, crm, staffId);

  // Fetch live staff career path context from database (MOS-BUG-189)
  let liveStaffCareerText = '';
  try {
    const userRole =
      context?.myRole ||
      (await crm.crmStaff.findUnique({ where: { id: staffId }, select: { role: true } }))?.role ||
      'staff';
    liveStaffCareerText = await StaffCareerContextService.getStaffCareerContext(
      fastify || { prisma: { crm, legacy: legacyPrisma }, log: console },
      staffId,
      userRole,
      trimmedMessage
    );
  } catch {
    // non-blocking
  }

  // Auto-load live Google Sheets / Docs context if message or recent room history references a Workspace link
  let liveGoogleWorkspaceText = '';
  try {
    const viewerRole =
      context?.myRole ||
      (await crm.crmStaff.findUnique({ where: { id: staffId }, select: { role: true } }))?.role ||
      'staff';
    const viewerActor = {
      id: staffId,
      role: viewerRole,
      displayName: context?.userName,
    };
    let textToInspect = [trimmedMessage, ...recentMessages.slice(-4).map((m) => m.content)].join('\n');
    let linkSenderActor: { id?: string | number; role?: string; displayName?: string } | null = null;

    if (extractGoogleWorkspaceLinksFromText(textToInspect).length === 0 && targetChatConvId && crm?.crmChatMessage) {
      const recentLinkMsg = await crm.crmChatMessage
        .findFirst({
          where: {
            conversationId: targetChatConvId,
            isDeleted: false,
            OR: [
              { text: { contains: 'docs.google.com/' } },
              { text: { contains: 'canva.com/design/' } },
              { text: { contains: 'canva.link/' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          select: { text: true, senderId: true, senderRole: true, senderName: true },
        })
        .catch(() => null);
      if (recentLinkMsg?.text) {
        textToInspect = recentLinkMsg.text;
        linkSenderActor = {
          id: recentLinkMsg.senderId,
          role: recentLinkMsg.senderRole,
          displayName: recentLinkMsg.senderName,
        };
      }
    }

    if (extractGoogleWorkspaceLinksFromText(textToInspect).length > 0) {
      liveGoogleWorkspaceText = await ChatGoogleWorkspaceService.buildAiContextForText({
        text: textToInspect,
        viewer: viewerActor,
        sender: linkSenderActor,
      });
    }
  } catch {
    // non-blocking
  }

  return { liveCustomerText, liveStaffCareerText, liveGoogleWorkspaceText };
}
