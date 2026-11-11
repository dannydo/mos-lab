'use client';

import React from 'react';
import {
  ChevronLeft,
  Phone,
  CheckSquare,
  Search,
  MoreVertical,
  Circle,
  Hash,
  MessageSquare,
  Sparkles,
  Users,
  UserPlus,
  Pin,
  RefreshCw,
  Bell,
  BellRing,
  X,
} from 'lucide-react';
import { Dropdown, Modal } from 'antd';
import type { MenuProps } from 'antd';
import { useMosChat } from '../context/MosChatContext';
import type { MosChatPresenceStatus } from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID, isSpaceEmoji } from '../constants/chat-constants';
import { MosChatAvatar } from '../MosChatAvatar';
import HeaderRoleQuickSwitch from '../../layout/HeaderRoleQuickSwitch';

export interface MosChatMobileHeaderProps {
  onOpenSettings?: () => void;
  onCallRoom?: () => void;
  onOpenTaskModal?: () => void;
  onOpenMembersModal?: () => void;
  onOpenSearch?: () => void;
  onOpenPushSettings?: () => void;
  isPushSubscribed?: boolean;
  onClose?: () => void;
}

export const MosChatMobileHeader: React.FC<MosChatMobileHeaderProps> = ({
  onOpenSettings,
  onCallRoom,
  onOpenTaskModal,
  onOpenMembersModal,
  onOpenSearch,
  onOpenPushSettings,
  isPushSubscribed = false,
  onClose,
}) => {
  const {
    currentUser,
    mobileView,
    setMobileView,
    activeConversation,
    presence,
    setPresence,
    activeSubtab,
    setActiveSubtab,
    tasks,
    pinnedMessages,
    totalUnreadCount,
    staffDirectory,
    activeThreadMsg,
    resetAiChat,
    pinnedConvIds,
    togglePinConversation,
  } = useMosChat();

  const linkedTask = React.useMemo(() => {
    if (!activeThreadMsg) return null;
    return (
      (tasks || []).find(
        (t) => t.sourceMessageId === activeThreadMsg.id || (activeThreadMsg.taskId && t.id === activeThreadMsg.taskId)
      ) || null
    );
  }, [tasks, activeThreadMsg]);

  const presenceMenuItems: MenuProps['items'] = [
    {
      key: 'active',
      label: (
        <span className="flex items-center gap-2 text-emerald-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm shadow-emerald-500/50" />
          Đang hoạt động (Online)
        </span>
      ),
      onClick: () => setPresence('active'),
    },
    {
      key: 'dnd',
      label: (
        <span className="flex items-center gap-2 text-rose-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
          Bận / Đang làm khách (DND)
        </span>
      ),
      onClick: () => setPresence('dnd'),
    },
    {
      key: 'away',
      label: (
        <span className="flex items-center gap-2 text-amber-400 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          Vắng mặt (Tạm rời máy)
        </span>
      ),
      onClick: () => setPresence('away'),
    },
  ];

  const openTaskCount = tasks.filter((t) => !t.done).length;
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);

  // View: INBOX
  if (mobileView === 'inbox') {
    return (
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 shadow-sm flex flex-col">
        <HeaderRoleQuickSwitch
          variant="standalone-bar"
          userRole={currentUser?.role}
          unreadChatCount={totalUnreadCount}
        />
        <div className="px-4 pt-2.5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-md shadow-amber-500/20 text-white font-bold text-base">
              🪽
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none flex items-center gap-2">
                mOS Chat
                {totalUnreadCount > 0 && (
                  <span className="px-1.5 py-0.5 text-xs font-semibold bg-rose-500 text-white rounded-full leading-none tabular-nums animate-pulse">
                    {totalUnreadCount}
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Wings Enterprise Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenPushSettings && (
              <button
                type="button"
                onClick={onOpenPushSettings}
                className={`relative p-2 rounded-full border active:scale-95 transition-transform ${
                  isPushSubscribed
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-slate-800/80 border-slate-700/60 text-amber-400'
                }`}
                aria-label="Chuông báo cuộc gọi khi khóa máy"
                title="Bật chuông báo cuộc gọi khi khóa màn hình iPhone"
              >
                {isPushSubscribed ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                {!isPushSubscribed && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                )}
              </button>
            )}
            {onOpenSearch && (
              <button
                type="button"
                onClick={onOpenSearch}
                className="p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700/60 active:scale-95 transition-transform"
                aria-label="Tìm kiếm tin nhắn"
                title="Tìm kiếm tin nhắn (⌘K)"
              >
                <Search className="w-4 h-4 text-amber-400" />
              </button>
            )}
            <Dropdown menu={{ items: presenceMenuItems }} trigger={['click']} placement="bottomRight">
              <button
                type="button"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-slate-300 active:scale-95 transition-transform"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    presence === 'active'
                      ? 'bg-emerald-500 shadow-sm shadow-emerald-500/80'
                      : presence === 'dnd'
                        ? 'bg-rose-500'
                        : 'bg-amber-500'
                  }`}
                />
                <span className="capitalize">
                  {presence === 'active' ? 'Online' : presence === 'dnd' ? 'Bận' : 'Vắng'}
                </span>
              </button>
            </Dropdown>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700/60 active:scale-95 transition-transform cursor-pointer"
                aria-label="Đóng Chat"
                title="Đóng Chat"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  // View: THREAD
  if (mobileView === 'thread') {
    return (
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-3 pt-[max(env(safe-area-inset-top),14px)] pb-3 flex items-center justify-between shadow-sm">
        <button
          type="button"
          onClick={() => setMobileView('room')}
          className="flex items-center gap-1 text-amber-400 font-semibold text-sm py-1 pr-2 active:opacity-70 transition-opacity"
        >
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span>Quay lại</span>
        </button>

        <div className="text-center flex-1 mx-2">
          <h2 className="text-sm font-bold text-white truncate leading-snug">Luồng thảo luận</h2>
          <p className="text-[11px] text-slate-400 leading-none">Trả lời tin nhắn</p>
        </div>

        <div className="flex items-center justify-end min-w-[70px]">
          <button
            type="button"
            onClick={onOpenTaskModal}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all active:scale-95 border ${
              linkedTask
                ? linkedTask.done
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title={linkedTask ? `Main Task: ${linkedTask.title}` : 'Giao việc cho tin nhắn cha'}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span className="truncate max-w-[70px]">
              {linkedTask ? (linkedTask.done ? 'Đã xong' : 'Việc') : '+ Việc'}
            </span>
          </button>
        </div>
      </header>
    );
  }

  // View: ROOM (Active Conversation)
  const isAiCopilot = activeConversation?.id === AI_COPILOT_CONV_ID;
  const isSpace = activeConversation?.type === 'space';
  const roomTitle = activeConversation?.name || 'Phòng trò chuyện';
  const subtitle =
    activeConversation?.subtitle ||
    (isSpace ? `${activeConversation?.memberCount || 12} thành viên` : 'Cuộc trò chuyện trực tiếp');
  const isRoomPinned = Boolean(activeConversation && pinnedConvIds?.has(activeConversation.id));

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 shadow-sm flex flex-col">
      <div className="px-3 pt-[max(env(safe-area-inset-top),14px)] pb-2.5 flex items-center justify-between gap-2">
        {/* Left: Back button + Room Identity (Strictly Left-Aligned) */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => {
              setMoreMenuOpen(false);
              setActiveSubtab('chat');
              setMobileView('inbox');
            }}
            className="shrink-0 flex items-center text-amber-400 font-medium text-sm py-1 pr-1 active:opacity-70 transition-opacity"
            aria-label="Quay lại danh sách hội thoại"
          >
            <ChevronLeft className="w-6 h-6 -ml-1 text-amber-400" />
          </button>

          <div
            onClick={isSpace ? onOpenSettings : undefined}
            role={isSpace ? 'button' : undefined}
            className={`flex-1 min-w-0 flex items-center justify-start ${
              isSpace ? 'cursor-pointer active:opacity-75' : ''
            }`}
          >
            {isAiCopilot ? (
              <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 shrink-0">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-white truncate leading-snug">🤖 MAI</h2>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-bold uppercase border border-purple-500/40 shrink-0">
                      mOS AI
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-300/80 truncate leading-none mt-0.5">
                    Tra cứu & Phân tích riêng tư
                  </p>
                </div>
              </div>
            ) : isSpace ? (
              <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700/70 flex items-center justify-center shrink-0">
                  {activeConversation?.avatar && isSpaceEmoji(activeConversation.avatar) ? (
                    <span className="text-base leading-none">{activeConversation.avatar}</span>
                  ) : (
                    <Hash className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="text-sm font-bold text-white truncate leading-snug">{roomTitle}</h2>
                    {isRoomPinned && (
                      <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" aria-label="Đã ghim" />
                    )}
                  </div>
                  <p
                    onClick={(e) => {
                      if (onOpenMembersModal) {
                        e.stopPropagation();
                        onOpenMembersModal();
                      }
                    }}
                    className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors truncate leading-none mt-0.5"
                  >
                    {subtitle}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
                <div className="shrink-0">
                  <MosChatAvatar
                    size="md"
                    src={activeConversation?.avatar}
                    name={roomTitle}
                    staffId={activeConversation?.participantStaffId}
                    staffDirectory={staffDirectory}
                    showOnline={true}
                    isOnline={true}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="text-sm font-bold text-white truncate leading-snug">{roomTitle}</h2>
                    {isRoomPinned && (
                      <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" aria-label="Đã ghim" />
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 truncate leading-none mt-0.5">{subtitle}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Strictly 3 Primary Controls [📞 Call] [☑️ Tasks] [⋯ More] */}
        <div className="shrink-0 flex items-center gap-1.5 relative">
          {isAiCopilot ? (
            <button
              type="button"
              onClick={() => {
                Modal.confirm({
                  title: 'Làm mới cuộc trò chuyện với MAI?',
                  content: 'Toàn bộ tin nhắn cũ trong phiên làm việc này sẽ được dọn dẹp để bắt đầu câu hỏi mới.',
                  okText: 'Làm mới',
                  cancelText: 'Huỷ',
                  okButtonProps: { danger: true },
                  onOk: () => resetAiChat?.(),
                });
              }}
              className="p-2 text-purple-300 hover:text-white rounded-full hover:bg-slate-800 transition-colors active:scale-95"
              aria-label="Làm mới cuộc trò chuyện với MAI"
              title="Làm mới cuộc trò chuyện với MAI"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          ) : (
            <>
              {/* 1. Prominent Emerald Voice Call Button */}
              <button
                type="button"
                onClick={onCallRoom}
                className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm shadow-emerald-500/10"
                aria-label="Gọi thoại nội bộ mOS"
                title="Gọi thoại nội bộ mOS"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
              </button>

              {/* Push Notification / Call Ring Settings Button */}
              {onOpenPushSettings && (
                <button
                  type="button"
                  onClick={onOpenPushSettings}
                  className={`w-9 h-9 relative rounded-full flex items-center justify-center transition-all active:scale-95 cursor-pointer border ${
                    isPushSubscribed
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                      : 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                  }`}
                  aria-label="Chuông báo cuộc gọi khi khóa máy"
                  title="Chuông báo cuộc gọi khi khóa màn hình"
                >
                  {isPushSubscribed ? <BellRing className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  {!isPushSubscribed && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                  )}
                </button>
              )}

              {/* 2. Tasks Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  setActiveSubtab(activeSubtab === 'tasks' ? 'chat' : 'tasks');
                }}
                className={`w-9 h-9 relative rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer border ${
                  activeSubtab === 'tasks'
                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-800/70 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
                aria-label="Xem danh sách công việc"
                title="Danh sách công việc"
              >
                <CheckSquare className="w-4 h-4" />
                {openTaskCount > 0 && activeSubtab !== 'tasks' && (
                  <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-400 border border-slate-900" />
                )}
              </button>

              {/* 3. More Menu Button [⋯] */}
              <button
                type="button"
                onClick={() => setMoreMenuOpen((prev) => !prev)}
                className={`w-9 h-9 relative rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer border ${
                  moreMenuOpen || activeSubtab === 'pinned'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-slate-800/70 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
                aria-label="Mở menu tùy chọn phòng chat"
                title="Tùy chọn phòng chat"
              >
                <MoreVertical className="w-4 h-4" />
                {(pinnedMessages.length > 0 || !isPushSubscribed) && !moreMenuOpen && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>

              {/* Backdrop to close More Menu on outside tap */}
              {moreMenuOpen && <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} />}

              {/* Overflow Menu Panel (kept mounted with hidden class when closed so accessibility & unit tests work seamlessly) */}
              <div
                className={
                  moreMenuOpen
                    ? 'absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-slate-700/80 shadow-2xl py-1.5 text-slate-100'
                    : 'hidden'
                }
              >
                {onOpenSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      onOpenSearch();
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-800/80 active:bg-slate-800 text-left text-xs font-medium transition-colors cursor-pointer"
                    aria-label="Tìm kiếm tin nhắn"
                  >
                    <Search className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="flex-1">Tìm kiếm tin nhắn</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setActiveSubtab(activeSubtab === 'pinned' ? 'chat' : 'pinned');
                  }}
                  className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-800/80 active:bg-slate-800 text-left text-xs font-medium transition-colors cursor-pointer"
                  aria-label="Xem tin nhắn đã ghim"
                >
                  <Pin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="flex-1">Xem tin nhắn đã ghim</span>
                  {pinnedMessages.length > 0 && (
                    <span className="inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 tabular-nums">
                      {pinnedMessages.length}
                    </span>
                  )}
                </button>

                {activeConversation && activeConversation.id !== AI_COPILOT_CONV_ID && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      togglePinConversation(activeConversation.id);
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-800/80 active:bg-slate-800 text-left text-xs font-medium transition-colors cursor-pointer"
                    aria-label={
                      isRoomPinned
                        ? isSpace
                          ? 'Bỏ ghim Không gian này'
                          : 'Bỏ ghim cuộc trò chuyện này'
                        : isSpace
                          ? 'Ghim Không gian này lên đầu'
                          : 'Ghim cuộc trò chuyện này lên đầu'
                    }
                  >
                    <Pin
                      className={`w-4 h-4 shrink-0 ${
                        isRoomPinned ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="flex-1">
                      {isRoomPinned ? 'Bỏ ghim khỏi đầu danh sách' : 'Ghim hội thoại lên đầu'}
                    </span>
                  </button>
                )}

                {isSpace && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      onOpenMembersModal?.();
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-800/80 active:bg-slate-800 text-left text-xs font-medium transition-colors cursor-pointer"
                    aria-label="Thành viên Không gian"
                  >
                    <UserPlus className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="flex-1">Thành viên Không gian</span>
                  </button>
                )}

                {onOpenPushSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      onOpenPushSettings();
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-800/80 active:bg-slate-800 text-left text-xs font-medium transition-colors cursor-pointer border-t border-slate-800/80 mt-1 pt-2.5"
                    aria-label="Chuông báo cuộc gọi khi khóa máy"
                  >
                    {isPushSubscribed ? (
                      <BellRing className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span className="flex-1">Chuông cuộc gọi khi khóa máy</span>
                    <span
                      className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[10px] font-bold ${
                        isPushSubscribed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {isPushSubscribed ? 'Đã bật' : 'Bật ngay'}
                    </span>
                  </button>
                )}

                {onClose && (
                  <button
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      onClose();
                    }}
                    className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-800/80 active:bg-slate-800 text-left text-xs font-medium text-rose-300 transition-colors cursor-pointer border-t border-slate-800/80 mt-1 pt-2.5"
                    aria-label="Đóng Chat"
                  >
                    <X className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="flex-1">Đóng mOS Chat</span>
                  </button>
                )}
              </div>
            </>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700/60 active:scale-95 transition-transform cursor-pointer"
              aria-label="Đóng Chat"
              title="Đóng Chat"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Slim Return Bar when viewing Pinned Messages tab */}
      {activeSubtab === 'pinned' && (
        <div className="px-3 py-1.5 bg-amber-500/15 border-t border-amber-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
            <Pin className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span>Đang xem Tin nhắn đã ghim ({pinnedMessages.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubtab('chat')}
            className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-bold text-[11px] active:scale-95 transition-transform cursor-pointer"
          >
            Quay lại Chat
          </button>
        </div>
      )}
    </header>
  );
};
