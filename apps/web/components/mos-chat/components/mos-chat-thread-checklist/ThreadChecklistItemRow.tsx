'use client';

import React from 'react';
import { Check, ChevronDown, ChevronUp, Loader2, MessageSquare, Pencil, Trash2, X } from 'lucide-react';
import { Input, Tooltip } from 'antd';
import { parseChecklistTitleBadges, type MosChatTaskChecklistItem } from '@mos-lab/shared';
import { ChecklistAssigneePopover } from '../mos-chat-task-inline-checklist/ChecklistAssigneePopover';
import { ChecklistDeadlinePopover } from '../mos-chat-task-inline-checklist/ChecklistDeadlinePopover';
import { formatShortDeadlineLabel, getDomainBadgeClassName } from '../mos-chat-task-inline-checklist/checklistHelpers';
import type {
  ChecklistQuickDeadlineOption,
  ChecklistStaffOption,
} from '../mos-chat-task-inline-checklist/checklistTypes';

export interface ThreadChecklistItemRowProps {
  item: MosChatTaskChecklistItem;
  taskAssigneeName?: string | null;
  isDark: boolean;
  isEditing: boolean;
  isExpanded: boolean;
  isDeleting: boolean;
  isToggling: boolean;
  hasDeletingItem: boolean;
  hasTogglingItem: boolean;
  isAdding: boolean;
  hasEditingItem: boolean;
  editingTitle: string;
  onChangeEditingTitle: (value: string) => void;
  onToggleDone: () => void;
  onToggleExpand: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDelete: () => void;
  quickDeadlines: ChecklistQuickDeadlineOption[];
  isDeadlineOpen: boolean;
  onDeadlineOpenChange: (open: boolean) => void;
  onSetDeadline: (deadlineIso: string | null) => void;
  allStaffOptions: ChecklistStaffOption[];
  availableStaff: ChecklistStaffOption[];
  staffSearch: string;
  onChangeStaffSearch: (value: string) => void;
  isAssigneeOpen: boolean;
  onAssigneeOpenChange: (open: boolean) => void;
  onSetAssignee: (staff: ChecklistStaffOption | null) => void;
  onScrollToReply?: (replyId: string) => void;
}

