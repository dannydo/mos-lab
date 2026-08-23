import type { DataMigration } from './types.js';

const migration: DataMigration = {
  id: '20260823180000_seed_academy_organization_defaults',
  description:
    'Seed Academy catalog, instructors, organization defaults, and canonical Super Admin identities required by the new CRM schema.',
  async preflight(connection) {
    await connection.query('SELECT id FROM crm_academy_courses LIMIT 1');
    await connection.query('SELECT id FROM crm_departments LIMIT 1');
    await connection.query('SELECT `key` FROM crm_roles LIMIT 1');
  },
  async up(connection) {
    await connection.execute(`
      INSERT INTO crm_academy_courses (
        code, name, name_en, tag, description, market, cover_image_url,
        list_price_vnd, promo_price_vnd, kit_name, kit_price_vnd, sample_price_vnd,
        lesson_count, lash_model_count, sort_order, is_active, updated_at
      ) VALUES
        ('combo', 'Combo 4 Khóa Nối Mi Bóng Tối Chuyên Nghiệp', 'Full Professional Combo', 'COMBO PRO', 'Học cốt MI ID chuẩn chỉnh quỹ · Tiết kiệm nhất · Bảo hành nghề tại Việt Nam & quốc tế.', 'DOMESTIC', '/academy/courses/lash_combo.jpg', 34600000, 19900000, 'Đồ nghề: MS92 Cốp VIP – Dụng cụ hành nghề', 13550000, 4800000, 32, 31, 1, 1, CURRENT_TIMESTAMP(0)),
        ('basic', 'Nền Tảng Nối Mi Bóng Tối Độc Quyền', 'Foundation Dark Lash', 'NỀN TẢNG', 'Phù hợp người mới · MI ID Classic & Ivy Light · Cam kết bảo hành nghề.', 'DOMESTIC', '/academy/courses/lash_basic.jpg', 5900000, 1900000, 'Đồ nghề: MS90 Cốp Basic – Người mới bắt đầu', 4450000, 900000, 6, 5, 2, 1, CURRENT_TIMESTAMP(0)),
        ('advanced', 'Tinh Hoa Nối Mi Bóng Tối Nâng Cao', 'Elite Artistry', 'TINH HOA', 'Kỹ thuật Wispy, Sexy Wings, Baby Doll · Nâng cấp tay nghề chuyên sâu.', 'DOMESTIC', '/academy/courses/lash_advanced.jpg', 12900000, 9900000, 'Đồ nghề: Nhíp Elite và 6 khay mi', 9900000, 900000, 6, 6, 3, 1, CURRENT_TIMESTAMP(0)),
        ('fan', 'Nối Mi Volume & Mega Chuẩn Quốc Tế', 'Volume & Mega Volume', 'VOLUME', 'Kỹ thuật tạo fan tay · Volume 2D–5D · Mega Lash · Chuẩn quốc tế.', 'DOMESTIC', '/academy/courses/lash_volume.jpg', 20900000, 9900000, 'Đồ nghề: Nhíp Volume và 6 khay mi', 9900000, 1500000, 10, 10, 4, 1, CURRENT_TIMESTAMP(0)),
        ('design', 'Thiết Kế & Tạo Dáng Mi Nghệ Thuật', 'Lash Design & Styling', 'DESIGN', 'Phân tích dáng mắt · Thiết kế form mi · Sáng tạo phong mi nghệ thuật.', 'DOMESTIC', '/academy/courses/lash_design.jpg', 20900000, 9900000, 'Đồ nghề: Thước mi và 4 khay mi', 9900000, 1500000, 10, 10, 5, 1, CURRENT_TIMESTAMP(0)),
        ('overseas_bootcamp', 'Fast-track Bootcamp 3-in-1', 'Fast-track Bootcamp 3-in-1', 'FAST-TRACK', 'Lộ trình tăng tốc cho học viên Việt kiều và định cư.', 'OVERSEAS', NULL, 24900000, 19900000, 'Đồ nghề: MS92 Cốp VIP – Dụng cụ hành nghề', 13550000, 4650000, 31, 31, 11, 1, CURRENT_TIMESTAMP(0)),
        ('overseas_styling', 'Western Styling & Speed Volume', 'Western Styling & Speed Volume', 'WESTERN', 'Thiết kế phong cách phương Tây và kỹ thuật Volume tốc độ.', 'OVERSEAS', NULL, 18900000, 14900000, 'Đồ nghề: Nhíp Volume và 6 khay mi', 9900000, 1500000, 10, 10, 12, 1, CURRENT_TIMESTAMP(0)),
        ('overseas_business', 'VIP Business & Global Licensing', 'VIP Business & Global Licensing', 'VIP BUSINESS', 'Nghề, vận hành và giấy phép cho thị trường quốc tế.', 'OVERSEAS', NULL, 29900000, 24900000, 'Đồ nghề: MS92 Cốp VIP – Dụng cụ hành nghề', 13550000, 4650000, 31, 31, 13, 1, CURRENT_TIMESTAMP(0)),
        ('overseas_crash', 'Crash Course Nối Mi 5 Ngày', '5-day Lash Crash Course', 'CRASH COURSE', 'Khoá tăng tốc nối mi 5 ngày cho người cần bắt đầu nhanh.', 'OVERSEAS', NULL, 24900000, 19900000, 'Đồ nghề: MS90 Cốp Basic – Người mới bắt đầu', 4450000, 1500000, 10, 5, 14, 1, CURRENT_TIMESTAMP(0))
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        name_en = VALUES(name_en),
        tag = VALUES(tag),
        description = VALUES(description),
        market = VALUES(market),
        cover_image_url = COALESCE(VALUES(cover_image_url), cover_image_url),
        list_price_vnd = VALUES(list_price_vnd),
        promo_price_vnd = VALUES(promo_price_vnd),
        kit_name = VALUES(kit_name),
        kit_price_vnd = VALUES(kit_price_vnd),
        sample_price_vnd = VALUES(sample_price_vnd),
        lesson_count = VALUES(lesson_count),
        lash_model_count = VALUES(lash_model_count),
        sort_order = VALUES(sort_order),
        is_active = VALUES(is_active),
        updated_at = CURRENT_TIMESTAMP(0)
    `);

    await connection.execute(`
      INSERT INTO crm_academy_instructors
        (code, display_name, description, surcharge_percent, is_active, sort_order, updated_at)
      VALUES
        ('auto', 'Tự động phân bổ giảng viên', 'Phân bổ ngẫu nhiên', 0, 1, 0, CURRENT_TIMESTAMP(0)),
        ('giang_tran', 'Giảng viên Giang Trần', 'Chỉ định giảng viên chính', 20, 1, 10, CURRENT_TIMESTAMP(0)),
        ('giang_pham', 'Giảng viên Giang Phạm', 'Chỉ định giảng viên chính', 50, 1, 20, CURRENT_TIMESTAMP(0)),
        ('hong_bui', 'Head Master Hồng Bùi', 'Học kèm 1:1 Head Master', 100, 1, 30, CURRENT_TIMESTAMP(0))
      ON DUPLICATE KEY UPDATE
        display_name = VALUES(display_name),
        description = VALUES(description),
        surcharge_percent = VALUES(surcharge_percent),
        is_active = VALUES(is_active),
        sort_order = VALUES(sort_order),
        updated_at = CURRENT_TIMESTAMP(0)
    `);

    await connection.execute(`
      UPDATE crm_academy_instructors AS instructor
      JOIN crm_staff AS staff ON staff.display_name = 'Giang Trần'
      SET instructor.staff_id = staff.id,
          instructor.avatar_url = COALESCE(staff.avatar_url, instructor.avatar_url)
      WHERE instructor.code = 'giang_tran'
    `);

    await connection.execute(`
      INSERT INTO crm_departments
        (code, name, description, color, icon, sort_order, is_active, updated_at)
      VALUES
        ('SHOP', 'Shop Operations', 'Vận hành dịch vụ trực tiếp tại cửa hàng', '#d4a72c', '🏬', 1, 1, CURRENT_TIMESTAMP(0)),
        ('ACADEMY', 'Academy', 'Vận hành đào tạo, tuyển sinh và giảng viên Academy', '#722ed1', '🎓', 2, 1, CURRENT_TIMESTAMP(0)),
        ('GROWTH', 'Growth & Booking', 'Telesales, booking và các hoạt động tăng trưởng khách hàng', '#fa8c16', '📈', 3, 1, CURRENT_TIMESTAMP(0)),
        ('BACK_OFFICE', 'Back Office', 'Các chức năng hỗ trợ: HR, tài chính, vận hành và hệ thống', '#1677ff', '🏢', 4, 1, CURRENT_TIMESTAMP(0))
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        color = VALUES(color),
        icon = VALUES(icon),
        sort_order = VALUES(sort_order),
        is_active = VALUES(is_active),
        updated_at = CURRENT_TIMESTAMP(0)
    `);

    await connection.execute(`
      INSERT INTO crm_teams
        (code, name, description, color, icon, sort_order, is_active, created_at, updated_at)
      VALUES
        ('ACADEMY', 'Academy', 'Đội ngũ vận hành, tư vấn và quản lý khách hàng Academy', '#722ed1', '🎓', 8, 1, CURRENT_TIMESTAMP(0), CURRENT_TIMESTAMP(0))
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        color = VALUES(color),
        icon = VALUES(icon),
        sort_order = VALUES(sort_order),
        is_active = VALUES(is_active),
        updated_at = CURRENT_TIMESTAMP(0)
    `);

    await connection.execute(`
      UPDATE crm_teams AS team
      JOIN crm_departments AS department ON department.code = 'SHOP'
      SET team.department_id = department.id
      WHERE team.code IN ('CC', 'CV')
    `);
    await connection.execute(`
      UPDATE crm_teams AS team
      JOIN crm_departments AS department ON department.code = 'GROWTH'
      SET team.department_id = department.id
      WHERE team.code IN ('BK', 'BK_TELESALES', 'BK_CS', 'BK_CONTROL', 'BK_OTHER')
    `);
    await connection.execute(`
      UPDATE crm_teams AS team
      JOIN crm_departments AS department ON department.code = 'ACADEMY'
      SET team.department_id = department.id
      WHERE team.code = 'ACADEMY'
    `);

    await connection.execute(`
      INSERT INTO crm_roles
        (\`key\`, name, color, view_kpi, view_team_kpi, manage_staff, omicall_auto_init, is_system, description)
      VALUES
        ('super_admin', 'Super Admin', 'magenta', 1, 1, 1, 0, 1, 'Quản trị tối cao: cấu hình quyền hệ thống và audit bảo mật')
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        color = VALUES(color),
        view_kpi = VALUES(view_kpi),
        view_team_kpi = VALUES(view_team_kpi),
        manage_staff = VALUES(manage_staff),
        is_system = VALUES(is_system),
        description = VALUES(description)
    `);

    await connection.execute(`
      UPDATE crm_staff
      SET role = 'super_admin'
      WHERE LOWER(username) IN ('admin', 'danhdo@gmail.com', 'danny.do@wingslashes.com')
         OR LOWER(COALESCE(email, '')) IN ('danhdo@gmail.com', 'danny.do@wingslashes.com')
    `);
  },
};

export default migration;
