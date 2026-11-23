'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message as antdMessage } from 'antd';
import type { ParsedGoogleWorkspaceLink } from '@mos-lab/shared';
import { openGoogleWorkspaceReader, useGoogleWorkspacePreview } from '../../utils/google-workspace-bridge';
import {
  buildSheetPreviewGrid,
  buildWorkspaceAiPrompt,
  getWorkspaceCardTheme,
  getWorkspaceDefaultTitle,
} from './workspaceCardHelpers';

export interface UseGoogleWorkspaceCardStateParams {
  link: ParsedGoogleWorkspaceLink;
  conversationId?: string;
  messageId?: string;
  isDark: boolean;
  compact: boolean;
}

export function useGoogleWorkspaceCardState({
  link,
  conversationId,
  messageId,
  isDark,
  compact,
}: UseGoogleWorkspaceCardStateParams) {
  const [selectedGid, setSelectedGid] = useState<string | null | undefined>(link.gid);
  const [copiedBotEmail, setCopiedBotEmail] = useState(false);
  const [showInlineEmbed, setShowInlineEmbed] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  const { data, loading, error, reload } = useGoogleWorkspacePreview(link.rawUrl, {
    gid: selectedGid,
    range: link.range,
    conversationId,
    messageId,
    enabled: true,
  });

  const isSheet = link.kind === 'spreadsheet';
  const isCanva = link.kind === 'canva';
  const effectiveRange = data?.parsedRange || link.parsedRange || null;
  const effectiveRangeLabel = data?.requestedRange || link.range || effectiveRange?.label || null;
  const displayTitle = data?.title || getWorkspaceDefaultTitle(isSheet, isCanva);
  const accessStatus = data?.accessStatus;

  const themeClasses = useMemo(() => getWorkspaceCardTheme(isSheet, isCanva, isDark), [isSheet, isCanva, isDark]);

  const previewGrid = useMemo(() => buildSheetPreviewGrid(data, isSheet, compact), [data, isSheet, compact]);

  const handleCopyBotEmail = useCallback(async (email: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(email);
      }
      setCopiedBotEmail(true);
      antdMessage.success(`Đã sao chép email mOS Bot: ${email}`);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopiedBotEmail(false), 2500);
    } catch {
      antdMessage.error('Không thể sao chép email vào clipboard');
    }
  }, []);

  const handleOpenReader = useCallback(
    (initialModeOverride?: 'fast' | 'embed') => {
      openGoogleWorkspaceReader({
        url: link.rawUrl,
        gid: selectedGid,
        range: link.range,
        conversationId,
        messageId,
        initialMode: initialModeOverride || (isCanva ? 'embed' : 'fast'),
      });
    },
    [link, selectedGid, conversationId, messageId, isCanva]
  );

  const handleAskAi = useCallback(() => {
    openGoogleWorkspaceReader({
      url: link.rawUrl,
      gid: selectedGid,
      range: link.range,
      conversationId,
      messageId,
      initialMode: isCanva ? 'embed' : 'fast',
      openAiBar: true,
      initialAiPrompt: buildWorkspaceAiPrompt({
        isSheet,
        isCanva,
        activeTabTitle: data?.activeTab?.title,
        effectiveRangeLabel,
      }),
    });
  }, [link, selectedGid, conversationId, messageId, isCanva, isSheet, data, effectiveRangeLabel]);

  const handleToggleInlineEmbed = useCallback(() => {
    setShowInlineEmbed((prev) => !prev);
  }, []);

  return {
    selectedGid,
    setSelectedGid,
    copiedBotEmail,
    showInlineEmbed,
    data,
    loading,
    error,
    reload,
    isSheet,
    isCanva,
    effectiveRange,
    effectiveRangeLabel,
    displayTitle,
    accessStatus,
    themeClasses,
    previewGrid,
    handleCopyBotEmail,
    handleOpenReader,
    handleAskAi,
    handleToggleInlineEmbed,
  };
}
