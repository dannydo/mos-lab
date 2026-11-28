'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MOS_CHAT_MAX_FREQUENT_EMOJIS,
  buildQuickReactionEmojis,
  extractUniqueEmojisFromText,
  isTrackableChatEmoji,
  normalizeEmojiUsageMap,
  rankFrequentEmojis,
  recordEmojiUsageInMap,
  type MosChatEmojiUsageEntry,
  type MosChatUserSidebarPrefs,
  type SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import { GOOGLE_CHAT_QUICK_EMOJIS } from '../../constants/chat-constants';
import { readStoredUserSidebarPrefs, resolveUserSidebarPrefsStorageKey } from '../../utils/portal-sidebar-sections';

export interface UseChatEmojiUsageParams {
  emojiUsage?: Record<string, MosChatEmojiUsageEntry>;
  emojiUsageBootstrappedAt?: string;
  onUpdateEmojiUsage: (nextUsage: Record<string, MosChatEmojiUsageEntry>, bootstrappedAt: string) => void;
}

export function useChatEmojiUsage({
  emojiUsage,
  emojiUsageBootstrappedAt,
  onUpdateEmojiUsage,
}: UseChatEmojiUsageParams) {
  const frequentEmojis = useMemo(() => rankFrequentEmojis(emojiUsage, MOS_CHAT_MAX_FREQUENT_EMOJIS), [emojiUsage]);

  const desktopQuickReactionEmojis = useMemo(
    () => buildQuickReactionEmojis(emojiUsage, GOOGLE_CHAT_QUICK_EMOJIS, 3),
    [emojiUsage]
  );

  const mobileQuickReactionEmojis = useMemo(
    () => buildQuickReactionEmojis(emojiUsage, GOOGLE_CHAT_QUICK_EMOJIS, 5),
    [emojiUsage]
  );

  const recordEmojiUsed = useCallback(
    (emoji: string) => {
      if (!isTrackableChatEmoji(emoji)) return;
      const nextUsage = recordEmojiUsageInMap(emojiUsage, [emoji]);
      const bootstrappedAt = emojiUsageBootstrappedAt || new Date().toISOString();
      onUpdateEmojiUsage(nextUsage, bootstrappedAt);
    },
    [emojiUsage, emojiUsageBootstrappedAt, onUpdateEmojiUsage]
  );

  const recordEmojisFromText = useCallback(
    (text?: string | null) => {
      if (!text) return;
      const extracted = extractUniqueEmojisFromText(text);
      if (extracted.length === 0) return;
      const nextUsage = recordEmojiUsageInMap(emojiUsage, extracted);
      const bootstrappedAt = emojiUsageBootstrappedAt || new Date().toISOString();
      onUpdateEmojiUsage(nextUsage, bootstrappedAt);
    },
    [emojiUsage, emojiUsageBootstrappedAt, onUpdateEmojiUsage]
  );

  const resetEmojiUsage = useCallback(() => {
    onUpdateEmojiUsage({}, new Date().toISOString());
  }, [onUpdateEmojiUsage]);

  return {
    frequentEmojis,
    desktopQuickReactionEmojis,
    mobileQuickReactionEmojis,
    recordEmojiUsed,
    recordEmojisFromText,
    resetEmojiUsage,
  };
}

/**
 * Standalone emoji-usage state hook for MosChatContext (Mobile) that syncs with
 * localStorage (merging safely into stored sidebar prefs) and `/api/chat/user-prefs`.
 */
