import mysql, { type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20261013160000_seed_lash_lift_service',
  description: 'Bổ sung dịch vụ LASH LIFT (Uốn mi) giá tạm tính 990.000 VNĐ vào hệ thống mOS',
  async preflight(_connection: PoolConnection) {
    // Read-only safety checks
  },
  async up(connection: PoolConnection) {
    // 1. Record configuration in crm_config table in CRM DB
    await connection.execute(
      `INSERT INTO crm_config (\`key\`, \`value\`, \`updated_at\`)
       VALUES ('LASH_LIFT_SERVICE_CONFIG', ?, NOW())
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), \`updated_at\` = NOW()`,
      [
        JSON.stringify({
          serviceKey: 'lash-lift',
          serviceName: 'LASH LIFT (Uốn mi)',
          serviceNameVi: 'Uốn mi',
          price: 990000,
          currency: 'VND',
          durationMinute: 60,
          serviceGroup: 'LashLift',
          serviceType: 'Normal',
        }),
      ]
    );

    // 2. Connect to legacy database if LEGACY_DATABASE_URL is provided
    const legacyUrl = process.env.LEGACY_DATABASE_URL?.replace(/^['"]|['"]$/g, '');
    let legacyConn: mysql.Connection | null = null;
    try {
      if (legacyUrl) {
        legacyConn = await mysql.createConnection(legacyUrl);
      }
    } catch {
      legacyConn = null;
    }

    const targetConn = legacyConn || connection;

    try {
      // Check if table service exists in the target database
      const [serviceTable] = await targetConn.execute<RowDataPacket[]>(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'service'`
      );

      if (serviceTable.length > 0) {
        // Query if lash-lift exists
        const [existing] = await targetConn.execute<RowDataPacket[]>(
          `SELECT id FROM service WHERE service_key = 'lash-lift' LIMIT 1`
        );

        let serviceId: number;
        if (existing.length === 0) {
          const [templateRows] = await targetConn.execute<RowDataPacket[]>(
            `SELECT client_id, client_business_id, profile_attribute_set_id, customer_survey_set_id, staff_survey_set_id FROM service WHERE client_id IS NOT NULL LIMIT 1`
          );
          const clientId = templateRows[0]?.client_id ?? 11;
          const clientBusinessId = templateRows[0]?.client_business_id ?? 1;
          const profileAttrId = templateRows[0]?.profile_attribute_set_id ?? 1;
          const customerSurveyId = templateRows[0]?.customer_survey_set_id ?? 1;
          const staffSurveyId = templateRows[0]?.staff_survey_set_id ?? 4;

          const [insertRes] = await targetConn.execute<ResultSetHeader>(
            `INSERT INTO service (
              client_id, client_business_id, service_key, service_type, service_group,
              duration_minute, duration_minute_standard, remind_interval_day, last_day_required,
              position, is_temporary, is_disabled, date_created, date_updated,
              profile_attribute_set_id, customer_survey_set_id, staff_survey_set_id
            ) VALUES (?, ?, 'lash-lift', 'Normal', 'LashLift', 60, 60, 0, 0, 1, 0, 0, NOW(), NOW(), ?, ?, ?)`,
            [clientId, clientBusinessId, profileAttrId, customerSurveyId, staffSurveyId]
          );
          serviceId = Number(insertRes.insertId);

          await targetConn.execute(
            `INSERT INTO service_language (
              service_id, language_id, service_name, service_short_description, service_description
            ) VALUES (?, 1, 'LASH LIFT (Uốn mi)', 'Uốn mi', 'Dịch vụ Uốn mi LASH LIFT tại Wings Lashes')`,
            [serviceId]
          );

          await targetConn.execute(
            `INSERT INTO service_price (
              service_id, currency_id, service_price_package_key, service_price_type, service_price_group,
              service_price, include_service_ids, exclude_service_ids,
              normal_count, retain_count, bonus_normal_count, bonus_retain_count,
              per_normal_price, per_retain_price, normal_last_day_required, retain_last_day_required,
              expiry_after_day, limit_share_count, position,
              is_contract_required, is_same_count, is_old_user_disabled, is_disabled
            ) VALUES (?, 2, 'single', 'Single', 'Single', 990000, ?, '', 1, 0, 0, 0, 990000, 990000, 0, 0, 0, 0, 1, 0, 0, 0, 0)`,
            [serviceId, String(serviceId)]
          );
        } else {
          serviceId = Number(existing[0].id);
          await targetConn.execute(
            `UPDATE service_language SET service_name = 'LASH LIFT (Uốn mi)', service_short_description = 'Uốn mi' WHERE service_id = ? AND language_id = 1`,
            [serviceId]
          );
          await targetConn.execute(
            `UPDATE service_price SET service_price = 990000, per_normal_price = 990000 WHERE service_id = ? AND service_price_package_key = 'single' AND currency_id = 2`,
            [serviceId]
          );
        }
      }
    } finally {
      if (legacyConn) {
        await legacyConn.end();
      }
    }
  },
};

export default migration;
