'use client';

import React from 'react';
import { Hash, MessageSquare } from 'lucide-react';
import { InboxColleagueSearchSection } from './mos-chat-mobile-inbox/InboxColleagueSearchSection';
import { InboxConversationItem } from './mos-chat-mobile-inbox/InboxConversationItem';
import { InboxSearchAndFilterBar } from './mos-chat-mobile-inbox/InboxSearchAndFilterBar';
import { NewDmDirectoryModal } from './mos-chat-mobile-inbox/NewDmDirectoryModal';
import { ConversationActionSheet } from './mos-chat-mobile-inbox/ConversationActionSheet';
import type { MosChatMobileInboxProps } from './mos-chat-mobile-inbox/inboxTypes';
import { useMobileInboxState } from './mos-chat-mobile-inbox/useMobileInboxState';

export type { MosChatMobileInboxProps } from './mos-chat-mobile-inbox/inboxTypes';

export const MosChatMobileInbox: React.FC<MosChatMobileInboxProps> = ({
  onOpenSearchSheet,
  newDmModalOpen: controlledNewDmModalOpen,
  onNewDmModalOpenChange,
}) => {
  const {
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
  } = useMobileInboxState({
    controlledNewDmModalOpen,
    onNewDmModalOpenChange,
  });

  const hasSearchQuery = Boolean(searchQuery.trim());

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--background)] text-[var(--mos-text)] overflow-hidden select-none">
      <InboxSearchAndFilterBar
        isDark={isDark}
        searchQuery={searchQuery}
        sidebarFilter={sidebarFilter}
        onChangeSearchQuery={setSearchQuery}
        onSelectFilter={setSidebarFilter}
        onOpenSearchSheet={onOpenSearchSheet}
      />

      {/* Search Result & Conversation List */}
      <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-[var(--mos-surface-border)]">
        {hasSearchQuery && (
          <InboxColleagueSearchSection
            isDark={isDark}
            matchedStaff={matchedStaffFromSearch}
            staffDirectory={staffDirectory}
            onSelectStaff={(staff) => void handleStartDmWithStaff(staff)}
          />
        )}

        {/* Section title for conversations when searching */}
        {hasSearchQuery && filteredConversations.length > 0 && (
          <div className="px-4 py-2 bg-[var(--mos-surface)] text-[11px] font-bold uppercase tracking-wider text-[var(--mos-text-muted)] border-b border-[var(--mos-surface-border)] flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-[var(--mos-text-muted)]" />
            Kênh & Cuộc trò chuyện ({filteredConversations.length})
          </div>
        )}

        {/* Conversation List or Empty State */}
        {filteredConversations.length === 0 && (!hasSearchQuery || matchedStaffFromSearch.length === 0) ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-[var(--mos-text-muted)] mt-12">
            <MessageSquare className="w-12 h-12 text-[var(--mos-text-muted)] opacity-50 mb-3" />
            <p className="text-sm font-medium text-[var(--mos-text)]">
              Không tìm thấy cuộc trò chuyện hay đồng nghiệp nào
            </p>
            <p className="text-xs text-[var(--mos-text-muted)] mt-1">
              Thử đổi từ khóa hoặc chạm nút soạn tin nhắn ở góc trên
            </p>
          </div>
        ) : (
          filteredConversations.map((conv, index) => {
            const prevConv = index > 0 ? filteredConversations[index - 1] : null;
            return (
              <InboxConversationItem
                key={conv.id}
                conv={conv}
                prevConv={prevConv}
                isDark={isDark}
                isSelected={conv.id === activeConvId}
                isPinned={Boolean(pinnedConvIds?.has(conv.id))}
                isPrevPinned={prevConv ? Boolean(pinnedConvIds?.has(prevConv.id)) : false}
                sidebarFilter={sidebarFilter}
                staffDirectory={staffDirectory}
                onSelect={handleSelectConv}
                onTouchStart={handleTouchStartConv}
                onTouchCancelOrEnd={clearLongPressTimer}
                onOpenActionSheet={setConvActionTarget}
              />
            );
          })
        )}
      </div>

      <NewDmDirectoryModal
        open={newDmModalOpen}
        isDark={isDark}
        searchQuery={modalSearchQuery}
        deptFilter={modalDeptFilter}
        staffList={modalStaffList}
        staffDirectory={staffDirectory}
        onClose={handleCloseNewDmModal}
        onChangeSearchQuery={setModalSearchQuery}
        onChangeDeptFilter={setModalDeptFilter}
        onSelectAiCopilot={handleSelectConv}
        onSelectStaff={(staff) => void handleStartDmWithStaff(staff)}
      />

      <ConversationActionSheet
        target={convActionTarget}
        isDark={isDark}
        isPinned={Boolean(convActionTarget && pinnedConvIds?.has(convActionTarget.id))}
        staffDirectory={staffDirectory}
        onClose={() => setConvActionTarget(null)}
        onTogglePin={(convId) => void togglePinConversation(convId)}
        onMarkAsRead={(convId) => void markConversationAsRead(convId)}
        onOpenConversation={handleSelectConv}
      />
    </div>
  );
};
