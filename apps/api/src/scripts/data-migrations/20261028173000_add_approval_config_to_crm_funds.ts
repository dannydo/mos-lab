import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20261028173000_add_approval_config_to_crm_funds',
  description:
    'Bổ sung trường approval_config_json vào bảng crm_funds để lưu trữ cấu hình quy trình phê duyệt đa cấp theo MOS-FEAT-177',
  async preflight(_connection: PoolConnection) {
    // Read-only preflight check
  },
  async up(connection: PoolConnection) {
    const [tables] = await connection.execute<RowDataPacket[]>(
      "SHOW TABLES LIKE 'crm_funds'"
    );
    if (!Array.isArray(tables) || tables.length === 0) {
      return;
    }

    const [cols] = await connection.execute<RowDataPacket[]>(
      "SHOW COLUMNS FROM crm_funds LIKE 'approval_config_json'"
    );
    if (!Array.isArray(cols) || cols.length === 0) {
      await connection.execute(`
        ALTER TABLE crm_funds ADD COLUMN approval_config_json TEXT NULL AFTER tolerance_amount
      `);
    }
  },
};

export default migration;
