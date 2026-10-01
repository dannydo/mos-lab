import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20261001130000_update_workshop_k02_fee_and_equipment_policy',
  description:
    'Update Workshop Doi Van K02 standard fee to 1.990.000d and set equipment packages: 299k basic (deposit) and 499k practice combo (free upgrade on full payment).',
  async preflight(connection) {
    const [workshops] = await connection.execute<RowDataPacket[]>("SHOW TABLES LIKE 'crm_academy_workshops'");
    if (!workshops || workshops.length === 0) {
      throw new Error('crm_academy_workshops table must exist.');
    }
    const [equipment] = await connection.execute<RowDataPacket[]>(
      "SHOW TABLES LIKE 'crm_academy_workshop_equipment_packages'"
    );
    if (!equipment || equipment.length === 0) {
      throw new Error('crm_academy_workshop_equipment_packages table must exist.');
    }
  },
  async up(connection) {
    // 1. Update workshop fee to 1.990.000d (1990k)
    await connection.execute(
      `UPDATE crm_academy_workshops
       SET fee_vnd = 1990000
       WHERE campaign_id IN (
         SELECT id FROM crm_academy_campaigns WHERE slug IN ('workshop-doi-van-k02', 'workshop-doi-van')
       )`
    );

    // 2. Find workshop id for workshop-doi-van-k02
    const [workshopRows] = await connection.execute<RowDataPacket[]>(
      `SELECT w.id FROM crm_academy_workshops w
       JOIN crm_academy_campaigns c ON w.campaign_id = c.id
       WHERE c.slug = 'workshop-doi-van-k02'`
    );

    for (const row of workshopRows) {
      const workshopId = row.id;

      // Update 299k basic package
      await connection.execute(
        `UPDATE crm_academy_workshop_equipment_packages
         SET price_vnd = 299000,
             is_included_in_fee = 0
         WHERE workshop_id = ? AND name LIKE '%Cơ Bản%'`,
        [workshopId]
      );

      // Update 499k upgrade package (included free on full payment)
      await connection.execute(
        `UPDATE crm_academy_workshop_equipment_packages
         SET price_vnd = 499000,
             is_included_in_fee = 1
         WHERE workshop_id = ? AND name LIKE '%Luyện Tập%'`,
        [workshopId]
      );
    }

    // 3. Also update equipment template packages for template_id = 2
    await connection.execute(
      `UPDATE crm_academy_workshop_equipment_template_packages
       SET price_vnd = 299000,
           is_included_in_fee = 0
       WHERE template_id = 2 AND name LIKE '%Cơ Bản%'`
    );

    await connection.execute(
      `UPDATE crm_academy_workshop_equipment_template_packages
       SET price_vnd = 499000,
           is_included_in_fee = 1
       WHERE template_id = 2 AND name LIKE '%Luyện Tập%'`
    );
  },
};

export default migration;
