import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const sampleMenu = [
  ['JUICE', 'Nước ép cam', 'Mẫu minh họa · xác nhận lại với nhà hàng trước ngày workshop.'],
  ['JUICE', 'Nước ép thơm', 'Mẫu minh họa · xác nhận lại với nhà hàng trước ngày workshop.'],
  ['JUICE', 'Nước ép dưa hấu', 'Mẫu minh họa · xác nhận lại với nhà hàng trước ngày workshop.'],
  ['MAIN_COURSE', 'Cơm chiên hải sản', 'Mẫu minh họa · xác nhận lại với nhà hàng trước ngày workshop.'],
  ['MAIN_COURSE', 'Mì xào bò', 'Mẫu minh họa · xác nhận lại với nhà hàng trước ngày workshop.'],
  ['MAIN_COURSE', 'Gà nướng mật ong ăn kèm cơm', 'Mẫu minh họa · xác nhận lại với nhà hàng trước ngày workshop.'],
  ['DESSERT', 'Rau câu dừa', 'Mẫu minh họa · xác nhận lại với nhà hàng trước ngày workshop.'],
  ['DESSERT', 'Trái cây theo mùa', 'Mẫu minh họa · xác nhận lại với nhà hàng trước ngày workshop.'],
  ['DESSERT', 'Chè khúc bạch', 'Mẫu minh họa · xác nhận lại với nhà hàng trước ngày workshop.'],
] as const;

const migration: DataMigration = {
  id: '20260827120000_seed_academy_workshop_viet_thai_menu',
  description: 'Seed an editable three-course Việt Thái menu for the Tháng Cô Hồn workshop registration flow.',
  async preflight(connection) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'crm_academy_workshop_menu_items'`
    );
    if (Number(rows[0]?.count || 0) !== 1) {
      throw new Error('crm_academy_workshop_menu_items must exist before seeding the Việt Thái menu.');
    }
  },
  async up(connection) {
    const [workshops] = await connection.execute<RowDataPacket[]>(
      `SELECT w.id
       FROM crm_academy_workshops w
       INNER JOIN crm_academy_campaigns c ON c.id = w.campaign_id
       WHERE c.slug = 'thang-co-hon' AND c.deleted_at IS NULL
       LIMIT 1`
    );
    const workshopId = Number(workshops[0]?.id || 0);
    if (!workshopId) return;

    const [existingRows] = await connection.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM crm_academy_workshop_menu_items WHERE workshop_id = ?',
      [workshopId]
    );
    if (Number(existingRows[0]?.count || 0) > 0) return;

    for (const [index, item] of sampleMenu.entries()) {
      await connection.execute(
        `INSERT INTO crm_academy_workshop_menu_items
          (workshop_id, category, name, description, sort_order, is_available, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
        [workshopId, item[0], item[1], item[2], index + 1]
      );
    }
  },
};

export default migration;
