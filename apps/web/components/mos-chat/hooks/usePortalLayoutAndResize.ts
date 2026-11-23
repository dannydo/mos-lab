'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MosChatPresenceStatus, SafeAny } from '@mos-lab/shared';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';

export interface PersonalLayoutSnapshot {
  panelWidth: number;
  sidebarWidth: number;
  threadWidth: number;
  maximized: boolean;
  activeConvId: string;
}

export interface UsePortalLayoutAndResizeParams {
  open: boolean;
  onOpen?: () => void;
  onToggle: () => void;
  currentUser?: SafeAny;
}

export function usePortalLayoutAndResize({ open, onOpen, onToggle, currentUser }: UsePortalLayoutAndResizeParams) {
  const openRef = useRef<boolean>(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const ensurePortalOpen = useCallback(() => {
    if (onOpen) {
      onOpen();
    } else if (!openRef.current) {
      onToggle();
    }
  }, [onOpen, onToggle]);

  const personalLayoutStorageKey = useMemo(() => {
    let resolvedKey = String(currentUser?.id || currentUser?.username || '').trim();
    if (!resolvedKey && typeof window !== 'undefined') {
      try {
        const storedUser = window.localStorage.getItem('mos_user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          resolvedKey = String(parsedUser?.id || parsedUser?.username || '').trim();
        }
      } catch {
        // ignore parse error
      }
    }
    return `mos_chat_personal_layout_v2_${resolvedKey || 'default'}`;
  }, [currentUser?.id, currentUser?.username]);

  const readStoredPersonalLayout = useCallback((storageKey: string): PersonalLayoutSnapshot => {
    const getResponsiveDefaultPanelWidth = () => {
      if (typeof window === 'undefined') return 960;
      const w = window.innerWidth || 1920;
      if (w >= 1920) return 1080;
      if (w >= 1600) return 980;
      if (w >= 1440) return 920;
      return 840;
    };
    const defaults: PersonalLayoutSnapshot = {
      panelWidth: getResponsiveDefaultPanelWidth(),
      sidebarWidth: 264,
      threadWidth: 440,
      maximized: false,
      activeConvId: 'space-cc',
    };
    if (typeof window === 'undefined') return defaults;
    try {
      const legacyKey = storageKey.replace('mos_chat_personal_layout_v2_', 'mos_chat_personal_layout_v1_');
      const raw =
        window.localStorage.getItem(storageKey) ||
        window.localStorage.getItem('mos_chat_personal_layout_v2_global') ||
        window.localStorage.getItem(legacyKey) ||
        window.localStorage.getItem('mos_chat_personal_layout_v1_default');
      const storedThread = Number(window.localStorage.getItem('mos_chat_thread_width_v1'));
      if (!raw) {
        if (Number.isFinite(storedThread) && storedThread > 0) {
          return { ...defaults, threadWidth: Math.max(300, Math.min(850, Math.round(storedThread))) };
        }
        return defaults;
      }
      const parsed = JSON.parse(raw) as Partial<PersonalLayoutSnapshot>;
      const maxAllowed = Math.max(520, (window.innerWidth || 1920) - 56);
      const rawThread =
        typeof parsed.threadWidth === 'number' && Number.isFinite(parsed.threadWidth)
          ? parsed.threadWidth
          : Number.isFinite(storedThread) && storedThread > 0
            ? storedThread
            : defaults.threadWidth;

      return {
        panelWidth:
          typeof parsed.panelWidth === 'number' && Number.isFinite(parsed.panelWidth)
            ? Math.max(520, Math.min(maxAllowed, Math.round(parsed.panelWidth)))
            : defaults.panelWidth,
        sidebarWidth:
          typeof parsed.sidebarWidth === 'number' && Number.isFinite(parsed.sidebarWidth)
            ? Math.max(190, Math.min(460, Math.round(parsed.sidebarWidth)))
            : defaults.sidebarWidth,
        threadWidth: Math.max(300, Math.min(850, Math.round(rawThread))),
        maximized: typeof parsed.maximized === 'boolean' ? parsed.maximized : defaults.maximized,
        activeConvId:
          typeof parsed.activeConvId === 'string' && parsed.activeConvId ? parsed.activeConvId : defaults.activeConvId,
      };
    } catch {
      return defaults;
    }
  }, []);

  const [activeConvId, setActiveConvId] = useState<string>(
    () => readStoredPersonalLayout(personalLayoutStorageKey).activeConvId
  );
  const [activeSubtab, setActiveSubtab] = useState<MosChatActiveSubtab>('chat');
  const [pinnedBannerIndex, setPinnedBannerIndex] = useState<number>(0);
  const [sidebarFilter, setSidebarFilter] = useState<'all' | 'unread' | 'spaces'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [maximized, setMaximized] = useState<boolean>(
    () => readStoredPersonalLayout(personalLayoutStorageKey).maximized
  );
  const [panelWidth, setPanelWidth] = useState<number>(
    () => readStoredPersonalLayout(personalLayoutStorageKey).panelWidth
  );
  const [sidebarWidth, setSidebarWidth] = useState<number>(
    () => readStoredPersonalLayout(personalLayoutStorageKey).sidebarWidth
  );
  const [threadWidth, setThreadWidth] = useState<number>(
    () => readStoredPersonalLayout(personalLayoutStorageKey).threadWidth
  );
  const [isResizingTarget, setIsResizingTarget] = useState<'panel' | 'sidebar' | 'thread' | null>(null);
  const [hoverResizeHandle, setHoverResizeHandle] = useState<'panel' | 'sidebar' | 'thread' | null>(null);
  const justFinishedResizingRef = useRef<boolean>(false);
  const [presence, setPresence] = useState<MosChatPresenceStatus>('active');
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.innerWidth > 0) {
      return window.innerWidth <= 768;
    }
    return false;
  });
  const [mobileActiveView, setMobileActiveView] = useState<'inbox' | 'conversation' | 'thread'>('inbox');
  const [mobileActionOpen, setMobileActionOpen] = useState<boolean>(false);
  const [mobileActiveMsgId, setMobileActiveMsgId] = useState<string | null>(null);
  const [heartFlyMsgId, setHeartFlyMsgId] = useState<string | null>(null);
  const lastTapRef = useRef<{ msgId: string; time: number }>({ msgId: '', time: 0 });

  useEffect(() => {
    setMobileActionOpen(false);
    setMobileActiveMsgId(null);
  }, [activeConvId]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth <= 768 : false;
      setIsMobile(mobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const panelWidthRef = useRef<number>(panelWidth);
  const sidebarWidthRef = useRef<number>(sidebarWidth);
  const threadWidthRef = useRef<number>(threadWidth);
  const maximizedRef = useRef<boolean>(maximized);
  const activeConvIdRef = useRef<string>(activeConvId);

  useEffect(() => {
    panelWidthRef.current = panelWidth;
  }, [panelWidth]);
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);
  useEffect(() => {
    threadWidthRef.current = threadWidth;
  }, [threadWidth]);
  useEffect(() => {
    maximizedRef.current = maximized;
  }, [maximized]);
  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  const persistPersonalLayout = useCallback(
    (patch?: Partial<PersonalLayoutSnapshot>) => {
      if (typeof window === 'undefined') return;
      const next = {
        panelWidth: patch?.panelWidth ?? panelWidthRef.current,
        sidebarWidth: patch?.sidebarWidth ?? sidebarWidthRef.current,
        threadWidth: patch?.threadWidth ?? threadWidthRef.current,
        maximized: patch?.maximized ?? maximizedRef.current,
        activeConvId: patch?.activeConvId ?? activeConvIdRef.current,
        updatedAt: Date.now(),
      };
      try {
        const serialized = JSON.stringify(next);
        window.localStorage.setItem(personalLayoutStorageKey, serialized);
        window.localStorage.setItem('mos_chat_personal_layout_v2_global', serialized);
        window.localStorage.setItem('mos_chat_thread_width_v1', String(next.threadWidth));
      } catch {
        // ignore storage quota error
      }
    },
    [personalLayoutStorageKey]
  );

  // Sync layout when personalLayoutStorageKey resolves to a specific user without ever overwriting stored values
  useEffect(() => {
    const stored = readStoredPersonalLayout(personalLayoutStorageKey);
    setPanelWidth(stored.panelWidth);
    setSidebarWidth(stored.sidebarWidth);
    setThreadWidth(stored.threadWidth);
    setMaximized(stored.maximized);
    if (stored.activeConvId) {
      setActiveConvId(stored.activeConvId);
    }
  }, [personalLayoutStorageKey, readStoredPersonalLayout]);

  // Persist activeConvId when user switches conversations
  useEffect(() => {
    persistPersonalLayout({ activeConvId });
  }, [activeConvId, persistPersonalLayout]);

  // Interactive drag-resize handler for main chat panel (left edge) and conversation sidebar divider
  useEffect(() => {
    if (!isResizingTarget) return;

    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = isResizingTarget === 'panel' ? 'ew-resize' : 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingTarget === 'panel') {
        const maxAllowed = Math.max(520, window.innerWidth - 56);
        const nextWidth = Math.max(520, Math.min(maxAllowed, window.innerWidth - e.clientX));
        const rounded = Math.round(nextWidth);
        panelWidthRef.current = rounded;
        setPanelWidth(rounded);
        persistPersonalLayout({ panelWidth: rounded, maximized: false });
      } else if (isResizingTarget === 'sidebar') {
        const effectivePanelWidth = maximizedRef.current
          ? Math.max(520, window.innerWidth - 224)
          : panelWidthRef.current;
        const panelLeftEdge = window.innerWidth - effectivePanelWidth;
        const maxSidebarAllowed = Math.min(460, Math.max(190, effectivePanelWidth - 320));
        const nextSidebarWidth = Math.max(190, Math.min(maxSidebarAllowed, e.clientX - panelLeftEdge));
        const rounded = Math.round(nextSidebarWidth);
        sidebarWidthRef.current = rounded;
        setSidebarWidth(rounded);
        persistPersonalLayout({ sidebarWidth: rounded });
      } else if (isResizingTarget === 'thread') {
        const effectivePanelWidth = maximizedRef.current
          ? Math.max(520, window.innerWidth - 224)
          : panelWidthRef.current;
        const maxThreadAllowed = Math.min(850, Math.max(340, effectivePanelWidth - sidebarWidthRef.current - 320));
        const nextThreadWidth = Math.max(300, Math.min(maxThreadAllowed, window.innerWidth - e.clientX));
        const rounded = Math.round(nextThreadWidth);
        threadWidthRef.current = rounded;
        setThreadWidth(rounded);
        persistPersonalLayout({ threadWidth: rounded });
      }
    };

    const handleMouseUp = () => {
      persistPersonalLayout();
      setIsResizingTarget(null);
      justFinishedResizingRef.current = true;
      window.setTimeout(() => {
        justFinishedResizingRef.current = false;
      }, 150);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingTarget, persistPersonalLayout]);

  return {
    openRef,
    ensurePortalOpen,
    personalLayoutStorageKey,
    readStoredPersonalLayout,
    activeConvId,
    setActiveConvId,
    activeConvIdRef,
    activeSubtab,
    setActiveSubtab,
    pinnedBannerIndex,
    setPinnedBannerIndex,
    sidebarFilter,
    setSidebarFilter,
    searchQuery,
    setSearchQuery,
    maximized,
    setMaximized,
    maximizedRef,
    panelWidth,
    setPanelWidth,
    panelWidthRef,
    sidebarWidth,
    setSidebarWidth,
    sidebarWidthRef,
    threadWidth,
    setThreadWidth,
    threadWidthRef,
    isResizingTarget,
    setIsResizingTarget,
    hoverResizeHandle,
    setHoverResizeHandle,
    justFinishedResizingRef,
    presence,
    setPresence,
    isMobile,
    mobileActiveView,
    setMobileActiveView,
    mobileActionOpen,
    setMobileActionOpen,
    mobileActiveMsgId,
    setMobileActiveMsgId,
    heartFlyMsgId,
    setHeartFlyMsgId,
    lastTapRef,
    persistPersonalLayout,
  };
}
