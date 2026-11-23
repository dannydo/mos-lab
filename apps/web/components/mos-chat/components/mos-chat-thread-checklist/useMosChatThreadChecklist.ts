'use client';

import { useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import type {
  MosChatMessage,
  MosChatStaffMember,
  MosChatTaskChecklistItem,
  MosChatTaskItem,
  UpdateMosChatTaskRequest,
} from '@mos-lab/shared';
import { apiClient } from '../../../../lib/api-client';
import {
  buildAllStaffOptions,
  buildQuickDeadlineOptions,
  filterStaffOptions,
} from '../mos-chat-task-inline-checklist/checklistHelpers';
import type { ChecklistStaffOption } from '../mos-chat-task-inline-checklist/checklistTypes';
import type { ThreadChecklistAiSuggestion } from './threadChecklistTypes';

const EMPTY_STAFF_LIST: MosChatStaffMember[] = [];

export interface UseMosChatThreadChecklistParams {
  task: MosChatTaskItem;
  activeThreadMessage: MosChatMessage;
  onToggleChecklistItem: (checklistItemId: string) => Promise<void> | void;
  onAddChecklistItem: (title: string, sourceReplyId?: string | null) => Promise<void> | void;
  onDeleteChecklistItem: (checklistItemId: string) => Promise<unknown> | unknown;
  onUpdateTask?: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<unknown> | unknown;
  staffList?: MosChatStaffMember[];
}

export function useMosChatThreadChecklist({
  task,
  activeThreadMessage,
  onToggleChecklistItem,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onUpdateTask,
  staffList = EMPTY_STAFF_LIST,
}: UseMosChatThreadChecklistParams) {
  const [collapsed, setCollapsed] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const isAddingRef = useRef(false);

  // Expand "Xem thêm / Thu gọn" per item
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  // Inline Edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Item Action Loading states (prevent double-clicks & show loading spinner)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  // Popover states for Deadline & Assignee
  const [openDeadlineItemId, setOpenDeadlineItemId] = useState<string | null>(null);
  const [openAssigneeItemId, setOpenAssigneeItemId] = useState<string | null>(null);
  const [staffSearch, setStaffSearch] = useState('');

  // AI Extraction state
  const [isAiExtracting, setIsAiExtracting] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<ThreadChecklistAiSuggestion[]>([]);

  // Activity Log Modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const checklist = useMemo(() => task.checklist || [], [task]);
  const activityLog = useMemo(() => task.activityLog || [], [task]);

  const totalCount = checklist.length;
  const doneCount = useMemo(() => checklist.filter((c) => c.done).length, [checklist]);
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const quickDeadlines = useMemo(() => buildQuickDeadlineOptions(), []);
  const allStaffOptions = useMemo(() => buildAllStaffOptions(staffList, task), [staffList, task]);
  const availableStaff = useMemo(
    () => filterStaffOptions(allStaffOptions, staffSearch),
    [allStaffOptions, staffSearch]
  );

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleQuickAdd = async () => {
    const trimmed = quickTitle.trim();
    if (!trimmed || isAdding || isAddingRef.current) return;
    isAddingRef.current = true;
    setIsAdding(true);
    setQuickTitle('');
    try {
      await onAddChecklistItem(trimmed, null);
    } catch (err: any) {
      setQuickTitle(trimmed);
      message.error(err?.message || 'Không thể thêm mục checklist');
    } finally {
      isAddingRef.current = false;
      setIsAdding(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (deletingItemId) return;
    setDeletingItemId(itemId);
    try {
      await onDeleteChecklistItem(itemId);
    } catch (err: any) {
      message.error(err?.message || 'Không thể xóa mục việc, vui lòng thử lại');
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleToggleItem = async (itemId: string) => {
    if (togglingItemId) return;
    setTogglingItemId(itemId);
    try {
      await onToggleChecklistItem(itemId);
    } catch (err: any) {
      message.error(err?.message || 'Không thể cập nhật trạng thái mục việc');
    } finally {
      setTogglingItemId(null);
    }
  };

  const handleEditChecklistItem = async (itemId: string, checklistItemPatch: Partial<MosChatTaskChecklistItem>) => {
    try {
      if (onUpdateTask) {
        await onUpdateTask(task.id, {
          checklistAction: 'edit',
          checklistItemId: itemId,
          checklistItem: checklistItemPatch,
        });
      } else {
        await apiClient.chat.updateTask(task.id, {
          checklistAction: 'edit',
          checklistItemId: itemId,
          checklistItem: checklistItemPatch,
        });
      }
    } catch (err: any) {
      message.error(err?.message || 'Không thể cập nhật mục checklist');
    }
  };

  const handleStartEdit = (item: MosChatTaskChecklistItem) => {
    setEditingItemId(item.id);
    setEditingTitle(item.title);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
  };

  const handleSaveEdit = async (itemId: string) => {
    const trimmed = editingTitle.trim();
    if (!trimmed) {
      setEditingItemId(null);
      return;
    }
    await handleEditChecklistItem(itemId, { title: trimmed });
    setEditingItemId(null);
  };

  const handleSetDeadline = async (itemId: string, deadlineIso: string | null) => {
    setOpenDeadlineItemId(null);
    await handleEditChecklistItem(itemId, { deadline: deadlineIso });
  };

  const handleSetAssignee = async (itemId: string, staff: ChecklistStaffOption | null) => {
    setOpenAssigneeItemId(null);
    setStaffSearch('');
    await handleEditChecklistItem(
      itemId,
      staff
        ? {
            assigneeId: staff.id,
            assigneeName: staff.displayName,
            assigneeAvatar: staff.avatarUrl || null,
          }
        : {
            assigneeId: null,
            assigneeName: null,
            assigneeAvatar: null,
          }
    );
  };

  const handleOpenAiExtract = async () => {
    setIsAiExtracting(true);
    try {
      const res = await apiClient.chat.extractChecklist(activeThreadMessage.id, {
        conversationId: activeThreadMessage.conversationId,
        taskId: task.id,
      });
      if (res?.suggestions && res.suggestions.length > 0) {
        setAiSuggestions(
          res.suggestions.map((s) => ({
            title: s.title,
            deadline: s.deadline || null,
            assigneeName: s.assigneeName || task.assigneeName || undefined,
            sourceReplyId: s.sourceReplyId || undefined,
            selected: true,
          }))
        );
        setAiModalOpen(true);
      } else {
        message.info('Không tìm thấy đầu việc mới nào cần trích xuất từ cuộc thảo luận.');
      }
    } catch (err: any) {
      message.error('Không thể trích xuất checklist từ AI: ' + (err?.message || 'Lỗi kết nối'));
    } finally {
      setIsAiExtracting(false);
    }
  };

  const handleApplyAiSuggestions = async () => {
    const selected = aiSuggestions.filter((s) => s.selected && s.title.trim());
    if (selected.length === 0) {
      setAiModalOpen(false);
      return;
    }
    if (onUpdateTask) {
      await onUpdateTask(task.id, {
        checklistAction: 'auto_summarize',
      });
    } else {
      for (const item of selected) {
        await onAddChecklistItem(item.title, item.sourceReplyId || null);
      }
    }
    message.success(`Đã thêm ${selected.length} mục vào checklist!`);
    setAiModalOpen(false);
  };

  const handleToggleSuggestionSelected = (index: number, selected: boolean) => {
    setAiSuggestions((prev) => prev.map((sug, idx) => (idx === index ? { ...sug, selected } : sug)));
  };

  const handleUpdateSuggestionTitle = (index: number, title: string) => {
    setAiSuggestions((prev) => prev.map((sug, idx) => (idx === index ? { ...sug, title } : sug)));
  };

  const handleAutoSummarize = onUpdateTask
    ? () => {
        void onUpdateTask(task.id, { checklistAction: 'auto_summarize' });
      }
    : undefined;

  return {
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
  };
}
