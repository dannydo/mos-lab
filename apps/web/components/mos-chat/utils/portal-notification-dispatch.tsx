import React from 'react';
import type { GlobalToken } from 'antd';
import type { NotificationInstance } from 'antd/es/notification/interface';
import type {
  MosChatConversation,
  MosChatMessage,
  MosChatPresenceStatus,
  MosChatStaffMember,
  MosChatThreadReply,
  MosChatUserSidebarPrefs,
  SafeAny,
} from '@mos-lab/shared';
import { playMessengerChime, showDesktopNotification, tabNotificationManager } from '../../../lib/tab-notification';
import { playNeuralSpeech } from '../../voice-assistant/speech-utils';
import type { MosChatActiveSubtab } from '../types/mos-chat-types';
import {
  buildMaiUrgentVoiceAnnouncement,
  isUserMentionedInText,
  playWebAudioBuzzChime,
  triggerBuzzVibration,
} from './chat-helpers';

const NOTIFIED_BUZZ_STORAGE_KEY = 'mos_chat_notified_buzz_ids_v1';

export function loadNotifiedBuzzKeys(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(NOTIFIED_BUZZ_STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return new Set(arr.filter((x): x is string => typeof x === 'string'));
    }
  } catch {
    // ignore
  }
  return new Set();
}

