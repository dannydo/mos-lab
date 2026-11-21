import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import Fastify from 'fastify';
import { mosChatRoutes } from './routes.js';

describe('mOS Chat Space Nickname & Member/Config O(1) Relational Persistence', () => {
  it('persists nickname, member, and config updates via O(1) upserts without triggering O(N) full-history sync', async () => {
    const convUpsertCalls: Array<{ where: { id: string }; update: Record<string, unknown> }> = [];
    const msgUpsertCalls: Array<{ where: { id: string } }> = [];

    const now = new Date('2026-11-21T13:00:00.000Z');
    const seededConvs = [
      {
        id: 'space-cvl',
        type: 'space',
        name: 'cv-l',
        subtitle: 'Không gian CV🪶',
        roleTag: '2',
        color: '#3b82f6',
        avatar: 'CV',
        participantStaffId: null,
        isSelf: false,
        memberIdsJson: [1, 6],
        memberNicknamesJson: {},
        payloadJson: { id: 'space-cvl', type: 'space', name: 'cv-l', memberIds: [1, 6], memberCount: 2 },
        updatedAt: now,
      },
      {
        id: 'space-other',
        type: 'space',
        name: 'other-space',
        subtitle: 'Other',
        roleTag: '1',
        color: '#10b981',
        avatar: 'OT',
        participantStaffId: null,
        isSelf: false,
        memberIdsJson: [1],
        memberNicknamesJson: {},
        payloadJson: { id: 'space-other', type: 'space', name: 'other-space', memberIds: [1], memberCount: 1 },
        updatedAt: now,
      },
    ];

    const seededMessages = Array.from({ length: 20 }, (_, i) => ({
      id: `msg-seed-${i}`,
      conversationId: i < 10 ? 'space-cvl' : 'space-other',
      parentMessageId: null,
      senderId: '1',
      senderName: 'Danny Do',
      senderRole: 'Super Admin',
      senderAvatar: 'DD',
      roleColor: '#3b82f6',
      text: `Seed message ${i}`,
      timeLabel: '13:00',
      pinned: false,
      isDeleted: false,
      taskId: null,
      missionId: null,
      missionKey: null,
      workflowInstanceId: null,
      metadataJson: { id: `msg-seed-${i}`, createdAt: now.toISOString(), reactions: {} },
      createdAt: now,
      updatedAt: now,
    }));

    const app = Fastify();
    app.decorate('prisma', {
      crm: {
        $executeRawUnsafe: async () => 0,
        crmConfig: {
          findUnique: async () => null,
          upsert: async () => ({ key: 'mock', value: '[]', updatedAt: now }),
        },
        crmStaff: {
          findMany: async () => [
            {
              id: 1,
              username: 'danny.do@wingslashes.com',
              displayName: 'Danny Do',
              role: 'super_admin',
              avatarUrl: null,
              lastActiveAt: now,
              legacyStaffId: null,
            },
            {
              id: 6,
              username: 'diemhuong@wingslashes.com',
              displayName: 'Diễm Hương',
              role: 'cc',
              avatarUrl: null,
              lastActiveAt: now,
              legacyStaffId: null,
            },
            {
              id: 10,
              username: 'khanhcao@wingslashes.com',
              displayName: 'Khanh Cao',
              role: 'manager',
              avatarUrl: null,
              lastActiveAt: now,
              legacyStaffId: null,
            },
          ],
          findUnique: async ({ where }: { where: { id: number } }) => ({
            id: where.id,
            username: `staff_${where.id}`,
            displayName: `Staff ${where.id}`,
            role: 'manager',
          }),
        },
        crmTeamMember: {
          findMany: async () => [],
        },
        crmChatConversation: {
          count: async () => seededConvs.length,
          findMany: async () => seededConvs,
          upsert: async (args: { where: { id: string }; update: Record<string, unknown> }) => {
            convUpsertCalls.push(args);
            return args.where;
          },
        },
        crmChatMessage: {
          findMany: async () => seededMessages,
          upsert: async (args: { where: { id: string } }) => {
            msgUpsertCalls.push(args);
            return args.where;
          },
        },
        crmChatTask: {
          findMany: async () => [],
        },
        crmChatUserPref: {
          findMany: async () => [],
        },
      },
      legacy: {
        $queryRawUnsafe: async () => [],
      },
    } as never);

    app.decorateRequest('jwtVerify', async function () {
      (this as { user?: unknown }).user = {
        id: 1,
        staffId: 1,
        username: 'danny.do@wingslashes.com',
        displayName: 'Danny Do',
        role: 'super_admin',
      };
    });

    await app.register(mosChatRoutes);

    // 1. Set nickname: must do 1 conversation upsert + 1 message upsert (O(1))
    const setRes = await app.inject({
      method: 'PUT',
      url: '/chat/conversations/space-cvl/nickname',
      payload: { targetStaffId: 6, nickname: 'Hương Qua Đèo' },
    });
    assert.equal(setRes.statusCode, 200);
    const setBody = JSON.parse(setRes.body);
    assert.equal(setBody.success, true);
    assert.equal(setBody.memberNicknames['6'], 'Hương Qua Đèo');
    assert.equal(convUpsertCalls.length, 1, 'set nickname must upsert only the touched conversation');
    assert.equal(convUpsertCalls[0].where.id, 'space-cvl');
    assert.deepEqual(convUpsertCalls[0].update.memberNicknamesJson, { '6': 'Hương Qua Đèo' });
    assert.equal(msgUpsertCalls.length, 1, 'set nickname must upsert only the 1 new system message, not all 20');

    // 2. Remove nickname: also O(1)
    convUpsertCalls.length = 0;
    msgUpsertCalls.length = 0;
    const clearRes = await app.inject({
      method: 'PUT',
      url: '/chat/conversations/space-cvl/nickname',
      payload: { targetStaffId: 6, nickname: '' },
    });
    assert.equal(clearRes.statusCode, 200);
    const clearBody = JSON.parse(clearRes.body);
    assert.equal(clearBody.success, true);
    assert.equal(clearBody.memberNicknames['6'], undefined);
    assert.equal(convUpsertCalls.length, 1);
    assert.equal(msgUpsertCalls.length, 1);

    // 3. Add member to space: also O(1)
    convUpsertCalls.length = 0;
    msgUpsertCalls.length = 0;
    const addRes = await app.inject({
      method: 'POST',
      url: '/chat/conversations/space-cvl/members',
      payload: { staffId: 10 },
    });
    assert.equal(addRes.statusCode, 200);
    assert.equal(convUpsertCalls.length, 1);
    assert.equal(msgUpsertCalls.length, 1);

    // 4. Update space config: also O(1)
    convUpsertCalls.length = 0;
    msgUpsertCalls.length = 0;
    const patchRes = await app.inject({
      method: 'PATCH',
      url: '/chat/conversations/space-cvl',
      payload: { subtitle: 'Không gian cập nhật nhanh' },
    });
    assert.equal(patchRes.statusCode, 200);
    assert.equal(convUpsertCalls.length, 1);
    assert.equal(msgUpsertCalls.length, 1);

    await app.close();
  });
});
