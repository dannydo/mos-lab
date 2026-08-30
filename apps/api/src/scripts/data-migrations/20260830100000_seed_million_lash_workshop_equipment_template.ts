import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const templateTitle = 'Workshop Nối Bộ Mi Triệu Đồng';

const equipmentPackages = [
  {
    name: 'Combo Cơ Bản',
    description: 'Bộ làm quen, phù hợp cho phần thực hành có hướng dẫn.',
    includedItems: ['Nhíp cơ bản', 'Keo nối mi', 'Mi nối', 'Mi giả'],
    priceVnd: 299_000,
    images: [
      {
        imageUrl: '/academy/practice-kits/basic-kit-flatlay-v1.webp',
        altText: 'Combo dụng cụ cơ bản đặt trên bàn thực hành',
        sortOrder: 1,
      },
      {
        imageUrl: '/academy/practice-kits/basic-kit-detail-v1.webp',
        altText: 'Cận cảnh nhíp, keo và mi của combo cơ bản',
        sortOrder: 2,
      },
    ],
  },
  {
    name: 'Combo Cao Cấp',
    description: 'Bộ nâng cấp với dụng cụ hỗ trợ để thao tác chính xác hơn.',
    includedItems: ['Nhíp cao cấp', 'Keo nối mi chuyên dụng', 'Mi nối', 'Mi giả', 'Dụng cụ hỗ trợ nối mi'],
    priceVnd: 599_000,
    images: [
      {
        imageUrl: '/academy/practice-kits/premium-kit-v1.webp',
        altText: 'Combo dụng cụ cao cấp đặt trên bàn thực hành',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Combo Luyện Tập',
    description: 'Bộ đầy đủ để tiếp tục luyện kỹ thuật trên mannequin sau workshop.',
    includedItems: [
      'Nhíp cao cấp',
      'Keo nối mi chuyên dụng',
      'Mi nối',
      'Mi giả',
      'Dụng cụ hỗ trợ nối mi',
      'Mannequin thực hành',
    ],
    priceVnd: 1_999_000,
    images: [
      {
        imageUrl: '/academy/practice-kits/training-kit-v1.webp',
        altText: 'Combo luyện tập với mannequin và dụng cụ nối mi',
        sortOrder: 4,
      },
    ],
  },
  {
    name: 'Bộ Dụng Cụ VIP',
    description: 'Bộ chuyên sâu có phụ kiện luyện tập, khay thao tác và case bảo quản cá nhân.',
    includedItems: [
      'Nhíp cao cấp 2 đầu',
      'Keo nối mi chuyên dụng',
      'Mi nối phân loại độ cong',
      'Mi giả',
      'Bộ dụng cụ hỗ trợ nối mi',
      'Mannequin silicone',
      'Khay thao tác & giá đỡ keo',
      'Case bảo quản cá nhân',
    ],
    priceVnd: 4_999_990,
    images: [
      {
        imageUrl: '/academy/practice-kits/vip-kit-v1.webp',
        altText: 'Bộ dụng cụ VIP với case và khay thao tác',
        sortOrder: 5,
      },
    ],
  },
] as const;

const migration: DataMigration = {
  id: '20260830100000_seed_million_lash_workshop_equipment_template',
  description: 'Add the reusable four-tier Million Lash workshop equipment template.',
  async preflight(connection) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM information_schema.tables
       WHERE table_schema = DATABASE()
         AND table_name IN (
           'crm_academy_workshop_equipment_templates',
           'crm_academy_workshop_equipment_template_packages',
           'crm_academy_workshop_equipment_template_package_images'
         )`
    );
    if (Number(rows[0]?.count || 0) !== 3) {
      throw new Error(
        'Workshop equipment template tables must exist before seeding the Million Lash equipment template.'
      );
    }
  },
  async up(connection) {
    const [existingRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM crm_academy_workshop_equipment_templates WHERE title = ? LIMIT 1',
      [templateTitle]
    );
    let templateId = Number(existingRows[0]?.id || 0);
    if (!templateId) {
      const [created] = await connection.execute<ResultSetHeader>(
        `INSERT INTO crm_academy_workshop_equipment_templates (title, created_at, updated_at)
         VALUES (?, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
        [templateTitle]
      );
      templateId = created.insertId;
    }

    const [packageRows] = await connection.execute<RowDataPacket[]>(
      'SELECT COUNT(*) AS count FROM crm_academy_workshop_equipment_template_packages WHERE template_id = ?',
      [templateId]
    );
    if (Number(packageRows[0]?.count || 0) > 0) return;

    for (const [index, equipmentPackage] of equipmentPackages.entries()) {
      const [createdPackage] = await connection.execute<ResultSetHeader>(
        `INSERT INTO crm_academy_workshop_equipment_template_packages
          (template_id, name, description, included_items_json, price_vnd, sort_order, is_available, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
        [
          templateId,
          equipmentPackage.name,
          equipmentPackage.description,
          JSON.stringify(equipmentPackage.includedItems),
          equipmentPackage.priceVnd,
          index + 1,
        ]
      );

      for (const image of equipmentPackage.images) {
        await connection.execute(
          `INSERT INTO crm_academy_workshop_equipment_template_package_images
            (template_package_id, image_url, alt_text, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
          [createdPackage.insertId, image.imageUrl, image.altText, image.sortOrder]
        );
      }
    }
  },
};

export default migration;
