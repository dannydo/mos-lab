import type { FastifyReply } from 'fastify';
import type { InventorySseEventPayload } from '@mos-lab/shared';

interface InventorySseClient {
  id: number;
  reply: FastifyReply;
}

class InventorySseBroker {
  private clients = new Map<number, InventorySseClient>();
  private nextClientId = 1;

  subscribe(reply: FastifyReply): number {
    const id = this.nextClientId++;
    this.clients.set(id, { id, reply });
    return id;
  }

  unsubscribe(id: number): void {
    this.clients.delete(id);
  }

  publish(type: InventorySseEventPayload['type'], payload: Record<string, unknown>): void {
    if (this.clients.size === 0) return;

    const event: InventorySseEventPayload = {
      type,
      timestamp: new Date().toISOString(),
      payload,
    };
    const frame = `event: ${type}\ndata: ${JSON.stringify(event)}\n\n`;

    for (const [id, client] of this.clients.entries()) {
      try {
        if (!client.reply.raw.writableEnded) {
          client.reply.raw.write(frame);
        } else {
          this.clients.delete(id);
        }
      } catch {
        this.clients.delete(id);
      }
    }
  }
}

export const inventorySseBroker = new InventorySseBroker();
