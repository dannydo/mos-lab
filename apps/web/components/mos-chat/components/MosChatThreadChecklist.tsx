'use client';

import React from 'react';
import { ThreadChecklistAiExtractModal } from './mos-chat-thread-checklist/ThreadChecklistAiExtractModal';
import { ThreadChecklistHeader } from './mos-chat-thread-checklist/ThreadChecklistHeader';
import { ThreadChecklistHistoryModal } from './mos-chat-thread-checklist/ThreadChecklistHistoryModal';
import { ThreadChecklistItemRow } from './mos-chat-thread-checklist/ThreadChecklistItemRow';
import { ThreadChecklistQuickAddRow } from './mos-chat-thread-checklist/ThreadChecklistQuickAddRow';
import type { MosChatThreadChecklistProps } from './mos-chat-thread-checklist/threadChecklistTypes';
import { useMosChatThreadChecklist } from './mos-chat-thread-checklist/useMosChatThreadChecklist';

export type { MosChatThreadChecklistProps };

export const MosChatThreadChecklist: React.FC<MosChatThreadChecklistProps> = ({
  task,
  activeThreadMessage,
  onToggleChecklistItem,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onUpdateTask,
  onScrollToReply,
  staffList = [],
  isDark,
}) => {
  const {
    collapsed,
    toggleCollapsed,
    quickTitle,
    setQuickTitle,
    isAdding,
    expandedItemIds,
    toggleItemExpanded,
    editingItemId,
    editingTitle,
    setEditingTitle,
    deletingItemId,
    togglingItemId,
    openDeadlineItemId,
    setOpenDeadlineItemId,
    openAssigneeItemId,
    setOpenAssigneeItemId,
    staffSearch,
    setStaffSearch,
    isAiExtracting,
    aiModalOpen,
    setAiModalOpen,
    aiSuggestions,
    historyModalOpen,
    setHistoryModalOpen,
    checklist,
    activityLog,
    totalCount,
    doneCount,
    percent,
    quickDeadlines,
    allStaffOptions,
    availableStaff,
    handleQuickAdd,
    handleDeleteItem,
    handleToggleItem,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleSetDeadline,
    handleSetAssignee,
    handleOpenAiExtract,
    handleApplyAiSuggestions,
    handleToggleSuggestionSelected,
    handleUpdateSuggestionTitle,
    handleAutoSummarize,
  } = useMosChatThreadChecklist({
    task,
    activeThreadMessage,
    onToggleChecklistItem,
    onAddChecklistItem,
    onDeleteChecklistItem,
    onUpdateTask,
    staffList,
  });

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`rounded-xl border transition-all overflow-hidden mb-3 ${
        isDark ? 'bg-slate-800/45 border-white/[0.08]' : 'bg-slate-50/95 border-black/[0.08]'
      }`}
    >
      <ThreadChecklistHeader
        isDark={isDark}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        summary={task.summary}
        totalCount={totalCount}
        doneCount={doneCount}
        percent={percent}
        activityLogCount={activityLog.length}
        isAiExtracting={isAiExtracting}
        onAutoSummarize={handleAutoSummarize}
        onOpenAiExtract={() => void handleOpenAiExtract()}
        onOpenHistory={() => setHistoryModalOpen(true)}
      />

      {/* Checklist items list */}
      {!collapsed && (
        <div className="p-2 space-y-1.5">
          {checklist.length === 0 ? (
            <div className="py-2.5 text-center text-xs text-slate-400 dark:text-slate-500 italic">
              Chưa có mục checklist nào. Bấm &quot;+ Checklist&quot; từ phản hồi bên dưới hoặc nhập đầu việc mới.
            </div>
          ) : (
            checklist.map((item) => (
              <ThreadChecklistItemRow
                key={item.id}
                item={item}
                taskAssigneeName={task.assigneeName}
                isDark={isDark}
                isEditing={editingItemId === item.id}
                isExpanded={Boolean(expandedItemIds[item.id])}
                isDeleting={deletingItemId === item.id}
                isToggling={togglingItemId === item.id}
                hasDeletingItem={Boolean(deletingItemId)}
                hasTogglingItem={Boolean(togglingItemId)}
                isAdding={isAdding}
                hasEditingItem={Boolean(editingItemId)}
                editingTitle={editingTitle}
                onChangeEditingTitle={setEditingTitle}
                onToggleDone={() => void handleToggleItem(item.id)}
                onToggleExpand={() => toggleItemExpanded(item.id)}
                onStartEdit={() => handleStartEdit(item)}
                onCancelEdit={handleCancelEdit}
                onSaveEdit={() => void handleSaveEdit(item.id)}
                onDelete={() => void handleDeleteItem(item.id)}
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

          <ThreadChecklistQuickAddRow
            isDark={isDark}
            quickTitle={quickTitle}
            isAdding={isAdding}
            onChangeQuickTitle={setQuickTitle}
            onAdd={() => void handleQuickAdd()}
          />
        </div>
      )}

      <ThreadChecklistAiExtractModal
        open={aiModalOpen}
        isDark={isDark}
        suggestions={aiSuggestions}
        onClose={() => setAiModalOpen(false)}
        onApply={() => void handleApplyAiSuggestions()}
        onToggleSuggestion={handleToggleSuggestionSelected}
        onUpdateSuggestionTitle={handleUpdateSuggestionTitle}
      />

      <ThreadChecklistHistoryModal
        open={historyModalOpen}
        isDark={isDark}
        activityLog={activityLog}
        onClose={() => setHistoryModalOpen(false)}
      />
    </div>
  );
};
