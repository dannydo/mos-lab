'use client';

import React, { useState } from 'react';
import { Tooltip } from 'antd';
import { FolderKanban } from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatUserSidebarPrefs,
  MosChatChannelNotificationOverride,
  MosChatAccessConfig,
  MosChatPresenceStatus,
  SafeAny,
} from '@mos-lab/shared';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import { MosChatSidebarHeader } from './MosChatSidebarHeader';
import { MosChatSidebarSectionGroup } from './MosChatSidebarSectionGroup';

export interface MosChatSidebarSection {
  id: string;
  title: string;
  isCustom: boolean;
  items: MosChatConversation[];
  totalCount: number;
  unreadCount: number;
  collapsed: boolean;
  unreadOnly: boolean;
}

export interface MosChatSidebarProps {
  isMobile: boolean;
  mobileActiveView: 'inbox' | 'conversation' | 'thread';
  setMobileActiveView: (v: 'inbox' | 'conversation' | 'thread') => void;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
  isResizingTarget: 'sidebar' | 'panel' | 'thread' | null;
  setIsResizingTarget: (t: 'sidebar' | 'panel' | 'thread' | null) => void;
  hoverResizeHandle: 'sidebar' | 'panel' | 'thread' | null;
  setHoverResizeHandle: React.Dispatch<React.SetStateAction<'sidebar' | 'panel' | 'thread' | null>>;
  sidebarWidthRef: React.MutableRefObject<number>;
  persistPersonalLayout: (patch: Record<string, unknown>) => void;

  presence: MosChatPresenceStatus;
  setPresence: React.Dispatch<React.SetStateAction<MosChatPresenceStatus>>;
  currentUser: SafeAny;
  isDannyAccount: boolean;
  accessConfig: MosChatAccessConfig;
  userPrefs: MosChatUserSidebarPrefs;

  onOpenAccessConfigModal: () => void;
  onOpenSidebarCustomizeModal: (tab: 'sections' | 'conversations') => void;
  onOpenNewRoomModal: (type?: 'space' | 'dm') => void;
  onClose?: () => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sidebarFilter: 'all' | 'unread' | 'spaces';
  setSidebarFilter: (f: 'all' | 'unread' | 'spaces') => void;
  activeSubtab: MosChatActiveSubtab;
  setActiveSubtab: (t: MosChatActiveSubtab) => void;

  sidebarSections: MosChatSidebarSection[];
  visibleConversations: MosChatConversation[];
  activeConversation: MosChatConversation | null;
  uniqueTasks: MosChatTaskItem[];

  selectConversation: (id: string) => void;
  togglePinConversation: (id: string) => void;
  toggleManualUnreadConversation: (conv: MosChatConversation) => void;
  toggleMuteConversation: (id: string) => void;
  onChangeChannelNotificationOverride?: (convId: string, mode: MosChatChannelNotificationOverride) => void;
  moveConversationToSection: (convId: string, sectionId: string) => void;
  moveConversationOrderInSection: (
    convId: string,
    sectionId: string,
    dir: 'up' | 'down',
    items: MosChatConversation[]
  ) => void;
  reorderConversationByDragDrop: (
    dragId: string,
    targetId: string,
    sectionId: string,
    items: MosChatConversation[]
  ) => void;
  toggleCollapseSection: (secId: string) => void;
  toggleUnreadOnlySection: (secId: string) => void;
  handleMoveSectionOrder: (secId: string, dir: 'up' | 'down') => void;
  handleDeleteCustomSection: (secId: string) => void;
  handleLeaveOrJoinSpace: (conv: MosChatConversation) => Promise<void>;

  getEffectiveUnreadCount: (conv: MosChatConversation) => number;
  formatChatPreviewWithStickers: (text?: string) => string;
  isConversationParticipantOnline: (conv: MosChatConversation) => boolean;
  isMessageFromCurrentUser: (msg: MosChatMessage) => boolean;
  getMessageReadBreakdown: (
    conv: MosChatConversation,
    msg: MosChatMessage
  ) => { seenBy: SafeAny[]; unseenBy: SafeAny[] };
  renderReadStatusCheckmark: (
    seenBy: SafeAny[],
    unseenBy: SafeAny[],
    opts: { compact: boolean; scopeLabel: string }
  ) => React.ReactNode;
  renderUserAvatarNode: (opts: SafeAny) => React.ReactNode;

  setDockedConvIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleHideConversation: (conv: MosChatConversation) => void;
  setActiveConvId: (id: string) => void;
  setSpaceConfigModalOpen: (open: boolean) => void;
  setEditingSectionId: (id: string | null) => void;
  setEditingSectionName: (name: string) => void;
  setQuickCreateSectionTargetConvId: (id: string | null) => void;
  setQuickCreateSectionName: (name: string) => void;
  setQuickCreateSectionModalOpen: (open: boolean) => void;

