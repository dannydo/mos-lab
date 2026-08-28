import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20260827132000_optimize_academy_workshop_viet_thai_menu_images',
  description: 'Switch Việt Thái menu photography to phone-friendly WebP assets.',
  async up(connection) {
    await connection.execute(
      `UPDATE crm_academy_workshop_menu_items mi
       INNER JOIN crm_academy_workshops w ON w.id = mi.workshop_id
       INNER JOIN crm_academy_campaigns c ON c.id = w.campaign_id
       SET mi.image_url = REPLACE(mi.image_url, '.png', '.webp'),
           mi.updated_at = CURRENT_TIMESTAMP(0)
       WHERE c.slug = 'thang-co-hon'
         AND c.deleted_at IS NULL
         AND mi.image_url LIKE '/academy/viet-thai-menu/%.png'`
    );
  },
};

export default migration;
