'use client';

import React from 'react';
import { Tooltip, Popover } from 'antd';
import {
  Hash,
  Pin,
  BellOff,
  ArrowUp,
  ArrowDown,
  MailOpen,
  Mail,
  MoreVertical,
  Zap,
  MessageSquareReply,
} from 'lucide-react';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatUserSidebarPrefs,
  MosChatChannelNotificationOverride,
  SafeAny,
} from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID, isSpaceEmoji } from '../constants/chat-constants';
import type { MosChatSidebarSection } from './MosChatSidebar';
import { MosChatSidebarConvMenu } from './MosChatSidebarConvMenu';

export interface MosChatSidebarConvRowProps {
  conv: MosChatConversation;
  sec: MosChatSidebarSection;
  itemIdx: number;
  pinnedCountInSec: number;
  unpinnedCountInSec: number;
  showPinnedSubHeader: boolean;
  showUnpinnedSubHeader: boolean;
  isSelected: boolean;
  isActiveConvId: boolean;
  isPinned: boolean;
  isMuted: boolean;
  effUnread: number;
  isConvMenuOpen: boolean;
  isDraggingThis: boolean;
  isDragTarget: boolean;
  draggingSidebarConv: { convId: string; sectionId: string } | null;
  setDraggingSidebarConv: React.Dispatch<React.SetStateAction<{ convId: string; sectionId: string } | null>>;
  dragOverSidebarConvId: string | null;
  setDragOverSidebarConvId: React.Dispatch<React.SetStateAction<string | null>>;
  setOpenConvMenuId: React.Dispatch<React.SetStateAction<string | null>>;
  currentUser: SafeAny;
  userPrefs: MosChatUserSidebarPrefs;
  isDark: boolean;
  token: SafeAny;
  borderColor: string;
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
  handleLeaveOrJoinSpace: (conv: MosChatConversation) => Promise<void>;
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
  setQuickCreateSectionTargetConvId: (id: string | null) => void;
  setQuickCreateSectionName: (name: string) => void;
  setQuickCreateSectionModalOpen: (open: boolean) => void;
}

