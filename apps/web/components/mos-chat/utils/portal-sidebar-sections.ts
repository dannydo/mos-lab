import type { MosChatConversation, MosChatCustomSection, MosChatUserSidebarPrefs, SafeAny } from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';

export interface PortalSidebarSectionItem {
  id: string;
  title: string;
  isCustom: boolean;
  items: MosChatConversation[];
  totalCount: number;
  unreadCount: number;
  collapsed: boolean;
  unreadOnly: boolean;
}

export function resolveUserSidebarPrefsStorageKey(currentUser?: SafeAny): string {
  let resolvedKey = String(currentUser?.id || currentUser?.username || '').trim();
  if (!resolvedKey && typeof window !== 'undefined') {
    try {
      const storedUser = window.localStorage.getItem('mos_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        resolvedKey = String(parsedUser?.id || parsedUser?.username || '').trim();
      }
    } catch {
      // ignore
    }
  }
  return `mos_chat_user_sidebar_prefs_v1_${resolvedKey || 'default'}`;
}

export function readStoredUserSidebarPrefs(storageKey: string): MosChatUserSidebarPrefs {
  const defaults: MosChatUserSidebarPrefs = {
    pinnedIds: [],
    mutedIds: [],
    hiddenIds: [],
    manualUnreadIds: [],
    readMessageCountByConv: {},
    collapsedSections: {},
    unreadOnlySections: {},
    sectionOrder: ['dm', 'spaces'],
    customSections: [],
    conversationOrder: {},
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<MosChatUserSidebarPrefs>;
    return {
      pinnedIds: Array.isArray(parsed.pinnedIds) ? parsed.pinnedIds : [],
      mutedIds: Array.isArray(parsed.mutedIds) ? parsed.mutedIds : [],
      hiddenIds: Array.isArray(parsed.hiddenIds) ? parsed.hiddenIds : [],
      manualUnreadIds: Array.isArray(parsed.manualUnreadIds) ? parsed.manualUnreadIds : [],
      readMessageCountByConv:
        parsed.readMessageCountByConv && typeof parsed.readMessageCountByConv === 'object'
          ? parsed.readMessageCountByConv
          : {},
      collapsedSections:
        parsed.collapsedSections && typeof parsed.collapsedSections === 'object' ? parsed.collapsedSections : {},
      unreadOnlySections:
        parsed.unreadOnlySections && typeof parsed.unreadOnlySections === 'object' ? parsed.unreadOnlySections : {},
      sectionOrder:
        Array.isArray(parsed.sectionOrder) && parsed.sectionOrder.length > 0 ? parsed.sectionOrder : ['dm', 'spaces'],
      customSections: (() => {
        const rawList = Array.isArray(parsed.customSections) ? parsed.customSections : [];
        const seenN = new Set<string>();
        const seenI = new Set<string>();
        const clean: MosChatCustomSection[] = [];
        for (const s of rawList) {
          if (!s || typeof s.id !== 'string' || typeof s.name !== 'string') continue;
          const norm = s.name.trim().toLowerCase();
          if (!norm || seenN.has(norm) || seenI.has(s.id)) continue;
          seenN.add(norm);
          seenI.add(s.id);
          clean.push({
            id: s.id,
            name: s.name.trim(),
            conversationIds: Array.isArray(s.conversationIds) ? s.conversationIds : [],
            collapsed: Boolean(s.collapsed),
            unreadOnly: Boolean(s.unreadOnly),
          });
        }
        return clean;
      })(),
      conversationOrder:
        parsed.conversationOrder && typeof parsed.conversationOrder === 'object' ? parsed.conversationOrder : {},
      updatedAt: parsed.updatedAt,
      notificationMode:
        parsed.notificationMode && ['ALL', 'MENTIONS_ONLY', 'NOTHING'].includes(parsed.notificationMode)
          ? parsed.notificationMode
          : undefined,
      channelNotificationOverrides:
        parsed.channelNotificationOverrides && typeof parsed.channelNotificationOverrides === 'object'
          ? parsed.channelNotificationOverrides
          : undefined,
    };
  } catch {
    return defaults;
  }
}

