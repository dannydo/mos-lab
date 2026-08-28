import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const imageByItemName = new Map([
  ['Nước ép cam', '/academy/viet-thai-menu/orange-juice.png'],
  ['Nước ép thơm', '/academy/viet-thai-menu/pineapple-juice.png'],
  ['Nước ép dưa hấu', '/academy/viet-thai-menu/watermelon-juice.png'],
  ['Cơm chiên hải sản', '/academy/viet-thai-menu/seafood-fried-rice.png'],
  ['Mì xào bò', '/academy/viet-thai-menu/beef-noodles.png'],
  ['Gà nướng mật ong ăn kèm cơm', '/academy/viet-thai-menu/honey-grilled-chicken-rice.png'],
  ['Rau câu dừa', '/academy/viet-thai-menu/coconut-jelly.png'],
  ['Trái cây theo mùa', '/academy/viet-thai-menu/seasonal-fruit.png'],
  ['Chè khúc bạch', '/academy/viet-thai-menu/che-khuc-bach.png'],
]);

const migration: DataMigration = {
  id: '20260827131000_backfill_academy_workshop_viet_thai_menu_images',
  description: 'Attach the Việt Thái sample food photography to each workshop menu item.',
  async preflight(connection) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'crm_academy_workshop_menu_items'
         AND column_name = 'image_url'`
    );
    if (Number(rows[0]?.count || 0) !== 1) {
      throw new Error('crm_academy_workshop_menu_items.image_url must exist before backfilling menu photography.');
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

    for (const [name, imageUrl] of imageByItemName) {
      await connection.execute(
        `UPDATE crm_academy_workshop_menu_items
         SET image_url = ?, updated_at = CURRENT_TIMESTAMP(0)
         WHERE workshop_id = ? AND name = ? AND (image_url IS NULL OR image_url = '')`,
        [imageUrl, workshopId, name]
      );
    }
  },
};

export default migration;
