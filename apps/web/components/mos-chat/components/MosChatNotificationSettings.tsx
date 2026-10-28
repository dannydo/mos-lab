'use client';

import React, { useMemo } from 'react';
import { Modal, Radio, theme, Tooltip, Input } from 'antd';
import { Bell, BellOff, BellRing, AtSign, Volume2, VolumeX, Search, ChevronRight } from 'lucide-react';
import type {
  MosChatConversation,
  MosChatUserSidebarPrefs,
  MosChatNotificationMode,
  MosChatChannelNotificationOverride,
} from '@mos-lab/shared';

type SafeAny = any;  

interface NotificationSettingsModalProps {
  open: boolean;
  onClose: () => void;
  userPrefs: MosChatUserSidebarPrefs;
  conversations: MosChatConversation[];
  onChangeGlobalMode: (mode: MosChatNotificationMode) => void;
  onChangeChannelOverride: (convId: string, mode: MosChatChannelNotificationOverride) => void;
  themeMode: 'light' | 'dark';
}

const GLOBAL_MODE_OPTIONS: {
  value: MosChatNotificationMode;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: 'ALL',
    label: 'Tất cả thông báo',
    description: 'Nhận mọi tin nhắn và BUZZ từ tất cả nhóm.',
    icon: <BellRing size={16} />,
  },
  {
    value: 'MENTIONS_ONLY',
    label: 'Chỉ khi được @Mention',
    description: 'Chỉ nhận khi ai đó tag tên bạn hoặc gửi tin nhắn riêng (DM). Khuyên dùng.',
    icon: <AtSign size={16} />,
  },
  {
    value: 'NOTHING',
    label: 'Tắt toàn bộ thông báo',
    description: 'Không nhận bất kỳ popup hay âm thanh nào. Tin nhắn riêng và @mention vẫn được nhận.',
    icon: <BellOff size={16} />,
  },
];

const CHANNEL_OVERRIDE_OPTIONS: {
  value: MosChatChannelNotificationOverride;
  label: string;
  shortLabel: string;
}[] = [
  { value: 'INHERIT', label: 'Theo mặc định chung', shortLabel: 'Mặc định' },
  { value: 'ALL', label: 'Bật tất cả', shortLabel: 'Tất cả' },
  { value: 'MENTIONS_ONLY', label: 'Chỉ @Mention', shortLabel: '@Mention' },
  { value: 'MUTED', label: 'Tắt tiếng', shortLabel: 'Tắt' },
];

