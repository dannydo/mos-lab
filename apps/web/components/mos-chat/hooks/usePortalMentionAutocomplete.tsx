'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GlobalToken } from 'antd';
import {
  removeVietnameseTones,
  type MosChatConversation,
  type MosChatStaffMember,
  type SafeAny,
} from '@mos-lab/shared';
import { MosChatRichText } from '../MosChatRichText';
import type { RichEditorViewMode } from '../MosChatRichEditorModal';
import { MosChatFormatToolbar } from '../components/MosChatFormatToolbar';
import { MosChatMentionDropdown, type PortalMentionItem } from '../components/MosChatMentionDropdown';
import { applyChatComposerFormat, type ChatComposerFormatType } from '../utils/chat-format-toolbar';

export interface UsePortalMentionAutocompleteParams {
  isDark: boolean;
  token: GlobalToken;
  currentUser?: SafeAny;
  currentUserStaffMember: MosChatStaffMember;
  canUseAiCopilot: boolean;
  conversations: MosChatConversation[];
  activeConversation?: MosChatConversation;
  staffDirectory: MosChatStaffMember[];
  composerInputRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  threadInputRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  composerTextRef: React.MutableRefObject<string>;
  threadTextRef: React.MutableRefObject<string>;
  composerCursorPosRef: React.MutableRefObject<number>;
  threadCursorPosRef: React.MutableRefObject<number>;
  setComposerCursorPos: (v: React.SetStateAction<number>) => void;
  setThreadCursorPos: (v: React.SetStateAction<number>) => void;
  updateComposerText: (val: string) => void;
  updateThreadInput: (val: string) => void;
  isComposingRef: React.MutableRefObject<boolean>;
  lastCompositionEndMsRef: React.MutableRefObject<number>;
  getAvatarInitials: (name?: string | null, fallback?: string | null) => string;
}