  isDark: boolean;
  token: SafeAny;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  accentColor: string;
}

export const MosChatSidebar: React.FC<MosChatSidebarProps> = React.memo(
  ({
    isMobile,
    mobileActiveView,
    setMobileActiveView,
    sidebarWidth,
    setSidebarWidth,
    isResizingTarget,
    setIsResizingTarget,
    hoverResizeHandle,
    setHoverResizeHandle,
    sidebarWidthRef,
    persistPersonalLayout,
    presence,
    setPresence,
    currentUser,
    isDannyAccount,
    accessConfig,
    userPrefs,
    onOpenAccessConfigModal,
    onOpenSidebarCustomizeModal,
    onOpenNewRoomModal,
    onClose,
    searchQuery,
    setSearchQuery,
    sidebarFilter,
    setSidebarFilter,
    activeSubtab,
    setActiveSubtab,
    sidebarSections,
    visibleConversations,
    activeConversation,
    uniqueTasks,
    selectConversation,
    togglePinConversation,
    toggleManualUnreadConversation,
    toggleMuteConversation,
    onChangeChannelNotificationOverride,
    moveConversationToSection,
    moveConversationOrderInSection,
    reorderConversationByDragDrop,
    toggleCollapseSection,
    toggleUnreadOnlySection,
    handleMoveSectionOrder,
    handleDeleteCustomSection,
    handleLeaveOrJoinSpace,
    getEffectiveUnreadCount,
    formatChatPreviewWithStickers,
    isConversationParticipantOnline,
    isMessageFromCurrentUser,
    getMessageReadBreakdown,
    renderReadStatusCheckmark,
    renderUserAvatarNode,
    setDockedConvIds,
    toggleHideConversation,
    setActiveConvId,
    setSpaceConfigModalOpen,
    setEditingSectionId,
    setEditingSectionName,
    setQuickCreateSectionTargetConvId,
    setQuickCreateSectionName,
    setQuickCreateSectionModalOpen,
    isDark,
    token,
    surfaceBg,
    surfaceRaised,
    borderColor,
    accentColor,
  }) => {
    const [openSectionMenuId, setOpenSectionMenuId] = useState<string | null>(null);
    const [openConvMenuId, setOpenConvMenuId] = useState<string | null>(null);
    const [draggingSidebarConv, setDraggingSidebarConv] = useState<{ convId: string; sectionId: string } | null>(null);
    const [dragOverSidebarConvId, setDragOverSidebarConvId] = useState<string | null>(null);

    return (
      <div
        style={{
          position: 'relative',
          width: isMobile ? '100%' : sidebarWidth,
          borderRight: isMobile
            ? 'none'
            : `1px solid ${
                isResizingTarget === 'sidebar' || hoverResizeHandle === 'sidebar' ? accentColor : borderColor
              }`,
          display: isMobile && mobileActiveView !== 'inbox' ? 'none' : 'flex',
          flexDirection: 'column',
          background: surfaceBg,
          flexShrink: 0,
        }}
      >
        <MosChatSidebarHeader
          isMobile={isMobile}
          setMobileActiveView={setMobileActiveView}
          presence={presence}
          setPresence={setPresence}
          currentUser={currentUser}
          isDannyAccount={isDannyAccount}
          accessConfig={accessConfig}
          userPrefs={userPrefs}
          onOpenAccessConfigModal={onOpenAccessConfigModal}
          onOpenSidebarCustomizeModal={onOpenSidebarCustomizeModal}
          onOpenNewRoomModal={onOpenNewRoomModal}
          onClose={onClose}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          sidebarFilter={sidebarFilter}
          setSidebarFilter={setSidebarFilter}
          activeSubtab={activeSubtab}
          setActiveSubtab={setActiveSubtab}
          visibleConversations={visibleConversations}
          uniqueTasks={uniqueTasks}
          getEffectiveUnreadCount={getEffectiveUnreadCount}
          renderUserAvatarNode={renderUserAvatarNode}
          token={token}
          surfaceBg={surfaceBg}
          surfaceRaised={surfaceRaised}
          borderColor={borderColor}
        />

        {/* Scrollable List of Custom Sections, DIRECT MESSAGES & SPACES */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {sidebarSections.map((sec, secIdx) => (
            <MosChatSidebarSectionGroup
              key={sec.id}
              sec={sec}
              secIdx={secIdx}
              totalSections={sidebarSections.length}
              activeConversation={activeConversation}
              currentUser={currentUser}
              userPrefs={userPrefs}
              isDark={isDark}
              token={token}
              borderColor={borderColor}
              openSectionMenuId={openSectionMenuId}
              setOpenSectionMenuId={setOpenSectionMenuId}
              openConvMenuId={openConvMenuId}
              setOpenConvMenuId={setOpenConvMenuId}
              draggingSidebarConv={draggingSidebarConv}
              setDraggingSidebarConv={setDraggingSidebarConv}
              dragOverSidebarConvId={dragOverSidebarConvId}
              setDragOverSidebarConvId={setDragOverSidebarConvId}
              onOpenSidebarCustomizeModal={onOpenSidebarCustomizeModal}
              onOpenNewRoomModal={onOpenNewRoomModal}
              selectConversation={selectConversation}
              togglePinConversation={togglePinConversation}
              toggleManualUnreadConversation={toggleManualUnreadConversation}
              toggleMuteConversation={toggleMuteConversation}
              onChangeChannelNotificationOverride={onChangeChannelNotificationOverride}
              moveConversationToSection={moveConversationToSection}
              moveConversationOrderInSection={moveConversationOrderInSection}
              reorderConversationByDragDrop={reorderConversationByDragDrop}
              toggleCollapseSection={toggleCollapseSection}
              toggleUnreadOnlySection={toggleUnreadOnlySection}
              handleMoveSectionOrder={handleMoveSectionOrder}
              handleDeleteCustomSection={handleDeleteCustomSection}
              handleLeaveOrJoinSpace={handleLeaveOrJoinSpace}
              getEffectiveUnreadCount={getEffectiveUnreadCount}
              formatChatPreviewWithStickers={formatChatPreviewWithStickers}
              isConversationParticipantOnline={isConversationParticipantOnline}
              isMessageFromCurrentUser={isMessageFromCurrentUser}
              getMessageReadBreakdown={getMessageReadBreakdown}
              renderReadStatusCheckmark={renderReadStatusCheckmark}
              renderUserAvatarNode={renderUserAvatarNode}
              setDockedConvIds={setDockedConvIds}
              toggleHideConversation={toggleHideConversation}
              setActiveConvId={setActiveConvId}
              setSpaceConfigModalOpen={setSpaceConfigModalOpen}
              setEditingSectionId={setEditingSectionId}
              setEditingSectionName={setEditingSectionName}
              setQuickCreateSectionTargetConvId={setQuickCreateSectionTargetConvId}
              setQuickCreateSectionName={setQuickCreateSectionName}
              setQuickCreateSectionModalOpen={setQuickCreateSectionModalOpen}
            />
          ))}

          {/* Hidden Conversations / Quick Customize Footer */}
          <div className="pt-2 px-1.5 flex items-center justify-between gap-1 border-t border-white/5">
            <button
              type="button"
              onClick={() => {
                onOpenSidebarCustomizeModal((userPrefs.hiddenIds?.length || 0) > 0 ? 'conversations' : 'sections');
              }}
              className="w-full py-1.5 px-2 rounded-lg flex items-center justify-between gap-1.5 text-[11px] font-semibold cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ color: token.colorTextSecondary }}
            >
              <span className="inline-flex items-center gap-1.5 truncate">
                <FolderKanban size={13} className="text-amber-500 shrink-0" />
                <span className="truncate">Tuỳ chỉnh mục & danh sách</span>
              </span>
              {(userPrefs.hiddenIds?.length || 0) > 0 && (
                <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9.5px] font-bold bg-amber-500/20 text-amber-400 tabular-nums shrink-0">
                  {userPrefs.hiddenIds.length} đang ẩn
                </span>
              )}
            </button>
          </div>
        </div>

        {/* SIDEBAR DIVIDER RESIZE HANDLE */}
        {!isMobile && (
          <Tooltip
            title="Kéo để thay đổi độ rộng cột danh sách (Nhấp đúp để đặt lại 264px)"
            placement="right"
            mouseEnterDelay={0.5}
          >
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Kéo để thay đổi chiều rộng cột danh sách"
              data-no-chat-autofocus="true"
              onMouseEnter={() => setHoverResizeHandle('sidebar')}
              onMouseLeave={() => setHoverResizeHandle((prev) => (prev === 'sidebar' ? null : prev))}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsResizingTarget('sidebar');
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                sidebarWidthRef.current = 264;
                setSidebarWidth(264);
                persistPersonalLayout({ sidebarWidth: 264 });
              }}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                right: -4,
                width: 8,
                cursor: 'col-resize',
                zIndex: 25,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isResizingTarget === 'sidebar' && (
                <div
                  className="px-2 py-0.5 rounded-md text-[11px] font-bold tabular-nums shadow-lg pointer-events-none"
                  style={{
                    position: 'absolute',
                    left: 10,
                    background: '#111827',
                    color: '#d4a84b',
                    border: '1px solid rgba(212, 168, 75, 0.45)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sidebarWidth}px
                </div>
              )}
            </div>
          </Tooltip>
        )}
      </div>
    );
  }
);

MosChatSidebar.displayName = 'MosChatSidebar';