export const ThreadChecklistItemRow: React.FC<ThreadChecklistItemRowProps> = ({
  item,
  taskAssigneeName,
  isDark,
  isEditing,
  isExpanded,
  isDeleting,
  isToggling,
  hasDeletingItem,
  hasTogglingItem,
  isAdding,
  hasEditingItem,
  editingTitle,
  onChangeEditingTitle,
  onToggleDone,
  onToggleExpand,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  quickDeadlines,
  isDeadlineOpen,
  onDeadlineOpenChange,
  onSetDeadline,
  allStaffOptions,
  availableStaff,
  staffSearch,
  onChangeStaffSearch,
  isAssigneeOpen,
  onAssigneeOpenChange,
  onSetAssignee,
  onScrollToReply,
}) => {
  const parsed = parseChecklistTitleBadges(item.title);
  const displayBody = parsed.cleanTitle || item.title;
  const isLongText = displayBody.length > 52 || item.title.length > 68;
  const deadlineMeta = formatShortDeadlineLabel(item.deadline);
  const effectiveAssigneeName = item.assigneeName || taskAssigneeName || null;
  const matchedStaff = effectiveAssigneeName
    ? allStaffOptions.find((s) => s.displayName.trim().toLowerCase() === effectiveAssigneeName.trim().toLowerCase())
    : null;
  const avatarUrl = item.assigneeAvatar || matchedStaff?.avatarUrl || null;
  const isItemBusy = isDeleting || isToggling;

  return (
    <div
      className={`group/item flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg transition-all text-xs border ${
        isDark ? 'border-white/[0.05]' : 'border-black/[0.04]'
      } ${
        item.done
          ? 'bg-emerald-500/5 text-slate-400 dark:text-slate-500'
          : 'bg-white/40 dark:bg-slate-800/40 hover:bg-white/70 dark:hover:bg-slate-800/70 text-slate-800 dark:text-slate-200'
      } ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        {/* Circular Checkbox */}
        <button
          type="button"
          disabled={isItemBusy || hasDeletingItem}
          onClick={onToggleDone}
          aria-label={isToggling ? `Đang cập nhật ${item.title}` : `Đánh dấu ${item.title}`}
          className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            item.done
              ? 'bg-emerald-500 text-white'
              : 'border border-slate-400 dark:border-slate-500 hover:border-emerald-500 text-transparent hover:text-emerald-500'
          } ${isToggling ? 'opacity-80 cursor-wait' : ''} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isToggling ? (
            <Loader2 size={10} className="animate-spin text-amber-500" />
          ) : (
            <Check size={10} strokeWidth={item.done ? 3 : 2} />
          )}
        </button>

        {isEditing ? (
          <div className="flex-1 min-w-0 flex items-start gap-1">
            <Input.TextArea
              autoFocus
              autoSize={{ minRows: 1, maxRows: 4 }}
              value={editingTitle}
              onChange={(e) => onChangeEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation?.();
                  onCancelEdit();
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  if (e.nativeEvent.isComposing || (e as any).keyCode === 229) return;
                  e.preventDefault();
                  e.stopPropagation();
                  onSaveEdit();
                }
              }}
              className={`text-xs flex-1 rounded-md ${isDark ? 'bg-slate-900/90' : 'bg-white'}`}
            />
            <div className="flex items-center gap-1 shrink-0 pt-0.5">
              <Tooltip title="Lưu (Enter)">
                <button
                  type="button"
                  aria-label="Lưu (Enter)"
                  onClick={onSaveEdit}
                  className="w-6 h-6 rounded inline-flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer transition-colors"
                >
                  <Check size={12} />
                </button>
              </Tooltip>
              <Tooltip title="Huỷ (Esc)">
                <button
                  type="button"
                  aria-label="Huỷ (Esc)"
                  onClick={onCancelEdit}
                  className="w-6 h-6 rounded inline-flex items-center justify-center bg-slate-500/15 hover:bg-slate-500/25 text-slate-400 cursor-pointer transition-colors"
                >
                  <X size={12} />
                </button>
              </Tooltip>
            </div>
          </div>
        ) : (
          <div
            className={`flex-1 min-w-0 select-text ${isLongText ? 'cursor-pointer' : 'cursor-text'}`}
            onClick={() => {
              if (isLongText) {
                onToggleExpand();
              }
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            title={
              isLongText
                ? isExpanded
                  ? 'Bấm để thu gọn 1 dòng · Nhấp đúp để sửa'
                  : `${displayBody} (Bấm để mở rộng · Nhấp đúp để sửa)`
                : 'Nhấp đúp để chỉnh sửa nội dung'
            }
          >
            <div
              className={`font-medium leading-snug ${
                !isExpanded ? 'truncate' : 'whitespace-normal break-words'
              } ${item.done ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}
            >
              {parsed.domainBadge && (
                <span
                  className={`inline-flex items-center justify-center px-1.5 py-0.5 mr-1.5 rounded text-[9.5px] font-extrabold leading-none align-middle ${getDomainBadgeClassName(
                    parsed.domainBadge,
                    isDark
                  )}`}
                >
                  {parsed.domainBadge}
                </span>
              )}
              {parsed.timeframeBadge && (
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 mr-1.5 rounded text-[9.5px] font-semibold leading-none align-middle bg-slate-500/15 text-slate-500 dark:text-slate-300 border border-slate-500/20">
                  {parsed.timeframeBadge}
                </span>
              )}
              <span>{displayBody}</span>
            </div>
          </div>
        )}
      </div>

      {!isEditing && (
        <div className="flex items-center gap-1 shrink-0 pt-0.5">
          {isLongText && (
            <Tooltip title={isExpanded ? 'Thu gọn 1 dòng' : 'Xem toàn bộ nội dung'}>
              <button
                type="button"
                aria-label={isExpanded ? 'Thu gọn' : 'Xem thêm'}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className={`p-1 rounded cursor-pointer transition-colors shrink-0 ${
                  isExpanded
                    ? 'text-amber-500 bg-amber-500/15 hover:bg-amber-500/25'
                    : 'text-amber-500/80 hover:text-amber-500 hover:bg-amber-500/10'
                }`}
              >
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </Tooltip>
          )}

          {/* Per-Item Deadline Picker Popover */}
          <ChecklistDeadlinePopover
            item={item}
            deadlineMeta={deadlineMeta}
            quickDeadlines={quickDeadlines}
            isOpen={isDeadlineOpen}
            onOpenChange={onDeadlineOpenChange}
            onSelectDeadline={onSetDeadline}
          />

          {/* Avatar-Only Assignee Picker (20px circular avatar) */}
          <ChecklistAssigneePopover
            item={item}
            effectiveAssigneeName={effectiveAssigneeName}
            avatarUrl={avatarUrl}
            availableStaff={availableStaff}
            staffSearch={staffSearch}
            onChangeStaffSearch={onChangeStaffSearch}
            isOpen={isAssigneeOpen}
            onOpenChange={onAssigneeOpenChange}
            onSelectAssignee={onSetAssignee}
          />

          {/* Source reply jump button */}
          {item.sourceReplyId && (
            <Tooltip title="Cuộn tới tin nhắn thảo luận gốc trong luồng">
              <button
                type="button"
                aria-label="Cuộn tới tin nhắn thảo luận gốc"
                onClick={() => onScrollToReply && onScrollToReply(item.sourceReplyId!)}
                className="p-1 rounded text-amber-500 hover:bg-amber-500/15 cursor-pointer transition-colors"
              >
                <MessageSquare size={11} />
              </button>
            </Tooltip>
          )}

          {/* Edit button */}
          <Tooltip title="Sửa nội dung mục này">
            <button
              type="button"
              disabled={Boolean(isItemBusy || hasDeletingItem || hasTogglingItem)}
              onClick={onStartEdit}
              aria-label={`Sửa mục ${item.title}`}
              className="opacity-75 hover:opacity-100 p-1 rounded text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Pencil size={11} />
            </button>
          </Tooltip>

          {/* Delete button */}
          <Tooltip title={isDeleting ? 'Đang xóa...' : 'Xóa mục việc này'}>
            <button
              type="button"
              disabled={Boolean(isItemBusy || hasDeletingItem || hasTogglingItem || isAdding || hasEditingItem)}
              onClick={onDelete}
              aria-label={isDeleting ? `Đang xóa ${item.title}` : `Xóa mục ${item.title}`}
              className={`p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors ${
                isDeleting ? 'text-rose-500 cursor-wait' : ''
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {isDeleting ? <Loader2 size={11} className="animate-spin text-rose-500" /> : <Trash2 size={11} />}
            </button>
          </Tooltip>
        </div>
      )}
    </div>
  );
};