export function saveNotifiedBuzzKeys(keys: Set<string>) {
  if (typeof window === 'undefined') return;
  try {
    const arr = Array.from(keys).slice(-400);
    window.localStorage.setItem(NOTIFIED_BUZZ_STORAGE_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

export interface DispatchConversationNotificationsParams {
  conversations: MosChatConversation[];
  currentUser: SafeAny;
  currentUserStaffMember: MosChatStaffMember;
  userPrefs: MosChatUserSidebarPrefs;
  isStrictDannySuperAdmin: boolean;
  presence: MosChatPresenceStatus;
  activeSubtab: MosChatActiveSubtab;
  openRef: React.MutableRefObject<boolean>;
  activeConvIdRef: React.MutableRefObject<string>;
  isInitialBootstrapRef: React.MutableRefObject<boolean>;
  seenMessageIdsRef: React.MutableRefObject<Set<string>>;
  notifiedBuzzIdsRef: React.MutableRefObject<Set<string>>;
  navigateToMessageRef: React.MutableRefObject<(convId: string, msgId?: string) => void>;
  ensurePortalOpen: () => void;
  maiVoiceAnnounceEnabled: boolean;
  ttsSpeed: number;
  notification: NotificationInstance;
  surfaceRaised: string;
  accentColor: string;
  accentContrast: string;
  borderColor: string;
  token: GlobalToken;
}

/**
 * Evaluates buzzed items and new incoming messages across fetched conversations,
 * respecting tiered notification filters, anti-flooding, MAI spoken urgent announcements,
 * and browser/desktop alerts while skipping stale bootstrap seeds.
 */
export function dispatchConversationNotifications({
  conversations,
  currentUser,
  currentUserStaffMember,
  userPrefs,
  isStrictDannySuperAdmin,
  presence,
  activeSubtab,
  openRef,
  activeConvIdRef,
  isInitialBootstrapRef,
  seenMessageIdsRef,
  notifiedBuzzIdsRef,
  navigateToMessageRef,
  ensurePortalOpen,
  maiVoiceAnnounceEnabled,
  ttsSpeed,
  notification,
  surfaceRaised,
  accentColor,
  accentContrast,
  borderColor,
  token,
}: DispatchConversationNotificationsParams): void {
  const myId = String(currentUser?.id || '');
  const myStaffId = Number(currentUserStaffMember?.id) || Number(currentUser?.id) || 0;
  const myName = String(currentUserStaffMember?.displayName || currentUser?.displayName || currentUser?.username || '')
    .trim()
    .toLowerCase();

  // On initial bootstrap, seed ALL existing message and thread reply IDs across all conversations
  // so old messages in previously-read spaces NEVER trigger false live alerts when a new message arrives later.
  if (isInitialBootstrapRef.current) {
    for (const conv of conversations) {
      for (const m of conv.messages || []) {
        seenMessageIdsRef.current.add(m.id);
        if (m.isBuzzed && m.buzzedAt) {
          const buzzAgeMs = Date.now() - new Date(m.buzzedAt).getTime();
          if (
            buzzAgeMs > 60_000 ||
            !conv.hasUnreadBuzz ||
            ((conv.unreadCount || 0) === 0 && (conv.unreadThreadCount || 0) === 0)
          ) {
            notifiedBuzzIdsRef.current.add(`${m.id}-${m.buzzedAt}`);
            if (m.latestBuzz?.id) notifiedBuzzIdsRef.current.add(m.latestBuzz.id);
          }
        }
        if (m.thread && m.thread.length > 0) {
          for (const r of m.thread) {
            seenMessageIdsRef.current.add(r.id);
            if (r.isBuzzed && r.buzzedAt) {
              const buzzAgeMs = Date.now() - new Date(r.buzzedAt).getTime();
              if (
                buzzAgeMs > 60_000 ||
                !conv.hasUnreadBuzz ||
                ((conv.unreadCount || 0) === 0 && (conv.unreadThreadCount || 0) === 0)
              ) {
                notifiedBuzzIdsRef.current.add(`${r.id}-${r.buzzedAt}`);
                if (r.latestBuzz?.id) notifiedBuzzIdsRef.current.add(r.latestBuzz.id);
              }
            }
          }
        }
      }
    }
    saveNotifiedBuzzKeys(notifiedBuzzIdsRef.current);
  }

  for (const conv of conversations) {
    const convIdStr = String(conv.id || '');
    if (conv.isSelf || convIdStr.startsWith('dm-self-')) continue;
    if ((userPrefs.mutedIds || []).includes(conv.id)) continue;
    if (conv.type === 'dm') {
      const dmIds = Array.isArray(conv.memberIds) ? conv.memberIds.map(Number) : [];
      if (myStaffId > 0 && dmIds.length === 2 && !dmIds.includes(myStaffId)) continue;
    }
    if (
      conv.type === 'space' &&
      !isStrictDannySuperAdmin &&
      Array.isArray(conv.memberIds) &&
      conv.memberIds.length > 0
    ) {
      const mNums = conv.memberIds.map(Number).filter((n) => Number.isFinite(n) && n > 0);
      if (mNums.length > 0 && myStaffId > 0 && !mNums.includes(myStaffId)) continue;
    }

    if (conv.hasUnreadBuzz || (conv.unreadCount || 0) > 0 || (conv.unreadThreadCount || 0) > 0) {
      const getEffectiveNotifMode = () => {
        const channelOverride = userPrefs.channelNotificationOverrides?.[conv.id];
        if (channelOverride && channelOverride !== 'INHERIT') return channelOverride;
        return userPrefs.notificationMode || 'ALL';
      };
      const effectiveNotifMode = getEffectiveNotifMode();

      const shouldShowPopupAndSound = (isTargetedByUser: boolean): boolean => {
        if (isTargetedByUser) return true;
        if (effectiveNotifMode === 'ALL') return true;
        if (effectiveNotifMode === 'MENTIONS_ONLY') return false;
        if (effectiveNotifMode === 'MUTED' || effectiveNotifMode === 'NOTHING') return false;
        return true;
      };

      const handleUrgentBuzzItem = (item: MosChatMessage | MosChatThreadReply) => {
        if (!item.isBuzzed || !item.buzzedAt) return;
        const buzzKey = `${item.id}-${item.buzzedAt}`;
        const buzzEventId = item.latestBuzz?.id;

        const isMsgMine =
          String(item.senderId) === myId ||
          (myStaffId > 0 && Number(item.senderId) === myStaffId) ||
          Boolean(
            myName &&
            String(item.senderName || '')
              .trim()
              .toLowerCase() === myName
          );
        const buzzSenderId = item.latestBuzz?.senderId;
        const isBuzzAuthorMe =
          (buzzSenderId != null &&
            (String(buzzSenderId) === myId || (myStaffId > 0 && Number(buzzSenderId) === myStaffId))) ||
          Boolean(
            myName &&
            String(item.latestBuzz?.senderName || '')
              .trim()
              .toLowerCase() === myName
          );
        const isMine = isMsgMine || isBuzzAuthorMe;

        if (
          isMine ||
          notifiedBuzzIdsRef.current.has(buzzKey) ||
          (buzzEventId && notifiedBuzzIdsRef.current.has(buzzEventId))
        ) {
          notifiedBuzzIdsRef.current.add(buzzKey);
          if (buzzEventId) notifiedBuzzIdsRef.current.add(buzzEventId);
          saveNotifiedBuzzKeys(notifiedBuzzIdsRef.current);
          return;
        }

        const buzzAgeMs = Date.now() - new Date(item.buzzedAt).getTime();
        if (buzzAgeMs > 90_000) {
          notifiedBuzzIdsRef.current.add(buzzKey);
          if (buzzEventId) notifiedBuzzIdsRef.current.add(buzzEventId);
          saveNotifiedBuzzKeys(notifiedBuzzIdsRef.current);
          return;
        }

        const userObj = {
          id: myStaffId || myId,
          displayName: currentUserStaffMember?.displayName || currentUser?.displayName,
          username: currentUserStaffMember?.username || currentUser?.username,
        };
        const isDirectMsg = conv.type === 'dm';
        const isTargeted = isUserMentionedInText(item.text || '', userObj, {
          nicknames: conv.memberNicknames,
          isDirectMessage: isDirectMsg,
        });

        notifiedBuzzIdsRef.current.add(buzzKey);
        if (buzzEventId) notifiedBuzzIdsRef.current.add(buzzEventId);
        saveNotifiedBuzzKeys(notifiedBuzzIdsRef.current);

        if (!shouldShowPopupAndSound(isTargeted || isDirectMsg)) return;

        playWebAudioBuzzChime();
        triggerBuzzVibration();

        const senderLabel = item.latestBuzz?.senderName || item.senderName || 'Đồng nghiệp';
        const convLabel = conv.name ? `[${conv.name}]` : '';
        const preview = item.text
          ? item.text.length > 70
            ? `${item.text.slice(0, 70)}...`
            : item.text
          : 'Tin nhắn khẩn cấp';

        if (isTargeted && maiVoiceAnnounceEnabled) {
          const spokenText = buildMaiUrgentVoiceAnnouncement({
            senderName: senderLabel,
            conversationName: conv.name,
            isSpace: conv.type === 'space',
            messageText: item.text || '',
            note: item.latestBuzz?.note,
          });

          setTimeout(() => {
            void playNeuralSpeech(spokenText, {
              voice: 'vi-VN-HoaiMyNeural',
              speed: ttsSpeed || 1.0,
            });
          }, 380);
        }

        notification.warning({
          message: `⚡ TIN NHẮN KHẨN CẤP (BUZZ) ${convLabel}`,
          description: (
            <div className="space-y-1">
              <div>{`${senderLabel} vừa Buzz tin nhắn khẩn cấp: "${preview}"`}</div>
              {isTargeted && maiVoiceAnnounceEnabled && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                  <span>🤖</span>
                  <span>@MAI đã phát âm thanh thông báo trực tiếp đến bạn</span>
                </div>
              )}
            </div>
          ),
          duration: 9,
          style: {
            background: surfaceRaised,
            border: `1.5px solid ${accentColor}`,
            color: token.colorText,
            boxShadow: 'var(--mos-shadow)',
            borderRadius: 12,
          },
          btn: (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const spokenText = buildMaiUrgentVoiceAnnouncement({
                    senderName: senderLabel,
                    conversationName: conv.name,
                    isSpace: conv.type === 'space',
                    messageText: item.text || '',
                    note: item.latestBuzz?.note,
                  });
                  void playNeuralSpeech(spokenText, { voice: 'vi-VN-HoaiMyNeural', speed: ttsSpeed || 1.0 });
                }}
                className="px-2.5 py-1 rounded font-semibold text-xs cursor-pointer shadow-sm border border-amber-500/40 hover:bg-amber-500/10 transition-colors"
                style={{ color: token.colorText }}
              >
                🔊 Nghe lại
              </button>
              <button
                type="button"
                onClick={() => {
                  ensurePortalOpen();
                  navigateToMessageRef.current(conv.id, item.id);
                  notification.destroy(`buzz-notify-${item.id}`);
                }}
                className="px-3 py-1 rounded font-bold text-xs cursor-pointer shadow-sm transition-opacity hover:opacity-90"
                style={{
                  background: accentColor,
                  color: accentContrast,
                }}
              >
                Xem ngay
              </button>
            </div>
          ),
          onClick: () => {
            ensurePortalOpen();
            navigateToMessageRef.current(conv.id, item.id);
            notification.destroy(`buzz-notify-${item.id}`);
          },
          key: `buzz-notify-${item.id}`,
        });
      };

      const handleIncomingMessageItem = (item: MosChatMessage | MosChatThreadReply, parentMsg?: MosChatMessage) => {
        if (isInitialBootstrapRef.current) {
          seenMessageIdsRef.current.add(item.id);
          return;
        }

        if (seenMessageIdsRef.current.has(item.id)) return;
        seenMessageIdsRef.current.add(item.id);

        const isMine =
          String(item.senderId) === myId ||
          (myStaffId > 0 && Number(item.senderId) === myStaffId) ||
          Boolean(
            myName &&
            String(item.senderName || '')
              .trim()
              .toLowerCase() === myName
          );

        if (isMine || item.isBuzzed || (item as MosChatThreadReply).isMissionMilestone) return;

        const userObj = {
          id: myStaffId || myId,
          displayName: currentUserStaffMember?.displayName || currentUser?.displayName,
          username: currentUserStaffMember?.username || currentUser?.username,
        };
        const isDirectMsg = conv.type === 'dm';
        const isMentioned = isUserMentionedInText(item.text || '', userObj, {
          nicknames: conv.memberNicknames,
          isDirectMessage: isDirectMsg,
        });
        const isMyThreadReply = Boolean(
          parentMsg &&
          (Number(parentMsg.senderId) === myStaffId ||
            String(parentMsg.senderId) === myId ||
            isUserMentionedInText(parentMsg.text || '', userObj, {
              nicknames: conv.memberNicknames,
              isDirectMessage: false,
            }) ||
            (parentMsg.thread || []).some(
              (r) => r.id !== item.id && (Number(r.senderId) === myStaffId || String(r.senderId) === myId)
            ))
        );

        const tagsSomeoneElseOnly = !isDirectMsg && !isMentioned && !isMyThreadReply && /@\S+/.test(item.text || '');
        if (tagsSomeoneElseOnly) return;

        const isPersonalForMe = isDirectMsg || isMentioned || isMyThreadReply;
        if (!shouldShowPopupAndSound(isPersonalForMe)) return;

        if (isPersonalForMe && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('mos-notifications:refresh'));
        }

        tabNotificationManager.triggerAlert({
          senderName: item.senderName || 'Đồng nghiệp',
          snippet: item.text || '',
          conversationName: conv.name,
          isDirect: isDirectMsg,
        });

        if (presence !== 'dnd') {
          playMessengerChime();
        }

        if (typeof document !== 'undefined' && document.hidden) {
          showDesktopNotification(isDirectMsg ? item.senderName || 'mOS Chat' : `${conv.name} · ${item.senderName}`, {
            body: item.text
              ? item.text.length > 80
                ? `${item.text.slice(0, 80)}...`
                : item.text
              : 'Đã gửi một tin nhắn',
            tag: `mos-msg-${conv.id}`,
            conversationId: conv.id,
            messageId: item.id,
          });
        } else if (!openRef.current || activeConvIdRef.current !== conv.id || activeSubtab !== 'chat') {
          const senderLabel = item.senderName || conv.name || 'Đồng nghiệp';
          const preview = item.text
            ? item.text.length > 90
              ? `${item.text.slice(0, 90)}...`
              : item.text
            : 'Đã gửi một hình ảnh / tin nhắn mới';
          const toastTitle = isDirectMsg
            ? `💬 Tin nhắn mới từ ${senderLabel}`
            : isMentioned
              ? `💬 ${senderLabel} đã nhắc tên bạn trong #${conv.name}`
              : isMyThreadReply
                ? `💬 ${senderLabel} phản hồi luồng của bạn trong #${conv.name}`
                : `💬 [${conv.name}] ${senderLabel}`;
          notification.info({
            key: `chat-msg-notify-${item.id}`,
            message: <span className="font-semibold text-xs">{toastTitle}</span>,
            description: <div className="text-xs line-clamp-2">{preview}</div>,
            placement: 'topRight',
            duration: 5,
            style: {
              background: surfaceRaised,
              border: `1px solid ${borderColor}`,
              color: token.colorText,
              borderRadius: 12,
              cursor: 'pointer',
            },
            onClick: () => {
              ensurePortalOpen();
              navigateToMessageRef.current(conv.id, item.id);
              notification.destroy(`chat-msg-notify-${item.id}`);
            },
          });
        }
      };

      for (const m of conv.messages || []) {
        handleUrgentBuzzItem(m);
        handleIncomingMessageItem(m);
        if (m.thread && m.thread.length > 0) {
          for (const r of m.thread) {
            handleUrgentBuzzItem(r);
            handleIncomingMessageItem(r, m);
          }
        }
      }
    }
  }
  if (isInitialBootstrapRef.current) {
    isInitialBootstrapRef.current = false;
  }
}
