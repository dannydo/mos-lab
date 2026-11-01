'use client';

import React, { useState, useMemo } from 'react';
import { X, Users } from 'lucide-react';
import type { SafeAny } from '@mos-lab/shared';
import { useMosChat } from '../context/MosChatContext';
import { parseStickerReactionKey, MosChatStickerVisual } from '../mos-chat-stickers';

export const MosChatMobileReactionUsersSheet: React.FC = () => {
  const {
    reactionUsersTarget,
    closeReactionUsersSheet,
    staffDirectory,
    currentUser,
    reactToMessage,
  } = useMosChat();

  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Sync initial emoji when reactionUsersTarget changes
  React.useEffect(() => {
    if (reactionUsersTarget?.initialEmoji) {
      setActiveFilter(reactionUsersTarget.initialEmoji);
    } else {
      setActiveFilter('ALL');
    }
  }, [reactionUsersTarget]);

  const target = reactionUsersTarget;
  const reactions = target?.reactions || {};
  const reactionUsers = target?.reactionUsers || {};

  // Compute all reaction pairs: { userKey, emoji, isMe, staff }
  const myKey = String(currentUser?.id || 'me');

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
    }> = [];

    // Iterate through all emojis in reactionUsers
    for (const [emoji, users] of Object.entries(reactionUsers)) {
      if (!Array.isArray(users)) continue;
      for (const u of users) {
        const uStr = String(u);
        const isMe = uStr === myKey || (myKey === 'me' && uStr === '1');
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
  }, [target, reactionUsers, reactions, myKey, staffDirectory, currentUser]);

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
    await reactToMessage(target.messageId, emoji, target.replyId);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
      {/* Backdrop */}
      <div
        onClick={closeReactionUsersSheet}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-up Sheet */}
      <div className="relative bg-slate-900 border-t border-slate-800 rounded-t-3xl px-4 pt-3 pb-[max(env(safe-area-inset-bottom,20px),16px)] shadow-2xl animate-in slide-in-from-bottom duration-200 max-h-[80vh] flex flex-col">
        {/* Grab Handle */}
        <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-3 shrink-0" />

        {/* Header with Title and Right-placed Close Button (Rule 8 Invariant) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <h3 className="text-base font-semibold text-slate-100">Người đã thả cảm xúc</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold tabular-nums">
              {totalCount}
            </span>
          </div>
          <button
            type="button"
            onClick={closeReactionUsersSheet}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors active:scale-95"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Horizontal Emoji Filter Tabs */}
        {emojiTabs.length > 0 && (
          <div className="flex items-center gap-2 py-3 overflow-x-auto no-scrollbar shrink-0 border-b border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                activeFilter === 'ALL'
                  ? 'bg-amber-500/25 border border-amber-500/80 text-amber-300 shadow-sm'
                  : 'bg-slate-800/90 border border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span>Tất cả</span>
              <span className="text-[10px] tabular-nums font-bold text-amber-400/90">{totalCount}</span>
            </button>

            {emojiTabs.map(({ emoji, count }) => {
              const sticker = parseStickerReactionKey(emoji);
              const isSelected = activeFilter === emoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setActiveFilter(emoji)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                    isSelected
                      ? 'bg-amber-500/25 border border-amber-500/80 text-amber-300 shadow-sm'
                      : 'bg-slate-800/90 border border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {sticker ? (
                    <MosChatStickerVisual sticker={sticker} size="reaction" />
                  ) : (
                    <span className="text-sm">{emoji}</span>
                  )}
                  <span className="text-[10px] tabular-nums font-bold text-amber-400/90">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* User List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 py-1 min-h-[160px] max-h-[50vh]">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-sm">
              <p>Chưa có ai thả cảm xúc này.</p>
            </div>
          ) : (
            filteredEntries.map((entry, idx) => {
              const sticker = parseStickerReactionKey(entry.emoji);
              const initials = (entry.staffName || 'U')
                .split(' ')
                .map((w) => w[0])
                .slice(-2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={`${entry.userKey}-${entry.emoji}-${idx}`}
                  className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-800/50 rounded-xl transition-colors"
                >
                  {/* User Avatar + Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    {entry.staffAvatar ? (
                      <img
                        src={entry.staffAvatar}
                        alt={entry.staffName}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-700"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm"
                        style={{ backgroundColor: entry.staffColor || '#3b82f6' }}
                      >
                        {initials}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm text-slate-100 truncate">
                          {entry.staffName}
                        </span>
                        {entry.isMe && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                            Bạn
                          </span>
                        )}
                      </div>
                      {entry.staffRole && (
                        <p className="text-xs text-slate-400 truncate">{entry.staffRole}</p>
                      )}
                    </div>
                  </div>

                  {/* Reaction Emoji Badge + Undo Action (Huỷ react) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800/90 border border-slate-700/80 shadow-sm">
                      {sticker ? (
                        <MosChatStickerVisual sticker={sticker} size="reaction" />
                      ) : (
                        <span className="text-lg">{entry.emoji}</span>
                      )}
                    </div>

                    {entry.isMe && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMyReaction(entry.emoji)}
                        className="text-xs px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-semibold active:scale-95 transition-all"
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
      </div>
    </div>
  );
};
