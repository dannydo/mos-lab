'use client';

import React from 'react';
import { Tooltip } from 'antd';
import { ShieldCheck, FolderKanban, Plus, X, Search, Inbox, Mail, Hash, AlarmClock, ChevronDown } from 'lucide-react';
import type {
  MosChatConversation,
  MosChatTaskItem,
  MosChatUserSidebarPrefs,
  MosChatAccessConfig,
  MosChatPresenceStatus,
  SafeAny,
} from '@mos-lab/shared';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import MosAppLauncher from '../../layout/MosAppLauncher';

export interface MosChatSidebarHeaderProps {
  isMobile: boolean;
  setMobileActiveView: (v: 'inbox' | 'conversation' | 'thread') => void;
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
  visibleConversations: MosChatConversation[];
  uniqueTasks: MosChatTaskItem[];
  getEffectiveUnreadCount: (conv: MosChatConversation) => number;
  renderUserAvatarNode: (opts: SafeAny) => React.ReactNode;
  token: SafeAny;
  surfaceBg: string;
  surfaceRaised: string;
  borderColor: string;
}

export const MosChatSidebarHeader: React.FC<MosChatSidebarHeaderProps> = ({
  isMobile,
  setMobileActiveView,
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
  visibleConversations,
  uniqueTasks,
  getEffectiveUnreadCount,
  renderUserAvatarNode,
  token,
  surfaceBg,
  surfaceRaised,
  borderColor,
}) => {
  return (
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
        <div className="flex items-center gap-1.5 min-w-0">
          <MosAppLauncher
            currentApp="chat"
            userRole={currentUser?.role}
            teamCodes={currentUser?.teamCodes}
            displayName={currentUser?.displayName}
            onAfterNavigate={() => onClose?.()}
            shape="rounded"
          />
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
        </div>

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
  );
};
