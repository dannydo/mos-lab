import type { RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const WORKSHOP_SLUG = 'thang-co-hon';
const WORKSHOP_NAME = 'Kỹ Thuật Nối Bộ Mi Triệu Đồng';

const agendaItems = [
  { title: 'Đón khách & ổn định lớp', kind: 'OTHER', plannedDurationSeconds: 900, sortOrder: 1 },
  { title: 'Mở bài & mục tiêu buổi học', kind: 'CONTENT', plannedDurationSeconds: 900, sortOrder: 2 },
  { title: 'Trình diễn kỹ thuật', kind: 'CONTENT', plannedDurationSeconds: 2700, sortOrder: 3 },
  { title: 'Thực hành có hướng dẫn', kind: 'CONTENT', plannedDurationSeconds: 4500, sortOrder: 4 },
  { title: 'Nghỉ giải lao', kind: 'BREAK', plannedDurationSeconds: 900, sortOrder: 5 },
  { title: 'Nhận xét, hỏi đáp & tổng kết', kind: 'CONTENT', plannedDurationSeconds: 1800, sortOrder: 6 },
  {
    title: 'Giao Lưu Cùng Giảng Viên tại nhà hàng Việt Thái',
    kind: 'CONTENT',
    plannedDurationSeconds: 3600,
    sortOrder: 7,
  },
] as const;

const menuDescription = 'Mẫu minh họa · xác nhận lại với nhà hàng trước ngày workshop.';
const menuItems = [
  { category: 'JUICE', name: 'Nước ép cam', imageUrl: '/academy/viet-thai-menu/orange-juice.webp', sortOrder: 1 },
  { category: 'JUICE', name: 'Nước ép thơm', imageUrl: '/academy/viet-thai-menu/pineapple-juice.webp', sortOrder: 2 },
  {
    category: 'JUICE',
    name: 'Nước ép dưa hấu',
    imageUrl: '/academy/viet-thai-menu/watermelon-juice.webp',
    sortOrder: 3,
  },
  {
    category: 'MAIN_COURSE',
    name: 'Cơm chiên hải sản',
    imageUrl: '/academy/viet-thai-menu/seafood-fried-rice.webp',
    sortOrder: 4,
  },
  { category: 'MAIN_COURSE', name: 'Mì xào bò', imageUrl: '/academy/viet-thai-menu/beef-noodles.webp', sortOrder: 5 },
  {
    category: 'MAIN_COURSE',
    name: 'Gà nướng mật ong ăn kèm cơm',
    imageUrl: '/academy/viet-thai-menu/honey-grilled-chicken-rice.webp',
    sortOrder: 6,
  },
  { category: 'DESSERT', name: 'Rau câu dừa', imageUrl: '/academy/viet-thai-menu/coconut-jelly.webp', sortOrder: 7 },
  {
    category: 'DESSERT',
    name: 'Trái cây theo mùa',
    imageUrl: '/academy/viet-thai-menu/seasonal-fruit.webp',
    sortOrder: 8,
  },
  { category: 'DESSERT', name: 'Chè khúc bạch', imageUrl: '/academy/viet-thai-menu/che-khuc-bach.webp', sortOrder: 9 },
] as const;

const equipmentPackages = [
  {
    name: 'Combo Cơ Bản',
    description: 'Bộ làm quen, phù hợp cho phần thực hành có hướng dẫn.',
    includedItems: ['Nhíp cơ bản', 'Keo nối mi', 'Mi nối', 'Mi giả'],
    priceVnd: 299_000,
    sortOrder: 1,
  },
  {
    name: 'Combo Cao Cấp',
    description: 'Bộ nâng cấp với dụng cụ hỗ trợ để thao tác chính xác hơn.',
    includedItems: ['Nhíp cao cấp', 'Keo nối mi chuyên dụng', 'Mi nối', 'Mi giả', 'Dụng cụ hỗ trợ nối mi'],
    priceVnd: 599_000,
    sortOrder: 2,
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
    sortOrder: 3,
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
    sortOrder: 4,
  },
] as const;

const equipmentImages = [
  {
    packageName: 'Combo Cơ Bản',
    imageUrl: '/academy/practice-kits/basic-kit-flatlay-v1.webp',
    altText: 'Combo dụng cụ cơ bản đặt trên bàn thực hành',
    sortOrder: 1,
  },
  {
    packageName: 'Combo Cơ Bản',
    imageUrl: '/academy/practice-kits/basic-kit-detail-v1.webp',
    altText: 'Cận cảnh nhíp, keo và mi của combo cơ bản',
    sortOrder: 2,
  },
  {
    packageName: 'Combo Cao Cấp',
    imageUrl: '/academy/practice-kits/premium-kit-v1.webp',
    altText: 'Combo dụng cụ cao cấp đặt trên bàn thực hành',
    sortOrder: 3,
  },
  {
    packageName: 'Combo Luyện Tập',
    imageUrl: '/academy/practice-kits/training-kit-v1.webp',
    altText: 'Combo luyện tập với mannequin và dụng cụ nối mi',
    sortOrder: 4,
  },
  {
    packageName: 'Bộ Dụng Cụ VIP',
    imageUrl: '/academy/practice-kits/vip-kit-v1.webp',
    altText: 'Bộ dụng cụ VIP với case và khay thao tác',
    sortOrder: 5,
  },
] as const;

async function loadTarget(connection: Parameters<NonNullable<DataMigration['preflight']>>[0]) {
  const [rows] = await connection.execute<RowDataPacket[]>(
    `SELECT
       w.id AS workshop_id,
       c.id AS campaign_id,
       (SELECT COUNT(*) FROM crm_academy_workshop_participants p WHERE p.workshop_id = w.id) AS participant_count,
       (SELECT COUNT(*) FROM crm_academy_workshop_agenda_items a WHERE a.workshop_id = w.id) AS agenda_count,
       (SELECT COUNT(*) FROM crm_academy_workshop_menu_items m WHERE m.workshop_id = w.id) AS menu_count,
       (SELECT COUNT(*) FROM crm_academy_workshop_equipment_packages e WHERE e.workshop_id = w.id) AS equipment_count
     FROM crm_academy_campaigns c
     INNER JOIN crm_academy_workshops w ON w.campaign_id = c.id
     WHERE c.slug = ? AND c.deleted_at IS NULL
     LIMIT 2`,
    [WORKSHOP_SLUG]
  );

  if (rows.length !== 1) {
    throw new Error(`Expected exactly one active workshop with slug ${WORKSHOP_SLUG}; found ${rows.length}.`);
  }

  const target = rows[0];
  const expectedCounts = {
    agenda: agendaItems.length,
    menu: menuItems.length,
    equipment: equipmentPackages.length,
  };
  if (
    Number(target.agenda_count) !== expectedCounts.agenda ||
    Number(target.menu_count) !== expectedCounts.menu ||
    Number(target.equipment_count) !== expectedCounts.equipment
  ) {
    throw new Error(
      `Refusing to replace an incompatible workshop shape: expected ${expectedCounts.agenda}/${expectedCounts.menu}/${expectedCounts.equipment}, received ${target.agenda_count}/${target.menu_count}/${target.equipment_count}.`
    );
  }

  return {
    workshopId: Number(target.workshop_id),
    campaignId: Number(target.campaign_id),
    participantCount: Number(target.participant_count),
  };
}

const migration: DataMigration = {
  id: '20260828110000_sync_million_lash_workshop',
  description:
    'Synchronize the production Tháng Cô Hồn workshop with the Kỹ Thuật Nối Bộ Mi Triệu Đồng registration experience.',
  async preflight(connection) {
    const target = await loadTarget(connection);
    const [packages] = await connection.execute<RowDataPacket[]>(
      'SELECT name FROM crm_academy_workshop_equipment_packages WHERE workshop_id = ?',
      [target.workshopId]
    );
    const existingNames = new Set(packages.map((row) => String(row.name)));
    const missingPackage = equipmentPackages.find((item) => !existingNames.has(item.name));
    if (missingPackage) {
      throw new Error(`Missing expected equipment package: ${missingPackage.name}.`);
    }
    console.log(
      `Synchronizing workshop ${target.workshopId}; preserving ${target.participantCount} participant record(s).`
    );
  },
  async up(connection) {
    const target = await loadTarget(connection);

    await connection.execute(
      `UPDATE crm_academy_campaigns
       SET kind = 'WORKSHOP', name = ?, start_date = '2026-08-28', end_date = '2026-08-28',
           status = 'SCHEDULED', show_in_sidebar = 1, assigned_staff_ids = '[1]', updated_at = CURRENT_TIMESTAMP(0)
       WHERE id = ?`,
      [WORKSHOP_NAME, target.campaignId]
    );
    await connection.execute(
      `UPDATE crm_academy_workshops
       SET starts_at = '2026-08-28 09:00:00', ends_at = '2026-08-28 11:30:00', location = 'Wings Đề Thám',
           capacity = 10, fee_vnd = 290000, fee_due_at = NULL, hero_image_url = NULL, status = 'SCHEDULED',
           agenda_preset_key = 'HAPPY_FRIDAY', registration_open = 1, updated_at = CURRENT_TIMESTAMP(0)
       WHERE id = ?`,
      [target.workshopId]
    );

    const [agendaRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id, sort_order FROM crm_academy_workshop_agenda_items WHERE workshop_id = ? ORDER BY sort_order ASC',
      [target.workshopId]
    );
    for (const [index, item] of agendaItems.entries()) {
      await connection.execute(
        `UPDATE crm_academy_workshop_agenda_items
         SET title = ?, description = NULL, kind = ?, planned_duration_seconds = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP(0)
         WHERE id = ? AND workshop_id = ?`,
        [
          item.title,
          item.kind,
          item.plannedDurationSeconds,
          item.sortOrder,
          Number(agendaRows[index].id),
          target.workshopId,
        ]
      );
    }

    const [menuRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id, sort_order FROM crm_academy_workshop_menu_items WHERE workshop_id = ? ORDER BY sort_order ASC',
      [target.workshopId]
    );
    for (const [index, item] of menuItems.entries()) {
      await connection.execute(
        `UPDATE crm_academy_workshop_menu_items
         SET category = ?, name = ?, description = ?, image_url = ?, sort_order = ?, is_available = 1, updated_at = CURRENT_TIMESTAMP(0)
         WHERE id = ? AND workshop_id = ?`,
        [
          item.category,
          item.name,
          menuDescription,
          item.imageUrl,
          item.sortOrder,
          Number(menuRows[index].id),
          target.workshopId,
        ]
      );
    }

    const [packageRows] = await connection.execute<RowDataPacket[]>(
      'SELECT id, name FROM crm_academy_workshop_equipment_packages WHERE workshop_id = ?',
      [target.workshopId]
    );
    const packageIdByName = new Map(packageRows.map((row) => [String(row.name), Number(row.id)]));
    const getPackageId = (name: string) => {
      const packageId = packageIdByName.get(name);
      if (!packageId) throw new Error(`Missing expected equipment package during sync: ${name}.`);
      return packageId;
    };
    for (const item of equipmentPackages) {
      await connection.execute(
        `UPDATE crm_academy_workshop_equipment_packages
         SET description = ?, included_items_json = ?, price_vnd = ?, sort_order = ?, is_available = 1, updated_at = CURRENT_TIMESTAMP(0)
         WHERE id = ? AND workshop_id = ?`,
        [
          item.description,
          JSON.stringify(item.includedItems),
          item.priceVnd,
          item.sortOrder,
          getPackageId(item.name),
          target.workshopId,
        ]
      );
    }

    for (const image of equipmentImages) {
      const equipmentPackageId = getPackageId(image.packageName);
      const [existing] = await connection.execute<RowDataPacket[]>(
        `SELECT id FROM crm_academy_workshop_equipment_package_images
         WHERE equipment_package_id = ? AND image_url = ? LIMIT 1`,
        [equipmentPackageId, image.imageUrl]
      );
      if (existing.length) {
        await connection.execute(
          `UPDATE crm_academy_workshop_equipment_package_images
           SET alt_text = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP(0) WHERE id = ?`,
          [image.altText, image.sortOrder, Number(existing[0].id)]
        );
      } else {
        await connection.execute(
          `INSERT INTO crm_academy_workshop_equipment_package_images
           (equipment_package_id, image_url, alt_text, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))`,
          [equipmentPackageId, image.imageUrl, image.altText, image.sortOrder]
        );
      }
    }
  },
};

export default migration;
