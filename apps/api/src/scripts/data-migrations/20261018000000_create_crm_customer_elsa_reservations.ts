import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20261018000000_create_crm_customer_elsa_reservations',
  description: 'Khởi tạo bảng crm_customer_elsa_reservations và nạp dữ liệu bảo lưu Combo Elsa mẫu cho Giáng Hương và Mai',
  async preflight(_connection: PoolConnection) {
    // Read-only safety checks
  },
  async up(connection: PoolConnection) {
    // 1. Ensure table exists in CRM DB
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS crm_customer_elsa_reservations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        legacy_user_id INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
        reservation_type VARCHAR(30) NOT NULL DEFAULT 'FIXED_TERM',
        reason VARCHAR(500) NOT NULL,
        start_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_date DATETIME NULL,
        reminder_date DATETIME NULL,
        reminder_note TEXT NULL,
        is_reminder_dismissed TINYINT(1) NOT NULL DEFAULT 0,
        created_by_staff_id INT NULL,
        created_by_staff_name VARCHAR(100) NULL,
        released_at DATETIME NULL,
        released_by_staff_id INT NULL,
        released_by_staff_name VARCHAR(100) NULL,
        release_note TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX elsa_user_status_idx (legacy_user_id, status),
        INDEX elsa_status_end_idx (status, end_date),
        INDEX elsa_status_reminder_idx (status, reminder_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Seed example Elsa customers if they exist in legacy DB
    // Giáng Hương (21677)
    const [existingGiangHuong] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM crm_customer_elsa_reservations WHERE legacy_user_id = 21677 AND status = 'ACTIVE' LIMIT 1`
    );
    if (existingGiangHuong.length === 0) {
      await connection.execute(
        `INSERT INTO crm_customer_elsa_reservations
          (legacy_user_id, status, reservation_type, reason, start_date, end_date, reminder_date, reminder_note, created_by_staff_name, created_at, updated_at)
         VALUES
          (21677, 'ACTIVE', 'INDEFINITE', 'Cô Giáng Hương cần đưa vào Combo bảo lưu (PXL)', NOW(), NULL, DATE_ADD(NOW(), INTERVAL 30 DAY), 'Chăm sóc đặc biệt cô Giáng Hương hỏi thăm tiến độ bảo lưu combo', 'Bảo Hân', NOW(), NOW())`
      );
    }

    // Chị Mai (49928)
    const [existingMai] = await connection.execute<RowDataPacket[]>(
      `SELECT id FROM crm_customer_elsa_reservations WHERE legacy_user_id = 49928 AND status = 'ACTIVE' LIMIT 1`
    );
    if (existingMai.length === 0) {
      await connection.execute(
        `INSERT INTO crm_customer_elsa_reservations
          (legacy_user_id, status, reservation_type, reason, start_date, end_date, reminder_date, reminder_note, created_by_staff_name, created_at, updated_at)
         VALUES
          (49928, 'ACTIVE', 'FIXED_TERM', 'Chị đang không ở SG, công tác có thể tới cuối năm mới về CS hỗ trợ bảo lưu gói, khi chị về kích hoạt dùng, hỗ trợ 25D/lần', NOW(), '2026-12-31 23:59:59', '2026-12-01 09:00:00', 'Nhắc kích hoạt lại combo dặm mi cho chị Mai khi về SG', 'Bảo Hân', NOW(), NOW())`
      );
    }
  },
};

export default migration;
