import dayjs from 'dayjs';
import type { MosChatConversation, MosChatStaffMember, MosChatTaskItem, SafeAny } from '@mos-lab/shared';

export function computeUniqueTasks(tasks: MosChatTaskItem[]): MosChatTaskItem[] {
  const out: MosChatTaskItem[] = [];
  const byId = new Map<string, MosChatTaskItem>();
  const byMsgKey = new Map<string, MosChatTaskItem>();
  const byTitleKey = new Map<string, MosChatTaskItem>();
  const byMissionKey = new Map<string, MosChatTaskItem>();

  for (const raw of tasks) {
    if (!raw || !raw.id || !String(raw.title || '').trim()) continue;
    if (String(raw.id).startsWith('task-seed-')) continue;
    const missionIdNum = raw.missionId && Number(raw.missionId) > 0 ? Number(raw.missionId) : 0;
    if (
      !missionIdNum &&
      (String(raw.assigneeName || '').includes('Hà My') || String(raw.sourceAuthorName || '').includes('Hà My'))
    ) {
      continue;
    }

    const convId = String(raw.conversationId || '').trim();
    const msgId = raw.sourceMessageId ? String(raw.sourceMessageId).trim() : '';
    const normTitle = String(raw.title || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');

    const msgKey = convId && msgId ? `${convId}::msg::${msgId}` : '';
    const titleKey = convId && normTitle ? `${convId}::title::${normTitle}` : '';
    const mKey = missionIdNum > 0 ? `mission::${missionIdNum}` : '';

    const existing =
      byId.get(raw.id) ||
      (msgKey ? byMsgKey.get(msgKey) : undefined) ||
      (mKey ? byMissionKey.get(mKey) : undefined) ||
      (titleKey ? byTitleKey.get(titleKey) : undefined);

    if (existing) {
      if (!existing.missionId && missionIdNum > 0) {
        existing.missionId = missionIdNum;
        existing.missionKey = raw.missionKey || existing.missionKey;
        existing.mission = raw.mission || existing.mission;
        if (mKey) byMissionKey.set(mKey, existing);
      } else if (!existing.mission && raw.mission) {
        existing.mission = raw.mission;
      }
      if (!existing.sourceMessageId && msgId) {
        existing.sourceMessageId = msgId;
        if (msgKey) byMsgKey.set(msgKey, existing);
      }
      if (
        String(existing.assigneeName || '').includes('Hà My') &&
        raw.assigneeName &&
        !String(raw.assigneeName).includes('Hà My')
      ) {
        existing.assigneeName = raw.assigneeName;
        existing.assigneeId = raw.assigneeId ?? existing.assigneeId;
      }
      if (raw.archived !== undefined) {
        existing.archived = raw.archived;
        existing.archivedAt = raw.archivedAt ?? existing.archivedAt;
      }
      continue;
    }

    const cloned: MosChatTaskItem = { ...raw };
    if (String(cloned.assigneeName || '').includes('Hà My')) {
      cloned.assigneeName = cloned.creatorName || 'Chưa phân công';
      cloned.assigneeId = undefined;
    }
    out.push(cloned);
    byId.set(cloned.id, cloned);
    if (msgKey) byMsgKey.set(msgKey, cloned);
    if (titleKey) byTitleKey.set(titleKey, cloned);
    if (mKey) byMissionKey.set(mKey, cloned);
  }
  return out;
}

export function isTaskAssignedToUser(
  t: MosChatTaskItem,
  currentUser: SafeAny,
  currentUserStaffMember?: MosChatStaffMember
): boolean {
  if (!t) return false;
  const myId = currentUser?.id ? String(currentUser.id) : null;
  const myStaffId = currentUserStaffMember?.id ? String(currentUserStaffMember.id) : null;
  const myName = (currentUser?.displayName || '').trim().toLowerCase();
  const myUsername = (currentUser?.username || '').trim().toLowerCase();

  if (t.assigneeId != null) {
    const aid = String(t.assigneeId);
    if (aid === myId || aid === myStaffId) return true;
  }
  const aName = (t.assigneeName || '').trim().toLowerCase();
  if (aName) {
    if (myName && (aName === myName || aName.includes(myName) || myName.includes(aName))) return true;
    if (myUsername && (aName === myUsername || aName.includes(myUsername))) return true;
  }
  return false;
}

export function computeTaskCounts(
  uniqueTasks: MosChatTaskItem[],
  isMyTaskFn: (t: MosChatTaskItem) => boolean,
  activeConversation?: MosChatConversation
) {
  let active = 0;
  let done = 0;
  let archived = 0;
  let overdue = 0;
  let mine = 0;
  let space = 0;
  const now = dayjs();
  for (const t of uniqueTasks) {
    if (t.archived) {
      archived++;
    } else if (t.done) {
      done++;
    } else {
      active++;
      if (t.deadline && dayjs(t.deadline).isBefore(now)) {
        overdue++;
      }
    }
    if (!t.done && !t.archived && isMyTaskFn(t)) {
      mine++;
    }
    if (activeConversation && t.conversationId === activeConversation.id && !t.done && !t.archived) {
      space++;
    }
  }
  return { active, done, archived, overdue, mine, space, total: uniqueTasks.length };
}

export function filterPortalTasks({
  uniqueTasks,
  taskFilter,
  taskScopeFilter,
  taskSearchQuery,
  isMyTaskFn,
  activeConversation,
}: {
  uniqueTasks: MosChatTaskItem[];
  taskFilter: 'ACTIVE' | 'MINE' | 'OVERDUE' | 'DONE' | 'ARCHIVED' | 'ALL';
  taskScopeFilter: 'ALL' | 'MINE' | 'SPACE';
  taskSearchQuery: string;
  isMyTaskFn: (t: MosChatTaskItem) => boolean;
  activeConversation?: MosChatConversation;
}): MosChatTaskItem[] {
  const now = dayjs();
  const query = taskSearchQuery.trim().toLowerCase();

  return uniqueTasks.filter((t) => {
    if (taskFilter === 'ACTIVE' && (t.done || t.archived)) return false;
    if (taskFilter === 'MINE' && (t.done || t.archived || !isMyTaskFn(t))) return false;
    if (taskFilter === 'OVERDUE' && (t.done || t.archived || !t.deadline || !dayjs(t.deadline).isBefore(now))) {
      return false;
    }
    if (taskFilter === 'DONE' && (!t.done || t.archived)) return false;
    if (taskFilter === 'ARCHIVED' && !t.archived) return false;

    if (taskScopeFilter === 'MINE' && !isMyTaskFn(t)) return false;
    if (taskScopeFilter === 'SPACE' && activeConversation && t.conversationId !== activeConversation.id) {
      return false;
    }

    if (query) {
      const titleMatch = (t.title || '').toLowerCase().includes(query);
      const codeMatch = (t.id || '').toLowerCase().includes(query);
      const assigneeMatch = (t.assigneeName || '').toLowerCase().includes(query);
      const creatorMatch = (t.creatorName || '').toLowerCase().includes(query);
      const convMatch = (t.conversationName || '').toLowerCase().includes(query);
      if (!titleMatch && !codeMatch && !assigneeMatch && !creatorMatch && !convMatch) {
        return false;
      }
    }

    return true;
  });
}

export function partitionSpaceTasks(filteredTasks: MosChatTaskItem[], activeConversation?: MosChatConversation) {
  if (!activeConversation) {
    return { currentSpaceTasks: [], otherSpaceTasks: filteredTasks };
  }
  const currentSpaceTasks: MosChatTaskItem[] = [];
  const otherSpaceTasks: MosChatTaskItem[] = [];
  for (const t of filteredTasks) {
    if (t.conversationId === activeConversation.id) {
      currentSpaceTasks.push(t);
    } else {
      otherSpaceTasks.push(t);
    }
  }
  return { currentSpaceTasks, otherSpaceTasks };
}
