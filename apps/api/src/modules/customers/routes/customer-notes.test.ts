import assert from 'node:assert/strict';
import test from 'node:test';
import Fastify from 'fastify';
import { registerCustomerNotesRoutes } from './customer-notes.routes.js';
import { SafeAny } from '@mos-lab/shared';

test('Customer Notes Routes: POST /customers/:id/notes creates note with complete legacy attributes', async () => {
  const app = Fastify();

  app.decorateRequest('user', null as SafeAny);
  app.addHook('onRequest', async (req) => {
    (req as SafeAny).user = { id: 1, role: 'admin' };
    (req as SafeAny).jwtVerify = async () => {};
  });

  const executedQueries: string[] = [];
  const insertedParams: SafeAny[] = [];

  const mockLegacy = {
    $executeRawUnsafe: async (sql: string, ...params: SafeAny[]) => {
      executedQueries.push(sql);
      insertedParams.push(params);
      return 1;
    },
    $queryRawUnsafe: async (sql: string, ...params: SafeAny[]) => {
      executedQueries.push(sql);
      if (sql.includes('LAST_INSERT_ID')) {
        return [{ id: 123456 }];
      }
      return [];
    },
    $transaction: async (cb: (tx: SafeAny) => Promise<SafeAny>) => {
      return cb(mockLegacy);
    },
  };

  const mockCrm = {
    crmStaff: {
      findUnique: async () => ({ legacyStaffId: 99, role: 'admin', isActive: true }),
      update: async () => ({}),
    },
  };

  app.decorate('prisma', { legacy: mockLegacy, crm: mockCrm } as SafeAny);

  await app.register(registerCustomerNotesRoutes);

  const response = await app.inject({
    method: 'POST',
    url: '/customers/43554/notes',
    payload: {
      note: 'Ghi chú kiểm thử tích hợp',
      noteFieldKey: 'note',
      isSticky: false,
    },
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.success, true);

  // Verify user_note insert query contains date_updated and attribute_group_key
  const userNoteInsert = executedQueries.find((q) => q.includes('INSERT INTO user_note'));
  assert.ok(userNoteInsert, 'user_note insert query must be executed');
  assert.ok(userNoteInsert.includes('date_updated'), 'user_note query must include date_updated');
  assert.ok(userNoteInsert.includes('attribute_group_key'), 'user_note query must include attribute_group_key');

  // Verify item_attribute_value insert query
  const attrInsert = executedQueries.find((q) => q.includes('INSERT INTO item_attribute_value'));
  assert.ok(attrInsert, 'item_attribute_value insert query must be executed');
  assert.ok(attrInsert.includes("'Normal'"), 'item_attribute_value must include Normal attribute option');
});

test('Customer Notes Routes: GET /customers/:id/notes repairs missing legacy attributes and returns notes', async () => {
  const app = Fastify();

  app.decorateRequest('user', null as SafeAny);
  app.addHook('onRequest', async (req) => {
    (req as SafeAny).user = { id: 1, role: 'admin' };
    (req as SafeAny).jwtVerify = async () => {};
  });

  const executedQueries: string[] = [];

  const mockLegacy = {
    $executeRawUnsafe: async (sql: string) => {
      executedQueries.push(sql);
      return 1;
    },
    $queryRawUnsafe: async (sql: string, ...params: SafeAny[]) => {
      executedQueries.push(sql);
      if (sql.includes('SELECT id, note_field_key, date_created, attribute_group_key FROM user_note')) {
        // Return 1 unhealed note
        return [
          {
            id: 699133,
            note_field_key: 'note',
            date_created: new Date('2026-09-13T16:08:56.000Z'),
            attribute_group_key: null,
          },
        ];
      }
      if (sql.includes('SELECT id FROM item_attribute_value')) {
        return []; // missing attributes
      }
      if (sql.includes('FROM user_note un')) {
        return [
          {
            id: 699133,
            note: 'Chị Hân test hệ thống',
            noteFieldKey: 'note',
            isSticky: 0,
            isIssue: 0,
            dateCreated: new Date('2026-09-13T16:08:56.000Z'),
            staffName: 'Danny',
            staffAvatar: null,
          },
        ];
      }
      return [];
    },
  };

  const mockCrm = {
    crmLocaTouchpoint: {
      findMany: async () => [],
    },
    crmCampaignTouchpointLog: {
      findMany: async () => [],
    },
  };

  app.decorate('prisma', { legacy: mockLegacy, crm: mockCrm } as SafeAny);

  await app.register(registerCustomerNotesRoutes);

  const response = await app.inject({
    method: 'GET',
    url: '/customers/43554/notes?page=1&limit=15',
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].id, 699133);

  // Verify repair query was triggered
  const repairUpdate = executedQueries.find((q) => q.includes('UPDATE user_note SET attribute_group_key = ?'));
  assert.ok(repairUpdate, 'repair query must update missing attribute_group_key');

  const repairAttrInsert = executedQueries.find((q) => q.includes('INSERT INTO item_attribute_value'));
  assert.ok(repairAttrInsert, 'repair query must insert missing item_attribute_value');
});

test('Customer Notes Routes: POST /customers/:id/notes/:noteId/pin updates date_updated and self-heals', async () => {
  const app = Fastify();

  app.decorateRequest('user', null as SafeAny);
  app.addHook('onRequest', async (req) => {
    (req as SafeAny).user = { id: 1, role: 'admin' };
    (req as SafeAny).jwtVerify = async () => {};
  });

  const executedQueries: string[] = [];

  const mockLegacy = {
    $executeRawUnsafe: async (sql: string, ...params: SafeAny[]) => {
      executedQueries.push(sql);
      return 1;
    },
    $queryRawUnsafe: async (sql: string, ...params: SafeAny[]) => {
      executedQueries.push(sql);
      if (sql.includes('SELECT attribute_group_key, note_field_key, date_created FROM user_note')) {
        return [
          {
            attribute_group_key: null,
            note_field_key: 'note',
            date_created: new Date('2026-09-13T16:08:56.000Z'),
          },
        ];
      }
      if (sql.includes('SELECT id FROM item_attribute_value')) {
        return [];
      }
      return [];
    },
    $transaction: async (cb: (tx: SafeAny) => Promise<SafeAny>) => {
      return cb(mockLegacy);
    },
  };

  const mockCrm = {
    crmStaff: {
      findUnique: async () => ({ legacyStaffId: 99, role: 'admin', isActive: true }),
      update: async () => ({}),
    },
  };

  app.decorate('prisma', { legacy: mockLegacy, crm: mockCrm } as SafeAny);

  await app.register(registerCustomerNotesRoutes);

  const response = await app.inject({
    method: 'POST',
    url: '/customers/43554/notes/699133/pin',
  });

  assert.equal(response.statusCode, 200);
  const body = response.json();
  assert.equal(body.success, true);

  const pinUpdate = executedQueries.find((q) => q.includes('UPDATE user_note SET is_sticky = 1'));
  assert.ok(pinUpdate, 'pin query must set is_sticky = 1');
  assert.ok(pinUpdate.includes('date_updated'), 'pin query must update date_updated');

  const attrInsert = executedQueries.find((q) => q.includes('INSERT INTO item_attribute_value'));
  assert.ok(attrInsert, 'pin self-healing must insert missing item_attribute_value');
});
