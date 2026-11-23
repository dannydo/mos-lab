'use client';

import React from 'react';
import { Input } from 'antd';
import { Bookmark, Check, Hash, Pin, Search, UserPlus, Users, X } from 'lucide-react';
import type { MosChatConversation, MosChatStaffMember } from '@mos-lab/shared';
import { MosChatAvatar } from '../../MosChatAvatar';
import { resolveSpaceBadgeBgClass } from './forwardModalHelpers';
import type { ForwardTargetGroup, ForwardTargetOption } from './forwardModalTypes';

export interface ForwardTargetPickerSectionProps {
  isDark: boolean;
  note: string;
  onChangeNote: (value: string) => void;
  searchQuery: string;
  onChangeSearchQuery: (value: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  selectedKeys: string[];
  optionByKey: Map<string, ForwardTargetOption>;
  groupedTargets: ForwardTargetGroup[];
  onToggleSelectKey: (key: string) => void;
  sourceConversation?: MosChatConversation | null;
  staffDirectory: MosChatStaffMember[];
}

export const ForwardTargetPickerSection: React.FC<ForwardTargetPickerSectionProps> = ({
  isDark,
  note,
  onChangeNote,
  searchQuery,
  onChangeSearchQuery,
  searchInputRef,
  selectedKeys,
  optionByKey,
  groupedTargets,
  onToggleSelectKey,
  sourceConversation,
  staffDirectory,
}) => {
  const mutedTextClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const primaryTextClass = isDark ? 'text-slate-100' : 'text-slate-900';
  const surfaceControlClass = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-slate-50 border-slate-200';

  return (
    <>
      <div>
        <Input.TextArea
          value={note}
          onChange={(e) => onChangeNote(e.target.value)}
          placeholder="Thêm lời nhắn đi kèm (tùy chọn, hỗ trợ @mention)..."
          autoSize={{ minRows: 1, maxRows: 3 }}
          maxLength={1000}
          className={`rounded-[10px] text-[12.5px] transition-colors ${
            isDark
              ? 'bg-zinc-900 border-zinc-800 text-slate-100 placeholder:text-slate-400 hover:border-amber-500/60 focus:border-amber-500'
              : 'bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 hover:border-amber-500/60 focus:border-amber-500'
          }`}
        />
      </div>

      {selectedKeys.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {selectedKeys.map((key) => {
            const opt = optionByKey.get(key);
            if (!opt) return null;
            return (
              <span
                key={key}
                className={`inline-flex items-center gap-1 leading-none px-2 py-1 rounded-full text-[11.5px] font-semibold border ${
                  isDark
                    ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
                    : 'bg-amber-600/10 border-amber-600/30 text-amber-700'
                }`}
              >
                <span className="truncate max-w-[150px]">{opt.label}</span>
                <button
                  type="button"
                  aria-label={`Bỏ chọn ${opt.label}`}
                  onClick={() => onToggleSelectKey(key)}
                  className="hover:opacity-75 cursor-pointer inline-flex items-center"
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${surfaceControlClass}`}>
        <Search size={14} className={`shrink-0 ${mutedTextClass}`} />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onChangeSearchQuery(e.target.value)}
          placeholder="Tìm tên Space, DM hoặc tên đồng nghiệp..."
          aria-label="Tìm nơi nhận chuyển tiếp"
          className={`w-full bg-transparent border-none outline-none text-[13px] ${primaryTextClass}`}
        />
        {searchQuery && (
          <button
            type="button"
            aria-label="Xóa từ khóa tìm kiếm"
            onClick={() => onChangeSearchQuery('')}
            className={`p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer ${mutedTextClass}`}
          >
            <X size={13} />
          </button>
        )}
      </div>

      <div className="max-h-[260px] overflow-y-auto overscroll-contain space-y-2.5 pr-1">
        {groupedTargets.length === 0 ? (
          <div className={`py-8 text-center text-[12.5px] ${mutedTextClass}`}>
            Không tìm thấy phòng chat hoặc nhân sự phù hợp.
          </div>
        ) : (
          groupedTargets.map((group) => (
            <div key={group.id}>
              <div
                className={`text-[10.5px] font-bold uppercase tracking-wider px-1 mb-1 flex items-center gap-1 ${mutedTextClass}`}
              >
                {group.id === 'self' && <Bookmark size={11} />}
                {group.id === 'pinned' && <Pin size={11} />}
                {group.id === 'spaces' && <Hash size={11} />}
                {group.id === 'dms' && <Users size={11} />}
                <span>{group.title}</span>
              </div>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isSelected = selectedKeys.includes(item.key);
                  const isSourceSame =
                    item.kind === 'conv' && sourceConversation && item.conversationId === sourceConversation.id;
                  const spaceBgClass = item.badgeBgClass || resolveSpaceBadgeBgClass(item.color, item.label);

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => onToggleSelectKey(item.key)}
                      className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-left cursor-pointer transition-colors border ${
                        isSelected
                          ? isDark
                            ? 'bg-amber-500/15 border-amber-500/40'
                            : 'bg-amber-600/10 border-amber-600/35'
                          : 'bg-transparent border-transparent hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {item.type === 'space' ? (
                          <div
                            className={`w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 text-white font-bold text-xs ${spaceBgClass}`}
                          >
                            <Hash size={14} />
                          </div>
                        ) : item.type === 'self' ? (
                          <div className="w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 text-white bg-indigo-500">
                            <Bookmark size={14} />
                          </div>
                        ) : (
                          <MosChatAvatar
                            size="sm"
                            src={item.avatar}
                            name={item.label}
                            staffId={item.staffId}
                            staffDirectory={staffDirectory}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[13px] font-semibold truncate ${primaryTextClass}`}>
                              {item.label}
                            </span>
                            {item.type === 'new_dm' && (
                              <span
                                className={`inline-flex items-center justify-center gap-0.5 leading-none px-1.5 py-0.5 rounded-full text-[9.5px] font-bold shrink-0 ${
                                  isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/12 text-emerald-600'
                                }`}
                              >
                                <UserPlus size={9} />
                                <span>Tạo DM mới</span>
                              </span>
                            )}
                            {isSourceSame && (
                              <span
                                className={`inline-flex items-center justify-center leading-none px-1.5 py-0.5 rounded text-[9.5px] font-semibold shrink-0 ${
                                  isDark ? 'bg-white/10 text-slate-400' : 'bg-slate-900/5 text-slate-500'
                                }`}
                              >
                                Phòng hiện tại
                              </span>
                            )}
                          </div>
                          {item.subtitle && (
                            <p className={`text-[11px] m-0 truncate ${mutedTextClass}`}>{item.subtitle}</p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`w-5 h-5 rounded-md inline-flex items-center justify-center shrink-0 transition-colors border-[1.5px] ${
                          isSelected
                            ? 'bg-amber-500 border-amber-500 text-slate-900'
                            : isDark
                              ? 'bg-transparent border-zinc-800 text-slate-900'
                              : 'bg-transparent border-slate-200 text-slate-900'
                        }`}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};
