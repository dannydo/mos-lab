import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20261014100000_reconcile_nyc_campaign_touchpoints_and_completed_visits',
  description:
    'Align NYC Main Campaign touchpoint definitions (24h, Úc 2-3d, 14d, 19d, 21d) and reconcile user_profile.last_order_booking to canonical completed order dates.',
  async preflight(connection: PoolConnection) {
    const [configs] = await connection.execute<RowDataPacket[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'crm_config'`
    );
    if (configs.length === 0) {
      throw new Error('crm_config table must exist in CRM database.');
    }

    const [profiles] = await connection.execute<RowDataPacket[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'management' AND table_name = 'user_profile'`
    );
    if (profiles.length === 0) {
      throw new Error('management.user_profile table must exist.');
    }
  },
  async up(connection: PoolConnection) {
    // 1. Update NYC_TOUCHPOINTS_CONFIG in CRM config table
    const [existingConfig] = await connection.execute<RowDataPacket[]>(
      `SELECT \`value\` FROM crm_config WHERE \`key\` = 'NYC_TOUCHPOINTS_CONFIG' LIMIT 1`
    );

    let configObj: Record<string, unknown[]> = {};
    if (existingConfig.length > 0 && existingConfig[0]?.value) {
      try {
        configObj = JSON.parse(existingConfig[0].value);
      } catch {
        configObj = {};
      }
    }

    configObj.NYC_30 = [
      { key: 'now', label: 'Chăm sóc 24h', daysMin: 0, daysMax: 1, color: 'blue' },
      { key: '3', label: 'Bảo hành kiểu Úc', daysMin: 2, daysMax: 3, color: 'cyan' },
      { key: '7', label: 'Chạm 14', daysMin: 14, daysMax: 14, color: 'green' },
      { key: '17', label: 'Chạm 19', daysMin: 19, daysMax: 19, color: 'orange' },
      { key: '21', label: 'Chạm 21', daysMin: 21, daysMax: 21, color: 'red' },
    ];

    await connection.execute(
      `INSERT INTO crm_config (\`key\`, \`value\`, updated_at)
       VALUES ('NYC_TOUCHPOINTS_CONFIG', ?, NOW())
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updated_at = NOW()`,
      [JSON.stringify(configObj)]
    );

    // 2. Reconcile user_profile.last_order_booking to canonical completed order dates
    await connection.execute(`
      UPDATE management.user_profile up
      JOIN (
        SELECT o.user_id, MAX(COALESCE(ro.actual_booking_date_start, o.booking_date_start)) AS max_completed_booking
        FROM management.\`order\` o
        LEFT JOIN management.report_order ro ON o.id = ro.order_id
        WHERE o.order_state = 'Completed'
        GROUP BY o.user_id
      ) canonical ON up.user_id = canonical.user_id
      SET up.last_order_booking = canonical.max_completed_booking
      WHERE (up.last_order_booking IS NULL OR up.last_order_booking != canonical.max_completed_booking)
    `);

    // 3. Clear last_order_booking for profiles with zero completed orders
    await connection.execute(`
      UPDATE management.user_profile up
      LEFT JOIN (
        SELECT DISTINCT user_id FROM management.\`order\` WHERE order_state = 'Completed'
      ) has_completed ON up.user_id = has_completed.user_id
      SET up.last_order_booking = NULL
      WHERE has_completed.user_id IS NULL AND up.last_order_booking IS NOT NULL
    `);
  },
};

export default migration;
