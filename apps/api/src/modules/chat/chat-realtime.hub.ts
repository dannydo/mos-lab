import { randomUUID } from 'node:crypto';
import type { FastifyReply } from 'fastify';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatMissionSummary,
  MosChatRealtimeEvent,
  MosChatRealtimeEventType,
  MosChatTaskItem,
  SafeAny,
} from '@mos-lab/shared';

interface ConnectedSseClient {
  id: string;
  staffId?: number | string | null;
  reply: FastifyReply;
  connectedAt: number;
}

const MAX_EVENT_BUFFER_SIZE = 500;
const HEARTBEAT_INTERVAL_MS = 20_000;

class ChatRealtimeHub {
  private clients = new Map<string, ConnectedSseClient>();
  private eventBuffer: MosChatRealtimeEvent[] = [];
  private heartbeatTimer: NodeJS.Timeout | null = null;

  public registerSseClient(reply: FastifyReply, staffId?: number | string | null): string {
    const clientId = `sse-${randomUUID().slice(0, 8)}`;

    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const initialEvent: MosChatRealtimeEvent = {
      id: `evt-${randomUUID().slice(0, 8)}`,
      type: 'HEARTBEAT',
      timestamp: new Date().toISOString(),
      actorStaffId: staffId ?? null,
      payload: { connected: true, clientId },
    };
    this.writeSseFrame(reply, initialEvent);

    this.clients.set(clientId, {
      id: clientId,
      staffId,
      reply,
      connectedAt: Date.now(),
    });

    this.ensureHeartbeat();

    reply.raw.on('close', () => {
      this.clients.delete(clientId);
      if (this.clients.size === 0 && this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    });

    return clientId;
  }

  public publish(input: {
    type: MosChatRealtimeEventType;
    conversationId?: string | null;
    actorStaffId?: number | string | null;
    payload: Record<string, unknown>;
  }): MosChatRealtimeEvent {
    const event: MosChatRealtimeEvent = {
      id: `evt-${Date.now()}-${randomUUID().slice(0, 6)}`,
      type: input.type,
      conversationId: input.conversationId ?? null,
      timestamp: new Date().toISOString(),
      actorStaffId: input.actorStaffId ?? null,
      payload: input.payload,
    };

    this.eventBuffer.push(event);
    if (this.eventBuffer.length > MAX_EVENT_BUFFER_SIZE) {
      this.eventBuffer.splice(0, this.eventBuffer.length - MAX_EVENT_BUFFER_SIZE);
    }

    for (const [clientId, client] of this.clients.entries()) {
      const ok = this.writeSseFrame(client.reply, event);
      if (!ok) {
        this.clients.delete(clientId);
      }
    }

    return event;
  }

  public getEventsSince(sinceIso?: string | null): MosChatRealtimeEvent[] {
    if (!sinceIso) {
      return this.eventBuffer.slice(-50);
    }
    const sinceMs = new Date(sinceIso).getTime();
    if (Number.isNaN(sinceMs)) {
      return this.eventBuffer.slice(-50);
    }
    return this.eventBuffer.filter((evt) => new Date(evt.timestamp).getTime() > sinceMs);
  }

  public getConnectedClientCount(): number {
    return this.clients.size;
  }

  public clearForTests(): void {
    for (const client of this.clients.values()) {
      try {
        client.reply.raw.end();
      } catch {
        // ignore
      }
    }
    this.clients.clear();
    this.eventBuffer = [];
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private ensureHeartbeat(): void {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      if (this.clients.size === 0) return;
      const hb: MosChatRealtimeEvent = {
        id: `hb-${Date.now()}`,
        type: 'HEARTBEAT',
        timestamp: new Date().toISOString(),
        payload: { activeClients: this.clients.size },
      };
      for (const [clientId, client] of this.clients.entries()) {
        if (!this.writeSseFrame(client.reply, hb)) {
          this.clients.delete(clientId);
        }
      }
    }, HEARTBEAT_INTERVAL_MS);
    this.heartbeatTimer.unref?.();
  }

