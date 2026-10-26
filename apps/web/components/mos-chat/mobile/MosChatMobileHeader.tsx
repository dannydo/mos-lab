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
} from 'lucide-react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useMosChat } from '../context/MosChatContext';
import type { MosChatPresenceStatus } from '@mos-lab/shared';
import { isSpaceEmoji } from '../constants/chat-constants';
import { MosChatAvatar } from '../MosChatAvatar';

export interface MosChatMobileHeaderProps {
  onOpenSettings?: () => void;
  onCallRoom?: () => void;
  onOpenTaskModal?: () => void;
  onOpenMembersModal?: () => void;
}

export const MosChatMobileHeader: React.FC<MosChatMobileHeaderProps> = ({
  onOpenSettings,
  onCallRoom,
  onOpenTaskModal,
  onOpenMembersModal,
}) => {
  const {
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

  // View: INBOX
  if (mobileView === 'inbox') {
    return (
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-4 pt-[max(env(safe-area-inset-top),14px)] pb-3 flex items-center justify-between shadow-sm">
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
  const isSpace = activeConversation?.type === 'space';
  const roomTitle = activeConversation?.name || 'Phòng trò chuyện';
  const subtitle =
    activeConversation?.subtitle ||
    (isSpace ? `${activeConversation?.memberCount || 12} thành viên` : 'Cuộc trò chuyện trực tiếp');

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800/80 px-3 pt-[max(env(safe-area-inset-top),14px)] pb-2.5 flex items-center justify-between shadow-sm">
      {/* Back button to inbox */}
      <button
        type="button"
        onClick={() => {
          setActiveSubtab('chat');
          setMobileView('inbox');
        }}
        className="flex items-center gap-0.5 text-amber-400 font-medium text-sm py-1 pr-2 active:opacity-70 transition-opacity"
        aria-label="Quay lại danh sách hội thoại"
      >
        <ChevronLeft className="w-6 h-6 -ml-1 text-amber-400" />
        <span className="hidden sm:inline">Hộp thư</span>
      </button>

      {/* Room identity info */}
      <div
        onClick={isSpace ? onOpenSettings : undefined}
        role={isSpace ? 'button' : undefined}
        className={`flex-1 min-w-0 mx-2 flex items-center justify-center ${isSpace ? 'cursor-pointer active:opacity-75' : ''}`}
      >
        {isSpace ? (
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-1.5 max-w-[230px] justify-center">
              {activeConversation?.avatar && isSpaceEmoji(activeConversation.avatar) ? (
                <span className="text-base shrink-0 leading-none">{activeConversation.avatar}</span>
              ) : (
                <Hash className="w-4 h-4 text-amber-400 shrink-0" />
              )}
              <h2 className="text-sm font-bold text-white truncate">{roomTitle}</h2>
            </div>
            <p
              onClick={(e) => {
                if (onOpenMembersModal) {
                  e.stopPropagation();
                  onOpenMembersModal();
                }
              }}
              className="text-[11px] text-slate-400 hover:text-emerald-400 transition-colors truncate max-w-[220px]"
            >
              {subtitle}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 max-w-[240px] text-left">
            <MosChatAvatar
              size="md"
              src={activeConversation?.avatar}
              name={roomTitle}
              staffId={activeConversation?.participantStaffId}
              staffDirectory={staffDirectory}
              showOnline={true}
              isOnline={true}
            />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-white truncate leading-snug">{roomTitle}</h2>
              <p className="text-[11px] text-slate-400 truncate leading-none mt-0.5">{subtitle}</p>
            </div>
          </div>
        )}
      </div>

      {/* Right actions: Space Members & Tasks toggle & Phone call */}
      <div className="flex items-center gap-1">
        {isSpace && (
          <button
            type="button"
            onClick={onOpenMembersModal}
            className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-slate-800 transition-colors active:scale-95 cursor-pointer"
            aria-label="Thành viên Không gian"
            title="Thêm và quản lý thành viên Không gian"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
          </button>
        )}

        {/* Toggle Pinned Messages */}
        <button
          type="button"
          onClick={() => setActiveSubtab(activeSubtab === 'pinned' ? 'chat' : 'pinned')}
          className={`relative p-2 rounded-full transition-colors active:scale-95 ${
            activeSubtab === 'pinned'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-300 hover:bg-slate-800'
          }`}
          aria-label="Xem tin nhắn đã ghim"
          title="Tin nhắn đã ghim"
        >
          <Pin className={`w-4 h-4 ${pinnedMessages.length > 0 ? 'fill-current' : ''}`} />
          {pinnedMessages.length > 0 && activeSubtab !== 'pinned' && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>

        {/* Toggle between Chat & Tasks */}
        <button
          type="button"
          onClick={() => setActiveSubtab(activeSubtab === 'tasks' ? 'chat' : 'tasks')}
          className={`relative p-2 rounded-full transition-colors active:scale-95 ${
            activeSubtab === 'tasks' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-300 hover:bg-slate-800'
          }`}
          aria-label="Xem danh sách công việc"
        >
          <CheckSquare className="w-4 h-4" />
          {openTaskCount > 0 && activeSubtab !== 'tasks' && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
          )}
        </button>

        {/* Quick Phone Call */}
        <button
          type="button"
          onClick={onCallRoom}
          className="p-2 text-slate-300 hover:text-white rounded-full hover:bg-slate-800 transition-colors active:scale-95"
          aria-label="Gọi thoại OmiCall"
        >
          <Phone className="w-4 h-4 text-emerald-400" />
        </button>
      </div>
    </header>
  );
};
