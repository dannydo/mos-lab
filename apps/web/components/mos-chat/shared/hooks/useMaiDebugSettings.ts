'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AG_CHAT_MODEL_CATALOG,
  DEFAULT_MAI_CHAT_MODEL_ID,
  DEFAULT_MAI_DEBUG_MODEL_ID,
  isAllowedAgModelId,
  isCanonicalSuperAdminIdentity,
  isSuperAdminRole,
  type AgModelOption,
  type SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';

export const MAI_DEBUG_MODE_STORAGE_KEY = 'mos_chat_mai_debug_mode_v1';
export const MAI_MODEL_ID_STORAGE_KEY = 'mos_chat_mai_model_id_v1';
const MAI_DEBUG_SETTINGS_EVENT = 'mos-chat-mai-debug-settings-changed';

let cachedModels: AgModelOption[] = [...AG_CHAT_MODEL_CATALOG];
let cachedBridgeOnline = false;
let hasFetchedLiveModels = false;
let inflightModelsPromise: Promise<void> | null = null;
const liveModelIdSet = new Set<string>(AG_CHAT_MODEL_CATALOG.map((m) => m.id));

let memoryDebugMode = false;
let memoryModelId = '';

export function isStrictSuperAdminClientUser(user?: SafeAny): boolean {
  if (!user) return false;
  return isSuperAdminRole(user.role) || isCanonicalSuperAdminIdentity({ username: user.username, email: user.email });
}

function readStoredDebugMode(): boolean {
  if (typeof window === 'undefined') return memoryDebugMode;
  try {
    return window.localStorage.getItem(MAI_DEBUG_MODE_STORAGE_KEY) === 'true';
  } catch {
    return memoryDebugMode;
  }
}

function readStoredModelId(): string {
  if (typeof window === 'undefined') return memoryModelId;
  try {
    const val = (window.localStorage.getItem(MAI_MODEL_ID_STORAGE_KEY) || '').trim();
    return val && isAllowedAgModelId(val, liveModelIdSet) ? val : '';
  } catch {
    return memoryModelId;
  }
}

export function getActiveMaiDebugPayload(isStrictSuperAdmin: boolean): {
  debugMode?: true;
  modelId?: string;
} {
  if (!isStrictSuperAdmin) return {};
  const debugMode = readStoredDebugMode();
  const modelId = readStoredModelId();
  return {
    ...(debugMode ? { debugMode: true as const } : {}),
    ...(modelId ? { modelId } : {}),
  };
}

export function resetMaiDebugMemoryStateForTest(): void {
  memoryDebugMode = false;
  memoryModelId = '';
  cachedModels = [...AG_CHAT_MODEL_CATALOG];
  cachedBridgeOnline = false;
  hasFetchedLiveModels = false;
  inflightModelsPromise = null;
}

export function useMaiDebugSettings(isStrictSuperAdmin: boolean) {
  const [debugMode, setDebugModeState] = useState<boolean>(() => (isStrictSuperAdmin ? readStoredDebugMode() : false));
  const [modelId, setModelIdState] = useState<string>(() => (isStrictSuperAdmin ? readStoredModelId() : ''));
  const [models, setModels] = useState<AgModelOption[]>(cachedModels);
  const [bridgeOnline, setBridgeOnline] = useState<boolean>(cachedBridgeOnline);

  useEffect(() => {
    if (!isStrictSuperAdmin) {
      setDebugModeState(false);
      setModelIdState('');
      return;
    }
    setDebugModeState(readStoredDebugMode());
    setModelIdState(readStoredModelId());

    const handleSync = () => {
      setDebugModeState(readStoredDebugMode());
      setModelIdState(readStoredModelId());
    };
    window.addEventListener(MAI_DEBUG_SETTINGS_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(MAI_DEBUG_SETTINGS_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [isStrictSuperAdmin]);

  useEffect(() => {
    if (!isStrictSuperAdmin) return;
    if (hasFetchedLiveModels) {
      setModels(cachedModels);
      setBridgeOnline(cachedBridgeOnline);
      return;
    }

    let cancelled = false;
    const listAgModelsFn = apiClient?.ai?.listAgModels;
    if (typeof listAgModelsFn !== 'function') {
      hasFetchedLiveModels = true;
      return;
    }

    if (!inflightModelsPromise) {
      inflightModelsPromise = listAgModelsFn()
        .then((res) => {
          if (Array.isArray(res?.models) && res.models.length > 0) {
            cachedModels = res.models;
            for (const item of res.models) {
              liveModelIdSet.add(item.id);
            }
          }
          cachedBridgeOnline = Boolean(res?.bridgeOnline);
          hasFetchedLiveModels = true;
        })
        .catch(() => {
          hasFetchedLiveModels = true;
        })
        .finally(() => {
          inflightModelsPromise = null;
        });
    }

    void inflightModelsPromise.then(() => {
      if (!cancelled) {
        setModels(cachedModels);
        setBridgeOnline(cachedBridgeOnline);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isStrictSuperAdmin]);

  const setDebugMode = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      if (!isStrictSuperAdmin) return;
      const resolved = typeof next === 'function' ? next(readStoredDebugMode()) : next;
      memoryDebugMode = resolved;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(MAI_DEBUG_MODE_STORAGE_KEY, resolved ? 'true' : 'false');
        } catch {
          // ignore storage error
        }
        window.dispatchEvent(new CustomEvent(MAI_DEBUG_SETTINGS_EVENT));
      }
      setDebugModeState(resolved);
    },
    [isStrictSuperAdmin]
  );

  const setModelId = useCallback(
    (nextModelId: string) => {
      if (!isStrictSuperAdmin) return;
      const trimmed = nextModelId.trim();
      const normalized = trimmed && isAllowedAgModelId(trimmed, liveModelIdSet) ? trimmed : '';
      memoryModelId = normalized;
      if (typeof window !== 'undefined') {
        try {
          if (normalized) {
            window.localStorage.setItem(MAI_MODEL_ID_STORAGE_KEY, normalized);
          } else {
            window.localStorage.removeItem(MAI_MODEL_ID_STORAGE_KEY);
          }
        } catch {
          // ignore storage error
        }
        window.dispatchEvent(new CustomEvent(MAI_DEBUG_SETTINGS_EVENT));
      }
      setModelIdState(normalized);
    },
    [isStrictSuperAdmin]
  );

  const effectiveModelId = modelId || (debugMode ? DEFAULT_MAI_DEBUG_MODEL_ID : DEFAULT_MAI_CHAT_MODEL_ID);
  const activeModel = useMemo(
    () => models.find((m) => m.id === effectiveModelId) || models[0] || AG_CHAT_MODEL_CATALOG[0],
    [models, effectiveModelId]
  );

  return {
    debugMode,
    setDebugMode,
    modelId,
    effectiveModelId,
    setModelId,
    models,
    activeModel,
    bridgeOnline,
  };
}
