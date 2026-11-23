import type { AcademyWorkshopRealtimeEvent } from '@mos-lab/shared';

export type RealtimeAudience = 'STAFF' | 'DISPLAY' | 'PARTICIPANT';
export type SocketLike = { readyState: number; send(payload: string): void; close(): void };
export type Connection = { socket: SocketLike; audience: RealtimeAudience; participantId?: number };

export class WorkshopRealtimeHub {
  private readonly workshops = new Map<number, Set<Connection>>();

  add(workshopId: number, connection: Connection) {
    const connections = this.workshops.get(workshopId) || new Set<Connection>();
    connections.add(connection);
    this.workshops.set(workshopId, connections);
    return () => {
      connections.delete(connection);
      if (!connections.size) this.workshops.delete(workshopId);
    };
  }

  connectedParticipants(workshopId: number) {
    return new Set(
      [...(this.workshops.get(workshopId) || [])]
        .filter((connection) => connection.audience === 'PARTICIPANT' && connection.participantId)
        .map((connection) => connection.participantId!)
    ).size;
  }

  broadcast(workshopId: number, event: AcademyWorkshopRealtimeEvent) {
    const payload = JSON.stringify(event);
    for (const connection of this.workshops.get(workshopId) || []) {
      if (connection.socket.readyState !== 1) continue;
      try {
        connection.socket.send(payload);
      } catch {
        connection.socket.close();
      }
    }
  }

  broadcastAudience(workshopId: number, factory: (audience: RealtimeAudience) => AcademyWorkshopRealtimeEvent | null) {
    const connections = this.workshops.get(workshopId) || [];
    const cache = new Map<RealtimeAudience, string>();
    for (const connection of connections) {
      if (connection.socket.readyState !== 1) continue;
      try {
        let payload = cache.get(connection.audience);
        if (!payload) {
          const event = factory(connection.audience);
          if (!event) continue;
          payload = JSON.stringify(event);
          cache.set(connection.audience, payload);
        }
        connection.socket.send(payload);
      } catch {
        connection.socket.close();
      }
    }
  }
}

export const academyWorkshopRealtimeHub = new WorkshopRealtimeHub();
