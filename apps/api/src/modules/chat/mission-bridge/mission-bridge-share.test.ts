import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { FastifyInstance } from 'fastify';
import type { MosChatConversation, MosChatStaffMember, SafeAny } from '@mos-lab/shared';
import type { JwtUserPayload } from '../../../middlewares/auth.js';
import { ChatMissionBridgeService } from '../chat-mission-bridge.service.js';

function createMockFastify(reportOverride?: Partial<SafeAny>): FastifyInstance {
  const report = {
    id: 253,
    requestType: 'BUG',
    title: 'Lỗi hiển thị báo cáo doanh số',
    description: 'Chi tiết: Khi lọc theo tháng bị lệch số liệu',
    status: 'IN_PROGRESS',
    sourcePath: '/dashboard/cc',
    clarificationStatus: 'READY',
    clarificationSummary: null,
    implementationApprovedAt: new Date('2026-11-22T08:00:00Z'),
    implementationActiveJobId: null,
    reporterStaffId: 42,
    createdAt: new Date('2026-11-22T07:00:00Z'),
    updatedAt: new Date('2026-11-22T08:30:00Z'),
    reporter: { id: 42, displayName: 'Nguyễn Quang Khải' },
    resolution: null,
    comments: [
      {
        id: 1,
        authorType: 'AGENT',
        kind: 'CLARIFICATION_QUESTION',
        body: 'Bạn xác nhận giúp bộ lọc ngày nhé',
        createdAt: new Date('2026-11-22T07:30:00Z'),
      },
    ],
    ...reportOverride,
  };

  return {
    prisma: {
      crm: {
        crmBugReport: {
          findUnique: async ({ where }: { where: { id: number } }) => (where.id === report.id ? report : null),
          findMany: async ({ where }: { where: { id: { in: number[] } } }) =>
            where.id.in.includes(report.id) ? [report] : [],
        },
        crmInboxImplementationJob: {
          findUnique: async () => null,
          findMany: async () => [],
        },
        crmStaff: {
          findUnique: async ({ where }: { where: { id: number } }) => ({
            id: where.id,
            displayName: where.id === 42 ? 'Nguyễn Quang Khải' : 'Danny Do',
            username: where.id === 42 ? 'khai' : 'danny',
            role: where.id === 42 ? 'manager' : 'super_admin',
            avatarUrl: null,
          }),
        },
      },
    },
    log: { warn: () => {}, error: () => {} },
  } as unknown as FastifyInstance;
}

