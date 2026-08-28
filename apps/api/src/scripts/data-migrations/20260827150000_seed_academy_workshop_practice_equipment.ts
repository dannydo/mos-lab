import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const sampleEquipment = [
  {
    name: 'Combo Cơ Bản',
    description: 'Bộ làm quen, phù hợp cho phần thực hành có hướng dẫn.',
    includedItems: ['Nhíp cơ bản', 'Keo nối mi', 'Mi nối', 'Mi giả'],
    priceVnd: 299_000,
  },
  {
    name: 'Combo Cao Cấp',
    description: 'Bộ nâng cấp với dụng cụ hỗ trợ để thao tác chính xác hơn.',
    includedItems: ['Nhíp cao cấp', 'Keo nối mi chuyên dụng', 'Mi nối', 'Mi giả', 'Dụng cụ hỗ trợ nối mi'],
    priceVnd: 599_000,
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
    priceVnd: 899_000,
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
    priceVnd: 1_490_000,
  },
] as const;

const migration: DataMigration = {
  id: '20260827150000_seed_academy_workshop_practice_equipment',
  description: 'Seed editable practical-kit packages for the Tháng Cô Hồn workshop registration flow.',
  async preflight(connection) {
    const [rows] = await connection.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS count
       FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_name = 'crm_academy_workshop_equipment_packages'`
    );
    if (Number(rows[0]?.count || 0) !== 1) {
      throw new Error('crm_academy_workshop_equipment_packages must exist before seeding workshop equipment.');
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
      'SELECT COUNT(*) AS count FROM crm_academy_workshop_equipment_packages WHERE workshop_id = ?',
      [workshopId]
    );
    if (Number(existingRows[0]?.count || 0) > 0) return;

    for (const [index, item] of sampleEquipment.entries()) {
      await connection.execute(
        `INSERT INTO crm_academy_workshop_equipment_packages
          (workshop_id, name, description, included_items_json, price_vnd, sort_order, is_available, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
        [workshopId, item.name, item.description, JSON.stringify(item.includedItems), item.priceVnd, index + 1]
      );
    }
  },
};

export default migration;
