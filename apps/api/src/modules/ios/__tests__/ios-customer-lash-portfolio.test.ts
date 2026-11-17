import test from 'node:test';
import assert from 'node:assert/strict';
import type mysql from 'mysql2/promise';
import { getIosCustomerHistory } from '../services/ios-customer-history.service.js';
import type { IosAuthContext } from '../services/ios-auth.service.js';
import type { OverrideBatchReader } from '../services/ios-customer-history-lashes.helper.js';

interface MockPortfolioDb {
  customer: Record<string, unknown>;
  orders: Array<Record<string, unknown>>;
  services: Array<Record<string, unknown>>;
  progressRows: Array<Record<string, unknown>>;
  attrRows: Array<Record<string, unknown>>;
  retainRows: Array<Record<string, unknown>>;
  diamondTxns: Array<Record<string, unknown>>;
}

function createPortfolioMockPool(db: MockPortfolioDb): mysql.Pool {
  return {
    async query(sql: string, params: unknown[] = []) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      const lower = normalized.toLowerCase();

      if (lower.includes('from order_service_progress')) {
        const osIds = new Set(params.map((p) => Number(p)));
        const rows = db.progressRows.filter((r) => osIds.size === 0 || osIds.has(Number(r.order_service_id)));
        return [rows, []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]];
      }

      if (lower.includes('from item_attribute_value')) {
        if (lower.includes('service-retain-attribute')) {
          const osIds = new Set(params.map((p) => Number(p)));
          const rows = db.retainRows.filter((r) => osIds.size === 0 || osIds.has(Number(r.item_id)));
          return [rows, []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]];
        }
        const keys = new Set(params.map((p) => String(p)));
        const rows = db.attrRows.filter((r) => keys.size === 0 || keys.has(String(r.groupKey)));
        return [rows, []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]];
      }

      if (lower.includes('from order_service')) {
        const numericParams = params.map((p) => Number(p)).filter((n) => Number.isFinite(n) && n > 0);
        if (numericParams.length > 0 && lower.includes('order_id')) {
          const oidSet = new Set(numericParams);
          return [db.services.filter((s) => oidSet.has(Number(s.order_id))), []] as unknown as [
            mysql.RowDataPacket[],
            mysql.FieldPacket[],
          ];
        }
        return [db.services, []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]];
      }

      if (lower.includes('diamond')) {
        return [db.diamondTxns, []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]];
      }

      if (/from\s+`?order`?\b/i.test(normalized)) {
        if ((lower.includes('o.id = ?') || /\bid\s*=\s*\?/.test(lower)) && params.length > 0) {
          const oid = Number(params[0]);
          return [db.orders.filter((o) => Number(o.order_id) === oid), []] as unknown as [
            mysql.RowDataPacket[],
            mysql.FieldPacket[],
          ];
        }
        return [db.orders, []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]];
      }

      if (/from\s+`?user`?\b/i.test(normalized)) {
        return [[db.customer], []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]];
      }

      return [[], []] as unknown as [mysql.RowDataPacket[], mysql.FieldPacket[]];
    },
  } as unknown as mysql.Pool;
}