export function usePortalMentionAutocomplete({
  isDark,
  token,
  currentUser,
  currentUserStaffMember,
  canUseAiCopilot,
  conversations,
  activeConversation,
  staffDirectory,
  composerInputRef,
  threadInputRef,
  composerTextRef,
  threadTextRef,
  composerCursorPosRef,
  threadCursorPosRef,
  setComposerCursorPos,
  setThreadCursorPos,
  updateComposerText,
  updateThreadInput,
  isComposingRef,
  lastCompositionEndMsRef,
  getAvatarInitials,
}: UsePortalMentionAutocompleteParams) {
  const [formatBarOpenMain, setFormatBarOpenMain] = useState(true);
  const [formatBarOpenThread, setFormatBarOpenThread] = useState(false);

  const [richEditorModalState, setRichEditorModalState] = useState<{
    open: boolean;
    scope: 'main' | 'thread';
    title: string;
    initialMode?: RichEditorViewMode;
  }>({
    open: false,
    scope: 'main',
    title: 'Soạn thảo phong phú (CKEditor)',
    initialMode: 'split',
  });
  const [isPreviewModeMain, setIsPreviewModeMain] = useState(false);
  const [isPreviewModeThread, setIsPreviewModeThread] = useState(false);
  const [inlineTextColor, setInlineTextColor] = useState('#f59e0b');
  const [colorPopoverScope, setColorPopoverScope] = useState<'main' | 'thread' | null>(null);

  const [mentionState, setMentionState] = useState<{
    open: boolean;
    scope: 'main' | 'thread';
    query: string;
    atIndex: number;
    cursorIndex: number;
    highlightedIndex: number;
  }>({
    open: false,
    scope: 'main',
    query: '',
    atIndex: -1,
    cursorIndex: -1,
    highlightedIndex: 0,
  });
  const mentionStateRef = useRef(mentionState);
  mentionStateRef.current = mentionState;

  const allSpaceNicknames = useMemo(() => {
    const map: Record<string, string> = {};
    conversations.forEach((c) => {
      if (c.memberNicknames) {
        Object.assign(map, c.memberNicknames);
      }
    });
    if (activeConversation?.memberNicknames) {
      Object.assign(map, activeConversation.memberNicknames);
    }
    return map;
  }, [conversations, activeConversation]);

  const renderRichTextMessage = useCallback(
    (
      rawText?: string | null,
      _isMine = false,
      opts?: { onQuoteClick?: (senderName: string, quotedContent: string) => void }
    ): React.ReactNode => {
      if (!rawText) return null;
      return (
        <MosChatRichText
          content={rawText}
          isMe={_isMine}
          isDark={isDark}
          staffDirectory={staffDirectory}
          memberNicknames={allSpaceNicknames}
          currentUser={currentUser}
          onQuoteClick={opts?.onQuoteClick}
        />
      );
    },
    [isDark, staffDirectory, allSpaceNicknames, currentUser]
  );

  const handleApplyFormat = useCallback(
    (formatType: ChatComposerFormatType, scope: 'main' | 'thread', customColorHex?: string) => {
      applyChatComposerFormat({
        formatType,
        textarea: scope === 'main' ? composerInputRef.current : threadInputRef.current,
        currentValue: scope === 'main' ? composerTextRef.current : threadTextRef.current,
        inlineTextColor,
        customColorHex,
        setValue: scope === 'main' ? updateComposerText : updateThreadInput,
        setCursor: scope === 'main' ? setComposerCursorPos : setThreadCursorPos,
      });
    },
    [
      composerInputRef,
      threadInputRef,
      composerTextRef,
      threadTextRef,
      inlineTextColor,
      setComposerCursorPos,
      setThreadCursorPos,
      updateComposerText,
      updateThreadInput,
    ]
  );

  const renderAppleNotesFormatToolbar = useCallback(
    (scope: 'main' | 'thread', variant: 'inline' | 'floating' = 'floating') => {
      const isMain = scope === 'main';
      return (
        <MosChatFormatToolbar
          scope={scope}
          variant={variant}
          isDark={isDark}
          token={token}
          currentText={isMain ? composerTextRef.current : threadTextRef.current}
          cursorPos={isMain ? composerCursorPosRef.current : threadCursorPosRef.current}
          isPreview={isMain ? isPreviewModeMain : isPreviewModeThread}
          togglePreview={() => {
            if (isMain) setIsPreviewModeMain((prev) => !prev);
            else setIsPreviewModeThread((prev) => !prev);
          }}
          closeToolbar={() => {
            if (isMain) setFormatBarOpenMain(false);
            else setFormatBarOpenThread(false);
          }}
          colorPopoverScope={colorPopoverScope}
          setColorPopoverScope={setColorPopoverScope}
          inlineTextColor={inlineTextColor}
          setInlineTextColor={setInlineTextColor}
          handleApplyFormat={handleApplyFormat}
          setRichEditorModalState={setRichEditorModalState}
        />
      );
    },
    [
      handleApplyFormat,
      isDark,
      isPreviewModeMain,
      isPreviewModeThread,
      colorPopoverScope,
      inlineTextColor,
      token,
      composerTextRef,
      threadTextRef,
      composerCursorPosRef,
      threadCursorPosRef,
    ]
  );

  const getRoleBadgeInfo = useCallback((role?: string | null): { label: string; color: string } => {
    const normalized = String(role || '')
      .toLowerCase()
      .trim();
    if (normalized === 'super_admin') return { label: 'Super Admin', color: '#d4a84b' };
    if (normalized === 'admin') return { label: 'Admin', color: '#a855f7' };
    if (normalized === 'telesales' || normalized === 'booker') return { label: 'Telesales', color: '#0ea5e9' };
    if (normalized === 'cc' || normalized === 'consultant') return { label: 'Tư Vấn (CC)', color: '#10b981' };
    if (normalized === 'technician' || normalized === 'ktv' || normalized === 'cv') {
      return { label: 'Chuyên Viên (CV)', color: '#14b8a6' };
    }
    return { label: role ? role.toUpperCase() : 'Nhân sự', color: '#3b82f6' };
  }, []);

  const mentionCandidates = useMemo<PortalMentionItem[]>(() => {
    const list: PortalMentionItem[] = [];

    if (activeConversation?.type === 'space') {
      list.push({
        id: 'all',
        type: 'special',
        tagText: 'All',
        displayName: 'All (Tất cả mọi người)',
        role: 'Toàn nhóm',
        color: '#3b82f6',
        avatarText: '👥',
      });
    }

    if (canUseAiCopilot) {
      list.push({
        id: 'mai',
        type: 'special',
        tagText: 'MAI',
        displayName: 'MAI (mOS AI)',
        role: 'Trợ lý AI',
        color: '#8b5cf6',
        avatarText: '🤖',
      });
    }

    let roomStaff: MosChatStaffMember[] = [];
    if (activeConversation?.type === 'space') {
      if (Array.isArray(activeConversation.memberIds) && activeConversation.memberIds.length > 0) {
        const mSet = new Set(activeConversation.memberIds.map(Number));
        roomStaff = staffDirectory.filter((s) => mSet.has(s.id));
      } else if (Array.isArray(activeConversation.members) && activeConversation.members.length > 0) {
        roomStaff = activeConversation.members;
      } else {
        roomStaff = staffDirectory;
      }
    } else if (activeConversation?.type === 'dm') {
      const peerId = Number(activeConversation.participantStaffId);
      if (peerId > 0) {
        const peer = staffDirectory.find((s) => s.id === peerId);
        if (peer) roomStaff = [peer];
      } else if (Array.isArray(activeConversation.memberIds)) {
        const myId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
        const otherId = activeConversation.memberIds.find((id) => Number(id) !== myId);
        if (otherId) {
          const peer = staffDirectory.find((s) => s.id === Number(otherId));
          if (peer) roomStaff = [peer];
        }
      }
    } else {
      roomStaff = staffDirectory;
    }

    for (const s of roomStaff) {
      if (!s || !s.id) continue;
      if (list.some((item) => item.id === `staff-${s.id}`)) continue;
      const realName = s.displayName || s.username || `Nhân sự #${s.id}`;
      const badge = getRoleBadgeInfo(s.role);
      const nick =
        activeConversation?.type === 'space' && activeConversation.memberNicknames
          ? activeConversation.memberNicknames[String(s.id)]?.trim()
          : undefined;

      const tagText = nick || realName;
      const displayName = nick ? `${nick} (${realName})` : realName;

      list.push({
        id: `staff-${s.id}`,
        type: 'staff',
        tagText,
        displayName,
        realName,
        nickname: nick,
        username: s.username,
        role: badge.label,
        avatarUrl: s.avatarUrl || undefined,
        avatarText: getAvatarInitials(tagText, s.username),
        color: badge.color,
        isOnline: s.isOnline,
      });
    }

    return list;
  }, [
    activeConversation,
    canUseAiCopilot,
    currentUserStaffMember.id,
    currentUser?.id,
    getAvatarInitials,
    getRoleBadgeInfo,
    staffDirectory,
  ]);

  const filteredMentions = useMemo(() => {
    if (!mentionState.open) return [];
    const rawQ = mentionState.query.trim().toLowerCase();
    const q = removeVietnameseTones(rawQ);
    if (!q) return mentionCandidates.slice(0, 10);

    const qTokens = q.split(/\s+/).filter(Boolean);

    return mentionCandidates
      .filter((item) => {
        const tagNorm = removeVietnameseTones(item.tagText.toLowerCase());
        const nameNorm = removeVietnameseTones(item.displayName.toLowerCase());
        const realNorm = item.realName ? removeVietnameseTones(item.realName.toLowerCase()) : '';
        const nickNorm = item.nickname ? removeVietnameseTones(item.nickname.toLowerCase()) : '';
        const unameNorm = item.username ? removeVietnameseTones(item.username.toLowerCase()) : '';
        const roleNorm = item.role ? removeVietnameseTones(item.role.toLowerCase()) : '';

        if (
          tagNorm.includes(q) ||
          nameNorm.includes(q) ||
          realNorm.includes(q) ||
          nickNorm.includes(q) ||
          unameNorm.includes(q) ||
          roleNorm.includes(q)
        ) {
          return true;
        }

        const combined = `${tagNorm} ${nameNorm} ${realNorm} ${nickNorm} ${unameNorm} ${roleNorm}`;
        return qTokens.length > 0 && qTokens.every((tok) => combined.includes(tok));
      })
      .slice(0, 10);
  }, [mentionState.open, mentionState.query, mentionCandidates]);

  const checkForMentionTrigger = useCallback((text: string, cursor: number, scope: 'main' | 'thread') => {
    const textBeforeCursor = text.slice(0, cursor);
    const match = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9_\u00C0-\u1EF9\s]*)$/u);
    if (match && match.index !== undefined) {
      const rawMatch = match[0];
      const atOffset = rawMatch.indexOf('@');
      const atIndex = match.index + atOffset;
      const query = match[1];

      if (query.includes('\n') || query.length > 25 || (query.match(/\s/g) || []).length > 2) {
        setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
        return;
      }

      const prev = mentionStateRef.current;
      if (prev.open && prev.scope === scope && prev.query === query && prev.atIndex === atIndex) {
        return;
      }

      setMentionState({
        open: true,
        scope,
        query,
        atIndex,
        cursorIndex: cursor,
        highlightedIndex: 0,
      });
      return;
    }
    setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
  }, []);

  const handleSelectMention = useCallback(
    (item: PortalMentionItem, scope: 'main' | 'thread') => {
      const textarea = scope === 'main' ? composerInputRef.current : threadInputRef.current;
      const currentVal =
        (textarea?.value ?? (scope === 'main' ? composerTextRef.current : threadTextRef.current)) || '';
      if (!textarea) return;

      const atIdx = mentionState.atIndex >= 0 ? mentionState.atIndex : currentVal.lastIndexOf('@');
      const cursor = Math.max(textarea.selectionEnd ?? currentVal.length, atIdx + 1);
      const before = currentVal.slice(0, Math.max(0, atIdx));
      const after = currentVal.slice(cursor);
      const inserted = `@${item.tagText} `;
      const nextVal = `${before}${inserted}${after}`;

      textarea.value = nextVal;
      isComposingRef.current = false;
      lastCompositionEndMsRef.current = Date.now();

      if (scope === 'main') {
        updateComposerText(nextVal);
      } else {
        updateThreadInput(nextVal);
      }

      setMentionState({
        open: false,
        scope,
        query: '',
        atIndex: -1,
        cursorIndex: -1,
        highlightedIndex: 0,
      });

      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = before.length + inserted.length;
        textarea.setSelectionRange(newPos, newPos);
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, scope === 'main' ? 180 : 140)}px`;
      });
    },
    [
      composerInputRef,
      threadInputRef,
      composerTextRef,
      threadTextRef,
      isComposingRef,
      lastCompositionEndMsRef,
      mentionState.atIndex,
      updateComposerText,
      updateThreadInput,
    ]
  );

  const handleMentionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, scope: 'main' | 'thread'): boolean => {
      if (!mentionState.open || mentionState.scope !== scope || filteredMentions.length === 0) {
        return false;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          highlightedIndex: (prev.highlightedIndex + 1) % filteredMentions.length,
        }));
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionState((prev) => ({
          ...prev,
          highlightedIndex: (prev.highlightedIndex - 1 + filteredMentions.length) % filteredMentions.length,
        }));
        return true;
      }
      if (e.key === 'Tab' || e.code === 'Tab' || e.keyCode === 9) {
        e.preventDefault();
        e.stopPropagation();
        isComposingRef.current = false;
        const targetItem = filteredMentions[mentionState.highlightedIndex] || filteredMentions[0];
        if (targetItem) {
          handleSelectMention(targetItem, scope);
        }
        return true;
      }
      if (e.key === 'Enter') {
        if (e.nativeEvent.isComposing || isComposingRef.current || e.keyCode === 229) {
          return false;
        }
        e.preventDefault();
        e.stopPropagation();
        const targetItem = filteredMentions[mentionState.highlightedIndex] || filteredMentions[0];
        if (targetItem) {
          handleSelectMention(targetItem, scope);
        }
        return true;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionState((prev) => ({ ...prev, open: false }));
        return true;
      }
      return false;
    },
    [
      filteredMentions,
      handleSelectMention,
      isComposingRef,
      mentionState.highlightedIndex,
      mentionState.open,
      mentionState.scope,
    ]
  );

  useEffect(() => {
    if (!mentionState.open) return;
    const el = document.getElementById(`mention-item-${mentionState.highlightedIndex}`);
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [mentionState.highlightedIndex, mentionState.open]);

  useEffect(() => {
    if (!mentionState.open) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('.mos-chat-mention-dropdown')) return;
      if (target === composerInputRef.current || target === threadInputRef.current) return;
      setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [composerInputRef, mentionState.open, threadInputRef]);

  const renderMentionAutocompleteDropdown = useCallback(
    (scope: 'main' | 'thread') => (
      <MosChatMentionDropdown
        scope={scope}
        open={mentionState.open}
        mentionScope={mentionState.scope}
        filteredMentions={filteredMentions}
        highlightedIndex={mentionState.highlightedIndex}
        isDark={isDark}
        token={token}
        onHighlightIndex={(idx) => setMentionState((prev) => ({ ...prev, highlightedIndex: idx }))}
        onSelectMention={handleSelectMention}
      />
    ),
    [
      filteredMentions,
      handleSelectMention,
      isDark,
      mentionState.highlightedIndex,
      mentionState.open,
      mentionState.scope,
      token,
    ]
  );

  const closeMentionDropdown = useCallback(() => {
    setMentionState((prev) => (prev.open ? { ...prev, open: false } : prev));
  }, []);

  return {
    formatBarOpenMain,
    setFormatBarOpenMain,
    formatBarOpenThread,
    setFormatBarOpenThread,
    richEditorModalState,
    setRichEditorModalState,
    isPreviewModeMain,
    setIsPreviewModeMain,
    isPreviewModeThread,
    setIsPreviewModeThread,
    inlineTextColor,
    setInlineTextColor,
    colorPopoverScope,
    setColorPopoverScope,
    mentionState,
    setMentionState,
    mentionStateRef,
    allSpaceNicknames,
    renderRichTextMessage,
    handleApplyFormat,
    renderAppleNotesFormatToolbar,
    checkForMentionTrigger,
    handleSelectMention,
    handleMentionKeyDown,
    renderMentionAutocompleteDropdown,
    closeMentionDropdown,
  };
}