export function sanitizeSidebarPrefsMutation(computed: MosChatUserSidebarPrefs): MosChatUserSidebarPrefs {
  const seenN = new Set<string>();
  const seenI = new Set<string>();
  const cleanCustom: MosChatCustomSection[] = [];
  (computed.customSections || []).forEach((s) => {
    const norm = (s.name || '').trim().toLowerCase();
    if (!norm || seenN.has(norm) || seenI.has(s.id)) return;
    seenN.add(norm);
    seenI.add(s.id);
    cleanCustom.push(s);
  });
  const customIds = cleanCustom.map((s) => s.id);
  const mergedSectionOrder = Array.from(
    new Set([...customIds, ...(computed.sectionOrder || []), 'dm', 'spaces'])
  ).filter((id) => id === 'dm' || id === 'spaces' || customIds.includes(id));
  const cleanPinned = Array.from(new Set(computed.pinnedIds || []));
  const cleanHidden = (computed.hiddenIds || []).filter((id) => !cleanPinned.includes(id));
  return {
    ...computed,
    pinnedIds: cleanPinned,
    hiddenIds: cleanHidden,
    customSections: cleanCustom,
    sectionOrder: mergedSectionOrder,
    updatedAt: new Date().toISOString(),
  };
}

export function sortConversationsBySection(
  items: MosChatConversation[],
  sectionId: string,
  pinnedIds: string[] = [],
  conversationOrder?: Record<string, string[]>
): MosChatConversation[] {
  const pinnedSet = new Set(pinnedIds);
  const pinnedIdxMap = new Map<string, number>();
  pinnedIds.forEach((id, idx) => pinnedIdxMap.set(id, idx));

  const orderArr = conversationOrder?.[sectionId] || [];
  const orderMap = new Map<string, number>();
  orderArr.forEach((id, idx) => orderMap.set(id, idx));

  return [...items].sort((a, b) => {
    const aPinned = pinnedSet.has(a.id) ? 1 : 0;
    const bPinned = pinnedSet.has(b.id) ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;

    if (aPinned && bPinned) {
      if (orderMap.has(a.id) && orderMap.has(b.id)) {
        return orderMap.get(a.id)! - orderMap.get(b.id)!;
      }
      const aPinIdx = pinnedIdxMap.has(a.id) ? pinnedIdxMap.get(a.id)! : 9999;
      const bPinIdx = pinnedIdxMap.has(b.id) ? pinnedIdxMap.get(b.id)! : 9999;
      if (aPinIdx !== bPinIdx) return aPinIdx - bPinIdx;
    }

    const aOrder = orderMap.has(a.id) ? orderMap.get(a.id)! : 9999;
    const bOrder = orderMap.has(b.id) ? orderMap.get(b.id)! : 9999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    if (a.id === AI_COPILOT_CONV_ID) return -1;
    if (b.id === AI_COPILOT_CONV_ID) return 1;
    return 0;
  });
}

