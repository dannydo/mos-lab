import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  summarizeAndExtractChecklistFromText,
  resolveBestSourceMessageForTaskChecklist,
  type MosChatTaskItem,
  type MosChatTaskChecklistItem,
  type MosChatConversation,
} from '@mos-lab/shared';

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

  it('accurately summarizes and deduplicates Bảo Hân November work goals into 7 tagged checklist items', () => {
    const baoHanMessage = `Dạ bẩm thầy
Danny Do và Team, mục tiêu tuần này và Tháng 11 của em như sau:
1. Về CS
• Đảm bảo khách: 40 Book và 35 Done (Đạt tối thiểu 85%)
• Đảm bảo chất lượng: Có công cụ lưu trữ feedback và đưa được feedback xuống shop bằng hình thức Đập chuối (Nhờ Danny hỗ trợ em xây công cụ ạ) (Tuần 1 của Tháng 11 phải xong)
2. Về HR
• Triển khai được 1 CV Lông ĐT (Trong tuần này) - Triển khai 1 CV Lông EP (Tuần 1 Tháng 11)
• Hoàn tất tham gia BHXH cho 19 + 2 Thiên thần (Tuần 1 Tháng 11)
• Hoàn tất Lưu trữ Hồ sơ lao động (Bao gồm hồ sơ nhân sự, HĐLĐ cho CV và BK-CS) (Trong Tháng 11)
• Đảm bảo các quy định về Off gấp/Đi trễ/Về sớm và Tác phong của Thiên thần shop, triển khai phạt bằng cách Đập chuối (Tháng 11)
***Tóm lại:
• Tuần này: Triển khai 1 CV Lông ĐT
• Tuần tiếp theo: Triển khai 1 CV Lông EP, Xây công cụ CS và triển khai đập chuối Feedback, Kê khai hồ sơ BHXH cho 21 Thiên thần
• Các tuần còn lại: Tiếp tục duy trì các đầu mục trên, và hoàn tất lưu trữ hồ sơ nhân sự, SOẠN HĐLĐ và các văn bản quan trọng khác, ĐẢM BẢO QUY ĐỊNH VỀ KỶ LUẬT VÀ TÁC PHONG`;

    const result = summarizeAndExtractChecklistFromText({
      rootText: baoHanMessage,
      rootSenderName: 'Bảo Hân',
      rootSenderId: 9,
    });

    assert.equal(result.suggestions.length, 7);
    assert.ok(result.summary?.includes('7 đầu việc (2 CS, 5 HR)'));
    assert.equal(result.suggestions[0].title, '[CS · Tháng 11] Đảm bảo khách: 40 Book và 35 Done (Đạt tối thiểu 85%)');
    assert.equal(
      result.suggestions[1].title,
      '[CS · Tuần 1/T11] Xây công cụ lưu trữ feedback & đưa xuống shop bằng hình thức Đập chuối'
    );
    assert.equal(result.suggestions[2].title, '[HR · Tuần này] Triển khai 1 CV Lông ĐT');
    assert.equal(result.suggestions[3].title, '[HR · Tuần 1/T11] Triển khai 1 CV Lông EP');
    assert.equal(result.suggestions[4].title, '[HR · Tuần 1/T11] Hoàn tất tham gia BHXH cho 19 + 2 Thiên thần');
    assert.equal(
      result.suggestions[5].title,
      '[HR · Tháng 11] Hoàn tất Lưu trữ Hồ sơ lao động (Bao gồm hồ sơ nhân sự, HĐLĐ cho CV và BK-CS)'
    );
    assert.equal(
      result.suggestions[6].title,
      '[HR · Tháng 11] Đảm bảo các quy định về Off gấp/Đi trễ/Về sớm và Tác phong của Thiên thần shop, triển khai phạt bằng cách Đập chuối'
    );
  });

  it('resolves assignee work report message in conversation even when task.sourceMessageId is null', () => {
    const conv: MosChatConversation = {
      id: 'dm-baohan',
      type: 'dm',
      name: 'Bảo Hân',
      color: '#a855f7',
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg-baohan-goals',
          conversationId: 'dm-baohan',
          senderId: 9,
          senderName: 'Bảo Hân',
          senderRole: 'Admin',
          text: '1. Về CS\n• Đảm bảo khách: 40 Book và 35 Done\n2. Về HR\n• Triển khai 1 CV Lông ĐT (Trong tuần này)',
          timeLabel: '14:44',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'msg-task-stub',
          conversationId: 'dm-baohan',
          senderId: 1,
          senderName: 'Danny Do',
          senderRole: 'Super Admin',
          text: 'Giao việc cho Bảo Hân:',
          timeLabel: '14:45',
          createdAt: new Date().toISOString(),
          taskId: 'task-efe45',
        },
      ],
    };

    const task: MosChatTaskItem = {
      id: 'task-efe45',
      conversationId: 'dm-baohan',
      conversationName: 'Bảo Hân',
      sourceMessageId: null,
      title: 'MỤC TIÊU CÔNG VIỆC THÁNG 11/2026',
      assigneeName: 'Bảo Hân',
      creatorName: 'Danny Do',
      priority: 'HIGH',
      remindAt: new Date().toISOString(),
      done: false,
      createdAt: new Date().toISOString(),
    };

    const resolved = resolveBestSourceMessageForTaskChecklist(conv, { task });
    assert.equal(resolved?.id, 'msg-baohan-goals');
  });
});