export const MosChatNotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  open,
  onClose,
  userPrefs,
  conversations,
  onChangeGlobalMode,
  onChangeChannelOverride,
  themeMode,
}) => {
  const { token } = theme.useToken();
  const isDark = themeMode === 'dark';
  const [searchText, setSearchText] = React.useState('');

  const globalMode: MosChatNotificationMode = userPrefs.notificationMode || 'ALL';

  // Filter to only show group spaces (not DMs, not self, not AI)
  const spaceConversations = useMemo(() => {
    return conversations
      .filter((c) => {
        if (c.type !== 'space') return false;
        if (c.isSelf) return false;
        const idStr = String(c.id || '');
        if (idStr.startsWith('dm-self-') || idStr.startsWith('ai-')) return false;
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
  }, [conversations]);

  const filteredSpaces = useMemo(() => {
    if (!searchText.trim()) return spaceConversations;
    const q = searchText.trim().toLowerCase();
    return spaceConversations.filter((c) => (c.name || '').toLowerCase().includes(q));
  }, [spaceConversations, searchText]);

  const surfaceBg = isDark ? '#1a1a1a' : '#ffffff';
  const cardBg = isDark ? '#242424' : '#f9f9f9';
  const borderColor = isDark ? '#333' : '#e5e7eb';
  const accentColor = '#d4a84b';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={
        <div className="flex items-center gap-2">
          <Bell size={18} style={{ color: accentColor }} />
          <span className="font-bold text-base">Cài đặt Thông báo</span>
        </div>
      }
      footer={null}
      width={520}
      styles={{
        body: { padding: '16px 0' },
        content: {
          background: surfaceBg,
          border: `1px solid ${borderColor}`,
          borderRadius: 16,
        },
        header: { background: surfaceBg, borderBottom: `1px solid ${borderColor}`, padding: '16px 24px' },
      }}
      closable={{ 'aria-label': 'Đóng', placement: 'end' } as SafeAny}
    >
      {/* ─── Section 1: Global Default Mode ─── */}
      <div className="px-6 pb-4">
        <div className="text-[13px] font-bold mb-3" style={{ color: token.colorText }}>
          Chế độ mặc định chung
        </div>
        <div className="space-y-2">
          {GLOBAL_MODE_OPTIONS.map((opt) => {
            const isSelected = globalMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeGlobalMode(opt.value)}
                className="w-full text-left px-3 py-2.5 rounded-lg cursor-pointer transition-all flex items-start gap-3"
                style={{
                  background: isSelected ? (isDark ? 'rgba(212, 168, 75, 0.12)' : 'rgba(212, 168, 75, 0.08)') : cardBg,
                  border: `1.5px solid ${isSelected ? accentColor : 'transparent'}`,
                  color: token.colorText,
                }}
              >
                <div
                  className="mt-0.5 w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0"
                  style={{
                    background: isSelected ? accentColor : isDark ? '#333' : '#e5e7eb',
                    color: isSelected ? '#fff' : token.colorTextSecondary,
                  }}
                >
                  {opt.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold">{opt.label}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: token.colorTextSecondary }}>
                    {opt.description}
                  </div>
                </div>
                {isSelected && (
                  <div className="ml-auto shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* DM Invariant Notice */}
        <div
          className="mt-3 px-3 py-2 rounded-lg text-[11px] flex items-center gap-2"
          style={{
            background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.06)',
            color: isDark ? '#93c5fd' : '#3b82f6',
            border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
          }}
        >
          <AtSign size={13} className="shrink-0" />
          <span>
            Tin nhắn riêng (DM) và @Mention trực tiếp <strong>luôn luôn được nhận</strong> bất kể chế độ nào.
          </span>
        </div>
      </div>

      {/* ─── Section 2: Per-Channel Overrides ─── */}
      <div className="border-t px-6 pt-4" style={{ borderColor }}>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[13px] font-bold" style={{ color: token.colorText }}>
            Tuỳ chỉnh theo nhóm
          </div>
          <div className="text-[11px]" style={{ color: token.colorTextSecondary }}>
            {spaceConversations.length} nhóm
          </div>
        </div>

        {spaceConversations.length > 5 && (
          <div className="mb-3">
            <Input
              prefix={<Search size={13} style={{ color: token.colorTextSecondary }} />}
              placeholder="Tìm nhóm..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              size="small"
              allowClear
              styles={{
                input: { fontSize: 12 },
              }}
              style={{
                background: cardBg,
                borderColor,
                borderRadius: 8,
              }}
            />
          </div>
        )}

        <div className="space-y-1 overflow-y-auto pr-1" style={{ maxHeight: 280 }}>
          {filteredSpaces.map((conv) => {
            const override = userPrefs.channelNotificationOverrides?.[conv.id] || 'INHERIT';
            const isMuted = (userPrefs.mutedIds || []).includes(conv.id);
            const effectiveLabel =
              override === 'INHERIT'
                ? GLOBAL_MODE_OPTIONS.find((o) => o.value === globalMode)?.label || 'Mặc định'
                : CHANNEL_OVERRIDE_OPTIONS.find((o) => o.value === override)?.label || override;

            return (
              <div
                key={conv.id}
                className="flex items-center gap-2 px-2.5 py-2 rounded-lg transition-colors group"
                style={{
                  background:
                    isMuted || override === 'MUTED'
                      ? isDark
                        ? 'rgba(239, 68, 68, 0.06)'
                        : 'rgba(239, 68, 68, 0.04)'
                      : 'transparent',
                }}
              >
                {/* Conversation name */}
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium truncate" style={{ color: token.colorText }}>
                    {conv.name || conv.id}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: token.colorTextSecondary }}>
                    {override === 'INHERIT' ? `⤷ ${effectiveLabel}` : effectiveLabel}
                  </div>
                </div>

                {/* Override selector */}
                <div className="flex items-center gap-1 shrink-0">
                  {CHANNEL_OVERRIDE_OPTIONS.map((opt) => {
                    const isActive = override === opt.value;
                    const getIcon = () => {
                      switch (opt.value) {
                        case 'INHERIT':
                          return <ChevronRight size={11} />;
                        case 'ALL':
                          return <BellRing size={11} />;
                        case 'MENTIONS_ONLY':
                          return <AtSign size={11} />;
                        case 'MUTED':
                          return <VolumeX size={11} />;
                        default:
                          return null;
                      }
                    };
                    return (
                      <Tooltip key={opt.value} title={opt.label} placement="top">
                        <button
                          type="button"
                          onClick={() => onChangeChannelOverride(conv.id, opt.value)}
                          className="w-6 h-6 rounded-md inline-flex items-center justify-center cursor-pointer transition-all"
                          style={{
                            background: isActive
                              ? opt.value === 'MUTED'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : opt.value === 'INHERIT'
                                  ? isDark
                                    ? '#333'
                                    : '#e5e7eb'
                                  : 'rgba(212, 168, 75, 0.15)'
                              : 'transparent',
                            border: `1px solid ${
                              isActive
                                ? opt.value === 'MUTED'
                                  ? 'rgba(239, 68, 68, 0.4)'
                                  : opt.value === 'INHERIT'
                                    ? borderColor
                                    : 'rgba(212, 168, 75, 0.4)'
                                : 'transparent'
                            }`,
                            color: isActive
                              ? opt.value === 'MUTED'
                                ? '#f87171'
                                : opt.value === 'INHERIT'
                                  ? token.colorTextSecondary
                                  : accentColor
                              : token.colorTextTertiary,
                            opacity: isActive ? 1 : 0.5,
                          }}
                        >
                          {getIcon()}
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredSpaces.length === 0 && (
            <div className="text-center py-6 text-[12px]" style={{ color: token.colorTextSecondary }}>
              {searchText ? 'Không tìm thấy nhóm phù hợp.' : 'Chưa có nhóm trò chuyện nào.'}
            </div>
          )}
        </div>
      </div>

      {/* ─── Anti-Flooding Notice ─── */}
      <div className="px-6 pt-3 mt-2 border-t" style={{ borderColor }}>
        <div
          className="px-3 py-2 rounded-lg text-[11px] flex items-center gap-2"
          style={{
            background: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.06)',
            color: isDark ? '#6ee7b7' : '#059669',
            border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)'}`,
          }}
        >
          <Volume2 size={13} className="shrink-0" />
          <span>
            Hệ thống giới hạn tối đa <strong>3 popup</strong> hiển thị cùng lúc để tránh tràn màn hình.
          </span>
        </div>
      </div>
    </Modal>
  );
};