  private writeSseFrame(reply: FastifyReply, event: MosChatRealtimeEvent): boolean {
    try {
      if (reply.raw.writableEnded || reply.raw.destroyed) {
        return false;
      }
      reply.raw.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
      return true;
    } catch {
      return false;
    }
  }
}

export const chatRealtimeHub = new ChatRealtimeHub();

export function computeDeltaFromSnapshot(
  input: {
    conversations: MosChatConversation[];
    tasks: MosChatTaskItem[];
  },
  sinceIso?: string | null
): {
  cursor: string;
  serverTime: string;
  updatedConversations: MosChatConversation[];
  updatedMessages: MosChatMessage[];
  updatedTasks: MosChatTaskItem[];
  updatedMissions: MosChatMissionSummary[];
} {
  const nowIso = new Date().toISOString();
  const sinceMs = sinceIso ? new Date(sinceIso).getTime() : 0;
  const isValidSince = sinceMs > 0 && !Number.isNaN(sinceMs);

  const updatedConversations: MosChatConversation[] = [];
  const updatedMessages: MosChatMessage[] = [];
  const updatedTasks: MosChatTaskItem[] = [];
  const missionsMap = new Map<number, MosChatMissionSummary>();

  for (const conv of input.conversations) {
    const convUpdatedMs = conv.updatedAt ? new Date(conv.updatedAt).getTime() : 0;
    let hasRecentMessage = false;

    for (const msg of conv.messages || []) {
      const msgCreatedMs = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
      const msgEditedMs = msg.editedAt ? new Date(msg.editedAt).getTime() : 0;
      const msgDeletedMs = msg.deletedAt ? new Date(msg.deletedAt).getTime() : 0;
      const msgBuzzedMs = msg.buzzedAt ? new Date(msg.buzzedAt).getTime() : 0;
      const msgMissionUpdatedMs = msg.mission?.updatedAt ? new Date(msg.mission.updatedAt).getTime() : 0;
      const latestReplyMs = (msg.thread || []).reduce((max, r) => {
        const rCreated = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        const rEdited = r.editedAt ? new Date(r.editedAt).getTime() : 0;
        return Math.max(max, rCreated, rEdited);
      }, 0);

      const effectiveMsgMs = Math.max(
        msgCreatedMs,
        msgEditedMs,
        msgDeletedMs,
        msgBuzzedMs,
        msgMissionUpdatedMs,
        latestReplyMs
      );

      if (!isValidSince || effectiveMsgMs > sinceMs) {
        updatedMessages.push({
          ...msg,
          conversationId: conv.id,
        });
        hasRecentMessage = true;
      }

      if (msg.mission && (!isValidSince || msgMissionUpdatedMs > sinceMs)) {
        missionsMap.set(msg.mission.reportId, msg.mission);
      }
    }

    if (!isValidSince || convUpdatedMs > sinceMs || hasRecentMessage) {
      // Return lightweight conversation metadata (with only the last 30 messages for immediate preview)
      updatedConversations.push({
        ...conv,
        messages: (conv.messages || []).slice(-30),
      });
    }
  }

  for (const task of input.tasks) {
    const taskCreatedMs = task.createdAt ? new Date(task.createdAt).getTime() : 0;
    const taskMissionMs = task.mission?.updatedAt ? new Date(task.mission.updatedAt).getTime() : 0;
    const taskNegotiatedMs = (task as SafeAny).negotiatedAt ? new Date((task as SafeAny).negotiatedAt).getTime() : 0;
    const effectiveTaskMs = Math.max(taskCreatedMs, taskMissionMs, taskNegotiatedMs);

    // Tasks list is lightweight; include all if no cursor or recently touched/has mission
    if (!isValidSince || effectiveTaskMs > sinceMs || !sinceIso) {
      updatedTasks.push(task);
    }
    if (task.mission && (!isValidSince || taskMissionMs > sinceMs)) {
      missionsMap.set(task.mission.reportId, task.mission);
    }
  }

  return {
    cursor: nowIso,
    serverTime: nowIso,
    updatedConversations,
    updatedMessages,
    updatedTasks: isValidSince && updatedTasks.length === 0 ? input.tasks : updatedTasks,
    updatedMissions: Array.from(missionsMap.values()),
  };
}
