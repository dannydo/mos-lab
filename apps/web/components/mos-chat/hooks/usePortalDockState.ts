'use client';

import { useEffect, useRef, useState } from 'react';
import type { MosChatImageAttachment } from '@mos-lab/shared';
import { DOCKED_STORAGE_KEY_V2, type MosChatDockDimension } from '../components/MosChatDockedWindows';

function readInitialDockSnapshot<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(DOCKED_STORAGE_KEY_V2);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed[key] !== undefined && parsed[key] !== null) {
        return parsed[key] as T;
      }
    }
  } catch {
    // ignore storage parse error
  }
  return fallback;
}

/**
 * Manages persisted Mini Docked Pop-out conversation windows state & DOM container/input refs.
 */
export function usePortalDockState() {
  const [dockedConvIds, setDockedConvIds] = useState<string[]>(() => {
    const val = readInitialDockSnapshot<unknown>('dockedConvIds', []);
    return Array.isArray(val) ? (val as string[]) : [];
  });

  const [collapsedDockIds, setCollapsedDockIds] = useState<Record<string, boolean>>(() => {
    const val = readInitialDockSnapshot<unknown>('collapsedDockIds', {});
    return val && typeof val === 'object' ? (val as Record<string, boolean>) : {};
  });

  const [dockInputs, setDockInputs] = useState<Record<string, string>>(() => {
    const val = readInitialDockSnapshot<unknown>('dockInputs', {});
    return val && typeof val === 'object' ? (val as Record<string, string>) : {};
  });

  const [dockDimensions, setDockDimensions] = useState<Record<string, MosChatDockDimension>>(() => {
    const val = readInitialDockSnapshot<unknown>('dimensions', {});
    return val && typeof val === 'object' ? (val as Record<string, MosChatDockDimension>) : {};
  });

  const [dockActiveTabs, setDockActiveTabs] = useState<Record<string, 'chat' | 'tasks'>>(() => {
    const val = readInitialDockSnapshot<unknown>('activeTabs', {});
    return val && typeof val === 'object' ? (val as Record<string, 'chat' | 'tasks'>) : {};
  });

  const [dockActiveThreadMsgIds, setDockActiveThreadMsgIds] = useState<Record<string, string | null>>(() => {
    const val = readInitialDockSnapshot<unknown>('activeThreadMsgIds', {});
    return val && typeof val === 'object' ? (val as Record<string, string | null>) : {};
  });

  const [dockAttachments, setDockAttachments] = useState<Record<string, MosChatImageAttachment[]>>({});
  const dockInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const dockMessagesContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        DOCKED_STORAGE_KEY_V2,
        JSON.stringify({
          dockedConvIds,
          collapsedDockIds,
          dockInputs,
          dimensions: dockDimensions,
          activeTabs: dockActiveTabs,
          activeThreadMsgIds: dockActiveThreadMsgIds,
        })
      );
    } catch {
      // ignore storage quota error
    }
  }, [dockedConvIds, collapsedDockIds, dockInputs, dockDimensions, dockActiveTabs, dockActiveThreadMsgIds]);

  return {
    dockedConvIds,
    setDockedConvIds,
    collapsedDockIds,
    setCollapsedDockIds,
    dockInputs,
    setDockInputs,
    dockDimensions,
    setDockDimensions,
    dockActiveTabs,
    setDockActiveTabs,
    dockActiveThreadMsgIds,
    setDockActiveThreadMsgIds,
    dockAttachments,
    setDockAttachments,
    dockInputRefs,
    dockMessagesContainerRefs,
  };
}
