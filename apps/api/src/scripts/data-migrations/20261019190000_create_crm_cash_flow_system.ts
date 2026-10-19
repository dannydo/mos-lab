import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20261019190000_create_crm_cash_flow_system',
  description:
    'Khởi tạo hệ thống Dự báo dòng tiền (Cash Flow Forecast), bảng tài khoản, thu chi có VAT & mức độ ưu tiên',
  async preflight(_connection: PoolConnection) {
    // Read-only preflight check
  },
  async up(connection: PoolConnection) {
    // 1. Tạo bảng crm_cash_accounts
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS crm_cash_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        account_type VARCHAR(20) NOT NULL DEFAULT 'BANK',
        account_number VARCHAR(50) NULL,
        bank_name VARCHAR(100) NULL,
        store_id INT NULL,
        initial_balance DOUBLE NOT NULL DEFAULT 0,
        current_balance DOUBLE NOT NULL DEFAULT 0,
        min_safety_threshold DOUBLE NOT NULL DEFAULT 10000000,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        notes TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX cash_account_store_idx (store_id),
        INDEX cash_account_active_idx (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Tạo bảng crm_cash_flow_entries
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS crm_cash_flow_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        flow_type VARCHAR(20) NOT NULL,
        category VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        amount DOUBLE NOT NULL,
        has_vat TINYINT(1) NOT NULL DEFAULT 0,
        vat_rate DOUBLE NOT NULL DEFAULT 0,
        vat_amount DOUBLE NOT NULL DEFAULT 0,
        total_amount DOUBLE NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
        status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        expected_date DATE NOT NULL,
        due_date DATE NULL,
        actual_date DATE NULL,
        account_id INT NULL,
        store_id INT NULL,
        payment_method VARCHAR(50) NULL,
        is_recurring TINYINT(1) NOT NULL DEFAULT 0,
        recurring_interval VARCHAR(20) NULL,
        recurring_end_date DATE NULL,
        source_ref VARCHAR(100) NULL,
        created_by_staff_id INT NULL,
        created_by_name VARCHAR(100) NULL,
        approved_by_staff_id INT NULL,
        approved_by_name VARCHAR(100) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX cash_flow_type_status_date_idx (flow_type, status, expected_date),
        INDEX cash_flow_store_date_idx (store_id, expected_date),
        INDEX cash_flow_category_idx (category),
        INDEX cash_flow_priority_idx (priority),
        INDEX cash_flow_account_idx (account_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Tạo bảng crm_cash_flow_audits
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS crm_cash_flow_audits (
        id INT AUTO_INCREMENT PRIMARY KEY,
        entry_id INT NOT NULL,
        action VARCHAR(50) NOT NULL,
        staff_id INT NULL,
        staff_name VARCHAR(100) NULL,
        payload JSON NULL,
        note TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX cash_flow_audit_entry_idx (entry_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Seed tài khoản tiền mặc định nếu chưa có
    const [accounts] = await connection.execute<RowDataPacket[]>(`SELECT id FROM crm_cash_accounts LIMIT 1`);
    if (accounts.length === 0) {
      await connection.execute(`
        INSERT INTO crm_cash_accounts 
          (code, name, account_type, account_number, bank_name, initial_balance, current_balance, min_safety_threshold, is_active, notes)
        VALUES
          ('CASH_MAIN', 'Quỹ tiền mặt Hội sở Wings', 'CASH', NULL, NULL, 50000000, 50000000, 20000000, 1, 'Quỹ tiền mặt trung tâm thanh toán tức thời'),
          ('BANK_VCB', 'Vietcombank - TK Công ty Chính', 'BANK', '1029384756', 'Vietcombank', 350000000, 350000000, 100000000, 1, 'Tài khoản chính nhận chuyển khoản và thanh toán lương/NCC'),
          ('BANK_TCB', 'Techcombank - Quỹ Chi nhánh Đề Thám', 'BANK', '1903847561', 'Techcombank', 120000000, 120000000, 30000000, 1, 'Tài khoản chi nhánh phục vụ vận hành'),
          ('BANK_MB', 'MB Bank - Thu hộ POS & Thẻ', 'BANK', '0938475612', 'MB Bank', 85000000, 85000000, 20000000, 1, 'Tài khoản kết nối máy POS cà thẻ khách hàng')
      `);
    }

    // 5. Seed dữ liệu mẫu chi tiêu có VAT & Mức độ ưu tiên nếu chưa có
    const [entries] = await connection.execute<RowDataPacket[]>(`SELECT id FROM crm_cash_flow_entries LIMIT 1`);
    if (entries.length === 0) {
      const today = new Date().toISOString().slice(0, 10);
      await connection.execute(`
        INSERT INTO crm_cash_flow_entries
          (flow_type, category, title, description, amount, has_vat, vat_rate, vat_amount, total_amount, priority, status, expected_date, due_date, payment_method, is_recurring, recurring_interval)
        VALUES
          ('OUTFLOW', 'RENT', 'Tiền thuê mặt bằng Đề Thám tháng hiện tại', 'Thanh toán mặt bằng trung tâm theo hợp đồng', 45000000, 1, 10, 4500000, 49500000, 'CRITICAL', 'APPROVED', '${today}', '${today}', 'BANK_TRANSFER', 1, 'MONTHLY'),
          ('OUTFLOW', 'SALARY', 'Bảng lương nhân sự chi nhánh đợt 1', 'Chi trả lương định kỳ cho Chuyên Viên & Booker', 180000000, 0, 0, 0, 180000000, 'CRITICAL', 'APPROVED', DATE_ADD('${today}', INTERVAL 5 DAY), DATE_ADD('${today}', INTERVAL 5 DAY), 'BANK_TRANSFER', 1, 'MONTHLY'),
          ('OUTFLOW', 'SUPPLIER_MATERIAL', 'Nhập vật tư mi và keo cao cấp từ Nhật Bản', 'Đơn hàng NCC L-0982 có hóa đơn VAT', 35000000, 1, 8, 2800000, 37800000, 'HIGH', 'PENDING', DATE_ADD('${today}', INTERVAL 3 DAY), DATE_ADD('${today}', INTERVAL 7 DAY), 'BANK_TRANSFER', 0, NULL),
          ('OUTFLOW', 'TAX', 'Nộp thuế TNDN và GTGT quý', 'Kê khai thuế điện tử chi cục thuế', 28000000, 0, 0, 0, 28000000, 'HIGH', 'PENDING', DATE_ADD('${today}', INTERVAL 10 DAY), DATE_ADD('${today}', INTERVAL 15 DAY), 'BANK_TRANSFER', 1, 'QUARTERLY'),
          ('OUTFLOW', 'OPEX', 'Chi phí decor & làm mới không gian đón khách', 'Nâng cấp hoa tươi và nội thất phòng chờ', 15000000, 1, 8, 1200000, 16200000, 'LOW', 'PENDING', DATE_ADD('${today}', INTERVAL 12 DAY), DATE_ADD('${today}', INTERVAL 20 DAY), 'BANK_TRANSFER', 0, NULL),
          ('INFLOW', 'REVENUE_SERVICE', 'Dự kiến doanh thu dịch vụ nối mi toàn hệ thống', 'Doanh thu dịch vụ khách hoàn tất tại các chi nhánh', 260000000, 0, 0, 0, 260000000, 'HIGH', 'PENDING', DATE_ADD('${today}', INTERVAL 7 DAY), NULL, 'BANK_TRANSFER', 1, 'MONTHLY'),
          ('INFLOW', 'REVENUE_ACADEMY', 'Thu học phí Workshop Nối Mi Thực Chiến K12', 'Đăng ký học viên khóa đào tạo nâng cao', 45000000, 0, 0, 0, 45000000, 'MEDIUM', 'PENDING', DATE_ADD('${today}', INTERVAL 4 DAY), NULL, 'BANK_TRANSFER', 0, NULL)
      `);
    }
  },
};

export default migration;
