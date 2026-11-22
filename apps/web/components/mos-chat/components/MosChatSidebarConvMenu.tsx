'use client';

import React from 'react';
import { Tooltip } from 'antd';
import {
  Check,
  ArrowUp,
  ArrowDown,
  FolderPlus,
  Pin,
  PinOff,
  Mail,
  MailOpen,
  Bell,
  BellOff,
  BellRing,
  AtSign,
  ChevronRight,
  ExternalLink,
  EyeOff,
  Settings,
  LogOut,
} from 'lucide-react';
import type {
  MosChatConversation,
  MosChatUserSidebarPrefs,
  MosChatChannelNotificationOverride,
  SafeAny,
} from '@mos-lab/shared';
import type { MosChatSidebarSection } from './MosChatSidebar';

export interface MosChatSidebarConvMenuProps {
  conv: MosChatConversation;
  sec: MosChatSidebarSection;
  itemIdx: number;
  isAiConv: boolean;
  isSpace: boolean;
  isPinned: boolean;
  isMuted: boolean;
  effUnread: number;
  userPrefs: MosChatUserSidebarPrefs;
  token: SafeAny;
  borderColor: string;
  closeMenu: () => void;
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
  setQuickCreateSectionTargetConvId: (id: string | null) => void;
  setQuickCreateSectionName: (name: string) => void;
  setQuickCreateSectionModalOpen: (open: boolean) => void;
  setDockedConvIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleHideConversation: (conv: MosChatConversation) => void;
  setActiveConvId: (id: string) => void;
  setSpaceConfigModalOpen: (open: boolean) => void;
  handleLeaveOrJoinSpace: (conv: MosChatConversation) => Promise<void>;
}

export const MosChatSidebarConvMenu: React.FC<MosChatSidebarConvMenuProps> = ({
  conv,
  sec,
  itemIdx,
  isAiConv,
  isSpace,
  isPinned,
  isMuted,
  effUnread,
  userPrefs,
  token,
  borderColor,
  closeMenu,
  togglePinConversation,
  toggleManualUnreadConversation,
  toggleMuteConversation,
  onChangeChannelNotificationOverride,
  moveConversationToSection,
  moveConversationOrderInSection,
  setQuickCreateSectionTargetConvId,
  setQuickCreateSectionName,
  setQuickCreateSectionModalOpen,
  setDockedConvIds,
  toggleHideConversation,
  setActiveConvId,
  setSpaceConfigModalOpen,
  handleLeaveOrJoinSpace,
}) => {
  const currentCustomSec = (userPrefs.customSections || []).find((cs) => (cs.conversationIds || []).includes(conv.id));

  return (
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
          closeMenu();
        }}
        className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
        style={{ color: token.colorText }}
      >
        {isPinned ? <PinOff size={13} className="text-amber-500" /> : <Pin size={13} className="text-amber-500" />}
        <span>{isPinned ? 'Bỏ ghim khỏi đầu mục' : 'Ghim lên đầu mục (Pin)'}</span>
      </button>

      <button
        type="button"
        onClick={() => {
          toggleManualUnreadConversation(conv);
          closeMenu();
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
          closeMenu();
        }}
        className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
        style={{ color: token.colorText }}
      >
        {isMuted ? <Bell size={13} className="text-emerald-500" /> : <BellOff size={13} className="text-slate-400" />}
        <span>{isMuted ? 'Bật thông báo' : 'Tắt thông báo (Mute)'}</span>
      </button>

      {/* Notification Override Quick Selectors (for Space conversations) */}
      {isSpace && onChangeChannelNotificationOverride && (
        <div className="px-2 py-1">
          <div
            className="text-[10px] font-bold uppercase tracking-wider px-0.5 pb-1"
            style={{ color: token.colorTextSecondary }}
          >
            Chế độ thông báo nhóm
          </div>
          <div className="flex items-center gap-1">
            {[
              { value: 'INHERIT' as const, icon: <ChevronRight size={11} />, tip: 'Theo mặc định chung' },
              { value: 'ALL' as const, icon: <BellRing size={11} />, tip: 'Bật tất cả' },
              { value: 'MENTIONS_ONLY' as const, icon: <AtSign size={11} />, tip: 'Chỉ @Mention' },
              { value: 'MUTED' as const, icon: <BellOff size={11} />, tip: 'Tắt tiếng' },
            ].map((opt) => {
              const currentOverride = userPrefs.channelNotificationOverrides?.[conv.id] || 'INHERIT';
              const isActive = currentOverride === opt.value;
              return (
                <Tooltip key={opt.value} title={opt.tip} placement="top">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeChannelNotificationOverride(conv.id, opt.value);
                      closeMenu();
                    }}
                    className="flex-1 h-6 rounded-md inline-flex items-center justify-center cursor-pointer transition-all"
                    style={{
                      background: isActive
                        ? opt.value === 'MUTED'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(212, 168, 75, 0.15)'
                        : 'transparent',
                      border: `1px solid ${
                        isActive
                          ? opt.value === 'MUTED'
                            ? 'rgba(239, 68, 68, 0.4)'
                            : 'rgba(212, 168, 75, 0.4)'
                          : borderColor
                      }`,
                      color: isActive ? (opt.value === 'MUTED' ? '#f87171' : '#d4a84b') : token.colorTextTertiary,
                    }}
                  >
                    {opt.icon}
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      <div className="my-1" style={{ borderTop: `1px solid ${borderColor}` }} />

      <div className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Chuyển tới mục (Google Chat Sections)
      </div>

      <button
        type="button"
        onClick={() => {
          moveConversationToSection(conv.id, 'default');
          closeMenu();
        }}
        className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
        style={{ color: token.colorText }}
      >
        <span className="truncate">{isSpace ? 'SPACES (Mặc định)' : 'DIRECT MESSAGES (Mặc định)'}</span>
        {!currentCustomSec && <Check size={13} className="text-emerald-500 shrink-0" />}
      </button>

      {(userPrefs.customSections || []).map((cs) => (
        <button
          key={cs.id}
          type="button"
          onClick={() => {
            moveConversationToSection(conv.id, cs.id);
            closeMenu();
          }}
          className="w-full px-2.5 py-1.5 flex items-center justify-between gap-2 rounded-md hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer text-left"
          style={{ color: token.colorText }}
        >
          <span className="truncate">📁 {cs.name}</span>
          {currentCustomSec?.id === cs.id && <Check size={13} className="text-emerald-500 shrink-0" />}
        </button>
      ))}

      <button
        type="button"
        onClick={() => {
          closeMenu();
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
            closeMenu();
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
            closeMenu();
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
          closeMenu();
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
            closeMenu();
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
            closeMenu();
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
            closeMenu();
          }}
          className="w-full px-2.5 py-1.5 flex items-center gap-2 rounded-md hover:bg-rose-500/10 cursor-pointer text-left text-rose-500"
        >
          <LogOut size={13} />
          <span>Rời khỏi Space này</span>
        </button>
      )}
    </div>
  );
};
