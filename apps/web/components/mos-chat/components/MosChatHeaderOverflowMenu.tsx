'use client';

import React from 'react';
import { Dropdown, Tooltip, type GlobalToken } from 'antd';
import {
  ExternalLink,
  History,
  Link as LinkIcon,
  Mail,
  MailOpen,
  MoreVertical,
  PhoneCall,
  Pin,
  ShieldCheck,
  Trash2,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  AiSessionAccessInfo,
  MosChatAccessConfig,
  MosChatConversation,
  MosChatUserSidebarPrefs,
  SafeAny,
} from '@mos-lab/shared';
import { useOmiCall } from '../../../context/OmiCallContext';
import { playNeuralSpeech } from '../../voice-assistant/speech-utils';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';
import { dispatchOpenMosChatOmiCallDialer } from '../utils/omicall-dial-helpers';

export interface MosChatHeaderOverflowMenuProps {
  token: GlobalToken;
  antdMessage: SafeAny;
  isMobile: boolean;
  isDannyAccount: boolean;
  activeConversation: MosChatConversation | null | undefined;
  userPrefs: MosChatUserSidebarPrefs;
  accessConfig: MosChatAccessConfig;
  maiVoiceAnnounceEnabled: boolean;
  ttsSpeed: number;
  aiSessionId: string | null;
  isAiSessionReadOnly: boolean;
  aiSessionAccess: AiSessionAccessInfo | null;
  handleToggleMaiVoiceAnnounce: (enabled: boolean) => void;
  togglePinConversation: (convId: string) => void;
  toggleManualUnreadConversation: (conv: MosChatConversation) => void;
  handlePopOutToMiniDock: () => void;
  setAiSessionsModalOpen: (open: boolean) => void;
  handleCopyAiSessionPermalink: () => void;
  handleToggleAiSessionSharing: () => Promise<void> | void;
  handleClearAiChat: () => void;
  setAccessConfigTab: (tab: 'chat' | 'ai') => void;
  setAccessConfigModalOpen: (open: boolean) => void;
}

