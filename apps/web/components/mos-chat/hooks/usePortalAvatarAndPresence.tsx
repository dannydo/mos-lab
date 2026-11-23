'use client';

import React, { useCallback, useState } from 'react';
import { Bookmark, Bot } from 'lucide-react';
import {
  removeVietnameseTones,
  type MosChatConversation,
  type MosChatPresenceStatus,
  type MosChatStaffMember,
  type SafeAny,
} from '@mos-lab/shared';
import { resolveMediaUrl } from '../../../lib/api-base-url';
import { AI_COPILOT_CONV_ID } from '../constants/chat-constants';

export interface RenderUserAvatarNodeParams {
  staffId?: number | string | null;
  name?: string | null;
  username?: string | null;
  rawAvatar?: string | null;
  avatarUrl?: string | null;
  bgColor?: string;
  bgStyle?: string;
  sizeClass?: string;
  roundedClass?: string;
  textSizeClass?: string;
  textClass?: string;
  textColor?: string;
  isOnline?: boolean;
  onlineDot?: boolean;
  isAiBot?: boolean;
  isSelfBookmark?: boolean;
}

export interface UsePortalAvatarAndPresenceParams {
  currentUser?: SafeAny;
  currentUserStaffMember: MosChatStaffMember;
  staffDirectory: MosChatStaffMember[];
  presence: MosChatPresenceStatus;
  surfaceBg: string;
}

