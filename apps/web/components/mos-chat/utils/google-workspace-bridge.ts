'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseGoogleWorkspaceUrl, type MosChatGoogleWorkspacePreviewResponse } from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';

export const MOS_CHAT_OPEN_GOOGLE_WORKSPACE_EVENT = 'mos-chat:open-google-workspace';
export const MOS_CHAT_GW_CACHE_EVENT = 'mos-chat:google-workspace-cache-updated';

export interface OpenGoogleWorkspaceReaderPayload {
  url: string;
  gid?: string | null;
  range?: string | null;
  conversationId?: string;
  messageId?: string;
  initialMode?: 'fast' | 'embed';
  openAiBar?: boolean;
  initialAiPrompt?: string;
}

interface CacheEntry {
  data: MosChatGoogleWorkspacePreviewResponse;
  expiresAt: number;
}

interface TitleMetaEntry {
  title: string;
  tabTitle?: string | null;
}

const PREVIEW_CACHE_TTL_MS = 60_000;
const previewCache = new Map<string, CacheEntry>();
const metaByFileKeyCache = new Map<string, TitleMetaEntry>();
const inflightRequests = new Map<string, Promise<MosChatGoogleWorkspacePreviewResponse>>();

function buildCacheKey(params: {
  url: string;
  fileId?: string;
  gid?: string | null;
  range?: string | null;
  conversationId?: string;
  messageId?: string;
}): string {
  const idPart = params.fileId || params.url.trim();
  return `${idPart}::${params.gid || ''}::${params.range || ''}::${params.conversationId || ''}::${params.messageId || ''}`;
}

export function getCachedGoogleWorkspaceMeta(urlOrFileId?: string | null): TitleMetaEntry | null {
  if (!urlOrFileId) return null;
  const parsed = parseGoogleWorkspaceUrl(urlOrFileId);
  if (!parsed) {
    return metaByFileKeyCache.get(urlOrFileId) || null;
  }
  const exactKey = `${parsed.fileId}::${parsed.gid || ''}`;
  return metaByFileKeyCache.get(exactKey) || metaByFileKeyCache.get(parsed.fileId) || null;
}

export function getCachedGoogleWorkspaceTitle(urlOrFileId?: string | null): string | null {
  return getCachedGoogleWorkspaceMeta(urlOrFileId)?.title || null;
}

export function getCachedGoogleWorkspacePreview(
  url?: string | null,
  options?: { gid?: string | null; range?: string | null; conversationId?: string; messageId?: string }
): MosChatGoogleWorkspacePreviewResponse | null {
  if (!url) return null;
  const parsed = parseGoogleWorkspaceUrl(url);
  const key = buildCacheKey({
    url,
    fileId: parsed?.fileId,
    gid: options?.gid !== undefined ? options.gid : parsed?.gid,
    range: options?.range !== undefined ? options.range : parsed?.range,
    conversationId: options?.conversationId,
    messageId: options?.messageId,
  });
  const hit = previewCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    previewCache.delete(key);
    return null;
  }
  return hit.data;
}

export function clearGoogleWorkspaceClientCache(): void {
  previewCache.clear();
  metaByFileKeyCache.clear();
  inflightRequests.clear();
}

function notifyCacheUpdated(fileId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<{ fileId: string }>(MOS_CHAT_GW_CACHE_EVENT, { detail: { fileId } }));
}

export function useGoogleWorkspaceCachedMeta(url?: string | null): TitleMetaEntry | null {
  const parsed = url ? parseGoogleWorkspaceUrl(url) : null;
  const [meta, setMeta] = useState<TitleMetaEntry | null>(() => getCachedGoogleWorkspaceMeta(url));

  useEffect(() => {
    setMeta(getCachedGoogleWorkspaceMeta(url));
    if (!url || !parsed || typeof window === 'undefined') return;
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ fileId: string }>).detail;
      if (!detail || detail.fileId === parsed.fileId) {
        setMeta(getCachedGoogleWorkspaceMeta(url));
      }
    };
    window.addEventListener(MOS_CHAT_GW_CACHE_EVENT, onUpdated);
    return () => window.removeEventListener(MOS_CHAT_GW_CACHE_EVENT, onUpdated);
  }, [url, parsed?.fileId, parsed?.gid]);

  return meta;
}

