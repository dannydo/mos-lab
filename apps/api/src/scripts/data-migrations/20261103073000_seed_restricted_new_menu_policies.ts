import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const NEW_MENU_KEYS = [
  'financial-goals',
  'telesale-competency',
  'bug-reports',
  'finance-funds-manage',
  'finance-cash-flow',
  'category:finance',
];

const migration: DataMigration = {
  id: '20261103073000_seed_restricted_new_menu_policies',
  description:
    'Thiết lập mặc định giới hạn quyền truy cập (is_restricted = 1) cho tất cả các menu item mới (financial-goals, telesale-competency, bug-reports, finance-funds-manage, finance-cash-flow)',
  async preflight(_connection: PoolConnection) {
    // Read-only check
  },
  async up(connection: PoolConnection) {
    const [tables] = await connection.execute<RowDataPacket[]>("SHOW TABLES LIKE 'crm_menu_access_policies'");
    if (!Array.isArray(tables) || tables.length === 0) {
      return;
    }

    const now = new Date();
    for (const menuKey of NEW_MENU_KEYS) {
      const [existing] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM crm_menu_access_policies WHERE menu_key = ?',
        [menuKey]
      );
      if (!Array.isArray(existing) || existing.length === 0) {
        await connection.execute(
          'INSERT INTO crm_menu_access_policies (menu_key, is_restricted, created_at, updated_at) VALUES (?, 1, ?, ?)',
          [menuKey, now, now]
        );
      }
    }
  },
};

export default migration;
