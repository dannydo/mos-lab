import { useEffect } from 'react';
import type { MosChatEntityContext } from '@mos-lab/shared';

export const MOS_CHAT_BRIDGE_EVENT = 'mos-chat:global-bridge-action';

export type MosChatBridgeActionPayload =
  | {
      type: 'OPEN_CONVERSATION';
      conversationId: string;
      messageId?: string;
    }
  | {
      type: 'OPEN_WORKFLOW_MODAL';
      conversationId?: string;
      templateCode: string; // e.g., 'WF_CASH_ADVANCE' | 'WF_INVENTORY_AUDIT'
      prefillTitle?: string;
      prefillFormData?: Record<string, unknown>;
    }
  | {
      type: 'SHARE_ENTITY_CONTEXT';
      conversationId?: string;
      entityContext: MosChatEntityContext;
      initialDraftText?: string;
    };

/**
 * Global helper allowing any module across mos-lab (Warehouse, Cashflow, Customers, QA, etc.)
 * to open mOS Chat, focus a conversation/thread, or trigger an interactive Workflow Card.
 */
export function dispatchMosChatAction(payload: MosChatBridgeActionPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<MosChatBridgeActionPayload>(MOS_CHAT_BRIDGE_EVENT, { detail: payload }));
}

export function useMosChatBridgeListener(onAction: (payload: MosChatBridgeActionPayload) => void): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (ev: Event) => {
      const customEv = ev as CustomEvent<MosChatBridgeActionPayload>;
      if (customEv.detail) {
        onAction(customEv.detail);
      }
    };
    window.addEventListener(MOS_CHAT_BRIDGE_EVENT, handler);
    return () => {
      window.removeEventListener(MOS_CHAT_BRIDGE_EVENT, handler);
    };
  }, [onAction]);
}
