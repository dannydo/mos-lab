import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const templateTitle = 'Nhà hàng Việt Thái';
const itemDescription = 'Mẫu minh họa · xác nhận lại với nhà hàng trước ngày workshop.';

const menuItems = [
  { category: 'JUICE', name: 'Nước ép cam', imageUrl: '/academy/viet-thai-menu/orange-juice.webp' },
  { category: 'JUICE', name: 'Nước ép thơm', imageUrl: '/academy/viet-thai-menu/pineapple-juice.webp' },
  { category: 'JUICE', name: 'Nước ép dưa hấu', imageUrl: '/academy/viet-thai-menu/watermelon-juice.webp' },
  { category: 'MAIN_COURSE', name: 'Cơm chiên hải sản', imageUrl: '/academy/viet-thai-menu/seafood-fried-rice.webp' },
  { category: 'MAIN_COURSE', name: 'Mì xào bò', imageUrl: '/academy/viet-thai-menu/beef-noodles.webp' },
  {
    category: 'MAIN_COURSE',
    name: 'Gà nướng mật ong ăn kèm cơm',
    imageUrl: '/academy/viet-thai-menu/honey-grilled-chicken-rice.webp',
  },
  { category: 'DESSERT', name: 'Rau câu dừa', imageUrl: '/academy/viet-thai-menu/coconut-jelly.webp' },
  { category: 'DESSERT', name: 'Trái cây theo mùa', imageUrl: '/academy/viet-thai-menu/seasonal-fruit.webp' },
  { category: 'DESSERT', name: 'Chè khúc bạch', imageUrl: '/academy/viet-thai-menu/che-khuc-bach.webp' },
] as const;

const migration: DataMigration = {
  id: '20260830090000_seed_academy_workshop_viet_thai_menu_template',
  description: 'Add the reusable nine-choice Việt Thái workshop menu template.',
  async preflight(connection) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name IN ('crm_academy_workshop_menu_templates', 'crm_academy_workshop_menu_template_items')`
    );
    if (Number(rows[0]?.count || 0) !== 2) {
      throw new Error('Workshop menu template tables must exist before seeding the Việt Thái menu.');
    }
  },
  async up(connection) {
    const [existingRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM crm_academy_workshop_menu_templates WHERE title = ? LIMIT 1',
      [templateTitle]
    );
    let templateId = Number(existingRows[0]?.id || 0);
    if (!templateId) {
      const [created] = await connection.execute<ResultSetHeader>(
        `INSERT INTO crm_academy_workshop_menu_templates (title, created_at, updated_at)
         VALUES (?, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
        [templateTitle]
      );
      templateId = created.insertId;
    }

    const [itemRows] = await connection.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM crm_academy_workshop_menu_template_items WHERE template_id = ?',
      [templateId]
    );
    if (Number(itemRows[0]?.count || 0) > 0) return;

    for (const [index, item] of menuItems.entries()) {
      await connection.execute(
        `INSERT INTO crm_academy_workshop_menu_template_items
          (template_id, category, name, description, image_url, sort_order, is_available, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
        [templateId, item.category, item.name, itemDescription, item.imageUrl, index + 1]
      );
    }
  },
};

export default migration;
