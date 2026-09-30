import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20260930120000_support_workshop_participant_pricing_tiers',
  description:
    'Backfill workshop participant Thanhthanh Dip (id=37) with early bird applied fee 1.500k and support pricing tiers.',
  async preflight(connection) {
    const [tables] = await connection.execute<RowDataPacket[]>("SHOW TABLES LIKE 'crm_academy_workshop_participants'");
    if (!tables || tables.length === 0) {
      throw new Error('crm_academy_workshop_participants table must exist.');
    }
  },
  async up(connection) {
    const [cols] = await connection.execute<RowDataPacket[]>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'crm_academy_workshop_participants'
         AND column_name = 'applied_fee_vnd'`
    );
    if (!cols || cols.length === 0) {
      await connection.execute(
        `ALTER TABLE crm_academy_workshop_participants
         ADD COLUMN applied_fee_vnd INT NULL,
         ADD COLUMN discount_vnd INT NOT NULL DEFAULT 0,
         ADD COLUMN discount_reason VARCHAR(255) NULL`
      );
    }

    await connection.execute(
      `UPDATE crm_academy_workshop_participants
       SET applied_fee_vnd = 1500000,
           discount_vnd = 400000,
           discount_reason = 'Ưu đãi giữ chỗ sớm 1.500k'
       WHERE id = 37`
    );
  },
};

export default migration;
