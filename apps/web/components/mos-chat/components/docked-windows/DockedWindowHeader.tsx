'use client';

import React from 'react';
import { ChevronLeft, Hash, Mail, MailOpen, Maximize2, Minus, Phone, Pin, Smartphone, X } from 'lucide-react';
import { Tooltip } from 'antd';
import type { MosChatConversation, MosChatStaffMember, SafeAny } from '@mos-lab/shared';
import { AI_COPILOT_CONV_ID, isSpaceEmoji } from '../../constants/chat-constants';
import { MosChatOmiCallPopover } from '../MosChatOmiCallPopover';
import type { MosChatDockPreset } from './dockedWindowTypes';

interface DockedWindowHeaderProps {
  cid: string;
  conv: MosChatConversation;
  currentUser?: SafeAny;
  staffDirectory?: MosChatStaffMember[];
  isDark?: boolean;
  isCollapsed: boolean;
  isDockPinned: boolean;
  isDockManualUnread: boolean;
  dockUnread: number;
  currentPreset: MosChatDockPreset;
  currentWidth: number;
  currentHeight: number;
  activeThreadId: string | null;
  currentTab: 'chat' | 'tasks';
  pendingTasksCount: number;
  surfaceRaised: string;
  borderColor: string;
  accentColor: string;
  accentSoftBg: string;
  accentBorder: string;
  token: SafeAny;
  renderUserAvatarNode: (opts: SafeAny) => React.ReactNode;
  isConversationParticipantOnline: (conv: MosChatConversation) => boolean;
  onStartResizing: (e: React.MouseEvent, convId: string, direction: 'both' | 'top' | 'left') => void;
  onToggleCollapse: (cid: string) => void;
  onBackFromThread: (cid: string) => void;
  onStartVoiceCall?: (convId: string) => void;
  onCyclePreset: (cid: string) => void;
  onTogglePin: (cid: string) => void;
  onToggleManualUnread: (conv: MosChatConversation) => void;
  onExpandFullScreen: (cid: string) => void;
  onCloseDock: (cid: string) => void;
  onSelectTab: (cid: string, tab: 'chat' | 'tasks') => void;
}

