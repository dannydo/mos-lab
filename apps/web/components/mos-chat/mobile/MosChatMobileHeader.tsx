'use client';

import React from 'react';
import {
  ChevronLeft,
  Phone,
  CheckSquare,
  Search,
  MoreHorizontal,
  SquarePen,
  Hash,
  Sparkles,
  UserPlus,
  Pin,
  RefreshCw,
  Bell,
  BellRing,
  X,
  Palette,
  FolderOpen,
} from 'lucide-react';
import { Modal } from 'antd';
import { useTheme } from '../../../context/ThemeContext';
import { useMosChat } from '../context/MosChatContext';
import { AI_COPILOT_CONV_ID, isSpaceEmoji } from '../constants/chat-constants';
import { countConversationSharedWorkspaceItems } from '../components/MosChatFilesPane';
import { MosChatAvatar } from '../MosChatAvatar';
import HeaderRoleQuickSwitch from '../../layout/HeaderRoleQuickSwitch';

export interface MosChatMobileHeaderProps {
  onOpenSettings?: () => void;
  onCallRoom?: () => void;
  onOpenTaskModal?: () => void;
  onOpenMembersModal?: () => void;
  onOpenSearch?: () => void;
  onOpenPushSettings?: () => void;
  onOpenThemeSheet?: () => void;
  onOpenNewDm?: () => void;
  isPushSubscribed?: boolean;
  onClose?: () => void;
}

const PRESENCE_OPTIONS = [
  { id: 'active', label: 'Online', dotClass: 'bg-emerald-500' },
  { id: 'dnd', label: 'Bận', dotClass: 'bg-rose-500' },
  { id: 'away', label: 'Vắng', dotClass: 'bg-amber-500' },
] as const;

