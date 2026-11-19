import test from 'node:test';
import assert from 'node:assert/strict';
import type mysql from 'mysql2/promise';
import {
  createIosCustomerNote,
  CVL_NOTE_FIELD_KEY,
  listIosCustomerAllNotes,
  listIosCustomerCvlNotesBatch,
} from '../services/ios-customer-notes.service.js';
import { createInMemoryConfigStore } from '../services/ios-overrides.service.js';
import type { IosAuthContext } from '../services/ios-auth.service.js';

interface MockNotesDb {
  orders: Array<{ order_id: number; order_state: string; order_assigned_staff_id: number; user_id: number }>;
  services: Array<{
    order_id: number;
    assigned_staff_id: number;
    check_in_staff_id: number;
    check_out_staff_id: number;
  }>;
  userNotes: Array<Record<string, unknown>>;
}

function createNotesMockPool(db: MockNotesDb): mysql.Pool {
  let nextId = 500;
  const runSql = async (sql: string, params: unknown[] = []) => {
    const lower = sql.replace(/\s+/g, ' ').trim().toLowerCase();

    if (lower.startsWith('insert into user_note')) {
      const id = ++nextId;
      db.userNotes.push({
        id,
        client_store_id: Number(params[0]),
        user_id: Number(params[1]),
        created_staff_id: Number(params[2]),
        note_field_key: String(params[3]),
        note: String(params[4]),
        attribute_group_key: String(params[5]),
        is_sticky: Number(params[6]),
        is_issue: 0,
        is_disabled: 0,
        date_created: new Date('2026-11-19T06:30:00.000Z'),
        staff_name: 'Thảo Ly',
        staff_avatar: null,
        branch_name: 'CN Đề Thám',
      });
      return [{ insertId: id }, []] as unknown as [mysql.ResultSetHeader, mysql.FieldPacket[]];
    }

    if (lower.startsWith('insert into item_attribute_value')) {
      return [{ affectedRows: 2 }, []] as unknown as [mysql.ResultSetHeader, mysql.FieldPacket[]];
    }

    if (lower.includes('from `order`')) {
      const uid = Number(params[0]);
      return [db.orders.filter((o) => o.user_id === uid), []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ];
    }

    if (lower.includes('from order_service')) {
      const ids = new Set(params.map(Number));
      return [db.services.filter((s) => ids.has(s.order_id)), []] as unknown as [
        mysql.RowDataPacket[],
        mysql.FieldPacket[],
      ];
    }

    if (lower.includes('from report_order_service')) {
      return [[], []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    }

    if (lower.includes('from user_note')) {
      let rows = [...db.userNotes];
      if (lower.includes('un.note_field_key = ?')) {
        const key = String(params[params.length - 1]);
        const uids = new Set(params.slice(0, -1).map(Number));
        rows = rows.filter(
          (r) => uids.has(Number(r.user_id)) && r.note_field_key === key && Number(r.is_disabled || 0) === 0
        );
      } else {
        const uid = Number(params[0]);
        rows = rows.filter((r) => Number(r.user_id) === uid);
      }
      rows.sort((a, b) => Number(b.is_sticky || 0) - Number(a.is_sticky || 0) || Number(b.id) - Number(a.id));
      return [rows, []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    }

    return [[], []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]];
  };

  return {
    query: runSql,
    async getConnection() {
      return {
        beginTransaction: async () => undefined,
        query: runSql,
        commit: async () => undefined,
        rollback: async () => undefined,
        release: () => undefined,
      } as unknown as mysql.PoolConnection;
    },
  } as unknown as mysql.Pool;
}

const CVL_LY: IosAuthContext = {
  id: 10,
  legacyStaffId: 46272,
  clientStoreId: 6,
  displayName: 'Thảo Ly',
  role: 'cvl',
  careerTier: 'CVL',
};

const CVL_OTHER: IosAuthContext = {
  id: 11,
  legacyStaffId: 99001,
  clientStoreId: 6,
  displayName: 'Minh Thư',
  role: 'cvl',
  careerTier: 'CVL',
};

test('UI-010: CVL cannot add post-checkout note for another specialist customer', async () => {
  const db: MockNotesDb = {
    orders: [{ order_id: 7001, order_state: 'Completed', order_assigned_staff_id: 46272, user_id: 33732 }],
    services: [{ order_id: 7001, assigned_staff_id: 46272, check_in_staff_id: 46272, check_out_staff_id: 46272 }],
    userNotes: [],
  };
  const pool = createNotesMockPool(db);

  const res = await createIosCustomerNote(
    CVL_OTHER,
    33732,
    { note: 'Không được phép ghi vào khách người khác', bookingId: 7001 },
    {
      getPool: () => pool,
      overrideRepo: { loadBookingOverride: async () => null },
    }
  );

  assert.equal(res.statusCode, 403);
  assert.equal(res.payload.success, false);
  assert.equal(db.userNotes.length, 0);
});

test('CVL can append sticky note on settled/completed booking from previous days and it loads in batch', async () => {
  const db: MockNotesDb = {
    orders: [{ order_id: 7001, order_state: 'Completed', order_assigned_staff_id: 46272, user_id: 33732 }],
    services: [{ order_id: 7001, assigned_staff_id: 46272, check_in_staff_id: 46272, check_out_staff_id: 46272 }],
    userNotes: [
      {
        id: 12,
        user_id: 33732,
        created_staff_id: 13783,
        note_field_key: 'note',
        note: 'Ghi chú Telesales cũ',
        is_sticky: 0,
        is_issue: 0,
        is_disabled: 0,
        date_created: new Date('2026-10-20T04:00:00.000Z'),
        staff_name: 'CS Team',
        staff_avatar: null,
        branch_name: 'CN Đề Thám',
      },
    ],
  };
  const pool = createNotesMockPool(db);

  const res = await createIosCustomerNote(
    CVL_LY,
    33732,
    {
      note: 'Mắt trái hơi nhạy keo, lần sau dùng băng lụa mềm.',
      isSticky: true,
      bookingId: 7001,
    },
    {
      getPool: () => pool,
      overrideRepo: { loadBookingOverride: async () => null },
      now: () => new Date('2026-11-19T06:30:00.000Z'),
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(res.payload.note?.source, 'CVL');
  assert.equal(res.payload.note?.noteFieldKey, CVL_NOTE_FIELD_KEY);
  assert.equal(res.payload.note?.isSticky, true);

  const cvlBatch = await listIosCustomerCvlNotesBatch(pool, [33732]);
  const customerCvlNotes = cvlBatch.get(33732) || [];
  assert.equal(customerCvlNotes.length, 1);
  assert.equal(customerCvlNotes[0].note, 'Mắt trái hơi nhạy keo, lần sau dùng băng lụa mềm.');

  const allNotes = await listIosCustomerAllNotes(pool, 33732);
  assert.equal(allNotes.length, 2);
  assert.equal(allNotes[0].source, 'CVL');
  assert.equal(allNotes[1].source, 'CRM');
});

test('Simulation mode isolates created CVL notes in crm_config store without writing to user_note', async () => {
  const db: MockNotesDb = { orders: [], services: [], userNotes: [] };
  const pool = createNotesMockPool(db);
  const simStore = createInMemoryConfigStore();

  const res = await createIosCustomerNote(
    CVL_LY,
    33732,
    { note: 'Note mô phỏng tập luyện', isSticky: false, simulationMode: true, bookingId: 990001 },
    {
      getPool: () => pool,
      simStore,
      overrideRepo: { loadBookingOverride: async () => ({ assignedStaffId: 46272 }) },
    }
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.payload.success, true);
  assert.equal(db.userNotes.length, 0, 'Must never write live user_note in simulation mode');

  const allSim = await listIosCustomerAllNotes(pool, 33732, { sim: true, actorStaffId: 46272 }, { simStore });
  assert.equal(allSim.length, 1);
  assert.equal(allSim[0].note, 'Note mô phỏng tập luyện');
});
