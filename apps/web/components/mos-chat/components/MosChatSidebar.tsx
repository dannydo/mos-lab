'use client';

import React, { useState } from 'react';
import { Tooltip, Popover } from 'antd';
import {
  ShieldCheck,
  FolderKanban,
  Plus,
  X,
  Search,
  Inbox,
  Mail,
  Hash,
  AlarmClock,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Check,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  Pencil,
  Trash2,
  Pin,
  PinOff,
  MailOpen,
  Bell,
  BellOff,
  ExternalLink,
  EyeOff,
  Settings,
  LogOut,
  Zap,
  MessageSquareReply,
} from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatTaskItem,
  MosChatUserSidebarPrefs,
  MosChatAccessConfig,
  MosChatPresenceStatus,
  SafeAny,
} from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID, isSpaceEmoji } from '../constants/chat-constants';

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
  activeSubtab: 'chat' | 'tasks' | 'pinned';
  setActiveSubtab: (t: 'chat' | 'tasks' | 'pinned') => void;

  sidebarSections: MosChatSidebarSection[];
  visibleConversations: MosChatConversation[];
  activeConversation: MosChatConversation | null;
  uniqueTasks: MosChatTaskItem[];

  selectConversation: (id: string) => void;
  togglePinConversation: (id: string) => void;
  toggleManualUnreadConversation: (conv: MosChatConversation) => void;
  toggleMuteConversation: (id: string) => void;
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
        <div
          style={{
            padding: 10,
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div className="flex items-center justify-between gap-1.5">
            <Tooltip title="Đổi trạng thái: Đang hoạt động / Không làm phiền (Tắt chuông)">
              <button
                type="button"
                onClick={() => setPresence((p) => (p === 'active' ? 'dnd' : 'active'))}
                className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer min-w-0"
                style={{
                  background: surfaceRaised,
                  border: `1px solid ${borderColor}`,
                  color: token.colorText,
                }}
              >
                {renderUserAvatarNode({
                  staffId: currentUser?.id || 'me',
                  name: currentUser?.displayName || currentUser?.username || 'Danny Do',
                  username: currentUser?.username,
                  rawAvatar: currentUser?.avatarUrl || currentUser?.avatar,
                  bgColor: '#d4a84b',
                  sizeClass: 'w-5 h-5',
                  textSizeClass: 'text-[9.5px]',
                })}
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ background: presence === 'active' ? '#22c55e' : '#ef4444' }}
                />
                <span className="truncate">{presence === 'active' ? 'Đang hoạt động' : 'Không làm phiền'}</span>
                <ChevronDown size={13} className="shrink-0" />
              </button>
            </Tooltip>

            <div className="flex items-center gap-1 shrink-0">
              {isDannyAccount && (
                <Tooltip title="Phân quyền Đội nhóm & Cá nhân vào mOS Chat">
                  <button
                    type="button"
                    aria-label="Phân quyền Đội nhóm & Cá nhân vào mOS Chat"
                    onClick={onOpenAccessConfigModal}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer shrink-0 transition-colors"
                    style={{
                      background:
                        accessConfig.allowAllStaff ||
                        accessConfig.allowedGroupKeys.length > 0 ||
                        accessConfig.allowedStaffIds.length > 0
                          ? 'rgba(139, 92, 246, 0.16)'
                          : surfaceRaised,
                      border: `1px solid ${borderColor}`,
                      color: '#a78bfa',
                    }}
                  >
                    <ShieldCheck size={14} />
                  </button>
                </Tooltip>
              )}

              <Tooltip title="Tuỳ chỉnh danh sách cá nhân (Mục tuỳ chỉnh / Ghim / Ẩn - Giống Google Chat Workspace)">
                <button
                  type="button"
                  aria-label="Tuỳ chỉnh danh sách cá nhân"
                  onClick={() => onOpenSidebarCustomizeModal('sections')}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer shrink-0 transition-colors"
                  style={{
                    background:
                      (userPrefs.customSections?.length || 0) > 0 ||
                      (userPrefs.pinnedIds?.length || 0) > 0 ||
                      (userPrefs.hiddenIds?.length || 0) > 0
                        ? 'rgba(212, 168, 75, 0.16)'
                        : surfaceRaised,
                    border: `1px solid ${borderColor}`,
                    color:
                      (userPrefs.customSections?.length || 0) > 0 ||
                      (userPrefs.pinnedIds?.length || 0) > 0 ||
                      (userPrefs.hiddenIds?.length || 0) > 0
                        ? '#d4a84b'
                        : token.colorTextSecondary,
                  }}
                >
                  <FolderKanban size={14} />
                </button>
              </Tooltip>

              <Tooltip title="Tạo cuộc trò chuyện hoặc Space mới">
                <button
                  type="button"
                  aria-label="Tạo cuộc trò chuyện hoặc Space mới"
                  onClick={() => onOpenNewRoomModal()}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer shrink-0"
                  style={{
                    background: surfaceRaised,
                    border: `1px solid ${borderColor}`,
                    color: token.colorTextSecondary,
                  }}
                >
                  <Plus size={15} />
                </button>
              </Tooltip>

              {isMobile && (
                <button
                  type="button"
                  aria-label="Đóng mOS Chat"
                  onClick={onClose}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer shrink-0 transition-colors"
                  style={{
                    background: surfaceRaised,
                    border: `1px solid ${borderColor}`,
                    color: token.colorTextSecondary,
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>
          </div>

          {/* Search Input */}
          <div
            className="flex items-center gap-2 px-2.5 h-8 rounded-lg"
            style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
          >
            <Search size={14} style={{ color: token.colorTextTertiary }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm đồng nghiệp, #Space..."
              className="w-full bg-transparent border-0 outline-none text-[12px]"
              style={{ color: token.colorText }}
            />
          </div>

          {/* Icon-only Filter Bar with Tooltips */}
          <div
            className="grid grid-cols-4 gap-1 p-1 rounded-lg"
            style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
          >
            <Tooltip title="Tất cả hội thoại">
              <button
                type="button"
                aria-label="Tất cả hội thoại"
                onClick={() => {
                  setSidebarFilter('all');
                  setActiveSubtab('chat');
                  if (isMobile) {
                    setMobileActiveView('inbox');
                  }
                }}
                className="h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer"
                style={{
                  background: sidebarFilter === 'all' && activeSubtab !== 'tasks' ? surfaceBg : 'transparent',
                  color: sidebarFilter === 'all' && activeSubtab !== 'tasks' ? '#d4a84b' : token.colorTextSecondary,
                }}
              >
                <Inbox size={14} />
              </button>
            </Tooltip>

            <Tooltip title="Tin nhắn chưa đọc">
              <button
                type="button"
                aria-label="Tin nhắn chưa đọc"
                onClick={() => {
                  setSidebarFilter('unread');
                  setActiveSubtab('chat');
                  if (isMobile) {
                    setMobileActiveView('inbox');
                  }
                }}
                className="h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer tabular-nums"
                style={{
                  background: sidebarFilter === 'unread' ? surfaceBg : 'transparent',
                  color: sidebarFilter === 'unread' ? '#d4a84b' : token.colorTextSecondary,
                }}
              >
                <Mail size={14} />
                <span>
                  {visibleConversations.reduce((s, c) => {
                    if ((userPrefs.mutedIds || []).includes(c.id)) return s;
                    return s + getEffectiveUnreadCount(c);
                  }, 0)}
                </span>
              </button>
            </Tooltip>

            <Tooltip title="Nhóm & Phòng ban (#Spaces)">
              <button
                type="button"
                aria-label="Nhóm & Phòng ban (#Spaces)"
                onClick={() => {
                  setSidebarFilter('spaces');
                  setActiveSubtab('chat');
                  if (isMobile) {
                    setMobileActiveView('inbox');
                  }
                }}
                className="h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer"
                style={{
                  background: sidebarFilter === 'spaces' ? surfaceBg : 'transparent',
                  color: sidebarFilter === 'spaces' ? '#d4a84b' : token.colorTextSecondary,
                }}
              >
                <Hash size={14} />
              </button>
            </Tooltip>

            <Tooltip title="Kho Công việc & Nhắc hẹn (Tasks)">
              <button
                type="button"
                aria-label="Kho Công việc & Nhắc hẹn (Tasks)"
                onClick={() => {
                  setActiveSubtab('tasks');
                  if (isMobile) {
                    setMobileActiveView('conversation');
                  }
                }}
                className="h-7 rounded-md inline-flex items-center justify-center gap-1 text-[11px] font-bold cursor-pointer tabular-nums"
                style={{
                  background: activeSubtab === 'tasks' ? surfaceBg : 'transparent',
                  color: activeSubtab === 'tasks' ? '#d4a84b' : token.colorTextSecondary,
                }}
              >
                <AlarmClock size={14} />
                <span>{uniqueTasks.filter((t) => !t.done).length}</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Scrollable List of Custom Sections, DIRECT MESSAGES & SPACES */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {sidebarSections.map((sec, secIdx) => {
            const isSectionMenuOpen = openSectionMenuId === sec.id;
            const sectionMenuContent = (
              <div
                data-no-chat-autofocus="true"
                onClick={(e) => e.stopPropagation()}
                className="w-56 py-1 select-none text-[12px]"
              >
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Tuỳ chỉnh mục · {sec.title}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toggleUnreadOnlySection(sec.id);
                    setOpenSectionMenuId(null);
                  }}
                  className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                  style={{ color: token.colorText }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Mail size={13} className="text-amber-500" />
                    <span>Chỉ hiện tin chưa đọc</span>
                  </span>
                  {sec.unreadOnly && <Check size={13} className="text-emerald-500" />}
                </button>

                <button
                  type="button"
                  disabled={secIdx === 0}
                  onClick={() => {
                    handleMoveSectionOrder(sec.id, 'up');
                    setOpenSectionMenuId(null);
                  }}
                  className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: token.colorText }}
                >
                  <ArrowUp size={13} />
                  <span>Di chuyển mục lên trên</span>
                </button>

                <button
                  type="button"
                  disabled={secIdx === sidebarSections.length - 1}
                  onClick={() => {
                    handleMoveSectionOrder(sec.id, 'down');
                    setOpenSectionMenuId(null);
                  }}
                  className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: token.colorText }}
                >
                  <ArrowDown size={13} />
                  <span>Di chuyển mục xuống dưới</span>
                </button>

                <div className="my-1" style={{ borderTop: `1px solid ${borderColor}` }} />

                <button
                  type="button"
                  onClick={() => {
                    setOpenSectionMenuId(null);
                    setQuickCreateSectionTargetConvId(null);
                    setQuickCreateSectionName('');
                    setQuickCreateSectionModalOpen(true);
                  }}
                  className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                  style={{ color: token.colorText }}
                >
                  <FolderPlus size={13} className="text-sky-400" />
                  <span>Tạo mục tuỳ chỉnh mới...</span>
                </button>

                {sec.isCustom && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenSectionMenuId(null);
                        setEditingSectionId(sec.id);
                        setEditingSectionName(sec.title);
                        onOpenSidebarCustomizeModal('sections');
                      }}
                      className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                      style={{ color: token.colorText }}
                    >
                      <Pencil size={13} />
                      <span>Đổi tên mục...</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteCustomSection(sec.id);
                        setOpenSectionMenuId(null);
                      }}
                      className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-rose-500/10 cursor-pointer text-left text-rose-500"
                    >
                      <Trash2 size={13} />
                      <span>Xoá mục tuỳ chỉnh</span>
                    </button>
                  </>
                )}

                <div className="my-1" style={{ borderTop: `1px solid ${borderColor}` }} />

                <button
                  type="button"
                  onClick={() => {
                    setOpenSectionMenuId(null);
                    onOpenSidebarCustomizeModal('sections');
                  }}
                  className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left font-semibold"
                  style={{ color: '#d4a84b' }}
                >
                  <FolderKanban size={13} />
                  <span>Quản lý tất cả mục & Đã ẩn...</span>
                </button>
              </div>
            );

            return (
              <div key={sec.id} className="mb-1">
                {/* Section Header */}
                <div className="group/sec flex items-center justify-between px-1.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                  <button
                    type="button"
                    onClick={() => toggleCollapseSection(sec.id)}
                    className="flex items-center gap-1 min-w-0 flex-1 text-left cursor-pointer"
                    style={{ color: sec.isCustom ? '#d4a84b' : undefined }}
                  >
                    {sec.collapsed ? (
                      <ChevronRight size={13} className="shrink-0" />
                    ) : (
                      <ChevronDown size={13} className="shrink-0" />
                    )}
                    <span className="truncate">{sec.title}</span>
                    {sec.unreadOnly && (
                      <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[8.5px] font-extrabold bg-amber-500/20 text-amber-400 shrink-0">
                        Chưa đọc
                      </span>
                    )}
                    {sec.collapsed && sec.unreadCount > 0 ? (
                      <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[9px] font-extrabold tabular-nums shrink-0">
                        {sec.unreadCount}
                      </span>
                    ) : sec.collapsed && sec.totalCount > 0 ? (
                      <span className="text-[9.5px] text-slate-500 tabular-nums shrink-0">({sec.totalCount})</span>
                    ) : null}
                  </button>

                  <div className="flex items-center gap-0.5 shrink-0">
                    <Popover
                      open={isSectionMenuOpen}
                      onOpenChange={(v) => setOpenSectionMenuId(v ? sec.id : null)}
                      trigger="click"
                      placement="bottomRight"
                      zIndex={1150}
                      content={sectionMenuContent}
                    >
                      <Tooltip title={`Tuỳ chỉnh mục ${sec.title}`}>
                        <button
                          type="button"
                          aria-label={`Tuỳ chỉnh mục ${sec.title}`}
                          onClick={(e) => e.stopPropagation()}
                          className="w-5 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer opacity-70 group-hover/sec:opacity-100"
                        >
                          <MoreVertical size={12} />
                        </button>
                      </Tooltip>
                    </Popover>

                    <Tooltip
                      title={
                        sec.id === 'dm'
                          ? 'Bắt đầu Chat 1-1 mới'
                          : sec.id === 'spaces'
                            ? 'Tạo Space nhóm mới'
                            : `Thêm cuộc trò chuyện vào ${sec.title}`
                      }
                    >
                      <button
                        type="button"
                        aria-label={
                          sec.id === 'dm'
                            ? 'Bắt đầu Chat 1-1 mới'
                            : sec.id === 'spaces'
                              ? 'Tạo Space nhóm mới'
                              : `Thêm cuộc trò chuyện vào ${sec.title}`
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          if (sec.id === 'dm') {
                            onOpenNewRoomModal('dm');
                          } else if (sec.id === 'spaces') {
                            onOpenNewRoomModal('space');
                          } else {
                            onOpenSidebarCustomizeModal('conversations');
                          }
                        }}
                        className="w-5 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer"
                      >
                        <Plus size={13} />
                      </button>
                    </Tooltip>
                  </div>
                </div>

                {/* Section Items */}
                {!sec.collapsed &&
                  (sec.items.length === 0 ? (
                    <div className="px-2.5 py-1.5 text-[11px] text-slate-500 italic">
                      {sec.unreadOnly
                        ? 'Không có tin nhắn chưa đọc trong mục này'
                        : sec.isCustom
                          ? 'Mục trống · Nhấn ⋮ trên cuộc trò chuyện để chuyển vào đây'
                          : 'Chưa có cuộc trò chuyện'}
                    </div>
                  ) : (
                    (() => {
                      const pinnedSetForSec = new Set(userPrefs.pinnedIds || []);
                      const pinnedCountInSec = sec.items.filter((c) => pinnedSetForSec.has(c.id)).length;
                      const unpinnedCountInSec = sec.items.length - pinnedCountInSec;

                      return sec.items.map((conv, itemIdx) => {
                        const isAiConv = conv.id === AI_COPILOT_CONV_ID;
                        const isSelfConv = Boolean(conv.isSelf || conv.id.startsWith('dm-self-'));
                        const isSpace = conv.type === 'space';
                        const lastMsg = conv.messages[conv.messages.length - 1];
                        const isSelected = conv.id === activeConversation?.id;
                        const isPinned = pinnedSetForSec.has(conv.id);
                        const prevItem = itemIdx > 0 ? sec.items[itemIdx - 1] : null;
                        const showPinnedSubHeader = itemIdx === 0 && isPinned;
                        const showUnpinnedSubHeader =
                          pinnedCountInSec > 0 && !isPinned && (!prevItem || pinnedSetForSec.has(prevItem.id));
                        const isMuted = (userPrefs.mutedIds || []).includes(conv.id);
                        const effUnread = getEffectiveUnreadCount(conv);
                        const isConvMenuOpen = openConvMenuId === conv.id;
                        const isDragTarget =
                          dragOverSidebarConvId === conv.id &&
                          draggingSidebarConv?.sectionId === sec.id &&
                          draggingSidebarConv?.convId !== conv.id;
                        const currentCustomSec = (userPrefs.customSections || []).find((cs) =>
                          (cs.conversationIds || []).includes(conv.id)
                        );
                        const previewText =
                          formatChatPreviewWithStickers(lastMsg?.text) ||
                          (lastMsg?.attachments?.length ? `Hình ảnh (${lastMsg.attachments.length})` : conv.subtitle);

                        const convMenuContent = (
                          <div
                            data-no-chat-autofocus="true"
                            onClick={(e) => e.stopPropagation()}
                            className="w-60 py-1 select-none text-[12px]"
                          >
                            <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                              {isSpace ? `#${conv.name}` : conv.name}
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                togglePinConversation(conv.id);
                                setOpenConvMenuId(null);
                              }}
                              className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                              style={{ color: token.colorText }}
                            >
                              {isPinned ? (
                                <PinOff size={13} className="text-amber-500" />
                              ) : (
                                <Pin size={13} className="text-amber-500" />
                              )}
                              <span>{isPinned ? 'Bỏ ghim khỏi đầu mục' : 'Ghim lên đầu mục (Pin)'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                toggleManualUnreadConversation(conv);
                                setOpenConvMenuId(null);
                              }}
                              className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                              style={{ color: token.colorText }}
                            >
                              {effUnread > 0 ? <MailOpen size={13} /> : <Mail size={13} className="text-rose-500" />}
                              <span>{effUnread > 0 ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                toggleMuteConversation(conv.id);
                                setOpenConvMenuId(null);
                              }}
                              className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                              style={{ color: token.colorText }}
                            >
                              {isMuted ? (
                                <Bell size={13} className="text-emerald-500" />
                              ) : (
                                <BellOff size={13} className="text-slate-400" />
                              )}
                              <span>{isMuted ? 'Bật thông báo' : 'Tắt thông báo (Mute)'}</span>
                            </button>

                            <div className="my-1" style={{ borderTop: `1px solid ${borderColor}` }} />

                            <div className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Chuyển tới mục (Google Chat Sections)
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                moveConversationToSection(conv.id, 'default');
                                setOpenConvMenuId(null);
                              }}
                              className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                              style={{ color: token.colorText }}
                            >
                              <span className="truncate">
                                {isSpace ? 'SPACES (Mặc định)' : 'DIRECT MESSAGES (Mặc định)'}
                              </span>
                              {!currentCustomSec && <Check size={13} className="text-emerald-500 shrink-0" />}
                            </button>

                            {(userPrefs.customSections || []).map((cs) => (
                              <button
                                key={cs.id}
                                type="button"
                                onClick={() => {
                                  moveConversationToSection(conv.id, cs.id);
                                  setOpenConvMenuId(null);
                                }}
                                className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                                style={{ color: token.colorText }}
                              >
                                <span className="truncate">📁 {cs.name}</span>
                                {currentCustomSec?.id === cs.id && (
                                  <Check size={13} className="text-emerald-500 shrink-0" />
                                )}
                              </button>
                            ))}

                            <button
                              type="button"
                              onClick={() => {
                                setOpenConvMenuId(null);
                                setQuickCreateSectionTargetConvId(conv.id);
                                setQuickCreateSectionName('');
                                setQuickCreateSectionModalOpen(true);
                              }}
                              className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left text-sky-400 font-semibold"
                            >
                              <FolderPlus size={13} />
                              <span>+ Tạo mục mới & chuyển vào...</span>
                            </button>

                            <div className="my-1" style={{ borderTop: `1px solid ${borderColor}` }} />

                            <div className="grid grid-cols-2 gap-1 px-1">
                              <button
                                type="button"
                                disabled={itemIdx === 0}
                                onClick={() => {
                                  moveConversationOrderInSection(conv.id, sec.id, 'up', sec.items);
                                  setOpenConvMenuId(null);
                                }}
                                className="px-2 py-1 flex items-center justify-center gap-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ color: token.colorText }}
                              >
                                <ArrowUp size={12} />
                                <span>Lên trên</span>
                              </button>
                              <button
                                type="button"
                                disabled={itemIdx === sec.items.length - 1}
                                onClick={() => {
                                  moveConversationOrderInSection(conv.id, sec.id, 'down', sec.items);
                                  setOpenConvMenuId(null);
                                }}
                                className="px-2 py-1 flex items-center justify-center gap-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ color: token.colorText }}
                              >
                                <ArrowDown size={12} />
                                <span>Xuống dưới</span>
                              </button>
                            </div>

                            <div className="my-1" style={{ borderTop: `1px solid ${borderColor}` }} />

                            <button
                              type="button"
                              onClick={() => {
                                setDockedConvIds((prev) => {
                                  const next = prev.includes(conv.id) ? prev : [...prev, conv.id];
                                  return next.slice(-2);
                                });
                                setOpenConvMenuId(null);
                              }}
                              className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
                              style={{ color: token.colorText }}
                            >
                              <ExternalLink size={13} />
                              <span>Mở cửa sổ thu nhỏ (Mini Dock)</span>
                            </button>

                            {!isAiConv && (
                              <button
                                type="button"
                                onClick={() => {
                                  toggleHideConversation(conv);
                                  setOpenConvMenuId(null);
                                }}
                                className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left text-amber-500"
                              >
                                <EyeOff size={13} />
                                <span>Ẩn khỏi danh sách của tôi</span>
                              </button>
                            )}

                            {isSpace && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenConvMenuId(null);
                                  setActiveConvId(conv.id);
                                  setSpaceConfigModalOpen(true);
                                }}
                                className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left text-blue-500 font-semibold"
                              >
                                <Settings size={13} />
                                <span>Cài đặt & Cấu hình Space...</span>
                              </button>
                            )}

                            {isSpace && (
                              <button
                                type="button"
                                onClick={() => {
                                  void handleLeaveOrJoinSpace(conv);
                                  setOpenConvMenuId(null);
                                }}
                                className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-rose-500/10 cursor-pointer text-left text-rose-500"
                              >
                                <LogOut size={13} />
                                <span>Rời khỏi Space này</span>
                              </button>
                            )}
                          </div>
                        );

                        return (
                          <React.Fragment key={conv.id}>
                            {showPinnedSubHeader && (
                              <div className="px-2 pt-1 pb-0.5 flex items-center justify-between text-[9.5px] font-extrabold uppercase tracking-wider text-amber-400 select-none">
                                <span className="inline-flex items-center gap-1">
                                  <Pin size={10} className="fill-amber-400 text-amber-400" />
                                  <span>ĐÃ GHIM CÁ NHÂN ({pinnedCountInSec})</span>
                                </span>
                                <span className="text-[9px] font-medium text-slate-400 normal-case">
                                  Kéo thả / ↑↓ để xếp
                                </span>
                              </div>
                            )}
                            {showUnpinnedSubHeader && (
                              <div
                                className="px-2 pt-1.5 pb-0.5 mt-1 flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-slate-400 select-none"
                                style={{ borderTop: `1px dashed ${borderColor}` }}
                              >
                                <span>
                                  {sec.id === 'spaces'
                                    ? `TẤT CẢ SPACES (${unpinnedCountInSec})`
                                    : `KHÁC (${unpinnedCountInSec})`}
                                </span>
                              </div>
                            )}
                            <div
                              draggable
                              onDragStart={(e) => {
                                setDraggingSidebarConv({ convId: conv.id, sectionId: sec.id });
                                e.dataTransfer.effectAllowed = 'move';
                                try {
                                  e.dataTransfer.setData('text/plain', conv.id);
                                } catch {
                                  // ignore
                                }
                              }}
                              onDragOver={(e) => {
                                if (draggingSidebarConv && draggingSidebarConv.sectionId === sec.id) {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = 'move';
                                  if (dragOverSidebarConvId !== conv.id) {
                                    setDragOverSidebarConvId(conv.id);
                                  }
                                }
                              }}
                              onDragLeave={() => {
                                if (dragOverSidebarConvId === conv.id) {
                                  setDragOverSidebarConvId(null);
                                }
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (
                                  draggingSidebarConv &&
                                  draggingSidebarConv.sectionId === sec.id &&
                                  draggingSidebarConv.convId !== conv.id
                                ) {
                                  reorderConversationByDragDrop(draggingSidebarConv.convId, conv.id, sec.id, sec.items);
                                }
                                setDraggingSidebarConv(null);
                                setDragOverSidebarConvId(null);
                              }}
                              onDragEnd={() => {
                                setDraggingSidebarConv(null);
                                setDragOverSidebarConvId(null);
                              }}
                              onClick={() => selectConversation(conv.id)}
                              className="group/conv relative flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer mb-0.5 transition-all"
                              style={{
                                background: isDragTarget
                                  ? 'rgba(245, 158, 11, 0.16)'
                                  : isSelected
                                    ? isAiConv
                                      ? 'rgba(139, 92, 246, 0.18)'
                                      : isSelfConv
                                        ? 'rgba(99, 102, 241, 0.18)'
                                        : 'rgba(59, 130, 246, 0.14)'
                                    : isPinned
                                      ? isDark
                                        ? 'rgba(245, 158, 11, 0.06)'
                                        : 'rgba(245, 158, 11, 0.08)'
                                      : isAiConv
                                        ? 'rgba(139, 92, 246, 0.07)'
                                        : isSelfConv
                                          ? 'rgba(99, 102, 241, 0.06)'
                                          : 'transparent',
                                border: isDragTarget
                                  ? '1px dashed #f59e0b'
                                  : isAiConv
                                    ? '1px solid rgba(139, 92, 246, 0.28)'
                                    : isSelfConv
                                      ? '1px solid rgba(99, 102, 241, 0.25)'
                                      : isPinned
                                        ? '1px solid rgba(245, 158, 11, 0.22)'
                                        : '1px solid transparent',
                                borderLeft: isPinned ? '2.5px solid #f59e0b' : undefined,
                                opacity:
                                  draggingSidebarConv?.convId === conv.id ? 0.5 : isMuted && !isSelected ? 0.72 : 1,
                              }}
                            >
                              {isSpace ? (
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base"
                                  style={{ background: `${conv.color}22`, color: conv.color }}
                                >
                                  {conv.avatar && isSpaceEmoji(conv.avatar) ? (
                                    <span className="select-none leading-none">{conv.avatar}</span>
                                  ) : (
                                    <Hash size={16} />
                                  )}
                                </div>
                              ) : (
                                renderUserAvatarNode({
                                  staffId: isSelfConv ? currentUser?.id || 'me' : conv.participantStaffId,
                                  name: conv.name,
                                  rawAvatar: conv.avatar,
                                  bgColor: conv.color || '#ec4899',
                                  sizeClass: 'w-8 h-8',
                                  roundedClass: 'rounded-full',
                                  isOnline: isConversationParticipantOnline(conv),
                                  isAiBot: isAiConv,
                                  isSelfBookmark: isSelfConv,
                                })
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span
                                      className={`text-[12.5px] truncate ${
                                        effUnread > 0 || isAiConv || isSelfConv ? 'font-extrabold' : 'font-semibold'
                                      }`}
                                      style={{
                                        color: isAiConv
                                          ? isDark
                                            ? '#c4b5fd'
                                            : '#6d28d9'
                                          : isSelfConv
                                            ? isDark
                                              ? '#a5b4fc'
                                              : '#4338ca'
                                            : undefined,
                                      }}
                                    >
                                      {conv.name}
                                    </span>
                                    {isSelfConv && (
                                      <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-400 shrink-0">
                                        Bạn
                                      </span>
                                    )}
                                    {isPinned && (
                                      <Tooltip title="Đã ghim cá nhân · Nhấn để bỏ ghim">
                                        <button
                                          type="button"
                                          aria-label="Bỏ ghim"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            togglePinConversation(conv.id);
                                          }}
                                          className="inline-flex items-center justify-center w-4 h-4 rounded hover:bg-amber-500/20 cursor-pointer shrink-0"
                                        >
                                          <Pin size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                                        </button>
                                      </Tooltip>
                                    )}
                                    {isMuted && (
                                      <Tooltip title="Đang tắt thông báo">
                                        <BellOff size={11} className="text-slate-400 shrink-0" />
                                      </Tooltip>
                                    )}
                                  </div>

                                  {/* Right side: Time / Badge OR Hover Quick Action Buttons */}
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    <div
                                      className={`${
                                        isConvMenuOpen ? 'hidden' : 'flex group-hover/conv:hidden'
                                      } items-center gap-1`}
                                    >
                                      {isAiConv ? (
                                        <span
                                          className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                                          style={{ background: 'rgba(139, 92, 246, 0.18)', color: '#a78bfa' }}
                                        >
                                          Riêng tư
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                                          {lastMsg?.timeLabel || ''}
                                        </span>
                                      )}
                                    </div>

                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className={`${
                                        isConvMenuOpen ? 'flex' : 'hidden group-hover/conv:flex'
                                      } items-center gap-0.5`}
                                    >
                                      <Tooltip
                                        title={
                                          isPinned
                                            ? 'Bỏ ghim khỏi đầu danh sách cá nhân'
                                            : '📌 Ghim lên đầu danh sách cá nhân (lưu tự động)'
                                        }
                                      >
                                        <button
                                          type="button"
                                          aria-label={isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                                          onClick={() => togglePinConversation(conv.id)}
                                          className="w-5 h-5 rounded inline-flex items-center justify-center hover:bg-amber-500/20 cursor-pointer"
                                          style={{
                                            color: isPinned ? '#f59e0b' : token.colorTextSecondary,
                                            background: isPinned ? 'rgba(245, 158, 11, 0.15)' : undefined,
                                          }}
                                        >
                                          <Pin size={11.5} className={isPinned ? 'fill-amber-400' : ''} />
                                        </button>
                                      </Tooltip>

                                      {sec.items.length > 1 && (
                                        <>
                                          <Tooltip title="Đưa lên trên">
                                            <button
                                              type="button"
                                              aria-label="Đưa lên trên"
                                              disabled={itemIdx === 0}
                                              onClick={() =>
                                                moveConversationOrderInSection(conv.id, sec.id, 'up', sec.items)
                                              }
                                              className="w-4 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                              style={{ color: token.colorTextSecondary }}
                                            >
                                              <ArrowUp size={10.5} />
                                            </button>
                                          </Tooltip>
                                          <Tooltip title="Đưa xuống dưới">
                                            <button
                                              type="button"
                                              aria-label="Đưa xuống dưới"
                                              disabled={itemIdx === sec.items.length - 1}
                                              onClick={() =>
                                                moveConversationOrderInSection(conv.id, sec.id, 'down', sec.items)
                                              }
                                              className="w-4 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                              style={{ color: token.colorTextSecondary }}
                                            >
                                              <ArrowDown size={10.5} />
                                            </button>
                                          </Tooltip>
                                        </>
                                      )}

                                      <Tooltip title={effUnread > 0 ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}>
                                        <button
                                          type="button"
                                          aria-label={effUnread > 0 ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}
                                          onClick={() => toggleManualUnreadConversation(conv)}
                                          className="w-5 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"
                                          style={{ color: effUnread > 0 ? '#f43f5e' : token.colorTextSecondary }}
                                        >
                                          {effUnread > 0 ? <MailOpen size={11} /> : <Mail size={11} />}
                                        </button>
                                      </Tooltip>

                                      <Popover
                                        open={isConvMenuOpen}
                                        onOpenChange={(v) => setOpenConvMenuId(v ? conv.id : null)}
                                        trigger="click"
                                        placement="bottomRight"
                                        zIndex={1150}
                                        content={convMenuContent}
                                      >
                                        <Tooltip title="Tuỳ chọn cuộc trò chuyện (Ghim / Chuyển mục / Tắt thông báo / Ẩn)">
                                          <button
                                            type="button"
                                            aria-label="Tuỳ chọn cuộc trò chuyện"
                                            className="w-5 h-5 rounded inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"
                                            style={{ color: token.colorTextSecondary }}
                                          >
                                            <MoreVertical size={12} />
                                          </button>
                                        </Tooltip>
                                      </Popover>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1 min-w-0 flex-1">
                                    {lastMsg &&
                                      !isAiConv &&
                                      !isSelfConv &&
                                      isMessageFromCurrentUser(lastMsg) &&
                                      (() => {
                                        const { seenBy, unseenBy } = getMessageReadBreakdown(conv, lastMsg);
                                        return renderReadStatusCheckmark(seenBy, unseenBy, {
                                          compact: true,
                                          scopeLabel: 'Trạng thái tin nhắn cuối',
                                        });
                                      })()}
                                    <span
                                      className={`text-[11px] truncate ${
                                        effUnread > 0
                                          ? 'font-bold text-slate-200 dark:text-slate-200'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      {previewText}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {conv.hasUnreadBuzz && effUnread > 0 && (
                                      <Tooltip title="🚨 Có tin nhắn KHẨN CẤP (BUZZ) chưa đọc!">
                                        <span className="inline-flex items-center gap-0.5 justify-center px-1.5 h-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-black animate-pulse shadow-sm shrink-0">
                                          <Zap size={9} className="fill-slate-950" />
                                          BUZZ
                                        </span>
                                      </Tooltip>
                                    )}
                                    {(conv.unreadThreadCount || 0) > 0 && conv.id !== activeConversation?.id && (
                                      <Tooltip
                                        title={`${conv.unreadThreadCount} câu trả lời mới trong luồng phụ (Sub-thread)`}
                                      >
                                        <span className="inline-flex items-center gap-0.5 justify-center px-1.5 h-4 rounded-full bg-indigo-500/20 text-indigo-400 text-[9.5px] font-extrabold tabular-nums shrink-0">
                                          <MessageSquareReply size={9.5} />
                                          {conv.unreadThreadCount}
                                        </span>
                                      </Tooltip>
                                    )}
                                    {effUnread > 0 && (
                                      <span className="inline-flex items-center justify-center px-1.5 h-4 rounded-full bg-rose-500 text-white text-[10px] font-extrabold tabular-nums shrink-0">
                                        {effUnread}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      });
                    })()
                  ))}
              </div>
            );
          })}

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