export const DockedWindowHeader: React.FC<DockedWindowHeaderProps> = ({
  cid,
  conv,
  currentUser,
  staffDirectory,
  isDark = true,
  isCollapsed,
  isDockPinned,
  isDockManualUnread,
  dockUnread,
  currentPreset,
  currentWidth,
  currentHeight,
  activeThreadId,
  currentTab,
  pendingTasksCount,
  surfaceRaised,
  borderColor,
  accentColor,
  accentSoftBg,
  accentBorder,
  token,
  renderUserAvatarNode,
  isConversationParticipantOnline,
  onStartResizing,
  onToggleCollapse,
  onBackFromThread,
  onStartVoiceCall,
  onCyclePreset,
  onTogglePin,
  onToggleManualUnread,
  onExpandFullScreen,
  onCloseDock,
  onSelectTab,
}) => {
  return (
    <>
      {/* ================= RESIZE HANDLES (TOP & LEFT) ================= */}
      {!isCollapsed && (
        <>
          <div
            onMouseDown={(e) => onStartResizing(e, cid, 'both')}
            title="Kéo để điều chỉnh chiều rộng và chiều cao"
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-40 hover:bg-amber-400/30 transition-colors rounded-tl-2xl flex items-center justify-center group/corner"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400/50 opacity-0 group-hover/corner:opacity-100 transition-opacity" />
          </div>
          <div
            onMouseDown={(e) => onStartResizing(e, cid, 'top')}
            title="Kéo lên/xuống để chỉnh chiều cao"
            className="absolute top-0 left-4 right-4 h-2 cursor-ns-resize z-30 hover:bg-amber-400/20 transition-colors"
          />
          <div
            onMouseDown={(e) => onStartResizing(e, cid, 'left')}
            title="Kéo sang trái/phải để chỉnh chiều rộng"
            className="absolute top-4 bottom-0 left-0 w-2 cursor-ew-resize z-30 hover:bg-amber-400/20 transition-colors"
          />
        </>
      )}

      {/* ================= iOS TOP DRAG PILL ================= */}
      <div
        onClick={() => onToggleCollapse(cid)}
        className="w-full flex justify-center pt-1.5 pb-0.5 cursor-pointer hover:opacity-100 transition-opacity select-none"
      >
        <div className="w-9 h-1 rounded-full bg-neutral-400/40 dark:bg-white/20 group-hover:bg-amber-400/60 transition-colors" />
      </div>

      {/* ================= iOS CUPERTINO NAVIGATION HEADER ================= */}
      <div
        className="h-10 px-3 flex items-center justify-between select-none cursor-pointer border-b"
        style={{
          background: surfaceRaised || 'rgba(30, 30, 30, 0.95)',
          borderColor: borderColor || 'rgba(255, 255, 255, 0.08)',
        }}
        onClick={() => onToggleCollapse(cid)}
      >
        {/* Left: Navigation or Channel Identity */}
        <div className="flex items-center gap-2 min-w-0" onClick={(e) => e.stopPropagation()}>
          {activeThreadId ? (
            <button
              type="button"
              onClick={() => onBackFromThread(cid)}
              className="inline-flex items-center gap-1 text-[12px] font-bold text-amber-500 hover:text-amber-400 transition-colors cursor-pointer group/back py-1 -ml-1 pr-1.5"
            >
              <ChevronLeft size={16} className="transition-transform group-hover/back:-translate-x-0.5" />
              {conv.type === 'space' && conv.avatar && isSpaceEmoji(conv.avatar) && (
                <span className="select-none leading-none text-xs mr-0.5">{conv.avatar}</span>
              )}
              <span className="truncate max-w-[140px]">{conv.name}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 min-w-0">
              {conv.type === 'dm' ? (
                renderUserAvatarNode({
                  staffId: conv.participantStaffId,
                  name: conv.name,
                  avatarUrl: conv.avatar,
                  sizeClass: 'w-6 h-6',
                  textClass: 'text-[9.5px]',
                  isOnline: isConversationParticipantOnline(conv),
                })
              ) : (
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 shadow-sm overflow-hidden"
                  style={{
                    background: conv.color ? `${conv.color}25` : 'rgba(212, 168, 75, 0.2)',
                    color: conv.color || '#d4a84b',
                  }}
                >
                  {conv.avatar && isSpaceEmoji(conv.avatar) ? (
                    <span className="select-none leading-none text-xs">{conv.avatar}</span>
                  ) : conv.avatar &&
                    (conv.avatar.startsWith('http://') ||
                      conv.avatar.startsWith('https://') ||
                      conv.avatar.startsWith('/') ||
                      conv.avatar.startsWith('data:')) ? (
                    <img src={conv.avatar} alt={conv.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <Hash size={13} style={{ color: conv.color || '#d4a84b' }} />
                  )}
                </div>
              )}
              <span className="text-[13px] font-bold tracking-tight truncate max-w-[150px]">{conv.name}</span>
              {isDockPinned && (
                <Tooltip title="Đã ghim">
                  <Pin size={11} className="text-amber-400 fill-amber-400 shrink-0" />
                </Tooltip>
              )}
              {(dockUnread > 0 || isDockManualUnread) && (
                <span className="inline-flex items-center justify-center px-1.5 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold tabular-nums shrink-0 shadow-sm">
                  {dockUnread > 0 ? dockUnread : 1}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: iOS Action Controls */}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {onStartVoiceCall && cid !== AI_COPILOT_CONV_ID && (
            <Tooltip title={conv.type === 'space' ? 'Họp thoại nhanh (Voice Huddle)' : 'Gọi thoại nội bộ'}>
              <button
                type="button"
                aria-label="Gọi thoại nội bộ"
                onClick={() => onStartVoiceCall(cid)}
                className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-emerald-500/15 text-emerald-400"
              >
                <Phone size={12} />
              </button>
            </Tooltip>
          )}

          <MosChatOmiCallPopover
            activeConversation={conv}
            staffDirectory={staffDirectory}
            currentUser={currentUser}
            isDark={isDark}
            compact={true}
            testId="mos-chat-dock-omicall-btn"
          />

          <Tooltip
            title={`Đổi kích thước iPhone (Hiện tại: ${currentPreset.toUpperCase()} - ${currentWidth}×${currentHeight}px)`}
          >
            <button
              type="button"
              onClick={() => onCyclePreset(cid)}
              className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10 text-neutral-400 hover:text-amber-400"
            >
              <Smartphone size={13} />
            </button>
          </Tooltip>

          <Tooltip title={isDockPinned ? 'Bỏ ghim box chat' : 'Ghim box chat'}>
            <button
              type="button"
              onClick={() => onTogglePin(cid)}
              className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10"
              style={{ color: isDockPinned ? '#d4a84b' : token.colorTextSecondary }}
            >
              <Pin size={12} className={isDockPinned ? 'fill-amber-400 text-amber-400' : ''} />
            </button>
          </Tooltip>

          <Tooltip title={dockUnread > 0 || isDockManualUnread ? 'Đánh dấu đã đọc' : 'Đánh dấu chưa đọc'}>
            <button
              type="button"
              onClick={() => onToggleManualUnread(conv)}
              className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer transition-colors hover:bg-white/10"
              style={{ color: dockUnread > 0 || isDockManualUnread ? '#f43f5e' : token.colorTextSecondary }}
            >
              {dockUnread > 0 || isDockManualUnread ? <MailOpen size={12} /> : <Mail size={12} />}
            </button>
          </Tooltip>

          <Tooltip title="Mở toàn màn hình">
            <button
              type="button"
              onClick={() => onExpandFullScreen(cid)}
              className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
              style={{ color: token.colorTextSecondary }}
            >
              <Maximize2 size={12} />
            </button>
          </Tooltip>

          <Tooltip title={isCollapsed ? 'Mở rộng' : 'Thu gọn'}>
            <button
              type="button"
              onClick={() => onToggleCollapse(cid)}
              className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-white/10"
              style={{ color: token.colorTextSecondary }}
            >
              <Minus size={12} />
            </button>
          </Tooltip>

          <Tooltip title="Đóng cửa sổ">
            <button
              type="button"
              onClick={() => onCloseDock(cid)}
              className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-rose-500/20 hover:text-rose-400 text-neutral-400"
            >
              <X size={13} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ================= iOS SEGMENTED CONTROL ([ Tin nhắn ] | [ Tác vụ (N) ]) ================= */}
      {!isCollapsed && !activeThreadId && (
        <div
          className="px-3 pt-2 pb-1.5 flex items-center justify-center border-b"
          style={{ borderColor: borderColor || 'rgba(255, 255, 255, 0.08)' }}
        >
          <div
            className="w-full grid grid-cols-2 p-0.5 rounded-xl text-[12px] font-semibold transition-colors"
            style={{ background: surfaceRaised || 'rgba(0,0,0,0.2)' }}
          >
            <button
              type="button"
              onClick={() => onSelectTab(cid, 'chat')}
              className="py-1 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              style={{
                background: currentTab === 'chat' ? accentSoftBg || 'rgba(212, 168, 75, 0.16)' : 'transparent',
                color: currentTab === 'chat' ? accentColor || '#d4a84b' : token.colorTextSecondary,
                border:
                  currentTab === 'chat'
                    ? `1px solid ${accentBorder || 'rgba(212, 168, 75, 0.4)'}`
                    : '1px solid transparent',
                fontWeight: currentTab === 'chat' ? 700 : 500,
              }}
            >
              <span>💬 Tin nhắn</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectTab(cid, 'tasks')}
              className="py-1 rounded-lg transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer"
              style={{
                background: currentTab === 'tasks' ? accentSoftBg || 'rgba(212, 168, 75, 0.16)' : 'transparent',
                color: currentTab === 'tasks' ? accentColor || '#d4a84b' : token.colorTextSecondary,
                border:
                  currentTab === 'tasks'
                    ? `1px solid ${accentBorder || 'rgba(212, 168, 75, 0.4)'}`
                    : '1px solid transparent',
                fontWeight: currentTab === 'tasks' ? 700 : 500,
              }}
            >
              <span>⏱️ Tác vụ</span>
              {pendingTasksCount > 0 && (
                <span
                  className="px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-extrabold"
                  style={{
                    background:
                      currentTab === 'tasks' ? accentBorder || 'rgba(212, 168, 75, 0.35)' : 'rgba(212, 168, 75, 0.15)',
                    color: accentColor || '#d4a84b',
                  }}
                >
                  {pendingTasksCount}
                </span>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
};