export const MosChatHeaderOverflowMenu: React.FC<MosChatHeaderOverflowMenuProps> = ({
  token,
  antdMessage,
  isMobile,
  isDannyAccount,
  activeConversation,
  userPrefs,
  accessConfig,
  maiVoiceAnnounceEnabled,
  ttsSpeed,
  aiSessionId,
  isAiSessionReadOnly,
  aiSessionAccess,
  handleToggleMaiVoiceAnnounce,
  togglePinConversation,
  toggleManualUnreadConversation,
  handlePopOutToMiniDock,
  setAiSessionsModalOpen,
  handleCopyAiSessionPermalink,
  handleToggleAiSessionSharing,
  handleClearAiChat,
  setAccessConfigTab,
  setAccessConfigModalOpen,
}) => {
  const { canAccessOmiCall } = useOmiCall();

  return (
    <Dropdown
      trigger={['click']}
      placement="bottomRight"
      menu={{
        items: [
          {
            key: 'mai-voice',
            icon: maiVoiceAnnounceEnabled ? (
              <Volume2 size={15} className="text-amber-500" />
            ) : (
              <VolumeX size={15} className="opacity-60" />
            ),
            label: (
              <span style={{ color: maiVoiceAnnounceEnabled ? '#d4a84b' : undefined }}>
                {maiVoiceAnnounceEnabled ? '@MAI đọc thông báo ✓ BẬT' : '@MAI đọc thông báo · Tắt'}
              </span>
            ),
          },
          ...(activeConversation
            ? [
                {
                  key: 'pin-conv',
                  icon: (
                    <Pin
                      size={15}
                      className={
                        (userPrefs.pinnedIds || []).includes(activeConversation.id)
                          ? 'fill-amber-400 text-amber-400'
                          : ''
                      }
                    />
                  ),
                  label: (
                    <span
                      style={{
                        color: (userPrefs.pinnedIds || []).includes(activeConversation.id) ? '#d4a84b' : undefined,
                      }}
                    >
                      {(userPrefs.pinnedIds || []).includes(activeConversation.id)
                        ? 'Bỏ ghim cuộc trò chuyện ✓'
                        : 'Ghim cuộc trò chuyện'}
                    </span>
                  ),
                },
              ]
            : []),
          ...(activeConversation && activeConversation.id !== AI_COPILOT_CONV_ID
            ? [
                {
                  key: 'mark-unread',
                  icon: (userPrefs.manualUnreadIds || []).includes(activeConversation.id) ? (
                    <MailOpen size={15} className="text-rose-400" />
                  ) : (
                    <Mail size={15} />
                  ),
                  label: (
                    <span
                      style={{
                        color: (userPrefs.manualUnreadIds || []).includes(activeConversation.id)
                          ? '#f43f5e'
                          : undefined,
                      }}
                    >
                      {(userPrefs.manualUnreadIds || []).includes(activeConversation.id)
                        ? 'Đánh dấu đã đọc ✓'
                        : 'Đánh dấu chưa đọc'}
                    </span>
                  ),
                },
              ]
            : []),
          ...(!isMobile && activeConversation
            ? [
                {
                  key: 'mini-dock',
                  icon: <ExternalLink size={15} />,
                  label: 'Mở cửa sổ thu nhỏ (Mini Dock)',
                },
              ]
            : []),
          ...(canAccessOmiCall
            ? [
                {
                  key: 'omicall-dialer',
                  icon: <PhoneCall size={15} className="text-amber-500" />,
                  label: 'Bàn phím quay số OmiCall',
                },
              ]
            : []),
          ...(activeConversation?.id === AI_COPILOT_CONV_ID
            ? [
                { type: 'divider' as const },
                {
                  key: 'ai-sessions',
                  icon: <History size={15} />,
                  label: 'Lịch sử phiên hội thoại MAI',
                },
                {
                  key: 'copy-ai-session-link',
                  icon: <LinkIcon size={15} />,
                  label: 'Sao chép liên kết cố định của phiên',
                  disabled: !aiSessionId,
                },
                ...(!isAiSessionReadOnly
                  ? [
                      {
                        key: 'toggle-ai-session-share',
                        icon: <Users size={15} />,
                        label: aiSessionAccess?.sharingEnabled
                          ? 'Dừng chia sẻ phiên này'
                          : 'Chia sẻ phiên này (người khác chỉ xem)',
                        disabled: !aiSessionId,
                      },
                    ]
                  : []),
              ]
            : []),
          ...(activeConversation?.id === AI_COPILOT_CONV_ID
            ? [
                { type: 'divider' as const },
                {
                  key: 'clear-ai',
                  icon: <Trash2 size={15} className="text-rose-400" />,
                  label: <span style={{ color: '#f43f5e' }}>Làm mới hội thoại MAI</span>,
                  danger: true,
                },
              ]
            : []),
          ...(isDannyAccount
            ? [
                { type: 'divider' as const },
                {
                  key: 'access-config',
                  icon: <ShieldCheck size={15} className="text-violet-400" />,
                  label: (
                    <span style={{ color: '#a78bfa' }}>
                      Phân quyền Đội nhóm
                      {accessConfig.allowAllStaff ||
                      accessConfig.allowedGroupKeys.length > 0 ||
                      accessConfig.allowedStaffIds.length > 0
                        ? ' ✓'
                        : ''}
                    </span>
                  ),
                },
              ]
            : []),
        ],
        onClick: ({ key }) => {
          if (key === 'mai-voice') {
            const next = !maiVoiceAnnounceEnabled;
            handleToggleMaiVoiceAnnounce(next);
            if (next) {
              antdMessage.success('Đã BẬT @MAI tự động phát âm thanh thông báo khẩn cấp khi bạn được tag');
              void playNeuralSpeech('MAI đã sẵn sàng đọc thông báo khẩn cấp khi bạn được tag.', {
                voice: 'vi-VN-HoaiMyNeural',
                speed: ttsSpeed,
              });
            } else {
              antdMessage.info('Đã TẮT @MAI đọc thông báo khẩn cấp');
            }
          } else if (key === 'pin-conv' && activeConversation) {
            togglePinConversation(activeConversation.id);
          } else if (key === 'mark-unread' && activeConversation) {
            toggleManualUnreadConversation(activeConversation);
          } else if (key === 'mini-dock') {
            handlePopOutToMiniDock();
          } else if (key === 'omicall-dialer') {
            dispatchOpenMosChatOmiCallDialer();
          } else if (key === 'ai-sessions') {
            setAiSessionsModalOpen(true);
          } else if (key === 'copy-ai-session-link') {
            handleCopyAiSessionPermalink();
          } else if (key === 'toggle-ai-session-share') {
            void handleToggleAiSessionSharing();
          } else if (key === 'clear-ai') {
            handleClearAiChat();
          } else if (key === 'access-config') {
            setAccessConfigTab(activeConversation?.id === AI_COPILOT_CONV_ID ? 'ai' : 'chat');
            setAccessConfigModalOpen(true);
          }
        },
      }}
    >
      <Tooltip title="Thêm tùy chọn">
        <button
          type="button"
          aria-label="Thêm tùy chọn"
          className="w-7 h-7 rounded-md inline-flex items-center justify-center cursor-pointer hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          style={{ color: token.colorTextSecondary }}
        >
          <MoreVertical size={15} />
        </button>
      </Tooltip>
    </Dropdown>
  );
};
