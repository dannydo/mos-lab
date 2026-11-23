'use client';

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { ChecklistHeaderAndSummary } from './mos-chat-task-inline-checklist/ChecklistHeaderAndSummary';
import { ChecklistItemRow } from './mos-chat-task-inline-checklist/ChecklistItemRow';
import { ChecklistQuickAddRow } from './mos-chat-task-inline-checklist/ChecklistQuickAddRow';
import type { MosChatTaskInlineChecklistProps } from './mos-chat-task-inline-checklist/checklistTypes';
import { useMosChatTaskInlineChecklist } from './mos-chat-task-inline-checklist/useMosChatTaskInlineChecklist';

export type { MosChatTaskInlineChecklistProps };
export {
  buildQuickDeadlineOptions,
  formatShortDeadlineLabel,
  getDomainBadgeStyle,
  getStaffAvatarColor,
  getStaffInitials,
} from './mos-chat-task-inline-checklist/checklistHelpers';

export const MosChatTaskInlineChecklist: React.FC<MosChatTaskInlineChecklistProps> = ({
  task,
  onUpdateTask,
  isDark,
  staffList = [],
  onScrollToReply,
}) => {
  const {
    quickTitle,
    setQuickTitle,
    isAdding,
    isSummarizing,
    actingItemId,
    expandedItemIds,
    editingItemId,
    editingTitle,
    setEditingTitle,
    openDeadlineItemId,
    setOpenDeadlineItemId,
    openAssigneeItemId,
    setOpenAssigneeItemId,
    staffSearch,
    setStaffSearch,
    checklist,
    totalCount,
    doneCount,
    percent,
    allStaffOptions,
    availableStaff,
    quickDeadlines,
    toggleItemExpanded,
    handleAutoSummarize,
    handleToggle,
    handleDelete,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleSetDeadline,
    handleSetAssignee,
    handleAdd,
  } = useMosChatTaskInlineChecklist({
    task,
    onUpdateTask,
    staffList,
  });

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`mt-2 rounded-xl p-2.5 space-y-2 text-left transition-all border ${
        isDark ? 'bg-slate-900/65 border-white/10' : 'bg-slate-50/95 border-black/[0.08]'
      }`}
    >
      <ChecklistHeaderAndSummary
        isDark={isDark}
        summary={task.summary}
        totalCount={totalCount}
        doneCount={doneCount}
        percent={percent}
        isSummarizing={isSummarizing}
        onAutoSummarize={() => void handleAutoSummarize()}
      />

      {/* Checklist Items */}
      <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-0.5">
        {checklist.length === 0 ? (
          <div className="py-2 text-center space-y-1.5">
            <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">
              Chưa có đầu việc nào. Nhập mục việc bên dưới để bắt đầu.
            </div>
            <div>
              <button
                type="button"
                disabled={isSummarizing}
                onClick={() => void handleAutoSummarize()}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all bg-purple-500/15 hover:bg-purple-500/25 text-purple-600 dark:text-purple-300 border border-purple-500/30 disabled:opacity-50"
              >
                {isSummarizing ? (
                  <Loader2 size={11} className="animate-spin shrink-0" />
                ) : (
                  <Sparkles size={11} className="shrink-0" />
                )}
                <span>✨ Đọc công việc của {task.assigneeName || 'nhân sự'} & Tự động thêm Checklist</span>
              </button>
            </div>
          </div>
        ) : (
          checklist.map((item) => (
            <ChecklistItemRow
              key={item.id}
              item={item}
              taskAssigneeName={task.assigneeName}
              isDark={isDark}
              isItemActing={actingItemId === item.id}
              isEditing={editingItemId === item.id}
              isAnyEditingOrBusy={Boolean(actingItemId || isSummarizing || editingItemId)}
              isExpanded={Boolean(expandedItemIds[item.id])}
              editingTitle={editingTitle}
              onChangeEditingTitle={setEditingTitle}
              onToggleDone={() => void handleToggle(item.id)}
              onToggleExpand={() => toggleItemExpanded(item.id)}
              onStartEdit={() => handleStartEdit(item)}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={() => void handleSaveEdit(item.id)}
              onDelete={() => void handleDelete(item.id)}
              quickDeadlines={quickDeadlines}
              isDeadlineOpen={openDeadlineItemId === item.id}
              onDeadlineOpenChange={(open) => setOpenDeadlineItemId(open ? item.id : null)}
              onSetDeadline={(deadlineIso) => void handleSetDeadline(item.id, deadlineIso)}
              allStaffOptions={allStaffOptions}
              availableStaff={availableStaff}
              staffSearch={staffSearch}
              onChangeStaffSearch={setStaffSearch}
              isAssigneeOpen={openAssigneeItemId === item.id}
              onAssigneeOpenChange={(open) => {
                setOpenAssigneeItemId(open ? item.id : null);
                if (!open) setStaffSearch('');
              }}
              onSetAssignee={(staff) => void handleSetAssignee(item.id, staff)}
              onScrollToReply={onScrollToReply}
            />
          ))
        )}
      </div>

      <ChecklistQuickAddRow
        isDark={isDark}
        quickTitle={quickTitle}
        isAdding={isAdding}
        onChangeQuickTitle={setQuickTitle}
        onAdd={() => void handleAdd()}
      />
    </div>
  );
};
