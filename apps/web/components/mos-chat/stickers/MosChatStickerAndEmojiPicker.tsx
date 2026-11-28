'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Search, Sparkles } from 'lucide-react';
import { MOS_CHAT_MAX_FREQUENT_EMOJIS, removeVietnameseTones } from '@mos-lab/shared';
import { EMOJI_SEARCH_KEYWORD_MAP, MOS_CHAT_EXPANDED_EMOJI_GROUPS } from './emoji-catalog-and-keywords';
import { MOS_CHAT_STICKER_PACK_TABS, type MosChatStickerItem, type MosChatStickerPackId } from './sticker-packs-core';
import { MOS_CHAT_STICKERS, formatStickerToken } from './sticker-registry';
import { MosChatStickerVisual } from './sticker-svg-visuals';

export const MosChatStickerAndEmojiPicker: React.FC<{
  isDark: boolean;
  borderColor: string;
  surfaceRaised: string;
  wingsSignatureEmojis: readonly string[];
  popularEmojis: readonly string[];
  frequentEmojis?: readonly string[];
  onResetFrequentEmojis?: () => void;
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (sticker: MosChatStickerItem) => void;
  mode?: 'composer' | 'reaction';
  hasUserReacted?: (key: string) => boolean;
  defaultPack?: MosChatStickerPackId;
  width?: number | string;
}> = ({
  isDark,
  borderColor,
  surfaceRaised,
  frequentEmojis,
  onResetFrequentEmojis,
  onSelectEmoji,
  onSelectSticker,
  mode = 'composer',
  hasUserReacted,
  defaultPack = 'wings',
  width,
}) => {
  const [activePack, setActivePack] = useState<MosChatStickerPackId>(defaultPack);
  const [searchQuery, setSearchQuery] = useState('');
  // Freeze frequent emoji order while popup stays mounted so consecutive clicks never shift items under cursor
  const [frozenFrequentEmojis, setFrozenFrequentEmojis] = useState<string[]>(() =>
    frequentEmojis ? [...frequentEmojis].slice(0, MOS_CHAT_MAX_FREQUENT_EMOJIS) : []
  );
  const gridScrollRef = useRef<HTMLDivElement | null>(null);

  const handleResetFrequent = () => {
    setFrozenFrequentEmojis([]);
    onResetFrequentEmojis?.();
  };

  useEffect(() => {
    if (defaultPack) {
      setActivePack(defaultPack);
    }
  }, [defaultPack]);

  const filteredStickers = useMemo(() => {
    const q = removeVietnameseTones(searchQuery.trim().toLowerCase());
    if (q) {
      return MOS_CHAT_STICKERS.filter((s) => {
        const titleNorm = removeVietnameseTones(s.title.toLowerCase());
        const capNorm = removeVietnameseTones((s.caption || '').toLowerCase());
        return (
          titleNorm.includes(q) ||
          capNorm.includes(q) ||
          s.keywords.some((k) => removeVietnameseTones(k.toLowerCase()).includes(q))
        );
      });
    }
    if (activePack === 'emoji') return [];
    return MOS_CHAT_STICKERS.filter((s) => s.packId === activePack);
  }, [activePack, searchQuery]);

  const filteredEmojis = useMemo(() => {
    if (activePack !== 'emoji') return null;
    const q = removeVietnameseTones(searchQuery.trim().toLowerCase());
    if (!q) return null;
    const results: string[] = [];
    const seen = new Set<string>();

    for (const [kw, list] of Object.entries(EMOJI_SEARCH_KEYWORD_MAP)) {
      if (kw.includes(q) || q.includes(kw)) {
        for (const em of list) {
          if (!seen.has(em)) {
            seen.add(em);
            results.push(em);
          }
        }
      }
    }

    for (const grp of MOS_CHAT_EXPANDED_EMOJI_GROUPS) {
      const labelNorm = removeVietnameseTones(grp.label.toLowerCase());
      const isGroupMatch = labelNorm.includes(q);
      for (const em of grp.emojis) {
        if (!seen.has(em) && (em.includes(q) || isGroupMatch)) {
          seen.add(em);
          results.push(em);
        }
      }
    }
    return results;
  }, [activePack, searchQuery]);

  return (
    <div
      data-no-chat-autofocus="true"
      onClick={(e) => e.stopPropagation()}
      className="p-2 space-y-2 select-none"
      style={{ width: width ?? 372, maxWidth: '100%' }}
    >
      {/* Top Category Pack Switcher Tabs (Fits all 6 packs cleanly without scrollbar) */}
      <div
        className="grid grid-cols-6 gap-1 p-1 rounded-xl"
        style={{
          background: surfaceRaised,
          border: `1px solid ${borderColor}`,
        }}
      >
        {MOS_CHAT_STICKER_PACK_TABS.map((tab) => {
          const isActive = activePack === tab.id && !searchQuery.trim();
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActivePack(tab.id);
                setSearchQuery('');
                if (gridScrollRef.current) {
                  gridScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              title={tab.label}
              className="px-1 py-1.5 rounded-lg text-[10px] font-extrabold inline-flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all leading-none"
              style={{
                background: isActive ? 'var(--mos-accent, #d4a84b)' : 'transparent',
                color: isActive ? 'var(--mos-accent-contrast, #000000)' : 'var(--mos-text-muted, #64748b)',
              }}
            >
              <span className="text-[13px] leading-none">{tab.icon}</span>
              <span className="truncate max-w-full">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Search bar for Both Stickers/Memes and Emojis */}
      <div
        className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg"
        style={{
          background: surfaceRaised,
          border: `1px solid ${borderColor}`,
        }}
      >
        <Search size={12} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            activePack === 'emoji'
              ? 'Tìm emoji (VD: cười, tim, lửa, like...)'
              : 'Tìm meme / sticker (VD: chốt đơn, mèo, khóc, sếp...)'
          }
          className="w-full bg-transparent text-[11.5px] outline-none"
          style={{ color: 'var(--mos-text, #f8fafc)' }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-[10px] text-slate-400 hover:text-amber-400 cursor-pointer font-bold"
          >
            Xoá
          </button>
        )}
      </div>

      {/* Pack Content: Either Classic Emoji Grid OR Animated Sticker Grid */}
      {activePack === 'emoji' ? (
        searchQuery.trim() ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span
                className="text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1"
                style={{ color: 'var(--mos-accent, #f59e0b)' }}
              >
                <Sparkles size={11} />
                <span>Kết quả emoji ({filteredEmojis?.length || 0})</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {mode === 'reaction' ? '1 chạm để thả cảm xúc' : '1 chạm chèn emoji'}
              </span>
            </div>
            {!filteredEmojis || filteredEmojis.length === 0 ? (
              <div className="py-8 text-center text-[11.5px] text-slate-400">
                Không tìm thấy emoji phù hợp với &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="grid grid-cols-9 gap-1 max-h-[268px] overflow-y-auto pr-0.5 py-0.5">
                {filteredEmojis.map((emoji, idx) => {
                  const reacted = hasUserReacted?.(emoji);
                  return (
                    <button
                      key={`search-em-${emoji}-${idx}`}
                      type="button"
                      data-emoji={emoji}
                      onClick={() => onSelectEmoji(emoji)}
                      className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[18px] cursor-pointer transition-transform hover:scale-125 hover:bg-black/5 dark:hover:bg-white/10"
                      style={{
                        background: reacted ? 'var(--mos-focus-ring, rgba(212, 168, 75, 0.22))' : 'transparent',
                        boxShadow: reacted ? 'inset 0 0 0 1px var(--mos-accent, #d4a84b)' : 'none',
                      }}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[270px] overflow-y-auto pr-0.5">
            {/* Quick Category Jump Bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
              {frozenFrequentEmojis.length > 0 && (
                <button
                  key="frequent"
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('emoji-group-frequent');
                    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 cursor-pointer transition-colors hover:bg-amber-500/15 text-slate-400 hover:text-amber-400 border border-slate-700/50"
                >
                  <span className="mr-1">🕒</span>
                  <span>Hay dùng</span>
                </button>
              )}
              {MOS_CHAT_EXPANDED_EMOJI_GROUPS.map((grp) => (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`emoji-group-${grp.id}`);
                    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 cursor-pointer transition-colors hover:bg-amber-500/15 text-slate-400 hover:text-amber-400 border border-slate-700/50"
                >
                  <span className="mr-1">{grp.icon}</span>
                  <span>{grp.shortLabel}</span>
                </button>
              ))}
            </div>

            {/* Frequently Used Emojis Group (Top 18 in 1-2 rows) */}
            {frozenFrequentEmojis.length > 0 && (
              <div id="emoji-group-frequent" className="space-y-1">
                <div className="px-1 flex items-center justify-between gap-2">
                  <div
                    className="text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1"
                    style={{ color: 'var(--mos-accent, #f59e0b)' }}
                  >
                    <span>🕒</span>
                    <span>Hay dùng</span>
                  </div>
                  {onResetFrequentEmojis && (
                    <button
                      type="button"
                      onClick={handleResetFrequent}
                      aria-label="Làm mới emoji hay dùng"
                      title="Xoá lịch sử emoji hay dùng"
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-amber-400 cursor-pointer transition-colors"
                    >
                      <RotateCcw size={10} />
                      <span>Làm mới</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-9 gap-1">
                  {frozenFrequentEmojis.map((emoji) => {
                    const reacted = hasUserReacted?.(emoji);
                    return (
                      <button
                        key={`frequent-${emoji}`}
                        type="button"
                        data-emoji={emoji}
                        data-testid="frequent-emoji-item"
                        onClick={() => onSelectEmoji(emoji)}
                        className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[18px] cursor-pointer transition-transform hover:scale-125 hover:bg-black/5 dark:hover:bg-white/10"
                        style={{
                          background: reacted ? 'var(--mos-focus-ring, rgba(212, 168, 75, 0.22))' : 'transparent',
                          boxShadow: reacted ? 'inset 0 0 0 1px var(--mos-accent, #d4a84b)' : 'none',
                        }}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Categorized Emoji Groups */}
            {MOS_CHAT_EXPANDED_EMOJI_GROUPS.map((grp) => (
              <div key={grp.id} id={`emoji-group-${grp.id}`} className="space-y-1">
                <div
                  className="px-1 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1"
                  style={{ color: 'var(--mos-accent, #f59e0b)' }}
                >
                  <span>{grp.icon}</span>
                  <span>{grp.label}</span>
                </div>
                <div className="grid grid-cols-9 gap-1">
                  {grp.emojis.map((emoji) => {
                    const reacted = hasUserReacted?.(emoji);
                    return (
                      <button
                        key={`${grp.id}-${emoji}`}
                        type="button"
                        data-emoji={emoji}
                        onClick={() => onSelectEmoji(emoji)}
                        className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[18px] cursor-pointer transition-transform hover:scale-125 hover:bg-black/5 dark:hover:bg-white/10"
                        style={{
                          background: reacted ? 'var(--mos-focus-ring, rgba(212, 168, 75, 0.22))' : 'transparent',
                          boxShadow: reacted ? 'inset 0 0 0 1px var(--mos-accent, #d4a84b)' : 'none',
                        }}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <span
              className="text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1"
              style={{ color: 'var(--mos-accent, #f59e0b)' }}
            >
              <Sparkles size={11} />
              <span>
                {searchQuery.trim()
                  ? `Kết quả tìm kiếm (${filteredStickers.length})`
                  : MOS_CHAT_STICKER_PACK_TABS.find((t) => t.id === activePack)?.label}
              </span>
            </span>
            <span className="text-[10px] text-slate-400">
              {mode === 'reaction' ? '1 chạm để thả cảm xúc' : '1 chạm gửi ngay'}
            </span>
          </div>

          {filteredStickers.length === 0 ? (
            <div className="py-8 text-center text-[11.5px] text-slate-400">
              Không tìm thấy sticker phù hợp với &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            <div ref={gridScrollRef} className="grid grid-cols-4 gap-1.5 max-h-[268px] overflow-y-auto pr-0.5 py-0.5">
              {filteredStickers.map((sticker) => {
                const tokenKey = formatStickerToken(sticker.id);
                const reacted = hasUserReacted?.(tokenKey);
                return (
                  <button
                    key={sticker.id}
                    type="button"
                    onClick={() => onSelectSticker(sticker)}
                    className="rounded-xl flex items-center justify-center cursor-pointer transition-colors hover:bg-amber-500/10"
                    style={{
                      background: reacted
                        ? 'var(--mos-focus-ring, rgba(212, 168, 75, 0.22))'
                        : isDark
                          ? 'rgba(255, 255, 255, 0.03)'
                          : 'rgba(15, 23, 42, 0.025)',
                      border: `1px solid ${reacted ? 'var(--mos-accent, #d4a84b)' : borderColor}`,
                    }}
                  >
                    <MosChatStickerVisual sticker={sticker} size="picker" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
