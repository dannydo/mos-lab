'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from 'antd';
import { Users, X } from 'lucide-react';
import type { SafeAny, MosChatStaffMember } from '@mos-lab/shared';
import type { MosChatReactionUsersTarget } from '../types/mos-chat-types';
import { parseStickerReactionKey, MosChatStickerVisual } from '../mos-chat-stickers';
import { MosChatAvatar } from '../MosChatAvatar';

export interface MosChatReactionUsersModalProps {
  open: boolean;
  target: MosChatReactionUsersTarget | null;
  onClose: () => void;
  currentUser?: {
    id?: number | string;
    username?: string;
    name?: string;
    displayName?: string;
    role?: string;
  } | null;
  staffDirectory?: MosChatStaffMember[];
  onToggleReaction?: (msgId: string, emoji: string, replyId?: string) => Promise<void> | void;
  isDark?: boolean;
}

export const MosChatReactionUsersModal: React.FC<MosChatReactionUsersModalProps> = ({
  open,
  target,
  onClose,
  currentUser,
  staffDirectory = [],
  onToggleReaction,
  isDark = true,
}) => {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Sync initial emoji when target changes
  useEffect(() => {
    if (target?.initialEmoji) {
      setActiveFilter(target.initialEmoji);
    } else {
      setActiveFilter('ALL');
    }
  }, [target]);

  const reactions = target?.reactions || {};
  const reactionUsers = target?.reactionUsers || {};

  const myId = String(currentUser?.id ?? '');
  const myUsername = String(currentUser?.username ?? '').toLowerCase();

  const isCurrentUser = (uStr: string): boolean => {
    if (myId && uStr === myId) return true;
    if (myUsername && uStr.toLowerCase() === myUsername) return true;
    if (uStr === 'me') return true;
    if (!myId && uStr === '1') return true;
    return false;
  };

  const allEntries = useMemo(() => {
    if (!target) return [];
    const entries: Array<{
      userKey: string;
      emoji: string;
      isMe: boolean;
      staffName: string;
      staffRole?: string;
      staffAvatar?: string;
      staffColor?: string;
      staffId?: number | string;
      username?: string;
    }> = [];

    // Iterate through all emojis in reactionUsers
    for (const [emoji, users] of Object.entries(reactionUsers)) {
      if (!Array.isArray(users)) continue;
      for (const u of users) {
        const uStr = String(u);
        const isMe = isCurrentUser(uStr);
        const staff = staffDirectory.find(
          (s) =>
            String(s.id) === uStr ||
            String(s.username || '').toLowerCase() === uStr.toLowerCase()
        );

        const staffName =
          staff?.displayName ||
          (staff as SafeAny)?.name ||
          (isMe ? (currentUser?.name || currentUser?.displayName || 'Bạn') : `Thành viên #${uStr}`);
        const staffRole = staff?.role || (isMe ? (currentUser?.role || 'Thành viên') : undefined);
        const staffAvatar = staff?.avatarUrl || (staff as SafeAny)?.photoUrl;
        const staffColor = (staff as SafeAny)?.roleColor || '#3b82f6';

        entries.push({
          userKey: uStr,
          emoji,
          isMe,
          staffName,
          staffRole,
          staffAvatar,
          staffColor,
          staffId: staff?.id || uStr,
          username: staff?.username,
        });
      }
    }

    // Fallback: If reactionUsers has no entries but reactions has counts (e.g. legacy reactions)
    if (entries.length === 0) {
      for (const [emoji, count] of Object.entries(reactions)) {
        if (count <= 0) continue;
        for (let i = 0; i < count; i++) {
          entries.push({
            userKey: `legacy-${emoji}-${i}`,
            emoji,
            isMe: false,
            staffName: i === 0 ? 'Thành viên' : `Thành viên ${i + 1}`,
            staffRole: 'Thành viên',
            staffColor: '#64748b',
          });
        }
      }
    }

    return entries;
  }, [target, reactionUsers, reactions, myId, myUsername, staffDirectory, currentUser]);

  // Emojis list that have reactions
  const emojiTabs = useMemo(() => {
    const list: Array<{ emoji: string; count: number }> = [];
    for (const [emoji, count] of Object.entries(reactions)) {
      if (count > 0) {
        list.push({ emoji, count });
      }
    }
    return list;
  }, [reactions]);

  const totalCount = useMemo(() => {
    return emojiTabs.reduce((sum, item) => sum + item.count, 0);
  }, [emojiTabs]);

  const filteredEntries = useMemo(() => {
    if (activeFilter === 'ALL') return allEntries;
    return allEntries.filter((e) => e.emoji === activeFilter);
  }, [allEntries, activeFilter]);

  if (!target) return null;

  const handleRemoveMyReaction = async (emoji: string) => {
    if (onToggleReaction) {
      await onToggleReaction(target.messageId, emoji, target.replyId);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={460}
      destroyOnHidden
      closable={{ closeIcon: <X className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" /> }}
      wrapClassName={isDark ? 'dark-theme' : 'light-theme'}
      title={
        <div className="flex items-center gap-2 pr-6">
          <Users className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Người đã thả cảm xúc
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 dark:text-amber-300 font-bold tabular-nums">
            {totalCount}
          </span>
        </div>
      }
      styles={{
        content: {
          padding: '16px 20px 20px',
          borderRadius: '16px',
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a',
          border: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
          boxShadow: isDark ? '0 25px 50px -12px rgba(0, 0, 0, 0.6)' : '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        },
        header: {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          borderBottom: isDark ? '1px solid #1e293b' : '1px solid #f1f5f9',
          paddingBottom: '12px',
          marginBottom: '0',
        },
        body: {
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
          paddingTop: '12px',
        },
      }}
    >
      {/* Horizontal Emoji Filter Tabs */}
      {emojiTabs.length > 0 && (
        <div className="flex items-center gap-1.5 pb-3 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveFilter('ALL')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-amber-500/20 border border-amber-500/70 text-amber-600 dark:text-amber-300 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>Tất cả</span>
            <span className="text-[10px] tabular-nums font-bold text-amber-500 dark:text-amber-400">
              {totalCount}
            </span>
          </button>

          {emojiTabs.map(({ emoji, count }) => {
            const sticker = parseStickerReactionKey(emoji);
            const isSelected = activeFilter === emoji;
            return (
              <button
                key={emoji}
                type="button"
                onClick={() => setActiveFilter(emoji)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500/20 border border-amber-500/70 text-amber-600 dark:text-amber-300 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {sticker ? (
                  <MosChatStickerVisual sticker={sticker} size="reaction" />
                ) : (
                  <span className="text-sm">{emoji}</span>
                )}
                <span className="text-[10px] tabular-nums font-bold text-amber-500 dark:text-amber-400">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* User List */}
      <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 py-1 max-h-[360px] min-h-[140px]">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400 text-sm">
            <p>Chưa có ai thả cảm xúc này.</p>
          </div>
        ) : (
          filteredEntries.map((entry, idx) => {
            const sticker = parseStickerReactionKey(entry.emoji);
            return (
              <div
                key={`${entry.userKey}-${entry.emoji}-${idx}`}
                className="flex items-center justify-between py-2 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl transition-colors"
              >
                {/* User Avatar + Details */}
                <div className="flex items-center gap-3 min-w-0">
                  <MosChatAvatar
                    src={entry.staffAvatar}
                    name={entry.staffName}
                    staffId={entry.staffId}
                    username={entry.username}
                    staffDirectory={staffDirectory}
                    size="md"
                    className="shrink-0"
                  />

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                        {entry.staffName}
                      </span>
                      {entry.isMe && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-300 font-bold border border-amber-500/40">
                          Bạn
                        </span>
                      )}
                    </div>
                    {entry.staffRole && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {entry.staffRole}
                      </p>
                    )}
                  </div>
                </div>

                {/* Reaction Emoji Badge + Undo Action (Huỷ react) */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 shadow-sm">
                    {sticker ? (
                      <MosChatStickerVisual sticker={sticker} size="reaction" />
                    ) : (
                      <span className="text-base">{entry.emoji}</span>
                    )}
                  </div>

                  {entry.isMe && onToggleReaction && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMyReaction(entry.emoji)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 font-semibold active:scale-95 transition-all cursor-pointer"
                      title="Gỡ cảm xúc của bạn"
                    >
                      Huỷ react
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </Modal>
  );
};
