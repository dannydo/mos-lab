'use client';

import { useEffect, useRef, useState } from 'react';
import type { InventoryRolePreviewKey, InventorySseEventPayload } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

export function useInventorySse(opts: {
  enabled: boolean;
  previewRole?: InventoryRolePreviewKey;
  previewStoreId?: number | null;
  onEvent: (event: InventorySseEventPayload) => void;
}) {
  const { enabled, previewRole, previewStoreId, onEvent } = opts;
  const [connected, setConnected] = useState(false);
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof EventSource === 'undefined') {
      setConnected(false);
      return;
    }

    const url = apiClient.inventory.getSseEventsUrl({ previewRole, previewStoreId });
    const source = new EventSource(url);

    source.addEventListener('connected', () => setConnected(true));
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    const listen = (type: InventorySseEventPayload['type']) => {
      source.addEventListener(type, (evt) => {
        try {
          const parsed = JSON.parse((evt as MessageEvent).data) as InventorySseEventPayload;
          handlerRef.current(parsed);
        } catch {
          // Ignore malformed frame
        }
      });
    };

    listen('check-update');
    listen('output-assign');
    listen('order-add');

    return () => {
      setConnected(false);
      source.close();
    };
  }, [enabled, previewRole, previewStoreId]);

  return { connected };
}
