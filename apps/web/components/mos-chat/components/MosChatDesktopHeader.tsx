'use client';

import React from 'react';
import { Tooltip, type GlobalToken } from 'antd';
import {
  AlarmClock,
  BellRing,
  CheckSquare,
  ChevronLeft,
  ExternalLink,
  FolderOpen,
  Hash,
  Maximize2,
  MessageSquare,
  MessageSquareReply,
  Minimize2,
  PanelRightOpen,
  Phone,
  PhoneCall,
  Pin,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react';
import type { MosChatConversation, MosChatTaskItem, SafeAny } from '@mos-lab/shared';
import { useOmiCall } from '../../../context/OmiCallContext';
import { HeaderNotificationCenter } from '../../notification-center/HeaderNotificationCenter';
import { AI_COPILOT_CONV_ID, isSpaceEmoji } from '../constants/chat-constants';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import { dispatchOpenMosChatOmiCallDialer } from '../utils/omicall-dial-helpers';
import { MosChatHeaderOverflowMenu, type MosChatHeaderOverflowMenuProps } from './MosChatHeaderOverflowMenu';

export interface MosChatDesktopHeaderProps extends MosChatHeaderOverflowMenuProps {
  isDark: boolean;
  standalone: boolean;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
  currentUser: SafeAny;
  activeSubtab: MosChatActiveSubtab;
  setActiveSubtab: React.Dispatch<React.SetStateAction<MosChatActiveSubtab>>;
  setMobileActiveView: React.Dispatch<React.SetStateAction<'inbox' | 'conversation' | 'thread'>>;
  uniqueTasks: MosChatTaskItem[];
  workspaceSharedItemsCount: number;
  renderUserAvatarNode: (props: SafeAny) => React.ReactNode;
  isConversationParticipantOnline: (conv: MosChatConversation | null | undefined) => boolean;
  setSpaceConfigModalOpen: (open: boolean) => void;
  setSpaceMembersModalOpen: (open: boolean) => void;
  voiceCallCurrentCallId?: string | null;
  voiceCallIsConnecting: boolean;
  startOrJoinVoiceCall: (convId: string) => Promise<SafeAny> | void;
  searchModalOpen: boolean;
  setSearchModalOpen: (open: boolean) => void;
  ensurePortalOpen: () => void;
  navigateToMessageRef: React.MutableRefObject<(convId: string, msgId?: string) => void>;
  setNotifSettingsModalOpen: (open: boolean) => void;
  threadOpen: boolean;
  setThreadOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeThreadMsgId: string | null;
  setActiveThreadMsgId: React.Dispatch<React.SetStateAction<string | null>>;
  maximized: boolean;
  maximizedRef: React.MutableRefObject<boolean>;
  setMaximized: React.Dispatch<React.SetStateAction<boolean>>;
  persistPersonalLayout: (patch: {
    panelWidth?: number;
    sidebarWidth?: number;
    threadWidth?: number;
    maximized?: boolean;
  }) => void;
  onClose: () => void;
}

export const MosChatDesktopHeader: React.FC<MosChatDesktopHeaderProps> = (props) => {
  const {
    isDark,
    isMobile,
    standalone,
    token,
    surfaceBg,
    surfaceRaised,
    borderColor,
    currentUser,
    activeConversation,
    activeSubtab,
    setActiveSubtab,
    setMobileActiveView,
    uniqueTasks,
    workspaceSharedItemsCount,
    userPrefs,
    renderUserAvatarNode,
    isConversationParticipantOnline,
    setSpaceConfigModalOpen,
    setSpaceMembersModalOpen,
    voiceCallCurrentCallId,
    voiceCallIsConnecting,
    startOrJoinVoiceCall,
    searchModalOpen,
    setSearchModalOpen,
    ensurePortalOpen,
    navigateToMessageRef,
    setNotifSettingsModalOpen,
    threadOpen,
    setThreadOpen,
    activeThreadMsgId,
    setActiveThreadMsgId,
    maximized,
    maximizedRef,
    setMaximized,
    persistPersonalLayout,
    onClose,
  } = props;
  const { canAccessOmiCall, isRegistered: omicallRegistered, callState: omicallCallState } = useOmiCall();

  return (
    <div
      className="h-[52px] px-3 flex items-center justify-between gap-2 shrink-0"
      style={{ background: surfaceBg, borderBottom: `1px solid ${borderColor}` }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {isMobile && (
          <button
            type="button"
            aria-label="Quay lại danh sách hội thoại"
            onClick={() => {
              setMobileActiveView('inbox');
              if (activeSubtab === 'tasks') setActiveSubtab('chat');
            }}
            className="w-7 h-7 -ml-1 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10 shrink-0"
            style={{ color: token.colorText }}
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {activeSubtab === 'tasks' ? (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-xs shrink-0"
              style={{ background: 'rgba(212, 168, 75, 0.18)', color: '#d4a84b' }}
            >
              <AlarmClock size={16} />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-[13.5px] truncate">Kho Công Việc & Nhắc Hẹn</div>
              <div className="text-[11px] text-slate-400">
                {uniqueTasks.filter((t) => !t.done).length} đầu việc chưa xong
              </div>
            </div>
          </div>
        ) : (
          <>
            {activeConversation?.type === 'space' ? (
              <Tooltip title="Cài đặt & Cấu hình Không gian (Tên, Emoji, Màu sắc)">
                <div
                  onClick={() => setSpaceConfigModalOpen(true)}
                  role="button"
                  tabIndex={0}
                  aria-label="Cài đặt Không gian"
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-base shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  style={{
                    background: `${activeConversation?.color || '#10b981'}24`,
                    color: activeConversation?.color || '#10b981',
                  }}
                >
                  {activeConversation.avatar && isSpaceEmoji(activeConversation.avatar) ? (
                    <span className="select-none leading-none">{activeConversation.avatar}</span>
                  ) : (
                    <Hash size={16} />
                  )}
                </div>
              </Tooltip>
            ) : (
              renderUserAvatarNode({
                staffId: activeConversation?.isSelf ? currentUser?.id || 'me' : activeConversation?.participantStaffId,
                name: activeConversation?.name,
                rawAvatar: activeConversation?.avatar,
                bgColor: activeConversation?.color || '#10b981',
                sizeClass: 'w-8 h-8',
                roundedClass: 'rounded-full',
                isOnline: isConversationParticipantOnline(activeConversation),
                isAiBot: activeConversation?.id === AI_COPILOT_CONV_ID,
                isSelfBookmark: Boolean(activeConversation?.isSelf || activeConversation?.id.startsWith('dm-self-')),
              })
            )}
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="font-extrabold text-[13.5px] truncate">{activeConversation?.name}</span>
              {activeConversation && (userPrefs.pinnedIds || []).includes(activeConversation.id) && (
                <Tooltip title="Đã ghim lên đầu mục (Pinned)">
                  <Pin size={12} className="text-amber-400 fill-amber-400 shrink-0" />
                </Tooltip>
              )}
              {activeConversation && (userPrefs.manualUnreadIds || []).includes(activeConversation.id) && (
                <Tooltip title="Đã đánh dấu chưa đọc (Mark as unread)">
                  <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 shrink-0 border border-rose-500/30">
                    Chưa đọc
                  </span>
                </Tooltip>
              )}
              {activeConversation?.roleTag && activeConversation?.type !== 'space' && (
                <span
                  className="inline-flex items-center justify-center leading-none py-1 px-2 rounded-full text-[10px] font-bold tabular-nums shrink-0"
                  style={{
                    background:
                      activeConversation.id === AI_COPILOT_CONV_ID
                        ? 'rgba(139, 92, 246, 0.16)'
                        : 'rgba(16, 185, 129, 0.14)',
                    color: activeConversation.id === AI_COPILOT_CONV_ID ? '#a78bfa' : '#10b981',
                  }}
                >
                  {activeConversation.roleTag}
                </span>
              )}
              {activeConversation?.type === 'space' && (
                <Tooltip
                  title={`Xem và quản lý thành viên Không gian (${activeConversation.memberCount || activeConversation.memberIds?.length || 1} thành viên)`}
                >
                  <button
                    type="button"
                    aria-label="Quản lý thành viên Không gian"
                    onClick={() => setSpaceMembersModalOpen(true)}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors cursor-pointer hover:opacity-90 ml-0.5 shrink-0"
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                    }}
                  >
                    <Users size={13} />
                  </button>
                </Tooltip>
              )}
              {activeConversation?.type === 'space' && (
                <Tooltip title="Cài đặt & Cấu hình Không gian (Tên, Emoji, Màu sắc)">
                  <button
                    type="button"
                    aria-label="Cài đặt Không gian"
                    onClick={() => setSpaceConfigModalOpen(true)}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors cursor-pointer hover:opacity-90 ml-0.5 shrink-0"
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                    }}
                  >
                    <Settings size={13} />
                  </button>
                </Tooltip>
              )}
            </div>
          </>
        )}
      </div>

      {/* Sub-tabs: Chat | Tasks | Pinned | Files */}
      <div
        className="flex items-center gap-0.5 p-0.5 rounded-lg"
        style={{ background: surfaceRaised, border: `1px solid ${borderColor}` }}
      >
        <Tooltip title="Luồng trò chuyện">
          <button
            type="button"
            aria-label="Luồng trò chuyện"
            onClick={() => setActiveSubtab('chat')}
            className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors"
            style={{
              background: activeSubtab === 'chat' ? surfaceBg : 'transparent',
              color: activeSubtab === 'chat' ? '#d4a84b' : token.colorTextSecondary,
            }}
          >
            <MessageSquare size={14} />
          </button>
        </Tooltip>

        <Tooltip title={`Công việc & Nhắc hẹn (${uniqueTasks.filter((t) => !t.done).length} đang mở)`}>
          <button
            type="button"
            aria-label="Tab Tasks"
            onClick={() => setActiveSubtab('tasks')}
            className="h-7 px-1.5 rounded-md inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer tabular-nums transition-colors"
            style={{
              background: activeSubtab === 'tasks' ? surfaceBg : 'transparent',
              color: activeSubtab === 'tasks' ? '#d4a84b' : token.colorTextSecondary,
            }}
          >
            <CheckSquare size={14} />
            <span className="text-amber-500 font-extrabold">{uniqueTasks.filter((t) => !t.done).length}</span>
          </button>
        </Tooltip>

        <Tooltip title={`Tin nhắn đã ghim (${activeConversation?.messages.filter((m) => m.pinned).length || 0})`}>
          <button
            type="button"
            aria-label="Tab tin nhắn đã ghim"
            onClick={() => setActiveSubtab('pinned')}
            className="h-7 px-1.5 rounded-md inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer tabular-nums transition-colors"
            style={{
              background: activeSubtab === 'pinned' ? surfaceBg : 'transparent',
              color: activeSubtab === 'pinned' ? '#d4a84b' : token.colorTextSecondary,
            }}
          >
            <Pin size={14} />
            <span>{activeConversation?.messages.filter((m) => m.pinned).length || 0}</span>
          </button>
        </Tooltip>

        <Tooltip title={`Tài liệu, Google Sheets & Docs (${workspaceSharedItemsCount})`}>
          <button
            type="button"
            aria-label="Tab tài liệu"
            onClick={() => setActiveSubtab('files')}
            className="h-7 px-1.5 rounded-md inline-flex items-center gap-1 text-[11px] font-bold cursor-pointer tabular-nums transition-colors"
            style={{
              background: activeSubtab === 'files' ? surfaceBg : 'transparent',
              color: activeSubtab === 'files' ? '#10b981' : token.colorTextSecondary,
            }}
          >
            <FolderOpen size={14} />
            <span>{workspaceSharedItemsCount}</span>
          </button>
        </Tooltip>
      </div>

      {/* Header Right Controls */}
      <div className="flex items-center gap-0.5">
        {activeConversation && activeConversation.id !== AI_COPILOT_CONV_ID && (
          <Tooltip
            title={
              activeConversation.type === 'space' ? 'Họp thoại nhanh (Voice Huddle)' : 'Gọi thoại nội bộ (Opus HD)'
            }
          >
            <button
              type="button"
              data-testid="mos-chat-header-call-btn"
              aria-label="Gọi thoại nội bộ"
              onClick={() => void startOrJoinVoiceCall(activeConversation.id)}
              disabled={voiceCallIsConnecting}
              className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors"
              style={{
                background:
                  voiceCallCurrentCallId === activeConversation.id ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                border: `1px solid ${
                  voiceCallCurrentCallId === activeConversation.id ? 'rgba(16, 185, 129, 0.45)' : borderColor
                }`,
                color: '#10b981',
              }}
            >
              <Phone size={14} />
            </button>
          </Tooltip>
        )}

        {canAccessOmiCall && (
          <Tooltip title="Gọi số điện thoại qua OmiCall">
            <button
              type="button"
              data-testid="mos-chat-header-omicall-btn"
              aria-label="Gọi số điện thoại qua OmiCall"
              onClick={() => dispatchOpenMosChatOmiCallDialer()}
              className="relative w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors"
              style={{
                background: omicallCallState !== 'idle' ? 'rgba(244, 63, 94, 0.16)' : 'rgba(212, 168, 75, 0.14)',
                border: `1px solid ${
                  omicallCallState !== 'idle' ? 'rgba(244, 63, 94, 0.45)' : 'rgba(212, 168, 75, 0.35)'
                }`,
                color: omicallCallState !== 'idle' ? '#f43f5e' : '#d4a84b',
              }}
            >
              <PhoneCall size={14} />
              {omicallRegistered && omicallCallState === 'idle' && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500"
                  aria-hidden="true"
                />
              )}
            </button>
          </Tooltip>
        )}

        <Tooltip title="Tìm kiếm tin nhắn (⌘K)">
          <button
            type="button"
            aria-label="Tìm kiếm tin nhắn"
            onClick={() => setSearchModalOpen(true)}
            className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors"
            style={{
              background: searchModalOpen ? 'rgba(234, 179, 8, 0.16)' : 'transparent',
              border: `1px solid ${searchModalOpen ? 'rgba(234, 179, 8, 0.35)' : borderColor}`,
              color: searchModalOpen ? '#eab308' : token.colorTextSecondary,
            }}
          >
            <Search size={14} />
          </button>
        </Tooltip>

        <HeaderNotificationCenter
          themeMode={isDark ? 'dark' : 'light'}
          onOpenChat={(convId, msgId) => {
            if (convId) {
              ensurePortalOpen();
              navigateToMessageRef.current(convId, msgId);
            }
          }}
        />

        <Tooltip title="Cài đặt thông báo (Lọc tin nhắn & BUZZ)">
          <button
            type="button"
            aria-label="Cài đặt thông báo"
            onClick={() => setNotifSettingsModalOpen(true)}
            className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors"
            style={{
              background:
                userPrefs.notificationMode && userPrefs.notificationMode !== 'ALL'
                  ? 'rgba(59, 130, 246, 0.14)'
                  : 'transparent',
              border: `1px solid ${
                userPrefs.notificationMode && userPrefs.notificationMode !== 'ALL'
                  ? 'rgba(59, 130, 246, 0.35)'
                  : borderColor
              }`,
              color:
                userPrefs.notificationMode && userPrefs.notificationMode !== 'ALL'
                  ? '#3b82f6'
                  : token.colorTextSecondary,
            }}
          >
            <BellRing size={14} />
          </button>
        </Tooltip>

        <Tooltip title="Đóng / Mở cột Luồng trả lời (Threads)">
          <button
            type="button"
            aria-label="Đóng / Mở cột Luồng trả lời"
            onClick={() => {
              setThreadOpen((p) => {
                const next = !p;
                if (next && !activeThreadMsgId && activeConversation?.messages?.[0]) {
                  setActiveThreadMsgId(activeConversation.messages[0].id);
                }
                return next;
              });
            }}
            className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer"
            style={{
              background: threadOpen ? 'rgba(212, 168, 75, 0.16)' : 'transparent',
              color: threadOpen ? '#d4a84b' : token.colorTextSecondary,
            }}
          >
            <MessageSquareReply size={15} />
          </button>
        </Tooltip>

        <MosChatHeaderOverflowMenu {...props} />

        <div
          className="mx-1 self-stretch"
          style={{ width: 1, background: token.colorBorderSecondary, marginTop: 4, marginBottom: 4 }}
        />

        {!isMobile && (
          <Tooltip title={maximized ? 'Thu hẹp khung Chat' : 'Phóng to toàn màn hình'}>
            <button
              type="button"
              aria-label="Phóng to / Thu hẹp khung Chat"
              onClick={() => {
                const nextVal = !maximized;
                maximizedRef.current = nextVal;
                setMaximized(nextVal);
                persistPersonalLayout({ maximized: nextVal });
              }}
              className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
              style={{ color: token.colorTextSecondary }}
            >
              {maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </Tooltip>
        )}

        {!standalone && (
          <Tooltip title="Mở trong tab riêng biệt (Pop-out sang tab mới)">
            <button
              type="button"
              aria-label="Mở tab Chat riêng biệt"
              onClick={() => {
                const params = new URLSearchParams();
                if (activeConversation?.id) params.set('convId', activeConversation.id);
                if (activeThreadMsgId) params.set('msgId', activeThreadMsgId);
                if (activeSubtab && activeSubtab !== 'chat') params.set('tab', activeSubtab);
                const qs = params.toString();
                window.open(qs ? `/chat?${qs}` : '/chat', 'mOS_Chat_Window');
                onClose();
              }}
              className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
              style={{ color: token.colorTextSecondary }}
            >
              <ExternalLink size={15} />
            </button>
          </Tooltip>
        )}

        {standalone && (
          <Tooltip title="Ghim lại vào CRM (Mở dạng cửa sổ nhúng trượt phải)">
            <button
              type="button"
              aria-label="Ghim lại vào CRM"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.localStorage.setItem('mos_chat_display_mode_v1', 'embedded');
                  window.localStorage.setItem('mos_chat_is_open_v1', 'true');
                  if (window.opener) {
                    try {
                      window.opener.focus();
                      const evt = new CustomEvent('mos-chat:open', {
                        detail: {
                          conversationId: activeConversation?.id,
                          messageId: activeThreadMsgId || undefined,
                          forceMode: 'embedded',
                        },
                      });
                      window.opener.dispatchEvent(evt);
                      window.close();
                      return;
                    } catch {}
                  }
                  window.location.href = '/dashboard';
                }
              }}
              className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
              style={{ color: token.colorTextSecondary }}
            >
              <PanelRightOpen size={15} />
            </button>
          </Tooltip>
        )}

        <Tooltip title={standalone ? 'Quay lại mOS Dashboard' : 'Đóng mOS Chat (⌘J)'}>
          <button
            type="button"
            aria-label="Đóng mOS Chat"
            onClick={() => {
              if (standalone) {
                if (typeof window !== 'undefined' && window.opener) {
                  window.close();
                } else if (typeof window !== 'undefined') {
                  window.location.href = '/dashboard';
                }
                return;
              }
              onClose();
            }}
            className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/15 hover:text-rose-400"
            style={{ color: token.colorTextSecondary }}
          >
            <X size={16} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
