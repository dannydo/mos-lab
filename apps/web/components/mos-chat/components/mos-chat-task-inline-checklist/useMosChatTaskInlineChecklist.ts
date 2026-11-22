'use client';

import { useMemo, useRef, useState } from 'react';
import type {
  MosChatStaffMember,
  MosChatTaskChecklistItem,
  MosChatTaskItem,
  UpdateMosChatTaskRequest,
} from '@mos-lab/shared';
import { buildAllStaffOptions, buildQuickDeadlineOptions, filterStaffOptions } from './checklistHelpers';
import type { ChecklistStaffOption } from './checklistTypes';

const EMPTY_STAFF_LIST: MosChatStaffMember[] = [];

export interface UseMosChatTaskInlineChecklistParams {
  task: MosChatTaskItem;
  onUpdateTask: (taskId: string, payload: UpdateMosChatTaskRequest) => Promise<unknown> | unknown;
  staffList?: MosChatStaffMember[];
}

export function useMosChatTaskInlineChecklist({
  task,
  onUpdateTask,
  staffList = EMPTY_STAFF_LIST,
}: UseMosChatTaskInlineChecklistParams) {
  const [quickTitle, setQuickTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const isAddingRef = useRef(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [actingItemId, setActingItemId] = useState<string | null>(null);

  // Expand "More / Less" per item
  const [expandedItemIds, setExpandedItemIds] = useState<Record<string, boolean>>({});

  // Inline Edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Popover states for Deadline & Assignee
  const [openDeadlineItemId, setOpenDeadlineItemId] = useState<string | null>(null);
  const [openAssigneeItemId, setOpenAssigneeItemId] = useState<string | null>(null);
  const [staffSearch, setStaffSearch] = useState('');

  const checklist = task.checklist || [];
  const totalCount = checklist.length;
  const doneCount = checklist.filter((c) => c.done).length;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const allStaffOptions = useMemo(
    () => buildAllStaffOptions(staffList, task),
    [staffList, task.assigneeId, task.assigneeName, task.assignerId, task.creatorName]
  );

  const availableStaff = useMemo(
    () => filterStaffOptions(allStaffOptions, staffSearch),
    [allStaffOptions, staffSearch]
  );

  const quickDeadlines = useMemo(() => buildQuickDeadlineOptions(), []);

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItemIds((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleAutoSummarize = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'auto_summarize',
      });
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleToggle = async (itemId: string) => {
    if (actingItemId) return;
    setActingItemId(itemId);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'toggle',
        checklistItemId: itemId,
      });
    } finally {
      setActingItemId(null);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (actingItemId) return;
    setActingItemId(itemId);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'delete',
        checklistItemId: itemId,
      });
    } finally {
      setActingItemId(null);
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
    setActingItemId(itemId);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'edit',
        checklistItemId: itemId,
        checklistItem: { title: trimmed },
      });
      setEditingItemId(null);
    } finally {
      setActingItemId(null);
    }
  };

  const handleSetDeadline = async (itemId: string, deadlineIso: string | null) => {
    setOpenDeadlineItemId(null);
    setActingItemId(itemId);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'edit',
        checklistItemId: itemId,
        checklistItem: { deadline: deadlineIso },
      });
    } finally {
      setActingItemId(null);
    }
  };

  const handleSetAssignee = async (itemId: string, staff: ChecklistStaffOption | null) => {
    setOpenAssigneeItemId(null);
    setStaffSearch('');
    setActingItemId(itemId);
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'edit',
        checklistItemId: itemId,
        checklistItem: staff
          ? {
              assigneeId: staff.id,
              assigneeName: staff.displayName,
              assigneeAvatar: staff.avatarUrl || null,
            }
          : {
              assigneeId: null,
              assigneeName: null,
              assigneeAvatar: null,
            },
      });
    } finally {
      setActingItemId(null);
    }
  };

  const handleAdd = async () => {
    const trimmed = quickTitle.trim();
    if (!trimmed || isAdding || isAddingRef.current) return;
    isAddingRef.current = true;
    setIsAdding(true);
    setQuickTitle('');
    try {
      await onUpdateTask(task.id, {
        checklistAction: 'add',
        checklistItem: { title: trimmed },
      });
    } catch {
      setQuickTitle(trimmed);
    } finally {
      isAddingRef.current = false;
      setIsAdding(false);
    }
  };

  return {
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
  };
}
