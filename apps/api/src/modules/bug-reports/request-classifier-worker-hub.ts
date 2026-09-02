import type { WebSocket } from 'ws';

// Fixed event names only: never broadcast intake text, files, tokens, or model output.
const peers = new Set<WebSocket>();
export const RequestClassifierWorkerHub = {
  add(socket: WebSocket) {
    peers.add(socket);
  },
  remove(socket: WebSocket) {
    peers.delete(socket);
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
