'use client';

import React, { useState, useMemo } from 'react';
import { Popover, Input, Tooltip, theme } from 'antd';
import { Smile, Check, Search, Hash, Sparkles } from 'lucide-react';
import {
  GOOGLE_CHAT_SPACE_PALETTE,
  GOOGLE_CHAT_SPACE_EMOJI_CATEGORIES,
  isSpaceEmoji,
} from './constants/chat-constants';
import { removeVietnameseTones } from '@mos-lab/shared';

export interface MosChatSpaceEmojiColorPickerProps {
  selectedEmoji?: string;
  selectedColor?: string;
  spaceName?: string;
  onEmojiChange: (emoji: string) => void;
  onColorChange: (color: string) => void;
  size?: 'normal' | 'large';
  disabled?: boolean;
}

export const MosChatSpaceEmojiColorPicker: React.FC<MosChatSpaceEmojiColorPickerProps> = ({
  selectedEmoji = '',
  selectedColor = '#1a73e8',
  spaceName = '',
  onEmojiChange,
  onColorChange,
  size = 'large',
  disabled = false,
}) => {
  const { token } = theme.useToken();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('popular');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customEmojiInput, setCustomEmojiInput] = useState<string>('');

  const filteredCategories = useMemo(() => {
    const q = removeVietnameseTones(searchQuery.trim().toLowerCase());
    if (!q) return GOOGLE_CHAT_SPACE_EMOJI_CATEGORIES;

    return GOOGLE_CHAT_SPACE_EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter((emoji) => emoji.includes(q)),
    })).filter((cat) => cat.emojis.length > 0);
  }, [searchQuery]);

  const handleSelectEmoji = (emoji: string) => {
    onEmojiChange(emoji);
    setPopoverOpen(false);
    setSearchQuery('');
  };

  const handleApplyCustomEmoji = () => {
    const clean = customEmojiInput.trim();
    if (clean) {
      onEmojiChange(clean);
      setCustomEmojiInput('');
      setPopoverOpen(false);
    }
  };

  const handleClearEmoji = () => {
    onEmojiChange('');
    setPopoverOpen(false);
  };

  const emojiPickerContent = (
    <div
      data-no-chat-autofocus="true"
      className="w-80 p-2.5 space-y-3 select-none text-[12px]"
      style={{ color: token.colorText }}
    >
      {/* Header & Quick Clear */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-800">
        <span className="font-extrabold text-[12.5px] flex items-center gap-1.5">
          <Smile size={15} className="text-amber-500" />
          <span>Chọn Emoji đại diện cho Space</span>
        </span>
        {selectedEmoji ? (
          <button
            type="button"
            onClick={handleClearEmoji}
            className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
          >
            Bỏ chọn
          </button>
        ) : null}
      </div>

      {/* Search Input */}
      <Input
        prefix={<Search size={13} className="text-slate-400 mr-1" />}
        placeholder="Tìm emoji hoặc dán emoji..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        allowClear
        size="small"
      />

      {/* Category Tabs */}
      {!searchQuery && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          {GOOGLE_CHAT_SPACE_EMOJI_CATEGORIES.map((cat) => {
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveTab(cat.id)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold shrink-0 flex items-center gap-1 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            Không tìm thấy emoji phù hợp. Bạn có thể tự gõ bên dưới.
          </div>
        ) : (
          (searchQuery
            ? filteredCategories
            : filteredCategories.filter((c) => c.id === activeTab)
          ).map((cat) => (
            <div key={cat.id} className="space-y-1">
              {searchQuery && (
                <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                  {cat.label}
                </div>
              )}
              <div className="grid grid-cols-7 gap-1">
                {cat.emojis.map((emoji) => {
                  const isSelected = selectedEmoji === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSelectEmoji(emoji)}
                      className={`h-9 rounded-lg flex items-center justify-center text-xl transition-all cursor-pointer hover:scale-115 ${
                        isSelected
                          ? 'bg-blue-500/20 ring-2 ring-blue-500 shadow-sm'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Direct Custom Emoji Input */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
        <Input
          placeholder="Nhập emoji bất kỳ (VD: ☕, 🥑, 💅)"
          value={customEmojiInput}
          onChange={(e) => setCustomEmojiInput(e.target.value)}
          onPressEnter={handleApplyCustomEmoji}
          size="small"
          maxLength={8}
          className="flex-1"
        />
        <button
          type="button"
          disabled={!customEmojiInput.trim()}
          onClick={handleApplyCustomEmoji}
          className="px-2.5 py-1 rounded bg-blue-500 text-white text-[11px] font-bold hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          Chọn
        </button>
      </div>
    </div>
  );

  const isLarge = size === 'large';
  const avatarBoxSize = isLarge ? 'w-16 h-16' : 'w-12 h-12';
  const emojiFontSize = isLarge ? 'text-3xl' : 'text-xl';

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80">
      {/* Live Avatar Preview with Popover Trigger */}
      <Popover
        content={emojiPickerContent}
        trigger="click"
        open={popoverOpen}
        onOpenChange={setPopoverOpen}
        placement="bottomLeft"
        arrow={false}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Chọn Emoji đại diện cho Space"
          className={`relative ${avatarBoxSize} rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-all hover:scale-105 active:scale-95 shadow-md group`}
          style={{
            background: `${selectedColor}22`,
            border: `2px solid ${selectedColor}`,
          }}
        >
          {selectedEmoji && isSpaceEmoji(selectedEmoji) ? (
            <span className={`${emojiFontSize} select-none transition-transform group-hover:scale-110`}>
              {selectedEmoji}
            </span>
          ) : (
            <Hash size={isLarge ? 28 : 20} style={{ color: selectedColor }} />
          )}

          {/* Change Icon Badge */}
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white shadow-md"
            style={{ background: selectedColor }}
          >
            <Smile size={11} />
          </div>
        </div>
      </Popover>

      {/* Details & Palette Selector */}
      <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left w-full">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[12px] font-extrabold flex items-center justify-center sm:justify-start gap-1.5" style={{ color: token.colorText }}>
              <span>Biểu tượng & Màu chủ đạo Space</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-500">
                Google Workspace
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {selectedEmoji
                ? `Đã chọn biểu tượng ${selectedEmoji} cho Không gian`
                : 'Bấm vào biểu tượng để chọn Emoji đại diện'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPopoverOpen(true)}
            className="text-[11.5px] font-bold text-blue-500 hover:text-blue-600 hover:underline cursor-pointer shrink-0"
          >
            {selectedEmoji ? 'Đổi Emoji' : '+ Chọn Emoji'}
          </button>
        </div>

        {/* 10-Color Palette Bar */}
        <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap pt-0.5">
          {GOOGLE_CHAT_SPACE_PALETTE.map((pal) => {
            const isSelected = selectedColor.toLowerCase() === pal.color.toLowerCase();
            return (
              <Tooltip key={pal.color} title={pal.name}>
                <button
                  type="button"
                  onClick={() => onColorChange(pal.color)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'scale-115 ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-900 shadow-sm'
                      : 'hover:scale-110 opacity-80 hover:opacity-100'
                  }`}
                  style={{ background: pal.color }}
                  aria-label={`Chọn màu ${pal.name}`}
                >
                  {isSelected && <Check size={12} className="text-white drop-shadow-sm" strokeWidth={3} />}
                </button>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
};