export function usePortalAvatarAndPresence({
  currentUser,
  currentUserStaffMember,
  staffDirectory,
  presence,
  surfaceBg,
}: UsePortalAvatarAndPresenceParams) {
  const [brokenAvatarUrls, setBrokenAvatarUrls] = useState<Record<string, boolean>>({});

  const normalizeAvatarImageUrl = useCallback(
    (raw?: string | null): string | null => {
      if (!raw || typeof raw !== 'string') return null;
      const trimmed = raw.trim();
      if (!trimmed) return null;
      const isLikelyImageUrl =
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('/api/') ||
        trimmed.startsWith('/uploads/') ||
        trimmed.startsWith('data:image/') ||
        /\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?|$)/i.test(trimmed);
      if (!isLikelyImageUrl) return null;
      const normalized = resolveMediaUrl(
        trimmed.replace(/^https?:\/\/(s|api|www)?\.?wingslashes\.com/, 'https://cdn.wingslashes.com')
      );
      if (!normalized || brokenAvatarUrls[normalized]) return null;
      return normalized;
    },
    [brokenAvatarUrls]
  );

  const resolveUserAvatarUrl = useCallback(
    ({
      staffId,
      name,
      username,
      rawAvatar,
    }: {
      staffId?: number | string | null;
      name?: string | null;
      username?: string | null;
      rawAvatar?: string | null;
    }): string | null => {
      const direct = normalizeAvatarImageUrl(rawAvatar);
      if (direct) return direct;

      const cleanName = String(name || '')
        .replace(/\s*\(Ghi chú cho tôi\)\s*$/i, '')
        .replace(/^Chuyên Viên\s+/i, '')
        .trim()
        .toLowerCase();
      const cleanUser = String(username || '')
        .trim()
        .toLowerCase();
      const myId = currentUser?.id;
      const myName = String(currentUser?.displayName || '')
        .trim()
        .toLowerCase();
      const myUser = String(currentUser?.username || '')
        .trim()
        .toLowerCase();

      const isMeMatch =
        staffId === 'me' ||
        (myId && staffId && String(staffId) === String(myId)) ||
        (cleanName && myName && cleanName === myName) ||
        (cleanUser && myUser && cleanUser === myUser);

      if (isMeMatch) {
        const myDirectAvatar = normalizeAvatarImageUrl(currentUser?.avatarUrl || currentUser?.avatar);
        if (myDirectAvatar) return myDirectAvatar;
      }

      if (staffDirectory.length > 0) {
        const matchedStaff = staffDirectory.find((s) => {
          if (staffId && Number(s.id) === Number(staffId)) return true;
          if (isMeMatch && myId && Number(s.id) === Number(myId)) return true;
          const sName = String(s.displayName || '')
            .trim()
            .toLowerCase();
          const sUser = String(s.username || '')
            .trim()
            .toLowerCase();
          if (cleanName && sName && (sName === cleanName || sName.endsWith(` ${cleanName}`))) return true;
          if (cleanUser && sUser && sUser === cleanUser) return true;
          return false;
        });
        if (matchedStaff?.avatarUrl) {
          const dirAvatar = normalizeAvatarImageUrl(matchedStaff.avatarUrl);
          if (dirAvatar) return dirAvatar;
        }
      }

      return null;
    },
    [normalizeAvatarImageUrl, currentUser, staffDirectory]
  );

  const getAvatarInitials = useCallback((name?: string | null, fallback?: string | null): string => {
    const cleanFallback = String(fallback || '').trim();
    if (cleanFallback && cleanFallback.length <= 3 && !cleanFallback.includes('/') && !cleanFallback.includes('.')) {
      return cleanFallback.toUpperCase();
    }
    const clean = String(name || '')
      .replace(/\s*\(Ghi chú cho tôi\)\s*$/i, '')
      .replace(/^Chuyên Viên\s+/i, '')
      .trim();
    if (!clean) return 'NV';
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }, []);

  const isMessageFromCurrentUser = useCallback(
    (m: {
      senderId?: number | string | null;
      senderName?: string | null;
      isAiBot?: boolean;
      isSystemReminder?: boolean;
    }): boolean => {
      if (
        m.isAiBot ||
        m.isSystemReminder ||
        m.senderId === 'wings-ai-copilot' ||
        m.senderId === 'system' ||
        m.senderId === 'system-reminder'
      ) {
        return false;
      }
      if (m.senderId === 'me') return true;
      const myIdStr = String(currentUser?.id || '').replace(/^staff-/, '');
      const senderIdStr = String(m.senderId || '').replace(/^staff-/, '');
      if (myIdStr && senderIdStr && myIdStr === senderIdStr) {
        return true;
      }
      const senderClean = String(m.senderName || '')
        .trim()
        .toLowerCase();
      const myNameClean = String(currentUser?.displayName || '')
        .trim()
        .toLowerCase();
      const myUserClean = String(currentUser?.username || '')
        .trim()
        .toLowerCase();
      if (
        senderClean &&
        ((myNameClean && senderClean === myNameClean) || (myUserClean && senderClean === myUserClean))
      ) {
        return true;
      }
      if (!currentUser?.id && senderClean === 'danny do') {
        return true;
      }
      return false;
    },
    [currentUser?.id, currentUser?.displayName, currentUser?.username]
  );

  const isConversationParticipantOnline = useCallback(
    (conv: MosChatConversation | null | undefined): boolean => {
      if (!conv || conv.type === 'space') return false;
      const convIdStr = String(conv.id || '');
      if (convIdStr === AI_COPILOT_CONV_ID) return false;
      if (conv.isSelf || convIdStr.startsWith('dm-self-')) {
        return presence === 'active';
      }
      const myStaffId = Number(currentUserStaffMember.id) || Number(currentUser?.id) || 0;
      let peerStaffId = 0;
      if (Number(conv.participantStaffId) > 0 && Number(conv.participantStaffId) !== myStaffId) {
        peerStaffId = Number(conv.participantStaffId);
      } else if (Array.isArray(conv.memberIds) && conv.memberIds.length > 0) {
        const otherId = conv.memberIds.map(Number).find((id) => Number.isFinite(id) && id > 0 && id !== myStaffId);
        if (otherId) peerStaffId = otherId;
      }
      if (!peerStaffId) {
        const pairMatch = convIdStr.match(/^dm-(?:pair-)?(\d+)-(\d+)$/);
        if (pairMatch) {
          const a = Number(pairMatch[1]);
          const b = Number(pairMatch[2]);
          peerStaffId = a !== myStaffId ? a : b;
        }
      }
      if (peerStaffId > 0) {
        const matchedById = staffDirectory.find((s) => Number(s.id) === peerStaffId);
        if (matchedById) {
          return Boolean(matchedById.isOnline);
        }
      }
      const normName = removeVietnameseTones(
        String(conv.name || '')
          .trim()
          .toLowerCase()
      );
      if (normName) {
        const matchedByName = staffDirectory.find((s) => {
          const dName = removeVietnameseTones(
            String(s.displayName || '')
              .trim()
              .toLowerCase()
          );
          const uName = removeVietnameseTones(
            String(s.username || '')
              .trim()
              .toLowerCase()
          );
          return (dName && dName === normName) || (uName && uName === normName);
        });
        if (matchedByName) {
          return Boolean(matchedByName.isOnline);
        }
      }
      return false;
    },
    [currentUser?.id, currentUserStaffMember.id, presence, staffDirectory]
  );

  const renderUserAvatarNode = ({
    staffId,
    name,
    username,
    rawAvatar,
    avatarUrl,
    bgColor = '#3b82f6',
    bgStyle,
    sizeClass = 'w-8 h-8',
    roundedClass = 'rounded-full',
    textSizeClass = 'text-[11px]',
    textClass,
    textColor = '#ffffff',
    isOnline,
    onlineDot,
    isAiBot,
    isSelfBookmark,
  }: RenderUserAvatarNodeParams) => {
    const effectiveRawAvatar = rawAvatar ?? avatarUrl ?? null;
    const effectiveTextSize = textClass || textSizeClass;
    const effectiveOnline = Boolean(isOnline ?? onlineDot);
    const effectiveBg = bgStyle || bgColor;
    const resolvedImgUrl = isAiBot
      ? null
      : resolveUserAvatarUrl({ staffId, name, username, rawAvatar: effectiveRawAvatar });
    const initials = getAvatarInitials(name, effectiveRawAvatar);

    return (
      <div
        className={`${sizeClass} ${roundedClass} flex items-center justify-center ${effectiveTextSize} font-extrabold shrink-0 relative select-none`}
        style={{
          color: textColor,
          background: isAiBot
            ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 55%, #d4a84b 100%)'
            : isSelfBookmark && !resolvedImgUrl
              ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)'
              : effectiveBg,
        }}
      >
        {isAiBot ? (
          <Bot size={15} />
        ) : resolvedImgUrl ? (
          <img
            src={resolvedImgUrl}
            alt={name || username || 'User avatar'}
            referrerPolicy="no-referrer"
            className={`w-full h-full object-cover ${roundedClass} block`}
            onError={() => setBrokenAvatarUrls((prev) => ({ ...prev, [resolvedImgUrl]: true }))}
          />
        ) : isSelfBookmark ? (
          <Bookmark size={14} />
        ) : (
          <span>{initials}</span>
        )}
        {effectiveOnline && (
          <span
            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 z-10"
            style={{ border: `1.5px solid ${surfaceBg}` }}
          />
        )}
      </div>
    );
  };

  return {
    normalizeAvatarImageUrl,
    resolveUserAvatarUrl,
    getAvatarInitials,
    isMessageFromCurrentUser,
    isConversationParticipantOnline,
    renderUserAvatarNode,
  };
}