export function useStandaloneChatEmojiPrefs(currentUser?: SafeAny) {
  const storageKey = useMemo(() => resolveUserSidebarPrefsStorageKey(currentUser), [currentUser]);
  const [emojiState, setEmojiState] = useState<{
    emojiUsage?: Record<string, MosChatEmojiUsageEntry>;
    emojiUsageBootstrappedAt?: string;
    updatedAt?: string;
  }>(() => {
    const stored = readStoredUserSidebarPrefs(storageKey);
    return {
      emojiUsage: stored.emojiUsage,
      emojiUsageBootstrappedAt: stored.emojiUsageBootstrappedAt,
      updatedAt: stored.updatedAt,
    };
  });
  const lastLocalMutationAtRef = useRef<number>(0);

  useEffect(() => {
    const stored = readStoredUserSidebarPrefs(storageKey);
    setEmojiState({
      emojiUsage: stored.emojiUsage,
      emojiUsageBootstrappedAt: stored.emojiUsageBootstrappedAt,
      updatedAt: stored.updatedAt,
    });
  }, [storageKey]);

  const handleUpdateEmojiUsage = useCallback(
    (nextUsage: Record<string, MosChatEmojiUsageEntry>, bootstrappedAt: string) => {
      lastLocalMutationAtRef.current = Date.now();
      const nowIso = new Date().toISOString();
      setEmojiState({
        emojiUsage: nextUsage,
        emojiUsageBootstrappedAt: bootstrappedAt,
        updatedAt: nowIso,
      });

      if (typeof window !== 'undefined') {
        try {
          const currentStored = readStoredUserSidebarPrefs(storageKey);
          const mergedStored: MosChatUserSidebarPrefs = {
            ...currentStored,
            emojiUsage: nextUsage,
            emojiUsageBootstrappedAt: bootstrappedAt,
            updatedAt: nowIso,
          };
          window.localStorage.setItem(storageKey, JSON.stringify(mergedStored));
        } catch {
          // ignore
        }
      }

      apiClient.chat
        ?.updateUserPrefs?.({
          emojiUsage: nextUsage,
          emojiUsageBootstrappedAt: bootstrappedAt,
        })
        ?.catch?.(() => {});
    },
    [storageKey]
  );

  const syncServerEmojiPrefs = useCallback(
    (serverPrefs?: MosChatUserSidebarPrefs) => {
      if (!serverPrefs) return;
      if (Date.now() - lastLocalMutationAtRef.current < 4000) return;

      const hasServerEmojiData =
        Boolean(serverPrefs.emojiUsage && Object.keys(serverPrefs.emojiUsage).length > 0) ||
        Boolean(serverPrefs.emojiUsageBootstrappedAt);
      if (!hasServerEmojiData) return;

      const normalizedUsage = serverPrefs.emojiUsage ? normalizeEmojiUsageMap(serverPrefs.emojiUsage) : {};
      const serverTs = serverPrefs.updatedAt ? Date.parse(serverPrefs.updatedAt) : 0;

      setEmojiState((prev) => {
        const localTs = prev.updatedAt ? Date.parse(prev.updatedAt) : 0;
        const hasLocalData = Boolean(prev.emojiUsageBootstrappedAt || Object.keys(prev.emojiUsage || {}).length > 0);
        if (hasLocalData && localTs > serverTs && serverTs > 0) {
          return prev;
        }
        const nextState = {
          emojiUsage: normalizedUsage,
          emojiUsageBootstrappedAt: serverPrefs.emojiUsageBootstrappedAt,
          updatedAt: serverPrefs.updatedAt,
        };
        if (typeof window !== 'undefined') {
          try {
            const currentStored = readStoredUserSidebarPrefs(storageKey);
            window.localStorage.setItem(
              storageKey,
              JSON.stringify({
                ...currentStored,
                emojiUsage: normalizedUsage,
                emojiUsageBootstrappedAt: serverPrefs.emojiUsageBootstrappedAt,
                updatedAt: serverPrefs.updatedAt || currentStored.updatedAt,
              })
            );
          } catch {
            // ignore
          }
        }
        return nextState;
      });
    },
    [storageKey]
  );

  const usage = useChatEmojiUsage({
    emojiUsage: emojiState.emojiUsage,
    emojiUsageBootstrappedAt: emojiState.emojiUsageBootstrappedAt,
    onUpdateEmojiUsage: handleUpdateEmojiUsage,
  });

  return {
    ...usage,
    syncServerEmojiPrefs,
  };
}
