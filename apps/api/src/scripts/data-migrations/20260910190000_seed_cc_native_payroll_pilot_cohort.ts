import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const configKey = 'CC_NATIVE_PAYROLL_PILOT_COHORT';
const configValue = JSON.stringify({
  version: 'cc-native-pilot.v1',
  enabled: true,
  subjects: [
    { subjectKey: 'staff:legacy:34295', legacyStaffId: 34295, displayName: 'Thục Nghi' },
    { subjectKey: 'staff:legacy:37790', legacyStaffId: 37790, displayName: 'Diễm Hương' },
    { subjectKey: 'staff:legacy:46092', legacyStaffId: 46092, displayName: 'Quang Khải CC' },
    { subjectKey: 'staff:legacy:48026', legacyStaffId: 48026, displayName: 'Yến Vy' },
  ],
});

/**
 * Activates only the four CCs whose August/September comparison passed. This
 * is mOS configuration, not a Legacy import; it contains identities only and
 * does not create evidence, a period, a settlement or a payout.
 */
const migration: DataMigration = {
  id: '20260910190000_seed_cc_native_payroll_pilot_cohort',
  description: 'Configure the four-person native CC payroll pilot cohort.',
  async preflight(connection) {
    const [rows] = await connection.execute<RowDataPacket[]>('SELECT value FROM crm_config WHERE `key` = ? LIMIT 1', [
      configKey,
    ]);
    const existing = rows[0]?.value;
    if (existing && String(existing) !== configValue) {
      throw new Error('Native CC pilot cohort already exists with a different scope; refusing to overwrite it.');
    }
  },
  async up(connection) {
    await connection.execute(
      'INSERT INTO crm_config (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `key` = `key`',
      [configKey, configValue]
    );
  },
};

export default migration;
