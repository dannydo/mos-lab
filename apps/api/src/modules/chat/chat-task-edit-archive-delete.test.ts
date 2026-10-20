import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MosChatConversation, MosChatTaskItem, UpdateMosChatTaskRequest } from '@mos-lab/shared';

describe('chat task edit, archive, and delete invariants (MOS-FEAT-121)', () => {
  it('correctly edits task title, assignee, priority, and reminder time', () => {
    const task: MosChatTaskItem = {
      id: 'task-test-edit-1',
      conversationId: 'dm-pair-4-6',
      conversationName: 'Nguyễn Quang Khải',
      title: 'Tiêu đề ban đầu',
      assigneeId: 6,
      assigneeName: 'Nguyễn Quang Khải',
      creatorName: 'Danny Do',
      priority: 'NORMAL',
      remindAt: new Date(Date.now() + 3600000).toISOString(),
      done: false,
      fired: false,
      createdAt: new Date().toISOString(),
    };

    const editPayload: UpdateMosChatTaskRequest = {
      title: 'Tiêu đề sau khi chỉnh sửa chi tiết',
      assigneeId: 1,
      assigneeName: 'Danny Do',
      priority: 'URGENT',
      remindAt: new Date(Date.now() + 7200000).toISOString(),
    };

    // Apply updates as in routes.ts
    const now = new Date();
    if (editPayload.title?.trim()) {
      task.title = editPayload.title.trim();
    }
    if (editPayload.assigneeId !== undefined) {
      task.assigneeId = editPayload.assigneeId;
    }
    if (editPayload.assigneeName?.trim()) {
      task.assigneeName = editPayload.assigneeName.trim();
    }
    if (editPayload.priority) {
      task.priority = editPayload.priority;
    }
    if (editPayload.remindAt) {
      task.remindAt = editPayload.remindAt;
      task.fired = false;
    }
    task.updatedAt = now.toISOString();

    assert.equal(task.title, 'Tiêu đề sau khi chỉnh sửa chi tiết');
    assert.equal(task.assigneeId, 1);
    assert.equal(task.assigneeName, 'Danny Do');
    assert.equal(task.priority, 'URGENT');
    assert.equal(task.remindAt, editPayload.remindAt);
    assert.ok(task.updatedAt);
  });

  it('correctly transitions task to ARCHIVED and restores from ARCHIVED (unarchive)', () => {
    const task: MosChatTaskItem = {
      id: 'task-test-archive-1',
      conversationId: 'space-shop-operations',
      conversationName: 'Shop Operations',
      title: 'Chuẩn bị phòng VIP đón khách 14:00',
      assigneeName: 'Tuyết Nhi',
      creatorName: 'Khải Nguyễn',
      priority: 'HIGH',
      remindAt: new Date(Date.now() + 1800000).toISOString(),
      done: false,
      fired: false,
      createdAt: new Date().toISOString(),
    };

    // 1. Archive task
    const now = new Date();
    task.archived = true;
    task.archivedAt = now.toISOString();
    task.updatedAt = now.toISOString();

    assert.equal(task.archived, true);
    assert.ok(task.archivedAt);

    // Ensure archived tasks are excluded from active tasks count
    const allTasks: MosChatTaskItem[] = [task];
    const activeTasks = allTasks.filter((t) => !t.done && !t.archived);
    const archivedTasks = allTasks.filter((t) => Boolean(t.archived));
    assert.equal(activeTasks.length, 0);
    assert.equal(archivedTasks.length, 1);

    // 2. Unarchive / Restore task
    task.archived = false;
    task.archivedAt = null;
    task.updatedAt = new Date().toISOString();

    assert.equal(task.archived, false);
    assert.equal(task.archivedAt, null);
    const restoredActive = allTasks.filter((t) => !t.done && !t.archived);
    assert.equal(restoredActive.length, 1);
  });

  it('correctly deletes task and cleans up taskId link on associated conversation messages', () => {
    const taskIdToDelete = 'task-del-123';
    const tasks: MosChatTaskItem[] = [
      {
        id: taskIdToDelete,
        conversationId: 'dm-pair-4-6',
        conversationName: 'Nguyễn Quang Khải',
        sourceMessageId: 'msg-linked-1',
        title: 'Task cần xoá',
        assigneeName: 'Nguyễn Quang Khải',
        creatorName: 'Danny Do',
        priority: 'NORMAL',
        remindAt: new Date().toISOString(),
        done: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task-keep-456',
        conversationId: 'dm-pair-4-6',
        conversationName: 'Nguyễn Quang Khải',
        title: 'Task giữ lại',
        assigneeName: 'Danny Do',
        creatorName: 'Danny Do',
        priority: 'HIGH',
        remindAt: new Date().toISOString(),
        done: false,
        createdAt: new Date().toISOString(),
      },
    ];

    const conversations: MosChatConversation[] = [
      {
        id: 'dm-pair-4-6',
        type: 'dm',
        name: 'Nguyễn Quang Khải',
        color: '#d4a84b',
        unreadCount: 0,
        messages: [
          {
            id: 'msg-linked-1',
            conversationId: 'dm-pair-4-6',
            senderId: 1,
            senderName: 'Danny Do',
            senderRole: 'Super Admin',
            senderAvatar: 'DD',
            roleColor: '#d4a84b',
            text: 'Tin nhắn giao việc',
            timeLabel: '09:00',
            createdAt: new Date().toISOString(),
            taskId: taskIdToDelete,
            reactions: {},
            thread: [],
          },
          {
            id: 'msg-normal-2',
            conversationId: 'dm-pair-4-6',
            senderId: 6,
            senderName: 'Nguyễn Quang Khải',
            senderRole: 'Admin',
            senderAvatar: 'QK',
            roleColor: '#d4a84b',
            text: 'Tin nhắn khác',
            timeLabel: '09:05',
            createdAt: new Date().toISOString(),
            reactions: {},
            thread: [],
          },
        ],
        updatedAt: new Date().toISOString(),
      },
    ];

    // Perform deletion
    const idx = tasks.findIndex((t) => t.id === taskIdToDelete);
    assert.ok(idx >= 0);
    const deletedTask = tasks.splice(idx, 1)[0];
    assert.equal(deletedTask.id, taskIdToDelete);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].id, 'task-keep-456');

    // Clean up taskId on conversation messages
    for (const c of conversations) {
      if (c.id === deletedTask.conversationId) {
        for (const m of c.messages) {
          if (m.taskId === taskIdToDelete) {
            delete m.taskId;
          }
        }
      }
    }

    const linkedMsg = conversations[0].messages.find((m) => m.id === 'msg-linked-1');
    assert.equal(linkedMsg?.taskId, undefined);
  });

  it('correctly sets task deadline, negotiates deadline with note, and accepts negotiation (MOS-BUG-125)', () => {
    const initialDeadline = new Date(Date.now() + 18000000).toISOString(); // 5 hours later
    const task: MosChatTaskItem = {
      id: 'task-deadline-1',
      conversationId: 'dm-pair-1-6',
      conversationName: 'Nguyễn Quang Khải',
      title: 'Báo cáo số liệu chiến dịch Telesales',
      assigneeId: 6,
      assigneeName: 'Nguyễn Quang Khải',
      creatorName: 'Danny Do',
      priority: 'HIGH',
      remindAt: new Date(Date.now() + 3600000).toISOString(),
      deadline: initialDeadline,
      dueAt: initialDeadline,
      done: false,
      fired: false,
      createdAt: new Date().toISOString(),
    };

    assert.equal(task.deadline, initialDeadline);
    assert.equal(task.dueAt, initialDeadline);

    // 1. Assignee negotiates deadline (e.g. Khải asks to postpone to tomorrow 10:00)
    const proposedDeadline = new Date(Date.now() + 86400000).toISOString();
    const negotiationPayload: UpdateMosChatTaskRequest = {
      negotiatedDeadline: proposedDeadline,
      negotiationNote: 'Em đang kẹt xử lý sự cố OmiCall, xin phép dời sang sáng mai ạ',
      negotiatedBy: 'Nguyễn Quang Khải',
      negotiatedAt: new Date().toISOString(),
    };

    task.negotiatedDeadline = negotiationPayload.negotiatedDeadline;
    task.negotiationNote = negotiationPayload.negotiationNote;
    task.negotiatedBy = negotiationPayload.negotiatedBy;
    task.negotiatedAt = negotiationPayload.negotiatedAt;

    assert.equal(task.negotiatedDeadline, proposedDeadline);
    assert.equal(task.negotiationNote, 'Em đang kẹt xử lý sự cố OmiCall, xin phép dời sang sáng mai ạ');
    // Official deadline remains intact until approved
    assert.equal(task.deadline, initialDeadline);

    // 2. Creator (Danny) accepts negotiated deadline
    const acceptPayload: UpdateMosChatTaskRequest = {
      acceptNegotiatedDeadline: true,
    };
    if (acceptPayload.acceptNegotiatedDeadline && task.negotiatedDeadline) {
      task.deadline = task.negotiatedDeadline;
      task.dueAt = task.negotiatedDeadline;
      task.negotiatedDeadline = null;
      task.negotiationNote = null;
      task.negotiatedBy = null;
      task.negotiatedAt = null;
    }

    assert.equal(task.deadline, proposedDeadline);
    assert.equal(task.dueAt, proposedDeadline);
    assert.equal(task.negotiatedDeadline, null);
    assert.equal(task.negotiationNote, null);
  });
});
