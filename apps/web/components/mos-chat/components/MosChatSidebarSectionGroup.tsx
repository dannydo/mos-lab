'use client';

import React from 'react';
import { Tooltip, Popover } from 'antd';
import {
  FolderKanban,
  Plus,
  Mail,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Check,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  Pencil,
  Trash2,
} from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatUserSidebarPrefs,
  MosChatChannelNotificationOverride,
  SafeAny,
} from '@mos-lab/shared';
import type { MosChatSidebarSection } from './MosChatSidebar';
import { MosChatSidebarConvRow } from './MosChatSidebarConvRow';

export interface MosChatSidebarSectionGroupProps {
  sec: MosChatSidebarSection;
  secIdx: number;
  totalSections: number;
  activeConversation: MosChatConversation | null;
  currentUser: SafeAny;
  userPrefs: MosChatUserSidebarPrefs;
  isDark: boolean;
  token: SafeAny;
  borderColor: string;
  openSectionMenuId: string | null;
  setOpenSectionMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  openConvMenuId: string | null;
  setOpenConvMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  draggingSidebarConv: { convId: string; sectionId: string } | null;
  setDraggingSidebarConv: React.Dispatch<React.SetStateAction<{ convId: string; sectionId: string } | null>>;
  dragOverSidebarConvId: string | null;
  setDragOverSidebarConvId: React.Dispatch<React.SetStateAction<string | null>>;
  onOpenSidebarCustomizeModal: (tab: 'sections' | 'conversations') => void;
  onOpenNewRoomModal: (type?: 'space' | 'dm') => void;
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
}

export const MosChatSidebarSectionGroup: React.FC<MosChatSidebarSectionGroupProps> = ({
  sec,
  secIdx,
  totalSections,
  activeConversation,
  currentUser,
  userPrefs,
  isDark,
  token,
  borderColor,
  openSectionMenuId,
  setOpenSectionMenuId,
  openConvMenuId,
  setOpenConvMenuId,
  draggingSidebarConv,
  setDraggingSidebarConv,
  dragOverSidebarConvId,
  setDragOverSidebarConvId,
  onOpenSidebarCustomizeModal,
  onOpenNewRoomModal,
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
}) => {
  const isSectionMenuOpen = openSectionMenuId === sec.id;
  const pinnedSetForSec = new Set(userPrefs.pinnedIds || []);
  const pinnedCountInSec = sec.items.filter((c) => pinnedSetForSec.has(c.id)).length;
  const unpinnedCountInSec = sec.items.length - pinnedCountInSec;

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
        disabled={secIdx === totalSections - 1}
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
    <div className="mb-1">
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
          sec.items.map((conv, itemIdx) => {
            const isPinned = pinnedSetForSec.has(conv.id);
            const prevItem = itemIdx > 0 ? sec.items[itemIdx - 1] : null;
            const showPinnedSubHeader = isPinned && (!prevItem || !pinnedSetForSec.has(prevItem.id));
            const showUnpinnedSubHeader =
              pinnedCountInSec > 0 && !isPinned && (!prevItem || pinnedSetForSec.has(prevItem.id));
            const isMuted = (userPrefs.mutedIds || []).includes(conv.id);
            const effUnread = getEffectiveUnreadCount(conv);
            const isDragTarget =
              dragOverSidebarConvId === conv.id &&
              draggingSidebarConv?.sectionId === sec.id &&
              draggingSidebarConv?.convId !== conv.id;

            return (
              <MosChatSidebarConvRow
                key={conv.id}
                conv={conv}
                sec={sec}
                itemIdx={itemIdx}
                pinnedCountInSec={pinnedCountInSec}
                unpinnedCountInSec={unpinnedCountInSec}
                showPinnedSubHeader={showPinnedSubHeader}
                showUnpinnedSubHeader={showUnpinnedSubHeader}
                isSelected={conv.id === activeConversation?.id}
                isActiveConvId={conv.id === activeConversation?.id}
                isPinned={isPinned}
                isMuted={isMuted}
                effUnread={effUnread}
                isConvMenuOpen={openConvMenuId === conv.id}
                isDraggingThis={draggingSidebarConv?.convId === conv.id}
                isDragTarget={isDragTarget}
                draggingSidebarConv={draggingSidebarConv}
                setDraggingSidebarConv={setDraggingSidebarConv}
                dragOverSidebarConvId={dragOverSidebarConvId}
                setDragOverSidebarConvId={setDragOverSidebarConvId}
                setOpenConvMenuId={setOpenConvMenuId}
                currentUser={currentUser}
                userPrefs={userPrefs}
                isDark={isDark}
                token={token}
                borderColor={borderColor}
                selectConversation={selectConversation}
                togglePinConversation={togglePinConversation}
                toggleManualUnreadConversation={toggleManualUnreadConversation}
                toggleMuteConversation={toggleMuteConversation}
                onChangeChannelNotificationOverride={onChangeChannelNotificationOverride}
                moveConversationToSection={moveConversationToSection}
                moveConversationOrderInSection={moveConversationOrderInSection}
                reorderConversationByDragDrop={reorderConversationByDragDrop}
                handleLeaveOrJoinSpace={handleLeaveOrJoinSpace}
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
                setQuickCreateSectionTargetConvId={setQuickCreateSectionTargetConvId}
                setQuickCreateSectionName={setQuickCreateSectionName}
                setQuickCreateSectionModalOpen={setQuickCreateSectionModalOpen}
              />
            );
          })
        ))}
    </div>
  );
};
