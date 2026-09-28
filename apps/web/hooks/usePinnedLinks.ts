'use client';

import { useState, useEffect, useCallback } from 'react';
import { PinnedLinkItem } from '@mos-lab/shared';
import { apiClient } from '../lib/api-client';

const PINNED_LINKS_UPDATED_EVENT = 'mos_pinned_links_updated';
const LOCAL_STORAGE_KEY_PREFIX = 'mos_pinned_links_';

function getStorageKey(userId?: number | string | null): string {
  return `${LOCAL_STORAGE_KEY_PREFIX}${userId || 'guest'}`;
}

export function usePinnedLinks(userId?: number | string | null) {
  const [pinnedLinks, setPinnedLinks] = useState<PinnedLinkItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(getStorageKey(userId));
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (_) {}
    }
    return [];
  });
  const [loading, setLoading] = useState(false);

  // Sync to localStorage and broadcast
  const broadcastUpdate = useCallback(
    (nextItems: PinnedLinkItem[]) => {
      setPinnedLinks(nextItems);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(getStorageKey(userId), JSON.stringify(nextItems));
          window.dispatchEvent(new CustomEvent(PINNED_LINKS_UPDATED_EVENT, { detail: nextItems }));
        } catch (_) {}
      }
    },
    [userId]
  );

  // Fetch from server
  const fetchPinnedLinks = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const items = await apiClient.userPreferences.getPinnedLinks();
      broadcastUpdate(items);
    } catch (err) {
      console.warn('Failed to fetch pinned links:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, broadcastUpdate]);

  useEffect(() => {
    fetchPinnedLinks();
  }, [fetchPinnedLinks]);

  // Listen to cross-tab or cross-component sync
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<PinnedLinkItem[]>;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setPinnedLinks(customEvent.detail);
      } else if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem(getStorageKey(userId));
          if (cached) setPinnedLinks(JSON.parse(cached));
        } catch (_) {}
      }
    };

    window.addEventListener(PINNED_LINKS_UPDATED_EVENT, handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(PINNED_LINKS_UPDATED_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [userId]);

  // Check if item is pinned
  const isPinned = useCallback(
    (keyOrUrl: string): boolean => {
      return pinnedLinks.some((item) => item.menuKey === keyOrUrl || item.url === keyOrUrl);
    },
    [pinnedLinks]
  );

  // Pin a link
  const pinLink = useCallback(
    async (payload: { title: string; url: string; icon?: string; isExternal?: boolean; menuKey?: string }) => {
      // Optimistic addition
      const optimisticItem: PinnedLinkItem = {
        id: `temp-${Date.now()}`,
        title: payload.title,
        url: payload.url,
        icon: payload.icon,
        isExternal: payload.isExternal,
        sortOrder: pinnedLinks.length,
        createdAt: new Date().toISOString(),
        menuKey: payload.menuKey,
      };

      const updated = [
        ...pinnedLinks.filter(
          (item) => item.url !== payload.url && (!payload.menuKey || item.menuKey !== payload.menuKey)
        ),
        optimisticItem,
      ];
      broadcastUpdate(updated);

      try {
        const saved = await apiClient.userPreferences.addPinnedLink(payload);
        broadcastUpdate(saved);
      } catch (err) {
        console.error('Failed to pin link:', err);
        // Rollback on error
        fetchPinnedLinks();
        throw err;
      }
    },
    [pinnedLinks, broadcastUpdate, fetchPinnedLinks]
  );

  // Unpin a link
  const unpinLink = useCallback(
    async (idOrMenuKey: string) => {
      const target = pinnedLinks.find(
        (item) => item.id === idOrMenuKey || item.menuKey === idOrMenuKey || item.url === idOrMenuKey
      );
      if (!target) return;

      const remaining = pinnedLinks.filter((item) => item.id !== target.id);
      broadcastUpdate(remaining);

      try {
        const saved = await apiClient.userPreferences.removePinnedLink(target.id);
        broadcastUpdate(saved);
      } catch (err) {
        console.error('Failed to unpin link:', err);
        fetchPinnedLinks();
        throw err;
      }
    },
    [pinnedLinks, broadcastUpdate, fetchPinnedLinks]
  );

  // Reorder links (e.g. drag & drop)
  const reorderLinks = useCallback(
    async (reordered: PinnedLinkItem[]) => {
      const indexed = reordered.map((item, idx) => ({ ...item, sortOrder: idx }));
      broadcastUpdate(indexed);

      try {
        const saved = await apiClient.userPreferences.savePinnedLinks(indexed);
        broadcastUpdate(saved);
      } catch (err) {
        console.error('Failed to reorder pinned links:', err);
        fetchPinnedLinks();
        throw err;
      }
    },
    [broadcastUpdate, fetchPinnedLinks]
  );

  // Update a single link's title or icon
  const updateLink = useCallback(
    async (id: string, updates: Partial<PinnedLinkItem>) => {
      const next = pinnedLinks.map((item) => (item.id === id ? { ...item, ...updates } : item));
      broadcastUpdate(next);

      try {
        const saved = await apiClient.userPreferences.savePinnedLinks(next);
        broadcastUpdate(saved);
      } catch (err) {
        console.error('Failed to update pinned link:', err);
        fetchPinnedLinks();
        throw err;
      }
    },
    [pinnedLinks, broadcastUpdate, fetchPinnedLinks]
  );

  return {
    pinnedLinks,
    loading,
    isPinned,
    pinLink,
    unpinLink,
    reorderLinks,
    updateLink,
    refreshPinnedLinks: fetchPinnedLinks,
  };
}