export const MosChatMobileHeader: React.FC<MosChatMobileHeaderProps> = ({
  onOpenSettings,
  onCallRoom,
  onOpenTaskModal,
  onOpenMembersModal,
  onOpenSearch,
  onOpenPushSettings,
  onOpenThemeSheet,
  onOpenNewDm,
  isPushSubscribed = false,
  onClose,
}) => {
  const { themeMode = 'dark' } = useTheme();
  const isDark = themeMode === 'dark';
  const {
    currentUser,
    mobileView,
    setMobileView,
    activeConversation,
    presence,
    setPresence,
    activeSubtab,
    setActiveSubtab,
    sidebarFilter,
    setSidebarFilter,
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

  const openTaskCount = tasks.filter((t) => !t.done).length;
  const pinnedConvCount = pinnedConvIds?.size || 0;
  const filesCount = React.useMemo(
    () => countConversationSharedWorkspaceItems(activeConversation),
    [activeConversation]
  );
  const [moreMenuOpen, setMoreMenuOpen] = React.useState(false);
  const [inboxMenuOpen, setInboxMenuOpen] = React.useState(false);

  React.useEffect(() => {
    setMoreMenuOpen(false);
    setInboxMenuOpen(false);
  }, [mobileView]);

  const presenceDotClass =
    presence === 'active' ? 'bg-emerald-500' : presence === 'dnd' ? 'bg-rose-500' : 'bg-amber-500';

  // View: INBOX — Apple Messages style single ~44px header
  if (mobileView === 'inbox') {
    return (
      <header className="sticky top-0 z-40 bg-[var(--mos-surface)]/90 backdrop-blur-xl border-b border-[var(--mos-surface-border)] shadow-xs flex flex-col select-none">
        <div className="px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2 min-h-[44px] flex items-center justify-between gap-2">
          {/* Left: [⋯] Utility & Navigation Menu */}
          <div className="w-20 flex items-center justify-start relative shrink-0">
            <button
              type="button"
              data-testid="mos-chat-inbox-more-btn"
              onClick={() => setInboxMenuOpen((prev) => !prev)}
              className={`w-8 h-8 relative rounded-full border flex items-center justify-center transition-colors active:scale-95 cursor-pointer ${
                inboxMenuOpen
                  ? isDark
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'bg-[var(--mos-surface-muted)] border-[var(--mos-surface-border)] text-[var(--mos-text)] hover:opacity-85'
              }`}
              aria-label="Mở menu tiện ích & điều hướng"
              aria-expanded={inboxMenuOpen}
              title="Menu tiện ích & điều hướng"
            >
              <MoreHorizontal className="w-4 h-4" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-[var(--mos-surface)] ${presenceDotClass}`}
                aria-hidden="true"
              />
              {(!isPushSubscribed || openTaskCount > 0) && !inboxMenuOpen && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-400" aria-hidden="true" />
              )}
            </button>

            {inboxMenuOpen && (
              <div className="fixed inset-0 z-40" onClick={() => setInboxMenuOpen(false)} aria-hidden="true" />
            )}

            {/* Overflow Menu Panel (kept mounted with hidden class when closed so accessibility & unit tests work seamlessly) */}
            <div
              data-testid="mos-chat-inbox-more-menu"
              className={
                inboxMenuOpen
                  ? 'absolute left-0 top-full mt-2 z-50 w-72 rounded-2xl bg-[var(--mos-surface)]/98 backdrop-blur-2xl border border-[var(--mos-surface-border)] shadow-2xl p-2 text-[var(--mos-text)]'
                  : 'hidden'
              }
            >
              {/* 3-segment Presence Switcher */}
              <div
                role="group"
                aria-label="Trạng thái hoạt động"
                className="grid grid-cols-3 gap-1 p-1 mb-1.5 rounded-xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)]"
              >
                {PRESENCE_OPTIONS.map((opt) => {
                  const active = presence === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPresence(opt.id);
                        setInboxMenuOpen(false);
                      }}
                      aria-pressed={active}
                      className={`py-1.5 px-2 rounded-lg text-[11px] inline-flex items-center justify-center gap-1.5 leading-none transition-all active:scale-95 cursor-pointer ${
                        active
                          ? 'bg-[var(--mos-surface)] text-[var(--mos-text)] font-bold shadow-xs'
                          : 'text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] font-medium'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotClass}`} />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Kho Công việc */}
              <button
                type="button"
                aria-label="Kho Công việc & Nhắc hẹn (Tasks)"
                onClick={() => {
                  setInboxMenuOpen(false);
                  setActiveSubtab('tasks');
                  setMobileView('room');
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
              >
                <CheckSquare className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span className="flex-1">Kho Công việc</span>
                {openTaskCount > 0 && (
                  <span
                    className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[11px] font-bold tabular-nums ${
                      isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {openTaskCount}
                  </span>
                )}
              </button>

              {/* Hội thoại đã ghim */}
              <button
                type="button"
                aria-label="Lọc hội thoại đã ghim"
                onClick={() => {
                  setInboxMenuOpen(false);
                  setSidebarFilter?.(sidebarFilter === 'pinned' ? 'all' : 'pinned');
                }}
                className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
              >
                <Pin
                  className={`w-4 h-4 shrink-0 ${
                    sidebarFilter === 'pinned'
                      ? isDark
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-amber-600 fill-amber-600'
                      : 'text-[var(--mos-text-muted)]'
                  }`}
                />
                <span className="flex-1">Hội thoại đã ghim</span>
                {pinnedConvCount > 0 && (
                  <span
                    className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[11px] font-bold tabular-nums ${
                      isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pinnedConvCount}
                  </span>
                )}
              </button>

              {/* Tìm kiếm tin nhắn */}
              {onOpenSearch && (
                <button
                  type="button"
                  aria-label="Tìm kiếm tin nhắn"
                  onClick={() => {
                    setInboxMenuOpen(false);
                    onOpenSearch();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
                >
                  <Search className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  <span className="flex-1">Tìm kiếm tin nhắn</span>
                </button>
              )}

              {/* Giao diện & Cỡ chữ */}
              {onOpenThemeSheet && (
                <button
                  type="button"
                  aria-label="Giao diện & Chủ đề"
                  onClick={() => {
                    setInboxMenuOpen(false);
                    onOpenThemeSheet();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
                >
                  <Palette className="w-4 h-4 text-[var(--mos-accent)] shrink-0" />
                  <span className="flex-1">Giao diện & Cỡ chữ</span>
                </button>
              )}

              {/* Chuông khi khóa máy */}
              {onOpenPushSettings && (
                <button
                  type="button"
                  data-testid="mos-chat-menu-push-item"
                  aria-label="Chuông báo cuộc gọi khi khóa máy"
                  onClick={() => {
                    setInboxMenuOpen(false);
                    onOpenPushSettings();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
                >
                  {isPushSubscribed ? (
                    <BellRing className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <span className="flex-1">Chuông khi khóa máy</span>
                  <span
                    className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[10px] font-bold ${
                      isPushSubscribed
                        ? isDark
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-emerald-100 text-emerald-700'
                        : isDark
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isPushSubscribed ? 'Đã bật' : 'Bật ngay'}
                  </span>
                </button>
              )}

              {/* App Navigation Quick Switcher */}
              <HeaderRoleQuickSwitch
                variant="menu-list"
                userRole={currentUser?.role}
                unreadChatCount={totalUnreadCount}
                onNavigate={() => setInboxMenuOpen(false)}
              />
            </div>
          </div>

          {/* Center: Clean Title "Chat" + Unread Badge */}
          <div className="flex-1 flex items-center justify-center min-w-0">
            <h1 className="text-base font-semibold text-[var(--mos-text)] tracking-tight leading-none inline-flex items-center gap-1.5">
              <span>Chat</span>
              {totalUnreadCount > 0 && (
                <span className="inline-flex items-center justify-center leading-none px-1.5 py-0.5 text-[11px] font-bold bg-rose-500 text-white rounded-full tabular-nums">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </span>
              )}
            </h1>
          </div>

          {/* Right: [📝 Compose] + Optional [✕ Close] */}
          <div className="w-20 flex items-center justify-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => onOpenNewDm?.()}
              className="w-8 h-8 rounded-full bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] text-[var(--mos-accent)] hover:opacity-85 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
              aria-label="Soạn tin nhắn DM mới"
              title="Tin nhắn mới / Danh bạ"
            >
              <SquarePen className="w-4 h-4" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full text-[var(--mos-text-muted)] hover:text-[var(--mos-text)] bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
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
      <header className="sticky top-0 z-40 bg-[var(--mos-surface)]/90 backdrop-blur-xl border-b border-[var(--mos-surface-border)] px-3 pt-[max(env(safe-area-inset-top),10px)] pb-2 min-h-[44px] flex items-center justify-between shadow-xs select-none">
        <button
          type="button"
          onClick={() => setMobileView('room')}
          className={`inline-flex items-center gap-1 font-semibold text-sm py-1 pr-2 active:opacity-70 transition-opacity cursor-pointer ${
            isDark ? 'text-amber-400' : 'text-amber-600'
          }`}
        >
          <ChevronLeft className="w-5 h-5 -ml-1" />
          <span>Quay lại</span>
        </button>

        <div className="text-center flex-1 mx-2 min-w-0">
          <h2 className="text-sm font-bold text-[var(--mos-text)] truncate leading-snug">Luồng thảo luận</h2>
          <p className="text-[11px] text-[var(--mos-text-muted)] leading-none">Trả lời tin nhắn</p>
        </div>

        <div className="flex items-center justify-end min-w-[70px]">
          <button
            type="button"
            onClick={onOpenTaskModal}
            className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold leading-none transition-all active:scale-95 border cursor-pointer ${
              linkedTask
                ? linkedTask.done
                  ? isDark
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isDark
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-[var(--mos-surface-muted)] hover:opacity-85 text-[var(--mos-text)] border-[var(--mos-surface-border)]'
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

  // View: ROOM (Active Conversation or Tasks Subtab)
  const isAiCopilot = activeConversation?.id === AI_COPILOT_CONV_ID;
  const isSpace = activeConversation?.type === 'space';
  const isTasksSubtab = activeSubtab === 'tasks';
  const roomTitle = isTasksSubtab ? 'Kho Công việc' : activeConversation?.name || 'Phòng trò chuyện';
  const subtitle = isTasksSubtab
    ? activeConversation?.name || 'Nhắc hẹn & Công việc'
    : activeConversation?.subtitle ||
      (isSpace ? `${activeConversation?.memberCount || 12} thành viên` : 'Cuộc trò chuyện trực tiếp');
  const isRoomPinned = Boolean(activeConversation && pinnedConvIds?.has(activeConversation.id));

  return (
    <header className="sticky top-0 z-40 bg-[var(--mos-surface)]/90 backdrop-blur-xl border-b border-[var(--mos-surface-border)] shadow-xs flex flex-col select-none">
      <div className="px-3 pt-[max(env(safe-area-inset-top),10px)] pb-2 min-h-[44px] flex items-center justify-between gap-2">
        {/* Left: Back button + Compact Room Identity */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            type="button"
            onClick={() => {
              setMoreMenuOpen(false);
              setActiveSubtab('chat');
              setMobileView('inbox');
            }}
            className={`shrink-0 inline-flex items-center font-medium text-sm py-1 pr-1 active:opacity-70 transition-opacity cursor-pointer ${
              isDark ? 'text-amber-400' : 'text-amber-600'
            }`}
            aria-label="Quay lại danh sách hội thoại"
          >
            <ChevronLeft className="w-5 h-5 -ml-1" />
            {totalUnreadCount > 0 && (
              <span className="text-xs font-semibold tabular-nums -ml-0.5 leading-none">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </button>

          <div
            onClick={!isTasksSubtab && isSpace ? onOpenSettings : undefined}
            role={!isTasksSubtab && isSpace ? 'button' : undefined}
            className={`flex-1 min-w-0 flex items-center justify-start ${
              !isTasksSubtab && isSpace ? 'cursor-pointer active:opacity-75' : ''
            }`}
          >
            {isTasksSubtab ? (
              <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                    isDark
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'bg-amber-50 border-amber-200 text-amber-700'
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-[var(--mos-text)] truncate leading-snug">{roomTitle}</h2>
                  <p className="text-[11px] text-[var(--mos-text-muted)] truncate leading-none mt-0.5">{subtitle}</p>
                </div>
              </div>
            ) : isAiCopilot ? (
              <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20 shrink-0">
                  <Sparkles className="w-4 h-4 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-sm font-bold text-[var(--mos-text)] truncate leading-snug">🤖 MAI</h2>
                    <span
                      className={`inline-flex items-center justify-center leading-none text-[10px] px-1.5 py-0.5 rounded font-bold uppercase border shrink-0 ${
                        isDark
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-purple-100 text-purple-700 border-purple-200'
                      }`}
                    >
                      mOS AI
                    </span>
                  </div>
                  <p
                    className={`text-[11px] truncate leading-none mt-0.5 ${isDark ? 'text-purple-300/80' : 'text-purple-700'}`}
                  >
                    Tra cứu & Phân tích riêng tư
                  </p>
                </div>
              </div>
            ) : isSpace ? (
              <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                <div className="w-8 h-8 rounded-xl bg-[var(--mos-surface-muted)] border border-[var(--mos-surface-border)] flex items-center justify-center shrink-0">
                  {activeConversation?.avatar && isSpaceEmoji(activeConversation.avatar) ? (
                    <span className="text-sm leading-none">{activeConversation.avatar}</span>
                  ) : (
                    <Hash className={`w-4 h-4 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="text-sm font-bold text-[var(--mos-text)] truncate leading-snug">{roomTitle}</h2>
                    {isRoomPinned && (
                      <Pin
                        className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400 fill-amber-400' : 'text-amber-600 fill-amber-600'}`}
                        aria-label="Đã ghim"
                      />
                    )}
                  </div>
                  <p
                    onClick={(e) => {
                      if (onOpenMembersModal) {
                        e.stopPropagation();
                        onOpenMembersModal();
                      }
                    }}
                    className="text-[11px] text-[var(--mos-text-muted)] hover:text-emerald-500 transition-colors truncate leading-none mt-0.5"
                  >
                    {subtitle}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
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
                    <h2 className="text-sm font-bold text-[var(--mos-text)] truncate leading-snug">{roomTitle}</h2>
                    {isRoomPinned && (
                      <Pin
                        className={`w-3.5 h-3.5 shrink-0 ${isDark ? 'text-amber-400 fill-amber-400' : 'text-amber-600 fill-amber-600'}`}
                        aria-label="Đã ghim"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--mos-text-muted)] truncate leading-none mt-0.5">{subtitle}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Actions: Strictly 2 flat minimalist controls ([📞] or [↻]) + [⋯ More] */}
        <div className="shrink-0 flex items-center gap-1 relative">
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
              className={`w-8 h-8 rounded-full hover:bg-[var(--mos-surface-muted)] flex items-center justify-center transition-colors active:scale-95 cursor-pointer ${
                isDark ? 'text-purple-300 hover:text-white' : 'text-purple-700'
              }`}
              aria-label="Làm mới cuộc trò chuyện với MAI"
              title="Làm mới cuộc trò chuyện với MAI"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onCallRoom}
              className="w-8 h-8 rounded-full text-emerald-500 hover:bg-emerald-500/10 flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              aria-label="Gọi thoại nội bộ mOS"
              title="Gọi thoại nội bộ mOS"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}

          {/* More Menu Button [⋯] */}
          <button
            type="button"
            data-testid="mos-chat-room-more-btn"
            onClick={() => setMoreMenuOpen((prev) => !prev)}
            className={`w-8 h-8 relative rounded-full flex items-center justify-center transition-colors active:scale-95 cursor-pointer ${
              moreMenuOpen || activeSubtab === 'pinned' || activeSubtab === 'tasks' || activeSubtab === 'files'
                ? isDark
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-amber-50 text-amber-700'
                : 'text-[var(--mos-text)] hover:bg-[var(--mos-surface-muted)]'
            }`}
            aria-label="Mở menu tùy chọn phòng chat"
            aria-expanded={moreMenuOpen}
            title="Tùy chọn phòng chat"
          >
            <MoreHorizontal className="w-4 h-4" />
            {(openTaskCount > 0 || pinnedMessages.length > 0 || !isPushSubscribed) && !moreMenuOpen && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400" aria-hidden="true" />
            )}
          </button>

          {/* Backdrop to close More Menu on outside tap */}
          {moreMenuOpen && (
            <div className="fixed inset-0 z-40" onClick={() => setMoreMenuOpen(false)} aria-hidden="true" />
          )}

          {/* Overflow Menu Panel (kept mounted with hidden class when closed so accessibility & unit tests work seamlessly) */}
          <div
            data-testid="mos-chat-room-more-menu"
            className={
              moreMenuOpen
                ? 'absolute right-0 top-full mt-2 z-50 w-64 rounded-2xl bg-[var(--mos-surface)]/98 backdrop-blur-2xl border border-[var(--mos-surface-border)] shadow-2xl py-1.5 text-[var(--mos-text)]'
                : 'hidden'
            }
          >
            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen(false);
                setActiveSubtab(activeSubtab === 'tasks' ? 'chat' : 'tasks');
              }}
              className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
              aria-label="Xem danh sách công việc"
            >
              <CheckSquare className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <span className="flex-1">Công việc & Nhắc hẹn</span>
              {openTaskCount > 0 && (
                <span
                  className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[11px] font-bold tabular-nums ${
                    isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {openTaskCount}
                </span>
              )}
            </button>

            {onOpenSearch && (
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenSearch();
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
                aria-label="Tìm kiếm tin nhắn"
              >
                <Search className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                <span className="flex-1">Tìm kiếm tin nhắn</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen(false);
                setActiveSubtab(activeSubtab === 'pinned' ? 'chat' : 'pinned');
              }}
              className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
              aria-label="Xem tin nhắn đã ghim"
            >
              <Pin className={`w-4 h-4 shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
              <span className="flex-1">Xem tin nhắn đã ghim</span>
              {pinnedMessages.length > 0 && (
                <span
                  className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[11px] font-bold tabular-nums ${
                    isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {pinnedMessages.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setMoreMenuOpen(false);
                setActiveSubtab(activeSubtab === 'files' ? 'chat' : 'files');
              }}
              className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
              aria-label="Xem tài liệu và Google Sheet"
            >
              <FolderOpen className={`w-4 h-4 shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <span className="flex-1">Tài liệu & Google Sheet</span>
              {filesCount > 0 && (
                <span
                  className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[11px] font-bold tabular-nums ${
                    isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {filesCount}
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
                className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
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
                    isRoomPinned ? 'fill-amber-400 text-amber-400' : 'text-[var(--mos-text-muted)]'
                  }`}
                />
                <span className="flex-1">{isRoomPinned ? 'Bỏ ghim khỏi đầu danh sách' : 'Ghim hội thoại lên đầu'}</span>
              </button>
            )}

            {isSpace && (
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenMembersModal?.();
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
                aria-label="Thành viên Không gian"
              >
                <UserPlus className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="flex-1">Thành viên Không gian</span>
              </button>
            )}

            {onOpenThemeSheet && (
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenThemeSheet();
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer"
                aria-label="Giao diện & Chủ đề"
              >
                <Palette className="w-4 h-4 text-[var(--mos-accent)] shrink-0" />
                <span className="flex-1">Giao diện & Cỡ chữ</span>
              </button>
            )}

            {onOpenPushSettings && (
              <button
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  onOpenPushSettings();
                }}
                className="w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer border-t border-[var(--mos-surface-border)] mt-1 pt-2.5"
                aria-label="Chuông báo cuộc gọi khi khóa máy"
              >
                {isPushSubscribed ? (
                  <BellRing className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Bell className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <span className="flex-1">Chuông cuộc gọi khi khóa máy</span>
                <span
                  className={`inline-flex items-center justify-center leading-none py-0.5 px-2 rounded-full text-[10px] font-bold ${
                    isPushSubscribed
                      ? isDark
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-emerald-100 text-emerald-700'
                      : isDark
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-amber-100 text-amber-800'
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
                className={`w-full px-3.5 py-2.5 flex items-center gap-3 hover:bg-[var(--mos-surface-muted)] text-left text-xs font-medium transition-colors cursor-pointer border-t border-[var(--mos-surface-border)] mt-1 pt-2.5 ${
                  isDark ? 'text-rose-300' : 'text-rose-600'
                }`}
                aria-label="Đóng Chat"
              >
                <X className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="flex-1">Đóng mOS Chat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Slim Return Bar when viewing Tasks subtab inside an active conversation */}
      {isTasksSubtab && activeConversation && (
        <div
          className={`px-3 py-1.5 border-t flex items-center justify-between text-xs ${
            isDark ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 font-semibold truncate ${isDark ? 'text-amber-300' : 'text-amber-800'}`}
          >
            <CheckSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Đang xem Kho Công việc</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubtab('chat')}
            className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold text-[11px] active:scale-95 transition-transform cursor-pointer shrink-0"
          >
            Quay lại Chat
          </button>
        </div>
      )}

      {/* Slim Return Bar when viewing Pinned Messages tab */}
      {activeSubtab === 'pinned' && (
        <div
          className={`px-3 py-1.5 border-t flex items-center justify-between text-xs ${
            isDark ? 'bg-amber-500/15 border-amber-500/30' : 'bg-amber-50 border-amber-200'
          }`}
        >
          <div className={`flex items-center gap-1.5 font-semibold ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
            <Pin className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
            <span className="tabular-nums">Đang xem Tin nhắn đã ghim ({pinnedMessages.length})</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubtab('chat')}
            className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold text-[11px] active:scale-95 transition-transform cursor-pointer"
          >
            Quay lại Chat
          </button>
        </div>
      )}

      {/* Slim Return Bar when viewing Files & Google Workspace tab */}
      {activeSubtab === 'files' && (
        <div
          className={`px-3 py-1.5 border-t flex items-center justify-between text-xs ${
            isDark ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}
          >
            <FolderOpen className="w-3.5 h-3.5 shrink-0" />
            <span className="tabular-nums">Đang xem Tài liệu & Google Workspace ({filesCount})</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubtab('chat')}
            className="inline-flex items-center justify-center leading-none px-2.5 py-1 rounded-full bg-emerald-500 text-slate-950 font-bold text-[11px] active:scale-95 transition-transform cursor-pointer"
          >
            Quay lại Chat
          </button>
        </div>
      )}
    </header>
  );
};