export function computeSidebarSections({
  userPrefs,
  searchQuery,
  sidebarFilter,
  filteredConversations,
  sortConversationsForSection,
  getEffectiveUnreadCount,
  activeConversationId,
}: {
  userPrefs: MosChatUserSidebarPrefs;
  searchQuery: string;
  sidebarFilter: 'all' | 'unread' | 'spaces';
  filteredConversations: MosChatConversation[];
  sortConversationsForSection: (items: MosChatConversation[], sectionId: string) => MosChatConversation[];
  getEffectiveUnreadCount: (conv: MosChatConversation) => number;
  activeConversationId?: string;
}): PortalSidebarSectionItem[] {
  const rawCustomSecs = userPrefs.customSections || [];
  const seenSecNames = new Set<string>();
  const seenSecIds = new Set<string>();
  const customSecs: MosChatCustomSection[] = [];
  rawCustomSecs.forEach((s) => {
    const normName = (s.name || '').trim().toLowerCase();
    if (!normName || seenSecNames.has(normName) || seenSecIds.has(s.id)) return;
    seenSecNames.add(normName);
    seenSecIds.add(s.id);
    customSecs.push(s);
  });

  const assignedToCustom = new Set<string>();
  customSecs.forEach((s) => {
    (s.conversationIds || []).forEach((cid) => assignedToCustom.add(cid));
  });

  const customIds = customSecs.map((s) => s.id);
  const orderedSectionIds = Array.from(
    new Set([...(userPrefs.sectionOrder || []), ...customIds, 'dm', 'spaces'])
  ).filter((id) => id === 'dm' || id === 'spaces' || customIds.includes(id));

  const isSearching = searchQuery.trim().length > 0;

  return orderedSectionIds
    .map((secId): PortalSidebarSectionItem | null => {
      if (secId === 'dm') {
        if (sidebarFilter === 'spaces') return null;
        const rawItems = filteredConversations.filter((c) => c.type === 'dm' && !assignedToCustom.has(c.id));
        const sorted = sortConversationsForSection(rawItems, 'dm');
        const unreadOnly = Boolean(userPrefs.unreadOnlySections?.['dm']);
        const displayItems =
          unreadOnly && !isSearching
            ? sorted.filter((c) => getEffectiveUnreadCount(c) > 0 || c.id === activeConversationId)
            : sorted;
        return {
          id: 'dm',
          title: 'DIRECT MESSAGES',
          isCustom: false,
          items: displayItems,
          totalCount: sorted.length,
          unreadCount: sorted.reduce((s, c) => s + getEffectiveUnreadCount(c), 0),
          collapsed: Boolean(userPrefs.collapsedSections?.['dm']),
          unreadOnly,
        };
      }
      if (secId === 'spaces') {
        const rawItems = filteredConversations.filter((c) => c.type === 'space' && !assignedToCustom.has(c.id));
        const sorted = sortConversationsForSection(rawItems, 'spaces');
        const unreadOnly = Boolean(userPrefs.unreadOnlySections?.['spaces']);
        const displayItems =
          unreadOnly && !isSearching
            ? sorted.filter((c) => getEffectiveUnreadCount(c) > 0 || c.id === activeConversationId)
            : sorted;
        return {
          id: 'spaces',
          title: 'SPACES',
          isCustom: false,
          items: displayItems,
          totalCount: sorted.length,
          unreadCount: sorted.reduce((s, c) => s + getEffectiveUnreadCount(c), 0),
          collapsed: Boolean(userPrefs.collapsedSections?.['spaces']),
          unreadOnly,
        };
      }
      const customSec = customSecs.find((s) => s.id === secId);
      if (!customSec) return null;
      const idSet = new Set(customSec.conversationIds || []);
      const rawItems = filteredConversations.filter((c) => idSet.has(c.id));
      const sorted = sortConversationsForSection(rawItems, customSec.id);
      const unreadOnly = Boolean(userPrefs.unreadOnlySections?.[customSec.id] || customSec.unreadOnly);
      const displayItems =
        unreadOnly && !isSearching
          ? sorted.filter((c) => getEffectiveUnreadCount(c) > 0 || c.id === activeConversationId)
          : sorted;
      return {
        id: customSec.id,
        title: customSec.name,
        isCustom: true,
        items: displayItems,
        totalCount: sorted.length,
        unreadCount: sorted.reduce((s, c) => s + getEffectiveUnreadCount(c), 0),
        collapsed: Boolean(userPrefs.collapsedSections?.[customSec.id] ?? customSec.collapsed),
        unreadOnly,
      };
    })
    .filter((sec): sec is PortalSidebarSectionItem => Boolean(sec));
}
