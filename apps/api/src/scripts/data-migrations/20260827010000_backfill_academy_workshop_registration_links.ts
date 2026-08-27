import { createHash } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20260827010000_backfill_academy_workshop_registration_links',
  description: 'Backfill unique public registration codes for existing Academy workshops.',
  async preflight(connection) {
    const [columns] = await connection.execute<RowDataPacket[]>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'crm_academy_workshops' AND column_name = 'registration_code'`
    );
    if (columns.length === 0) {
      throw new Error('crm_academy_workshops.registration_code must exist before this data migration runs.');
    }
  },
  async up(connection) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT id, display_code FROM crm_academy_workshops WHERE registration_code IS NULL OR registration_code = ''`
    );
    for (const row of rows) {
      const code = createHash('sha256')
        .update(`academy-registration:${row.id}:${row.display_code}`)
        .digest('base64url')
        .slice(0, 24);
      await connection.execute(`UPDATE crm_academy_workshops SET registration_code = ? WHERE id = ?`, [code, row.id]);
    }
  },
};

export default migration;