export const MosChatSidebarConvRow: React.FC<MosChatSidebarConvRowProps> = React.memo(
  ({
    conv,
    sec,
    itemIdx,
    pinnedCountInSec,
    unpinnedCountInSec,
    showPinnedSubHeader,
    showUnpinnedSubHeader,
    isSelected,
    isActiveConvId,
    isPinned,
    isMuted,
    effUnread,
    isConvMenuOpen,
    isDraggingThis,
    isDragTarget,
    draggingSidebarConv,
    setDraggingSidebarConv,
    dragOverSidebarConvId,
    setDragOverSidebarConvId,
    setOpenConvMenuId,
    currentUser,
    userPrefs,
    isDark,
    token,
    borderColor,
    selectConversation,
    togglePinConversation,
    toggleManualUnreadConversation,
    toggleMuteConversation,
    onChangeChannelNotificationOverride,
    moveConversationToSection,
    moveConversationOrderInSection,
    reorderConversationByDragDrop,
    handleLeaveOrJoinSpace,
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
    setQuickCreateSectionTargetConvId,
    setQuickCreateSectionName,
    setQuickCreateSectionModalOpen,
  }) => {
    const isAiConv = conv.id === AI_COPILOT_CONV_ID;
    const isSelfConv = Boolean(conv.isSelf || conv.id.startsWith('dm-self-'));
    const isSpace = conv.type === 'space';
    const lastMsg = conv.messages[conv.messages.length - 1];
    const previewText =
      formatChatPreviewWithStickers(lastMsg?.text) ||
      (lastMsg?.attachments?.length ? `Hình ảnh (${lastMsg.attachments.length})` : conv.subtitle);

    return (
      <React.Fragment>
        {showPinnedSubHeader && (
          <div className="px-2 pt-1 pb-0.5 flex items-center justify-between text-[9.5px] font-extrabold uppercase tracking-wider text-amber-400 select-none">
            <span className="inline-flex items-center gap-1">
              <Pin size={10} className="fill-amber-400 text-amber-400" />
              <span>ĐÃ GHIM CÁ NHÂN ({pinnedCountInSec})</span>
            </span>
            <span className="text-[9px] font-medium text-slate-400 normal-case">Kéo thả / ↑↓ để xếp</span>
          </div>
        )}
        {showUnpinnedSubHeader && (
          <div
            className="px-2 pt-1.5 pb-0.5 mt-1 flex items-center justify-between text-[9.5px] font-bold uppercase tracking-wider text-slate-400 select-none"
            style={{ borderTop: `1px dashed ${borderColor}` }}
          >
            <span>
              {sec.id === 'spaces' ? `TẤT CẢ SPACES (${unpinnedCountInSec})` : `KHÁC (${unpinnedCountInSec})`}
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
            opacity: isDraggingThis ? 0.5 : isMuted && !isSelected ? 0.72 : 1,
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
                  className={`text-[12.5px] truncate ${effUnread > 0 || isAiConv || isSelfConv ? 'font-extrabold' : 'font-semibold'}`}
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
                <div className={`${isConvMenuOpen ? 'hidden' : 'flex group-hover/conv:hidden'} items-center gap-1`}>
                  {isAiConv ? (
                    <span
                      className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: 'rgba(139, 92, 246, 0.18)', color: '#a78bfa' }}
                    >
                      Riêng tư
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{lastMsg?.timeLabel || ''}</span>
                  )}
                </div>

                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`${isConvMenuOpen ? 'flex' : 'hidden group-hover/conv:flex'} items-center gap-0.5`}
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
                          onClick={() => moveConversationOrderInSection(conv.id, sec.id, 'up', sec.items)}
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
                          onClick={() => moveConversationOrderInSection(conv.id, sec.id, 'down', sec.items)}
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
                    content={
                      <MosChatSidebarConvMenu
                        conv={conv}
                        sec={sec}
                        itemIdx={itemIdx}
                        isAiConv={isAiConv}
                        isSpace={isSpace}
                        isPinned={isPinned}
                        isMuted={isMuted}
                        effUnread={effUnread}
                        userPrefs={userPrefs}
                        token={token}
                        borderColor={borderColor}
                        closeMenu={() => setOpenConvMenuId(null)}
                        togglePinConversation={togglePinConversation}
                        toggleManualUnreadConversation={toggleManualUnreadConversation}
                        toggleMuteConversation={toggleMuteConversation}
                        onChangeChannelNotificationOverride={onChangeChannelNotificationOverride}
                        moveConversationToSection={moveConversationToSection}
                        moveConversationOrderInSection={moveConversationOrderInSection}
                        setQuickCreateSectionTargetConvId={setQuickCreateSectionTargetConvId}
                        setQuickCreateSectionName={setQuickCreateSectionName}
                        setQuickCreateSectionModalOpen={setQuickCreateSectionModalOpen}
                        setDockedConvIds={setDockedConvIds}
                        toggleHideConversation={toggleHideConversation}
                        setActiveConvId={setActiveConvId}
                        setSpaceConfigModalOpen={setSpaceConfigModalOpen}
                        handleLeaveOrJoinSpace={handleLeaveOrJoinSpace}
                      />
                    }
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
                  className={`text-[11px] truncate ${effUnread > 0 ? 'font-bold text-slate-200 dark:text-slate-200' : 'text-slate-400'}`}
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
                {(conv.unreadThreadCount || 0) > 0 && !isActiveConvId && (
                  <Tooltip title={`${conv.unreadThreadCount} câu trả lời mới trong luồng phụ (Sub-thread)`}>
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
  }
);

MosChatSidebarConvRow.displayName = 'MosChatSidebarConvRow';
