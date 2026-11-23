'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message as antdMessage } from 'antd';
import { columnIndexToLetter, parseGoogleWorkspaceUrl } from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  useGoogleWorkspaceOpenListener,
  useGoogleWorkspacePreview,
  type OpenGoogleWorkspaceReaderPayload,
} from '../../utils/google-workspace-bridge';
import {
  DEFAULT_GW_DRAWER_WIDTH,
  MAX_FAST_GRID_COLS,
  clampGwDrawerWidth,
  clearStoredGwDrawerSession,
  getMaxAllowedGwDrawerWidth,
  readStoredGwDrawerSession,
  readStoredGwDrawerWidth,
  sanitizePayloadForStorage,
  writeStoredGwDrawerSession,
  writeStoredGwDrawerWidth,
} from './gwDrawerUtils';

interface UseGwDrawerControllerParams {
  isMobile: boolean;
  activeConversationId?: string;
  portalOpen: boolean;
  onEnsureContainerWidth?: (desiredDrawerWidth: number) => void;
}

export interface GwSheetGridData {
  colCount: number;
  colLetters: string[];
  totalRows: number;
  visibleRows: Array<{ rowNumber: number; cells: string[] }>;
  truncated: boolean;
}

export function useGwDrawerController({
  isMobile,
  activeConversationId,
  portalOpen,
  onEnsureContainerWidth,
}: UseGwDrawerControllerParams) {
  const [viewportWidth, setViewportWidth] = useState<number>(() =>
    typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 1920
  );
  const [open, setOpen] = useState<boolean>(() => Boolean(readStoredGwDrawerSession()?.open));
  const [payload, setPayload] = useState<OpenGoogleWorkspaceReaderPayload | null>(
    () => readStoredGwDrawerSession()?.payload ?? null
  );
  const [readerMode, setReaderMode] = useState<'fast' | 'embed'>(
    () => readStoredGwDrawerSession()?.readerMode ?? 'fast'
  );
  const [drawerWidth, setDrawerWidth] = useState<number>(() => readStoredGwDrawerWidth());
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [hoverResizeHandle, setHoverResizeHandle] = useState<boolean>(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');
  const [selectedGid, setSelectedGid] = useState<string | null | undefined>(() => {
    const stored = readStoredGwDrawerSession();
    if (!stored?.open) return undefined;
    if (stored.selectedGid !== undefined && stored.selectedGid !== null && stored.selectedGid !== '') {
      return stored.selectedGid;
    }
    return stored.payload?.gid ?? (stored.payload?.url ? parseGoogleWorkspaceUrl(stored.payload.url)?.gid : undefined);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ address: string; value: string } | null>(null);
  const [copiedBotEmail, setCopiedBotEmail] = useState(false);

  // Built-in AI Quick Bar state
  const [aiBarOpen, setAiBarOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiSessionId, setAiSessionId] = useState<string | undefined>(undefined);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const targetCellRef = useRef<HTMLTableCellElement | null>(null);
  const docBodyRef = useRef<HTMLDivElement | null>(null);
  const gridScrollRef = useRef<HTMLDivElement | null>(null);
  const lastAutoScrolledKeyRef = useRef<string>('');
  const drawerWidthRef = useRef<number>(drawerWidth);
  const previousStandardWidthRef = useRef<number>(DEFAULT_GW_DRAWER_WIDTH);
  const dragOriginRef = useRef<{ startX: number; startWidth: number }>({
    startX: 0,
    startWidth: drawerWidth,
  });
  const activePointerIdRef = useRef<number | null>(null);
  const onEnsureContainerWidthRef = useRef(onEnsureContainerWidth);

  useEffect(() => {
    onEnsureContainerWidthRef.current = onEnsureContainerWidth;
  }, [onEnsureContainerWidth]);

  useEffect(() => {
    drawerWidthRef.current = drawerWidth;
  }, [drawerWidth]);

  // Persist open document / active tab / reader mode so F5 keeps the reader intact
  useEffect(() => {
    if (!open || !payload?.url) {
      clearStoredGwDrawerSession();
      return;
    }
    writeStoredGwDrawerSession({
      open: true,
      payload: sanitizePayloadForStorage(payload),
      selectedGid: selectedGid ?? null,
      readerMode,
      updatedAt: Date.now(),
    });
  }, [open, payload, selectedGid, readerMode]);

  // Keep docked parent container wide enough when drawer expands
  useEffect(() => {
    if (!open || !portalOpen || isMobile) return;
    onEnsureContainerWidthRef.current?.(drawerWidth);
  }, [open, portalOpen, isMobile, drawerWidth]);

  // Re-clamp width smoothly when viewport resizes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleWindowResize = () => {
      const nextVw = window.innerWidth > 0 ? window.innerWidth : 1920;
      setViewportWidth(nextVw);
      const clamped = clampGwDrawerWidth(drawerWidthRef.current, nextVw);
      if (clamped !== drawerWidthRef.current) {
        drawerWidthRef.current = clamped;
        setDrawerWidth(clamped);
        writeStoredGwDrawerWidth(clamped);
      }
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  // Drag-to-resize mouse/pointer tracking on left edge
  useEffect(() => {
    if (!isResizing || typeof window === 'undefined') return;

    const prevCursor = document.body.style.cursor;
    const bodyStyle = document.body.style as CSSStyleDeclaration & { webkitUserSelect?: string };
    const prevWebkitUserSelect = bodyStyle.webkitUserSelect ?? '';
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    bodyStyle.webkitUserSelect = 'none';
    document.body.style.userSelect = 'none';

    const applyClientX = (clientX: number) => {
      const currentVw = window.innerWidth > 0 ? window.innerWidth : 1920;
      const { startX, startWidth } = dragOriginRef.current;
      const deltaX = startX - clientX;
      const nextWidth = clampGwDrawerWidth(startWidth + deltaX, currentVw);
      drawerWidthRef.current = nextWidth;
      setDrawerWidth(nextWidth);
      writeStoredGwDrawerWidth(nextWidth);
      onEnsureContainerWidthRef.current?.(nextWidth);
    };

    const finishResize = () => {
      activePointerIdRef.current = null;
      writeStoredGwDrawerWidth(drawerWidthRef.current);
      setIsResizing(false);
      setLiveAnnouncement(`Khung đọc tài liệu rộng ${drawerWidthRef.current} pixel`);
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      applyClientX(moveEvent.clientX);
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (activePointerIdRef.current !== null && moveEvent.pointerId !== activePointerIdRef.current) return;
      if (moveEvent.pointerType === 'mouse') return;
      applyClientX(moveEvent.clientX);
    };

    const handlePointerDone = (endEvent: PointerEvent) => {
      if (activePointerIdRef.current !== null && endEvent.pointerId !== activePointerIdRef.current) return;
      finishResize();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', finishResize);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerDone);
    window.addEventListener('pointercancel', handlePointerDone);
    window.addEventListener('blur', finishResize);

    return () => {
      document.body.style.cursor = prevCursor;
      bodyStyle.webkitUserSelect = prevWebkitUserSelect;
      document.body.style.userSelect = prevUserSelect;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', finishResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerDone);
      window.removeEventListener('pointercancel', handlePointerDone);
      window.removeEventListener('blur', finishResize);
    };
  }, [isResizing]);

  const parsedUrl = useMemo(() => (payload?.url ? parseGoogleWorkspaceUrl(payload.url) : null), [payload]);

  const runAiQuestion = useCallback(
    async (question: string, overridePayload?: OpenGoogleWorkspaceReaderPayload | null, docTitleFallback?: string) => {
      const cleanQ = question.trim();
      const activePayload = overridePayload ?? payload;
      if (!cleanQ || !activePayload?.url) return;

      setAiBarOpen(true);
      setAiLoading(true);
      setAiError(null);
      try {
        const convId = activePayload.conversationId || activeConversationId;
        const composedMessage = `${cleanQ}\n\nLiên kết tài liệu đang mở (${docTitleFallback || 'Google Workspace'}): ${activePayload.url}`;
        const res = await apiClient.ai.sendMessage({
          sessionId: aiSessionId,
          message: composedMessage,
          scope: convId ? `mos-chat-space:${convId}` : 'mos-chat-private',
          context: {
            page: 'mos-chat-google-workspace-reader',
          },
        });
        setAiSessionId(res.sessionId);
        setAiAnswer(res.message?.content || 'AI không trả về nội dung.');
      } catch (err: unknown) {
        setAiError(err instanceof Error ? err.message : 'Không thể kết nối @AI lúc này. Vui lòng thử lại.');
      } finally {
        setAiLoading(false);
      }
    },
    [payload, activeConversationId, aiSessionId]
  );

  useGoogleWorkspaceOpenListener((nextPayload) => {
    const inferredDefaultMode = parseGoogleWorkspaceUrl(nextPayload.url)?.kind === 'canva' ? 'embed' : 'fast';
    setPayload(nextPayload);
    setOpen(true);
    setReaderMode(nextPayload.initialMode || inferredDefaultMode);
    setSelectedGid(nextPayload.gid ?? parseGoogleWorkspaceUrl(nextPayload.url)?.gid);
    setSearchQuery('');
    setSelectedCell(null);
    setAiAnswer(null);
    setAiError(null);
    setAiSessionId(undefined);
    lastAutoScrolledKeyRef.current = '';

    if (nextPayload.openAiBar || nextPayload.initialAiPrompt) {
      setAiBarOpen(true);
      if (nextPayload.initialAiPrompt) {
        setAiPrompt(nextPayload.initialAiPrompt);
        void runAiQuestion(nextPayload.initialAiPrompt, nextPayload);
      }
    } else {
      setAiBarOpen(false);
      setAiPrompt('');
    }
  });

  const initialLinkGid = payload?.gid ?? parsedUrl?.gid ?? undefined;
  const activeTabComparison = selectedGid && selectedGid !== '' ? String(selectedGid) : undefined;
  const activeRangeQuery =
    !activeTabComparison || !initialLinkGid || activeTabComparison === String(initialLinkGid)
      ? (payload?.range ?? parsedUrl?.range)
      : undefined;

  const { data, loading, error, reload } = useGoogleWorkspacePreview(payload?.url, {
    gid: selectedGid,
    range: activeRangeQuery,
    conversationId: payload?.conversationId || activeConversationId,
    messageId: payload?.messageId,
    enabled: open && portalOpen && Boolean(payload?.url),
  });

  const firstTabGid = data?.tabs?.[0]?.gid ? String(data.tabs[0].gid) : undefined;
  const isOnInitialRangeTab =
    !activeTabComparison ||
    (initialLinkGid
      ? activeTabComparison === String(initialLinkGid)
      : !firstTabGid || activeTabComparison === firstTabGid);

  const isSheet = (data?.kind || parsedUrl?.kind) === 'spreadsheet';
  const isCanva = (data?.kind || parsedUrl?.kind) === 'canva';
  const effectiveRange = isOnInitialRangeTab ? data?.parsedRange || parsedUrl?.parsedRange || null : null;
  const effectiveRangeLabel = isOnInitialRangeTab
    ? data?.requestedRange || payload?.range || parsedUrl?.range || effectiveRange?.label || null
    : null;

  const sheetGrid: GwSheetGridData | null = useMemo(() => {
    if (!isSheet || !data?.activeTab) return null;
    const tab = data.activeTab;
    const rawRows = tab.rows || [];
    const rowOffset = tab.snippetRowStart && tab.snippetRowStart > 1 && rawRows.length <= 20 ? tab.snippetRowStart : 1;
    const maxRowCols = rawRows.reduce((max, r) => Math.max(max, r.length), 0);
    const desiredCols = Math.max(
      maxRowCols,
      effectiveRange ? effectiveRange.endCol + 1 : 0,
      Math.min(tab.totalCols || 0, 26),
      5
    );
    const colCount = Math.max(1, Math.min(MAX_FAST_GRID_COLS, desiredCols));
    const colLetters = Array.from({ length: colCount }, (_, i) => columnIndexToLetter(i));
    const needle = searchQuery.trim().toLowerCase();

    const indexedRows = rawRows.map((cells, idx) => ({
      rowNumber: rowOffset + idx,
      cells,
    }));

    const visibleRows = needle
      ? indexedRows.filter((row) =>
          row.cells.some((c) =>
            String(c || '')
              .toLowerCase()
              .includes(needle)
          )
        )
      : indexedRows;

    return {
      colCount,
      colLetters,
      totalRows: indexedRows.length,
      visibleRows,
      truncated: Boolean(tab.truncated),
    };
  }, [isSheet, data, searchQuery, effectiveRange]);

  const scrollToTargetRange = useCallback(() => {
    const el = targetCellRef.current;
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }
  }, []);

  // Auto-scroll to highlighted anchor cell (e.g. D17) on open/tab load
  useEffect(() => {
    if (!open || !portalOpen || readerMode !== 'fast' || !isSheet || !data?.activeTab || !effectiveRange) return;
    const scrollKey = `${data.fileId}:${data.activeTab.gid}:${effectiveRange.label}`;
    if (lastAutoScrolledKeyRef.current === scrollKey) return;
    const anchorVal = data.activeTab.rows?.[effectiveRange.startRow - 1]?.[effectiveRange.startCol] ?? '';
    setSelectedCell({
      address: effectiveRange.anchorCell,
      value: anchorVal,
    });
    const timer = setTimeout(() => {
      scrollToTargetRange();
      lastAutoScrolledKeyRef.current = scrollKey;
    }, 120);
    return () => clearTimeout(timer);
  }, [open, portalOpen, readerMode, isSheet, data, effectiveRange, scrollToTargetRange]);

  const handleCloseDrawer = useCallback(() => {
    clearStoredGwDrawerSession();
    setIsResizing(false);
    setOpen(false);
  }, []);

  const handleToggleExpandWidth = useCallback(() => {
    const basis = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : viewportWidth;
    const wideTarget = clampGwDrawerWidth(Math.round(basis * 0.72), basis);
    const wideThreshold = Math.max(820, wideTarget - 40);
    const currentlyWide = drawerWidthRef.current >= wideThreshold;
    let nextWidth: number;
    if (currentlyWide) {
      const prevStd =
        previousStandardWidthRef.current < wideThreshold ? previousStandardWidthRef.current : DEFAULT_GW_DRAWER_WIDTH;
      nextWidth = clampGwDrawerWidth(prevStd, basis);
    } else {
      previousStandardWidthRef.current = drawerWidthRef.current;
      nextWidth = wideTarget;
    }
    drawerWidthRef.current = nextWidth;
    setDrawerWidth(nextWidth);
    writeStoredGwDrawerWidth(nextWidth);
    onEnsureContainerWidthRef.current?.(nextWidth);
    setLiveAnnouncement(`Khung đọc tài liệu rộng ${nextWidth} pixel`);
  }, [viewportWidth]);

  const handleResetDefaultWidth = useCallback(() => {
    const basis = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : viewportWidth;
    const nextWidth = clampGwDrawerWidth(DEFAULT_GW_DRAWER_WIDTH, basis);
    drawerWidthRef.current = nextWidth;
    setDrawerWidth(nextWidth);
    writeStoredGwDrawerWidth(nextWidth);
    setLiveAnnouncement(`Khung đọc tài liệu đặt lại mặc định ${nextWidth} pixel`);
  }, [viewportWidth]);

  const handleHandleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const basis = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : viewportWidth;
      const step = e.shiftKey ? 96 : 32;
      const delta = e.key === 'ArrowLeft' ? step : -step;
      const nextWidth = clampGwDrawerWidth(drawerWidthRef.current + delta, basis);
      drawerWidthRef.current = nextWidth;
      setDrawerWidth(nextWidth);
      writeStoredGwDrawerWidth(nextWidth);
      onEnsureContainerWidthRef.current?.(nextWidth);
      setLiveAnnouncement(`Khung đọc tài liệu rộng ${nextWidth} pixel`);
    },
    [viewportWidth]
  );

  const handleCopyText = async (textToCopy: string, label: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
      }
      antdMessage.success(label);
    } catch {
      antdMessage.error('Không thể sao chép vào clipboard');
    }
  };

  const handleCopyBotEmail = async (email: string) => {
    await handleCopyText(email, `Đã sao chép email mOS Bot: ${email}`);
    setCopiedBotEmail(true);
    setTimeout(() => setCopiedBotEmail(false), 2500);
  };

  const expandedPresetWidth = clampGwDrawerWidth(Math.round(viewportWidth * 0.72), viewportWidth);
  const expandedWidth = drawerWidth >= Math.max(820, expandedPresetWidth - 40);
  const maxDrawerWidth = getMaxAllowedGwDrawerWidth(viewportWidth);

  return {
    open,
    payload,
    parsedUrl,
    data,
    loading,
    error,
    reload,
    readerMode,
    setReaderMode,
    drawerWidth,
    isResizing,
    setIsResizing,
    hoverResizeHandle,
    setHoverResizeHandle,
    liveAnnouncement,
    selectedGid,
    setSelectedGid,
    searchQuery,
    setSearchQuery,
    selectedCell,
    setSelectedCell,
    copiedBotEmail,
    aiBarOpen,
    setAiBarOpen,
    aiPrompt,
    setAiPrompt,
    aiLoading,
    aiAnswer,
    aiError,
    isSheet,
    isCanva,
    effectiveRange,
    effectiveRangeLabel,
    sheetGrid,
    expandedWidth,
    maxDrawerWidth,
    targetCellRef,
    docBodyRef,
    gridScrollRef,
    drawerWidthRef,
    dragOriginRef,
    activePointerIdRef,
    runAiQuestion,
    scrollToTargetRange,
    handleCloseDrawer,
    handleToggleExpandWidth,
    handleResetDefaultWidth,
    handleHandleKeyDown,
    handleCopyText,
    handleCopyBotEmail,
  };
}