const PORTFOLIO_DB: MockPortfolioDb = {
  customer: {
    id: 44100,
    name: 'Minh Thư',
    fullname: 'Minh Thư',
    full_name: 'Minh Thư',
    customer_name: 'Minh Thư',
    phone: '0909123456',
    customer_phone: '0909123456',
    diamond: 200,
    balance: 200,
    diamond_balance: 200,
  },
  orders: [
    {
      order_id: 9101,
      order_state: 'CheckIn',
      booking_date_start: '2026-11-17T02:00:00.000Z',
      date_created: '2026-11-17T01:45:00.000Z',
      total_price: 920000,
      booking_note: 'Khách nối cả mi trên và mi dưới hôm nay',
      client_store_id: 6,
      is_debt: 0,
      order_assigned_staff_id: 46272,
      branch_name: 'Điện Biên Phủ',
    },
    {
      order_id: 9100,
      order_state: 'Completed',
      booking_date_start: '2026-10-15T03:00:00.000Z',
      date_created: '2026-10-15T02:30:00.000Z',
      total_price: 890000,
      booking_note: 'Dáng thiết kế tự nhiên, giữ cong CC',
      client_store_id: 6,
      is_debt: 0,
      order_assigned_staff_id: 46272,
      branch_name: 'Điện Biên Phủ',
    },
    {
      order_id: 9200,
      order_state: 'New',
      booking_date_start: '2026-11-17T05:00:00.000Z',
      date_created: '2026-11-17T04:00:00.000Z',
      total_price: 770000,
      booking_note: null,
      client_store_id: 6,
      is_debt: 0,
      order_assigned_staff_id: 99888,
      branch_name: 'Đề Thám',
    },
  ],
  services: [
    {
      order_id: 9101,
      os_id: 6101,
      service_id: 101,
      service_group: 'Lashes',
      attribute_group_key: 'gk-9101-upper',
      service_type: 'Normal',
      user_service_type: 'Normal',
      user_service_balance_transaction_id: null,
      total_price: 770000,
      assigned_staff_id: 46272,
      check_in_staff_id: 46272,
      check_out_staff_id: null,
      service_name: 'Hyperlight 770',
      assigned_staff_name: 'Thảo Ly',
      assigned_staff_avatar: null,
      check_in_staff_name: 'Thảo Ly',
      check_in_staff_avatar: null,
      check_out_staff_name: null,
      check_out_staff_avatar: null,
    },
    {
      order_id: 9101,
      os_id: 6102,
      service_id: 127,
      service_group: 'LashesUnder',
      attribute_group_key: 'gk-9101-under',
      service_type: 'Normal',
      user_service_type: 'Normal',
      user_service_balance_transaction_id: null,
      total_price: 150000,
      assigned_staff_id: 46272,
      check_in_staff_id: 46272,
      check_out_staff_id: null,
      service_name: 'Mi Dưới Chồn 150K',
      assigned_staff_name: 'Thảo Ly',
      assigned_staff_avatar: null,
      check_in_staff_name: 'Thảo Ly',
      check_in_staff_avatar: null,
      check_out_staff_name: null,
      check_out_staff_avatar: null,
    },
    {
      order_id: 9100,
      os_id: 6100,
      service_id: 101,
      service_group: 'Lashes',
      attribute_group_key: 'gk-9100-upper',
      service_type: 'Retain',
      user_service_type: 'Normal',
      user_service_balance_transaction_id: null,
      total_price: 890000,
      assigned_staff_id: 46272,
      check_in_staff_id: 46272,
      check_out_staff_id: 46272,
      service_name: 'Hyperlight 770 (Lần trước)',
      assigned_staff_name: 'Thảo Ly',
      assigned_staff_avatar: null,
      check_in_staff_name: 'Thảo Ly',
      check_in_staff_avatar: null,
      check_out_staff_name: 'Thảo Ly',
      check_out_staff_avatar: null,
    },
    {
      order_id: 9200,
      os_id: 6200,
      service_id: 101,
      service_group: 'Lashes',
      attribute_group_key: 'gk-9200-upper',
      service_type: 'Normal',
      user_service_type: 'Normal',
      user_service_balance_transaction_id: null,
      total_price: 770000,
      assigned_staff_id: 99888,
      check_in_staff_id: null,
      check_out_staff_id: null,
      service_name: 'Hyperlight 770',
      assigned_staff_name: 'Quỳnh Anh',
      assigned_staff_avatar: null,
      check_in_staff_name: null,
      check_in_staff_avatar: null,
      check_out_staff_name: null,
      check_out_staff_avatar: null,
    },
  ],
  progressRows: [
    // Visit 9101 Upper (3 stages)
    {
      id: 70001,
      order_service_id: 6101,
      service_state: 'ServiceStart',
      image_filename: 'u_before',
      image_extension: 'jpg',
    },
    {
      id: 70002,
      order_service_id: 6101,
      service_state: 'ServiceCleaned',
      image_filename: 'u_clean',
      image_extension: 'jpg',
    },
    {
      id: 70003,
      order_service_id: 6101,
      service_state: 'ServiceEnd',
      image_filename: 'u_after',
      image_extension: 'jpg',
    },
    // Visit 9101 Under (3 stages)
    {
      id: 70004,
      order_service_id: 6102,
      service_state: 'ServiceStart',
      image_filename: 'under_before',
      image_extension: 'jpg',
    },
    {
      id: 70005,
      order_service_id: 6102,
      service_state: 'ServiceCleaned',
      image_filename: 'under_clean',
      image_extension: 'jpg',
    },
    {
      id: 70006,
      order_service_id: 6102,
      service_state: 'ServiceEnd',
      image_filename: 'under_after',
      image_extension: 'jpg',
    },
    // Visit 9100 Upper (3 stages)
    {
      id: 70007,
      order_service_id: 6100,
      service_state: 'ServiceStart',
      image_filename: 'old_before',
      image_extension: 'jpg',
    },
    {
      id: 70008,
      order_service_id: 6100,
      service_state: 'ServiceCleaned',
      image_filename: 'old_clean',
      image_extension: 'jpg',
    },
    {
      id: 70009,
      order_service_id: 6100,
      service_state: 'ServiceEnd',
      image_filename: 'old_after',
      image_extension: 'jpg',
    },
  ],
  attrRows: [
    { groupKey: 'gk-9101-upper', itemGroupId: 101, attribute_id: 10, val: 'Katun' },
    { groupKey: 'gk-9101-upper', itemGroupId: 101, attribute_id: 9, val: 'Cong CC' },
    { groupKey: 'gk-9101-upper', itemGroupId: 101, attribute_id: 15, val: '0.07mm' },
    { groupKey: 'gk-9101-upper', itemGroupId: 101, attribute_id: 11, val: '11mm' },
    { groupKey: 'gk-9101-upper', itemGroupId: 101, attribute_id: 11, val: '9mm' },
    { groupKey: 'gk-9101-upper', itemGroupId: 101, attribute_id: 12, val: '120 sợi' },
    { groupKey: 'gk-9101-upper', itemGroupId: 101, attribute_id: 13, val: '5D' },
    { groupKey: 'gk-9101-upper', itemGroupId: 101, attribute_id: 14, val: 'Đen tuyền' },
    { groupKey: 'gk-9100-upper', itemGroupId: 101, attribute_id: 10, val: 'Dáng Wing' },
    { groupKey: 'gk-9100-upper', itemGroupId: 101, attribute_id: 9, val: 'C' },
    { groupKey: 'gk-9100-upper', itemGroupId: 101, attribute_id: 11, val: '10mm' },
  ],
  retainRows: [
    { item_id: 6100, attribute_id: 17, attribute_option_value: '28' },
    { item_id: 6100, attribute_id: 18, attribute_option_value: '32' },
  ],
  diamondTxns: [],
};