export async function fetchGoogleWorkspacePreviewCached(params: {
  url: string;
  gid?: string | null;
  range?: string | null;
  conversationId?: string;
  messageId?: string;
  refresh?: boolean;
}): Promise<MosChatGoogleWorkspacePreviewResponse> {
  const parsed = parseGoogleWorkspaceUrl(params.url);
  const resolvedGid = params.gid !== undefined ? params.gid : parsed?.gid;
  const resolvedRange = params.range !== undefined ? params.range : parsed?.range;

  const key = buildCacheKey({
    url: params.url,
    fileId: parsed?.fileId,
    gid: resolvedGid,
    range: resolvedRange,
    conversationId: params.conversationId,
    messageId: params.messageId,
  });

  if (!params.refresh) {
    const hit = previewCache.get(key);
    if (hit && hit.expiresAt >= Date.now()) {
      return hit.data;
    }
    const existing = inflightRequests.get(key);
    if (existing) {
      return existing;
    }
  }

  const reqPromise = apiClient.chat
    .previewGoogleWorkspace({
      url: params.url,
      gid: resolvedGid || undefined,
      range: resolvedRange || undefined,
      conversationId: params.conversationId || undefined,
      messageId: params.messageId || undefined,
      refresh: params.refresh ? true : undefined,
    })
    .then((res) => {
      if (res?.fileId) {
        const defaultTitle = res.kind === 'spreadsheet' ? 'Google Sheets' : 'Google Docs';
        const effectiveTitle =
          res.title && res.title !== defaultTitle ? res.title : metaByFileKeyCache.get(res.fileId)?.title || res.title;
        if (effectiveTitle) {
          const entry: TitleMetaEntry = {
            title: effectiveTitle,
            tabTitle: res.activeTab?.title || null,
          };
          metaByFileKeyCache.set(res.fileId, entry);
          if (resolvedGid || res.activeTab?.gid) {
            metaByFileKeyCache.set(`${res.fileId}::${resolvedGid || res.activeTab?.gid}`, entry);
          }
          notifyCacheUpdated(res.fileId);
        }
      }
      previewCache.set(key, {
        data: res,
        expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS,
      });
      return res;
    })
    .finally(() => {
      inflightRequests.delete(key);
    });

  inflightRequests.set(key, reqPromise);
  return reqPromise;
}

export function openGoogleWorkspaceReader(payload: OpenGoogleWorkspaceReaderPayload): void {
  if (typeof window === 'undefined' || !payload?.url) return;
  window.dispatchEvent(
    new CustomEvent<OpenGoogleWorkspaceReaderPayload>(MOS_CHAT_OPEN_GOOGLE_WORKSPACE_EVENT, {
      detail: payload,
    })
  );
}

export function useGoogleWorkspaceOpenListener(handler: (payload: OpenGoogleWorkspaceReaderPayload) => void): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const listener = (event: Event) => {
      const custom = event as CustomEvent<OpenGoogleWorkspaceReaderPayload>;
      if (custom.detail?.url) {
        handlerRef.current(custom.detail);
      }
    };
    window.addEventListener(MOS_CHAT_OPEN_GOOGLE_WORKSPACE_EVENT, listener);
    return () => window.removeEventListener(MOS_CHAT_OPEN_GOOGLE_WORKSPACE_EVENT, listener);
  }, []);
}

export function useGoogleWorkspacePreview(
  url?: string | null,
  options?: {
    gid?: string | null;
    range?: string | null;
    conversationId?: string;
    messageId?: string;
    enabled?: boolean;
  }
) {
  const parsed = url ? parseGoogleWorkspaceUrl(url) : null;
  const resolvedGid = options?.gid !== undefined ? options.gid : parsed?.gid;
  const resolvedRange = options?.range !== undefined ? options.range : parsed?.range;
  const conversationId = options?.conversationId;
  const messageId = options?.messageId;
  const enabled = options?.enabled !== false && Boolean(url && parsed);

  const [data, setData] = useState<MosChatGoogleWorkspacePreviewResponse | null>(() =>
    url
      ? getCachedGoogleWorkspacePreview(url, {
          gid: resolvedGid,
          range: resolvedRange,
          conversationId,
          messageId,
        })
      : null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!url || !enabled) return;
      if (!forceRefresh) {
        const cached = getCachedGoogleWorkspacePreview(url, {
          gid: resolvedGid,
          range: resolvedRange,
          conversationId,
          messageId,
        });
        if (cached) {
          setData(cached);
          setError(null);
          return;
        }
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetchGoogleWorkspacePreviewCached({
          url,
          gid: resolvedGid,
          range: resolvedRange,
          conversationId,
          messageId,
          refresh: forceRefresh,
        });
        if (mountedRef.current) {
          setData(res);
          setError(null);
        }
      } catch (err: unknown) {
        if (mountedRef.current) {
          const msg = err instanceof Error ? err.message : 'Không thể tải dữ liệu Google Workspace.';
          setError(msg);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    },
    [url, enabled, resolvedGid, resolvedRange, conversationId, messageId]
  );

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    void load(false);
  }, [enabled, load]);

  return {
    data,
    loading,
    error,
    reload: (forceRefresh = true) => load(forceRefresh),
  };
}
