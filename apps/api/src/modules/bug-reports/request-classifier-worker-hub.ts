import type { WebSocket } from 'ws';

// Fixed event names only: never broadcast intake text, files, tokens, or model output.
const peers = new Set<WebSocket>();
const workerByPeer = new Map<WebSocket, string>();

function safeWorkerId(value: unknown): string {
  return Array.from(String(value || ''))
    .filter((character) => {
      const code = character.charCodeAt(0);
      return !(code <= 31 || code === 127);
    })
    .join('')
    .trim()
    .slice(0, 100);
}

export const RequestClassifierWorkerHub = {
  add(workerId: string, socket: WebSocket) {
    peers.add(socket);
    workerByPeer.set(socket, safeWorkerId(workerId));
  },
  remove(socket: WebSocket) {
    peers.delete(socket);
    workerByPeer.delete(socket);
  },
  isConnected(workerId: string) {
    const safeId = safeWorkerId(workerId);
    for (const peer of peers) {
      if (peer.readyState === peer.OPEN && workerByPeer.get(peer) === safeId) return true;
      if (peer.readyState !== peer.OPEN) this.remove(peer);
    }
    return false;
  },
  notify(
    type: 'classification_available' | 'conversation_available' | 'inbox_follow_up_available' | 'inbox_plan_available'
  ) {
    const body = JSON.stringify({ type });
    for (const peer of peers) {
      if (peer.readyState === peer.OPEN) {
        try {
          peer.send(body);
        } catch {
          peers.delete(peer);
        }
      }
    }
  },
};