test('getIosCustomerHistory hydrates Upper + Under 3-stage photos, #9..#15 specs, and retain #17/#18 counts', async () => {
  const adminActor: IosAuthContext = {
    id: 1,
    legacyStaffId: 46272,
    role: 'super_admin',
    careerTier: 'ADMIN',
  };

  const mockOverrideRepo: OverrideBatchReader = {
    async loadBookingOverridesBatch() {
      return {
        '9100': {
          progress: {
            // Hides declined photo from customer-facing portfolio
            cleanedPhotoUrl: 'DECLINED:Khach khong muon chup buoc 2',
            afterPhotoUrl: 'https://crm.wings.test/overrides/9100-after.jpg',
          },
        },
      };
    },
  };

  const res = await getIosCustomerHistory(
    adminActor,
    44100,
    { bookingId: 9101, now: new Date('2026-11-17T08:00:00.000Z') },
    {
      getPool: () => createPortfolioMockPool(PORTFOLIO_DB),
      overrideRepo: mockOverrideRepo,
    }
  );

  assert.equal(res.statusCode, 200);
  const visitToday = res.payload.visits.find((v) => v.orderId === 9101);
  assert.ok(visitToday, 'Expected visit #9101 to exist');
  assert.equal(visitToday.photos?.length, 3);
  assert.deepEqual(
    visitToday.photos?.map((p) => p.type),
    ['before', 'cleaned', 'after']
  );
  assert.ok(visitToday.photos?.[0].url.includes('u_before'));
  assert.equal(visitToday.underServiceName, 'Mi Dưới Chồn 150K');
  assert.equal(visitToday.underPhotos?.length, 3);
  assert.deepEqual(
    visitToday.underPhotos?.map((p) => p.type),
    ['before', 'cleaned', 'after']
  );
  assert.ok(visitToday.underPhotos?.[2].url.includes('under_after'));

  const upperSpecToday = visitToday.lashSpecs?.find((s) => !s.isUnder);
  assert.ok(upperSpecToday);
  assert.equal(upperSpecToday.style, 'Katun');
  assert.equal(upperSpecToday.curl, 'Cong CC');
  assert.equal(upperSpecToday.thickness, '0.07mm');
  assert.equal(upperSpecToday.length, '9mm, 11mm');
  assert.equal(upperSpecToday.strandCount, '120 sợi');
  assert.equal(upperSpecToday.fan, '5D');
  assert.equal(upperSpecToday.color, 'Đen tuyền');

  const pastVisit = res.payload.visits.find((v) => v.orderId === 9100);
  assert.ok(pastVisit, 'Expected visit #9100 to exist');
  // DECLINED: override removes cleaned photo, leaving before + overridden after
  assert.equal(pastVisit.photos?.length, 2);
  assert.deepEqual(
    pastVisit.photos?.map((p) => p.type),
    ['before', 'after']
  );
  assert.equal(pastVisit.photos?.[1].url, 'https://crm.wings.test/overrides/9100-after.jpg');
  const pastSpec = pastVisit.lashSpecs?.[0];
  assert.ok(pastSpec);
  assert.equal(pastSpec.retainLeft, 28);
  assert.equal(pastSpec.retainRight, 32);
});

test('CVL UI-010 blocks customer history with 403 when target booking belongs to another staff', async () => {
  const cvlActor: IosAuthContext = {
    id: 11,
    legacyStaffId: 46272,
    role: 'cvl',
    careerTier: 'CVL',
  };

  const blocked = await getIosCustomerHistory(
    cvlActor,
    44100,
    { bookingId: 9200 },
    {
      getPool: () =>
        createPortfolioMockPool({
          ...PORTFOLIO_DB,
          orders: PORTFOLIO_DB.orders.filter((o) => o.order_id === 9200),
          services: PORTFOLIO_DB.services.filter((s) => s.order_id === 9200),
        }),
      overrideRepo: {
        async loadBookingOverridesBatch() {
          return {};
        },
      },
    }
  );

  assert.equal(blocked.statusCode, 403);
  assert.equal(blocked.payload.success, false);
});
