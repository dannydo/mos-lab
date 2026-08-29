import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const templateTitle = 'Nhà hàng Việt Hàn';
const templateDescription =
  'Thực đơn Việt–Hàn với món chính lấy cảm hứng từ ẩm thực Hàn Quốc; xác nhận lại với nhà hàng trước ngày workshop.';
const itemDescription = 'Mẫu minh họa · xác nhận lại với nhà hàng trước ngày workshop.';

// Keep the same three-group, nine-choice shape as Nhà hàng Việt Thái so the
// registration flow remains familiar and every card has a ready image asset.
const menuItems = [
  { category: 'JUICE', name: 'Nước ép cam', imageUrl: '/academy/viet-thai-menu/orange-juice.webp' },
  { category: 'JUICE', name: 'Nước ép thơm', imageUrl: '/academy/viet-thai-menu/pineapple-juice.webp' },
  { category: 'JUICE', name: 'Nước ép dưa hấu', imageUrl: '/academy/viet-thai-menu/watermelon-juice.webp' },
  {
    category: 'MAIN_COURSE',
    name: 'Cơm trộn bulgogi & rau củ',
    imageUrl: '/academy/viet-thai-menu/seafood-fried-rice.webp',
  },
  { category: 'MAIN_COURSE', name: 'Miến xào japchae bò', imageUrl: '/academy/viet-thai-menu/beef-noodles.webp' },
  {
    category: 'MAIN_COURSE',
    name: 'Gà nướng gochujang ăn kèm cơm',
    imageUrl: '/academy/viet-thai-menu/honey-grilled-chicken-rice.webp',
  },
  { category: 'DESSERT', name: 'Rau câu dừa', imageUrl: '/academy/viet-thai-menu/coconut-jelly.webp' },
  { category: 'DESSERT', name: 'Trái cây theo mùa', imageUrl: '/academy/viet-thai-menu/seasonal-fruit.webp' },
  { category: 'DESSERT', name: 'Chè khúc bạch', imageUrl: '/academy/viet-thai-menu/che-khuc-bach.webp' },
] as const;

const migration: DataMigration = {
  id: '20260829130000_seed_academy_workshop_viet_han_menu_template',
  description: 'Add the reusable nine-choice Việt Hàn workshop menu template.',
  async preflight(connection) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name IN ('crm_academy_workshop_menu_templates', 'crm_academy_workshop_menu_template_items')`
    );
    if (Number(rows[0]?.count || 0) !== 2) {
      throw new Error('Workshop menu template tables must exist before seeding the Việt Hàn menu.');
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
        `INSERT INTO crm_academy_workshop_menu_templates
          (title, description, created_at, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
        [templateTitle, templateDescription]
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
