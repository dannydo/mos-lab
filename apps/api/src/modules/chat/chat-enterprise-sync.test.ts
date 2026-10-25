import assert from 'node:assert/strict';
import test from 'node:test';
import type { MosChatConversation, MosChatMessage, MosChatTaskItem } from '@mos-lab/shared';
import {
  buildMissionArtifactPreview,
  buildMissionSummaryFromReport,
  inferMissionExecutionTrack,
} from './chat-mission-bridge.service.js';
import { chatRealtimeHub, computeDeltaFromSnapshot } from './chat-realtime.hub.js';
import { paginateConversationMessages } from './chat-repository.service.js';

test('inferMissionExecutionTrack classifies CODE_ENGINEERING, PROCESS_CANON, and DATA_DECISION accurately', () => {
  assert.equal(
    inferMissionExecutionTrack('Lỗi nút bấm không mở được modal trên màn hình đặt lịch'),
    'CODE_ENGINEERING'
  );
  assert.equal(
    inferMissionExecutionTrack('Cập nhật điều răn Kinh Thánh mOS và khung năng lực Telesale'),
    'PROCESS_CANON'
  );
  assert.equal(inferMissionExecutionTrack('Đối soát sổ cái và điều chỉnh tip đơn hàng khách VIP'), 'DATA_DECISION');
  assert.equal(inferMissionExecutionTrack('0901406091 cho anh 30K nhen'), 'DATA_DECISION');
  assert.equal(inferMissionExecutionTrack('Bất kỳ tiêu đề nào', 'PROCESS_CANON'), 'PROCESS_CANON');
});

test('buildMissionSummaryFromReport populates executionTrack and Universal 3-Gate artifactPreview', () => {
  const now = new Date('2026-10-25T04:00:00.000Z');
  const processSummary = buildMissionSummaryFromReport(
    {
      id: 201,
      requestType: 'FEATURE',
      title: 'Cập nhật quy trình và điều răn Kinh Thánh mOS cho CC',
      status: 'NEW',
      clarificationStatus: 'READY',
      reporterStaffId: 5,
      reporter: { id: 5, displayName: 'Thúy Kiều' },
      updatedAt: now,
    },
    null,
    { conversationId: 'space-core', messageId: 'msg-1' }
  );

  assert.equal(processSummary.executionTrack, 'PROCESS_CANON');
  assert.equal(processSummary.artifactPreview?.track, 'PROCESS_CANON');
  assert.equal(processSummary.artifactPreview?.gate2Label, 'Cổng 2: Duyệt Bản Thảo Điều Răn');

  const dataSummary = buildMissionArtifactPreview('DATA_DECISION', {
    changedFilesCount: 12,
    summary: 'Cập nhật 12 bản ghi khách hàng',
  });
  assert.equal(dataSummary.track, 'DATA_DECISION');
  assert.equal(dataSummary.dataDryRun?.affectedRows, 12);
  assert.equal(dataSummary.dataDryRun?.rollbackReady, true);
});

test('paginateConversationMessages slices message history by cursor and limit', () => {
  const messages: MosChatMessage[] = Array.from({ length: 10 }, (_, idx) => ({
    id: `msg-${idx + 1}`,
    conversationId: 'space-ops',
    senderId: 1,
    senderName: 'Danny',
    senderRole: 'Super Admin',
    text: `Message #${idx + 1}`,
    timeLabel: '10:00',
    createdAt: new Date(Date.UTC(2026, 9, 25, 3, idx, 0)).toISOString(),
  }));

  const latestPage = paginateConversationMessages(messages, { limit: 4 });
  assert.equal(latestPage.messages.length, 4);
  assert.deepEqual(
    latestPage.messages.map((m) => m.id),
    ['msg-7', 'msg-8', 'msg-9', 'msg-10']
  );
  assert.equal(latestPage.hasMore, true);
  assert.equal(latestPage.nextCursor, 'msg-7');

  const olderPage = paginateConversationMessages(messages, { before: 'msg-7', limit: 4 });
  assert.deepEqual(
    olderPage.messages.map((m) => m.id),
    ['msg-3', 'msg-4', 'msg-5', 'msg-6']
  );
  assert.equal(olderPage.hasMore, true);
  assert.equal(olderPage.nextCursor, 'msg-3');
});

test('computeDeltaFromSnapshot returns only conversations and messages updated after since cursor', () => {
  const oldConv: MosChatConversation = {
    id: 'space-old',
    type: 'space',
    name: 'Old Room',
    color: '#1a73e8',
    unreadCount: 0,
    updatedAt: '2026-10-25T01:00:00.000Z',
    messages: [
      {
        id: 'msg-old',
        conversationId: 'space-old',
        senderId: 1,
        senderName: 'User A',
        senderRole: 'Staff',
        text: 'Hello yesterday',
        timeLabel: '08:00',
        createdAt: '2026-10-25T01:00:00.000Z',
      },
    ],
  };

  const activeConv: MosChatConversation = {
    id: 'space-active',
    type: 'space',
    name: 'Active Room',
    color: '#10b981',
    unreadCount: 1,
    updatedAt: '2026-10-25T04:10:00.000Z',
    messages: [
      {
        id: 'msg-prev',
        conversationId: 'space-active',
        senderId: 1,
        senderName: 'User A',
        senderRole: 'Staff',
        text: 'Previous',
        timeLabel: '08:00',
        createdAt: '2026-10-25T01:00:00.000Z',
      },
      {
        id: 'msg-new',
        conversationId: 'space-active',
        senderId: 2,
        senderName: 'User B',
        senderRole: 'Staff',
        text: 'Brand new message',
        timeLabel: '11:10',
        createdAt: '2026-10-25T04:10:00.000Z',
      },
    ],
  };

  const tasks: MosChatTaskItem[] = [];
  const delta = computeDeltaFromSnapshot({ conversations: [oldConv, activeConv], tasks }, '2026-10-25T03:00:00.000Z');

  assert.equal(delta.updatedConversations.length, 1);
  assert.equal(delta.updatedConversations[0].id, 'space-active');
  assert.equal(delta.updatedMessages.length, 1);
  assert.equal(delta.updatedMessages[0].id, 'msg-new');
});

test('chatRealtimeHub buffers and filters realtime events by timestamp', () => {
  chatRealtimeHub.clearForTests();
  const evt = chatRealtimeHub.publish({
    type: 'MESSAGE_CREATED',
    conversationId: 'space-core',
    actorStaffId: 1,
    payload: { text: 'Realtime ping' },
  });

  const events = chatRealtimeHub.getEventsSince('2020-01-01T00:00:00.000Z');
  assert.equal(events.length, 1);
  assert.equal(events[0].id, evt.id);
  chatRealtimeHub.clearForTests();
});
