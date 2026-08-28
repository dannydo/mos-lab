import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const sampleImages = [
  {
    packageName: 'Combo Cơ Bản',
    imageUrl: '/academy/practice-kits/basic-kit-flatlay-v1.webp',
    altText: 'Combo dụng cụ cơ bản đặt trên bàn thực hành',
  },
  {
    packageName: 'Combo Cơ Bản',
    imageUrl: '/academy/practice-kits/basic-kit-detail-v1.webp',
    altText: 'Cận cảnh nhíp, keo và mi của combo cơ bản',
  },
  {
    packageName: 'Combo Cao Cấp',
    imageUrl: '/academy/practice-kits/premium-kit-v1.webp',
    altText: 'Combo dụng cụ cao cấp đặt trên bàn thực hành',
  },
  {
    packageName: 'Combo Luyện Tập',
    imageUrl: '/academy/practice-kits/training-kit-v1.webp',
    altText: 'Combo luyện tập với mannequin và dụng cụ nối mi',
  },
  {
    packageName: 'Bộ Dụng Cụ VIP',
    imageUrl: '/academy/practice-kits/vip-kit-v1.webp',
    altText: 'Bộ dụng cụ VIP với case và khay thao tác',
  },
] as const;

const migration: DataMigration = {
  id: '20260827160000_seed_academy_workshop_practice_equipment_images',
  description: 'Seed editable gallery images for the Tháng Cô Hồn practical-kit packages.',
  async preflight(connection) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'crm_academy_workshop_equipment_package_images'`
    );
    if (Number(rows[0]?.count || 0) !== 1) {
      throw new Error('crm_academy_workshop_equipment_package_images must exist before seeding images.');
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

    const [packages] = await connection.execute<RowDataPacket[]>(
      'SELECT id, name FROM crm_academy_workshop_equipment_packages WHERE workshop_id = ?',
      [workshopId]
    );
    const idByName = new Map(packages.map((item) => [String(item.name), Number(item.id)]));

    for (const [index, image] of sampleImages.entries()) {
      const equipmentPackageId = idByName.get(image.packageName);
      if (!equipmentPackageId) continue;
      const [existing] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM crm_academy_workshop_equipment_package_images
         WHERE equipment_package_id = ? AND image_url = ? LIMIT 1`,
        [equipmentPackageId, image.imageUrl]
      );
      if (existing.length) continue;
      await connection.execute(
        `INSERT INTO crm_academy_workshop_equipment_package_images
          (equipment_package_id, image_url, alt_text, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
        [equipmentPackageId, image.imageUrl, image.altText, index + 1]
      );
    }
  },
};

export default migration;
