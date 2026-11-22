import dayjs from 'dayjs';
import {
  normalizeAndEnrichTaskChecklist,
  resolveBestSourceMessageForTaskChecklist,
  sortChecklistItemsByDeadline,
  summarizeAndExtractChecklistFromText,
  type MosChatConversation,
  type MosChatStaffMember,
  type MosChatTaskItem,
  type SafeAny,
} from '@mos-lab/shared';
import { apiClient } from '../../../lib/api-client';
import { STAFF_DIRECTORY_CACHE_KEY } from '../constants/chat-constants';

/**
 * Fetches fallback staff directory from /api/staff when chat bootstrap hasn't populated it yet.
 */
export function ensureStaffDirectoryLoaded(
  staffDirectoryLen: number,
  fetchBootstrap: (forceFull?: boolean) => Promise<void>,
  setStaffDirectory: React.Dispatch<React.SetStateAction<MosChatStaffMember[]>>
): void {
  if (staffDirectoryLen > 0) return;
  void fetchBootstrap(true);
  apiClient.staff
    .list()
    .then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        const mapped: MosChatStaffMember[] = data.map((s: SafeAny) => ({
          id: s.id,
          username: s.username || s.name || s.displayName || `staff_${s.id}`,
          displayName: s.name || s.displayName || `Staff #${s.id}`,
          role: s.role || 'Staff',
          avatar: s.avatar || undefined,
          department: s.department || undefined,
          userGroupName: s.userGroupName || undefined,
        }));
        setStaffDirectory((prev) => (prev.length === 0 ? mapped : prev));
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(STAFF_DIRECTORY_CACHE_KEY, JSON.stringify(mapped));
          } catch {
            // ignore
          }
        }
      }
    })
    .catch(() => {});
}

/**
 * Computes an optimistic task update with cleaned + auto-summarized checklist items.
 */
export function applyOptimisticAutoSummarizeTask(
  task: MosChatTaskItem,
  conversations: MosChatConversation[],
  activeConversation: MosChatConversation | undefined,
  creatorDisplayName: string
): MosChatTaskItem {
  const targetConv = conversations.find((c) => c.id === task.conversationId) || activeConversation;
  const bestMsg = resolveBestSourceMessageForTaskChecklist(targetConv, { task });
  const cleanedExisting = normalizeAndEnrichTaskChecklist(task.checklist || [], {
    defaultAssigneeId: task.assigneeId ?? null,
    defaultAssigneeName: task.assigneeName ?? null,
    referenceDate: bestMsg?.createdAt || task.createdAt,
  });
  if (!bestMsg) {
    return {
      ...task,
      checklist: cleanedExisting,
    };
  }
  const { summary, suggestions } = summarizeAndExtractChecklistFromText({
    rootText: bestMsg.text,
    rootSenderName: bestMsg.senderName,
    rootSenderId: bestMsg.senderId,
    referenceDate: bestMsg.createdAt || task.createdAt,
    replies: bestMsg.thread || [],
  });
  const mergedChk = [...cleanedExisting];
  for (const sug of suggestions) {
    const exists = mergedChk.some((c) => c.title.trim().toLowerCase() === sug.title.trim().toLowerCase());
    if (!exists) {
      mergedChk.push({
        id: `chk-opt-${Date.now()}-${mergedChk.length}`,
        title: sug.title,
        done: false,
        deadline: sug.deadline || null,
        assigneeId: sug.assigneeId ?? task.assigneeId ?? null,
        assigneeName: sug.assigneeName ?? task.assigneeName ?? null,
        sourceReplyId: sug.sourceReplyId ?? null,
        createdBy: creatorDisplayName,
        createdAt: new Date().toISOString(),
      });
    }
  }
  return {
    ...task,
    summary: summary || task.summary || null,
    checklist: sortChecklistItemsByDeadline(mergedChk),
  };
}

/**
 * Resolves reminder ISO timestamp & remindInSeconds from modal form state.
 */
export function resolveTaskReminderSchedule({
  taskRemindMode,
  selectedPresetId,
  taskRemindSeconds,
  customRemindDate,
}: {
  taskRemindMode: 'preset' | 'custom';
  selectedPresetId: string;
  taskRemindSeconds: number;
  customRemindDate: dayjs.Dayjs | null;
}): { isNoReminder: boolean; remindAtIso: string; remindSecondsToSend: number } {
  const isNoReminder = taskRemindMode === 'preset' && (selectedPresetId === 'none' || taskRemindSeconds <= 0);
  if (taskRemindMode === 'custom' && customRemindDate && customRemindDate.isValid()) {
    const diffSec = customRemindDate.diff(dayjs(), 'second');
    return {
      isNoReminder: false,
      remindAtIso: customRemindDate.toISOString(),
      remindSecondsToSend: Math.max(60, diffSec),
    };
  }
  if (isNoReminder) {
    return {
      isNoReminder: true,
      remindAtIso: new Date().toISOString(),
      remindSecondsToSend: 0,
    };
  }
  return {
    isNoReminder: false,
    remindAtIso: new Date(Date.now() + taskRemindSeconds * 1000).toISOString(),
    remindSecondsToSend: taskRemindSeconds,
  };
}