describe('MOS-FEAT-263: Share ticket / request into mOS Chat', () => {
  const staffDirectory: MosChatStaffMember[] = [
    { id: 1, username: 'danny', displayName: 'Danny Do', role: 'super_admin' },
    { id: 42, username: 'khai', displayName: 'Nguyễn Quang Khải', role: 'manager' },
    { id: 99, username: 'lan', displayName: 'Ngọc Lan', role: 'technician' },
  ];

  const reporterUser: JwtUserPayload = {
    id: 42,
    username: 'khai',
    role: 'manager',
    displayName: 'Nguyễn Quang Khải',
  };

  it('allows reporter to share their own request to multiple Spaces and DMs with optional note', async () => {
    const fastify = createMockFastify();
    const conversations: MosChatConversation[] = [
      {
        id: 'space-lab',
        type: 'space',
        name: 'Lab Thảo Luận',
        color: '#8b5cf6',
        memberIds: [1, 42],
        unreadCount: 0,
        messages: [],
        updatedAt: '2026-11-22T07:00:00Z',
      },
    ];

    const res = await ChatMissionBridgeService.shareMissionToChat(
      fastify,
      reporterUser,
      {
        reportId: 253,
        targetConversationIds: ['space-lab'],
        targetStaffIds: [1],
        note: 'Anh Danny xem giúp em ticket này nhé',
      },
      conversations,
      staffDirectory
    );

    assert.equal(res.mission.key, 'MOS-BUG-253');
    assert.equal(res.results.length, 2);
    assert.equal(conversations[0].id, 'dm-pair-1-42');
    assert.equal(conversations[0].messages.length, 1);
    assert.equal(conversations[1].messages.length, 1);

    const sharedMsg = conversations[1].messages[0];
    assert.equal(sharedMsg.missionId, 253);
    assert.equal(sharedMsg.missionKey, 'MOS-BUG-253');
    assert.equal(sharedMsg.isSharedMission, true);
    assert.equal(sharedMsg.text, 'Anh Danny xem giúp em ticket này nhé');
    assert.equal(sharedMsg.mission?.title, 'Lỗi hiển thị báo cáo doanh số');
  });

  it('rejects non-admin staff sharing someone else ticket and rejects CV role completely', async () => {
    const fastify = createMockFastify({ reporterStaffId: 1 });
    const conversations: MosChatConversation[] = [
      {
        id: 'space-lab',
        type: 'space',
        name: 'Lab Thảo Luận',
        color: '#8b5cf6',
        memberIds: [1, 42],
        unreadCount: 0,
        messages: [],
        updatedAt: '2026-11-22T07:00:00Z',
      },
    ];

    await assert.rejects(
      () =>
        ChatMissionBridgeService.shareMissionToChat(
          fastify,
          reporterUser,
          { reportId: 253, targetConversationIds: ['space-lab'] },
          conversations,
          staffDirectory
        ),
      /chỉ có thể chia sẻ yêu cầu của chính mình/i
    );

    const cvUser: JwtUserPayload = { id: 99, username: 'lan', role: 'technician', displayName: 'Ngọc Lan' };
    await assert.rejects(
      () =>
        ChatMissionBridgeService.shareMissionToChat(
          fastify,
          cvUser,
          { reportId: 253, targetConversationIds: ['space-lab'] },
          conversations,
          staffDirectory
        ),
      /Chuyên Viên không có quyền/i
    );
  });

  it('syncLinkedMissionsIntoChatState refreshes shared mission status without injecting milestone bot replies', async () => {
    const fastify = createMockFastify({ status: 'FIXED' });
    const conversations: MosChatConversation[] = [
      {
        id: 'space-lab',
        type: 'space',
        name: 'Lab Thảo Luận',
        color: '#8b5cf6',
        memberIds: [1, 42],
        unreadCount: 0,
        updatedAt: '2026-11-22T07:00:00Z',
        messages: [
          {
            id: 'msg-share-1',
            conversationId: 'space-lab',
            senderId: 42,
            senderName: 'Nguyễn Quang Khải',
            senderRole: 'Quản lý',
            text: '',
            timeLabel: '08:00',
            createdAt: '2026-11-22T08:00:00Z',
            missionId: 253,
            missionKey: 'MOS-BUG-253',
            isSharedMission: true,
            mission: {
              reportId: 253,
              key: 'MOS-BUG-253',
              missionKey: 'MOS-BUG-253',
              missionCode: 'MSN-253',
              requestType: 'BUG',
              title: 'Lỗi hiển thị báo cáo doanh số',
              status: 'NEW',
              clarificationStatus: 'PENDING_AGENT',
              stage: 'RECEIVED',
              stepIndex: 1,
              humanBadge: '🟣 Đã tiếp nhận',
              stageLabel: '🟣 Đã tiếp nhận',
              humanSummary: 'Đang chờ',
              humanStatusSummary: 'Đang chờ',
              updatedAt: '2026-11-22T07:00:00Z',
            },
            thread: [],
          },
        ],
      },
    ];

    const mutated = await ChatMissionBridgeService.syncLinkedMissionsIntoChatState(fastify, conversations, []);
    assert.equal(mutated, true);
    assert.equal(conversations[0].messages[0].mission?.stage, 'READY_FOR_REVIEW');
    assert.equal(conversations[0].messages[0].thread?.length, 0);
  });

  it('allows chat conversation participant to preview a shared ticket even if not reporter or admin', async () => {
    const fastify = createMockFastify({ reporterStaffId: 1 });
    const teammateUser: JwtUserPayload = { id: 42, username: 'khai', role: 'manager', displayName: 'Khải' };
    const conversations: MosChatConversation[] = [
      {
        id: 'space-lab',
        type: 'space',
        name: 'Lab Thảo Luận',
        color: '#8b5cf6',
        memberIds: [1, 42],
        unreadCount: 0,
        updatedAt: '2026-11-22T07:00:00Z',
        messages: [
          {
            id: 'msg-share-1',
            conversationId: 'space-lab',
            senderId: 1,
            senderName: 'Danny Do',
            senderRole: 'Super Admin',
            text: '',
            timeLabel: '08:00',
            createdAt: '2026-11-22T08:00:00Z',
            missionId: 253,
            isSharedMission: true,
          },
        ],
      },
    ];

    const preview = await ChatMissionBridgeService.getSharedMissionPreview(
      fastify,
      teammateUser,
      253,
      conversations,
      [],
      staffDirectory
    );
    assert.equal(preview.key, 'MOS-BUG-253');
    assert.equal(preview.description, 'Chi tiết: Khi lọc theo tháng bị lệch số liệu');
    assert.equal(preview.sourcePath, '/dashboard/cc');
  });
});
