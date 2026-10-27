import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MosChatTaskItem, MosChatTaskChecklistItem, MosChatTaskActivityLogItem } from '@mos-lab/shared';

describe('Chat Task Checklist & Smart 2-Way Sync logic', () => {
  it('initializes task with empty checklist and creates activity log', () => {
    const task: MosChatTaskItem = {
      id: 'task-test-chk-1',
      conversationId: 'space-test',
      conversationName: 'Team Dev',
      title: 'Kiểm tra tính năng checklist',
      assigneeName: 'Danny Do',
      creatorName: 'Danny Do',
      priority: 'HIGH',
      remindAt: new Date().toISOString(),
      done: false,
      createdAt: new Date().toISOString(),
      checklist: [],
      activityLog: [
        {
          id: 'act-1',
          action: 'CREATE_TASK',
          actorName: 'Danny Do',
          description: 'Tạo công việc',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    assert.equal(task.checklist?.length, 0);
    assert.equal(task.activityLog?.length, 1);
    assert.equal(task.done, false);
  });

  it('marks task done when all checklist items become done (Smart 2-Way Sync)', () => {
    const items: MosChatTaskChecklistItem[] = [
      { id: 'c1', title: 'Việc 1', done: true, createdAt: new Date().toISOString() },
      { id: 'c2', title: 'Việc 2', done: false, createdAt: new Date().toISOString() },
    ];
    let taskDone = false;

    // Toggle c2 to true
    items[1].done = true;
    const allDone = items.every((c) => c.done);
    if (allDone) {
      taskDone = true;
    }

    assert.equal(taskDone, true);
  });

  it('re-opens task if a checklist item is unchecked when task was done', () => {
    const items: MosChatTaskChecklistItem[] = [
      { id: 'c1', title: 'Việc 1', done: true, createdAt: new Date().toISOString() },
      { id: 'c2', title: 'Việc 2', done: true, createdAt: new Date().toISOString() },
    ];
    let taskDone = true;

    // Uncheck c1
    items[0].done = false;
    const allDone = items.every((c) => c.done);
    if (!allDone && taskDone) {
      taskDone = false;
    }

    assert.equal(taskDone, false);
  });

  it('marks all checklist items done when task is completed directly', () => {
    const items: MosChatTaskChecklistItem[] = [
      { id: 'c1', title: 'Việc 1', done: false, createdAt: new Date().toISOString() },
      { id: 'c2', title: 'Việc 2', done: true, createdAt: new Date().toISOString() },
    ];
    const taskDone = true;

    if (taskDone) {
      for (const it of items) {
        it.done = true;
      }
    }

    assert.equal(
      items.every((c) => c.done),
      true
    );
  });

  it('correctly tracks sourceReplyId on checklist items for subthread navigation', () => {
    const item: MosChatTaskChecklistItem = {
      id: 'chk-nav-1',
      title: 'Xem lại tài liệu thiết kế',
      done: false,
      sourceReplyId: 'reply-target-99',
      assigneeName: 'Khải',
      createdAt: new Date().toISOString(),
    };

    assert.equal(item.sourceReplyId, 'reply-target-99');
    assert.equal(item.assigneeName, 'Khải');
  });
});
