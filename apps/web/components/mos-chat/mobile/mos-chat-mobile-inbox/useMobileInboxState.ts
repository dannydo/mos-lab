'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MosChatConversation, MosChatStaffMember } from '@mos-lab/shared';
import { useTheme } from '../../../../context/ThemeContext';
import { useMosChat } from '../../context/MosChatContext';
import { filterAndSortInboxConversations, filterColleagues, triggerHapticFeedback } from './inboxHelpers';
import type { NewDmDeptFilter } from './inboxTypes';

interface UseMobileInboxStateOptions {
  controlledNewDmModalOpen?: boolean;
  onNewDmModalOpenChange?: (open: boolean) => void;
}

export function useMobileInboxState({ controlledNewDmModalOpen, onNewDmModalOpenChange }: UseMobileInboxStateOptions) {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';

  const {
    conversations,
    activeConvId,
    setActiveConvId,
    sidebarFilter,
    setSidebarFilter,
    searchQuery,
    setSearchQuery,
    setMobileView,
    staffDirectory,
    currentUser,
    startDirectMessage,
    pinnedConvIds,
    togglePinConversation,
    markConversationAsRead,
  } = useMosChat();

  const [internalNewDmModalOpen, setInternalNewDmModalOpen] = useState<boolean>(false);
  const newDmModalOpen = controlledNewDmModalOpen ?? internalNewDmModalOpen;

  const setNewDmModalOpen = useCallback(
    (next: boolean) => {
      onNewDmModalOpenChange?.(next);
      if (controlledNewDmModalOpen === undefined) {
        setInternalNewDmModalOpen(next);
      }
    },
    [controlledNewDmModalOpen, onNewDmModalOpenChange]
  );

  const [modalSearchQuery, setModalSearchQuery] = useState<string>('');
  const [modalDeptFilter, setModalDeptFilter] = useState<NewDmDeptFilter>('ALL');
  const [convActionTarget, setConvActionTarget] = useState<MosChatConversation | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  const filteredConversations = useMemo(
    () => filterAndSortInboxConversations(conversations, searchQuery, sidebarFilter, pinnedConvIds),
    [conversations, searchQuery, sidebarFilter, pinnedConvIds]
  );

  const matchedStaffFromSearch = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filterColleagues(staffDirectory, currentUser, searchQuery, 'ALL');
  }, [staffDirectory, searchQuery, currentUser]);

  const modalStaffList = useMemo(
    () => filterColleagues(staffDirectory, currentUser, modalSearchQuery, modalDeptFilter),
    [staffDirectory, modalDeptFilter, modalSearchQuery, currentUser]
  );

  const handleSelectConv = useCallback(
    (convId: string) => {
      triggerHapticFeedback(10);
      setActiveConvId(convId);
      setMobileView('room');
    },
    [setActiveConvId, setMobileView]
  );

  const handleStartDmWithStaff = useCallback(
    async (staff: MosChatStaffMember) => {
      triggerHapticFeedback(15);
      setNewDmModalOpen(false);
      setModalSearchQuery('');
      setSearchQuery('');
      await startDirectMessage(staff);
    },
    [setNewDmModalOpen, setSearchQuery, startDirectMessage]
  );

  const handleCloseNewDmModal = useCallback(() => {
    setNewDmModalOpen(false);
    setModalSearchQuery('');
  }, [setNewDmModalOpen]);

  const handleTouchStartConv = useCallback(
    (conv: MosChatConversation) => {
      clearLongPressTimer();
      longPressTimerRef.current = setTimeout(() => {
        triggerHapticFeedback(25);
        setConvActionTarget(conv);
      }, 450);
    },
    [clearLongPressTimer]
  );

  return {
    isDark,
    activeConvId,
    sidebarFilter,
    setSidebarFilter,
    searchQuery,
    setSearchQuery,
    staffDirectory,
    pinnedConvIds,
    togglePinConversation,
    markConversationAsRead,
    newDmModalOpen,
    setNewDmModalOpen,
    modalSearchQuery,
    setModalSearchQuery,
    modalDeptFilter,
    setModalDeptFilter,
    convActionTarget,
    setConvActionTarget,
    filteredConversations,
    matchedStaffFromSearch,
    modalStaffList,
    handleSelectConv,
    handleStartDmWithStaff,
    handleCloseNewDmModal,
    handleTouchStartConv,
    clearLongPressTimer,
  };
}
